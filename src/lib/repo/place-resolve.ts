import { TransactionCanceledException } from "@aws-sdk/client-dynamodb";

import { nid } from "@/lib/id";
import type { TransactOp } from "@/lib/repo/dynamo-write";
import {
  buildCitizenLocation,
  guardItemSize,
  locationSlugBase,
  slugLockItem,
  toLocationItem,
  type DynamoItem,
} from "@/lib/repo/mappers";
import {
  PLACE_LOCK_ATTEMPTS,
  PLACE_LOCK_SLOTS,
  placeLockItem,
  probeNeighbourLocks,
  probePlaceLock,
  type PlaceSpot,
} from "@/lib/repo/place-lock";
import type { LocationRecord } from "@/lib/types";

export type PlaceContext = {
  findNearby(spot: PlaceSpot): Promise<LocationRecord | null>;
  read(pk: string, sk: string): Promise<DynamoItem | null>;
  transact(ops: TransactOp[]): Promise<void>;
};

export type ResolvedPlace = { location: LocationRecord; created: boolean };

/** Someone beat us to the place lock or the slug. Retryable. */
class PlaceTaken extends Error {}

/**
 * An op the caller handed to `extra` failed its own condition, so nothing was
 * written — not the place either. Only the caller knows what that means, so it
 * is named rather than folded into the slot walk.
 */
export class ExtraRejectedError extends Error {}

/**
 * DynamoDB cancels a transact for throttling, capacity, validation and
 * transaction conflicts as well as for a failed condition. Only the last one
 * means someone beat us to a lock; the rest are real faults and must surface
 * rather than be retried as collisions until the loop gives up and writes
 * without a lock.
 *
 * Reasons are positional and one cancellation can carry several, so a single
 * `ConditionalCheckFailed` is not enough: a cancellation that also reports
 * throttling is a fault wearing a race's clothes. Every reason that is not
 * `None` has to be an expected conditional failure, and it has to sit on one
 * of the place's own ops — `own` is how many of those lead the list.
 *
 * A mix of `ConditionalCheckFailed` and `TransactionConflict` is also
 * surfaced raw instead of retried. The conflict is rare and transient; the
 * caller can retry the whole operation themselves.
 */
function classifyCancellation(error: unknown, own: number): Error {
  if (!(error instanceof TransactionCanceledException)) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const failed = (error.CancellationReasons ?? [])
    .map((reason, index) => ({ code: reason.Code ?? "None", index }))
    .filter((reason) => reason.code !== "None");
  if (failed.length === 0) return error;
  if (!failed.every((reason) => reason.code === "ConditionalCheckFailed")) return error;
  return failed.every((reason) => reason.index < own)
    ? new PlaceTaken("place or slug already taken", { cause: error })
    : new ExtraRejectedError("a caller op failed its condition", { cause: error });
}

/**
 * The single place where "which place does this pin belong to" is decided, so
 * the citizen write and an admin issue-type change cannot disagree.
 *
 * `extra` is written atomically with a newly created place and is not called
 * when an existing place is joined, so a caller adding or moving a report gets
 * the report and the place in one transact or neither. Throws
 * `ExtraRejectedError` when one of those ops fails its own condition.
 */
export async function resolvePlace(
  ctx: PlaceContext,
  spot: PlaceSpot,
  extra: (locationId: string) => TransactOp[] = () => [],
): Promise<ResolvedPlace> {
  const nearby = await ctx.findNearby(spot);
  if (nearby) return { location: nearby, created: false };
  // The index can lag a place created a moment ago in the next cell; its lock cannot.
  const neighbour = await probeNeighbourLocks(ctx.read, spot);
  if (neighbour) return { location: neighbour, created: false };

  const base = locationSlugBase(spot);
  let slot = 0;
  for (let attempt = 0; attempt < PLACE_LOCK_ATTEMPTS && slot < PLACE_LOCK_SLOTS; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${nid("x").slice(-8)}`;
    try {
      return { location: await write(ctx, spot, slug, slot, extra), created: true };
    } catch (error) {
      if (!(error instanceof PlaceTaken)) throw error;
      const probe = await probePlaceLock(ctx.read, spot, slot);
      // A holder inside the radius is our place. A holder outside it is a
      // different spot sharing the cell, so move on. An empty lock means the
      // slug collided, not the place: keep the slot, take a fresh slug.
      if (probe.join) return { location: probe.join, created: false };
      if (probe.held) slot += 1;
    }
  }
  // Every slot held by a spot we must not join: duplicate beats dropping it.
  const location = await write(ctx, spot, `${base}-${nid("x").slice(-8)}`, null, extra);
  return { location, created: true };
}

async function write(
  ctx: PlaceContext,
  spot: PlaceSpot,
  slug: string,
  slot: number | null,
  extra: (locationId: string) => TransactOp[],
): Promise<LocationRecord> {
  const location = buildCitizenLocation(spot, slug);
  const own: DynamoItem[] = [
    toLocationItem(location),
    slugLockItem(slug, location.id),
    ...(slot === null ? [] : [placeLockItem(spot, location.id, slot)]),
  ];
  const ops: TransactOp[] = [...own.map((put) => ({ put })), ...extra(location.id)];
  for (const op of ops) if ("put" in op) guardItemSize(op.put);
  try {
    await ctx.transact(ops);
  } catch (error) {
    // Classified here because this is the only frame that knows how many of
    // the ops are the place's own, which is what reason indexes are read
    // against.
    throw classifyCancellation(error, own.length);
  }
  return location;
}

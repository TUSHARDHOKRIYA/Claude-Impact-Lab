import { clusterKey, MATCH_METERS, metersBetween, neighbourClusterKeys } from "@/lib/geo";
import { placeLockPk } from "@/lib/repo/keys";
import { fromLocationItem, type DynamoItem } from "@/lib/repo/mappers";
import type { LocationRecord, PlaceSpot } from "@/lib/types";

export type { PlaceSpot };

/**
 * One place per problem per geo cell, held on the main table's primary key.
 *
 * Taken inside the create transact, this is what stops two concurrent writers
 * from both concluding that no place exists yet. The loser's transact is
 * cancelled, and a ConsistentRead of this key names the winner — something the
 * gsi2 nearby query cannot do, because its reads are eventually consistent.
 *
 * One cell spans about 43 m corner to corner against a 40 m match radius, so a
 * lock holder can be a spot this pin must not join. The writer then moves to
 * the next slot rather than giving up on locking, so a second distinct spot in
 * one cell still gets a lock of its own. Slots are tried in order, so two
 * writers at the same second spot contend on the same key.
 *
 * Slot 0 keeps the unsuffixed key, so it reads the same as before.
 *
 * PLACE_LOCK_SLOTS bounds the walk. Exhausting it needs that many distinct
 * spots in one 31 m cell for one problem, at which point an unlocked write is
 * the right way to fail: a possible duplicate, never a lost report.
 */
export const PLACE_LOCK_SLOTS = 4;

/** Bounds slug retries as well as slot walks, so the loop always terminates. */
export const PLACE_LOCK_ATTEMPTS = 8;

export function placeLockKey(spot: PlaceSpot, slot = 0): { pk: string; sk: string } {
  const cell = placeLockPk(clusterKey(spot.lat, spot.lng), spot.issueType);
  return { pk: slot === 0 ? cell : `${cell}#${slot}`, sk: "LOCK" };
}

export function placeLockItem(spot: PlaceSpot, locationId: string, slot = 0): DynamoItem {
  return { ...placeLockKey(spot, slot), locationId };
}

/**
 * `held` and `join` are not the same question, and conflating them was a bug.
 *
 * A cancelled transact can mean the place lock was taken, or only that the slug
 * was. An empty lock is the second case: the slot is still ours, so the writer
 * must retry it with a fresh slug. Advancing the slot there would strand slot 0
 * unlocked with a real place sitting on slot 1, and the next writer would take
 * the empty slot and mint the duplicate this lock exists to prevent.
 */
export type PlaceLockProbe = { held: boolean; join: LocationRecord | null };

export async function probePlaceLock(
  read: (pk: string, sk: string) => Promise<DynamoItem | null>,
  spot: PlaceSpot,
  slot: number,
): Promise<PlaceLockProbe> {
  const key = placeLockKey(spot, slot);
  return probeLockAt(read, key.pk, spot);
}

/**
 * The nearby query runs on gsi2, which is eventually consistent, so a place
 * created a moment ago one cell over can be missing from it while its lock
 * already sits on the main table. Read the neighbours' locks with
 * ConsistentRead before writing, and join any holder inside the radius.
 *
 * Same 5x5 neighbourhood as the query: a pin at a cell edge reaches 40 m into
 * the second cell over. Each cell's slots are walked in order and the walk
 * stops at the first free one, so a cell costs one read unless it really
 * holds several spots.
 *
 * This closes the catch-up window, not the instant. Two writers in the same
 * moment across a cell boundary hold different locks and can both create.
 * That is the trade the slot walk already makes: a possible duplicate, never
 * a lost report.
 */
export async function probeNeighbourLocks(
  read: (pk: string, sk: string) => Promise<DynamoItem | null>,
  spot: PlaceSpot,
): Promise<LocationRecord | null> {
  const own = clusterKey(spot.lat, spot.lng);
  const cells = neighbourClusterKeys(spot.lat, spot.lng).filter((cell) => cell !== own);
  const found = await Promise.all(
    cells.map(async (cell) => {
      const base = placeLockPk(cell, spot.issueType);
      for (let slot = 0; slot < PLACE_LOCK_SLOTS; slot += 1) {
        const probe = await probeLockAt(read, slot === 0 ? base : `${base}#${slot}`, spot);
        if (probe.join) return probe.join;
        if (!probe.held) return null;
      }
      return null;
    }),
  );
  return found.find((location) => location !== null) ?? null;
}

async function probeLockAt(
  read: (pk: string, sk: string) => Promise<DynamoItem | null>,
  pk: string,
  spot: PlaceSpot,
): Promise<PlaceLockProbe> {
  const lock = await read(pk, "LOCK");
  const locationId = typeof lock?.locationId === "string" ? lock.locationId : null;
  if (!locationId) return { held: false, join: null };

  const item = await read(`LOC#${locationId}`, "META");
  if (!item) return { held: true, join: null };
  const location = fromLocationItem(item);
  // A cell spans ~43 m against a 40 m match radius, so the radius wins.
  const metres = metersBetween(spot.lat, spot.lng, location.lat, location.lng);
  return { held: true, join: metres <= MATCH_METERS ? location : null };
}

import { neighbourClusterKeys } from "@/lib/geo";

/**
 * Bumped when stored rows need the seed to run again. `-v2` carries the issue
 * type onto locations seeded before that was a field. `-v3` deletes the retired
 * museum obstruction report. `-v4` stops seeding tenders and interventions;
 * leftover evidence rows stay in a live table and the catalog ignores them.
 * `-v5` replaces a changed seed description and clears isSample after a desk photo.
 */
export const SEED_VERSION = "rasta-v1";
export const SEED_PK = "SEED";

export function locationPk(id: string): string {
  return `LOC#${id}`;
}

export function reportPk(id: string): string {
  return `RPT#${id}`;
}

export function slugLockPk(slug: string): string {
  return `SLUG#${slug}`;
}

export function geoPk(cluster: string): string {
  return `GEO#${cluster}`;
}

/**
 * One place per problem per geo cell, on the main table's primary key. Taking
 * this inside the create transact is what stops two concurrent writers both
 * deciding no place exists yet: the loser's transact is cancelled, and a
 * ConsistentRead of this key names the winner. The gsi2 nearby query cannot do
 * that job because it is eventually consistent.
 */
export function placeLockPk(cluster: string, issueType: string): string {
  return `PLACE#${cluster}#${issueType}`;
}

export function notePk(id: string): string {
  return `UPD#${id}`;
}

export function neighbourGeoPks(lat: number, lng: number): string[] {
  return neighbourClusterKeys(lat, lng).map(geoPk);
}

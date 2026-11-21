import "server-only";

const BATCH = 8;

/** Run `read` over `items` with at most eight promises in flight. */
export async function mapInBatches<T, R>(
  items: readonly T[],
  read: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += BATCH) {
    out.push(...(await Promise.all(items.slice(i, i + BATCH).map(read))));
  }
  return out;
}

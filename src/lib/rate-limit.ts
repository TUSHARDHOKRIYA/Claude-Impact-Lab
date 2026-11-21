type Bucket = { count: number; resetAt: number };

const MAX_BUCKETS = 4096;
const buckets = new Map<string, Bucket>();

function dropExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function dropEarliestReset(): void {
  let oldestKey: string | undefined;
  let oldestReset = Infinity;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < oldestReset) {
      oldestReset = bucket.resetAt;
      oldestKey = key;
    }
  }
  if (oldestKey !== undefined) buckets.delete(oldestKey);
}

export function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  dropExpired(now);
  const bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) dropEarliestReset();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

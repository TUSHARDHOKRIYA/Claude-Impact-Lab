/** "F/S" ward code to and from the "f-s" URL segment. */
export function wardSlug(code: string): string {
  return code.toLowerCase().replace(/\//g, "-");
}

export function wardFromSlug<T extends { ward: { code: string } }>(rows: readonly T[], slug: string): T | null {
  const wanted = slug.toLowerCase();
  return rows.find((row) => wardSlug(row.ward.code) === wanted) ?? null;
}

export function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

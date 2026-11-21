/** Indian-number formatting for rupee amounts. Whole rupees in, strings out. */

/** Group digits the Indian way: 1234567 -> "12,34,567". */
export function groupIndian(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.round(Math.abs(n)));
  if (digits.length <= 3) return sign + digits;
  const tail = digits.slice(-3);
  const head = digits.slice(0, -3);
  const groups: string[] = [];
  for (let i = head.length; i > 0; i -= 2) {
    groups.unshift(head.slice(Math.max(0, i - 2), i));
  }
  return sign + groups.join(",") + "," + tail;
}

/** Full amount with the rupee symbol, e.g. "₹1,23,456". */
export function formatInr(n: number): string {
  return "₹" + groupIndian(n);
}

/** Compact amount for charts and cards: "₹12.3 L", "₹1.2 Cr", "₹45K". */
export function formatInrShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `₹${Math.round(n / 1e3)}K`;
  return "₹" + Math.round(n);
}

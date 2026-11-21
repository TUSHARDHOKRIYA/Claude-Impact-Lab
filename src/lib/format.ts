export function formatDay(value: string, month: "short" | "long" = "short"): string {
  const iso = value.includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month,
    year: "numeric",
  }).format(date);
}

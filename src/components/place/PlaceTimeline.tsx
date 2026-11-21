import { ReportRows } from "@/components/place/ReportRows";
import type { PlaceHistoryEvent } from "@/lib/types";

const NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Rows shown before the rest fold away. Whole months only. */
const OPEN_ROWS = 8;

type Month = { key: string; label: string; events: PlaceHistoryEvent[] };

function byMonth(events: PlaceHistoryEvent[]): Month[] {
  const months: Month[] = [];
  for (const event of events) {
    const key = event.at.slice(0, 7);
    const last = months.at(-1);
    if (last?.key === key) last.events.push(event);
    else months.push({ key, label: `${NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`, events: [event] });
  }
  return months;
}

function MonthBlock({ month }: { month: Month }) {
  const n = month.events.length;
  return (
    <section className="rb-month" aria-label={`${month.label}, ${n} ${n === 1 ? "report" : "reports"}`}>
      <h3 className="rb-month-head">
        {month.label}
        <span>{n}</span>
      </h3>
      <ReportRows events={month.events} />
    </section>
  );
}

/** Every report on this stretch, newest first, a month at a time. */
export function PlaceTimeline({ history }: { history: PlaceHistoryEvent[] }) {
  const months = byMonth([...history].sort((a, b) => b.at.localeCompare(a.at)));
  let shown = 0;
  let split = 0;
  while (split < months.length && (split === 0 || shown + months[split].events.length <= OPEN_ROWS)) {
    shown += months[split].events.length;
    split += 1;
  }
  const rest = months.slice(split);
  const restCount = history.length - shown;

  return (
    <section aria-labelledby="place-story-heading" className="min-w-0">
      <h2 id="place-story-heading" className="ux4g-heading-s-strong">
        What people reported
      </h2>

      {history.length === 0 ? (
        <p className="ux4g-text ux4g-text-neutral-secondary mt-4">No public report is attached to this place yet.</p>
      ) : (
        <>
          {months.slice(0, split).map((month) => (
            <MonthBlock key={month.key} month={month} />
          ))}
          {rest.length ? (
            <details className="rb-more">
              <summary className="ux4g-btn ux4g-btn-m ux4g-btn-outline-primary touch-target">
                Show {restCount} earlier {restCount === 1 ? "report" : "reports"}
              </summary>
              {rest.map((month) => (
                <MonthBlock key={month.key} month={month} />
              ))}
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

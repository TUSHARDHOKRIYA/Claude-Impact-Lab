import Link from "next/link";

import type { PlaceHistoryEvent } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "27 Sep" from a YYYY-MM-DD day. */
export function shortDay(at: string): string {
  return `${Number(at.slice(8, 10))} ${MONTHS[Number(at.slice(5, 7)) - 1]}`;
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Reports as compact rows: the day, what the person said (two lines at most),
 * and the whole row opens the report.
 */
export function ReportRows({ events }: { events: PlaceHistoryEvent[] }) {
  return (
    <ul className="rb-rrows">
      {events.map((event) => {
        const inner = (
          <>
            <time dateTime={event.at} className="rb-rrow-day">
              {shortDay(event.at)}
            </time>
            <span className="rb-rrow-text">{event.body}</span>
            {event.href ? <Chevron /> : null}
          </>
        );
        return (
          <li key={event.id}>
            {event.href ? (
              <Link href={event.href} className="rb-rrow touch-target">
                {inner}
              </Link>
            ) : (
              <div className="rb-rrow">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

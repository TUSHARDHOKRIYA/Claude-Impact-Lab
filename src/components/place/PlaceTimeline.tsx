import Link from "next/link";

import { noticedWhen } from "@/lib/noticed-label";
import type { PlaceHistoryEvent } from "@/lib/types";

const LINK = "ux4g-text-link-m touch-target inline-flex items-center";

/** Every report on this stretch, oldest first, each linking to the full report. */
export function PlaceTimeline({ history }: { history: PlaceHistoryEvent[] }) {
  const story = [...history].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <section aria-labelledby="place-story-heading" className="min-w-0">
      <h2 id="place-story-heading" className="ux4g-heading-xs-strong">
        Reports on this stretch
      </h2>
      <p className="ux4g-body-s-default ux4g-text-neutral-secondary">Oldest first.</p>

      {story.length === 0 ? (
        <p className="ux4g-text ux4g-text-neutral-secondary mt-4">No public report is attached to this place yet.</p>
      ) : (
        <ol className="rb-timeline">
          {story.map((event) => (
            <li key={event.id} className="min-w-0">
              <time dateTime={event.at} className="ux4g-body-s-strong">
                {noticedWhen({ noticedAt: event.at, noticedWindow: event.noticedWindow, createdAt: event.createdAt })}
              </time>
              <p className="ux4g-body-m-default mt-1 break-words">{event.body}</p>
              {event.href ? (
                <Link href={event.href} className={LINK}>
                  Open the report
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

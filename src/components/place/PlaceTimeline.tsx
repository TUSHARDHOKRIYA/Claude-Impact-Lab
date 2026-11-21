import Link from "next/link";

import { GovBadge } from "@/components/gov/GovBadge";
import { noticedWhen } from "@/lib/noticed-label";
import type { PlaceHistoryEvent } from "@/lib/types";

const LINK = "ux4g-text-link-m touch-target inline-flex items-center";

export function PlaceTimeline({ history }: { history: PlaceHistoryEvent[] }) {
  const story = [...history].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <section aria-labelledby="place-story-heading" className="min-w-0">
      <p className="ux4g-card-sub-title">Chronology</p>
      <h2 id="place-story-heading" className="ux4g-heading-l-strong mt-2">
        Reports on this stretch
      </h2>
      <p className="ux4g-text mt-3">Street reports in the order they were noticed.</p>

      {story.length === 0 ? (
        <p className="ux4g-text ux4g-text-neutral-secondary mt-4">No public event is attached to this place yet.</p>
      ) : (
        <ol className="mt-6 flex flex-col gap-6 border-l border-rule-firm pl-4 sm:pl-6">
          {story.map((event) => (
            <li key={event.id} className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <time dateTime={event.at} className="ux4g-text">
                  {noticedWhen({ noticedAt: event.at, noticedWindow: event.noticedWindow, createdAt: event.createdAt })}
                </time>
                <GovBadge tone="info">Street report</GovBadge>
              </p>
              <p className="ux4g-text mt-2 break-words">{event.body}</p>
              {event.href ? (
                <p className="mt-2">
                  <Link href={event.href} className={LINK}>
                    Open the public report
                  </Link>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

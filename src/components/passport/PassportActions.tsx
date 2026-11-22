import type { PassportRecommendedAction } from "@/lib/passport/types";

export function PassportActions({ actions }: { actions: PassportRecommendedAction[] }) {
  return (
    <section aria-labelledby="actions-heading" className="ux4g-card ux4g-card-solid p-6 border border-[var(--rule)] space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="actions-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
          Recommended Next Actions
        </h2>
        <span className="text-xs text-[var(--mist)]">Deterministic Decision Support</span>
      </div>

      <div className="space-y-3">
        {actions.map((act, index) => (
          <div
            key={index}
            className="rb-action-item"
            data-priority={act.priority}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rb-chip ${act.priority === "critical" ? "rb-chip-failed" : act.priority === "high" ? "rb-chip-flagged" : "rb-chip-neutral"}`}>
                {act.priority} priority
              </span>
              <span className="text-xs text-[var(--mist)]">
                Assigned to: <strong className="text-[var(--ink)]">{act.actionRequiredBy}</strong>
              </span>
            </div>

            <h3 className="ux4g-body-m-strong text-[var(--ink)] mt-1">
              {act.headline}
            </h3>

            <p className="text-xs text-[var(--mist)] leading-relaxed">
              {act.explanation}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

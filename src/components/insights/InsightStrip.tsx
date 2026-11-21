import type { MapInsightCounts } from "@/lib/types";

const ITEMS: {
  key: keyof MapInsightCounts;
  label: string;
  hint: string;
}[] = [
  {
    key: "reports",
    label: "Reports",
    hint: "Street reports stored for these places.",
  },
  {
    key: "places",
    label: "Places",
    hint: "Places with at least one report.",
  },
  {
    key: "recurringPlaces",
    label: "Recurring",
    hint: "Two or more reports, or a report marked as recurring.",
  },
];

export function InsightStrip({ insights }: { insights: MapInsightCounts }) {
  return (
    <section aria-labelledby="insight-heading" className="border-b border-rule-firm bg-sheet">
      <div className="shell py-10 sm:py-12">
        <h2 id="insight-heading" className="ux4g-heading-l-strong">
          Counts from the stored records
        </h2>
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.key} className="ux4g-card ux4g-card-outline ux4g-card-vertical p-4">
              <dt className="ux4g-heading-xs-strong">{item.label}</dt>
              <dd className="mt-2">
                <span className="ux4g-heading-xl-strong">{insights[item.key]}</span>
                <p className="ux4g-text ux4g-text-neutral-secondary mt-2">{item.hint}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

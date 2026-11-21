import { readMarkerColors } from "@/components/map/map-style";

const LABELS = [
  { key: "enamel", label: "1–3 reports" },
  { key: "dark", label: "4–7" },
  { key: "oxide", label: "8 or more" },
] as const;

export function MapLegend() {
  const mark = readMarkerColors();

  return (
    <div className="ux4g-card-footer flex flex-wrap items-center gap-x-6 gap-y-2">
      <p className="ux4g-heading-xs-strong">Cluster size</p>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {LABELS.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 rounded-full"
              style={{
                background: mark[item.key],
                boxShadow: `0 0 0 2px ${mark.marking}`,
              }}
            />
            <span className="ux4g-text ux4g-text-neutral-secondary">{item.label}</span>
          </li>
        ))}
      </ul>
      <p className="ux4g-text ux4g-text-neutral-tertiary ml-auto hidden sm:block">
        Select a mark to open the place
      </p>
    </div>
  );
}

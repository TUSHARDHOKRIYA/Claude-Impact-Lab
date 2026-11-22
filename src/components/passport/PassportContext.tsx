import type { RoadPassportData } from "@/lib/passport/types";

export function PassportContext({ data }: { data: RoadPassportData }) {
  const { traffic, accidents, facilities, floodHotspots, road } = data;

  return (
    <section aria-labelledby="context-heading" className="ux4g-card ux4g-card-solid p-6 border border-[var(--rule)] space-y-6">
      <div>
        <h2 id="context-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
          Environmental & Public Safety Context
        </h2>
        <p className="ux4g-body-s-default text-[var(--mist)] mt-1">
          Surrounding factors that influence repair durability and public urgency on Ward {road.ward}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {traffic && (
          <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] space-y-2">
            <h3 className="ux4g-body-m-strong text-[var(--ink)]">Traffic Exposure</h3>
            <div className="text-xs space-y-1.5 text-[var(--mist)]">
              <div className="flex justify-between">
                <span>Peak Hour Vehicles:</span>
                <strong className="text-[var(--ink)] font-mono">{traffic.peakHourVehicles.toLocaleString("en-IN")} / hr</strong>
              </div>
              <div className="flex justify-between">
                <span>Avg Peak Speed:</span>
                <strong className="text-[var(--ink)]">{traffic.avgPeakSpeedKmph} km/h</strong>
              </div>
              <div className="flex justify-between">
                <span>Congestion Index:</span>
                <strong className="text-[var(--ink)]">{traffic.congestionIndex.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Bus Routes Operating:</span>
                <strong className="text-[var(--ink)]">{traffic.busRoutesCount}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] space-y-2">
          <h3 className="ux4g-body-m-strong text-[var(--ink)]">
            Accident History ({accidents.length})
          </h3>
          {accidents.length === 0 ? (
            <p className="text-xs text-[var(--mist)]">Zero road accidents recorded on this segment in dataset.</p>
          ) : (
            <ul className="text-xs space-y-2 text-[var(--mist)]">
              {accidents.slice(0, 3).map((a) => (
                <li key={a.id} className="border-b border-[var(--rule)] pb-1.5 last:border-b-0">
                  <div className="flex justify-between text-[var(--ink)] font-medium">
                    <span>{a.severity} Severity</span>
                    <span>{a.occurredAt}</span>
                  </div>
                  <div>Cause: {a.probableCause} ({a.vehicleType})</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] space-y-2">
          <h3 className="ux4g-body-m-strong text-[var(--ink)]">
            Flood Hotspots in Ward ({floodHotspots.length})
          </h3>
          {floodHotspots.length === 0 ? (
            <p className="text-xs text-[var(--mist)]">No chronic waterlogging hotspots recorded in Ward {road.ward}.</p>
          ) : (
            <ul className="text-xs space-y-1.5 text-[var(--mist)]">
              {floodHotspots.slice(0, 3).map((h) => (
                <li key={h.id} className="flex justify-between">
                  <span>{h.name}:</span>
                  <span className="text-[var(--ink)] font-medium">
                    {h.avgWaterDepthCm} cm depth (tide sensitive: {h.tideSensitive ? "Yes" : "No"})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] space-y-2">
          <h3 className="ux4g-body-m-strong text-[var(--ink)]">
            Critical Facilities Nearby ({facilities.length})
          </h3>
          {facilities.length === 0 ? (
            <p className="text-xs text-[var(--mist)]">No critical hospital ambulance routes mapped to this road segment.</p>
          ) : (
            <ul className="text-xs space-y-1.5 text-[var(--mist)]">
              {facilities.slice(0, 3).map((f) => (
                <li key={f.id} className="flex justify-between">
                  <span className="truncate pr-2">{f.name}:</span>
                  <span className="text-[var(--ink)] font-medium shrink-0">
                    {f.type} ({f.emergencyServices ? "Emergency" : "Standard"})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

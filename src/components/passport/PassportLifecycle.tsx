import type { RoadPassportData } from "@/lib/passport/types";

type LifecycleStage = {
  name: string;
  status: "verified" | "recorded" | "missing" | "inferred";
  detail: string;
};

export function PassportLifecycle({ data }: { data: RoadPassportData }) {
  const { workOrders, road } = data;
  const hasOrders = workOrders.length > 0;
  const latestOrder = hasOrders ? workOrders[0] : null;

  const stages: LifecycleStage[] = [
    {
      name: "1. Announced",
      status: "inferred",
      detail: `Annual monsoon preparation plan for Ward ${road.ward}.`,
    },
    {
      name: "2. Sanctioned",
      status: "missing",
      detail: "Administrative sanction number not published in synthetic dataset.",
    },
    {
      name: "3. Tendered",
      status: "missing",
      detail: "Public e-tender BOQ notice not provided in source CSV.",
    },
    {
      name: "4. Awarded",
      status: hasOrders ? "recorded" : "missing",
      detail: hasOrders
        ? `Contract assigned to ${latestOrder?.contractorName} on ${latestOrder?.assignedAt}.`
        : "No award record available.",
    },
    {
      name: "5. Started",
      status: hasOrders ? "recorded" : "missing",
      detail: hasOrders
        ? `Work started on ${latestOrder?.startedAt}.`
        : "No start record available.",
    },
    {
      name: "6. Completion Recorded",
      status: hasOrders ? "recorded" : "missing",
      detail: hasOrders
        ? `Completion recorded on ${latestOrder?.completedAt} (SLA ${latestOrder?.slaMet ? "met" : "missed"}).`
        : "No completion record available.",
    },
    {
      name: "7. Independently Verified",
      status: "missing",
      detail: "Physical 3rd-party audit verification or core sample test pending.",
    },
  ];

  return (
    <section aria-labelledby="lifecycle-heading" className="ux4g-card ux4g-card-solid p-6 border border-[var(--rule)] space-y-4">
      <div>
        <h2 id="lifecycle-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
          Promises vs Reality Lifecycle
        </h2>
        <p className="ux4g-body-s-default text-[var(--mist)] mt-1">
          Tracking the recorded journey of road interventions from announcement to independent verification.
        </p>
      </div>

      <div className="rb-step-chain pt-2">
        {stages.map((st, i) => (
          <div
            key={i}
            className={`rb-step-node ${st.status === "verified" ? "rb-step-node-verified" : st.status === "missing" ? "rb-step-node-missing" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold text-xs text-[var(--ink)]">{st.name}</span>
              <span
                className={`rb-chip text-[0.625rem] ${st.status === "recorded" ? "rb-chip-held" : st.status === "missing" ? "rb-chip-failed" : "rb-chip-neutral"}`}
              >
                {st.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[var(--mist)] mt-0.5">{st.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

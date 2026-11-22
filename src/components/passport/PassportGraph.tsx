import type { EvidenceEdge } from "@/lib/passport/types";

export function PassportGraph({ edges }: { edges: EvidenceEdge[] }) {
  if (edges.length === 0) {
    return (
      <div className="ux4g-card ux4g-card-solid p-6 text-center text-[var(--mist)] text-xs">
        No relational evidence edges generated for this road segment.
      </div>
    );
  }

  return (
    <section aria-labelledby="graph-heading" className="ux4g-card ux4g-card-solid p-6 border border-[var(--rule)] space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="graph-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
          Evidence Graph & Provenance
        </h2>
        <span className="text-xs text-[var(--mist)]">{edges.length} Verified Links</span>
      </div>

      <div className="space-y-2">
        {edges.slice(0, 6).map((edge) => (
          <div
            key={edge.id}
            className="p-3 rounded border border-[var(--rule)] bg-[var(--card)] text-xs flex flex-col gap-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[var(--ink)] font-medium text-xs flex items-center gap-1.5 font-mono">
                <span>{edge.sourceType.replace(/_/g, " ")} ({edge.sourceId})</span>
                <span className="text-[var(--mist)] font-sans" aria-hidden="true">→</span>
                <span>{edge.targetType.replace(/_/g, " ")} ({edge.targetId})</span>
              </span>
              <span className="rb-chip rb-chip-held text-[0.625rem]">
                {edge.relationship.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-[var(--mist)] text-[0.6875rem]">{edge.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

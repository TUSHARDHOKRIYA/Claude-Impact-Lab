import type { Metadata } from "next";
import Link from "next/link";
import { getRupee } from "@/lib/rupee/index";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track Your Road Problem Report — Rasta Hisaab 2.0",
  description:
    "Track the real-time status of your road complaint across BMC municipal work orders and contractor billing.",
};

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function TrackPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const { ds } = getRupee();

  const queryId = id?.trim().toUpperCase();
  const complaint = queryId
    ? ds.complaints.find((c) => c.id.toUpperCase() === queryId)
    : null;

  const linkedWorkOrder = complaint
    ? ds.workOrders.find((w) => w.complaintIds.includes(complaint.id))
    : null;

  return (
    <article className="shell-narrow rb-page py-6 sm:py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Track a Road Problem</h1>
        <p className="ux4g-body-m-default text-[var(--mist)]">
          Enter your Complaint ID (e.g. <code>BMC25-000005</code>) or App submission reference to see downstream work orders and repair status.
        </p>
      </header>

      <form method="get" action="/track" className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="id"
          defaultValue={id ?? ""}
          placeholder="Enter Complaint ID (e.g. BMC25-000005)..."
          className="ux4g-input flex-1 min-w-[16rem] py-2.5 px-3.5 text-sm rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)] font-mono"
          required
        />
        <button type="submit" className="ux4g-btn ux4g-btn-m ux4g-btn-primary touch-target">
          Track Status
        </button>
      </form>

      {queryId && !complaint && (
        <div className="p-4 rounded border border-[#b0281f] bg-[rgb(176_40_31/0.08)] text-xs text-[#b0281f]">
          No complaint record found matching <strong>{queryId}</strong> in municipal dataset. Please check the ID and try again.
        </div>
      )}

      {complaint && (
        <div className="p-6 rounded border border-[var(--rule)] bg-[var(--card)] space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-3">
            <div>
              <span className="font-mono font-bold text-sm text-[var(--ink)]">{complaint.id}</span>
              <span className="text-xs text-[var(--mist)] ml-2">Logged: {complaint.receivedAt}</span>
            </div>
            <span className="rb-chip rb-chip-held text-xs font-semibold">
              Status: {complaint.status}
            </span>
          </div>

          <div className="text-xs text-[var(--mist)] space-y-1">
            <div>Category: <strong className="text-[var(--ink)]">{complaint.category}</strong></div>
            <div>Locality: <strong className="text-[var(--ink)]">{complaint.locality}</strong> (Ward {complaint.ward ?? "Unassigned"})</div>
            <div>Channel: <strong className="text-[var(--ink)]">{complaint.channel}</strong></div>
          </div>

          <p className="text-xs text-[var(--ink)] bg-[var(--sheet)] p-3 rounded italic leading-relaxed">
            &ldquo;{complaint.description}&rdquo;
          </p>

          <div className="pt-2 border-t border-[var(--rule)] flex flex-wrap items-center justify-between gap-3">
            <div>
              {linkedWorkOrder ? (
                <span className="text-xs text-[#127a52] font-semibold flex items-center gap-1">
                  <span>✓</span> Linked to Work Order {linkedWorkOrder.id} ({linkedWorkOrder.contractorName})
                </span>
              ) : (
                <span className="text-xs text-[var(--mist)]">
                  No municipal work order assigned yet.
                </span>
              )}
            </div>

            <Link
              href={`/receipt/${complaint.id}`}
              className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs inline-flex items-center gap-1"
            >
              View Rupee Receipt →
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}

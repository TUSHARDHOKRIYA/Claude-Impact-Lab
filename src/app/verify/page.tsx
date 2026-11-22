import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Citizen Repair Verification — Rasta Hisaab 2.0",
  description:
    "Verify road repair outcomes in your neighborhood: record whether a reported fix held, returned, or failed.",
};

type PageProps = {
  searchParams: Promise<{ submitted?: string; id?: string }>;
};

export default async function VerifyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <article className="shell-narrow rb-page py-6 sm:py-10 space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="rb-chip rb-chip-neutral">Crowdsourced Accountability</span>
          <span className="rb-chip rb-chip-held">Citizen Observation</span>
        </div>
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Citizen Repair Verification</h1>
        <p className="ux4g-body-m-default text-[var(--mist)]">
          Official records show repairs marked as completed. Help verify if the physical road was truly fixed or if the pothole has returned.
        </p>
      </header>

      {params.submitted === "1" ? (
        <div className="p-6 rounded border border-[#127a52] bg-[rgb(18_122_82/0.08)] space-y-3">
          <h2 className="ux4g-heading-s-strong text-[#127a52]">Observation Recorded Successfully</h2>
          <p className="text-xs text-[var(--mist)] leading-relaxed">
            Thank you! Your feedback has been logged as an independent citizen observation edge in the Rasta Hisaab Evidence Graph. Citizen observations remain distinct from official engineer sign-offs to preserve evidentiary integrity.
          </p>
          <div className="pt-2">
            <Link href="/roads" className="ux4g-btn ux4g-btn-s ux4g-btn-primary touch-target">
              Explore Mumbai Roads
            </Link>
          </div>
        </div>
      ) : (
        <form
          action="/verify?submitted=1"
          method="post"
          className="p-6 rounded border border-[var(--rule)] bg-[var(--card)] space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="complaint-id" className="block text-xs font-semibold text-[var(--ink)]">
              Complaint Reference ID
            </label>
            <input
              id="complaint-id"
              name="complaintId"
              type="text"
              defaultValue={params.id ?? ""}
              placeholder="e.g. BMC25-000005 or rpt_..."
              className="ux4g-input w-full py-2 px-3 text-sm rounded border border-[var(--rule)] bg-[var(--card)] font-mono text-[var(--ink)]"
              required
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-[var(--ink)]">
              Observed Field Status of Road Repair
            </legend>
            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded border border-[var(--rule)] bg-[var(--sheet)] cursor-pointer hover:bg-[var(--card)]">
                <input type="radio" name="observation" value="fixed" defaultChecked className="mt-0.5" />
                <div>
                  <strong className="block text-[var(--ink)]">Fix is Holding Well</strong>
                  <span className="text-[var(--mist)]">Smooth surface, no visible depression or crater.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded border border-[var(--rule)] bg-[var(--sheet)] cursor-pointer hover:bg-[var(--card)]">
                <input type="radio" name="observation" value="returned" className="mt-0.5" />
                <div>
                  <strong className="block text-[var(--ink)]">Defect Has Returned / Reopened</strong>
                  <span className="text-[var(--mist)]">Pothole reopened, paver block displaced, or patch eroded.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded border border-[var(--rule)] bg-[var(--sheet)] cursor-pointer hover:bg-[var(--card)]">
                <input type="radio" name="observation" value="persists" className="mt-0.5" />
                <div>
                  <strong className="block text-[var(--ink)]">Never Repaired / Defect Persists</strong>
                  <span className="text-[var(--mist)]">No evidence of physical work ever taking place.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded border border-[var(--rule)] bg-[var(--sheet)] cursor-pointer hover:bg-[var(--card)]">
                <input type="radio" name="observation" value="new_issue" className="mt-0.5" />
                <div>
                  <strong className="block text-[var(--ink)]">New Hazard Observed</strong>
                  <span className="text-[var(--mist)]">Waterlogging, open manhole, or cave-in near repair site.</span>
                </div>
              </label>
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-xs font-semibold text-[var(--ink)]">
              Additional Citizen Remarks (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Describe current road condition, landmark, or lane location..."
              className="ux4g-input w-full py-2 px-3 text-xs rounded border border-[var(--rule)] bg-[var(--card)] text-[var(--ink)]"
            />
          </div>

          <div className="p-3 rounded bg-[var(--sheet)] text-[0.6875rem] text-[var(--mist)]">
            <strong>Evidentiary Notice:</strong> Submissions are classified as citizen field observations and do not override municipal contractor completion certificates without physical re-inspection.
          </div>

          <button type="submit" className="ux4g-btn ux4g-btn-m ux4g-btn-primary w-full touch-target">
            Submit Citizen Verification
          </button>
        </form>
      )}
    </article>
  );
}

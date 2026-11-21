import { redirect } from "next/navigation";

import { logout } from "@/app/admin/actions";
import { ReportEditor } from "@/components/admin/ReportEditor";
import { GovAlert } from "@/components/gov/GovAlert";
import { GovButton } from "@/components/gov/GovButton";
import { isAdminAuthed } from "@/lib/admin-auth";
import { listAllReports, listNotesByReport } from "@/lib/queries";

type AdminPageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export const metadata = {
  title: "Desk — Kala Ghoda Khabar",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const reports = await listAllReports();
  const notes = await listNotesByReport();
  const { saved, error } = await searchParams;
  const countLabel = reports.length === 1 ? "report" : "reports";

  return (
    <div className="shell max-w-[60rem] min-w-0 py-8 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ux4g-card-sub-title">Records desk</p>
          <h1 className="ux4g-heading-xl-strong mt-2">Desk</h1>
          <p className="ux4g-text mt-4 max-w-xl">
            Every report on this desk is already in the public record. Edit the
            text, issue type, whether it recurs, or leave a note. This is not a
            moderation queue.
          </p>
        </div>
        <form action={logout} className="flex-none">
          <GovButton type="submit" variant="secondary">
            Close desk
          </GovButton>
        </form>
      </div>

      <p className="mt-8 flex flex-wrap items-baseline gap-2">
        <span className="ux4g-heading-l-strong">{reports.length}</span>
        <span className="ux4g-text ux4g-text-neutral-secondary">
          {countLabel} on the desk
        </span>
      </p>

      {error ? (
        <GovAlert variant="error" className="mt-6">
          {error}
        </GovAlert>
      ) : null}

      {saved ? (
        <GovAlert variant="info" className="mt-6">
          Saved {saved}.
        </GovAlert>
      ) : null}

      {reports.length === 0 ? (
        <p className="ux4g-text ux4g-text-neutral-secondary mt-8">
          No reports are stored yet.
        </p>
      ) : (
        <ol className="mt-8 flex flex-col gap-6">
          {reports.map((report) => (
            <li key={report.id} className="min-w-0">
              <ReportEditor report={report} notes={notes.get(report.id) ?? []} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

import { updateReportAction } from "@/app/admin/actions";
import { GovButton } from "@/components/gov/GovButton";
import { GovField } from "@/components/gov/GovField";
import { noticedWhen } from "@/lib/noticed-label";
import { ISSUE_TYPES, ISSUE_TYPE_LABELS, type ReportListItem } from "@/lib/types";

export type DeskNote = {
  id: string;
  body: string;
  createdAt: string;
};

type ReportEditorProps = {
  report: ReportListItem;
  notes: DeskNote[];
};

function fieldId(reportId: string, name: string): string {
  return `${reportId}-${name}`;
}

export function ReportEditor({ report, notes }: ReportEditorProps) {
  return (
    <article className="ux4g-card ux4g-card-solid ux4g-card-vertical min-w-0">
      <header className="ux4g-card-header flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ux4g-text ux4g-text-neutral-tertiary break-all">{report.id}</p>
          <h2 className="ux4g-heading-xs-strong mt-1 break-words">
            {ISSUE_TYPE_LABELS[report.issueType]}
          </h2>
        </div>
        <GovButton href={`/reports/${report.id}`} variant="secondary">
          Open the public page
        </GovButton>
      </header>

      <div className="ux4g-card-body">
        <form action={updateReportAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={report.id} />

          <p className="ux4g-text flex flex-wrap items-center gap-2">
            <span className="ux4g-heading-xs-strong">Noticed</span>
            <span>{noticedWhen(report)}</span>
          </p>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <GovField
              id={fieldId(report.id, "issueType")}
              label="Issue type"
              name="issueType"
              as="select"
              defaultValue={report.issueType}
            >
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ISSUE_TYPE_LABELS[type]}
                </option>
              ))}
            </GovField>
            <GovField
              id={fieldId(report.id, "recurs")}
              label="Recurs"
              name="recurs"
              as="select"
              defaultValue={report.recurs ? "true" : "false"}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </GovField>
          </div>

          <GovField
            id={fieldId(report.id, "description")}
            label="Description"
            name="description"
            as="textarea"
            rows={4}
            maxLength={2000}
            defaultValue={report.description ?? ""}
          />

          {notes.length > 0 ? (
            <section>
              <h3 className="ux4g-heading-xs-strong">Desk notes</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="border-l-4 border-[var(--enamel)] bg-[var(--sheet)] px-3 py-2"
                  >
                    <p className="ux4g-text break-words">{note.body}</p>
                    <p className="ux4g-text ux4g-text-neutral-tertiary mt-1">
                      {note.createdAt}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <GovField
            id={fieldId(report.id, "note")}
            label="Note"
            name="note"
            as="textarea"
            rows={3}
            maxLength={2000}
            placeholder="Add a desk update. This does not replace the description."
          />

          <GovButton type="submit">Save changes</GovButton>
        </form>
      </div>
    </article>
  );
}

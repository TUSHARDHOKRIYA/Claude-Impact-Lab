import type { AssistantStructuredResponse } from "@/lib/assistant/types";

/** Record chips only make sense when the answer is about a complaint or a work order. */
function aboutARecord(data: AssistantStructuredResponse): boolean {
  return Boolean(data.linkedIssueReference || data.workOrderReferences.length || data.costInr != null);
}

/**
 * One answer, set as plain text (no bubble): a row of facts about the
 * record, the answer itself, the next step, and the records it checked.
 */
export function AssistantAnswer({ text, data }: { text: string; data?: AssistantStructuredResponse }) {
  return (
    <article className="rb-chat-answer">
      <p className="rb-chat-who">
        <span className="rb-chat-mark" aria-hidden="true">
          R
        </span>
        Rastabaaz
      </p>

      {data && aboutARecord(data) ? (
        <ul className="rb-chat-facts" aria-label="About this record">
          <li data-tone={data.isOfficialLink ? "good" : "warn"}>
            {data.isOfficialLink ? "Official BMC record" : "Not confirmed by a BMC record"}
          </li>
          {data.complaintStatus ? <li>Status: {data.complaintStatus}</li> : null}
          {data.costInr != null ? <li>Billed ₹{data.costInr.toLocaleString("en-IN")}</li> : null}
          {data.contractorName ? <li>{data.contractorName}</li> : null}
        </ul>
      ) : null}

      <div className="rb-chat-text">{text}</div>

      {data?.nextAction ? (
        <div className="rb-chat-next">
          <p className="rb-chat-next-label">What you can do next</p>
          <p>{data.nextAction}</p>
        </div>
      ) : null}

      {data && data.evidenceSources.length > 0 ? (
        <details className="rb-chat-sources">
          <summary>
            Checked {data.evidenceSources.length} {data.evidenceSources.length === 1 ? "record" : "records"}
          </summary>
          <ul>
            {data.evidenceSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

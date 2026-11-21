"use client";

import { useId, useState } from "react";

import type { AssistantLanguage } from "@/lib/assistant/types";

const LANGS: Array<{ code: AssistantLanguage; short: string; name: string }> = [
  { code: "en", short: "EN", name: "English" },
  { code: "hi", short: "हिं", name: "हिंदी" },
  { code: "mr", short: "मरा", name: "मराठी" },
];

/**
 * The one card on the page: a growing text box, then a row with the
 * optional complaint ID, the answer language and the send button.
 * Enter sends; Shift+Enter starts a new line.
 */
export function ChatComposer({
  query,
  onQuery,
  complaintId,
  onComplaintId,
  language,
  onLanguage,
  busy,
  onSend,
  compact = false,
}: {
  query: string;
  onQuery: (value: string) => void;
  complaintId: string;
  onComplaintId: (value: string) => void;
  language: AssistantLanguage;
  onLanguage: (value: AssistantLanguage) => void;
  busy: boolean;
  onSend: () => void;
  /** Docked under a conversation: one line until the person types more. */
  compact?: boolean;
}) {
  const [idOpen, setIdOpen] = useState(Boolean(complaintId));
  const inputId = useId();
  const idFieldId = useId();
  const canSend = !busy && query.trim().length > 0;

  return (
    <form
      className={compact ? "rb-composer rb-composer-compact" : "rb-composer"}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Your question
      </label>
      <textarea
        id={inputId}
        rows={compact ? 1 : 2}
        value={query}
        placeholder={compact ? "Ask a follow-up" : "Ask about a road, a ward, a contractor or a complaint"}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
      />

      <div className="rb-composer-bar">
        {idOpen ? (
          <span className="rb-composer-id">
            <label htmlFor={idFieldId}>Complaint</label>
            <input
              id={idFieldId}
              value={complaintId}
              placeholder="BMC25-000005"
              onChange={(event) => onComplaintId(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </span>
        ) : (
          <button type="button" className="rb-composer-chip touch-target" onClick={() => setIdOpen(true)}>
            <span aria-hidden="true">+</span> Complaint ID
          </button>
        )}

        <div className="rb-composer-langs" role="group" aria-label="Answer language">
          {LANGS.map((lang) => (
            <button
              key={lang.code}
              type="button"
              aria-pressed={language === lang.code}
              aria-label={lang.name}
              title={lang.name}
              onClick={() => onLanguage(lang.code)}
            >
              {lang.short}
            </button>
          ))}
        </div>

        <button type="submit" className="rb-composer-send" disabled={!canSend} aria-label="Send question">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}

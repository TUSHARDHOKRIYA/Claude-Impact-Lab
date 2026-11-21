"use client";

import { useState } from "react";
import { askAssistantAction } from "@/app/assistant/actions";
import type { AssistantLanguage, AssistantStructuredResponse } from "@/lib/assistant/types";

type ChatMessage = {
  id: string;
  sender: "citizen" | "assistant";
  text: string;
  structured?: AssistantStructuredResponse;
};

const SUGGESTED_QUESTIONS = [
  "What happened to my complaint?",
  "Who was assigned the repair and how much was billed?",
  "Did the repair hold up?",
  "Why is my complaint still pending?",
];

export function AssistantChat({ initialComplaintId }: { initialComplaintId?: string }) {
  const [complaintId, setComplaintId] = useState(initialComplaintId ?? "");
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<AssistantLanguage>("en");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(questionText: string) {
    if (!questionText.trim()) return;
    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "citizen",
      text: questionText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");

    const res = await askAssistantAction(questionText, complaintId || null, language);
    setLoading(false);

    if (res.error || !res.response) {
      setError(res.error ?? "Failed to retrieve answer.");
      return;
    }

    const assistantMsg: ChatMessage = {
      id: `asst-${Date.now()}`,
      sender: "assistant",
      text: res.response.answer,
      structured: res.response,
    };
    setMessages((prev) => [...prev, assistantMsg]);
  }

  return (
    <div className="space-y-6">
      {/* Configuration bar: Complaint ID & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div>
          <label htmlFor="asst-complaint-id" className="ux4g-body-s-strong block text-slate-700 mb-1">
            Complaint ID (optional)
          </label>
          <input
            id="asst-complaint-id"
            type="text"
            placeholder="e.g. BMC25-000005"
            value={complaintId}
            onChange={(e) => setComplaintId(e.target.value)}
            className="ux4g-input w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="ux4g-body-s-strong block text-slate-700 mb-1">Response Language</label>
          <div className="flex gap-2">
            {(["en", "hi", "mr"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`ux4g-btn ux4g-btn-s ${language === lang ? "ux4g-btn-primary" : "ux4g-btn-outline-primary"}`}
              >
                {lang === "en" ? "English" : lang === "hi" ? "हिंदी" : "मराठी"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      <div>
        <p className="ux4g-body-s-default text-slate-600 mb-2">Common citizen questions:</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              className="ux4g-filter-chip-m text-left text-xs bg-white border border-slate-300 hover:bg-slate-100 rounded-full px-3 py-1.5"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Message History */}
      <div className="space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-4 rounded-xl ${
              m.sender === "citizen"
                ? "bg-blue-50 border border-blue-200 ml-auto max-w-[85%]"
                : "bg-white border border-slate-200 max-w-[95%] shadow-sm"
            }`}
          >
            {m.sender === "citizen" ? (
              <p className="ux4g-body-m-strong text-slate-900">{m.text}</p>
            ) : (
              <div className="space-y-4">
                {/* Status Badges */}
                {m.structured && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                        m.structured.isOfficialLink ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {m.structured.isOfficialLink ? "Official BMC Record" : "Unverified / Inferred Record"}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded">
                      Status: {m.structured.complaintStatus}
                    </span>
                    {m.structured.costInr != null && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded">
                        Billed: ₹{m.structured.costInr.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                )}

                {/* Direct Answer */}
                <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-line font-medium leading-relaxed">
                  {m.text}
                </div>

                {/* Next Steps */}
                {m.structured?.nextAction && (
                  <div className="p-3 bg-blue-50/70 border-l-4 border-blue-500 rounded text-sm text-blue-900">
                    <span className="font-semibold block mb-1">Recommended Next Step:</span>
                    {m.structured.nextAction}
                  </div>
                )}

                {/* Supporting Evidence Accordion */}
                {m.structured && m.structured.evidenceSources.length > 0 && (
                  <details className="text-xs text-slate-600 border-t pt-2">
                    <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                      View Verified Records ({m.structured.evidenceSources.length} sources)
                    </summary>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      {m.structured.evidenceSources.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 animate-pulse">
            Checking official records and formulating answer…
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* Query input form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(query);
        }}
        className="flex gap-2 pt-2"
      >
        <input
          type="text"
          placeholder="Ask a question about your road complaint…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
          className="ux4g-input flex-1 p-3 border rounded-lg focus:outline-blue-600"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="ux4g-btn ux4g-btn-primary px-6 py-3 rounded-lg font-medium"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

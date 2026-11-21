"use client";

import { issueTypeLabel, noticedWindowLabel, type LabelLanguage } from "@/lib/chip-labels";
import type { IssueType, NoticedWindow } from "@/lib/types";
import type { VoiceCopy } from "@/lib/voice/voice-copy";
import type { VoiceConflict, VoiceField } from "./use-report-voice";

type Value = VoiceConflict["existing"];

function fieldName(copy: VoiceCopy, field: VoiceField): string {
  if (field === "noticedWindow") return copy.fields.noticedAt;
  return copy.fields[field];
}

function display(field: VoiceField, value: Value, lang: LabelLanguage, copy: VoiceCopy): string {
  if (field === "issueType") return issueTypeLabel(lang, value as IssueType);
  if (field === "noticedWindow") return noticedWindowLabel(lang, value as NoticedWindow);
  if (field === "recurs") return value === "true" ? copy.recursYes : copy.recursNo;
  return String(value);
}

/**
 * Udyam-Saathi's scan conflict, as a card in the chat: voice heard something
 * different from what the person had already chosen, so nothing is overwritten
 * until they pick one.
 */
export function VoiceConflicts({
  conflicts,
  lang,
  copy,
  onResolve,
}: {
  conflicts: VoiceConflict[];
  lang: LabelLanguage;
  copy: VoiceCopy;
  onResolve: (field: VoiceField, choice: "keep" | "replace") => void;
}) {
  if (conflicts.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      {conflicts.map((conflict) => (
        <div
          key={conflict.field}
          role="group"
          aria-label={`${copy.conflict}: ${fieldName(copy, conflict.field)}`}
          className="rounded-2xl border border-rule bg-card p-4"
        >
          <p className="text-sm font-bold text-ink">
            {copy.conflict}: {fieldName(copy, conflict.field)}
          </p>
          <p className="mt-2 text-sm text-ink">
            {copy.yours}: <strong>{display(conflict.field, conflict.existing, lang, copy)}</strong>
          </p>
          <p className="text-sm text-ink">
            {copy.voice}: <strong>{display(conflict.field, conflict.incoming, lang, copy)}</strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full border border-enamel bg-card px-4 text-base font-semibold text-enamel"
              onClick={() => onResolve(conflict.field, "keep")}
            >
              {copy.keepMine}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full bg-enamel px-4 text-base font-semibold text-white"
              onClick={() => onResolve(conflict.field, "replace")}
            >
              {copy.useVoice}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import type { IssueType, NoticedWindow } from "@/lib/types";
import {
  MAX_VOICE_TRANSCRIPT_CHARS,
  type VoiceFormPatch,
  type VoiceTurnSuccess,
} from "@/lib/voice/contracts";

export type VoiceField = keyof VoiceFormPatch;
type FieldValue = string;

/** Udyam-Saathi's scan conflict: voice heard X, the person already chose Y. */
export type VoiceConflict = { field: VoiceField; existing: FieldValue; incoming: FieldValue };

/** A chip tap in the conversation. Each sets one value. */
export type VoiceAnswer =
  | { slot: "issue_type"; value: IssueType }
  | { slot: "noticed_window"; value: NoticedWindow }
  | { slot: "recurs"; value: "true" | "false" };

export type ReportVoiceValues = {
  issueType: IssueType | "";
  noticedWindow: NoticedWindow | "";
  recurs: "" | "true" | "false";
  description: string;
};

/** The form's own setters. React state setters are the whole interface. */
export type ReportVoiceWriters = {
  issueType: (value: IssueType) => void;
  noticedWindow: (value: NoticedWindow) => void;
  recurs: (value: "true" | "false") => void;
  description: (value: string) => void;
  pin: (next: { lat: number; lng: number }) => void;
};

const SLOT_FIELD = {
  issue_type: "issueType",
  noticed_window: "noticedWindow",
  recurs: "recurs",
} as const satisfies Record<VoiceAnswer["slot"], VoiceField>;

function isEmpty(value: FieldValue): boolean {
  return value === "";
}

function same(a: FieldValue, b: FieldValue): boolean {
  return a === b;
}

/** Each turn is appended, so a bare "kal" keeps the sentence it answered. */
function joinTranscript(previous: string, next: string): string {
  const joined = previous ? `${previous}\n${next}` : next;
  return joined.slice(-MAX_VOICE_TRANSCRIPT_CHARS);
}

/**
 * The bridge between the voice conversation and the report form. It tracks
 * which fields voice filled (for the badge), and never overwrites a value the
 * person chose themselves: that becomes a keep-or-replace conflict instead.
 * It cannot submit. There is nothing here that touches the form element.
 */
export function useReportVoice(values: ReportVoiceValues, write: ReportVoiceWriters) {
  const [voiceFilled, setVoiceFilled] = useState<ReadonlySet<VoiceField>>(new Set());
  const [conflicts, setConflicts] = useState<VoiceConflict[]>([]);
  const [transcript, setTranscript] = useState("");
  // A voice turn lands seconds after it started. It must compare against the form as it is
  // now, not as it was when the person began speaking, or it overwrites what they since chose.
  const latest = useRef({ values, write, voiceFilled, conflicts });
  latest.current = { values, write, voiceFilled, conflicts };

  function writeField(field: VoiceField, value: FieldValue) {
    const to = latest.current.write;
    if (field === "issueType") to.issueType(value as IssueType);
    else if (field === "noticedWindow") to.noticedWindow(value as NoticedWindow);
    else if (field === "recurs") to.recurs(value as "true" | "false");
    else to.description(value as string);
  }

  function applyResult(result: VoiceTurnSuccess) {
    const { values: now, voiceFilled: filledNow, conflicts: open } = latest.current;
    const filled = new Set(filledNow);
    const incoming = Object.entries(result.fields) as [VoiceField, FieldValue][];
    const pending = open.filter((item) => !incoming.some(([field]) => field === item.field));
    for (const [field, value] of incoming) {
      const existing = now[field];
      if (isEmpty(existing) || filled.has(field) || same(existing, value)) {
        writeField(field, value);
        filled.add(field);
      } else {
        pending.push({ field, existing, incoming: value });
      }
    }
    setVoiceFilled(filled);
    setConflicts(pending);
    if (result.pinProposal) latest.current.write.pin({ lat: result.pinProposal.lat, lng: result.pinProposal.lng });
    setTranscript((previous) => joinTranscript(previous, result.transcript));
  }

  function userEdited(field: VoiceField) {
    setVoiceFilled((current) => {
      if (!current.has(field)) return current;
      const next = new Set(current);
      next.delete(field);
      return next;
    });
    setConflicts((current) => current.filter((item) => item.field !== field));
  }

  function resolve(field: VoiceField, choice: "keep" | "replace") {
    const conflict = latest.current.conflicts.find((item) => item.field === field);
    if (!conflict) return;
    setConflicts((current) => current.filter((item) => item.field !== field));
    if (choice === "replace") {
      writeField(field, conflict.incoming);
      setVoiceFilled((current) => new Set(current).add(field));
    }
  }

  function answer(input: VoiceAnswer) {
    writeField(SLOT_FIELD[input.slot], input.value);
    userEdited(SLOT_FIELD[input.slot]);
  }

  return { voiceFilled, conflicts, transcript, applyResult, userEdited, resolve, answer };
}

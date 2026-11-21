import type { NormalizedChannel } from "../types";

const CHANNEL_MAP: Record<string, NormalizedChannel> = {
  "mybmc app": "app",
  "1916 helpline": "helpline",
  "ward office walk-in": "walkin",
  "mybmc web portal": "portal",
  "x (twitter)": "social",
  twitter: "social",
  whatsapp: "social",
};

export function normaliseChannel(raw: string | null | undefined): NormalizedChannel {
  if (!raw) return "other";
  const key = raw.trim().toLowerCase();
  return CHANNEL_MAP[key] ?? "other";
}

export type StrippedDescription = {
  cleanedText: string;
  isOperatorNote: boolean;
  operatorNotes: string[];
};

/**
 * Extracts core complaint content from operator notes (e.g., 1916 helpline notes).
 * Retains operator sentiments (e.g. "Caller agitated") as metadata.
 */
export function extractHelplineContent(text: string): StrippedDescription {
  let content = text.trim();
  const notes: string[] = [];
  let isOperatorNote = false;

  // Pattern: "As per caller <content>" or "Complainant states <content>"
  const prefixMatch = content.match(/^(?:as per caller|complainant states|caller states)\s+(.*)$/i);
  if (prefixMatch) {
    isOperatorNote = true;
    content = prefixMatch[1].trim();
  }

  // Trailing operator remarks: "Caller agitated.", "Repeat caller.", etc.
  const trailingRemarks = [
    /\.\s*caller agitated\.?$/i,
    /\.\s*repeat caller\.?$/i,
    /\.\s*caller demanding prompt action\.?$/i,
    /\.\s*urgent attention requested\.?$/i,
  ];

  for (const regex of trailingRemarks) {
    if (regex.test(content)) {
      const match = content.match(regex);
      if (match) {
        notes.push(match[0].replace(/^\.\s*/, "").replace(/\.$/, "").trim());
        content = content.replace(regex, "").trim();
      }
    }
  }

  return {
    cleanedText: content,
    isOperatorNote,
    operatorNotes: notes,
  };
}

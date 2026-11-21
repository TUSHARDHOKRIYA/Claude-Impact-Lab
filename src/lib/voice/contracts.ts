import type { LabelLanguage } from "@/lib/chip-labels";
import type { Affects, IssueType, NoticedWindow } from "@/lib/types";
import type { AskSlot } from "./conversation";

export const MAX_VOICE_AUDIO_BYTES = 750_000;
export const MAX_VOICE_TRANSCRIPT_CHARS = 4_000;
export const VOICE_RECORDING_SECONDS = 25;

export type SpeechTranscript = {
  transcript: string;
  languageCode: string;
  languageProbability: number | null;
};

export type VoiceFormPatch = {
  issueType?: IssueType;
  noticedWindow?: NoticedWindow;
  recurs?: "true" | "false";
  affects?: Affects[];
  description?: string;
};

export type VoicePinProposal = {
  landmarkId: string;
  label: string;
  lat: number;
  lng: number;
};

/** One spoken reply, synthesized server-side. Absent when muted or when TTS failed. */
export type VoiceAudio = { mimeType: string; base64: string };

/**
 * What the assistant says back. `ask` is the slot it is asking for next, or
 * null once every required slot is filled. `confirm` means the transcript was
 * weak: the fields are held until the person answers Yes or No.
 */
export type VoiceReply = { text: string; ask: AskSlot | null; confirm: boolean };

export type VoiceTurnSuccess = {
  ok: true;
  transcript: string;
  languageCode: string;
  fields: VoiceFormPatch;
  pinProposal: VoicePinProposal | null;
  warnings: string[];
  replyLanguage: LabelLanguage;
  reply: VoiceReply;
  audio: VoiceAudio | null;
};

export type VoiceTurnResult =
  | VoiceTurnSuccess
  | { ok: false; error: string; retryable: boolean };

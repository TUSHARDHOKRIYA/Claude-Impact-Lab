import { LANDMARKS } from "@/lib/city";
import { PINNABLE_LANDMARKS } from "@/lib/landmarks";
import type { VoiceFormPatch, VoicePinProposal } from "./contracts";
import type { NormalizedCall } from "./validate";

export function callsToFormPatch(
  calls: NormalizedCall[],
): { fields: VoiceFormPatch; pinProposal: VoicePinProposal | null } {
  const fields: VoiceFormPatch = {};
  let pinProposal: VoicePinProposal | null = null;

  for (const call of calls) {
    if (call.slot === "issue_type") fields.issueType = call.value;
    else if (call.slot === "noticed_window") fields.noticedWindow = call.value;
    else if (call.slot === "recurs") fields.recurs = call.value;
    else if (call.slot === "description") fields.description = call.value;
    else pinProposal = landmarkPin(call.value) ?? pinProposal;
  }

  return { fields, pinProposal };
}

/**
 * The pin for a landmark id. The app's own five keep their hand-placed spot, so
 * a spoken "Jehangir" lands where the Jehangir chip and the form's button do;
 * every other landmark comes from the data file.
 */
export function landmarkPin(id: string): VoicePinProposal | null {
  const landmark = LANDMARKS.find((row) => row.id === id) ?? PINNABLE_LANDMARKS.find((row) => row.id === id);
  return landmark ? { landmarkId: landmark.id, label: landmark.name, lat: landmark.lat, lng: landmark.lng } : null;
}

/** Short spoken forms the data file does not list, in the scripts STT actually returns. */
const EXTRA_NAMES: Record<string, string[]> = {
  "loc-kings-circle": ["kings circle", "किंग्स सर्कल", "किंग सर्कल"],
  "loc-hindmata": ["हिंदमाता", "हिन्दमाता"],
  "loc-sion": ["sion", "सायन", "शीव"],
  "loc-andheri-east": ["andheri east", "अंधेरी ईस्ट"],
};

/** Lowercase, and fold the Devanagari spellings STT varies between (ँ/ं, nukta). */
function fold(text: string): string {
  return text.toLowerCase().replace(/\u0901/g, "\u0902").replace(/\u093c/g, "");
}

const SPOKEN = PINNABLE_LANDMARKS.flatMap((landmark) =>
  [landmark.name, ...landmark.aliases, ...(EXTRA_NAMES[landmark.id] ?? [])]
    .map(fold)
    .filter((name) => name.length >= 4)
    .map((name) => ({ id: landmark.id, name })),
);

/** `name` appears in `said` as a whole word or phrase, not inside a longer Latin word. */
function mentions(said: string, name: string): boolean {
  for (let at = said.indexOf(name); at !== -1; at = said.indexOf(name, at + 1)) {
    const before = said[at - 1] ?? " ";
    const after = said[at + name.length] ?? " ";
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
  }
  return false;
}

/**
 * A landmark the transcript names outright, for when the model skipped
 * propose_pin. A name inside a longer matched name does not count ("Jehangir"
 * inside "Jehangir cafe"); then exactly one landmark or nothing, because two
 * is a guess. It is only a proposal; the person confirms the pin on the map.
 */
export function spokenLandmark(transcript: string): VoicePinProposal | null {
  const said = fold(transcript);
  const hits = SPOKEN.filter((entry) => mentions(said, entry.name));
  const kept = hits.filter((hit) => !hits.some((other) => other.name !== hit.name && other.name.includes(hit.name)));
  const ids = new Set(kept.map((hit) => hit.id));
  return ids.size === 1 ? landmarkPin([...ids][0]) : null;
}

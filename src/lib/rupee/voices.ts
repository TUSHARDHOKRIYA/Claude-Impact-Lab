import { LOCALITIES, type Locality } from "@/lib/city";

import type { Complaint, Dataset, SocialPost } from "./load";

export type VoiceLine = {
  id: string;
  kind: "complaint" | "post";
  note: string;
  text: string;
};

export type VoicePacket = {
  ward: string;
  lines: VoiceLine[];
};

const COMPLAINT_CAP = 16;
const POST_CAP = 8;

const AGAIN = /phir se|फिर से|पुन्हा|wahi|same story|kitni baar|khul gaya|came back/i;
const PROBLEM = /pothole|manhole|paani|पाणी|पानी|flood|gadda|खड्ड|dhas|drain|nullah|road|sadak|water|gaddha|खुल/i;

function mentions(text: string, name: string): boolean {
  const latin = /[a-z]/i.test(name);
  if (name.length < (latin ? 4 : 3)) return false;
  const hay = text.toLowerCase();
  const needle = name.toLowerCase();
  let from = 0;
  while (from < hay.length) {
    const at = hay.indexOf(needle, from);
    if (at < 0) return false;
    if (!latin) return true;
    const before = at === 0 ? "" : hay[at - 1];
    const after = hay[at + needle.length] ?? "";
    if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) return true;
    from = at + needle.length;
  }
  return false;
}

/** Drop short aliases that are only a prefix of a longer place name, such as "Shiv". */
function placeNames(locality: Locality, all: Locality[]): string[] {
  const names = [locality.name, ...locality.aliases];
  return names.filter((name) => {
    if (!/[a-z]/i.test(name)) return name.length >= 3;
    if (name.length >= 5) return true;
    const lower = name.toLowerCase();
    return !all.some((other) =>
      [other.name, ...other.aliases].some(
        (candidate) => candidate.length > name.length && candidate.toLowerCase().startsWith(lower),
      ),
    );
  });
}

/** Ward of the longest locality name found in the text. */
export function wardForPost(text: string, localities: Locality[] = LOCALITIES): string | null {
  let best: { ward: string; length: number } | null = null;
  for (const locality of localities) {
    for (const name of placeNames(locality, localities)) {
      if (!mentions(text, name)) continue;
      if (!best || name.length > best.length) best = { ward: locality.ward, length: name.length };
    }
  }
  return best?.ward ?? null;
}

function openUnlinked(complaint: Complaint, linked: Set<string>): boolean {
  const open = complaint.status === "Open" || complaint.status === "In Progress";
  return open && !linked.has(complaint.id);
}

function complaintRank(complaint: Complaint, linked: Set<string>): number {
  if (openUnlinked(complaint, linked)) return 0;
  if (AGAIN.test(complaint.description)) return 1;
  if (complaint.status === "Open" || complaint.status === "In Progress") return 2;
  return 3;
}

/** Complaints and social posts for one ward. Code picks the rows. Claude only reads them. */
export function voicePacket(ds: Dataset, ward: string): VoicePacket {
  const linked = new Set(ds.workOrders.flatMap((order) => order.complaintIds));
  const complaints = ds.complaints
    .filter((complaint) => complaint.ward === ward && complaint.description.trim())
    .sort(
      (a, b) =>
        complaintRank(a, linked) - complaintRank(b, linked) ||
        b.upvotes - a.upvotes ||
        a.id.localeCompare(b.id),
    );
  const picked = complaints.filter((complaint) => complaintRank(complaint, linked) < 3);
  const complaintLines = (picked.length >= 4 ? picked : complaints).slice(0, COMPLAINT_CAP).map(
    (complaint): VoiceLine => ({
      id: complaint.id,
      kind: "complaint",
      note: `${complaint.status}, ${complaint.language}, ${complaint.category}`,
      text: complaint.description.replace(/\s+/g, " ").trim(),
    }),
  );

  const posts = ds.socialPosts
    .filter((post) => wardForPost(post.text) === ward && PROBLEM.test(post.text))
    .sort(
      (a, b) =>
        Number(AGAIN.test(b.text)) - Number(AGAIN.test(a.text)) ||
        b.likes - a.likes ||
        a.id.localeCompare(b.id),
    )
    .slice(0, POST_CAP)
    .map(
      (post: SocialPost): VoiceLine => ({
        id: post.id,
        kind: "post",
        note: post.source,
        text: post.text.replace(/\s+/g, " ").trim(),
      }),
    );

  return { ward, lines: [...complaintLines, ...posts] };
}

export function voiceFacts(packet: VoicePacket): string {
  const body = packet.lines.map((line) => `${line.id} | ${line.kind} | ${line.note} | ${line.text}`).join("\n");
  return `Ward ${packet.ward}. Citizen complaints and social posts. Do not calculate spending.\n\n${body}`;
}

function clip(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 140 ? `${clean.slice(0, 137)}...` : clean;
}

/** Used when Claude is unavailable. Quotes rows the selector already chose. */
export function templateVoices(packet: VoicePacket): string {
  const complaint = packet.lines.find((line) => line.kind === "complaint");
  const post = packet.lines.find((line) => line.kind === "post");
  if (!complaint && !post) {
    return `${packet.ward} ward has no complaint text or social post that names a place here.`;
  }
  const parts: string[] = [];
  if (complaint) parts.push(`One complaint on the record (${complaint.id}): "${clip(complaint.text)}".`);
  if (post) parts.push(`One social post (${post.id}): "${clip(post.text)}".`);
  return parts.join(" ");
}

/** A few of each kind, so the page shows both sources. */
export function voicePreview(lines: VoiceLine[]): VoiceLine[] {
  return [
    ...lines.filter((line) => line.kind === "complaint").slice(0, 3),
    ...lines.filter((line) => line.kind === "post").slice(0, 2),
  ];
}

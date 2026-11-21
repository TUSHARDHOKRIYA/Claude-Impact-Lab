import { describe, expect, it } from "vitest";
import { loadDataset } from "../lib/rupee/load";
import { templateVoices, voiceFacts, voicePacket, voicePreview, wardForPost } from "../lib/rupee/voices";

const ds = loadDataset();

describe("ward voices", () => {
  it("keeps complaint lines inside the ward and caps both sources", () => {
    const packet = voicePacket(ds, "L");
    const complaints = packet.lines.filter((line) => line.kind === "complaint");
    const posts = packet.lines.filter((line) => line.kind === "post");
    expect(complaints.length).toBeGreaterThan(0);
    expect(complaints.length).toBeLessThanOrEqual(16);
    expect(posts.length).toBeLessThanOrEqual(8);
    for (const line of complaints) {
      expect(ds.complaints.find((row) => row.id === line.id)?.ward).toBe("L");
    }
    for (const line of posts) {
      expect(wardForPost(line.text)).toBe("L");
    }
  });

  it("sends Claude the words, not the money", () => {
    const facts = voiceFacts(voicePacket(ds, "L"));
    expect(facts).toContain("Do not calculate spending");
    expect(facts).not.toMatch(/₹|budget|cost_inr/i);
  });

  it("quotes a complaint and a post when the ward has both", () => {
    const packet = voicePacket(ds, "L");
    const text = templateVoices(packet);
    expect(text).toMatch(/BMC25-/);
    expect(text).toMatch(/SOC/);
    expect(voicePreview(packet.lines).some((line) => line.kind === "post")).toBe(true);
  });

  it("assigns a place name to that locality's ward", () => {
    expect(wardForPost("Milan Subway Road Linking Road — road dhas gaya hai")).toBeTruthy();
    expect(wardForPost("परळ मध्ये पाणी")).toBe("F/S");
    expect(wardForPost("Good morning group")).toBeNull();
  });
});

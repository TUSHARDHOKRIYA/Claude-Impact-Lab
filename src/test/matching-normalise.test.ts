import { describe, expect, it } from "vitest";
import {
  cleanText,
  extractTokens,
  jaccardSimilarity,
} from "../lib/matching/normalise/text";
import {
  areCategoriesCompatible,
  inferCategoryFromText,
  normaliseCategory,
} from "../lib/matching/normalise/categories";
import { extractHelplineContent, normaliseChannel } from "../lib/matching/normalise/channels";
import { normaliseComplaint, normaliseTimestamp } from "../lib/matching/normalise/normaliser";
import type { Complaint } from "../lib/rupee/load";

describe("matching normalisation", () => {
  it("cleans whitespace and punctuation while strictly preserving Devanagari", () => {
    const raw = "  रस्त्यावर मोठा   खड्डा पडला आहे... गाडी हळू चालवा ! \u200B ";
    const cleaned = cleanText(raw);
    expect(cleaned).toBe("रस्त्यावर मोठा खड्डा पडला आहे... गाडी हळू चालवा !");
    expect(cleaned).toContain("खड्डा");
    expect(cleaned).not.toContain("\u200B");
  });

  it("extracts tokens and standardises phonetic Hinglish variations", () => {
    const textA = "road pe bahut bada gadda hai, paani bhar gaya";
    const textB = "road pe bahut bada khaddha hai, pani bhar gaya";

    const tokensA = extractTokens(textA);
    const tokensB = extractTokens(textB);

    expect(tokensA).toContain("khadda");
    expect(tokensA).toContain("pani");
    expect(tokensB).toContain("khadda");
    expect(tokensB).toContain("pani");

    const sim = jaccardSimilarity(tokensA, tokensB);
    expect(sim).toBeGreaterThan(0.9);
  });

  it("maps categories and infers specific types from vague descriptions", () => {
    expect(normaliseCategory("Pothole")).toBe("pothole");
    expect(normaliseCategory("Waterlogging")).toBe("waterlogging");
    expect(normaliseCategory("Road related")).toBe("road_surface_other");

    // Inferences
    expect(inferCategoryFromText("road related: huge pothole near gate")).toBe("pothole");
    expect(inferCategoryFromText("इथे पाणी साचले आहे")).toBe("waterlogging");
    expect(inferCategoryFromText("open chamber lid missing")).toBe("open_manhole");
    expect(inferCategoryFromText("choked nullah overflowing on road")).toBe("choked_drain");
  });

  it("validates category compatibility rules", () => {
    expect(areCategoriesCompatible("pothole", "pothole")).toBe(true);
    expect(areCategoriesCompatible("pothole", "broken_paver_blocks")).toBe(true);
    expect(areCategoriesCompatible("waterlogging", "choked_drain")).toBe(true);

    // Incompatible categories
    expect(areCategoriesCompatible("pothole", "open_manhole")).toBe(false);
    expect(areCategoriesCompatible("pothole", "waterlogging")).toBe(false);
  });

  it("extracts operator boilerplate and notes from helpline text", () => {
    const rawNote =
      "As per caller open or broken manhole at Hindmata, near post office. Caller agitated.";
    const extracted = extractHelplineContent(rawNote);

    expect(extracted.isOperatorNote).toBe(true);
    expect(extracted.cleanedText).toBe("open or broken manhole at Hindmata, near post office");
    expect(extracted.operatorNotes).toContain("Caller agitated");
  });

  it("normalises timestamps accurately into IST ISO strings", () => {
    const ts = normaliseTimestamp("2025-06-01 08:26");
    expect(ts).toBe(new Date("2025-06-01T08:26:00+05:30").toISOString());
  });

  it("leaves raw description completely untouched in NormalizedComplaintRecord", () => {
    const complaint: Complaint = {
      id: "TEST-01",
      receivedAt: "2025-06-01 10:00",
      channel: "1916 Helpline",
      category: "Road related",
      description: "As per caller khadda on road. Caller agitated.",
      language: "hi-en",
      locality: "Dadar",
      ward: "G/N",
      lat: 19.02,
      lng: 72.84,
      upvotes: 0,
      status: "Open",
      resolvedAt: null,
    };

    const norm = normaliseComplaint(complaint);
    expect(norm.rawDescription).toBe("As per caller khadda on road. Caller agitated.");
    expect(norm.cleanText).toBe("khadda on road");
    expect(norm.channel).toBe("helpline");
    expect(norm.inferredCategory).toBe("pothole");
  });
});

import { describe, expect, it } from "vitest";
import {
    ISSUE_TYPE_LABELS_BY_LANGUAGE,
  LABEL_LANGUAGES,
  NOTICED_WINDOW_LABELS_BY_LANGUAGE,
  noticedWindowLabel,
  issueTypeLabel,
  toLabelLanguage,
  type LabelLanguage,
} from "@/lib/chip-labels";
import {
      ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  NOTICED_WINDOWS,
  NOTICED_WINDOW_LABELS,
} from "@/lib/types";

/** Devanagari block, plus the space and comma the multi-word labels need. */
const DEVANAGARI_ONLY = /^[ऀ-ॿ\s,.।]+$/u;
const LATIN_LETTER = /[A-Za-z]/;

const INDIC: readonly LabelLanguage[] = ["hi", "mr"];

function labelFor(
  map: Record<LabelLanguage, Record<string, string>>,
  lang: LabelLanguage,
  key: string,
): string | undefined {
  // Read through a string index on purpose: a key missing at runtime must
  // surface here as undefined rather than being papered over by the types.
  return map[lang][key];
}

describe("chip labels: coverage", () => {
  it("has a label for every issue type in every supported language", () => {
    const missing: string[] = [];
    for (const lang of LABEL_LANGUAGES) {
      for (const type of ISSUE_TYPES) {
        const label = labelFor(ISSUE_TYPE_LABELS_BY_LANGUAGE, lang, type);
        if (typeof label !== "string" || label.trim() === "") {
          missing.push(`${lang}.${type}`);
        }
      }
    }
    expect(missing, `missing or blank issue-type labels: ${missing.join(", ")}`).toEqual([]);
  });

  it("has a label for every noticed window in every supported language", () => {
    const missing: string[] = [];
    for (const lang of LABEL_LANGUAGES) {
      for (const window of NOTICED_WINDOWS) {
        const label = labelFor(NOTICED_WINDOW_LABELS_BY_LANGUAGE, lang, window);
        if (typeof label !== "string" || label.trim() === "") {
          missing.push(`${lang}.${window}`);
        }
      }
    }
    expect(missing, `missing or blank noticed-window labels: ${missing.join(", ")}`).toEqual([]);
  });

  it("carries no keys beyond the enums the app accepts", () => {
    for (const lang of LABEL_LANGUAGES) {
      expect(Object.keys(ISSUE_TYPE_LABELS_BY_LANGUAGE[lang]).sort()).toEqual(
        [...ISSUE_TYPES].sort(),
      );
      expect(Object.keys(NOTICED_WINDOW_LABELS_BY_LANGUAGE[lang]).sort()).toEqual(
        [...NOTICED_WINDOWS].sort(),
      );
    }
  });

  it("holds exactly the three languages, English included", () => {
    expect(LABEL_LANGUAGES).toEqual(["en", "hi", "mr"]);
    expect(Object.keys(ISSUE_TYPE_LABELS_BY_LANGUAGE).sort()).toEqual(["en", "hi", "mr"]);
  });
});

describe("chip labels: script", () => {
  it("writes every Hindi and Marathi label in Devanagari, never Latin", () => {
    for (const lang of INDIC) {
      for (const type of ISSUE_TYPES) {
        const label = ISSUE_TYPE_LABELS_BY_LANGUAGE[lang][type];
        expect(label, `${lang}.${type} = ${label}`).toMatch(DEVANAGARI_ONLY);
        expect(label, `${lang}.${type} is romanised`).not.toMatch(LATIN_LETTER);
      }
      for (const window of NOTICED_WINDOWS) {
        const label = NOTICED_WINDOW_LABELS_BY_LANGUAGE[lang][window];
        expect(label, `${lang}.${window} = ${label}`).toMatch(DEVANAGARI_ONLY);
        expect(label, `${lang}.${window} is romanised`).not.toMatch(LATIN_LETTER);
      }
    }
  });

  it("never leaves an English label sitting in a translated slot", () => {
    for (const lang of INDIC) {
      for (const type of ISSUE_TYPES) {
        expect(ISSUE_TYPE_LABELS_BY_LANGUAGE[lang][type]).not.toBe(ISSUE_TYPE_LABELS[type]);
      }
      for (const window of NOTICED_WINDOWS) {
        expect(NOTICED_WINDOW_LABELS_BY_LANGUAGE[lang][window]).not.toBe(NOTICED_WINDOW_LABELS[window]);
      }
    }
  });
});

describe("chip labels: English stays single-sourced", () => {
  it("reuses the existing exports in src/lib/types.ts rather than copying them", () => {
    expect(ISSUE_TYPE_LABELS_BY_LANGUAGE.en).toBe(ISSUE_TYPE_LABELS);
    expect(NOTICED_WINDOW_LABELS_BY_LANGUAGE.en).toBe(NOTICED_WINDOW_LABELS);
  });
});

describe("toLabelLanguage", () => {
  it("accepts the bare codes and the region-tagged codes STT returns", () => {
    expect(toLabelLanguage("en")).toBe("en");
    expect(toLabelLanguage("hi")).toBe("hi");
    expect(toLabelLanguage("mr")).toBe("mr");
    expect(toLabelLanguage("hi-IN")).toBe("hi");
    expect(toLabelLanguage("mr-IN")).toBe("mr");
    expect(toLabelLanguage("en-IN")).toBe("en");
    expect(toLabelLanguage("hi_IN")).toBe("hi");
    expect(toLabelLanguage("HI-IN")).toBe("hi");
    expect(toLabelLanguage(" mr-IN ")).toBe("mr");
  });

  it("falls back to English for anything it does not hold", () => {
    expect(toLabelLanguage("unknown")).toBe("en");
    expect(toLabelLanguage("ta-IN")).toBe("en");
    expect(toLabelLanguage("hinglish")).toBe("en");
    expect(toLabelLanguage("")).toBe("en");
    expect(toLabelLanguage("   ")).toBe("en");
    expect(toLabelLanguage(null)).toBe("en");
    expect(toLabelLanguage(undefined)).toBe("en");
  });
});

describe("issueTypeLabel / noticedWindowLabel", () => {
  it("returns the label for the requested language", () => {
    expect(issueTypeLabel("hi-IN", "pothole")).toBe("गड्ढा");
    expect(issueTypeLabel("mr-IN", "pothole")).toBe("खड्डा");
    expect(issueTypeLabel("en", "pothole")).toBe("Pothole");
  });

  it("falls back to the English label for an unknown language code", () => {
    for (const type of ISSUE_TYPES) {
      expect(issueTypeLabel("unknown", type)).toBe(ISSUE_TYPE_LABELS[type]);
      expect(issueTypeLabel(null, type)).toBe(ISSUE_TYPE_LABELS[type]);
    }
  });

  it("agrees with the maps for every language and key", () => {
    for (const lang of LABEL_LANGUAGES) {
      for (const type of ISSUE_TYPES) {
        expect(issueTypeLabel(lang, type)).toBe(ISSUE_TYPE_LABELS_BY_LANGUAGE[lang][type]);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  AFFECTS_LABELS_BY_LANGUAGE,
  ISSUE_TYPE_LABELS_BY_LANGUAGE,
  LABEL_LANGUAGES,
  NOTICED_WINDOW_LABELS_BY_LANGUAGE,
  affectsLabel,
  issueTypeLabel,
  toLabelLanguage,
  type LabelLanguage,
} from "@/lib/chip-labels";
import {
  AFFECTS,
  AFFECTS_LABELS,
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

  it("has a label for every affects value in every supported language", () => {
    const missing: string[] = [];
    for (const lang of LABEL_LANGUAGES) {
      for (const affects of AFFECTS) {
        const label = labelFor(AFFECTS_LABELS_BY_LANGUAGE, lang, affects);
        if (typeof label !== "string" || label.trim() === "") {
          missing.push(`${lang}.${affects}`);
        }
      }
    }
    expect(missing, `missing or blank affects labels: ${missing.join(", ")}`).toEqual([]);
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
      expect(Object.keys(AFFECTS_LABELS_BY_LANGUAGE[lang]).sort()).toEqual([...AFFECTS].sort());
      expect(Object.keys(NOTICED_WINDOW_LABELS_BY_LANGUAGE[lang]).sort()).toEqual(
        [...NOTICED_WINDOWS].sort(),
      );
    }
  });

  it("holds exactly the three languages, English included", () => {
    expect(LABEL_LANGUAGES).toEqual(["en", "hi", "mr"]);
    expect(Object.keys(ISSUE_TYPE_LABELS_BY_LANGUAGE).sort()).toEqual(["en", "hi", "mr"]);
    expect(Object.keys(AFFECTS_LABELS_BY_LANGUAGE).sort()).toEqual(["en", "hi", "mr"]);
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
      for (const affects of AFFECTS) {
        const label = AFFECTS_LABELS_BY_LANGUAGE[lang][affects];
        expect(label, `${lang}.${affects} = ${label}`).toMatch(DEVANAGARI_ONLY);
        expect(label, `${lang}.${affects} is romanised`).not.toMatch(LATIN_LETTER);
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
      for (const affects of AFFECTS) {
        expect(AFFECTS_LABELS_BY_LANGUAGE[lang][affects]).not.toBe(AFFECTS_LABELS[affects]);
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
    expect(AFFECTS_LABELS_BY_LANGUAGE.en).toBe(AFFECTS_LABELS);
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

describe("issueTypeLabel / affectsLabel", () => {
  it("returns the label for the requested language", () => {
    expect(issueTypeLabel("hi-IN", "drainage")).toBe("नाली");
    expect(issueTypeLabel("mr-IN", "drainage")).toBe("गटार");
    expect(issueTypeLabel("en", "drainage")).toBe("Drainage");
    expect(affectsLabel("hi-IN", "safety_at_night")).toBe("रात में सुरक्षा");
    expect(affectsLabel("mr-IN", "safety_at_night")).toBe("रात्रीची सुरक्षा");
    expect(affectsLabel("en", "safety_at_night")).toBe("Safety at night");
  });

  it("falls back to the English label for an unknown language code", () => {
    for (const type of ISSUE_TYPES) {
      expect(issueTypeLabel("unknown", type)).toBe(ISSUE_TYPE_LABELS[type]);
      expect(issueTypeLabel(null, type)).toBe(ISSUE_TYPE_LABELS[type]);
    }
    for (const affects of AFFECTS) {
      expect(affectsLabel("unknown", affects)).toBe(AFFECTS_LABELS[affects]);
      expect(affectsLabel(undefined, affects)).toBe(AFFECTS_LABELS[affects]);
    }
  });

  it("agrees with the maps for every language and key", () => {
    for (const lang of LABEL_LANGUAGES) {
      for (const type of ISSUE_TYPES) {
        expect(issueTypeLabel(lang, type)).toBe(ISSUE_TYPE_LABELS_BY_LANGUAGE[lang][type]);
      }
      for (const affects of AFFECTS) {
        expect(affectsLabel(lang, affects)).toBe(AFFECTS_LABELS_BY_LANGUAGE[lang][affects]);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { LABEL_LANGUAGES } from "@/lib/chip-labels";
import {
  ASK_SLOTS,
  filledSlots,
  heardText,
  nextMissing,
  pickReplyLanguage,
  PROMPT_KEYS,
  PROMPT_LEADS,
  promptText,
  type AskSlot,
} from "@/lib/voice/conversation";
import { composeReply, LOW_CONFIDENCE, readTurnContext } from "@/lib/voice/turn";
import { VOICE_COPY } from "@/lib/voice/voice-copy";

const clear = { transcript: "garbage near the horse", languageCode: "en-IN", languageProbability: 0.99 };

describe("the missing-field loop", () => {
  it("asks for the required slots in order and stops when all are filled", () => {
    expect(nextMissing([])).toBe("issue_type");
    expect(nextMissing(["issue_type"])).toBe("noticed_window");
    expect(nextMissing(["issue_type", "noticed_window", "affects"])).toBe("recurs");
    expect(nextMissing(["issue_type", "noticed_window", "recurs", "affects"])).toBe("place");
    expect(nextMissing(["issue_type", "noticed_window", "recurs", "affects", "place"])).toBe("description");
    expect(nextMissing(ASK_SLOTS)).toBeNull();
  });

  it("reads filled slots from form state, ignoring an unknown window", () => {
    const values = {
      issueType: "waste",
      noticedWindow: "tomorrow",
      recurs: "false",
      affects: ["walking"],
      description: "",
      placeConfirmed: false,
      descriptionDone: false,
    };
    expect(filledSlots(values)).toEqual(["issue_type", "recurs", "affects"]);
    expect(filledSlots({ ...values, noticedWindow: "today" })).toContain("noticed_window");
    // Place counts only once the person confirmed the pin; "anything else" once answered, even with "no".
    expect(filledSlots({ ...values, placeConfirmed: true })).toContain("place");
    expect(filledSlots({ ...values, descriptionDone: true })).toContain("description");
    expect(filledSlots({ ...values, description: "Bins overflow at night" })).toContain("description");
  });

  it("replies in the spoken language when it is one we hold copy for", () => {
    expect(pickReplyLanguage("hi-IN", "en")).toBe("hi");
    expect(pickReplyLanguage("mr-IN", "hi")).toBe("mr");
    expect(pickReplyLanguage("unknown", "mr")).toBe("mr");
    expect(pickReplyLanguage("gu-IN", "zz")).toBe("en");
  });

  it("has a non-empty template for every prompt, lead and language", () => {
    for (const lang of LABEL_LANGUAGES) {
      for (const key of PROMPT_KEYS) {
        for (const lead of PROMPT_LEADS) {
          expect(promptText({ key, lead, lang }).trim(), `${lang}/${key}/${lead}`).not.toBe("");
        }
      }
      expect(heardText("x", lang)).toContain("“x”");
    }
    expect(promptText({ key: "noticed_window", lead: "ack", lang: "hi" })).toBe(
      "ठीक है। आपने यह कब देखा? आज, इस हफ़्ते, इस महीने, एक से छह महीने पहले, या छह महीने से ज़्यादा?",
    );
  });

  it("holds every voice-surface string in all three languages", () => {
    const keys = Object.keys(VOICE_COPY.en).sort();
    for (const lang of LABEL_LANGUAGES) {
      expect(Object.keys(VOICE_COPY[lang]).sort(), lang).toEqual(keys);
    }
  });
});

describe("composeReply", () => {
  it("acknowledges what it heard and asks for the next empty slot", () => {
    const { reply, spec } = composeReply({
      speech: clear,
      fields: { issueType: "waste" },
      hasPin: true,
      filled: [],
      lang: "en",
    });
    expect(reply).toEqual({
      text: "Got it. When did you notice it? Today, this week, this month, 1 to 6 months ago, or more than six months ago.",
      ask: "noticed_window",
      confirm: false,
    });
    expect(spec).toEqual({ key: "noticed_window", lead: "ack", lang: "en" });
  });

  it("counts slots the form already has, and says done when nothing is left", () => {
    const { reply } = composeReply({
      speech: clear,
      fields: { affects: ["walking"] },
      hasPin: false,
      filled: ["issue_type", "noticed_window", "recurs", "place", "description"],
      lang: "mr",
    });
    expect(reply.ask).toBeNull();
    expect(reply.text).toMatch(/^धन्यवाद/);
  });

  it("asks where it is next, and to confirm the pin when voice already placed one", () => {
    const four: AskSlot[] = ["issue_type", "noticed_window", "recurs", "affects"];
    const where = composeReply({ speech: clear, fields: {}, hasPin: false, filled: four, asked: "affects", lang: "en" });
    expect(where.reply.ask).toBe("place");
    expect(where.reply.text).toMatch(/Where is it\?/);
    const pinned = composeReply({ speech: clear, fields: {}, hasPin: true, filled: four, asked: "place", lang: "en" });
    expect(pinned.reply).toEqual({
      text: "Got it. Is the pin in the right spot? Drag it if not, then tap Yes.",
      ask: "place",
      confirm: false,
    });
  });

  it("asks to confirm, not 'where', when the place was named earlier in the conversation", () => {
    const four: AskSlot[] = ["issue_type", "noticed_window", "recurs", "affects"];
    const { reply } = composeReply({ speech: clear, fields: {}, hasPin: false, pinned: true, filled: four, asked: "affects", lang: "en" });
    expect(reply.ask).toBe("place");
    expect(reply.text).toMatch(/Is the pin in the right spot\?/);
  });

  it("points at the map button, instead of asking 'where' again, when they answer the pin check by voice", () => {
    const four: AskSlot[] = ["issue_type", "noticed_window", "recurs", "affects"];
    const { reply } = composeReply({
      speech: { ...clear, transcript: "haan sahi hai" },
      fields: {},
      hasPin: false,
      pinned: true,
      filled: four,
      asked: "place",
      lang: "hi",
    });
    expect(reply.ask).toBe("place");
    expect(reply.text).not.toMatch(/कहाँ है|माफ़ कीजिए/);
    expect(reply.text).toMatch(/हाँ, यही जगह है/);
  });

  it("closes 'anything else' on any answer, even one with nothing to fill", () => {
    const { reply } = composeReply({
      speech: { ...clear, transcript: "nahi, bas itna hi" },
      fields: {},
      hasPin: false,
      filled: ["issue_type", "noticed_window", "recurs", "affects", "place"],
      asked: "description",
      lang: "en",
    });
    expect(reply).toEqual({ text: "Thank you, that is everything. Now check your report, then record it.", ask: null, confirm: false });
  });

  it("apologises and asks again when nothing was understood", () => {
    const { reply } = composeReply({ speech: clear, fields: {}, hasPin: false, filled: ["issue_type"], lang: "en" });
    expect(reply.text).toBe(
      "Sorry, I did not catch that. When did you notice it? Today, this week, this month, 1 to 6 months ago, or more than six months ago.",
    );
    expect(reply.ask).toBe("noticed_window");
  });

  it("repeats a weak transcript back for Yes or No instead of filling", () => {
    const { reply, spec } = composeReply({
      speech: { ...clear, languageProbability: LOW_CONFIDENCE - 0.1 },
      fields: { issueType: "waste" },
      hasPin: false,
      filled: [],
      lang: "hi",
    });
    expect(reply).toEqual({ text: "मैंने सुना “garbage near the horse”। क्या यह सही है?", ask: null, confirm: true });
    expect(spec).toBeNull();
  });
});

describe("readTurnContext", () => {
  it("parses the browser's view of the conversation", () => {
    const form = new FormData();
    form.set("lang", "mr");
    form.set("filled", JSON.stringify(["issue_type", "noticed_window", "bogus", "issue_type"]));
    form.set("asked", "recurs");
    form.set("speak", "1");
    form.set("pinned", "1");
    expect(readTurnContext(form)).toEqual({
      lang: "mr",
      filled: ["issue_type", "noticed_window"],
      asked: "recurs",
      speak: true,
      pinned: true,
    });
  });

  it("degrades anything malformed to a silent first turn in English", () => {
    const form = new FormData();
    form.set("filled", "{not json");
    form.set("asked", "submit_report");
    expect(readTurnContext(form)).toEqual({ lang: "en", filled: [], asked: null, speak: false, pinned: false });
  });
});

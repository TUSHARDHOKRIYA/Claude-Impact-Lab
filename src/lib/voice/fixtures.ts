import type { VoiceFixture } from "./slots";

/**
 * Scripted road transcripts for the voice model bake-off. Not audio: STT is
 * kept out of the comparison so a bad score means bad extraction.
 * Pins are locality ids from `src/lib/geo-data/localities.data.json`.
 */
export const VOICE_FIXTURES: VoiceFixture[] = [
  {
    id: "pothole-do-din",
    probes: "Relative date: 'do din se'. Two-wheelers named indirectly as 'bike wale'.",
    transcript:
      "Arre bhai, yahan main road ke beech mein ekdum bada khadda ho gaya hai. Do din se aisa hi hai. Bike wale roz girte girte bachte hain.",
    expected: {
      issue_type: "pothole",
      noticed_window: "this_week",
      recurs: "false",
      description: {
        mustMention: [["pothole", "hole", "crater", "pit"]],
        mustNotMention: ["photo", "photograph", "image", "picture"],
      },
      pin: null,
    },
  },
  {
    id: "hindmata-waterlogging-recurs",
    probes: "Recurring every monsoon. Buses named. Devanagari locality.",
    transcript:
      "हिंदमाता में हर साल बारिश में घुटने तक पानी भर जाता है। बेस्ट की बसें भी फंस जाती हैं। इस हफ़्ते फिर से वही हाल है।",
    expected: {
      issue_type: "waterlogging",
      noticed_window: "this_week",
      recurs: "true",
      description: {
        mustMention: [["water", "flood", "waterlog"]],
        mustNotMention: ["photo", "photograph", "image", "picture"],
      },
      pin: "loc-hindmata",
    },
  },
  {
    id: "manhole-school",
    probes: "Open manhole near a school. Marathi. Duration over six months.",
    transcript:
      "शाळेच्या समोर मॅनहोल उघडं आहे, सहा महिन्यांपेक्षा जास्त झालं. मुलं रोज तिथून जातात.",
    expected: {
      issue_type: "open_manhole",
      noticed_window: "over_six_months",
      recurs: null,
      description: {
        mustMention: [["manhole", "chamber", "cover"]],
        mustNotMention: ["photo", "photograph", "image", "picture"],
      },
      pin: null,
    },
  },
];

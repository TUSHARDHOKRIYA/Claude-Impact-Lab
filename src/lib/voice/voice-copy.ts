import type { LabelLanguage } from "@/lib/chip-labels";

/**
 * Every string on the voice surface, in the three languages the app already
 * labels chips in (`src/lib/chip-labels.ts`). Issue names are not
 * repeated here: they come from chip-labels so the two cannot drift.
 *
 * Native Devanagari only, Mumbai street register, as chip-labels asks.
 */
export type VoiceCopy = {
  languageName: string;
  language: string;
  assistant: string;
  you: string;
  thread: string;
  disclaimer: string;
  start: string;
  stop: string;
  idle: string;
  requesting: string;
  listening: (seconds: number) => string;
  listeningTag: string;
  listeningLine: string;
  processing: string;
  speaking: string;
  denied: string;
  unsupported: string;
  draftSafe: string;
  form: string;
  replay: string;
  yes: string;
  no: string;
  done: string;
  today: string;
  yesterday: string;
  otherDay: string;
  recursYes: string;
  recursNo: string;
  placeYes: string;
  placeConfirmed: string;
  myLocation: string;
  locating: string;
  noLocation: string;
  outsideArea: string;
  pin: (label: string) => string;
  pinEmpty: string;
  noMore: string;
  checkReport: string;
  keepMine: string;
  useVoice: string;
  yours: string;
  voice: string;
  conflict: string;
  fields: { issueType: string; noticedAt: string; recurs: string; description: string };
};

export const VOICE_COPY: Record<LabelLanguage, VoiceCopy> = {
  en: {
    languageName: "English",
    language: "Language",
    assistant: "Rastabaaz",
    you: "You",
    thread: "Conversation",
    disclaimer: "AI can make mistakes. You check everything before it is recorded.",
    start: "Start speaking",
    stop: "Stop and send",
    idle: "Press the microphone to speak",
    requesting: "Allow the microphone when your browser asks",
    listening: (seconds) => `Press again when you are done · ${seconds}s`,
    listeningTag: "Listening",
    listeningLine: "Go ahead, I'm listening.",
    processing: "Understanding what you said…",
    speaking: "Rastabaaz is speaking. Press the mic to answer",
    denied: "Microphone permission was denied. Allow it in your browser settings, or switch to Form.",
    unsupported: "This browser cannot record from the microphone. Switch to Form.",
    draftSafe: "Your answers are safe.",
    form: "Form",
    replay: "Replay",
    yes: "Yes",
    no: "No",
    done: "Done",
    today: "Today",
    yesterday: "Yesterday",
    otherDay: "Another day",
    recursYes: "Yes, it comes back",
    recursNo: "No, just this once",
    placeYes: "Yes, this is the spot",
    placeConfirmed: "Pin confirmed",
    myLocation: "Use my location",
    locating: "Finding where you are…",
    noLocation: "Could not read your location. Pick a place or drag the pin.",
    outsideArea: "You seem to be outside Mumbai's wards. Drag the pin to the spot.",
    pin: (label) => `Pin near ${label}`,
    pinEmpty: "Tap the map where it is, or pick a landmark",
    noMore: "No, that's all",
    checkReport: "Check the report",
    keepMine: "Keep mine",
    useVoice: "Use voice",
    yours: "Yours",
    voice: "Voice",
    conflict: "Voice heard something different",
    fields: {
      issueType: "Type",
      noticedAt: "Noticed",
      recurs: "Fixed before and came back",
      description: "Description",
    },
  },
  hi: {
    languageName: "हिंदी",
    language: "भाषा",
    assistant: "ख़बर",
    you: "आप",
    thread: "बातचीत",
    disclaimer: "AI से गलती हो सकती है। रिकॉर्ड होने से पहले आप सब जाँचेंगे।",
    start: "बोलना शुरू करें",
    stop: "रोकें और भेजें",
    idle: "बोलने के लिए माइक दबाइए",
    requesting: "ब्राउज़र पूछे तो माइक की अनुमति दीजिए",
    listening: (seconds) => `बोल लें तो फिर से दबाइए · ${seconds} सेकंड`,
    listeningTag: "सुन रहा हूँ",
    listeningLine: "बोलिए, मैं सुन रहा हूँ।",
    processing: "आपकी बात समझ रहा हूँ…",
    speaking: "ख़बर बोल रहा है। जवाब देने के लिए माइक दबाइए",
    denied: "माइक की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दीजिए, या फ़ॉर्म चुनिए।",
    unsupported: "इस ब्राउज़र में माइक से रिकॉर्डिंग नहीं होती। फ़ॉर्म चुनिए।",
    draftSafe: "आपके जवाब सुरक्षित हैं।",
    form: "फ़ॉर्म",
    replay: "फिर सुनें",
    yes: "हाँ",
    no: "नहीं",
    done: "हो गया",
    today: "आज",
    yesterday: "कल",
    otherDay: "कोई और दिन",
    recursYes: "हाँ, बार-बार होता है",
    recursNo: "नहीं, एक ही बार",
    placeYes: "हाँ, यही जगह है",
    placeConfirmed: "पिन पक्की हो गई",
    myLocation: "मेरी लोकेशन",
    locating: "आपकी जगह ढूँढ रहा हूँ…",
    noLocation: "आपकी लोकेशन नहीं मिली। कोई जगह चुनिए या पिन खिसकाइए।",
    outsideArea: "आप मुंबई के वार्डों से बाहर लगते हैं। पिन को सही जगह पर खिसकाइए।",
    pin: (label) => `${label} के पास पिन`,
    pinEmpty: "नक्शे पर जगह छुइए, या कोई जगह चुनिए",
    noMore: "बस इतना ही",
    checkReport: "रिपोर्ट जाँचें",
    keepMine: "मेरा रखें",
    useVoice: "आवाज़ वाला लें",
    yours: "आपका",
    voice: "आवाज़",
    conflict: "आवाज़ में कुछ और सुना",
    fields: {
      issueType: "प्रकार",
      noticedAt: "कब देखा",
      recurs: "बार-बार होता है?",
      description: "विवरण",
    },
  },
  mr: {
    languageName: "मराठी",
    language: "भाषा",
    assistant: "खबर",
    you: "तुम्ही",
    thread: "संवाद",
    disclaimer: "AI चुकू शकतो. रेकॉर्ड होण्याआधी तुम्ही सगळं तपासाल.",
    start: "बोलायला सुरू करा",
    stop: "थांबवा आणि पाठवा",
    idle: "बोलण्यासाठी माईक दाबा",
    requesting: "ब्राउझरने विचारल्यावर माईकला परवानगी द्या",
    listening: (seconds) => `बोलून झाल्यावर पुन्हा दाबा · ${seconds} सेकंद`,
    listeningTag: "ऐकत आहे",
    listeningLine: "बोला, मी ऐकत आहे.",
    processing: "तुमचं बोलणं समजून घेत आहे…",
    speaking: "खबर बोलत आहे. उत्तर देण्यासाठी माईक दाबा",
    denied: "माईकची परवानगी मिळाली नाही. ब्राउझर सेटिंगमध्ये परवानगी द्या, किंवा फॉर्म निवडा.",
    unsupported: "या ब्राउझरमध्ये माईकने रेकॉर्डिंग होत नाही. फॉर्म निवडा.",
    draftSafe: "तुमची उत्तरं सुरक्षित आहेत.",
    form: "फॉर्म",
    replay: "पुन्हा ऐका",
    yes: "होय",
    no: "नाही",
    done: "झालं",
    today: "आज",
    yesterday: "काल",
    otherDay: "दुसरा दिवस",
    recursYes: "होय, पुन्हा पुन्हा होतं",
    recursNo: "नाही, एकदाच",
    placeYes: "होय, हीच जागा",
    placeConfirmed: "पिन निश्चित झाली",
    myLocation: "माझं ठिकाण",
    locating: "तुमचं ठिकाण शोधत आहे…",
    noLocation: "तुमचं ठिकाण मिळालं नाही. एखादी जागा निवडा किंवा पिन हलवा.",
    outsideArea: "तुम्ही मुंबईच्या वॉर्डांबाहेर आहात असं दिसतं. पिन योग्य जागी हलवा.",
    pin: (label) => `${label} जवळ पिन`,
    pinEmpty: "नकाशावर जागा टॅप करा, किंवा एखादी जागा निवडा",
    noMore: "एवढंच",
    checkReport: "रिपोर्ट तपासा",
    keepMine: "माझं ठेवा",
    useVoice: "आवाजातलं घ्या",
    yours: "तुमचं",
    voice: "आवाज",
    conflict: "आवाजात वेगळं ऐकलं",
    fields: {
      issueType: "प्रकार",
      noticedAt: "कधी पाहिलं",
      recurs: "पुन्हा होतं?",
      description: "वर्णन",
    },
  },
};

import type { LabelLanguage } from "@/lib/chip-labels";
import { ACCIDENT_SEEN_LABELS, type AccidentSeen } from "@/lib/types";

/**
 * The Check step speaks one language: the one the answers are shown in.
 */
export type ReviewCopy = {
  heading: string;
  badge: string;
  anonymous: string;
  publicNote: string;
  pinConfirmed: string;
  pinNotConfirmed: string;
  photo: string;
  photoAlt: string;
  place: string;
  recursYes: string;
  recursNo: string;
  /** Section titles on the Check screen and receipt, the Edit button, and the accident row. */
  sections: { problem: string; place: string; answers: string };
  edit: string;
  accident: string;
  accidentAnswers: Record<AccidentSeen, string>;
  fields: { issueType: string; noticedAt: string; recurs: string; description: string };
};

export type SubmittedCopy = {
  heading: string;
  body: string;
  map: string;
  report: string;
  again: string;
};

export const SUBMITTED_BANNER: Record<LabelLanguage, string> = {
  en: "Submitted. Your report is highlighted on the map.",
  hi: "दर्ज हो गई। आपकी रिपोर्ट नक्शे पर चिन्हित है।",
  mr: "नोंद झाली. तुमची रिपोर्ट नकाशावर ठळक आहे.",
};

export const SUBMITTED_COPY: Record<LabelLanguage, SubmittedCopy> = {
  en: {
    heading: "Thanks for letting us know!",
    body: "Your report is on the map and on the ward's record now, next to what the ward spent on this road.",
    map: "See it on the map",
    report: "Open the report page",
    again: "Report another problem",
  },
  hi: {
    heading: "दर्ज हो गई",
    body: "आपकी रिपोर्ट अब नक्शे पर है।",
    map: "नक्शे पर देखें",
    report: "रिपोर्ट का पेज खोलें",
    again: "एक और दर्ज करें",
  },
  mr: {
    heading: "नोंद झाली",
    body: "तुमची रिपोर्ट आता नकाशावर आहे.",
    map: "नकाशावर पहा",
    report: "रिपोर्टचे पान उघडा",
    again: "आणखी एक नोंदवा",
  },
};

export const REVIEW_COPY: Record<LabelLanguage, ReviewCopy> = {
  en: {
    heading: "Check your report",
    badge: "Citizen report",
    anonymous: "Anonymous by default",
    publicNote: "Everything on this card becomes public, including the description.",
    pinConfirmed: "Pin confirmed at",
    pinNotConfirmed: "Pin not confirmed at",
    photo: "Photo",
    photoAlt: "Preview of the street photo",
    place: "Place",
    recursYes: "Yes, it was fixed and came back",
    recursNo: "No, or not known",
    sections: { problem: "Problem", place: "Place", answers: "Your answers" },
    edit: "Edit",
    accident: "Accident or fall seen",
    accidentAnswers: ACCIDENT_SEEN_LABELS,
    fields: {
      issueType: "Type",
      noticedAt: "Noticed",
      recurs: "Fixed before and came back",
      description: "Description",
    },
  },
  hi: {
    heading: "यह रिकॉर्ड जाँच लीजिए",
    badge: "नागरिक रिपोर्ट",
    anonymous: "आपका नाम नहीं दिखेगा",
    publicNote: "इस कार्ड पर लिखी हर बात, विवरण समेत, सबको दिखेगी।",
    pinConfirmed: "पिन पक्की की गई:",
    pinNotConfirmed: "पिन अभी पक्की नहीं:",
    photo: "फ़ोटो",
    photoAlt: "सड़क की फ़ोटो",
    place: "जगह",
    recursYes: "हाँ, बार-बार होता है",
    recursNo: "नहीं, एक ही बार",
    sections: { problem: "समस्या", place: "जगह", answers: "आपके जवाब" },
    edit: "बदलें",
    accident: "दुर्घटना या गिरना देखा",
    accidentAnswers: {
      injury: "हाँ, किसी को चोट लगी",
      near_miss: "हाँ, कोई गिरा या बाल-बाल बचा",
      none: "नहीं",
      not_sure: "पता नहीं",
    },
    fields: {
      issueType: "प्रकार",
      noticedAt: "कब देखा",
      recurs: "बार-बार होता है?",
      description: "विवरण",
    },
  },
  mr: {
    heading: "हा रेकॉर्ड तपासा",
    badge: "नागरिक रिपोर्ट",
    anonymous: "तुमचं नाव दिसणार नाही",
    publicNote: "या कार्डवरची प्रत्येक गोष्ट, वर्णनासह, सगळ्यांना दिसेल.",
    pinConfirmed: "पिन निश्चित केली:",
    pinNotConfirmed: "पिन अजून निश्चित नाही:",
    photo: "फोटो",
    photoAlt: "रस्त्याचा फोटो",
    place: "ठिकाण",
    recursYes: "होय, पुन्हा पुन्हा होतं",
    recursNo: "नाही, एकदाच",
    sections: { problem: "समस्या", place: "ठिकाण", answers: "तुमची उत्तरं" },
    edit: "बदला",
    accident: "अपघात किंवा पडणं पाहिलं",
    accidentAnswers: {
      injury: "हो, कोणाला लागलं",
      near_miss: "हो, कोणी पडलं किंवा थोडक्यात वाचलं",
      none: "नाही",
      not_sure: "माहीत नाही",
    },
    fields: {
      issueType: "प्रकार",
      noticedAt: "कधी पाहिलं",
      recurs: "पुन्हा होतं?",
      description: "वर्णन",
    },
  },
};

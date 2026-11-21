import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ReportReview } from "@/components/report/ReportReview";
import { buildUserPrompt } from "@/lib/voice/prompt";
import { VOICE_TOOLS } from "@/lib/voice/tools";

afterEach(cleanup);

function review(voiceLanguageCode: string, description = "") {
  return render(
    <ReportReview
      answers={{
        issueType: "pothole",
        preview: "",
        lat: 18.9277,
        lng: 72.83185,
        noticedWindow: "today",
        recurs: "true",
        accident: "none",
        description,
      }}
      voiceLanguageCode={voiceLanguageCode}
      onAccident={() => {}}
      onEdit={() => {}}
      locationConfirmed
    />,
  );
}

describe("the Check step speaks one language", () => {
  it("shows Hindi labels next to Hindi answers after a Hindi voice turn", () => {
    const { container } = review("hi-IN");
    expect(screen.getByRole("heading", { name: "यह रिकॉर्ड जाँच लीजिए" })).toBeInTheDocument();
    expect(screen.getByText("प्रकार")).toBeInTheDocument();
    expect(screen.getByText("गड्ढा")).toBeInTheDocument();
    expect(screen.getByText("हाँ, बार-बार होता है")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "जगह" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /बदलें/ }).length).toBeGreaterThan(0);
    for (const english of ["Type", "Noticed", "Recurs", "Check this record", "Problem", "Place", "Your answers", "Edit"]) {
      expect(container.textContent).not.toContain(english);
    }
  });

  it("stays English when nobody used voice", () => {
    review("");
    expect(screen.getByRole("heading", { name: "Check your report" })).toBeInTheDocument();
    expect(screen.getByText("Pothole")).toBeInTheDocument();
    expect(screen.getByText("Yes, it was fixed and came back")).toBeInTheDocument();
  });
});

describe("the Check step shows the text that will be published", () => {
  it("shows the description before the person records it", () => {
    review("hi-IN", "जहाँगीर आर्ट गैलरी के सामने फुटपाथ टूटा है। मैंने आज देखा।");
    expect(screen.getByText("विवरण")).toBeInTheDocument();
    expect(screen.getByText("जहाँगीर आर्ट गैलरी के सामने फुटपाथ टूटा है। मैंने आज देखा।")).toBeInTheDocument();
  });

  it("leaves the row out when there is no description", () => {
    review("en", "   ");
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });
});

describe("the description is written in the language they spoke", () => {
  it("asks for Hindi or Marathi in Devanagari, and English by default", () => {
    expect(buildUserPrompt("फुटपाथ टूटा है", undefined, "hi")).toContain("save_description in Hindi, in Devanagari");
    expect(buildUserPrompt("फुटपाथ तुटला आहे", undefined, "mr")).toContain("save_description in Marathi, in Devanagari");
    expect(buildUserPrompt("footpath is broken")).toContain("save_description in English");
  });

  it("no longer asks the model for an English translation in the resident's third person", () => {
    const tool = VOICE_TOOLS.find((entry) => entry.function.name === "save_description");
    expect(tool?.function.description).not.toMatch(/English translation/i);
    expect(tool?.function.description).toMatch(/first person/i);
  });
});

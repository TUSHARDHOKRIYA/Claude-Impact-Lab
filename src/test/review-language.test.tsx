import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ReportReview } from "@/components/report/ReportReview";

afterEach(cleanup);

function review(lang: string, description = "") {
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
      lang={lang}
      onAccident={() => {}}
      onEdit={() => {}}
      locationConfirmed
    />,
  );
}

describe("the Check step speaks one language", () => {
  it("shows Hindi labels next to Hindi answers", () => {
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

  it("stays English by default", () => {
    review("");
    expect(screen.getByRole("heading", { name: "Check your report" })).toBeInTheDocument();
    expect(screen.getByText("Pothole")).toBeInTheDocument();
    expect(screen.getByText("Yes, it was fixed and came back")).toBeInTheDocument();
  });
});

describe("the Check step shows the text that will be published", () => {
  it("shows the description the person typed", () => {
    review("hi-IN", "जहाँगीर आर्ट गैलरी के सामने फुटपाथ टूटा है। मैंने आज देखा।");
    expect(screen.getByText("विवरण")).toBeInTheDocument();
    expect(screen.getByText("जहाँगीर आर्ट गैलरी के सामने फुटपाथ टूटा है। मैंने आज देखा।")).toBeInTheDocument();
  });

  it("leaves the row out when there is no description", () => {
    review("en", "   ");
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANDMARKS } from "@/lib/city";
import { processVoiceTurnAction } from "@/lib/voice/actions";
import { installMicrophone, resetFakeRecorder, stubAudio, turn } from "./voice-test-kit";

const createReportAction = vi.hoisted(() => vi.fn());
const compressImageFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions", () => ({ createReportAction }));
vi.mock("@/lib/photo-compress", () => ({ compressImageFile }));
vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/components/report/PinMap", () => ({
  default: function PinMapStub({ onChange }: { onChange: (pin: { lat: number; lng: number }) => void }) {
    return (
      <button type="button" onClick={() => onChange({ lat: 18.9285, lng: 72.832 })}>
        drag the pin
      </button>
    );
  },
}));

import { ReportForm } from "@/components/report/ReportForm";

type User = ReturnType<typeof userEvent.setup>;
const hindmata = LANDMARKS.find((landmark) => landmark.id === "loc-hindmata") || LANDMARKS[0];
const hidden = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value;
const tap = (user: User, name: string) => user.click(screen.getByRole("button", { name }));

async function toAnswers(user: User) {
  render(<ReportForm voiceEnabled />);
  await user.upload(screen.getByLabelText(/photo of what you can see/i), new File(["photo"], "street.jpg", { type: "image/jpeg" }));
  await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
  await tap(user, "Continue");
}

async function speak(user: User) {
  await tap(user, "Start speaking");
  await tap(user, "Stop and send");
}

beforeEach(() => {
  resetFakeRecorder();
  installMicrophone();
  stubAudio();
  compressImageFile.mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("the voice-first report page", () => {
  it("takes the photo first, then shows one way to answer at a time, voice by default", async () => {
    const user = userEvent.setup();
    render(<ReportForm voiceEnabled />);
    expect(screen.queryByRole("button", { name: "Start speaking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "How do you want to answer?" })).not.toBeInTheDocument();
    cleanup();

    await toAnswers(user);
    // In voice mode the switch lives in the dock; the top toggle only appears in the form.
    expect(screen.queryByRole("group", { name: "How do you want to answer?" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Form" })).toBeInTheDocument();
    expect(screen.getByText("Namaste!")).toBeInTheDocument();
    expect(screen.getByText(/What is the problem\?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start speaking" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /What is wrong with the road/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();

    await tap(user, "Form");
    expect(screen.getByRole("heading", { name: /What is wrong with the road/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start speaking" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voice" })).toHaveAttribute("aria-pressed", "false");
  });

  it("asks every question in order by chips, confirms the pin, and records only on the person's own tap", async () => {
    const user = userEvent.setup();
    await toAnswers(user);

    await tap(user, "Pothole");
    expect(screen.getByText(/When did you notice it/)).toBeInTheDocument();
    await tap(user, "Today");
    await tap(user, "No, just this once");
    expect(screen.getByText(/Where is it\?/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, this is the spot" })).toBeInTheDocument();

    await tap(user, hindmata.name);
    expect(screen.getByText(/Is the pin in the right spot\?/)).toBeInTheDocument();
    expect(hidden("locationConfirmed")).toBe("false");
    await tap(user, "Yes, this is the spot");
    expect(screen.getByText(/Anything else people should know\?/)).toBeInTheDocument();
    await tap(user, "No, that's all");
    expect(screen.getByText(/that is everything/)).toBeInTheDocument();
    expect(createReportAction).not.toHaveBeenCalled();

    await tap(user, "Check the report");
    expect(screen.getByRole("heading", { name: "Check your report" })).toBeInTheDocument();
    expect(createReportAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("radio", { name: "No" }));
    await tap(user, "Send report");
    expect(createReportAction).toHaveBeenCalledTimes(1);
    const data = createReportAction.mock.calls[0][0] as FormData;
    expect(data.get("issueType")).toBe("pothole");
    expect(data.get("noticedWindow")).toBe("today");
    expect(data.get("recurs")).toBe("false");
    expect(data.get("accident")).toBe("none");
    expect(data.get("locationConfirmed")).toBe("true");
    expect(Number(data.get("lat"))).toBe(hindmata.lat);
  });

  it("lets one spoken sentence fill several answers, then asks only what is left", async () => {
    vi.mocked(processVoiceTurnAction).mockResolvedValue(
      turn({
        transcript: "Hindmata ke saamne footpath toota hai, aaj dekha, chalne mein dikkat",
        fields: {
          issueType: "pothole",
          noticedWindow: "today",
          description: "Footpath outside Hindmata is broken.",
        },
        pinProposal: { landmarkId: "hindmata", label: hindmata.name, lat: hindmata.lat, lng: hindmata.lng },
        reply: { text: "Got it. Does it keep coming back after it is cleared?", ask: "recurs", confirm: false },
      }),
    );
    const user = userEvent.setup();
    await toAnswers(user);

    await speak(user);
    expect(await screen.findByText(/Hindmata ke saamne footpath toota hai/)).toBeInTheDocument();
    expect(screen.getByText("Got it. Does it keep coming back after it is cleared?")).toBeInTheDocument();
    const sent = vi.mocked(processVoiceTurnAction).mock.calls[0][0];
    expect(sent.get("asked")).toBe("issue_type");

    // Place is next, and voice already put the pin down: it asks to confirm, not "where".
    await tap(user, "Yes, it comes back");
    expect(screen.getByText(/Is the pin in the right spot\?/)).toBeInTheDocument();
    expect(Number(hidden("lat"))).toBe(hindmata.lat);
    await tap(user, "Yes, this is the spot");
    // The description came with the first sentence, so nothing is left to ask.
    expect(screen.getByText(/that is everything/)).toBeInTheDocument();
    expect(hidden("description")).toBe("Footpath outside Hindmata is broken.");
  });

  it("tells the server a pin is down, and never moves a pin the person confirmed", async () => {
    const museum = LANDMARKS.find((landmark) => landmark.id !== "hindmata")!;
    vi.mocked(processVoiceTurnAction).mockResolvedValue(
      turn({
        transcript: "raat ko andhera rehta hai, museum ke paas bhi",
        fields: { description: "It is dark at night." },
        pinProposal: { landmarkId: museum.id, label: museum.name, lat: museum.lat, lng: museum.lng },
        reply: { text: "Thank you, that is everything. Now check your report, then record it.", ask: null, confirm: false },
      }),
    );
    const user = userEvent.setup();
    await toAnswers(user);
    for (const answer of ["Waterlogging", "Today", "No, just this once", hindmata.name, "Yes, this is the spot"]) {
      await tap(user, answer);
    }
    expect(screen.getByText(/Anything else people should know\?/)).toBeInTheDocument();

    await speak(user);
    await screen.findByText(/raat ko andhera/);
    expect(vi.mocked(processVoiceTurnAction).mock.calls[0][0].get("pinned")).toBe("1");
    expect(hidden("locationConfirmed")).toBe("true");
    expect(Number(hidden("lat"))).toBe(hindmata.lat);
    expect(hidden("description")).toBe("It is dark at night.");
  });

  it("puts the pin where the phone is, and says so when that is outside Mumbai's wards", async () => {
    let position = { latitude: 18.9283, longitude: 72.8319 };
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: position } as GeolocationPosition));
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    const user = userEvent.setup();
    await toAnswers(user);
    for (const answer of ["Waterlogging", "Today", "No, just this once"]) await tap(user, answer);

    await tap(user, "Use my location");
    expect(Number(hidden("lat"))).toBe(18.9283);
    expect(screen.getByText(/Is the pin in the right spot\?/)).toBeInTheDocument();

    position = { latitude: 18.52, longitude: 73.85 }; // Pune, outside Mumbai's wards
    await tap(user, "Use my location");
    expect(screen.getByRole("alert")).toHaveTextContent(/outside Mumbai's wards/);
    expect(Number(hidden("lat"))).toBe(18.9283);
  });

  it("keeps the answers and the conversation across Voice and Form", async () => {
    const user = userEvent.setup();
    await toAnswers(user);
    await tap(user, "Waterlogging");

    await tap(user, "Form");
    expect(screen.getByRole("radio", { name: /Waterlogging/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Pothole/ }));

    await tap(user, "Voice");
    expect(screen.getAllByText("Namaste!")).toHaveLength(1);
    expect(screen.getByText(/When did you notice it/)).toBeInTheDocument();
    expect(hidden("issueType")).toBe("pothole");
  });

  it("goes back from Check to the conversation, and a moved pin must be confirmed again", async () => {
    const user = userEvent.setup();
    await toAnswers(user);
    for (const answer of ["Waterlogging", "Today", "No, just this once", hindmata.name]) {
      await tap(user, answer);
    }
    await tap(user, "drag the pin");
    expect(hidden("locationConfirmed")).toBe("false");
    await tap(user, "Yes, this is the spot");
    await tap(user, "No, that's all");
    await tap(user, "Check the report");

    await tap(user, "Back");
    expect(screen.getByText(/that is everything/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check the report" })).toBeInTheDocument();
  });
});

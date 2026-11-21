import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processVoiceTurnAction } from "@/lib/voice/actions";
import type { VoiceTurnResult } from "@/lib/voice/contracts";
import { speakPromptAction } from "@/lib/voice/speak-action";
import {
  installDeniedMicrophone,
  installMicrophone,
  installPendingMicrophone,
  resetFakeRecorder,
  SPOKEN,
  stubAudio,
  turn,
} from "./voice-test-kit";

const compressImageFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions", () => ({ createReportAction: vi.fn() }));
vi.mock("@/lib/photo-compress", () => ({ compressImageFile }));
vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/components/report/PinMap", () => ({ default: () => <div>pin map</div> }));

import { ReportForm } from "@/components/report/ReportForm";

type User = ReturnType<typeof userEvent.setup>;
const hidden = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value;
const tap = (user: User, name: string) => user.click(screen.getByRole("button", { name }));
const status = () => screen.getByRole("status");

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
  compressImageFile.mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ");
  vi.mocked(speakPromptAction).mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("the dock", () => {
  it("moves idle → asking permission → listening → thinking → idle, announced live", async () => {
    const mic = installPendingMicrophone();
    stubAudio();
    let finish: (result: VoiceTurnResult) => void = () => {};
    vi.mocked(processVoiceTurnAction).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    await toAnswers(user);

    expect(status()).toHaveAttribute("aria-live", "polite");
    expect(status()).toHaveTextContent("Press the microphone to speak");
    await tap(user, "Start speaking");
    expect(status()).toHaveTextContent("Allow the microphone when your browser asks");
    mic.resolveStream(mic.stream);
    expect(await screen.findByText("Go ahead, I'm listening.")).toBeInTheDocument();
    expect(status()).toHaveTextContent(/Press again when you are done/);

    await tap(user, "Stop and send");
    expect(status()).toHaveTextContent("Understanding what you said…");
    expect(screen.getByRole("button", { name: "Start speaking" })).toBeDisabled();
    finish(turn());
    await waitFor(() => expect(status()).toHaveTextContent("Press the microphone to speak"));
    expect(screen.getByText("pothole near Hindmata")).toBeInTheDocument();
  });

  it("says a blocked microphone plainly and keeps the answers", async () => {
    installDeniedMicrophone();
    stubAudio();
    const user = userEvent.setup();
    await toAnswers(user);
    await tap(user, "Waterlogging");
    await tap(user, "Start speaking");
    expect(await screen.findByRole("alert")).toHaveTextContent(/permission was denied.*switch to Form.*answers are safe/i);
    expect(hidden("issueType")).toBe("waterlogging");
  });

  it("reads the greeting aloud, and Replay says the current question again", async () => {
    installMicrophone();
    stubAudio();
    const user = userEvent.setup();
    await toAnswers(user);
    expect(speakPromptAction).toHaveBeenCalledWith("issue_type", "hello", "en");

    await tap(user, "Replay");
    expect(speakPromptAction).toHaveBeenCalledTimes(2);
    await tap(user, "Waterlogging");
    expect(speakPromptAction).toHaveBeenLastCalledWith("noticed_window", "ack", "en");
  });

  it("still answers on screen when the spoken reply cannot play", async () => {
    installMicrophone();
    stubAudio({ reject: true });
    vi.mocked(processVoiceTurnAction).mockResolvedValue(turn({ audio: SPOKEN }));
    const user = userEvent.setup();
    await toAnswers(user);
    await speak(user);
    expect(await screen.findByText(/When did you notice it/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("checking what voice heard", () => {
  it("repeats a weak transcript back and fills nothing until the person says yes", async () => {
    installMicrophone();
    stubAudio();
    const weak = turn({
      fields: { issueType: "waterlogging" },
      reply: { text: "I heard “pothole near Hindmata”. Is that right?", ask: null, confirm: true },
    });
    vi.mocked(processVoiceTurnAction).mockResolvedValue(weak);
    const user = userEvent.setup();
    await toAnswers(user);

    await speak(user);
    await screen.findByText(/Is that right\?/);
    await tap(user, "No");
    expect(hidden("issueType")).toBe("");
    expect(screen.getByText("Okay. Tap the microphone and say it again.")).toBeInTheDocument();

    await speak(user);
    await screen.findAllByText(/Is that right\?/);
    await tap(user, "Yes");
    expect(hidden("issueType")).toBe("waterlogging");
    expect(screen.getByText(/When did you notice it/)).toBeInTheDocument();
  });

  it("asks before voice overwrites something the person chose", async () => {
    installMicrophone();
    stubAudio();
    vi.mocked(processVoiceTurnAction).mockResolvedValue(turn({ fields: { issueType: "open_manhole" } }));
    const user = userEvent.setup();
    await toAnswers(user);
    await tap(user, "Form");
    await user.click(screen.getByRole("radio", { name: /Pothole/ }));
    await tap(user, "Voice");

    await speak(user);
    const card = await screen.findByRole("group", { name: "Voice heard something different: Type" });
    expect(card).toHaveTextContent(/Yours:\s*Pothole/);
    expect(card).toHaveTextContent(/Voice:\s*Open or broken manhole/);
    expect(hidden("issueType")).toBe("pothole");
    await tap(user, "Use voice");
    expect(hidden("issueType")).toBe("open_manhole");
  });
});

describe("language", () => {
  it("switches the chat's language from the pill", async () => {
    installMicrophone();
    stubAudio();
    const user = userEvent.setup();
    await toAnswers(user);
    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "hi");
    expect(screen.getByRole("button", { name: "बोलना शुरू करें" })).toBeInTheDocument();
    await tap(user, "गड्ढा");
    expect(screen.getByText(/आपने यह कब देखा/)).toBeInTheDocument();
  });
});

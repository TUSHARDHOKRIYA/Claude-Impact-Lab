import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReportVoice, type ReportVoiceValues } from "@/components/report/use-report-voice";
import { processVoiceTurnAction } from "@/lib/voice/actions";
import type { VoiceTurnResult } from "@/lib/voice/contracts";
import { speakPromptAction } from "@/lib/voice/speak-action";
import { installMicrophone, resetFakeRecorder, SPOKEN, stubAudio, turn } from "./voice-test-kit";

const compressImageFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions", () => ({ createReportAction: vi.fn() }));
vi.mock("@/lib/photo-compress", () => ({ compressImageFile }));
vi.mock("@/lib/voice/actions", () => ({ processVoiceTurnAction: vi.fn() }));
vi.mock("@/lib/voice/speak-action", () => ({ speakPromptAction: vi.fn(async () => null) }));
vi.mock("@/components/report/PinMap", () => ({ default: () => <div>pin map</div> }));

import { ReportForm } from "@/components/report/ReportForm";

type User = ReturnType<typeof userEvent.setup>;
const hidden = (name: string) => document.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)!.value;
const tap = (user: User, name: string) => user.click(screen.getByRole("button", { name }));
const empty: ReportVoiceValues = { issueType: "", noticedWindow: "", recurs: "", affects: [], description: "" };

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

describe("a voice turn that lands after the form changed", () => {
  it("compares against the form as it is now, so a newer choice becomes keep-or-replace", () => {
    const write = {
      issueType: vi.fn(),
      noticedWindow: vi.fn(),
      recurs: vi.fn(),
      affects: vi.fn(),
      description: vi.fn(),
      pin: vi.fn(),
    };
    const { result, rerender } = renderHook(({ values }) => useReportVoice(values, write), {
      initialProps: { values: empty },
    });
    // The recorder holds the callback from when the person started speaking.
    const applyFromRecordingStart = result.current.applyResult;
    rerender({ values: { ...empty, issueType: "road" } });

    act(() => applyFromRecordingStart(turn({ fields: { issueType: "footpath" } })));

    expect(write.issueType).not.toHaveBeenCalled();
    expect(result.current.conflicts).toEqual([{ field: "issueType", existing: "road", incoming: "footpath" }]);
  });
});

describe("leaving the chat while a turn is in flight", () => {
  it("drops the late answer: nothing filled, nothing said, the question unchanged", async () => {
    installMicrophone();
    const audio = stubAudio();
    let finish: (result: VoiceTurnResult) => void = () => {};
    vi.mocked(processVoiceTurnAction).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<ReportForm voiceEnabled />);
    await user.upload(screen.getByLabelText(/photo of what you can see/i), new File(["p"], "s.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
    await tap(user, "Continue");

    await tap(user, "Start speaking");
    await tap(user, "Stop and send");
    await tap(user, "Form");
    await act(async () => finish(turn({ fields: { issueType: "waste" }, audio: SPOKEN })));

    expect(hidden("issueType")).toBe("");
    expect(audio.spoken()).toEqual([]);
    await tap(user, "Voice");
    expect(screen.queryByText("garbage near the horse")).not.toBeInTheDocument();
    expect(screen.getByText(/What is the problem\?/)).toBeInTheDocument();
    expect(screen.queryByText(/When did you notice it/)).not.toBeInTheDocument();
  });
});

describe("prompts that load out of order", () => {
  it("plays only the newest question, so an older clip cannot talk over it", async () => {
    installMicrophone();
    const audio = stubAudio();
    const pending: Array<(clip: typeof SPOKEN | null) => void> = [];
    vi.mocked(speakPromptAction).mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
    const user = userEvent.setup();
    render(<ReportForm voiceEnabled />);
    await user.upload(screen.getByLabelText(/photo of what you can see/i), new File(["p"], "s.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
    await tap(user, "Continue");

    // Two quick chips: "When did you notice it?" is requested, then "Does it keep coming back?".
    await tap(user, "Waste");
    await tap(user, "Today");
    expect(pending).toHaveLength(3); // hello, then the two acks
    const [, whenClip, recursClip] = pending;

    // The newer question's audio arrives first, then the older one's lands late.
    await act(async () => recursClip({ ...SPOKEN, base64: "UkVDVVJT" }));
    await act(async () => whenClip({ ...SPOKEN, base64: "V0hFTg==" }));

    expect(audio.spoken()).toHaveLength(1);
    expect(audio.spoken()[0]).toContain("UkVDVVJT");
  });
});

describe("coming back to the chat after answering in the form", () => {
  it("asks for what is still missing instead of repeating an answered question", async () => {
    installMicrophone();
    stubAudio();
    const user = userEvent.setup();
    render(<ReportForm voiceEnabled />);
    await user.upload(screen.getByLabelText(/photo of what you can see/i), new File(["p"], "s.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.getByText("Photo ready.")).toBeInTheDocument());
    await tap(user, "Continue");
    expect(screen.getByText(/What is the problem\?/)).toBeInTheDocument();

    await tap(user, "Form");
    await user.click(screen.getByRole("radio", { name: "Road" }));
    await tap(user, "Voice");

    expect(screen.getByText(/When did you notice it/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Road" })).not.toBeInTheDocument();
  });
});

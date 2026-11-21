import { vi } from "vitest";
import type { VoiceTurnSuccess } from "@/lib/voice/contracts";

type Track = { enabled: boolean; stop: ReturnType<typeof vi.fn> };

/** A MediaRecorder that yields one small clip whenever it is stopped. */
export class FakeMediaRecorder {
  static supported = true;
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported(_type?: string) {
    return FakeMediaRecorder.supported;
  }

  state: RecordingState = "inactive";
  mimeType = "";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(
    readonly stream: MediaStream,
    options?: MediaRecorderOptions,
  ) {
    this.mimeType = options?.mimeType ?? "";
    FakeMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["clip"], { type: this.mimeType || "audio/webm" }),
    } as BlobEvent);
    this.onstop?.(new Event("stop"));
  }
}

export function resetFakeRecorder() {
  FakeMediaRecorder.supported = true;
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.isTypeSupported = () => FakeMediaRecorder.supported;
  FakeMediaRecorder.prototype.start = function start() {
    this.state = "recording";
  };
}

function fakeStream() {
  const track: Track = { enabled: false, stop: vi.fn() };
  const stream = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track };
}

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value });
}

export function installMicrophone() {
  const { stream, track } = fakeStream();
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  setMediaDevices({ getUserMedia });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  return { getUserMedia, stream, track };
}

export function installPendingMicrophone() {
  const { stream, track } = fakeStream();
  let resolveStream = (_value: MediaStream) => {};
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve;
      }),
  );
  setMediaDevices({ getUserMedia });
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  return { getUserMedia, resolveStream: (value: MediaStream) => resolveStream(value), stream, track };
}

export function installDeniedMicrophone() {
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  setMediaDevices({
    getUserMedia: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
  });
}

export function removeMicrophone() {
  vi.stubGlobal("MediaRecorder", undefined);
  setMediaDevices(undefined);
}

/**
 * jsdom has no media playback. `play` resolves unless told to reject, and the
 * sources handed to it are recorded so a test can tell a reply was spoken.
 */
export function stubAudio(options: { reject?: boolean } = {}) {
  const sources: string[] = [];
  let element: HTMLMediaElement | null = null;
  const play = vi.fn(function play(this: HTMLMediaElement) {
    sources.push(this.src);
    element = this;
    return options.reject ? Promise.reject(new Error("blocked")) : Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  return {
    play,
    /** Sources other than the silent unlock clip. */
    spoken: () => sources.filter((src) => !src.startsWith("data:audio/wav")),
    /** Finish whatever is playing, as the browser would. */
    end: () => element?.dispatchEvent(new Event("ended")),
  };
}

export const SPOKEN = { mimeType: "audio/mpeg", base64: "SUQzAAAA" };

/** A successful voice turn with sensible defaults for every new field. */
export function turn(overrides: Partial<VoiceTurnSuccess> = {}): VoiceTurnSuccess {
  return {
    ok: true,
    transcript: "garbage near the horse",
    languageCode: "en-IN",
    fields: {},
    pinProposal: null,
    warnings: [],
    replyLanguage: "en",
    reply: { text: "Got it. When did you notice it?", ask: "noticed_window", confirm: false },
    audio: null,
    ...overrides,
  };
}

"use client";

import type { ReactNode } from "react";
import type { VoiceCopy } from "@/lib/voice/voice-copy";
import type { PushToTalkStatus } from "./use-push-to-talk";
import { ListIcon, MicIcon, ReplayIcon } from "./voice-icons";

export type MicState =
  | "idle"
  | "requesting"
  | "listening"
  | "processing"
  | "speaking"
  | "denied"
  | "unsupported"
  | "error";

export function micState(status: PushToTalkStatus, speaking: boolean): MicState {
  if (status === "recording") return "listening";
  if (status === "requesting" || status === "processing") return status;
  if (status === "denied" || status === "unsupported" || status === "error") return status;
  return speaking ? "speaking" : "idle";
}

export function statusText(state: MicState, copy: VoiceCopy, secondsLeft: number): string {
  if (state === "listening") return copy.listening(secondsLeft);
  if (state === "requesting") return copy.requesting;
  if (state === "processing") return copy.processing;
  if (state === "speaking") return copy.speaking;
  return copy.idle;
}

const SIDE =
  "flex h-11 w-11 items-center justify-center rounded-full bg-white text-enamel transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50";

function SideButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={SIDE}>
        {children}
      </button>
      <span aria-hidden="true" className="text-xs font-medium text-white">
        {label}
      </span>
    </div>
  );
}

/**
 * Dhwani's dock, in the site's blue, kept short so the question and its chips
 * own the screen on a phone: Replay and Form either side of a 72px mic, one
 * status line under it. Tap the mic to start, tap again to send.
 */
export function VoiceDock({
  state,
  copy,
  secondsLeft,
  canReplay,
  onMic,
  onReplay,
  onForm,
}: {
  state: MicState;
  copy: VoiceCopy;
  secondsLeft: number;
  canReplay: boolean;
  onMic: () => void;
  onReplay: () => void;
  onForm: () => void;
}) {
  const listening = state === "listening";
  const busy = state === "requesting" || state === "processing";
  return (
    <div className="rounded-t-3xl bg-enamel px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white">
      <div className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center">
        <SideButton label={copy.replay} disabled={!canReplay} onClick={onReplay}>
          <ReplayIcon size={20} stroke={2} />
        </SideButton>
        <div className="relative mx-auto h-[4.5rem] w-[4.5rem]">
          {listening ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-white opacity-40 animate-ping motion-reduce:animate-none"
            />
          ) : null}
          <button
            type="button"
            aria-label={listening ? copy.stop : copy.start}
            disabled={busy}
            onClick={onMic}
            className="relative flex h-full w-full items-center justify-center rounded-full bg-white text-enamel shadow-md transition-transform active:scale-95 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-60"
          >
            {listening ? (
              <span aria-hidden="true" className="block h-6 w-6 rounded-md bg-oxide" />
            ) : (
              <MicIcon size={30} stroke={1.75} className={busy ? "opacity-40" : undefined} />
            )}
          </button>
        </div>
        <SideButton label={copy.form} onClick={onForm}>
          <ListIcon size={20} stroke={2} />
        </SideButton>
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-center text-sm font-medium">
        {statusText(state, copy, secondsLeft)}
      </p>
    </div>
  );
}

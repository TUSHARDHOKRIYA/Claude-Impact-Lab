"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PushToTalkStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "unsupported"
  | "denied"
  | "error";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

function supportedMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return (
    MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

function isDenied(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

function errorMessage(error: unknown): string {
  if (isDenied(error)) {
    return "Microphone permission was denied. Continue by typing.";
  }
  return "Recording failed. Your draft is safe; continue by typing.";
}

export function usePushToTalk(options: {
  maxSeconds: number;
  onClip: (audio: File) => Promise<void>;
}) {
  const { maxSeconds, onClip } = options;
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<PushToTalkStatus>("idle");
  const [secondsLeft, setSecondsLeft] = useState(maxSeconds);
  const [error, setError] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timerRef.current = null;
    timeoutRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, [clearTimers]);

  const start = useCallback(async () => {
    if (
      status !== "idle" &&
      status !== "error" &&
      status !== "unsupported" &&
      status !== "denied"
    ) {
      return;
    }
    setError(null);
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      !supportedMime()
    ) {
      setStatus("unsupported");
      setError("Microphone recording is not supported. Continue by typing.");
      return;
    }

    setStatus("requesting");
    try {
      const stream =
        streamRef.current ??
        (await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        }));
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current ??= stream;
      const mimeType = supportedMime();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        clearTimers();
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        if (mountedRef.current) {
          setStatus("error");
          setError("Recording failed. Your draft is safe; continue by typing.");
        }
      };
      recorder.onstop = () => {
        const chunks = chunksRef.current;
        chunksRef.current = [];
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        if (!chunks.length || !mountedRef.current) {
          if (mountedRef.current) setStatus("error");
          if (mountedRef.current) setError("Recording was empty. Continue by typing.");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
        const audio = new File([blob], "voice-report audio", {
          type: blob.type || "audio/webm",
        });
        setStatus("processing");
        void onClip(audio)
          .then(() => {
            if (mountedRef.current) setStatus("idle");
          })
          .catch((caught: unknown) => {
            if (mountedRef.current) {
              setStatus("error");
              setError(
                caught instanceof Error
                  ? caught.message
                  : "Voice could not process that clip. Your draft is safe; continue by typing.",
              );
            }
          });
      };
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setSecondsLeft(maxSeconds);
      setStatus("recording");
      timerRef.current = setInterval(() => {
        setSecondsLeft((current) => Math.max(0, current - 1));
      }, 1000);
      timeoutRef.current = setTimeout(stop, maxSeconds * 1000);
      recorder.start();
    } catch (caught) {
      streamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      if (mountedRef.current) {
        setStatus(isDenied(caught) ? "denied" : "error");
        setError(errorMessage(caught));
      }
    }
  }, [clearTimers, maxSeconds, onClip, status, stop]);

  useEffect(() => {
    // React runs effects twice in development and again on hot reload, so the
    // flag must come back on each run; a stale `false` swallowed every stream.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [clearTimers]);

  return { status, secondsLeft, error, start, stop };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceAudio } from "@/lib/voice/contracts";

/**
 * A silent WAV played inside the tap that starts a turn. iOS Safari lets an
 * audio element play later, without a gesture, only once it has played inside
 * one, and the reply arrives seconds after the tap.
 */
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function settle(played: Promise<void> | undefined, onFail: () => void = () => {}) {
  if (played && typeof played.catch === "function") played.catch(onFail);
}

/**
 * One reply at a time, like Udyam-Saathi's assistant audio: a new reply or a
 * tap on the mic cuts the old one off. Any playback failure is silence, never
 * an error, because the reply is also on screen.
 */
export function useReplyAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const element = useCallback((): HTMLAudioElement | null => {
    if (!audioRef.current && typeof Audio !== "undefined") audioRef.current = new Audio();
    return audioRef.current;
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    setSpeaking(false);
  }, []);

  const prime = useCallback(() => {
    const audio = element();
    if (!audio) return;
    stop();
    audio.src = SILENCE;
    settle(audio.play());
  }, [element, stop]);

  const play = useCallback(
    (clip: VoiceAudio | null) => {
      if (!clip) return;
      const audio = element();
      if (!audio) return;
      const done = () => setSpeaking(false);
      audio.onended = done;
      audio.onerror = done;
      audio.src = `data:${clip.mimeType};base64,${clip.base64}`;
      setSpeaking(true);
      settle(audio.play(), done);
    },
    [element],
  );

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  return { speaking, prime, play, stop };
}

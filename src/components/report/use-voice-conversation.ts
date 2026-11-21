"use client";

import { useCallback, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/chip-labels";
import { processVoiceTurnAction } from "@/lib/voice/actions";
import type { VoiceAudio, VoiceTurnSuccess } from "@/lib/voice/contracts";
import {
  filledSlots,
  nextMissing,
  patchSlots,
  promptText,
  type AskSlot,
  type PromptKey,
  type PromptLead,
  type VoiceFormValues,
} from "@/lib/voice/conversation";
import { speakPromptAction } from "@/lib/voice/speak-action";
import { useReplyAudio } from "./use-reply-audio";
import type { VoiceAnswer } from "./use-report-voice";

export type ThreadMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  ask?: AskSlot | null;
  confirm?: boolean;
  /** How to say this message again: the server's clip, or the template it came from. */
  audio?: VoiceAudio | null;
  spec?: { key: PromptKey; lead: PromptLead; lang: LabelLanguage };
};

export type MapPoint = { lat: number; lng: number };

type Held = { result: VoiceTurnSuccess; asked: AskSlot | null };

/**
 * The turn loop: the assistant asks one question at a time, in order, and the
 * person answers by speaking or by tapping a chip. Each answer lands in the
 * report form through the callbacks; the pin only counts once the person
 * confirms it. Nothing here can submit the report.
 */
export function useVoiceConversation(options: {
  values: VoiceFormValues;
  hasPin: boolean;
  onResult: (result: VoiceTurnSuccess) => void;
  onAnswer: (answer: VoiceAnswer) => void;
  onPlace: (pin: MapPoint) => void;
  onConfirmPlace: () => void;
  onDescriptionDone: () => void;
}) {
  const { onResult, onAnswer, onPlace, onConfirmPlace, onDescriptionDone } = options;
  const [lang, setLang] = useState<LabelLanguage>("en");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [held, setHeld] = useState<Held | null>(null);
  const [pinLabel, setPinLabel] = useState<string | null>(null);
  const audio = useReplyAudio();
  const { play, prime, stop: hush } = audio;
  const nextId = useRef(0);
  const started = useRef(false);
  /** Bumped when the chat leaves the screen, so a turn still in flight knows to drop itself. */
  const turn = useRef(0);
  /**
   * Bumped every time something new is about to be said. Chip taps can queue
   * several prompt fetches; only the newest may play, or an older question's
   * audio lands after the newer one and the person answers what they heard.
   */
  const utterance = useRef(0);

  // Async turns read the newest state, not the render they started in.
  const latest = useRef({ ...options, lang, messages });
  latest.current = { ...options, lang, messages };

  const last = messages.at(-1);
  const ask = last?.role === "assistant" && !held ? (last.ask ?? null) : null;
  const finished = last?.role === "assistant" && !held && last.ask === null && !last.confirm && messages.length > 1;

  const push = useCallback((message: Omit<ThreadMessage, "id">) => {
    nextId.current += 1;
    const id = nextId.current;
    setMessages((current) => [...current, { ...message, id }]);
  }, []);

  /** Claim the floor. Returns a check that is true only while nothing newer has claimed it. */
  const claimFloor = useCallback(() => {
    utterance.current += 1;
    const mine = utterance.current;
    const chat = turn.current;
    return () => mine === utterance.current && chat === turn.current;
  }, []);

  const speak = useCallback(
    (key: PromptKey, lead: PromptLead) => {
      const stillMine = claimFloor();
      void speakPromptAction(key, lead, latest.current.lang)
        .then((clip: VoiceAudio | null) => {
          if (stillMine()) play(clip);
        })
        .catch(() => {});
    },
    [claimFloor, play],
  );

  const say = useCallback(
    (key: PromptKey, lead: PromptLead, next: AskSlot | null) => {
      const lang = latest.current.lang;
      push({ role: "assistant", text: promptText({ key, lead, lang }), ask: next, spec: { key, lead, lang } });
      speak(key, lead);
    },
    [push, speak],
  );

  /** Ask for the next empty slot, or say it is done. */
  const followUp = useCallback(
    (filled: AskSlot[], lead: PromptLead) => {
      const next = nextMissing(filled);
      const key: PromptKey = next === "place" && latest.current.hasPin ? "place_confirm" : (next ?? "done");
      say(key, lead, next);
    },
    [say],
  );

  /**
   * Opens the conversation the first time voice mode is shown. On a return
   * from the form, the answers may have changed under the chat, so the open
   * question is checked against what is still missing and replaced if stale.
   */
  const start = useCallback(() => {
    const filled = filledSlots(latest.current.values);
    if (!started.current) {
      started.current = true;
      followUp(filled, "hello");
      return;
    }
    const tail = latest.current.messages.at(-1);
    if (tail?.role !== "assistant" || tail.confirm) return;
    if ((tail.ask ?? null) !== nextMissing(filled)) followUp(filled, "none");
  }, [followUp]);

  const land = useCallback(
    ({ result, asked }: Held) => {
      onResult(result);
      if (result.pinProposal) setPinLabel(result.pinProposal.label);
      if (asked === "description") onDescriptionDone();
    },
    [onDescriptionDone, onResult],
  );

  const processClip = useCallback(
    async (clip: File) => {
      const { values, lang: current, messages: thread } = latest.current;
      const tail = thread.at(-1);
      const asked = tail?.role === "assistant" ? (tail.ask ?? null) : null;
      const data = new FormData();
      data.set("audio", clip);
      data.set("lang", current);
      data.set("speak", "1");
      data.set("filled", JSON.stringify(filledSlots(values)));
      if (asked) data.set("asked", asked);
      data.set("pinned", latest.current.hasPin ? "1" : "0");
      const mine = turn.current;
      const result = await processVoiceTurnAction(data);
      // They switched to the form or went back while this was in flight: it answers a
      // conversation that is no longer on screen, so it neither fills the form nor speaks.
      if (mine !== turn.current) return;
      if (!result.ok) throw new Error(result.error);
      setLang(result.replyLanguage);
      push({ role: "user", text: result.transcript });
      if (result.reply.confirm) setHeld({ result, asked });
      else land({ result, asked });
      push({ role: "assistant", ...result.reply, audio: result.audio });
      // This reply is the newest thing said; a chip prompt still loading must not talk over it.
      claimFloor();
      play(result.audio);
    },
    [claimFloor, land, play, push],
  );

  /** A chip tap is a user gesture, so it also unlocks audio for the reply. */
  const tapped = useCallback(() => prime(), [prime]);

  /** The chat left the screen: drop any turn still in flight and stop talking. */
  const leave = useCallback(() => {
    turn.current += 1;
    hush();
  }, [hush]);

  const answer = useCallback(
    (input: VoiceAnswer, label: string) => {
      tapped();
      onAnswer(input);
      push({ role: "user", text: label });
      followUp([...filledSlots(latest.current.values), input.slot], "ack");
    },
    [followUp, onAnswer, push, tapped],
  );

  const pickPlace = useCallback(
    (pin: MapPoint, label: string) => {
      tapped();
      onPlace(pin);
      setPinLabel(label);
      push({ role: "user", text: label });
      say("place_confirm", "ack", "place");
    },
    [onPlace, push, say, tapped],
  );

  /** The pin was dragged on the map: the coordinates are the person's own now, so no landmark names them. */
  const movePin = useCallback(
    (pin: MapPoint) => {
      onPlace(pin);
      setPinLabel(null);
    },
    [onPlace],
  );

  const confirmPlace = useCallback(
    (label: string) => {
      tapped();
      onConfirmPlace();
      push({ role: "user", text: label });
      followUp([...filledSlots(latest.current.values), "place"], "ack");
    },
    [followUp, onConfirmPlace, push, tapped],
  );

  const skipDescription = useCallback(
    (label: string) => {
      tapped();
      onDescriptionDone();
      push({ role: "user", text: label });
      followUp([...filledSlots(latest.current.values), "description"], "none");
    },
    [followUp, onDescriptionDone, push, tapped],
  );

  const confirm = useCallback(
    (yes: boolean, label: string) => {
      if (!held) return;
      tapped();
      setHeld(null);
      push({ role: "user", text: label });
      if (!yes) {
        say("retry", "none", held.asked);
        return;
      }
      land(held);
      const extra: AskSlot[] = held.asked === "description" ? ["description"] : [];
      followUp([...filledSlots(latest.current.values), ...patchSlots(held.result.fields), ...extra], "ack");
    },
    [followUp, held, land, push, say, tapped],
  );

  /** Say the latest question again. */
  const replay = useCallback(() => {
    const question = [...latest.current.messages].reverse().find((message) => message.role === "assistant");
    if (!question) return;
    prime();
    if (question.audio) play(question.audio);
    else if (question.spec) speak(question.spec.key, question.spec.lead);
  }, [play, prime, speak]);

  return {
    lang,
    setLang,
    messages,
    ask,
    finished,
    confirming: held !== null,
    pinLabel,
    audio,
    start,
    leave,
    processClip,
    answer,
    pickPlace,
    movePin,
    confirmPlace,
    skipDescription,
    confirm,
    replay,
  };
}

export type VoiceConversation = ReturnType<typeof useVoiceConversation>;

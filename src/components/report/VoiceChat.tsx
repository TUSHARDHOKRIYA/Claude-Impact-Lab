"use client";

import { useEffect, useRef, useState } from "react";
import { LABEL_LANGUAGES, type LabelLanguage } from "@/lib/chip-labels";
import { VOICE_RECORDING_SECONDS } from "@/lib/voice/contracts";
import { VOICE_COPY, type VoiceCopy } from "@/lib/voice/voice-copy";
import { VoiceAnswerChips } from "./VoiceAnswerChips";
import { VoiceConflicts } from "./VoiceConflicts";
import { VoiceDock, micState } from "./VoiceDock";
import { VoicePlaceCard } from "./VoicePlaceCard";
import { VoiceTurns } from "./VoiceTurns";
import { usePushToTalk } from "./use-push-to-talk";
import type { VoiceConflict, VoiceField } from "./use-report-voice";
import type { MapPoint, VoiceConversation } from "./use-voice-conversation";
import { ChevronDownIcon, GlobeIcon } from "./voice-icons";

/** Dhwani's language pill: a label over an invisible native select, so phones get the OS picker. */
function LanguagePill({ lang, copy, onChange }: { lang: LabelLanguage; copy: VoiceCopy; onChange: (lang: LabelLanguage) => void }) {
  return (
    <label className="relative flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-card px-3 text-sm font-semibold text-enamel focus-within:outline-4 focus-within:outline-offset-2 focus-within:outline-enamel">
      <GlobeIcon size={16} />
      <span>{VOICE_COPY[lang].languageName}</span>
      <ChevronDownIcon size={16} />
      <select
        aria-label={copy.language}
        value={lang}
        onChange={(event) => onChange(event.target.value as LabelLanguage)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {LABEL_LANGUAGES.map((code) => (
          <option key={code} value={code} lang={code}>
            {VOICE_COPY[code].languageName}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The voice way to answer, after Udyam-Saathi's chat and Dhwani's screen: the
 * assistant asks one question at a time, the person speaks or taps a chip, and
 * the answers land in the same form the Tap path fills. It ends on a button to
 * the Check step; the person reviews and records the report themselves.
 */
export function VoiceChat({
  convo,
  conflicts,
  pin,
  placeConfirmed,
  onResolve,
  onFinish,
  onForm,
}: {
  convo: VoiceConversation;
  conflicts: VoiceConflict[];
  pin: MapPoint | null;
  placeConfirmed: boolean;
  onResolve: (field: VoiceField, choice: "keep" | "replace") => void;
  onFinish: () => void;
  onForm: () => void;
}) {
  const voice = usePushToTalk({ maxSeconds: VOICE_RECORDING_SECONDS, onClip: convo.processClip });
  const copy = VOICE_COPY[convo.lang];
  const state = micState(voice.status, convo.audio.speaking);
  const busy = state === "listening" || state === "requesting" || state === "processing";
  const failure =
    state === "denied" ? copy.denied : state === "unsupported" ? copy.unsupported : state === "error" ? voice.error : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  /** Height of the sticky site header, so the chat can fill exactly the screen below it. */
  const [headerHeight, setHeaderHeight] = useState(0);
  const { start, leave } = convo;

  useEffect(() => {
    start();
    // Voice is the page's main surface: fill the screen under the sticky header, dock included.
    const header = document.querySelector("header");
    const offset = header ? Math.round(header.getBoundingClientRect().height) : 0;
    setHeaderHeight(offset);
    // One explicit scroll to just under the header; the page's own scroll-padding assumes a
    // shorter header than a phone's wrapped logo gives, and stacking both overshot the dock.
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const top = panel.getBoundingClientRect().top + window.scrollY - offset - 8;
      document.scrollingElement?.scrollTo?.({ top });
    });
    // Runs once: start and leave are stable. Leaving drops any turn still in flight.
    return leave;
  }, [start, leave]);
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    // While they talk, follow the bottom; otherwise keep the current question in view above its chips.
    const question = box.querySelector<HTMLElement>("[data-current-question]");
    const talking = state === "listening" || state === "processing";
    box.scrollTop = talking || !question ? box.scrollHeight : question.offsetTop - 12;
  }, [convo.messages.length, state, convo.ask]);

  function onMic() {
    if (voice.status === "recording") {
      voice.stop();
      return;
    }
    convo.audio.stop();
    convo.audio.prime();
    void voice.start();
  }

  return (
    <section
      ref={panelRef}
      aria-labelledby="report-step-heading"
      className="mt-6 flex flex-col overflow-hidden rounded-[28px] border border-rule bg-sheet"
      style={{ height: `max(28rem, min(46rem, calc(100dvh - ${headerHeight + 16}px)))` }}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 id="report-step-heading" tabIndex={-1} className="text-lg font-bold text-ink outline-none">
          {copy.assistant}
        </h2>
        <LanguagePill lang={convo.lang} copy={copy} onChange={convo.setLang} />
      </div>
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-y-auto px-5 [mask-image:linear-gradient(transparent,#000_24px,#000_calc(100%-16px),transparent)]"
      >
        <VoiceTurns messages={convo.messages} state={state} copy={copy}>
          <VoiceConflicts conflicts={conflicts} lang={convo.lang} copy={copy} onResolve={onResolve} />
          {convo.ask === "place" ? (
            <VoicePlaceCard
              pin={pin}
              label={convo.pinLabel}
              confirmed={placeConfirmed}
              copy={copy}
              disabled={busy}
              onPin={convo.movePin}
              onConfirm={() => convo.confirmPlace(copy.placeYes)}
            />
          ) : null}
          <VoiceAnswerChips
            ask={convo.ask}
            confirming={convo.confirming}
            lang={convo.lang}
            copy={copy}
            disabled={busy}
            handlers={{
              onAnswer: convo.answer,
              onPlace: convo.pickPlace,
              onSkipDescription: convo.skipDescription,
              onConfirm: convo.confirm,
            }}
          />
          {convo.finished ? (
            <button
              type="button"
              onClick={onFinish}
              className="mt-2 min-h-12 w-full rounded-full bg-enamel px-6 text-lg font-semibold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-enamel"
            >
              {copy.checkReport}
            </button>
          ) : null}
        </VoiceTurns>
      </div>
      {failure ? (
        <div role="alert" className="mx-5 mb-3 rounded-2xl border border-rule bg-card p-3 text-center text-sm text-ink">
          {failure} {copy.draftSafe}
        </div>
      ) : null}
      <VoiceDock
        state={state}
        copy={copy}
        secondsLeft={voice.secondsLeft}
        canReplay={convo.messages.some((message) => message.role === "assistant")}
        onMic={onMic}
        onReplay={convo.replay}
        onForm={onForm}
      />
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { issueTypeLabel, noticedWindowLabel, type LabelLanguage } from "@/lib/chip-labels";
import { isInsideCity, LANDMARKS } from "@/lib/city";
import { ISSUE_TYPES, NOTICED_WINDOWS } from "@/lib/types";
import type { AskSlot } from "@/lib/voice/conversation";
import type { VoiceCopy } from "@/lib/voice/voice-copy";
import type { MapPoint } from "./use-voice-conversation";
import type { VoiceAnswer } from "./use-report-voice";

const CHIP =
  "min-h-11 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-enamel disabled:opacity-50";

export function chipClass(pressed = false): string {
  return `${CHIP} ${pressed ? "border-enamel bg-enamel text-white" : "border-enamel bg-card text-enamel hover:bg-sheet"}`;
}

export type ChipHandlers = {
  onAnswer: (answer: VoiceAnswer, label: string) => void;
  onPlace: (pin: MapPoint, label: string) => void;
  onSkipDescription: (label: string) => void;
  onConfirm: (yes: boolean, label: string) => void;
};

function Chip({ label, pressed, disabled, onClick }: { label: string; pressed?: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={pressed} className={chipClass(pressed)} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

/**
 * On the spot, the phone knows where they are better than any landmark name.
 *
 * Geolocation can take seconds. While it runs, every place chip is locked so
 * nothing else can be picked underneath it, and a fix that lands after the
 * question has moved on (chips unmounted) is dropped rather than applied to
 * a pin the person has since chosen or confirmed.
 */
function PlaceChips({ copy, disabled, onPlace }: { copy: VoiceCopy; disabled: boolean; onPlace: ChipHandlers["onPlace"] }) {
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function locate() {
    setNote(null);
    if (!navigator.geolocation) {
      setNote(copy.noLocation);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!mounted.current) return;
        setLocating(false);
        const pin = { lat: coords.latitude, lng: coords.longitude };
        if (isInsideCity(pin.lat, pin.lng)) onPlace(pin, copy.myLocation);
        else setNote(copy.outsideArea);
      },
      () => {
        if (!mounted.current) return;
        setLocating(false);
        setNote(copy.noLocation);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const locked = disabled || locating;
  return (
    <>
      <Chip label={locating ? copy.locating : copy.myLocation} disabled={locked} onClick={locate} />
      {LANDMARKS.map((landmark) => (
        <Chip
          key={landmark.id}
          label={landmark.name}
          disabled={locked}
          onClick={() => onPlace({ lat: landmark.lat, lng: landmark.lng }, landmark.name)}
        />
      ))}
      {note ? (
        <p role="alert" className="w-full text-sm text-ink">
          {note}
        </p>
      ) : null}
    </>
  );
}

/**
 * The quick replies under the assistant's current question, as Udyam-Saathi
 * offers Yes/No: one set per question, so any answer can be tapped instead of
 * spoken. A tap costs nothing; only speech goes to the provider.
 */
export function VoiceAnswerChips({
  ask,
  confirming,
  lang,
  copy,
  disabled,
  handlers,
}: {
  ask: AskSlot | null;
  confirming: boolean;
  lang: LabelLanguage;
  copy: VoiceCopy;
  disabled: boolean;
  handlers: ChipHandlers;
}) {
  const row = "mt-4 flex flex-wrap gap-2";

  if (confirming) {
    return (
      <div className={row} role="group">
        <Chip label={copy.yes} disabled={disabled} onClick={() => handlers.onConfirm(true, copy.yes)} />
        <Chip label={copy.no} disabled={disabled} onClick={() => handlers.onConfirm(false, copy.no)} />
      </div>
    );
  }

  if (ask === "issue_type") {
    return (
      <div className={row} role="group" aria-label={copy.fields.issueType}>
        {ISSUE_TYPES.map((type) => {
          const label = issueTypeLabel(lang, type);
          return <Chip key={type} label={label} disabled={disabled} onClick={() => handlers.onAnswer({ slot: "issue_type", value: type }, label)} />;
        })}
      </div>
    );
  }

  if (ask === "noticed_window") {
    return (
      <div className={row} role="group" aria-label={copy.fields.noticedAt}>
        {NOTICED_WINDOWS.map((window) => {
          const label = noticedWindowLabel(lang, window);
          return (
            <Chip
              key={window}
              label={label}
              disabled={disabled}
              onClick={() => handlers.onAnswer({ slot: "noticed_window", value: window }, label)}
            />
          );
        })}
      </div>
    );
  }

  if (ask === "recurs") {
    const options: ["true" | "false", string][] = [
      ["true", copy.recursYes],
      ["false", copy.recursNo],
    ];
    return (
      <div className={row} role="group" aria-label={copy.fields.recurs}>
        {options.map(([value, label]) => (
          <Chip key={value} label={label} disabled={disabled} onClick={() => handlers.onAnswer({ slot: "recurs", value }, label)} />
        ))}
      </div>
    );
  }

  if (ask === "place") {
    return (
      <div className={row} role="group">
        <PlaceChips copy={copy} disabled={disabled} onPlace={handlers.onPlace} />
      </div>
    );
  }

  if (ask === "description") {
    return (
      <div className={row} role="group">
        <Chip label={copy.noMore} disabled={disabled} onClick={() => handlers.onSkipDescription(copy.noMore)} />
      </div>
    );
  }

  return null;
}

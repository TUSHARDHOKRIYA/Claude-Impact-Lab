"use client";

import dynamic from "next/dynamic";
import { isInsideCity } from "@/lib/city";
import type { VoiceCopy } from "@/lib/voice/voice-copy";
import type { MapPoint } from "./use-voice-conversation";

const PinMap = dynamic(() => import("@/components/report/PinMap"), {
  ssr: false,
  loading: () => <div className="h-56 w-full bg-paper" />,
});

/**
 * "Where is it?" as a card in the chat: the pin voice or a landmark chip put
 * down, a map to drag it, and the person's own confirmation. Voice can only
 * propose a place; this button is the only thing that confirms one.
 */
export function VoicePlaceCard({
  pin,
  label,
  confirmed,
  copy,
  disabled,
  onPin,
  onConfirm,
}: {
  pin: MapPoint | null;
  label: string | null;
  confirmed: boolean;
  copy: VoiceCopy;
  disabled: boolean;
  onPin: (pin: MapPoint) => void;
  onConfirm: () => void;
}) {
  const where = !pin
    ? copy.pinEmpty
    : label
      ? copy.pin(label)
      : `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`;
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-rule bg-card">
      <PinMap compact value={pin} onChange={onPin} />
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <p className="text-sm text-mist">{where}</p>
        {confirmed ? (
          <p className="text-sm font-semibold text-enamel">✓ {copy.placeConfirmed}</p>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded-full bg-enamel px-5 py-2 text-base font-semibold text-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-enamel disabled:opacity-50"
            disabled={disabled || !pin || !isInsideCity(pin.lat, pin.lng)}
            onClick={onConfirm}
          >
            {copy.placeYes}
          </button>
        )}
      </div>
    </div>
  );
}

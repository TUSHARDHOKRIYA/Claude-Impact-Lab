"use client";

import { ListIcon, MicIcon } from "./voice-icons";

export type AnswerMode = "voice" | "tap";

const OPTIONS: { mode: AnswerMode; label: string; Icon: typeof MicIcon }[] = [
  { mode: "voice", label: "Voice", Icon: MicIcon },
  { mode: "tap", label: "Form", Icon: ListIcon },
];

/**
 * After the photo: answer by talking, or by tapping through the questions.
 * One or the other is on screen, never both; the answers carry across.
 */
export function AnswerModeToggle({ mode, onChange }: { mode: AnswerMode; onChange: (mode: AnswerMode) => void }) {
  return (
    <div
      id="answer-mode"
      role="group"
      aria-label="How do you want to answer?"
      className="mt-6 grid scroll-mt-2 grid-cols-2 gap-1 rounded-full border border-rule bg-sheet p-1"
    >
      {OPTIONS.map(({ mode: option, label, Icon }) => {
        const on = mode === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-full text-base font-semibold transition-colors focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-enamel ${
              on ? "bg-enamel text-white shadow-sm" : "text-ink hover:bg-card"
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

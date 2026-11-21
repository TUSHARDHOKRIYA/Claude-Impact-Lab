"use client";

import type { ReactNode } from "react";
import { leadText, promptText } from "@/lib/voice/conversation";
import type { VoiceCopy } from "@/lib/voice/voice-copy";
import type { MicState } from "./VoiceDock";
import type { ThreadMessage } from "./use-voice-conversation";
import { AudioLinesIcon } from "./voice-icons";

function Tag({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-semibold text-enamel">
      <AudioLinesIcon size={16} />
      {children}
    </p>
  );
}

function AssistantTurn({ message, current, copy }: { message: ThreadMessage; current: boolean; copy: VoiceCopy }) {
  const body = current ? "text-xl font-semibold text-ink sm:text-2xl" : "text-base text-mist";
  const spec = message.spec;
  return (
    <li className="max-w-[94%] scroll-mt-4 self-start" data-current-question={current || undefined}>
      <Tag>{copy.assistant}</Tag>
      {spec?.lead === "hello" ? (
        <>
          <p className={`mt-1 font-bold leading-tight text-enamel ${current ? "text-4xl" : "text-2xl"}`}>
            {leadText("hello", spec.lang)}
          </p>
          <p className={`mt-2 leading-snug ${body}`}>{promptText({ key: spec.key, lead: "none", lang: spec.lang })}</p>
        </>
      ) : (
        <p className={`mt-1 whitespace-pre-line leading-snug ${body}`}>{message.text}</p>
      )}
    </li>
  );
}

function UserTurn({ message, current, copy }: { message: ThreadMessage; current: boolean; copy: VoiceCopy }) {
  return (
    <li className="max-w-[88%] self-end text-right">
      <p className="text-xs text-mist">{copy.you}</p>
      <p className={`mt-1 whitespace-pre-line break-words leading-snug ${current ? "text-lg font-medium text-ink" : "text-base text-mist"}`}>
        {message.text}
      </p>
    </li>
  );
}

/**
 * The conversation, laid out like Dhwani's thread: the assistant on the left
 * under its name, the person on the right under "You", the newest turn large
 * and everything older small. `children` (chips, cards) sit under the current
 * question; the listening and thinking states sit on the person's side.
 */
export function VoiceTurns({
  messages,
  state,
  copy,
  children,
}: {
  messages: ThreadMessage[];
  state: MicState;
  copy: VoiceCopy;
  children: ReactNode;
}) {
  const lastAssistant = messages.findLastIndex((message) => message.role === "assistant");
  const lastUser = messages.findLastIndex((message) => message.role === "user");
  return (
    <div className="flex min-h-full flex-col justify-end gap-6 py-6">
      <p className="text-xs text-mist">{copy.disclaimer}</p>
      <ol className="flex flex-col gap-6" aria-label={copy.thread}>
        {messages.map((message, index) =>
          message.role === "assistant" ? (
            <AssistantTurn key={message.id} message={message} current={index === lastAssistant} copy={copy} />
          ) : (
            <UserTurn key={message.id} message={message} current={index === lastUser && lastUser > lastAssistant} copy={copy} />
          ),
        )}
      </ol>
      {state === "listening" || state === "processing" ? null : children}
      {state === "listening" ? (
        <div className="self-end text-right">
          <Tag>{copy.listeningTag}</Tag>
          <p className="mt-1 text-2xl font-semibold leading-snug text-mist">{copy.listeningLine}</p>
        </div>
      ) : null}
      {state === "processing" ? (
        <div className="self-end rounded-2xl rounded-br-none border border-rule bg-card px-4 py-3">
          <span className="sr-only">{copy.processing}</span>
          <span aria-hidden="true" className="flex gap-2">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-2 w-2 animate-bounce rounded-full bg-enamel motion-reduce:animate-none"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        </div>
      ) : null}
    </div>
  );
}

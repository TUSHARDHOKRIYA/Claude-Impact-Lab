import type { Dataset } from "@/lib/rupee/load";
import { voicePacket, voicePreview } from "@/lib/rupee/voices";

/** A few complaints and posts from this ward, in the words people used. */
export function WardVoices({ ds, ward }: { ds: Dataset; ward: string }) {
  const shown = voicePreview(voicePacket(ds, ward).lines);
  if (shown.length === 0) return null;
  return (
    <ul className="rb-voices">
      {shown.map((line) => (
        <li key={line.id}>
          <blockquote className="ux4g-body-m-default">{line.text}</blockquote>
          <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">
            {line.kind === "complaint" ? `Complaint ${line.id}` : `Social post ${line.id}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

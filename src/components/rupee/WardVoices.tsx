import { wardVoices } from "@/lib/rupee/voices-brief";
import { voicePreview } from "@/lib/rupee/voices";
import type { Dataset } from "@/lib/rupee/load";

/** Streams in after the counts, the same way the money summary does. */
export async function WardVoices(props: { ds: Dataset; ward: string }) {
  const voices = await wardVoices(props.ds, props.ward);
  const shown = voicePreview(voices.lines);
  const complaints = voices.lines.filter((line) => line.kind === "complaint").length;
  const posts = voices.lines.filter((line) => line.kind === "post").length;
  return (
    <div className="rb-measure">
      <p className="ux4g-body-m-default">{voices.text}</p>
      <p className="ux4g-body-xs-default ux4g-text-neutral-secondary ux4g-mt-xs">
        {voices.source === "claude"
          ? `Written by Claude from ${complaints} complaints and ${posts} social posts. The lines below are the ones it read.`
          : `Taken from ${complaints} complaints and ${posts} social posts.`}
      </p>
      {shown.length > 0 ? (
        <ul className="ux4g-mt-s rb-voices">
          {shown.map((line) => (
            <li key={line.id}>
              <span className="ux4g-body-xs-default ux4g-text-neutral-secondary">{line.id}</span>
              <span className="ux4g-body-s-default">{line.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function WardVoicesLoading() {
  return (
    <p className="ux4g-body-m-default ux4g-text-neutral-secondary rb-measure" role="status">
      Reading complaints and social posts…
    </p>
  );
}

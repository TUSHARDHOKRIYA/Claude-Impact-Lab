import { GovBadge } from "@/components/gov/GovBadge";
import { BAND_TONE } from "@/lib/rupee/scorecard/summary";
import type { ScoreBand } from "@/lib/rupee/scorecard";

export function BandBadge({ band, small = false }: { band: ScoreBand; small?: boolean }) {
  return (
    <GovBadge tone={BAND_TONE[band]} small={small}>
      {band}
    </GovBadge>
  );
}

/**
 * A 0 to 100 meter. The shaded zones are the three bands (under 40, 40 to 60,
 * 60 and over) and the line at 50 is "exactly as expected". The text next to it
 * always names the band, so the colour never carries the meaning alone.
 */
export function ScoreMeter({
  score,
  label,
  zones = true,
  large = false,
}: {
  score: number;
  label: string;
  zones?: boolean;
  large?: boolean;
}) {
  const at = Math.max(0, Math.min(100, score));
  return (
    <div className={large ? "rb-meter rb-meter-large" : "rb-meter"}>
      <div className="rb-meter-track" role="img" aria-label={`${label}: ${score.toFixed(0)} out of 100. 50 is as expected.`}>
        {zones ? (
          <>
            <span className="rb-meter-zone rb-meter-low" style={{ width: "40%" }} />
            <span className="rb-meter-zone rb-meter-mid" style={{ width: "20%" }} />
            <span className="rb-meter-zone rb-meter-high" style={{ width: "40%" }} />
          </>
        ) : (
          <span className="rb-meter-plain" style={{ width: `${at}%` }} />
        )}
        <span className="rb-meter-expected" style={{ left: "50%" }} aria-hidden="true" />
        <span className="rb-meter-dot" style={{ left: `${at}%` }} aria-hidden="true" />
      </div>
      {large ? (
        <div className="rb-meter-scale ux4g-body-xs-default ux4g-text-neutral-secondary" aria-hidden="true">
          <span>0</span>
          <span style={{ left: "40%" }}>40</span>
          <span style={{ left: "50%" }}>as expected</span>
          <span style={{ left: "60%" }}>60</span>
          <span>100</span>
        </div>
      ) : null}
    </div>
  );
}

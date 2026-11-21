import { OUTLIER_FACTOR, PRIOR_JOBS, REPEAT_WINDOW_DAYS } from "@/lib/rupee/scorecard";

/** The scoring rules in plain words, so anyone reading a score can see how it was reached. */
export function ContractorMethod() {
  return (
    <div className="ux4g-accordion ux4g-accordion-arrow-right ux4g-accordion-bordered rb-accordion">
      <details className="ux4g-accordion__item">
        <summary className="ux4g-accordion__button touch-target">
          <span className="ux4g-accordion__button-content">
            <span className="ux4g-accordion__title">The rule behind every part</span>
          </span>
        </summary>
        <div className="ux4g-accordion__body ux4g-body-s-default rb-measure">
          <p>
            Each part is a ratio: what actually happened divided by what we would expect for the same repair methods in
            the same conditions. The score is 100 divided by (1 plus that ratio). A perfect record scores 100, exactly
            as expected scores 50, twice as bad as expected scores 33 and five times as bad scores 17. Nothing is cut
            off, so a very bad record still looks different from a mildly bad one.
          </p>
          <p className="ux4g-mt-xs">
            Overall is 45% durability, 30% cost and 25% speed. Speed counts least because a fast repair that fails is
            already caught by durability. Jobs done and rupees billed are shown for context and never scored, so
            nobody is rewarded or punished just for how much work they were given.
          </p>
        </div>
      </details>
      <details className="ux4g-accordion__item">
        <summary className="ux4g-accordion__button touch-target">
          <span className="ux4g-accordion__button-content">
            <span className="ux4g-accordion__title">What counts as expected</span>
          </span>
        </summary>
        <div className="ux4g-accordion__body ux4g-body-s-default rb-measure">
          <p>
            For durability and speed, expected is the city-wide rate for the same repair method at the same stress
            level (10 methods and 3 stress levels). Stress is Low, Medium or High, built from the rain in the 30 days
            after the job, whether the road is at a flood hotspot, and how busy the road is (peak vehicles, congestion
            and bus routes). The data has no vehicle types, so heavy traffic is an approximation. Stress only raises
            what we expect. It never adds or removes points on its own.
          </p>
          <p className="ux4g-mt-xs">
            For cost, expected is the rate card: the rate times the area for per-square-metre methods, or the flat
            rate for per-job methods. A bill more than {OUTLIER_FACTOR} times the rate card counts as far over, since
            normal jobs vary by 20 to 30%.
          </p>
        </div>
      </details>
      <details className="ux4g-accordion__item">
        <summary className="ux4g-accordion__button touch-target">
          <span className="ux4g-accordion__button-content">
            <span className="ux4g-accordion__title">Small samples and bands</span>
          </span>
        </summary>
        <div className="ux4g-accordion__body ux4g-body-s-default rb-measure">
          <p>
            A contractor with few jobs is pulled toward 50, as if they also had {PRIOR_JOBS} jobs exactly as expected.
            Under {PRIOR_JOBS} jobs the card says Limited data and gives no band. From 60 up is Strong, 40 to 60 is As
            expected, and under 40 is Needs attention.
          </p>
          <p className="ux4g-mt-xs">
            Repeat repairs are shown beside the score, not inside it. Without pothole-level locations, a repeat is the
            same kind of problem on the same road segment within {REPEAT_WINDOW_DAYS} days of an earlier job.
          </p>
        </div>
      </details>
    </div>
  );
}

/**
 * UX4G 3.3.3 segmented progress stepper (`ux4g-stepper-progress`), the
 * stepper variant built for phones: one bar per step and the current step
 * named in words, so it never wraps or shrinks to unreadable chips.
 */
export function GovProgress({
  current,
  labels,
  className,
}: {
  current: number;
  labels: readonly string[];
  className?: string;
}) {
  const total = labels.length;
  const currentLabel = labels[current - 1];
  return (
    <nav aria-label="Report steps" className={["ux4g-stepper-progress", className].filter(Boolean).join(" ")}>
      <p className="sr-only">
        Step {current} of {total}
        {currentLabel ? `: ${currentLabel}` : ""}
      </p>
      <ol className="ux4g-stepper-progress-track">
        {labels.map((label, index) => {
          const step = index + 1;
          const reached = step <= current;
          return (
            <li
              key={label}
              className={["ux4g-stepper-progress-segment", reached ? "ux4g-stepper-progress-segment-active" : null]
                .filter(Boolean)
                .join(" ")}
              aria-current={step === current ? "step" : undefined}
            >
              <span className="sr-only">
                {label}
                {step < current ? " (done)" : step === current ? " (current)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

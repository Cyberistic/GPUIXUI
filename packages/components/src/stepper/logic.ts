/**
 * How a stepper reads its current step.
 *
 * The statuses are derived, never passed: a step below the current one is
 * complete, the current one is current, the rest are upcoming. The only
 * decision here is what a current step the caller cannot name means — `NaN` or
 * an infinity from arithmetic over a step index, stamped before a length or a
 * total arrived.
 *
 * It reads as the **first step**, the one state a stepper can always paint. A
 * value that names no step leaves every marker upcoming and announces no
 * current step at all, so an indicator mid-computation would claim the workflow
 * had not started while the page around it said otherwise. `Countdown` reads an
 * unreadable remaining time as expired and `Carousel` an unreadable index as
 * the first slide for the same reason: a value the component cannot read is not
 * an observation, and the component still has to paint somewhere.
 */

/** Where a step sits relative to the current one. */
export type StepperStatus = "complete" | "current" | "upcoming";

/**
 * The current step a caller named, or the first step when it cannot be read.
 *
 * A finite value stays the caller's, including one below the first step: that
 * is an explicit "not started", which is a state a stepper may paint.
 */
export const currentStep = (value: number): number =>
  Number.isFinite(value) ? value : 1;

/**
 * A step's status relative to the current one. The current step is resolved
 * through {@link currentStep} first, so no caller can paint the unnamed state.
 */
export const statusOf = (current: number, step: number): StepperStatus => {
  const at = currentStep(current);
  return step < at ? "complete" : step === at ? "current" : "upcoming";
};

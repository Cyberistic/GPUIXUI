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

import { accessibleName } from "@gpuixui/primitives/core";
import * as Schema from "effect/Schema";
import { textOf } from "../internal/text.js";

/** Where a step sits relative to the current one. */
export type StepperStatus = "complete" | "current" | "upcoming";

/** The two axes a stepper can run along. */
export const StepperOrientations = Schema.Literals(["horizontal", "vertical"]);

/** The two axes a stepper can run along. */
export type StepperOrientation = typeof StepperOrientations.Type;

/**
 * The axis a stored name names.
 *
 * An orientation is saved with the workspace as often as it is a literal — a
 * workflow record, a restored settings pane — so a name a release renamed
 * reaches the root's recipe with no entry to paint: the list falls back to the
 * runtime's own row with no alignment, and a stepper a record saved as vertical
 * lays its steps out side by side. The documented `horizontal` is the answer
 * for a name this release does not carry, the rule `Tabs` follows for its axis.
 */
export const orientationOf = (value: unknown): StepperOrientation =>
  Schema.is(StepperOrientations)(value) ? value : "horizontal";

/**
 * A step's name, for the indicator and for the content that announces it.
 *
 * A title is copy from a data table or an i18n file as often as it is a literal,
 * so a blank one is an absence: an unnamed list item and an announcement opening
 * with a comma are both worse than the step's own position. A saved workflow is
 * also a value a decoder wrote, and a field it kept as a number or an object is
 * not a name at all — `accessibleName` trims a string, so handing it the record's
 * value threw `self.trim is not a function` out of the first paint. The title is
 * therefore read as **text or nothing** (`textOf`), the rule every stored draft
 * follows, before the blank check. The root that owns the position derives the
 * name, so the wizard and a direct `StepperStep` cannot disagree about the rule.
 */
export const stepName = (title: unknown, position: number): string =>
  accessibleName(textOf(title)) ??
  `Step ${Number.isFinite(position) ? Math.max(1, Math.floor(position)) : 1}`;

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

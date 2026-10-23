/**
 * The multi-step form's arithmetic: which step a value names, how the arrows
 * move, and the gate that refuses a move.
 *
 * A wizard is two rules the caller should not have to re-derive per screen: the
 * current step never leaves `1…count`, and a step may refuse to be left with a
 * message (the probe's "gate" — checked before the workflow moves, separately
 * from the whole-record decode `Form` performs on submit). The state lives in the
 * component; this module is pure.
 */

import { accessibleName, spokenSentence } from "@gpuixui/primitives/core";
import * as Option from "effect/Option";

/** What a step may refuse a move with. */
export interface StepGate {
  /** The message that keeps the reader on this step, or `None` to allow. */
  readonly gate?: () => Option.Option<string>;
}

/** The step a value names, held inside `1…count`. A count below one reads as 1. */
export const stepOf = (value: number, count: number): number => {
  if (count < 1) return 1;
  const named = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(Math.max(named, 1), count);
};

/**
 * A step's name in the indicator and in its content's announcement.
 *
 * A title is copy from a data table or an i18n file as often as it is a literal,
 * so a blank one is an absence: an unnamed list item and an announcement
 * opening with a comma are both worse than the step's own position.
 */
export const stepName = (title: string, position: number): string =>
  accessibleName(title) ??
  `Step ${Number.isFinite(position) ? Math.max(1, Math.floor(position)) : 1}`;

/** The next step; the last step stays put. */
export const nextStep = (step: number, count: number): number =>
  Math.min(stepOf(step, count) + 1, Math.max(1, count));

/** The previous step; the first step stays put. */
export const previousStep = (step: number): number =>
  Number.isFinite(step) ? Math.max(1, Math.floor(step) - 1) : 1;

/** Whether `step` is the workflow's last one. */
export const isLastStep = (step: number, count: number): boolean =>
  count > 0 && stepOf(step, count) === count;

/** The gate's refusal at one step, or `None` when the step may be left. */
export const gateMessage = (
  step: StepGate | undefined,
): Option.Option<string> =>
  step?.gate === undefined ? Option.none() : step.gate();

/** The sentence a refusal paints when the gate's own message says nothing. */
export const REFUSAL_FALLBACK = "This step is not complete yet.";

/**
 * The sentence a refusal paints.
 *
 * A gate's message is interface copy like a name: a table with a missing row
 * answers `""`, and an empty alert under the step explains nothing while the
 * workflow still refuses to move. A blank message reads as the shipped
 * sentence; a real one is trimmed and used.
 */
export const refusalText = (message: string): string =>
  spokenSentence(message, REFUSAL_FALLBACK);

/** The content group's announcement: its title and its place in the workflow. */
export const stepAnnouncement = (
  title: string,
  step: number,
  count: number,
): string => `${title}, step ${stepOf(step, count)} of ${Math.max(1, count)}`;

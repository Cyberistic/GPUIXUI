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

import { spokenSentence } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** What a step may refuse a move with. */
export interface StepGate {
  /** The message that keeps the reader on this step, or `None` to allow. */
  readonly gate?: () => Option.Option<string>;
}

/**
 * Whether a stored entry is a step: an object naming itself with a text id.
 *
 * The id is the step's identity — the indicator's key and the name a refusal is
 * kept with — so an entry without one is not a step. Nothing else is read here:
 * a step's content is React nodes, which no structural read can describe.
 */
const isStep = <Step extends { readonly id: string }>(
  entry: unknown,
): entry is Step => {
  if (typeof entry !== "object" || entry === null || !("id" in entry)) {
    return false;
  }
  const id = entry.id;
  return typeof id === "string" && id.length > 0;
};

/**
 * The steps a caller's list carries, read at the boundary.
 *
 * A workflow is code as often as data — an app that composes its wizard from a
 * saved definition, a step list restored with a draft — so JSON's `null` for a
 * list a record never carried reaches the component, and `steps.length` threw
 * `Cannot read properties of null (reading 'length')` before the first step
 * painted. The same applies to an entry a store left as `null` inside the list,
 * which threw on its `id` while its neighbours painted. Only a real list is a
 * list, and an entry that does not name itself is dropped, so one malformed
 * record cannot take the workflow down; the result feeds the count the
 * arithmetic already clamps against, and an empty one paints nothing.
 */
export const stepsOf = <Step extends { readonly id: string }>(
  value: ReadonlyArray<Step> | null | undefined,
): ReadonlyArray<Step> => {
  const list = Option.getOrElse(
    Option.filter(Option.fromNullishOr(value), (entries): boolean =>
      Arr.isArray(entries),
    ),
    () => [],
  );
  return Arr.filter(list, isStep);
};

/** The step a value names, held inside `1…count`. A count below one reads as 1. */
export const stepOf = (value: number, count: number): number => {
  if (count < 1) return 1;
  const named = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(Math.max(named, 1), count);
};

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

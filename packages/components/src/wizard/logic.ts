import { spokenSentence } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export interface StepGate {
  readonly gate?: () => Option.Option<string>;
}

export interface StepGateSource {
  readonly gate?: unknown;
}

const isStep = <Step extends { readonly id: string }>(
  entry: unknown,
): entry is Step => {
  if (typeof entry !== "object" || entry === null || !("id" in entry)) {
    return false;
  }
  const id = entry.id;
  return typeof id === "string" && id.length > 0;
};

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

export const stepOf = (value: number, count: number): number => {
  if (count < 1) return 1;
  const named = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(Math.max(named, 1), count);
};

export const nextStep = (step: number, count: number): number =>
  Math.min(stepOf(step, count) + 1, Math.max(1, count));

export const previousStep = (step: number): number =>
  Number.isFinite(step) ? Math.max(1, Math.floor(step) - 1) : 1;

export const isLastStep = (step: number, count: number): boolean =>
  count > 0 && stepOf(step, count) === count;

export const gateMessage = (
  step: StepGateSource | null | undefined,
): Option.Option<string> => {
  const gate = step?.gate;
  return typeof gate === "function" ? gate() : Option.none();
};

export const REFUSAL_FALLBACK = "This step is not complete yet.";

export const refusalText = (message: string): string =>
  spokenSentence(message, REFUSAL_FALLBACK);

export const stepAnnouncement = (
  title: string,
  step: number,
  count: number,
): string => `${title}, step ${stepOf(step, count)} of ${Math.max(1, count)}`;

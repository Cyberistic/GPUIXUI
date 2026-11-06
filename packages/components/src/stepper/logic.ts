import { accessibleName } from "@gpuixui/primitives/core";
import * as Schema from "effect/Schema";
import { textOf } from "../internal/text.js";

export type StepperStatus = "complete" | "current" | "upcoming";

export const StepperOrientations = Schema.Literals(["horizontal", "vertical"]);

export type StepperOrientation = typeof StepperOrientations.Type;

export const orientationOf = (value: unknown): StepperOrientation =>
  Schema.is(StepperOrientations)(value) ? value : "horizontal";

export const stepName = (title: unknown, position: number): string =>
  accessibleName(textOf(title)) ??
  `Step ${Number.isFinite(position) ? Math.max(1, Math.floor(position)) : 1}`;

export const currentStep = (value: number): number =>
  Number.isFinite(value) ? value : 1;

export const statusOf = (current: number, step: number): StepperStatus => {
  const at = currentStep(current);
  return step < at ? "complete" : step === at ? "current" : "upcoming";
};

/**
 * `MultiStepForm`: a wizard shell over the shipped `Stepper`, with a gate on
 * every step and a submit that only the last step offers.
 *
 * The state is the step index; the draft belongs to the caller, because a
 * wizard's fields are the caller's fields — the same ownership the probe's
 * `multi-step-form-lifecycle` measured on 0.11.0 (the caller keeps the draft,
 * each step's gate runs **before** the step moves, and the whole record is
 * decoded by `Form` only on the last step's submit).
 *
 * A step's content is mounted only while it is current. The draft survives
 * because it lives above this component; a field's own transient state does not,
 * which is the honest trade against keeping hidden fields in the tab order.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { accessibleName } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useState, type ReactNode } from "react";
import { Button } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { recipeStyle } from "./internal/recipe.js";
import { statusTone, useTheme } from "./internal/theme.js";
import { Stepper, StepperStep } from "./stepper.js";
import { stepName } from "./stepper/logic.js";
import {
  gateMessage,
  isLastStep,
  nextStep,
  previousStep,
  refusalText,
  stepAnnouncement,
  stepOf,
  stepsOf,
  type StepGate,
} from "./wizard/logic.js";

/** One step of a wizard. */
export interface MultiStep extends StepGate {
  /** A stable key for the step and its indicator row. */
  readonly id: string;
  /** The step's name in the indicator. A blank title reads as its position. */
  readonly title: string;
  /** One line of supporting copy in the indicator. A blank line paints nothing. */
  readonly description?: string;
  /** The step's content, mounted only while the step is current. */
  readonly content: ReactNode;
}

/** {@link MultiStepForm} props. */
export interface MultiStepFormProps extends Omit<
  Props,
  "children" | "onSubmit"
> {
  /** The steps, in order. An empty list paints nothing, and so does a value that is not a list — a saved definition's `null`; a step without a text `id` is not a step. */
  readonly steps: ReadonlyArray<MultiStep>;
  /** The controlled current step, 1-based; `undefined` is uncontrolled. */
  readonly step?: number;
  /** The uncontrolled starting step. Default `1`. */
  readonly defaultStep?: number;
  /** Reports every accepted step change, in both modes. */
  readonly onStepChange?: (step: number) => void;
  /** Runs when the last step's gate passes. */
  readonly onSubmit: () => void;
  /** A submit the caller is waiting on; the actions refuse a second press. */
  readonly pending?: boolean;
  /** The last step's action. Default `"Submit"`; a blank label reads as the default. */
  readonly submitLabel?: string;
  /** A middle step's action. Default `"Next"`; a blank label reads as the default. */
  readonly nextLabel?: string;
  /** The backward action. Default `"Back"`; a blank label reads as the default. */
  readonly backLabel?: string;
  /** The wizard's accessible name. A blank name is an absence, not an empty group. */
  readonly label?: string;
  readonly className?: string;
}

const DEFAULT_SUBMIT_LABEL = "Submit";
const DEFAULT_NEXT_LABEL = "Next";
const DEFAULT_BACK_LABEL = "Back";

/** A refusal, remembered with the step that raised it. */
interface Refusal {
  readonly id: string;
  readonly message: string;
}

/**
 * A step's gate, run with no content mounted.
 *
 * The gate belongs to the step the reader is on; the refusal is kept with that
 * step, so a controlled `step` change cannot paint a message against another
 * step's content.
 */
const guard = (step: MultiStep | undefined): Option.Option<string> =>
  gateMessage(step);

/** A wizard over the shipped stepper, with gated steps and one submit. */
export const MultiStepForm = ({
  steps,
  step: stepProp,
  defaultStep = 1,
  onStepChange,
  onSubmit,
  pending = false,
  submitLabel = DEFAULT_SUBMIT_LABEL,
  nextLabel = DEFAULT_NEXT_LABEL,
  backLabel = DEFAULT_BACK_LABEL,
  label,
  className,
  style,
  ...rest
}: MultiStepFormProps) => {
  const theme = useTheme();
  const name = accessibleName(label);
  // A default covers only an absent prop, so an action label that arrived blank
  // (an i18n table's missing key) would paint an unnamed button — the only
  // route forward. Read the three through the same absence rule as every name.
  const submitWord = accessibleName(submitLabel) ?? DEFAULT_SUBMIT_LABEL;
  const nextWord = accessibleName(nextLabel) ?? DEFAULT_NEXT_LABEL;
  const backWord = accessibleName(backLabel) ?? DEFAULT_BACK_LABEL;
  // A workflow is data as often as code: a saved definition writes `null` where
  // it carried no list, and one deleted record leaves a `null` entry. Both read
  // as no step rather than throwing out of the render — an empty list already
  // paints nothing, which is the state a workflow with no readable step is in.
  const list = stepsOf(steps);
  const count = list.length;
  const [value, setStep] = useControllableState({
    value: stepProp,
    defaultValue: defaultStep,
    onChange: onStepChange,
  });
  const current = stepOf(value, count);
  const [refusal, setRefusal] = useState<Option.Option<Refusal>>(Option.none());

  if (count === 0) return null;

  const step = list[current - 1];
  if (step === undefined) return null;
  const title = stepName(step.title, current);
  const last = isLastStep(current, count);
  const message = Option.flatMap(refusal, (held) =>
    held.id === step.id ? Option.some(held.message) : Option.none(),
  );

  const advance = (): void => {
    Option.match(guard(step), {
      onNone: () => {
        setRefusal(Option.none());
        setStep(nextStep(current, count));
      },
      onSome: (next) =>
        setRefusal(Option.some({ id: step.id, message: refusalText(next) })),
    });
  };

  const back = (): void => {
    setRefusal(Option.none());
    setStep(previousStep(current));
  };

  const submit = (): void => {
    Option.match(guard(step), {
      onNone: () => {
        setRefusal(Option.none());
        onSubmit();
      },
      onSome: (next) =>
        setRefusal(Option.some({ id: step.id, message: refusalText(next) })),
    });
  };

  const action = (): ReactNode =>
    last ? (
      <Button
        variant="primary"
        size="md"
        testId="multi-step-submit"
        disabled={pending}
        onClick={submit}
      >
        {submitWord}
      </Button>
    ) : (
      <Button
        variant="primary"
        size="md"
        testId="multi-step-next"
        disabled={pending}
        onClick={advance}
      >
        {nextWord}
      </Button>
    );

  return (
    <div
      {...(name === undefined ? {} : { role: "group", "aria-label": name })}
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(className), theme), {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }),
        style,
      )}
    >
      <Stepper
        value={current}
        label={name ?? "Steps"}
        testId="multi-step-steps"
      >
        {list.map((entry, at) => (
          <StepperStep
            key={entry.id}
            value={at + 1}
            label={entry.title}
            description={entry.description}
          />
        ))}
      </Stepper>
      <div
        testId="multi-step-content"
        role="group"
        aria-label={stepAnnouncement(title, current, count)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
        }}
      >
        {step?.content}
      </div>
      {Option.match(message, {
        onNone: () => null,
        onSome: (text) => (
          <text
            testId="multi-step-error"
            role="alert"
            style={{
              color: statusTone(theme, "destructive").foreground,
              fontSize: theme.typography.caption.fontSize,
              lineHeight: theme.typography.caption.lineHeight,
            }}
          >
            {text}
          </text>
        ),
      })}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: theme.spacing.sm,
        }}
      >
        <Button
          variant="ghost"
          size="md"
          testId="multi-step-back"
          disabled={pending || current === 1}
          onClick={back}
        >
          {backWord}
        </Button>
        {action()}
      </div>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const multiStepFormMeta = {
  name: "Multi-step forms",
  tier: 5,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the draft is the caller's; a non-current step's content is unmounted",
    "no step click: the indicator is read-only, like Stepper",
    "the last step's gate runs before onSubmit, not the record decode — that is Form's",
  ],
  docs: "docs/multi-step-form.mdx",
  example: "examples/multi-step-form.example.tsx",
  testFile: "src/behaviour/multi-step-form.test.tsx",
} as const;

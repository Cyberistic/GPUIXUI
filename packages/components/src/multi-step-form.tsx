/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { accessibleName } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useState, type ReactNode } from "react";
import { Button } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { recipeStyle } from "./internal/recipe.js";
import { textOf } from "./internal/text.js";
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

export interface MultiStep extends StepGate {
  readonly id: string;

  readonly title: string;

  readonly description?: string;

  readonly content: ReactNode;
}

export interface MultiStepFormProps extends Omit<
  Props,
  "children" | "onSubmit"
> {
  readonly steps: ReadonlyArray<MultiStep>;

  readonly step?: number;

  readonly defaultStep?: number;

  readonly onStepChange?: (step: number) => void;

  readonly onSubmit: () => void;

  readonly pending?: boolean;

  readonly submitLabel?: string;

  readonly nextLabel?: string;

  readonly backLabel?: string;

  readonly label?: string;
  readonly className?: string;
}

const DEFAULT_SUBMIT_LABEL = "Submit";
const DEFAULT_NEXT_LABEL = "Next";
const DEFAULT_BACK_LABEL = "Back";

interface Refusal {
  readonly id: string;
  readonly message: string;
}

const guard = (step: MultiStep | undefined): Option.Option<string> =>
  gateMessage(step);

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
  const name = accessibleName(textOf(label));

  const submitWord =
    accessibleName(textOf(submitLabel)) ?? DEFAULT_SUBMIT_LABEL;
  const nextWord = accessibleName(textOf(nextLabel)) ?? DEFAULT_NEXT_LABEL;
  const backWord = accessibleName(textOf(backLabel)) ?? DEFAULT_BACK_LABEL;

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

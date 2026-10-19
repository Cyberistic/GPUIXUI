/**
 * Multi-step form: a workflow over `Form`'s validation and `Stepper`'s indicator.
 *
 * The caller owns the draft, exactly as with `Form`; this component owns only the
 * step machine. `next` validates the current step's projection schema before it
 * advances, `back` never validates, and `submit` runs the full schema once, on
 * the last step, and hands back the decoded value.
 *
 * Messages are stored with the index that produced them, so a controlled `step`
 * move cannot paint the previous step's failure — there is no effect to run and
 * no one-frame flash of stale text. With `revalidate`, a failed action is
 * re-checked whenever the owned draft changes, using the schema that produced
 * the stored messages. The draft is compared by identity.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Num from "effect/Number";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useControllableState } from "./internal/controllable.js";
import { ErrorSummary } from "./internal/error-summary.js";
import { useTheme } from "./internal/theme.js";
import { Stepper, StepperStep } from "./stepper.js";
import {
  fieldMessageAt,
  sameFieldMessages,
  validateFields,
  type FieldMessage,
} from "./validation/logic.js";

/** One step's identity, name and the schema that validates its fields. */
export interface MultiStepFormStep {
  /** Stable key for the step; also the value `state.step.id` reports. */
  readonly id: string;
  /** The step's name in the indicator. */
  readonly label: string;
  /** One line of supporting copy in the indicator. */
  readonly description?: string;
  /**
   * Validates this step's fields against the whole draft. A projection schema
   * (`Schema.Struct` of the step's keys) is enough: decoding ignores excess
   * keys, so the same draft validates step by step and again at the end.
   */
  readonly schema: Schema.ConstraintDecoder<unknown>;
}

/** {@link MultiStepForm} props. */
export interface MultiStepFormProps<T> extends Omit<
  Props,
  "children" | "onSubmit"
> {
  /** The full schema, decoded only by the last step's `submit`. */
  readonly schema: Schema.ConstraintDecoder<T>;
  /** The draft the caller owns; never read from the runtime. */
  readonly value: unknown;
  /** At least one step, in order. */
  readonly steps: readonly [MultiStepFormStep, ...MultiStepFormStep[]];
  /** Receives the decoded value, never the draft. */
  readonly onSubmit: (value: T) => void;
  /** The caller's async state; locks every move while true. */
  readonly pending?: boolean;
  /**
   * Re-check a failed `next` or `submit` whenever `value` changes, so a step's
   * messages clear as the caller edits the draft. Validation never runs before
   * the first failed action. `value` is compared by identity. Default `false`.
   */
  readonly revalidate?: boolean;
  /** The form's accessible name. Without it the root is a plain container. */
  readonly label?: string;
  /** The controlled 0-based index. */
  readonly step?: number;
  /** The uncontrolled start. Default `0`. */
  readonly defaultStep?: number;
  /** Reports every accepted move, controlled or not. */
  readonly onStepChange?: (index: number) => void;
  readonly children: (state: MultiStepFormState) => ReactNode;
}

/** What the render prop receives. */
export interface MultiStepFormState {
  /** The current step, 0-based. */
  readonly index: number;
  /** The current step's record. Always defined: `steps` is non-empty. */
  readonly step: MultiStepFormStep;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  /** Every distinct message from the last failed action. */
  readonly errors: ReadonlyArray<string>;
  /** The same failures, each with the schema path that produced it. */
  readonly fieldErrors: ReadonlyArray<FieldMessage>;
  readonly pending: boolean;
  /** The message for a field path, or `undefined`. */
  readonly errorFor: (
    path: PropertyKey | ReadonlyArray<PropertyKey>,
  ) => string | undefined;
  /** Validate the current step; advance only when it passes. */
  readonly next: () => void;
  /** Move back one step. Never validates. No-op on the first step. */
  readonly back: () => void;
  /** No-op unless `isLast`; validate the full schema and submit the decoded value. */
  readonly submit: () => void;
}

/** A failed action, tagged with the step it belongs to. */
interface StepFailure {
  readonly index: number;
  /** The schema whose messages are stored, so a re-check runs the same pass. */
  readonly schema: Schema.ConstraintDecoder<unknown>;
  readonly fieldErrors: ReadonlyArray<FieldMessage>;
}

/**
 * A multi-step form: validate each step on the way forward, submit the whole
 * draft once at the end.
 */
export const MultiStepForm = <T,>({
  schema,
  value,
  steps,
  onSubmit,
  pending = false,
  revalidate = false,
  label,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  children,
  style,
  ...rest
}: MultiStepFormProps<T>) => {
  const theme = useTheme();
  const [rawIndex, setIndex] = useControllableState({
    value: stepProp,
    defaultValue: defaultStep,
    onChange: onStepChange,
  });
  // A controlled index can outlive a shorter `steps` array; clamp before use.
  const index = Num.clamp({ minimum: 0, maximum: steps.length - 1 })(rawIndex);
  const step = steps[index] ?? steps[0];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const [failure, setFailure] = useState<Option.Option<StepFailure>>(
    Option.none(),
  );

  // Messages belong to the step that produced them, so moving cannot show stale
  // text even when the move came from the controlled prop rather than an action.
  const fieldErrors: ReadonlyArray<FieldMessage> = Option.match(failure, {
    onNone: () => [],
    onSome: (found) => (found.index === index ? found.fieldErrors : []),
  });
  const errors = Arr.dedupe(Arr.map(fieldErrors, (field) => field.message));

  const lastValue = useRef(value);

  useLayoutEffect(() => {
    const changed = lastValue.current !== value;
    lastValue.current = value;
    if (!revalidate || !changed) return;

    const failed = Option.getOrUndefined(failure);
    if (failed === undefined || failed.index !== index) return;

    const next = Effect.runSync(validateFields(failed.schema)(value));
    setFailure((current) => {
      const stored = Option.getOrUndefined(current);
      if (stored === undefined || stored.index !== index) return current;
      if (sameFieldMessages(stored.fieldErrors, next)) return current;
      return Arr.isReadonlyArrayEmpty(next)
        ? Option.none()
        : Option.some({ ...stored, fieldErrors: next });
    });
  }, [failure, index, revalidate, value]);

  const next = useCallback((): void => {
    if (pending || isLast) return;

    const messages = Effect.runSync(validateFields(step.schema)(value));
    if (Arr.isReadonlyArrayNonEmpty(messages)) {
      setFailure(
        Option.some({ index, schema: step.schema, fieldErrors: messages }),
      );
      return;
    }

    setFailure(Option.none());
    setIndex(index + 1);
  }, [index, isLast, pending, setIndex, step.schema, value]);

  const back = useCallback((): void => {
    if (pending || isFirst) return;
    setFailure(Option.none());
    setIndex(index - 1);
  }, [index, isFirst, pending, setIndex]);

  const submit = useCallback((): void => {
    // A stray early call must not report fields the user has not reached.
    if (pending || !isLast) return;

    const decoded = Schema.decodeUnknownResult(schema)(value);
    if (Result.isFailure(decoded)) {
      setFailure(
        Option.some({
          index,
          schema,
          fieldErrors: Effect.runSync(validateFields(schema)(value)),
        }),
      );
      return;
    }

    setFailure(Option.none());
    onSubmit(decoded.success);
  }, [index, isLast, onSubmit, pending, schema, value]);

  return (
    <div
      {...(label === undefined ? {} : { role: "form", "aria-label": label })}
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        },
        style,
      )}
    >
      <Stepper value={index + 1}>
        {Arr.map(steps, (item, position) => (
          <StepperStep
            key={item.id}
            value={position + 1}
            label={item.label}
            description={item.description}
          />
        ))}
      </Stepper>
      <ErrorSummary messages={errors} />
      {children({
        index,
        step,
        isFirst,
        isLast,
        errors,
        fieldErrors,
        pending,
        errorFor: (path) =>
          Option.getOrUndefined(fieldMessageAt(fieldErrors, path)),
        next,
        back,
        submit,
      })}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const multiStepFormMeta = {
  name: "Multi-step forms",
  tier: 5,
  status: "done",
  gpuixSupport: "partial",
  focusable: true,
  limitations: [
    "owned-value and render-prop: the caller passes the draft, renders the current step's fields and receives the decoded value only on the last step's submit",
    "each step's validator is a projection schema over the whole draft, so the step schema and the full schema declare the same keys twice",
    "a failed final submit reports every message by path, including fields on earlier steps; the summary names them, but the caller must move back to paint them inline",
    "no step click: Stepper is display-only in this runtime, so next and back are the only moves",
    "revalidate compares the owned draft by identity, after a failed action only",
  ],
  docs: "docs/multi-step-form.mdx",
  example: "examples/multi-step-form.example.tsx",
  testFile: "src/behaviour/multi-step-form.test.tsx",
} as const;

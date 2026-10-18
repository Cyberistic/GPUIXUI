/**
 * Form: schema validation and the submit lifecycle around a group of fields.
 *
 * The runtime has no form element and no DOM to read values from, so the form is
 * **owned-value**: the caller passes the value it already holds and receives the
 * decoded value only when the schema accepts it. A failed submit reports every
 * message both as a summary and as a message located at its field path, so
 * `Field` can paint the one that belongs to it. This component decides when
 * validation runs; the caller still owns the value.
 *
 * The submit handler is the runtime boundary: `validation/logic.ts` and the
 * decoder are pure, non-failing effects with no requirements, so they run with
 * `Effect.runSync` there. Errors persist until the next submit because an inline
 * object identity cannot tell an edit from a re-render.
 *
 * `Form` has no compound parts (`docs/component-api.md` §8), so its children are
 * a render prop: that is how the consumer reaches `submit` without a part the
 * contract does not allow.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { useCallback, useState, type ReactNode } from "react";
import { ErrorSummary } from "./internal/error-summary.js";
import { useTheme } from "./internal/theme.js";
import {
  fieldMessageAt,
  validateFields,
  type FieldMessage,
} from "./validation/logic.js";

/** What the render prop receives. */
export interface FormState {
  /** Every message from the last failed submit, in schema order. */
  readonly errors: ReadonlyArray<string>;
  /** The same failures, each with the schema path that produced it. */
  readonly fieldErrors: ReadonlyArray<FieldMessage>;
  /** Mirrors the `pending` prop; a pending form ignores `submit`. */
  readonly pending: boolean;
  /** Validate `value` and call `onSubmit` only when it decodes. */
  readonly submit: () => void;
  /**
   * The message for a field path, or `undefined`. A single key is a top-level
   * field; pass an array for a nested path.
   */
  readonly errorFor: (
    path: PropertyKey | ReadonlyArray<PropertyKey>,
  ) => string | undefined;
}

/** {@link Form} props. */
export interface FormProps<T> extends Omit<Props, "children" | "onSubmit"> {
  /** The schema that decides whether the value may be submitted. */
  readonly schema: Schema.ConstraintDecoder<T>;
  /** The value the caller owns; never read from the runtime. */
  readonly value: unknown;
  /** Receives the decoded value, never the raw one. */
  readonly onSubmit: (value: T) => void;
  /** The caller's async state; a pending form refuses to submit again. */
  readonly pending?: boolean;
  /** The form's accessible name. Without it the root is a plain container. */
  readonly label?: string;
  readonly children: (state: FormState) => ReactNode;
}

/**
 * A form boundary: run the schema, show the messages, submit the decoded value.
 */
export const Form = <T,>({
  schema,
  value,
  onSubmit,
  pending = false,
  label,
  children,
  style,
  ...rest
}: FormProps<T>) => {
  const theme = useTheme();
  const [fieldErrors, setFieldErrors] = useState<ReadonlyArray<FieldMessage>>(
    [],
  );
  const errors = Arr.dedupe(Arr.map(fieldErrors, (field) => field.message));

  const submit = useCallback((): void => {
    if (pending) return;

    const decoded = Schema.decodeUnknownResult(schema)(value);
    if (Result.isFailure(decoded)) {
      setFieldErrors(Effect.runSync(validateFields(schema)(value)));
      return;
    }

    setFieldErrors([]);
    onSubmit(decoded.success);
  }, [onSubmit, pending, schema, value]);

  const errorFor = useCallback(
    (path: PropertyKey | ReadonlyArray<PropertyKey>): string | undefined =>
      Option.getOrUndefined(fieldMessageAt(fieldErrors, path)),
    [fieldErrors],
  );

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
      <ErrorSummary messages={errors} />
      {children({ errors, fieldErrors, errorFor, pending, submit })}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const formMeta = {
  name: "Form",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "owned-value: the caller passes the value and receives the decoded one; there is no runtime form element",
    "a render-prop child is the only way to reach submit, because the contract fixes Form as one part",
    "messages carry the schema's key path, not a display label; the caller still chooses when to validate and how each field renders it",
    "no automatic re-validation on edit: errors persist until the next submit",
  ],
  docs: "docs/form.mdx",
  example: "examples/form.example.tsx",
  testFile: "src/behaviour/form.test.tsx",
} as const;

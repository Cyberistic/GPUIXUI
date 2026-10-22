/**
 * Form: schema validation and the submit lifecycle around a group of fields.
 *
 * The state is `@tanstack/form-core`: one `FormApi` owns the values, the field
 * meta (touched/dirty/errors) and the submit lifecycle. Validation stays
 * Effect/Schema — `schemaValidator` adapts `Schema.decodeUnknownEffect` into the
 * core's validator shape and returns the messages mapped to the fields their
 * paths name, while the summary is the same schema's messages derived from the
 * live `value`. The caller still owns the value and receives the decoded one:
 * `submit` pushes the current `value` into the core, then `handleSubmit` runs the
 * schema and calls `onSubmit` only when it decodes.
 *
 * `Form` has no compound parts (`docs/component-api.md` §8), so its children are
 * a render prop: that is how the consumer reaches `submit` — and now the
 * `FormApi` for field registration — without a part the contract does not allow.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn, FORM_ERROR, FORM_ERRORS, FORM_ROOT } from "@gpuixui/tw";
import { FormApi } from "@tanstack/form-core";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Schema from "effect/Schema";
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  decode,
  schemaValidator,
  type SchemaValidator,
} from "./form/validator.js";
import { recipeStyle } from "./internal/recipe.js";
import { statusTone, useTheme } from "./internal/theme.js";
import { validateAll } from "./validation/logic.js";

/** The form-core instance `Form` drives: unknown values, one schema validator. */
export type SchemaFormApi = FormApi<
  unknown,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  SchemaValidator,
  undefined,
  undefined,
  undefined,
  undefined
>;

/** What the render prop receives. */
export interface FormState {
  /** Every message from the last failed submit, in schema order. */
  readonly errors: ReadonlyArray<string>;
  /** Mirrors the `pending` prop; a pending form ignores `submit`. */
  readonly pending: boolean;
  /** Push the current value into the core, validate and submit when it decodes. */
  readonly submit: () => void;
  /** The form-core instance: values, field meta, reset and field registration. */
  readonly form: SchemaFormApi;
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children: (state: FormState) => ReactNode;
}

/** Push the caller's live `value` into the core without touching fields. */
const syncValues = (form: SchemaFormApi, value: unknown): void => {
  if (!P.isObject(value) || Array.isArray(value)) return;
  Arr.forEach(Object.entries(value), ([key, next]) =>
    form.setFieldValue(key, () => next, {
      dontUpdateMeta: true,
      dontValidate: true,
    }),
  );
};

/**
 * A form boundary: run the schema, show the messages, submit the decoded value.
 */
export const Form = <T,>({
  schema,
  value,
  onSubmit,
  pending = false,
  label,
  className,
  children,
  style,
  ...rest
}: FormProps<T>) => {
  const theme = useTheme();
  // The core owns the state; the schema and the consumer callback are read when
  // the form mounts (the core's `defaultValues` have the same lifetime).
  const [form] = useState<SchemaFormApi>(
    () =>
      new FormApi({
        defaultValues: value,
        validators: { onSubmit: schemaValidator(schema) },
        onSubmit: ({ value: rawValue }) =>
          Option.match(decode(schema)(rawValue), {
            onNone: () => undefined,
            onSome: onSubmit,
          }),
      }),
  );
  // A submit's result arrives asynchronously; subscribe so the summary follows.
  const state = useSyncExternalStore(
    useCallback(
      (onChange: () => void) => form.store.subscribe(onChange).unsubscribe,
      [form],
    ),
    () => form.state,
  );

  const submit = useCallback((): void => {
    if (pending) return;
    syncValues(form, value);
    void form.handleSubmit();
  }, [form, pending, value]);

  // A form that has never been submitted nags nobody; after one, the messages
  // are derived from the caller's live value, so an edit re-derives them.
  const errors =
    state.submissionAttempts > 0
      ? Effect.runSync(validateAll(schema)(value))
      : [];

  return (
    <div
      {...(label === undefined ? {} : { role: "form", "aria-label": label })}
      {...rest}
      style={mergeStyles(recipeStyle(cn(FORM_ROOT, className), theme), style)}
    >
      {Arr.match(errors, {
        onEmpty: () => null,
        onNonEmpty: (messages) => (
          <div role="alert" style={recipeStyle(FORM_ERRORS, theme)}>
            {Arr.map(messages, (message) => (
              <text
                key={message}
                style={{
                  ...recipeStyle(FORM_ERROR, theme),
                  color: statusTone(theme, "destructive").foreground,
                }}
              >
                {message}
              </text>
            ))}
          </div>
        ),
      })}
      {children({ errors, pending, submit, form })}
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
    "the schema and the submit handler are read when the form mounts, matching the core's defaultValues lifetime",
  ],
  docs: "docs/form.mdx",
  example: "examples/form.example.tsx",
  testFile: "src/behaviour/form.test.tsx",
} as const;

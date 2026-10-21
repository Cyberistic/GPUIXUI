/**
 * Form: schema validation and the submit lifecycle around a group of fields.
 *
 * The runtime has no form element and no DOM to read values from, so the form is
 * **owned-value**: the caller passes the value it already holds and receives the
 * decoded value only when the schema accepts it. `Field` still paints one
 * message; this component decides when validation runs and what a failed submit
 * shows.
 *
 * The submit handler is the runtime boundary: `validation/logic.ts` and the
 * decoder are pure, non-failing effects with no requirements, so they run with
 * `Effect.runSync` there. A failed submit turns messages on, and they are then
 * derived from the caller's live value — fixing a field clears (or replaces) its
 * message without a second submit, while a form that has never been submitted
 * never nags. The flag is the state; the messages are not, so an edit cannot
 * leave a stale list behind.
 *
 * `Form` has no compound parts (`docs/component-api.md` §8), so its children are
 * a render prop: that is how the consumer reaches `submit` without a part the
 * contract does not allow.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn, FORM_ERROR, FORM_ERRORS, FORM_ROOT } from "@gpuixui/tw";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { useCallback, useState, type ReactNode } from "react";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";
import { validateAll } from "./validation/logic.js";

/** What the render prop receives. */
export interface FormState {
  /** Every message from the last failed submit, in schema order. */
  readonly errors: ReadonlyArray<string>;
  /** Mirrors the `pending` prop; a pending form ignores `submit`. */
  readonly pending: boolean;
  /** Validate `value` and call `onSubmit` only when it decodes. */
  readonly submit: () => void;
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
  // The one piece of state: whether a submit has failed. The messages themselves
  // are derived from the caller's current value, so an edit cannot leave a
  // stale list on screen.
  const [showErrors, setShowErrors] = useState(false);
  // `validateAll` is a non-failing `Effect.succeed`; running it here reads a
  // value at the render boundary rather than starting anything.
  const errors = showErrors ? Effect.runSync(validateAll(schema)(value)) : [];

  const submit = useCallback((): void => {
    if (pending) return;

    const decoded = Schema.decodeUnknownResult(schema)(value);
    if (Result.isFailure(decoded)) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);
    onSubmit(decoded.success);
  }, [onSubmit, pending, schema, value]);

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
              <text key={message} style={recipeStyle(FORM_ERROR, theme)}>
                {message}
              </text>
            ))}
          </div>
        ),
      })}
      {children({ errors, pending, submit })}
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
    "messages are derived from the live value after a failed submit; there is no field-to-message mapping, because validateAll returns messages, not paths",
  ],
  docs: "docs/form.mdx",
  example: "examples/form.example.tsx",
  testFile: "src/behaviour/form.test.tsx",
} as const;

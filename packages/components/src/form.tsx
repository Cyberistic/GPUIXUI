/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn, FORM_ERROR, FORM_ERRORS, FORM_ROOT } from "@gpuixui/tw";
import { FormApi } from "@tanstack/form-core";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
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

export interface FormState {
  readonly errors: ReadonlyArray<string>;

  readonly pending: boolean;

  readonly submit: () => void;

  readonly form: SchemaFormApi;
}

export interface FormProps<T> extends Omit<Props, "children" | "onSubmit"> {
  readonly schema: Schema.ConstraintDecoder<T>;

  readonly value: unknown;

  readonly onSubmit: (value: T) => void;

  readonly pending?: boolean;

  readonly label?: string;

  readonly className?: string;
  readonly children: (state: FormState) => ReactNode;
}

const syncValues = (form: SchemaFormApi, value: unknown): void => {
  if (!P.isObject(value) || Array.isArray(value)) return;
  Arr.forEach(Object.entries(value), ([key, next]) =>
    form.setFieldValue(key, () => next, {
      dontUpdateMeta: true,
      dontValidate: true,
    }),
  );
};

const clearSubmitErrors = (form: SchemaFormApi): void => {
  Arr.forEach(R.keys(form.state.fieldMeta), (name) => {
    if (form.state.fieldMeta[name]?.errorSourceMap?.onSubmit !== "form") return;
    form.setFieldMeta(name, (meta) => ({
      ...meta,
      errorMap: { ...meta.errorMap, onSubmit: undefined },
      errorSourceMap: { ...meta.errorSourceMap, onSubmit: undefined },
    }));
  });
};

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
    clearSubmitErrors(form);
    void form.handleSubmit();
  }, [form, pending, value]);

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

/**
 * Field: the label, control and message block around one input.
 *
 * The components do not own the value and do not validate on every keystroke —
 * `validation/logic.ts` turns a schema into a message, and the caller decides
 * when to run it. A field only paints what the caller tells it.
 *
 * Measured limitation: `@gpuix/native@0.10.0` has no `aria-describedby`, so the
 * message is passed to the control as `aria-description` (a description, not an
 * id reference). The input itself is the `@gpuixui/primitives` stand-in.
 */

import type { InputProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { createContext, useContext, useState } from "react";
import { useFieldsetDisabled } from "./fieldset.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";

/** What a {@link FieldInput} inherits from the field around it. */
interface FieldContextValue {
  readonly label: string;
  readonly description: string | undefined;
  readonly error: string | undefined;
  readonly required: boolean;
}

const FieldContext = createContext<FieldContextValue | undefined>(undefined);

/** {@link Field} props. */
export interface FieldProps extends Props {
  /** The visible label and the input's accessible name. */
  readonly label: string;
  /** Supporting copy under the control; hidden while `error` is present. */
  readonly description?: string;
  /** The message to show; also paints the control as invalid. */
  readonly error?: string;
  readonly required?: boolean;
  readonly children?: PartChildren;
}

/** One labelled field. Compose a {@link FieldInput} or any other control. */
export const Field = ({
  label,
  description,
  error,
  required = false,
  children,
  style,
  ...rest
}: FieldProps) => {
  const theme = useTheme();
  const context: FieldContextValue = { label, description, error, required };
  assertParts(fieldRoot, children);

  return (
    <FieldContext.Provider value={context}>
      <div
        {...rest}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          },
          style,
        )}
      >
        <FieldLabel required={required}>{label}</FieldLabel>
        {children}
        {error === undefined ? (
          description === undefined ? null : (
            <FieldDescription>{description}</FieldDescription>
          )
        ) : (
          <FieldError>{error}</FieldError>
        )}
      </div>
    </FieldContext.Provider>
  );
};

/** {@link FieldLabel} props. */
export interface FieldLabelProps extends Props {
  /** Appends a destructive `*`; the accessible name stays clean. */
  readonly required?: boolean;
}

/** The field's label row. */
export const FieldLabel = ({
  required = false,
  children,
  style,
  ...rest
}: FieldLabelProps) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: theme.spacing["2xs"],
      }}
    >
      <text
        {...rest}
        style={mergeStyles(
          { ...textStyle(theme, "label"), color: theme.colors.foreground },
          style,
        )}
      >
        {children}
      </text>
      {required ? (
        <text
          aria-label="Required"
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.destructive,
          }}
        >
          *
        </text>
      ) : null}
    </div>
  );
};

/** Supporting copy under the control. */
export const FieldDescription = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "caption"), color: theme.colors.mutedForeground },
        style,
      )}
    />
  );
};

/** The message slot used when the field is invalid. Announced as an alert. */
export const FieldError = ({ style, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <text
      role="alert"
      {...rest}
      style={mergeStyles(
        { ...textStyle(theme, "caption"), color: theme.colors.destructive },
        style,
      )}
    />
  );
};

/** {@link FieldInput} props: an input that knows whether its field is invalid. */
export interface FieldInputProps extends Omit<InputProps, "style"> {
  /** Overrides the field's own error as the validity signal. */
  readonly invalid?: boolean;
  /**
   * Leaves the tab order and ignores edits; 0.10.0 has no `aria-disabled`.
   * Inferred from a disabled `Fieldset` as well as set directly.
   */
  readonly disabled?: boolean;
  /** A style, or a function of the input's state. */
  readonly style?: StateStyle<FieldInputState>;
}

/** What the control draws: input state plus the field's validity. */
export interface FieldInputState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

/**
 * A single-line input wired to its field: it takes the label as its accessible
 * name, the message as its description, and the destructive border when invalid.
 */
export const FieldInput = ({
  invalid,
  disabled = false,
  autoFocus = false,
  onFocus,
  onBlur,
  style,
  ...rest
}: FieldInputProps) => {
  const theme = useTheme();
  const field = useContext(FieldContext);
  const fieldsetDisabled = useFieldsetDisabled();
  const isInvalid = invalid ?? field?.error !== undefined;
  const isDisabled = disabled || fieldsetDisabled;
  const [focused, setFocused] = useState(autoFocus && !isDisabled);
  const state: FieldInputState = {
    disabled: isDisabled,
    focused,
    invalid: isInvalid,
  };

  const message = field?.error ?? field?.description;
  const description = Option.match(Option.fromNullishOr(message), {
    onNone: () => (field?.required === true ? "Required" : undefined),
    onSome: (text) => (field?.required === true ? `${text}. Required` : text),
  });

  return (
    <input
      {...rest}
      autoFocus={autoFocus && !isDisabled}
      {...(isDisabled ? { readOnly: true, tabIndex: -1 } : {})}
      {...(field === undefined ? {} : { "aria-label": field.label })}
      {...(description === undefined
        ? {}
        : { "aria-description": description })}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        {
          ...textStyle(theme, "body"),
          width: "100%",
          height: controlHeight(theme, "md"),
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          backgroundColor: isDisabled
            ? theme.colors.disabled
            : theme.colors.input,
          color: isDisabled
            ? theme.colors.disabledForeground
            : theme.colors.inputForeground,
          borderWidth: theme.borderWidth.thin,
          borderColor:
            isInvalid && !isDisabled
              ? theme.colors.destructive
              : theme.colors.border,
          borderRadius: theme.radius.md,
          ...(isDisabled ? { cursor: "not-allowed" } : {}),
          ...(focused && !isInvalid && !isDisabled ? focusRing(theme) : {}),
        },
        resolveStyle(style, state),
      )}
    />
  );
};

/** Every part of Field, so a misplaced sibling is named. */
const fieldParts: ReadonlyArray<PartComponent> = [
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldInput,
];

const fieldRoot: PartsContract = {
  parent: "Field",
  family: fieldParts,
  accepts: [FieldInput],
  hint: "Field renders its label and message itself; put only the control inside it.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const fieldMeta = {
  name: "Inline validation",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-describedby in 0.10.0: the message is an aria-description, not an id reference",
    "the control is the GPUix <input> host element: primitives' Input reads a second theme context, so adoption waits on one provider",
    "not a form library: the caller owns the value and when validation runs",
  ],
  docs: "docs/field.mdx",
  example: "examples/field.example.tsx",
  testFile: "src/behaviour/field.test.tsx",
} as const;

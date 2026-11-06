/** @jsxImportSource @gpuix/react */
import type { InputProps, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  FIELD_DESCRIPTION,
  FIELD_ERROR,
  FIELD_INPUT,
  FIELD_LABEL,
  FIELD_LABEL_ROW,
  FIELD_REQUIRED,
  FIELD_ROOT,
} from "@gpuixui/tw";
import * as Option from "effect/Option";
import { createContext, useContext, useState } from "react";
import { useFieldsetDisabled } from "./fieldset.js";
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  keepContent,
  keyboardRing,
  nativeTextTheme,
  selectionWash,
  statusTone,
  useTheme,
} from "./internal/theme.js";

interface FieldContextValue {
  readonly label: string;
  readonly description: string | undefined;
  readonly error: string | undefined;
  readonly required: boolean;
}

const FieldContext = createContext<FieldContextValue | undefined>(undefined);

export interface FieldProps extends Props {
  readonly label: string;

  readonly description?: string;

  readonly error?: string;
  readonly required?: boolean;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const Field = ({
  label,
  description,
  error,
  required = false,
  className,
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
          recipeStyle(cn(FIELD_ROOT, className), theme),
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

export interface FieldLabelProps extends Props {
  readonly required?: boolean;

  readonly className?: string;
}

export const FieldLabel = ({
  required = false,
  className,
  children,
  style,
  ...rest
}: FieldLabelProps) => {
  const theme = useTheme();
  return (
    <div style={recipeStyle(FIELD_LABEL_ROW, theme)}>
      <text
        {...rest}
        style={mergeStyles(
          recipeStyle(cn(FIELD_LABEL, className), theme),
          style,
        )}
      >
        {children}
      </text>
      {required ? (
        <text
          aria-label="Required"
          style={{
            ...recipeStyle(FIELD_REQUIRED, theme),
            color: statusTone(theme, "destructive").foreground,
          }}
        >
          *
        </text>
      ) : null}
    </div>
  );
};

export interface FieldDescriptionProps extends Props {
  readonly className?: string;
}

export const FieldDescription = ({
  className,
  style,
  ...rest
}: FieldDescriptionProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(FIELD_DESCRIPTION, className), theme),
        style,
      )}
    />
  );
};

export interface FieldErrorProps extends Props {
  readonly className?: string;
}

export const FieldError = ({ className, style, ...rest }: FieldErrorProps) => {
  const theme = useTheme();
  return (
    <text
      role="alert"
      {...rest}
      style={mergeStyles(
        {
          ...recipeStyle(cn(FIELD_ERROR, className), theme),
          color: statusTone(theme, "destructive").foreground,
        },
        style,
      )}
    />
  );
};

export interface FieldInputProps extends Omit<InputProps, "style"> {
  readonly invalid?: boolean;

  readonly disabled?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<FieldInputState>;
}

export interface FieldInputState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export const FieldInput = ({
  invalid,
  disabled = false,
  className,
  onFocus,
  onBlur,
  style,
  placeholder,
  value,
  onChange,
  ...rest
}: FieldInputProps) => {
  const theme = useTheme();
  const field = useContext(FieldContext);
  const fieldsetDisabled = useFieldsetDisabled();
  const [focused, setFocused] = useState(false);

  const [draft, setDraft] = useState("");
  const text = value ?? draft;
  const isInvalid = invalid ?? field?.error !== undefined;
  const isDisabled = disabled || fieldsetDisabled;
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

  const help = fieldHelp(
    { description: description ?? rest["aria-description"], placeholder },
    text,
  );

  const hostStyle = mergeStyles(
    mergeStyles(recipeStyle(cn(FIELD_INPUT, className), theme), {
      height: controlHeight(theme, "md"),
      backgroundColor: isDisabled ? theme.colors.disabled : theme.colors.input,
      color: isDisabled
        ? theme.colors.disabledForeground
        : theme.colors.inputForeground,
      borderColor:
        isInvalid && !isDisabled
          ? theme.colors.destructive
          : theme.colors.border,
      ...(isDisabled ? { cursor: "not-allowed" } : {}),
      ...(isDisabled ? {} : keyboardRing(theme, isInvalid)),
      ...selectionWash(theme),
      ...keepContent,
    }),
    resolveStyle(style, state),
  );
  const hint = fieldHint({ placeholder, disabled: isDisabled }, theme, text, {
    origin: "host",
    align: "center",
    style: hostStyle,
  });

  return (
    <div style={hintHost()}>
      <input
        {...rest}
        theme={nativeTextTheme(theme, "input")}
        value={value}
        {...(isDisabled ? { readOnly: true, tabIndex: -1 } : {})}
        {...(field === undefined ? {} : { "aria-label": field.label })}
        {...(help === undefined ? {} : { "aria-description": help })}
        onChange={(event) => {
          if (value === undefined) setDraft(event.value ?? "");
          onChange?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={hostStyle}
      />
      {Option.match(hint, {
        onNone: () => null,
        onSome: (painted) => renderFieldHint(painted, rest.testId),
      })}
    </div>
  );
};

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

export const fieldMeta = {
  name: "Inline validation",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-describedby in 0.11.0: the message is an aria-description, not an id reference",
    "the control is a GPUix <input> painted by this package's fixed field recipe; @gpuixui/primitives' Input paints its own density-scaled chrome (ADR 0006), so it is not adopted here",
    "not a form library: the caller owns the value and when validation runs",
  ],
  docs: "docs/field.mdx",
  example: "examples/field.example.tsx",
  testFile: "src/behaviour/field.test.tsx",
} as const;

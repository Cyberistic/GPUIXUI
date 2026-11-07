/** @jsxImportSource @gpuix/react */
import type { EventPayload, StyleDesc, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles, resolveStyle } from "@gpuix/react/floating";
import { Input, type InputProps } from "@gpuixui/primitives/input";
import { TextArea, type TextAreaProps } from "@gpuixui/primitives/textarea";
import {
  INPUT_GROUP,
  INPUT_GROUP_ADDONS,
  INPUT_GROUP_FOCUS,
  INPUT_GROUP_INVALID,
  INPUT_GROUP_ROW,
  INPUT_GROUP_TEXT,
  cn,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FieldDescription, FieldError, FieldLabel } from "./field.js";
import { Button, type ButtonProps } from "./internal/button.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import { keepContent, selectionWash, useTheme } from "./internal/theme.js";

export type InputGroupAlign = keyof typeof INPUT_GROUP_ADDONS;

interface InputGroupContextValue {
  readonly label: string | undefined;
  readonly help: string | undefined;
  readonly field: React.RefObject<PublicInstance | null>;
  readonly setFocused: (focused: boolean) => void;
}

const InputGroupContext = createContext<InputGroupContextValue | undefined>(
  undefined,
);

const useInputGroup = (): InputGroupContextValue | undefined =>
  useContext(InputGroupContext);

export interface InputGroupProps {
  readonly label?: string;

  readonly description?: string;

  readonly error?: string;

  readonly invalid?: boolean;

  readonly className?: string;

  readonly style?: StyleDesc;
  readonly testId?: string;
  readonly children?: PartChildren;
}

export const InputGroup = ({
  label,
  description,
  error,
  invalid = false,
  className,
  style,
  testId,
  children,
}: InputGroupProps) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const field = useRef<PublicInstance | null>(null);
  const isInvalid = invalid || error !== undefined;
  assertParts(inputGroupRoot, children);

  const context = useMemo<InputGroupContextValue>(
    () => ({
      label,
      help: error ?? description,
      field,
      setFocused,
    }),
    [description, error, label],
  );

  const ring = mergeStyles(
    isInvalid ? recipeStyle(INPUT_GROUP_INVALID, theme) : undefined,
    focused ? recipeStyle(INPUT_GROUP_FOCUS, theme) : undefined,
  );
  const leaves = Children.toArray(children);
  const pane = (slot: GroupPane): ReadonlyArray<ReactNode> =>
    Arr.filter(leaves, (child) => paneOf(child) === slot);

  return (
    <InputGroupContext.Provider value={context}>
      <div style={recipeStyle("flex flex-col gap-1 w-full", theme)}>
        {label === undefined ? null : <FieldLabel>{label}</FieldLabel>}
        <div
          testId={testId}
          role="group"
          aria-label={label}
          style={mergeStyles(
            mergeStyles(recipeStyle(cn(INPUT_GROUP, className), theme), ring),
            style,
          )}
        >
          {pane("top")}
          <div style={recipeStyle(INPUT_GROUP_ROW, theme)}>
            {pane("leading")}
            {pane("field")}
            {pane("trailing")}
          </div>
          {pane("bottom")}
        </div>
        {error === undefined ? (
          description === undefined ? null : (
            <FieldDescription>{description}</FieldDescription>
          )
        ) : (
          <FieldError>{error}</FieldError>
        )}
      </div>
    </InputGroupContext.Provider>
  );
};

type GroupPane = "top" | "leading" | "field" | "trailing" | "bottom";

const paneOf = (child: ReactNode): GroupPane => {
  if (!isValidElement<{ align?: InputGroupAlign }>(child)) return "field";
  if (child.type === InputGroupInput || child.type === InputGroupTextarea)
    return "field";
  if (child.type !== InputGroupAddon) return "field";
  return child.props.align === "block-start"
    ? "top"
    : child.props.align === "block-end"
      ? "bottom"
      : child.props.align === "inline-end"
        ? "trailing"
        : "leading";
};

export interface InputGroupAddonProps {
  readonly align?: InputGroupAlign;

  readonly className?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
  readonly children?: ReactNode;
}

export const InputGroupAddon = ({
  align = "inline-start",
  className,
  style,
  testId,
  children,
}: InputGroupAddonProps) => {
  const theme = useTheme();
  const group = useInputGroup();
  const renderer = useGpuix().renderer;
  const self = useRef<PublicInstance | null>(null);

  const focusField = (event: EventPayload): void => {
    const target = group?.field.current;
    if (target === null || target === undefined) return;

    if (self.current !== null && event.elementId !== self.current.id) return;
    renderer?.focusElement?.(target.id);
  };

  return (
    <div
      ref={self}
      testId={testId}
      onClick={focusField}
      style={mergeStyles(
        recipeStyle(cn(INPUT_GROUP_ADDONS[align], className), theme),
        style,
      )}
    >
      {children}
    </div>
  );
};

export type InputGroupButtonProps = ButtonProps;

export const InputGroupButton = ({
  variant = "ghost",
  size = "sm",
  ...rest
}: InputGroupButtonProps) => <Button {...rest} variant={variant} size={size} />;

export interface InputGroupTextProps {
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
}

export const InputGroupText = ({
  className,
  style,
  children,
}: InputGroupTextProps) => {
  const theme = useTheme();
  return (
    <text
      style={mergeStyles(
        recipeStyle(cn(INPUT_GROUP_TEXT, className), theme),
        style,
      )}
    >
      {children}
    </text>
  );
};

const bareField: StyleDesc = {
  borderWidth: 0,
  borderRadius: 0,
  backgroundColor: "transparent",
  boxShadow: [],
  focusVisible: { outlineWidth: 0, outlineOffset: 0 },
};

const fieldSlot: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minWidth: 0,
};

export interface InputGroupInputProps extends InputProps {
  readonly className?: string;
}

export const InputGroupInput = ({
  className,
  style,
  onFocus,
  onBlur,
  label,
  ref,
  ...rest
}: InputGroupInputProps) => {
  const theme = useTheme();
  const group = useInputGroup();
  const setField = useMergedRef<PublicInstance | null>(
    group?.field ?? { current: null },
    ref,
  );
  return (
    <div style={fieldSlot}>
      <Input
        {...rest}
        ref={setField}
        label={label ?? group?.label}
        className={cn("bg-transparent", className)}
        onFocus={(event) => {
          group?.setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          group?.setFocused(false);
          onBlur?.(event);
        }}
        style={(state) => ({
          ...bareField,
          ...selectionWash(theme),
          ...keepContent,
          ...resolveStyle(style, state),
        })}
      />
    </div>
  );
};

export interface InputGroupTextareaProps extends TextAreaProps {
  readonly className?: string;
}

export const InputGroupTextarea = ({
  className,
  style,
  onFocus,
  onBlur,
  label,
  ref,
  ...rest
}: InputGroupTextareaProps) => {
  const theme = useTheme();
  const group = useInputGroup();
  const setField = useMergedRef<PublicInstance | null>(
    group?.field ?? { current: null },
    ref,
  );
  return (
    <div style={fieldSlot}>
      <TextArea
        {...rest}
        ref={setField}
        label={label ?? group?.label}
        className={cn("bg-transparent", className)}
        onFocus={(event) => {
          group?.setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          group?.setFocused(false);
          onBlur?.(event);
        }}
        style={(state) => ({
          ...bareField,
          ...selectionWash(theme),
          ...keepContent,
          ...resolveStyle(style, state),
        })}
      />
    </div>
  );
};

const inputGroupParts: ReadonlyArray<PartComponent> = [
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
];

const inputGroupRoot: PartsContract = {
  parent: "InputGroup",
  family: inputGroupParts,
  accepts: [
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupInput,
    InputGroupTextarea,
  ],
  hint: "Put InputGroupInput (or InputGroupTextarea) and its addons directly inside InputGroup.",
};

export const inputGroupMeta = {
  name: "Input group",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  limitations: [
    "the row's ring follows any focus, not keyboard focus: the runtime does not say how focus arrived, and an ancestor box cannot wear the focused field's `focusVisible`",
    "the field's own outline, edge and fill are suppressed, so a group inside a `Field` reads the group's chrome only",
    "the group lays its parts out by alignment itself — 0.11.0 has no `order` — so a part wrapped in a fragment is placed with the field",
  ],
  docs: "docs/input-group.mdx",
  example: "examples/input-group.example.tsx",
  testFile: "src/behaviour/input-group.test.tsx",
} as const;

/** @jsxImportSource @gpuix/react */
/**
 * InputGroup: the field, a mark at either end, and one ring around them.
 *
 * The parts are laid out by the alignment each addon names, not by where it is
 * written: an `inline-start` addon leads the field even when it follows it in
 * the source (shadcn's `order-first`), `inline-end` trails, and the two block
 * alignments take their own line above and below. So the group is one bordered
 * box with one ring, and the field inside paints no chrome of its own.
 *
 * The ring follows the field's focus. `@gpuix/native@0.11.0` reports that focus
 * arrived but not how, so the group paints it on any focus — the keyboard-only
 * distinction the primitives' fields make is not available to an ancestor box
 * (its `focusVisible` state belongs to the focused element).
 *
 * The field and the actions are `@gpuixui/primitives`' `Input`/`TextArea` and
 * this package's `Button`, dressed down by the group's own overrides; the label,
 * description and error are the `Field` parts, so a group reads like the fields
 * beside it.
 */

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

/** Where an addon sits in the group. */
export type InputGroupAlign = keyof typeof INPUT_GROUP_ADDONS;

/** What every part reads from the group around it. */
interface InputGroupContextValue {
  readonly label: string | undefined;
  readonly help: string | undefined;
  readonly field: React.RefObject<PublicInstance | null>;
  readonly setFocused: (focused: boolean) => void;
}

const InputGroupContext = createContext<InputGroupContextValue | undefined>(
  undefined,
);

/** The group a part belongs to, or none when the part stands alone. */
const useInputGroup = (): InputGroupContextValue | undefined =>
  useContext(InputGroupContext);

/** {@link InputGroup} props. */
export interface InputGroupProps {
  /** The visible label, and the accessible name every group field takes. */
  readonly label?: string;
  /** Supporting copy under the row; hidden while `error` is present. */
  readonly description?: string;
  /** The message to show; also paints the row as invalid. */
  readonly error?: string;
  /** Paint the row invalid without a message. */
  readonly invalid?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, merged last. */
  readonly style?: StyleDesc;
  readonly testId?: string;
  readonly children?: PartChildren;
}

/** One bordered row around a field and its addons. */
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

/** The slot an addon's alignment belongs to. */
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

/** {@link InputGroupAddon} props. */
export interface InputGroupAddonProps {
  /** Default `"inline-start"`. */
  readonly align?: InputGroupAlign;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
  readonly children?: ReactNode;
}

/**
 * A mark at one end of the row: an icon, a unit, a shortcut. A press on the
 * addon itself (not on an action inside it) focuses the group's field.
 */
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
    // A press on an action inside the addon belongs to that action.
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

/** {@link InputGroupButton} props: the group's own density. */
export type InputGroupButtonProps = ButtonProps;

/** An action at one end of the row. */
export const InputGroupButton = ({
  variant = "ghost",
  size = "sm",
  ...rest
}: InputGroupButtonProps) => <Button {...rest} variant={variant} size={size} />;

/** {@link InputGroupText} props. */
export interface InputGroupTextProps {
  readonly className?: string;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
}

/** A unit, a prefix or a hint drawn as text. */
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

/** What the group takes away from the field: its own edge, fill and ring. */
const bareField: StyleDesc = {
  borderWidth: 0,
  borderRadius: 0,
  backgroundColor: "transparent",
  boxShadow: [],
  focusVisible: { outlineWidth: 0, outlineOffset: 0 },
};

/** The field fills the line beside the addons and never shrinks to its text. */
const fieldSlot: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minWidth: 0,
};

/** {@link InputGroupInput} props. */
export interface InputGroupInputProps extends InputProps {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The group's single-line field. */
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

/** {@link InputGroupTextarea} props. */
export interface InputGroupTextareaProps extends TextAreaProps {
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** The group's multi-line field. */
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

/** Every part, so a misplaced sibling is named. */
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

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
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

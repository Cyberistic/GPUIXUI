/** @jsxImportSource @gpuix/react */
import type { KeyEvent, InputProps, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  INLINE_EDIT_DISPLAY,
  INLINE_EDIT_DISPLAY_TEXT,
  INLINE_EDIT_INPUT,
} from "@gpuixui/tw";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useControllableState } from "./internal/controllable.js";
import { activationHandlers, isDismiss, isEnter } from "./internal/key.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import {
  controlHeight,
  keepContent,
  controlRing,
  disabledFade,
  nativeTextTheme,
  selectionWash,
  useTheme,
} from "./internal/theme.js";

export interface InlineEditProps extends Omit<InputProps, "value" | "style"> {
  readonly value: string;

  readonly onCommit: (value: string) => void;

  readonly label: string;

  readonly placeholder?: string;
  readonly disabled?: boolean;

  readonly editing?: boolean;
  readonly defaultEditing?: boolean;
  readonly onEditingChange?: (editing: boolean) => void;

  readonly className?: string;

  readonly style?: StateStyle<InlineEditState>;
}

export interface InlineEditState {
  readonly editing: boolean;
  readonly disabled: boolean;
}

export const InlineEdit = ({
  value,
  onCommit,
  label,
  placeholder = "—",
  disabled = false,
  editing: editingProp,
  defaultEditing = false,
  onEditingChange,
  className,
  style,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  onSubmit: onSubmitProp,
  ref,
  ...rest
}: InlineEditProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [editing, setEditing] = useControllableState({
    value: editingProp,
    defaultValue: defaultEditing,
    onChange: onEditingChange,
  });
  const [draft, setDraft] = useState(value);
  const [input, setInput] = useState<PublicInstance | undefined>(undefined);
  const display = useRef<PublicInstance | null>(null);

  const finished = useRef(false);

  const attachInput = useCallback((next: PublicInstance | null) => {
    setInput(next ?? undefined);
  }, []);
  const attachDisplay = useCallback((next: PublicInstance | null) => {
    display.current = next;
  }, []);
  const setDisplay = useMergedRef<PublicInstance | null>(attachDisplay, ref);

  const inputId = input?.id;
  const refocusDisplay = useRef(false);

  useLayoutEffect(() => {
    if (inputId === undefined) return;
    renderer?.focusElement?.(inputId);
  }, [inputId, renderer]);

  useLayoutEffect(() => {
    if (editing || !refocusDisplay.current) return;
    refocusDisplay.current = false;
    const instance = display.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  }, [editing, renderer]);

  const start = (): void => {
    if (disabled || editing) return;
    finished.current = false;
    setDraft(value);
    setEditing(true);
  };

  const finish = (commit: boolean, refocus: boolean): void => {
    if (finished.current) return;
    finished.current = true;
    refocusDisplay.current = refocus;
    setEditing(false);

    if (commit && !disabled && draft !== value) onCommit(draft);
  };

  const cancel = (): void => finish(false, true);

  const commit = (): void => finish(true, true);

  const handleInputKeyDown = (event: KeyEvent): void => {
    onKeyDown?.(event);
    if (isDismiss(event)) {
      cancel();
    } else if (isEnter(event)) {
      commit();
    }
  };

  const state: InlineEditState = { editing, disabled };

  if (!editing) {
    return (
      <div
        role="button"
        aria-label={label}
        tabIndex={disabled ? -1 : 0}
        {...rest}
        ref={setDisplay}
        onClick={start}
        {...activationHandlers(start)}
        onFocus={(event) => onFocus?.(event)}
        onBlur={(event) => onBlur?.(event)}
        style={mergeStyles(
          mergeStyles(recipeStyle(cn(INLINE_EDIT_DISPLAY, className), theme), {
            minHeight: controlHeight(theme, "sm"),
            ...disabledFade(disabled),
            ...controlRing(theme, { disabled }),
            hover: { backgroundColor: theme.colors.accent },
          }),
          resolveStyle(style, state),
        )}
      >
        <text
          style={mergeStyles(recipeStyle(INLINE_EDIT_DISPLAY_TEXT, theme), {
            color:
              value === ""
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
          })}
        >
          {value === "" ? placeholder : value}
        </text>
      </div>
    );
  }

  return (
    <input
      {...rest}
      theme={nativeTextTheme(theme, "background")}
      aria-label={label}
      ref={attachInput}
      value={draft}
      readOnly={disabled}
      tabIndex={disabled ? -1 : 0}
      onChange={(event) => {
        setDraft(event.value ?? "");
        onChange?.(event);
      }}
      onKeyDown={handleInputKeyDown}
      onFocus={(event) => onFocus?.(event)}
      onSubmit={(event) => {
        commit();
        onSubmitProp?.(event);
      }}
      onBlur={(event) => {
        finish(true, false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(INLINE_EDIT_INPUT, className), theme), {
          height: controlHeight(theme, "md"),
          ...controlRing(theme, { disabled }),
          ...selectionWash(theme),
          ...keepContent,
        }),
        resolveStyle(style, state),
      )}
    />
  );
};

export const inlineEditMeta = {
  name: "Inline edit",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no contenteditable in 0.11.0: display and input are swapped explicitly",
    "blur commits; Escape cancels; empty text is a valid committed value",
    "a control disabled mid-edit discards the draft instead of committing it",
    "no aria-invalid or aria-describedby, so a rejected commit is the consumer's feedback",
  ],
  docs: "docs/inline-edit.mdx",
  example: "examples/inline-edit.example.tsx",
  testFile: "src/behaviour/inline-edit.test.tsx",
} as const;

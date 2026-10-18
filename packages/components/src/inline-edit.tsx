/**
 * InlineEdit: rename a value where it is displayed.
 *
 * GPUix has no contenteditable, so the honest implementation swaps a `<text>`
 * display for a real `<input>`. The commit contract is one rule: Enter, `Tab` or
 * a press outside the field commits, Escape cancels, and an unchanged draft
 * calls nothing. Escape claims the key, so an enclosing dialog stays open
 * (plan 514). Blur still commits where the host delivers it, but a live
 * window does not run React's `onBlur` for a native focus change (plan 379), so
 * the outside press and `Tab` are the paths a real user takes.
 *
 * The component owns the draft, never the committed value — like `FieldInput`,
 * the caller owns the data. Focus is moved with the renderer's `focusElement`
 * after the swap, because focus does not follow a replaced element.
 */

import type { EventPayload, InputProps, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { activationHandlers } from "./internal/activate.js";
import { useControllableState } from "./internal/controllable.js";
import { claimEvent } from "./internal/event-claim.js";
import { isDismiss, isEnter, isTab } from "./internal/key.js";
import { useMergedRef } from "./internal/ref.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";

/** {@link InlineEdit} props. */
export interface InlineEditProps extends Omit<InputProps, "value" | "style"> {
  /** The committed text. Required and caller-owned. */
  readonly value: string;
  /** Called with a changed draft when the edit is committed. */
  readonly onCommit: (value: string) => void;
  /** The accessible name of both the display control and the input. */
  readonly label: string;
  /** Shown in the muted role while the value is empty. */
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** The controlled edit state. `undefined` means uncontrolled. */
  readonly editing?: boolean;
  readonly defaultEditing?: boolean;
  readonly onEditingChange?: (editing: boolean) => void;
  /** A style, or a function of the edit state. */
  readonly style?: StateStyle<InlineEditState>;
}

/** What the control draws: whether it is editing, and whether it is disabled. */
export interface InlineEditState {
  readonly editing: boolean;
  readonly disabled: boolean;
}

/** What focus does when an edit finishes. */
type Refocus = "keep" | "display" | "displayIfUnfocused";

/** A value that swaps to an input in place. */
export const InlineEdit = ({
  value,
  onCommit,
  label,
  placeholder = "—",
  disabled = false,
  editing: editingProp,
  defaultEditing = false,
  onEditingChange,
  autoFocus = false,
  style,
  onClick,
  onChange,
  onSubmit,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  onMouseDownOutside,
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
  const [focused, setFocused] = useState(autoFocus && !disabled);
  const [input, setInput] = useState<PublicInstance | undefined>(undefined);
  const display = useRef<PublicInstance | null>(null);
  // Enter can arrive twice (keyDown and submit); one finish per edit.
  const finished = useRef(false);
  // The last input id, so a press that focused nothing can be told apart from a
  // focus id that simply outlived the unmounted input.
  const lastInputId = useRef<number | null>(null);

  const attachInput = useCallback((next: PublicInstance | null) => {
    setInput(next ?? undefined);
    if (next !== null) lastInputId.current = next.id;
  }, []);
  const attachDisplay = useCallback((next: PublicInstance | null) => {
    display.current = next;
  }, []);
  const setDisplay = useMergedRef<PublicInstance | null>(attachDisplay, ref);

  const inputId = input?.id;
  const refocusDisplay = useRef<Refocus>("keep");

  useLayoutEffect(() => {
    if (inputId === undefined) return;
    renderer?.focusElement?.(inputId);
  }, [inputId, renderer]);

  // The display is a new element after the swap, so focus follows the render
  // rather than the state update: its ref exists by the time this runs.
  useLayoutEffect(() => {
    if (editing || refocusDisplay.current === "keep") return;
    const mode = refocusDisplay.current;
    refocusDisplay.current = "keep";
    const instance = display.current;
    if (instance === null) return;
    const focusedId = renderer?.getFocusedElementId?.() ?? lastInputId.current;
    if (mode === "display" || focusedId === lastInputId.current) {
      renderer?.focusElement?.(instance.id);
    }
  }, [editing, renderer]);

  const start = (): void => {
    if (disabled || editing) return;
    finished.current = false;
    setDraft(value);
    setEditing(true);
  };

  const finish = (commit: boolean, refocus: Refocus): void => {
    if (finished.current) return;
    finished.current = true;
    refocusDisplay.current = refocus;
    setEditing(false);
    if (commit && draft !== value) onCommit(draft);
  };

  const cancel = (): void => finish(false, "display");

  const commit = (): void => finish(true, "display");

  const handleInputKeyDown = (event: EventPayload): void => {
    onKeyDown?.(event);
    if (isDismiss(event)) {
      cancel();
      claimEvent(event);
    } else if (isEnter(event)) {
      commit();
    } else if (isTab(event)) {
      // Tab leaves the field: keep the draft, let focus move on.
      finish(true, "keep");
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
        autoFocus={autoFocus && !disabled}
        onClick={(event) => {
          onClick?.(event);
          start();
        }}
        {...activationHandlers(start, { disabled, onKeyDown, onKeyUp })}
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
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            minHeight: controlHeight(theme, "sm"),
            paddingLeft: theme.spacing.xs,
            paddingRight: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            opacity: disabled ? 0.5 : 1,
            ...(focused ? focusRing(theme) : {}),
            hover: disabled
              ? undefined
              : { backgroundColor: theme.colors.accent },
          },
          resolveStyle(style, state),
        )}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color:
              value === ""
                ? theme.colors.mutedForeground
                : theme.colors.foreground,
          }}
        >
          {value === "" ? placeholder : value}
        </text>
      </div>
    );
  }

  // 0.10.0 never delivers `onMouseDownOutside` to the input itself, so the
  // wrapper owns the press that ends the edit (measured, plan 379 §1).
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignSelf: "flex-start",
      }}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        finish(true, "displayIfUnfocused");
      }}
    >
      <input
        {...rest}
        aria-label={label}
        ref={attachInput}
        value={draft}
        readOnly={disabled}
        onChange={(event) => {
          onChange?.(event);
          setDraft(event.value ?? "");
        }}
        onKeyDown={handleInputKeyDown}
        onKeyUp={onKeyUp}
        onSubmit={(event) => {
          onSubmit?.(event);
          commit();
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          finish(true, "keep");
        }}
        style={mergeStyles(
          {
            ...textStyle(theme, "body"),
            height: controlHeight(theme, "md"),
            paddingLeft: theme.spacing.sm,
            paddingRight: theme.spacing.sm,
            backgroundColor: theme.colors.background,
            color: theme.colors.inputForeground,
            borderRadius: theme.radius.sm,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            ...focusRing(theme),
          },
          resolveStyle(style, state),
        )}
      />
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const inlineEditMeta = {
  name: "Inline edit",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no contenteditable in 0.10.0: display and input are swapped explicitly",
    "Enter, Tab or a press outside commits; Escape cancels; a native blur that React does not deliver is covered by the outside-press path (measured live, plan 347 §8.2)",
    "no aria-invalid or aria-describedby, so a rejected commit is the consumer's feedback",
  ],
  docs: "docs/inline-edit.mdx",
  example: "examples/inline-edit.example.tsx",
  testFile: "src/behaviour/inline-edit.test.tsx",
} as const;

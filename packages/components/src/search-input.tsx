/**
 * SearchInput: a single-line search field with a clear affordance.
 *
 * The field owns the text in uncontrolled mode and reports every edit; Enter
 * submits and Escape clears. `Enter` reaches the component as the input's
 * `submit` event — measured in 0.10.0 — while Escape arrives as `keyDown`. A
 * clear claims that key, so an enclosing dialog stays open; an empty field
 * leaves Escape to the dialog (plan 514).
 *
 * There is no debounce: the component reports keystrokes as they happen, and a
 * consumer that queries on each one debounces its own effect.
 *
 * The focus ring follows the natively focused host — the input, the clear
 * control, or neither. The binding delivers no React `focus`/`blur` for that
 * move (plans 536/540), so the field samples `getFocusedElementId()` while
 * there is text to clear (plan 659).
 */

import type { EventPayload, InputProps, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { activationHandlers } from "./internal/activate.js";
import { useControllableState } from "./internal/controllable.js";
import { claimEvent } from "./internal/event-claim.js";
import { isDismiss } from "./internal/key.js";
import { useMergedRef } from "./internal/ref.js";
import { stateDescription } from "./internal/state-description.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";

/** {@link SearchInput} props. */
export interface SearchInputProps extends Omit<
  InputProps,
  "onSubmit" | "style"
> {
  /** The controlled text. `undefined` means uncontrolled. */
  readonly value?: string;
  readonly defaultValue?: string;
  /** Every edit, including the clear and Escape paths. */
  readonly onValueChange?: (value: string) => void;
  /** Enter, with the current text. */
  readonly onSubmit?: (value: string) => void;
  /** The clear control and Escape, when the field was not already empty. */
  readonly onClear?: () => void;
  /** Default `"Search…"`. */
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** A style, or a function of the field's state. */
  readonly style?: StateStyle<SearchInputState>;
}

/** What the field draws: its input state. */
export interface SearchInputState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

/** How often the field asks the renderer which host holds focus, ms. */
const FOCUS_SAMPLE_MS = 50;

/** A search field with a leading search icon and a conditional clear control. */
export const SearchInput = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onClear,
  placeholder = "Search…",
  disabled = false,
  autoFocus = false,
  style,
  onChange,
  onKeyDown,
  ref,
  ...rest
}: SearchInputProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const [focused, setFocused] = useState(autoFocus && !disabled);
  const [clearFocused, setClearFocused] = useState(false);
  const input = useRef<PublicInstance | null>(null);
  const clearControl = useRef<PublicInstance | null>(null);
  const attach = useCallback((next: PublicInstance | null) => {
    input.current = next;
  }, []);
  const setInput = useMergedRef<PublicInstance | null>(attach, ref);

  const hasText = value !== "" && !disabled;

  useEffect(() => {
    if (!hasText || disabled || renderer == null) {
      setClearFocused(false);
      return;
    }
    const read = (): void => {
      const focusedId = renderer.getFocusedElementId?.() ?? null;
      const clearId = clearControl.current?.id ?? null;
      const inputId = input.current?.id ?? null;
      const onClear = clearId !== null && focusedId === clearId;
      setClearFocused(onClear);
      // No React blur is delivered for a native focus change, so the sample is
      // the only signal that the field lost focus (plans 536/540).
      setFocused(focusedId !== null && (focusedId === inputId || onClear));
    };
    read();
    const timer = setInterval(read, FOCUS_SAMPLE_MS);
    return () => clearInterval(timer);
  }, [disabled, hasText, renderer]);

  const clear = (): void => {
    if (disabled || value === "") return;
    setValue("");
    onClear?.();
    const instance = input.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  };
  const state: SearchInputState = { disabled, focused };

  return (
    <div
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          height: controlHeight(theme, "md"),
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          backgroundColor: theme.colors.background,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.5 : 1,
          ...(focused && !clearFocused ? focusRing(theme) : {}),
        },
        resolveStyle(style, state),
      )}
    >
      <Icon name="search" color={theme.colors.mutedForeground} size="md" />
      <input
        {...rest}
        {...stateDescription(disabled, rest["aria-description"])}
        ref={setInput}
        testId={rest.testId ?? "search-input"}
        autoFocus={autoFocus && !disabled}
        value={value}
        placeholder={placeholder}
        readOnly={disabled}
        onChange={(event) => {
          onChange?.(event);
          setValue(event.value ?? "");
        }}
        onKeyDown={(event: EventPayload) => {
          onKeyDown?.(event);
          if (!isDismiss(event) || disabled || value === "") return;
          clear();
          claimEvent(event);
        }}
        onSubmit={() => {
          if (!disabled) onSubmit?.(value);
        }}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        style={{
          ...textStyle(theme, "body"),
          flexGrow: 1,
          height: "100%",
          backgroundColor: undefined,
          color: theme.colors.inputForeground,
        }}
      />
      {value === "" || disabled ? null : (
        <div
          role="button"
          aria-label="Clear search"
          testId="search-clear"
          ref={clearControl}
          tabIndex={disabled ? -1 : 0}
          onClick={clear}
          {...activationHandlers(clear)}
          style={{
            ...textStyle(theme, "caption"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: theme.radius.sm,
            color: theme.colors.mutedForeground,
            cursor: "pointer",
            ...(clearFocused ? focusRing(theme) : {}),
            hover: {
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentForeground,
            },
          }}
        >
          <Icon name="x" color={theme.colors.mutedForeground} size="sm" />
        </div>
      )}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const searchInputMeta = {
  name: "Search inputs",
  tier: 2,
  status: "done",
  gpuixSupport: "yes",
  focusable: true,
  limitations: [
    "no debounce: the consumer debounces its own query",
    "Enter arrives as submit, Escape as keyDown (measured in 0.10.0)",
  ],
  docs: "docs/search-input.mdx",
  example: "examples/search-input.example.tsx",
  testFile: "src/behaviour/search-input.test.tsx",
} as const;

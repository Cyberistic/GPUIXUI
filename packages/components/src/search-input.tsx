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
 * move (plans 536/540), so an enabled field samples `getFocusedElementId()`;
 * a disabled field paints no ring (plans 659/660).
 */

import type { EventPayload, InputProps, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { useCallback, useRef } from "react";
import { activationHandlers } from "./internal/activate.js";
import { useControllableState } from "./internal/controllable.js";
import { claimEvent } from "./internal/event-claim.js";
import { isDismiss } from "./internal/key.js";
import { useNativeFocusId } from "./internal/native-focus.js";
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
  const input = useRef<PublicInstance | null>(null);
  const clearControl = useRef<PublicInstance | null>(null);
  const attach = useCallback((next: PublicInstance | null) => {
    input.current = next;
  }, []);
  const setInput = useMergedRef<PublicInstance | null>(attach, ref);
  // The sample is the only focus signal: 0.10.0 delivers no React focus/blur
  // for a native move (plans 536/540, 659/660). Until it reports a host, the
  // `autoFocus` seed stands, because the runtime applies that focus after
  // React's effects (plan 388).
  const focusedId = useNativeFocusId(!disabled);
  const clearFocused =
    focusedId !== null && focusedId === (clearControl.current?.id ?? null);
  const focused =
    clearFocused ||
    (focusedId === null
      ? autoFocus && !disabled
      : focusedId === (input.current?.id ?? null));

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
          ...(focused && !clearFocused && !disabled ? focusRing(theme) : {}),
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
    "the focus ring follows a 50 ms sample of the renderer's focused host until a shared native-focus tracker exists",
  ],
  docs: "docs/search-input.mdx",
  example: "examples/search-input.example.tsx",
  testFile: "src/behaviour/search-input.test.tsx",
} as const;

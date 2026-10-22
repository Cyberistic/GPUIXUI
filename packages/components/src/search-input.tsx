/**
 * SearchInput: a single-line search field with a clear affordance.
 *
 * The field owns the text in uncontrolled mode and reports every edit; Enter
 * submits and Escape clears. `Enter` reaches the component as the input's
 * `submit` event — measured in 0.11.0 — while Escape arrives as `keyDown`.
 *
 * There is no debounce: the component reports keystrokes as they happen, and a
 * consumer that queries on each one debounces its own effect.
 */

import type { KeyEvent, InputProps, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  SEARCH_INPUT,
  SEARCH_INPUT_CLEAR,
  SEARCH_INPUT_CONTROL,
  SEARCH_INPUT_ICON,
} from "@gpuixui/tw";
import * as Option from "effect/Option";
import { useCallback, useRef, useState } from "react";
import { useControllableState } from "./internal/controllable.js";
import { fieldHint, hintHost, renderFieldHint } from "@gpuixui/primitives/hint";
import { activationHandlers, isDismiss } from "./internal/key.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import {
  controlHeight,
  disabledFade,
  keepContent,
  keyboardRing,
  nativeTextTheme,
  selectionWash,
  targetSize,
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the field's state. */
  readonly style?: StateStyle<SearchInputState>;
}

/** What the field draws: its input state. */
export interface SearchInputState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

/** A search field with a leading icon and a conditional clear control. */
export const SearchInput = ({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onClear,
  placeholder = "Search…",
  disabled = false,
  className,
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
  const [focused, setFocused] = useState(false);
  const input = useRef<PublicInstance | null>(null);
  const attach = useCallback((next: PublicInstance | null) => {
    input.current = next;
  }, []);
  const setInput = useMergedRef<PublicInstance | null>(attach, ref);

  const clear = (): void => {
    // A disabled field refuses every edit path — Escape and the clear target
    // alike. The target stays painted so the query still reads, and
    // `internal/button.tsx` states the same rule for a disabled action.
    if (disabled) return;
    if (value === "") return;
    setValue("");
    onClear?.();
    const instance = input.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  };
  const state: SearchInputState = { disabled, focused };
  const controlStyle = mergeStyles(recipeStyle(SEARCH_INPUT_CONTROL, theme), {
    ...(disabled ? {} : keyboardRing(theme)),
    ...selectionWash(theme),
    ...keepContent,
  });
  const testId = rest.testId ?? "search-input";
  const hint = fieldHint({ placeholder, disabled }, theme, value, {
    origin: "host",
    align: "center",
    style: controlStyle,
  });

  return (
    <div
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(SEARCH_INPUT, className), theme), {
          height: controlHeight(theme, "md"),
          ...disabledFade(disabled),
        }),
        resolveStyle(style, state),
      )}
    >
      <div style={recipeStyle(SEARCH_INPUT_ICON, theme)}>
        <Icon name="search" size="sm" color={theme.colors.mutedForeground} />
      </div>
      <div style={hintHost({ flexGrow: 1, alignSelf: "stretch", minWidth: 0 })}>
        <input
          {...rest}
          // A composite field paints the page role as its own fill, so the
          // caret is measured against `background`; the hint is painted rather
          // than handed to the host, whose placeholder is a fixed grey.
          theme={nativeTextTheme(theme, "background")}
          ref={setInput}
          testId={testId}
          value={value}
          readOnly={disabled}
          // A disabled field leaves the tab order: the runtime has no
          // `disabled` on a host input, and `readOnly` still takes focus.
          tabIndex={disabled ? -1 : 0}
          onChange={(event) => {
            onChange?.(event);
            setValue(event.value ?? "");
          }}
          onKeyDown={(event: KeyEvent) => {
            onKeyDown?.(event);
            if (isDismiss(event)) clear();
          }}
          onSubmit={() => onSubmit?.(value)}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          style={controlStyle}
        />
        {Option.match(hint, {
          onNone: () => null,
          onSome: (painted) => renderFieldHint(painted, testId),
        })}
      </div>
      {value === "" ? null : (
        <div
          role="button"
          aria-label="Clear search"
          testId="search-clear"
          tabIndex={disabled ? -1 : 0}
          onClick={clear}
          {...activationHandlers(clear)}
          style={mergeStyles(recipeStyle(SEARCH_INPUT_CLEAR, theme), {
            ...(disabled ? {} : keyboardRing(theme)),
            width: targetSize.minimum,
            height: targetSize.minimum,
            flexShrink: 0,
            // A disabled target answers nothing, so it must not advertise a
            // press either: the house rule for a disabled action.
            cursor: disabled ? "not-allowed" : "pointer",
            hover: disabled
              ? undefined
              : { backgroundColor: theme.colors.accent },
          })}
        >
          <Icon name="x" size="sm" color={theme.colors.mutedForeground} />
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
  limitations: [
    "no debounce: the consumer debounces its own query",
    "Enter arrives as submit, Escape as keyDown (measured in 0.11.0)",
  ],
  docs: "docs/search-input.mdx",
  example: "examples/search-input.example.tsx",
  testFile: "src/behaviour/search-input.test.tsx",
} as const;

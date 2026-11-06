/** @jsxImportSource @gpuix/react */
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
import {
  fieldHelp,
  fieldHint,
  hintHost,
  renderFieldHint,
} from "@gpuixui/primitives/hint";
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

export interface SearchInputProps extends Omit<
  InputProps,
  "onSubmit" | "style"
> {
  readonly value?: string;
  readonly defaultValue?: string;

  readonly onValueChange?: (value: string) => void;

  readonly onSubmit?: (value: string) => void;

  readonly onClear?: () => void;

  readonly placeholder?: string;
  readonly disabled?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<SearchInputState>;
}

export interface SearchInputState {
  readonly disabled: boolean;
  readonly focused: boolean;
}

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
          theme={nativeTextTheme(theme, "background")}
          ref={setInput}
          testId={testId}
          value={value}
          readOnly={disabled}
          tabIndex={disabled ? -1 : 0}
          aria-description={fieldHelp(
            { description: rest["aria-description"], placeholder },
            value,
          )}
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

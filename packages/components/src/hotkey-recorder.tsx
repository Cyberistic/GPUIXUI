/**
 * HotkeyRecorder: bind a keyboard chord to an action.
 *
 * The chord grammar and the platform glyphs come from `@gpuixui/keyboard`
 * (`decodeGpuixEvent`, `normalizeHotkey`, `hasNonModifierKey`, `formatSymbols`);
 * this component only owns the recording state and the display.
 *
 * 0.11.0's test renderer emits no key event for Backspace or Delete, so
 * clearing is a real control next to the recorder rather than a key the docs
 * could not prove.
 */

import type { KeyEvent, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import {
  cn,
  HOTKEY_RECORDER,
  HOTKEY_RECORDER_CLEAR,
  HOTKEY_RECORDER_KEYS,
  HOTKEY_RECORDER_TEXT,
} from "@gpuixui/tw";
import {
  decodeGpuixEvent,
  formatSymbols,
  hasNonModifierKey,
  normalizeHotkey,
  toTanstackPlatform,
} from "@gpuixui/keyboard";
import { useRef, useState } from "react";
import { isActivation, isDismiss } from "./internal/key.js";
import { Keycap } from "./keyboard-shortcuts.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  currentPlatform,
  keyboardRing,
  useTheme,
} from "./internal/theme.js";

/** {@link HotkeyRecorder} props. */
export interface HotkeyRecorderProps extends Omit<
  Props,
  "children" | "style" | "onChange"
> {
  /** The recorder's accessible name. */
  readonly label: string;
  /** The bound chord, or `null` for none. */
  readonly value?: string | null;
  /** A captured chord, or `null` when cleared. */
  readonly onChange: (value: string | null) => void;
  /** Shown while no chord is bound. Default `"Click to record"`. */
  readonly placeholder?: string;
  readonly disabled?: boolean;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** A style, or a function of the recording state. */
  readonly style?: StateStyle<HotkeyRecorderState>;
}

/** What the recorder draws: whether it is listening, and whether it is disabled. */
export interface HotkeyRecorderState {
  readonly recording: boolean;
  readonly disabled: boolean;
}

/** A control that captures the next chord the user presses. */
export const HotkeyRecorder = ({
  label,
  value = null,
  onChange,
  placeholder = "Click to record",
  disabled = false,
  className,
  style,
  testId,
  onClick,
  onKeyDown,
  onBlur,
  ...rest
}: HotkeyRecorderProps) => {
  const theme = useTheme();
  const [recording, setRecording] = useState(false);
  // A press on the clear control must not also start recording on the root.
  const skipStart = useRef(false);

  const start = (): void => {
    if (disabled) return;
    setRecording(true);
  };

  const clear = (): void => {
    skipStart.current = true;
    onChange(null);
  };

  return (
    <div
      role="button"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      {...rest}
      testId={testId}
      onClick={(event) => {
        onClick?.(event);
        if (skipStart.current) {
          skipStart.current = false;
          return;
        }
        if (recording) setRecording(false);
        else start();
      }}
      onKeyDown={(event: KeyEvent) => {
        onKeyDown?.(event);
        if (disabled) return;
        if (recording) {
          // A recorded chord must not also reach the application or the system.
          event.preventDefault();
          if (isDismiss(event)) {
            setRecording(false);
            return;
          }
          const platform = toTanstackPlatform(currentPlatform);
          const chord = decodeGpuixEvent(event, currentPlatform);
          if (hasNonModifierKey(chord, platform)) {
            onChange(normalizeHotkey(chord, platform));
            setRecording(false);
          }
          return;
        }
        if (isActivation(event)) start();
      }}
      onFocus={(event) => rest.onFocus?.(event)}
      onBlur={(event) => {
        setRecording(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(HOTKEY_RECORDER, className), theme), {
          minHeight: controlHeight(theme, "md"),
          opacity: disabled ? 0.5 : 1,
          ...keyboardRing(theme),
        }),
        resolveStyle(style, { recording, disabled }),
      )}
    >
      {recording ? (
        <text style={recipeStyle(HOTKEY_RECORDER_TEXT, theme)}>
          Press keys…
        </text>
      ) : value === null ? (
        <text style={recipeStyle(HOTKEY_RECORDER_TEXT, theme)}>
          {placeholder}
        </text>
      ) : (
        <div style={recipeStyle(HOTKEY_RECORDER_KEYS, theme)}>
          {formatSymbols(value, currentPlatform).map((key, index) => (
            <Keycap key={index}>{key}</Keycap>
          ))}
        </div>
      )}
      {disabled || value === null ? null : (
        <div
          role="button"
          aria-label="Clear shortcut"
          testId={testId === undefined ? undefined : `${testId}-clear`}
          tabIndex={0}
          onClick={clear}
          onKeyDown={(event: KeyEvent) => {
            if (isActivation(event)) clear();
          }}
          style={mergeStyles(recipeStyle(HOTKEY_RECORDER_CLEAR, theme), {
            hover: { backgroundColor: theme.colors.accent },
          })}
        >
          <Icon name="x" size="sm" color={theme.colors.mutedForeground} />
        </div>
      )}
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const hotkeyRecorderMeta = {
  name: "Hotkey-recorder input",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "a recorded key is swallowed with preventDefault, so it does not also run the application's binding; a chord the operating system intercepts before the window still fires",
    "clearing is a control, not Backspace: the test renderer emits no key event for Backspace/Delete",
    "mod is the platform's primary modifier; a secondary modifier keeps its own token",
  ],
  docs: "docs/hotkey-recorder.mdx",
  example: "examples/hotkey-recorder.example.tsx",
  testFile: "src/behaviour/hotkey-recorder.test.tsx",
} as const;

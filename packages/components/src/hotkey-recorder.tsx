/** @jsxImportSource @gpuix/react */
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
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  activationHandlers,
  isActivation,
  isDismiss,
  swallowsDefault,
} from "./internal/key.js";
import { Keycap } from "./keyboard-shortcuts.js";
import { recipeStyle } from "./internal/recipe.js";
import {
  controlHeight,
  currentPlatform,
  controlRing,
  disabledFade,
  targetSize,
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
  /**
   * Reports the armed state as it changes, so a caller can suspend its own
   * bindings while the recorder listens. `preventDefault` removes the element's
   * default action, not the window's: a key pressed while recording is still
   * delivered to an application-level handler, so the gate is the caller's.
   */
  readonly onRecordingChange?: (recording: boolean) => void;
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
  onRecordingChange,
  placeholder = "Click to record",
  disabled = false,
  className,
  style,
  testId,
  onClick,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: HotkeyRecorderProps) => {
  const theme = useTheme();
  const [recording, setRecording] = useState(false);
  // A press on the clear control must not also start recording on the root.
  const skipStart = useRef(false);
  // A chord capture owns the keyup that follows it: Space is a chord while
  // recording, not the other half of an activation.
  const captured = useRef(false);
  // The armed state is reported on a transition only, through a ref so a caller
  // passing an inline callback is not called again on every render.
  const report = useRef(onRecordingChange);
  report.current = onRecordingChange;
  const wasRecording = useRef(false);
  useEffect(() => {
    if (wasRecording.current === recording) return;
    wasRecording.current = recording;
    report.current?.(recording);
  }, [recording]);

  const start = (): void => {
    if (disabled) return;
    setRecording(true);
  };

  // A control the caller disables stops listening: every key is refused, so a
  // painted "Press keys…" would wait for a chord that can never be accepted.
  // A layout effect drops it before the frame paints.
  useLayoutEffect(() => {
    if (disabled) setRecording(false);
  }, [disabled]);

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
          // The element's default action is refused; the key still reaches an
          // application-level handler (the `hotkey-recorder-lifecycle` probe
          // measured `window=shift,k`), which is why the armed state is
          // reported and the caller gates its own bindings.
          event.preventDefault();
          captured.current = true;
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
        if (swallowsDefault(event, "down")) event.preventDefault();
        if (isActivation(event, "down")) start();
      }}
      onKeyUp={(event: KeyEvent) => {
        onKeyUp?.(event);
        if (captured.current) {
          captured.current = false;
          return;
        }
        if (!disabled && isActivation(event, "up")) start();
      }}
      onFocus={(event) => rest.onFocus?.(event)}
      onBlur={(event) => {
        setRecording(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(HOTKEY_RECORDER, className), theme), {
          minHeight: controlHeight(theme, "md"),
          ...disabledFade(disabled),
          ...controlRing(theme, { disabled }),
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
          {...activationHandlers(clear)}
          style={mergeStyles(recipeStyle(HOTKEY_RECORDER_CLEAR, theme), {
            width: targetSize.minimum,
            height: targetSize.minimum,
            flexShrink: 0,
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
    "a recorded key is swallowed with preventDefault, so the element's default does not also run — but the key still reaches an application-level handler, so an app suspends its own bindings while `onRecordingChange` reports the recorder armed (the `hotkey-recorder-lifecycle` probe measured the app handler still hearing the chord); a chord the operating system intercepts before the window still fires",
    "clearing is a control, not Backspace: the test renderer emits no key event for Backspace/Delete",
    "mod is the platform's primary modifier; a secondary modifier keeps its own token",
  ],
  docs: "docs/hotkey-recorder.mdx",
  example: "examples/hotkey-recorder.example.tsx",
  testFile: "src/behaviour/hotkey-recorder.test.tsx",
} as const;

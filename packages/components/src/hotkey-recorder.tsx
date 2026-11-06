/** @jsxImportSource @gpuix/react */
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

export interface HotkeyRecorderProps extends Omit<
  Props,
  "children" | "style" | "onChange"
> {
  readonly label: string;

  readonly value?: string | null;

  readonly onChange: (value: string | null) => void;

  readonly onRecordingChange?: (recording: boolean) => void;

  readonly placeholder?: string;
  readonly disabled?: boolean;

  readonly className?: string;

  readonly style?: StateStyle<HotkeyRecorderState>;
}

export interface HotkeyRecorderState {
  readonly recording: boolean;
  readonly disabled: boolean;
}

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

  const skipStart = useRef(false);

  const captured = useRef(false);

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

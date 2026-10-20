/**
 * HotkeyRecorder: bind a keyboard chord to an action.
 *
 * The accelerator grammar and the platform glyphs are shared with
 * `KeyboardShortcuts` (`shortcut/accelerator.ts`); capture is
 * `hotkey/logic.ts`. This component only owns the recording state and the
 * display.
 *
 * 0.10.0's test renderer emits no key event for Backspace or Delete, so
 * clearing is a real control next to the recorder rather than a key the docs
 * could not prove.
 */

import type { KeyEvent, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { useRef, useState } from "react";
import { acceleratorOf } from "./hotkey/logic.js";
import { isActivation, isDismiss } from "./internal/key.js";
import { Keycap } from "./keyboard-shortcuts.js";
import { formatAccelerator } from "./shortcut/accelerator.js";
import {
  controlHeight,
  currentPlatform,
  focusRing,
  textStyle,
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
  style,
  testId,
  onClick,
  onKeyDown,
  onBlur,
  ...rest
}: HotkeyRecorderProps) => {
  const theme = useTheme();
  const [recording, setRecording] = useState(false);
  const [focused, setFocused] = useState(false);
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
          if (isDismiss(event)) {
            setRecording(false);
            return;
          }
          Option.match(acceleratorOf(event, currentPlatform), {
            onNone: () => undefined,
            onSome: (chord) => {
              onChange(chord);
              setRecording(false);
            },
          });
          return;
        }
        if (isActivation(event)) start();
      }}
      onFocus={(event) => {
        setFocused(true);
        rest.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        setRecording(false);
        onBlur?.(event);
      }}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          minHeight: controlHeight(theme, "md"),
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          backgroundColor: theme.colors.background,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.5 : 1,
          ...(focused ? focusRing(theme) : {}),
        },
        resolveStyle(style, { recording, disabled }),
      )}
    >
      {recording ? (
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.mutedForeground,
          }}
        >
          Press keys…
        </text>
      ) : value === null ? (
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.mutedForeground,
          }}
        >
          {placeholder}
        </text>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
          }}
        >
          {formatAccelerator(value, currentPlatform).map((key, index) => (
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
          style={{
            ...textStyle(theme, "caption"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            borderRadius: theme.radius.sm,
            color: theme.colors.mutedForeground,
            hover: {
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentForeground,
            },
          }}
        >
          <text>✕</text>
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
    "0.10.0 observes keys but cannot preventDefault, so a captured system chord still reaches the system",
    "clearing is a control, not Backspace: the test renderer emits no key event for Backspace/Delete",
    "mod is the platform's primary modifier; a secondary modifier keeps its own token",
  ],
  docs: "docs/hotkey-recorder.mdx",
  example: "examples/hotkey-recorder.example.tsx",
  testFile: "src/behaviour/hotkey-recorder.test.tsx",
} as const;

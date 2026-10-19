/**
 * HotkeyRecorder: bind a keyboard chord to an action.
 *
 * The accelerator grammar and the platform glyphs are shared with
 * `KeyboardShortcuts` (`shortcut/accelerator.ts`); capture is
 * `hotkey/logic.ts`. This component only owns the recording state and the
 * display. Escape stops a recording and claims the key, so an enclosing dialog
 * stays open (plan 514). `Tab` and a press outside the field also stop it —
 * 0.10.0 delivers no React `blur` for a native focus change — and neither
 * claims the key, so moving focus away still works.
 *
 * 0.10.0's test renderer emits no key event for Backspace or Delete, so
 * clearing is a real control next to the recorder rather than a key the docs
 * could not prove.
 */

import type { EventPayload, Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import * as Option from "effect/Option";
import { useRef, useState } from "react";
import { acceleratorOf } from "./hotkey/logic.js";
import { activationHandlers } from "./internal/activate.js";
import { claimEvent, isEventClaimed } from "./internal/event-claim.js";
import { isDismiss, isEnter, isSpaceRelease, isTab } from "./internal/key.js";
import { stateDescription } from "./internal/state-description.js";
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
  autoFocus = false,
  style,
  testId,
  onClick,
  onKeyDown,
  onKeyUp,
  onBlur,
  onMouseDownOutside,
  ...rest
}: HotkeyRecorderProps) => {
  const theme = useTheme();
  const [recording, setRecording] = useState(false);
  const [focused, setFocused] = useState(autoFocus && !disabled);
  const [clearFocused, setClearFocused] = useState(false);
  // A press on the clear control must not also start recording on the root.
  const skipStart = useRef(false);
  // A key captured while recording must not start a new recording on release:
  // Space is a valid chord, so its own key-up would otherwise reopen the field.
  const consumed = useRef(false);

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
      {...stateDescription(disabled, rest["aria-description"])}
      testId={testId}
      autoFocus={autoFocus && !disabled}
      onMouseDownOutside={(event) => {
        onMouseDownOutside?.(event);
        setRecording(false);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (skipStart.current) {
          skipStart.current = false;
          return;
        }
        if (recording) setRecording(false);
        else start();
      }}
      onKeyDown={(event: EventPayload) => {
        onKeyDown?.(event);
        if (disabled || isEventClaimed(event)) return;
        if (recording) {
          if (isTab(event)) {
            setRecording(false);
            return;
          }
          // This key is the capture (or the cancel): its key-up must not start
          // a second recording.
          consumed.current = true;
          if (isDismiss(event)) {
            // One Escape stops the recording and must not also close the
            // dialog around the recorder (plan 514).
            claimEvent(event);
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
        consumed.current = false;
        if (isEnter(event)) start();
      }}
      onKeyUp={(event: EventPayload) => {
        onKeyUp?.(event);
        if (disabled || isEventClaimed(event)) return;
        if (consumed.current) {
          consumed.current = false;
          return;
        }
        if (!recording && isSpaceRelease(event)) start();
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
          {...activationHandlers((event) => {
            claimEvent(event);
            clear();
          })}
          onFocus={() => setClearFocused(true)}
          onBlur={() => setClearFocused(false)}
          style={{
            ...textStyle(theme, "caption"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 16,
            height: 16,
            borderRadius: theme.radius.sm,
            color: theme.colors.mutedForeground,
            ...(clearFocused ? focusRing(theme) : {}),
            hover: {
              backgroundColor: theme.colors.accent,
              color: theme.colors.accentForeground,
            },
          }}
        >
          <Icon name="x" color={theme.colors.mutedForeground} size="xs" />
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
  focusable: true,
  limitations: [
    "0.10.0 observes keys but cannot preventDefault, so a captured system chord still reaches the system",
    "clearing is a control, not Backspace: the test renderer emits no key event for Backspace/Delete",
    "a recording is cancelled by Escape, Tab or a press outside the field: 0.10.0 delivers no React blur for a native focus change",
    "mod is the platform's primary modifier; a secondary modifier keeps its own token",
  ],
  docs: "docs/hotkey-recorder.mdx",
  example: "examples/hotkey-recorder.example.tsx",
  testFile: "src/behaviour/hotkey-recorder.test.tsx",
} as const;

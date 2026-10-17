/**
 * `OTPField` — a one-time code in `length` cells.
 *
 * The cells are real `<input>` elements, so the platform keeps the caret and
 * the text selection; what is ours is the distribution of one code over them
 * (`core/otp.ts`) and the movement of native focus between cells. Focus is
 * tracked per cell, not on the wrapper, because GPUix dispatches an event to the
 * element that owns the handler — the focused cell paints the ring, exactly
 * like a radio group's item.
 *
 * The value is **one string**, contiguous from the first cell, so a caller never
 * juggles an array. There is no `onPaste` in 0.10.0: a pasted code reaches this
 * component as one multi-character `onChange`, and `applyOtpInput` fills it
 * forward from the cell that received it — a behaviour identical to typing the
 * same characters quickly.
 *
 * **The key contract runs on key up.** The native text editor consumes
 * Left/Right/Home/End/Backspace/Delete on key down; only their key-up events
 * reach the element (measured 2026-10-17). A held arrow therefore moves one
 * cell rather than repeating. Backspace on a filled cell is the native edit and
 * arrives through `onChange`; the key-up handler must not delete the previous
 * cell as well, so it remembers that this key already emptied the cell.
 */

import { useRef, useState, type ReactElement } from "react";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance, StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  applyOtpInput,
  decideOtpKey,
  normalizeOtp,
  otpCells,
  otpLength,
  type OtpEdit,
} from "../core/otp.js";
import { nativeTextTheme, otpCellStyle, otpGroupStyle } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { mergeStyle, useControlState } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface OTPFieldProps {
  /** Number of cells. Defaults to 6. */
  readonly length?: number;
  /** Controlled code. Omit to let the field hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  /** Called with the code after every edit, only when it actually changed. */
  readonly onChange?: (value: string) => void;
  /** Called once when an edit makes the code complete. */
  readonly onComplete?: (value: string) => void;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Read-only, out of the tab order and inert. */
  readonly disabled?: boolean;
  /** Validation failed: every cell takes the destructive border. */
  readonly invalid?: boolean;
  /** The group's name; each cell is announced as "<label> digit N". */
  readonly label?: string;
  /** Focus the first cell on mount. */
  readonly autoFocus?: boolean;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** Which cell holds native focus, and how the field learns that it moved. */
export interface OTPFieldFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  /** Reports the index that lost focus, so a stale blur cannot clear the ring. */
  readonly onBlur: (index: number) => void;
}

/** What the renderer does with the field's own state. */
export interface OTPFieldHandlers {
  /** An edit reported by the cell at `index`, with the runtime's text. */
  readonly onEdit: (index: number, text: string) => void;
  readonly onKey: (index: number, key: string) => void;
  /** Point native focus at a cell — a click on an empty cell lands on the code. */
  readonly onPick: (index: number) => void;
  readonly registerCell: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

/** A cell's accessible name: the group's name plus its position. */
export const otpCellLabel = (
  label: string | undefined,
  index: number,
): string => `${label ?? "Code"} digit ${index + 1}`;

export const renderOtpField = (
  props: OTPFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: OTPFieldFocus,
  handlers: OTPFieldHandlers,
): ReactElement => {
  const limit = otpLength(props.length ?? 6);
  const disabled = props.disabled === true;
  const cells = otpCells(state.current, limit);
  return (
    <div
      role="group"
      aria-label={props.label}
      testId={props.testId}
      style={mergeStyle(otpGroupStyle(theme), props.style)}
    >
      {Arr.map(cells, (cell, index) => (
        <input
          key={index}
          ref={handlers.registerCell(index)}
          testId={
            props.testId === undefined
              ? undefined
              : `${props.testId}-cell-${index + 1}`
          }
          value={cell}
          readOnly={disabled}
          autoFocus={!disabled && index === 0 ? props.autoFocus : undefined}
          tabIndex={disabled ? -1 : 0}
          theme={nativeTextTheme(theme)}
          aria-label={otpCellLabel(props.label, index)}
          style={otpCellStyle(
            {
              size: props.size ?? "md",
              invalid: props.invalid,
              disabled: props.disabled,
              focused: Option.exists(
                focus.focusedIndex,
                (focused) => focused === index,
              ),
            },
            theme,
          )}
          onChange={(event: EventPayload) => {
            if (disabled) return;
            handlers.onEdit(index, event.value ?? "");
          }}
          onKeyUp={(event: EventPayload) => {
            if (disabled) return;
            handlers.onKey(index, event.key ?? "");
          }}
          onClick={() => {
            if (disabled) return;
            handlers.onPick(index);
          }}
          onFocus={() => focus.onFocus(index)}
          onBlur={() => focus.onBlur(index)}
        />
      ))}
    </div>
  );
};

/** A one-time code in `length` cells. */
export const OTPField = (props: OTPFieldProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const limit = otpLength(props.length ?? 6);
  const cellIds = useRef<Map<number, number>>(new Map());
  /** Whether the current key's native edit just emptied this cell. */
  const emptiedByEdit = useRef(false);
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    props.autoFocus === true && props.disabled !== true
      ? Option.some(0)
      : Option.none(),
  );
  const state = useControlState(
    props.value,
    normalizeOtp(props.defaultValue ?? "", limit),
    props.onChange,
  );
  const focusCell = (index: number): void => {
    setFocusedIndex(Option.some(index));
    Option.match(
      Option.all({
        id: Option.fromNullishOr(cellIds.current.get(index)),
        target: Option.fromNullishOr(renderer),
      }),
      {
        onNone: () => {},
        onSome: ({ id, target }) => target.focusElement?.(id),
      },
    );
  };
  const apply = (edit: OtpEdit): void => {
    if (edit.value !== state.value.current) {
      state.set(edit.value);
      if (edit.value.length === limit) props.onComplete?.(edit.value);
    }
    focusCell(edit.focus);
  };
  const focus: OTPFieldFocus = {
    focusedIndex,
    onFocus: (index) => setFocusedIndex(Option.some(index)),
    onBlur: (index) =>
      setFocusedIndex((current) =>
        Option.filter(current, (focused) => focused !== index),
      ),
  };
  const handlers: OTPFieldHandlers = {
    onEdit: (index, text) => {
      const current = state.value.current;
      const edit = applyOtpInput(current, index, text, limit);
      emptiedByEdit.current =
        Option.getOrElse(Arr.get(otpCells(current, limit), index), () => "") !==
          "" &&
        Option.getOrElse(
          Arr.get(otpCells(edit.value, limit), index),
          () => "",
        ) === "";
      apply(edit);
    },
    onKey: (index, key) => {
      // A Backspace whose native edit already emptied the cell has done its
      // work; clearing the previous cell too would delete two characters.
      const alreadyEmptied = emptiedByEdit.current;
      emptiedByEdit.current = false;
      if (key === "backspace" && alreadyEmptied) return;
      Option.match(decideOtpKey(state.value.current, index, key, limit), {
        onNone: () => {},
        onSome: apply,
      });
    },
    onPick: (index) =>
      focusCell(
        Math.min(index, normalizeOtp(state.value.current, limit).length),
      ),
    registerCell: (index) => (instance) => {
      if (instance === null) cellIds.current.delete(index);
      else cellIds.current.set(index, instance.id);
    },
  };
  return renderOtpField(props, theme, state.value, focus, handlers);
};

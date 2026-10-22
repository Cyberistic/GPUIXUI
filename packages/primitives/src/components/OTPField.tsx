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
 * juggles an array. There is no `onPaste` in `@gpuix/native` 0.11.0: a pasted code reaches this
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
 *
 * Enter is not part of the code contract: the runtime turns it into a submit
 * when the field installs `onSubmit`, so the key is the caller's to handle and
 * never edits a cell. Without that prop Enter does nothing.
 *
 * The resting appearance is a Tailwind recipe (`recipe/otpGroupClass` and
 * `recipe/fieldSquareClass`), compiled through `@gpuixui/tw`; the caller's
 * `className` is joined last so it wins conflicts exactly as `cn` resolves them.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useGpuix } from "@gpuix/react";
import type {
  EventPayload,
  KeyEvent,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
import {
  applyOtpInput,
  decideOtpKey,
  normalizeOtp,
  otpCells,
  otpLength,
  type OtpEdit,
} from "../core/otp.js";
import { accessibleName } from "../core/a11y.js";
import { controlRing, keepContent } from "../core/focus.js";
import { nativeTextTheme } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldSquareClass, otpGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import type { FieldState } from "./Input.js";
import {
  composeEvent,
  mergeRefs,
  mergeStyle,
  suppressFeedback,
  useControlState,
  valueChange,
  type FieldHostProps,
  type HelpProps,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface OTPFieldProps
  extends
    ValueChangeProps<string>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  /** Number of cells. Defaults to 6. */
  readonly length?: number;
  /** Controlled code. Omit to let the field hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  /** Called once when an edit makes the code complete. */
  readonly onComplete?: (value: string) => void;
  /**
   * Enter in any cell. The runtime turns Enter into a submit only when the
   * field installs a listener, so a code field with a form to send needs this
   * — without it the key does nothing. The code is unchanged by the submit;
   * a disabled field installs no listener at all (the `Input` contract).
   */
  readonly onSubmit?: (event: EventPayload) => void;
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
  /** Extra style on the group, resolved against its live state and merged last. */
  readonly style?: StateStyle<FieldState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The parts to draw. Omit for `length` cells. */
  readonly children?: ReactNode;
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
): string => `${accessibleName(label) ?? "Code"} digit ${index + 1}`;

/** What every cell part reads from the OTP field that owns it. */
export interface OTPFieldPart {
  readonly theme: PrimitiveTheme;
  readonly disabled: boolean;
  readonly label: string | undefined;
  /** The announced help, already blank-filtered; every cell carries it. */
  readonly description: string | undefined;
  /** The caller's address: `ref`, `aria-id` and `onLayout` land on the first cell. */
  readonly address: FieldHostProps;
  readonly testId: string | undefined;
  readonly autoFocus: boolean | undefined;
  /** The code split into one entry per cell, already normalised. */
  readonly cells: ReadonlyArray<string>;
  /** The one cell in the tab order: where the code has got to, or the focus. */
  readonly rovingIndex: number;
  /** Enter in any cell, or none while the field is disabled. */
  readonly onSubmit: ((event: EventPayload) => void) | undefined;
  readonly cellStyle: StyleDesc;
  readonly focus: OTPFieldFocus;
  readonly handlers: OTPFieldHandlers;
  /** The caller's host handlers, installed on every cell. */
  readonly interaction: InteractionProps;
}

/** Resolve a field's shared state once, for its root and every cell. */
export const otpFieldPart = (
  props: OTPFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: OTPFieldFocus,
  handlers: OTPFieldHandlers,
): OTPFieldPart => {
  const limit = otpLength(props.length ?? 6);
  const disabled = props.disabled === true;
  const resolved = recipeTw.classesToStyle(
    fieldSquareClass({ size: props.size ?? "md", invalid: props.invalid }),
    theme,
  );
  let cellStyle = mergeStyle(resolved.style, keepContent);
  if (props.invalid === true)
    cellStyle = mergeStyle(cellStyle, resolved.invalid);
  if (disabled) {
    cellStyle = suppressFeedback(mergeStyle(cellStyle, resolved.disabled));
  } else {
    cellStyle = mergeStyle(
      cellStyle,
      controlRing(theme, { disabled, invalid: props.invalid }),
    );
  }
  const code = normalizeOtp(state.current, limit);
  return {
    theme,
    disabled,
    label: accessibleName(props.label),
    description: accessibleName(props.description),
    address: props,
    testId: props.testId,
    autoFocus: disabled ? undefined : props.autoFocus,
    cells: otpCells(code, limit),
    rovingIndex: Option.getOrElse(focus.focusedIndex, () =>
      Math.min(code.length, Math.max(0, limit - 1)),
    ),
    onSubmit: disabled ? undefined : props.onSubmit,
    cellStyle,
    focus,
    handlers,
    interaction: props,
  };
};

const OtpFieldPartContext = createContext<OTPFieldPart | null>(null);

const useOtpFieldPart = (name: string): OTPFieldPart => {
  const part = useContext(OtpFieldPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside OTPField`);
  }
  return part;
};

/** {@link OTPFieldInput} props. */
export interface OTPFieldInputProps {
  /** Which cell this input is. Zero-based. */
  readonly index: number;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** One cell of a code. */
export const renderOtpFieldInput = (
  { index, className, style, testId }: OTPFieldInputProps,
  part: OTPFieldPart,
): ReactElement => {
  const { disabled, focus, handlers } = part;
  // The address is the cell a form can focus: the first one. The later cells
  // keep their own internal refs, and every cell carries the group's help.
  const address: FieldHostProps = index === 0 ? part.address : {};
  return (
    <input
      ref={mergeRefs(handlers.registerCell(index), address.ref)}
      testId={
        testId ??
        (part.testId === undefined
          ? undefined
          : `${part.testId}-cell-${index + 1}`)
      }
      value={part.cells[index] ?? ""}
      readOnly={disabled}
      autoFocus={index === 0 ? part.autoFocus : undefined}
      tabIndex={disabled ? -1 : index === part.rovingIndex ? 0 : -1}
      theme={nativeTextTheme(part.theme)}
      aria-label={otpCellLabel(part.label, index)}
      aria-description={part.description}
      aria-id={address["aria-id"]}
      onLayout={address.onLayout}
      style={mergeStyle(
        mergeStyle(
          part.cellStyle,
          recipeTw.classesToStyle(className, part.theme).style,
        ),
        style,
      )}
      onChange={(event: EventPayload) => {
        if (disabled) return;
        handlers.onEdit(index, event.value ?? "");
      }}
      onSubmit={part.onSubmit}
      onKeyUp={composeEvent<KeyEvent>(part.interaction.onKeyUp, (event) => {
        if (disabled) return;
        handlers.onKey(index, event.key ?? "");
      })}
      onClick={composeEvent<EventPayload>(part.interaction.onClick, () => {
        if (disabled) return;
        handlers.onPick(index);
      })}
      onKeyDown={part.interaction.onKeyDown}
      onFocus={composeEvent<EventPayload>(part.interaction.onFocus, () =>
        focus.onFocus(index),
      )}
      onBlur={composeEvent<EventPayload>(part.interaction.onBlur, () =>
        focus.onBlur(index),
      )}
    />
  );
};

/** One cell of a code, inside an `OTPField`. */
export const OTPFieldInput = (props: OTPFieldInputProps): ReactElement =>
  renderOtpFieldInput(props, useOtpFieldPart("OTPFieldInput"));

export const renderOtpField = (
  props: OTPFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: OTPFieldFocus,
  handlers: OTPFieldHandlers,
): ReactElement => {
  const part = otpFieldPart(props, theme, state, focus, handlers);
  const disabled = part.disabled;
  const group = recipeTw.classesToStyle(
    cn(otpGroupClass, props.className),
    theme,
  ).style;
  return (
    <div
      role="group"
      aria-label={accessibleName(props.label)}
      testId={props.testId}
      style={mergeStyle(
        group,
        resolveStyle(props.style, {
          disabled,
          focused: !disabled && Option.isSome(focus.focusedIndex),
          invalid: props.invalid === true,
        }),
      )}
    >
      <OtpFieldPartContext.Provider value={part}>
        {props.children ??
          Arr.map(part.cells, (_cell, index) =>
            renderOtpFieldInput({ index }, part),
          )}
      </OtpFieldPartContext.Provider>
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
    Option.none(),
  );
  const state = useControlState(
    props.value,
    normalizeOtp(props.defaultValue ?? "", limit),
    valueChange(props),
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
    const previous = state.value.current;
    if (edit.value !== previous) {
      state.set(edit.value);
      // Completing means the edit turned an unfinished code into a full one.
      // Replacing a digit of a finished code is still a full code, and a
      // verifier keyed on this must not run a second time for it.
      if (previous.length < limit && edit.value.length === limit)
        props.onComplete?.(edit.value);
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

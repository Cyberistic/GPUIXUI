/** @jsxImportSource @gpuix/react */
/**
 * `TextArea` — a multi-line text field.
 *
 * The same field contract as `Input`, on the runtime's `textarea` element.
 * `minRows`/`maxRows` are the runtime's own height controls; a textarea does
 * not scroll until its content exceeds `maxRows`, so a set `maxRows` is also
 * the point at which it becomes a scroll container. Both counts are handed over
 * as whole rows (`core/layout.ts`'s `fieldRows`), because the runtime drops a
 * fractional count instead of flooring it.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { fieldRows } from "../core/layout.js";
import type { ValueState } from "../core/state.js";
import { controlPaddingOf, controlSize } from "../core/theme.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { fieldFrame, fieldHostProps, type FieldProps } from "./Input.js";
import { fieldHint, renderFieldHint } from "./hint.js";
import {
  useControlState,
  useFocus,
  valueChange,
  type FocusState,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/**
 * Drift a textarea cannot take: with `onSubmit` set, the runtime turns Enter
 * into a submit and the newline never arrives (measured by
 * `runtime/fields.runtime.test.tsx`). A caller who wants submit-on-Enter wants
 * an `Input`.
 */
export type TextAreaProps = Omit<FieldProps, "onSubmit"> &
  ValueChangeProps<string> & {
    /**
     * Minimum visible rows; the field grows to fit. A fractional or unusable
     * count is read as a whole row, never dropped (`fieldRows`).
     *
     * A saved count that is not a number — JSON's `null` for a field the record
     * never carried, or text a store wrote — is **absence**, so the runtime's
     * own height answers.
     */
    readonly minRows?: number;
    /**
     * Rows after which the field scrolls instead of growing. A fractional or
     * unusable count is read as a whole row, and the cap is never below
     * `minRows`.
     *
     * A saved count that is not a number is absence here too, and that matters
     * more on this side: a cap read as one row collapsed a six-line restored
     * field to a single row.
     */
    readonly maxRows?: number;
  };

/** A textarea's height is rows, not a control height, so it re-bases padding. */
export const renderTextArea = (
  props: TextAreaProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
): ReactElement => {
  const host = fieldHostProps(props, theme, state, focus, onValueChange);
  const vertical = controlPaddingOf(theme, controlSize(props.size));
  const style: StyleDesc = {
    ...host.style,
    height: undefined,
    paddingTop: vertical,
    paddingBottom: vertical,
  };
  const rows = fieldRows(props.minRows, props.maxRows);
  return (
    <textarea
      {...host}
      style={style}
      minRows={rows.minRows}
      maxRows={rows.maxRows}
    />
  );
};

/** A multi-line text field. */
export const TextArea = (props: TextAreaProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const field = useControlState(
    props.value,
    props.defaultValue ?? "",
    valueChange(props),
  );
  const hint = fieldHint(props, theme, field.value.current, {
    size: controlSize(props.size),
    align: "top",
    origin: "field",
  });
  return (
    <div style={fieldFrame}>
      {renderTextArea(props, theme, field.value, focus, field.set)}
      {Option.match(hint, {
        onNone: () => null,
        onSome: (hint) => renderFieldHint(hint, props.testId),
      })}
    </div>
  );
};

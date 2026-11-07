/** @jsxImportSource @gpuix/react */
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

export type TextAreaProps = Omit<FieldProps, "onSubmit"> &
  ValueChangeProps<string> & {
    readonly minRows?: number;

    readonly maxRows?: number;
  };

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

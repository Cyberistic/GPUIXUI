/**
 * `Input` — a single-line text field.
 *
 * GPUix's `<input>` holds its text natively and reports every edit through
 * `onChange`'s `event.value`; `value` is the external value pushed back in. The
 * controlled/uncontrolled decision is `core/state.ts`'s, so a field and a
 * checkbox cannot disagree about which value wins.
 *
 * The field chrome is a Tailwind recipe (`recipe/fieldClass`), compiled through
 * `@gpuixui/tw`; the caller's `className` is joined last so it wins conflicts
 * exactly as `cn` resolves them.
 */

import type { ReactElement } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { disabledOpacity } from "@gpuixui/tokens";
import { pipe } from "effect";
import * as Option from "effect/Option";
import { accessibleName } from "../core/a11y.js";
import type { ValueState } from "../core/state.js";
import { nativeTextTheme } from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { controlRing, keepContent } from "../core/focus.js";
import { fieldClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  composeEvent,
  mergeStyle,
  suppressFeedback,
  useControlState,
  useFocus,
  valueChange,
  type FieldHostProps,
  type FocusState,
  type HelpProps,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** What a text field tells a `style` callback. */
export interface FieldState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

/** Props shared by `Input` and `TextArea`. */
export interface FieldProps
  extends
    ValueChangeProps<string>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  /** Controlled text. Omit it to let the field hold its own draft. */
  readonly value?: string;
  /** Initial text when uncontrolled. */
  readonly defaultValue?: string;
  /**
   * Enter in an `<input>`. A `TextArea` does not take this: the runtime would
   * turn Enter into a submit and take the newline away (measured by `runtime/fields.runtime.test.tsx`).
   */
  readonly onSubmit?: (event: EventPayload) => void;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  /**
   * Not editable, out of the tab order, and painted with the disabled chrome.
   * The host has no `disabled` prop, so this is read-only plus the guards below
   * — assistive technology sees a read-only field.
   */
  readonly disabled?: boolean;
  /** Take keyboard focus on mount. Required for a field to receive key events. */
  readonly autoFocus?: boolean;
  /** Validation failed: the border takes the destructive role. */
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly fullWidth?: boolean;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  /**
   * The field's place in the runtime's tab order. A disabled field sits at `-1`
   * whatever this says, because it declares no ring and refuses every key.
   */
  readonly tabIndex?: number;
  /** Extra style, resolved against the field's live state and merged last. */
  readonly style?: StateStyle<FieldState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** The chrome a field element draws, shared by the input and the textarea. */
export const fieldChrome = (
  { size = "md", invalid, disabled, fullWidth, style, className }: FieldProps,
  theme: PrimitiveTheme,
  focused: boolean,
): StyleDesc => {
  const resolved = recipeTw.classesToStyle(
    cn(fieldClass({ size, invalid, fullWidth }), className),
    theme,
  );
  let base = resolved.style;
  if (invalid === true) base = mergeStyle(base, resolved.invalid);
  if (disabled === true) {
    base = mergeStyle(base, resolved.disabled);
    base = suppressFeedback(base);
  }
  const ring = controlRing(theme, { disabled, invalid });
  return mergeStyle(
    mergeStyle(mergeStyle(base, keepContent), ring),
    resolveStyle(style, {
      disabled: disabled === true,
      focused,
      invalid: invalid === true,
    }),
  );
};

/** Which line of a field a hint sits on. */
export type FieldHintAlign = "center" | "top";

/** A field's painted hint. */
export interface FieldHint {
  readonly text: string;
  readonly frame: StyleDesc;
  readonly textStyle: StyleDesc;
}

/** Where the hint is measured from. */
export interface HintSpec {
  readonly size: ControlSize;
  readonly align: FieldHintAlign;
  /**
   * `field` is a field that draws its own border and padding (`Input`,
   * `TextArea`); `content` is a host already inside that chrome
   * (`NumberField`'s input, which its root insets).
   */
  readonly origin: "field" | "content";
}

/**
 * The frame a hint paints in, over the empty host.
 *
 * The frame sits inside the field and takes no pointer input: a press lands on
 * the host underneath, exactly as it does through the runtime's own hint.
 */
export const hintFrame = (theme: PrimitiveTheme, spec: HintSpec): StyleDesc => {
  const field = spec.origin === "field";
  const padding = field ? theme.density.controlPaddingX[spec.size] : 0;
  const border = field ? theme.borderWidth.thin : 0;
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: spec.align === "center" ? "center" : "flex-start",
    paddingLeft: border + padding,
    paddingRight: padding,
    paddingTop: spec.align === "top" ? border + padding : 0,
    overflow: "hidden",
    pointerEvents: "none",
  };
};

/**
 * A field's hint, or nothing when it has no placeholder or already has a value.
 *
 * The runtime shapes an empty host's placeholder in a fixed `#8F8F8F`
 * (`custom_elements/input.rs` at the pinned `@gpuix/native@0.11.0`), so
 * `textFaint` — the role the contrast contract measures on both field fills —
 * never reaches it and no theme can move it. The field therefore gives the host
 * no placeholder and paints the hint itself in the measured `placeholder` role.
 *
 * A blank placeholder is no hint, and the hint fades with the field's own
 * disabled paint (`disabledOpacity`, the share the field chrome fades by).
 */
export const fieldHint = (
  props: Pick<FieldProps, "placeholder" | "disabled">,
  theme: PrimitiveTheme,
  value: string,
  spec: HintSpec,
): Option.Option<FieldHint> =>
  pipe(
    Option.fromNullishOr(props.placeholder),
    Option.filter((text) => text.length > 0 && value.length === 0),
    Option.map((text) => ({
      text,
      frame: hintFrame(theme, spec),
      textStyle: mergeStyle(
        recipeTw.classesToStyle(
          "type-body font-sans whitespace-nowrap text-ellipsis",
          theme,
        ).style,
        props.disabled === true
          ? { color: theme.colors.placeholder, opacity: disabledOpacity }
          : { color: theme.colors.placeholder },
      ),
    })),
  );

/** The hint element: one label the reader sees and assistive technology reads. */
export const renderFieldHint = (
  hint: FieldHint,
  testId: string | undefined,
): ReactElement => (
  <div style={hint.frame}>
    <text
      testId={testId === undefined ? undefined : `${testId}-hint`}
      style={hint.textStyle}
    >
      {hint.text}
    </text>
  </div>
);

/**
 * The frame a field's hint needs.
 *
 * The field element keeps **all** its chrome — border, fill, radius, ring — so
 * the runtime still paints the keyboard outline around the box it tracks focus
 * for; the frame only positions the hint.
 */
export const fieldFrame: StyleDesc = { position: "relative" };

/** The props an `<input>`/`<textarea>` shares, from the spec and its state. */
export const fieldHostProps = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
) => {
  const { ref, "aria-id": controlId, onLayout, description, tabIndex } = props;
  return {
    // The runtime's host surface the field does not own. A field is addressed by
    // a form that focuses it, by an automation host that names it, and by a
    // layout that measures it — none of which the text host can arrange itself.
    ref,
    "aria-id": controlId,
    onLayout,
    value: state.current,
    // The host's own hint is a fixed grey the theme cannot reach (measured on
    // `@gpuix/native@0.11.0`; see `fieldHint`), so the field paints the hint.
    readOnly: props.readOnly === true || props.disabled === true,
    autoFocus: props.disabled === true ? undefined : props.autoFocus,
    // A disabled field declares no ring and refuses every key, so a stop there
    // would have no cue: the disabled rule wins over the caller's order.
    tabIndex: props.disabled === true ? -1 : tabIndex,
    theme: nativeTextTheme(theme),
    testId: props.testId,
    "aria-label": accessibleName(props.label),
    "aria-description": accessibleName(description),
    style: fieldChrome(props, theme, focus.focused),
    onChange: (event: EventPayload) => {
      if (props.disabled !== true) onValueChange(event.value ?? "");
    },
    onSubmit: props.disabled === true ? undefined : props.onSubmit,
    onClick: props.onClick,
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
    onFocus: composeEvent<EventPayload>(props.onFocus, focus.onFocus),
    onBlur: composeEvent<EventPayload>(props.onBlur, focus.onBlur),
  };
};

export const renderInput = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
): ReactElement => (
  <input {...fieldHostProps(props, theme, state, focus, onValueChange)} />
);

export type InputProps = FieldProps;

/** A single-line text field. */
export const Input = (props: InputProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const field = useControlState(
    props.value,
    props.defaultValue ?? "",
    valueChange(props),
  );
  const hint = fieldHint(props, theme, field.value.current, {
    size: props.size ?? "md",
    align: "center",
    origin: "field",
  });
  return (
    <div style={fieldFrame}>
      {renderInput(props, theme, field.value, focus, field.set)}
      {Option.match(hint, {
        onNone: () => null,
        onSome: (hint) => renderFieldHint(hint, props.testId),
      })}
    </div>
  );
};

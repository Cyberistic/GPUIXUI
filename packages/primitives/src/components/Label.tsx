/**
 * `Label` — the visible name of a control.
 *
 * The runtime has **no `aria-labelledby`** (plan 020 §1.4), so a label cannot be
 * associated with a control by reference. The honest arrangement is that the
 * control carries its own `aria-label` and `Label` is the visible text beside
 * it; `labelledBy` builds the control's own `label` prop so a caller writes the
 * name once and spreads it into the control.
 *
 * It can, however, do the one thing a native label does: a press on the visible
 * text moves focus to the control whose ref it was given (`control`). That is a
 * pointer convenience, not an association — the control's own `label` remains
 * its accessible name (plan 749).
 */

import type { ReactElement, ReactNode, RefObject } from "react";
import * as Option from "effect/Option";
import { useGpuix, type PublicInstance } from "@gpuix/react";
import { stackStyle } from "../core/layout.js";
import { shrinkLayoutStyle } from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import {
  ariaNameOr,
  hasText,
  resolvePartStyle,
  type StateStyle,
} from "./internal.js";
import { Text } from "./Text.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Label` style callback receives. */
export interface LabelState {
  readonly invalid: boolean;
}

export interface LabelProps {
  /** Marks the field required with a destructive `*` (see `requiredLabel`). */
  readonly required?: boolean;
  /**
   * The required marker's accessible name. Defaults to `"required"`; a blank
   * value falls back to it, because the marker is not decoration.
   */
  readonly requiredLabel?: string;
  /** Renders the label in the destructive role, for a field that failed. */
  readonly invalid?: boolean;
  /** A second line of help under the name. */
  readonly description?: string;
  /**
   * The control this label names, by ref.
   *
   * A press on the visible label — name, required marker or description — moves
   * native focus to that control, which is a native label's one behaviour. It
   * does **not** associate the two: GPUix 0.10.0 has no `htmlFor` or
   * `aria-labelledby`, so the control still carries its own `label` (see
   * `labelledBy`). The label stays pointer-only and never becomes a tab stop.
   *
   * Point it at a single-root focusable control (`Input`, `TextArea`,
   * `NumberField`, `Select`, `Checkbox`, `Switch`, `Button`, `Toggle`). A
   * roving group's ref is its non-focusable root, so a click there focuses
   * nothing. A target that is disabled still receives focus (the renderer has
   * no focusable query); its handlers are guarded and it paints no ring.
   */
  readonly control?: RefObject<PublicInstance | null>;
  /** An object, or a callback over the label's public state. */
  readonly style?: StateStyle<LabelState>;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/**
 * The props that give a control the name its visible `Label` shows.
 *
 * Returns the `label` prop every control reads, so the name is written once:
 *
 * ```tsx
 * <Label>{name}</Label>
 * <Input {...labelledBy(name)} />
 * ```
 */
export const labelledBy = (name: string): { readonly label: string } => ({
  label: name,
});

/**
 * The press a label runs, or `undefined` when it is not a click target.
 *
 * A native label moves focus to the control it names; the renderer is the only
 * API for that (`focusElement` takes the instance id, not a `testId`), and a
 * ref that is not mounted yet is a no-op rather than an error. Pure in its
 * arguments so the rule is testable without a window (plan `749`).
 */
export const labelActivation = (
  control: RefObject<PublicInstance | null> | undefined,
  renderer: { readonly focusElement?: (id: number) => void } | null,
): (() => void) | undefined =>
  control === undefined
    ? undefined
    : () =>
        Option.match(Option.fromNullishOr(control.current), {
          onNone: () => {},
          onSome: (instance) => renderer?.focusElement?.(instance.id),
        });

/** The element tree `Label` renders for a field's visible name. */
export const renderLabel = (
  {
    required,
    requiredLabel,
    invalid,
    description,
    style,
    children,
    testId,
  }: LabelProps,
  theme: PrimitiveTheme,
  onActivate?: () => void,
): ReactElement => (
  <div
    testId={testId}
    onClick={onActivate}
    style={resolvePartStyle(
      {
        ...stackStyle({ direction: "column", gap: "2xs" }, theme),
        width: "100%",
        ...(onActivate === undefined ? {} : { cursor: "pointer" }),
      },
      style,
      { invalid: invalid === true },
    )}
  >
    <div
      style={stackStyle(
        { direction: "row", gap: "2xs", align: "baseline" },
        theme,
      )}
    >
      <Text
        role="label"
        tone={invalid === true ? "destructive" : "default"}
        style={shrinkLayoutStyle}
      >
        {children}
      </Text>
      {required === true ? (
        <Text
          role="label"
          tone="destructive"
          label={ariaNameOr(requiredLabel, "required")}
          shrink={false}
        >
          *
        </Text>
      ) : null}
    </div>
    {hasText(description) ? (
      <Text role="caption" tone="muted">
        {description}
      </Text>
    ) : null}
  </div>
);

/** A control's visible name, with an optional required marker and description. */
export const Label = (props: LabelProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  return renderLabel(props, theme, labelActivation(props.control, renderer));
};

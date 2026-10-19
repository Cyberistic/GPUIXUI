/**
 * `Label` — the visible name of a control.
 *
 * The runtime has **no `aria-labelledby`** (plan 020 §1.4), so a label cannot be
 * associated with a control by reference. The honest arrangement is that the
 * control carries its own `aria-label` and `Label` is the visible text beside
 * it; `labelledBy` builds the control's own `label` prop so a caller writes the
 * name once and spreads it into the control.
 */

import type { ReactElement, ReactNode } from "react";
import { shrinkLayoutStyle } from "../core/style.js";
import {
  ariaNameOr,
  hasText,
  resolvePartStyle,
  type StateStyle,
} from "./internal.js";
import { Stack } from "./Stack.js";
import { Text } from "./Text.js";

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

/** The element tree `Label` renders for a field's visible name. */
export const renderLabel = ({
  required,
  requiredLabel,
  invalid,
  description,
  style,
  children,
  testId,
}: LabelProps): ReactElement => (
  <Stack
    direction="column"
    gap="2xs"
    style={resolvePartStyle({ width: "100%" }, style, {
      invalid: invalid === true,
    })}
    testId={testId}
  >
    <Stack direction="row" gap="2xs" align="baseline">
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
        >
          *
        </Text>
      ) : null}
    </Stack>
    {hasText(description) ? (
      <Text role="caption" tone="muted">
        {description}
      </Text>
    ) : null}
  </Stack>
);

/** A control's visible name, with an optional required marker and description. */
export const Label = (props: LabelProps): ReactElement => renderLabel(props);

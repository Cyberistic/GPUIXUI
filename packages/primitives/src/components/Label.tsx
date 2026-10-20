/**
 * `Label` — the visible name of a control.
 *
 * The runtime has **no `aria-labelledby`** (plan 020 §1.4), so a label cannot be
 * associated with a control by reference. The honest arrangement is that the
 * control carries its own `aria-label` and `Label` is the visible text beside
 * it; `labelledBy` builds the control's own `label` prop so a caller writes the
 * name once and spreads it into the control.
 *
 * A label is a composition — a `Stack` of `Text` — so it has no resolver of its
 * own: its appearance is the already-migrated Stack and Text recipes. Its
 * `className`/`style` flow to the outer column.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { Stack } from "./Stack.js";
import { Text } from "./Text.js";

export interface LabelProps {
  /** Marks the field required. Purely visual; validate with Schema. */
  readonly required?: boolean;
  /** Renders the label in the destructive role, for a field that failed. */
  readonly invalid?: boolean;
  /** A second line of help under the name. */
  readonly description?: string;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
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

export const renderLabel = ({
  required,
  invalid,
  description,
  style,
  className,
  children,
  testId,
}: LabelProps): ReactElement => (
  <Stack
    direction="column"
    gap="2xs"
    fullWidth
    className={className}
    style={style}
    testId={testId}
  >
    <Stack direction="row" gap="2xs" align="baseline">
      <Text role="label" tone={invalid === true ? "destructive" : "default"}>
        {children}
      </Text>
      {required === true ? (
        <Text role="label" tone="destructive">
          *
        </Text>
      ) : null}
    </Stack>
    {description === undefined ? null : (
      <Text role="caption" tone="muted">
        {description}
      </Text>
    )}
  </Stack>
);

/** A control's visible name, with an optional required marker and description. */
export const Label = (props: LabelProps): ReactElement => renderLabel(props);

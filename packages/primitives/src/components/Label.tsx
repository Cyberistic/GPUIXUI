/**
 * `Label` — the visible name of a control.
 *
 * The runtime has **no `aria-labelledby`** (plan 020 §1.4), so a label cannot be
 * associated with a control by reference. The honest arrangement is that the
 * control carries its own `aria-label` and `Label` is the visible text beside
 * it; `labelledBy` builds the prop so a caller writes the name once and passes
 * the same string to both.
 */

import type { ReactElement, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { mergeStyle } from "./internal.js";
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
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The accessible name for a control whose visible name is `Label`'s child. */
export const labelledBy = (name: string): { readonly "aria-label": string } => ({
  "aria-label": name,
});

export const renderLabel = ({
  required,
  invalid,
  description,
  style,
  children,
  testId,
}: LabelProps): ReactElement =>
  (
    <Stack
      direction="column"
      gap="2xs"
      style={mergeStyle({ width: "100%" }, style)}
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

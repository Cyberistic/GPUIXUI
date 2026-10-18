/**
 * Fieldset: a named group of fields.
 *
 * `Field` wraps one control; a fieldset groups several under one visible
 * heading. `@gpuix/native@0.10.0` has no `fieldset` element and no
 * `aria-disabled`, so the group is a `div` with `role="group"` named by its
 * legend, and `disabled` reaches the controls that opt in — today `FieldInput`,
 * which leaves the tab order and paints the disabled roles.
 *
 * Only the legend dims with the group. Dimming the subtree would double-dim a
 * control that already paints itself disabled, and would hide an action inside
 * the group that has its own policy.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { createContext, useContext } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { stateDescription } from "./internal/state-description.js";
import { textStyle, useTheme } from "./internal/theme.js";

/** What the controls inside a fieldset inherit. */
interface FieldsetContextValue {
  readonly disabled: boolean;
}

const FieldsetContext = createContext<FieldsetContextValue | undefined>(
  undefined,
);

/**
 * Whether a control sits inside a disabled fieldset. Each control decides how
 * to honour it; the exported reader is the only coupling.
 */
export const useFieldsetDisabled = (): boolean =>
  useContext(FieldsetContext)?.disabled ?? false;

/** {@link Fieldset} props. */
export interface FieldsetProps extends Omit<Props, "children"> {
  /** The visible group heading and the group's accessible name. */
  readonly legend: string;
  /** Disables the controls that honour the context. Never inferred. */
  readonly disabled?: boolean;
  readonly children?: PartChildren;
}

/**
 * A named group of fields. The legend is rendered by the root — put fields, not
 * a `FieldsetLegend`, inside it.
 */
export const Fieldset = ({
  legend,
  disabled = false,
  children,
  style,
  ...rest
}: FieldsetProps) => {
  const theme = useTheme();
  assertParts(fieldsetRoot, children);

  return (
    <FieldsetContext.Provider value={{ disabled }}>
      <div
        role="group"
        aria-label={legend}
        {...rest}
        {...stateDescription(disabled, rest["aria-description"])}
        style={mergeStyles(
          {
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
          },
          style,
        )}
      >
        <FieldsetLegend disabled={disabled}>{legend}</FieldsetLegend>
        {children}
      </div>
    </FieldsetContext.Provider>
  );
};

/** {@link FieldsetLegend} props. */
export interface FieldsetLegendProps extends Props {
  /** Paints the legend with the disabled foreground. */
  readonly disabled?: boolean;
}

/** The group heading. Exported for completeness; the root renders it. */
export const FieldsetLegend = ({
  disabled = false,
  style,
  ...rest
}: FieldsetLegendProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        {
          ...textStyle(theme, "label"),
          color: disabled
            ? theme.colors.disabledForeground
            : theme.colors.foreground,
        },
        style,
      )}
    />
  );
};

/** Every part of Fieldset, so a misplaced sibling is named. */
const fieldsetParts: ReadonlyArray<PartComponent> = [Fieldset, FieldsetLegend];

/** The root hosts fields and other content, never its own legend. */
const fieldsetRoot: PartsContract = {
  parent: "Fieldset",
  family: fieldsetParts,
  accepts: [],
  hint: "Fieldset renders its legend itself; put Field, or any other control, inside it.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const fieldsetMeta = {
  name: "Fieldset",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no fieldset element and no aria-disabled in 0.10.0: the group is role=group named by its legend, disabled reaches only FieldInput, and the group/FieldInput announce Disabled through aria-description",
    "only the legend dims with disabled; controls that do not read the context keep their own disabled prop",
  ],
  docs: "docs/fieldset.mdx",
  example: "examples/fieldset.example.tsx",
  testFile: "src/behaviour/fieldset.test.tsx",
} as const;

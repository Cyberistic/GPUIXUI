/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn, FIELDSET_LEGEND, FIELDSET_ROOT } from "@gpuixui/tw";
import { createContext, useContext } from "react";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useTheme } from "./internal/theme.js";

interface FieldsetContextValue {
  readonly disabled: boolean;
}

const FieldsetContext = createContext<FieldsetContextValue | undefined>(
  undefined,
);

export const useFieldsetDisabled = (): boolean =>
  useContext(FieldsetContext)?.disabled ?? false;

export interface FieldsetProps extends Omit<Props, "children"> {
  readonly legend: string;

  readonly disabled?: boolean;

  readonly className?: string;
  readonly children?: PartChildren;
}

export const Fieldset = ({
  legend,
  disabled = false,
  className,
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
        style={mergeStyles(
          recipeStyle(cn(FIELDSET_ROOT, className), theme),
          style,
        )}
      >
        <FieldsetLegend disabled={disabled}>{legend}</FieldsetLegend>
        {children}
      </div>
    </FieldsetContext.Provider>
  );
};

export interface FieldsetLegendProps extends Props {
  readonly disabled?: boolean;

  readonly className?: string;
}

export const FieldsetLegend = ({
  disabled = false,
  className,
  style,
  ...rest
}: FieldsetLegendProps) => {
  const theme = useTheme();
  return (
    <text
      {...rest}
      style={mergeStyles(
        mergeStyles(recipeStyle(cn(FIELDSET_LEGEND, className), theme), {
          color: disabled
            ? theme.colors.disabledForeground
            : theme.colors.foreground,
        }),
        style,
      )}
    />
  );
};

const fieldsetParts: ReadonlyArray<PartComponent> = [Fieldset, FieldsetLegend];

const fieldsetRoot: PartsContract = {
  parent: "Fieldset",
  family: fieldsetParts,
  accepts: [],
  hint: "Fieldset renders its legend itself; put Field, or any other control, inside it.",
};

export const fieldsetMeta = {
  name: "Fieldset",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no fieldset element and no aria-disabled in 0.11.0: the group is role=group named by its legend, and disabled reaches only FieldInput",
    "only the legend dims with disabled; controls that do not read the context keep their own disabled prop",
  ],
  docs: "docs/fieldset.mdx",
  example: "examples/fieldset.example.tsx",
  testFile: "src/behaviour/fieldset.test.tsx",
} as const;

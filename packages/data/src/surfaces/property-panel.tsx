/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Input } from "@gpuixui/primitives";
import { accessibleName, spaceValue } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import { recordsOf } from "../internal/list.js";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { KeyValue, type KeyValueEntry } from "./key-value.js";
import { propertyName } from "./logic.js";
import { SURFACE_HEADER, SURFACE_PANEL } from "./recipe.js";

export type PropertyRow = ReadonlyPropertyRow | EditablePropertyRow;

export interface ReadonlyPropertyRow {
  readonly kind: "readonly";

  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export interface EditablePropertyRow {
  readonly kind: "editable";

  readonly key: string;
  readonly label: string;
  readonly value: string;

  readonly onChange: (next: string) => void;
}

export interface PropertyPanelProps extends Omit<Props, "children"> {
  readonly title?: string;

  readonly rows: ReadonlyArray<PropertyRow>;

  readonly labelWidth?: number;
  readonly className?: string;
}

export const isEditable = (row: PropertyRow): row is EditablePropertyRow =>
  row.kind === "editable";

export const PropertyPanel = ({
  title,
  rows,
  labelWidth,
  className,
  style,
  ...rest
}: PropertyPanelProps) => {
  const theme = useTheme();
  const heading = accessibleName(title);
  const entries: ReadonlyArray<KeyValueEntry> = Arr.map(
    recordsOf(rows),
    (row) => {
      const name = propertyName(row.label, row.key);
      return isEditable(row)
        ? {
            key: row.key,
            label: name,
            value: (
              <Input
                label={name}
                value={row.value}
                onValueChange={row.onChange}
                size="sm"
                fullWidth
                testId={`property-${row.key}`}
              />
            ),
          }
        : {
            key: row.key,
            label: name,
            value: row.value,
          };
    },
  );
  return (
    <div
      {...rest}
      role="group"
      style={mergeStyles(
        recipeStyle(cn(SURFACE_PANEL, className), theme),
        style,
      )}
    >
      {heading === undefined ? undefined : (
        <div style={recipeStyle(SURFACE_HEADER, theme)}>
          <text
            role="heading"
            aria-level={3}
            style={recipeStyle("text-xs font-medium", theme)}
          >
            {heading}
          </text>
        </div>
      )}
      <div
        style={{
          paddingLeft: spaceValue(theme, "sm"),
          paddingRight: spaceValue(theme, "sm"),
        }}
      >
        <KeyValue entries={entries} labelWidth={labelWidth} />
      </div>
    </div>
  );
};

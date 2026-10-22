/**
 * A property panel: the rows that describe one object.
 *
 * The panel owns **no copy** of the object: every row is the caller's, and an
 * edit is a callback, so a preview, a key-value list and a statistic card can
 * all read the same object and every one of them repaints in the frame the
 * edit lands (`inspector-lifecycle` measured an `Input` edit reaching the
 * readout, the preview and the tag row together).
 *
 * A row is either **read-only** or **editable**, and the difference is data
 * rather than a flag: an editable row carries the change it reports.
 *
 * ```tsx
 * <PropertyPanel
 *   title="Properties"
 *   rows={[
 *     { kind: "readonly", key: "tag", label: "Tag", value: tag },
 *     { kind: "editable", key: "name", label: "Name", value: name, onChange: setName },
 *   ]}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Input } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { KeyValue, type KeyValueEntry } from "./key-value.js";
import { SURFACE_HEADER, SURFACE_PANEL } from "./recipe.js";

/** A row the panel shows. */
export type PropertyRow = ReadonlyPropertyRow | EditablePropertyRow;

/** A row nobody can edit. */
export interface ReadonlyPropertyRow {
  readonly kind: "readonly";
  /** The stable identity a row is addressed by. */
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

/** A row the panel edits. */
export interface EditablePropertyRow {
  readonly kind: "editable";
  /** The stable identity a row is addressed by. */
  readonly key: string;
  readonly label: string;
  readonly value: string;
  /** Receives every edit of this row's value. */
  readonly onChange: (next: string) => void;
}

/** {@link PropertyPanel} props. */
export interface PropertyPanelProps extends Omit<Props, "children"> {
  /** The panel's title. */
  readonly title?: string;
  /** The rows, in the order they paint. */
  readonly rows: ReadonlyArray<PropertyRow>;
  /** The label column's width, in pixels. Defaults to `120`. */
  readonly labelWidth?: number;
  readonly className?: string;
}

/** Whether a row is one the panel edits. */
export const isEditable = (row: PropertyRow): row is EditablePropertyRow =>
  row.kind === "editable";

/**
 * A panel of property rows.
 *
 * An editable row's field is the primitives' `Input`, so it keeps the platform
 * text session while the object behind it changes.
 */
export const PropertyPanel = ({
  title,
  rows,
  labelWidth,
  className,
  style,
  ...rest
}: PropertyPanelProps) => {
  const theme = useTheme();
  const entries: ReadonlyArray<KeyValueEntry> = rows.map((row) =>
    isEditable(row)
      ? {
          key: row.key,
          label: row.label,
          value: (
            <Input
              label={row.label}
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
          label: row.label,
          value: row.value,
        },
  );
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(SURFACE_PANEL, className), theme),
        style,
      )}
    >
      {title === undefined ? undefined : (
        <div style={recipeStyle(SURFACE_HEADER, theme)}>
          <div style={recipeStyle("text-xs font-medium", theme)}>{title}</div>
        </div>
      )}
      <div
        style={{
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
        }}
      >
        <KeyValue entries={entries} labelWidth={labelWidth} />
      </div>
    </div>
  );
};

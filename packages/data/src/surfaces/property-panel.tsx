/** @jsxImportSource @gpuix/react */
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
import { accessibleName, spaceValue } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import { recordsOf } from "../internal/list.js";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { KeyValue, type KeyValueEntry } from "./key-value.js";
import { propertyName } from "./logic.js";
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
  /**
   * The panel's title. Omit it — or pass a blank name — and the panel paints no
   * heading, rather than an unnamed one.
   */
  readonly title?: string;
  /**
   * The rows, in the order they paint.
   *
   * A saved list is stored twice: a value that is not a list paints no rows,
   * and a row that does not name itself with a `key` is not a row
   * (`recordsOf`) — the panel addresses a row by its key, so a record a
   * migration lost the key from would otherwise paint a nameless field at
   * `property-undefined` instead of no row at all.
   */
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
  const heading = accessibleName(title);
  const entries: ReadonlyArray<KeyValueEntry> = Arr.map(
    recordsOf(rows),
    (row) => {
      // The label column and an editable row's field name are one reading: a
      // blank label is content that says nothing, and the row's key is the
      // identity the panel addresses it by.
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

/**
 * `PropertyPanel` — a labelled key/value editor over `@gpuixui/primitives` fields.
 *
 * Each row is discriminated by its `type` — text, number, boolean or select — so
 * the value's type rides with the row and the panel renders the matching field
 * (`Input`, `NumberField`, `Switch` or `Select`) without a cast. The panel owns
 * **no copy** of the object: every edit is `onChange` with the whole record
 * ({@link setProperty} returns a new one), so a preview and the panel can read
 * the same object and repaint in the frame the edit lands.
 *
 * ```tsx
 * <PropertyPanel
 *   title="Shape"
 *   rows={[
 *     { type: "text", key: "name", label: "Name", value: name },
 *     { type: "number", key: "count", label: "Count", value: count },
 *     { type: "boolean", key: "active", label: "Active", value: active },
 *     { type: "select", key: "kind", label: "Kind", value: kind, options: KINDS },
 *   ]}
 *   onChange={(record) => apply(record)}
 * />
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Input, NumberField, Select, Switch } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import { Match } from "effect";
import type { ReactElement } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import {
  isBooleanRow,
  isNumberRow,
  isSelectRow,
  isTextRow,
  propertyRecord,
  setProperty,
  type PropertyRecord,
  type PropertyRow,
  type PropertyValue,
} from "./logic.js";
import {
  PROPERTY_HEADER,
  PROPERTY_LABEL,
  PROPERTY_PANEL,
  PROPERTY_ROW,
} from "./recipe.js";

/** The label column's width when the caller names none. */
export const DEFAULT_LABEL_WIDTH = 120;

/** {@link PropertyPanel} props. */
export interface PropertyPanelProps extends Omit<
  Props,
  "children" | "onChange"
> {
  /** The rows, in the order they paint. */
  readonly rows: ReadonlyArray<PropertyRow>;
  /** Receives the whole record after every edit. */
  readonly onChange: (record: PropertyRecord) => void;
  /** The panel's title. */
  readonly title?: string;
  /** The label column's width, in pixels. Defaults to `120`. */
  readonly labelWidth?: number;
  readonly className?: string;
  readonly testId?: string;
}

/** The field a row's `type` names, bound to the record's edit. */
const renderField = (
  row: PropertyRow,
  record: PropertyRecord,
  onChange: (record: PropertyRecord) => void,
): ReactElement => {
  const edit = (value: PropertyValue): void =>
    onChange(setProperty(record, row.key, value));
  return Match.value(row).pipe(
    Match.when(isTextRow, (row) => (
      <Input
        value={row.value}
        onValueChange={edit}
        size="sm"
        fullWidth
        testId={`field-${row.key}`}
      />
    )),
    Match.when(isNumberRow, (row) => (
      <NumberField
        value={row.value}
        onValueChange={edit}
        size="sm"
        className="w-full"
        testId={`field-${row.key}`}
      />
    )),
    Match.when(isBooleanRow, (row) => (
      <Switch
        checked={row.value}
        onCheckedChange={edit}
        size="sm"
        testId={`field-${row.key}`}
      />
    )),
    Match.when(isSelectRow, (row) => (
      <Select
        value={row.value}
        options={row.options}
        onValueChange={edit}
        size="sm"
        fullWidth
        testId={`field-${row.key}`}
      />
    )),
    Match.exhaustive,
  );
};

/**
 * A panel of property rows, one field per row.
 *
 * The label column is fixed, so every field begins at the same `x`; the field
 * fills the row. An edit reports the whole record, never a partial one.
 */
export const PropertyPanel = ({
  rows,
  onChange,
  title,
  labelWidth = DEFAULT_LABEL_WIDTH,
  className,
  testId,
  style,
  ...rest
}: PropertyPanelProps) => {
  const theme = useTheme();
  const record = propertyRecord(rows);
  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(PROPERTY_PANEL, className), theme),
        style,
      )}
    >
      {title === undefined ? undefined : (
        <div style={recipeStyle(PROPERTY_HEADER, theme)}>
          <div style={recipeStyle("text-xs font-medium", theme)}>{title}</div>
        </div>
      )}
      <div
        style={{
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              ...recipeStyle(PROPERTY_ROW, theme),
            }}
          >
            <div
              testId={
                testId === undefined ? undefined : `${testId}-label-${row.key}`
              }
              style={{
                ...recipeStyle(PROPERTY_LABEL, theme),
                width: labelWidth,
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: labelWidth,
              }}
            >
              {row.label}
            </div>
            <div
              style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }}
            >
              {renderField(row, record, onChange)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

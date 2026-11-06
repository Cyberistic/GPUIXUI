import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import {
  Input,
  NumberField,
  NumberFieldScrubHandle,
  Select,
  Switch,
  Text,
} from "@gpuixui/primitives";
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

export const DEFAULT_LABEL_WIDTH = 120;

export interface PropertyPanelProps extends Omit<
  Props,
  "children" | "onChange"
> {
  readonly rows: ReadonlyArray<PropertyRow>;

  readonly onChange: (record: PropertyRecord) => void;

  readonly title?: string;

  readonly labelWidth?: number;
  readonly className?: string;
  readonly testId?: string;
}

const renderField = (
  row: PropertyRow,
  edit: (value: PropertyValue) => void,
): ReactElement =>
  Match.value(row).pipe(
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
        min={row.min}
        max={row.max}
        step={row.step}
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
        {rows.map((row) => {
          const edit = (value: PropertyValue): void =>
            onChange(setProperty(record, row.key, value));
          const labelStyle = {
            ...recipeStyle(PROPERTY_LABEL, theme),
            width: labelWidth,
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: labelWidth,
          };
          const labelTestId =
            testId === undefined ? undefined : `${testId}-label-${row.key}`;
          return (
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
              {isNumberRow(row) ? (
                <NumberFieldScrubHandle
                  testId={labelTestId}
                  value={row.value}
                  min={row.min}
                  max={row.max}
                  step={row.step}
                  onValueChange={edit}
                  style={labelStyle}
                >
                  <Text role="caption" tone="muted">
                    {row.label}
                  </Text>
                </NumberFieldScrubHandle>
              ) : (
                <div testId={labelTestId} style={labelStyle}>
                  {row.label}
                </div>
              )}
              <div
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  flexBasis: 0,
                  minWidth: 0,
                }}
              >
                {renderField(row, edit)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

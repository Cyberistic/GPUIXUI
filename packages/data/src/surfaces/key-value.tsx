/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { spaceValue } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { recordsOf } from "../internal/list.js";
import { readable } from "../internal/readable.js";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { propertyName } from "./logic.js";
import { KEY_VALUE_LABEL, KEY_VALUE_ROW, KEY_VALUE_VALUE } from "./recipe.js";

export interface KeyValueEntry {
  readonly key: string;

  readonly label: string;

  readonly value: ReactNode;
}

export interface KeyValueProps extends Omit<Props, "children"> {
  readonly entries: ReadonlyArray<KeyValueEntry>;

  readonly labelWidth?: number;

  readonly valueWidth?: number;
  readonly className?: string;

  readonly testId?: string;
}

export const DEFAULT_LABEL_WIDTH = 120;

export const KeyValue = ({
  entries,
  labelWidth = DEFAULT_LABEL_WIDTH,
  valueWidth,
  className,
  style,
  testId,
  ...rest
}: KeyValueProps) => {
  const theme = useTheme();
  const labelTrack =
    Number.isFinite(labelWidth) && labelWidth > 0
      ? labelWidth
      : DEFAULT_LABEL_WIDTH;
  const valueTrack =
    valueWidth !== undefined && Number.isFinite(valueWidth) && valueWidth > 0
      ? valueWidth
      : undefined;
  return (
    <div
      {...rest}
      role="list"
      style={mergeStyles(recipeStyle(cn("", className), theme), style)}
    >
      {Arr.map(recordsOf(entries), (entry) => (
        <div
          key={entry.key}
          role="listitem"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: spaceValue(theme, "sm"),
            ...recipeStyle(KEY_VALUE_ROW, theme),
          }}
        >
          <text
            testId={
              testId === undefined ? undefined : `${testId}-label-${entry.key}`
            }
            style={{
              ...recipeStyle(KEY_VALUE_LABEL, theme),
              width: labelTrack,
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: labelTrack,
            }}
          >
            {propertyName(entry.label, entry.key)}
          </text>
          {readable(entry.value, {
            testId:
              testId === undefined ? undefined : `${testId}-value-${entry.key}`,
            style: {
              ...recipeStyle(KEY_VALUE_VALUE, theme),
              ...(valueTrack === undefined
                ? { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 }
                : {
                    width: valueTrack,
                    flexGrow: 0,
                    flexShrink: 0,
                    flexBasis: valueTrack,
                  }),
            },
          })}
        </div>
      ))}
    </div>
  );
};

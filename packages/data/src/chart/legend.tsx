/** @jsxImportSource @gpuix/react */
import { mergeStyles } from "@gpuix/react/floating";
import type { Props } from "@gpuix/react";
import { iconStepValue } from "@gpuixui/primitives/core";
import * as Arr from "effect/Array";
import { recordsOf } from "../internal/list.js";
import { textStyle, themeColors, useTheme } from "../theme.js";
import { CHART_LEGEND, CHART_LEGEND_ITEM, CHART_SWATCH } from "./recipe.js";
import { recipeStyle } from "../recipe.js";
import { seriesName } from "./logic.js";
import type { LegendShape } from "./frame.js";

export interface ChartLegendItem {
  readonly key: string;

  readonly label: string;

  readonly color: string;

  readonly value?: string;
}

export type { LegendShape, TooltipIndicator } from "./frame.js";

export interface ChartLegendProps extends Omit<Props, "children"> {
  readonly items: ReadonlyArray<ChartLegendItem>;

  readonly shape?: LegendShape;
  readonly testId?: string;
}

export const ChartLegend = ({
  items,
  shape = "square",
  testId,
  style,
  ...rest
}: ChartLegendProps) => {
  const theme = useTheme();
  const colors = themeColors(theme);
  const rows = recordsOf(items);
  return (
    <div
      {...rest}
      testId={testId}
      style={mergeStyles(recipeStyle(CHART_LEGEND, theme), style)}
    >
      {Arr.map(rows, (item) => (
        <div key={item.key} style={recipeStyle(CHART_LEGEND_ITEM, theme)}>
          <div
            testId={
              testId === undefined ? undefined : `${testId}-swatch-${item.key}`
            }
            style={{
              ...recipeStyle(CHART_SWATCH, theme),
              width:
                shape === "line"
                  ? iconStepValue(theme, "xs") * 2
                  : iconStepValue(theme, "xs"),
              height: shape === "line" ? 2 : iconStepValue(theme, "xs"),
              borderRadius:
                shape === "dot"
                  ? iconStepValue(theme, "xs") / 2
                  : shape === "line"
                    ? 1
                    : undefined,
              backgroundColor: item.color,
            }}
          />
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: colors.mutedForeground,
            }}
          >
            {item.value === undefined
              ? seriesName(item.label, item.key)
              : `${seriesName(item.label, item.key)} ${item.value}`}
          </text>
        </div>
      ))}
    </div>
  );
};

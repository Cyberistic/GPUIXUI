/** @jsxImportSource @gpuix/react */
/**
 * The legend: one swatch and one label per series, in the colours they paint.
 *
 * It is its own module because every chart family needs it — the cartesian
 * ones, the polar ones and the ones that lay themselves out — and a legend
 * that lived in one of them would make the others import a chart.
 */

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
  /** The row's words. A blank label reads as `key`. */
  readonly label: string;
  /** A theme colour, usually a swatch from `seriesColors`. */
  readonly color: string;
  /** A value the row prints after its words, already formatted. */
  readonly value?: string;
}

export type { LegendShape, TooltipIndicator } from "./frame.js";

/** {@link ChartLegend} props. */
export interface ChartLegendProps extends Omit<Props, "children"> {
  /**
   * The rows, in paint order.
   *
   * A saved legend writes `null` where it carried no rows, so only a list is a
   * list: a slot with no list paints no rows rather than throwing out of the
   * render.
   */
  readonly items: ReadonlyArray<ChartLegendItem>;
  /** The mark beside each row: a square (default), a dot or a line. */
  readonly shape?: LegendShape;
  readonly testId?: string;
}

/**
 * The legend: one swatch and one label per series, in the colours they paint.
 *
 * The words are painted beside the colour, so a colour repeats what the text
 * already says — a reader who cannot separate two hues still reads the series.
 */
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


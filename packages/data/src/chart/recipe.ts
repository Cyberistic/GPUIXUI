/**
 * The chart's resting appearance.
 *
 * A chart paints no surface of its own: it sits on the card or page the caller
 * puts it on, and its marks are the theme's categorical scale (see the Themes
 * section of the package README). The plot's size is a measurement, so it is
 * set in `style`, not in a class.
 */

/** A chart's frame: title, plot, labels and legend in one column. */
export const CHART_ROOT = "flex flex-col gap-2";

/** The plot's box: the layers are absolutely positioned inside it. */
export const CHART_PLOT = "relative shrink-0";

/** The y-axis tick column. */
export const CHART_AXIS = "flex flex-col justify-between shrink-0";

/** One axis label: a quiet caption. */
export const CHART_AXIS_LABEL = "text-xs text-muted-foreground";

/** The row of category labels under the plot. */
export const CHART_CATEGORIES = "flex flex-row shrink-0";

/** One category label, centred in its slot. */
export const CHART_CATEGORY =
  "flex flex-row justify-center text-xs text-muted-foreground";

/** The legend: a row of swatches and labels. */
export const CHART_LEGEND = "flex flex-row flex-wrap items-center gap-3";

/** One legend entry. */
export const CHART_LEGEND_ITEM = "flex flex-row items-center gap-1.5";

/** A legend's colour swatch. */
export const CHART_SWATCH = "rounded-sm shrink-0";

/** A legend or category label. */
export const CHART_LABEL = "text-xs text-muted-foreground";

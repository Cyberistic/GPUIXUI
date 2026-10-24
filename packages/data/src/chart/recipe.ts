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

/**
 * One category's slot, centred and clipped.
 *
 * A slot is `plot width / labels`, so a label longer than its slot would paint
 * over the label beside it — the runtime clips a box only when it is told to
 * (`sidebar-clip-lifecycle`, and the `Rating` half star's measured clip). The
 * clip is what makes two neighbouring categories readable, and it is the
 * documented limitation rather than an ellipsis alone: a slot too narrow for its
 * word stops at its edge.
 */
export const CHART_CATEGORY =
  "flex flex-row justify-center overflow-hidden text-xs text-muted-foreground";

/** One category's words: one line, cut at the slot it is given. */
export const CHART_CATEGORY_LABEL =
  "text-xs text-muted-foreground text-ellipsis whitespace-nowrap";

/** The legend: a row of swatches and labels. */
export const CHART_LEGEND = "flex flex-row flex-wrap items-center gap-3";

/** One legend entry. */
export const CHART_LEGEND_ITEM = "flex flex-row items-center gap-1.5";

/** A legend's colour swatch. */
export const CHART_SWATCH = "rounded-sm shrink-0";

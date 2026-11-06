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
export const CHART_LEGEND =
  "flex flex-row flex-wrap items-center justify-center gap-3";

/** One legend entry. */
export const CHART_LEGEND_ITEM = "flex flex-row items-center gap-1.5";

/** A legend's colour swatch. */
export const CHART_SWATCH = "rounded-sm shrink-0";

/**
 * The hover hit zone: one per category, filling the plot's height.
 *
 * It paints nothing; it is the element that reports which column the pointer is
 * over, so the pressure of a press never falls on a mask that ignores it.
 */
export const CHART_TOOLTIP_ZONE = "shrink-0";

/** The hover readout: the theme's popover surface, floating over the plot. */
export const CHART_TOOLTIP =
  "flex flex-col gap-1 rounded-md border border-border bg-popover p-2";

/** The hovered category's name. */
export const CHART_TOOLTIP_HEAD = "text-xs";

/** One series in the readout: swatch, name and value. */
export const CHART_TOOLTIP_ROW = "flex flex-row items-center gap-1";

/** The value, at the row's end. */
export const CHART_TOOLTIP_VALUE = "text-xs";

/** A bar's value, painted above it. */
export const CHART_VALUE_LABEL = "text-xs";

/** The brush strip under the plot: a track the drag runs across. */
export const CHART_BRUSH = "shrink-0";

/** The brush's track, at the plot's width. */
export const CHART_BRUSH_TRACK =
  "relative h-4 overflow-hidden rounded-sm bg-muted pointer-events-none";

/** The window the brush selects. */
export const CHART_BRUSH_BAND =
  "top-0 bottom-0 rounded-sm opacity-40 pointer-events-none";

/** One edge of the selected window. */
export const CHART_BRUSH_HANDLE =
  "top-0 bottom-0 w-1 rounded-sm pointer-events-none";

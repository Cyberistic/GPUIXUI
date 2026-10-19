/**
 * Copy-and-own component dimensions: a drawer, a dialog, the shortest message
 * viewport, the date field, the carousel marks, the timeline marker and the
 * notification inbox are fixed surfaces, so they merge field by field and the
 * rest of the group inherits. This file is type-checked and asserted in
 * `dimensions.test.ts`.
 */
import { extendTheme, lightTheme } from "./index.js";

/**
 * A theme with a narrower default drawer, a wider default dialog, a taller
 * message viewport, a wider date field, a larger timeline marker in a wider
 * column and a wider notification inbox.
 */
export const narrowDrawerTheme = extendTheme(lightTheme, {
  dimensions: {
    drawerWidthMd: 360,
    dialogWidthMd: 520,
    chatViewportMinHeight: 200,
    dateFieldWidth: 240,
    timelineMarkerSize: 12,
    timelineMarkerColumnWidth: 24,
    notificationPanelWidth: 360,
    notificationListMaxHeight: 320,
  },
});

/** The base the example extends, for consumers that need it. */
export const dimensionsBaseTheme = lightTheme;

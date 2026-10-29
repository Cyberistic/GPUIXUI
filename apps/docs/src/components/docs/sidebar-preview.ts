/**
 * The sidebar drawing's geometry and its controls' words.
 *
 * The component states its widths and its collapse modes in
 * `packages/components/src/sidebar/logic.ts`; a browser drawing cannot mount a
 * GPUix tree, so it mirrors them here and `sidebar-preview.test.tsx` reads them
 * back out of the component. The panel is 256px, the icon rail 48px, and an
 * offcanvas collapse parks the panel one width past the window's edge because
 * the runtime has no `transform`.
 */

/** The collapse modes, in the order the toggle family lists them. */
export const SIDEBAR_MODES = ["offcanvas", "icon", "none"] as const;

/** One of the component's `SidebarCollapsible` names. */
export type SidebarMode = (typeof SIDEBAR_MODES)[number];

/** shadcn's 16rem: the open panel and the room it reserves. */
export const SIDEBAR_WIDTH = 256;

/** shadcn's 3rem: the icon rail. */
export const SIDEBAR_ICON_WIDTH = 48;

/** The width the panel paints. */
export const panelWidth = (mode: SidebarMode, open: boolean): number =>
  mode === "icon" && !open ? SIDEBAR_ICON_WIDTH : SIDEBAR_WIDTH;

/**
 * How far the panel sits past the window's edge: only offcanvas travels.
 *
 * The runtime has no `transform`, so the drawing moves the panel by a negative
 * edge offset rather than translating a layer.
 */
export const panelOffset = (mode: SidebarMode, open: boolean): number =>
  mode === "offcanvas" && !open ? -SIDEBAR_WIDTH : 0;

/**
 * The room the panel reserves beside it.
 *
 * The panel is in flow, so its own occupied width is the room the inset starts
 * after: an icon rail gives its shrink back, and a parked offcanvas panel gives
 * its whole width back.
 */
export const panelGap = (mode: SidebarMode, open: boolean): number =>
  mode === "none" || open
    ? SIDEBAR_WIDTH
    : mode === "icon"
      ? SIDEBAR_ICON_WIDTH
      : 0;

/** The collapse control's label: the action, not the state. */
export const collapseLabel = (open: boolean): string =>
  open ? "Collapse sidebar" : "Expand sidebar";

/**
 * The sidebar's geometry and stored names.
 *
 * shadcn states all of this in CSS variables and `data-*` selectors; the
 * renderer has neither, so the numbers and the guards live here as data. Every
 * width is shadcn's own: 16rem (256), 3rem (48) and 18rem (288), with the
 * floating/inset variants paying the icon width plus their `p-2` gutter.
 *
 * A stored `side`, `variant` or `collapsible` is read through a guard: a
 * workspace may keep a name this release renamed or dropped, and the table read
 * is the first thing the layout does.
 */

import * as Schema from "effect/Schema";

/** The window edge a sidebar occupies. */
export type SidebarSide = "left" | "right";

/** The surface the sidebar wears. */
export type SidebarVariant = "sidebar" | "floating" | "inset";

/** What collapsing the sidebar does. */
export type SidebarCollapsible = "offcanvas" | "icon" | "none";

/** The two words a `useSidebar().state` answers with. */
export type SidebarState = "expanded" | "collapsed";

/** shadcn's `16rem`, the open panel and its gap. */
export const SIDEBAR_WIDTH = 256;

/** shadcn's `3rem`, the icon rail. */
export const SIDEBAR_WIDTH_ICON = 48;

/** shadcn's `18rem`, the mobile sheet. */
export const SIDEBAR_WIDTH_MOBILE = 288;

/** The `p-2` gutter the floating and inset variants keep around the panel. */
export const SIDEBAR_GUTTER = 8;

/** Below this window width the sidebar is a sheet, the docs site's breakpoint. */
export const SIDEBAR_BREAKPOINT = 768;

/** shadcn's keyboard shortcut: ⌘/Ctrl + this key. */
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const Sides = Schema.Literals(["left", "right"]);
const Variants = Schema.Literals(["sidebar", "floating", "inset"]);
const Collapsibles = Schema.Literals(["offcanvas", "icon", "none"]);

/** A stored edge, or the default `left` when the name is not one we ship. */
export const sideOf = (side: unknown): SidebarSide =>
  Schema.is(Sides)(side) ? side : "left";

/** A stored variant, or the default `sidebar`. */
export const variantOf = (variant: unknown): SidebarVariant =>
  Schema.is(Variants)(variant) ? variant : "sidebar";

/** A stored collapse mode, or the default `offcanvas`. */
export const collapsibleOf = (collapsible: unknown): SidebarCollapsible =>
  Schema.is(Collapsibles)(collapsible) ? collapsible : "offcanvas";

/** Whether a window width is below the sheet breakpoint. */
export const isMobileWidth = (width: number): boolean =>
  Number.isFinite(width) && width < SIDEBAR_BREAKPOINT;

/** What the panel and its gap are sized from. */
export interface SidebarLayout {
  readonly open: boolean;
  readonly variant: SidebarVariant;
  readonly collapsible: SidebarCollapsible;
}

/** Whether the panel is collapsed to its icon rail. */
export const isIconCollapsed = ({
  open,
  collapsible,
}: SidebarLayout): boolean => !open && collapsible === "icon";

/**
 * The width the panel paints.
 *
 * An offcanvas collapse keeps the full width: the panel travels out of the
 * window rather than shrinking. A floating or inset panel keeps its gutter, so
 * its collapsed width is the icon rail plus both sides of `p-2`.
 */
export const sidebarWidth = ({
  open,
  variant,
  collapsible,
}: SidebarLayout): number => {
  if (collapsible === "none" || open) return SIDEBAR_WIDTH;
  if (collapsible === "offcanvas") return SIDEBAR_WIDTH;
  return variant === "sidebar"
    ? SIDEBAR_WIDTH_ICON
    : SIDEBAR_WIDTH_ICON + SIDEBAR_GUTTER * 2;
};

/**
 * The width the panel's in-flow gap reserves.
 *
 * This is the one number the content beside the sidebar pays: a full panel, the
 * icon rail, or nothing while an offcanvas panel is parked off-screen.
 */
export const sidebarGap = (layout: SidebarLayout): number => {
  if (layout.collapsible === "none" || layout.open) return SIDEBAR_WIDTH;
  if (layout.collapsible === "offcanvas") return 0;
  return layout.variant === "sidebar"
    ? SIDEBAR_WIDTH_ICON
    : SIDEBAR_WIDTH_ICON + SIDEBAR_GUTTER * 2;
};

/**
 * How far the panel sits past its own window edge.
 *
 * `0` while it is on screen; `-width` while an offcanvas panel is parked
 * outside, which is the only travel the runtime can paint (it has no
 * `transform`).
 */
export const sidebarOffset = (layout: SidebarLayout): number =>
  !layout.open && layout.collapsible === "offcanvas"
    ? -sidebarWidth(layout)
    : 0;

/** The gap a `SidebarInset` adds, and the edge it keeps when the panel is gone. */
export interface SidebarInsetBox {
  readonly margin: number;
  readonly marginLeft: number;
  readonly marginRight: number;
  readonly radius: number;
}

/**
 * The inset's box for the variant and side.
 *
 * Only the inset variant floats beside the panel: it keeps a `p-2` margin on
 * every side except the one the panel is anchored to, and that edge becomes a
 * margin once the panel collapses to icons. Every other variant sits flush.
 */
export const sidebarInsetBox = (
  layout: SidebarLayout,
  side: SidebarSide,
): SidebarInsetBox =>
  layout.variant !== "inset"
    ? { margin: 0, marginLeft: 0, marginRight: 0, radius: 0 }
    : {
        margin: SIDEBAR_GUTTER,
        marginLeft:
          side === "left" ? (layout.open ? 0 : SIDEBAR_GUTTER) : SIDEBAR_GUTTER,
        marginRight:
          side === "right"
            ? layout.open
              ? 0
              : SIDEBAR_GUTTER
            : SIDEBAR_GUTTER,
        radius: 12,
      };

/**
 * A deterministic skeleton width in `50..90` percent.
 *
 * shadcn draws a random width per skeleton; randomness in a render makes a
 * screenshot and a bounds assertion differ between runs, so the width is a hash
 * of the skeleton's `useId`. Different rows still differ, the same row does not
 * change between renders.
 */
export const skeletonWidth = (seed: string): string => {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 41;
  }
  return `${50 + hash}%`;
};

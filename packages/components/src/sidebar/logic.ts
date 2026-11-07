import * as Schema from "effect/Schema";

export type SidebarSide = "left" | "right";

export type SidebarVariant = "sidebar" | "floating" | "inset";

export type SidebarCollapsible = "offcanvas" | "icon" | "none";

export type SidebarState = "expanded" | "collapsed";

export const SIDEBAR_WIDTH = 256;

export const SIDEBAR_WIDTH_ICON = 48;

export const SIDEBAR_ICON_ROW = 32;

export const railPadding = (iconWidth: number): number =>
  Math.max(0, (iconWidth - SIDEBAR_ICON_ROW) / 2);

export const SIDEBAR_WIDTH_MOBILE = 288;

export const SIDEBAR_GUTTER = 8;

export const SIDEBAR_BREAKPOINT = 768;

export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

const Sides = Schema.Literals(["left", "right"]);
const Variants = Schema.Literals(["sidebar", "floating", "inset"]);
const Collapsibles = Schema.Literals(["offcanvas", "icon", "none"]);

export const sideOf = (side: unknown): SidebarSide =>
  Schema.is(Sides)(side) ? side : "left";

export const variantOf = (variant: unknown): SidebarVariant =>
  Schema.is(Variants)(variant) ? variant : "sidebar";

export const collapsibleOf = (collapsible: unknown): SidebarCollapsible =>
  Schema.is(Collapsibles)(collapsible) ? collapsible : "offcanvas";

export const isMobileWidth = (width: number): boolean =>
  Number.isFinite(width) && width < SIDEBAR_BREAKPOINT;

export interface SidebarLayout {
  readonly open: boolean;
  readonly variant: SidebarVariant;
  readonly collapsible: SidebarCollapsible;

  readonly width?: number;

  readonly iconWidth?: number;
}

export const isIconCollapsed = ({
  open,
  collapsible,
}: SidebarLayout): boolean => !open && collapsible === "icon";

export const sidebarWidth = (layout: SidebarLayout): number => {
  const { open, variant, collapsible } = layout;
  const full = layout.width ?? SIDEBAR_WIDTH;
  const icon = layout.iconWidth ?? SIDEBAR_WIDTH_ICON;
  if (collapsible === "none" || open) return full;
  if (collapsible === "offcanvas") return full;
  return variant === "sidebar" ? icon : icon + SIDEBAR_GUTTER * 2;
};

export const sidebarGap = (layout: SidebarLayout): number => {
  const full = layout.width ?? SIDEBAR_WIDTH;
  const icon = layout.iconWidth ?? SIDEBAR_WIDTH_ICON;
  if (layout.collapsible === "none" || layout.open) return full;
  if (layout.collapsible === "offcanvas") return 0;
  return layout.variant === "sidebar" ? icon : icon + SIDEBAR_GUTTER * 2;
};

export const sidebarOffset = (layout: SidebarLayout): number =>
  !layout.open && layout.collapsible === "offcanvas"
    ? -sidebarWidth(layout)
    : 0;

export interface SidebarInsetBox {
  readonly margin: number;
  readonly marginLeft: number;
  readonly marginRight: number;
  readonly radius: number;
}

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

export const skeletonWidth = (seed: string): string => {
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) % 41;
  }
  return `${50 + hash}%`;
};

/**
 * Tab rules: which tab a focus move selects, and where the rail's indicator sits.
 *
 * The activation rule is the one thing that genuinely differs between the two
 * modes; every index question (next enabled trigger, wrap, first/last) belongs
 * to `internal/collection.ts`. The indicator is pure arithmetic over two
 * measured boxes, so the placement is testable without a window.
 */

/** When a tab becomes selected relative to the keyboard focus. */
export type TabsActivation = "automatic" | "manual";

/** The two axes a tab list can run along. */
export type TabsOrientation = "horizontal" | "vertical";

/**
 * Whether moving focus onto a tab also selects it.
 *
 * `automatic` selects as focus moves, so browsing with the arrow keys shows a
 * panel immediately. `manual` leaves the selection alone until Enter or Space,
 * which is what a tab whose panel starts a network request wants.
 */
export const selectsOnFocus = (activation: TabsActivation): boolean =>
  activation === "automatic";

/** A measured element: `renderer.getElementBounds`' own shape. */
export interface MeasuredBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The indicator's box in the rail's padding-box space. */
export interface IndicatorBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** What {@link indicatorBox} needs. */
export interface IndicatorInput {
  /** The rail's own bounds: content-box origin, padding-box size. */
  readonly list: MeasuredBox;
  /** The selected trigger's bounds, in window space. */
  readonly trigger: MeasuredBox;
  /** The rail's padding, which is the offset between those two boxes. */
  readonly padding: number;
  readonly orientation: TabsOrientation;
  readonly thickness: number;
}

/** The bar's default thickness in px. */
export const INDICATOR_THICKNESS = 2;

/**
 * A usable bar thickness: a missing or non-finite value is the default, a
 * finite one truncates and never drops below one pixel. A malformed number must
 * not hide the rail's only selected cue (the plan-651/661 rule).
 */
export const indicatorThickness = (thickness?: number): number =>
  thickness === undefined || !Number.isFinite(thickness)
    ? INDICATOR_THICKNESS
    : Math.max(1, Math.trunc(thickness));

/**
 * The bar's box on the rail's inner edge, spanning the selected trigger.
 *
 * `getElementBounds` reports a list at its content-box origin with a
 * padding-box size, while an absolute child is placed against the padding box
 * (measured, plan 715 §2), so the trigger's window-space offset loses the
 * rail's padding. The bar hugs the inner bottom edge (horizontal) or inner left
 * edge (vertical) and is as long as the selected trigger.
 */
export const indicatorBox = ({
  list,
  trigger,
  padding,
  orientation,
  thickness,
}: IndicatorInput): IndicatorBox =>
  orientation === "horizontal"
    ? {
        left: trigger.x - list.x + padding,
        top: list.height - thickness,
        width: trigger.width,
        height: thickness,
      }
    : {
        left: 0,
        top: trigger.y - list.y + padding,
        width: thickness,
        height: trigger.height,
      };

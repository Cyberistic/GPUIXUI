/**
 * The popover's geometry, as the side and collision drawings compute it.
 *
 * The component asks GPUix's anchored layer for a side and a gap and lets the
 * runtime snap a surface inside the window by `collisionPadding`. A drawing has
 * to do that arithmetic itself, so the numbers live here and
 * `popover-preview.test.tsx` reads the component's two defaults out of its
 * source rather than trusting a second copy.
 */

/** The gap the component leaves between a trigger and its surface. */
export const POPOVER_SIDE_OFFSET = 6;

/** The margin a snapped surface keeps from the window edge. */
export const POPOVER_COLLISION_PADDING = 8;

/** The four sides the component's `side` names. */
export const POPOVER_SIDES = ["top", "right", "bottom", "left"] as const;

/** A side a popover can open on. */
export type PopoverSide = (typeof POPOVER_SIDES)[number];

/** The side's label, as the drawing's controls read it. */
export const sideLabel = (side: PopoverSide): string =>
  `${side.charAt(0).toUpperCase()}${side.slice(1)}`;

/** The panel's width in the drawings, so the arithmetic is predictable. */
export const POPOVER_PANEL_WIDTH = 240;

/** The frame the side, alignment and collision drawings measure against. */
export const POPOVER_FRAME_WIDTH = 600;

/** The right padding the collision drawing's trigger sits at. */
export const POPOVER_FRAME_PADDING = 24;

/** The "Columns" action's width, measured in the drawing's button. */
export const POPOVER_TRIGGER_WIDTH = 74;

/**
 * The left edge a panel keeps inside a frame, after the runtime's snap.
 *
 * `requested` is where `align="start"` would paint the panel — the trigger's own
 * left edge; its right edge may not pass `frameWidth - margin`, so the panel
 * slides back **along its own side**. The component's rule is a flip only when
 * the requested side has no room at all, and a slide when the surface merely
 * overhangs the frame.
 */
export const pullBack = (
  requested: number,
  panelWidth: number,
  frameWidth: number,
  margin: number = POPOVER_COLLISION_PADDING,
): number =>
  Math.max(margin, Math.min(requested, frameWidth - margin - panelWidth));

/** How far a panel had to slide back from where it was requested. */
export const pullBackBy = (
  requested: number,
  panelWidth: number,
  frameWidth: number,
  margin: number = POPOVER_COLLISION_PADDING,
): number => requested - pullBack(requested, panelWidth, frameWidth, margin);

/** The collision drawing's numbers, read by the drawing and by its test. */
export const collisionLayout = () => {
  const requested =
    POPOVER_FRAME_WIDTH - POPOVER_FRAME_PADDING - POPOVER_TRIGGER_WIDTH;

  return {
    requested,
    left: pullBack(requested, POPOVER_PANEL_WIDTH, POPOVER_FRAME_WIDTH),
    pulledBack: pullBackBy(requested, POPOVER_PANEL_WIDTH, POPOVER_FRAME_WIDTH),
    frameWidth: POPOVER_FRAME_WIDTH,
    panelWidth: POPOVER_PANEL_WIDTH,
    margin: POPOVER_COLLISION_PADDING,
  };
};

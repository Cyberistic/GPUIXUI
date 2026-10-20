/**
 * The hidden-surface recipe, as data (plan `819`).
 *
 * A tabbed pane, a carousel slide and a multi-step form all keep an inactive
 * surface mounted and out of the way. GPUix 0.10.0 makes that **two**
 * mechanisms: `visibility: "hidden"` takes the surface out of the paint, and
 * `pointerEvents: "none"` keeps a positioned layer from occluding the press
 * that belongs to the sibling beneath it (`renderer.rs` applies `invisible()`,
 * `should_occlude` reads `pointerEvents` first). Dropping either half leaves a
 * pane that paints over its neighbour or steals its clicks.
 *
 * The recipe lives here so the probe and a consuming component share one shape,
 * and `slotProblems` can name the half that is missing.
 */

/** An absolutely positioned layer that fills its parent. */
export interface SlotStyle {
  readonly position: "absolute";
  readonly top: 0;
  readonly left: 0;
  readonly right: 0;
  readonly bottom: 0;
  readonly visibility: "visible" | "hidden";
  readonly pointerEvents: "auto" | "none";
}

/** The recipe: the active layer paints and takes hits; the other does neither. */
export const hiddenSlot = (active: boolean): SlotStyle => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  visibility: active ? "visible" : "hidden",
  pointerEvents: active ? "auto" : "none",
});

/** Why a slot style is not the recipe. Empty means correct. */
export const slotProblems = (
  slot: SlotStyle,
  active: boolean,
): ReadonlyArray<string> =>
  active
    ? [
        ...(slot.visibility === "visible" ? [] : ["an active slot must paint"]),
        ...(slot.pointerEvents === "none"
          ? ["an active slot must take hits"]
          : []),
      ]
    : [
        ...(slot.visibility === "hidden"
          ? []
          : ["an inactive slot must be hidden"]),
        ...(slot.pointerEvents === "none"
          ? []
          : ["an inactive slot must not take hits"]),
      ];

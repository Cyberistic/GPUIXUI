/**
 * How a tab list decides which tab a focus move selects.
 *
 * This is the one rule that genuinely differs between the two activation modes;
 * every index question (next enabled trigger, wrap, first/last) belongs to
 * `internal/collection.ts`.
 */

/** When a tab becomes selected relative to the keyboard focus. */
export type TabsActivation = "automatic" | "manual";

/**
 * Whether moving focus onto a tab also selects it.
 *
 * `automatic` selects as focus moves, so browsing with the arrow keys shows a
 * panel immediately. `manual` leaves the selection alone until Enter or Space,
 * which is what a tab whose panel starts a network request wants.
 */
export const selectsOnFocus = (activation: TabsActivation): boolean =>
  activation === "automatic";

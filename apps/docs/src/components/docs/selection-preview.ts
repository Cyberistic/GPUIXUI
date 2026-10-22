/**
 * The keyboard contract a selection control shares, as a browser preview
 * applies it.
 *
 * A checkbox, a switch and a radio toggle on Enter (key **down**) or Space (key
 * **up**), and a held key's repeat events do nothing. The split is deliberate:
 * a Space press calls `preventDefault()` so a scroll container does not move
 * while the control waits for the release, which is why activating on the press
 * would double-toggle.
 *
 * The rule is read from `core/keyboard.ts` by the previews' tests rather than
 * trusted, because the wrong edge is a visible double toggle rather than a type
 * error.
 */

/** Which edge of a key event a preview receives. */
export type KeyPhase = "down" | "up";

/**
 * Whether a key edge activates the control — the rule `decideActivation`
 * applies.
 */
export const activates = (
  key: string,
  phase: KeyPhase,
  held = false,
): boolean => {
  if (held) return false;
  if (key === "Enter") return phase === "down";
  if (key === " ") return phase === "up";
  return false;
};

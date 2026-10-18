/**
 * Phrases that deny the live GPUix surface this site ships (plans 460, 483).
 *
 * A denial is about **this site**, not the runtime: "GPUix 0.10.0 cannot render
 * <capability>" is a legitimate limitation, and so is "the site does not run
 * this configuration" about a generator. The denial must name the surface, so
 * those sentences stay allowed. Read by the MDX guard and the landing guard so
 * one phrasing cannot be covered in one place only.
 */
const DENIALS = [
  /\bdoes not render (?:it|GPUix)\b/i,
  /\bcannot be shown running in a browser\b/i,
  /\b(?:this|the) site (?:never|does not|doesn't|cannot|can't) (?:render|run|show)(?:s|ed)? (?:GPUix|it|the (?:component|library))\b/i,
] as const;

/** True when reader-facing prose denies the live surface the site ships. */
export const deniesLiveSurface = (prose: string): boolean =>
  DENIALS.some((pattern) => pattern.test(prose));

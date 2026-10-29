/**
 * The decorative surfaces the Components lane groups as Effects.
 *
 * They are pages like any other component, but a reader looks for them by what
 * they do — draw, move, glow — rather than by the control they replace, so the
 * Components folder carries them under one category instead of scattering them
 * through the alphabetical list. A slug here is the page's URL tail; the list
 * is read by the sidebar (`page-tree.ts`) and the index's own grouping, so a
 * new effect is added in one place.
 */
export const effectSlugs: ReadonlyArray<string> = [
  "bubbles",
  "counting-number",
  "fireworks",
  "glyph",
  "gradient",
  "gradient-text",
  "gravity-stars",
  "hexagon",
  "liquid-button",
  "magnetic",
  "motion-grid",
  "particles",
  "ripple-button",
  "shine-button",
  "rotating-text",
  "scroll-fade",
  "scroll-progress",
  "sliding-number",
  "sliding-text",
  "stars",
  "typing-text",
];

/** Whether a page's URL names an effect. */
export const isEffect = (url: string): boolean =>
  effectSlugs.some((slug) => url.endsWith(`/${slug}`));

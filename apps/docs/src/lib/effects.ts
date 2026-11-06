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
  "shimmer",
  "rotating-text",
  "scroll-fade",
  "scroll-progress",
  "sliding-number",
  "sliding-text",
  "stars",
  "typing-text",
];

export const isEffect = (url: string): boolean =>
  effectSlugs.some((slug) => url.endsWith(`/${slug}`));

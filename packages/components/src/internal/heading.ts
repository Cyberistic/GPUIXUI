/**
 * Heading levels for parts that render `role="heading"`.
 *
 * The level belongs to the document outline, not to the component: the same
 * card is a level-2 section under a page title and a level-4 block inside a
 * settings group. Each part keeps the level it shipped with as the default.
 */

/** A valid `aria-level` for a heading. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The level to announce: the typed prop, else the caller's raw `aria-level`,
 * else the part's default. The typed prop wins when both are supplied.
 */
export const headingLevel = (
  level: HeadingLevel | undefined,
  authored: number | undefined,
  fallback: HeadingLevel,
): number => level ?? authored ?? fallback;

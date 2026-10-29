/**
 * A page's frontmatter, as the build reads it.
 *
 * Generated indexes read the title and description the page itself declares, so
 * a page's row cannot drift from the page. Only scalars are needed here, and a
 * package may quote a value a YAML parser would reject, so the reader strips one
 * pair of surrounding quotes rather than pulling a parser into the bundle.
 */

/** The frontmatter block, without its fences; empty when a page has none. */
export const frontmatterOf = (source: string): string =>
  /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";

/** One scalar from a frontmatter block. */
export const frontmatterField = (
  head: string,
  key: string,
): string | undefined => {
  const value = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(head)?.[1]?.trim();
  if (value === undefined) return undefined;
  return value.startsWith('"') || value.startsWith("'")
    ? value.slice(1, -1)
    : value;
};

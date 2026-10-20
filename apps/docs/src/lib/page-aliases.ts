/**
 * The phrases readers use for a hand-authored page whose title and summary
 * cannot outrank a component name (plan 598). `theme switch`, `system theme`
 * and `color scheme` all name Dark mode, but Switch's title token and its live
 * scene's instruction are scored above a page summary phrase; `demo`, `sample`
 * and `how to use` name a page the index never retrieves for them.
 *
 * This is editorial search vocabulary, not page content: it stays out of the
 * frontmatter and is read only by the ranker. A second measured pass covers the
 * integration vocabulary (plan 599) — `react`, `provider`, `mono`, `escape`,
 * `disabled` and `how to install`, each a word for a section or a convention
 * rather than a title. `page-aliases.test.ts` proves
 * every key is a page `source.getPages()` serves, no key is a component page
 * (that is plan 566's table), no term is shared, and no term shadows a page or
 * component name — an alias that names something else misroutes the query.
 */
export const pageAliases: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  [
    "/docs/dark-mode",
    [
      "theme switch",
      "switch theme",
      "theme toggle",
      "toggle theme",
      "theme switcher",
      "system theme",
      "color scheme",
      "colour scheme",
    ],
  ],
  [
    "/docs/getting-started",
    [
      "how to use",
      "import",
      "imports",
      "react",
      "react provider",
      "provider",
      "providers",
    ],
  ],
  [
    "/docs/component-api",
    ["escape", "escape key", "disabled", "disabled state"],
  ],
  ["/docs/data-display", ["select row", "selectable rows"]],
  ["/docs/examples", ["demo", "sample"]],
  ["/docs/installation", ["version", "versions", "how to install"]],
  ["/docs/typography", ["mono", "mono font", "monospace"]],
]);

/** Every alias term, flattening the table for the guards. */
export const pageAliasTerms: ReadonlyArray<string> = [
  ...pageAliases.values(),
].flat();

/**
 * `0` when an alias names the whole query; `undefined` otherwise. An alias is
 * exact-only: a prefix would let `theme` claim Dark mode through
 * `theme switch`, and a word inside a phrase would let `switch` claim it too.
 */
export const pageAliasRank = (
  url: string,
  query: string,
): number | undefined => {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  return (pageAliases.get(url) ?? []).some((alias) => alias === needle)
    ? 0
    : undefined;
};

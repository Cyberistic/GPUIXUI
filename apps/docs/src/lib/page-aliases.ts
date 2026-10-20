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
 * `disabled` and `how to install` — a third the keyboard conventions
 * (plan 601), and a fourth the runtime vocabulary (plan 602): `effect`,
 * `managed runtime`, `browser`, `ssr` and `hydration` name Architecture's
 * `## State and Effect` and `## What runs where` sections. A fifth covers the
 * failure vocabulary (plan 603): `not working`, `nothing renders`, `blank
 * window`, `no provider`, `font not applied`, `unsupported host`, `debug`,
 * `help` and `support` name the Troubleshooting page. A sixth covers the
 * performance vocabulary (plan 605): `benchmark`, `fps`, `frame rate`, `10k
 * rows` and `memory` name the Performance page, while `virtualized` and
 * `large list` stay with Data display and List. `page-aliases.test.ts`
 * proves every key is a page `source.getPages()` serves, no key is a component
 * page (that is plan 566's table), no term is shared, and no term shadows a page
 * or component name — an alias that names something else misroutes the query.
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
  ["/docs/accessibility", ["keyboard focus"]],
  [
    "/docs/performance",
    [
      "benchmark",
      "benchmarks",
      "fps",
      "frame rate",
      "frames per second",
      "10k rows",
      "10000 rows",
      "memory",
      "memory usage",
      "slow list",
      "slow table",
    ],
  ],
  [
    "/docs/component-api",
    [
      "escape",
      "escape key",
      "disabled",
      "disabled state",
      "keyboard",
      "keyboard shortcuts",
      "keyboard support",
      "enter key",
      "space key",
      "arrow keys",
      "tab order",
    ],
  ],
  ["/docs/data-display", ["select row", "selectable rows"]],
  ["/docs/examples", ["demo", "sample"]],
  ["/docs/installation", ["version", "versions", "how to install"]],
  [
    "/docs/troubleshooting",
    [
      "not working",
      "does not work",
      "nothing renders",
      "component not rendering",
      "blank window",
      "blank screen",
      "crash",
      "no provider",
      "missing provider",
      "font not applied",
      "unsupported host",
      "debug",
      "problem",
      "help",
      "support",
    ],
  ],
  [
    "/docs/theming",
    [
      "motion",
      "animation",
      "easing",
      "reduced motion",
      "prefers reduced motion",
    ],
  ],
  ["/docs/typography", ["mono", "mono font", "monospace"]],
  [
    "/docs/architecture",
    [
      "effect",
      "effect ts",
      "effect runtime",
      "managed runtime",
      "fiber",
      "browser",
      "browser build",
      "run in browser",
      "runs in browser",
      "web app",
      "webassembly",
      "ssr",
      "server rendering",
      "hydration",
    ],
  ],
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

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
 * `large list` stay with Data display and List. A seventh covers the typographic
 * measure (`line height`, `line spacing`, `leading`), the platform question
 * (`does it work on windows`) and the localization vocabulary (`i18n`, `rtl`,
 * `text direction`) — plan 607. An eighth names the phrase a page already owns
 * but the index loses to a component token — `state management` on Component
 * API, `transparency`, `width` and `letter spacing` on Styling, `rendering` and
 * `server side rendering` on Architecture, `speed`, `credits`, `vitest`,
 * `panel` and the colour-vision words — plan 608. A ninth covers deployment
 * (plan 609): `deployment`, `hosting`, `cloudflare`, `workers`, `self host` and
 * `custom domain` name the Deployment page, while `publish` stays on
 * Installation and `host props` stays on Component API. `page-aliases.test.ts`
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
  ["/docs/license", ["credits", "acknowledgements", "acknowledgments"]],
  ["/docs/contributing", ["vitest", "publish docs"]],
  [
    "/docs/site-search",
    [
      "cmd k",
      "cmd+k",
      "ctrl k",
      "ctrl+k",
      "search index",
      "search indexes",
      "search ranking",
      "search results",
      "search api",
      "api/search",
      "lexical search",
      "full text search",
      "full-text search",
      "search document",
      "index document",
      "search architecture",
    ],
  ],
  [
    "/docs/deployment",
    [
      "deployment",
      "deploy",
      "deploying",
      "hosting",
      "host",
      "self-host",
      "self host",
      "self-hosting",
      "self hosting",
      "cloudflare",
      "cloudflare workers",
      "workers",
      "custom domain",
      "production build",
    ],
  ],
  ["/docs/workspace", ["panel", "panels", "pane", "panes"]],
  [
    "/docs/styling",
    [
      "classname",
      "class name",
      "css",
      "css class",
      "tailwind",
      "sx",
      "sx prop",
      "stylesheet",
      "style prop",
      "inline style",
      "style attribute",
      "media query",
      "pseudo class",
      "pseudo element",
      "custom styles",
      "override styles",
      "transparency",
      "rounded",
      "corner radius",
      "width",
      "height",
      "responsive",
      "responsive layout",
      "responsive design",
      "breakpoint",
      "breakpoints",
      "letter spacing",
      "letter-spacing",
      "tracking",
      "character spacing",
    ],
  ],
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
      "speed",
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
      "state management",
      "state ownership",
      "controlled state",
      "controlled component",
      "uncontrolled state",
      "host props",
      "host properties",
      "shared host props",
    ],
  ],
  ["/docs/data-display", ["select row", "selectable rows"]],
  ["/docs/examples", ["demo", "sample"]],
  [
    "/docs/installation",
    [
      "version",
      "versions",
      "how to install",
      "does it work on windows",
      "does it work on linux",
      "does it work on mac",
      "does it work on macos",
      "works on windows",
      "work on windows",
      "works on linux",
      "runs on windows",
      "runs on linux",
      "is windows supported",
      "is linux supported",
      "is mac supported",
    ],
  ],
  [
    "/docs/layouts",
    [
      "localization",
      "localisation",
      "i18n",
      "internationalization",
      "internationalisation",
      "translation",
      "translations",
      "locale",
      "locales",
      "rtl",
      "ltr",
      "right to left",
      "left to right",
      "text direction",
      "mirroring",
      "mirrored layout",
    ],
  ],
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
      "colourblind",
      "colorblind",
      "colour blindness",
      "color blindness",
    ],
  ],
  [
    "/docs/typography",
    [
      "mono",
      "mono font",
      "monospace",
      "line height",
      "line-height",
      "line spacing",
      "leading",
    ],
  ],
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
      "server side",
      "server side rendering",
      "client side",
      "rendering",
      "server",
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

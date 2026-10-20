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
 *
 * The tenth block (plan 611) covers the adoption vocabulary: `migration`,
 * `porting`, `shadcn`, `radix` and `asChild` name the porting guide, while
 * `tailwind` and `className` stay on Styling (plan 606) — the porting page links
 * that owner rather than claiming its subject.
 *
 * The eleventh block (plan 614) covers three measured gaps. `design system` had
 * no owner although Theming renders every value the repository's design-system
 * document describes. `data grid`, the two-word phrase plan 579 named but never
 * guarded, still returned Stack because the summary says `datagrids` and
 * `descriptionMatchRank` compares words, not phrases. The failure phrasings
 * (`nothing shows`, `invisible text`, `colors are wrong`) name the two
 * Troubleshooting sections that already answer them, and `window resize` names
 * Styling's media-query replacement.
 *
 * The twelfth block (plan 617) covers the licence question readers ask before
 * they install anything: `is it free`, `can i use this`, `commercial use`,
 * `price` and `copyright` name the License page, which now answers them.
 * `cost` stays on Performance's cost model and `terms` on the component-page
 * guide's search-vocabulary section.
 *
 * The thirteenth block (plan 618) covers the two classes plan 617 left open.
 * The question forms — `how to contribute`, `where is the source`,
 * `does it work with next.js`, `coming soon`, `coverage` — are whole sentences,
 * so only an exact alias reaches them; the workspace frame words (`title bar`,
 * `status bar`, `split view`) name the App shell and Workspace compositions.
 * `split panes` deliberately keeps reaching the roadmap's `Resizable split
 * panes` target (plan 564), so `split view` is a separate phrase, not a
 * prefix.
 *
 * The fourteenth block (plan 619) covers the trust question: `security`,
 * `privacy`, `telemetry`, `analytics`, `cookies`, `data collection`,
 * `vulnerability`, `security policy`, `report a vulnerability`, `gdpr`,
 * `sandbox` and `remote code` name the Security and privacy page. `tracking`
 * stays on Styling — it is that page's letter-spacing alias — and `support` and
 * `help` stay on Troubleshooting.
 *
 * Plan 620 adds the operational vocabulary to the pages that own it: the
 * release words (`changelog`, `release notes`, `releases`, `upgrade`,
 * `breaking changes`) on Installation, the conduct, command-line and offline
 * words on Contributing, the self-hosting variable on Deployment, and `faq` on
 * the Introduction.
 *
 * Plan 624 adds the ref vocabulary to Component API: `ref`, `forwardRef`,
 * `element handle`, `imperative handle`, `scroll into view` and the instance
 * phrases name the section that explains the element a ref receives. `reference`
 * keeps the API reference page, because an alias matches the whole query only.
 *
 * Plan 625 adds the window vocabulary: the chrome words (`traffic lights`,
 * `traffic light`, `window controls`, `native title bar`, `title bar
 * transparent`), the window actions (`fullscreen`, `minimize`, `maximize`,
 * `set window title`), the Wayland surface (`wayland`, `layer shell`), geometry
 * and insets (`window insets`, `safe area`, `keyboard inset`, `ime`), the
 * absences a reader asks about (`system tray`, `tray icon`, `native menu`,
 * `application menu`) and the runtime tools (`debug frame overlay`, `devtools`,
 * `file dialog`, `file picker`). `title bar`, `titlebar` and `window chrome`
 * stay on the App shell pattern, which owns the in-content frame; `window size`
 * and `windows` stay on Styling and Theming, where they mean responsive sizing
 * and the platform style; `menu bar` stays Navigation menu's component alias;
 * `dialog` and `menu` keep their component pages.
 *
 * Plan 626 adds the element vocabulary. `image element`, `svg element`,
 * `canvas element`, `code element`, `diff element`, `markdown element`,
 * `intrinsic elements`, `jsx elements`, `render markdown` and the element
 * catalogue's synonyms name Native elements, and `error boundary`,
 * `uncaught error`, `component throws` and `runtime error` name
 * Troubleshooting's render-error section. The plain words (`img`, `svg`,
 * `code`, `diff`, `markdown`, `input`, `text`) are deliberately absent from
 * this table: a page alias matches the whole query only, and `input`, `text`
 * and `svg` keep the component page each already had. `code` moved to the
 * element page by its authored summary (plan 626 §8), not by an alias.
 *
 * Plan 628 adds the testing vocabulary. The absent tools (`jsdom`, `happy-dom`,
 * React Testing Library, Playwright, Cypress, WebDriver, Storybook), the
 * framework names (`jest`, `mock`, `mocking`, `spy`, `fixture`), the snapshot
 * words and the test spellings (`test renderer`, `component test`, `unit test`,
 * `a11y tree`, `keyboard test`, `headless test`) name Testing your components,
 * whose `## What is not provided` section answers each. The smoke phrases
 * (`smoke test`, `native smoke test`, `smoke suite`) name Native smoke suite,
 * which is the repository's own suite, not a consumer's test. `test` and
 * `testing` move to the new page by its title; `vitest`, `ci` and `github
 * actions` stay on Contributing, `screenshot` on Previews, `coverage` on the
 * Roadmap, `selection` on Selection and find, `accessibility tree` on
 * Accessibility, and `snapshot`/`golden` deliberately leave Architecture.
 *
 * Plan 629 adds the native text theme vocabulary: `syntax theme`, `syntax
 * colors`, `code theme`, `code metrics`, `diff theme`, `markdown metrics`,
 * `gutter` and `caret color` name the runtime's second theme. The component
 * targets (`syntax highlighting`, `code editor`, `diff viewer`, `rich text`)
 * stay on the Roadmap; `word diff`, `line numbers` and `markdown table` stay on
 * Native elements; `theme` stays on Theming and `text`/`input` on their
 * component pages.
 *
 * Plan 630 covers the measured question forms. The ranker used to treat every
 * query word as a name prefix, so `to` — a prefix of Toggle and Tooltip — made
 * `how to theme the app` return Toggle before Theming; a function word is no
 * longer name evidence. The page aliases below name the owners the questions
 * and reader words reached only through prose: the style fields (`padding`,
 * `hover effect`, `set width`) on Styling, the measured centring vocabulary on
 * Layouts (which gained a `## Centring` section), `build a table` on Data
 * display, the overlay dismissal phrases on Component API, and `tab index`,
 * `tabindex` and `autofocus` on Accessibility. `center` alone stays on Component
 * API: an alias is exact, so `center content` cannot claim the bare word.
 */
export const pageAliases: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  ["/docs", ["faq", "frequently asked questions"]],
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
    "/docs/accessibility",
    [
      "keyboard focus",
      "touch",
      "touchscreen",
      "touch screen",
      "stylus",
      "pen input",
      "pointer events",
      "pointer input",
      "mouse events",
      "mouse input",
      "skip link",
      "tab index",
      "tabindex",
      "autofocus",
    ],
  ],
  [
    "/docs/license",
    [
      "credits",
      "acknowledgements",
      "acknowledgments",
      "is it free",
      "is it open source",
      "is this free",
      "can i use this",
      "can i use it",
      "can i use this commercially",
      "commercial use",
      "commercial license",
      "price",
      "pricing",
      "free",
      "copyright",
      "terms of use",
    ],
  ],
  [
    "/docs/contributing",
    [
      "vitest",
      "publish docs",
      "ci",
      "continuous integration",
      "github actions",
      "checks",
      "quality gate",
      "how to contribute",
      "how do i contribute",
      "how can i contribute",
      "contribute",
      "contributing guide",
      "where is the source",
      "where is the source code",
      "where is the code",
      "source code",
      "code of conduct",
      "coc",
      "command line",
      "command-line",
      "offline",
      "offline access",
      "service worker",
      "service workers",
    ],
  ],
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
    "/docs/component-pages",
    [
      "add component",
      "add a component",
      "adding a component",
      "new component",
      "create component",
      "create a component",
      "write a component",
      "component template",
      "first component",
      "component docs",
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
      "environment variable",
      "environment variables",
      "env var",
      "env vars",
      "site url",
    ],
  ],
  [
    "/docs/workspace",
    ["panel", "panels", "pane", "panes", "split view", "split views"],
  ],
  [
    "/docs/patterns/app-shell",
    [
      "title bar",
      "titlebar",
      "title bars",
      "status bar",
      "statusbar",
      "window frame",
      "app frame",
      "application frame",
      "app chrome",
      "window chrome",
    ],
  ],
  [
    "/docs/roadmap",
    [
      "coming soon",
      "unreleased",
      "not yet available",
      "planned components",
      "future components",
      "coverage",
      "coverage map",
      "what is implemented",
    ],
  ],
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
      "padding",
      "set width",
      "how to set width",
      "hover effect",
      "responsive",
      "responsive layout",
      "responsive design",
      "breakpoint",
      "breakpoints",
      "letter spacing",
      "letter-spacing",
      "tracking",
      "character spacing",
      "window resize",
      "resize window",
      "window size",
    ],
  ],
  [
    "/docs/native-elements",
    [
      "image element",
      "image elements",
      "set image",
      "load image",
      "svg element",
      "svg elements",
      "canvas element",
      "canvas elements",
      "code element",
      "code elements",
      "highlighted code block",
      "diff element",
      "diff elements",
      "markdown element",
      "markdown elements",
      "render markdown",
      "intrinsic elements",
      "jsx elements",
      "native element",
      "element catalogue",
    ],
  ],
  [
    "/docs/native-text-theme",
    [
      "native text",
      "text theme",
      "syntax theme",
      "syntax themes",
      "syntax color",
      "syntax colors",
      "syntax colour",
      "syntax colours",
      "code theme",
      "code themes",
      "code colors",
      "code colours",
      "code metrics",
      "diff theme",
      "diff themes",
      "diff colors",
      "diff colours",
      "diff metrics",
      "markdown theme",
      "markdown themes",
      "markdown colors",
      "markdown colours",
      "markdown metrics",
      "gutter",
      "gutters",
      "caret color",
      "caret colour",
    ],
  ],
  [
    "/docs/selection",
    [
      "text selection",
      "select text",
      "selected text",
      "clear selection",
      "selection text",
      "get selected text",
      "find in page",
      "find text",
      "search highlight",
      "highlight matches",
      "match count",
      "highlight text",
      "text highlight",
      "find and highlight",
    ],
  ],
  [
    "/docs/testing",
    [
      "jsdom",
      "happy-dom",
      "happy dom",
      "react testing library",
      "testing library",
      "playwright",
      "cypress",
      "webdriver",
      "webdriverio",
      "storybook",
      "jest",
      "mock",
      "mocking",
      "spy",
      "fixture",
      "test fixture",
      "snapshot test",
      "snapshot tests",
      "snapshot",
      "snapshots",
      "golden",
      "golden image",
      "golden test",
      "visual regression",
      "visual regression test",
      "e2e",
      "end to end",
      "component test",
      "component tests",
      "unit test",
      "unit tests",
      "test renderer",
      "test setup",
      "testing setup",
      "mock renderer",
      "mocking renderer",
      "a11y tree",
      "keyboard test",
      "headless test",
      "headless tests",
      "headless testing",
    ],
  ],
  [
    "/docs/native-testing",
    [
      "smoke test",
      "smoke tests",
      "native smoke",
      "native smoke test",
      "smoke suite",
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
      "bundle size",
      "download size",
      "page weight",
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
      "ref",
      "refs",
      "forwardref",
      "forward ref",
      "element handle",
      "element handles",
      "element instance",
      "imperative handle",
      "imperative handles",
      "public instance",
      "instance handle",
      "instance handles",
      "scroll into view",
      "scrollintoview",
      "callback",
      "callbacks",
      "outside click",
      "click outside",
      "close on outside click",
    ],
  ],
  [
    "/docs/data-display",
    [
      "data grid",
      "select row",
      "selectable rows",
      "virtualization",
      "virtualisation",
      "build a table",
      "how to build a table",
    ],
  ],
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
      "changelog",
      "change log",
      "release notes",
      "releases",
      "upgrade",
      "upgrading",
      "breaking changes",
    ],
  ],
  [
    "/docs/layouts",
    [
      "center content",
      "how to center content",
      "centering",
      "centring",
      "center a div",
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
      "nothing shows",
      "empty window",
      "window is empty",
      "screen is empty",
      "invisible text",
      "text invisible",
      "text is invisible",
      "why is my text invisible",
      "label is invisible",
      "colors are wrong",
      "colours are wrong",
      "wrong colors",
      "wrong colours",
      "crash",
      "error boundary",
      "uncaught error",
      "component throws",
      "runtime error",
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
      "design system",
      "design systems",
      "motion",
      "animation",
      "easing",
      "reduced motion",
      "prefers reduced motion",
      "colourblind",
      "colorblind",
      "colour blindness",
      "color blindness",
      "macos style",
      "macos theme",
      "windows style",
      "windows theme",
      "windows",
      "gnome",
      "kde",
      "linux style",
      "linux theme",
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
  [
    "/docs/porting-from-shadcn",
    [
      "migration",
      "migrate",
      "migrating",
      "porting",
      "port",
      "convert",
      "conversion",
      "shadcn",
      "shadcn ui",
      "shadcn/ui",
      "from shadcn",
      "radix",
      "radix ui",
      "aschild",
      "as child",
      "nextjs",
      "next.js",
      "remix",
      "tauri",
      "electron",
      "does it work with next.js",
      "does it work with nextjs",
      "does it work with remix",
      "does it work with electron",
      "does it work with tauri",
    ],
  ],
  [
    "/docs/security",
    [
      "security",
      "privacy",
      "telemetry",
      "analytics",
      "cookies",
      "data collection",
      "vulnerability",
      "vulnerabilities",
      "security policy",
      "report a vulnerability",
      "report vulnerabilities",
      "gdpr",
      "sandbox",
      "sandboxing",
      "remote code",
      "network requests",
      "network access",
      "tracking cookies",
      "browser tracking",
    ],
  ],
  [
    "/docs/window",
    [
      "traffic light",
      "traffic lights",
      "window controls",
      "native title bar",
      "title bar transparent",
      "fullscreen",
      "full screen",
      "minimize",
      "minimize window",
      "maximize",
      "maximize window",
      "set window title",
      "window title",
      "wayland",
      "layer shell",
      "safe area",
      "window insets",
      "keyboard inset",
      "ime",
      "system tray",
      "tray icon",
      "native menu",
      "application menu",
      "transparent window",
      "blurred background",
      "debug frame overlay",
      "frame overlay",
      "devtools",
      "file dialog",
      "file picker",
      "path picker",
      "app id",
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

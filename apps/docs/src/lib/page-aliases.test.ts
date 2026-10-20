import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { componentSymbols } from "@/component-meta/symbols";
import { aliasesFor } from "./component-aliases";
import { pageAliases, pageAliasRank } from "./page-aliases";
import { componentSearchUrl, search } from "./search";
import { source } from "./source";

/**
 * Guards the page-vocabulary table (plan 598). The bug being prevented is a
 * hand-authored page a reader names correctly but the site never ranks first:
 * `theme switch`, `system theme` and `color scheme` returned Switch, Toggle or
 * Color picker because a component title token and a live-scene instruction are
 * scored above a page summary phrase, and `demo`, `sample`, `how to use`,
 * `import` and `version` returned prose, another page, or the page's own
 * heading.
 *
 * These tests fail when the table outlives a page, claims a component page, is
 * keyed without terms, stores a term the ranker cannot compare, shares a term
 * between pages, shadows a page or component name (the misroute class), matches
 * a prefix instead of the whole query, or loses its wiring in `search()`.
 *
 * Plan 608 adds the eighth block: the exact phrase a page already owns but the
 * index loses to a component token (`state management`, `transparency`,
 * `rendering`, `panel`, `speed`, `credits`, `vitest`, the colour-vision words).
 * Every new term is an `owned` row, and the queries that must keep their owner
 * stay in `regressions` — including the measured limits `tabel` and
 * `read only`, so a future fix has to change the row deliberately. Plan 610
 * deliberately moves `search index` from that list to `owned`: the Site search
 * page now owns it.
 *
 * Plan 614 adds the eleventh block: `design system` (Theming's subject, which
 * reached a text-area limitation), the two-word `data grid` phrase plan 579
 * named but never guarded, the failure phrasings that name Troubleshooting's two
 * existing sections, and `window resize`. The regression rows keep `grid`,
 * `resize`, `text`, `label`, `empty state` and `color picker` with their owners,
 * so a phrase alias cannot steal a shorter word.
 *
 * Plan 618 adds the thirteenth block: the nine measured question forms and
 * frame words plan 617 recorded (`how to contribute`, `does it work with
 * next.js`, `title bar`, `status bar`, `split view`, `where is the source`,
 * `coming soon`, `coverage`). The regression rows pin `split panes` to the
 * roadmap target, so the new `split view` alias proves the table is
 * exact-only.
 *
 * Plan 619 adds the trust vocabulary: `security`, `privacy`, `telemetry`,
 * `analytics`, `cookies`, `data collection`, `vulnerability`, `security policy`
 * and the reporting/network terms name Security and privacy. The regression
 * row pins `tracking` to Styling, where it means letter spacing.
 *
 * Plan 620 adds the operational vocabulary: release words name Installation,
 * conduct/command-line/offline words name Contributing, the self-hosting
 * variable names Deployment, and `faq` names the Introduction. The regression
 * rows keep `pwa`, `bundle size` and `version` where they already belong.
 *
 * Plan 621 adds the input surface: touch, stylus, pointer and mouse phrases and
 * the site's `skip link` name Accessibility, and the three platform style
 * phrases name Theming. `platform style` stays pinned to Theming's section.
 *
 * Plan 624 adds the ref vocabulary: `ref`, `refs`, `forwardRef`, `element
 * handle`, `imperative handle`, `scroll into view` and the instance phrases name
 * Component API's `## Refs and element handles`. The regression rows keep
 * `reference` on the API reference page and `scrollbar` on Scrollable
 * containers, proving the table matches the whole query only.
 *
 * Plan 628 adds the testing vocabulary: the absent tools (`jsdom`,
 * `playwright`, `storybook`, React Testing Library, WebDriver), the test
 * spellings (`test renderer`, `component test`, `a11y tree`, `keyboard test`),
 * the snapshot words and `fixture`/`mock`/`spy` name Testing your components,
 * while the smoke phrases name Native smoke suite. The regressions keep
 * `vitest`/`ci` on Contributing, `screenshot` on Previews, `coverage` on the
 * Roadmap, `selection` on Selection and find, and `transition` on Theming's
 * motion section — the page's first wording used that word and lost the row.
 *
 * Plan 630 adds the question forms and words the ranker's prefix matching
 * misrouted: `how to theme the app` returned Toggle because `to` is a prefix of
 * both Toggle and Tooltip, and the measured style, centring, table, overlay and
 * accessibility words reached prose or a different page. `center` moves to
 * Layouts with its new sourced `## Centring` section; `spacing`, `read only`
 * and `table` stay pinned, so the new exact phrases cannot steal the words the
 * earlier passes assigned.
 *
 * Plan 632 adds the async vocabulary: `async`, `data fetching`, `suspense`,
 * `useeffect`, `isloading`, `cache`, `retry`, `polling`, `cancellation`,
 * `promises`, `effectful`, `server state` and `error handling` name Async data
 * and effects. The regression rows keep `loading` on Spinner, `state management`
 * on Component API, `managed runtime` on Architecture, `fetch` on Security and
 * `debounce` on Testing's clock section, because the async page links those
 * owners rather than claiming their words.
 */
const normalize = (value: string): string => value.trim().toLowerCase();

const pageUrls = new Set(source.getPages().map((page) => page.url));

const componentUrls = new Set(
  components.map((component) => componentSearchUrl(component)),
);

const componentNames = new Set(
  components
    .flatMap((component) => [
      component.title,
      component.slug,
      ...componentSymbols(component),
      ...component.parts.map((part) => part.name),
      ...component.api,
      ...aliasesFor(component.slug),
    ])
    .map(normalize),
);

const pageTitles = new Set(
  source.getPages().map((page) => normalize(page.data.title)),
);

const terms = [...pageAliases].flatMap(([url, aliases]) =>
  aliases.map((term) => ({ url, term })),
);

describe("page aliases", () => {
  it("keys every alias to a page that exists", () => {
    const missing = [...pageAliases.keys()].filter((url) => !pageUrls.has(url));
    expect(missing).toEqual([]);
  });

  it("keys no component page", () => {
    const componentPages = [...pageAliases.keys()].filter((url) =>
      componentUrls.has(url),
    );
    expect(componentPages).toEqual([]);
  });

  it("gives every keyed page at least one term", () => {
    const empty = [...pageAliases]
      .filter(([, aliases]) => aliases.length === 0)
      .map(([url]) => url);
    expect(empty).toEqual([]);
  });

  it("stores every term lower-case, trimmed and non-empty", () => {
    const malformed = terms
      .filter(({ term }) => term !== normalize(term) || term.length === 0)
      .map(({ term }) => term);
    expect(malformed).toEqual([]);
  });

  it("uses a term for one page only", () => {
    const counts = new Map<string, number>();
    terms.forEach(({ term }) => counts.set(term, (counts.get(term) ?? 0) + 1));
    const shared = [...counts]
      .filter(([, count]) => count > 1)
      .map(([term]) => term);
    expect(shared).toEqual([]);
  });

  it("does not shadow a page title", () => {
    const shadowing = terms
      .filter(({ term }) => pageTitles.has(term))
      .map(({ term }) => term);
    expect(shadowing).toEqual([]);
  });

  it("does not shadow a component title, name or alias", () => {
    const shadowing = terms
      .filter(({ term }) => componentNames.has(term))
      .map(({ term }) => term);
    expect(shadowing).toEqual([]);
  });

  it("matches an alias only as the whole query", () => {
    expect(pageAliasRank("/docs/dark-mode", "theme switch")).toBe(0);
    expect(pageAliasRank("/docs/dark-mode", "  THEME SWITCH ")).toBe(0);
    expect(pageAliasRank("/docs/dark-mode", "theme")).toBeUndefined();
    expect(pageAliasRank("/docs/dark-mode", "switch")).toBeUndefined();
    expect(pageAliasRank("/docs/dark-mode", "theme sw")).toBeUndefined();
    expect(pageAliasRank("/docs/not-aliased", "theme switch")).toBeUndefined();
    expect(pageAliasRank("/docs/dark-mode", "   ")).toBeUndefined();
  });
});

const owned = [
  ["theme switch", "/docs/dark-mode"],
  ["switch theme", "/docs/dark-mode"],
  ["theme toggle", "/docs/dark-mode"],
  ["toggle theme", "/docs/dark-mode"],
  ["theme switcher", "/docs/dark-mode"],
  ["system theme", "/docs/dark-mode"],
  ["color scheme", "/docs/dark-mode"],
  ["colour scheme", "/docs/dark-mode"],
  ["demo", "/docs/examples"],
  ["sample", "/docs/examples"],
  ["how to use", "/docs/getting-started"],
  ["import", "/docs/getting-started"],
  ["version", "/docs/installation"],
  ["hint", "/docs/components/inline-validation"],
  ["supporting text", "/docs/components/inline-validation"],
  ["react", "/docs/getting-started"],
  ["react provider", "/docs/getting-started"],
  ["provider", "/docs/getting-started"],
  ["providers", "/docs/getting-started"],
  ["mono", "/docs/typography"],
  ["mono font", "/docs/typography"],
  ["monospace", "/docs/typography"],
  ["select row", "/docs/data-display"],
  ["selectable rows", "/docs/data-display"],
  ["escape", "/docs/component-api"],
  ["escape key", "/docs/component-api"],
  ["disabled", "/docs/component-api"],
  ["disabled state", "/docs/component-api"],
  ["how to install", "/docs/installation"],
  ["motion", "/docs/theming"],
  ["animation", "/docs/theming"],
  ["easing", "/docs/theming"],
  ["keyboard", "/docs/component-api"],
  ["keyboard shortcuts", "/docs/component-api"],
  ["keyboard support", "/docs/component-api"],
  ["enter key", "/docs/component-api"],
  ["space key", "/docs/component-api"],
  ["arrow keys", "/docs/component-api"],
  ["tab order", "/docs/component-api"],
  ["keyboard focus", "/docs/accessibility"],
  ["reduced motion", "/docs/theming"],
  ["prefers reduced motion", "/docs/theming"],
  ["effect", "/docs/architecture"],
  ["effect ts", "/docs/architecture"],
  ["effect runtime", "/docs/architecture"],
  ["managed runtime", "/docs/architecture"],
  ["fiber", "/docs/architecture"],
  ["browser", "/docs/architecture"],
  ["browser build", "/docs/architecture"],
  ["run in browser", "/docs/architecture"],
  ["runs in browser", "/docs/architecture"],
  ["web app", "/docs/architecture"],
  ["webassembly", "/docs/architecture"],
  ["ssr", "/docs/architecture"],
  ["server rendering", "/docs/architecture"],
  ["hydration", "/docs/architecture"],
  ["troubleshooting", "/docs/troubleshooting"],
  ["not working", "/docs/troubleshooting"],
  ["does not work", "/docs/troubleshooting"],
  ["nothing renders", "/docs/troubleshooting"],
  ["component not rendering", "/docs/troubleshooting"],
  ["blank window", "/docs/troubleshooting"],
  ["blank screen", "/docs/troubleshooting"],
  ["crash", "/docs/troubleshooting"],
  ["no provider", "/docs/troubleshooting"],
  ["missing provider", "/docs/troubleshooting"],
  ["font not applied", "/docs/troubleshooting"],
  ["unsupported host", "/docs/troubleshooting"],
  ["debug", "/docs/troubleshooting"],
  ["problem", "/docs/troubleshooting"],
  ["help", "/docs/troubleshooting"],
  ["support", "/docs/troubleshooting"],
  ["benchmark", "/docs/performance"],
  ["benchmarks", "/docs/performance"],
  ["fps", "/docs/performance"],
  ["frame rate", "/docs/performance"],
  ["frames per second", "/docs/performance"],
  ["10k rows", "/docs/performance"],
  ["10000 rows", "/docs/performance"],
  ["memory", "/docs/performance"],
  ["memory usage", "/docs/performance"],
  ["slow list", "/docs/performance"],
  ["slow table", "/docs/performance"],
  ["line height", "/docs/typography"],
  ["line-height", "/docs/typography"],
  ["line spacing", "/docs/typography"],
  ["leading", "/docs/typography"],
  ["does it work on windows", "/docs/installation"],
  ["does it work on linux", "/docs/installation"],
  ["works on windows", "/docs/installation"],
  ["is windows supported", "/docs/installation"],
  ["localization", "/docs/layouts"],
  ["localisation", "/docs/layouts"],
  ["i18n", "/docs/layouts"],
  ["internationalization", "/docs/layouts"],
  ["translation", "/docs/layouts"],
  ["locale", "/docs/layouts"],
  ["rtl", "/docs/layouts"],
  ["right to left", "/docs/layouts"],
  ["text direction", "/docs/layouts"],
  ["mirroring", "/docs/layouts"],
  ["credits", "/docs/license"],
  ["acknowledgements", "/docs/license"],
  ["acknowledgments", "/docs/license"],
  ["is it free", "/docs/license"],
  ["is it open source", "/docs/license"],
  ["is this free", "/docs/license"],
  ["can i use this", "/docs/license"],
  ["can i use it", "/docs/license"],
  ["can i use this commercially", "/docs/license"],
  ["commercial use", "/docs/license"],
  ["commercial license", "/docs/license"],
  ["price", "/docs/license"],
  ["pricing", "/docs/license"],
  ["free", "/docs/license"],
  ["copyright", "/docs/license"],
  ["terms of use", "/docs/license"],
  ["vitest", "/docs/contributing"],
  ["panel", "/docs/workspace"],
  ["panels", "/docs/workspace"],
  ["pane", "/docs/workspace"],
  ["panes", "/docs/workspace"],
  ["state management", "/docs/component-api"],
  ["state ownership", "/docs/component-api"],
  ["controlled state", "/docs/component-api"],
  ["controlled component", "/docs/component-api"],
  ["uncontrolled state", "/docs/component-api"],
  ["transparency", "/docs/styling"],
  ["rounded", "/docs/styling"],
  ["corner radius", "/docs/styling"],
  ["width", "/docs/styling"],
  ["height", "/docs/styling"],
  ["responsive", "/docs/styling"],
  ["responsive layout", "/docs/styling"],
  ["responsive design", "/docs/styling"],
  ["breakpoint", "/docs/styling"],
  ["breakpoints", "/docs/styling"],
  ["letter spacing", "/docs/styling"],
  ["letter-spacing", "/docs/styling"],
  ["tracking", "/docs/styling"],
  ["character spacing", "/docs/styling"],
  ["speed", "/docs/performance"],
  ["rendering", "/docs/architecture"],
  ["server", "/docs/architecture"],
  ["server side", "/docs/architecture"],
  ["server side rendering", "/docs/architecture"],
  ["client side", "/docs/architecture"],
  ["colourblind", "/docs/theming"],
  ["colorblind", "/docs/theming"],
  ["colour blindness", "/docs/theming"],
  ["color blindness", "/docs/theming"],
  ["cmd k", "/docs/site-search"],
  ["search index", "/docs/site-search"],
  ["search ranking", "/docs/site-search"],
  ["api/search", "/docs/site-search"],
  ["migration", "/docs/porting-from-shadcn"],
  ["migrate", "/docs/porting-from-shadcn"],
  ["porting", "/docs/porting-from-shadcn"],
  ["convert", "/docs/porting-from-shadcn"],
  ["shadcn", "/docs/porting-from-shadcn"],
  ["shadcn ui", "/docs/porting-from-shadcn"],
  ["from shadcn", "/docs/porting-from-shadcn"],
  ["radix", "/docs/porting-from-shadcn"],
  ["aschild", "/docs/porting-from-shadcn"],
  ["tailwind", "/docs/styling"],
  ["classname", "/docs/styling"],
  ["sx", "/docs/styling"],
  ["add component", "/docs/component-pages"],
  ["add a component", "/docs/component-pages"],
  ["adding a component", "/docs/component-pages"],
  ["new component", "/docs/component-pages"],
  ["create component", "/docs/component-pages"],
  ["create a component", "/docs/component-pages"],
  ["write a component", "/docs/component-pages"],
  ["component template", "/docs/component-pages"],
  ["first component", "/docs/component-pages"],
  ["component docs", "/docs/component-pages"],
  ["ci", "/docs/contributing"],
  ["continuous integration", "/docs/contributing"],
  ["github actions", "/docs/contributing"],
  ["checks", "/docs/contributing"],
  ["quality gate", "/docs/contributing"],
  ["bundle size", "/docs/performance"],
  ["download size", "/docs/performance"],
  ["page weight", "/docs/performance"],
  ["virtualization", "/docs/data-display"],
  ["virtualisation", "/docs/data-display"],
  ["callback", "/docs/component-api"],
  ["callbacks", "/docs/component-api"],
  ["nextjs", "/docs/porting-from-shadcn"],
  ["next.js", "/docs/porting-from-shadcn"],
  ["remix", "/docs/porting-from-shadcn"],
  ["tauri", "/docs/porting-from-shadcn"],
  ["electron", "/docs/porting-from-shadcn"],
  ["design system", "/docs/theming"],
  ["design systems", "/docs/theming"],
  ["data grid", "/docs/data-display"],
  ["nothing shows", "/docs/troubleshooting"],
  ["empty window", "/docs/troubleshooting"],
  ["window is empty", "/docs/troubleshooting"],
  ["screen is empty", "/docs/troubleshooting"],
  ["invisible text", "/docs/troubleshooting"],
  ["text invisible", "/docs/troubleshooting"],
  ["text is invisible", "/docs/troubleshooting"],
  ["why is my text invisible", "/docs/troubleshooting"],
  ["label is invisible", "/docs/troubleshooting"],
  ["colors are wrong", "/docs/troubleshooting"],
  ["colours are wrong", "/docs/troubleshooting"],
  ["wrong colors", "/docs/troubleshooting"],
  ["wrong colours", "/docs/troubleshooting"],
  ["window resize", "/docs/styling"],
  ["resize window", "/docs/styling"],
  ["window size", "/docs/styling"],
  ["how to contribute", "/docs/contributing"],
  ["how do i contribute", "/docs/contributing"],
  ["how can i contribute", "/docs/contributing"],
  ["contribute", "/docs/contributing"],
  ["contributing guide", "/docs/contributing"],
  ["where is the source", "/docs/contributing"],
  ["where is the source code", "/docs/contributing"],
  ["where is the code", "/docs/contributing"],
  ["source code", "/docs/contributing"],
  ["does it work with next.js", "/docs/porting-from-shadcn"],
  ["does it work with nextjs", "/docs/porting-from-shadcn"],
  ["does it work with remix", "/docs/porting-from-shadcn"],
  ["does it work with electron", "/docs/porting-from-shadcn"],
  ["does it work with tauri", "/docs/porting-from-shadcn"],
  ["title bar", "/docs/patterns/app-shell"],
  ["titlebar", "/docs/patterns/app-shell"],
  ["title bars", "/docs/patterns/app-shell"],
  ["status bar", "/docs/patterns/app-shell"],
  ["statusbar", "/docs/patterns/app-shell"],
  ["window frame", "/docs/patterns/app-shell"],
  ["app frame", "/docs/patterns/app-shell"],
  ["application frame", "/docs/patterns/app-shell"],
  ["app chrome", "/docs/patterns/app-shell"],
  ["window chrome", "/docs/patterns/app-shell"],
  ["split view", "/docs/workspace"],
  ["split views", "/docs/workspace"],
  ["coming soon", "/docs/roadmap"],
  ["unreleased", "/docs/roadmap"],
  ["not yet available", "/docs/roadmap"],
  ["planned components", "/docs/roadmap"],
  ["future components", "/docs/roadmap"],
  ["coverage", "/docs/roadmap"],
  ["coverage map", "/docs/roadmap"],
  ["what is implemented", "/docs/roadmap"],
  ["security", "/docs/security"],
  ["privacy", "/docs/security"],
  ["telemetry", "/docs/security"],
  ["analytics", "/docs/security"],
  ["cookies", "/docs/security"],
  ["data collection", "/docs/security"],
  ["vulnerability", "/docs/security"],
  ["vulnerabilities", "/docs/security"],
  ["security policy", "/docs/security"],
  ["report a vulnerability", "/docs/security"],
  ["report vulnerabilities", "/docs/security"],
  ["gdpr", "/docs/security"],
  ["sandbox", "/docs/security"],
  ["sandboxing", "/docs/security"],
  ["remote code", "/docs/security"],
  ["network requests", "/docs/security"],
  ["network access", "/docs/security"],
  ["tracking cookies", "/docs/security"],
  ["browser tracking", "/docs/security"],
  ["code of conduct", "/docs/contributing"],
  ["coc", "/docs/contributing"],
  ["command line", "/docs/contributing"],
  ["command-line", "/docs/contributing"],
  ["offline", "/docs/contributing"],
  ["offline access", "/docs/contributing"],
  ["service worker", "/docs/contributing"],
  ["service workers", "/docs/contributing"],
  ["changelog", "/docs/installation"],
  ["change log", "/docs/installation"],
  ["release notes", "/docs/installation"],
  ["releases", "/docs/installation"],
  ["upgrade", "/docs/installation"],
  ["upgrading", "/docs/installation"],
  ["breaking changes", "/docs/installation"],
  ["versioning", "/docs/installation"],
  ["environment variable", "/docs/deployment"],
  ["environment variables", "/docs/deployment"],
  ["env var", "/docs/deployment"],
  ["env vars", "/docs/deployment"],
  ["site url", "/docs/deployment"],
  ["faq", "/docs"],
  ["frequently asked questions", "/docs"],
  ["touch", "/docs/accessibility"],
  ["touchscreen", "/docs/accessibility"],
  ["touch screen", "/docs/accessibility"],
  ["stylus", "/docs/accessibility"],
  ["pen input", "/docs/accessibility"],
  ["pointer events", "/docs/accessibility"],
  ["pointer input", "/docs/accessibility"],
  ["mouse events", "/docs/accessibility"],
  ["mouse input", "/docs/accessibility"],
  ["skip link", "/docs/accessibility"],
  ["macos style", "/docs/theming"],
  ["macos theme", "/docs/theming"],
  ["windows style", "/docs/theming"],
  ["windows theme", "/docs/theming"],
  ["linux style", "/docs/theming"],
  ["linux theme", "/docs/theming"],
  ["ref", "/docs/component-api"],
  ["refs", "/docs/component-api"],
  ["forwardref", "/docs/component-api"],
  ["forward ref", "/docs/component-api"],
  ["element handle", "/docs/component-api"],
  ["element handles", "/docs/component-api"],
  ["element instance", "/docs/component-api"],
  ["public instance", "/docs/component-api"],
  ["instance handle", "/docs/component-api"],
  ["instance handles", "/docs/component-api"],
  ["imperative handle", "/docs/component-api"],
  ["imperative handles", "/docs/component-api"],
  ["scroll into view", "/docs/component-api"],
  ["scrollintoview", "/docs/component-api"],
  ["traffic light", "/docs/window"],
  ["traffic lights", "/docs/window"],
  ["window controls", "/docs/window"],
  ["native title bar", "/docs/window"],
  ["title bar transparent", "/docs/window"],
  ["fullscreen", "/docs/window"],
  ["full screen", "/docs/window"],
  ["minimize", "/docs/window"],
  ["minimize window", "/docs/window"],
  ["maximize", "/docs/window"],
  ["maximize window", "/docs/window"],
  ["set window title", "/docs/window"],
  ["window title", "/docs/window"],
  ["wayland", "/docs/window"],
  ["layer shell", "/docs/window"],
  ["gnome", "/docs/theming"],
  ["kde", "/docs/theming"],
  ["safe area", "/docs/window"],
  ["window insets", "/docs/window"],
  ["keyboard inset", "/docs/window"],
  ["ime", "/docs/window"],
  ["system tray", "/docs/window"],
  ["tray icon", "/docs/window"],
  ["native menu", "/docs/window"],
  ["application menu", "/docs/window"],
  ["transparent window", "/docs/window"],
  ["blurred background", "/docs/window"],
  ["debug frame overlay", "/docs/window"],
  ["frame overlay", "/docs/window"],
  ["devtools", "/docs/window"],
  ["file dialog", "/docs/window"],
  ["file picker", "/docs/window"],
  ["path picker", "/docs/window"],
  ["app id", "/docs/window"],
  ["menu bar", "/docs/components/navigation-menu"],
  // Plan 628: the testing vocabulary. The page's own suite lists the full
  // table; these are the phrases a later alias block is most likely to steal.
  ["jsdom", "/docs/testing"],
  ["playwright", "/docs/testing"],
  ["storybook", "/docs/testing"],
  ["snapshot", "/docs/testing"],
  ["mock", "/docs/testing"],
  ["fixture", "/docs/testing"],
  ["test renderer", "/docs/testing"],
  ["a11y tree", "/docs/testing"],
  ["smoke test", "/docs/native-testing"],
  // Plan 630: the measured question forms and reader words. Every row names a
  // page that answers it; `center` moved to Layouts when the page gained its
  // `## Centring` section, and `spacing`/`read only`/`table` stay pinned below.
  ["how to build a table", "/docs/data-display"],
  ["build a table", "/docs/data-display"],
  ["how to center content", "/docs/layouts"],
  ["center content", "/docs/layouts"],
  ["centering", "/docs/layouts"],
  ["centring", "/docs/layouts"],
  ["center a div", "/docs/layouts"],
  ["how to display an error", "/docs/components/inline-validation"],
  ["display an error", "/docs/components/inline-validation"],
  ["validation message", "/docs/components/inline-validation"],
  ["how to set width", "/docs/styling"],
  ["set width", "/docs/styling"],
  ["padding", "/docs/styling"],
  ["hover effect", "/docs/styling"],
  ["outside click", "/docs/component-api"],
  ["click outside", "/docs/component-api"],
  ["close on outside click", "/docs/component-api"],
  ["tab index", "/docs/accessibility"],
  ["tabindex", "/docs/accessibility"],
  ["autofocus", "/docs/accessibility"],
  // Plan 631: display scale and pixel density. The Window page owns the
  // subject; `high contrast` and `scales` stay on Theming below.
  ["hidpi", "/docs/window"],
  ["hi dpi", "/docs/window"],
  ["high dpi", "/docs/window"],
  ["retina", "/docs/window"],
  ["retina display", "/docs/window"],
  ["device pixel ratio", "/docs/window"],
  ["pixel density", "/docs/window"],
  ["pixel ratio", "/docs/window"],
  ["dpr", "/docs/window"],
  ["scale factor", "/docs/window"],
  ["display scale", "/docs/window"],
  ["ui scale", "/docs/window"],
  ["ppi", "/docs/window"],
  ["4k", "/docs/window"],
  ["logical pixels", "/docs/window"],
  ["display resolution", "/docs/window"],
  // Plan 632: async data and effects. The regression rows below keep
  // `loading`, `state management`, `managed runtime`, `fetch` and `debounce`
  // with the pages that already answer them.
  ["async", "/docs/async-data"],
  ["async data", "/docs/async-data"],
  ["asynchronous", "/docs/async-data"],
  ["data fetching", "/docs/async-data"],
  ["fetching", "/docs/async-data"],
  ["fetch data", "/docs/async-data"],
  ["suspense", "/docs/async-data"],
  ["suspense fallback", "/docs/async-data"],
  ["useeffect", "/docs/async-data"],
  ["use effect", "/docs/async-data"],
  ["use effect cleanup", "/docs/async-data"],
  ["react effects", "/docs/async-data"],
  ["isloading", "/docs/async-data"],
  ["promises", "/docs/async-data"],
  ["promise chain", "/docs/async-data"],
  ["cache", "/docs/async-data"],
  ["caching", "/docs/async-data"],
  ["query cache", "/docs/async-data"],
  ["retry", "/docs/async-data"],
  ["retries", "/docs/async-data"],
  ["polling", "/docs/async-data"],
  ["poll", "/docs/async-data"],
  ["cancellation", "/docs/async-data"],
  ["cancelled request", "/docs/async-data"],
  ["effectful", "/docs/async-data"],
  ["server state", "/docs/async-data"],
  ["abort signal", "/docs/async-data"],
  ["abortsignal", "/docs/async-data"],
  ["error handling", "/docs/async-data"],
  ["async error", "/docs/async-data"],
  // Plan 633: the runtime's signed update client. The regression rows below
  // keep `upgrade`/`changelog` on Installation and `installer` on Deployment;
  // the measured `update`/`updates` owners are recorded there too.
  ["updater", "/docs/updates"],
  ["updaters", "/docs/updates"],
  ["auto update", "/docs/updates"],
  ["auto updater", "/docs/updates"],
  ["autoupdate", "/docs/updates"],
  ["update feed", "/docs/updates"],
  ["release feed", "/docs/updates"],
  ["update server", "/docs/updates"],
  ["check for updates", "/docs/updates"],
  ["check for update", "/docs/updates"],
  ["update check", "/docs/updates"],
  ["update checker", "/docs/updates"],
  ["app update", "/docs/updates"],
  ["application update", "/docs/updates"],
  ["ship updates", "/docs/updates"],
  ["shipping updates", "/docs/updates"],
  ["download and install", "/docs/updates"],
  ["install an update", "/docs/updates"],
  ["relaunch", "/docs/updates"],
  ["relaunch the app", "/docs/updates"],
  ["code signing", "/docs/updates"],
  ["signature verification", "/docs/updates"],
  ["update signature", "/docs/updates"],
  ["signing key", "/docs/updates"],
  ["pubkey", "/docs/updates"],
  ["nsis", "/docs/updates"],
  ["appimage", "/docs/updates"],
  ["wix", "/docs/updates"],
  ["installer args", "/docs/updates"],
  ["install mode", "/docs/updates"],
  ["delta update", "/docs/updates"],
  ["rollback", "/docs/updates"],
] as const;

const regressions = [
  ["theme", "/docs/theming"],
  ["switch", "/docs/components/switch"],
  ["toggle", "/docs/components/toggle"],
  ["color picker", "/docs/components/color-picker"],
  ["text", "/docs/components/text"],
  ["examples", "/docs/examples"],
  ["dark mode", "/docs/dark-mode"],
  ["installation", "/docs/installation"],
  ["select", "/docs/components/select"],
  ["keycap", "/docs/components/keycap"],
  ["empty state", "/docs/components/empty-state"],
  ["command menu", "/docs/components/command-menu"],
  ["typography", "/docs/typography"],
  ["disabled button", "/docs/components/button"],
  ["row selection", "/docs/roadmap"],
  ["card", "/docs/components/card"],
  ["accordion", "/docs/components/accordion"],
  ["theming", "/docs/theming"],
  ["duration", "/docs/components/countdown#composition"],
  ["transition", "/docs/theming#motion"],
  ["keycap", "/docs/components/keycap"],
  ["kbd", "/docs/components/keycap"],
  ["keybinding", "/docs/components/keycap"],
  ["hotkey input", "/docs/components/hotkey-input"],
  ["spacer", "/docs/components/spacer"],
  ["tabs", "/docs/components/tabs"],
  ["list", "/docs/components/list"],
  ["skeleton", "/docs/components/skeleton"],
  ["accessibility", "/docs/accessibility"],
  ["project browser", "/docs/patterns/project-browser"],
  ["webassembly", "/docs/architecture"],
  ["wasm", "/docs/previews"],
  ["countdown", "/docs/components/countdown"],
  ["toast", "/docs/components/toast"],
  ["architecture", "/docs/architecture"],
  ["spacing", "/docs/theming"],
  ["font size", "/docs/typography"],
  ["platform support", "/docs/installation#native-bindings"],
  ["native binding", "/docs/installation#native-bindings"],
  ["border radius", "/docs/styling"],
  ["media queries", "/docs/styling"],
  ["center", "/docs/layouts"],
  ["table", "/docs/data-display"],
  ["tables", "/docs/data-display"],
  // Plan 626: Native elements owns the three read-only surfaces, so the
  // phrase plan 608 recorded as a measured limit lands there.
  ["read only", "/docs/native-elements"],
  ["tabel", "/docs/components/label"],
  ["keyboard navigation", "/docs/roadmap"],
  ["grid", "/docs/components/stack"],
  ["resize", "/docs/workspace"],
  ["split panes", "/docs/roadmap"],
  ["data", "/docs/data-display"],
  ["tracking", "/docs/styling"],
  ["pwa", "/docs/contributing"],
  ["bundle size", "/docs/performance"],
  ["version", "/docs/installation"],
  ["platform style", "/docs/theming#platform-styles"],
  ["reference", "/docs/api-reference"],
  ["scrollbar", "/docs/components/scroll-area"],
  ["title bar", "/docs/patterns/app-shell"],
  ["titlebar", "/docs/patterns/app-shell"],
  ["window", "/docs/window"],
  ["windows", "/docs/theming"],
  ["window size", "/docs/styling"],
  ["menu bar", "/docs/components/navigation-menu"],
  ["dialog", "/docs/components/dialog"],
  ["menu", "/docs/components/context-menu"],
  // Plan 631: the palette and the token scale keep their words.
  ["high contrast", "/docs/theming#high-contrast"],
  ["scales", "/docs/theming#scales-and-control-metrics"],
  // Plan 632: the async page links these owners instead of claiming them.
  ["loading", "/docs/components/spinner"],
  ["state management", "/docs/component-api"],
  ["managed runtime", "/docs/architecture"],
  ["fetch", "/docs/security"],
  ["debounce", "/docs/testing#time"],
] as const;

describe(
  "a measured reader phrase reaches its page",
  { timeout: 120_000 },
  () => {
    it.each(owned)("%s → %s", async (query, url) => {
      const [first] = await search(query);
      expect(first?.url).toBe(url);
    });

    it.each(regressions)("%s keeps %s", async (query, url) => {
      const [first] = await search(query);
      expect(first?.url).toBe(url);
    });
  },
);

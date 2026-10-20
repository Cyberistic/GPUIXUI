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
  ["table", "/docs/data-display"],
  ["tables", "/docs/data-display"],
  ["read only", "/docs/troubleshooting"],
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

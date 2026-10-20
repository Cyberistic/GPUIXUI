import { describe, expect, it } from "vitest";
import type { SortedResult } from "fumadocs-core/search";
import { components } from "@/component-meta/registry";
import type { ComponentMetaInput } from "@/component-meta/schema";
import { componentSymbols } from "@/component-meta/symbols";
import { aliasesFor } from "./component-aliases";
import {
  componentSearchIndex,
  componentSearchUrl,
  DEFAULT_SEARCH_LIMIT,
  DESCRIPTION_MATCH_RANK,
  generatedNameHits,
  MAX_SEARCH_LIMIT,
  mergeResults,
  pageDescriptionHits,
  parseSearchLimit,
  search,
  TYPO_MATCH_RANK,
  withoutTypeTableRows,
  type PageMetadata,
} from "./search";
import type { GeneratedSearchEntry } from "./generated-search";

/**
 * Guards plans 419 and 431: the component registry is searchable from any page,
 * and a component's exact name reaches its own page.
 *
 * Bugs being guarded: (1) the Fumadocs index is built from MDX, so component
 * records — rendered React, not prose — were invisible to ⌘K; (2) the registry
 * was appended after a full page-result list, so `button` could return ten
 * prose hits and never `/docs/components/button`; (3) an empty query returned
 * arbitrary prose instead of `[]`; (4) a delivered component was listed twice,
 * once from its page and once from its registry record; (5) the generated
 * Values API renders its rows rather than authoring them, so a helper name such
 * as `checkboxState` had no index entry at all (plan 490). These tests fail if
 * the registry index is dropped, if a title match is not promoted, if the empty
 * guard is removed, if page results are not deduplicated, if the value index is
 * dropped, or if the response becomes unbounded.
 *
 * Plan 561 closes the phrase case: the ranker only compared the whole query with
 * a name, so `popover placement` returned the Box page's variants and the
 * Popover page was sixth; a page whose own title matched the query
 * (`Command palette`, `Theming`) got no rank at all. The tests below fail when
 * token matching or the page-title rank is removed.
 *
 * Plan 568 closes the subject case: a page's authored **description** was never
 * a signal, so `table` returned ten chunks of the Component pages guide, `panel`
 * returned four Tabs sections and `aria` returned the Values API instead of the
 * Accessibility page. The description rank sits one tier below a title and
 * matches whole words only; these tests fail when it is dropped, when a title
 * stops outranking it, or when a fragment inside a word starts matching.
 *
 * Plan 569 closes the retrieval case: a generated document promotes its name,
 * but the lexical index never returns it when the reader writes that name as
 * words (`focus ring` returned Number field sections, `elevation shadow` a table
 * chunk). `generatedNameHits` synthesizes the document as a page candidate, so
 * the promotion can rank it; the same-URL text chunk stays behind the page.
 * These tests fail when the synthesis is removed, when a body chunk is promoted
 * over its page, or when a plain word starts promoting a generated document.
 */
const contentOf = (result: SortedResult): string =>
  "content" in result ? result.content : "";

// The first query builds the Fumadocs index for every page. Measured cold: 24 s
// alone, over 30 s while the rest of the suite runs in parallel, so the file
// gets a budget that survives a loaded host.
describe("search", { timeout: 120_000 }, () => {
  it("returns the matching page for a title query", async () => {
    const results = await search("Installation", 5);
    expect(results.map((result) => result.url)).toContain("/docs/installation");
  });

  it("finds a component page from any page's search", async () => {
    const results = await search("drawer");
    const drawer = results.find((result) =>
      contentOf(result).startsWith("Drawer"),
    );
    expect(drawer?.url).toBe("/docs/components/drawer");
  });

  it("ranks real pages ahead of the registry appendix", async () => {
    const results = await search("installation", 5);
    expect(results[0]?.url).toBe("/docs/installation");
  });

  it("finds the preview guide by its subject (plan 571)", async () => {
    const results = await search("preview labels", 10);
    expect(results.map((result) => result.url)).toContain("/docs/previews");
  });

  it("finds the project-browser pattern by its name (plan 575)", async () => {
    const results = await search("project browser", 5);
    expect(results.map((result) => result.url)).toContain(
      "/docs/patterns/project-browser",
    );
  });

  it("points a planned record at the filtered index instead of a page", () => {
    // No Tier 1–2 record is planned after plan 461, so the rule is proven on a
    // fixture: a future record must not promise a page it does not have.
    const planned: ComponentMetaInput = {
      slug: "demo-grid",
      title: "Demo grid",
      tier: "2",
      group: "composition",
      status: "planned",
      gpuix: "unverified",
      summary: "A planned component.",
      packageName: "@gpuixui/components",
      sourcePath: null,
      api: [],
      parts: [],
      pattern: "static",
      persistence: null,
      dependencies: [],
      related: [],
      playgroundScreen: null,
      liveScene: null,
      screenshots: [],
      runtime: null,
      limitations: [],
    };
    expect(componentSearchUrl(planned)).toBe("/docs/components?q=Demo%20grid");
    expect(componentSearchIndex(planned).title).toBe("Demo grid (planned)");
  });

  it("returns nothing for a query no page or component matches", async () => {
    expect(await search("zzzznosuchtermzzzz")).toEqual([]);
  });

  it("returns nothing for an empty or blank query", async () => {
    expect(await search("")).toEqual([]);
    expect(await search("   ")).toEqual([]);
  });

  it("puts a component's own page first for its exact name", async () => {
    const results = await search("button");
    expect(results[0]?.url).toBe("/docs/components/button");
  });

  it("finds a component by its exported name when the title differs", async () => {
    const results = await search("Spinner");
    expect(results[0]?.url).toBe("/docs/components/spinner");
  });

  it("ranks every exported name that differs from its inventory title first", async () => {
    const expected = [
      ["Spinner", "spinner"],
      ["ScrollArea", "scroll-area"],
      ["TextArea", "text-area"],
      ["ButtonGroup", "button-group"],
      ["NumberField", "number-field"],
      ["OTPField", "otp-field"],
      ["Field", "inline-validation"],
      ["ConfirmDialog", "confirm-dialog"],
      ["Grid", "stack"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, slug]) => {
        const results = await search(query, 5);
        return results[0]?.url === `/docs/components/${slug}` ? null : query;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  it("finds a component by one of its props types", async () => {
    const results = await search("ButtonProps");
    expect(results[0]?.url).toBe("/docs/components/button");
  });

  it("finds a component when its second table is the match", async () => {
    const results = await search("ToastViewportProps");
    expect(results[0]?.url).toBe("/docs/components/toast");
  });

  it("finds a component by one of its part names", async () => {
    const results = await search("DialogTitle", 5);
    expect(results[0]?.url).toBe("/docs/components/dialog");
  });

  /**
   * Plan 580: plan 481 made a part name *findable*, but the ranker only read
   * the title, the props-type symbols and the aliases. These ten queries
   * returned an authored chunk that mentions the part — the card limitations
   * list, the dialog state section — and the component page came second or
   * third. A part name is a name a reader types, so it is scored like a title.
   */
  it("ranks a part name above prose that mentions it", async () => {
    const expected: ReadonlyArray<readonly [string, string]> = [
      ["CardTitle", "card"],
      ["CardDescription", "card"],
      ["CardContent", "card"],
      ["FieldDescription", "inline-validation"],
      ["FieldError", "inline-validation"],
      ["DialogClose", "dialog"],
      ["CollapsibleContent", "collapsible"],
      ["BreadcrumbPage", "breadcrumb"],
      ["DropdownMenuGroup", "dropdown-menu"],
      ["ContextMenuGroup", "context-menu"],
    ];
    const misses = await Promise.all(
      expected.map(async ([name, slug]) => {
        const results = await search(name, 3);
        return results[0]?.url === `/docs/components/${slug}`
          ? null
          : `${name} -> ${results[0]?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * The mechanical form of plan 481: every name a record owns — its title, the
   * symbol a props type implies, a declared part, a props type, a reader alias
   * — reaches one of the pages that own it first. `MenuGroup`/`MenuGroupProps`
   * are documented by both menus and are the only shared names; a shared name is
   * satisfied by either owner. `componentNames` dropping parts fails this case
   * with the list of every part that fell behind a mentioning paragraph.
   */
  it("ranks every recorded name on one of its owning pages", async () => {
    const owners = new Map<string, string[]>();
    components.forEach((record) =>
      [
        record.title,
        ...componentSymbols(record),
        ...record.parts.map((part) => part.name),
        ...record.api,
        ...aliasesFor(record.slug),
      ].forEach((name) => {
        owners.set(name, [
          ...(owners.get(name) ?? []),
          componentSearchUrl(record),
        ]);
      }),
    );
    const misses = await Promise.all(
      [...owners].map(async ([name, urls]) => {
        const results = await search(name, 3);
        const first = results[0]?.url ?? "nothing";
        return urls.includes(first)
          ? null
          : `${name} -> ${first} (owners: ${urls.join(", ")})`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 566: a reader names a component in their own words, not the record's
   * title. These queries returned nothing (`textbox`, `navbar`, `snackbar`,
   * `kbd`, `searchbox`) or a different component (`check box`, `modal`, `one
   * time password`, `colour picker`) before the alias table existed.
   */
  it("finds a component by the words readers use for it", async () => {
    const expected = [
      ["textbox", "text-input"],
      ["text box", "text-input"],
      ["check box", "checkbox"],
      ["tick box", "checkbox"],
      ["radio button", "radio-group"],
      ["combo box", "combobox"],
      ["one time password", "otp-field"],
      ["one-time code", "otp-field"],
      ["modal", "dialog"],
      ["navbar", "navigation-menu"],
      ["searchbox", "search-input"],
      ["search box", "search-input"],
      ["number input", "number-field"],
      ["tags input", "tag-input"],
      ["chips", "tag-input"],
      ["shortcut recorder", "hotkey-input"],
      ["side sheet", "drawer"],
      ["field group", "fieldset"],
      ["snackbar", "toast"],
      ["kbd", "keycap"],
      ["colour picker", "color-picker"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, slug]) => {
        const results = await search(query, 5);
        return results[0]?.url === `/docs/components/${slug}`
          ? null
          : `${query} -> ${results[0]?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 579: the second measured sweep. The first table covered the terms
   * plan 566 reported; `typeahead`, `passcode`, `wizard`, `datagrid` and
   * `sidebar` still returned nothing or a different page. These cases fail by
   * query when a term is dropped.
   */
  it("finds a component by the second set of reader words (plan 579)", async () => {
    const expected = [
      ["pin code", "otp-field"],
      ["passcode", "otp-field"],
      ["verification code", "otp-field"],
      ["typeahead", "combobox"],
      ["autocomplete", "combobox"],
      ["auto complete", "combobox"],
      ["hover card", "preview-card"],
      ["hovercard", "preview-card"],
      ["menubar", "navigation-menu"],
      ["menu bar", "navigation-menu"],
      ["collapse", "collapsible"],
      ["vstack", "stack"],
      ["hstack", "stack"],
      ["icon button", "button"],
      ["fab", "button"],
      ["segmented control", "button-group"],
      ["segmented", "button-group"],
      ["toggle group", "button-group"],
      ["wizard", "stepper"],
      ["side panel", "drawer"],
      ["sidepanel", "drawer"],
      ["banner", "alert"],
      ["scrollview", "scroll-area"],
      ["popup", "popover"],
      ["dropdown list", "select"],
      ["swatch", "color-picker"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, slug]) => {
        const results = await search(query, 5);
        return results[0]?.url === `/docs/components/${slug}`
          ? null
          : `${query} -> ${results[0]?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 607: a misspelling has a tier of its own. Before it, the lexical
   * index still returned *some* page for a typo, so `botton` returned Toggle
   * and `theem` the Values API, while `acordian` and `dropdwon` returned
   * nothing at all because the index omitted the page. Each row fails by query
   * when the typo tier, its synthesis, its name/alias order or the stem it
   * shares with the real matcher is removed.
   */
  it("finds the page a reader misspelled by one edit (plan 607)", async () => {
    const expected = [
      ["botton", "/docs/components/button"],
      ["buton", "/docs/components/button"],
      ["acordian", "/docs/components/accordion"],
      ["dropdwon", "/docs/components/dropdown-menu"],
      ["seach", "/docs/components/search-input"],
      ["theem", "/docs/theming"],
      ["componet", "/docs/components"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query);
        return first?.url === url
          ? null
          : `${query} -> ${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  it("finds the page a reader misspelled as a whole phrase (plan 608)", async () => {
    const expected = [
      ["theem editr", "/docs/theme-editor"],
      ["buton group", "/docs/components/button-group"],
      ["dropdwon menu", "/docs/components/dropdown-menu"],
      ["seach input", "/docs/components/search-input"],
      ["theem toggle", "/docs/dark-mode"],
      ["themnig", "/docs/theming"],
      ["tag input", "/docs/components/tag-input"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query);
        return first?.url === url
          ? null
          : `${query} -> ${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  it("finds the phrase a page already owns (plan 608)", async () => {
    const expected = [
      ["state management", "/docs/component-api"],
      ["state ownership", "/docs/component-api"],
      ["controlled state", "/docs/component-api"],
      ["controlled component", "/docs/component-api"],
      ["transparency", "/docs/styling"],
      ["rounded", "/docs/styling"],
      ["corner radius", "/docs/styling"],
      ["width", "/docs/styling"],
      ["height", "/docs/styling"],
      ["responsive design", "/docs/styling"],
      ["breakpoints", "/docs/styling"],
      ["letter spacing", "/docs/styling"],
      ["tracking", "/docs/styling"],
      ["rendering", "/docs/architecture"],
      ["server", "/docs/architecture"],
      ["server side rendering", "/docs/architecture"],
      ["speed", "/docs/performance"],
      ["credits", "/docs/license"],
      ["acknowledgements", "/docs/license"],
      ["vitest", "/docs/contributing"],
      ["panel", "/docs/workspace"],
      ["panle", "/docs/workspace"],
      ["colorblind", "/docs/theming"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query);
        return first?.url.split("#")[0] === url
          ? null
          : `${query} -> ${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  it("keeps a four-letter word off a longer title (plan 608)", async () => {
    const [first] = await search("code");
    expect(first?.url).not.toBe("/docs/dark-mode");
  });

  it("keeps a real name ahead of its one-edit neighbours", async () => {
    const [button] = await search("button");
    expect(button?.url).toBe("/docs/components/button");
    const [buttons] = await search("buttons");
    expect(buttons?.url).toBe("/docs/components/button");
  });

  it("scores a typo below every real rank", () => {
    expect(TYPO_MATCH_RANK).toBeGreaterThan(DESCRIPTION_MATCH_RANK + 3);
    const pages = new Map<string, PageMetadata>([
      ["/docs/real", { title: "Real", description: "a botton setting" }],
    ]);
    const results = mergeResults(
      [{ id: "real", url: "/docs/real", type: "page", content: "Real" }],
      [],
      "botton",
      pages,
      new Map(),
      [{ name: "Buttons", url: "/docs/components/button", kind: "name" }],
    );
    expect(results[0]?.url).toBe("/docs/real");
  });

  it("promotes the typo's page, never a text chunk at its URL", () => {
    const names = [
      {
        name: "Buttons",
        url: "/docs/components/button",
        kind: "name" as const,
      },
    ];
    const results = mergeResults(
      [
        {
          id: "page",
          url: "/docs/components/button",
          type: "page",
          content: "Buttons",
        },
        {
          id: "chunk",
          url: "/docs/components/button",
          type: "text",
          content: "botton padding",
        },
      ],
      [],
      "botton",
      new Map(),
      new Map(),
      names,
    );
    expect(results[0]?.type).toBe("page");
  });

  it("keeps a plain word on the page that titles it", async () => {
    const expected = [
      ["box", "box"],
      ["input", "text-input"],
      ["search", "search-input"],
      ["menu", "context-menu"],
      ["field", "inline-validation"],
      ["list", "list"],
      ["select", "select"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, slug]) => {
        const results = await search(query, 5);
        return results[0]?.url === `/docs/components/${slug}`
          ? null
          : `${query} -> ${results[0]?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 561: a reader types a phrase, not a title. The whole-query ranker
   * missed every component named as one word of it, so body text decided.
   */
  it("reaches a component named inside a phrase", async () => {
    const results = await search("popover placement");
    expect(results[0]?.url).toBe("/docs/components/popover");
  });

  it("ranks the component named first even when prose matches the verb", async () => {
    const results = await search("button loading");
    expect(results[0]?.url).toBe("/docs/components/button");
  });

  it("keeps a whole page-title match ahead of a component token match", async () => {
    const results = await search("command palette");
    expect(results[0]?.url).toBe("/docs/patterns/command-palette");
  });

  it("ranks a component page the index returned only fragments for", async () => {
    const results = await search("dialog focus");
    expect(results[0]?.url).toBe("/docs/components/dialog");
  });

  it("ranks a component page ahead of a pattern that composes it", async () => {
    const results = await search("input label", 5);
    const urls = results.map((result) => result.url);
    const componentIndex = urls.findIndex((url) =>
      ["/docs/components/text-input", "/docs/components/label"].includes(url),
    );
    const patternIndex = urls.indexOf("/docs/patterns/settings-form");

    expect(componentIndex).toBeGreaterThanOrEqual(0);
    expect(patternIndex === -1 || componentIndex < patternIndex).toBe(true);
  });

  it("keeps a named component when the other word matches nothing", async () => {
    const results = await search("popover zzzz");
    expect(results[0]?.url).toBe("/docs/components/popover");
  });

  it("reaches a page the index answered only with its headings", async () => {
    const results = await search("theming");
    expect(results[0]?.url).toBe("/docs/theming");
  });

  it("reaches the page a plain word titles", async () => {
    const results = await search("example");
    expect(results[0]?.url).toBe("/docs/examples");
  });

  it("finds the theme editor by name and by its brand-colour subject", async () => {
    expect((await search("theme editor", 5))[0]?.url).toBe(
      "/docs/theme-editor",
    );
    expect(
      (await search("brand colours", 5)).map((result) => result.url),
    ).toContain("/docs/theme-editor");
  });

  it("lists a synthesized title hit once when the page index returned it too", async () => {
    const results = await search("toast dismiss");
    expect(
      results.filter(
        (result) =>
          result.type === "page" && result.url === "/docs/components/toast",
      ),
    ).toHaveLength(1);
  });

  it("finds a helper on the generated values page", async () => {
    const results = await search("checkboxState", 5);
    expect(results[0]?.url).toBe("/docs/api-values");
  });

  it("finds an ARIA attribute on the generated accessibility page", async () => {
    const results = await search("aria-valuenow", 5);
    expect(results[0]?.url).toBe("/docs/accessibility");
    expect(await search("checkbox", 5)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "/docs/components/checkbox" }),
      ]),
    );
  });

  it("reaches a page whose own summary names the subject", async () => {
    const expected = [
      ["table", "/docs/data-display"],
      ["tables", "/docs/data-display"],
      ["panel", "/docs/workspace"],
      ["aria", "/docs/accessibility"],
      ["screen reader", "/docs/accessibility"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const results = await search(query, 5);
        return results[0]?.url === url
          ? null
          : `${query} -> ${results[0]?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 574: the summary rule only sees words an author wrote. Four generated-
   * table pages described themselves without naming the subjects they own, so
   * `spacing`, `radius`, `density` and `elevation` returned the Tokens API or
   * Box, `font`/`font family`/`font weight` the Tokens API, `wasm`, `screenshot`
   * and `approximation` the Values API or Architecture, and `virtualized`
   * Message scroller. A row fails by name when a rewritten description loses
   * its subject. `split panes` is deliberately absent: the roadmap promotes the
   * inventory target of that name (plan 564).
   */
  it("names every subject its page owns in the summary (plan 574)", async () => {
    const expected = [
      ["spacing", "/docs/theming"],
      ["radius", "/docs/theming"],
      ["density", "/docs/theming"],
      ["elevation", "/docs/theming"],
      ["font", "/docs/typography"],
      ["font family", "/docs/typography"],
      ["font weight", "/docs/typography"],
      ["wasm", "/docs/previews"],
      ["screenshot", "/docs/previews"],
      ["approximation", "/docs/previews"],
      ["virtualized", "/docs/data-display"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        return first?.type === "page" && first.url.split("#")[0] === url
          ? null
          : `${query} -> ${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 579: an alternate name is authored metadata, not a ranker rule. The
   * first summary pass (plan 574) named the subjects' primary words; `datagrid`,
   * `data grid` and `sidebar` still reached Stack or nothing. The page owns the
   * subject, so its summary owns the word.
   */
  it("reaches a page by the alternate name its summary names (plan 579)", async () => {
    const expected = [
      ["datagrid", "/docs/data-display"],
      ["sidebar", "/docs/workspace"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        return first?.type === "page" && first.url.split("#")[0] === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 583: a third measured sweep. `cmdk`, `autosuggest`, `gauge`, `pill`,
   * `callout`, `busy` and `sheet` still returned nothing or another page; the
   * Theming summary did not name the three platform styles it owns, the
   * Workspace summary did not name resizable splits or inspector panels, and the
   * Layouts page had no RTL sentence, so `rtl` had no answer. A row fails by
   * query when its alias, summary word or sentence is removed.
   */
  it("finds the third set of reader words and page subjects (plan 583)", async () => {
    const expected = [
      ["cmdk", "/docs/components/command-menu"],
      ["autosuggest", "/docs/components/combobox"],
      ["auto suggest", "/docs/components/combobox"],
      ["gauge", "/docs/components/meter"],
      ["gauges", "/docs/components/meter"],
      ["pill", "/docs/components/badge"],
      ["callout", "/docs/components/alert"],
      ["callouts", "/docs/components/alert"],
      ["busy", "/docs/components/spinner"],
      ["sheet", "/docs/components/drawer"],
      ["macos", "/docs/theming"],
      ["linux", "/docs/theming"],
      ["windows", "/docs/theming"],
      ["resizable", "/docs/workspace"],
      ["inspector", "/docs/workspace"],
      ["rtl", "/docs/layouts"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return destination === url
          ? null
          : `${query} -> ${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 588: the fourth measured sweep. `alertdialog` returned nothing and
   * `alert dialog` returned Alerts, `scrollbar` returned a text chunk and
   * `scrollbars` the Theming table, `a11y`/`wcag` returned Contributing's
   * command table, and `webview` returned nothing. The ARIA name belongs to
   * Confirmation dialogs, the scrollbar to Scrollable containers, the
   * conformance words to Accessibility and the one-word negative to the
   * Introduction. No ranker rule is added.
   */
  it("finds the fourth set of reader words and page subjects (plan 588)", async () => {
    const expected = [
      ["alertdialog", "/docs/components/confirm-dialog"],
      ["alert dialog", "/docs/components/confirm-dialog"],
      ["scrollbar", "/docs/components/scroll-area"],
      ["scrollbars", "/docs/components/scroll-area"],
      ["a11y", "/docs/accessibility"],
      ["wcag", "/docs/accessibility"],
      ["webview", "/docs"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 590: the fifth measured sweep. `quickstart` and `overview` returned
   * nothing, `hello world` returned Accessibility, `props table` returned the
   * Component pages guide's guard table, `appearance` returned a Range slider
   * section, `system theme` returned Switch, and `github`/`bugs`/`issues` had
   * no destination because the Contributing page never named the repository.
   * Each query is a page subject its owning summary should name; no ranker
   * rule is added.
   */
  it("finds the fifth set of reader words and page subjects (plan 590)", async () => {
    const expected = [
      ["quickstart", "/docs/getting-started"],
      ["hello world", "/docs/getting-started"],
      ["overview", "/docs"],
      ["props table", "/docs/api-reference"],
      ["appearance", "/docs/dark-mode"],
      ["system appearance", "/docs/dark-mode"],
      ["github", "/docs/contributing"],
      ["bugs", "/docs/contributing"],
      ["issues", "/docs/contributing"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * The new summary words must not steal a subject an earlier pass assigned:
   * `theme` stays on Theming, `table` on Data display, `aria` on Accessibility
   * and `webview` on the Introduction.
   */
  it("keeps the subjects the earlier passes assigned (plan 590)", async () => {
    const expected = [
      ["theme", "/docs/theming"],
      ["table", "/docs/data-display"],
      ["aria", "/docs/accessibility"],
      ["webview", "/docs"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 591: the sixth measured sweep. `setup` and `testing` returned nothing,
   * `test` returned the Component pages gesture table, `border`/`shadow`/`overlay`
   * returned Tokens API chunks, `compound` returned Extending's related chunk,
   * `helper text` returned Text and `error message` returned Message scroller,
   * while `time` returned Timeline. Each row is a page subject its owning
   * summary should name, or a component synonym the record cannot spell; no
   * ranker rule is added.
   */
  it("finds the sixth set of reader words and page subjects (plan 591)", async () => {
    const expected = [
      ["setup", "/docs/installation"],
      ["test", "/docs/native-testing"],
      ["testing", "/docs/native-testing"],
      ["border", "/docs/theming"],
      ["shadow", "/docs/theming"],
      ["overlay", "/docs/component-api"],
      ["compound", "/docs/component-api"],
      ["helper text", "/docs/components/inline-validation"],
      ["error message", "/docs/components/inline-validation"],
      ["time", "/docs/components/time-picker"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * The new words must not steal a subject an earlier pass assigned, and an
   * alias must stay a whole-query match: `message`, `error` and `time picker`
   * keep their previous pages.
   */
  it("keeps the subjects the earlier passes assigned (plan 591)", async () => {
    const expected = [
      ["theme", "/docs/theming"],
      ["table", "/docs/data-display"],
      ["aria", "/docs/accessibility"],
      ["spacing", "/docs/theming"],
      ["radius", "/docs/theming"],
      ["density", "/docs/theming"],
      ["elevation", "/docs/theming"],
      ["font", "/docs/typography"],
      ["message", "/docs/components/message-scroller"],
      ["error", "/docs/components/inline-validation"],
      ["time picker", "/docs/components/time-picker"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 592: the seventh measured sweep. `sorting`, `npm`, `pnpm` and `yarn`
   * returned nothing; `sort`, `sortable`, `filtering`, `columns` and `worktree`
   * landed on another page or a prose chunk; `registry`, `publish` and
   * `package manager` reached Architecture, Extending and Examples. Each of the
   * three owning pages already contained the word in its body, so this names
   * the subject in its authored summary; no ranker rule is added.
   */
  it("finds the seventh set of reader words and page subjects (plan 592)", async () => {
    const expected = [
      ["sort", "/docs/data-display"],
      ["sorting", "/docs/data-display"],
      ["sortable", "/docs/data-display"],
      ["filtering", "/docs/data-display"],
      ["filter", "/docs/data-display"],
      ["column", "/docs/data-display"],
      ["columns", "/docs/data-display"],
      ["npm", "/docs/installation"],
      ["pnpm", "/docs/installation"],
      ["yarn", "/docs/installation"],
      ["registry", "/docs/installation"],
      ["publish", "/docs/installation"],
      ["package manager", "/docs/installation"],
      ["worktree", "/docs/contributing"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * The seventh pass may not steal a subject an earlier pass assigned. `filter`
   * is deliberate: Data display owns filtering controls, so the subject page
   * now outranks the Project browser's working composition (recorded in plan
   * 592 §2.2).
   */
  it("keeps the data and install words the earlier passes assigned (plan 592)", async () => {
    const expected = [
      ["table", "/docs/data-display"],
      ["tables", "/docs/data-display"],
      ["virtualized", "/docs/data-display"],
      ["datagrid", "/docs/data-display"],
      ["theme", "/docs/theming"],
      ["panel", "/docs/workspace"],
      ["input", "/docs/components/text-input"],
      ["label", "/docs/components/label"],
      ["spacing", "/docs/theming"],
      ["screen reader", "/docs/accessibility"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 593: the eighth measured sweep. A component's summary is not a search
   * signal (plan 568), so Icons' "glyph" and Scrollable containers' "overflow"
   * never ranked; the alias table is their home. `descriptionMatchRank`
   * compared summary words literally, so `resize` missed `resizable` and
   * `selected` missed `selectable`; a stem tier gives an inflected word the
   * same rank as the word itself. License and the Roadmap did not name their
   * own subjects in the summary, and the Roadmap's `Drag and drop` target had
   * no one-word alias. Each row fails when its word, alias or tier is removed.
   */
  it("finds the eighth set of reader words and page subjects (plan 593)", async () => {
    const expected = [
      ["svg", "/docs/components/icon"],
      ["glyph", "/docs/components/icon"],
      ["overflow", "/docs/components/scroll-area"],
      ["mit", "/docs/license"],
      ["planned", "/docs/roadmap"],
      ["tier", "/docs/roadmap"],
      ["resize", "/docs/workspace"],
      ["drop", "/docs/roadmap"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * The eighth pass may not steal a subject an earlier pass assigned. The stem
   * tier is the only ranker change, so these are the destinations it could
   * plausibly move.
   */
  it("keeps the words the earlier passes assigned (plan 593)", async () => {
    const expected = [
      ["sort", "/docs/data-display"],
      ["filter", "/docs/data-display"],
      ["npm", "/docs/installation"],
      ["worktree", "/docs/contributing"],
      ["table", "/docs/data-display"],
      ["panel", "/docs/workspace"],
      ["input", "/docs/components/text-input"],
      ["label", "/docs/components/label"],
      ["spacing", "/docs/theming"],
      ["screen reader", "/docs/accessibility"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 594: the ninth measured sweep. The site's own discovery output had no
   * reader-facing page, so `favicon`, `robots`, `llms` and `pwa` returned
   * nothing and `seo` returned Icons; Contributing now names them in its
   * summary and its `Site output` section. `graph` named **Typo·graph·y**
   * because the substring tier matched inside a word; the tier now requires the
   * fragment to end a word, and Data display's summary names `graphs`.
   * `virtual list` is a tracked target, so the Roadmap alias owns it rather
   * than the Lists page that mentions `virtual-list` in passing.
   */
  it("finds the docs site's own output and two subject words (plan 594)", async () => {
    const expected = [
      ["favicon", "/docs/contributing"],
      ["robots", "/docs/contributing"],
      ["llms", "/docs/contributing"],
      ["pwa", "/docs/contributing"],
      ["seo", "/docs/contributing"],
      ["sitemap", "/docs/contributing"],
      ["graph", "/docs/data-display"],
      ["virtual list", "/docs/roadmap"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" && destination === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * The ranker change in plan 594 removes only the mid-word tier. A fragment
   * that ends a word (`picker` in `datepicker`) still names a page, and a fully
   * typed title still wins its exact match.
   */
  it("does not name a page from a fragment inside a word (plan 594)", async () => {
    const graph = await search("graph", 5);
    expect(graph.map((result) => result.url.split("#")[0])).not.toContain(
      "/docs/typography",
    );

    const [typography] = await search("typography", 5);
    expect(typography?.url.split("#")[0]).toBe("/docs/typography");

    const [picker] = await search("picker", 5);
    expect(picker?.url.split("#")[0]).toBe("/docs/components/color-picker");
  });

  /**
   * Plan 591: a component's URL slug is the name in its canonical link. Eight
   * of 66 slugs reached a pattern page or Date pickers because the registry
   * document and the name list never contained the slug (`button-group`,
   * `text-input`, `text-area`, `radio-group`, `empty-state`, `command-menu`,
   * `search-input`, `time-picker`). The exhaustive loop fails by slug if it is
   * dropped from either `componentSearchIndex` or `componentNames`.
   */
  it("reaches every component by its URL slug (plan 591)", async () => {
    const misses = await Promise.all(
      components.map(async (component) => {
        const [first] = await search(component.slug, 5);
        const destination = first?.url.split("#")[0];
        return first?.type === "page" &&
          destination === `/docs/components/${component.slug}`
          ? null
          : `${component.slug} -> ${first?.type ?? "nothing"}:${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  it("finds the installation prerequisites and native platform support (plan 584)", async () => {
    const expected = [
      ["prerequisites", "/docs/installation"],
      ["system requirements", "/docs/installation"],
      ["requirements", "/docs/installation"],
      ["platform support", "/docs/installation"],
      ["x86_64", "/docs/installation"],
      ["arm64", "/docs/installation"],
      ["intel mac", "/docs/installation"],
      ["apple silicon", "/docs/installation"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return destination === url
          ? null
          : `${query} -> ${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 585: the ranker compared spellings, not words, so a page titled in
   * another inflection (`Theming`, `GPUix capabilities`) earned no title rank;
   * Data display and Accessibility did not name the subjects they own; and a
   * multiword roadmap target was promoted only as the whole phrase. Each row
   * below fails by query when its rule is removed: the stem branch in
   * `matchRank`, a summary word, a `roadmapAliases` term or the `keycap` alias.
   */
  it("reaches an inflected name, an owned subject and a target's word (plan 585)", async () => {
    const expected = [
      ["theme", "/docs/theming"],
      ["capability", "/docs/capabilities"],
      ["tree", "/docs/data-display"],
      ["log", "/docs/data-display"],
      ["chart", "/docs/data-display"],
      ["charts", "/docs/data-display"],
      ["focus", "/docs/accessibility"],
      ["diff", "/docs/roadmap"],
      ["editor", "/docs/roadmap"],
      ["drag", "/docs/roadmap"],
      ["markdown", "/docs/roadmap"],
      ["rich text", "/docs/roadmap"],
      ["toolbar", "/docs/roadmap"],
      ["keybinding", "/docs/components/keycap"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return destination === url
          ? null
          : `${query} -> ${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * Plan 585's new rules must not steal the words the earlier passes assigned:
   * a summary word or a roadmap alias that claims `table`, `panel`, `input` or
   * `label` is a regression, not a recovered query.
   */
  it("keeps the words the earlier passes assigned (plan 585)", async () => {
    const expected = [
      ["table", "/docs/data-display"],
      ["panel", "/docs/workspace"],
      ["input", "/docs/components/text-input"],
      ["label", "/docs/components/label"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        const destination = first?.url.split("#")[0];
        return destination === url
          ? null
          : `${query} -> ${destination ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  /**
   * The boundary of plan 585: a two-word phrase that names a promoted roadmap
   * target keeps the target row, even though Data display's summary also names
   * the subject. Plan 564's target rule outranks a description, and that is the
   * honest answer — the row carries the status and support the page cannot.
   */
  it("keeps a two-word target phrase on the roadmap (plan 585)", async () => {
    const [first] = await search("key value", 5);
    expect(first?.url).toBe("/docs/roadmap");
  });

  it("does not invent a part that no record declares", async () => {
    expect(await search("DialogTitleProbe")).toEqual([]);
  });

  it("reaches a generated document named in prose (plan 569)", async () => {
    const expected = [
      ["focusRing", "/docs/tokens-api#functions"],
      ["focus ring", "/docs/tokens-api#functions"],
      ["elevation shadow", "/docs/tokens-api#functions"],
      ["semantic roles", "/docs/theming#semantic-roles"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        return first?.type === "page" && first.url === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });

  it("keeps a plain word on its component page (plan 569)", async () => {
    const [input, label] = await Promise.all([
      search("input", 5),
      search("label", 5),
    ]);
    expect(input[0]?.url).toBe("/docs/components/text-input");
    expect(label[0]?.url).toBe("/docs/components/label");
  });

  it("caps the merged response at the limit", async () => {
    const results = await search("select", 3);
    expect(results).toHaveLength(3);
  });
});

const pageResult = (url: string): SortedResult => ({
  id: url,
  url,
  type: "page",
  content: url,
});

const textResult = (id: string, url: string): SortedResult => ({
  id,
  url,
  type: "text",
  content: `text at ${url}`,
});

const titledPage = (url: string, title: string): SortedResult => ({
  id: url,
  url,
  type: "page",
  content: title,
});

describe("mergeResults", () => {
  it("moves a component title match ahead of prose", () => {
    const merged = mergeResults(
      [
        textResult("architecture-1", "/docs/architecture"),
        textResult("architecture-2", "/docs/architecture#scope"),
      ],
      [
        pageResult("/docs/components/button-group"),
        pageResult("/docs/components/button"),
      ],
      "button",
    );
    expect(merged[0]?.url).toBe("/docs/components/button");
  });

  it("matches a word in a component title, not only its prefix", () => {
    const merged = mergeResults(
      [pageResult("/docs/installation")],
      [pageResult("/docs/components/text-input")],
      "input",
    );
    expect(merged[0]?.url).toBe("/docs/components/text-input");
  });

  it("keeps a fragment that ends a name word (plan 594)", () => {
    const merged = mergeResults(
      [textResult("architecture-1", "/docs/architecture")],
      [titledPage("/docs/components/date-picker", "DatePicker")],
      "picker",
    );
    expect(merged[0]?.url).toBe("/docs/components/date-picker");
  });

  it("does not name a title from the middle of a word (plan 594)", () => {
    const merged = mergeResults(
      [textResult("data-display-1", "/docs/data-display")],
      [titledPage("/docs/typography", "Typography")],
      "graph",
    );
    expect(merged[0]?.url).toBe("/docs/data-display");
  });

  it("moves an exported name match ahead of prose too", () => {
    const merged = mergeResults(
      [pageResult("/docs/patterns/settings-form")],
      [pageResult("/docs/components/spinner")],
      "Spinner",
    );
    expect(merged[0]?.url).toBe("/docs/components/spinner");
  });

  it("ranks a page-title token match ahead of prose", () => {
    const merged = mergeResults(
      [textResult("popover-1", "/docs/components/popover#theming")],
      [titledPage("/docs/components/popover", "Popovers")],
      "popover placement",
    );
    expect(merged[0]?.url).toBe("/docs/components/popover");
  });

  it("keeps a whole page-title match ahead of a token-only component match", () => {
    const merged = mergeResults(
      [titledPage("/docs/patterns/command-palette", "Command palette")],
      [titledPage("/docs/components/command-menu", "Command menus")],
      "command palette",
    );
    expect(merged[0]?.url).toBe("/docs/patterns/command-palette");
  });

  it("keeps a whole page-title match ahead of an exact token", () => {
    const merged = mergeResults(
      [titledPage("/docs/guides/buttons", "Buttons guide")],
      [titledPage("/docs/components/button", "Buttons")],
      "buttons guide",
    );
    expect(merged[0]?.url).toBe("/docs/guides/buttons");
  });

  it("leaves prose first when no component title matches", () => {
    const merged = mergeResults(
      [pageResult("/docs/installation")],
      [pageResult("/docs/components/button")],
      "installation",
    );
    expect(merged[0]?.url).toBe("/docs/installation");
  });

  it("lists a page once, page hit or registry hit", () => {
    const merged = mergeResults(
      [pageResult("/docs/components/toast")],
      [pageResult("/docs/components/toast")],
      "toast",
    );
    expect(merged).toHaveLength(1);
  });
});

/**
 * Plan 585: a title in another inflection is still the same name. Without the
 * stem branch these two queries leave the page candidate unranked and the prose
 * result wins.
 */
describe("inflected page titles (plan 585)", () => {
  it("finds Theming by theme", () => {
    const merged = mergeResults(
      [textResult("tokens-1", "/docs/tokens-api#theme-shapes")],
      [titledPage("/docs/theming", "Theming")],
      "theme",
    );
    expect(merged[0]?.url).toBe("/docs/theming");
  });

  it("finds GPUix capabilities by capability", () => {
    const merged = mergeResults(
      [textResult("native-1", "/docs/native-testing#the-check-model")],
      [titledPage("/docs/capabilities", "GPUix capabilities")],
      "capability",
    );
    expect(merged[0]?.url).toBe("/docs/capabilities");
  });

  it("keeps an exact title ahead of a stem match", () => {
    const merged = mergeResults(
      [titledPage("/docs/theming", "Theming")],
      [titledPage("/docs/theme-editor", "Theme")],
      "theme",
    );
    expect(merged[0]?.url).toBe("/docs/theme-editor");
  });
});

/** The two real summaries plan 568 measured, plus one that matches nothing. */
const summaries = new Map<string, PageMetadata>([
  [
    "/docs/data-display",
    {
      title: "Data display",
      description: "Tables, selection, and virtualised data presentation.",
    },
  ],
  [
    "/docs/component-pages",
    {
      title: "Component pages",
      description:
        "The record, sections and guards behind every component page.",
    },
  ],
  [
    "/docs/architecture",
    {
      title: "Architecture",
      description: "How the packages fit together.",
    },
  ],
]);

describe("page descriptions (plan 568)", () => {
  it("ranks a summary that names the query ahead of prose", () => {
    const merged = mergeResults(
      [
        titledPage("/docs/api", "API"),
        titledPage("/docs/data-display", "Data display"),
      ],
      [],
      "table",
      summaries,
    );
    expect(merged[0]?.url).toBe("/docs/data-display");
  });

  it("keeps a whole page title ahead of another page's summary", () => {
    const merged = mergeResults(
      [
        titledPage("/docs/guides/tables", "Tables"),
        titledPage("/docs/data-display", "Data display"),
      ],
      [],
      "tables",
      summaries,
    );
    expect(merged[0]?.url).toBe("/docs/guides/tables");
  });

  it("keeps a component title ahead of a page summary", () => {
    const merged = mergeResults(
      [titledPage("/docs/data-display", "Data display")],
      [titledPage("/docs/components/button", "Buttons")],
      "button",
      new Map([
        [
          "/docs/data-display",
          { title: "Data display", description: "Tables and buttons." },
        ],
      ]),
    );
    expect(merged[0]?.url).toBe("/docs/components/button");
  });

  it("does not match a fragment inside a word", () => {
    const merged = mergeResults(
      [
        titledPage("/docs/architecture", "Architecture"),
        titledPage("/docs/surface-notes", "Surface notes"),
      ],
      [],
      "lab",
      new Map([
        [
          "/docs/surface-notes",
          {
            title: "Surface notes",
            description: "Collaboration surfaces.",
          },
        ],
      ]),
    );
    expect(merged[0]?.url).toBe("/docs/architecture");
  });

  it("matches every word of a phrase in the summary", () => {
    const merged = mergeResults(
      [
        titledPage("/docs/architecture", "Architecture"),
        titledPage("/docs/accessibility", "Accessibility"),
      ],
      [],
      "screen reader",
      new Map([
        [
          "/docs/accessibility",
          {
            title: "Accessibility",
            description:
              "The ARIA attributes, what assistive technology and screen readers receive.",
          },
        ],
      ]),
    );
    expect(merged[0]?.url).toBe("/docs/accessibility");
  });

  it("does not rank a component page by its summary", () => {
    const merged = mergeResults(
      [
        titledPage("/docs/data-display", "Data display"),
        titledPage(
          "/docs/components/keycap",
          "Keyboard shortcuts / keycap display",
        ),
      ],
      [],
      "table",
      new Map([
        [
          "/docs/components/keycap",
          {
            title: "Keyboard shortcuts / keycap display",
            description: "A categorised shortcut table with keycaps.",
          },
        ],
      ]),
    );
    expect(merged[0]?.url).toBe("/docs/data-display");
  });

  it("synthesizes one page hit for a summary that names the query", () => {
    const hits = pageDescriptionHits("table", summaries);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      url: "/docs/data-display",
      type: "page",
      content: "Data display",
    });
  });

  it("synthesizes nothing when no summary names the query", () => {
    expect(pageDescriptionHits("zzzznosuchtermzzzz", summaries)).toEqual([]);
  });
});

const generatedFixture = (
  names: ReadonlyArray<string>,
): GeneratedSearchEntry => ({
  names,
  index: {
    title: "Fixture",
    description: "A fixture document.",
    content: names.join("\n"),
    url: "/docs/fixture",
    breadcrumbs: [],
  },
});

describe("generated name candidates (plan 569)", () => {
  it("synthesizes a page hit for a promoted name written as words", () => {
    const hits = generatedNameHits("focus ring", [
      generatedFixture(["focusRing"]),
    ]);
    expect(hits).toEqual([
      {
        id: "generated-name:/docs/fixture",
        url: "/docs/fixture",
        type: "page",
        content: "Fixture",
      },
    ]);
  });

  it("synthesizes nothing for a single plain word", () => {
    expect(
      generatedNameHits("input", [generatedFixture(["inputForeground"])]),
    ).toEqual([]);
  });

  it("leaves prose behind a synthesized page", () => {
    const merged = mergeResults(
      [textResult("chunk", "/docs/tokens-api#functions")],
      generatedNameHits("elevation shadow"),
      "elevation shadow",
    );
    expect(merged[0]).toMatchObject({
      type: "page",
      url: "/docs/tokens-api#functions",
    });
  });

  it("lists a generated page once when the index returned it too", () => {
    const synthesized = generatedNameHits("focus ring");
    expect(synthesized).toHaveLength(1);
    const merged = mergeResults(
      [],
      [...synthesized, pageResult("/docs/tokens-api#functions")],
      "focus ring",
    );
    expect(merged).toHaveLength(1);
  });

  /**
   * Plan 605: the site stated virtualisation facts in three fragments
   * (Data display, the capability matrix, List's limitation), so `performance`,
   * `benchmark`, `fps` and `10k rows` returned nothing or the wrong page.
   * `virtualized` and `list` stay with the pages earlier plans assigned.
   */
  it("finds the performance page by the words readers use (plan 605)", async () => {
    const expected = [
      ["performance", "/docs/performance"],
      ["benchmark", "/docs/performance"],
      ["fps", "/docs/performance"],
      ["frame rate", "/docs/performance"],
      ["10k rows", "/docs/performance"],
      ["memory", "/docs/performance"],
      ["virtualized", "/docs/data-display"],
      ["list", "/docs/components/list"],
    ] as const;
    const misses = await Promise.all(
      expected.map(async ([query, url]) => {
        const [first] = await search(query, 5);
        return first?.type === "page" && first.url.split("#")[0] === url
          ? null
          : `${query} -> ${first?.type ?? "nothing"}:${first?.url ?? "nothing"}`;
      }),
    );
    expect(misses.filter((miss) => miss !== null)).toEqual([]);
  });
});

describe("withoutTypeTableRows", () => {
  it("drops generated prop rows and keeps authored prose", () => {
    const prose = pageResult("/docs/components/checkbox");
    const row = textResult(
      "row",
      "/docs/components/checkbox#type-table-Checkbox.tsx-CheckboxProps-checked",
    );

    expect(withoutTypeTableRows([row, prose])).toEqual([prose]);
  });
});

describe("componentSearchUrl", () => {
  it("sends a planned component to the filtered index", () => {
    expect(
      componentSearchUrl({
        slug: "dialog",
        status: "planned",
        title: "Dialogs",
      }),
    ).toBe("/docs/components?q=Dialogs");
  });

  it("sends a finished component to its own page", () => {
    expect(
      componentSearchUrl({ slug: "button", status: "done", title: "Buttons" }),
    ).toBe("/docs/components/button");
  });
});

describe("parseSearchLimit", () => {
  it("falls back to the default for a missing or unparseable value", () => {
    expect(parseSearchLimit(null)).toBe(DEFAULT_SEARCH_LIMIT);
    expect(parseSearchLimit("many")).toBe(DEFAULT_SEARCH_LIMIT);
  });

  it("clamps the value into the supported range", () => {
    expect(parseSearchLimit("0")).toBe(1);
    expect(parseSearchLimit(String(MAX_SEARCH_LIMIT + 10))).toBe(
      MAX_SEARCH_LIMIT,
    );
  });
});

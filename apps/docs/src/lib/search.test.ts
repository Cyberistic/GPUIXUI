import { describe, expect, it } from "vitest";
import type { SortedResult } from "fumadocs-core/search";
import type { ComponentMetaInput } from "@/component-meta/schema";
import {
  componentSearchIndex,
  componentSearchUrl,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  mergeResults,
  parseSearchLimit,
  search,
  withoutTypeTableRows,
} from "./search";

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

  it("does not invent a part that no record declares", async () => {
    expect(await search("DialogTitleProbe")).toEqual([]);
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

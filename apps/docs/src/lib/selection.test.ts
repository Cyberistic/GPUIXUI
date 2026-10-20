import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findRangeFields,
  highlightFields,
  selectionAbsences,
  selectionMethods,
  selectionViolations,
  textSearchFields,
} from "./selection";
import { installedNativeDeclarations } from "./native-declarations.testing";
import { search } from "./search";
import { source } from "./source";

/**
 * Guards plan 627. The bug: the runtime selects text natively, paints match
 * washes and ships a find controller, and none of it had a page — measured
 * 2026-10-20, `getSelectedText`, `onSelectionChange` and `observeSelectedText`
 * returned nothing, `useTextSearch` and `findRanges` reached the roadmap, and
 * `text selection` reached the Text component.
 *
 * The rows are authored in `selection.ts`; these tests compare them with the
 * installed `@gpuix/native` declarations in both directions, prove each rule
 * with a mutation, and pin the page and its search vocabulary.
 */
const appDirectory = fileURLToPath(new URL("../../", import.meta.url));
const page = readFileSync(
  join(appDirectory, "content/docs/selection.mdx"),
  "utf8",
);
const declarations = installedNativeDeclarations().join("\n");

const base = {
  declarations,
  highlight: highlightFields,
  textSearch: textSearchFields,
  findRanges: findRangeFields,
  methods: selectionMethods,
  absences: selectionAbsences,
};

describe("the installed selection surface", () => {
  it("agrees with the declarations in both directions", () => {
    expect(selectionViolations(base)).toEqual([]);
  });

  it("fails when a documented field is not declared", () => {
    expect(
      selectionViolations({
        ...base,
        highlight: [
          ...highlightFields,
          { name: "glow", summary: "Not a real field." },
        ],
      }),
    ).toContain("HighlightSpec: glow is documented but not declared");
  });

  it("fails when a declared field is undocumented", () => {
    expect(
      selectionViolations({
        ...base,
        textSearch: textSearchFields.filter((field) => field.name !== "radius"),
      }),
    ).toContain("TextSearchOptions: radius is declared but undocumented");
  });

  it("fails when the renderer method name drifts", () => {
    expect(
      selectionViolations({
        ...base,
        methods: selectionMethods.map((method) =>
          method.name === "getSelectedText"
            ? { ...method, name: "readSelectedText" }
            : method,
        ),
      }),
    ).toEqual(
      expect.arrayContaining([
        "GpuixRenderer: readSelectedText is documented but not declared",
        "GpuixRenderer: getSelectedText is a selection method but undocumented",
      ]),
    );
  });

  it("fails when a claimed absence becomes real", () => {
    expect(
      selectionViolations({
        ...base,
        absences: [
          ...selectionAbsences,
          {
            subject: "Fixture",
            statement: "Not provided.",
            symbol: /StyleDesc/u,
          },
        ],
      }),
    ).toContain(
      "Fixture: the page says it is absent, but the declarations now contain StyleDesc",
    );
  });
});

describe("the page", () => {
  it("mounts every table and keeps every section", () => {
    const missing = [
      "<HighlightFields />",
      "<TextSearchFields />",
      "<FindRangeFields />",
      "<SelectionAbsences />",
    ].filter((block) => !page.includes(block));
    expect(missing).toEqual([]);

    const headings = [
      "## Reading the selection",
      "## Highlighting matches",
      "## A find bar",
      "## Virtualized content",
      "## Native text and ranges",
      "## What is not provided",
      "## Proving a highlight",
    ].filter((heading) => !page.includes(heading));
    expect(headings).toEqual([]);
  });

  it("names its three subjects in the summary", () => {
    const description =
      page
        .slice(0, page.indexOf("\n---", 3))
        .split("\n")
        .find((line) => line.startsWith("description:"))
        ?.slice("description:".length)
        .trim()
        .slice(1, -1) ?? "";
    const missing = ["selection", "highlight", "find"].filter(
      (word) => !description.toLowerCase().includes(word),
    );
    expect(missing).toEqual([]);
  });

  it("serves the page in the sidebar and the sitemap", () => {
    const urls = new Set(source.getPages().map((served) => served.url));
    expect(urls.has("/docs/selection")).toBe(true);
    const meta = readFileSync(
      join(appDirectory, "content/docs/meta.json"),
      "utf8",
    );
    expect(meta).toContain('"selection"');
  });
});

const owned: ReadonlyArray<readonly [string, string]> = [
  ["text selection", "/docs/selection"],
  ["select text", "/docs/selection"],
  ["get selected text", "/docs/selection"],
  ["find in page", "/docs/selection"],
  ["search highlight", "/docs/selection"],
  ["highlight matches", "/docs/selection"],
  ["match count", "/docs/selection"],
  ["getSelectedText", "/docs/selection"],
  ["onSelectionChange", "/docs/selection"],
  ["observeSelectedText", "/docs/selection"],
  ["useTextSearch", "/docs/selection"],
  ["findRanges", "/docs/selection"],
  ["highlight", "/docs/selection"],
  ["selection", "/docs/selection"],
  ["find", "/docs/selection"],
  ["clipboard", "/docs/selection"],
  ["text highlight", "/docs/selection"],
];

const regressions: ReadonlyArray<readonly [string, string]> = [
  ["radio group", "/docs/components/radio-group"],
  ["select", "/docs/components/select"],
  ["select row", "/docs/data-display"],
  ["search", "/docs/components/search-input"],
];

describe("search", { timeout: 120_000 }, () => {
  it("names the selection surface from the words a reader types", async () => {
    const wrong: string[] = [];
    for (const [query, url] of owned) {
      const [first] = await search(query, 2);
      if (first?.url !== url)
        wrong.push(`${query} → ${first?.url ?? "nothing"}`);
    }
    expect(wrong).toEqual([]);
  });

  it("keeps the words that belong to a component", async () => {
    const wrong: string[] = [];
    for (const [query, url] of regressions) {
      const [first] = await search(query, 2);
      if (first?.url !== url)
        wrong.push(`${query} → ${first?.url ?? "nothing"}`);
    }
    expect(wrong).toEqual([]);
  });
});

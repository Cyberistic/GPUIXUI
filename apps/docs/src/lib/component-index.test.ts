import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildIndex,
  filterEntries,
  limitationsOf,
  pageUrl,
  partsOf,
  propsOf,
  verdictMark,
  type ComponentEntry,
  type ComponentPage,
  type PageVerdict,
  type VerdictOf,
} from "./component-index";
import { componentIndex } from "./component-index-data";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { laneView, summarize } from "./inventory";
import { inventory } from "./inventory-data";
import { statusForPage } from "./inventory-status";
import { readPublishedModules, repoRoot } from "./public-symbols-source";

/**
 * The component index, and the rows it is allowed to show.
 *
 * The index is generated from the pages' own frontmatter, which makes two
 * failures silent: a page whose URL the mapping does not know simply vanishes
 * from the list, and a curated page that does not win its URL is listed twice.
 * The guards fix the mapping, the shadowing and the filter, then hold the real
 * index to the files on disk.
 */

const page = (
  file: string,
  title?: string,
  description?: string,
): ComponentPage => ({
  file,
  source: [
    "---",
    ...(title === undefined ? [] : [`title: ${title}`]),
    ...(description === undefined ? [] : [`description: ${description}`]),
    "---",
    "",
    "Body.",
  ].join("\n"),
});

const entry = (
  title: string,
  section: string,
  description = "",
  parts: ReadonlyArray<string> = [],
  limitations = "",
  props: ReadonlyArray<string> = [],
  types: ReadonlyArray<string> = [],
  preview = false,
): ComponentEntry => ({
  title,
  description,
  section,
  parts,
  props,
  types,
  limitations,
  preview,
  verdict: undefined,
  url: `/docs/${section.toLowerCase()}/${title.toLowerCase()}`,
});

/** A verdict source that knows no rows: the pure cases do not need one. */
const noVerdict: VerdictOf = () => undefined;

const root = new URL("../../../../", import.meta.url);

const packageFiles = (): ReadonlyArray<string> =>
  packageCollections.flatMap((collection) =>
    collectionPages(root, collection).map(
      (name) => `${collection.dir}/${name}`,
    ),
  );

describe("the index's URL mapping", () => {
  it("maps a curated page and each package's pages to their route", () => {
    expect(pageUrl("content/docs/components/dialog.mdx")).toBe(
      "/docs/components/dialog",
    );
    expect(pageUrl("packages/components/docs/card.mdx")).toBe(
      "/docs/components/card",
    );
    expect(pageUrl("packages/primitives/docs/slider.mdx")).toBe(
      "/docs/primitives/slider",
    );
    expect(pageUrl("packages/icons/docs/icon.mdx")).toBe("/docs/icons/icon");
  });

  it("drops a section index and a file that is not a component page", () => {
    expect(pageUrl("content/docs/components/index.mdx")).toBeUndefined();
    expect(pageUrl("content/docs/installation.mdx")).toBeUndefined();
    expect(pageUrl("packages/components/README.md")).toBeUndefined();
  });
});

describe("the index built from pages", () => {
  it("keeps the first page for a URL, so a curated page shadows the package's", () => {
    const entries = buildIndex(
      [
        page(
          "content/docs/components/dialog.mdx",
          "Dialog",
          "The curated one.",
        ),
        page(
          "packages/components/docs/dialog.mdx",
          "Dialog",
          "The package one.",
        ),
      ],
      noVerdict,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.description).toBe("The curated one.");
  });

  it("orders primitives before components and each section by title", () => {
    const entries = buildIndex(
      [
        page("packages/components/docs/tabs.mdx", "Tabs"),
        page("packages/primitives/docs/button.mdx", "Button"),
        page("packages/components/docs/accordion.mdx", "Accordion"),
        page("packages/icons/docs/icon.mdx", "Icon"),
      ],
      noVerdict,
    );

    expect(entries.map((row) => row.title)).toEqual([
      "Button",
      "Icon",
      "Accordion",
      "Tabs",
    ]);
    expect(entries.map((row) => row.section)).toEqual([
      "Primitives",
      "Primitives",
      "Components",
      "Components",
    ]);
  });

  it("drops a page with no title instead of listing a blank row", () => {
    const entries = buildIndex(
      [
        page("packages/components/docs/card.mdx"),
        page("packages/components/docs/badge.mdx", "Badge", "A status label."),
      ],
      noVerdict,
    );

    expect(entries.map((row) => row.title)).toEqual(["Badge"]);
  });

  it("marks a page that mounts a browser preview, and only that page", () => {
    // The badge is a claim about the page, so it is read from the page: the
    // curated pages open with `<ComponentPreview`, and a package page opens
    // with the native-run note instead (`docs/preview-strategy.md`).
    const entries = buildIndex(
      [
        {
          file: "content/docs/components/dialog.mdx",
          source:
            '---\ntitle: Dialog\n---\n\n<ComponentPreview name="dialog-demo" />',
        },
        page("packages/components/docs/card.mdx", "Card"),
      ],
      noVerdict,
    );

    expect(entries.map((row) => [row.title, row.preview])).toEqual([
      ["Card", false],
      ["Dialog", true],
    ]);
  });
});

describe("the verdict a row reports", () => {
  const rows: Readonly<Record<string, PageVerdict>> = {
    Button: { status: "done", support: "partial" },
    Card: { status: "done", support: "yes" },
    Skeleton: { status: "todo", support: "?" },
  };
  const verdicts: VerdictOf = (title) => rows[title];
  const entries = buildIndex(
    [
      page("packages/primitives/docs/button.mdx", "Button"),
      page("packages/components/docs/card.mdx", "Card"),
      page("packages/primitives/docs/skeleton.mdx", "Skeleton"),
      page("packages/components/docs/theme-provider.mdx", "ThemeProvider"),
    ],
    verdicts,
  );

  it("carries the inventory row beside the page, and none when the page has no row", () => {
    expect(entries.map((row) => [row.title, row.verdict])).toEqual([
      ["Button", { status: "done", support: "partial" }],
      ["Skeleton", { status: "todo", support: "?" }],
      ["Card", { status: "done", support: "yes" }],
      ["ThemeProvider", undefined],
    ]);
  });

  it("marks only the rows whose verdict is not whole", () => {
    // `done` on `yes` is the shipped component; an unmarked row is complete on
    // both axes, so a badge always means something.
    expect(verdictMark({ status: "done", support: "yes" })).toBeUndefined();
    expect(
      verdictMark({ status: "done", support: "yes (measured)" }),
    ).toBeUndefined();
    expect(verdictMark({ status: "done", support: "partial" })).toEqual({
      label: "partial",
      detail: "status: done · GPUix support: partial",
    });
    expect(verdictMark(undefined)).toBeUndefined();
  });

  it("names both axes when neither is whole, reading `?` as unknown", () => {
    expect(verdictMark({ status: "todo", support: "?" })).toEqual({
      label: "todo · unknown",
      detail: "status: todo · GPUix support: ?",
    });
    expect(verdictMark({ status: "blocked", support: "partial" })?.label).toBe(
      "blocked · partial",
    );
  });

  it("finds a component by its verdict, so partial support is a query", () => {
    expect(filterEntries(entries, "partial").map((row) => row.title)).toEqual([
      "Button",
    ]);
    expect(filterEntries(entries, "unknown").map((row) => row.title)).toEqual([
      "Skeleton",
    ]);
  });
});

describe("the filter", () => {
  const entries = [
    entry("Search input", "Components", "A field that queries a list."),
    entry("Input", "Primitives", "A single-line text field."),
    entry("Dialog", "Components", "A modal surface.", ["DialogFooter"]),
  ];

  it("returns every row for an empty or blank query", () => {
    expect(filterEntries(entries, "")).toEqual(entries);
    expect(filterEntries(entries, "   ")).toEqual(entries);
  });

  it("matches a title, a description or a section, ignoring case", () => {
    expect(filterEntries(entries, "SEARCH")).toHaveLength(1);
    expect(filterEntries(entries, "modal")).toHaveLength(1);
    expect(filterEntries(entries, "primitives")).toEqual([entries[1]]);
  });

  it("requires every term, so a second word narrows rather than widens", () => {
    expect(filterEntries(entries, "input")).toHaveLength(2);
    expect(filterEntries(entries, "search input")).toHaveLength(1);
    expect(filterEntries(entries, "search dialog")).toEqual([]);
  });

  it("finds a page by the name of a part it documents", () => {
    expect(filterEntries(entries, "dialogfooter")).toEqual([entries[2]]);
  });

  it("finds a page by a prop or a prop type its API table declares", () => {
    const switchRow = entry(
      "Switch",
      "Primitives",
      "An on/off control.",
      [],
      "",
      ["onCheckedChange", "style"],
      ["StateStyle", "SwitchState"],
    );
    const withApi = [...entries, switchRow];

    expect(filterEntries(withApi, "oncheckedchange")).toEqual([switchRow]);
    expect(filterEntries(withApi, "statestyle")).toEqual([switchRow]);
    expect(filterEntries(withApi, "switch")).toEqual([switchRow]);
  });

  it("still needs every term once a prop matches", () => {
    const switchRow = entry(
      "Switch",
      "Primitives",
      "An on/off control.",
      [],
      "",
      ["onCheckedChange"],
    );

    expect(filterEntries([switchRow], "oncheckedchange primitives")).toEqual([
      switchRow,
    ]);
    expect(filterEntries([switchRow], "oncheckedchange dialog")).toEqual([]);
  });

  it("finds the pages that open with a browser preview", () => {
    // The index says only the curated pages preview the component; a reader who
    // wants to see one had no query for it, because none of those rows carries
    // the word "preview" in its title, description or API table.
    const withPreview = [
      entry("Button", "Components", "An action.", [], "", [], [], true),
      entry("Card", "Components", "A surface."),
    ];

    expect(filterEntries(withPreview, "preview")).toEqual([withPreview[0]]);
    expect(filterEntries(withPreview, "browser preview")).toEqual([
      withPreview[0],
    ]);
  });
});

describe("the props a page documents", () => {
  it("reads the prop names and the named types from an API table", () => {
    const source = [
      "## API",
      "",
      "| Prop | Type | Default | Consequence |",
      "| ---- | ---- | ------- | ----------- |",
      "| `checked` | `boolean` | — | controlled |",
      "| `onCheckedChange` | `(next: boolean) => void` | none | the next boolean |",
      "| `style` | `StateStyle<SwitchState>` | — | merged last |",
    ].join("\n");

    expect(propsOf(source)).toEqual({
      props: ["checked", "onCheckedChange", "style"],
      types: ["StateStyle", "SwitchState"],
    });
  });

  it("splits a paired row and skips the part the table is headed by", () => {
    const source = [
      "## API reference",
      "",
      "| `Dialog` prop | Type | Default |",
      "| ------------- | ---- | ------- |",
      "| `open` | `boolean` | — |",
      "| `onOpenChange` / `onClose` | `(open: boolean) => void` | — |",
    ].join("\n");

    expect(propsOf(source)).toEqual({
      props: ["open", "onOpenChange", "onClose"],
      types: [],
    });
  });

  it("reads a props sentence in a part table, keeping the part out of the props", () => {
    const source = [
      "## API",
      "",
      "| Part | Renders | Props |",
      "| ---- | ------- | ----- |",
      '| `TagInput` | `div` with `role="group"` | `value` (required), `onValueChange` (required), `max?`, `allowDuplicates?` |',
      "| `TagInputField` | `<input>` | `style?: StateStyle<TagInputFieldState>` |",
    ].join("\n");

    expect(propsOf(source)).toEqual({
      props: ["value", "onValueChange", "max", "allowDuplicates", "style"],
      types: ["StateStyle", "TagInputFieldState"],
    });
  });

  it("reads a part-per-row table with a prop and a type column", () => {
    const source = [
      "## API",
      "",
      "| Part | Prop | Type | Default |",
      "| ---- | ---- | ---- | ------- |",
      '| `Alert` | `tone` | `"neutral" \\| "success"` | `"neutral"` |',
      "| `Alert` | `onDismiss` | `() => void` | — |",
    ].join("\n");

    expect(propsOf(source)).toEqual({
      props: ["tone", "onDismiss"],
      types: [],
    });
  });

  it("ignores a table outside an API section, and one inside a fence", () => {
    const source = [
      "## Usage",
      "",
      "| `notAProp` | `boolean` |",
      "",
      "## API",
      "",
      "```md",
      "| `fenced` | `boolean` |",
      "```",
      "",
      "| Prop | Type |",
      "| ---- | ---- |",
      "| `open` | `boolean` |",
    ].join("\n");

    expect(propsOf(source).props).toEqual(["open"]);
  });

  it("reads nothing from a page that documents no props", () => {
    expect(propsOf("## Usage\n\nA `Switch` in a sentence.")).toEqual({
      props: [],
      types: [],
    });
  });

  it("does not read a default value as a prop", () => {
    // `(default `false`)` inside a props cell made "false" a prop of the menu
    // pages, so the index's prop list and its filter both answered a query for
    // a value.
    const source = [
      "## API",
      "",
      "| Part | Renders | Props |",
      "| ---- | ------- | ----- |",
      "| `MenuCheckboxItem` | an on/off row | `checked` (required), `closeOnSelect?: boolean` (default `false`), `textValue?: string` |",
    ].join("\n");

    expect(propsOf(source).props).toEqual([
      "checked",
      "closeOnSelect",
      "textValue",
    ]);
  });
});

describe("the parts a page documents", () => {
  it("reads a parts table", () => {
    const source = [
      "## Anatomy",
      "",
      "| Part | Responsibility |",
      "| ---- | -------------- |",
      "| `Dialog` | owns the state |",
      "| `DialogFooter` | the actions |",
    ].join("\n");

    expect(partsOf(source)).toEqual(["Dialog", "DialogFooter"]);
  });

  it("reads an API table headed by the part's name", () => {
    const source = [
      "## API",
      "",
      "| `Dialog` prop | Type | Default |",
      "| ------------- | ---- | ------- |",
      "| `open` | `boolean` | uncontrolled |",
    ].join("\n");

    expect(partsOf(source)).toEqual(["Dialog"]);
  });

  it("reads a heading per part", () => {
    const source = [
      "## API reference",
      "",
      "### Dialog",
      "",
      "### DialogContent",
    ].join("\n");

    expect(partsOf(source)).toEqual(["Dialog", "DialogContent"]);
  });

  it("reads the composition table the curated template uses", () => {
    const source = [
      "## Composition",
      "",
      "| Part | Responsibility |",
      "| ---- | -------------- |",
      "| `Dialog` | owns the state |",
      "| `DialogFooter` | the actions |",
    ].join("\n");

    expect(partsOf(source)).toEqual(["Dialog", "DialogFooter"]);
  });

  it("reads nothing from a section that documents no parts", () => {
    expect(partsOf("## Usage\n\nA `Dialog` in a sentence.")).toEqual([]);
  });
});

describe("the limitations a page records", () => {
  it("reads the limit section", () => {
    const source = "## Limitations\n\nNo `aria-current` in 0.11.0.";

    expect(limitationsOf(source)).toContain("aria-current");
  });

  it("reads the accessibility section the packages use", () => {
    const source = "## Accessibility\n\nThe role is `dialog`.";

    expect(limitationsOf(source)).toContain("dialog");
  });

  it("reads nothing from a page that records no limits", () => {
    expect(limitationsOf("## Usage\n\nNothing.")).toBe("");
  });
});

describe("the real index", () => {
  it("lists every component page once", () => {
    const urls = componentIndex.map((row) => row.url);

    expect(componentIndex.length).toBeGreaterThan(60);
    expect(new Set(urls).size).toBe(urls.length);
    expect(
      componentIndex.filter((row) => row.description.trim() === ""),
    ).toEqual([]);
  });

  it("has a row for every file the packages ship, unless a curated page shadows it", () => {
    const listed = new Set(componentIndex.map((row) => row.url));
    const curated = new Set(
      readdirSync(new URL("apps/docs/content/docs/components/", root))
        .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
        .map((name) => `/docs/components/${name.replace(/\.mdx$/, "")}`),
    );

    const missing = packageFiles().filter((file) => {
      const url = pageUrl(file);
      if (url === undefined) return true;
      // The curated page owns the URL; the package row is shadowed on purpose.
      return !listed.has(url) && !curated.has(url);
    });

    expect(missing).toEqual([]);
  });

  it("leaves a lane's status to its rows", () => {
    // The page said the data lane was partial — "column configuration,
    // virtualisation, a tree view, charts and the inspector surfaces are still
    // `todo`" — after every one of those rows had shipped. The rows carry the
    // inventory's verdict, so the page must not keep a second copy that only
    // the reader notices is stale.
    const source = readFileSync(
      new URL("apps/docs/content/docs/components/index.mdx", root),
      "utf8",
    );
    const tier3 = inventory.rows.filter((row) => row.tier === 3);
    const shipped = tier3.filter((row) => row.status !== "todo");

    expect(shipped.length).toBeGreaterThan(10);
    expect(source).toContain("](/docs/data-display)");
    expect(source).not.toContain("still `todo`");

    // The Table page carried the same list: "the rows that remain — a tree, a
    // chart surface — are recorded as gaps", after both shipped. It names the
    // pages a grid composes with instead.
    const tablePage = readFileSync(
      new URL("apps/docs/content/docs/components/table.mdx", root),
      "utf8",
    );
    expect(tablePage).not.toContain("recorded as gaps");
    expect(tablePage).not.toContain("the rows that remain");
  });

  it("starts with the primitives and ends with the data surfaces", () => {
    // The sections are the sidebar's order, read off the rows instead of
    // retyped: a package that lands after the components appends a section,
    // and a row that drifts back into an earlier section fails here.
    expect(componentIndex.length).toBeGreaterThan(0);
    const sections = [...new Set(componentIndex.map((row) => row.section))];
    expect(sections).toEqual(["Primitives", "Components", "Data display"]);
    expect(componentIndex[0]?.section).toBe("Primitives");
    expect(componentIndex.at(-1)?.section).toBe("Data display");
  });

  it("marks exactly the pages the site curates with a preview", () => {
    // The badge, and the "preview" query, are only honest if the count is the
    // folder's: every curated page opens with `<ComponentPreview`, and no
    // package page does. Comparing the two sets keeps a badge off a page that
    // has no preview and on one that gained it.
    const curated = readdirSync(
      new URL("apps/docs/content/docs/components/", root),
    )
      .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
      .map((name) => ({
        url: `/docs/components/${name.replace(/\.mdx$/, "")}`,
        preview: readFileSync(
          new URL(`apps/docs/content/docs/components/${name}`, root),
          "utf8",
        ).includes("<ComponentPreview"),
      }));

    expect(curated.length).toBeGreaterThanOrEqual(4);
    expect(curated.filter((page) => !page.preview)).toEqual([]);
    expect(
      componentIndex.filter((row) => row.preview).map((row) => row.url),
    ).toEqual(curated.map((page) => page.url).toSorted());
  });

  it("reports the inventory verdict the page's strip prints", () => {
    // The row is what makes a mark honest, so the data module has to resolve
    // it for every page the inventory answers — the completeness rule itself
    // (a page with no row fails) belongs to `inventory-status.test.ts`, which
    // owns the status strip.
    const missing = componentIndex.filter(
      (row) =>
        row.verdict === undefined &&
        statusForPage(inventory, row.title).kind === "row",
    );
    const answered = componentIndex.filter((row) => row.verdict !== undefined);

    expect(missing).toEqual([]);
    expect(answered.length).toBeGreaterThan(80);
    // The provider is the argued exemption, so it has no verdict to wear.
    expect(
      componentIndex.find((row) => row.title === "ThemeProvider")?.verdict,
    ).toBeUndefined();
  });

  it("marks the components the runtime supports only in part", () => {
    const button = componentIndex.find(
      (row) => row.url === "/docs/primitives/button",
    );
    const card = componentIndex.find(
      (row) => row.url === "/docs/components/card",
    );
    const partial = componentIndex.filter((row) =>
      row.verdict?.support.startsWith("partial"),
    );

    expect(verdictMark(button?.verdict)?.label).toBe("partial");
    expect(verdictMark(card?.verdict)).toBeUndefined();
    // The mark is worth a badge only if it is common enough to scan for.
    expect(partial.length).toBeGreaterThan(30);
    expect(
      partial.filter(
        (row) => !filterEntries(componentIndex, "partial").includes(row),
      ),
    ).toEqual([]);
  });

  it("finds a component by a part name, which the sidebar cannot show", () => {
    const found = filterEntries(componentIndex, "DropdownMenuCheckboxItem");

    expect(found.map((row) => row.url)).toContain(
      "/docs/components/dropdown-menu",
    );
  });

  it("finds a component by a limitation it records", () => {
    const found = filterEntries(componentIndex, "aria-orientation");

    expect(found.length).toBeGreaterThan(0);
    expect(found.map((row) => row.url)).toContain("/docs/components/tabs");
  });

  it("finds a component by the parts a curated page composes", () => {
    const found = filterEntries(componentIndex, "DialogFooter").map(
      (row) => row.url,
    );

    expect(found).toEqual(["/docs/components/dialog"]);
  });

  it("finds a component by a prop its page documents", () => {
    const found = filterEntries(componentIndex, "onCheckedChange");

    expect(found.map((row) => row.url)).toContain("/docs/primitives/switch");
  });

  it("keeps a part name out of the props a part table lists", () => {
    const tagInput = componentIndex.find(
      (row) => row.url === "/docs/components/tag-input",
    );

    expect(tagInput?.props).toContain("onValueChange");
    expect(tagInput?.props).not.toContain("TagInput");
    expect(tagInput?.types).toContain("TagInputFieldState");
  });

  it("indexes props, never the part a table is headed by", () => {
    const capitalised = componentIndex.flatMap((row) =>
      row.props
        .filter((name) => !/^[a-z]/.test(name))
        .map((name) => `${row.url}: ${name}`),
    );

    expect(capitalised).toEqual([]);
  });

  it("finds the pages whose props take a named type", () => {
    const found = filterEntries(componentIndex, "StateStyle").map(
      (row) => row.url,
    );

    expect(found).toContain("/docs/primitives/switch");
    // A second axis needs more than one page: a single hit would be the title.
    expect(found.length).toBeGreaterThan(1);
  });

  it("keeps every query the Components page shows resolvable", () => {
    const page = readFileSync(
      new URL("../../content/docs/components/index.mdx", import.meta.url),
      "utf8",
    );
    const intro = page.slice(0, page.indexOf("<ComponentIndex"));
    const examples = [...intro.matchAll(/`([^`]+)`/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    );

    expect(examples.length).toBeGreaterThanOrEqual(4);
    expect(
      examples.filter(
        (term) => filterEntries(componentIndex, term).length === 0,
      ),
    ).toEqual([]);
  });

  it("never calls a pending lane shipped, so a reader is not sent to a page that is not there", () => {
    // The intro said the Tier 2 set was "dialogs, menus, tabs, pickers,
    // **tables** and the rest of the feedback layer", while `COMPONENTS.md`
    // recorded every Tier 3 table row as `todo` — a top-level page promising a
    // component the inventory says does not exist. The claim is held to the
    // inventory rather than to a fixed sentence: while the lane ships nothing
    // the word is refused; once it ships, the intro must not keep saying it
    // ships nothing (`@gpuixui/data` landed its table core, and the sentence
    // still called the lane unshipped).
    const page = readFileSync(
      new URL("../../content/docs/components/index.mdx", import.meta.url),
      "utf8",
    );
    const intro = page.slice(0, page.indexOf("<ComponentIndex"));
    const lane = laneView(inventory, "data-display");
    expect(lane.rows.length, "the data lane has no rows").toBeGreaterThan(0);
    const { shipped } = summarize(lane.rows);

    if (shipped === 0) {
      expect(
        /\btables\b/i.test(intro),
        "the Components index calls tables part of the shipped set",
      ).toBe(false);
    } else {
      expect(
        /data lane is not shipped/i.test(intro),
        "the Components index calls a partly shipped data lane unshipped",
      ).toBe(false);
      expect(
        /records (?:its|the data lane's) rows as `todo`/i.test(intro),
        "the Components index calls every data row pending while some ship",
      ).toBe(false);
      expect(
        intro.includes("@gpuixui/data"),
        "the Components index names the shipped data rows' package",
      ).toBe(true);
    }
    expect(intro).toContain("/docs/data-display");
  });

  it("lists only parts the library actually exports", () => {
    const exported = new Set(
      readPublishedModules(repoRoot).flatMap((module) =>
        module.symbols.map((symbol) => symbol.name),
      ),
    );
    const unknown = componentIndex.flatMap((row) =>
      row.parts
        .filter((part) => !exported.has(part))
        .map((part) => `${row.url}: ${part}`),
    );

    expect(unknown).toEqual([]);
  });
});

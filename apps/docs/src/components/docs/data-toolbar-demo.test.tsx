import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { packagePreviews } from "@/lib/package-preview";
import { demos } from "./demos";
import {
  DataToolbarDemo,
  QUEUE_ROWS,
  WAITS,
  createSearchReporter,
  matchingRows,
  searchLabel,
  searchWait,
} from "./data-toolbar-demo";

/**
 * The Data toolbars preview.
 *
 * `packages/data/docs/data-toolbar.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts` and the page carries no
 * `<ComponentPreview>`. The registry's guard sees the demo and the page mount;
 * what it cannot see is whether the drawing still keeps the row's contract —
 * the toolbar **owns no query**, its wait is the package's default unless the
 * caller names a readable one, and a blank field name is the shipped
 * `Search` — so the cases below hold the drawing to
 * `packages/data/src/surfaces/toolbar.tsx` and drive the debounce it draws.
 *
 * Guarded bug: the drawing painted a `Columns` button with no handler — a dead
 * control on the page about toolbars. The shipped toolbar has no column
 * control (its children are the caller's), so the button is gone rather than
 * wired to a menu the component does not own.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** Let a real timer run: the reporter's wait is milliseconds, not a clock. */
const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/** The services a query keeps, so a failure names the record it dropped. */
const matchingServices = (query: string): ReadonlyArray<string> =>
  Arr.map(matchingRows(query), (row) => row.service);

describe("the data toolbar preview", () => {
  it("schedules the wait the package documents", () => {
    // The premise is the package's own guard, read from its source: a wait the
    // timer cannot read is the default rather than an immediate report.
    const toolbar = read("packages/data/src/surfaces/toolbar.tsx");
    expect(toolbar).toContain("export const DEFAULT_SEARCH_DEBOUNCE_MS = 150;");
    expect(toolbar).toContain("!Number.isFinite(milliseconds)");
    expect(toolbar).toContain("milliseconds < 0");
    expect(toolbar).toContain("? DEFAULT_SEARCH_DEBOUNCE_MS");

    expect(searchWait(undefined)).toBe(150);
    expect(searchWait(Number.NaN)).toBe(150);
    expect(searchWait(Number.POSITIVE_INFINITY)).toBe(150);
    expect(searchWait(-5)).toBe(150);
    // Zero is the caller's immediate reporting, the one value that means it.
    expect(searchWait(0)).toBe(0);
    expect(searchWait(80)).toBe(80);
  });

  it("names a field the caller left blank with the package's default", () => {
    expect(searchLabel("")).toBe("Search");
    expect(searchLabel("   ")).toBe("Search");
    expect(searchLabel("  Filter services ")).toBe("Filter services");

    const toolbar = read("packages/data/src/surfaces/toolbar.tsx");
    expect(toolbar).toContain("DEFAULT_SEARCH_LABEL");
    expect(toolbar).toContain("spokenText(");
    expect(read("packages/data/docs/data-toolbar.mdx")).toContain(
      "A blank `search.label` reads as `Search`",
    );
  });

  it("reports one value per pause, the last one the reader typed", async () => {
    const reported: string[] = [];
    const reporter = createSearchReporter((next) => reported.push(next), 30);

    reporter.type("g");
    reporter.type("ga");
    reporter.type("gat");
    await sleep(5);
    // The pause has not ended, so nothing has been handed to the caller yet.
    expect(reported).toEqual([]);
    await sleep(40);
    expect(reported).toEqual(["gat"]);

    // A cancelled field reports nothing, which is the unmount rule.
    reporter.type("gate");
    reporter.cancel();
    await sleep(60);
    expect(reported).toEqual(["gat"]);
  });

  it("reports every keystroke when the caller names a zero wait", () => {
    const reported: string[] = [];
    const reporter = createSearchReporter((next) => reported.push(next), 0);

    reporter.type("r");
    reporter.type("re");
    expect(reported).toEqual(["r", "re"]);
  });

  it("filters on the value the toolbar reported, not the keystroke", () => {
    expect(QUEUE_ROWS).toHaveLength(6);
    expect(matchingServices("")).toEqual([
      "reports",
      "search",
      "media",
      "gateway",
      "billing",
      "identity",
    ]);
    expect(matchingServices("prod")).toEqual(["reports", "media", "billing"]);
    expect(matchingServices("  STAGING ")).toEqual([
      "search",
      "gateway",
      "identity",
    ]);
    expect(matchingServices("zzz")).toEqual([]);
  });

  it("draws the toolbar, its field and the rows it keeps", () => {
    const html = renderToStaticMarkup(<DataToolbarDemo />);

    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Deploy queue"');
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Search"');
    expect(html).toContain('placeholder="Filter services…"');
    expect(html).toContain(">Reset<");
    expect(html).not.toContain(">Columns<");
    expect(html.match(/ data-row="/g) ?? []).toHaveLength(QUEUE_ROWS.length);
    expect(html).toContain("wait 150 ms");
    expect(html).toContain("6 of 6 rows");
  });

  it("takes its strip and field geometry from the package's recipe", () => {
    const recipe = read("packages/data/src/surfaces/recipe.ts");
    expect(recipe).toContain("border-input bg-muted");

    const css = read("apps/docs/src/styles/demos.css");
    const strip = css.slice(css.indexOf(".gx-dtoolbar {"));
    expect(strip.slice(0, strip.indexOf("}"))).toContain(
      "background: var(--muted);",
    );
    // `border-input` is shadcn's name for the `border` role; the tokens'
    // `input` is the field fill, which the strip does not read.
    expect(strip.slice(0, strip.indexOf("}"))).toContain(
      "border: 1px solid var(--border);",
    );
    // The toolbar's search field is the primitives' `size="sm"` Input.
    const field = css.slice(css.indexOf(".gx-dfield-sm {"));
    expect(field.slice(0, field.indexOf("}"))).toContain(
      "height: var(--control-height-sm);",
    );
  });

  it("is wired to the page the package ships", () => {
    expect(demos["data-toolbar-demo"]).toBeDefined();
    const row = packagePreviews.find(
      (preview) =>
        preview.origin === "data" && preview.path === "data-toolbar.mdx",
    );
    expect(row?.demo).toBe("data-toolbar-demo");

    const page = read("packages/data/docs/data-toolbar.mdx");
    expect(page).not.toContain("<ComponentPreview");
    expect(page).toContain("The toolbar does not own the query");
    expect(page).toContain("receives the **debounced** query");
  });

  it("offers the three waits its readout can resolve", () => {
    expect(WAITS.map((choice) => choice.wait)).toEqual([150, 0, Number.NaN]);
  });

  it("paints only a control the row can act on", () => {
    // A press is the only thing a control promises; the toolbar's Reset is
    // wired and the column button that had no handler is not painted at all.
    const source = read("apps/docs/src/components/docs/data-toolbar-demo.tsx");

    expect(renderToStaticMarkup(<DataToolbarDemo />)).not.toContain(
      ">Columns<",
    );
    expect(source).toContain("onClick={reset}");
  });
});

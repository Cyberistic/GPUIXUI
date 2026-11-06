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

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const matchingServices = (query: string): ReadonlyArray<string> =>
  Arr.map(matchingRows(query), (row) => row.service);

describe("the data toolbar preview", () => {
  it("schedules the wait the package documents", () => {
    const toolbar = read("packages/data/src/surfaces/toolbar.tsx");
    expect(toolbar).toContain("export const DEFAULT_SEARCH_DEBOUNCE_MS = 150;");
    expect(toolbar).toContain("!Number.isFinite(milliseconds)");
    expect(toolbar).toContain("milliseconds < 0");
    expect(toolbar).toContain("? DEFAULT_SEARCH_DEBOUNCE_MS");

    expect(searchWait(undefined)).toBe(150);
    expect(searchWait(Number.NaN)).toBe(150);
    expect(searchWait(Number.POSITIVE_INFINITY)).toBe(150);
    expect(searchWait(-5)).toBe(150);

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
  });

  it("reports one value per pause, the last one the reader typed", async () => {
    const reported: string[] = [];
    const reporter = createSearchReporter((next) => reported.push(next), 30);

    reporter.type("g");
    reporter.type("ga");
    reporter.type("gat");
    await sleep(5);

    expect(reported).toEqual([]);
    await sleep(40);
    expect(reported).toEqual(["gat"]);

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

    expect(strip.slice(0, strip.indexOf("}"))).toContain(
      "border: 1px solid var(--border);",
    );

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
  });

  it("offers the three waits its readout can resolve", () => {
    expect(WAITS.map((choice) => choice.wait)).toEqual([150, 0, Number.NaN]);
  });

  it("paints only a control the row can act on", () => {
    const source = read("apps/docs/src/components/docs/data-toolbar-demo.tsx");

    expect(renderToStaticMarkup(<DataToolbarDemo />)).not.toContain(
      ">Columns<",
    );
    expect(source).toContain("onClick={reset}");
  });
});

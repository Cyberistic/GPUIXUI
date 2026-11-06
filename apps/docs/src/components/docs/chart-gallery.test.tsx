import { themes } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartGallery } from "./chart-gallery";

/**
 * Guards the gallery against the page it sits on.
 *
 * The charts page says "seventeen chart types, one line of code each" and
 * lists them in a table underneath. The gallery is the only place that claim
 * is drawn, so a type that drops out of the grid — or a drawing that names a
 * component the page never lists — is a page that shows a catalogue it does
 * not have. Both directions are checked against the page's own table rather
 * than a second copy of the list.
 *
 * `readFileSync` is the test-only exception every docs guard already takes
 * (`data-demo.test.tsx`, `component-index.test.ts`): a static fixture read at
 * collection time, never on a request path.
 */
const page = readFileSync(
  new URL(
    "../../../../../packages/data/docs/charts/index.mdx",
    import.meta.url,
  ),
  "utf8",
);

/** The page's lines, so the table is read the way a reader sees it. */
const lines: ReadonlyArray<string> = Str.split("\n")(page);

/** The component names the page's table links to. */
const listedTypes = (): ReadonlyArray<string> =>
  Arr.flatMap(
    Arr.filter(lines, (line: string) => Str.startsWith("| [`")(line)),
    (line: string) =>
      Arr.map(
        [...line.matchAll(/\[`([A-Za-z]+)`\]/g)],
        (match: RegExpMatchArray) => match[1] ?? "",
      ),
  );

/** The captions the gallery renders, in the order it draws them. */
const captions = (): ReadonlyArray<string> =>
  Arr.map(
    [
      ...renderToStaticMarkup(<ChartGallery theme={themes.dark} />).matchAll(
        /<figcaption>([^<]+)<\/figcaption>/g,
      ),
    ],
    (match) => match[1] ?? "",
  );

describe("the chart gallery", () => {
  it("draws one cell for every type the page lists", () => {
    expect(listedTypes().length).toBeGreaterThanOrEqual(17);
    expect(captions()).toEqual(listedTypes());
  });

  it("draws each type instead of naming it", () => {
    // A caption with no marks under it is a type the page claims and the
    // browser does not show. One painted element per cell is the floor.
    const cells = renderToStaticMarkup(
      <ChartGallery theme={themes.dark} />,
    ).split('<figure class="gx-dchart-cell">');
    expect(cells.slice(1)).toHaveLength(listedTypes().length);
    expect(
      Arr.every(cells.slice(1), (cell) =>
        /<(?:path|rect|circle|line|span)/.test(cell),
      ),
    ).toBe(true);
  });
});

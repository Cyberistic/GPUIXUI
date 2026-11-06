import { themes } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChartGallery } from "./chart-gallery";

const page = readFileSync(
  new URL(
    "../../../../../packages/data/docs/charts/index.mdx",
    import.meta.url,
  ),
  "utf8",
);

const lines: ReadonlyArray<string> = Str.split("\n")(page);

const listedTypes = (): ReadonlyArray<string> =>
  Arr.flatMap(
    Arr.filter(lines, (line: string) => Str.startsWith("| [`")(line)),
    (line: string) =>
      Arr.map(
        [...line.matchAll(/\[`([A-Za-z]+)`\]/g)],
        (match: RegExpMatchArray) => match[1] ?? "",
      ),
  );

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

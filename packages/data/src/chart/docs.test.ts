/**
 * The charts page's API tables, held to the props the types declare.
 *
 * The bug this guards: `docs/charts.mdx` documented only the series charts'
 * shared contract, so the page a consumer reads for `DonutChart`,
 * `Sparkline` and `ChartLegend` never named `data`, `size`, `values`, `color`,
 * `items` or their defaults — the three parts were exported, mounted by the
 * examples and documented nowhere. The reader fails by name in both
 * directions: a prop a type gains without a row, and a row no type declares.
 *
 * `node:fs` is test-only, the shape `sort/docs.test.ts` uses: this checks the
 * repository's Markdown from a plain vitest suite.
 */

import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/charts.mdx");
const source = read("./chart.tsx");

/** One page section and the props type it documents. */
interface Section {
  /** The heading as the page writes it, backticks included. */
  readonly heading: string;
  /** The declared type whose fields the section's table must carry. */
  readonly type: string;
}

/** Every chart part the page must document, and the type behind it. */
const sections: ReadonlyArray<Section> = [
  {
    heading: "`BarChart` · `StackedBar` · `LineChart`",
    type: "ChartProps",
  },
  { heading: "`DonutChart`", type: "DonutChartProps" },
  { heading: "`Sparkline`", type: "SparklineProps" },
  { heading: "`ChartLegend`", type: "ChartLegendProps" },
];

/** The runtime host props a chart takes from `Props`, documented once. */
const hostProps: ReadonlyArray<string> = ["aria-label", "style", "ref"];

/** The text under one `###` heading, up to the next heading at its level. */
const sectionOf = (site: string, heading: string): string => {
  const start = site.indexOf(`### ${heading}\n`);
  if (start === -1) throw new Error(`no ${heading} section`);
  const body = site.slice(start + heading.length + 5);
  const next = body.search(/^#{2,3} /m);
  return next === -1 ? body : body.slice(0, next);
};

/** The fields a props interface declares itself, in source order. */
const declaredProps = (type: string): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${type} extends[^{]*\\{([\\s\\S]*?)\\n\\}`,
  ).exec(source);
  if (body?.[1] === undefined) throw new Error(`no ${type}`);
  return [...body[1].matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

/** The props one section's table documents, in page order. */
const documentedProps = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^\| `([^`]+)` \|/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

/** Every declared prop a section leaves without a row, named by section. */
const undocumented = (section: Section): ReadonlyArray<string> => {
  const documented = documentedProps(sectionOf(page, section.heading));
  return Arr.map(
    Arr.filter(
      declaredProps(section.type),
      (prop) => !documented.includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );
};

/** Every row naming a prop the section neither declares nor inherits. */
const invented = (section: Section): ReadonlyArray<string> => {
  const declared = declaredProps(section.type);
  return Arr.map(
    Arr.filter(
      documentedProps(sectionOf(page, section.heading)),
      (prop) => !declared.includes(prop) && !hostProps.includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );
};

describe("the charts page's API tables", () => {
  it("documents every prop each chart part declares", () => {
    expect(sections).toHaveLength(4);
    expect(
      Arr.length(
        Arr.flatMap(sections, (section) => declaredProps(section.type)),
      ),
    ).toBeGreaterThan(20);

    expect(Arr.flatMap(sections, undocumented)).toEqual([]);
  });

  it("names only props the chart part takes", () => {
    expect(Arr.flatMap(sections, invented)).toEqual([]);
  });

  it("gives every shipped chart part a table", () => {
    expect(
      Arr.flatMap(sections, (section) => section.heading.split(" · ")),
    ).toEqual([
      "`BarChart`",
      "`StackedBar`",
      "`LineChart`",
      "`DonutChart`",
      "`Sparkline`",
      "`ChartLegend`",
    ]);
    expect(
      Arr.filter(
        sections,
        (section) =>
          Arr.length(documentedProps(sectionOf(page, section.heading))) === 0,
      ),
    ).toEqual([]);
  });
});

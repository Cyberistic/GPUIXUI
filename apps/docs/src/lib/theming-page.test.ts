import { readFileSync } from "node:fs";
import { contrastFloors, contrastRatio, retroStyles } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { lookLabel, lookOrder, resolvePlatformTheme } from "./platform";

/**
 * The two theming pages state facts about `@gpuixui/tokens` that the package
 * changes.
 *
 * Both drifted once: `/docs/themes` printed "24 role pairs" after the contrast
 * table grew to 28, `/docs/theming`'s brand snippet painted the dark
 * theme's near-black label on a violet fill — 4.24:1, under the 4.5:1 floor the
 * package's own contract enforces — and the same page printed "47 semantic
 * roles" as a literal. A reader copying that snippet shipped the
 * defect the docs describe how to avoid.
 *
 * A page cannot drift again: the pair count is interpolated from
 * `contrastPairs` in the page itself, so it has no number to fall behind, the
 * colour-role count is interpolated from `colorRoles`, and the brand snippet is
 * measured here.
 */

const page = (name: string): string =>
  readFileSync(new URL(`../../content/docs/${name}`, import.meta.url), "utf8");

/** The `## Contrast` section of a page, without its following siblings. */
const section = (body: string, heading: string): string => {
  const start = body.indexOf(`## ${heading}`);
  const end = body.indexOf("\n## ", start + 1);
  return start === -1 ? "" : body.slice(start, end === -1 ? undefined : end);
};

/**
 * The colours the brand snippet sets, as the snippet writes them. Reading the
 * page rather than a copy is the point: the snippet is what a reader copies.
 */
const snippetColours = (body: string): Readonly<Record<string, string>> => {
  const snippet = body
    .split("```")
    .filter(
      (fence) =>
        fence.includes("export const") && fence.includes("createTheme({"),
    )
    .join("");
  return Object.fromEntries(
    [...snippet.matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)].flatMap((match) =>
      match[1] === undefined || match[2] === undefined
        ? []
        : [[match[1], match[2]]],
    ),
  );
};

describe("the theme page", () => {
  it("derives the contrast pair count instead of printing one", () => {
    const audit = section(page("themes.mdx"), "The theme audit");

    expect(audit).toContain("contrastPairs.length");
    expect(audit).not.toMatch(/\b\d+ role pairs\b/);
  });

  it("imports the count it derives", () => {
    expect(page("themes.mdx")).toContain(
      'import { contrastPairs } from "@gpuixui/tokens";',
    );
  });

  it("describes the whole audit the readout runs, not only its contrast half", () => {
    // The editor printed `contrastFailures` alone while `auditTheme` reported
    // three failures, so a reader whose divider vanished or whose role painted
    // black read a passing line. The page has to describe the readout it has.
    const audit = section(page("themes.mdx"), "The theme audit");

    expect(audit).toContain("auditTheme");
    expect(audit).toContain("decorativeFailures");
    expect(audit).toContain("seriesFailures");
    expect(audit).toContain("cannot paint");
    expect(audit).toContain("localStorage");
  });
});

describe("the theming page's role count", () => {
  it("derives the number of colour roles instead of printing one", () => {
    const body = page("theming.mdx");

    expect(body).toMatch(
      /import \{[^}]*\bcolorRoles\b[^}]*\} from "@gpuixui\/tokens";/,
    );
    expect(body).toContain("{colorRoles.length} semantic roles");
    expect(body).toContain("There are {colorRoles.length} of them");
    // A printed count is the defect this guards: it cannot follow the package.
    expect(body).not.toMatch(/\b\d+ semantic roles\b/);
    expect(body).not.toMatch(/There are \d+ of them/);
  });
});

describe("the theming page's brand snippet", () => {
  const colours = snippetColours(page("theming.mdx"));

  it("owns the label colour of the fill it overrides", () => {
    expect(colours.primary).toBeDefined();
    expect(colours.primaryForeground).toBeDefined();
  });

  it("paints that label at the package's secondary-text floor", () => {
    const fill = colours.primary ?? "";
    const label = colours.primaryForeground ?? "";
    const measured = contrastRatio(label, fill);

    expect(measured).toBeDefined();
    expect(measured ?? 0).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });
});

describe("the theming page's data series", () => {
  const body = page("theming.mdx");
  const series = section(body, "Data series");

  it("mounts the generated swatches", () => {
    expect(series).toContain("<SeriesSwatches />");
    expect(body).toContain(
      'import { colorRoles, seriesColors, themes } from "@gpuixui/tokens";',
    );
  });

  it("derives the scale's length instead of printing it", () => {
    expect(series).toContain("{seriesColors(themes.dark).length}");
    // A printed count is the defect the role count already guards against.
    expect(series).not.toMatch(/scale of \d+ colours/);
  });

  it("states the two contracts the scale is held to, and the reason it exists", () => {
    // The section is why a component has no hex of its own: a role carries
    // status, the series carries identity, and the scale is measured.
    expect(series).toContain("seriesSurfaces");
    expect(series).toContain("seriesDistinctnessFloor");
    expect(series).toContain("seriesFailures");
    expect(series).toContain("identity");
  });

  it("sits with the colour roles rather than in the platform section", () => {
    const colours = body.indexOf("## Colour roles");
    const builtIn = body.indexOf("## Built-in themes");
    const start = body.indexOf("## Data series");

    expect(start).toBeGreaterThan(colours);
    expect(start).toBeLessThan(builtIn);
  });
});

describe("the theming page's look picker", () => {
  const picker = section(page("theming.mdx"), "The look picker");

  /** The prose with its line wrapping flattened: a label is one sentence, not two lines. */
  const flat = (text: string): string => text.replace(/\s+/g, " ");

  it("offers every look the switch offers, by the library's label", () => {
    // The page names the control the reader sees; a look added to the library
    // without a sentence here would be a switch position the docs never
    // explain.
    expect(
      lookOrder.filter((look) => !flat(picker).includes(lookLabel(look))),
    ).toEqual([]);
  });

  it("writes the look to the URL and says it is not a platform", () => {
    expect(picker).toContain("look=luna");
    expect(flat(picker)).toContain("not a fifth platform");
    expect(picker).toContain("retroStyles");
    expect(picker).toContain("applyStyle");
  });

  it("describes the styles the library ships, not ones the site invented", () => {
    // The look's label comes from `retroStyles`; quoting a different name here
    // would document a style that does not exist.
    expect(resolvePlatformTheme("default", "dark", "luna").name).toContain(
      retroStyles.luna.label,
    );
    expect(flat(page("theming.mdx"))).toContain(retroStyles.aero.label);
  });
});

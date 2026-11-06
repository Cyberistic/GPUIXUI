import { readFileSync } from "node:fs";
import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../styles/landing.css", import.meta.url),
  "utf8",
);

const variables = (selector: string): Readonly<Record<string, string>> => {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf("\n}", start);
  const block = start === -1 || end === -1 ? "" : css.slice(start, end);
  return Object.fromEntries(
    [...block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].flatMap((match) => {
      const [, name, value] = match;
      return name === undefined || value === undefined
        ? []
        : [[name, value.trim()]];
    }),
  );
};

const schemes: Readonly<
  Record<"light" | "dark", Readonly<Record<string, string>>>
> = {
  light: variables(".landing"),
  dark: variables(".dark .landing"),
};

const schemeNames = ["light", "dark"] as const;

interface Pair {
  readonly text: string;
  readonly surface: string;
  readonly floor: number;
}

const pairs: ReadonlyArray<Pair> = [
  { text: "--fg", surface: "--bg", floor: contrastFloors.body },
  { text: "--fg", surface: "--bg-soft", floor: contrastFloors.body },
  { text: "--fg", surface: "--card", floor: contrastFloors.body },
  { text: "--muted", surface: "--bg", floor: contrastFloors.secondary },
  { text: "--muted", surface: "--bg-soft", floor: contrastFloors.secondary },
  { text: "--muted", surface: "--card", floor: contrastFloors.secondary },
  { text: "--muted", surface: "--chrome", floor: contrastFloors.secondary },
  { text: "--dim", surface: "--bg", floor: contrastFloors.secondary },
  { text: "--dim", surface: "--bg-soft", floor: contrastFloors.secondary },
  { text: "--dim", surface: "--card", floor: contrastFloors.secondary },
  { text: "--dim", surface: "--chrome", floor: contrastFloors.secondary },
  { text: "--dim", surface: "--field", floor: contrastFloors.secondary },
  { text: "--accent-text", surface: "--bg", floor: contrastFloors.secondary },
  { text: "--accent-text", surface: "--card", floor: contrastFloors.secondary },
  {
    text: "--accent-ink",
    surface: "--accent",
    floor: contrastFloors.secondary,
  },
];

const colourRoles = (palette: Readonly<Record<string, string>>): string[] =>
  Object.keys(palette).filter(
    (name) => !name.startsWith("--sans") && !name.startsWith("--mono"),
  );

const below = (
  palette: Readonly<Record<string, string>>,
  table: ReadonlyArray<Pair>,
  prefix = "",
): ReadonlyArray<string> =>
  table.flatMap(({ text, surface, floor }) => {
    const ratio = contrastRatio(palette[text] ?? "", palette[surface] ?? "");
    return ratio === undefined || ratio < floor
      ? [
          `${prefix}${text} on ${surface} — ${
            ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
          }:1 (needs ${floor}:1)`,
        ]
      : [];
  });

const textColours = (block: string): ReadonlyArray<string> =>
  [...block.matchAll(/(?:^|[^-])color:\s*([^;]+);/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );

describe("the landing's palette", () => {
  it("names its guard on the site ledger", () => {
    const readme = readFileSync(
      new URL("../../README.md", import.meta.url),
      "utf8",
    );

    expect(readme).toContain("src/lib/landing-theme.test.ts");
    expect(readme).toContain("src/lib/docs-theme.test.ts");
  });

  it("declares the same roles in both schemes", () => {
    const onlyInLight = colourRoles(schemes.light).filter(
      (name) => !(name in schemes.dark),
    );
    const onlyInDark = colourRoles(schemes.dark).filter(
      (name) => !(name in schemes.light),
    );

    expect(onlyInLight).toEqual([]);
    expect(onlyInDark).toEqual([]);
    expect(colourRoles(schemes.light).length).toBeGreaterThan(12);
  });

  it.each(schemeNames)(
    "clears the library's floors in the %s scheme",
    (scheme) => {
      expect(below(schemes[scheme], pairs, `${scheme}: `)).toEqual([]);
    },
  );

  it("paints text through a role, never a literal", () => {
    const literals = [
      ...new Set(
        textColours(css).filter(
          (value) =>
            !value.startsWith("var(--") &&
            !value.startsWith("inherit") &&
            !value.startsWith("transparent"),
        ),
      ),
    ];

    expect(literals).toEqual([]);
  });
});

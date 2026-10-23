import { readFileSync } from "node:fs";
import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/**
 * The landing page's own palette.
 *
 * `src/styles/app.css` is held to the library's contrast floors by
 * `docs-theme.test.ts`, and the landing declared a second palette nothing
 * measured. It painted its captions, labels and the hero window's chat input in
 * `--dim: #a1a1a1` — **2.59:1** on the page — and its secondary paragraphs in
 * `--muted: #737373` — **4.29:1** on the `--bg-soft` panels they sit on, under
 * the 4.5 floor — so the first page a reader sees taught less than the library
 * asks of every component. The fixed dark terminal illustration had the same
 * shape: its session and status text painted **3.00:1** and its line-number
 * gutter **2.20:1** on the frame behind them.
 *
 * The values are the library's own (`@gpuixui/tokens`), so the landing is held
 * to the contract the components are. The terminal is always dark — a terminal
 * has no theme — so its palette is declared once, on the frame, and measured in
 * that one place.
 */

const css = readFileSync(
  new URL("../styles/landing.css", import.meta.url),
  "utf8",
);

/** The custom properties of one selector's block. */
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

/** The terminal's fixed palette: the frame is dark in both schemes. */
const terminal = variables(".landing-terminal-window");

interface Pair {
  readonly text: string;
  readonly surface: string;
  readonly floor: number;
}

/** Every text role the landing paints, on every surface it paints it on. */
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

/** The terminal illustration's text, against the frame it is painted on. */
const terminalPairs: ReadonlyArray<Pair> = [
  { text: "--term-ink", surface: "--term-bg", floor: contrastFloors.body },
  {
    text: "--term-line",
    surface: "--term-bg",
    floor: contrastFloors.secondary,
  },
  { text: "--term-bright", surface: "--term-bar", floor: contrastFloors.body },
  {
    text: "--term-label",
    surface: "--term-side",
    floor: contrastFloors.secondary,
  },
  {
    text: "--term-label",
    surface: "--term-bg",
    floor: contrastFloors.secondary,
  },
  {
    text: "--term-status",
    surface: "--term-bar",
    floor: contrastFloors.secondary,
  },
  { text: "--term-active", surface: "--term-side", floor: contrastFloors.body },
];

/** The colour roles, i.e. every variable but the two families. */
const colourRoles = (palette: Readonly<Record<string, string>>): string[] =>
  Object.keys(palette).filter(
    (name) => !name.startsWith("--sans") && !name.startsWith("--mono"),
  );

/** The lines a pair fails to clear, worded for the failure. */
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

/** The variables that carry a text colour, and the raw values they name. */
const textColours = (block: string): ReadonlyArray<string> =>
  [...block.matchAll(/(?:^|[^-])color:\s*([^;]+);/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );

describe("the landing's palette", () => {
  it("names its guard on the site ledger", () => {
    // The ledger says which guard holds which palette, so a rename cannot leave
    // a reader looking for a suite that is gone.
    const readme = readFileSync(
      new URL("../../README.md", import.meta.url),
      "utf8",
    );

    expect(readme).toContain("src/lib/landing-theme.test.ts");
    expect(readme).toContain("src/lib/docs-theme.test.ts");
  });

  it("declares the same roles in both schemes", () => {
    // A role only in `.landing` leaves the dark scheme on the light value. The
    // two families are scheme-independent, so they are declared once.
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

  it("clears the floors in the fixed terminal illustration", () => {
    expect(Object.keys(terminal).length).toBeGreaterThan(7);
    expect(below(terminal, terminalPairs, "terminal: ")).toEqual([]);
  });

  it("paints text through a role, never a literal", () => {
    // The two schemes are the only place a text colour is chosen: a raw hex on
    // a `color` declaration would sit outside every pair above.
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

import { readFileSync } from "node:fs";
import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/**
 * The docs site's own palette — the one thing on the site that is not the
 * library's tokens.
 *
 * `src/styles/app.css` declares it twice, for `:root` and `.dark`, and Fumadocs
 * reads every colour through those variables. Nothing measured it: the light
 * scheme painted its focus ring at 2.33:1 against the page, under the 3:1 floor
 * a non-text boundary needs, so a keyboard reader could not see where they were
 * on a light page. The clock, the pairs and the floors are the library's own
 * (`@gpuixui/tokens`), so the docs identity is held to the contract the
 * components are.
 */

const css = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");

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
  light: variables(":root"),
  dark: variables(".dark"),
};

const schemeNames = ["light", "dark"] as const;

/** The pairs a reader reads, and the floor each has to clear. */
const pairs: ReadonlyArray<
  readonly [foreground: string, background: string, floor: number]
> = [
  ["--foreground", "--background", contrastFloors.body],
  ["--card-foreground", "--card", contrastFloors.body],
  ["--popover-foreground", "--popover", contrastFloors.body],
  ["--sidebar-foreground", "--sidebar", contrastFloors.body],
  ["--muted-foreground", "--background", contrastFloors.secondary],
  ["--muted-foreground", "--muted", contrastFloors.secondary],
  ["--accent-foreground", "--accent", contrastFloors.secondary],
  ["--primary-foreground", "--primary", contrastFloors.secondary],
  ["--secondary-foreground", "--secondary", contrastFloors.secondary],
  ["--sidebar-accent-foreground", "--sidebar-accent", contrastFloors.secondary],
  // The theme editor prints a broken pair in `--destructive`.
  ["--destructive", "--background", contrastFloors.secondary],
  // A focus ring is a non-text boundary: 3:1 against every surface it is drawn on.
  ["--ring", "--background", contrastFloors.boundary],
  ["--ring", "--card", contrastFloors.boundary],
  ["--ring", "--sidebar", contrastFloors.boundary],
];

/** A scheme's colour variables. The families are scheme-independent. */
const colourNames = (palette: Readonly<Record<string, string>>): string[] =>
  Object.keys(palette).filter((name) => !name.startsWith("--font-"));

describe("the docs palette", () => {
  it("declares the same colours in both schemes", () => {
    // A variable only in `:root` leaves the dark scheme on the light value.
    const onlyInLight = colourNames(schemes.light).filter(
      (name) => !(name in schemes.dark),
    );
    const onlyInDark = colourNames(schemes.dark).filter(
      (name) => !(name in schemes.light),
    );

    expect(onlyInLight).toEqual([]);
    expect(onlyInDark).toEqual([]);
    expect(colourNames(schemes.light).length).toBeGreaterThan(20);
  });

  it.each(schemeNames)(
    "clears the library's floors in the %s scheme",
    (scheme) => {
      const palette = schemes[scheme];
      const below = pairs.flatMap(([foreground, background, floor]) => {
        const ratio = contrastRatio(
          palette[foreground] ?? "",
          palette[background] ?? "",
        );
        return ratio === undefined || ratio < floor
          ? [
              `${scheme}: ${foreground} on ${background} — ${
                ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
              }:1 (needs ${floor}:1)`,
            ]
          : [];
      });

      expect(below).toEqual([]);
    },
  );

  it("keeps the dark scheme a second palette, not a copy", () => {
    expect(schemes.dark["--background"]).not.toBe(
      schemes.light["--background"],
    );
    expect(schemes.dark["--foreground"]).not.toBe(
      schemes.light["--foreground"],
    );
  });
});

/**
 * Guards the unread dot's two unmeasured row fills and the ledger rows plan 698
 * left behind.
 *
 * The Notification centre paints its unread dot with `primary` on a row that
 * fills `accent` while it is the current row, `hover` under the pointer and
 * `active` while pressed. `markPairs` held `primary` on `hover` (plan 341), on
 * the combobox check's `selected`/`selectedActive` (plan 698), on the four plain
 * surfaces, the field's `input` fill and `track` — never on `accent` or
 * `active`. A theme whose accent collapsed into the dot's fill therefore
 * returned `[]` from every check while the dot disappeared on a hovered or
 * pressed row; the shipped sets clear the floor on both (3.757:1 and 3.317:1 at
 * the tightest), so the pair was missing, not the colour.
 *
 * The same audit found `TODO.md`'s two live cross-team rows quoting figures the
 * palette has not produced since plan 698 moved macOS dark's accent one step:
 * the unread dot's row said the fill measures 2.836:1 on `active` and 2.748:1 on
 * `selected`, "so a pressed or selected unread notification loses its dot"
 * (today 3.317:1 and 3.214:1, over the floor in all 24 shipped sets), and the
 * accordion row quoted plan 332's tightest *mark* (3.82:1) beside the
 * accordion's *card*, which measures 4.697:1 — the canvas (4.209:1) and the
 * quiet panel (4.392:1) are the two surfaces under the floor.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  markPairs,
  themeContrastFailures,
} from "./contrast.js";
import { shippedThemes, type ShippedTheme } from "./shipped-themes.js";
import { extendTheme, getPlatformTheme, lightTheme } from "./theme.js";

/** The five fills a row paints: hover, current, pressed, chosen, pressed chosen. */
const rowFills = [
  "hover",
  "accent",
  "active",
  "selected",
  "selectedActive",
] as const;

/** A document read as one line, so a wrapped claim is not a substring. */
const prose = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8")
    .replaceAll(/\s+/g, " ")
    .trim();

const catalogue = prose("../../../docs/tokens.md");
const designSystem = prose("../../../docs/design-system.md");
const readme = prose("../README.md");
const ledger = prose("../../../TODO.md");

/** One live cross-team row, so a historical plan row cannot satisfy a claim. */
const liveRow = (start: string): string => {
  const from = ledger.indexOf(start);
  expect(from, start).toBeGreaterThanOrEqual(0);
  const to = ledger.indexOf("`[ ]` Cross-team", from + start.length);
  expect(to, start).toBeGreaterThan(from);
  return ledger.slice(from, to);
};

const unreadRow = liveRow(
  "Cross-team: `components` paints the Notification centre",
);
const accordionRow = liveRow(
  "Cross-team: `components` uses `primaryText` for the Accordion",
);

/** The `primary` mark surfaces the contract publishes, in composition order. */
const primaryMarkSurfaces = markPairs
  .filter(([role, , pairClass]) => role === "primary" && pairClass === "mark")
  .map(([, background]) => background);

/** The tightest ratio of `primary` on `surface` across the shipped sets. */
const tightest = (surface: (typeof rowFills)[number]): ShippedTheme => {
  const measured = shippedThemes.map((shipped) => ({
    shipped,
    ratio: contrastRatio(
      shipped.theme.colors.primary,
      shipped.theme.colors[surface],
    ),
  }));
  return measured.reduce((a, b) => (a.ratio <= b.ratio ? a : b)).shipped;
};

const ratioOn = (theme: ShippedTheme["theme"], surface: string): number =>
  contrastRatio(
    theme.colors.primary,
    theme.colors[surface as keyof typeof theme.colors],
  );

describe("the primary mark on the fills a row paints", () => {
  it("holds it on all five row fills, and no other surface twice", () => {
    const measured = primaryMarkSurfaces.filter((surface) =>
      rowFills.some((fill) => fill === surface),
    );
    expect(measured).toEqual([...rowFills]);

    const compositions = contrastPairs.map(
      ([foreground, background, pairClass]) =>
        `${foreground}|${background}|${pairClass}`,
    );
    expect(new Set(compositions).size).toBe(compositions.length);
  });

  it("clears the mark floor on every shipped set, with the tightest pair named", () => {
    shippedThemes.forEach(({ theme }) => {
      const floor = contrastFloors[theme.contrast].mark;
      rowFills.forEach((fill) => {
        expect(
          ratioOn(theme, fill),
          `${theme.name} on ${fill}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });

    expect(tightest("selected").theme.name).toBe("Dark · macOS");
    expect(ratioOn(tightest("selected").theme, "selected")).toBeCloseTo(
      3.214,
      3,
    );
    expect(ratioOn(tightest("accent").theme, "accent")).toBeCloseTo(3.757, 3);
    expect(ratioOn(tightest("active").theme, "active")).toBeCloseTo(3.317, 3);
  });

  it("reports a primary that collapses into a row fill", () => {
    (["accent", "active"] as const).forEach((fill) => {
      const collapsed = extendTheme(lightTheme, {
        colors: { [fill]: lightTheme.colors.primary },
      });
      expect(
        themeContrastFailures(collapsed).some(
          (failure) =>
            failure.foreground === "primary" &&
            failure.background === fill &&
            failure.pairClass === "mark",
        ),
        fill,
      ).toBe(true);
    });
  });

  it("publishes the row composition as a mark and no other class", () => {
    // `accent` and `active` are also measured as fills on the surfaces behind
    // them; the glyph-on-row composition is the mark class, so a class mix-up
    // cannot pass twice under a different name.
    ["accent", "active"].forEach((fill) => {
      expect(
        contrastPairs.some(
          ([foreground, background, pairClass]) =>
            foreground === "primary" &&
            background === fill &&
            pairClass === "mark",
        ),
        fill,
      ).toBe(true);
      expect(
        contrastPairs.some(
          ([foreground, background, pairClass]) =>
            foreground === "primary" &&
            background === fill &&
            pairClass !== "mark",
        ),
        fill,
      ).toBe(false);
    });
  });
});

describe("the ledger rows the accent move left behind", () => {
  const macOSDark = getPlatformTheme("darwin", "dark");
  const macOSLight = getPlatformTheme("darwin", "light");

  it("states the unread dot's current fill and ink figures", () => {
    const selected = ratioOn(macOSDark, "selected");
    const active = ratioOn(macOSDark, "active");
    expect(active).toBeCloseTo(3.317, 3);
    expect(selected).toBeCloseTo(3.214, 3);

    /** The tightest `primaryText` ratio on `surface`, across the shipped sets. */
    const inkTightest = (surface: "active" | "selected" | "accent") => {
      const measured = shippedThemes.map(({ theme }) => ({
        name: theme.name,
        ratio: contrastRatio(theme.colors.primaryText, theme.colors[surface]),
      }));
      return measured.reduce((a, b) => (a.ratio <= b.ratio ? a : b));
    };

    const inkActive = inkTightest("active");
    const inkSelected = inkTightest("selected");
    const inkAccent = inkTightest("accent");
    expect(inkActive.name).toBe("Dark · Windows");
    expect(inkActive.ratio).toBeCloseTo(5.587, 3);
    expect(inkSelected.ratio).toBeCloseTo(5.688, 3);
    expect(inkAccent.ratio).toBeCloseTo(7.102, 3);

    expect(unreadRow).toContain("unread dot");
    expect(unreadRow).toContain("3.317:1 on `active`");
    expect(unreadRow).toContain("3.214:1");
    expect(unreadRow).toContain("5.587:1 on `active`");
    expect(unreadRow).toContain("7.102:1 on `accent`");
    expect(unreadRow).toContain("`rowMarkPairs`");

    // The pre-698 present tense and the refuted conclusion.
    expect(unreadRow).not.toContain("**2.836:1**");
    expect(unreadRow).not.toContain("**2.748:1**");
    expect(unreadRow).not.toContain("loses its dot");
  });

  it("states the surfaces the accordion's trigger actually paints on", () => {
    expect(ratioOn(macOSLight, "background")).toBeCloseTo(4.209, 3);
    expect(ratioOn(macOSLight, "muted")).toBeCloseTo(4.392, 3);
    expect(ratioOn(macOSLight, "card")).toBeCloseTo(4.697, 3);

    expect(accordionRow).toContain("4.21:1 on the macOS light canvas");
    expect(accordionRow).toContain("4.39:1 on its quiet panel");
    expect(accordionRow).toContain("4.70:1 on its card");
    expect(accordionRow).not.toContain("3.82:1");
  });
});

describe("the mark passages name the unread dot's fills", () => {
  it("names `accent` and `active` in every document", () => {
    [catalogue, designSystem, readme].forEach((document, index) => {
      const name = ["docs/tokens.md", "docs/design-system.md", "README"][index];
      expect(document, name).toContain("accent");
      expect(document, name).toContain("active");
    });

    expect(catalogue).toContain("Notification centre's unread dot");
    expect(designSystem).toContain("Notification centre's unread dot");
    expect(readme).toContain("Notification centre's unread dot");
  });

  it("states the contract's pair count, and the row list it grew", () => {
    expect(contrastPairs.length).toBe(472);
    expect(catalogue).toContain(`**${contrastPairs.length}**`);
    expect(catalogue).toContain("`828`");
  });
});

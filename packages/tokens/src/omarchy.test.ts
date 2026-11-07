import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeOmarchyPalette } from "./omarchy.js";
import { alphaOf } from "./color.js";
import { paletteToTokens } from "./system-theme.js";
import { darkTheme, getTheme, lightTheme } from "./theme.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const tokyoNight = `mode = "dark"

accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"

background = "#1a1b26"
dark_background = "#13141c"
darker_background = "#0e0e14"
lighter_background = "#24283b"

foreground = "#a9b1d6"
dark_foreground = "#565f89"
light_foreground = "#b4bee6"
bright_foreground = "#c0caf5"

red = "#f7768e"
yellow = "#e0af68"
orange = "#eb927b"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
brown = "#75493d"

bright_red = "#ff7a93"
bright_yellow = "#ff9e64"
bright_green = "#b9f27c"
bright_cyan = "#0db9d7"
bright_blue = "#7da6ff"
bright_magenta = "#bb9af7"
`;

const latte = `mode = "light"

accent = "#1e66f5"
selection = "#ccd0da"
muted = "#acb0be"

background = "#eff1f5"
foreground = "#4c4f69"

red = "#d20f39"
`;

const generated = `accent = "#1e66f5"
selection = "#ccd0da"

background = "#eff1f5"
foreground = "#4c4f69"

color0 = "#eff1f5"
color1 = "#d20f39"
color2 = "#40a02b"
color3 = "#df8e1d"
color5 = "#ea76cb"
color6 = "#179299"
color7 = "#4c4f69"
color8 = "#9ca0b0"
color9 = "#d20f39"
`;

describe("Omarchy's colors.toml", () => {
  it("reads the palette and the mode a dark theme declares", () => {
    const file = decodeOmarchyPalette(tokyoNight);

    expect(file.palette.mode).toBe("dark");
    expect(file.palette).toEqual({
      mode: "dark",
      background: "#1a1b26",
      foreground: "#a9b1d6",
      muted: "#414868",

      border: "#414868",
      accent: "#7aa2f7",
      danger: "#f7768e",
      selection: "#292e42",
    });
    expect(file.problems).toEqual([]);
  });

  it("reads a light theme the same way", () => {
    const file = decodeOmarchyPalette(latte);

    expect(file.palette.mode).toBe("light");
    expect(file.palette.background).toBe("#eff1f5");
    expect(file.palette.foreground).toBe("#4c4f69");
    expect(file.palette.accent).toBe("#1e66f5");
    expect(file.palette.danger).toBe("#d20f39");
    expect(file.problems).toEqual([]);
  });

  it("takes the ANSI ramp a generated theme names instead of the canonical keys", () => {
    const file = decodeOmarchyPalette(generated);

    expect(file.palette.accent).toBe("#1e66f5");
    expect(file.palette.danger).toBe("#d20f39");
    expect(file.palette.muted).toBe("#9ca0b0");
    expect(file.palette.border).toBe("#9ca0b0");
    expect(file.problems).toEqual([]);
  });

  it("prefers a canonical key to its fallback whichever line comes first", () => {
    const file = decodeOmarchyPalette(`color4 = "#111111"
accent = "#222222"
color1 = "#333333"
red = "#444444"
color8 = "#555555"
muted = "#666666"
`);

    expect(file.palette.accent).toBe("#222222");
    expect(file.palette.danger).toBe("#444444");
    expect(file.palette.muted).toBe("#666666");
  });

  it("reads the legacy short names behind the canonical ones", () => {
    expect(
      decodeOmarchyPalette('bg = "#101010"\nfg = "#FAFAFA"\n').palette,
    ).toEqual({
      background: "#101010",
      foreground: "#FAFAFA",
    });

    const both = decodeOmarchyPalette(`bg = "#101010"
background = "#202020"
fg = "#F0F0F0"
foreground = "#E0E0E0"
`).palette;
    expect(both.background).toBe("#202020");
    expect(both.foreground).toBe("#E0E0E0");
  });

  it("reads single quotes and a comment after a value", () => {
    const file = decodeOmarchyPalette(`background = '#101010' # the page
foreground = "#FAFAFA" # the ink
mode = 'dark' # declared
`);

    expect(file.palette.background).toBe("#101010");
    expect(file.palette.foreground).toBe("#FAFAFA");
    expect(file.palette.mode).toBe("dark");
    expect(file.problems).toEqual([]);
  });

  it("reads CRLF line endings and a byte-order mark", () => {
    const file = decodeOmarchyPalette(
      `\uFEFF${tokyoNight.replace(/\n/g, "\r\n")}`,
    );

    expect(file.palette.background).toBe("#1a1b26");
    expect(file.palette.mode).toBe("dark");
    expect(file.problems).toEqual([]);
  });

  it("names the lines it cannot read and decodes the rest", () => {
    const file = decodeOmarchyPalette(`background #101010
accent = #7aa2f7
foreground = "#FAFAFA
muted = "#414868" trailing
Muted = "#414868"
background = "#101010"
`);

    expect(file.problems.map(({ line, reason }) => [line, reason])).toEqual([
      [1, "syntax"],
      [2, "syntax"],
      [3, "syntax"],
      [4, "syntax"],
      [5, "syntax"],
    ]);
    expect(file.palette).toEqual({ background: "#101010" });
    expect(file.problems[0]?.text).toBe("background #101010");
  });

  it("stops at a table header rather than reading a section's keys", () => {
    const nested = decodeOmarchyPalette(`[colors]
background = "#101010"
`);
    expect(nested.palette).toEqual({});
    expect(nested.problems).toEqual([
      { line: 1, text: "[colors]", reason: "syntax" },
    ]);

    const trailing = decodeOmarchyPalette(`background = "#101010"
[meta]
author = "someone"
`);
    expect(trailing.palette.background).toBe("#101010");
    expect(trailing.problems).toHaveLength(1);
  });

  it("reports a duplicate and keeps the first statement", () => {
    const file = decodeOmarchyPalette(`background = "#101010"
background = "#202020"
`);

    expect(file.palette.background).toBe("#101010");
    expect(file.problems).toEqual([
      { line: 2, text: 'background = "#202020"', reason: "duplicate" },
    ]);
  });

  it("reports an empty colour instead of handing over an empty string", () => {
    const file = decodeOmarchyPalette('muted = ""\n');

    expect(file.palette).toEqual({});
    expect(file.problems).toEqual([
      { line: 1, text: 'muted = ""', reason: "empty" },
    ]);

    expect(
      decodeOmarchyPalette('muted = ""\ncolor8 = "#808080"\n').palette,
    ).toEqual({
      muted: "#808080",
      border: "#808080",
    });
  });

  it("reports a mode it does not know instead of guessing a base theme", () => {
    const file = decodeOmarchyPalette(
      'mode = "auto"\nbackground = "#101010"\n',
    );

    expect(file.palette.mode).toBeUndefined();
    expect(file.problems).toEqual([
      { line: 1, text: 'mode = "auto"', reason: "mode" },
    ]);
  });

  it("leaves an empty file as the base theme unchanged", () => {
    const file = decodeOmarchyPalette("");

    expect(file.palette).toEqual({});
    expect(file.problems).toEqual([]);
    expect(paletteToTokens(file.palette, darkTheme).colors).toEqual(
      darkTheme.colors,
    );
  });

  it("decodes into the theme the mapper paints", () => {
    const file = decodeOmarchyPalette(tokyoNight);

    const theme = paletteToTokens(file.palette);

    expect(theme.mode).toBe("dark");
    expect(theme.colors.background).toBe("#1a1b26");
    expect(theme.colors.primary).toBe("#7aa2f7");
    expect(theme.colors.destructive).toBe("#f7768e");
    expect(theme.colors.muted).toBe("#414868");
    expect(theme.colors.border).toBe("#414868");

    expect(theme.colors.selection).not.toBe("#292e42");
    expect(alphaOf(theme.colors.selection)).toBeCloseTo(
      alphaOf(darkTheme.colors.selection),
      5,
    );

    expect(theme.colors.card).toBe(darkTheme.colors.card);
  });

  it("prints the file it reads on the pages a consumer reads", () => {
    const catalogue = read("../../../docs/tokens.md");
    const readme = read("../README.md");
    const plan = read(
      "../../../.agents/slop/plans/433-platform-theme-recipes.md",
    );
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    [catalogue, readme].forEach((page) => {
      expect(page).toContain("decodeOmarchyPalette");
      expect(page).toContain(
        "~/.local/state/omarchy/current/theme/colors.toml",
      );

      expect(page).toContain("`color8`");
      expect(page).toContain("`color4`");
      expect(page).toContain("`color1`");
    });

    expect(catalogue).not.toContain("belongs to the consumer's boundary");
    expect(readme).not.toContain("consumer owns the platform file's decoder");

    expect(catalogue).toContain("MIT");
    expect(catalogue).toContain("`omarchy-theme-set` is not run");

    expect(plan).toContain("decodeOmarchyPalette");
    expect(plan).toContain("~/.local/state/omarchy/current/theme/colors.toml");

    const row = inventory.slice(
      inventory.indexOf("| System palettes |"),
      inventory.indexOf("\n", inventory.indexOf("| System palettes |")),
    );
    expect(row).toContain("decodeOmarchyPalette");
  });

  it("hands a light palette the light base when it follows one", () => {
    const file = decodeOmarchyPalette(latte);
    const theme = paletteToTokens(file.palette);

    expect(theme.mode).toBe("light");
    expect(theme.colors.card).toBe(lightTheme.colors.card);
    expect(getTheme("light").colors.card).toBe(lightTheme.colors.card);
  });
});

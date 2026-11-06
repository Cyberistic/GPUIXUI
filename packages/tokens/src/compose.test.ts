import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import {
  platformNames,
  platformStyles,
  type PlatformStyle,
} from "./platforms.js";
import { resolveHouseTheme } from "./platforms.example.js";
import { resolveRetroBrand } from "./retro.example.js";
import { retroNames, retroStyles, retroTheme } from "./retro.js";
import {
  applyStyle,
  highContrastThemes,
  themeModes,
  themes,
  type Theme,
} from "./theme.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const flat = (text: string): string => text.replace(/\s+/g, " ");

const catalogue = flat(read("../../../docs/tokens.md"));
const designSystem = flat(read("../../../docs/design-system.md"));
const readme = flat(read("../README.md"));

const styles: ReadonlyArray<{
  readonly page: string;
  readonly style: PlatformStyle;
}> = [
  ...platformNames.map((name) => ({
    page: `platform \`${name}\``,
    style: platformStyles[name],
  })),
  ...retroNames.map((name) => ({
    page: `look \`${name}\``,
    style: retroStyles[name],
  })),
];

const styleGroups: ReadonlyArray<{
  readonly label: string;
  readonly styles: ReadonlyArray<{
    readonly page: string;
    readonly style: PlatformStyle;
  }>;
}> = [
  { label: "platform style", styles: styles.slice(0, platformNames.length) },
  { label: "authored look", styles: styles.slice(platformNames.length) },
];

const bases: ReadonlyArray<{ readonly name: string; readonly theme: Theme }> =
  themeModes.flatMap((mode) => [
    { name: `the ${mode} theme`, theme: themes[mode] },
    {
      name: `the high-contrast ${mode} theme`,
      theme: highContrastThemes[mode],
    },
  ]);

const report = (theme: Theme) => {
  const audit = auditTheme(theme);
  return {
    contrast: audit.contrast.length,
    decorative: audit.decorative.length,
    selection: audit.selection.length,
    highlight: audit.highlight.length,
    passed: audit.passed,
  };
};

describe("composing a style and a brand", () => {
  it("derives the matrix from both style indexes and both contrast variants", () => {
    expect(bases.length).toBe(themeModes.length * 2);
    expect(styles.length).toBe(platformNames.length + retroNames.length);
    expect(styleGroups.map(({ styles }) => styles.length)).toEqual([
      platformNames.length,
      retroNames.length,
    ]);
  });

  bases.forEach(({ name, theme }) => {
    styleGroups.forEach(({ label, styles: group }) => {
      it(`resolves every ${label} over ${name}`, () => {
        const failed = group.flatMap(({ page, style }) =>
          auditTheme(applyStyle(theme, style)).passed
            ? []
            : [`${page} over ${name}`],
        );

        expect(failed).toEqual([]);
      });
    });
  });

  it("rejects a second look over a look", () => {
    const lunaOverWindows = applyStyle(
      retroTheme(themes.light, "luna"),
      platformStyles.win32,
    );
    const omarchyOverLinux = applyStyle(
      retroTheme(themes.dark, "omarchy"),
      platformStyles.linux,
    );

    expect(report(lunaOverWindows)).toEqual({
      contrast: 1,
      decorative: 4,
      selection: 0,
      highlight: 0,
      passed: false,
    });
    expect(report(omarchyOverLinux)).toEqual({
      contrast: 5,
      decorative: 5,
      selection: 5,
      highlight: 9,
      passed: false,
    });
  });

  it("keeps a brand over the resolved style passing", () => {
    themeModes.forEach((mode) => {
      expect(auditTheme(resolveHouseTheme(mode)).passed).toBe(true);
      expect(auditTheme(resolveRetroBrand(mode)).passed).toBe(true);
    });
  });

  it("states the rule on both token pages and the README", () => {
    const rule = "a style is a look over a base, not a layer over a look";
    const order = "the order is base, style, brand";

    [catalogue, designSystem, readme].forEach((page) => {
      expect(page.toLowerCase()).toContain(rule);
      expect(page.toLowerCase()).toContain(order);
    });
  });

  it("prints the stacked pair it rejects", () => {
    const pair = `applyStyle(retroTheme(themes.light, "luna"), platformStyles.win32)`;

    expect(catalogue).toContain(pair);
  });
});

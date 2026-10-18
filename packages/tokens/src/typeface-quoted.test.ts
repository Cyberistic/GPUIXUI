/**
 * Bug guarded: `themeTypefaceFailures` held a family name to `non-empty`,
 * `trimmed`, `single-family` and `css-generic`, so a name in CSS quotes —
 * `'"Helvetica Neue"'`, the canonical CSS spelling for a multi-word family —
 * returned `[]` from all seven checks. GPUix passes `StyleDesc.fontFamily` to
 * its font collection as `QueryFamily::Named(name)` without unquoting it, so the
 * runtime looks for a family literally named `"Helvetica Neue"`, finds none and
 * paints the system fallback silently. The quote characters are part of the
 * string the runtime searches for, exactly like a padded name or a comma stack.
 *
 * An apostrophe inside a name (`D'Nealian`) is a character of that name, not a
 * CSS wrapper, so the rule reads only the two edges.
 */

import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  extendTheme,
  getTheme,
  themeColorFailures,
  themeContrastFailures,
  themeDirectionFailures,
  themeFailures,
  themeMetricFailures,
  themeOpacityFailures,
  themeTextTierFailures,
  themeTypefaceFailures,
  typography,
  type Theme,
} from "./index.js";
import { quotedFailures } from "./typeface.example.js";

const families = (sans: string, mono = typography.mono): Theme =>
  extendTheme(getTheme("light"), { typography: { sans, mono } });

describe("a quoted family name", () => {
  it("reports the canonical CSS double-quoted form", () => {
    expect(themeTypefaceFailures(families('"Helvetica Neue"'))).toEqual([
      { role: "sans", rule: "quoted", value: '"Helvetica Neue"' },
    ]);
  });

  it("reports the single-quoted form", () => {
    expect(themeTypefaceFailures(families("'Helvetica Neue'"))).toEqual([
      { role: "sans", rule: "quoted", value: "'Helvetica Neue'" },
    ]);
  });

  it("reports a half-copied declaration with one quote at an edge", () => {
    expect(themeTypefaceFailures(families('"Inter'))).toEqual([
      { role: "sans", rule: "quoted", value: '"Inter' },
    ]);
    expect(themeTypefaceFailures(families('Inter"'))).toEqual([
      { role: "sans", rule: "quoted", value: 'Inter"' },
    ]);
  });

  it("keeps padding and the character inside a name out of the rule", () => {
    expect(themeTypefaceFailures(families(' "Inter" '))).toEqual([
      { role: "sans", rule: "trimmed", value: ' "Inter" ' },
    ]);
    expect(themeTypefaceFailures(families('"Inter" '))).toEqual([
      { role: "sans", rule: "trimmed", value: '"Inter" ' },
    ]);
    expect(themeTypefaceFailures(families("D'Nealian"))).toEqual([]);
  });

  it("is invisible to the other six checks", () => {
    const theme = families('"Helvetica Neue"');
    expect(themeColorFailures(theme)).toEqual([]);
    expect(themeOpacityFailures(theme)).toEqual([]);
    expect(themeContrastFailures(theme)).toEqual([]);
    expect(themeTextTierFailures(theme)).toEqual([]);
    expect(themeDirectionFailures(theme)).toEqual([]);
    expect(themeMetricFailures(theme)).toEqual([]);
    expect(themeFailures(theme)).toEqual([
      {
        kind: "typeface",
        role: "sans",
        rule: "quoted",
        value: '"Helvetica Neue"',
      },
    ]);
  });

  it("checks both fields in role order", () => {
    expect(themeTypefaceFailures(families('"Inter"', " Menlo"))).toEqual([
      { role: "sans", rule: "quoted", value: '"Inter"' },
      { role: "mono", rule: "trimmed", value: " Menlo" },
    ]);
  });

  it("moves no shipped family", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeTypefaceFailures(theme), theme.name).toEqual([]);
    });
  });

  it("runs the copyable example", () => {
    expect(quotedFailures).toEqual([
      { role: "sans", rule: "quoted", value: '"Helvetica Neue"' },
    ]);
  });
});

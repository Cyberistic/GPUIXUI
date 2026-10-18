/**
 * Bug guarded: `themeTypefaceFailures` held a family name only to `non-empty`
 * and `single-family`, so a padded name (`" Inter"`) or a CSS generic keyword
 * (`system-ui`) passed every check and painted GPUI's silent
 * system fallback. Plan 385 closed the comma stack; this suite closes the two
 * forms it left.
 *
 * The runtime matches `StyleDesc.fontFamily` as one family name in its font
 * database; surrounding whitespace is not part of an installed name, and CSS
 * generic keywords are browser syntax. `.SystemUIFont` is the native sentinel
 * for the operating system's UI face.
 */

import { describe, expect, it } from "vitest";
import {
  cssGenericFamilies,
  extendTheme,
  getTheme,
  themeColorFailures,
  themeContrastFailures,
  themeDirectionFailures,
  themeFailures,
  themeMetricFailures,
  themeTextTierFailures,
  themeTypefaceFailures,
  typography,
  type Theme,
} from "./index.js";
import { genericFailures, paddedFailures } from "./typeface.example.js";

const families = (sans: string, mono: string = typography.mono): Theme =>
  extendTheme(getTheme("light"), { typography: { sans, mono } });

describe("the family name is exact", () => {
  it("reports a padded sans family", () => {
    expect(themeFailures(families(" Inter"))).toEqual([
      { kind: "typeface", role: "sans", rule: "trimmed", value: " Inter" },
    ]);
  });

  it("reports a padded mono family", () => {
    expect(themeFailures(families("Inter", "Menlo "))).toEqual([
      { kind: "typeface", role: "mono", rule: "trimmed", value: "Menlo " },
    ]);
  });

  it("keeps a whitespace-only value to the non-empty diagnostic alone", () => {
    expect(themeTypefaceFailures(families("   "))).toEqual([
      { role: "sans", rule: "non-empty", value: "   " },
    ]);
  });

  it("reports every CSS generic family keyword", () => {
    cssGenericFamilies.forEach((keyword) => {
      expect(themeTypefaceFailures(families(keyword)), keyword).toEqual([
        { role: "sans", rule: "css-generic", value: keyword },
      ]);
    });
  });

  it("reports a padded generic as padding, reading the value as written", () => {
    expect(themeTypefaceFailures(families(" system-ui"))).toEqual([
      { role: "sans", rule: "trimmed", value: " system-ui" },
    ]);
  });

  it("checks both fields in role order", () => {
    expect(themeTypefaceFailures(families(" Inter", "monospace"))).toEqual([
      { role: "sans", rule: "trimmed", value: " Inter" },
      { role: "mono", rule: "css-generic", value: "monospace" },
    ]);
  });

  it("accepts a space inside an installed name and the system sentinel", () => {
    expect(themeTypefaceFailures(families("Helvetica Neue"))).toEqual([]);
    expect(themeTypefaceFailures(families(".SystemUIFont"))).toEqual([]);
  });

  it("is the only check that sees the form", () => {
    cssGenericFamilies.forEach((keyword) => {
      const theme = families(keyword);
      expect(themeColorFailures(theme), keyword).toEqual([]);
      expect(themeContrastFailures(theme), keyword).toEqual([]);
      expect(themeTextTierFailures(theme), keyword).toEqual([]);
      expect(themeDirectionFailures(theme), keyword).toEqual([]);
      expect(themeMetricFailures(theme), keyword).toEqual([]);
      expect(themeFailures(theme), keyword).toEqual([
        { kind: "typeface", role: "sans", rule: "css-generic", value: keyword },
      ]);
    });
  });

  it("runs the copyable examples", () => {
    expect(paddedFailures).toEqual([
      { role: "sans", rule: "trimmed", value: " Inter" },
    ]);
    expect(genericFailures).toEqual([
      { role: "sans", rule: "css-generic", value: "system-ui" },
    ]);
  });
});

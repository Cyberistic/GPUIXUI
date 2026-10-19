/**
 * Guards the defect this plan fixes: the pinned runtime paints a native
 * `<code>`, `<diff>` or `<markdown>` through fixed fades the theme cannot
 * change — a diff line at 92%, its gutter at 80% and 50%, an add/delete marker
 * at 90%, its bar at 55% and its row tint at 5.5%, a list marker at 85%, a
 * blockquote rail at 60% and its wash at 5%, and a code block on a 3.5% ink
 * wash — and only `native-text.test.ts` held them, only on the shipped themes
 * and only on `card`.
 *
 * Two edits that pass every other check prove the gap. On `Dark · Linux`,
 * `successText: "#bebebe"` measures **6.405:1** for a string token through the
 * ink wash and `mutedForeground: "#bebebe"` measures **6.335:1** for a
 * blockquote's body over the accent wash, both under the 7:1 body floor, while
 * `themeFailures` returned `[]`. `themeNativeTextFailures` is the ninth check;
 * it measures the fades, the two-fade compositions and the ink wash on every
 * tone `nativeTextSurfaces` names.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  nativeSyntaxRoles,
  nativeTextFades,
  nativeTextOverFades,
  nativeTextRoles,
  nativeTextSurfaces,
  themeChecks,
  themeFailures,
  themeNativeTextFailures,
  type Theme,
} from "./index.js";
import { nativeInkOpacity } from "./native-ink.js";
import { shippedThemes } from "./shipped-themes.js";

const light = getTheme("light");
const linuxDark = getPlatformTheme("linux", "dark");

/** The fades, without the two-fade or ink arms. */
const fadesOf = (theme: Theme) =>
  themeNativeTextFailures(theme).filter(
    (failure) => failure.wash === undefined && failure.ink === undefined,
  );

describe("native text check", () => {
  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeNativeTextFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports a syntax role lost through the ink wash the opaque pair passes", () => {
    const planted = extendTheme(linuxDark, {
      colors: { successText: "#bebebe" },
    });
    expect(
      themeFailures(planted).filter((failure) => failure.kind !== "nativeText"),
    ).toEqual([]);

    const failures = themeNativeTextFailures(planted).filter(
      (failure) =>
        failure.role === "successText" && failure.ink === nativeInkOpacity,
    );
    expect(failures.length, "the three tones that fail").toBe(3);
    failures.forEach((failure) => {
      expect(failure.pairClass).toBe("body");
      expect(failure.floor).toBe(7);
      expect(failure.ratio).toBeCloseTo(6.405, 2);
    });
    expect(new Set(failures.map((failure) => failure.surface))).toEqual(
      new Set(["card", "popover", "muted"]),
    );
  });

  it("reports a blockquote body lost through its own accent wash", () => {
    const planted = extendTheme(linuxDark, {
      colors: { mutedForeground: "#bebebe" },
    });
    expect(
      themeFailures(planted).filter((failure) => failure.kind !== "nativeText"),
    ).toEqual([]);

    const failure = themeNativeTextFailures(planted).find(
      (candidate) => candidate.field === "textMuted",
    );
    expect(failure?.role).toBe("mutedForeground");
    expect(failure?.wash).toBe("primaryText");
    expect(failure?.washOpacity).toBe(0.05);
    expect(failure?.opacity).toBe(1);
    expect(failure?.pairClass).toBe("body");
    expect(failure?.ratio).toBeCloseTo(6.335, 2);
  });

  it("publishes every runtime fraction", () => {
    expect(
      nativeTextFades.map((fade) => `${fade.field}@${fade.opacity}`),
    ).toEqual([
      "text@0.92",
      "textFaint@0.8",
      "textFaint@0.5",
      "diffAdd@0.9",
      "diffDel@0.9",
      "diffAdd@0.55",
      "diffDel@0.55",
      "diffAdd@0.055",
      "diffDel@0.055",
      "accent@0.85",
      "accent@0.6",
      "accent@0.05",
    ]);
    expect(
      nativeTextOverFades.map(
        (fade) =>
          `${fade.field}@${fade.opacity}>${fade.wash}@${fade.washOpacity}`,
      ),
    ).toEqual([
      "text@0.92>diffAdd@0.055",
      "text@0.92>diffDel@0.055",
      "textMuted@1>accent@0.05",
    ]);
  });

  it("can fail every published fade on its own surface", () => {
    nativeTextFades.forEach((fade) => {
      const role = nativeTextRoles[fade.field];
      const planted = extendTheme(light, {
        colors: { [role]: light.colors.card },
      });
      const matched = fadesOf(planted).some(
        (failure) =>
          failure.field === fade.field &&
          failure.opacity === fade.opacity &&
          failure.pairClass === fade.pairClass &&
          failure.surface === "card",
      );
      expect(
        matched,
        `${fade.field} at ${fade.opacity} (${fade.pairClass})`,
      ).toBe(true);
    });
  });

  it("can fail every published two-fade composition", () => {
    nativeTextOverFades.forEach((fade) => {
      const role = nativeTextRoles[fade.field];
      const wash = nativeTextRoles[fade.wash];
      const planted = extendTheme(light, {
        colors: {
          [role]: light.colors.card,
          [wash]: light.colors.card,
        },
      });
      const matched = themeNativeTextFailures(planted).some(
        (failure) =>
          failure.field === fade.field &&
          failure.wash === wash &&
          failure.washOpacity === fade.washOpacity &&
          failure.surface === "card",
      );
      expect(
        matched,
        `${fade.field} over ${fade.wash} at ${fade.washOpacity}`,
      ).toBe(true);
    });
  });

  it("holds every syntax role through the ink on every tone", () => {
    const roles = [...new Set(Object.values(nativeSyntaxRoles))];
    const planted = extendTheme(light, {
      colors: Object.fromEntries(
        roles.map((role) => [role, light.colors.card]),
      ),
    });
    const reported = themeNativeTextFailures(planted).filter(
      (failure) => failure.ink === nativeInkOpacity,
    );
    roles.forEach((role) => {
      nativeTextSurfaces.forEach((surface) => {
        const matched = reported.some(
          (failure) => failure.role === role && failure.surface === surface,
        );
        expect(matched, `${role} on ${surface}`).toBe(true);
      });
    });
  });

  it("tags the failure and places the check after the find highlight", () => {
    const planted = extendTheme(linuxDark, {
      colors: { successText: "#bebebe" },
    });
    const failure = themeFailures(planted).find(
      (candidate) => candidate.kind === "nativeText",
    );
    expect(failure).toBeDefined();
    expect(themeChecks.indexOf("nativeText")).toBe(
      themeChecks.indexOf("highlight") + 1,
    );
    expect(themeChecks.indexOf("nativeText")).toBeLessThan(
      themeChecks.indexOf("hierarchy"),
    );
  });

  it("names every value in the reference", () => {
    const docs = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    [
      "themeNativeTextFailures",
      "nativeTextFades",
      "nativeTextOverFades",
      "NativeTextFade",
      "NativeTextOverFade",
      "NativeTextFailure",
    ].forEach((name) =>
      expect(
        new RegExp(`(^|[^A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(docs),
        name,
      ).toBe(true),
    );
  });
});

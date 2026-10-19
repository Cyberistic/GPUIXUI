/**
 * Guards the defect this plan fixes: the pinned runtime paints a native
 * `<code>`, `<diff>` or `<markdown>` through fixed fades the theme cannot
 * change — a diff line at 92%, its gutter at 80% and 50%, an add/delete marker
 * at 90%, its bar at 55% and its row tint at 5.5%, a list marker at 85%, a
 * blockquote rail at 60% and its wash at 5%, and a code block on a 3.5% ink
 * wash — and only `native-text.test.ts` held them, only on the shipped themes
 * and only on `card`.
 *
 * Plan 588 adds the chrome the same runtime washes with its own neutral ink: a
 * code block's language header (2% under `textMuted`, with the theme's `border`
 * on the same wash), a diff file header (2.5% under `textMuted`/`diffAdd`/
 * `diffDel`) and the header hover (5%, also the show-more row). A `border` that
 * clears every plain-surface pair can still vanish there: on `Dark · macOS`,
 * `border: "#303030"` measures **1.002:1** on the code header while every other
 * check returns `[]`.
 *
 * Plan 589 adds the block's own frame: a fenced code block paints
 * `border_color(theme.border)` around a body on the 3.5% ink wash, so the same
 * role can vanish inside the block. On `Dark`, `border: "#222222"` clears every
 * plain-surface pair and measures **1.036:1** on the body wash while every other
 * check returns `[]`.
 *
 * Plan 590 adds inline code: `codeText` (`primaryText`) is painted on the opaque
 * `codeWash` (`accent`) quad, but only the secondary floor of the accent row
 * fill was measured. Four shipped sets measured 6.506–6.960:1 there under the
 * body floor while every other check returned `[]`; `nativeInlineCode` owns the
 * pair and their ink takes one designed step.
 *
 * Two edits that pass every other check prove the earlier gap. On `Dark ·
 * Linux`, `successText: "#bebebe"` measures **6.405:1** for a string token
 * through the ink wash and `mutedForeground: "#bebebe"` measures **6.315:1**
 * for a blockquote's body over the accent wash, both under the 7:1 body floor,
 * while `themeFailures` returned `[]`. `themeNativeTextFailures` is the ninth
 * check; it measures the fades, the two-fade compositions, the chrome washes
 * and the ink wash on every tone `nativeTextSurfaces` names.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  nativeInlineCode,
  nativeSyntaxPairs,
  nativeSyntaxRoles,
  nativeTextFades,
  nativeTextOverFades,
  nativeTextRoles,
  nativeTextSurfaces,
  nativeTextWashes,
  themeChecks,
  themeFailures,
  themeNativeTextFailures,
  type Theme,
} from "./index.js";
import { nativeInk, nativeInkOpacity } from "./native-ink.js";
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
    expect(failure?.ratio).toBeCloseTo(6.315, 2);
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

  it("publishes every chrome wash", () => {
    expect(
      nativeTextWashes.map(
        (wash) => `${wash.field}@${wash.ink} ${wash.pairClass}`,
      ),
    ).toEqual([
      "border@0.035 divider",
      "border@0.02 divider",
      "textMuted@0.02 secondary",
      "textMuted@0.025 secondary",
      "diffAdd@0.025 secondary",
      "diffDel@0.025 secondary",
      "textMuted@0.05 secondary",
      "diffAdd@0.05 secondary",
      "diffDel@0.05 secondary",
    ]);
  });

  it("reports a code header separator the plain pairs accept", () => {
    const planted = extendTheme(getPlatformTheme("darwin", "dark"), {
      colors: { border: "#303030" },
    });
    expect(
      themeFailures(planted).filter((failure) => failure.kind !== "nativeText"),
    ).toEqual([]);

    const failure = themeNativeTextFailures(planted).find(
      (candidate) => candidate.field === "border" && candidate.ink === 0.02,
    );
    expect(failure?.role).toBe("border");
    expect(failure?.surface).toBe("card");
    expect(failure?.pairClass).toBe("divider");
    expect(failure?.opacity).toBe(1);
    expect(failure?.ratio).toBeCloseTo(1.002, 2);
  });

  it("reports a code block frame the plain pairs accept", () => {
    const planted = extendTheme(getTheme("dark"), {
      colors: { border: "#222222" },
    });
    expect(
      themeFailures(planted).filter((failure) => failure.kind !== "nativeText"),
    ).toEqual([]);

    const failure = themeNativeTextFailures(planted).find(
      (candidate) => candidate.field === "border" && candidate.ink === 0.035,
    );
    expect(failure?.role).toBe("border");
    expect(failure?.surface).toBe("card");
    expect(failure?.pairClass).toBe("divider");
    expect(failure?.opacity).toBe(1);
    expect(failure?.ratio).toBeCloseTo(1.036, 2);
  });

  it("publishes the inline-code pair", () => {
    expect(nativeInlineCode).toEqual({
      text: "codeText",
      wash: "codeWash",
      pairClass: "body",
    });
  });

  it("reports inline code the accent row fill accepts", () => {
    const planted = extendTheme(getPlatformRecipeTheme("xp", "light"), {
      colors: { primaryText: "#003FA8" },
    });
    expect(
      themeFailures(planted).filter((failure) => failure.kind !== "nativeText"),
    ).toEqual([]);

    const failure = themeNativeTextFailures(planted).find(
      (candidate) => candidate.field === "codeText",
    );
    expect(failure?.role).toBe("primaryText");
    expect(failure?.surface).toBe("accent");
    expect(failure?.pairClass).toBe("body");
    expect(failure?.opacity).toBe(1);
    expect(failure?.ratio).toBeCloseTo(6.506, 2);
  });

  it("pins the inline-code and syntax figures the reference quotes", () => {
    const inline = shippedThemes.map(({ theme }) => ({
      name: theme.name,
      ratio: contrastRatio(theme.colors.primaryText, theme.colors.accent),
    }));
    const tightestInline = inline.reduce((min, entry) =>
      entry.ratio < min.ratio ? entry : min,
    );
    const syntax = shippedThemes.flatMap(({ theme }) =>
      nativeSyntaxPairs.map(([foreground, background]) => ({
        name: theme.name,
        foreground,
        background,
        ratio: contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        ),
      })),
    );
    const tightestSyntax = syntax.reduce((min, entry) =>
      entry.ratio < min.ratio ? entry : min,
    );
    const docs = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    expect(docs).toContain(`**${tightestInline.ratio.toFixed(3)}:1**`);
    expect(docs).toContain(`\`${tightestInline.name}\``);
    expect(docs).toContain(`\`${tightestSyntax.foreground}\` at`);
    expect(docs).toContain(`**${tightestSyntax.ratio.toFixed(3)}:1**`);
    expect(docs).toContain(`\`${tightestSyntax.name}\``);
  });

  it("can fail every published chrome wash on its own surface", () => {
    nativeTextWashes.forEach((wash) => {
      const role = nativeTextRoles[wash.field];
      const planted = extendTheme(light, {
        colors: { [role]: nativeInk(light, "card", wash.ink) },
      });
      const matched = themeNativeTextFailures(planted).some(
        (failure) =>
          failure.field === wash.field &&
          failure.ink === wash.ink &&
          failure.pairClass === wash.pairClass &&
          failure.surface === "card",
      );
      expect(
        matched,
        `${wash.field} on ${wash.ink} ink (${wash.pairClass})`,
      ).toBe(true);
    });
  });

  it("pins the chrome figures the reference quotes", () => {
    const planted = extendTheme(getPlatformTheme("darwin", "dark"), {
      colors: { border: "#303030" },
    });
    const ratio = contrastRatio(
      planted.colors.border,
      nativeInk(planted, "card", 0.02),
    );
    const body = extendTheme(getTheme("dark"), {
      colors: { border: "#222222" },
    });
    const bodyRatio = contrastRatio(
      body.colors.border,
      nativeInk(body, "card", 0.035),
    );
    const docs = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    expect(docs).toContain(`**${ratio.toFixed(3)}:1**`);
    expect(docs).toContain('`border: "#303030"`');
    expect(docs).toContain("`Dark · macOS`");
    expect(docs).toContain(`**${bodyRatio.toFixed(3)}:1**`);
    expect(docs).toContain('`border: "#222222"`');
    expect(docs).toContain("on the `Dark` theme");
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
      "nativeInlineCode",
      "nativeTextWashes",
      "NativeTextFade",
      "NativeTextOverFade",
      "NativeInlineCode",
      "NativeTextWash",
      "NativeTextFailure",
    ].forEach((name) =>
      expect(
        new RegExp(`(^|[^A-Za-z0-9_$])${name}(?![A-Za-z0-9_$])`).test(docs),
        name,
      ).toBe(true),
    );
  });
});

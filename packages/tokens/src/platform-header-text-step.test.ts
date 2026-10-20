/**
 * Guards the defect plan 781 fixes: each platform style header states its
 * accent's readable text step by quoting a hex, and two palette plans moved
 * `primaryText` while the prose stayed. macOS named `#0055B3`, a colour the file
 * no longer declares at all; Windows named `#005BA1` and Linux dark `#99C1F1`,
 * which are each file's `primaryHover` — a hover *fill* presented as the ink the
 * role split exists to separate.
 *
 * `platform-claims.test.ts` owns the figures these sentences carry (plan 535);
 * this suite owns the two hexes before them. Every case derives its expectation
 * from the module's own palette through the resolver, so the next `primaryText`
 * move fails here. `node:fs` is deliberate, as in the other tree-local
 * documentation guards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { linuxPlatformStyle } from "./platform-styles/linux.js";
import { macosPlatformStyle } from "./platform-styles/macos.js";
import { windowsPlatformStyle } from "./platform-styles/windows.js";
import type { PlatformVariant } from "./platform-types.js";
import { getPlatformTheme } from "./theme.js";

const headerOf = (file: string): string =>
  readFileSync(new URL(`./platform-styles/${file}`, import.meta.url), "utf8")
    .split("export const")[0]
    ?.replace(/^[ \t]*\*[ \t]?/gm, "")
    .replace(/\s+/g, " ")
    .trim() ?? "";

const styles = {
  darwin: macosPlatformStyle,
  linux: linuxPlatformStyle,
  win32: windowsPlatformStyle,
} as const;

const variants: ReadonlyArray<{
  readonly platform: PlatformVariant;
  readonly file: string;
}> = [
  { platform: "darwin", file: "macos.ts" },
  { platform: "linux", file: "linux.ts" },
  { platform: "win32", file: "windows.ts" },
];

/** The one sentence a header states about the readable ink. */
const textStepSentence = (header: string): string => {
  const match = /The accent's readable text step is[\s\S]*?\(plan 082\)\./.exec(
    header,
  );
  if (match === null) {
    throw new Error("the header states no readable text step");
  }
  return match[0];
};

describe("the platform style headers", () => {
  it("state the readable ink their palette ships", () => {
    variants.forEach(({ platform, file }) => {
      const light = getPlatformTheme(platform, "light");
      const dark = getPlatformTheme(platform, "dark");
      const sentence = `The accent's readable text step is \`${light.colors.primaryText}\` light and \`${dark.colors.primaryText}\` dark`;
      expect(headerOf(file), file).toContain(sentence);
    });
  });

  it("quote no colour their palette does not declare", () => {
    variants.forEach(({ platform, file }) => {
      const style = styles[platform];
      const declared = new Set(
        [style.colors.light, style.colors.dark].flatMap((colors) =>
          Object.values(colors).filter(
            (value): value is string => typeof value === "string",
          ),
        ),
      );
      const quoted = headerOf(file).match(/#[0-9A-Fa-f]{6}/g) ?? [];
      expect(quoted.length, file).toBeGreaterThan(0);
      quoted.forEach((hex) =>
        expect(declared.has(hex.toUpperCase()), `${file} ${hex}`).toBe(true),
      );
    });
  });

  it("names no other role's colour as the ink", () => {
    variants.forEach(({ platform, file }) => {
      const sentence = textStepSentence(headerOf(file));
      (["light", "dark"] as const).forEach((mode) => {
        const theme = getPlatformTheme(platform, mode);
        // A fill may legitimately carry the ink's value (Windows dark's hover
        // does); what must never appear is a pointer fill that is *not* the ink.
        [theme.colors.primaryHover, theme.colors.primaryActive].forEach(
          (fill) => {
            if (fill === theme.colors.primaryText) return;
            expect(sentence, `${platform} ${mode} ${fill}`).not.toContain(fill);
          },
        );
      });
    });
  });
});

/**
 * Bug guarded: `platform-styles/macos.ts` justified its dark focus ring with
 * "`#0A84FF` is 2.50:1 on the pressed-row wash", but the shipped dark `active`
 * is `#404042` and the ratio is 2.836:1 — a copied-style rationale quoted a
 * value the theme no longer produced while every gate stayed green. The other
 * figures in the platform files were true but unguarded, so the next palette
 * edit could stale them the same way. Plan 535 derives each figure from the
 * resolved theme and pins the sentence.
 *
 * `node:fs` is deliberate: this is a documentation test over the package's own
 * style files, and the tokens package ships zero runtime dependencies.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compositeOver, contrastRatio } from "./contrast.js";
import { statusTones } from "./styles.js";
import { getPlatformTheme } from "./theme.js";

const source = (file: string): string =>
  readFileSync(new URL(`./platform-styles/${file}`, import.meta.url), "utf8")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:\*|\/\/)\s?/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const fixed = (value: number, digits: number): string => value.toFixed(digits);

/** The tightest border-over-scrim among the solid status chips. */
const tightestChipBorder = (mode: "light" | "dark"): string => {
  const theme = getPlatformTheme("win32", mode);
  return fixed(
    Math.min(
      ...statusTones.map((tone) =>
        contrastRatio(
          compositeOver(theme.colors.overlay, theme.colors[tone]),
          theme.colors.border,
        ),
      ),
    ),
    3,
  );
};

describe("the platform files' quoted figures", () => {
  it("holds the macOS accent and focus-ring ratios", () => {
    const light = getPlatformTheme("darwin", "light");
    const dark = getPlatformTheme("darwin", "dark");
    const macos = source("macos.ts");

    const pressed = fixed(
      contrastRatio(dark.colors.primary, dark.colors.active),
      3,
    );
    expect(macos).toContain(
      `because \`${dark.colors.primary}\` is ${pressed}:1 on the pressed-row wash, under the 3:1 boundary floor`,
    );
    expect(macos).toContain(
      `the fill's \`${light.colors.primary}\` measures ${fixed(
        contrastRatio(light.colors.primary, light.colors.background),
        2,
      )}:1 on the canvas`,
    );
    expect(macos).toContain(
      `\`${dark.colors.primary}\` ${fixed(
        contrastRatio(dark.colors.primary, dark.colors.card),
        2,
      )}:1 on a dark card`,
    );
  });

  it("holds the macOS face and the Windows border-over-scrim figures", () => {
    const dark = getPlatformTheme("darwin", "dark");
    const macos = source("macos.ts");

    const face = fixed(
      contrastRatio(
        compositeOver(dark.colors.overlay, dark.colors.warning),
        dark.colors.popover,
      ),
      3,
    );
    expect(macos).toContain(`warning, the brightest, at ${face}:1`);

    const border = tightestChipBorder("dark");
    expect(macos).toContain(
      `a dialog's border measures ${border}:1 over the scrimmed status chips in the Windows palette`,
    );
  });

  it("holds the Linux accent and selected-step figures", () => {
    const light = getPlatformTheme("linux", "light");
    const dark = getPlatformTheme("linux", "dark");
    const linux = source("linux.ts");

    expect(linux).toContain(
      `the fill's \`${light.colors.primary}\` is ${fixed(
        contrastRatio(light.colors.primary, light.colors.active),
        2,
      )}:1 on the pressed wash`,
    );
    expect(linux).toContain(
      `${fixed(
        contrastRatio(dark.colors.selected, dark.colors.accent),
        3,
      )}:1 step past its accent wash`,
    );
  });

  it("holds the Windows accent figure", () => {
    const light = getPlatformTheme("win32", "light");
    const windows = source("windows.ts");

    expect(windows).toContain(
      `the fill's \`${light.colors.primary}\` is ${fixed(
        contrastRatio(light.colors.primary, light.colors.active),
        2,
      )}:1 on the pressed wash`,
    );
  });
});

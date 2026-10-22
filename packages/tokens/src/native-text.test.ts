/**
 * Guards the native text-host seam.
 *
 * A GPUix `<input>`, `<textarea>` or `<code>` takes its palette through a
 * `theme` prop, not through the properties `styles.ts` resolves — and a host
 * given no theme layers on the runtime's **built-in dark theme** (the pinned
 * typings say so). Before this seam existed the components package's fields
 * passed no host theme, so their placeholder and caret were painted for a dark
 * surface in a light theme: a role the contrast table measures was skipped, and
 * the caret was a mark nobody checked.
 *
 * `nativeTextTheme` is the one place the answer lives, and it names the fill the
 * host's value and placeholder sit on, because the library's fields paint two:
 * `input` for a plain field, the page role for a composite one. The cases below
 * hold the mapping, the fill, the floors the roles must clear on that fill, and
 * the adoption both packages carry.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: the last cases read the
 * catalogue and the two packages' sources, and the package keeps zero runtime
 * dependencies by design.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { darkColors } from "./color.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import {
  nativeTextFills,
  nativeTextTheme,
  type NativeTextFill,
} from "./native-text.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themeModes,
  themes,
} from "./theme.js";

/** Every theme the library ships: both base modes, both contrast variants, each platform and each authored look. */
const shipped = [
  { label: "light", theme: lightTheme },
  { label: "dark", theme: darkTheme },
  { label: "high-contrast light", theme: highContrastLightTheme },
  { label: "high-contrast dark", theme: highContrastDarkTheme },
  ...platformNames.flatMap((platform) =>
    themeModes.map((mode) => ({
      label: `${platform} ${mode}`,
      theme: platformTheme(themes[mode], platform),
    })),
  ),
  ...retroNames.flatMap((look) =>
    themeModes.map((mode) => ({
      label: `${look} ${mode}`,
      theme: retroTheme(themes[mode], look),
    })),
  ),
];

describe("nativeTextTheme", () => {
  it("maps every role the host reads from the theme", () => {
    expect(nativeTextTheme(lightTheme)).toEqual({
      appearance: "light",
      bg: lightTheme.colors.input,
      text: lightTheme.colors.inputForeground,
      textMuted: lightTheme.colors.mutedForeground,
      textFaint: lightTheme.colors.placeholder,
      accent: lightTheme.colors.primary,
      caret: lightTheme.colors.primary,
      fontSans: lightTheme.typography.sans,
      fontMono: lightTheme.typography.mono,
    });
  });

  it("carries the mode, so the host's own defaults do not fall back to dark", () => {
    expect(nativeTextTheme(darkTheme).appearance).toBe("dark");
    expect(nativeTextTheme(highContrastLightTheme).appearance).toBe("light");
    expect(nativeTextTheme(highContrastDarkTheme).appearance).toBe("dark");
    // The premise: the runtime's built-in default is the dark one. A host has
    // to be told which appearance to paint, not only which colours.
    expect(darkColors.background).not.toBe(lightTheme.colors.background);
  });

  it("names the fill its value and placeholder sit on", () => {
    const onInput = nativeTextTheme(lightTheme, "input");
    const onPage = nativeTextTheme(lightTheme, "background");

    expect(onPage.bg).toBe(lightTheme.colors.background);
    expect(onInput.bg).toBe(lightTheme.colors.input);
    expect(onPage.text).toBe(onInput.text);
    expect(onPage.textFaint).toBe(onInput.textFaint);
    // The fill is read, not decorative: the base theme's page and field whites
    // give the placeholder two different ratios.
    expect(contrastRatio(onPage.textFaint, onPage.bg)).not.toBeCloseTo(
      contrastRatio(onInput.textFaint, onInput.bg) ?? 0,
      2,
    );
  });

  it("names the two fills a field paints, and reads the one it is given", () => {
    expect(nativeTextFills).toEqual(["input", "background"]);
    nativeTextFills.forEach((fill: NativeTextFill) =>
      expect(nativeTextTheme(lightTheme, fill).bg).toBe(
        lightTheme.colors[fill],
      ),
    );
  });

  it("hands a brand's own values to the host", () => {
    const brand = {
      ...lightTheme,
      colors: {
        ...lightTheme.colors,
        placeholder: "#123456",
        primary: "#654321",
      },
      mode: "dark" as const,
    };
    const host = nativeTextTheme(brand, "background");
    expect(host.textFaint).toBe("#123456");
    expect(host.accent).toBe("#654321");
    expect(host.caret).toBe("#654321");
    expect(host.appearance).toBe("dark");
  });

  it("fills every key the runtime's theme object takes", () => {
    expect(Object.keys(nativeTextTheme(lightTheme)).toSorted()).toEqual([
      "accent",
      "appearance",
      "bg",
      "caret",
      "fontMono",
      "fontSans",
      "text",
      "textFaint",
      "textMuted",
    ]);
  });

  it("paints the value, placeholder and caret at their floors on every shipped theme and fill", () => {
    const failures = shipped.flatMap(({ label, theme }) => {
      const floors = contrastFloorsFor(theme);
      return nativeTextFills.flatMap((fill) => {
        const host = nativeTextTheme(theme, fill);
        const measured: ReadonlyArray<
          readonly [string, number | undefined, number]
        > = [
          ["value", contrastRatio(host.text, host.bg), floors.body],
          [
            "placeholder",
            contrastRatio(host.textFaint, host.bg),
            floors.secondary,
          ],
          ["caret", contrastRatio(host.caret, host.bg), floors.boundary],
        ];
        return measured
          .filter(([, ratio, floor]) => ratio === undefined || ratio < floor)
          .map(
            ([role, ratio, floor]) =>
              `${label} ${fill} ${role}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`,
          );
      });
    });

    expect(failures).toEqual([]);
    expect(shipped.length).toBe(16);
  });

  it("keeps the placeholder visibly fainter than secondary text", () => {
    // A placeholder is a hint, not a label; matching `mutedForeground` would
    // make an empty field read as a filled one.
    shipped.forEach(({ label, theme }) => {
      nativeTextFills.forEach((fill) => {
        const host = nativeTextTheme(theme, fill);
        const faint = contrastRatio(host.textFaint, host.bg) ?? 0;
        const secondary = contrastRatio(host.textMuted, host.bg) ?? 0;
        expect(faint, `${label} ${fill}`).toBeLessThan(secondary);
      });
    });
  });

  it("matches the shipped placeholder the palette moved for", () => {
    // The pair found Aero light's placeholder at 4.35:1 on its own window and
    // the inherited base value at 4.49:1 on macOS's, both under the 4.5:1 floor.
    const aero = retroTheme(lightTheme, "aero");
    const darwin = platformTheme(lightTheme, "darwin");
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(contrastRatio("#5F7181", aero.colors.background)).toBeCloseTo(
      4.35,
      2,
    );
    expect(contrastRatio("#66707F", darwin.colors.background)).toBeCloseTo(
      4.49,
      2,
    );
    // The page prints the tightest placement, computed here, so a palette edit
    // or a stale sentence fails by number.
    const tightest = shipped
      .flatMap(({ theme }) =>
        nativeTextFills.map((fill) => {
          const host = nativeTextTheme(theme, fill);
          return (
            contrastRatio(host.textFaint, host.bg) ?? Number.POSITIVE_INFINITY
          );
        }),
      )
      .reduce(
        (lowest, ratio) => Math.min(lowest, ratio),
        Number.POSITIVE_INFINITY,
      );

    expect(catalogue).toContain(
      `The tightest placement over both fills is the base dark theme's placeholder on its own field fill at ${tightest.toFixed(2)}:1`,
    );
  });
});

/**
 * The seam is only worth its mapping if the hosts actually take it. Both
 * packages carry it now: the primitives re-export the functions rather than
 * copying them, and every components host passes the theme and names the fill it
 * paints. The catalogue used to say the components' fields "pass no host theme
 * at all", which would have sent a reader to fix a defect that was already
 * closed, so the page is held to the sources here.
 */
describe("the adoption both packages carry", () => {
  const componentsDir = new URL("../../components/src/", import.meta.url);
  const sources = readdirSync(componentsDir)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => ({
      file,
      text: readFileSync(new URL(file, componentsDir), "utf8"),
    }));

  it("gives every components host the theme and the fill its value sits on", () => {
    const hosts = sources.filter(({ text }) =>
      /<(input|textarea|code)[\s>]/.test(text),
    );

    // A rule that finds no host would pass by measuring nothing.
    expect(hosts.length).toBeGreaterThanOrEqual(9);
    const missing = hosts
      .filter(({ text }) => !text.includes("nativeTextTheme("))
      .map(({ file }) => file);

    expect(missing).toEqual([]);
  });

  it("names one of the two fills at every call site", () => {
    // The pattern is built rather than written as a literal: `scripts/check-tests.ts`
    // walks a regex written mid-expression into the code after it and reports the
    // whole test as assertionless.
    const call = new RegExp("nativeTextTheme\\(([^)]*)\\)", "g");
    const quoted = new RegExp('"(\\w+)"');
    const named = sources.flatMap(({ file, text }) =>
      [...text.matchAll(call)].map((match) => ({
        file,
        fill: quoted.exec(match[1] ?? "")?.[1],
      })),
    );
    const unknown = named.filter(
      ({ fill }) =>
        fill !== undefined && !nativeTextFills.some((known) => known === fill),
    );

    expect(named.length).toBeGreaterThanOrEqual(10);
    expect(unknown).toEqual([]);
  });

  it("re-exports the seam from the primitives instead of copying it", () => {
    const primitives = readFileSync(
      new URL("../../primitives/src/core/style.ts", import.meta.url),
      "utf8",
    );

    expect(primitives).toContain("nativeTextTheme");
    expect(primitives).toContain("nativeTextFills");
    // A local re-implementation would be the duplication the boundaries forbid.
    expect(primitives).not.toMatch(/function nativeTextTheme/);
  });

  it("teaches both halves on the catalogue, and retracts the stale one", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain("Both packages carry the seam");
    expect(catalogue).toContain("`ComboboxInput`");
    expect(catalogue).not.toContain(
      "the components package's fields pass no host theme",
    );
  });
});

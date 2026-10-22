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
import { blend, darkColors } from "./color.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { diffHostTheme } from "./native-diff.example.js";
import {
  nativeDiffWash,
  nativeTextFills,
  nativeTextTheme,
  type NativeTextFill,
} from "./native-text.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themeModes,
  themes,
  type Theme,
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
      metrics: {
        codeTextSize: lightTheme.typography.codeBlock.fontSize,
        codeLineHeight: lightTheme.typography.codeBlock.lineHeight,
      },
      diffAdd: lightTheme.colors.successSoftForeground,
      diffDel: lightTheme.colors.destructiveSoftForeground,
      diffHunkBg: lightTheme.colors.muted,
      textDim: lightTheme.colors.mutedForeground,
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
      "diffAdd",
      "diffDel",
      "diffHunkBg",
      "fontMono",
      "fontSans",
      "metrics",
      "text",
      "textDim",
      "textFaint",
      "textMuted",
    ]);
  });

  it("gives a code host the scale's own block type", () => {
    // A `<code>` host lays its block out from the runtime theme's `metrics`, not
    // from a style property, so a seam that fills only the palette paints the
    // runtime's 12.5/18 code block whatever the theme says. The role is read
    // from the theme rather than retyped, so a brand's scale follows.
    const host = nativeTextTheme(lightTheme);

    expect(host.metrics).toEqual({
      codeTextSize: lightTheme.typography.codeBlock.fontSize,
      codeLineHeight: lightTheme.typography.codeBlock.lineHeight,
    });
    const brand = extendTheme(lightTheme, {
      typography: { codeBlock: { fontSize: 14, lineHeight: 22 } },
    });
    expect(nativeTextTheme(brand).metrics).toEqual({
      codeTextSize: 14,
      codeLineHeight: 22,
    });
    // Every shipped style resolves its own scale, in both fills.
    const drifted = shipped.flatMap(({ label, theme }) =>
      nativeTextFills.flatMap((fill) => {
        const { metrics } = nativeTextTheme(theme, fill);
        return metrics.codeTextSize === theme.typography.codeBlock.fontSize &&
          metrics.codeLineHeight === theme.typography.codeBlock.lineHeight
          ? []
          : [`${label} ${fill}`];
      }),
    );

    expect(drifted).toEqual([]);
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
    // or a stale sentence fails by number — and by name, because which style is
    // tightest moves with the palette.
    const tightest = shipped
      .flatMap(({ theme }) =>
        nativeTextFills.map((fill) => {
          const host = nativeTextTheme(theme, fill);
          return {
            where: `${theme.name}'s placeholder on ${
              fill === "input" ? "its own field fill" : "the page role"
            }`,
            ratio:
              contrastRatio(host.textFaint, host.bg) ??
              Number.POSITIVE_INFINITY,
          };
        }),
      )
      .reduce((lowest, row) => (row.ratio < lowest.ratio ? row : lowest));

    expect(catalogue).toContain(
      `The tightest placement over both fills is ${tightest.where} at ${tightest.ratio.toFixed(2)}:1`,
    );
  });

  it("teaches the code host's type, not only its palette", () => {
    // A `<code>` host is the one host whose type comes from the theme object, so
    // a reader has to know both what the seam fills in and why the runtime's own
    // number is not the library's scale.
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(catalogue).toContain(
      "| `metrics.codeTextSize` / `codeLineHeight` | `typography.codeBlock`'s size / leading |",
    );
    expect(catalogue).toContain("its default is 12.5/18");
    expect(catalogue).toContain("syntax palette");
  });
});

/**
 * A `<diff>` host paints its own colours unless the theme object carries them:
 * at `@gpuix/native@0.11.0` an added line's ink and the 5.5% wash under it are
 * one field (`diffAdd`), a removed line's the other, a hunk header a fill and
 * its file path the dim chrome role. So one value does two jobs, and the
 * contract has to measure both: the ink as text, and the wash it derives as a
 * surface — an ink that matches the pane erases the line, and a wash that
 * matches the pane hides that the line changed at all.
 */
describe("the diff host's colours", () => {
  /** The wash the runtime paints under a changed line: its own ink at 5.5%. */
  const rowWash = (ink: string, fill: string) =>
    blend(ink, fill, 1 - nativeDiffWash);

  /** Every placement the diff contract measures, with the ratio and floor. */
  const placements = (theme: Theme) =>
    nativeTextFills.flatMap((fill) => {
      const host = nativeTextTheme(theme, fill);
      const floors = contrastFloorsFor(theme);
      const wash = (ink: string) => rowWash(ink, host.bg);
      return [
        {
          claim: `added ink on ${fill}`,
          ratio: contrastRatio(host.diffAdd, host.bg),
          floor: floors.body,
        },
        {
          claim: `added ink on its row wash over ${fill}`,
          ratio: contrastRatio(host.diffAdd, wash(host.diffAdd)),
          floor: floors.body,
        },
        {
          claim: `added row wash on ${fill}`,
          ratio: contrastRatio(wash(host.diffAdd), host.bg),
          floor: decorativeFloor,
        },
        {
          claim: `removed ink on ${fill}`,
          ratio: contrastRatio(host.diffDel, host.bg),
          floor: floors.body,
        },
        {
          claim: `removed ink on its row wash over ${fill}`,
          ratio: contrastRatio(host.diffDel, wash(host.diffDel)),
          floor: floors.body,
        },
        {
          claim: `removed row wash on ${fill}`,
          ratio: contrastRatio(wash(host.diffDel), host.bg),
          floor: decorativeFloor,
        },
        {
          claim: `hunk stripe on ${fill}`,
          ratio: contrastRatio(host.diffHunkBg, host.bg),
          floor: decorativeFloor,
        },
        {
          claim: `faint text on the hunk stripe over ${fill}`,
          ratio: contrastRatio(host.textFaint, host.diffHunkBg),
          floor: floors.secondary,
        },
        {
          claim: `file path on ${fill}`,
          ratio: contrastRatio(host.textDim, host.bg),
          floor: floors.secondary,
        },
      ];
    });

  it("holds the runtime's own wash share", () => {
    // The share is the runtime's, not a design choice: a `<diff>` row tints
    // itself 0.055 of its ink over the fill (`custom_elements/diff.rs` at the
    // pinned release), so the contract measures the wash it actually paints.
    expect(nativeDiffWash).toBe(0.055);
  });

  it("keeps the ink readable on the fill and on the wash it derives", () => {
    const failures = shipped.flatMap(({ label, theme }) =>
      placements(theme)
        .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
        .map(
          ({ claim, ratio, floor }) =>
            `${label} ${claim}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`,
        ),
    );

    expect(failures).toEqual([]);
    expect(shipped.length).toBe(16);
  });

  it("lets the tone's readable role carry the ink, not its solid fill", () => {
    // The premise: a status *fill* is designed to carry its own on-colour, not
    // to be read on the page. Light `success` measures 4.26:1 there, under the
    // secondary floor a 11px count needs, while the tone's readable role clears
    // the body floor by a wide margin.
    expect(
      contrastRatio(lightTheme.colors.success, lightTheme.colors.background),
    ).toBeCloseTo(4.26, 2);
    expect(
      contrastRatio(
        lightTheme.colors.successSoftForeground,
        lightTheme.colors.background,
      ),
    ).toBeCloseTo(11.98, 2);
    expect(nativeTextTheme(lightTheme).diffAdd).toBe(
      lightTheme.colors.successSoftForeground,
    );
    expect(nativeTextTheme(lightTheme).diffDel).toBe(
      lightTheme.colors.destructiveSoftForeground,
    );
  });

  it("found the faint role without room on a chrome stripe", () => {
    // The hunk header's text is the runtime's `text_faint`, so the faint role
    // sits on the `muted` stripe it paints, not only on the page it sits on.
    // Measured before the fix: the dark base's placeholder on its own toolbar,
    // and every light style's on the platform toolbars and the two looks.
    expect(contrastRatio("#7C8595", darkTheme.colors.muted)).toBeCloseTo(
      4.03,
      2,
    );
    expect(
      contrastRatio(
        "#626C7B",
        platformTheme(lightTheme, "darwin").colors.muted,
      ),
    ).toBeCloseTo(4.4, 2);
    expect(
      contrastRatio("#5C6470", retroTheme(lightTheme, "luna").colors.muted),
    ).toBeCloseTo(4.35, 2);
    expect(
      contrastRatio("#5B6C7B", retroTheme(lightTheme, "aero").colors.muted),
    ).toBeCloseTo(4.37, 2);
  });

  it("reports a brand whose diff ink is its own pane", () => {
    const brand = extendTheme(lightTheme, {
      colors: { successSoftForeground: lightTheme.colors.background },
    });
    const reported = placements(brand)
      .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
      .map(({ claim }) => claim);

    expect(reported).toContain("added ink on input");
    expect(reported).toContain("added ink on its row wash over background");
  });

  it("reports faint text painted in the stripe it sits on", () => {
    const brand = extendTheme(lightTheme, {
      colors: { placeholder: lightTheme.colors.muted },
    });
    const reported = placements(brand)
      .filter(({ ratio, floor }) => ratio === undefined || ratio < floor)
      .map(({ claim }) => claim);

    expect(reported.filter((claim) => claim.includes("hunk stripe"))).toEqual(
      expect.arrayContaining([
        "faint text on the hunk stripe over input",
        "faint text on the hunk stripe over background",
      ]),
    );
  });

  it("executes the documented diff host", () => {
    const resolved = diffHostTheme(lightTheme);

    expect(resolved.host).toEqual(nativeTextTheme(lightTheme, "background"));
    expect(resolved.hunk.backgroundColor).toBe(lightTheme.colors.muted);
    expect(resolved.hunk.color).toBe(lightTheme.colors.placeholder);
    expect(resolved.filePath.color).toBe(lightTheme.colors.mutedForeground);
    expect(resolved.counts.added.color).toBe(
      lightTheme.colors.successSoftForeground,
    );
    expect(resolved.counts.removed.color).toBe(
      lightTheme.colors.destructiveSoftForeground,
    );
  });

  it("teaches the diff mapping and the placeholder the runtime fixes", () => {
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const seam = readFileSync(
      new URL("./native-text.ts", import.meta.url),
      "utf8",
    );

    // The page names the share the contract composites and the roles the host
    // takes, so a reader can build the same check for a brand.
    expect(catalogue).toContain("### The diff host");
    expect(catalogue).toContain("`nativeDiffWash` (0.055)");
    expect(catalogue).toContain("`diffHunkBg`");
    // The placeholder is fixed by the runtime, so the seam and the page must say
    // so instead of promising a role the host never reads.
    expect(seam).toContain("#8F8F8F");
    expect(catalogue).toContain("`#8F8F8F`");
    expect(catalogue).toContain("2.84:1");
    expect(catalogue).not.toContain(
      "host.textFaint; // placeholder host.caret",
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

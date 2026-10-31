/**
 * The Mac's appearance settings, decoded, and the theme edit they ask for.
 *
 * `@gpuix/native` 0.11.0 reports neither the accent colour, the Light/Dark
 * choice nor Reduce Transparency (`@gpuixui/runtime` → `systemAppearance`), so
 * `appearance.ts` reads them from `defaults` at the app boundary and this
 * module turns the three strings into a {@link SystemAppearance} and the
 * overrides a theme takes from it. Everything here is pure.
 */

import {
  contrastRatio,
  type Theme,
  type ThemeMode,
  type ThemeOverrides,
} from "@gpuixui/tokens";
import * as Option from "effect/Option";

/** What the Mac's appearance settings say. */
export interface SystemAppearance {
  readonly mode: ThemeMode;
  /** `AppleAccentColor`; none is the system blue (the key is unset). */
  readonly accent: Option.Option<number>;
  readonly reduceTransparency: boolean;
}

/** AppKit's accent colours by `AppleAccentColor` value, as `[light, dark]`. */
const accents: Readonly<Record<number, readonly [string, string]>> = {
  [-1]: ["#8C8C8C", "#989898"],
  0: ["#FF3B30", "#FF453A"],
  1: ["#FF9500", "#FF9F0A"],
  2: ["#FFCC00", "#FFD60A"],
  3: ["#28CD41", "#32D74B"],
  4: ["#AF52DE", "#BF5AF2"],
  6: ["#FF2D55", "#FF375F"],
};

/** The value `defaults` printed, trimmed; an unset key prints nothing. */
const valueOf = (stdout: string): Option.Option<string> => {
  const value = stdout.trim();
  return value === "" ? Option.none() : Option.some(value);
};

/**
 * The three `defaults` answers, decoded. `AppleInterfaceStyle` is unset in Light
 * mode, so an empty answer is light — not an error — and an accent that is not
 * an integer is read as unset.
 */
export const decodeAppearance = (answers: {
  readonly interfaceStyle: string;
  readonly accent: string;
  readonly reduceTransparency: string;
}): SystemAppearance => ({
  mode: Option.contains(valueOf(answers.interfaceStyle), "Dark")
    ? "dark"
    : "light",
  accent: Option.flatMap(valueOf(answers.accent), (value) =>
    /^-?\d+$/.test(value) ? Option.some(Number(value)) : Option.none(),
  ),
  reduceTransparency: Option.contains(valueOf(answers.reduceTransparency), "1"),
});

/**
 * The accent's colour in `mode`. Unset, or a value this table does not know,
 * is none: the theme keeps its own primary, which is the system blue on darwin.
 */
export const accentColor = (
  accent: Option.Option<number>,
  mode: ThemeMode,
): Option.Option<string> =>
  Option.flatMap(accent, (value) =>
    Option.map(Option.fromNullishOr(accents[value]), ([light, dark]) =>
      mode === "dark" ? dark : light,
    ),
  );

/** The ink that reads on `fill`: white or black, whichever contrasts more. */
const inkOn = (fill: string): string =>
  (contrastRatio("#FFFFFF", fill) ?? 0) >= (contrastRatio("#000000", fill) ?? 0)
    ? "#FFFFFF"
    : "#000000";

/**
 * The theme edit the appearance asks for: the accent repaints the primary,
 * the ring and the text selection, with the ink chosen by contrast; Reduce
 * Transparency paints every material as its opaque role.
 */
export const appearanceOverrides = (
  appearance: SystemAppearance,
  base: Theme,
): ThemeOverrides => ({
  reduceTransparency: appearance.reduceTransparency,
  ...Option.match(accentColor(appearance.accent, base.mode), {
    onNone: () => ({}),
    onSome: (accent) => ({
      colors: {
        primary: accent,
        primaryForeground: inkOn(accent),
        ring: accent,
        selection: `${accent}3D`,
      },
    }),
  }),
});

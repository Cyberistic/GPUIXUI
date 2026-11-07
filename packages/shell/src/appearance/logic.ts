import {
  contrastRatio,
  type Theme,
  type ThemeMode,
  type ThemeOverrides,
} from "@gpuixui/tokens";
import * as Option from "effect/Option";

export interface SystemAppearance {
  readonly mode: ThemeMode;

  readonly accent: Option.Option<number>;
  readonly reduceTransparency: boolean;
}

const accents: Readonly<Record<number, readonly [string, string]>> = {
  [-1]: ["#8C8C8C", "#989898"],
  0: ["#FF3B30", "#FF453A"],
  1: ["#FF9500", "#FF9F0A"],
  2: ["#FFCC00", "#FFD60A"],
  3: ["#28CD41", "#32D74B"],
  4: ["#AF52DE", "#BF5AF2"],
  6: ["#FF2D55", "#FF375F"],
};

const valueOf = (stdout: string): Option.Option<string> => {
  const value = stdout.trim();
  return value === "" ? Option.none() : Option.some(value);
};

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

export const accentColor = (
  accent: Option.Option<number>,
  mode: ThemeMode,
): Option.Option<string> =>
  Option.flatMap(accent, (value) =>
    Option.map(Option.fromNullishOr(accents[value]), ([light, dark]) =>
      mode === "dark" ? dark : light,
    ),
  );

const inkOn = (fill: string): string =>
  (contrastRatio("#FFFFFF", fill) ?? 0) >= (contrastRatio("#000000", fill) ?? 0)
    ? "#FFFFFF"
    : "#000000";

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

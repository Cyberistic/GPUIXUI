import { alpha, isPaintableColor, type ThemeColors } from "./color.js";
import type { SeriesColors } from "./series.js";
import type { ThemeOverrides } from "./theme.js";
import type { Radius } from "./scale.js";

export type ShadcnVars = Readonly<Record<string, string>>;

export interface ShadcnStyles {
  readonly light: ShadcnVars;

  readonly dark: ShadcnVars;
}

const ROLE_BY_VARIABLE = {
  background: "background",
  foreground: "foreground",
  card: "card",
  "card-foreground": "cardForeground",
  popover: "popover",
  "popover-foreground": "popoverForeground",
  primary: "primary",
  "primary-foreground": "primaryForeground",
  secondary: "secondary",
  "secondary-foreground": "secondaryForeground",
  muted: "muted",
  "muted-foreground": "mutedForeground",
  accent: "accent",
  "accent-foreground": "accentForeground",
  destructive: "destructive",
  "destructive-foreground": "destructiveForeground",
  border: "border",
  input: "input",
  ring: "ring",
} as const satisfies Readonly<Record<string, keyof ThemeColors>>;

const CHART_VARIABLES = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

const LIGHT_SELECTORS: ReadonlyArray<RegExp> = [/:root\b/g, /\bhtml\b/g];

const DARK_SELECTORS: ReadonlyArray<RegExp> = [/\.dark\b/g];

const DARK_MEDIA = "@media (prefers-color-scheme: dark)";

const insideDarkMedia = (css: string, at: number): boolean => {
  const start = css.lastIndexOf(DARK_MEDIA, at);
  if (start < 0) return false;
  const between = css.slice(start, at);
  const opens = (between.match(/\{/g) ?? []).length;
  const closes = (between.match(/\}/g) ?? []).length;
  return opens > closes;
};

const declarationsOf = (body: string): ShadcnVars => {
  const entries = body.split(";").flatMap((declaration) => {
    const colon = declaration.indexOf(":");
    if (colon < 1) return [];
    const name = declaration.slice(0, colon).trim();
    if (!name.startsWith("--")) return [];
    return [[name.slice(2), declaration.slice(colon + 1).trim()] as const];
  });
  return Object.fromEntries(entries);
};

const blocksOf = (
  css: string,
  selectors: ReadonlyArray<RegExp>,
): ReadonlyArray<{ readonly at: number; readonly body: string }> =>
  selectors.flatMap((selector) =>
    [
      ...css.matchAll(
        new RegExp(`${selector.source}\\s*(?:,[^{]*)?\\{([^{}]*)\\}`, "g"),
      ),
    ].map((match) => ({ at: match.index ?? 0, body: match[1] ?? "" })),
  );

export const roleVariables = (): Readonly<Record<string, keyof ThemeColors>> =>
  ROLE_BY_VARIABLE;

export const parseShadcnStyles = (css: string): ShadcnStyles => {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const merge = (target: ShadcnVars, vars: ShadcnVars): ShadcnVars =>
    Object.entries(vars).reduce<Record<string, string>>(
      (acc, [name, value]) =>
        name.startsWith("color-") ? acc : { ...acc, [name]: value },
      { ...target },
    );
  const dark = DARK_SELECTORS.flatMap((selector) =>
    blocksOf(source, [selector]),
  ).reduce<ShadcnVars>(
    (acc, block) => merge(acc, declarationsOf(block.body)),
    {},
  );
  const blocks = LIGHT_SELECTORS.flatMap((selector) =>
    blocksOf(source, [selector]),
  );
  const light = blocks
    .filter((block) => !insideDarkMedia(source, block.at))
    .reduce<ShadcnVars>(
      (acc, block) => merge(acc, declarationsOf(block.body)),
      {},
    );
  const darkFromMedia = blocks
    .filter((block) => insideDarkMedia(source, block.at))
    .reduce<ShadcnVars>(
      (acc, block) => merge(acc, declarationsOf(block.body)),
      dark,
    );
  return { light, dark: darkFromMedia };
};

export const shadcnColour = (value: string): string => {
  const colour = value.trim();
  if (colour === "") return colour;
  return /^[\d.]+(?:deg)?[\s,]+[\d.]+%?[\s,]+[\d.]+%?(?:\s*\/\s*[\d.]+%?)?$/.test(
    colour,
  )
    ? `hsl(${colour})`
    : colour;
};

const pixelsOf = (value: string): number | undefined => {
  const match = /^([\d.]+)(rem|px|em)?$/.exec(value.trim());
  if (match?.[1] === undefined) return undefined;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  return match[2] === "rem" || match[2] === "em" ? amount * 16 : amount;
};

export interface ShadcnOverrideOptions {
  readonly derive?: boolean;
}

export const shadcnOverrides = (
  vars: ShadcnVars,
  options: ShadcnOverrideOptions = {},
): ThemeOverrides => {
  const colours: Partial<ThemeColors> = {};
  const named = (name: string): string | undefined => {
    const value = vars[name];
    if (value === undefined) return undefined;
    const colour = shadcnColour(value);
    return isPaintableColor(colour) ? colour : undefined;
  };
  const mapped = Object.entries(ROLE_BY_VARIABLE).reduce<Partial<ThemeColors>>(
    (acc, [variable, role]) => {
      const colour = named(variable);
      return colour === undefined ? acc : { ...acc, [role]: colour };
    },
    colours,
  );

  const derivedOf = (
    table: Partial<ThemeColors>,
  ): ReadonlyArray<readonly [keyof ThemeColors, string | undefined]> => [
    ["inputForeground", table.foreground],
    ["placeholder", table.mutedForeground],
    ["borderStrong", table.border],
    ["hover", table.muted],
    ["active", table.accent],
    ["selected", table.accent],
    ["selectedForeground", table.accentForeground],
    ["disabled", table.muted],
    ["disabledForeground", table.mutedForeground],
    ["skeleton", table.muted],
    ["scrollbar", table.border],
    ["overlay", "#00000080"],
    ["shadow", "#00000033"],
  ];
  const filled =
    options.derive === false
      ? mapped
      : derivedOf(mapped).reduce<Partial<ThemeColors>>(
          (acc, [role, colour]) =>
            colour === undefined || acc[role] !== undefined
              ? acc
              : { ...acc, [role]: colour },
          mapped,
        );
  const selection =
    options.derive === false ||
    filled.primary === undefined ||
    filled.selection !== undefined
      ? filled
      : { ...filled, selection: alpha(filled.primary, 0.25) };

  const overrides: {
    colors?: Partial<ThemeColors>;
    radius?: Partial<Radius>;
    series?: SeriesColors;
  } = { colors: selection };

  const radius = vars.radius === undefined ? undefined : pixelsOf(vars.radius);
  if (radius !== undefined) overrides.radius = { md: radius };

  const [first, second, third, fourth, fifth] = CHART_VARIABLES.map(named);
  if (
    first !== undefined &&
    second !== undefined &&
    third !== undefined &&
    fourth !== undefined &&
    fifth !== undefined
  ) {
    overrides.series = [first, second, third, fourth, fifth];
  }

  return overrides;
};

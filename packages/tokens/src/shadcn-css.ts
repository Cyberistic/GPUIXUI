import type { ThemeColors } from "./color.js";
import { extendTheme, type Theme } from "./theme.js";

const ROLES = {
  "--background": "background",
  "--foreground": "foreground",
  "--card": "card",
  "--card-foreground": "cardForeground",
  "--popover": "popover",
  "--popover-foreground": "popoverForeground",
  "--primary": "primary",
  "--primary-foreground": "primaryForeground",
  "--secondary": "secondary",
  "--secondary-foreground": "secondaryForeground",
  "--muted": "muted",
  "--muted-foreground": "mutedForeground",
  "--accent": "accent",
  "--accent-foreground": "accentForeground",
  "--destructive": "destructive",
  "--border": "border",
  "--input": "input",
} as const satisfies Readonly<Record<string, keyof ThemeColors>>;

const hexOf = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();

const gamma = (linear: number): number =>
  linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.max(0, linear) ** (1 / 2.4) - 0.055;

const fromOklch = (l: number, c: number, h: number): string => {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return hexOf(
    gamma(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    gamma(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    gamma(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  );
};

const fromHsl = (h: number, s: number, l: number): string => {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return hexOf(f(0), f(8), f(4));
};

const numbers = (text: string): ReadonlyArray<number> =>
  (text.match(/-?\d*\.?\d+/g) ?? []).map(Number);

export const cssColorToHex = (value: string): string | undefined => {
  const text = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(text)) return text.toUpperCase();
  const [first = 0, second = 0, third = 0] = numbers(text);
  if (text.startsWith("oklch("))
    return fromOklch(text.includes("%") ? first / 100 : first, second, third);
  if (text.startsWith("hsl(") || /^-?[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(text))
    return fromHsl(first, second / 100, third / 100);
  return undefined;
};

export interface ShadcnThemeFile {
  readonly theme: Theme;
  /** The variables that were named but could not be read. */
  readonly problems: ReadonlyArray<string>;
}

/** The first `selector { … }` block's custom properties. */
const declarations = (
  css: string,
  selector: string,
): ReadonlyArray<readonly [string, string]> => {
  const start = css.indexOf(selector);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  if (start < 0 || open < 0 || close < 0) return [];
  return css
    .slice(open + 1, close)
    .split(";")
    .flatMap((line): ReadonlyArray<readonly [string, string]> => {
      const colon = line.indexOf(":");
      return colon < 0
        ? []
        : [[line.slice(0, colon).trim(), line.slice(colon + 1).trim()]];
    });
};

const isRole = (name: string): name is keyof typeof ROLES => name in ROLES;

export const shadcnBuilderTheme = (
  css: string,
  base: Theme,
  mode: "light" | "dark" = "light",
): ShadcnThemeFile => {
  const found = declarations(css, mode === "dark" ? ".dark" : ":root");
  const read = found.filter(([name]) => isRole(name));
  const colors = Object.fromEntries(
    read.flatMap(([name, value]) => {
      const hex = cssColorToHex(value);
      return isRole(name) && hex !== undefined ? [[ROLES[name], hex]] : [];
    }),
  ) as Partial<ThemeColors>;
  // tweakcn and shadcn's builders name the chart palette `--chart-1` onward.
  const series = found
    .filter(([name]) => /^--chart-\d+$/.test(name))
    .flatMap(([, value]) => cssColorToHex(value) ?? []);
  const radius = found.find(([name]) => name === "--radius")?.[1];
  const md = radius === undefined ? undefined : (numbers(radius)[0] ?? 0) * 16;
  return {
    theme: extendTheme(base, {
      colors,
      ...(series.length === 0 ? {} : { series }),
      ...(md === undefined
        ? {}
        : { radius: { sm: md - 4, md: md - 2, lg: md, xl: md + 4 } }),
    }),
    problems: read
      .filter(([, value]) => cssColorToHex(value) === undefined)
      .map(([name]) => name),
  };
};

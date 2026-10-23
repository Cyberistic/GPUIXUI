/**
 * The colour dialect the measurement contracts read.
 *
 * The renderer paints CSS Color 4 — `isPaintableColor` — and a contrast ratio, a
 * blend or an OKLab distance needs channels rather than a name. This module is
 * the one seam that turns a painted value into channels: hex in every length the
 * runtime accepts, the 148 CSS named colours plus `transparent`, and the
 * functional families whose channels resolve by arithmetic on sRGB
 * (`rgb`/`hsl`/`hwb`/`hsv` with an optional alpha). A brand written the way a
 * design tool exports it is measured rather than refused.
 *
 * The perceptual spaces (`lab`, `lch`, `oklab`, `oklch`) and a **relative**
 * colour (`rgb(from …)`) are reported unmeasurable rather than approximated:
 * they resolve through a colour-space conversion this package does not guess at,
 * and a ratio computed from an approximation is worse than an honest absence —
 * the gate then names the pair instead of passing a colour nobody verified.
 */

/** A colour as the contracts read it: six-digit channels and an optional share. */
export interface MeasuredColour {
  /** The channels, as `#RRGGBB` in upper case. */
  readonly rgb: string;
  /**
   * The alpha byte, when the value carries a share below full opacity. A byte of
   * `FF` is no share — `#FFFFFFff` is `#FFFFFF` — so it is not reported here.
   */
  readonly alpha?: string;
}

/**
 * The CSS named colours, as the channels the renderer paints, plus
 * `transparent` (which is `#00000000`). This is the set `isPaintableColor`
 * accepts by name, so the paint check and the measurement one cannot disagree
 * about a name.
 */
export const namedColours: Readonly<Record<string, string>> = {
  aliceblue: "F0F8FF",
  antiquewhite: "FAEBD7",
  aqua: "00FFFF",
  aquamarine: "7FFFD4",
  azure: "F0FFFF",
  beige: "F5F5DC",
  bisque: "FFE4C4",
  black: "000000",
  blanchedalmond: "FFEBCD",
  blue: "0000FF",
  blueviolet: "8A2BE2",
  brown: "A52A2A",
  burlywood: "DEB887",
  cadetblue: "5F9EA0",
  chartreuse: "7FFF00",
  chocolate: "D2691E",
  coral: "FF7F50",
  cornflowerblue: "6495ED",
  cornsilk: "FFF8DC",
  crimson: "DC143C",
  cyan: "00FFFF",
  darkblue: "00008B",
  darkcyan: "008B8B",
  darkgoldenrod: "B8860B",
  darkgray: "A9A9A9",
  darkgreen: "006400",
  darkgrey: "A9A9A9",
  darkkhaki: "BDB76B",
  darkmagenta: "8B008B",
  darkolivegreen: "556B2F",
  darkorange: "FF8C00",
  darkorchid: "9932CC",
  darkred: "8B0000",
  darksalmon: "E9967A",
  darkseagreen: "8FBC8F",
  darkslateblue: "483D8B",
  darkslategray: "2F4F4F",
  darkslategrey: "2F4F4F",
  darkturquoise: "00CED1",
  darkviolet: "9400D3",
  deeppink: "FF1493",
  deepskyblue: "00BFFF",
  dimgray: "696969",
  dimgrey: "696969",
  dodgerblue: "1E90FF",
  firebrick: "B22222",
  floralwhite: "FFFAF0",
  forestgreen: "228B22",
  fuchsia: "FF00FF",
  gainsboro: "DCDCDC",
  ghostwhite: "F8F8FF",
  gold: "FFD700",
  goldenrod: "DAA520",
  gray: "808080",
  green: "008000",
  greenyellow: "ADFF2F",
  grey: "808080",
  honeydew: "F0FFF0",
  hotpink: "FF69B4",
  indianred: "CD5C5C",
  indigo: "4B0082",
  ivory: "FFFFF0",
  khaki: "F0E68C",
  lavender: "E6E6FA",
  lavenderblush: "FFF0F5",
  lawngreen: "7CFC00",
  lemonchiffon: "FFFACD",
  lightblue: "ADD8E6",
  lightcoral: "F08080",
  lightcyan: "E0FFFF",
  lightgoldenrodyellow: "FAFAD2",
  lightgray: "D3D3D3",
  lightgreen: "90EE90",
  lightgrey: "D3D3D3",
  lightpink: "FFB6C1",
  lightsalmon: "FFA07A",
  lightseagreen: "20B2AA",
  lightskyblue: "87CEFA",
  lightslategray: "778899",
  lightslategrey: "778899",
  lightsteelblue: "B0C4DE",
  lightyellow: "FFFFE0",
  lime: "00FF00",
  limegreen: "32CD32",
  linen: "FAF0E6",
  magenta: "FF00FF",
  maroon: "800000",
  mediumaquamarine: "66CDAA",
  mediumblue: "0000CD",
  mediumorchid: "BA55D3",
  mediumpurple: "9370DB",
  mediumseagreen: "3CB371",
  mediumslateblue: "7B68EE",
  mediumspringgreen: "00FA9A",
  mediumturquoise: "48D1CC",
  mediumvioletred: "C71585",
  midnightblue: "191970",
  mintcream: "F5FFFA",
  mistyrose: "FFE4E1",
  moccasin: "FFE4B5",
  navajowhite: "FFDEAD",
  navy: "000080",
  oldlace: "FDF5E6",
  olive: "808000",
  olivedrab: "6B8E23",
  orange: "FFA500",
  orangered: "FF4500",
  orchid: "DA70D6",
  palegoldenrod: "EEE8AA",
  palegreen: "98FB98",
  paleturquoise: "AFEEEE",
  palevioletred: "DB7093",
  papayawhip: "FFEFD5",
  peachpuff: "FFDAB9",
  peru: "CD853F",
  pink: "FFC0CB",
  plum: "DDA0DD",
  powderblue: "B0E0E6",
  purple: "800080",
  rebeccapurple: "663399",
  red: "FF0000",
  rosybrown: "BC8F8F",
  royalblue: "4169E1",
  saddlebrown: "8B4513",
  salmon: "FA8072",
  sandybrown: "F4A460",
  seagreen: "2E8B57",
  seashell: "FFF5EE",
  sienna: "A0522D",
  silver: "C0C0C0",
  skyblue: "87CEEB",
  slateblue: "6A5ACD",
  slategray: "708090",
  slategrey: "708090",
  snow: "FFFAFA",
  springgreen: "00FF7F",
  steelblue: "4682B4",
  tan: "D2B48C",
  teal: "008080",
  thistle: "D8BFD8",
  tomato: "FF6347",
  turquoise: "40E0D0",
  violet: "EE82EE",
  wheat: "F5DEB3",
  white: "FFFFFF",
  whitesmoke: "F5F5F5",
  yellow: "FFFF00",
  yellowgreen: "9ACD32",
  transparent: "00000000",
};

/**
 * Whether `value` is a named colour the runtime paints, case-insensitively.
 *
 * @example
 * ```ts
 * isNamedColour("RebeccaPurple"); // true
 * isNamedColour("notacolour"); // false
 * ```
 */
export const isNamedColour = (value: string): boolean =>
  namedColours[value.trim().toLowerCase()] !== undefined;

/**
 * The functional colour families the runtime's parser reads. The eight this
 * module measures are the ones whose channels are sRGB arithmetic; the four
 * perceptual spaces are in this list because the renderer paints them while the
 * contracts report them unmeasurable.
 */
export const colourFunctions: ReadonlySet<string> = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "hwba",
  "hsv",
  "hsva",
  "lab",
  "lch",
  "oklab",
  "oklch",
]);

const hexDigits = /^#?([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const huePattern = /^([+-]?(?:\d+\.?\d*|\.\d+))(deg|grad|rad|turn)?$/;
const functionPattern = /^([a-z]+)\s*\(([\s\S]*)\)$/i;

/** A shorthand digit names a byte: `f` is `ff`. */
const widen = (digits: string): string =>
  digits.length > 4
    ? digits
    : digits
        .split("")
        .map((digit) => `${digit}${digit}`)
        .join("");

const fromHex = (value: string): MeasuredColour | undefined => {
  const digits = hexDigits.exec(value)?.[1];
  if (digits === undefined) {
    return undefined;
  }
  const channels = widen(digits).toUpperCase();
  const alpha = channels.length === 8 ? channels.slice(6) : undefined;
  return alpha === undefined || alpha === "FF"
    ? { rgb: `#${channels.slice(0, 6)}` }
    : { rgb: `#${channels.slice(0, 6)}`, alpha };
};

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/** An sRGB channel as the byte the batch serialises. */
const byte = (channel: number): string =>
  Math.round(clamp(channel, 0, 255))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

/** A numeric channel with its unit: `50%` is a share of the family's scale. */
interface Amount {
  readonly value: number;
  readonly percent: boolean;
}

const amount = (text: string): Amount | undefined => {
  const percent = text.endsWith("%");
  const numeric = percent ? text.slice(0, -1) : text;
  return decimal.test(numeric)
    ? { value: Number(numeric), percent }
    : undefined;
};

/** An angle in degrees: a bare number is degrees, and the units are CSS's. */
const degrees = (text: string): number | undefined => {
  const [, value = "", unit = "deg"] =
    huePattern.exec(text.toLowerCase()) ?? [];
  const scale: Readonly<Record<string, number>> = {
    deg: 1,
    grad: 0.9,
    rad: 180 / Math.PI,
    turn: 360,
  };
  return decimal.test(value) ? Number(value) * (scale[unit] ?? 1) : undefined;
};

const share = (text: string): number | undefined => amount(text)?.value;

/** An `rgb()` channel: a percentage of 255, or the number itself. */
const level = (text: string): number | undefined => {
  const channel = amount(text);
  if (channel === undefined) {
    return undefined;
  }
  return channel.percent ? (channel.value * 255) / 100 : channel.value;
};

/** The alpha token as the byte a theme carries, or `FF` when the value is opaque. */
const alphaByte = (text: string): string | undefined => {
  const channel = amount(text);
  if (channel === undefined) {
    return undefined;
  }
  return byte((channel.percent ? channel.value / 100 : channel.value) * 255);
};

/** The green channel of an `hsl()` colour, the classic hue interpolation. */
const hueChannel = (base: number, span: number, offset: number): number => {
  const wrapped = ((offset % 1) + 1) % 1;
  if (wrapped < 1 / 6) {
    return base + (span - base) * 6 * wrapped;
  }
  if (wrapped < 1 / 2) {
    return span;
  }
  return wrapped < 2 / 3 ? base + (span - base) * (2 / 3 - wrapped) * 6 : base;
};

/** A pure hue for `hwb()`: full saturation at the mid lightness. */
const pureHue = (hue: number): readonly [number, number, number] => {
  const base = 0;
  const span = 1;
  return [
    hueChannel(base, span, hue / 360 + 1 / 3) * 255,
    hueChannel(base, span, hue / 360) * 255,
    hueChannel(base, span, hue / 360 - 1 / 3) * 255,
  ];
};

/** HSV's chroma triangle: the six sectors of the hue circle. */
const sectorRgb = (
  hue: number,
  chroma: number,
): readonly [number, number, number] => {
  const position = (((hue % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((position % 2) - 1));
  const sectors: readonly (readonly [number, number, number])[] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ];
  return sectors[Math.floor(position) % 6] ?? [0, 0, 0];
};

const hslChannels = (
  hue: number,
  saturation: number,
  lightness: number,
): readonly [number, number, number] => {
  const sat = clamp(saturation, 0, 100) / 100;
  const light = clamp(lightness, 0, 100) / 100;
  if (sat === 0) {
    return [light * 255, light * 255, light * 255];
  }
  const span = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const base = 2 * light - span;
  return [
    hueChannel(base, span, hue / 360 + 1 / 3) * 255,
    hueChannel(base, span, hue / 360) * 255,
    hueChannel(base, span, hue / 360 - 1 / 3) * 255,
  ];
};

const hwbChannels = (
  hue: number,
  white: number,
  black: number,
): readonly [number, number, number] => {
  const pale = clamp(white, 0, 100) / 100;
  const dark = clamp(black, 0, 100) / 100;
  if (pale + dark >= 1) {
    const grey = (pale / (pale + dark)) * 255;
    return [grey, grey, grey];
  }
  const pure = pureHue(hue);
  const scale = (channel: number): number =>
    channel * (1 - pale - dark) + pale * 255;
  return [scale(pure[0]), scale(pure[1]), scale(pure[2])];
};

const hsvChannels = (
  hue: number,
  saturation: number,
  value: number,
): readonly [number, number, number] => {
  const sat = clamp(saturation, 0, 100) / 100;
  const bright = clamp(value, 0, 100) / 100;
  const chroma = bright * sat;
  const lift = bright - chroma;
  const [red, green, blue] = sectorRgb(hue, chroma);
  return [(red + lift) * 255, (green + lift) * 255, (blue + lift) * 255];
};

interface Channels {
  readonly values: readonly string[];
  readonly alpha?: string;
}

/**
 * The channel tokens of a functional colour, with the alpha token split off.
 * Commas and whitespace are the two CSS separators, and a `/` names the alpha
 * explicitly; four comma/space separators make the fourth value the alpha.
 */
const splitChannels = (args: string): Channels | undefined => {
  const parts = args.split("/");
  if (parts.length > 2) {
    return undefined;
  }
  const body = parts[0] ?? "";
  const explicit = parts[1]?.trim();
  if (parts.length === 2 && (explicit === undefined || explicit === "")) {
    return undefined;
  }
  const separated = body.includes(",");
  const values = (separated ? body.split(",") : body.trim().split(/\s+/)).map(
    (value) => value.trim(),
  );
  if (values.length === 4 && explicit === undefined) {
    return { values: values.slice(0, 3), alpha: values[3] };
  }
  return values.length === 3 ? { values, alpha: explicit } : undefined;
};

type Family = (
  channels: readonly string[],
  alpha: string | undefined,
) => MeasuredColour | undefined;

/** Build a measured colour from three channels and an optional alpha token. */
const measured = (
  channels: readonly [number, number, number],
  alpha: string | undefined,
): MeasuredColour => ({
  rgb: `#${channels.map(byte).join("")}`,
  ...(alpha === undefined || alpha === "FF" ? {} : { alpha }),
});

const channelRgb: Family = (values, alpha) => {
  const channels = values.map(level);
  const [red, green, blue] = channels;
  return red === undefined || green === undefined || blue === undefined
    ? undefined
    : measured([red, green, blue], alpha);
};

const hueFamily =
  (
    channels: (
      hue: number,
      first: number,
      second: number,
    ) => readonly [number, number, number],
  ): Family =>
  (values, alpha) => {
    const [hueText, firstText, secondText] = values;
    if (
      hueText === undefined ||
      firstText === undefined ||
      secondText === undefined
    ) {
      return undefined;
    }
    const hue = degrees(hueText);
    const first = share(firstText);
    const second = share(secondText);
    return hue === undefined || first === undefined || second === undefined
      ? undefined
      : measured(channels(hue, first, second), alpha);
  };

const families: Readonly<Record<string, Family>> = {
  rgb: channelRgb,
  rgba: channelRgb,
  hsl: hueFamily(hslChannels),
  hsla: hueFamily(hslChannels),
  hwb: hueFamily(hwbChannels),
  hwba: hueFamily(hwbChannels),
  hsv: hueFamily(hsvChannels),
  hsva: hueFamily(hsvChannels),
};

const fromFunction = (
  name: string,
  args: string,
): MeasuredColour | undefined => {
  const family = families[name];
  const channels = splitChannels(args);
  if (family === undefined || channels === undefined) {
    return undefined;
  }
  const alpha =
    channels.alpha === undefined ? undefined : alphaByte(channels.alpha);
  return alpha === undefined && channels.alpha !== undefined
    ? undefined
    : family(channels.values, alpha);
};

/**
 * A colour's channels and share, or `undefined` when the contracts cannot
 * resolve it.
 *
 * The value is `unknown` because a theme can come back from a store: JSON has
 * no `undefined`, so a role that was absent when the theme was written returns
 * `null`, and a hand-authored export can hand back a number or an inherited
 * member where a colour should be. A value that is not a string is
 * **unmeasurable**, the same answer this seam gives a perceptual space and the
 * one `isPaintableColor` gives a value the renderer cannot paint — a report,
 * never a `TypeError` from the contract that was asked to check it.
 *
 * @example
 * ```ts
 * measuredColour("#fff"); // { rgb: "#FFFFFF" }
 * measuredColour("ffffff80"); // { rgb: "#FFFFFF", alpha: "80" }
 * measuredColour("rebeccapurple"); // { rgb: "#663399" }
 * measuredColour("hsl(120 100% 50%)"); // { rgb: "#00FF00" }
 * measuredColour("oklch(0.62 0.26 29.2)"); // undefined — a perceptual space
 * measuredColour(null); // undefined — a value a store wrote for an absent one
 * ```
 */
export const measuredColour = (value: unknown): MeasuredColour | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const colour = value.trim();
  const hex = fromHex(colour);
  if (hex !== undefined) {
    return hex;
  }
  const name = colour.toLowerCase();
  const named = namedColours[name];
  if (named !== undefined) {
    return fromHex(named);
  }
  const match = functionPattern.exec(colour);
  const [, family = "", args = ""] = match ?? [];
  return fromFunction(family.toLowerCase(), args);
};

/**
 * The channels of an opaque colour, or `undefined` for a translucent one — whose
 * contrast depends on the surface behind it, so a single ratio would be a guess.
 * A fully opaque alpha byte is opaque, and a value no colour grammar reads —
 * including a stored `null` — is unmeasurable rather than a throw, the rule
 * {@link measuredColour} states.
 *
 * @example
 * ```ts
 * opaqueRgb("#fff"); // "#FFFFFF"
 * opaqueRgb("rgb(255 0 0)"); // "#FF0000"
 * opaqueRgb("#ffffff80"); // undefined
 * opaqueRgb(null); // undefined
 * ```
 */
export const opaqueRgb = (value: unknown): string | undefined => {
  const measured = measuredColour(value);
  return measured !== undefined && measured.alpha === undefined
    ? measured.rgb
    : undefined;
};

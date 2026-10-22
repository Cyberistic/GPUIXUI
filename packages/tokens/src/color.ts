import { measuredHex } from "./hex.js";

/**
 * Raw colour ramps. Components must use {@link ThemeColors} roles instead;
 * ramps exist for documentation and for the rare case that needs a shade
 * outside the semantic set.
 */
export const palette = {
  neutral: {
    0: "#FFFFFF",
    25: "#FBFCFD",
    50: "#F6F8FA",
    100: "#EEF1F5",
    200: "#E1E5EC",
    300: "#CBD1DB",
    400: "#A1A9B7",
    500: "#737C8C",
    600: "#545D6C",
    700: "#3D4552",
    800: "#2A303B",
    850: "#222730",
    900: "#191D25",
    950: "#11141A",
    1000: "#0B0D11",
  },
  blue: {
    50: "#EFF4FF",
    100: "#DEE9FF",
    200: "#C5D8FF",
    300: "#9FBEFF",
    400: "#6E9CFF",
    500: "#3B76F6",
    600: "#2559D6",
    700: "#1B45AC",
    800: "#173A88",
    900: "#152F6B",
    950: "#0C1D42",
  },
  iris: {
    50: "#EEF0FF",
    100: "#E0E3FF",
    200: "#C7CBFF",
    300: "#A7A9FF",
    400: "#8B85FB",
    500: "#7567F2",
    600: "#5F4BDB",
    700: "#4C39B5",
    800: "#3B2C8F",
    900: "#2E2370",
    950: "#1C1547",
  },
  red: {
    50: "#FFF1F1",
    100: "#FFE0E0",
    200: "#FFC6C6",
    300: "#FF9E9E",
    400: "#FF6B6B",
    500: "#E5484D",
    600: "#CC3439",
    700: "#A5262B",
    800: "#7E1D21",
    900: "#5C1619",
    950: "#3A0B0D",
  },
  green: {
    50: "#ECFDF3",
    100: "#D3F9E2",
    200: "#A8F0C6",
    300: "#6FE0A3",
    400: "#3BC97F",
    500: "#1FA968",
    600: "#158754",
    700: "#116A43",
    800: "#0E5135",
    900: "#0A3A26",
    950: "#042015",
  },
  amber: {
    50: "#FFF8E8",
    100: "#FFEFC6",
    200: "#FFDE8A",
    300: "#FFC94D",
    400: "#F5B01F",
    500: "#D99400",
    600: "#B57600",
    700: "#8E5B00",
    800: "#6B4500",
    900: "#4B3100",
    950: "#2A1B00",
  },
} as const;

/**
 * Semantic colour roles. A role names intent, never a shade, so a theme can
 * change every value without component source changing.
 */
export interface ThemeColors {
  /** Window and application canvas. */
  readonly background: string;
  /** Default text on `background`. */
  readonly foreground: string;
  /** Raised content surface. */
  readonly card: string;
  /** Text on `card`. */
  readonly cardForeground: string;
  /** Floating surface for menus, popovers and dialogs. */
  readonly popover: string;
  /** Text on `popover`. */
  readonly popoverForeground: string;
  /** Primary action background. */
  readonly primary: string;
  /** Text and icons on `primary`. */
  readonly primaryForeground: string;
  /** Secondary action background. */
  readonly secondary: string;
  /** Text and icons on `secondary`. */
  readonly secondaryForeground: string;
  /** Quiet surface for disabled areas and subtle grouping. */
  readonly muted: string;
  /** Secondary text on `muted` and on `background`. */
  readonly mutedForeground: string;
  /** Tinted surface for hover and selection emphasis. */
  readonly accent: string;
  /** Text and icons on `accent`. */
  readonly accentForeground: string;
  /** Destructive action background. */
  readonly destructive: string;
  /** Text and icons on `destructive`. */
  readonly destructiveForeground: string;
  /** Success background and indicator. */
  readonly success: string;
  /** Text and icons on `success`. */
  readonly successForeground: string;
  /** Warning background and indicator. */
  readonly warning: string;
  /** Text and icons on `warning`. */
  readonly warningForeground: string;
  /** Informational status, distinct from `primary`. */
  readonly info: string;
  /** Text and icons on `info`. */
  readonly infoForeground: string;
  /** Soft informational surface for alerts, badges and toasts. */
  readonly infoSoft: string;
  /** Text and icons on `infoSoft`. */
  readonly infoSoftForeground: string;
  /** Soft success surface. */
  readonly successSoft: string;
  /** Text and icons on `successSoft`. */
  readonly successSoftForeground: string;
  /** Soft warning surface. */
  readonly warningSoft: string;
  /** Text and icons on `warningSoft`. */
  readonly warningSoftForeground: string;
  /** Soft destructive surface. */
  readonly destructiveSoft: string;
  /** Text and icons on `destructiveSoft`. */
  readonly destructiveSoftForeground: string;
  /** Dividers and decorative borders. */
  readonly border: string;
  /** Essential control boundaries, held to a non-text contrast floor. */
  readonly borderStrong: string;
  /** Input field background. */
  readonly input: string;
  /** Text typed into an input. */
  readonly inputForeground: string;
  /** Placeholder text inside an input. */
  readonly placeholder: string;
  /** Focus ring. */
  readonly ring: string;
  /** Text selection wash. Translucent, so text stays legible. */
  readonly selection: string;
  /** Modal scrim. */
  readonly overlay: string;
  /** Hover wash for ghost and subtle surfaces. */
  readonly hover: string;
  /** Pressed wash for ghost and subtle surfaces. */
  readonly active: string;
  /** Selected row or item background. */
  readonly selected: string;
  /** Text and icons on `selected`. */
  readonly selectedForeground: string;
  /** Disabled surface. */
  readonly disabled: string;
  /** Disabled text and icons. */
  readonly disabledForeground: string;
  /** Loading placeholder. */
  readonly skeleton: string;
  /** Scrollbar thumb. */
  readonly scrollbar: string;
  /** Elevation tint. */
  readonly shadow: string;
}

/** Light theme semantic roles. */
export const lightColors = {
  background: palette.neutral[50],
  foreground: palette.neutral[900],
  card: palette.neutral[0],
  cardForeground: palette.neutral[900],
  popover: palette.neutral[0],
  popoverForeground: palette.neutral[900],
  primary: palette.iris[600],
  primaryForeground: palette.neutral[0],
  secondary: palette.neutral[200],
  secondaryForeground: palette.neutral[800],
  muted: palette.neutral[100],
  // A step darker than the grey ramp's 600: secondary text also sits under the
  // text-selection wash, which costs it contrast on every surface it covers.
  mutedForeground: "#4B5362",
  accent: palette.iris[100],
  accentForeground: palette.iris[800],
  destructive: palette.red[600],
  destructiveForeground: palette.neutral[0],
  success: palette.green[600],
  successForeground: palette.neutral[0],
  warning: palette.amber[400],
  warningForeground: palette.amber[950],
  info: palette.blue[600],
  infoForeground: palette.neutral[0],
  // A soft status surface is measured against the strips a message sits on
  // (`decorative.ts`), and a step-100 tint equalled the light `muted` toolbar
  // it was painted in. One ramp step deeper keeps the surface visible on the
  // page, a card and a toolbar, and the 900 step keeps the label readable on
  // the deeper fill.
  infoSoft: palette.blue[200],
  infoSoftForeground: palette.blue[900],
  successSoft: palette.green[200],
  successSoftForeground: palette.green[900],
  warningSoft: palette.amber[200],
  warningSoftForeground: palette.amber[900],
  destructiveSoft: palette.red[200],
  destructiveSoftForeground: palette.red[900],
  border: palette.neutral[200],
  borderStrong: "#727D8C",
  input: palette.neutral[0],
  inputForeground: palette.neutral[900],
  placeholder: "#66707F",
  ring: palette.iris[500],
  selection: "#7567F23D",
  overlay: "#00000073",
  hover: "#E4E9F0",
  active: "#D6DBE4",
  selected: palette.iris[100],
  selectedForeground: palette.iris[800],
  disabled: palette.neutral[100],
  disabledForeground: palette.neutral[400],
  skeleton: palette.neutral[200],
  scrollbar: palette.neutral[300],
  shadow: "#191D2526",
} satisfies ThemeColors;

/** Dark theme semantic roles. Designed, not an inversion of the light theme. */
export const darkColors = {
  background: palette.neutral[950],
  foreground: palette.neutral[100],
  card: palette.neutral[900],
  cardForeground: palette.neutral[100],
  popover: palette.neutral[850],
  popoverForeground: palette.neutral[50],
  primary: palette.iris[300],
  primaryForeground: palette.neutral[950],
  secondary: palette.neutral[800],
  secondaryForeground: palette.neutral[200],
  muted: palette.neutral[850],
  // A step lighter than the grey ramp's 400: secondary text also sits under the
  // text-selection wash, which costs it contrast on every surface it covers.
  mutedForeground: "#C1C7D1",
  accent: palette.iris[900],
  accentForeground: palette.iris[200],
  destructive: palette.red[400],
  destructiveForeground: palette.red[950],
  success: palette.green[400],
  successForeground: palette.green[950],
  warning: palette.amber[300],
  warningForeground: palette.amber[950],
  info: palette.blue[300],
  infoForeground: palette.neutral[950],
  // The dark counterparts are one step lighter than the 900 step for the same
  // reason: a 900 tint sat within 5% of the lighter popovers the platform and
  // authored styles paint, so an alert inside one had no surface of its own.
  infoSoft: palette.blue[800],
  infoSoftForeground: palette.blue[100],
  successSoft: palette.green[800],
  successSoftForeground: palette.green[100],
  warningSoft: palette.amber[800],
  warningSoftForeground: palette.amber[100],
  destructiveSoft: palette.red[800],
  destructiveSoftForeground: palette.red[100],
  border: palette.neutral[800],
  borderStrong: "#788494",
  input: palette.neutral[900],
  inputForeground: palette.neutral[100],
  placeholder: "#7C8595",
  ring: palette.iris[300],
  selection: "#A7A9FF3D",
  overlay: "#000000A6",
  hover: "#272D37",
  active: "#333A46",
  selected: palette.iris[900],
  selectedForeground: palette.iris[200],
  disabled: palette.neutral[850],
  disabledForeground: palette.neutral[600],
  skeleton: palette.neutral[800],
  scrollbar: palette.neutral[700],
  shadow: "#00000080",
} satisfies ThemeColors;

/**
 * High-contrast light roles. The same 47 roles as {@link lightColors}, with
 * values chosen for AAA body text (7:1) and 4.5:1 essential boundaries.
 */
export const highContrastLightColors = {
  background: "#FFFFFF",
  foreground: "#000000",
  card: "#FFFFFF",
  cardForeground: "#000000",
  popover: "#FFFFFF",
  popoverForeground: "#000000",
  primary: "#3B2C8F",
  primaryForeground: "#FFFFFF",
  secondary: "#E8E8E8",
  secondaryForeground: "#000000",
  muted: "#F2F2F2",
  mutedForeground: "#1F1F1F",
  accent: "#E0E3FF",
  accentForeground: "#2E2370",
  destructive: "#7E1D21",
  destructiveForeground: "#FFFFFF",
  success: "#0E5135",
  successForeground: "#FFFFFF",
  warning: "#F5B01F",
  warningForeground: "#000000",
  info: palette.blue[700],
  infoForeground: "#FFFFFF",
  // One step deeper than the default light theme's soft surfaces: the tints
  // carry the same 950 text, and a high-contrast variant states its strength in
  // every role it paints rather than inheriting the ordinary palette's.
  infoSoft: palette.blue[300],
  infoSoftForeground: palette.blue[950],
  successSoft: palette.green[300],
  successSoftForeground: palette.green[950],
  warningSoft: palette.amber[300],
  warningSoftForeground: palette.amber[950],
  destructiveSoft: palette.red[300],
  destructiveSoftForeground: palette.red[950],
  border: "#6E7683",
  borderStrong: "#4A4F58",
  input: "#FFFFFF",
  inputForeground: "#000000",
  placeholder: "#4A4F58",
  ring: "#4C39B5",
  selection: "#7567F24D",
  overlay: "#000000A6",
  hover: "#E8E8E8",
  active: "#D6D6D6",
  selected: "#E0E3FF",
  selectedForeground: "#2E2370",
  disabled: "#E8E8E8",
  disabledForeground: "#5A5A5A",
  skeleton: "#D6D6D6",
  scrollbar: "#9A9A9A",
  shadow: "#00000040",
} satisfies ThemeColors;

/**
 * High-contrast dark roles. The same 47 roles as {@link darkColors}, with the
 * floors of {@link highContrastLightColors}.
 */
export const highContrastDarkColors = {
  background: "#000000",
  foreground: "#FFFFFF",
  card: "#0D0D0D",
  cardForeground: "#FFFFFF",
  popover: "#141414",
  popoverForeground: "#FFFFFF",
  primary: "#C7CBFF",
  primaryForeground: "#000000",
  secondary: "#2E2E2E",
  secondaryForeground: "#FFFFFF",
  muted: "#1A1A1A",
  mutedForeground: "#E0E0E0",
  accent: "#231B59",
  accentForeground: "#E0E3FF",
  destructive: "#FF9E9E",
  destructiveForeground: "#000000",
  success: "#6FE0A3",
  successForeground: "#000000",
  warning: "#FFC94D",
  warningForeground: "#000000",
  info: palette.blue[200],
  infoForeground: "#000000",
  infoSoft: palette.blue[900],
  infoSoftForeground: palette.blue[100],
  successSoft: palette.green[900],
  successSoftForeground: palette.green[100],
  warningSoft: palette.amber[900],
  warningSoftForeground: palette.amber[100],
  destructiveSoft: palette.red[900],
  destructiveSoftForeground: palette.red[100],
  border: "#7A7A7A",
  borderStrong: "#A7A7A7",
  input: "#0D0D0D",
  inputForeground: "#FFFFFF",
  placeholder: "#B0B0B0",
  ring: "#C7CBFF",
  selection: "#C7CBFF42",
  overlay: "#000000CC",
  hover: "#2E2E2E",
  active: "#3D3D3D",
  selected: "#231B59",
  selectedForeground: "#E0E3FF",
  disabled: "#2E2E2E",
  disabledForeground: "#8A8A8A",
  skeleton: "#3D3D3D",
  scrollbar: "#8A8A8A",
  shadow: "#000000B3",
} satisfies ThemeColors;

/**
 * Every hex form the runtime's parser reads: 3, 4, 6 or 8 digits, with or
 * without the `#`. A bare form is legal to that parser — it reads `ff0` as a
 * colour — so the paint check accepts it rather than reporting a value the
 * renderer would paint.
 */
const paintedHex =
  /^#?(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/**
 * The CSS named colours the runtime's parser knows, plus `transparent`. A theme
 * value may be a name, so the paint check has to know them: reading a name as an
 * unpaintable colour would fail a theme the renderer paints.
 */
const namedColours = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black " +
    "blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse " +
    "chocolate coral cornflowerblue cornsilk crimson cyan darkblue " +
    "darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
    "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon " +
    "darkseagreen darkslateblue darkslategray darkslategrey " +
    "darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey " +
    "dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro " +
    "ghostwhite gold goldenrod gray green greenyellow grey honeydew " +
    "hotpink indianred indigo ivory khaki lavender lavenderblush " +
    "lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink " +
    "lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid " +
    "mediumpurple mediumseagreen mediumslateblue mediumspringgreen " +
    "mediumturquoise mediumvioletred midnightblue mintcream mistyrose " +
    "moccasin navajowhite navy oldlace olive olivedrab orange orangered " +
    "orchid palegoldenrod palegreen paleturquoise palevioletred " +
    "papayawhip peachpuff peru pink plum powderblue purple rebeccapurple " +
    "red rosybrown royalblue saddlebrown salmon sandybrown seagreen " +
    "seashell sienna silver skyblue slateblue slategray slategrey snow " +
    "springgreen steelblue tan teal thistle tomato turquoise violet " +
    "wheat white whitesmoke yellow yellowgreen transparent"
  ).split(" "),
);

/** The functional colour families the runtime's parser reads. */
const colourFunctions = new Set([
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

/**
 * Whether a functional colour's argument list has the shape the parser reads:
 * three channels and an optional fourth value after `/`, or a leading `from`
 * relative colour, whose arguments the parser resolves. Parentheses are tracked
 * because a channel may be a `calc(...)` expression with spaces of its own; a
 * channel count is the one typo this can catch that a colour family alone cannot
 * — `rgb(255, 0)` is two channels and paints nothing.
 */
/** The state a functional colour's argument scan carries between characters. */
interface ChannelScan {
  readonly channels: readonly string[];
  readonly channel: string;
  readonly depth: number;
  readonly slash: boolean;
  readonly broken: boolean;
}

const isChannelList = (args: string): boolean => {
  const initial: ChannelScan = {
    channels: [],
    channel: "",
    depth: 0,
    slash: false,
    broken: false,
  };
  const scan = args.split("").reduce((state: ChannelScan, character) => {
    const top = state.depth === 0;
    if (state.broken) {
      return state;
    }
    if (character === "(") {
      return {
        ...state,
        depth: state.depth + 1,
        channel: state.channel + character,
      };
    }
    if (character === ")") {
      return top
        ? { ...state, broken: true }
        : {
            ...state,
            depth: state.depth - 1,
            channel: state.channel + character,
          };
    }
    if (top && character === "/") {
      return { ...state, slash: true };
    }
    if (top && (character === "," || /\s/.test(character))) {
      return {
        ...state,
        channels:
          state.channel === ""
            ? state.channels
            : [...state.channels, state.channel],
        channel: "",
      };
    }
    return { ...state, channel: state.channel + character };
  }, initial);
  if (scan.broken || scan.depth !== 0) {
    return false;
  }
  const channels =
    scan.channel === "" ? scan.channels : [...scan.channels, scan.channel];
  // A relative colour names its source first: `rgb(from #bad455 b r g)`.
  if (channels[0]?.toLowerCase() === "from") {
    return true;
  }
  return scan.slash
    ? channels.length === 4
    : channels.length === 3 || channels.length === 4;
};

/**
 * Whether `value` is a colour string GPUix can paint.
 *
 * The runtime parses colours with `csscolorparser` 0.8.3 (the pinned
 * `@gpuix/native@0.11.0` release, `packages/native/src/color.rs`), so the paint
 * grammar is CSS Color 4: a hex value in any of four lengths, a CSS named
 * colour, `transparent`, or an `rgb`/`hsl`/`hwb`/`hsv`/`lab`/`lch`/`oklab`/
 * `oklch` function, absolute or relative. A value outside that grammar is
 * ignored by the renderer — the property keeps its previous value or paints
 * black — which is what {@link invalidColorRoles} and
 * {@link invalidShadowColors} report.
 *
 * The argument is `unknown` because this is the check a consumer runs on a
 * value restored from storage: anything that is not a string — a missing key
 * decoded from an older theme, a number, `null` — is not a colour the renderer
 * can paint, and is reported rather than thrown on.
 *
 * This is the **paint** grammar, not the **measurement** one: the shipped
 * palettes are `#RRGGBB`/`#RRGGBBAA` because every contrast and decorative
 * contract reads that form, and a role written as `hsl(...)` paints while
 * {@link contrastRatio} reports it unmeasurable rather than guessing.
 *
 * @example
 * ```ts
 * isPaintableColor("#2559D6"); // true
 * isPaintableColor("#2559D"); // false
 * isPaintableColor("oklch(0.62 0.26 29.2)"); // true
 * isPaintableColor(undefined); // false — a role the theme does not carry
 * ```
 */
export const isPaintableColor = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  const colour = value.trim();
  if (paintedHex.test(colour) || namedColours.has(colour.toLowerCase())) {
    return true;
  }
  const open = colour.indexOf("(");
  if (open < 1 || !colour.endsWith(")")) {
    return false;
  }
  // The parser trims the end of a function name before matching it.
  return (
    colourFunctions.has(colour.slice(0, open).trimEnd().toLowerCase()) &&
    isChannelList(colour.slice(open + 1, -1))
  );
};

/**
 * Return `color` with an alpha channel, as an 8-digit hex colour.
 *
 * `amount` is clamped to `0…1` and rounded to the nearest byte. A 6-digit
 * `#RRGGBB` gains an alpha byte; an 8-digit `#RRGGBBAA` has its alpha replaced,
 * and shorthand `#fff`/`#fff8` is widened first. A colour outside the measured
 * hex dialect is returned unchanged, so a value the renderer paints stays as it
 * was rather than becoming transparent — and so is a non-finite `amount`, which
 * has no alpha byte to produce and would otherwise emit a string the renderer
 * cannot parse.
 *
 * @example
 * ```ts
 * alpha("#2559D6", 0.3); // "#2559D64D"
 * alpha("#fff", 0.5); // "#FFFFFF80" — shorthand widens first
 * ```
 */
export function alpha(color: string, amount: number): string {
  const measured = measuredHex(color);
  if (measured === undefined || !Number.isFinite(amount)) {
    return color;
  }
  const byte = Math.round(Math.min(Math.max(amount, 0), 1) * 255);
  const hex = byte.toString(16).padStart(2, "0");
  return `${measured.rgb}${hex}`.toUpperCase();
}

/**
 * The alpha share of `color`, from `0` to `1`.
 *
 * The inverse of {@link alpha}: it reads the byte a translucent colour carries
 * so a rule can restate that colour at the same strength in another tint. An
 * opaque colour reads as `1` in every length the renderer paints — the six- and
 * three-digit forms, and an eight-digit one whose byte is `FF` — and so does a
 * value outside the measured hex dialect: the CSS colour families carry their
 * alpha in a form this reads as opaque, which is one reason the contracts
 * measure the hex dialect.
 *
 * @example
 * ```ts
 * alphaOf("#191D2514"); // 0.078
 * alphaOf("#191D25"); // 1
 * alphaOf("#fff8"); // 0.533 — shorthand's own share
 * ```
 */
export function alphaOf(color: string): number {
  const alphaByte = measuredHex(color)?.alpha;
  return alphaByte === undefined ? 1 : Number.parseInt(alphaByte, 16) / 255;
}

/**
 * Blend `amount` of `toward` into `color`, channel by channel.
 *
 * `amount` is clamped to `0…1`. The result keeps `color`'s alpha byte when it
 * carries a share below full opacity and is opaque when it does not — an `FF`
 * byte is no share — so a blend of two opaque colours is an opaque colour in the
 * measurable dialect: the point of the rule is that a fill that changes with the
 * pointer does not let the surface behind it through. Shorthand hex is widened
 * first, on either side. A colour outside the measured hex dialect — or a
 * non-finite `amount`, as in {@link alpha} — is returned unchanged.
 *
 * @example
 * ```ts
 * blend("#5F4BDB", "#191D25", 0.12); // "#5745C5"
 * blend("#fff", "#000", 0.5); // "#808080"
 * ```
 */
export function blend(color: string, toward: string, amount: number): string {
  const base = measuredHex(color);
  const target = measuredHex(toward);
  if (base === undefined || target === undefined || !Number.isFinite(amount)) {
    return color;
  }
  const from = base.rgb.slice(1);
  const to = target.rgb.slice(1);
  const ratio = Math.min(Math.max(amount, 0), 1);
  const channel = (at: number): string => {
    const start = Number.parseInt(from.slice(at, at + 2), 16);
    const end = Number.parseInt(to.slice(at, at + 2), 16);
    return Math.round(start + (end - start) * ratio)
      .toString(16)
      .padStart(2, "0");
  };
  const rgb = [0, 2, 4].map(channel).join("");
  return `#${rgb}${base.alpha ?? ""}`.toUpperCase();
}

/**
 * Every semantic colour role, in the order the token documentation lists them.
 * A documentation site iterates this to build colour tables against any theme
 * without an unsafe cast.
 *
 * @example
 * ```ts
 * import { colorRoles, themes } from "@gpuixui/tokens";
 *
 * const rows = colorRoles.map((role) => ({
 *   role,
 *   light: themes.light.colors[role],
 *   dark: themes.dark.colors[role],
 * }));
 * ```
 */
export const colorRoles = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "info",
  "infoForeground",
  "infoSoft",
  "infoSoftForeground",
  "successSoft",
  "successSoftForeground",
  "warningSoft",
  "warningSoftForeground",
  "destructiveSoft",
  "destructiveSoftForeground",
  "border",
  "borderStrong",
  "input",
  "inputForeground",
  "placeholder",
  "ring",
  "selection",
  "overlay",
  "hover",
  "active",
  "selected",
  "selectedForeground",
  "disabled",
  "disabledForeground",
  "skeleton",
  "scrollbar",
  "shadow",
] as const satisfies readonly (keyof ThemeColors)[];

/** A semantic role whose value is not a colour GPUix can paint. */
export interface InvalidColorRole {
  /** The role, in documentation order. */
  readonly role: keyof ThemeColors;
  /**
   * The value the theme carries, or `undefined` when the role is absent — a
   * theme restored from storage can predate a role the library added.
   */
  readonly value: string | undefined;
}

/**
 * Every semantic role whose value is not a colour GPUix can paint.
 *
 * The runtime ignores a colour string it cannot parse: the property keeps its
 * previous value or paints black, so a typo in a brand theme fails silently.
 * This is the check that makes it visible, over the grammar the runtime's own
 * parser reads ({@link isPaintableColor}) — any hex length, a CSS named colour
 * or a colour function. The shipped palettes are written in the long hex form
 * the docs' tables print, and the contracts measure every hex length; a named
 * colour or a colour function paints but is reported unmeasurable by them.
 *
 * **A role the theme does not carry is reported with `value: undefined`**, not
 * thrown on: a theme restored from storage can predate a role the library has
 * added since, and the runtime cannot paint what is not there. The source is
 * therefore `Partial<ThemeColors>`, so a complete theme and a decoded one are
 * both accepted, and the contracts that measure a pair treat the absence as an
 * unmeasurable pair rather than a crash.
 *
 * @example
 * ```ts
 * import { invalidColorRoles, lightColors } from "@gpuixui/tokens";
 *
 * invalidColorRoles({ colors: { ...lightColors, primary: "#7C5CF" } });
 * // [{ role: "primary", value: "#7C5CF" }]
 *
 * const { primary: _omitted, ...restored } = lightColors;
 * invalidColorRoles({ colors: restored });
 * // [{ role: "primary", value: undefined }] — a stored theme older than the role
 * ```
 */
export function invalidColorRoles(theme: {
  readonly colors: Partial<ThemeColors>;
}): readonly InvalidColorRole[] {
  return colorRoles.flatMap((role) => {
    const value = theme.colors[role];
    return isPaintableColor(value) ? [] : [{ role, value }];
  });
}

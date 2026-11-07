import { blend, themeColors, type ColourSource } from "./color.js";
import { opaqueRgb } from "./measure.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { radius, spacing, type Radius, type Spacing } from "./scale.js";
import { statusTone, textStyle, type TypeSource } from "./styles.js";
import {
  syntaxColors,
  type StoredSyntax,
  type SyntaxColors,
} from "./syntax.js";
import { themeModeOf, type ThemeMode } from "./mode.js";
import { typography } from "./typography.js";

export interface NativeTextSource extends TypeSource, ColourSource {
  readonly radius?: Readonly<Partial<Radius>> | null;
  readonly spacing?: Readonly<Partial<Spacing>> | null;
  readonly mode?: unknown;
  readonly contrast?: unknown;

  readonly syntax?: StoredSyntax | null;
}

const stepOf = <Step extends string>(
  scale: Readonly<Partial<Record<Step, number>>> | null | undefined,
  library: Readonly<Record<Step, number>>,
  step: Step,
): number => {
  const value = scale?.[step];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : library[step];
};

const familyOf = (theme: TypeSource, family: "sans" | "mono"): string => {
  const name: unknown = theme.typography?.[family];
  return typeof name === "string" && name.trim() !== ""
    ? name
    : typography[family];
};

export const nativeTextFills = ["input", "background"] as const;

export type NativeTextFill = (typeof nativeTextFills)[number];

export const nativeDiffWash = 0.055;

export const nativeFenceInk = 0.035;

export const nativeFenceHeaderInk = 0.02;

const fenceInk = (fill: string): string | undefined => {
  const rgb = opaqueRgb(fill);
  if (rgb === undefined) {
    return undefined;
  }
  const channel = (at: number): number =>
    Number.parseInt(rgb.slice(at, at + 2), 16);

  const widest = Math.max(channel(1), channel(3), channel(5));
  const narrowest = Math.min(channel(1), channel(3), channel(5));
  return (widest + narrowest) / 2 / 255 < 0.5 ? "#FFFFFF" : "#000000";
};

export function nativeFenceFill(fill: string): string | undefined {
  const ink = fenceInk(fill);
  return ink === undefined ? undefined : blend(fill, ink, nativeFenceInk);
}

export function nativeFenceHeaderFill(fill: string): string | undefined {
  const body = nativeFenceFill(fill);
  const ink = fenceInk(fill);
  return body === undefined || ink === undefined
    ? undefined
    : blend(body, ink, nativeFenceHeaderInk);
}

export interface NativeTextMetrics {
  readonly codeTextSize: number;

  readonly codeLineHeight: number;

  readonly diffTextSize: number;

  readonly diffLineHeight: number;

  readonly mdTextSize: number;

  readonly mdLineHeight: number;

  readonly mdHeadingSizes: number[];

  readonly mdHeadingLineHeights: number[];

  readonly mdCodeRadius: number;

  readonly mdCodeHeaderTextSize: number;

  readonly mdInlineCodeRadius: number;

  readonly codeGutterPaddingRight: number;

  readonly diffRowPaddingX: number;

  readonly diffBodyBottomPad: number;

  readonly mdBlockGap: number;

  readonly mdTableCellPadding: number;

  readonly mdCodePaddingX: number;

  readonly mdCodePaddingY: number;

  readonly mdCodeHeaderPaddingY: number;
}

export interface NativeTextTheme {
  readonly appearance: ThemeMode;

  readonly bg?: string;

  readonly text?: string;

  readonly textMuted?: string;

  readonly textFaint?: string;

  readonly accent?: string;

  readonly caret?: string;

  readonly fontSans: string;

  readonly fontMono: string;

  readonly metrics: NativeTextMetrics;

  readonly diffAdd?: string;

  readonly diffDel?: string;

  readonly diffHunkBg?: string;

  readonly textDim?: string;

  readonly codeText?: string;

  readonly codeWash?: string;

  readonly border?: string;

  readonly syntax: SyntaxColors;
}

export const nativeAccentShares = {
  marker: 0.85,
  rail: 0.6,
  wash: 0.05,
} as const;

export const nativeAccentSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

export type NativeAccentSurface = (typeof nativeAccentSurfaces)[number];

const ACCENT_STEPS = 50;

export function nativeAccent(
  source: NativeTextSource,
  floors: ContrastFloors = contrastFloorsFor(source),
): string | undefined {
  const colors = themeColors(source);
  const primary = colors.primary;

  if (primary === undefined) {
    return undefined;
  }
  const rest = colors.foreground ?? primary;
  const carries = (colour: string): boolean =>
    nativeAccentSurfaces.every((surface) => {
      const fill = colors[surface];

      if (fill === undefined) {
        return true;
      }
      const label = contrastRatio(
        blend(fill, colour, nativeAccentShares.marker),
        fill,
      );
      const rail = contrastRatio(
        blend(fill, colour, nativeAccentShares.rail),
        fill,
      );
      return (
        (label === undefined || label >= floors.secondary) &&
        (rail === undefined || rail >= decorativeFloor)
      );
    });

  const step = Array.from({ length: ACCENT_STEPS + 1 }, (_, at) => at).find(
    (at) => carries(blend(primary, rest, at / ACCENT_STEPS)),
  );

  return step === undefined ? rest : blend(primary, rest, step / ACCENT_STEPS);
}

export function nativeTextTheme(
  theme: NativeTextSource,
  fill: NativeTextFill = "input",
): NativeTextTheme {
  const colors = themeColors(theme);

  const added = statusTone({ colors }, "success");
  const removed = statusTone({ colors }, "destructive");

  const code = textStyle(theme, "codeBlock");
  const body = textStyle(theme, "body");
  const h1 = textStyle(theme, "h1");
  const h2 = textStyle(theme, "h2");
  const h3 = textStyle(theme, "h3");
  const caption = textStyle(theme, "caption");
  return {
    appearance: themeModeOf(theme),
    bg: colors[fill],
    text: colors.inputForeground,
    textMuted: colors.mutedForeground,
    textFaint: colors.placeholder,

    accent: nativeAccent(theme),
    caret: colors.primary,
    fontSans: familyOf(theme, "sans"),
    fontMono: familyOf(theme, "mono"),

    metrics: {
      codeTextSize: code.fontSize,
      codeLineHeight: code.lineHeight,

      diffTextSize: code.fontSize,
      diffLineHeight: code.lineHeight,

      mdTextSize: body.fontSize,
      mdLineHeight: body.lineHeight,
      mdHeadingSizes: [h1.fontSize, h2.fontSize, h3.fontSize, body.fontSize],
      mdHeadingLineHeights: [
        h1.lineHeight,
        h2.lineHeight,
        h3.lineHeight,
        body.lineHeight,
      ],
      mdCodeRadius: stepOf(theme.radius, radius, "lg"),

      mdCodeHeaderTextSize: caption.fontSize,
      mdInlineCodeRadius: stepOf(theme.radius, radius, "sm"),

      codeGutterPaddingRight: stepOf(theme.spacing, spacing, "lg"),
      diffRowPaddingX: stepOf(theme.spacing, spacing, "xl"),
      diffBodyBottomPad: stepOf(theme.spacing, spacing, "md"),
      mdBlockGap: stepOf(theme.spacing, spacing, "lg"),
      mdTableCellPadding: stepOf(theme.spacing, spacing, "lg"),
      mdCodePaddingX: stepOf(theme.spacing, spacing, "lg"),
      mdCodePaddingY: stepOf(theme.spacing, spacing, "md"),

      mdCodeHeaderPaddingY: stepOf(theme.spacing, spacing, "xs"),
    },

    diffAdd: added?.foreground,
    diffDel: removed?.foreground,
    diffHunkBg: colors.muted,
    textDim: colors.mutedForeground,

    codeText: colors.foreground,
    codeWash: colors.muted,
    border: colors.border,
    syntax: syntaxColors(theme),
  };
}

/**
 * The content-surface theme: the tokens a `<markdown>`, `<code>` or `<diff>`
 * paints with, and the geometry a probe needs to read them.
 *
 * The bug being guarded: those three elements publish `theme?: GpuixTheme`,
 * **no scenario in either registry passes one**, and the runtime's base theme
 * is always `Theme::dark()` (`Theme::from_prop(None)`). A markdown preview or
 * code block shipped in our light palette therefore paints Comet's dark
 * colours, and every existing check — bounds, painted text, the authored style
 * report — stays green, because none of them reads the glyph ink.
 *
 * This module owns the mapping (every field is a token, never a literal), the
 * fixture geometry that follows from the runtime's default metrics, and the
 * scan the appearance checks need. The view and the checks read the same
 * constants, so they cannot drift; the frame is the other witness.
 */
import { Pixels } from "@gpuixui/testing";
import type { Smoke } from "@gpuixui/testing";
import type { GpuixTheme, SyntaxTheme } from "@gpuix/react";
import { alpha } from "@gpuixui/tokens";
import type { Theme, ThemeColors } from "@gpuixui/tokens";
import * as Option from "effect/Option";

/**
 * The inline-code wash: the runtime paints `code_wash` as a quad behind the run
 * (`markdown/render.rs:362`), so only its alpha makes it a wash. The runtime's
 * dark default is a violet at 12 %, which is the accent family here.
 */
export const CODE_WASH_ALPHA = 0.12;

/**
 * The diff hunk band: `diff_hunk_bg` is the row's `bg` (`diff.rs:546`). The
 * runtime's defaults are 5 % (dark) and 7 % (light); 6 % is the same quiet
 * neutral, and a neutral keeps the three diff hues meaning added/deleted/hunk.
 */
export const HUNK_TINT_ALPHA = 0.06;

/**
 * The design system's theme for a native content surface.
 *
 * `bg` is the app canvas, not a card: `<diff>` paints it as its content plane,
 * while `<markdown>` and `<code>` paint no surface at all, so the plane proves
 * which element owns the fill. `appearance` selects the runtime's base before
 * the overrides apply, so a consumer passing only an appearance gets a coherent
 * surface.
 */
export const nativeContentTheme = (theme: Theme): GpuixTheme => ({
  appearance: theme.mode,
  bg: theme.colors.background,
  border: theme.colors.border,
  text: theme.colors.foreground,
  textMuted: theme.colors.mutedForeground,
  textFaint: theme.colors.placeholder,
  textDim: theme.colors.mutedForeground,
  accent: theme.colors.primary,
  caret: theme.colors.primary,
  codeText: theme.colors.primary,
  codeWash: alpha(theme.colors.primary, CODE_WASH_ALPHA),
  diffAdd: theme.colors.success,
  diffDel: theme.colors.destructive,
  diffHunkBg: alpha(theme.colors.mutedForeground, HUNK_TINT_ALPHA),
  fontSans: theme.typography.sans,
  fontMono: theme.typography.mono,
  syntax: syntaxPalette(theme.colors),
});

/** Every kind a highlighted span can carry, in the published order. */
export const syntaxKinds = [
  "comment",
  "keyword",
  "string",
  "stringSpecial",
  "escape",
  "number",
  "boolean",
  "typeName",
  "typeBuiltin",
  "constructor",
  "function",
  "functionBuiltin",
  "macroName",
  "property",
  "constant",
  "variable",
  "variableSpecial",
  "parameter",
  "operator",
  "punctuation",
  "tag",
  "attribute",
  "label",
  "invalid",
] as const;

/**
 * One complete syntax palette, derived from the semantic roles.
 *
 * Explicit rather than table-driven: the compiler then proves every published
 * kind is present, and the mapping reads as the design decision it is.
 */
export const syntaxPalette = (colors: ThemeColors): SyntaxTheme => ({
  comment: colors.mutedForeground,
  keyword: colors.primary,
  string: colors.success,
  stringSpecial: colors.info,
  escape: colors.info,
  number: colors.warning,
  boolean: colors.warning,
  typeName: colors.warning,
  typeBuiltin: colors.success,
  constructor: colors.warning,
  function: colors.primary,
  functionBuiltin: colors.info,
  macroName: colors.info,
  property: colors.warning,
  constant: colors.success,
  variable: colors.foreground,
  variableSpecial: colors.info,
  parameter: colors.foreground,
  operator: colors.mutedForeground,
  punctuation: colors.mutedForeground,
  tag: colors.info,
  attribute: colors.warning,
  label: colors.warning,
  invalid: colors.destructive,
});

/** One fixture's place on the stage; `cardId` is the painted panel. */
export interface SurfacePanel {
  readonly cardId: string;
  readonly testId: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export const STAGE_ID = "surface-stage";
export const STAGE_WIDTH = 880;
export const STAGE_HEIGHT = 580;

/** The panel grid, keyed by the child's `testId` so the view cannot mistype one. */
export const SURFACE_PANEL_RECORD = {
  "st-md-text": {
    cardId: "st-md-text-card",
    testId: "st-md-text",
    left: 16,
    top: 16,
    width: 420,
    height: 64,
  },
  "st-md-text-default": {
    cardId: "st-md-text-default-card",
    testId: "st-md-text-default",
    left: 444,
    top: 16,
    width: 420,
    height: 64,
  },
  "st-md-code": {
    cardId: "st-md-code-card",
    testId: "st-md-code",
    left: 16,
    top: 88,
    width: 420,
    height: 44,
  },
  "st-md-code-default": {
    cardId: "st-md-code-default-card",
    testId: "st-md-code-default",
    left: 444,
    top: 88,
    width: 420,
    height: 44,
  },
  "st-md-link": {
    cardId: "st-md-link-card",
    testId: "st-md-link",
    left: 16,
    top: 140,
    width: 420,
    height: 40,
  },
  "st-md-list": {
    cardId: "st-md-list-card",
    testId: "st-md-list",
    left: 444,
    top: 140,
    width: 420,
    height: 40,
  },
  "st-md-light": {
    cardId: "st-md-light-card",
    testId: "st-md-light",
    left: 16,
    top: 188,
    width: 200,
    height: 56,
  },
  "st-md-dark": {
    cardId: "st-md-dark-card",
    testId: "st-md-dark",
    left: 228,
    top: 188,
    width: 200,
    height: 56,
  },
  "st-code": {
    cardId: "st-code-card",
    testId: "st-code",
    left: 16,
    top: 252,
    width: 420,
    height: 140,
  },
  "st-code-default": {
    cardId: "st-code-default-card",
    testId: "st-code-default",
    left: 444,
    top: 252,
    width: 420,
    height: 140,
  },
  "st-diff": {
    cardId: "st-diff-card",
    testId: "st-diff",
    left: 16,
    top: 400,
    width: 420,
    height: 152,
  },
} as const satisfies Record<string, SurfacePanel>;

/** The panels in document order. */
export const SURFACE_PANELS: ReadonlyArray<SurfacePanel> =
  Object.values(SURFACE_PANEL_RECORD);

/** Dense capitals, so a themed ink scan has interior pixels to find. */
export const MD_TEXT_SOURCE = "# AaAaAa";

/** A paragraph that is only an inline-code run. */
export const MD_CODE_SOURCE = "`tokenCode`";

/** A link: the runtime keeps links monochrome and underlines them in `textMuted`. */
export const MD_LINK_SOURCE = "[docs](https://example.test)";

/** A single bullet: the disc is the only thing the accent field paints here. */
export const MD_LIST_SOURCE = "- a";

/** The two appearance fixtures differ in nothing but `appearance`. */
export const MD_APPEARANCE_SOURCE = "# AaAa";

/** Three lines at the probe's `lineHeight`, with one guaranteed string capture. */
export const CODE_SAMPLE = [
  "const total = rows * 2;",
  'const label = "new";',
  "return total;",
].join("\n");

/** The code type size the fixture passes in `style`; glyphs must be sampleable. */
export const CODE_FONT_SIZE = 30;
export const CODE_LINE_HEIGHT = 40;

/** The gutter band a line-number scan reads, in logical pixels. */
export const GUTTER_WIDTH = 28;

/**
 * A modified file, so `file_notices` is empty and the rows are exactly
 * `FileHeader, HunkHeader, Context, Del, Add`.
 */
export const SURFACE_PATCH = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,2 +1,2 @@",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
].join("\n");

/** The runtime's default row metrics (source: `Metrics::default`). */
export const DIFF_FILE_HEADER = 36;
export const DIFF_HUNK_HEADER = 28;
export const DIFF_LINE = 21;

/** The row tint the runtime paints over `theme.bg` (source: `add_bg.a = 0.055`). */
export const DIFF_TINT_ALPHA = 0.055;

/** The bullet disc's centre relative to the markdown element's content box. */
export const BULLET_LEFT = 3.5;
export const BULLET_TOP = 11;

/** The bullet fill's alpha (source: `bg(opacity(theme.accent, 0.85))`). */
export const BULLET_ALPHA = 0.85;

/** Ink that must carry a token before it is evidence, not a stray edge. */
export const MIN_SURFACE_PIXELS = 32;

/** The three points the diff's plane, its wash and its two tints are read at. */
export interface DiffRowPoints {
  readonly context: { readonly x: number; readonly y: number };
  readonly hunk: { readonly x: number; readonly y: number };
  readonly deleted: { readonly x: number; readonly y: number };
  readonly added: { readonly x: number; readonly y: number };
}

/**
 * The row points relative to the diff's painted box.
 *
 * `x` is past the short line text, so a glyph can never be sampled as a plane.
 */
export const diffRowPoints = (box: Smoke.Bounds): DiffRowPoints => {
  const x = box.x + box.width - 24;
  const body = box.y + DIFF_FILE_HEADER + DIFF_HUNK_HEADER;
  return {
    context: { x, y: body + DIFF_LINE / 2 },
    hunk: { x, y: body - DIFF_HUNK_HEADER / 2 },
    deleted: { x, y: body + DIFF_LINE + DIFF_LINE / 2 },
    added: { x, y: body + DIFF_LINE * 2 + DIFF_LINE / 2 },
  };
};

/** The bullet disc's centre, relative to the markdown element's painted box. */
export const bulletPoint = (
  box: Smoke.Bounds,
): { readonly x: number; readonly y: number } => ({
  x: box.x + BULLET_LEFT,
  y: box.y + BULLET_TOP,
});

/** The composite a bullet disc paints: the accent at 85 % over the card panel. */
export const bulletPaint = (
  accent: Pixels.Rgba,
  card: Pixels.Rgba,
): Pixels.Rgba => Pixels.blendOver(accent, BULLET_ALPHA, card);

/** A diff row tint: the line colour at 5.5 % over the content plane. */
export const diffTint = (line: Pixels.Rgba, plane: Pixels.Rgba): Pixels.Rgba =>
  Pixels.blendOver(line, DIFF_TINT_ALPHA, plane);

/** Any translucent fill over a plane: the hunk band, and the shared shape. */
export const washOver = (
  ink: Pixels.Rgba,
  amount: number,
  plane: Pixels.Rgba,
): Pixels.Rgba => Pixels.blendOver(ink, amount, plane);

/** The composite the hunk header paints: a neutral at 6 % over the plane. */
export const hunkPaint = (
  mutedForeground: Pixels.Rgba,
  plane: Pixels.Rgba,
): Pixels.Rgba => washOver(mutedForeground, HUNK_TINT_ALPHA, plane);

/** Relative luminance of a straight sRGB colour, `0..1`. */
export const luminanceOf = (colour: Pixels.Rgba): number =>
  (0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b) / 255;

/** What a scan of one box found at its darkest interior pixel. */
export interface DarkestScan {
  readonly sampled: number;
  readonly darkest: Pixels.Rgba;
  readonly luminance: number;
}

const BLACK = new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 255 });

/**
 * The darkest device pixel inside a painted box.
 *
 * The two appearance fixtures sit on a light panel, so the ink is the darkest
 * thing in the box in both cases — `#222222` for a light base, `#E5E5E5` for a
 * dark one — and a plane can never be mistaken for the ink.
 *
 * Indexed loops are deliberate, as in `text-ink-model.ts`: this walks tens of
 * thousands of device pixels and an `Arr` fold would allocate a wrapper per
 * pixel. A frame whose size does not match the window returns `sampled: 0`, so
 * a caller cannot pass by sampling nothing.
 */
export const scanDarkest = (
  frame: Pixels.Pixels,
  window: Smoke.WindowSize,
  box: Smoke.Bounds,
): DarkestScan => {
  const scale = Option.getOrElse(Pixels.frameScale(frame, window), () => 0);
  if (scale === 0) {
    return { sampled: 0, darkest: BLACK, luminance: 0 };
  }
  const startX = Math.round(box.x * scale);
  const endX = Math.round((box.x + box.width) * scale);
  const startY = Math.round(box.y * scale);
  const endY = Math.round((box.y + box.height) * scale);
  let sampled = 0;
  let darkest = BLACK;
  let luminance = Number.POSITIVE_INFINITY;
  for (let y = startY; y < endY; y += 1) {
    if (y < 0 || y >= frame.height) {
      continue;
    }
    for (let x = startX; x < endX; x += 1) {
      if (x < 0 || x >= frame.width) {
        continue;
      }
      const offset = (y * frame.width + x) * 4;
      const pixel = new Pixels.Rgba({
        r: frame.data[offset] ?? 0,
        g: frame.data[offset + 1] ?? 0,
        b: frame.data[offset + 2] ?? 0,
        a: frame.data[offset + 3] ?? 0,
      });
      sampled += 1;
      const value = luminanceOf(pixel);
      if (value < luminance) {
        luminance = value;
        darkest = pixel;
      }
    }
  }
  return { sampled, darkest, luminance: sampled === 0 ? 0 : luminance };
};

/** Text drawn in a light base theme is dark (`< 0.35`); a dark base is light. */
export const LIGHT_INK_CEILING = 0.35;
export const DARK_INK_FLOOR = 0.7;

/** The panels never overlap; an overlap would let a scan read a neighbour. */
export const panelsOverlap = (panels: ReadonlyArray<SurfacePanel>): boolean =>
  panels.some((panel, index) =>
    panels
      .slice(index + 1)
      .some(
        (other) =>
          panel.left < other.left + other.width &&
          other.left < panel.left + panel.width &&
          panel.top < other.top + other.height &&
          other.top < panel.top + panel.height,
      ),
  );

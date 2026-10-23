/**
 * The `markdown-fence` probe's fixtures: the surface a fenced code block paints
 * and the keyword a palette puts on it.
 *
 * `@gpuixui/tokens` derives the fence twice — `nativeFenceFill` lays the
 * runtime's 3.5% neutral ink over the document's own fill and
 * `nativeFenceHeaderFill` lays its 2% language-strip wash over that — and then
 * reads the syntax palette on the composite rather than on the page
 * (`syntaxColors` is held to the body floor on both). The derivation is a
 * source read of `packages/native/src/markdown/render.rs`; what a window can
 * prove is the paint: the fence body's composite, the strip's second wash, and
 * the keyword glyphs that composite has to carry.
 *
 * The three blocks share one source. The first is the base dark theme, the
 * second wears the macOS dark look (whose syntax table steps the keyword one
 * ramp to clear the fence), and the third is handed **no** theme, so it must
 * paint the runtime's own palette and not a shipped one — the control that
 * keeps a missing handover from reading as a pass.
 */
import { pipe } from "effect";
import * as Option from "effect/Option";
import {
  contrastFloorsFor,
  contrastRatio,
  nativeFenceFill,
  nativeFenceHeaderFill,
  platformTheme,
  syntaxColors,
  type Theme,
} from "@gpuixui/tokens";
import { palettes } from "../palettes.js";

/** The platform look the second block wears: one dark table is shared by all three. */
export const FENCE_PLATFORM = "darwin" as const;

/** The base dark theme, which reads its keyword on its own fence. */
export const fenceBaseTheme: Theme = palettes.dark;

/** The macOS dark look, whose fence needs the brighter keyword. */
export const fencePlatformTheme: Theme = platformTheme(
  palettes.dark,
  FENCE_PLATFORM,
);

/** The ids the view, the steps and the guards share. */
export const MARKDOWN_FENCE_IDS = {
  probe: "md-fence-probe",
  caption: "md-fence-caption",
  base: "md-fence-base",
  platform: "md-fence-platform",
  runtime: "md-fence-runtime",
} as const;

/** The language strip every block paints, so the header wash exists. */
export const FENCE_LANGUAGE = "ts";

/**
 * The source every block paints: one fenced line per `const`.
 *
 * Each line opens with the keyword, so the palette's `keyword` is read off a
 * run rather than one glyph, and the line count keeps the body tall enough that
 * the strip's count cannot be mistaken for it.
 */
export const FENCE_SOURCE = [
  "```ts",
  "const total = 41;",
  'const label = "ready";',
  "const ready = true;",
  "const again = total;",
  "```",
].join("\n");

/**
 * How far a painted byte may sit from the composite this probe expects.
 *
 * The runtime composites the ink into the framebuffer, and the round trip
 * through premultiplied alpha can move a channel by a byte. The two washes are
 * five bytes apart on the shipped dark pages and the shipped keywords are far
 * apart, so this gap cannot merge the body, the strip or the runtime's own
 * palette into each other.
 */
export const FENCE_TOLERANCE = 2;

/**
 * The fewest pixels the fence body must cover.
 *
 * Four code lines at the block's own leading span thousands of pixels across
 * the block's width; a strip three points above it is the only other fill. A
 * fence that painted nothing leaves neither count.
 */
export const FENCE_BODY_FLOOR = 2000;

/** The fewest pixels the language strip must cover: one band across the block. */
export const FENCE_STRIP_FLOOR = 200;

/**
 * The checks the probe asserts, so its documentation cannot drift.
 *
 * The capture scale, the four measurable fills, every crop read and every
 * fill/keyword count, the floor and negative reads, the two strip steps and the
 * two layout rules add fifty.
 */
export const MARKDOWN_FENCE_CHECKS = 50;

/** The fence body's composite, or absence when the fill cannot be measured. */
export const fenceBody = (theme: Theme): Option.Option<string> =>
  Option.fromNullishOr(nativeFenceFill(theme.colors.background));

/** The strip's composite over the body, or absence when it cannot be measured. */
export const fenceStrip = (theme: Theme): Option.Option<string> =>
  Option.fromNullishOr(nativeFenceHeaderFill(theme.colors.background));

/** The keyword the theme's palette names. */
export const fenceKeyword = (theme: Theme): string =>
  syntaxColors(theme).keyword;

/**
 * Whether the keyword the palette names clears the body floor on the fence it
 * is painted on.
 *
 * The paint proves the palette reached the glyphs; this proves the composite
 * the fence paints is the one the token contract measured, so a palette that
 * reads on the page but not on the fence is reported rather than passing as a
 * colour that merely appears.
 */
export const keywordClearsFence = (theme: Theme): boolean =>
  pipe(
    fenceBody(theme),
    Option.flatMap((body) =>
      Option.map(
        Option.fromNullishOr(contrastRatio(fenceKeyword(theme), body)),
        (ratio) => ratio >= contrastFloorsFor(theme).body,
      ),
    ),
    Option.getOrElse(() => false),
  );

/**
 * Whether the strip is a second wash over the body rather than a boundary.
 *
 * The runtime draws a rule under the strip and around the block; the fill is
 * one wash step, not an edge. Measured on the two shipped dark pages the pair
 * reads 1.057:1 (base) and 1.053:1 (macOS), and the token contract records the
 * light styles under 1.05:1 — so the ceiling is what a fill this close to its
 * body must stay under, and a palette that turned the strip into a 3:1 band
 * would be a different design rather than a silent drift.
 */
export const stripIsSecondWash = (theme: Theme): boolean =>
  pipe(
    Option.all([fenceBody(theme), fenceStrip(theme)]),
    Option.flatMap(([body, strip]) =>
      Option.map(
        Option.fromNullishOr(contrastRatio(strip, body)),
        (ratio) => strip !== body && ratio < 1.1,
      ),
    ),
    Option.getOrElse(() => false),
  );

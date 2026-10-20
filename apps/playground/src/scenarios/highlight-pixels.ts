/**
 * The highlight wash colours a frame must show, derived rather than guessed.
 *
 * `getPaintedHighlights()` reports rects and match offsets, never the colour it
 * painted, so the wash contract is only observable in a captured frame. The
 * published `HighlightSpec` says `color` defaults to "the theme accent at 30 %
 * alpha" and `activeColor` to "accent at 65 %". That accent is the runtime's
 * own dark accent, **not** `@gpuixui/tokens`' `accent`; this module derives the
 * pixels both routes must produce so a scenario compares a real frame with a
 * rule, not with a value copied from that frame.
 *
 * Measured (plan `701`): the runtime composites a wash over the line's opaque
 * background in sRGB channels with a plain blend
 * (`round(alpha * fg + (1 - alpha) * bg)`), and the two defaults over the
 * playground background `#11141A` are exactly `#31365F` and `#575EAF` in both
 * hosts. A token passed as `color` keeps its own alpha (`#RRGGBBAA`).
 */
import { Pixels } from "@gpuixui/testing";

/**
 * GPUix `Theme::dark()`'s accent, `oklch(0.673, 0.182, 276.935)`, as sRGB.
 *
 * The runtime has no theme query, so the value is pinned here. Plan `701`
 * confirmed it against the painted default washes in a headless frame and a
 * live window; the release binding's defaults match this source constant.
 */
export const RUNTIME_DARK_ACCENT = new Pixels.Rgba({
  r: 124,
  g: 134,
  b: 255,
  a: 255,
});

/** The runtime's two default wash alphas. */
export const WASH_ALPHA = {
  inactive: 0.3,
  active: 0.65,
} as const;

/** The two default washes for an accent over a background. */
export interface WashColours {
  readonly inactive: Pixels.Rgba;
  readonly active: Pixels.Rgba;
}

/** Derive the runtime's two default washes for `accent` over `background`. */
export const washColours = (
  accent: Pixels.Rgba,
  background: Pixels.Rgba,
): WashColours => ({
  inactive: Pixels.blendOver(accent, WASH_ALPHA.inactive, background),
  active: Pixels.blendOver(accent, WASH_ALPHA.active, background),
});

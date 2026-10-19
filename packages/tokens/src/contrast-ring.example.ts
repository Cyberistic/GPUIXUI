import type { BoxShadow } from "./elevation.js";
import { contrastRing } from "./ring.js";
import { lightTheme, type Theme } from "./theme.js";

/** The runtime shape of a two-tone content ring on one element. */
export interface ContrastRingStyle {
  /** The inner tone, painted against the content. */
  readonly borderColor: string;
  /** Thickness of both tones. */
  readonly borderWidth: number;
  /** The outer tone, painted outside the border box. */
  readonly boxShadow: BoxShadow;
}

/**
 * The one-element composition of {@link contrastRing}: the inner tone as the
 * border, the outer tone as a zero-blur spread shadow. It consumes the
 * runtime's single shadow slot, so this element cannot also carry an elevation
 * shadow; a wrapper with `padding: width` painting `outer` is the alternative.
 * Exercised by `ring.test.ts`.
 */
export const contrastRingStyle = (
  theme: Theme = lightTheme,
): ContrastRingStyle => {
  const ring = contrastRing(theme);
  return {
    borderColor: ring.inner,
    borderWidth: ring.width,
    boxShadow: {
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadRadius: ring.width,
      color: ring.outer,
    },
  };
};

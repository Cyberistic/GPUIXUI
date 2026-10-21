/**
 * The inverse of `extendTheme`: an edited theme is expressed as the overrides
 * that reproduce it, so an editor can store or emit the small set instead of a
 * whole theme object. The second half is the base: overrides are relative to the
 * exact theme they were measured against, so a stored edit records its base as a
 * `ThemeChoice`. This file is type-checked and asserted in `theme-diff.test.ts`
 * and `theme-edit.test.ts`.
 */
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeEdit,
  themeOverrides,
  type ThemeChoice,
} from "./index.js";

/** The base an editor starts from. */
export const exportedBase = getTheme("light");

/**
 * An edited theme touching four groups in the documented copy-and-own shape.
 * `body` moves only its leading, so the rest of its type role inherits.
 */
export const exportedTheme = extendTheme(exportedBase, {
  name: "Exported",
  density: "compact",
  radius: { md: 8 },
  typography: { body: { lineHeight: 22 } },
});

/**
 * The minimal overrides that rebuild {@link exportedTheme} from
 * {@link exportedBase}, ready to print in a `createTheme` module.
 */
export const exportedOverrides = themeOverrides(exportedBase, exportedTheme);

/** A stored edit names a shipped base, not an identity: the Windows variant. */
export const exportedBaseChoice = {
  mode: "light",
  platform: "win32",
} as const satisfies ThemeChoice;

/** The Windows base the editor opened. */
export const exportedPlatformBase = getPlatformTheme(
  exportedBaseChoice.platform,
  exportedBaseChoice.mode,
);

/** One step moved on the platform's own radii. */
export const exportedPlatformTheme = extendTheme(exportedPlatformBase, {
  radius: { md: 8 },
});

/**
 * The stored pair — the choice that rebuilds the base and the overrides that
 * rebuild the edit — un-narrowed, as `exportedOverrides` is. A same-mode choice
 * never yields `undefined`; the suite narrows it.
 */
export const exportedPlatformEdit = themeEdit(
  exportedBaseChoice,
  exportedPlatformTheme,
);

/**
 * One shape on the reserved `overlay` level, which every shipped theme leaves
 * empty. A level is replaced whole, so defining it is an ordinary override.
 */
export const exportedOverlayShape = {
  offsetX: 0,
  offsetY: 28,
  blurRadius: 64,
  spreadRadius: -12,
  alpha: 0.24,
} as const;

/** The identity with the reserved level defined. */
export const exportedOverlayTheme = extendTheme(exportedBase, {
  elevation: { overlay: [exportedOverlayShape] },
});

/** The one-group diff that rebuilds {@link exportedOverlayTheme}. */
export const exportedOverlayOverrides = themeOverrides(
  exportedBase,
  exportedOverlayTheme,
);

/**
 * A bezier easing is a value, not a member set: the shipped phase is a name and
 * the edit is a tuple, and the diff carries it like any other value. The stored
 * pair is the shape an editor persists, so this is the path plan `834` fixed.
 */
export const exportedBezierTheme = extendTheme(exportedBase, {
  motion: { ease: { enter: [0.4, 0, 0.2, 1] } },
});

/** The one-phase diff that rebuilds {@link exportedBezierTheme}. */
export const exportedBezierOverrides = themeOverrides(
  exportedBase,
  exportedBezierTheme,
);

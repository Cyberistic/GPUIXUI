/**
 * The package's single seam over `@gpuixui/tokens`.
 *
 * Every part reads its colour roles and metrics from the caller's theme through
 * this file, so a token change lands here and no part repeats a raw palette.
 * `@gpuixui/tokens/react` is imported here only; every other module takes the
 * theme through {@link useTheme} or a `Theme` argument.
 */

import type { Theme } from "@gpuixui/tokens";
import { useTheme as useTokenTheme } from "@gpuixui/tokens/react";

export { controlFocusRing, textStyle } from "@gpuixui/tokens";
export type { Theme };

/**
 * The theme the tree is rendered in.
 *
 * A table never keeps a palette of its own: a surface, a wash or a label role
 * resolves through this theme, so a brand, a platform style or a high-contrast
 * variant reaches every painted part.
 */
export const useTheme = (): Theme => useTokenTheme();

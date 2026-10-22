/**
 * The package's single seam over `@gpuixui/tokens`.
 *
 * Every part reads its colour roles, type and platform through this file, so a
 * token change lands here and no part repeats a raw palette. `@gpuixui/tokens/react`
 * is imported here only; other modules take the theme through {@link useTheme} or
 * a `Theme` argument.
 */

import type { Theme } from "@gpuixui/tokens";
import { useTheme as useTokenTheme } from "@gpuixui/tokens/react";

export {
  currentPlatform,
  disabledOpacity,
  statusTone,
  textStyle,
} from "@gpuixui/tokens";
export type { StatusTone, TextRole, Theme } from "@gpuixui/tokens";

/** The theme the tree is rendered in. */
export const useTheme = (): Theme => useTokenTheme();

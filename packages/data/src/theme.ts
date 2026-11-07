import type { Theme } from "@gpuixui/tokens";
import { useTheme as useTokenTheme } from "@gpuixui/tokens/react";

export {
  controlFocusRing,
  dividerOn,
  pointerWash,
  textStyle,
  themeColors,
} from "@gpuixui/tokens";
export type { Theme };

export const useTheme = (): Theme => useTokenTheme();

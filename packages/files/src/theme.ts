import type { Theme } from "@gpuixui/tokens";
import { useTheme as useTokenTheme } from "@gpuixui/tokens/react";

export {
  pointerWash,
  statusTone,
  textStyle,
  themeColors,
} from "@gpuixui/tokens";
export type { Theme };

export const useTheme = (): Theme => useTokenTheme();

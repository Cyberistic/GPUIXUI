import type { Theme } from "@gpuixui/tokens";
import { useTheme as useTokenTheme } from "@gpuixui/tokens/react";

export {
  currentPlatform,
  disabledOpacity,
  materialFill,
  statusTone,
  textStyle,
} from "@gpuixui/tokens";
export type {
  PlatformName,
  StatusTone,
  TextRole,
  Theme,
} from "@gpuixui/tokens";

export const useTheme = (): Theme => useTokenTheme();

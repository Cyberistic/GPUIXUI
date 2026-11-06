import { Match } from "effect";
import type { IconName } from "@gpuixui/icons";
import type { Theme } from "../internal/theme.js";

export type ThemeMode = Theme["mode"];

export interface ToggleLabels {
  readonly light?: string;
  readonly dark?: string;
}

export const toggleLabels = {
  light: "Switch to light theme",
  dark: "Switch to dark theme",
} as const;

export const toggledMode = (mode: ThemeMode): ThemeMode =>
  Match.value(mode).pipe(
    Match.when("dark", () => "light" as const),
    Match.when("light", () => "dark" as const),
    Match.exhaustive,
  );

export const toggleIcon = (mode: ThemeMode): IconName =>
  Match.value(toggledMode(mode)).pipe(
    Match.when("dark", () => "moon" as const),
    Match.when("light", () => "sun" as const),
    Match.exhaustive,
  );

export const toggleLabel = (
  mode: ThemeMode,
  labels: ToggleLabels = {},
): string =>
  Match.value(toggledMode(mode)).pipe(
    Match.when("light", () => labels.light ?? toggleLabels.light),
    Match.when("dark", () => labels.dark ?? toggleLabels.dark),
    Match.exhaustive,
  );

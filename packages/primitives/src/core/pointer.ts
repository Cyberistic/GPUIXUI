import { pointerWash } from "@gpuixui/tokens";
import { colorRole, type PaintSource } from "./theme.js";

export const pressWash = (theme: PaintSource): string | undefined =>
  pointerWash(theme, "active", "hover") ?? colorRole(theme, "active");

export const primaryButton = (event: { readonly button?: number }): boolean =>
  event.button === undefined || event.button === 0;

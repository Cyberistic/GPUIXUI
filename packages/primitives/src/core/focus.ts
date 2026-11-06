import type { StyleDesc } from "@gpuix/react";
import { controlFocusRing } from "@gpuixui/tokens";
import type { PrimitiveTheme } from "./theme.js";

export const keyboardRing = (
  theme: PrimitiveTheme,
  invalid?: boolean,
): StyleDesc => controlFocusRing(theme, { invalid }) ?? {};

export const keepContent: StyleDesc = { keyboardFocusDim: false };

export interface RingState {
  readonly disabled?: boolean;
  readonly invalid?: boolean;
}

export const controlRing = (
  theme: PrimitiveTheme,
  state: RingState = {},
): StyleDesc => controlFocusRing(theme, state) ?? {};

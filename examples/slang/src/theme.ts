/**
 * The calculator's physical colours.
 *
 * The window around the calculator reads semantic roles from `@gpuixui/tokens`
 * and follows light and dark. The device does not: an fx-991ES Plus is a
 * graphite body with a reflective LCD, black function keys, light number keys,
 * gold SHIFT legends and red ALPHA legends in any room. These are the only
 * literals in the app, named here once.
 */

import type { Tone } from "@gpuixui/calc";

export const device = {
  body: "#2B2E36",
  bodyEdge: "#16181D",
  bezel: "#1D1F25",
  model: "#C9CDD3",
  solar: "#3A2E29",
  solarCell: "#4C3C33",
  pad: "#BFC4CB",
  padEdge: "#8B9098",
  padInk: "#2B2E36",
  shift: "#E9B949",
  alpha: "#E5534B",
  /** The reflective LCD: grey-green glass, dark segments. */
  lcd: "#C3CCB6",
  lcdEdge: "#8E9784",
  lcdInk: "#1B201C",
} as const;

export interface KeyPaint {
  readonly background: string;
  readonly edge: string;
  readonly ink: string;
}

const keys: Readonly<Record<"small" | "number" | "clear", KeyPaint>> = {
  small: { background: "#1A1C21", edge: "#0B0C0F", ink: "#F2F3F5" },
  number: { background: "#E3E5E8", edge: "#9EA3AA", ink: "#15171B" },
  clear: { background: "#4F86C6", edge: "#2F5F96", ink: "#FFFFFF" },
};

/** A key's cap, by the tone the model gives it. */
export const keyPaint = (tone: Tone): KeyPaint =>
  tone === "accent"
    ? keys.clear
    : tone === "number" || tone === "operator" || tone === "equals"
      ? keys.number
      : keys.small;

/** The ink a control key's own label wears: SHIFT gold, ALPHA red. */
export const labelInk = (id: string, paint: KeyPaint): string =>
  id === "SHIFT" ? device.shift : id === "ALPHA" ? device.alpha : paint.ink;

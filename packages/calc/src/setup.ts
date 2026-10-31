/** The calculator's persistent setup, mirroring the fx-991ES SETUP menu. */

export const ANGLE_UNITS = ["Deg", "Rad", "Gra"] as const;
export type AngleUnit = (typeof ANGLE_UNITS)[number];

export const DISPLAY_MODES = ["MthIO-MathO", "MthIO-LineO", "LineIO"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const NUMBER_FORMATS = ["Norm1", "Norm2", "Fix", "Sci"] as const;
export type NumberFormatKind = (typeof NUMBER_FORMATS)[number];

export interface NumberFormat {
  readonly kind: NumberFormatKind;
  /** 0–9 for Fix and Sci; ignored for Norm. */
  readonly digits: number;
}

export const BASE_NAMES = ["DEC", "HEX", "BIN", "OCT"] as const;
export type BaseName = (typeof BASE_NAMES)[number];

export const BASE_RADIX: Readonly<Record<BaseName, number>> = {
  DEC: 10,
  HEX: 16,
  BIN: 2,
  OCT: 8,
};

export interface Setup {
  readonly display: DisplayMode;
  readonly angle: AngleUnit;
  readonly number: NumberFormat;
  readonly fraction: "d/c" | "mixed";
  readonly complexFormat: "a+bi" | "r∠θ";
  readonly statFrequency: boolean;
  readonly decimalPoint: "." | ",";
}

export const defaultSetup: Setup = {
  display: "MthIO-MathO",
  angle: "Deg",
  number: { kind: "Norm1", digits: 0 },
  fraction: "d/c",
  complexFormat: "a+bi",
  statFrequency: false,
  decimalPoint: ".",
};

/** The digits the Rnd command rounds to under the current number format. */
export const roundingDigits = (format: NumberFormat): number =>
  format.kind === "Norm1" || format.kind === "Norm2" ? 10 : format.digits;

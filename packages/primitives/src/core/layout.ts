import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { storedNumber } from "./stored.js";
import { spaceValue, type PrimitiveTheme, type SpaceStep } from "./theme.js";
import { surfaceStyle, type SurfaceSpec } from "./style.js";

export const STACK_DIRECTIONS = ["row", "column"] as const;
export type StackDirection = (typeof STACK_DIRECTIONS)[number];

export const isStackDirection = (value: unknown): value is StackDirection =>
  P.isString(value) && Arr.contains(STACK_DIRECTIONS, value);

export const stackDirection = (value: unknown): StackDirection =>
  isStackDirection(value) ? value : "column";

export const STACK_ALIGNS = [
  "start",
  "center",
  "end",
  "stretch",
  "baseline",
] as const;
export type StackAlign = (typeof STACK_ALIGNS)[number];

export const STACK_JUSTIFIES = [
  "start",
  "center",
  "end",
  "between",
  "around",
] as const;
export type StackJustify = (typeof STACK_JUSTIFIES)[number];

const alignToFlex: Record<StackAlign, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const justifyToFlex: Record<StackJustify, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};

export interface StackSpec {
  readonly direction: StackDirection;

  readonly gap?: SpaceStep;
  readonly align?: StackAlign;
  readonly justify?: StackJustify;
  readonly wrap?: boolean;

  readonly grow?: boolean;
  readonly fullWidth?: boolean;
  readonly fullHeight?: boolean;
}

export const stackStyle = (
  spec: StackSpec,
  theme: PrimitiveTheme,
): StyleDesc => {
  const style: StyleDesc = {
    display: "flex",
    flexDirection: stackDirection(spec.direction),
  };
  if (spec.gap !== undefined) style.gap = spaceValue(theme, spec.gap);
  if (spec.align !== undefined) style.alignItems = alignToFlex[spec.align];
  if (spec.justify !== undefined)
    style.justifyContent = justifyToFlex[spec.justify];
  if (spec.wrap === true) style.flexWrap = "wrap";
  if (spec.grow === true) style.flexGrow = 1;
  if (spec.fullWidth === true) style.width = "100%";
  if (spec.fullHeight === true) style.height = "100%";
  return style;
};

export interface GridSpec {
  readonly columns: number;
  readonly rows?: number;
  readonly gap?: SpaceStep;
  readonly grow?: boolean;
}

export const trackCount = (count: number): number =>
  Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;

export interface FieldRows {
  readonly minRows?: number;
  readonly maxRows?: number;
}

const rowCount = (count: unknown): Option.Option<number> =>
  Option.map(storedNumber(count), trackCount);

export const fieldRows = (minRows: unknown, maxRows: unknown): FieldRows => {
  const floor = rowCount(minRows);
  const cap = rowCount(maxRows);
  const raised = Option.match(Option.all([floor, cap]), {
    onNone: () => cap,
    onSome: ([floorRows, capRows]) => Option.some(Math.max(capRows, floorRows)),
  });
  return {
    minRows: Option.getOrUndefined(floor),
    maxRows: Option.getOrUndefined(raised),
  };
};

export const gridStyle = (spec: GridSpec, theme: PrimitiveTheme): StyleDesc => {
  const style: StyleDesc = {
    display: "grid",
    gridTemplateColumns: trackCount(spec.columns),
  };
  if (spec.rows !== undefined) {
    style.gridTemplateRows = trackCount(spec.rows);
  }
  if (spec.gap !== undefined) style.gap = spaceValue(theme, spec.gap);
  if (spec.grow === true) style.flexGrow = 1;
  return style;
};

export interface BoxSpec extends SurfaceSpec {
  readonly grow?: boolean;

  readonly shrink?: boolean;
  readonly fullWidth?: boolean;
  readonly fullHeight?: boolean;
}

export const boxStyle = (spec: BoxSpec, theme: PrimitiveTheme): StyleDesc => {
  const style: StyleDesc = {
    ...surfaceStyle(spec, theme),
    flexShrink: spec.shrink === true ? 1 : 0,
  };
  if (spec.grow === true) style.flexGrow = 1;
  if (spec.fullWidth === true) style.width = "100%";
  if (spec.fullHeight === true) style.height = "100%";
  return style;
};

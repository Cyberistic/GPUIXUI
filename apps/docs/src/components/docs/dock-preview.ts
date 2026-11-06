import {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  clampSize,
  dragSize,
  resizeByKey,
  sizeBounds,
  type DividerKey,
} from "@gpuixui/dock/logic";

export const DOCK_DIVIDER_WIDTH = DIVIDER_WIDTH;

export const DOCK_STEP = DIVIDER_STEP;

export const DOCK_BOUNDS = { min: 220, max: 380 } as const;

export const DOCK_INITIAL = 312;

export interface DockBounds {
  readonly min: number;
  readonly max: number;
}

const boundsOf = (bounds: DockBounds) => sizeBounds(bounds.min, bounds.max);

export const clampWidth = (width: number, bounds: DockBounds): number =>
  clampSize(width, boundsOf(bounds));

export const dragWidth = (
  start: number,
  delta: number,
  bounds: DockBounds,
): number => dragSize(start, delta, boundsOf(bounds));

export const dockKeys = [
  "left",
  "right",
  "home",
  "end",
] as const satisfies ReadonlyArray<DividerKey>;

export type DockKey = (typeof dockKeys)[number];

export const keyWidth = (
  width: number,
  key: DockKey,
  bounds: DockBounds,
): number => resizeByKey(width, key, boundsOf(bounds));

const browserKeys: Readonly<Record<string, DockKey | undefined>> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  Home: "home",
  End: "end",
};

export const dockKeyOf = (key: string): DockKey | undefined => browserKeys[key];

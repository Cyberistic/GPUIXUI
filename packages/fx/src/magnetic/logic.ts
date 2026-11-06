import type { MotionStyle } from "@gpuix/react";

export interface MagneticPointer {
  readonly x: number;
  readonly y: number;
}

export interface MagneticBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MagneticPull {
  readonly left: number;
  readonly top: number;
}

export const magneticStrength = 0.35;

export const magneticReach = 12;

export const magneticRest: MagneticPull = { left: 0, top: 0 };

const usable = (value: number, low: number, fallback: number): number =>
  Number.isFinite(value) && value >= low ? value : fallback;

const between = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const tenth = (value: number): number => Math.round(value * 10) / 10;

export const magneticPull = (
  pointer: MagneticPointer,
  box: MagneticBox,
  strength: number = magneticStrength,
  maxOffset: number = magneticReach,
): MagneticPull => {
  const share = between(usable(strength, 0, magneticStrength), 0, 1);
  const reach = usable(maxOffset, 0, magneticReach);
  const left = between(
    (pointer.x - (box.x + box.width / 2)) * share,
    -reach,
    reach,
  );
  const top = between(
    (pointer.y - (box.y + box.height / 2)) * share,
    -reach,
    reach,
  );
  return { left: tenth(left), top: tenth(top) };
};

export const magneticFrames = (pull: MagneticPull): MotionStyle => ({
  left: pull.left,
  top: pull.top,
});

export const samePull = (a: MagneticPull, b: MagneticPull): boolean =>
  a.left === b.left && a.top === b.top;

export const samePoint = (a: MagneticPointer, b: MagneticPointer): boolean =>
  a.x === b.x && a.y === b.y;

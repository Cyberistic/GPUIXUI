import type { MotionStyle } from "@gpuix/react";

export type LiquidEdge = "left" | "right";

export const liquidOpacity = 0.16;

export const liquidEdge = (
  pointerX: number,
  box: { readonly x: number; readonly width: number },
): LiquidEdge => (pointerX < box.x + box.width / 2 ? "left" : "right");

const span = (full: number): number =>
  Number.isFinite(full) && full > 0 ? full : 0;

export const liquidEmpty = (edge: LiquidEdge, full: number): MotionStyle =>
  edge === "left" ? { left: 0, width: 0 } : { left: span(full), width: 0 };

export const liquidAcross = (full: number): MotionStyle => ({
  left: 0,
  width: span(full),
});

export const liquidFrame = (
  edge: LiquidEdge,
  full: number,
  filled: boolean,
): MotionStyle => (filled ? liquidAcross(full) : liquidEmpty(edge, full));

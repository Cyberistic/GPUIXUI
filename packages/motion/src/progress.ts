export const clamp01 = (value: number): number =>
  Number.isNaN(value) ? 0 : value < 0 ? 0 : value > 1 ? 1 : value;

export const isCurve = (
  value: unknown,
): value is (progress: number) => number => typeof value === "function";

export const eased = (curve: unknown, progress: number): number => {
  const unit = clamp01(progress);
  if (!isCurve(curve)) return unit;
  const value = curve(unit);
  return Number.isFinite(value) ? value : unit;
};

export const mix = (from: number, to: number, progress: number): number => {
  const value = from * (1 - progress) + to * progress;
  if (Number.isFinite(value)) return value;
  return progress < 0.5 ? from : to;
};

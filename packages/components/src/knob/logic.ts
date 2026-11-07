export interface KnobRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export const KNOB_SWEEP = (Math.PI * 3) / 2;
const DRAG_TRAVEL = 160;

const clamp = (value: number, { min, max }: KnobRange): number =>
  Math.min(max, Math.max(min, value));

export const knobAngle = (value: number, range: KnobRange): number => {
  const span = range.max - range.min;
  const share = span <= 0 ? 0 : (clamp(value, range) - range.min) / span;
  return Math.PI * 0.75 + share * KNOB_SWEEP;
};

export const knobDot = (
  value: number,
  range: KnobRange,
  reach: number,
): readonly [number, number] => {
  const angle = knobAngle(value, range);
  return [Math.cos(angle) * reach, Math.sin(angle) * reach];
};

export const knobKey = (
  key: string,
  value: number,
  range: KnobRange,
): number | null => {
  switch (key) {
    case "up":
    case "right":
      return clamp(value + range.step, range);
    case "down":
    case "left":
      return clamp(value - range.step, range);
    case "home":
      return range.min;
    case "end":
      return range.max;
    default:
      return null;
  }
};

export const knobDrag = (
  start: number,
  rise: number,
  range: KnobRange,
): number => {
  const raw = start + (rise / DRAG_TRAVEL) * (range.max - range.min);
  const stepped =
    range.min + Math.round((raw - range.min) / range.step) * range.step;
  return clamp(stepped, range);
};

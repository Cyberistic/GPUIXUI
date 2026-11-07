import * as Option from "effect/Option";

export type StarState = "checked" | "half" | "unchecked";

export interface StarBox {
  readonly x: number;
  readonly width: number;
}

export const starCount = (max: unknown): number =>
  typeof max === "number" && Number.isFinite(max)
    ? Math.max(1, Math.trunc(max))
    : 1;

const snapRating = (value: number, half: boolean): number =>
  half ? Math.round(value * 2) / 2 : Math.trunc(value);

export const clampRating = (
  value: number,
  max: number,
  half = false,
): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(starCount(max), Math.max(0, snapRating(value, half)));
};

export const starFill = (index: number, value: number): number =>
  Math.min(1, Math.max(0, value - (index - 1)));

export const starState = (index: number, value: number): StarState => {
  const fill = starFill(index, value);
  return fill >= 1 ? "checked" : fill > 0 ? "half" : "unchecked";
};

const ARROW_STEPS: Readonly<Record<string, number>> = {
  right: 1,
  up: 1,
  left: -1,
  down: -1,
};

export const decideRating = (
  value: number,
  max: number,
  key: string,
  half = false,
): Option.Option<number> => {
  const limit = starCount(max);
  const place = half ? 0.5 : 1;
  if (key === "home") return Option.some(place);
  if (key === "end") return Option.some(limit);
  if (key === "delete" || key === "backspace") return Option.some(0);
  const step = ARROW_STEPS[key];
  if (step === undefined) return Option.none();
  const current = clampRating(value, limit, half);
  const lower = current === 0 ? 0 : place;
  return Option.some(
    Math.min(
      limit,
      Math.max(lower, clampRating(current + step * place, limit, half)),
    ),
  );
};

export const ratingTabStop = (
  value: number,
  max: number,
  half = false,
): number => {
  const current = clampRating(value, max, half);
  return current === 0 ? 1 : Math.min(starCount(max), Math.ceil(current));
};

export const pointerRating = (
  star: number,
  x: Option.Option<number>,
  box: Option.Option<StarBox>,
  half = false,
): number => {
  if (!half) return star;
  return Option.match(x, {
    onNone: () => star,
    onSome: (pointer) =>
      Option.match(box, {
        onNone: () => star,
        onSome: (target) =>
          target.width > 0 && (pointer - target.x) / target.width < 0.5
            ? Math.max(0.5, star - 0.5)
            : star,
      }),
  });
};

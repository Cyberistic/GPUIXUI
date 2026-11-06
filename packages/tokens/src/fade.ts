import { blend, type ThemeColors } from "./color.js";

export interface FadePair {
  readonly fill: keyof ThemeColors;

  readonly label: keyof ThemeColors;

  readonly over: keyof ThemeColors;
}

export interface FadeFailure extends FadePair {
  readonly ratio: number | undefined;

  readonly floor: number;
}

export const fadedPair = (
  colors: Partial<ThemeColors>,
  { fill, label, over }: FadePair,
  opacity: number,
): {
  readonly label: string | undefined;
  readonly fill: string | undefined;
} => {
  const fillColour = colors[fill];
  const overColour = colors[over];
  const labelColour = colors[label];
  if (
    fillColour === undefined ||
    overColour === undefined ||
    labelColour === undefined
  ) {
    return { label: undefined, fill: undefined };
  }
  const fadedFill = blend(fillColour, overColour, 1 - opacity);
  return {
    label: blend(labelColour, fadedFill, 1 - opacity),
    fill: fadedFill,
  };
};

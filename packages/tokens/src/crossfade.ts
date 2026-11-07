import { measuredColour } from "./measure.js";
import type { Theme } from "./theme.js";

const channels = (
  value: string,
): readonly [number, number, number, number] | undefined => {
  const measured = measuredColour(value);
  if (measured === undefined) return undefined;
  const byte = (at: number) =>
    Number.parseInt(measured.rgb.slice(at, at + 2), 16);
  const alpha =
    measured.alpha === undefined ? 255 : Number.parseInt(measured.alpha, 16);
  return [byte(1), byte(3), byte(5), alpha];
};

const hex = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");

export const mixColor = (from: string, to: string, k: number): string => {
  const a = channels(from);
  const b = channels(to);
  if (a === undefined || b === undefined) return k < 0.5 ? from : to;
  const at = (i: 0 | 1 | 2 | 3) => a[i] + (b[i] - a[i]) * k;
  return `#${hex(at(0))}${hex(at(1))}${hex(at(2))}${hex(at(3))}`;
};

const mixValue = (from: unknown, to: unknown, k: number): unknown => {
  if (typeof from === "string" && typeof to === "string")
    return from === to ? from : mixColor(from, to, k);
  if (typeof from === "number" && typeof to === "number")
    return from + (to - from) * k;
  if (Array.isArray(from) && Array.isArray(to))
    return from.map((value, i) => mixValue(value, to[i], k));
  if (
    typeof from === "object" &&
    from !== null &&
    typeof to === "object" &&
    to !== null
  ) {
    const a = from as Record<string, unknown>;
    const b = to as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(a).map((key) => [
        key,
        key in b ? mixValue(a[key], b[key], k) : a[key],
      ]),
    );
  }
  return k < 0.5 ? from : to;
};

// Ink takes the new theme at once: mixed alongside its surface it would cross it mid-fade and vanish.
const mixColors = (
  from: Theme["colors"],
  to: Theme["colors"],
  k: number,
): Theme["colors"] => {
  const a = from as unknown as Record<string, string>;
  const b = to as unknown as Record<string, string>;
  return Object.fromEntries(
    Object.keys(b).map((role) => {
      const ink = role.toLowerCase().endsWith("foreground");
      return [role, ink ? b[role] : mixValue(a[role], b[role], k)];
    }),
  ) as unknown as Theme["colors"];
};

export const mixThemes = (from: Theme, to: Theme, k: number): Theme => {
  const settled = k <= 0 ? from : k >= 1 ? to : undefined;
  return (
    settled ?? {
      ...to,
      colors: mixColors(from.colors, to.colors, k),
      elevation: mixValue(
        from.elevation,
        to.elevation,
        k,
      ) as Theme["elevation"],
      ...(from.switch !== undefined && to.switch !== undefined
        ? {
            switch: mixValue(from.switch, to.switch, k) as NonNullable<
              Theme["switch"]
            >,
          }
        : {}),
    }
  );
};

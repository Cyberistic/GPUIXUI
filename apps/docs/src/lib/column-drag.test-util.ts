import { readFileSync } from "node:fs";

const read = (path: string): string =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

const fixture = read("apps/playground/src/live/column-resize.ts");
const splitPane = read("apps/playground/src/panels/split-pane.tsx");

const number = (key: string, source: string): number => {
  const field = new RegExp(`\\b${key}: (\\d+),`).exec(source)?.[1];
  const constant = new RegExp(`\\b${key} = (\\d+);`).exec(source)?.[1];
  return Number(field ?? constant ?? Number.NaN);
};

const steps = (() => {
  const source = read("apps/playground/src/live/scenarios.tsx");
  const start = source.indexOf("const columnResizeSteps");
  const end = source.indexOf("The bodies, one per registry id", start + 1);
  return start === -1 || end === -1 ? "" : source.slice(start, end);
})();

const dividerDrags = Array.from(
  steps.matchAll(/host\.drag\(COLUMN_RESIZE_IDS\.divider, (-?\d+), 0\)/g),
).map((match) => Number(match[1] ?? Number.NaN));

const controlDrag = Number(
  /host\.drag\(COLUMN_RESIZE_IDS\.controlDivider, (-?\d+), 0\)/.exec(
    steps,
  )?.[1] ?? Number.NaN,
);

export const columnDrag = {
  opened: number("name", fixture),

  control: number("control", fixture),

  min: number("min", fixture),
  max: number("max", fixture),

  dragSteps: number("DRAG_STEPS", fixture),
  controlMoves: number("CONTROL_MOVES", fixture),

  keyStep: number("SPLIT_KEYBOARD_STEP", splitPane),

  divider: number("divider", fixture),

  drags: dividerDrags,
  controlDrag,

  widths: (() => {
    const clamp = (size: number): number =>
      Math.min(number("max", fixture), Math.max(number("min", fixture), size));
    const [first = Number.NaN, second = Number.NaN, third = Number.NaN] =
      dividerDrags;
    const widened = clamp(number("name", fixture) + first);
    const clamped = clamp(widened + second);
    const measured = clamp(clamped + third);
    return {
      widened,
      clamped,
      measured,
      stepped: measured + number("SPLIT_KEYBOARD_STEP", splitPane),
    };
  })(),
} as const;

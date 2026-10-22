import { readFileSync } from "node:fs";

/**
 * The column drag `column-resize-lifecycle` measured, derived from the probe.
 *
 * Two guards print these widths — the capability record with `/docs/runtime`,
 * and the data-display lane — so they are computed here from the fixture's own
 * numbers and the deltas the probe drives, rather than transcribed. Test-only:
 * the fixture belongs to the playground app, so it is read as source.
 */

const read = (path: string): string =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

const fixture = read("apps/playground/src/live/column-resize.ts");
const splitPane = read("apps/playground/src/panels/split-pane.tsx");

/** A fixture number, from a `key: 1,` field or an `= 1;` constant. */
const number = (key: string, source: string): number => {
  const field = new RegExp(`\\b${key}: (\\d+),`).exec(source)?.[1];
  const constant = new RegExp(`\\b${key} = (\\d+);`).exec(source)?.[1];
  return Number(field ?? constant ?? Number.NaN);
};

/** The `columnResizeSteps` effect, which drives every gesture. */
const steps = (() => {
  const source = read("apps/playground/src/live/scenarios.tsx");
  const start = source.indexOf("const columnResizeSteps");
  const end = source.indexOf("The bodies, one per registry id", start + 1);
  return start === -1 || end === -1 ? "" : source.slice(start, end);
})();

/** The deltas the probe drags the resizable divider by, in order. */
const dividerDrags = Array.from(
  steps.matchAll(/host\.drag\(COLUMN_RESIZE_IDS\.divider, (-?\d+), 0\)/g),
).map((match) => Number(match[1] ?? Number.NaN));

/** The move-only control's drag, the negative control. */
const controlDrag = Number(
  /host\.drag\(COLUMN_RESIZE_IDS\.controlDivider, (-?\d+), 0\)/.exec(
    steps,
  )?.[1] ?? Number.NaN,
);

/** One number per gesture, as the fixture's sweep of the probe's own bounds. */
export const columnDrag = {
  /** The width the grid opens at. */
  opened: number("name", fixture),
  /** The move-only control's column, which a drag must not change. */
  control: number("control", fixture),
  /** The narrowest and widest the dragged column may become. */
  min: number("min", fixture),
  max: number("max", fixture),
  /** The moves one drag delivers, and the ones a move-only divider hears. */
  dragSteps: number("DRAG_STEPS", fixture),
  controlMoves: number("CONTROL_MOVES", fixture),
  /** One arrow press on a focused divider. */
  keyStep: number("SPLIT_KEYBOARD_STEP", splitPane),
  /** The divider's own box, the thing a captured drag leaves. */
  divider: number("divider", fixture),
  /** The three drags the probe makes, and the control's. */
  drags: dividerDrags,
  controlDrag,
  /** The width after each gesture: the fixture's clamp over the probe's deltas. */
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

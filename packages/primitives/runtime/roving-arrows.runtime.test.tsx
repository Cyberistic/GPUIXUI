/**
 * The roving-cursor contract, across every composite that moves focus with the
 * arrow keys.
 *
 * **The bug guarded (plan `359`).** A roving composite has two positions: the
 * committed value and the keyboard's cursor (the ring). They agree while the
 * parent applies each reported change, and diverge when a controlled parent
 * defers or rejects one — a scenario plan `353` already treats as supported.
 * Movement started from the **value-derived tab stop**, so the second arrow
 * repeated the first move: with `value="a"` and a no-op `onValueChange`, `Down`
 * twice left focus on Beta, and `Rating`/`ToggleGroup` behaved the same way.
 * The class was invisible because every existing test applied the change (so the
 * two positions never diverged) or drove a single key.
 *
 * Every case here uses a deferring parent on purpose, and delivers each key to
 * the element the component says holds focus — so a component that stops moving
 * focus fails by case name.
 *
 * Out of scope, by design: `CheckboxGroup` has one tab stop per row and no arrow
 * contract; `Slider`/`RangeSlider` arrows step a single value whose thumb is the
 * paint, so there is no separate cursor to diverge; `Select`'s list keyboard is
 * the runtime's.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import type { Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const THREE = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

const ALIGN = [
  { value: "left", label: "Left" },
  { value: "centre", label: "Centre" },
  { value: "right", label: "Right" },
] as const;

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "none");

/**
 * Deliver each key to the element that currently holds focus.
 *
 * `keyDown` focuses its target first, so feeding it the component's own focus
 * result makes the sequence a real keyboard walk: if the component never moved
 * focus, the next key would land where the user's would not.
 */
const walk = (
  runtime: Runtime,
  startId: string,
  keys: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.map(keys, (key) => {
    const before = focused(runtime);
    runtime.keyDown(before === "none" ? startId : before, key);
    return focused(runtime);
  });

it("continues a radio group's arrows from the focused option", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Choice"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={THREE}
    />,
  );
  const moved = walk(runtime, "rg-a", ["down", "down", "down"]);
  expect(moved).toStrictEqual(["rg-b", "rg-c", "rg-a"]);
  // Focus wraps; the wrap reports nothing because the parent still holds "a",
  // and the one controlled rule never reports a value that did not change.
  expect(reports).toStrictEqual(["b", "c"]);
});

it("still skips a disabled radio from the focused option", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <RadioGroup
      testId="rg"
      label="Choice"
      value="a"
      onValueChange={(value) => reports.push(value)}
      options={[
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta", disabled: true },
        { value: "c", label: "Gamma" },
      ]}
    />,
  );
  expect(walk(runtime, "rg-a", ["down"])).toStrictEqual(["rg-c"]);
  expect(reports).toStrictEqual(["c"]);
});

it("continues a single toggle group's arrows from the focused item", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Alignment"
      value="left"
      onValueChange={(value) => reports.push(value)}
      options={ALIGN}
    />,
  );
  const moved = walk(runtime, "tg-left", ["right", "right", "right"]);
  expect(moved).toStrictEqual(["tg-centre", "tg-right", "tg-left"]);
  // The wrap lands back on the value the parent still holds, so it reports
  // nothing; the ring still moved (asserted above).
  expect(reports).toStrictEqual(["centre", "right"]);
});

it("moves a multiple toggle group's focus without reporting a press", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="multiple"
      testId="tg"
      label="Formatting"
      onValueChange={(values) => reports.push(String(values))}
      options={ALIGN}
    />,
  );
  expect(walk(runtime, "tg-left", ["right", "right"])).toStrictEqual([
    "tg-centre",
    "tg-right",
  ]);
  expect(reports).toStrictEqual([]);
});

it("continues the rating's arrows from the focused star", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <Rating
      testId="ra"
      label="Quality"
      value={2}
      onValueChange={(value) => reports.push(String(value))}
    />,
  );
  const moved = walk(runtime, "ra-star-2", ["right", "right", "left"]);
  expect(moved).toStrictEqual(["ra-star-3", "ra-star-4", "ra-star-3"]);
  expect(reports).toStrictEqual(["3", "4", "3"]);
});

it("commits star 1 from an unrated rating, then moves on", async () => {
  // The access path plan `359` adds: the unrated tab stop is star 1 but star 1
  // is not selected, so Space is how a keyboard user chooses it; the arrows
  // continue from the ring afterwards.
  const reports: string[] = [];
  const runtime = await mount(
    <Rating
      testId="ra"
      label="Quality"
      value={0}
      onValueChange={(value) => reports.push(String(value))}
    />,
  );
  runtime.keyDown("ra-star-1", "space");
  runtime.keyUp("ra-star-1", "space");
  expect(reports).toStrictEqual(["1"]);
  expect(walk(runtime, "ra-star-1", ["right"])).toStrictEqual(["ra-star-2"]);
  expect(reports).toStrictEqual(["1", "2"]);
});

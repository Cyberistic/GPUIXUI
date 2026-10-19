/**
 * The focus ring and keyboard cursor of a roving composite must not outlive
 * focus.
 *
 * **The bug guarded (plan `601`).** `ToggleGroup`, `RadioGroup` and `Rating`
 * keep their cursor in React state written by `onFocus` and cleared by
 * `onBlur`. The pinned 0.10.0 release build moves focus but dispatches neither
 * event (plan `583`), so the state was never cleared: after focus left the
 * group, its last item kept painting a focus ring (a second, false focus
 * indicator), and a `RadioGroup` whose controlled parent defers resumed its
 * arrow walk from the abandoned item instead of from the tab stop it returned
 * to. `CheckboxGroup` is the control — its only focus source is the native
 * tracker, so it was immune by accident. `RangeSlider` (plan `602`) had the
 * same defect one component later: its thumbs hand-rolled the id map, event
 * cursor and tracker merge, so a thumb the user had left kept a second ring.
 * Every focus owner now uses `useRovingFocus` or `useFocus`.
 *
 * Each case waits for the tracker's sample (`settleFocus`), because the clear
 * is a sample-driven effect and the tracker polls every 50 ms.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { RangeSlider } from "../src/components/Slider.js";
import { Stack } from "../src/components/Stack.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import type { Runtime } from "../src/testing/index.js";
import { isFocusRing, isWithin } from "../src/testing/index.js";
import { Surface, openWindow, settleFocus } from "./fixture.js";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

/** How many focus rings the window paints. */
const ringCount = (runtime: Runtime): number =>
  Arr.length(
    Arr.filter(runtime.all(), (element) =>
      isFocusRing(element.style.boxShadow),
    ),
  );

/** Whether any ring is painted inside the element carrying `testId`. */
const ringWithin = (runtime: Runtime, testId: string): boolean => {
  const root = Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`no element ${testId}`),
  );
  return Arr.some(
    runtime.all(),
    (element) =>
      isFocusRing(element.style.boxShadow) &&
      isWithin(runtime, element, root.id),
  );
};

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

/** Move focus inside, leave the composite, and wait for the tracker's sample. */
const leave = async (runtime: Runtime): Promise<void> => {
  runtime.click("before");
  await settleFocus();
};

const before = <Button testId="before">Before</Button>;

it("clears a multiple ToggleGroup's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Format"
        options={OPTIONS}
      />
    </Stack>,
  );
  runtime.keyDown("tg", "right");
  await settleFocus();
  expect(ringWithin(runtime, "tg-b")).toBe(true);
  await leave(runtime);
  expect(focused(runtime)).toBe("before");
  expect(ringWithin(runtime, "tg-b")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("clears a RadioGroup's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <RadioGroup testId="rg" label="Choice" options={OPTIONS} />
    </Stack>,
  );
  runtime.keyDown("rg", "down");
  await settleFocus();
  expect(focused(runtime)).toBe("rg-b");
  expect(ringWithin(runtime, "rg-b")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "rg-b")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("clears a Rating's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <Rating testId="rating" label="Quality" defaultValue={2} />
    </Stack>,
  );
  runtime.keyDown("rating", "right");
  await settleFocus();
  expect(focused(runtime)).toBe("rating-star-3");
  expect(ringWithin(runtime, "rating-star-3")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "rating-star-3")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("clears a RangeSlider thumb's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <RangeSlider testId="rs" label="Band" defaultValue={[20, 60]} />
    </Stack>,
  );
  runtime.click("rs");
  await settleFocus();
  expect(ringWithin(runtime, "rs-thumb-end")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "rs-thumb-end")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("keeps a CheckboxGroup row plain after focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <CheckboxGroup testId="cg" label="Columns" options={OPTIONS} />
    </Stack>,
  );
  runtime.click("cg-c");
  await settleFocus();
  expect(ringWithin(runtime, "cg-c")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "cg-c")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("restarts a deferred radio walk from the tab stop, not the abandoned item", async () => {
  // The parent keeps "a" no matter what the group reports, so the value-derived
  // tab stop stays Alpha while the cursor moves to Beta (plan `359`).
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <RadioGroup
        testId="rg"
        label="Choice"
        options={OPTIONS}
        value="a"
        onValueChange={() => {}}
      />
    </Stack>,
  );
  runtime.keyDown("rg", "down");
  await settleFocus();
  expect(focused(runtime)).toBe("rg-b");
  await leave(runtime);
  runtime.focusNext();
  expect(focused(runtime)).toBe("rg-a");
  runtime.keyDown("rg", "down");
  expect(focused(runtime)).toBe("rg-b");
});

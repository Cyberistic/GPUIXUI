/**
 * The slider family's read-only state, in the real GPUix runtime.
 *
 * The bug guarded (plan `802`): `Slider` and `RangeSlider` were the last
 * value-bearing Tier 1 controls with only `disabled`, which fades the track and
 * removes it from the tab order. A review form therefore could not show a
 * configured value to a keyboard or screen-reader user. `readOnly` keeps the
 * tab stops, names, announced values and thumb rings, refuses pointer gestures,
 * keys and commits — and a press focuses the control without moving the value.
 *
 * Each case records both callbacks; the writable twins prove the same gesture
 * reports on a normal slider, so a probe that clicked outside the track cannot
 * pass.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Stack } from "../src/components/Stack.js";
import { sliderInset } from "../src/core/index.js";
import {
  a11yValueOf,
  isFocusRing,
  type Runtime,
} from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow, testTheme } from "./fixture.js";

const INSET = sliderInset("md", testTheme);

/** The `testId` of whatever holds native focus, or a failure naming the case. */
const focusedId = (runtime: Runtime, what: string): string =>
  Option.getOrElse(runtime.focused(), () => expect.fail(what));

/** A point at `fraction` of the track's usable span. */
const pointAt = (
  runtime: Runtime,
  testId: string,
  fraction: number,
): { readonly x: number; readonly y: number } => {
  const box = Option.getOrElse(runtime.paintBounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );
  return {
    x: box.x + INSET + fraction * (box.width - 2 * INSET),
    y: box.y + box.height / 2,
  };
};

/** The value announced for a named slider, or a failure naming it. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { role: "Slider", label }), () =>
    expect.fail(`no slider announced ${label}`),
  );

/** A painted thumb's ring, as the runtime reported it. */
const ringed = (runtime: Runtime, testId: string): boolean =>
  Option.exists(runtime.element(testId), (element) =>
    isFocusRing(element.style.boxShadow),
  );

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const recorder = <A,>(): {
  readonly seen: Array<A>;
  readonly report: (value: A) => void;
} => {
  const seen: Array<A> = [];
  return { seen, report: (value) => seen.push(value) };
};

it("a read-only Slider keeps its tab stop, ring and announced value", async () => {
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <Slider testId="s" label="Volume" defaultValue={62} readOnly />
      <Button testId="after">Next</Button>
    </Stack>,
  );
  runtime.focusNext();
  expect(focusedId(runtime, "the read-only slider took no focus")).toBe("s");
  await awaitFrame(
    () => ringed(runtime, "s-thumb"),
    "the read-only slider's thumb ring",
  );
  const track = Option.getOrElse(runtime.element("s"), () =>
    expect.fail("the read-only slider painted no track"),
  );
  expect(track.style.cursor).toBe("default");
  expect(track.style.opacity).toBeUndefined();
  expect(announced(runtime, "Volume")).toBe("62");

  runtime.focusNext();
  expect(
    focusedId(runtime, "the read-only slider did not leave the tab order"),
  ).toBe("after");
});

it("a read-only Slider refuses a click, a drag and every key, and commits nothing", async () => {
  const values = recorder<number>();
  const commits = recorder<number>();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={62}
      readOnly
      onValueChange={values.report}
      onValueCommit={commits.report}
    />,
  );
  const start = pointAt(runtime, "s", 0.25);
  runtime.clickAt(start.x, start.y);
  const end = pointAt(runtime, "s", 0.75);
  runtime.mouseDownAt(start.x, start.y);
  runtime.mouseMoveAt(end.x, end.y, 0);
  runtime.mouseUpAt(end.x, end.y);
  Arr.forEach(["right", "up", "pageup", "home", "end"], (key) => {
    runtime.keyDown("s", key);
    runtime.keyUp("s", key);
  });
  runtime.flush();

  expect(values.seen).toStrictEqual([]);
  expect(commits.seen).toStrictEqual([]);
  expect(announced(runtime, "Volume")).toBe("62");
});

it("the same Slider without readOnly reports a click and a key", async () => {
  const values = recorder<number>();
  const commits = recorder<number>();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={62}
      onValueChange={values.report}
      onValueCommit={commits.report}
    />,
  );
  const point = pointAt(runtime, "s", 0.25);
  runtime.clickAt(point.x, point.y);
  runtime.keyDown("s", "right");
  expect(values.seen).toStrictEqual([25, 26]);
  expect(commits.seen).toStrictEqual([25, 26]);
});

it("a primary press focuses a read-only Slider without moving it", async () => {
  const values = recorder<number>();
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <Button testId="before">Before</Button>
      <Slider
        testId="s"
        label="Volume"
        defaultValue={62}
        readOnly
        onValueChange={values.report}
      />
    </Stack>,
  );
  runtime.focusNext();
  expect(focusedId(runtime, "the sentinel took no focus")).toBe("before");
  const point = pointAt(runtime, "s", 0.5);
  runtime.clickAt(point.x, point.y);
  runtime.flush();
  expect(
    focusedId(runtime, "the read-only slider took no focus on a press"),
  ).toBe("s");
  expect(values.seen).toStrictEqual([]);
  expect(announced(runtime, "Volume")).toBe("62");
});

it("a read-only RangeSlider keeps both tab stops and refuses both ends", async () => {
  const values = recorder<readonly [number, number]>();
  const commits = recorder<readonly [number, number]>();
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <RangeSlider
        testId="r"
        label="Band"
        defaultValue={[20, 80]}
        readOnly
        onValueChange={values.report}
        onValueCommit={commits.report}
      />
      <Button testId="after">Next</Button>
    </Stack>,
  );
  runtime.focusNext();
  expect(focusedId(runtime, "the start thumb took no focus")).toBe(
    "r-thumb-start",
  );
  runtime.focusNext();
  expect(focusedId(runtime, "the end thumb took no focus")).toBe("r-thumb-end");
  await awaitFrame(
    () => ringed(runtime, "r-thumb-end"),
    "the read-only range's focused thumb ring",
  );
  runtime.focusNext();
  expect(
    focusedId(runtime, "the read-only range did not leave the tab order"),
  ).toBe("after");

  Arr.forEach(["r-thumb-start", "r-thumb-end"], (thumb) => {
    runtime.keyDown(thumb, "left");
    runtime.keyUp(thumb, "left");
    runtime.keyDown(thumb, "end");
    runtime.keyUp(thumb, "end");
  });
  const low = pointAt(runtime, "r", 0.1);
  runtime.clickAt(low.x, low.y);
  runtime.flush();
  // A press is focus, not a gesture: it lands on the nearest thumb.
  expect(focusedId(runtime, "the low press focused no thumb")).toBe(
    "r-thumb-start",
  );
  const high = pointAt(runtime, "r", 0.9);
  runtime.clickAt(high.x, high.y);
  runtime.flush();

  expect(values.seen).toStrictEqual([]);
  expect(commits.seen).toStrictEqual([]);
  expect(announced(runtime, "Band minimum")).toBe("20");
  expect(announced(runtime, "Band maximum")).toBe("80");
  expect(focusedId(runtime, "the high press focused no thumb")).toBe(
    "r-thumb-end",
  );
});

it("the same RangeSlider without readOnly moves both ends", async () => {
  const values = recorder<readonly [number, number]>();
  const runtime = await mount(
    <RangeSlider
      testId="r"
      label="Band"
      defaultValue={[20, 80]}
      onValueChange={values.report}
    />,
  );
  const low = pointAt(runtime, "r", 0.1);
  runtime.clickAt(low.x, low.y);
  const high = pointAt(runtime, "r", 0.9);
  runtime.clickAt(high.x, high.y);
  expect(values.seen).toStrictEqual([
    [10, 80],
    [10, 90],
  ]);
});

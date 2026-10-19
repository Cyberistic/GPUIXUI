/**
 * The value controls in the real GPUix runtime.
 *
 * These are the Tier 1 components whose core interaction **only exists here**:
 * there is no slider host element, so the thumb's position, the pointer-to-value
 * mapping, the focus ring and the two-thumb crossing rule are this package's
 * geometry painted by the real layout engine. The element-tree suite can see the
 * props; only this suite can see that a click at 25% of the track reports 25,
 * that the thumb is centred on the value it represents, and that a disabled
 * slider is out of the tab order.
 *
 * Each test names the defect it guards — most importantly the negative-margin
 * thumb geometry (plan 053 §6), which is the one assumption a style resolver
 * cannot prove.
 */

import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Meter } from "../src/components/Meter.js";
import { Rating } from "../src/components/Rating.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Stack } from "../src/components/Stack.js";
import { sliderInset } from "../src/core/index.js";
import { a11yNode, a11yValueOf, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow, settleFocus, testTheme } from "./fixture.js";

const INSET = sliderInset("md", testTheme);

/**
 * The painted box: the runtime reports a plain `div` from its content origin,
 * and every box this file measures is a slider track or thumb (plan `597`).
 */
const boundsOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(runtime.paintBounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const elementById = (runtime: Runtime, id: number) =>
  Option.getOrElse(Option.fromNullishOr(runtime.renderer.getElement(id)), () =>
    expect.fail(`element ${id} vanished`),
  );

const trackOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`the runtime retained no ${testId}`),
  );

/** The rail is the track's only child; the fill and thumbs live inside it. */
const partsOf = (runtime: Runtime, testId: string) => {
  const rail = elementById(runtime, trackOf(runtime, testId).children[0] ?? -1);
  return rail.children.map((id) => elementById(runtime, id));
};

const thumbOf = (runtime: Runtime, testId: string) => {
  const parts = partsOf(runtime, testId);
  const index = parts.length === 2 ? 1 : 3;
  return parts[index] ?? expect.fail(`${testId} paints no thumb`);
};

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

/** The centre of a thumb, as the frame painted it. */
const thumbCentre = (runtime: Runtime, testId: string): number => {
  const thumb = thumbOf(runtime, testId);
  const bounds = Option.getOrElse(runtime.paintBoundsOfId(thumb.id), () =>
    expect.fail(`the thumb of ${testId} painted no box`),
  );
  return bounds.x + bounds.width / 2;
};

/** A point at `fraction` of the track's usable span. */
const pointAt = (
  runtime: Runtime,
  testId: string,
  fraction: number,
): { readonly x: number; readonly y: number } => {
  const box = boundsOf(runtime, testId);
  return {
    x: box.x + INSET + fraction * (box.width - 2 * INSET),
    y: box.y + box.height / 2,
  };
};

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const values = (): {
  readonly seen: Array<number>;
  readonly onValueChange: (value: number) => void;
} => {
  const seen: Array<number> = [];
  return { seen, onValueChange: (value) => seen.push(value) };
};

it("maps a real click to the value under the pointer", async () => {
  const { seen, onValueChange } = values();
  const runtime = await mount(
    <Slider testId="s" label="Volume" onValueChange={onValueChange} />,
  );
  const point = pointAt(runtime, "s", 0.25);
  runtime.clickAt(point.x, point.y);
  expect(seen.at(-1)).toBe(25);
  expect(announced(runtime, "Volume")).toBe("25");
});

it("clamps a press in the track's inset to its nearest end", async () => {
  const { seen, onValueChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={50}
      onValueChange={onValueChange}
    />,
  );
  const box = boundsOf(runtime, "s");
  runtime.clickAt(box.x + 1, box.y + box.height / 2);
  expect(seen.at(-1)).toBe(0);
  runtime.clickAt(box.x + box.width - 1, box.y + box.height / 2);
  expect(seen.at(-1)).toBe(100);
});

it("moves by a step, a page and to the ends with the keyboard", async () => {
  const runtime = await mount(
    <Slider testId="s" label="Volume" defaultValue={50} />,
  );
  runtime.keyDown("s", "right");
  expect(announced(runtime, "Volume")).toBe("51");
  runtime.keyDown("s", "pageup");
  expect(announced(runtime, "Volume")).toBe("61");
  runtime.keyDown("s", "home");
  expect(announced(runtime, "Volume")).toBe("0");
  runtime.keyDown("s", "end");
  expect(announced(runtime, "Volume")).toBe("100");
});

it("refuses a press and a key while disabled, and stays out of the tab order", async () => {
  const { seen, onValueChange } = values();
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="b">Before</Button>
      <Slider
        testId="s"
        label="Volume"
        disabled
        onValueChange={onValueChange}
      />
    </Stack>,
  );
  const point = pointAt(runtime, "s", 0.5);
  runtime.clickAt(point.x, point.y);
  runtime.keyDown("s", "right");
  expect(seen).toStrictEqual([]);
  // The bug guarded: a disabled slider that is still a tab stop looks enabled to
  // a keyboard user, who then lands on it and presses keys that do nothing.
  runtime.click("b");
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("b"));
});

it("paints the thumb centred on the value it represents", async () => {
  // The negative-margin geometry: with the margins dropped the thumb sits half a
  // thumb to the right of the fill's end. 1 px of slop is the layout engine's
  // rounding, not a tolerance for a wrong formula.
  const runtime = await mount(
    <Stack direction="column" gap="md">
      {[0, 50, 100].map((value) => (
        <Slider
          key={value}
          testId={`s${value}`}
          value={value}
          onValueChange={() => {}}
          label={`Value ${value}`}
        />
      ))}
    </Stack>,
  );
  Arr.forEach([0, 50, 100], (value) => {
    const box = boundsOf(runtime, `s${value}`);
    const expected = box.x + INSET + (value / 100) * (box.width - 2 * INSET);
    expect(Math.abs(thumbCentre(runtime, `s${value}`) - expected)).toBeLessThan(
      2,
    );
  });
});

it("rings the focused thumb and clears it when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="b">Elsewhere</Button>
      <Slider testId="s" label="Volume" />
    </Stack>,
  );
  const ringed = (): boolean =>
    Option.isSome(Option.fromNullishOr(thumbOf(runtime, "s").style.boxShadow));
  runtime.click("s");
  runtime.flush();
  await settleFocus();
  expect(ringed()).toBe(true);
  runtime.click("b");
  runtime.flush();
  await settleFocus();
  expect(ringed()).toBe(false);
});

it("keeps tracking a drag after the pointer leaves the track", async () => {
  // The guarded behaviour: the runtime captures the pressed element, so a drag
  // is not limited to the track's own paint box. Without the move handler (or
  // with a handler that checks where the pointer is), leaving the track would
  // freeze the value at the last inside position.
  const { seen, onValueChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={25}
      onValueChange={onValueChange}
    />,
  );
  const box = boundsOf(runtime, "s");
  const start = pointAt(runtime, "s", 0.25);
  runtime.mouseDownAt(start.x, start.y);
  const end = pointAt(runtime, "s", 0.6);
  runtime.mouseMoveAt(end.x, box.y + box.height + 80, 0);
  runtime.mouseUpAt(end.x, box.y + box.height + 80);
  expect(seen.at(-1)).toBe(60);
  expect(announced(runtime, "Volume")).toBe("60");
});

it("clamps a drag that runs past either end", async () => {
  const { seen, onValueChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={50}
      onValueChange={onValueChange}
    />,
  );
  const box = boundsOf(runtime, "s");
  const middle = pointAt(runtime, "s", 0.5);
  runtime.mouseDownAt(middle.x, middle.y);
  runtime.mouseMoveAt(box.x + box.width + 120, middle.y, 0);
  expect(seen.at(-1)).toBe(100);
  runtime.mouseMoveAt(box.x - 120, middle.y, 0);
  expect(seen.at(-1)).toBe(0);
  runtime.mouseUpAt(box.x - 120, middle.y);
});

it("refuses a non-primary press, and a left click still moves the value", async () => {
  // The bug guarded: a press on any button started a gesture, so a right or
  // middle click moved the value (measured 25 → 75 in plan 063 §0.2).
  const { seen, onValueChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={25}
      onValueChange={onValueChange}
    />,
  );
  const point = pointAt(runtime, "s", 0.75);
  runtime.renderer.nativeSimulateMouseDown(point.x, point.y, 2);
  runtime.renderer.nativeSimulateMouseUp(point.x, point.y, 2);
  runtime.renderer.nativeSimulateMouseDown(point.x, point.y, 1);
  runtime.renderer.nativeSimulateMouseUp(point.x, point.y, 1);
  expect(seen).toStrictEqual([]);
  expect(announced(runtime, "Volume")).toBe("25");
  runtime.clickAt(point.x, point.y);
  expect(seen.at(-1)).toBe(75);
});

it("moves the nearer end of a range when its track is pressed", async () => {
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[20, 60] as const} />,
  );
  const left = pointAt(runtime, "r", 0.1);
  runtime.clickAt(left.x, left.y);
  expect(announced(runtime, "Price minimum")).toBe("10");
  expect(announced(runtime, "Price maximum")).toBe("60");
  const right = pointAt(runtime, "r", 0.9);
  runtime.clickAt(right.x, right.y);
  expect(announced(runtime, "Price minimum")).toBe("10");
  expect(announced(runtime, "Price maximum")).toBe("90");
});

it("focuses the thumb it moved, and an arrow moves only that end", async () => {
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[20, 60] as const} />,
  );
  const right = pointAt(runtime, "r", 0.9);
  runtime.clickAt(right.x, right.y);
  runtime.flush();
  const focusedLabel = Option.getOrElse(
    Option.map(runtime.focusedElement(), (element) =>
      String(element.customProps?.["aria-label"] ?? ""),
    ),
    () => expect.fail("no thumb took focus"),
  );
  expect(focusedLabel).toBe("Price maximum");
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("no element holds focus"),
  );
  runtime.renderer.nativeSimulateKeyDown(focused.id, "left");
  expect(announced(runtime, "Price maximum")).toBe("89");
  expect(announced(runtime, "Price minimum")).toBe("20");
});

it("keeps dragging a range end after the pointer leaves the track", async () => {
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[20, 60] as const} />,
  );
  const box = boundsOf(runtime, "r");
  const start = pointAt(runtime, "r", 0.2);
  runtime.mouseDownAt(start.x, start.y);
  const end = pointAt(runtime, "r", 0.4);
  runtime.mouseMoveAt(end.x, box.y + box.height + 80, 0);
  runtime.mouseUpAt(end.x, box.y + box.height + 80);
  expect(announced(runtime, "Price minimum")).toBe("40");
  expect(announced(runtime, "Price maximum")).toBe("60");
});

it("does not report a press that lands on the value already there", async () => {
  // Plan 373: each range gesture built a fresh tuple, so `useControlState`'s
  // `Object.is` guard never saw the no-op — measured before the fix, a second
  // press at the same point reported `[20, 91]` again and a press plus a 1 px
  // move reported four times for one change.
  const onValueChange = vi.fn();
  const runtime = await mount(
    <RangeSlider
      testId="r"
      label="Price"
      defaultValue={[20, 60] as const}
      onValueChange={onValueChange}
    />,
  );
  const point = pointAt(runtime, "r", 0.9);
  runtime.clickAt(point.x, point.y);
  expect(onValueChange).toHaveBeenCalledTimes(1);
  expect(onValueChange).toHaveBeenLastCalledWith([20, 90]);
  runtime.clickAt(point.x, point.y);
  expect(onValueChange).toHaveBeenCalledTimes(1);
  runtime.mouseDownAt(point.x, point.y);
  runtime.mouseMoveAt(point.x + 1, point.y, 0);
  runtime.mouseUpAt(point.x + 1, point.y);
  expect(onValueChange).toHaveBeenCalledTimes(1);
  expect(onValueChange).toHaveBeenLastCalledWith([20, 90]);
});

it("does not report a key that cannot move its end", async () => {
  // The same no-op, by keyboard: `End` at the maximum rebuilt the pair and
  // reported again (measured: 3 calls for one real change).
  const onValueChange = vi.fn();
  const runtime = await mount(
    <RangeSlider
      testId="r"
      label="Price"
      defaultValue={[20, 60] as const}
      onValueChange={onValueChange}
    />,
  );
  const point = pointAt(runtime, "r", 0.9);
  runtime.clickAt(point.x, point.y);
  runtime.flush();
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("no thumb took focus"),
  );
  runtime.renderer.nativeSimulateKeyDown(focused.id, "end");
  expect(onValueChange).toHaveBeenCalledTimes(2);
  expect(onValueChange).toHaveBeenLastCalledWith([20, 100]);
  runtime.renderer.nativeSimulateKeyDown(focused.id, "end");
  expect(onValueChange).toHaveBeenCalledTimes(2);
});

it("refuses a non-primary press on a range and moves no focus", async () => {
  // The guarded bug: a right click moved the nearer end and called
  // `focusElement` on its thumb (measured to `"Price maximum"` in plan 063 §0.2).
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[20, 60] as const} />,
  );
  const point = pointAt(runtime, "r", 0.9);
  runtime.renderer.nativeSimulateMouseDown(point.x, point.y, 2);
  runtime.renderer.nativeSimulateMouseUp(point.x, point.y, 2);
  expect(announced(runtime, "Price minimum")).toBe("20");
  expect(announced(runtime, "Price maximum")).toBe("60");
  expect(runtime.focusedElement()).toStrictEqual(Option.none());
});

it("never lets the two ends cross", async () => {
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[0, 0] as const} />,
  );
  // Both thumbs at the start: a press beyond them must grab the end, not the
  // start that cannot move right.
  const right = pointAt(runtime, "r", 0.9);
  runtime.clickAt(right.x, right.y);
  expect(announced(runtime, "Price maximum")).toBe("90");
  // A start dragged past the end stops on it instead of swapping the pair.
  const left = pointAt(runtime, "r", 0.01);
  runtime.mouseDownAt(left.x, left.y);
  const past = pointAt(runtime, "r", 0.95);
  runtime.mouseMoveAt(past.x, past.y, 0);
  runtime.mouseUpAt(past.x, past.y);
  expect(announced(runtime, "Price minimum")).toBe("90");
  expect(announced(runtime, "Price maximum")).toBe("90");
});

it("clamps an infinity to its own bound in every value control", async () => {
  // The bug guarded (plan 637): `core/value.ts` collapsed every non-finite
  // number into the `NaN` branch, so `+Infinity` painted the *minimum* on a
  // slider, range slider and meter (announced `"0"`) while `Progress` and
  // `NumberField` clamped to the maximum; `Rating` read it as unrated.
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <Slider testId="high" label="High" value={Number.POSITIVE_INFINITY} />
      <RangeSlider
        testId="band"
        label="Band"
        value={[0, Number.POSITIVE_INFINITY] as const}
      />
      <Meter testId="disk" label="Disk" value={Number.POSITIVE_INFINITY} />
      <Rating testId="stars" label="Stars" value={Number.POSITIVE_INFINITY} />
    </Stack>,
  );
  expect(announced(runtime, "High")).toBe("100");
  expect(announced(runtime, "Band maximum")).toBe("100");
  expect(announced(runtime, "Disk")).toBe("100");
  expect(announced(runtime, "5 of 5")).toBe("checked");
  const meter = boundsOf(runtime, "disk");
  const fill = elementById(runtime, trackOf(runtime, "disk").children[0] ?? -1);
  const fillBox = Option.getOrElse(runtime.paintBoundsOfId(fill.id), () =>
    expect.fail("the meter painted no fill"),
  );
  expect(Math.abs(fillBox.width - meter.width)).toBeLessThan(2);

  runtime.render(
    <Surface>
      <Stack direction="column" gap="md">
        <Slider testId="low" label="Low" value={Number.NEGATIVE_INFINITY} />
        <RangeSlider
          testId="low-band"
          label="Low band"
          value={[Number.NEGATIVE_INFINITY, 50] as const}
        />
        <Meter
          testId="low-disk"
          label="Low disk"
          value={Number.NEGATIVE_INFINITY}
        />
        <Rating
          testId="low-stars"
          label="Low stars"
          value={Number.NEGATIVE_INFINITY}
        />
      </Stack>
    </Surface>,
  );
  expect(announced(runtime, "Low")).toBe("0");
  expect(announced(runtime, "Low band minimum")).toBe("0");
  expect(announced(runtime, "Low disk")).toBe("0");
  expect(announced(runtime, "1 of 5")).toBe("unchecked");
});

it("announces a meter's measurement and paints it inside its own range", async () => {
  const runtime = await mount(
    <Meter testId="m" label="Disk" value={25} min={0} max={50} />,
  );
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "Meter", label: "Disk" })),
  ).toBe(true);
  expect(announced(runtime, "Disk")).toBe("25");
  const track = boundsOf(runtime, "m");
  const fill = elementById(runtime, trackOf(runtime, "m").children[0] ?? -1);
  const fillBox = Option.getOrElse(runtime.paintBoundsOfId(fill.id), () =>
    expect.fail("the meter painted no fill"),
  );
  expect(Math.abs(fillBox.width - track.width / 2)).toBeLessThan(2);
});

it("keeps a meter out of the tab order", async () => {
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="b">Before</Button>
      <Meter testId="m" label="Disk" value={10} />
    </Stack>,
  );
  runtime.click("b");
  runtime.focusNext();
  expect(runtime.focused()).toStrictEqual(Option.some("b"));
});

it("paints the maximum of a step that does not divide the span", async () => {
  // The bug guarded (plan 331 §1): a value of 10 with step 3 snapped back to
  // the last grid stop, so `value={max}` painted the same 1116 px fill as 9.
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <Slider testId="nine" label="Nine" min={0} max={10} step={3} value={9} />
      <Slider testId="ten" label="Ten" min={0} max={10} step={3} value={10} />
    </Stack>,
  );
  const fillWidth = (testId: string): number => {
    const fill = partsOf(runtime, testId)[0];
    if (fill === undefined) return expect.fail(`${testId} painted no fill`);
    return Option.getOrElse(runtime.paintBoundsOfId(fill.id), () =>
      expect.fail(`${testId} painted no fill box`),
    ).width;
  };
  expect(fillWidth("ten")).toBeGreaterThan(fillWidth("nine"));
  expect(announced(runtime, "Ten")).toBe("10");
});

it("walks the stop list with the keyboard at a coarse step", async () => {
  const runtime = await mount(
    <Slider
      testId="s"
      label="Coarse"
      min={0}
      max={10}
      step={3}
      defaultValue={0}
    />,
  );
  runtime.keyDown("s", "end");
  expect(announced(runtime, "Coarse")).toBe("10");
  // The bug guarded (plan 331 §1): ArrowLeft from 10 jumped to 6, skipping 9.
  runtime.keyDown("s", "left");
  expect(announced(runtime, "Coarse")).toBe("9");
  runtime.keyDown("s", "right");
  expect(announced(runtime, "Coarse")).toBe("10");
});

it("starts a default RangeSlider at its maximum", async () => {
  // `defaultValue` is documented as [min, max], but the step normalised the
  // end to 9, so a "full" band left a strip of empty rail (plan 331 §1).
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <RangeSlider testId="full" label="Full" min={0} max={10} step={3} />
      <RangeSlider
        testId="nine"
        label="Nine"
        min={0}
        max={10}
        step={3}
        defaultValue={[0, 9]}
      />
    </Stack>,
  );
  const offset = (testId: string): number =>
    boundsOf(runtime, `${testId}-thumb-end`).x - boundsOf(runtime, testId).x;
  expect(offset("full")).toBeGreaterThan(offset("nine"));
  expect(announced(runtime, "Full maximum")).toBe("10");
});

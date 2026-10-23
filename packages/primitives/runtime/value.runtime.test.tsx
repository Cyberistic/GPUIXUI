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
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Meter } from "../src/components/Meter.js";
import {
  RangeSlider,
  Slider,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "../src/components/Slider.js";
import { Icon } from "@gpuixui/icons";
import { Stack } from "../src/components/Stack.js";
import { sliderInset } from "../src/core/index.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const INSET = sliderInset("md", testTheme);

const boundsOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(runtime.bounds(testId), () =>
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

const thumbOf = (runtime: Runtime, testId: string, vertical = false) => {
  const parts = partsOf(runtime, testId);
  const index = parts.length === 2 ? (vertical ? 0 : 1) : vertical ? 0 : 3;
  return parts[index] ?? expect.fail(`${testId} paints no thumb`);
};

const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

/** The centre of a thumb, as the frame painted it. */
const thumbCentre = (runtime: Runtime, testId: string): number => {
  const thumb = thumbOf(runtime, testId);
  const bounds = Option.getOrElse(runtime.boundsOfId(thumb.id), () =>
    expect.fail(`the thumb of ${testId} painted no box`),
  );
  return bounds.x + bounds.width / 2;
};

/** The vertical centre of a thumb. */
const thumbCentreY = (runtime: Runtime, testId: string): number => {
  const thumb = thumbOf(runtime, testId, true);
  const bounds = Option.getOrElse(runtime.boundsOfId(thumb.id), () =>
    expect.fail(`the thumb of ${testId} painted no box`),
  );
  return bounds.y + bounds.height / 2;
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

/**
 * A point at `fraction` of a vertical track, measured from its **bottom** —
 * a vertical value runs up, so 0 is the bottom edge and 1 the top.
 */
const verticalPointAt = (
  runtime: Runtime,
  testId: string,
  fraction: number,
): { readonly x: number; readonly y: number } => {
  const box = boundsOf(runtime, testId);
  return {
    x: box.x + box.width / 2,
    y: box.y + INSET + (1 - fraction) * (box.height - 2 * INSET),
  };
};

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

const values = (): {
  readonly seen: Array<number>;
  readonly onChange: (value: number) => void;
} => {
  const seen: Array<number> = [];
  return { seen, onChange: (value) => seen.push(value) };
};

it("maps a real click to the value under the pointer", async () => {
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider testId="s" label="Volume" onValueChange={onChange} />,
  );
  const point = pointAt(runtime, "s", 0.25);
  runtime.clickAt(point.x, point.y);
  expect(seen.at(-1)).toBe(25);
  expect(announced(runtime, "Volume")).toBe("25");
});

it("ignores a press that is not the primary button", async () => {
  // The bug guarded: the runtime delivers `mouseDown` for all three buttons, and
  // the slider treated any press as a value gesture. A right press (the
  // context-menu gesture) or a middle one moved the value, armed the drag, and
  // then a move applied a second time — with no `onClick` for the caller to see.
  const single = values();
  const spans: Array<readonly [number, number]> = [];
  const runtime = await mount(
    <Stack direction="row">
      <Slider
        testId="s"
        label="Volume"
        defaultValue={20}
        onValueChange={single.onChange}
      />
      <RangeSlider
        testId="r"
        label="Price"
        defaultValue={[20, 60] as const}
        onValueChange={(next) => spans.push(next)}
      />
    </Stack>,
  );
  const point = pointAt(runtime, "s", 0.75);
  runtime.renderer.nativeSimulateMouseDown(point.x, point.y, 2);
  runtime.renderer.nativeSimulateMouseUp(point.x, point.y, 2);
  // A move with the primary button held is a drag only if the press armed one.
  runtime.mouseMoveAt(point.x, point.y, 0);
  runtime.flush();
  expect(single.seen).toStrictEqual([]);
  expect(announced(runtime, "Volume")).toBe("20");

  const band = pointAt(runtime, "r", 0.9);
  runtime.renderer.nativeSimulateMouseDown(band.x, band.y, 1);
  runtime.renderer.nativeSimulateMouseUp(band.x, band.y, 1);
  runtime.mouseMoveAt(band.x, band.y, 0);
  runtime.flush();
  expect(spans).toStrictEqual([]);
  expect(announced(runtime, "Price maximum")).toBe("60");
});

it("does not report a range the pointer cannot move past a bound", async () => {
  // The bug guarded: the span tuple was rebuilt on every pointer move, so a drag
  // held against a bound reported the same span on every frame it stayed there —
  // a stream of identical `onValueChange` calls while the pointer was still.
  const spans: Array<readonly [number, number]> = [];
  const runtime = await mount(
    <RangeSlider
      testId="r"
      label="Price"
      defaultValue={[40, 80] as const}
      onValueChange={(next) => spans.push(next)}
    />,
  );
  const box = boundsOf(runtime, "r");
  const grab = pointAt(runtime, "r", 0.4);
  runtime.mouseDownAt(grab.x, grab.y);
  // Three moves held at the start end: the first reaches 0, the next two cannot.
  Arr.forEach(Arr.range(1, 3), () => {
    runtime.mouseMoveAt(box.x + 1, box.y + box.height / 2, 0);
    runtime.flush();
  });
  expect(spans).toStrictEqual([[0, 80] as const]);
  expect(announced(runtime, "Price minimum")).toBe("0");
});

it("maps a vertical track from its bottom edge", async () => {
  // The bug guarded: the vertical axis reuses the horizontal arithmetic, so the
  // bar fills from the ceiling and a reader who drags up gets a *lower* value.
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider
      testId="v"
      label="Level"
      orientation="vertical"
      style={{ height: 200 }}
      onValueChange={onChange}
    />,
  );
  const box = boundsOf(runtime, "v");
  expect(box.height).toBe(200);
  expect(box.width).toBe(testTheme.density.controlHeight.md);
  const quarter = verticalPointAt(runtime, "v", 0.25);
  runtime.clickAt(quarter.x, quarter.y);
  expect(seen.at(-1)).toBe(25);
  expect(announced(runtime, "Level")).toBe("25");
  // The thumb's centre sits on the point the pointer named, measured up from
  // the bottom: the same half-thumb inset the horizontal axis proves.
  expect(Math.abs(thumbCentreY(runtime, "v") - quarter.y)).toBeLessThanOrEqual(
    1,
  );
  const top = verticalPointAt(runtime, "v", 1);
  runtime.clickAt(top.x, top.y);
  expect(seen.at(-1)).toBe(100);
  expect(
    Math.abs(thumbCentreY(runtime, "v") - (box.y + INSET)),
  ).toBeLessThanOrEqual(1);
});

it("keeps a vertical drag that leaves the track, and stops it on release", async () => {
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider
      testId="v"
      label="Level"
      orientation="vertical"
      style={{ height: 200 }}
      onValueChange={onChange}
    />,
  );
  const box = boundsOf(runtime, "v");
  const start = verticalPointAt(runtime, "v", 0.5);
  runtime.mouseDownAt(start.x, start.y);
  expect(seen.at(-1)).toBe(50);
  runtime.mouseMoveAt(start.x, box.y - 120, 0);
  runtime.flush();
  expect(seen.at(-1)).toBe(100);
  const duringDrag = seen.length;
  runtime.mouseUpAt(start.x, box.y - 120);
  runtime.flush();
  runtime.mouseMoveAt(start.x, verticalPointAt(runtime, "v", 0.1).y, 0);
  runtime.flush();
  expect(seen.length).toBe(duringDrag);
});

it("moves a vertical slider with the arrow keys and announces the step", async () => {
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider
      testId="v"
      label="Level"
      orientation="vertical"
      defaultValue={50}
      onValueChange={onChange}
    />,
  );
  runtime.keyDown("v", "up");
  expect(seen.at(-1)).toBe(51);
  runtime.keyDown("v", "down");
  runtime.keyDown("v", "down");
  expect(seen.at(-1)).toBe(49);
  expect(announced(runtime, "Level")).toBe("49");
});

it("moves the end a click grabbed on a vertical range", async () => {
  const runtime = await mount(
    <RangeSlider
      testId="r"
      label="Price"
      orientation="vertical"
      style={{ height: 200 }}
      defaultValue={[20, 60] as const}
    />,
  );
  const box = boundsOf(runtime, "r");
  expect(box.width).toBe(testTheme.density.controlHeight.md);
  runtime.clickAt(
    verticalPointAt(runtime, "r", 0.9).x,
    verticalPointAt(runtime, "r", 0.9).y,
  );
  runtime.flush();
  expect(announced(runtime, "Price maximum")).toBe("90");
  expect(announced(runtime, "Price minimum")).toBe("20");
  runtime.clickAt(
    verticalPointAt(runtime, "r", 0.05).x,
    verticalPointAt(runtime, "r", 0.05).y,
  );
  runtime.flush();
  expect(announced(runtime, "Price minimum")).toBe("5");
  expect(announced(runtime, "Price maximum")).toBe("90");
});

it("delivers a caller's press and keys through the track", async () => {
  // The host-handler contract measured where it matters: the tree suite can see
  // that the track carries the caller's `onClick`, but only the renderer can say
  // that a press on a slider's div actually reaches it — the pointer path is a
  // `mousedown` drag, so a consumer observing a press has no other channel.
  const events: Array<string> = [];
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={50}
      onValueChange={onChange}
      onClick={() => events.push("click")}
      onKeyDown={() => events.push("key")}
    />,
  );
  const point = pointAt(runtime, "s", 0.25);
  runtime.clickAt(point.x, point.y);
  expect(seen.at(-1)).toBe(25);
  expect(events).toStrictEqual(["click"]);
  runtime.keyDown("s", "right");
  expect(seen.at(-1)).toBe(26);
  expect(events).toStrictEqual(["click", "key"]);
});

it("installs no press for a caller on a disabled slider but still delivers its keys", async () => {
  const events: Array<string> = [];
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      disabled
      onClick={() => events.push("click")}
      onKeyDown={() => events.push("key")}
    />,
  );
  const point = pointAt(runtime, "s", 0.5);
  runtime.clickAt(point.x, point.y);
  runtime.keyDown("s", "end");
  expect(events).toStrictEqual(["key"]);
});

it("delivers exactly one press when the pointer lands on a thumb", async () => {
  // The caller's press is installed on the track and on the painted thumb, so a
  // press on the knob is observed too — once, not twice. The runtime hit-tests
  // one element, so the guard is that the handler is not also reached by a
  // second path.
  const clicks: Array<number> = [];
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={50}
      onClick={(event) => clicks.push(event.elementId)}
    />,
  );
  const thumb = thumbOf(runtime, "s");
  const box = Option.getOrElse(runtime.boundsOfId(thumb.id), () =>
    expect.fail("the thumb painted no box"),
  );
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  expect(clicks).toHaveLength(1);
});

it("keeps the press and the mapping when the caller composes the parts", async () => {
  // The bug this guards: a part split that leaves the custom tree without the
  // root's pointer handling — a composed slider that looks right and answers
  // nothing.
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={50}
      onValueChange={onChange}
    >
      <SliderTrack>
        <SliderIndicator />
        <SliderThumb>
          <Icon
            name="star"
            size={testTheme.iconSize.xs}
            color={testTheme.colors.primaryForeground}
          />
        </SliderThumb>
      </SliderTrack>
    </Slider>,
  );
  const point = pointAt(runtime, "s", 0.75);
  runtime.clickAt(point.x, point.y);
  expect(seen.at(-1)).toBe(75);
  expect(announced(runtime, "Volume")).toBe("75");
});

it("clamps a press in the track's inset to its nearest end", async () => {
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={50}
      onValueChange={onChange}
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

it("keeps its own words for a formatter that says nothing", async () => {
  // The bug guarded: `aria-valuetext` is the only channel a slider has, and a
  // formatter whose locale table had no row (`""`) published an announcement of
  // nothing while the thumb still sat at a value. A blank answer is absence, so
  // the clamped number is what the window reports — for the single track and for
  // each end of a range.
  const runtime = await mount(
    <>
      <Slider
        testId="s"
        label="Volume"
        defaultValue={42}
        formatValue={() => ""}
      />
      <RangeSlider
        testId="r"
        label="Price"
        defaultValue={[20, 60]}
        formatValue={() => ""}
      />
    </>,
  );
  expect(announced(runtime, "Volume")).toBe("42");
  expect(announced(runtime, "Price minimum")).toBe("20");
  expect(announced(runtime, "Price maximum")).toBe("60");
});

it("reaches its maximum when the step does not divide the span", async () => {
  // The bug guarded: the snap made the maximum unreachable, so the thumb
  // stopped at 9 and the end of the track was a place the control could not be
  // taken to. Both the keyboard and a press at the end must land on 10.
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      min={0}
      max={10}
      step={3}
      defaultValue={9}
    />,
  );
  runtime.keyDown("s", "right");
  expect(announced(runtime, "Volume")).toBe("10");
  const box = boundsOf(runtime, "s");
  runtime.clickAt(box.x + box.width - 1, box.y + box.height / 2);
  expect(announced(runtime, "Volume")).toBe("10");
});

it("steps down from an off-grid maximum onto the stop below it", async () => {
  // The bug guarded: the maximum is a stop even when the step does not divide
  // the span, but a move down measured the step from the off-grid value, so End
  // then ArrowDown landed on 6 and the stop at 9 could be reached with an up
  // move and never with a down one.
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      min={0}
      max={10}
      step={3}
      defaultValue={9}
    />,
  );
  runtime.keyDown("s", "end");
  expect(announced(runtime, "Volume")).toBe("10");
  runtime.keyDown("s", "left");
  expect(announced(runtime, "Volume")).toBe("9");
});

it("refuses a press and a key while disabled, and stays out of the tab order", async () => {
  const { seen, onChange } = values();
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="b">Before</Button>
      <Slider testId="s" label="Volume" disabled onValueChange={onChange} />
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

it("declares the keyboard ring on the slider's track, not its thumb", async () => {
  // The bug: the ring was merged on the thumb while the track held focus, so a
  // press painted a shadow ring. The track is the tab stop, so it declares the
  // keyboard outline at rest and the runtime decides when to paint it.
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="b">Elsewhere</Button>
      <Slider testId="s" label="Volume" />
    </Stack>,
  );
  const track = Option.getOrElse(runtime.element("s"), () =>
    expect.fail("the slider painted no track"),
  );
  expect(track.style.focusVisible).toBeDefined();
  runtime.click("s");
  runtime.flush();
  expect(
    Option.fromNullishOr(thumbOf(runtime, "s").style.boxShadow),
  ).toStrictEqual(Option.none());
  runtime.click("b");
  runtime.flush();
  expect(
    Option.fromNullishOr(thumbOf(runtime, "s").style.boxShadow),
  ).toStrictEqual(Option.none());
});

it("keeps tracking a drag that leaves the track, and ends it on the release", async () => {
  // The claim this measured: a slider drag does **not** stop at the track's
  // edge. GPUix arms pointer capture on left mouse down for an element that
  // listens to both `mouseDown` and `mouseMove` — this track does — so the
  // moves keep arriving outside its box. The live `pointer-capture` probe
  // measured the same on 0.11.0 (`slider=66 sliderChanges=9`); this holds the
  // headless renderer to it.
  const { seen, onChange } = values();
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={50}
      onValueChange={onChange}
    />,
  );
  const box = boundsOf(runtime, "s");
  const start = pointAt(runtime, "s", 0.3);
  runtime.mouseDownAt(start.x, start.y);
  expect(seen.at(-1)).toBe(30);
  runtime.mouseMoveAt(box.x + box.width + 200, start.y, 0);
  runtime.flush();
  expect(seen.at(-1)).toBe(100);
  const duringDrag = seen.length;
  runtime.mouseUpAt(box.x + box.width + 200, start.y);
  runtime.flush();
  // The release ended the gesture even though it landed outside the track: a
  // move afterwards must not keep dragging the value.
  runtime.mouseMoveAt(pointAt(runtime, "s", 0.1).x, start.y, 0);
  runtime.flush();
  expect(seen.length).toBe(duringDrag);
  expect(announced(runtime, "Volume")).toBe("100");
});

it("keeps a range drag that leaves the track on the end it grabbed", async () => {
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[20, 60] as const} />,
  );
  const box = boundsOf(runtime, "r");
  const start = pointAt(runtime, "r", 0.25);
  runtime.mouseDownAt(start.x, start.y);
  expect(announced(runtime, "Price minimum")).toBe("25");
  runtime.mouseMoveAt(box.x + box.width + 150, start.y, 0);
  runtime.flush();
  // The start it grabbed followed the pointer past the track and stopped on
  // the end it may not cross.
  expect(announced(runtime, "Price minimum")).toBe("60");
  expect(announced(runtime, "Price maximum")).toBe("60");
  runtime.mouseUpAt(box.x + box.width + 150, start.y);
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

it("pulls a coincident pair apart in either direction", async () => {
  // The bug guarded: a filter opened with both ends on one value is **one
  // point**, so the press picked the nearer end — the start — and the start's
  // travel towards the end is the one move `moveSpanEnd` refuses. Dragging the
  // visible thumb rightwards reported nothing at all (measured: the pair stayed
  // `50,50`), and only a press landing off the thumb could separate it. The
  // gesture is read as a span around the point it pressed, so the pair follows
  // the pointer on either side and never collapses.
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[50, 50] as const} />,
  );
  const box = boundsOf(runtime, "r");
  const start = pointAt(runtime, "r", 0.5);
  runtime.mouseDownAt(start.x, start.y);
  runtime.mouseMoveAt(pointAt(runtime, "r", 0.8).x, start.y, 0);
  runtime.flush();
  expect(announced(runtime, "Price minimum")).toBe("50");
  expect(announced(runtime, "Price maximum")).toBe("80");
  runtime.mouseMoveAt(pointAt(runtime, "r", 0.2).x, start.y, 0);
  runtime.flush();
  expect(announced(runtime, "Price minimum")).toBe("20");
  expect(announced(runtime, "Price maximum")).toBe("50");
  runtime.mouseUpAt(box.x + box.width, start.y);
});

it("gives the end a coincident drag draws the focus, so the keyboard continues there", async () => {
  const runtime = await mount(
    <RangeSlider testId="r" label="Price" defaultValue={[50, 50] as const} />,
  );
  const start = pointAt(runtime, "r", 0.5);
  runtime.mouseDownAt(start.x, start.y);
  runtime.mouseMoveAt(pointAt(runtime, "r", 0.8).x, start.y, 0);
  runtime.flush();
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("no thumb holds focus after the drag"),
  );
  expect(String(focused.customProps?.["aria-label"] ?? "")).toBe(
    "Price maximum",
  );
  runtime.renderer.nativeSimulateKeyDown(focused.id, "right");
  expect(announced(runtime, "Price maximum")).toBe("81");
  expect(announced(runtime, "Price minimum")).toBe("50");
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
  runtime.clickAt(left.x, left.y);
  runtime.keyDown("r", "end");
  expect(announced(runtime, "Price minimum")).toBe("90");
  expect(announced(runtime, "Price maximum")).toBe("90");
});

it("announces a meter's measurement and paints it inside its own range", async () => {
  const runtime = await mount(
    <Meter testId="m" label="Disk" value={25} min={0} max={50} />,
  );
  expect(
    Option.isSome(a11yNode(runtime.a11y(), { role: "Meter", label: "Disk" })),
  ).toBe(true);
  expect(announced(runtime, "Disk")).toBe("25");
  const bar = elementById(runtime, trackOf(runtime, "m").children[0] ?? -1);
  const fill = elementById(runtime, bar.children[0] ?? -1);
  const barBox = Option.getOrElse(runtime.boundsOfId(bar.id), () =>
    expect.fail("the meter painted no track box"),
  );
  const fillBox = Option.getOrElse(runtime.boundsOfId(fill.id), () =>
    expect.fail("the meter painted no fill"),
  );
  expect(Math.abs(fillBox.width - barBox.width / 2)).toBeLessThan(2);
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

it("reports a drag's frames to onValueChange and one commit on release", async () => {
  // The bug guarded: a slider reports every frame of a drag, so a caller that
  // persists or fetches on `onValueChange` does that work dozens of times per
  // gesture. `onValueCommit` is the end of the gesture — once, on release, with
  // the value the drag finished on — and a press the control refuses ends no
  // gesture, so it commits nothing.
  const changes: Array<number> = [];
  const commits: Array<number> = [];
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={20}
      onValueChange={(value) => changes.push(value)}
      onValueCommit={(value) => commits.push(value)}
    />,
  );
  const grab = pointAt(runtime, "s", 0.4);
  runtime.mouseDownAt(grab.x, grab.y);
  runtime.mouseMoveAt(pointAt(runtime, "s", 0.6).x, grab.y, 0);
  runtime.mouseMoveAt(pointAt(runtime, "s", 0.8).x, grab.y, 0);
  runtime.flush();
  expect(changes.length).toBeGreaterThan(1);
  expect(commits).toStrictEqual([]);

  runtime.mouseUpAt(pointAt(runtime, "s", 0.8).x, grab.y);
  runtime.flush();
  expect(commits).toStrictEqual([80]);
  expect(announced(runtime, "Volume")).toBe("80");

  // A right press is refused by `primaryButton`, so it arms no drag and has no
  // end to report.
  runtime.renderer.nativeSimulateMouseDown(grab.x, grab.y, 2);
  runtime.renderer.nativeSimulateMouseUp(grab.x, grab.y, 2);
  expect(commits).toStrictEqual([80]);
});

it("commits each key that moved it, and no key that could not", async () => {
  const commits: Array<number> = [];
  const runtime = await mount(
    <Slider
      testId="s"
      label="Volume"
      defaultValue={99}
      onValueCommit={(value) => commits.push(value)}
    />,
  );
  runtime.keyDown("s", "right");
  // At the ceiling the arrow decides the value it already holds, which is not a
  // move; neither is a key the contract does not own.
  runtime.keyDown("s", "right");
  runtime.keyDown("s", "a");
  expect(commits).toStrictEqual([100]);
  runtime.keyDown("s", "home");
  expect(commits).toStrictEqual([100, 0]);
});

it("commits the span a range gesture ended on, once", async () => {
  const changes: Array<readonly [number, number]> = [];
  const commits: Array<readonly [number, number]> = [];
  const runtime = await mount(
    <RangeSlider
      testId="r"
      label="Price"
      defaultValue={[20, 60] as const}
      onValueChange={(span) => changes.push(span)}
      onValueCommit={(span) => commits.push(span)}
    />,
  );
  const grab = pointAt(runtime, "r", 0.9);
  runtime.mouseDownAt(grab.x, grab.y);
  runtime.mouseMoveAt(pointAt(runtime, "r", 0.95).x, grab.y, 0);
  runtime.flush();
  expect(changes.length).toBeGreaterThan(0);
  expect(commits).toStrictEqual([]);

  runtime.mouseUpAt(pointAt(runtime, "r", 0.95).x, grab.y);
  runtime.flush();
  expect(commits).toStrictEqual([[20, 95]]);
  expect(announced(runtime, "Price maximum")).toBe("95");

  // The thumb the gesture moved holds focus afterwards, so a key continues from
  // it and commits its own move as it lands.
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("no thumb took focus"),
  );
  runtime.renderer.nativeSimulateKeyDown(focused.id, "left");
  expect(commits.at(-1)).toStrictEqual([20, 94]);
});

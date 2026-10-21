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
  const bounds = Option.getOrElse(runtime.boundsOfId(thumb.id), () =>
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

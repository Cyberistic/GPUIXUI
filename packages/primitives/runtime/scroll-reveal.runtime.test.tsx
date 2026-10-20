/**
 * A scroll region reveals the control that takes focus (plan `606`), and a
 * nested region reveals through every area above it (plan `636`).
 *
 * The bug this file guards: measured on the pinned release build, a `Button`
 * painted at `y 412…448` took native focus while a 120-high `ScrollArea` painted
 * `y 12…132` and stayed at offset `0` — the keyboard user was on a control they
 * could not see. The runtime's own `scrollIntoView` did not move a plain
 * scroller, so the area measures both painted boxes and calls `scrollTo`.
 *
 * Plan `636` extends the same invariant through nesting: measured, a `Button`
 * inside an inner `ScrollArea` at `y 412` left both areas at `{0, 0}`, because
 * the context carried only the nearest area's callback.
 *
 * Every case opens a fresh window; the fixture unmounts it afterwards.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Input } from "../src/components/Input.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Stack } from "../src/components/Stack.js";
import { awaitFrame, openWindow, Surface } from "./fixture.js";
import {
  isFocusRing,
  type Bounds,
  type Runtime,
} from "../src/testing/index.js";

/** A painted box, or a failure naming what did not paint. */
const bounds = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.paintBounds(testId), () =>
    expect.fail(`${testId} painted no box`),
  );

/** A host's reported box: a Button reports its border box (plan `597`). */
const itemBounds = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`${testId} reported no box`),
  );

/**
 * Walk the native tab order until `testId` holds focus.
 *
 * The runtime's `focusNext` is the same gesture a keyboard user makes; a test
 * that calls `focusElement` instead would skip the case this file exists for.
 */
const tabTo = (runtime: Runtime, testId: string, attempts = 16): void => {
  runtime.focusNext();
  if (Option.getOrUndefined(runtime.focused()) === testId) return;
  if (attempts <= 1) {
    expect.fail(
      `Tab never reached ${testId}; focus is ${Option.getOrUndefined(runtime.focused())}`,
    );
  }
  tabTo(runtime, testId, attempts - 1);
};

/** Whether `inner` is completely inside `outer` on both axes. */
const contains = (outer: Bounds, inner: Bounds): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/** Focus a host directly, as an application jumping to a field does. */
const focusElement = (runtime: Runtime, testId: string): void => {
  const id = Option.getOrElse(
    Option.map(runtime.element(testId), (element) => element.id),
    () => expect.fail(`${testId} is not mounted`),
  );
  runtime.renderer.focusElement?.(id);
  runtime.flush();
};

/** The region's offset, or a failure when the region never became scrollable. */
const offsetOf = (runtime: Runtime, testId: string): { x: number; y: number } =>
  Option.getOrElse(runtime.scrollOffset(testId), () =>
    expect.fail(`${testId} is not scrollable`),
  );

it("reveals a Button below the fold and reports the move", async () => {
  const runtime = await openWindow();
  const positions: { x: number; y: number }[] = [];
  runtime.render(
    <Surface>
      <ScrollArea
        label="List"
        style={{ height: 120, width: 300 }}
        onScrollPositionChange={(position) => {
          positions.push(position);
        }}
        testId="s"
      >
        <Box tone="card" style={{ height: 400 }} />
        <Button testId="target">Target</Button>
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  const region = bounds(runtime, "s");
  const before = bounds(runtime, "target");
  expect(before.y).toBeGreaterThan(region.y + region.height);

  tabTo(runtime, "target");
  await awaitFrame(
    () => offsetOf(runtime, "s").y < 0,
    "the region scrolls the focused button into view",
  );
  runtime.flush();

  const offset = offsetOf(runtime, "s");
  expect(offset.y).toBeLessThan(0);
  expect(offset.x).toBe(0);
  expect(contains(bounds(runtime, "s"), itemBounds(runtime, "target"))).toBe(
    true,
  );
  expect(positions.at(-1)).toStrictEqual(offset);
});

it("reveals the focused option of a roving RadioGroup", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        label="Options"
        style={{ height: 120, width: 300 }}
        testId="s"
      >
        <Box tone="card" style={{ height: 400 }} />
        <RadioGroup
          label="Choice"
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          testId="rg"
        />
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  expect(bounds(runtime, "rg-a").y).toBeGreaterThan(
    bounds(runtime, "s").y + 120,
  );

  tabTo(runtime, "rg-a");
  await awaitFrame(
    () => offsetOf(runtime, "s").y < 0,
    "the region scrolls the focused radio into view",
  );
  runtime.flush();

  expect(offsetOf(runtime, "s").y).toBeLessThan(0);
  expect(contains(bounds(runtime, "s"), itemBounds(runtime, "rg-a"))).toBe(
    true,
  );
});

it("reveals the focused row of a CheckboxGroup", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        label="Options"
        style={{ height: 120, width: 300 }}
        testId="s"
      >
        <Box tone="card" style={{ height: 400 }} />
        <CheckboxGroup
          label="Notifications"
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          testId="cg"
        />
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  expect(bounds(runtime, "cg-a").y).toBeGreaterThan(
    bounds(runtime, "s").y + 120,
  );

  tabTo(runtime, "cg-a");
  await awaitFrame(
    () => offsetOf(runtime, "s").y < 0,
    "the region scrolls the focused checkbox into view",
  );
  runtime.flush();

  expect(offsetOf(runtime, "s").y).toBeLessThan(0);
  expect(contains(bounds(runtime, "s"), itemBounds(runtime, "cg-a"))).toBe(
    true,
  );
});

it("reveals the focused cell of an OTPField", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea label="Code" style={{ height: 120, width: 300 }} testId="s">
        <Box tone="card" style={{ height: 400 }} />
        <OTPField label="Code" length={4} testId="otp" />
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  expect(bounds(runtime, "otp-cell-1").y).toBeGreaterThan(
    bounds(runtime, "s").y + 120,
  );

  tabTo(runtime, "otp-cell-1");
  await awaitFrame(
    () => offsetOf(runtime, "s").y < 0,
    "the region scrolls the focused OTP cell into view",
  );
  runtime.flush();

  expect(offsetOf(runtime, "s").y).toBeLessThan(0);
  expect(
    contains(bounds(runtime, "s"), itemBounds(runtime, "otp-cell-1")),
  ).toBe(true);
});

it("reveals a field that mounts focused", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea label="Form" style={{ height: 120, width: 300 }} testId="s">
        <Box tone="card" style={{ height: 400 }} />
        <Input label="Name" autoFocus testId="field" />
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  // The mount happens before the first paint; the tracker's first sample is
  // what lets the area measure the field (plan 606).
  await awaitFrame(
    () => offsetOf(runtime, "s").y < 0,
    "the region scrolls the mounted focused field into view",
  );
  runtime.flush();

  expect(Option.getOrUndefined(runtime.focused())).toBe("field");
  expect(offsetOf(runtime, "s").y).toBeLessThan(0);
  // A native `<input>` reports from its content origin (plan 597).
  expect(contains(bounds(runtime, "s"), bounds(runtime, "field"))).toBe(true);
});

it("reveals an autoFocus OTP cell", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea label="Code" style={{ height: 120, width: 300 }} testId="s">
        <Box tone="card" style={{ height: 400 }} />
        <OTPField label="Code" length={4} autoFocus testId="otp" />
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  await awaitFrame(
    () => offsetOf(runtime, "s").y < 0,
    "the region scrolls the mounted focused OTP cell into view",
  );
  runtime.flush();

  expect(offsetOf(runtime, "s").y).toBeLessThan(0);
  expect(
    contains(bounds(runtime, "s"), itemBounds(runtime, "otp-cell-1")),
  ).toBe(true);
});

it("scrolls back up to a control that takes focus above the viewport", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea label="List" style={{ height: 120, width: 300 }} testId="s">
        <Button testId="top">Top</Button>
        <Box tone="card" style={{ height: 400 }} />
        <Button testId="bottom">Bottom</Button>
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  tabTo(runtime, "top");
  await awaitFrame(
    () =>
      Option.exists(runtime.element("top"), (element) =>
        isFocusRing(element.style.boxShadow),
      ),
    "the top button paints its ring, so the tracker sampled focus",
  );
  runtime.flush();
  runtime.wheel("s", 0, -400);
  runtime.flush();
  expect(offsetOf(runtime, "s").y).toBeLessThan(-200);
  // Move focus away from the top button, so focusing it again is a change the
  // tracker can observe.
  tabTo(runtime, "bottom");
  await awaitFrame(
    () =>
      Option.exists(runtime.element("bottom"), (element) =>
        isFocusRing(element.style.boxShadow),
      ),
    "the bottom button paints its ring, so the tracker sampled it",
  );
  runtime.flush();

  focusElement(runtime, "top");
  await awaitFrame(
    () =>
      Option.exists(runtime.element("top"), (element) =>
        isFocusRing(element.style.boxShadow),
      ),
    "the refocused button paints its ring, so the tracker sampled it",
  );
  runtime.flush();

  expect(offsetOf(runtime, "s").y).toBe(0);
  expect(contains(bounds(runtime, "s"), itemBounds(runtime, "top"))).toBe(true);
});

it("does not move a region for a control that is already visible", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea label="List" style={{ height: 120, width: 300 }} testId="s">
        <Button testId="top">Top</Button>
        <Box tone="card" style={{ height: 400 }} />
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  tabTo(runtime, "top");
  await awaitFrame(
    () =>
      Option.exists(runtime.element("top"), (element) =>
        isFocusRing(element.style.boxShadow),
      ),
    "the visible button paints its ring",
  );
  runtime.flush();

  expect(offsetOf(runtime, "s")).toStrictEqual({ x: 0, y: 0 });
});

it("reveals along the axis a horizontal region scrolls", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        axis="horizontal"
        label="Columns"
        style={{ height: 80, width: 300 }}
        testId="s"
      >
        <Stack direction="row" gap="sm" style={{ width: 700 }}>
          <Box tone="card" style={{ width: 500, height: 40 }} />
          <Button testId="target">Target</Button>
        </Stack>
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  expect(bounds(runtime, "target").x).toBeGreaterThan(
    bounds(runtime, "s").x + 300,
  );

  tabTo(runtime, "target");
  await awaitFrame(
    () => offsetOf(runtime, "s").x < 0,
    "the region scrolls along its horizontal axis",
  );
  runtime.flush();

  const offset = offsetOf(runtime, "s");
  expect(offset.x).toBeLessThan(0);
  expect(offset.y).toBe(0);
  expect(contains(bounds(runtime, "s"), itemBounds(runtime, "target"))).toBe(
    true,
  );
});

it("does not move the region for a control outside it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea label="List" style={{ height: 120, width: 300 }} testId="s">
        <Box tone="card" style={{ height: 400 }} />
      </ScrollArea>
      <Button testId="outside">Outside</Button>
    </Surface>,
  );
  runtime.flush();
  tabTo(runtime, "outside");
  await awaitFrame(
    () =>
      Option.exists(runtime.element("outside"), (element) =>
        isFocusRing(element.style.boxShadow),
      ),
    "the outside button paints its ring",
  );
  runtime.flush();

  expect(offsetOf(runtime, "s")).toStrictEqual({ x: 0, y: 0 });
});

it("reveals a focused control through a nested region", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        label="Outer"
        style={{ height: 120, width: 320 }}
        testId="outer"
      >
        <Box tone="card" style={{ height: 400 }} />
        <ScrollArea
          label="Inner"
          style={{ height: 100, width: 300 }}
          testId="inner"
        >
          <Button testId="target">Target</Button>
        </ScrollArea>
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  const outer = bounds(runtime, "outer");
  expect(bounds(runtime, "target").y).toBeGreaterThan(outer.y + outer.height);

  tabTo(runtime, "target");
  await awaitFrame(
    () => offsetOf(runtime, "outer").y < 0,
    "the outer region scrolls the nested focused button into view",
  );
  runtime.flush();

  expect(offsetOf(runtime, "outer").y).toBeLessThan(0);
  expect(
    contains(bounds(runtime, "outer"), itemBounds(runtime, "target")),
  ).toBe(true);
});

it("reveals a padded nested region by its painted box", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ScrollArea
        label="Outer"
        style={{ height: 120, width: 320 }}
        testId="outer"
      >
        <Box tone="card" style={{ height: 400 }} />
        <ScrollArea
          label="Inner"
          style={{ height: 100, width: 300, padding: 8 }}
          testId="inner"
        >
          <Button testId="target">Target</Button>
        </ScrollArea>
        <Box tone="card" style={{ height: 400 }} />
      </ScrollArea>
    </Surface>,
  );
  runtime.flush();
  runtime.wheel("outer", 0, -600);
  runtime.flush();
  expect(offsetOf(runtime, "outer").y).toBeLessThan(-300);

  focusElement(runtime, "target");
  await awaitFrame(
    () => contains(bounds(runtime, "outer"), bounds(runtime, "inner")),
    "the outer region scrolls the nested region back into view",
  );
  runtime.flush();

  // The inner area's report starts at its content origin (plan 597), so passing
  // its style is what keeps its top padding inside the outer viewport when the
  // outer has to scroll back up to it.
  expect(contains(bounds(runtime, "outer"), bounds(runtime, "inner"))).toBe(
    true,
  );
});

/**
 * The pressed family's read-only state, in the real GPUix runtime.
 *
 * The bug guarded (plan `804`): `Toggle` and `ToggleGroup` offered only
 * `disabled`, which fades the control to half opacity **and** removes it from
 * the tab order, so a saved-settings page could not show a stored mode — a
 * pressed toggle, or a segmented alignment/density choice — to a keyboard or
 * screen-reader user. `readOnly` keeps the tab stop, the ring, the name and the
 * announced `"pressed"`/`"not pressed"` state, refuses click/Enter/Space, and in
 * a group lets the arrows and the type-ahead move the ring without moving the
 * selection.
 *
 * Every refusal case is paired with a writable twin in a fresh window: the same
 * gesture reports there, so a probe that clicked or typed outside the control
 * cannot pass by accident.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Stack } from "../src/components/Stack.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import type { ToggleGroupOption } from "../src/core/toggle-group.js";
import {
  a11yValueOf,
  isFocusRing,
  type Runtime,
} from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow } from "./fixture.js";

const OPTIONS: ReadonlyArray<ToggleGroupOption> = [
  { value: "left", label: "Align left" },
  { value: "centre", label: "Align centre" },
  { value: "right", label: "Align right" },
];

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

/** The `testId` of whatever holds native focus, or a failure naming the case. */
const focusedId = (runtime: Runtime, what: string): string =>
  Option.getOrElse(runtime.focused(), () => expect.fail(what));

/** What the node named `label` announces through `aria-valuetext`. */
const announced = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node announced ${label}`),
  );

/** Whether the element's painted shadow is the focus ring, not the resting one. */
const ringed = (runtime: Runtime, testId: string): boolean =>
  Option.exists(runtime.element(testId), (element) =>
    isFocusRing(element.style.boxShadow),
  );

it("a read-only Toggle keeps its tab stop, ring and announced state", async () => {
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <Toggle testId="t" label="Snap to grid" pressed readOnly>
        Snap
      </Toggle>
      <Button testId="after">Next</Button>
    </Stack>,
  );
  runtime.focusNext();
  expect(focusedId(runtime, "the read-only toggle took no focus")).toBe("t");
  await awaitFrame(() => ringed(runtime, "t"), "the read-only toggle's ring");
  const toggle = Option.getOrElse(runtime.element("t"), () =>
    expect.fail("the read-only toggle painted nothing"),
  );
  expect(toggle.style.cursor).toBe("default");
  expect(toggle.style.opacity).toBeUndefined();
  expect(announced(runtime, "Snap to grid")).toBe("pressed");

  runtime.focusNext();
  expect(
    focusedId(runtime, "the read-only toggle did not leave the tab order"),
  ).toBe("after");
});

it("a read-only Toggle refuses every press, and the writable twin reports one", async () => {
  const reports: boolean[] = [];
  const runtime = await mount(
    <Toggle
      testId="t"
      label="Snap to grid"
      onPressedChange={(next) => reports.push(next)}
      readOnly
    />,
  );
  runtime.click("t");
  runtime.keyDown("t", "enter");
  runtime.keyUp("t", "enter");
  runtime.keyDown("t", "space");
  runtime.keyUp("t", "space");
  runtime.flush();
  expect(reports).toStrictEqual([]);
  expect(announced(runtime, "Snap to grid")).toBe("not pressed");

  const writable: boolean[] = [];
  const live = await mount(
    <Toggle
      testId="t"
      label="Snap to grid"
      onPressedChange={(next) => writable.push(next)}
    />,
  );
  live.click("t");
  expect(writable).toStrictEqual([true]);
  expect(announced(live, "Snap to grid")).toBe("pressed");
});

it("a disabled Toggle is still the faded, skipped state", async () => {
  // The contract this plan replaces: read-only keeps what disabled drops. The
  // case stays so a future "simplify readOnly into disabled" cannot pass.
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <Toggle testId="t" label="Snap to grid" pressed disabled>
        Snap
      </Toggle>
      <Button testId="after">Next</Button>
    </Stack>,
  );
  runtime.focusNext();
  expect(
    focusedId(runtime, "the disabled toggle did not stay out of the tab order"),
  ).toBe("after");
  const toggle = Option.getOrElse(runtime.element("t"), () =>
    expect.fail("the disabled toggle painted nothing"),
  );
  expect(toggle.style.cursor).toBe("not-allowed");
  expect(toggle.style.opacity).toBeLessThan(1);
});

it("a read-only ToggleGroup keeps one stop, and an arrow moves the ring only", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <Stack direction="column" gap="md">
      <ToggleGroup
        type="single"
        testId="tg"
        label="Alignment"
        value="left"
        readOnly
        onValueChange={(value) => reports.push(value)}
        options={OPTIONS}
      />
      <Button testId="after">Next</Button>
    </Stack>,
  );
  runtime.focusNext();
  expect(focusedId(runtime, "the group's one stop took no focus")).toBe(
    "tg-left",
  );
  await awaitFrame(
    () => ringed(runtime, "tg-left"),
    "the read-only group item's ring",
  );
  const item = Option.getOrElse(runtime.element("tg-centre"), () =>
    expect.fail("the read-only group painted no item"),
  );
  expect(item.style.cursor).toBe("default");
  expect(item.style.opacity).toBeUndefined();
  expect(announced(runtime, "Align left")).toBe("pressed");

  runtime.keyDown("tg-left", "right");
  runtime.flush();
  expect(focusedId(runtime, "the arrow did not move the ring")).toBe(
    "tg-centre",
  );
  await awaitFrame(
    () => ringed(runtime, "tg-centre"),
    "the ring follows the read-only cursor",
  );
  expect(reports).toStrictEqual([]);
  expect(announced(runtime, "Align left")).toBe("pressed");
  expect(announced(runtime, "Align centre")).toBe("not pressed");

  runtime.focusNext();
  expect(
    focusedId(runtime, "the read-only group did not leave the tab order"),
  ).toBe("after");
});

it("a read-only ToggleGroup refuses click, Enter and Space", async () => {
  const reports: ReadonlyArray<string>[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="multiple"
      testId="tg"
      label="Formatting"
      defaultValue={["left"]}
      readOnly
      onValueChange={(value) => reports.push(value)}
      options={OPTIONS}
    />,
  );
  runtime.click("tg-centre");
  runtime.keyDown("tg-centre", "enter");
  runtime.keyUp("tg-centre", "enter");
  runtime.keyDown("tg-centre", "space");
  runtime.keyUp("tg-centre", "space");
  runtime.flush();
  expect(reports).toStrictEqual([]);
  expect(announced(runtime, "Align left")).toBe("pressed");
  expect(announced(runtime, "Align centre")).toBe("not pressed");
});

it("a read-only ToggleGroup types to move the ring, never to press", async () => {
  const reports: string[] = [];
  const runtime = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Alignment"
      value="l"
      readOnly
      onValueChange={(value) => reports.push(value)}
      options={[
        { value: "l", label: "Left" },
        { value: "c", label: "Centre" },
        { value: "r", label: "Right" },
      ]}
    />,
  );
  runtime.focusNext();
  runtime.keyDown("tg-l", "c");
  runtime.flush();
  expect(focusedId(runtime, "the typed prefix did not move the ring")).toBe(
    "tg-c",
  );
  expect(reports).toStrictEqual([]);
  expect(announced(runtime, "Centre")).toBe("not pressed");
  expect(announced(runtime, "Left")).toBe("pressed");
});

it("the writable twins still select: an arrow in single, a click in multiple", async () => {
  const single: string[] = [];
  const liveGroup = await mount(
    <ToggleGroup
      type="single"
      testId="tg"
      label="Alignment"
      value="left"
      onValueChange={(value) => single.push(value)}
      options={OPTIONS}
    />,
  );
  liveGroup.focusNext();
  liveGroup.keyDown("tg-left", "right");
  expect(single).toStrictEqual(["centre"]);

  const multiple: ReadonlyArray<string>[] = [];
  const liveSet = await mount(
    <ToggleGroup
      type="multiple"
      testId="tg"
      label="Formatting"
      defaultValue={["left"]}
      onValueChange={(value) => multiple.push(value)}
      options={OPTIONS}
    />,
  );
  liveSet.click("tg-centre");
  expect(multiple).toStrictEqual([["left", "centre"]]);
});

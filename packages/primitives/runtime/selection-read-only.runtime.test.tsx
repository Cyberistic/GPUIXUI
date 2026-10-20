/**
 * The selection family's read-only state, in the real GPUix runtime.
 *
 * The bug guarded (plan `799`): the four selection controls had no read-only
 * state, so a review form could only fade them and drop them from the tab order
 * (`disabled`) or replace them with text. `readOnly` must keep the tab stop,
 * paint the ring and the announced value, and refuse every activation path.
 *
 * Each case focuses the control with the real Tab contract, then drives a real
 * hit-tested click plus Enter and Space. The writable twin proves the same
 * gesture does report, so a gesture that missed the control cannot pass.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Switch } from "../src/components/Switch.js";
import {
  a11yValueOf,
  isFocusRing,
  isWithin,
  type Runtime,
} from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow } from "./fixture.js";

const focusedId = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () =>
    expect.fail("nothing held native focus"),
  );

/** Whether a focus ring is painted inside the element carrying `testId`. */
const ringed = (runtime: Runtime, testId: string): boolean =>
  Option.match(runtime.element(testId), {
    onNone: () => false,
    onSome: (root) =>
      Arr.some(
        runtime.all(),
        (element) =>
          isFocusRing(element.style.boxShadow) &&
          isWithin(runtime, element, root.id),
      ),
  });

const awaitRing = (runtime: Runtime, testId: string): Promise<void> =>
  awaitFrame(() => ringed(runtime, testId), `${testId} paints its focus ring`);

const valueOf = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node was named ${label}`),
  );

it("a read-only Checkbox keeps its tab stop and ring and refuses every gesture", async () => {
  const runtime = await openWindow();
  const values: Array<boolean> = [];
  runtime.render(
    <Surface>
      <div testId="before" tabIndex={0} />
      <Checkbox
        testId="box"
        label="Accept"
        defaultChecked
        readOnly
        onValueChange={(value) => values.push(value)}
      />
      <div testId="after" tabIndex={0} />
    </Surface>,
  );
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("before");
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("box");
  await awaitRing(runtime, "box");
  runtime.click("box");
  runtime.keyDown("box", "enter");
  runtime.keyUp("box", "space");
  expect(values).toStrictEqual([]);
  expect(valueOf(runtime, "Accept")).toBe("checked");
  // The next Tab leaves it, so the read-only control is still in the order.
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("after");
});

it("the same Checkbox without readOnly reports the gestures", async () => {
  const runtime = await openWindow();
  const values: Array<boolean> = [];
  runtime.render(
    <Surface>
      <Checkbox
        testId="box"
        label="Accept"
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  runtime.focusNext();
  runtime.click("box");
  expect(values).toStrictEqual([true]);
});

it("a read-only Switch keeps its tab stop and ring and refuses every gesture", async () => {
  const runtime = await openWindow();
  const values: Array<boolean> = [];
  runtime.render(
    <Surface>
      <Switch
        testId="toggle"
        label="Pause"
        defaultChecked
        readOnly
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("toggle");
  await awaitRing(runtime, "toggle");
  runtime.click("toggle");
  runtime.keyDown("toggle", "enter");
  runtime.keyUp("toggle", "space");
  expect(values).toStrictEqual([]);
  expect(valueOf(runtime, "Pause")).toBe("checked");
});

it("the same Switch without readOnly reports the gestures", async () => {
  const runtime = await openWindow();
  const values: Array<boolean> = [];
  runtime.render(
    <Surface>
      <Switch
        testId="toggle"
        label="Pause"
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  runtime.focusNext();
  runtime.click("toggle");
  expect(values).toStrictEqual([true]);
});

it("a read-only CheckboxGroup keeps every row's tab stop and refuses all of them", async () => {
  const runtime = await openWindow();
  const values: Array<ReadonlyArray<string>> = [];
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="group"
        label="Channels"
        selectAll="All"
        readOnly
        defaultValue={["email"]}
        onValueChange={(value) => values.push(value)}
        options={[
          { value: "email", label: "Email" },
          { value: "push", label: "Push" },
        ]}
      />
    </Surface>,
  );
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("group-all");
  await awaitRing(runtime, "group-all");
  runtime.click("group-all");
  runtime.keyDown("group-all", "enter");
  runtime.keyUp("group-all", "space");
  expect(values).toStrictEqual([]);
  // Each row is its own stop, exactly as the group always behaves.
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("group-email");
  runtime.click("group-email");
  expect(values).toStrictEqual([]);
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("group-push");
  expect(valueOf(runtime, "Email")).toBe("checked");
  expect(valueOf(runtime, "Push")).toBe("unchecked");
});

it("a read-only RadioGroup navigates by arrow without changing the value", async () => {
  const runtime = await openWindow();
  const values: Array<string> = [];
  runtime.render(
    <Surface>
      <RadioGroup
        testId="radio"
        label="Cadence"
        readOnly
        defaultValue="daily"
        onValueChange={(value) => values.push(value)}
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
        ]}
      />
    </Surface>,
  );
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("radio-daily");
  await awaitRing(runtime, "radio-daily");
  runtime.keyDown("radio-daily", "down");
  await awaitFrame(
    () => Option.contains(runtime.focused(), "radio-weekly"),
    "the arrow moves the ring to the next read-only option",
  );
  expect(values).toStrictEqual([]);
  expect(valueOf(runtime, "Daily")).toBe("checked");
  expect(valueOf(runtime, "Weekly")).toBe("unchecked");
  runtime.click("radio-weekly");
  runtime.keyDown("radio-daily", "enter");
  runtime.keyUp("radio-daily", "space");
  expect(values).toStrictEqual([]);
  expect(valueOf(runtime, "Daily")).toBe("checked");
});

it("the same arrow on a writable RadioGroup reports the new value", async () => {
  const runtime = await openWindow();
  const values: Array<string> = [];
  runtime.render(
    <Surface>
      <RadioGroup
        testId="radio"
        label="Cadence"
        defaultValue="daily"
        onValueChange={(value) => values.push(value)}
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
        ]}
      />
    </Surface>,
  );
  runtime.focusNext();
  runtime.keyDown("radio-daily", "down");
  expect(values).toStrictEqual(["weekly"]);
});

it("read-only paints full contrast where disabled fades", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox testId="read-only" label="Accept" readOnly />
      <Checkbox testId="disabled" label="Accept" disabled />
    </Surface>,
  );
  const styleOf = (testId: string) =>
    Option.getOrElse(runtime.element(testId), () =>
      expect.fail(`the ${testId} checkbox painted no element`),
    ).style;
  expect(styleOf("read-only").cursor).toBe("default");
  expect(styleOf("read-only").opacity).toBeUndefined();
  expect(styleOf("disabled").cursor).toBe("not-allowed");
  expect(styleOf("disabled").opacity).toBe(0.5);
});

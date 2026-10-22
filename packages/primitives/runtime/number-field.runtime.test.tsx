/**
 * `NumberField` in the real GPUix runtime.
 *
 * GPUix's `<input>` is a text field with no numeric mode, so everything that
 * makes this a number field — parsing, clamping, stepping, and the draft text
 * that keeps `1.` from becoming `1` under the caret — is ours. The runtime suite
 * is the only place where the native input's edits and the field's chrome can be
 * observed together: typing goes through GPUI's text pipeline, stepping through
 * real keys and hit-tested button presses.
 */

import { useState, type ReactNode } from "react";
import { expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "../src/components/NumberField.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, type Bounds, type Runtime } from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const recorder = (): {
  readonly values: ReadonlyArray<number>;
  readonly onChange: (value: number) => void;
} => {
  const values: number[] = [];
  return {
    get values() {
      return values;
    },
    onChange: (value) => {
      values.push(value);
    },
  };
};

const lastValue = (values: ReadonlyArray<number>): number =>
  Option.getOrElse(Arr.last(values), () =>
    expect.fail("the field reported no change at all"),
  );

/** The native `<input>` inside the field's chrome. */
const inputOf = (runtime: Runtime, testId: string) =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testId), (element) =>
      Option.flatMap(Option.fromNullishOr(element.children[0]), (id) =>
        Option.fromNullishOr(runtime.renderer.getElement(id)),
      ),
    ),
    () => expect.fail(`the NumberField ${testId} painted no input`),
  );

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

/** The text the field's input holds, as assistive technology reads it. */
const textOf = (runtime: Runtime, label: string): string => {
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "TextInput", label }),
    () => expect.fail(`the field ${label} announced nothing`),
  );
  // An empty field announces no value at all, which is an empty field.
  return Option.getOrElse(Option.fromNullishOr(node.aria?.value), () => "");
};

/** A controlled field whose owner pushes a value into it. */
const Owner = () => {
  const [value, setValue] = useState<number | undefined>(undefined);
  return (
    <Stack direction="column">
      <Button testId="push" onActivate={() => setValue(42)}>
        Push
      </Button>
      <NumberField
        testId="nf"
        label="Quantity"
        value={value}
        onChange={setValue}
      />
    </Stack>
  );
};

it("edits through the runtime's text pipeline and reports the number", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      onChange={field.onChange}
    />,
  );
  runtime.type("1 2");
  expect(lastValue(field.values)).toBe(12);
  expect(
    Option.isSome(
      a11yNode(runtime.a11y(), { role: "TextInput", label: "Quantity" }),
    ),
  ).toBe(true);
});

it("keeps a trailing dot as a draft instead of rewriting it mid-edit", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      precision={2}
      onChange={field.onChange}
    />,
  );
  runtime.type("1 .");
  runtime.type("5");
  expect(lastValue(field.values)).toBe(1.5);
  // The bug guarded: a reformat on every keystroke would turn "1." into "1"
  // and the next digit would land at the wrong place.
  expect(inputOf(runtime, "nf").type).toBe("input");
});

it("clamps a typed value to the field's maximum", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Percent"
      autoFocus
      max={100}
      onChange={field.onChange}
    />,
  );
  runtime.type("9 9 9");
  expect(lastValue(field.values)).toBe(100);
});

it("steps with the arrow keys, and pages ten at a time", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      defaultValue={50}
      onChange={field.onChange}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(51);
  runtime.renderer.nativeSimulateKeyDown(input.id, "pagedown");
  expect(lastValue(field.values)).toBe(41);
});

it("steps from a hit-tested click on the spin column and refocuses the input", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={50}
      onChange={field.onChange}
    />,
  );
  const box = boundsOf(runtime, "nf");
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.25);
  expect(lastValue(field.values)).toBe(51);
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("the stepper did not return focus to the input"),
  );
  expect(focused.type).toBe("input");
});

it("declares the keyboard ring on the input, the element that holds focus", async () => {
  // The bug this guards: the ring was declared on the field's wrapper, and the
  // runtime paints `focusVisible` only on an element it tracks focus for
  // (`apply_focus_visible` is gated on a focus handle — measured by
  // `groups.runtime.test.tsx`), so Tab painted no ring on this field at all.
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before">Before</Button>
      <NumberField testId="nf" label="Quantity" />
    </Stack>,
  );
  const input = inputOf(runtime, "nf");
  runtime.click("before");
  runtime.focusNext();
  runtime.flush();
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("Tab moved the focus nowhere"),
  );
  expect(focused.id).toBe(input.id);
  expect(focused.style["focusVisible"]).toBeDefined();
  expect(focused.style["boxShadow"]).toBeUndefined();
  const chrome = Option.getOrElse(runtime.element("nf"), () =>
    expect.fail("the runtime retained no field"),
  );
  expect(chrome.style["focusVisible"]).toBeUndefined();
});

it("keeps its value out of the keyboard dim, so a Tab elsewhere leaves it readable", async () => {
  // The runtime fades every other focusable element to 40% while one has
  // keyboard focus; on a field that composites the reader's value into its own
  // fill (`keyboardDimFailures`), so the input opts out.
  const runtime = await mount(<NumberField testId="nf" label="Quantity" />);
  const input = inputOf(runtime, "nf");
  expect(input.style["keyboardFocusDim"]).toBe(false);
  const chrome = Option.getOrElse(runtime.element("nf"), () =>
    expect.fail("the runtime retained no field"),
  );
  expect(chrome.style["keyboardFocusDim"]).toBeUndefined();
});

it("refuses edits, keys and steps while disabled", async () => {
  const field = recorder();
  const runtime = await mount(
    <Stack direction="row">
      <NumberField
        testId="nf"
        label="Quantity"
        disabled
        defaultValue={50}
        onChange={field.onChange}
      />
    </Stack>,
  );
  const box = boundsOf(runtime, "nf");
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  runtime.type("1 2");
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.25);
  expect(field.values).toStrictEqual([]);
});

it("paints a caller's composition from the field's own state", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={5}
      onChange={field.onChange}
    >
      <NumberFieldInput testId="nf-input" />
      <NumberFieldIncrement testId="nf-up" />
      <NumberFieldDecrement testId="nf-down" />
    </NumberField>,
  );
  runtime.click("nf-up");
  expect(lastValue(field.values)).toBe(6);
  runtime.click("nf-down");
  expect(lastValue(field.values)).toBe(5);
});

it("leaves the caret keys to the host's text field", async () => {
  // The bug guarded: left and right moved the caret in the host's field, and
  // the field changed its value while the caret moved — a number a user could
  // not edit, because the caret could never cross a digit. The runtime's text
  // field takes those two keys for the caret, so the field never sees them:
  // the contrast with the up arrow, which does arrive, is the measurement.
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      autoFocus
      defaultValue={50}
      onChange={field.onChange}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "left");
  runtime.renderer.nativeSimulateKeyUp(input.id, "left");
  runtime.renderer.nativeSimulateKeyDown(input.id, "right");
  runtime.renderer.nativeSimulateKeyUp(input.id, "right");
  expect(field.values).toStrictEqual([]);
  expect(textOf(runtime, "Quantity")).toBe("50");
  // The up arrow does arrive, so the field above was not simply deaf.
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(51);
});

it("commits the draft on Enter and reports it through onSubmit", async () => {
  // The bug guarded: a single-line GPUix `<input>` binds Enter to the runtime's
  // own Submit action, so Enter never reaches `onKeyDown` — the field's commit
  // branch was unreachable in a window and a form could not send from it.
  const submitted = vi.fn();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      precision={2}
      onSubmit={submitted}
    />,
  );
  runtime.type("1 . 5");
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.flush();
  expect(textOf(runtime, "Amount")).toBe("1.50");
  expect(submitted).toHaveBeenCalledTimes(1);
});

it("shows the value its owner pushes", async () => {
  // The bug guarded: a controlled field kept the text it was given, so a value
  // the owner pushed was never seen by the user.
  const runtime = await mount(<Owner />);
  expect(textOf(runtime, "Quantity")).toBe("");
  runtime.click("push");
  runtime.flush();
  expect(textOf(runtime, "Quantity")).toBe("42");
});

it("shows a value that arrives after the field was mounted", async () => {
  // The bug guarded: a field that mounted empty and was given a value later
  // kept showing nothing — the value was dropped on the floor.
  const runtime = await mount(
    <NumberField testId="nf" label="Quantity" defaultValue={50} />,
  );
  runtime.render(
    <Surface>
      <NumberField testId="nf" label="Quantity" value={5} />
    </Surface>,
  );
  runtime.flush();
  expect(textOf(runtime, "Quantity")).toBe("5");
});

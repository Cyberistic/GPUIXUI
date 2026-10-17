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

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { NumberField } from "../src/components/NumberField.js";
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

it("paints the ring on the field's chrome when the input has focus", async () => {
  const runtime = await mount(<NumberField testId="nf" label="Quantity" />);
  const input = inputOf(runtime, "nf");
  const box = Option.getOrElse(runtime.boundsOfId(input.id), () =>
    expect.fail("the input painted no box"),
  );
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  runtime.flush();
  const field = Option.getOrElse(runtime.element("nf"), () =>
    expect.fail("the runtime retained no field"),
  );
  expect(Option.isSome(Option.fromNullishOr(field.style["boxShadow"]))).toBe(
    true,
  );
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

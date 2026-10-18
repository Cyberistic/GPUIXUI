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
import { Button } from "../src/components/Button.js";
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
  readonly onValueChange: (value: number) => void;
} => {
  const values: number[] = [];
  return {
    get values() {
      return values;
    },
    onValueChange: (value) => {
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
      onValueChange={field.onValueChange}
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

/** The ring the field's chrome carries while it holds focus. */
const ringed = (runtime: Runtime): boolean =>
  Option.exists(
    runtime.element("nf"),
    (element) => element.style.boxShadow !== undefined,
  );

it("paints the chrome ring from mount when autoFocus is set", async () => {
  // The runtime focuses on mount without dispatching `onFocus` (plan 041 §9);
  // the field starts its focus state from the prop so it is not painted as
  // unfocused while it holds the caret.
  const runtime = await mount(
    <Stack direction="row">
      <NumberField testId="nf" label="Quantity" autoFocus />
      <Button testId="after">After</Button>
    </Stack>,
  );
  expect(Option.isSome(runtime.focusedElement())).toBe(true);
  expect(ringed(runtime)).toBe(true);
  runtime.click("after");
  runtime.flush();
  expect(ringed(runtime)).toBe(false);
});

it("keeps a trailing dot as a draft instead of rewriting it mid-edit", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      precision={2}
      onValueChange={field.onValueChange}
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
      onValueChange={field.onValueChange}
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
      onValueChange={field.onValueChange}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  expect(lastValue(field.values)).toBe(51);
  runtime.renderer.nativeSimulateKeyDown(input.id, "pagedown");
  expect(lastValue(field.values)).toBe(41);
});

it("steps a decimal field to an exact decimal", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Opacity"
      autoFocus
      defaultValue={0.2}
      step={0.1}
      precision={1}
      onValueChange={field.onValueChange}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "up");
  // The bug guarded: 0.2 + 0.1 is 0.30000000000000004 in binary floating point,
  // so the field painted "0.3" while reporting the noise (plan 077).
  expect(lastValue(field.values)).toBe(0.3);
  expect(runtime.paintedText()).toContain("0.3");
});

it("steps from a hit-tested click on the spin column and refocuses the input", async () => {
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      defaultValue={50}
      onValueChange={field.onValueChange}
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
        onValueChange={field.onValueChange}
      />
    </Stack>,
  );
  const box = boundsOf(runtime, "nf");
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  runtime.type("1 2");
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.25);
  expect(field.values).toStrictEqual([]);
});

it("follows a value the parent changes while a draft exists", async () => {
  // The bug guarded (plan 325): the field painted its draft unconditionally, so
  // a reset or a reloaded record never reached the paint and the next keystroke
  // continued from the old number — measured 1236 instead of 56.
  const field = recorder();
  const runtime = await openWindow();
  const render = (value: number): void =>
    runtime.render(
      <Surface>
        <NumberField
          testId="nf"
          label="Quantity"
          autoFocus
          value={value}
          onValueChange={field.onValueChange}
        />
      </Surface>,
    );
  render(12);
  runtime.type("3");
  expect(lastValue(field.values)).toBe(123);
  render(5);
  runtime.type("6");
  expect(lastValue(field.values)).toBe(56);
});

it("shows a value supplied after mount", async () => {
  // The bug guarded (plan 326): `touched` was decided at mount, so an empty
  // field that became controlled later painted nothing — typing 7 reported 7
  // instead of 427.
  const field = recorder();
  const runtime = await openWindow();
  const render = (value?: number): void =>
    runtime.render(
      <Surface>
        <NumberField
          testId="nf"
          label="Quantity"
          autoFocus
          value={value}
          onValueChange={field.onValueChange}
        />
      </Surface>,
    );
  render();
  render(42);
  runtime.type("7");
  expect(lastValue(field.values)).toBe(427);
});

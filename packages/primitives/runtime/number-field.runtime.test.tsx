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
import {
  a11yNode,
  a11yValueOf,
  isFocusRing,
  type Bounds,
  type Runtime,
} from "../src/testing/index.js";
import { Surface, openWindow, settleFocus } from "./fixture.js";

/** The painted box: the field's root reports from its content origin. */
const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.paintBounds(testId), () =>
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
  Option.exists(runtime.element("nf"), (element) =>
    isFocusRing(element.style.boxShadow),
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
  await settleFocus();
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

const CARET_KEYS = [
  { key: "left", typed: "132" },
  { key: "right", typed: "123" },
  { key: "home", typed: "312" },
  { key: "end", typed: "123" },
] as const;

it.each(Arr.map(CARET_KEYS, (testCase) => [testCase.key, testCase] as const))(
  "leaves %s to the caret instead of stepping",
  async (_name, { key, typed }) => {
    // The bug guarded (plan 338): the docs advertised Left/Right as steps and
    // Home/End as bound jumps. Measured, the native editor consumes those key
    // downs to move the caret, so the field never sees them — and the edit that
    // follows lands where the caret moved (`12` + `left` + `3` is `132`).
    const field = recorder();
    const runtime = await mount(
      <NumberField
        testId="nf"
        label="Quantity"
        autoFocus
        defaultValue={12}
        min={0}
        max={999}
        onValueChange={field.onValueChange}
      />,
    );
    const input = inputOf(runtime, "nf");
    runtime.renderer.nativeSimulateKeyDown(input.id, key);
    expect(field.values).toStrictEqual([]);
    runtime.type("3");
    expect(lastValue(field.values)).toBe(Number(typed));
    expect(runtime.paintedText()).toContain(typed);
  },
);

it("commits and reformats the draft on Enter", async () => {
  // The bug guarded (plan 339): the field handled Enter in `onKeyDown`, but an
  // `<input>` consumes that key down and reports a `submit` instead — measured,
  // `1.5` with `precision={2}` stayed `1.5` after Enter. The draft now commits
  // through the host's submit.
  const runtime = await mount(
    <NumberField testId="nf" label="Amount" autoFocus precision={2} />,
  );
  const input = inputOf(runtime, "nf");
  runtime.type("1 . 5");
  expect(runtime.paintedText()).toContain("1.5");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.renderer.nativeSimulateKeyUp(input.id, "enter");
  runtime.flush();
  expect(runtime.paintedText()).toContain("1.50");
});

it("commits a draft typed after Enter when focus leaves", async () => {
  // The bug guarded (plan 642): Enter set the host-blur de-duplication flag,
  // so a draft typed in the same focus session skipped its tracked commit on
  // blur — an invalid trailing edit stayed painted on an unfocused field.
  const runtime = await mount(
    <Stack direction="row">
      <NumberField testId="nf" label="Amount" autoFocus precision={2} />
      <Button testId="after">After</Button>
    </Stack>,
  );
  const input = inputOf(runtime, "nf");
  runtime.type("1 . 5");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.renderer.nativeSimulateKeyUp(input.id, "enter");
  runtime.flush();
  expect(runtime.paintedText()).toContain("1.50");
  runtime.type("x");
  expect(runtime.paintedText()).toContain("1.50x");
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  expect(runtime.paintedText()).not.toContain("1.50x");
  expect(runtime.paintedText()).toContain("1.50");
});

it("calls the caller's onSubmit once on Enter", async () => {
  const submits: string[] = [];
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      autoFocus
      precision={2}
      onSubmit={() => submits.push("submit")}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.type("1 . 5");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.renderer.nativeSimulateKeyUp(input.id, "enter");
  runtime.flush();
  expect(submits).toStrictEqual(["submit"]);
  expect(runtime.paintedText()).toContain("1.50");
});

it("ignores Enter while disabled", async () => {
  const submits: string[] = [];
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      disabled
      defaultValue={1.5}
      precision={2}
      onValueChange={field.onValueChange}
      onSubmit={() => submits.push("submit")}
    />,
  );
  const input = inputOf(runtime, "nf");
  runtime.renderer.nativeSimulateKeyDown(input.id, "enter");
  runtime.renderer.nativeSimulateKeyUp(input.id, "enter");
  runtime.flush();
  expect(submits).toStrictEqual([]);
  expect(field.values).toStrictEqual([]);
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

it("steps the swapped range from a hit-tested spin click", async () => {
  // The bug guarded (plan 378): an inverted pair normalises to a real range and
  // the arrow keys step it (plan 371), but both spin buttons compared the raw
  // props and blocked every press.
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Inverted"
      min={100}
      max={0}
      defaultValue={50}
      onValueChange={field.onValueChange}
    />,
  );
  const box = boundsOf(runtime, "nf");
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.25);
  expect(lastValue(field.values)).toBe(51);
  // The same field now holds 51, so the down stepper lands on 50 — the point is
  // that the button is live at all, not the arithmetic.
  runtime.clickAt(box.x + box.width - 8, box.y + box.height * 0.75);
  expect(lastValue(field.values)).toBe(50);

  const atMin = recorder();
  const second = await mount(
    <NumberField
      testId="nf"
      label="Inverted minimum"
      min={100}
      max={0}
      defaultValue={0}
      onValueChange={atMin.onValueChange}
    />,
  );
  const atMinBox = boundsOf(second, "nf");
  second.clickAt(
    atMinBox.x + atMinBox.width - 8,
    atMinBox.y + atMinBox.height * 0.75,
  );
  expect(atMin.values).toStrictEqual([]);
  second.clickAt(
    atMinBox.x + atMinBox.width - 8,
    atMinBox.y + atMinBox.height * 0.25,
  );
  expect(lastValue(atMin.values)).toBe(1);
});

it("paints the ring on the field's chrome when the input has focus", async () => {
  const runtime = await mount(<NumberField testId="nf" label="Quantity" />);
  const input = inputOf(runtime, "nf");
  const box = Option.getOrElse(runtime.boundsOfId(input.id), () =>
    expect.fail("the input painted no box"),
  );
  runtime.clickAt(box.x + box.width / 2, box.y + box.height / 2);
  await settleFocus();
  const field = Option.getOrElse(runtime.element("nf"), () =>
    expect.fail("the runtime retained no field"),
  );
  expect(isFocusRing(field.style["boxShadow"])).toBe(true);
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

it("paints and announces the bound of an out-of-range supplied value", async () => {
  // The bug guarded (plan 362): only typed text went through `clampNumeric`, so
  // a record loaded with 150 under max=100 painted and announced "150", and the
  // first ArrowUp reported a *smaller* 100 while the up stepper was disabled.
  const field = recorder();
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Amount"
      value={150}
      max={100}
      autoFocus
      onValueChange={field.onValueChange}
    />,
  );
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { role: "TextInput", label: "Amount" }),
    ),
  ).toBe("100");
  runtime.keyDown("nf", "up");
  runtime.flush();
  expect(field.values).toStrictEqual([]);
  runtime.keyDown("nf", "down");
  runtime.flush();
  expect(field.values).toStrictEqual([99]);
});

it("commits the draft when focus leaves an enabled field", async () => {
  // The bug guarded (plan 591): published 0.10.0 dispatches no `onBlur`, so the
  // documented commit-on-blur never ran on a consumer install — a deferring
  // parent saw [12] here. The native-focus tracker now drives the commit.
  const field = recorder();
  const runtime = await mount(
    <Stack direction="row">
      <NumberField
        testId="nf"
        label="Quantity"
        autoFocus
        value={1}
        onValueChange={field.onValueChange}
      />
      <Button testId="after">After</Button>
    </Stack>,
  );
  runtime.type("2");
  expect(field.values).toStrictEqual([12]);
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  expect(field.values).toStrictEqual([12, 12]);
});

it("reformats a pending draft when the tracker observes focus leaving", async () => {
  // The visible half of plan 591: the value was reported while typing, but
  // without the tracked commit `1.5` stayed `1.5` on an unfocused field.
  const runtime = await mount(
    <Stack direction="row">
      <NumberField testId="nf" label="Quantity" precision={2} autoFocus />
      <Button testId="after">After</Button>
    </Stack>,
  );
  runtime.type("1.5");
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { role: "TextInput", label: "Quantity" }),
    ),
  ).toBe("1.50");
});

it("paints the value when a formatter returns only whitespace", async () => {
  // The bug guarded (plan 593): `formatValue` returning a blank computed string
  // (a missing unit or translation) left the field painting and announcing
  // nothing even though it held a value. The fixed-decimal default stands in.
  const runtime = await mount(
    <NumberField
      testId="nf"
      label="Quantity"
      value={12}
      precision={2}
      formatValue={() => "   "}
    />,
  );
  expect(
    Option.getOrUndefined(
      a11yValueOf(runtime.a11y(), { role: "TextInput", label: "Quantity" }),
    ),
  ).toBe("12.00");
});

it("does not commit its draft once the field is disabled", async () => {
  // The bug guarded (plan 362): `onBlur` committed unconditionally, so a field
  // disabled while an edit was pending reported the draft again when focus
  // moved — a "disabled" control changing a value. Measured before: [12, 12].
  const field = recorder();
  const runtime = await openWindow();
  const render = (disabled: boolean): void =>
    runtime.render(
      <Surface>
        <Stack direction="row">
          <NumberField
            testId="nf"
            label="Quantity"
            autoFocus
            disabled={disabled}
            value={1}
            onValueChange={field.onValueChange}
          />
          <Button testId="after">After</Button>
        </Stack>
      </Surface>,
    );
  render(false);
  runtime.type("2");
  expect(field.values).toStrictEqual([12]);
  render(true);
  runtime.flush();
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  expect(field.values).toStrictEqual([12]);
});

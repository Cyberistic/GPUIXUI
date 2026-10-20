/**
 * `OTPField` in the real GPUix runtime.
 *
 * The runtime facts this suite proves are the ones the element tree cannot: a
 * code can be typed into the native inputs and reaches `onValueChange` as one
 * contiguous string, focus follows the character into the next cell, arrows and
 * Backspace move it, and every cell is a named text input inside a named group.
 *
 * **Paste** is proven end to end in `otp-paste.runtime.test.tsx` (plan `752`):
 * 0.10.0 exposes no `onPaste`, but the native `<input>` reports a pasted run as
 * one multi-character edit, and the headless renderer uses the real platform
 * pasteboard — so a real `cmd-v` reaches this component. Typing one character at
 * a time is what this suite covers.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { TestElement } from "@gpuix/react/testing";
import { Button } from "../src/components/Button.js";
import { OTPField } from "../src/components/OTPField.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, isFocusRing, type Runtime } from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow, testTheme } from "./fixture.js";

/** The reported values, in order. */
const recorder = (): {
  readonly values: ReadonlyArray<string>;
  readonly complete: ReadonlyArray<string>;
  readonly onValueChange: (value: string) => void;
  readonly onComplete: (value: string) => void;
} => {
  const values: string[] = [];
  const complete: string[] = [];
  return {
    get values() {
      return values;
    },
    get complete() {
      return complete;
    },
    onValueChange: (value) => {
      values.push(value);
    },
    onComplete: (value) => {
      complete.push(value);
    },
  };
};

const lastValue = (values: ReadonlyArray<string>): string =>
  Option.getOrElse(Arr.last(values), () =>
    expect.fail("the field reported no change at all"),
  );

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

/** The native inputs the field painted. */
const cells = (runtime: Runtime): ReadonlyArray<TestElement> =>
  Arr.filter(runtime.all(), (element) => element.type === "input");

const focusedId = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () =>
    expect.fail("nothing held native focus"),
  );

it("fills the code one key at a time and completes once", async () => {
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      autoFocus
      onValueChange={field.onValueChange}
      onComplete={field.onComplete}
    />,
  );
  Arr.forEach(["1", "2", "3", "4", "5", "6"], (digit) => runtime.type(digit));
  expect(lastValue(field.values)).toBe("123456");
  expect(field.complete).toStrictEqual(["123456"]);
});

it("reports a corrected full code to onComplete again", async () => {
  // The contract guarded (plan 360): `onComplete` is not one-shot. An edit that
  // leaves the code full reports the new code, so `verify(code)` runs again
  // after a mistyped digit is corrected in place. The old wording ("once when
  // an edit makes the code complete") promised the opposite of what the docs'
  // own usage snippet needs.
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue="123456"
      onValueChange={field.onValueChange}
      onComplete={field.onComplete}
    />,
  );
  runtime.click("otp-cell-3");
  runtime.type("9");
  expect(field.complete).toStrictEqual(["129456"]);
  // A second correction, in a different cell, while the code is still full.
  runtime.click("otp-cell-4");
  runtime.type("8");
  expect(lastValue(field.values)).toBe("129856");
  expect(field.complete).toStrictEqual(["129456", "129856"]);
  // An edit that leaves the code incomplete reports nothing.
  runtime.keyDown("otp-cell-4", "backspace");
  runtime.keyUp("otp-cell-4", "backspace");
  expect(lastValue(field.values)).toBe("12956");
  expect(field.complete).toStrictEqual(["129456", "129856"]);
});

it("paints the first cell's ring from mount when autoFocus is set", async () => {
  // The runtime focuses the first cell without dispatching `onFocus`, so the
  // per-cell focus state starts on cell 0 and clears on blur.
  const runtime = await mount(
    <Stack direction="row">
      <OTPField testId="otp" label="Verification code" autoFocus />
      <Button testId="after">After</Button>
    </Stack>,
  );
  const ringed = (id: string): boolean =>
    Option.exists(runtime.element(id), (element) =>
      isFocusRing(element.style.boxShadow),
    );
  expect(focusedId(runtime)).toBe("otp-cell-1");
  expect(ringed("otp-cell-1")).toBe(true);
  runtime.click("after");
  runtime.flush();
  await awaitFrame(
    () => !ringed("otp-cell-1"),
    "the first cell clears its ring when focus leaves",
  );
  expect(ringed("otp-cell-1")).toBe(false);
});

it("moves native focus into the next cell as a character lands", async () => {
  const runtime = await mount(
    <OTPField testId="otp" label="Verification code" autoFocus />,
  );
  runtime.type("1");
  expect(focusedId(runtime)).toBe("otp-cell-2");
  runtime.keyDown("otp-cell-2", "left");
  runtime.keyUp("otp-cell-2", "left");
  expect(focusedId(runtime)).toBe("otp-cell-1");
});

it("clears backwards on Backspace in an empty cell", async () => {
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue="12"
      onValueChange={field.onValueChange}
    />,
  );
  runtime.keyUp("otp-cell-3", "backspace");
  expect(lastValue(field.values)).toBe("1");
  expect(focusedId(runtime)).toBe("otp-cell-2");
});

it("deletes only one character when Backspace empties a filled cell", async () => {
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue="123"
      onValueChange={field.onValueChange}
    />,
  );
  runtime.keyDown("otp-cell-3", "backspace");
  runtime.keyUp("otp-cell-3", "backspace");
  // The bug guarded: the native delete already emptied cell 3, and treating the
  // key-up as "Backspace in an empty cell" would delete cell 2 as well.
  expect(lastValue(field.values)).toBe("12");
  expect(focusedId(runtime)).toBe("otp-cell-3");
});

it("keeps the digit when a character the field cannot keep is typed", async () => {
  // The bug guarded (plan 358): a non-empty edit whose characters all normalise
  // away (a typed separator, e.g. the "-" in a code a provider prints) took the
  // same branch as a deletion, so typing it erased the cell's digit.
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue="12"
      onValueChange={field.onValueChange}
    />,
  );
  runtime.click("otp-cell-2");
  runtime.type("-");
  expect(field.values).toStrictEqual([]);
  // The cell still holds "2", so the next digit replaces it.
  runtime.type("9");
  expect(lastValue(field.values)).toBe("19");
});

it("exposes a named group of six named text inputs", async () => {
  const runtime = await mount(
    <OTPField testId="otp" label="Verification code" />,
  );
  const dump = runtime.a11y();
  expect(
    Option.isSome(
      a11yNode(dump, { role: "Group", label: "Verification code" }),
    ),
  ).toBe(true);
  expect(cells(runtime)).toHaveLength(6);
  Arr.forEach(Arr.range(1, 6), (index) => {
    expect(
      Option.isSome(
        a11yNode(dump, {
          role: "TextInput",
          label: `Verification code digit ${index}`,
        }),
      ),
      `cell ${index} is not a named text input`,
    ).toBe(true);
  });
});

it("paints the destructive border on every cell when invalid", async () => {
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue="1"
      invalid
    />,
  );
  Arr.forEach(cells(runtime), (cell) => {
    expect(cell.style["borderColor"]).toBe(testTheme.colors.destructive);
    // The same rule as every other field (plan 091): the surface stays the
    // field role; only the boundary reports the error.
    expect(cell.style["backgroundColor"]).toBe(testTheme.colors.input);
  });
});

it("rings only the cell the caret is in", async () => {
  const runtime = await mount(
    <OTPField testId="otp" label="Verification code" defaultValue="12" />,
  );
  runtime.click("otp-cell-2");
  runtime.flush();
  // A cell also paints the field recipe's resting elevation (`shadow-xs`, plan
  // 585), so "has a shadow" is not "is focused": the ring is the one with a
  // positive spread (plan 591).
  const ringed = (): ReadonlyArray<TestElement> =>
    Arr.filter(cells(runtime), (cell) => isFocusRing(cell.style["boxShadow"]));
  await awaitFrame(
    () => ringed().length === 1,
    "the caret's cell paints the focus ring",
  );
  expect(ringed()).toHaveLength(1);
});

/**
 * The bug guarded (plan `076`): every cell used to carry `tabIndex={0}`, so a
 * code was six tab stops and Tab appeared to stall for five presses. The field
 * must be one stop, on the cell where typing continues.
 */
it("is one tab stop: Tab enters at the first empty cell and the next Tab leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before" label="Before" onActivate={() => {}}>
        Before
      </Button>
      <OTPField testId="otp" label="Verification code" />
      <Button testId="after" label="After" onActivate={() => {}}>
        After
      </Button>
    </Stack>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("otp-cell-1");
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("after");
});

it("moves its one tab stop with the caret", async () => {
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before" label="Before" onActivate={() => {}}>
        Before
      </Button>
      <OTPField testId="otp" label="Verification code" defaultValue="12" />
      <Button testId="after" label="After" onActivate={() => {}}>
        After
      </Button>
    </Stack>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("otp-cell-3");
  runtime.type("3");
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("after");
});

it("refuses input and leaves the tab order while disabled", async () => {
  const field = recorder();
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before" label="Before" onActivate={() => {}}>
        Before
      </Button>
      <OTPField
        testId="otp"
        label="Verification code"
        disabled
        onValueChange={field.onValueChange}
      />
    </Stack>,
  );
  runtime.click("otp-cell-1");
  runtime.type("1 2 3");
  expect(field.values).toStrictEqual([]);
  runtime.click("before");
  runtime.focusNext();
  expect(
    Option.exists(runtime.focused(), (id) => id.startsWith("otp-cell")),
  ).toBe(false);
});

it("reports the code on Enter, so a code step submits from the keyboard", async () => {
  // The gap guarded (plan 805): `OTPField` was the one single-line field with
  // no submit path, while `Input` and `NumberField` both report Enter. A single
  // line `<input>` consumes Enter's key down and reports the host's `submit`
  // (measured, plan 339), so the cell now forwards it with the code.
  const field = recorder();
  const submits: string[] = [];
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      autoFocus
      onValueChange={field.onValueChange}
      onComplete={field.onComplete}
      onSubmit={(code) => submits.push(code)}
    />,
  );
  Arr.forEach(["1", "2", "3", "4", "5", "6"], (digit) => runtime.type(digit));
  expect(field.complete).toStrictEqual(["123456"]);
  runtime.keyDown("otp-cell-6", "enter");
  runtime.keyUp("otp-cell-6", "enter");
  runtime.flush();
  expect(submits).toStrictEqual(["123456"]);
  // Enter is not a second `onComplete`, and it does not move the caret.
  expect(field.complete).toStrictEqual(["123456"]);
  expect(focusedId(runtime)).toBe("otp-cell-6");
});

it("submits a partial code as it stands", async () => {
  // The field does not validate: a caller may submit a form before every cell
  // is filled, exactly as `onValueChange` reports partial codes.
  const submits: string[] = [];
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      autoFocus
      onSubmit={(code) => submits.push(code)}
    />,
  );
  runtime.type("1");
  runtime.type("2");
  runtime.keyDown("otp-cell-3", "enter");
  runtime.keyUp("otp-cell-3", "enter");
  runtime.flush();
  expect(submits).toStrictEqual(["12"]);
});

it("reports no submit while disabled", async () => {
  const submits: string[] = [];
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      disabled
      defaultValue="123456"
      onSubmit={(code) => submits.push(code)}
    />,
  );
  runtime.keyDown("otp-cell-1", "enter");
  runtime.keyUp("otp-cell-1", "enter");
  runtime.flush();
  expect(submits).toStrictEqual([]);
});

it("still submits the code it shows while read-only", async () => {
  // `readOnly` is the review state, not a disabled one: it refuses edits but a
  // form may submit the code the field is showing, like `NumberField` (339).
  const submits: string[] = [];
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verified code"
      readOnly
      autoFocus
      defaultValue="123456"
      onSubmit={(code) => submits.push(code)}
    />,
  );
  expect(focusedId(runtime)).toBe("otp-cell-1");
  runtime.keyDown("otp-cell-1", "enter");
  runtime.keyUp("otp-cell-1", "enter");
  runtime.flush();
  expect(submits).toStrictEqual(["123456"]);
});

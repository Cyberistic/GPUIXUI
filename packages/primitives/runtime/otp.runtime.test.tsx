/**
 * `OTPField` in the real GPUix runtime.
 *
 * The runtime facts this suite proves are the ones the element tree cannot: a
 * code can be typed into the native inputs and reaches `onChange` as one
 * contiguous string, focus follows the character into the next cell, arrows and
 * Backspace move it, and every cell is a named text input inside a named group.
 *
 * **Not proven here:** a real clipboard paste. `@gpuix/native` 0.11.0 exposes no
 * `onPaste` and the `TestRenderer` has no clipboard simulation, so the paste
 * branch is proven only as a pure rule (`core/otp.test.ts`: a multi-character
 * edit fills forward) and is documented as unverified in the docs page. It is
 * not faked with a keyboard sequence.
 */

import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { TestElement } from "@gpuix/react/testing";
import { Button } from "../src/components/Button.js";
import { OTPField, OTPFieldInput } from "../src/components/OTPField.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

/** The reported values, in order. */
const recorder = (): {
  readonly values: ReadonlyArray<string>;
  readonly complete: ReadonlyArray<string>;
  readonly onChange: (value: string) => void;
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
    onChange: (value) => {
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
      onChange={field.onChange}
      onComplete={field.onComplete}
    />,
  );
  Arr.forEach(["1", "2", "3", "4", "5", "6"], (digit) => runtime.type(digit));
  expect(lastValue(field.values)).toBe("123456");
  expect(field.complete).toStrictEqual(["123456"]);
});

it("reports Enter as a submit and leaves the code alone", async () => {
  const field = recorder();
  let submitted = 0;
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      autoFocus
      onChange={field.onChange}
      onSubmit={() => {
        submitted += 1;
      }}
    />,
  );
  runtime.type("1");
  runtime.type("2");
  runtime.type("enter");
  expect(lastValue(field.values)).toBe("12");
  expect(submitted).toBe(1);
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
      onChange={field.onChange}
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
      onChange={field.onChange}
    />,
  );
  runtime.keyDown("otp-cell-3", "backspace");
  runtime.keyUp("otp-cell-3", "backspace");
  // The bug guarded: the native delete already emptied cell 3, and treating the
  // key-up as "Backspace in an empty cell" would delete cell 2 as well.
  expect(lastValue(field.values)).toBe("12");
  expect(focusedId(runtime)).toBe("otp-cell-3");
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
  });
});

it("declares the keyboard ring on every cell and paints no shadow ring", async () => {
  // The runtime paints `focusVisible` only on the cell holding the caret; a
  // shadow ring merged per focused cell is the workaround this replaced.
  const runtime = await mount(
    <OTPField testId="otp" label="Verification code" defaultValue="12" />,
  );
  runtime.click("otp-cell-2");
  runtime.flush();
  const painted = Arr.filter(
    cells(runtime),
    (cell) => cell.style["boxShadow"] !== undefined,
  );
  expect(painted).toHaveLength(0);
  const declared = Arr.filter(
    cells(runtime),
    (cell) => cell.style["focusVisible"] !== undefined,
  );
  expect(declared.length).toBe(cells(runtime).length);
});

it("refuses input and leaves the tab order while disabled", async () => {
  const field = recorder();
  let submitted = 0;
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before" label="Before" onActivate={() => {}}>
        Before
      </Button>
      <OTPField
        testId="otp"
        label="Verification code"
        disabled
        onChange={field.onChange}
        onSubmit={() => {
          submitted += 1;
        }}
      />
    </Stack>,
  );
  runtime.click("otp-cell-1");
  runtime.type("1 2 3 enter");
  expect(field.values).toStrictEqual([]);
  expect(submitted).toBe(0);
  runtime.click("before");
  runtime.focusNext();
  expect(
    Option.exists(runtime.focused(), (id) => id.startsWith("otp-cell")),
  ).toBe(false);
});

it("paints a caller's cell composition from the field's own code", async () => {
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      length={2}
      label="Verification code"
      autoFocus
      onChange={field.onChange}
    >
      <OTPFieldInput index={0} />
      <OTPFieldInput index={1} />
    </OTPField>,
  );
  Arr.forEach(["1", "2"], (digit) => runtime.type(digit));
  expect(lastValue(field.values)).toBe("12");
  expect(cells(runtime)).toHaveLength(2);
});

it("is one tab stop, on the cell the code has reached", async () => {
  const runtime = await mount(
    <Stack direction="row">
      <Button testId="before">Before</Button>
      <OTPField
        testId="otp"
        length={4}
        label="Verification code"
        defaultValue="12"
      />
      <Button testId="after">After</Button>
    </Stack>,
  );
  runtime.click("before");
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("otp-cell-3");
  // The next Tab leaves the group instead of walking the other three cells.
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("after");
});

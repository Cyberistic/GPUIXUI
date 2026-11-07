import type { ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { TestElement } from "@gpuix/react/testing";
import { Button } from "../src/components/Button.js";
import { OTPField, OTPFieldInput } from "../src/components/OTPField.js";
import { Stack } from "../src/components/Stack.js";
import { a11yNode, a11yValueOf, type Runtime } from "./harness.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

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

it("does not complete again when an edit leaves a full code full", async () => {
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue="123456"
      onChange={field.onChange}
      onComplete={field.onComplete}
    />,
  );
  runtime.click("otp-cell-6");
  runtime.type("7");
  expect(lastValue(field.values)).toBe("123457");
  expect(field.complete).toStrictEqual([]);
});

it("completes again after a digit is deleted and retyped", async () => {
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue="12345"
      onChange={field.onChange}
      onComplete={field.onComplete}
    />,
  );
  runtime.click("otp-cell-6");
  runtime.type("6");
  runtime.keyDown("otp-cell-6", "backspace");
  runtime.keyUp("otp-cell-6", "backspace");
  runtime.type("7");
  expect(lastValue(field.values)).toBe("123457");
  expect(field.complete).toStrictEqual(["123456", "123457"]);
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

it("paints a stored code that is not text as an empty field a reader can still fill", async () => {
  const stored = { defaultValue: 123456, value: 123456 } as unknown as {
    readonly defaultValue?: string;
    readonly value?: string;
  };
  const editable = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      defaultValue={stored.defaultValue}
      onChange={editable.onChange}
    />,
  );
  expect(cells(runtime)).toHaveLength(6);

  expect(a11yValueOf(runtime.a11y(), { role: "TextInput" })).toStrictEqual(
    Option.none(),
  );
  runtime.click("otp-cell-1");
  runtime.type("1");
  expect(lastValue(editable.values)).toBe("1");

  const controlled = await mount(
    <OTPField testId="otp" label="Verification code" value={stored.value} />,
  );
  expect(cells(controlled)).toHaveLength(6);
  expect(a11yValueOf(controlled.a11y(), { role: "TextInput" })).toStrictEqual(
    Option.none(),
  );
});

it("draws the documented six cells for a stored length that is not a number", async () => {
  const stored = { length: "2" } as unknown as { readonly length?: number };
  const field = recorder();
  const runtime = await mount(
    <OTPField
      testId="otp"
      label="Verification code"
      length={stored.length}
      autoFocus
      onChange={field.onChange}
      onComplete={field.onComplete}
    />,
  );
  expect(cells(runtime)).toHaveLength(6);
  Arr.forEach(["1", "2", "3", "4", "5"], (digit) => runtime.type(digit));
  expect(field.complete).toStrictEqual([]);
  runtime.type("6");
  expect(field.complete).toStrictEqual(["123456"]);
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

  runtime.focusNext();
  expect(focusedId(runtime)).toBe("after");
});

it("keeps its tab stop when the field shortens under a focused cell", async () => {
  const runtime = await openWindow();
  const field = (length: number): ReactNode => (
    <Surface>
      <Stack direction="row">
        <Button testId="before">Before</Button>
        <OTPField
          testId="otp"
          length={length}
          label="Verification code"
          defaultValue="123456"
        />
        <Button testId="after">After</Button>
      </Stack>
    </Surface>
  );
  runtime.render(field(6));
  runtime.click("otp-cell-6");
  runtime.render(field(4));
  runtime.click("before");
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("otp-cell-4");
});

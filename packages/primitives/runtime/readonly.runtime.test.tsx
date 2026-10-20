/**
 * The field family's read-only state, in the real GPUix runtime.
 *
 * The bug guarded (plan `786`): `readOnly` was documented for `Input`/`TextArea`
 * but never driven in a native suite, and `NumberField`/`OTPField` had no such
 * state at all — only `disabled`, which also leaves the tab order. A read-only
 * field must keep focus, its ring and its value while refusing every edit path.
 * Each case records `onValueChange`; the writable twins prove the same gesture
 * does report, so a probe that typed into nothing cannot pass.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { Stack } from "../src/components/Stack.js";
import { TextArea } from "../src/components/TextArea.js";
import { Surface, openWindow } from "./fixture.js";

/** The `testId` of whatever holds native focus, or a failure naming the case. */
const focusedId = (focused: Option.Option<string>, what: string): string =>
  Option.getOrElse(focused, () => expect.fail(what));

it("a read-only Input takes focus and refuses every edit", async () => {
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Name"
        autoFocus
        defaultValue="keep"
        readOnly
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  expect(
    focusedId(runtime.focused(), "the read-only field took no focus"),
  ).toBe("field");
  runtime.type("x y z");
  expect(values).toStrictEqual([]);
});

it("the same Input without readOnly reports the edit", async () => {
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <Input
        testId="field"
        label="Name"
        autoFocus
        defaultValue="keep"
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  runtime.type("x y z");
  expect(values).toStrictEqual(["keepx", "keepxy", "keepxyz"]);
});

it("a read-only TextArea takes focus and refuses every edit", async () => {
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <TextArea
        testId="area"
        label="Notes"
        autoFocus
        defaultValue="keep"
        readOnly
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  expect(
    focusedId(runtime.focused(), "the read-only textarea took no focus"),
  ).toBe("area");
  runtime.type("x y z");
  expect(values).toStrictEqual([]);
});

it("a read-only NumberField refuses typing, the arrows and the stepper", async () => {
  const runtime = await openWindow();
  const values: number[] = [];
  runtime.render(
    <Surface>
      <NumberField
        testId="number"
        label="Total"
        autoFocus
        defaultValue={5}
        readOnly
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  expect(
    focusedId(runtime.focused(), "the read-only field took no focus"),
  ).toBe("number-input");
  runtime.type("7");
  runtime.keyDown("number-input", "up");
  runtime.keyUp("number-input", "up");
  runtime.keyDown("number-input", "pageup");
  runtime.keyUp("number-input", "pageup");
  const box = Option.getOrElse(runtime.paintBounds("number"), () =>
    expect.fail("the field painted no box"),
  );
  runtime.clickAt(box.x + box.width - 8, box.y + box.height / 4);
  expect(values).toStrictEqual([]);
});

it("the same NumberField without readOnly reports typing, an arrow and the stepper", async () => {
  const runtime = await openWindow();
  const values: number[] = [];
  runtime.render(
    <Surface>
      <NumberField
        testId="number"
        label="Total"
        autoFocus
        defaultValue={5}
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  runtime.type("7");
  runtime.keyDown("number-input", "up");
  runtime.keyUp("number-input", "up");
  const box = Option.getOrElse(runtime.paintBounds("number"), () =>
    expect.fail("the field painted no box"),
  );
  runtime.clickAt(box.x + box.width - 8, box.y + box.height / 4);
  expect(values).toStrictEqual([57, 58, 59]);
});

it("a read-only OTPField keeps one tab stop on cell 1 and refuses edits", async () => {
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <Stack direction="column" gap="md">
        <OTPField
          testId="otp"
          label="Code"
          length={3}
          autoFocus
          defaultValue="123"
          readOnly
          onValueChange={(value) => values.push(value)}
        />
        <Button testId="after">Continue</Button>
      </Stack>
    </Surface>,
  );
  expect(focusedId(runtime.focused(), "the read-only code took no focus")).toBe(
    "otp-cell-1",
  );
  runtime.type("9");
  runtime.keyUp("otp-cell-1", "backspace");
  expect(values).toStrictEqual([]);
  runtime.focusNext();
  expect(Option.getOrUndefined(runtime.focused())).toBe("after");
});

it("the same OTPField without readOnly reports typing and Backspace", async () => {
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <OTPField
        testId="otp"
        label="Code"
        length={3}
        autoFocus
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  runtime.type("9");
  expect(values).toStrictEqual(["9"]);
});

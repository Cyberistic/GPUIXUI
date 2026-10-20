/**
 * The field family's read-only state, in the real GPUix runtime.
 *
 * The bug guarded (plan `786`): `readOnly` was documented for `Input`/`TextArea`
 * but never driven in a native suite, and `NumberField`/`OTPField` had no such
 * state at all — only `disabled`, which also leaves the tab order. A read-only
 * field must keep focus, its ring and its value while refusing every edit path.
 * Each case records `onValueChange`; the writable twins prove the same gesture
 * does report, so a probe that typed into nothing cannot pass.
 *
 * Plan `797` extends the same contract to the one field-shaped control that had
 * only `disabled`: a read-only `Select` keeps its tab stop, name, announced
 * value and field chrome while every open path is refused. The writable twin
 * opens and reports on the same click, so a click that missed the trigger
 * cannot pass.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { Select } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { TextArea } from "../src/components/TextArea.js";
import { a11yValueOf } from "../src/testing/index.js";
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

/** The fruit list the two Select cases share. */
const FRUIT = [
  { value: "apple", label: "Apple" },
  { value: "pear", label: "Pear" },
] as const;

it("a read-only Select keeps its tab stop and refuses every open path", async () => {
  const runtime = await openWindow();
  const values: string[] = [];
  const requests: boolean[] = [];
  runtime.render(
    <Surface>
      <Stack direction="column" gap="md">
        <Select
          testId="sel"
          label="Fruit"
          placeholder="Pick a fruit"
          defaultValue="apple"
          readOnly
          options={FRUIT}
          onValueChange={(value) => values.push(value)}
          onOpenChange={(open) => requests.push(open)}
        />
        <Button testId="after">Continue</Button>
      </Stack>
    </Surface>,
  );
  runtime.flush();

  runtime.focusNext();
  runtime.flush();
  expect(Option.getOrUndefined(runtime.focused())).toBe("sel-trigger");

  // The displayed state, not the blocked one: the field keeps its chrome and
  // takes the default cursor, and the chevron that promises a list is absent.
  const trigger = Option.getOrElse(runtime.element("sel-trigger"), () =>
    expect.fail("the read-only select painted no trigger"),
  );
  expect(trigger.style.cursor).toBe("default");
  expect(trigger.style.opacity).toBeUndefined();
  expect(Option.isNone(runtime.element("sel-chevron"))).toBe(true);
  expect(
    a11yValueOf(runtime.a11y(), { role: "ComboBox", label: "Fruit" }),
  ).toEqual(Option.some("Apple"));

  // Every path that opens an editable select is refused.
  runtime.click("sel-trigger");
  runtime.flush();
  runtime.keyDown("sel-trigger", "enter");
  runtime.flush();
  runtime.keyDown("sel-trigger", "space");
  runtime.flush();
  runtime.keyDown("sel-trigger", "down");
  runtime.flush();
  // A printable key is the type-ahead path; unguarded it would commit "Pear".
  runtime.keyDown("sel-trigger", "p");
  runtime.flush();

  expect(Option.isNone(runtime.element("sel-content"))).toBe(true);
  expect(a11yValueOf(runtime.a11y(), { role: "ListBox" })).toEqual(
    Option.none(),
  );
  expect(values).toStrictEqual([]);
  expect(requests).toStrictEqual([]);
  expect(Option.getOrUndefined(runtime.focused())).toBe("sel-trigger");

  // The trigger is still a tab stop: the next Tab leaves the field.
  runtime.focusNext();
  runtime.flush();
  expect(Option.getOrUndefined(runtime.focused())).toBe("after");
});

it("the same Select without readOnly opens and reports a choice", async () => {
  const runtime = await openWindow();
  const values: string[] = [];
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        placeholder="Pick a fruit"
        defaultValue="apple"
        options={FRUIT}
        onValueChange={(value) => values.push(value)}
      />
    </Surface>,
  );
  runtime.flush();
  runtime.click("sel-trigger");
  runtime.flush();
  expect(Option.isSome(runtime.element("sel-content"))).toBe(true);
  runtime.click("sel-option-pear");
  runtime.flush();
  expect(values).toStrictEqual(["pear"]);
});

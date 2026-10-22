/**
 * The address and announced help of the controls that used to have neither.
 *
 * `Input` and `TextArea` gained this surface first (`fields.runtime.test.tsx`):
 * a form focuses the field it failed on, an automation host addresses it by
 * `aria-id`, and a `Label`'s description reaches assistive technology through
 * `aria-description` because 0.11.0 has no `aria-describedby`. The same three
 * jobs apply to every other control a form owns — a checkbox, a switch, a
 * toggle, a radio group, a rating, a number field and a code field — and the
 * guarantee this suite holds is that the words reach the runtime's accessibility
 * tree and the ref receives the runtime's own element, not a wrapper id.
 *
 * A composite names the element the address lands on, because only one element
 * can hold it: a number field's inner `<input>`, a code field's first cell, and
 * the row or star a group's tab stop sits on.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { createRef } from "react";
import type { PublicInstance } from "@gpuix/react";
import { Checkbox } from "../src/components/Checkbox.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Toggle } from "../src/components/Toggle.js";
import { a11yNode, type Runtime } from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

/** The accessibility node that says it is this role and name. */
const node = (runtime: Runtime, role: string, label: string) =>
  Option.getOrElse(a11yNode(runtime.a11y(), { role, label }), () =>
    expect.fail(`the runtime painted no ${role} named ${label}`),
  );

/** The element the runtime retained under this accessible name. */
const addressed = (runtime: Runtime, label: string) =>
  Option.getOrElse(
    Option.fromNullishOr(
      runtime
        .all()
        .find((element) => element.customProps?.["aria-label"] === label),
    ),
    () => expect.fail(`the runtime retained no element named ${label}`),
  );

const mount = async (): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="sm">
        <Checkbox
          testId="accept"
          label="Accept"
          description="Required to continue."
          aria-id="accept-box"
          ref={checkboxRef}
        />
        <Switch
          testId="notify"
          label="Notify"
          description="Sends a digest each morning."
          aria-id="notify-switch"
          ref={switchRef}
        />
        <Toggle
          testId="bold"
          label="Bold"
          description="Applies to the next word."
          aria-id="bold-toggle"
        />
        <RadioGroup
          testId="plan"
          label="Plan"
          description="Choose the plan to bill."
          aria-id="plan-row"
          defaultValue="alpha"
          options={[
            { value: "alpha", label: "Alpha" },
            { value: "beta", label: "Beta" },
          ]}
          ref={radioRef}
        />
        <Rating
          testId="quality"
          label="Quality"
          description="Rate the last release."
          aria-id="quality-star"
          defaultValue={3}
          ref={ratingRef}
        />
        <NumberField
          testId="copies"
          label="Copies"
          description="One to ninety-nine."
          aria-id="copies-input"
          defaultValue={5}
          ref={numberRef}
        />
        <OTPField
          testId="code"
          label="Code"
          description="Six digits from the email."
          aria-id="code-first-cell"
          length={3}
          ref={otpRef}
        />
      </Stack>
    </Surface>,
  );
  return runtime;
};

const checkboxRef = createRef<PublicInstance>();
const switchRef = createRef<PublicInstance>();
const radioRef = createRef<PublicInstance>();
const ratingRef = createRef<PublicInstance>();
const numberRef = createRef<PublicInstance>();
const otpRef = createRef<PublicInstance>();

it("announces the help every control carries", async () => {
  // The help a visible `Label description` paints used to reach nobody on these
  // controls: only `Input`/`TextArea` carried `aria-description`.
  const runtime = await mount();
  expect(node(runtime, "CheckBox", "Accept").aria?.description).toBe(
    "Required to continue.",
  );
  expect(node(runtime, "Switch", "Notify").aria?.description).toBe(
    "Sends a digest each morning.",
  );
  expect(node(runtime, "Button", "Bold").aria?.description).toBe(
    "Applies to the next word.",
  );
  expect(node(runtime, "RadioGroup", "Plan").aria?.description).toBe(
    "Choose the plan to bill.",
  );
  expect(node(runtime, "RadioGroup", "Quality").aria?.description).toBe(
    "Rate the last release.",
  );
  expect(node(runtime, "TextInput", "Copies").aria?.description).toBe(
    "One to ninety-nine.",
  );
  // Every cell is independently focusable, so every cell announces it.
  expect(node(runtime, "TextInput", "Code digit 1").aria?.description).toBe(
    "Six digits from the email.",
  );
  expect(node(runtime, "TextInput", "Code digit 3").aria?.description).toBe(
    "Six digits from the email.",
  );
});

it("publishes the id an automation host addresses, on the element named", async () => {
  // A composite cannot put one id on every part: a number field's id belongs to
  // its input, a code field's to the first cell, and a group's to the row or
  // star that holds its tab stop.
  const runtime = await mount();
  expect(node(runtime, "CheckBox", "Accept").aria?.author_id).toBe(
    "accept-box",
  );
  expect(node(runtime, "Switch", "Notify").aria?.author_id).toBe(
    "notify-switch",
  );
  expect(node(runtime, "Button", "Bold").aria?.author_id).toBe("bold-toggle");
  expect(node(runtime, "RadioButton", "Alpha").aria?.author_id).toBe(
    "plan-row",
  );
  expect(node(runtime, "RadioButton", "Beta").aria?.author_id).toBeUndefined();
  expect(node(runtime, "RadioButton", "3 of 5").aria?.author_id).toBe(
    "quality-star",
  );
  expect(node(runtime, "TextInput", "Copies").aria?.author_id).toBe(
    "copies-input",
  );
  expect(node(runtime, "TextInput", "Code digit 1").aria?.author_id).toBe(
    "code-first-cell",
  );
  expect(
    node(runtime, "TextInput", "Code digit 2").aria?.author_id,
  ).toBeUndefined();
});

it("hands the caller's ref the element the form has to focus", async () => {
  // The address is only useful if it is the runtime's own instance: a form
  // focuses this handle, so the id is compared with the element the control
  // painted, not with the wrapper's `testId`.
  const runtime = await mount();
  const checkbox = Option.getOrElse(runtime.element("accept"), () =>
    expect.fail("the runtime mounted no checkbox"),
  );
  expect(checkboxRef.current?.id).toBe(checkbox.id);

  const switched = Option.getOrElse(runtime.element("notify"), () =>
    expect.fail("the runtime mounted no switch"),
  );
  expect(switchRef.current?.id).toBe(switched.id);

  expect(radioRef.current?.id).toBe(addressed(runtime, "Alpha").id);
  expect(ratingRef.current?.id).toBe(addressed(runtime, "3 of 5").id);

  const number = Option.getOrElse(
    Option.fromNullishOr(
      runtime.all().find((element) => element.type === "input"),
    ),
    () => expect.fail("the number field painted no input"),
  );
  expect(numberRef.current?.id).toBe(number.id);

  const firstCell = Option.getOrElse(runtime.element("code-cell-1"), () =>
    expect.fail("the code field mounted no first cell"),
  );
  expect(otpRef.current?.id).toBe(firstCell.id);
});

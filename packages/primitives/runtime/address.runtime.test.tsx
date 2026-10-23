/**
 * The address and announced help of the controls that used to have neither.
 *
 * `Input` and `TextArea` gained this surface first (`fields.runtime.test.tsx`):
 * a form focuses the field it failed on, an automation host addresses it by
 * `aria-id`, and a `Label`'s description reaches assistive technology through
 * `aria-description` because 0.11.0 has no `aria-describedby`. The same three
 * jobs apply to every other control a form owns — a checkbox, a switch, a
 * toggle, the radio, checkbox and toggle groups, a rating, a number field, a
 * code field, the two sliders and a select — and the guarantee this suite holds
 * is that the words reach the runtime's accessibility tree and the ref receives
 * the runtime's own element, not a wrapper id.
 *
 * A composite names the element the address lands on, because only one element
 * can hold it: a number field's inner `<input>`, a code field's first cell, the
 * row or star a group's tab stop sits on, and the thumb of a range slider that
 * holds the keyboard focus.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { createRef } from "react";
import type { PublicInstance } from "@gpuix/react";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Select } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
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
        <CheckboxGroup
          testId="channels"
          label="Channels"
          description="Pick at least one."
          aria-id="channels-row"
          options={[
            { value: "email", label: "Email" },
            { value: "push", label: "Push" },
          ]}
          ref={channelGroupRef}
        />
        <ToggleGroup
          testId="alignment"
          label="Alignment"
          description="Applies to the selected text."
          aria-id="alignment-row"
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
          ]}
          ref={alignGroupRef}
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
        <Slider
          testId="volume"
          label="Volume"
          description="Controls the output level."
          aria-id="volume-track"
          defaultValue={62}
          ref={sliderRef}
        />
        <RangeSlider
          testId="price"
          label="Price"
          description="Between one and nine hundred."
          aria-id="price-start"
          defaultValue={[20, 60] as const}
          ref={rangeRef}
        />
        <Select
          testId="fruit"
          triggerTestId="fruit-trigger"
          label="Fruit"
          description="Pick a fruit to ship."
          aria-id="fruit-trigger-id"
          ref={fruitRef}
          options={[
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear" },
          ]}
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
const channelGroupRef = createRef<PublicInstance>();
const alignGroupRef = createRef<PublicInstance>();
const numberRef = createRef<PublicInstance>();
const otpRef = createRef<PublicInstance>();
const sliderRef = createRef<PublicInstance>();
const rangeRef = createRef<PublicInstance>();
const fruitRef = createRef<PublicInstance>();

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
  expect(node(runtime, "Slider", "Volume").aria?.description).toBe(
    "Controls the output level.",
  );
  // The group is not focusable but it is a node, so its help rides there.
  expect(node(runtime, "Group", "Price").aria?.description).toBe(
    "Between one and nine hundred.",
  );
  expect(node(runtime, "Group", "Channels").aria?.description).toBe(
    "Pick at least one.",
  );
  expect(node(runtime, "Group", "Alignment").aria?.description).toBe(
    "Applies to the selected text.",
  );
  expect(node(runtime, "ComboBox", "Fruit").aria?.description).toBe(
    "Pick a fruit to ship.",
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
  expect(node(runtime, "Slider", "Volume").aria?.author_id).toBe(
    "volume-track",
  );
  expect(node(runtime, "Slider", "Price minimum").aria?.author_id).toBe(
    "price-start",
  );
  expect(
    node(runtime, "Slider", "Price maximum").aria?.author_id,
  ).toBeUndefined();
  expect(node(runtime, "CheckBox", "Email").aria?.author_id).toBe(
    "channels-row",
  );
  expect(node(runtime, "CheckBox", "Push").aria?.author_id).toBeUndefined();
  expect(node(runtime, "Button", "Left").aria?.author_id).toBe("alignment-row");
  expect(node(runtime, "Button", "Center").aria?.author_id).toBeUndefined();
  expect(node(runtime, "ComboBox", "Fruit").aria?.author_id).toBe(
    "fruit-trigger-id",
  );
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

  // A slider's root is both the slider and its tab stop; a range slider's
  // address names the end a form should focus, which is its start while
  // neither thumb holds focus.
  const slider = Option.getOrElse(runtime.element("volume"), () =>
    expect.fail("the runtime mounted no slider"),
  );
  expect(sliderRef.current?.id).toBe(slider.id);
  expect(rangeRef.current?.id).toBe(addressed(runtime, "Price minimum").id);
  expect(channelGroupRef.current?.id).toBe(addressed(runtime, "Email").id);
  expect(alignGroupRef.current?.id).toBe(addressed(runtime, "Left").id);
  // A select's address belongs to its trigger, the one focusable element.
  expect(fruitRef.current?.id).toBe(addressed(runtime, "Fruit").id);
});

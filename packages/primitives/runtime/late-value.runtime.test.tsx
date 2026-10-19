/**
 * Every controlled part adopts a value supplied after it mounted.
 *
 * The bug class (plan `324`): the shared controlled rule froze its mode at
 * mount, so `<Input value={data?.name}>` typed `"x"` instead of `"loadedx"`
 * once the parent's record arrived, and a late `checked` stayed `"unchecked"`.
 * Plan `324` fixed the one rule (`withValue` in `src/core/state.ts`, shared by
 * fourteen parts) but measured only `Input` and `Checkbox`; `NumberField` got
 * its own cases in plans `325`/`326`. A part that keeps a private copy of the
 * value it mounted with would still pass its own suite.
 *
 * This matrix mounts each remaining part uncontrolled, re-renders the same tree
 * with a value, and reads the accessibility tree — never the prop — so a value
 * that reaches React but not the paint fails by part name. Each case uses a
 * fresh window because the harness dispatches input to the window it rendered
 * last.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Select } from "../src/components/Select.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { a11yValueOf, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** The value the named accessibility node reports. */
const valueOf = (runtime: Runtime, label: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { label }), () =>
    expect.fail(`no accessibility node is named "${label}"`),
  );

/** The value a node with this role reports. */
const valueOfRole = (runtime: Runtime, role: string): string =>
  Option.getOrElse(a11yValueOf(runtime.a11y(), { role }), () =>
    expect.fail(`no accessibility node has role "${role}"`),
  );

/** Mount `first`, replace it with `second`, and read the result. */
const afterLateValue = async (
  first: ReactElement,
  second: ReactElement,
  read: (runtime: Runtime) => string,
): Promise<string> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{first}</Surface>);
  runtime.flush();
  runtime.render(<Surface>{second}</Surface>);
  runtime.flush();
  return read(runtime);
};

it("Switch announces a checked supplied after mount", async () => {
  const value = await afterLateValue(
    <Switch testId="switch" label="Enable" />,
    <Switch testId="switch" label="Enable" checked />,
    (runtime) => valueOf(runtime, "Enable"),
  );
  expect(value).toBe("checked");
});

it("Toggle announces a pressed supplied after mount", async () => {
  const value = await afterLateValue(
    <Toggle testId="toggle" label="Bold">
      Bold
    </Toggle>,
    <Toggle testId="toggle" label="Bold" pressed>
      Bold
    </Toggle>,
    (runtime) => valueOf(runtime, "Bold"),
  );
  expect(value).toBe("pressed");
});

it("RadioGroup checks the option a late value names", async () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ] as const;
  const value = await afterLateValue(
    <RadioGroup testId="radio" label="Pick" options={options} />,
    <RadioGroup testId="radio" label="Pick" options={options} value="b" />,
    (runtime) => valueOf(runtime, "Beta"),
  );
  expect(value).toBe("checked");
});

it("ToggleGroup presses the item a late value names", async () => {
  const options = [
    { value: "a", label: "Left" },
    { value: "b", label: "Right" },
  ] as const;
  const value = await afterLateValue(
    <ToggleGroup
      testId="toggle-group"
      label="Align"
      type="single"
      options={options}
    />,
    <ToggleGroup
      testId="toggle-group"
      label="Align"
      type="single"
      options={options}
      value="b"
    />,
    (runtime) => valueOf(runtime, "Right"),
  );
  expect(value).toBe("pressed");
});

it("CheckboxGroup checks the row a late value names", async () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ] as const;
  const value = await afterLateValue(
    <CheckboxGroup testId="checkbox-group" options={options} />,
    <CheckboxGroup testId="checkbox-group" options={options} value={["b"]} />,
    (runtime) => valueOf(runtime, "Beta"),
  );
  expect(value).toBe("checked");
});

it("Rating fills the stars a late value names", async () => {
  const value = await afterLateValue(
    <Rating testId="rating" label="Score" />,
    <Rating testId="rating" label="Score" value={3} />,
    (runtime) => `${valueOf(runtime, "3 of 5")} ${valueOf(runtime, "4 of 5")}`,
  );
  expect(value).toBe("checked unchecked");
});

it("Slider reports a late value", async () => {
  const value = await afterLateValue(
    <Slider testId="slider" label="Volume" />,
    <Slider testId="slider" label="Volume" value={70} />,
    (runtime) => valueOf(runtime, "Volume"),
  );
  expect(value).toBe("70");
});

it("RangeSlider moves both thumbs to a late value", async () => {
  const value = await afterLateValue(
    <RangeSlider testId="range" label="Range" />,
    <RangeSlider testId="range" label="Range" value={[30, 70] as const} />,
    (runtime) =>
      `${valueOf(runtime, "Range minimum")} ${valueOf(runtime, "Range maximum")}`,
  );
  expect(value).toBe("30 70");
});

it("OTPField paints the digits a late value names", async () => {
  const value = await afterLateValue(
    <OTPField testId="otp" label="Code" />,
    <OTPField testId="otp" label="Code" value="12" />,
    (runtime) =>
      `${valueOf(runtime, "Code digit 1")}${valueOf(runtime, "Code digit 2")}`,
  );
  expect(value).toBe("12");
});

it("NumberField paints and announces a late value", async () => {
  const value = await afterLateValue(
    <NumberField testId="number" label="Count" />,
    <NumberField testId="number" label="Count" value={42} />,
    (runtime) => valueOf(runtime, "Count"),
  );
  expect(value).toBe("42");
});

it("TextArea edits from the text a late value supplied", async () => {
  const reported: string[] = [];
  const value = await afterLateValue(
    <TextArea
      testId="notes"
      label="Notes"
      onValueChange={(text) => reported.push(text)}
    />,
    <TextArea
      testId="notes"
      label="Notes"
      value="loaded"
      onValueChange={(text) => reported.push(text)}
    />,
    (runtime) => {
      runtime.keyDown("notes", "end");
      runtime.type("x");
      return Option.getOrElse(Option.fromNullishOr(reported.at(-1)), () =>
        expect.fail("the field reported no edit"),
      );
    },
  );
  expect(value).toBe("loadedx");
});

it("Select shows the option a late value names", async () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
  ] as const;
  const value = await afterLateValue(
    <Select testId="select" label="Letter" options={options} />,
    <Select testId="select" label="Letter" options={options} value="b" />,
    (runtime) => valueOfRole(runtime, "ComboBox"),
  );
  expect(value).toBe("Beta");
});

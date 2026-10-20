/**
 * The validation matrix (plan `351`).
 *
 * Two shipped defects were one class: `RadioGroup` accepted no `invalid` at all
 * (plan `061`) and `Rating` accepted it and painted nothing (plan `070`), while
 * every other selectable control showed the failed validation. The package had
 * cross-control guards for focus rings, tab order, names and disabled-after-focus
 * but none for this state, so the next control to grow a validation prop could
 * repeat it.
 *
 * One case per control: with `invalid` the tree applies the theme's destructive
 * role; without it, it does not. The scan is over every applied colour rather
 * than one element's property — the state lands on a border, a tint or a text
 * colour depending on the control, and the defect class is "paints nothing".
 * Each control's own suite still asserts *where* it lands.
 *
 * Plan `356` added the nested direction: the scan above reads top-level colours
 * only, so an interaction rule that repainted the healthy border over the error
 * was invisible; the final case reads the authored `hover`/`active` blocks.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Input } from "../src/components/Input.js";
import { Label } from "../src/components/Label.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { RangeSlider } from "../src/components/Slider.js";
import { Rating } from "../src/components/Rating.js";
import { Select } from "../src/components/Select.js";
import { Slider } from "../src/components/Slider.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { ThemeProvider } from "../src/components/ThemeProvider.js";
import { openWindow, testTheme } from "./fixture.js";
import { paintedColours, rgbOf, styleOf } from "./theme.js";

/** Every control that declares an `invalid` prop, and the minimum data it needs. */
const INVALID_CONTROLS: ReadonlyArray<
  readonly [string, (invalid: boolean) => ReactElement]
> = [
  ["Checkbox", (invalid) => <Checkbox label="Accept" invalid={invalid} />],
  [
    "CheckboxGroup",
    (invalid) => (
      <CheckboxGroup
        label="Pick"
        options={[{ value: "a", label: "A" }]}
        invalid={invalid}
      />
    ),
  ],
  ["Input", (invalid) => <Input label="Name" invalid={invalid} />],
  ["Label", (invalid) => <Label invalid={invalid}>Name</Label>],
  ["NumberField", (invalid) => <NumberField label="Count" invalid={invalid} />],
  ["OTPField", (invalid) => <OTPField label="Code" invalid={invalid} />],
  [
    "RadioGroup",
    (invalid) => (
      <RadioGroup
        label="Pick"
        options={[{ value: "a", label: "A" }]}
        invalid={invalid}
      />
    ),
  ],
  ["RangeSlider", (invalid) => <RangeSlider label="Span" invalid={invalid} />],
  ["Rating", (invalid) => <Rating label="Rate" invalid={invalid} />],
  [
    "Select",
    (invalid) => (
      <Select
        label="Pick"
        options={[{ value: "a", label: "A" }]}
        invalid={invalid}
      />
    ),
  ],
  ["Slider", (invalid) => <Slider label="Amount" invalid={invalid} />],
  ["Switch", (invalid) => <Switch label="On" invalid={invalid} />],
  ["TextArea", (invalid) => <TextArea label="Notes" invalid={invalid} />],
];

/** The colours one control applies in a fresh window. */
const coloursOf = async (
  render: (invalid: boolean) => ReactElement,
  invalid: boolean,
): Promise<ReadonlyArray<string>> => {
  const runtime = await openWindow();
  runtime.render(
    <ThemeProvider theme={testTheme}>{render(invalid)}</ThemeProvider>,
  );
  return paintedColours(runtime);
};

it.each(INVALID_CONTROLS)(
  "%s paints the destructive role only when invalid",
  async (_name, render) => {
    const destructive = rgbOf(testTheme.colors.destructive);
    expect(await coloursOf(render, true)).toContain(destructive);
    expect(await coloursOf(render, false)).not.toContain(destructive);
  },
);

/** The nested interaction rule an element declares, or a named failure. */
const interactionOf = async (
  node: ReactElement,
  testId: string,
  state: "hover" | "active",
): Promise<unknown> => {
  const runtime = await openWindow();
  runtime.render(<ThemeProvider theme={testTheme}>{node}</ThemeProvider>);
  return Option.getOrElse(
    Option.fromNullishOr(styleOf(runtime, testId)[state]),
    () => expect.fail(`${testId} declared no ${state}`),
  );
};

it("keeps the destructive boundary through hover and press on an invalid control", async () => {
  // Plan 356: the matrix above reads top-level colours only, so the nested
  // hover/press rules were unguarded — measured, an invalid box painted the
  // healthy border for the whole gesture.
  const destructive = { borderColor: testTheme.colors.destructive };
  expect(
    await interactionOf(
      <Checkbox testId="cb" label="Accept" invalid />,
      "cb",
      "hover",
    ),
  ).toMatchObject(destructive);
  expect(
    await interactionOf(
      <Checkbox testId="cb" label="Accept" invalid />,
      "cb",
      "active",
    ),
  ).toMatchObject(destructive);
  expect(
    await interactionOf(
      <Switch testId="sw" label="On" invalid />,
      "sw",
      "hover",
    ),
  ).toMatchObject(destructive);
  expect(
    await interactionOf(
      <Switch testId="sw" label="On" invalid />,
      "sw",
      "active",
    ),
  ).toMatchObject(destructive);
  // A valid control still takes the healthy interaction colours, so the cases
  // above are the invalid rule and not a lost feedback declaration.
  expect(
    await interactionOf(<Checkbox testId="ok" label="Accept" />, "ok", "hover"),
  ).toMatchObject({ borderColor: testTheme.colors.borderStrong });
  expect(
    await interactionOf(
      <Checkbox testId="ok" label="Accept" />,
      "ok",
      "active",
    ),
  ).toMatchObject({ borderColor: testTheme.colors.ring });
});

/**
 * The five surfaces that resolve `fieldRecipeStyle` (plan 781), with the
 * locator of the element that carries the field's chrome.
 */
const INVALID_FIELDS: ReadonlyArray<readonly [string, ReactElement, string]> = [
  ["Input", <Input testId="input" label="Name" invalid />, "input"],
  [
    "TextArea",
    <TextArea testId="textarea" label="Notes" invalid />,
    "textarea",
  ],
  [
    "NumberField",
    <NumberField testId="number" label="Count" invalid />,
    "number",
  ],
  [
    "Select",
    <Select
      testId="select"
      label="Pick"
      options={[{ value: "a", label: "A" }]}
      invalid
    />,
    "select-trigger",
  ],
  ["OTPField", <OTPField testId="otp" label="Code" invalid />, "otp-cell-1"],
];

it.each(INVALID_FIELDS)(
  "%s keeps the destructive boundary on hover",
  async (_name, node, locator) => {
    // Plan 781: the recipe path (plan 372) builds the field's paint itself, so
    // the `controlStyle` rule plan 091 added and plan 356 guarded for selection
    // never ran: measured, an invalid field's hover border was byte-identical
    // to a valid field's.
    expect(await interactionOf(node, locator, "hover")).toMatchObject({
      borderColor: testTheme.colors.destructive,
    });
  },
);

it.each(INVALID_FIELDS)(
  "%s keeps the destructive boundary on press",
  async (_name, node, locator) => {
    expect(await interactionOf(node, locator, "active")).toMatchObject({
      borderColor: testTheme.colors.destructive,
    });
  },
);

it("keeps the healthy interaction colours on a valid field", async () => {
  // The negative direction: the fix cannot be "every field paints destructive".
  expect(
    await interactionOf(<Input testId="ok" label="Name" />, "ok", "hover"),
  ).toMatchObject({ borderColor: testTheme.colors.borderStrong });
  expect(
    await interactionOf(<Input testId="ok" label="Name" />, "ok", "active"),
  ).toMatchObject({ borderColor: testTheme.colors.ring });
});

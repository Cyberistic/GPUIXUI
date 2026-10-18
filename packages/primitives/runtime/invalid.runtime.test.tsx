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
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
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
import { paintedColours, rgbOf } from "./theme.js";

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

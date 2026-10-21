/**
 * A failed validation announces itself, in the real runtime.
 *
 * The bug this guards (plan `812`): every value-bearing Tier 1 control takes
 * `invalid` and paints the destructive boundary, but none of them reached the
 * accessibility tree. GPUix 0.10.0 publishes no `aria-invalid`, and the
 * package's one channel for a state the runtime cannot express — the
 * `aria-description` that plan `810` fills with `unavailable`/`read only` —
 * carried nothing for validation. Measured before the fix, on the release-tag
 * build: an invalid `Input`, `Select`, `CheckboxGroup`, `RadioGroup` and
 * `OTPField` node all reported `description: undefined`, while the paint was
 * red. A screen-reader user heard an ordinary, valid form.
 *
 * One `stateWords` word now says `invalid`, composing after the inert state
 * (`unavailable. invalid`) and before the caller's description
 * (`invalid. Net of refunds.`); the valid twin proves no false announcement.
 * `Label` is the deliberate exception: it is a caption, the control it sits
 * beside owns the node and the state.
 *
 * One window per case, because the fixture closes each window after its test
 * and a reused host keeps native state (the `fixture.tsx` rule).
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
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Rating } from "../src/components/Rating.js";
import { Select } from "../src/components/Select.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { a11yNode } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

/** One control that declares `invalid`, and the node that must announce it. */
interface Part {
  readonly name: string;
  readonly role: string;
  readonly label: string;
  readonly render: (invalid: boolean) => ReactElement;
}

const PARTS: ReadonlyArray<Part> = [
  {
    name: "Input",
    role: "TextInput",
    label: "Name",
    render: (invalid) => <Input label="Name" invalid={invalid} />,
  },
  {
    name: "TextArea",
    role: "MultilineTextInput",
    label: "Notes",
    render: (invalid) => <TextArea label="Notes" invalid={invalid} />,
  },
  {
    name: "NumberField",
    role: "TextInput",
    label: "Quantity",
    render: (invalid) => <NumberField label="Quantity" invalid={invalid} />,
  },
  {
    name: "Select",
    role: "ComboBox",
    label: "Fruit",
    render: (invalid) => (
      <Select
        label="Fruit"
        placeholder="Pick"
        options={options}
        invalid={invalid}
      />
    ),
  },
  {
    name: "OTPField",
    role: "Group",
    label: "Verification code",
    render: (invalid) => (
      <OTPField label="Verification code" invalid={invalid} />
    ),
  },
  {
    name: "Checkbox",
    role: "CheckBox",
    label: "Accept",
    render: (invalid) => <Checkbox label="Accept" invalid={invalid} />,
  },
  {
    name: "Switch",
    role: "Switch",
    label: "Pause",
    render: (invalid) => <Switch label="Pause" invalid={invalid} />,
  },
  {
    name: "CheckboxGroup",
    role: "CheckBox",
    label: "Alpha",
    render: (invalid) => (
      <CheckboxGroup label="Pick" options={options} invalid={invalid} />
    ),
  },
  {
    name: "RadioGroup",
    role: "RadioButton",
    label: "Alpha",
    render: (invalid) => (
      <RadioGroup label="Pick" options={options} invalid={invalid} />
    ),
  },
  {
    name: "Rating",
    role: "RadioButton",
    label: "3 of 5",
    render: (invalid) => (
      <Rating label="Quality" defaultValue={3} invalid={invalid} />
    ),
  },
  {
    name: "Slider",
    role: "Slider",
    label: "Volume",
    render: (invalid) => <Slider label="Volume" invalid={invalid} />,
  },
  {
    name: "RangeSlider",
    role: "Slider",
    label: "Band minimum",
    render: (invalid) => <RangeSlider label="Band" invalid={invalid} />,
  },
];

/** The two states every part is measured in, and the word each must report. */
const ROWS: ReadonlyArray<{
  readonly part: Part;
  readonly state: string;
  readonly invalid: boolean;
  readonly description: string | undefined;
}> = PARTS.flatMap((part) => [
  {
    part,
    state: `${part.name} invalid`,
    invalid: true,
    description: "invalid",
  },
  {
    part,
    state: `${part.name} valid`,
    invalid: false,
    description: undefined,
  },
]);

/** The description the painted tree reports for a part's control node. */
const descriptionOf = async (
  part: Part,
  invalid: boolean,
): Promise<string | undefined> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{part.render(invalid)}</Surface>);
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: part.role, label: part.label }),
    () => expect.fail(`no ${part.role} node named ${part.label}`),
  );
  return node.aria?.description;
};

it.each(ROWS)("$state announces the state it is in", async (row) => {
  expect(await descriptionOf(row.part, row.invalid)).toBe(row.description);
});

it("composes the state before the caller's description", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Input label="Name" invalid aria-description="Net of refunds." />
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "TextInput", label: "Name" }),
    () => expect.fail("no TextInput node named Name"),
  );
  expect(node.aria?.description).toBe("invalid. Net of refunds.");
});

it("keeps the inert state in front of the validation state", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Checkbox label="Accept" invalid disabled />
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "CheckBox", label: "Accept" }),
    () => expect.fail("no CheckBox node named Accept"),
  );
  expect(node.aria?.description).toBe("unavailable. invalid");
});

it("announces the state on both the slider track and its thumb", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <RangeSlider label="Band" invalid />
    </Surface>,
  );
  const start = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Slider", label: "Band minimum" }),
    () => expect.fail("no Slider node named Band minimum"),
  );
  const end = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Slider", label: "Band maximum" }),
    () => expect.fail("no Slider node named Band maximum"),
  );
  expect(start.aria?.description).toBe("invalid");
  expect(end.aria?.description).toBe("invalid");
});

it("leaves a label's paint out of the announcement", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Label invalid>Name</Label>
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Label" }),
    () => expect.fail("no Label node"),
  );
  expect(node.aria?.value).toBe("Name");
  expect(node.aria?.description).toBeUndefined();
});

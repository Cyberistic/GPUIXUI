/**
 * A disabled control announces that it is disabled, in the real runtime.
 *
 * The bug this guards (plan `810`): GPUix 0.10.0 has no `aria-disabled` and no
 * `aria-readonly`, so every inert control is emulated — a guard inside its
 * handler and no tab stop — and the emulation never reached the accessibility
 * tree. Measured before the fix, every disabled control's node was
 * byte-identical to its enabled twin, `Click` action included:
 * `Button/Save/[Click,Focus]` both ways. A screen-reader user was told a
 * disabled control was an ordinary, actionable one.
 *
 * The runtime's one channel for this is `aria-description`, which a busy
 * `Button` already used for `Loading` and which `docs/gpuix-capabilities.md`
 * names as the workaround. One `stateWords`/`describeState` rule now puts
 * `unavailable` (disabled) or `read only` (read-only) in front of a control's
 * description; this file holds every inert part to the rule, reads the word
 * from the painted accessibility tree rather than from a prop, and keeps an
 * enabled control's description exactly as it was.
 *
 * One window per case, because the fixture closes each window after its test
 * and a reused host keeps native state (the `fixture.tsx` rule).
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { IconButton } from "../src/components/IconButton.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { Select } from "../src/components/Select.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { a11yNode } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

/** One state a control can be in, and the word it must announce. */
interface InertState {
  readonly name: string;
  readonly props: {
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
  };
  /** The description the node must report; `undefined` means absent. */
  readonly description: string | undefined;
}

interface Part {
  readonly name: string;
  readonly role: string;
  readonly label: string;
  readonly render: (state: InertState["props"]) => ReactElement;
  /** Parts that have no `readOnly` prop only carry the working and disabled rows. */
  readonly readOnly: boolean;
}

const PARTS: ReadonlyArray<Part> = [
  {
    name: "Button",
    role: "Button",
    label: "Save",
    readOnly: false,
    render: (props) => <Button {...props}>Save</Button>,
  },
  {
    name: "IconButton",
    role: "Button",
    label: "Close",
    readOnly: false,
    render: (props) => <IconButton {...props} label="Close" icon="x" />,
  },
  {
    name: "Toggle",
    role: "Button",
    label: "Bold",
    readOnly: true,
    render: (props) => <Toggle {...props}>Bold</Toggle>,
  },
  {
    name: "Checkbox",
    role: "CheckBox",
    label: "Accept",
    readOnly: true,
    render: (props) => <Checkbox {...props}>Accept</Checkbox>,
  },
  {
    name: "Switch",
    role: "Switch",
    label: "Pause",
    readOnly: true,
    render: (props) => <Switch {...props}>Pause</Switch>,
  },
  {
    name: "Input",
    role: "TextInput",
    label: "Name",
    readOnly: true,
    render: (props) => <Input {...props} label="Name" placeholder="Name" />,
  },
  {
    name: "TextArea",
    role: "MultilineTextInput",
    label: "Notes",
    readOnly: true,
    render: (props) => <TextArea {...props} label="Notes" />,
  },
  {
    name: "NumberField",
    role: "TextInput",
    label: "Quantity",
    readOnly: true,
    render: (props) => <NumberField {...props} label="Quantity" />,
  },
  {
    name: "Select",
    role: "ComboBox",
    label: "Fruit",
    readOnly: true,
    render: (props) => (
      <Select {...props} label="Fruit" placeholder="Pick" options={options} />
    ),
  },
  {
    name: "Slider",
    role: "Slider",
    label: "Volume",
    readOnly: true,
    render: (props) => <Slider {...props} label="Volume" />,
  },
  {
    name: "RangeSlider",
    role: "Slider",
    label: "Band minimum",
    readOnly: true,
    render: (props) => <RangeSlider {...props} label="Band" />,
  },
  {
    name: "Rating",
    role: "RadioButton",
    label: "3 of 5",
    readOnly: true,
    render: (props) => <Rating {...props} label="Quality" defaultValue={3} />,
  },
  {
    name: "CheckboxGroup",
    role: "CheckBox",
    label: "Alpha",
    readOnly: true,
    render: (props) => <CheckboxGroup {...props} options={options} />,
  },
  {
    name: "RadioGroup",
    role: "RadioButton",
    label: "Alpha",
    readOnly: true,
    render: (props) => <RadioGroup {...props} options={options} />,
  },
  {
    name: "ToggleGroup",
    role: "Button",
    label: "Alpha",
    readOnly: true,
    render: (props) => (
      <ToggleGroup {...props} type="multiple" options={options} />
    ),
  },
  {
    name: "OTPField",
    role: "Group",
    label: "Verification code",
    readOnly: true,
    render: (props) => <OTPField {...props} label="Verification code" />,
  },
];

/** The rows: working, disabled, and — where it exists — read-only. */
const ROWS: ReadonlyArray<{ readonly part: Part; readonly state: InertState }> =
  Arr.flatMap(PARTS, (part) =>
    Arr.appendAll(
      [
        {
          part,
          state: {
            name: `${part.name} working`,
            props: {},
            description: undefined,
          },
        },
        {
          part,
          state: {
            name: `${part.name} disabled`,
            props: { disabled: true },
            description: "unavailable",
          },
        },
      ],
      part.readOnly
        ? [
            {
              part,
              state: {
                name: `${part.name} read-only`,
                props: { readOnly: true },
                description: "read only",
              },
            },
          ]
        : [],
    ),
  );

/** The description the tree reports for the part's control node. */
const descriptionOf = async (
  part: Part,
  props: InertState["props"],
  element: ReactElement = part.render(props),
): Promise<string | undefined> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{element}</Surface>);
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: part.role, label: part.label }),
    () => expect.fail(`no ${part.role} node named ${part.label}`),
  );
  return node.aria?.description;
};

it.each(ROWS)(
  "$state.name announces the state it is in",
  async ({ part, state }) => {
    expect(await descriptionOf(part, state.props)).toBe(state.description);
  },
);

it("a disabled control composes the state before the caller's description", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button disabled aria-description="Net of refunds." testId="save">
        Save
      </Button>
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button", label: "Save" }),
    () => expect.fail("no Button node named Save"),
  );
  expect(node.aria?.description).toBe("unavailable. Net of refunds.");
});

it("a slot tip composes after the state, not over it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content="Net of refunds.">
        <Button disabled>Save</Button>
      </Tooltip>
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button", label: "Save" }),
    () => expect.fail("no Button node named Save"),
  );
  expect(node.aria?.description).toBe("unavailable. Net of refunds.");
});

it("a busy button still announces Loading, and its disabled state beside it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button loading disabled>
        Save
      </Button>
    </Surface>,
  );
  const node = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "Button", label: "Save" }),
    () => expect.fail("no Button node named Save"),
  );
  expect(node.aria?.description).toBe("Loading. unavailable");
});

it("a disabled option announces itself without disabling its neighbours", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta", disabled: true },
        ]}
      />
    </Surface>,
  );
  const alpha = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "CheckBox", label: "Alpha" }),
    () => expect.fail("no CheckBox node named Alpha"),
  );
  const beta = Option.getOrElse(
    a11yNode(runtime.a11y(), { role: "CheckBox", label: "Beta" }),
    () => expect.fail("no CheckBox node named Beta"),
  );
  expect(alpha.aria?.description).toBeUndefined();
  expect(beta.aria?.description).toBe("unavailable");
});

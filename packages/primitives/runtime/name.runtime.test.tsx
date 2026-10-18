/**
 * The accessible-name matrix: every Tier 1 control that carries a name exposes
 * an accessibility node with its documented role and that exact name.
 *
 * The bug this guards (plans 057, 058, 071, 073): three separate defects were
 * one class — a control painted, took focus and worked, but reached assistive
 * technology with no role or no name. Each was fixed by a per-component
 * assertion, and no check crossed controls, so a new control could ship unnamed
 * exactly as `058`'s text buttons did. The focus-ring matrix (084) and the
 * tab-order matrix (089) guard the other two cross-control invariants; this is
 * the third.
 *
 * Two cases beyond the table close the gap the table cannot: a composed scene
 * proves no interactive node in it is unnamed (a control the table forgot), and
 * the presentational primitives prove they invent no role of their own.
 */

import type { ReactElement } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Grid } from "../src/components/Stack.js";
import { IconButton } from "../src/components/IconButton.js";
import { InfoTip } from "../src/components/InfoTip.js";
import { Input } from "../src/components/Input.js";
import { Meter } from "../src/components/Meter.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { Progress } from "../src/components/Progress.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Select } from "../src/components/Select.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Separator, Spacer } from "../src/components/Separator.js";
import { Skeleton } from "../src/components/Skeleton.js";
import { Spinner } from "../src/components/Spinner.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { a11yNode, a11yNodes, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** Roles that carry an action or a value, so an unnamed one is a real defect. */
const INTERACTIVE_ROLES: ReadonlyArray<string> = [
  "Button",
  "CheckBox",
  "Switch",
  "TextInput",
  "MultilineTextInput",
  "ComboBox",
  "ListBox",
  "ListBoxOption",
  "Slider",
  "RadioButton",
];

interface NameCase {
  readonly name: string;
  readonly role: string;
  readonly label: string;
  readonly node: () => ReactElement;
  /** Runs after mount, for a node that only exists while its overlay is open. */
  readonly open?: (runtime: Runtime) => void;
}

const select = (testId: string) => (
  <Select
    testId={testId}
    label="Fruit"
    placeholder="Pick one"
    options={[{ value: "apple", label: "Apple" }]}
  />
);

const openSelect = (testId: string) => (runtime: Runtime) => {
  const trigger = Option.getOrElse(runtime.element(`${testId}-trigger`), () =>
    expect.fail(`the Select ${testId} painted no trigger`),
  );
  runtime.clickElement(trigger);
  runtime.flush();
};

const CASES: ReadonlyArray<NameCase> = [
  {
    name: "Button from its content",
    role: "Button",
    label: "Save",
    node: () => <Button testId="c">Save</Button>,
  },
  {
    name: "Button from an explicit label",
    role: "Button",
    label: "Close",
    node: () => (
      <Button testId="c" label="Close">
        ×
      </Button>
    ),
  },
  {
    name: "IconButton",
    role: "Button",
    label: "Close",
    node: () => <IconButton testId="c" label="Close" icon="x" />,
  },
  {
    name: "Toggle",
    role: "Button",
    label: "Bold",
    node: () => <Toggle testId="c">Bold</Toggle>,
  },
  {
    name: "ToggleGroup",
    role: "Group",
    label: "Alignment",
    node: () => (
      <ToggleGroup
        testId="c"
        type="single"
        label="Alignment"
        options={[{ value: "left", label: "Left" }]}
      />
    ),
  },
  {
    name: "ToggleGroup item",
    role: "Button",
    label: "Left",
    node: () => (
      <ToggleGroup
        testId="c"
        type="single"
        label="Alignment"
        options={[{ value: "left", label: "Left" }]}
      />
    ),
  },
  {
    name: "Checkbox",
    role: "CheckBox",
    label: "Accept terms",
    node: () => <Checkbox testId="c" label="Accept terms" />,
  },
  {
    name: "CheckboxGroup",
    role: "Group",
    label: "Topics",
    node: () => (
      <CheckboxGroup
        testId="c"
        label="Topics"
        options={[{ value: "alpha", label: "Alpha" }]}
      />
    ),
  },
  {
    name: "CheckboxGroup row",
    role: "CheckBox",
    label: "Alpha",
    node: () => (
      <CheckboxGroup
        testId="c"
        label="Topics"
        options={[{ value: "alpha", label: "Alpha" }]}
      />
    ),
  },
  {
    name: "RadioGroup",
    role: "RadioGroup",
    label: "Size",
    node: () => (
      <RadioGroup
        testId="c"
        label="Size"
        options={[{ value: "small", label: "Small" }]}
      />
    ),
  },
  {
    name: "RadioGroup option",
    role: "RadioButton",
    label: "Small",
    node: () => (
      <RadioGroup
        testId="c"
        label="Size"
        options={[{ value: "small", label: "Small" }]}
      />
    ),
  },
  {
    name: "Switch",
    role: "Switch",
    label: "Wifi",
    node: () => <Switch testId="c" label="Wifi" />,
  },
  {
    name: "Input",
    role: "TextInput",
    label: "Name",
    node: () => <Input testId="c" label="Name" />,
  },
  {
    // Measured: the runtime maps a textarea to `MultilineTextInput`, not the
    // single-line `TextInput` (the dump printed `MultilineTextInput:"Notes"`).
    name: "TextArea",
    role: "MultilineTextInput",
    label: "Notes",
    node: () => <TextArea testId="c" label="Notes" />,
  },
  {
    name: "NumberField",
    role: "TextInput",
    label: "Count",
    node: () => <NumberField testId="c" label="Count" />,
  },
  {
    name: "OTPField cell",
    role: "TextInput",
    label: "Code digit 1",
    node: () => <OTPField testId="c" label="Code" />,
  },
  {
    name: "Select trigger",
    role: "ComboBox",
    label: "Fruit",
    node: () => select("c"),
  },
  {
    name: "Select list",
    role: "ListBox",
    label: "Fruit",
    node: () => select("c"),
    open: openSelect("c"),
  },
  {
    name: "Select option",
    role: "ListBoxOption",
    label: "Apple",
    node: () => select("c"),
    open: openSelect("c"),
  },
  {
    name: "Slider",
    role: "Slider",
    label: "Volume",
    node: () => <Slider testId="c" label="Volume" />,
  },
  {
    name: "RangeSlider thumb",
    role: "Slider",
    label: "Band minimum",
    node: () => <RangeSlider testId="c" label="Band" defaultValue={[20, 60]} />,
  },
  {
    name: "Meter",
    role: "Meter",
    label: "Disk usage",
    node: () => <Meter testId="c" label="Disk usage" value={25} />,
  },
  {
    name: "Progress",
    role: "ProgressIndicator",
    label: "Uploading",
    node: () => <Progress testId="c" label="Uploading" value={42} />,
  },
  {
    name: "Spinner",
    role: "Status",
    label: "Saving",
    node: () => <Spinner testId="c" label="Saving" />,
  },
  {
    name: "InfoTip",
    role: "Image",
    label: "More information",
    node: () => (
      <InfoTip testId="c" label="More information" content="Explains it" />
    ),
  },
  {
    name: "ScrollArea",
    role: "Region",
    label: "Activity",
    node: () => (
      <ScrollArea
        label="Activity"
        testId="c"
        axis="vertical"
        style={{ height: 60 }}
      >
        <Text>Line</Text>
      </ScrollArea>
    ),
  },
  {
    name: "Rating",
    role: "RadioGroup",
    label: "Score",
    node: () => <Rating testId="c" label="Score" />,
  },
  {
    name: "open Tooltip",
    role: "Tooltip",
    label: "A hint",
    node: () => (
      <Tooltip content="A hint" testId="tip">
        <div testId="target" tabIndex={0} aria-label="Explain">
          <Text>Hover me</Text>
        </div>
      </Tooltip>
    ),
    open: (runtime) => runtime.hover("target"),
  },
];

/** Every node's `role:"label"` pair, for a failure message that names the gap. */
const dumpOf = (runtime: Runtime): string =>
  Arr.join(
    Arr.map(
      a11yNodes(runtime.a11y()),
      (node) => `${node.aria?.role ?? "?"}:"${node.aria?.label ?? ""}"`,
    ),
    ", ",
  );

it.each(Arr.map(CASES, (testCase) => [testCase.name, testCase] as const))(
  "%s exposes its documented role and name",
  async (_name, testCase) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{testCase.node()}</Surface>);
    testCase.open?.(runtime);
    const found = a11yNode(runtime.a11y(), {
      role: testCase.role,
      label: testCase.label,
    });
    expect(
      Option.isSome(found),
      `expected ${testCase.role} named "${testCase.label}" in [${dumpOf(runtime)}]`,
    ).toBe(true);
  },
);

/**
 * The closure: one scene with one node per control, every interactive role
 * named. The table can forget a control; this cannot, because it reads the
 * dump rather than a list of expectations.
 */
const SCENE: ReadonlyArray<ReactElement> = [
  <Button key="button" testId="scene-button">
    Save
  </Button>,
  <IconButton key="icon" testId="scene-icon" label="Close" icon="x" />,
  <Toggle key="toggle" testId="scene-toggle">
    Bold
  </Toggle>,
  <Checkbox key="checkbox" testId="scene-checkbox" label="Accept terms" />,
  <Switch key="switch" testId="scene-switch" label="Wifi" />,
  <Input key="input" testId="scene-input" label="Name" />,
  <TextArea key="textarea" testId="scene-textarea" label="Notes" />,
  <NumberField key="number" testId="scene-number" label="Count" />,
  <OTPField key="otp" testId="scene-otp" label="Code" />,
  <Select
    key="select"
    testId="scene-select"
    label="Fruit"
    options={[{ value: "apple", label: "Apple" }]}
  />,
  <Slider key="slider" testId="scene-slider" label="Volume" />,
  <RangeSlider key="range" testId="scene-range" label="Band" />,
  <Rating key="rating" testId="scene-rating" label="Score" />,
  <RadioGroup
    key="radio"
    testId="scene-radio"
    label="Size"
    options={[{ value: "small", label: "Small" }]}
  />,
  <CheckboxGroup
    key="checkboxes"
    testId="scene-checkboxes"
    label="Topics"
    options={[{ value: "alpha", label: "Alpha" }]}
  />,
  <ToggleGroup
    key="toggles"
    testId="scene-toggles"
    type="single"
    label="Alignment"
    options={[{ value: "left", label: "Left" }]}
  />,
];

it("leaves no interactive node in a composed scene unnamed", async () => {
  // A tall window so no control is clipped out of the accessibility tree.
  const runtime = await openWindow({ height: 2400 });
  runtime.render(<Surface>{SCENE}</Surface>);
  const unnamed = Arr.filter(a11yNodes(runtime.a11y()), (node) =>
    Arr.contains(INTERACTIVE_ROLES, node.aria?.role ?? ""),
  ).filter((node) => (node.aria?.label ?? "").trim() === "");
  expect(
    Arr.map(unnamed, (node) => node.aria?.role ?? "?"),
    `unnamed interactive nodes: ${dumpOf(runtime)}`,
  ).toStrictEqual([]);
});

it("keeps the presentational primitives out of the interactive tree", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column">
        <Box testId="box" tone="background" padding="sm">
          <Text>Boxed</Text>
        </Box>
        <Grid testId="grid" columns={2}>
          <Text>One</Text>
          <Text>Two</Text>
        </Grid>
        <Separator testId="separator" orientation="horizontal" />
        <Spacer testId="spacer" />
        <Skeleton testId="skeleton" width={80} />
      </Stack>
    </Surface>,
  );
  const interactive = Arr.filter(a11yNodes(runtime.a11y()), (node) =>
    Arr.contains(INTERACTIVE_ROLES, node.aria?.role ?? ""),
  );
  expect(
    Arr.map(interactive, (node) => node.aria?.role ?? "?"),
    `presentational primitives exposed [${dumpOf(runtime)}]`,
  ).toStrictEqual([]);
});

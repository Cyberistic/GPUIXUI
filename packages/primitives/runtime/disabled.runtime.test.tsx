/**
 * A control that becomes disabled must stop acting and stop looking focused.
 *
 * The bug class this guards (plan `332`, measured): native focus outlives a
 * `disabled` prop change — GPUix never blurs a host element whose tab stop
 * disappears — so a form that disables its controls while a save is in flight
 * leaves the keyboard on a control that now claims to be disabled. The pointer
 * path refused a disabled control, but `CheckboxGroup`'s key path did not (its
 * `onValueChange` reported a second toggle after the group was disabled), and
 * the ten action/selection controls kept painting their focus ring while the
 * five fields dropped theirs.
 *
 * Two tables, one window per case, because the harness dispatches to the window
 * it rendered into last (the same rule as `focus-ring.runtime.test.tsx`):
 *
 * - activation: every control acts while enabled, focus survives the disable,
 *   and nothing acts afterwards;
 * - ring: every control paints exactly one ring while focused and none once it
 *   is disabled.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
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
import { isFocusRing, type Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

interface ActivationCase {
  readonly name: string;
  readonly node: (disabled: boolean, report: () => void) => ReactElement;
  readonly focusId: string;
  readonly key: string;
  /** A control that activates on key up (the checkbox contract). */
  readonly release?: true;
}

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

const ACTIVATIONS: ReadonlyArray<ActivationCase> = [
  {
    name: "Button",
    focusId: "x",
    key: "enter",
    node: (disabled, report) => (
      <Button testId="x" disabled={disabled} onActivate={report}>
        Save
      </Button>
    ),
  },
  {
    name: "Toggle",
    focusId: "x",
    key: "enter",
    node: (disabled, report) => (
      <Toggle testId="x" disabled={disabled} onPressedChange={report}>
        Bold
      </Toggle>
    ),
  },
  {
    name: "Checkbox",
    focusId: "x",
    key: "space",
    release: true,
    node: (disabled, report) => (
      <Checkbox
        testId="x"
        label="Accept"
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
  {
    name: "Switch",
    focusId: "x",
    key: "enter",
    node: (disabled, report) => (
      <Switch
        testId="x"
        label="On"
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
  {
    name: "Rating",
    focusId: "x",
    key: "right",
    node: (disabled, report) => (
      <Rating
        testId="x"
        label="Score"
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
  {
    name: "Slider",
    focusId: "x",
    key: "right",
    node: (disabled, report) => (
      <Slider
        testId="x"
        label="Volume"
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
  {
    name: "RangeSlider",
    focusId: "x-thumb-start",
    key: "right",
    node: (disabled, report) => (
      <RangeSlider
        testId="x"
        label="Band"
        defaultValue={[20, 80]}
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
  {
    name: "CheckboxGroup",
    focusId: "x-a",
    key: "enter",
    node: (disabled, report) => (
      <CheckboxGroup
        testId="x"
        label="Topics"
        disabled={disabled}
        options={[{ value: "a", label: "Alpha" }]}
        onValueChange={report}
      />
    ),
  },
  {
    name: "RadioGroup",
    focusId: "x-a",
    key: "down",
    node: (disabled, report) => (
      <RadioGroup
        testId="x"
        label="Size"
        disabled={disabled}
        options={options}
        onValueChange={report}
      />
    ),
  },
  {
    name: "ToggleGroup",
    focusId: "x-a",
    key: "enter",
    node: (disabled, report) => (
      <ToggleGroup
        testId="x"
        label="Align"
        type="single"
        disabled={disabled}
        options={options}
        onValueChange={report}
      />
    ),
  },
  {
    name: "Input",
    focusId: "x",
    key: "a",
    node: (disabled, report) => (
      <Input
        testId="x"
        label="Name"
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
  {
    name: "TextArea",
    focusId: "x",
    key: "a",
    node: (disabled, report) => (
      <TextArea
        testId="x"
        label="Notes"
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
  {
    name: "OTPField",
    focusId: "x-cell-1",
    key: "1",
    node: (disabled, report) => (
      <OTPField
        testId="x"
        label="Code"
        disabled={disabled}
        onValueChange={report}
      />
    ),
  },
];

it.each(Arr.map(ACTIVATIONS, (testCase) => [testCase.name, testCase] as const))(
  "%s acts while enabled and not after it becomes disabled",
  async (_name, testCase) => {
    const runtime = await openWindow();
    const reports: string[] = [];
    const report = (): void => {
      reports.push(testCase.name);
    };
    runtime.render(<Surface>{testCase.node(false, report)}</Surface>);
    runtime.keyDown(testCase.focusId, testCase.key);
    if (testCase.release === true)
      runtime.keyUp(testCase.focusId, testCase.key);
    runtime.type(testCase.key);
    runtime.flush();
    const live = reports.length;
    // The enabled half proves the key path is real, so the disabled half is not
    // passing by the activation never reaching the control at all.
    expect(live).toBeGreaterThan(0);
    const focused = runtime.focused();
    runtime.render(<Surface>{testCase.node(true, report)}</Surface>);
    runtime.flush();
    // The premise (plan 332 §1): the runtime keeps focus on a control whose
    // `tabIndex` disappears, which is why the handler must refuse.
    expect(runtime.focused()).toEqual(focused);
    runtime.type(testCase.key);
    runtime.flush();
    expect(reports.length).toBe(live);
  },
);

interface RingCase {
  readonly name: string;
  readonly node: (disabled: boolean) => ReactElement;
}

const RINGS: ReadonlyArray<RingCase> = [
  {
    name: "Button",
    node: (disabled) => (
      <Button testId="c" disabled={disabled}>
        Save
      </Button>
    ),
  },
  {
    name: "Toggle",
    node: (disabled) => (
      <Toggle testId="c" disabled={disabled}>
        Bold
      </Toggle>
    ),
  },
  {
    name: "Checkbox",
    node: (disabled) => (
      <Checkbox testId="c" label="Accept" disabled={disabled} />
    ),
  },
  {
    name: "Switch",
    node: (disabled) => <Switch testId="c" label="On" disabled={disabled} />,
  },
  {
    name: "Input",
    node: (disabled) => <Input testId="c" label="Name" disabled={disabled} />,
  },
  {
    name: "TextArea",
    node: (disabled) => (
      <TextArea testId="c" label="Notes" disabled={disabled} />
    ),
  },
  {
    name: "NumberField",
    node: (disabled) => (
      <NumberField testId="c" label="Count" disabled={disabled} />
    ),
  },
  {
    name: "OTPField",
    node: (disabled) => (
      <OTPField testId="c" label="Code" disabled={disabled} />
    ),
  },
  {
    name: "Select",
    node: (disabled) => (
      <Select
        testId="c"
        label="Fruit"
        disabled={disabled}
        options={[{ value: "a", label: "Apple" }]}
      />
    ),
  },
  {
    name: "Rating",
    node: (disabled) => <Rating testId="c" label="Score" disabled={disabled} />,
  },
  {
    name: "ToggleGroup",
    node: (disabled) => (
      <ToggleGroup
        testId="c"
        label="Align"
        type="single"
        disabled={disabled}
        options={[{ value: "l", label: "Left" }]}
      />
    ),
  },
  {
    name: "RadioGroup",
    node: (disabled) => (
      <RadioGroup
        testId="c"
        label="Size"
        disabled={disabled}
        options={[{ value: "s", label: "Small" }]}
      />
    ),
  },
  {
    name: "CheckboxGroup",
    node: (disabled) => (
      <CheckboxGroup
        testId="c"
        label="Topics"
        disabled={disabled}
        options={[{ value: "a", label: "Alpha" }]}
      />
    ),
  },
  {
    name: "Slider",
    node: (disabled) => (
      <Slider testId="c" label="Volume" disabled={disabled} />
    ),
  },
  {
    name: "RangeSlider",
    node: (disabled) => (
      <RangeSlider testId="c" label="Band" disabled={disabled} />
    ),
  },
];

/** Every element of the last frame that paints a focus ring. */
const ringCount = (runtime: Runtime): number =>
  Arr.length(
    Arr.filter(runtime.all(), (element) =>
      isFocusRing(element.style.boxShadow),
    ),
  );

it.each(Arr.map(RINGS, (testCase) => [testCase.name, testCase] as const))(
  "%s paints no ring once it becomes disabled",
  async (_name, testCase) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{testCase.node(false)}</Surface>);
    runtime.focusNext();
    runtime.flush();
    expect(ringCount(runtime)).toBe(1);
    runtime.render(<Surface>{testCase.node(true)}</Surface>);
    runtime.flush();
    expect(ringCount(runtime)).toBe(0);
  },
);

it("keeps the ring off a disabled control that still holds focus", async () => {
  // Plan 332 §1: `CheckboxGroup`'s row kept native focus and could still toggle
  // on Enter; the paint asserted here is the visible half of the same state.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="c"
        label="Topics"
        options={[{ value: "a", label: "Alpha" }]}
      />
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  const focused = Option.getOrElse(runtime.focused(), () => "nothing");
  expect(focused).toBe("c-a");
  runtime.render(
    <Surface>
      <CheckboxGroup
        testId="c"
        label="Topics"
        disabled
        options={[{ value: "a", label: "Alpha" }]}
      />
    </Surface>,
  );
  runtime.flush();
  expect(runtime.focused()).toEqual(Option.some("c-a"));
  expect(ringCount(runtime)).toBe(0);
});

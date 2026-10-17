/**
 * The disabled tab-order matrix: every control that cannot act leaves the tab
 * order, and every control that can act is reached.
 *
 * The bug this guards: each component writes its own "not a tab stop while
 * disabled" guard — sixteen hand-written copies of one rule (`tabIndex:
 * undefined`, or `-1` where the runtime's editor owns the element). That
 * duplication is the shape of two bugs this workstream already shipped: an
 * `OTPField` that was six tab stops (plan `076`) and a `Select` trigger that
 * forgot its focus ring (plan `083`). A keyboard user who tabs into a dead
 * control cannot tell a disabled UI from a broken one.
 *
 * Both halves run per control, because the disabled half alone also passes for a
 * control wrongly removed from the tab order altogether.
 */

import type { ReactElement, ReactNode } from "react";
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
import type { Runtime } from "./harness.js";
import { isWithin } from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

interface TabCase {
  readonly name: string;
  readonly node: (disabled: boolean) => ReactElement;
}

const ONE_OPTION = [{ value: "a", label: "Apple" }] as const;

const CASES: ReadonlyArray<TabCase> = [
  {
    name: "Button",
    node: (disabled) => (
      <Button testId="c" disabled={disabled}>
        Save
      </Button>
    ),
  },
  {
    name: "IconButton",
    node: (disabled) => (
      <IconButton testId="c" icon="x" label="Close" disabled={disabled} />
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
        options={[...ONE_OPTION]}
        disabled={disabled}
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
        options={[...ONE_OPTION]}
        disabled={disabled}
      />
    ),
  },
  {
    name: "RadioGroup",
    node: (disabled) => (
      <RadioGroup
        testId="c"
        label="Size"
        options={[...ONE_OPTION]}
        disabled={disabled}
      />
    ),
  },
  {
    name: "CheckboxGroup",
    node: (disabled) => (
      <CheckboxGroup
        testId="c"
        label="Topics"
        options={[...ONE_OPTION]}
        disabled={disabled}
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

/** The control between two focusable sentinels, so a skipped stop is visible. */
const Frame = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement => (
  <Surface>
    <div testId="before" tabIndex={0} />
    {children}
    <div testId="after" tabIndex={0} />
  </Surface>
);

const focusedId = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () =>
    expect.fail("nothing held native focus"),
  );

/** A window with the case mounted, focus already on the leading sentinel. */
const mountAtStart = async (node: ReactElement): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Frame>{node}</Frame>);
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("before");
  return runtime;
};

it.each(Arr.map(CASES, (testCase) => [testCase.name, testCase.node] as const))(
  "%s is reached when enabled",
  async (_name, node) => {
    const runtime = await mountAtStart(node(false));
    runtime.focusNext();
    const root = Option.getOrElse(runtime.element("c"), () =>
      expect.fail("the control painted no root element"),
    );
    const focused = Option.getOrElse(runtime.focusedElement(), () =>
      expect.fail("the next stop took no focus"),
    );
    expect(isWithin(runtime, focused, root.id)).toBe(true);
  },
);

it.each(Arr.map(CASES, (testCase) => [testCase.name, testCase.node] as const))(
  "%s is skipped when disabled",
  async (_name, node) => {
    const runtime = await mountAtStart(node(true));
    runtime.focusNext();
    expect(focusedId(runtime)).toBe("after");
  },
);

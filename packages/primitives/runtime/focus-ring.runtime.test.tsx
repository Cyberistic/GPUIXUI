/**
 * The focus-ring matrix: every focusable Tier 1 control paints exactly one ring
 * when it holds focus, and that ring is inside the control.
 *
 * The bug this guards (plan 083): `Select`'s trigger took native focus and
 * painted nothing, while every sibling control painted the ring. No
 * per-component suite could see it — the select had no focus assertion, and the
 * controls that did have one passed. A check across controls is the only test
 * that fails for a control that forgot its ring.
 *
 * One window per case, sequentially: the harness's input helpers dispatch to the
 * window they just rendered into, so opening the windows together reports zero
 * rings for every control but the last (measured while writing this matrix).
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import type { TestElement } from "@gpuix/react/testing";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { focusRing } from "@gpuixui/tokens";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { InfoTip } from "../src/components/InfoTip.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Select } from "../src/components/Select.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import type { Runtime } from "../src/testing/index.js";
import { isWithin } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

/** The shadow `focusRing` becomes after the runtime's `inset` normalisation. */
const RING = { ...focusRing(testTheme).boxShadow, inset: false };

interface FocusCase {
  readonly name: string;
  readonly node: () => ReactElement;
}

const CASES: ReadonlyArray<FocusCase> = [
  { name: "Button", node: () => <Button testId="c">Save</Button> },
  { name: "Toggle", node: () => <Toggle testId="c">Bold</Toggle> },
  { name: "Checkbox", node: () => <Checkbox testId="c" label="Accept" /> },
  { name: "Switch", node: () => <Switch testId="c" label="On" /> },
  { name: "Input", node: () => <Input testId="c" label="Name" /> },
  { name: "TextArea", node: () => <TextArea testId="c" label="Notes" /> },
  { name: "NumberField", node: () => <NumberField testId="c" label="Count" /> },
  { name: "OTPField", node: () => <OTPField testId="c" label="Code" /> },
  {
    name: "Select",
    node: () => (
      <Select
        testId="c"
        label="Fruit"
        options={[{ value: "a", label: "Apple" }]}
      />
    ),
  },
  { name: "Rating", node: () => <Rating testId="c" label="Score" /> },
  {
    name: "ToggleGroup",
    node: () => (
      <ToggleGroup
        testId="c"
        label="Align"
        type="single"
        options={[{ value: "l", label: "Left" }]}
      />
    ),
  },
  {
    name: "RadioGroup",
    node: () => (
      <RadioGroup
        testId="c"
        label="Size"
        options={[{ value: "s", label: "Small" }]}
      />
    ),
  },
  {
    name: "CheckboxGroup",
    node: () => (
      <CheckboxGroup
        testId="c"
        label="Topics"
        options={[{ value: "a", label: "Alpha" }]}
      />
    ),
  },
  { name: "Slider", node: () => <Slider testId="c" label="Volume" /> },
  { name: "RangeSlider", node: () => <RangeSlider testId="c" label="Band" /> },
  {
    name: "InfoTip",
    node: () => <InfoTip content="A hint" label="More" testId="c" />,
  },
  {
    name: "ScrollArea",
    node: () => (
      <ScrollArea label="Log" testId="c" axis="vertical" style={{ height: 60 }}>
        <Text>Line</Text>
      </ScrollArea>
    ),
  },
];

/** Every element of the last frame that paints a shadow. */
const ringsOf = (runtime: Runtime): ReadonlyArray<TestElement> =>
  Arr.filter(runtime.all(), (element) => element.style.boxShadow !== undefined);

it.each(Arr.map(CASES, (testCase) => [testCase.name, testCase.node] as const))(
  "%s paints exactly one focus ring, inside the control",
  async (_name, node) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{node()}</Surface>);
    runtime.focusNext();
    runtime.flush();
    const root = Option.getOrElse(runtime.element("c"), () =>
      expect.fail("the control painted no root element"),
    );
    const rings = ringsOf(runtime);
    expect(rings).toHaveLength(1);
    const ring = Option.getOrElse(Arr.head(rings), () =>
      expect.fail("the control painted no ring"),
    );
    expect(ring.style.boxShadow).toStrictEqual(RING);
    expect(isWithin(runtime, ring, root.id)).toBe(true);
  },
);

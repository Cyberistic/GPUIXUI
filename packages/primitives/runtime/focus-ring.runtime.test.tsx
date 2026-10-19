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
import * as Schema from "effect/Schema";
import { focusRing } from "@gpuixui/tokens";
import { buttonRecipeRing, fieldRecipeRing } from "../src/core/recipes.js";
import { Button } from "../src/components/Button.js";
import { IconButton } from "../src/components/IconButton.js";
import { ButtonGroup } from "../src/components/ButtonGroup.js";
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
import { isFocusRing, isWithin } from "../src/testing/index.js";
import { Surface, openWindow, settleFocus, testTheme } from "./fixture.js";

/** The shadow `focusRing` becomes after the runtime's `inset` normalisation. */
const RING = { ...focusRing(testTheme).boxShadow, inset: false };

/**
 * The shadcn recipe's focus ring (plan 370): `ring-[3px] ring-ring/50`.
 *
 * The button and field recipes both declare the same ring but are separate
 * sources, so the matrix keeps two constants: a change in either is visible by
 * the cases it fails (plan 372).
 */
const recipeRing = (ring: ReturnType<typeof buttonRecipeRing>) => ({
  ...Option.getOrElse(
    Option.fromNullishOr(ring),
    () => focusRing(testTheme).boxShadow,
  ),
  inset: false,
});

const BUTTON_RING = recipeRing(buttonRecipeRing(testTheme));
const FIELD_RING = recipeRing(fieldRecipeRing(testTheme));

interface FocusCase {
  readonly name: string;
  readonly node: () => ReactElement;
  /** The exact shadow this control paints while focused. */
  readonly ring?: typeof RING;
}

const CASES: ReadonlyArray<FocusCase> = [
  {
    name: "Button",
    node: () => <Button testId="c">Save</Button>,
    ring: BUTTON_RING,
  },
  {
    name: "IconButton",
    node: () => <IconButton testId="c" icon="x" label="Close" />,
    ring: BUTTON_RING,
  },
  { name: "Toggle", node: () => <Toggle testId="c">Bold</Toggle> },
  { name: "Checkbox", node: () => <Checkbox testId="c" label="Accept" /> },
  { name: "Switch", node: () => <Switch testId="c" label="On" /> },
  {
    name: "Input",
    node: () => <Input testId="c" label="Name" />,
    ring: FIELD_RING,
  },
  {
    name: "TextArea",
    node: () => <TextArea testId="c" label="Notes" />,
    ring: FIELD_RING,
  },
  {
    name: "NumberField",
    node: () => <NumberField testId="c" label="Count" />,
    ring: FIELD_RING,
  },
  {
    name: "OTPField",
    node: () => <OTPField testId="c" label="Code" />,
    ring: FIELD_RING,
  },
  {
    name: "Select",
    node: () => (
      <Select
        testId="c"
        label="Fruit"
        options={[{ value: "a", label: "Apple" }]}
      />
    ),
    ring: FIELD_RING,
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

/** The five authored fields plus the renderer's normalisation, as a record. */
const shadowRecord = (shadow: unknown): Record<string, unknown> =>
  Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(
    shadow,
  );

/** Every element of the last frame that paints a focus ring. */
const ringsOf = (runtime: Runtime): ReadonlyArray<TestElement> =>
  Arr.filter(runtime.all(), (element) => isFocusRing(element.style.boxShadow));

it.each(Arr.map(CASES, (testCase) => [testCase.name, testCase] as const))(
  "%s paints exactly one focus ring, inside the control",
  async (_name, testCase) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{testCase.node()}</Surface>);
    runtime.focusNext();
    runtime.flush();
    await settleFocus();
    const root = Option.getOrElse(runtime.element("c"), () =>
      expect.fail("the control painted no root element"),
    );
    const rings = ringsOf(runtime);
    expect(rings).toHaveLength(1);
    const ring = Option.getOrElse(Arr.head(rings), () =>
      expect.fail("the control painted no ring"),
    );
    // `inset` is the renderer's normalisation, not part of the authored shadow:
    // the release build reports the five authored fields, the main-derived one
    // adds `inset: false`. Compare the ring the package wrote (plan `590`).
    expect({
      ...shadowRecord(ring.style.boxShadow),
      inset: undefined,
    }).toStrictEqual({
      ...shadowRecord(testCase.ring ?? RING),
      inset: undefined,
    });
    expect(isWithin(runtime, ring, root.id)).toBe(true);
  },
);

it("paints the ring inside a button that an attached group clips", async () => {
  // Plan 344: the matrix's one ring is a shadow spread outside the control,
  // which an attached group's clip removes. A clipped button therefore paints
  // its ring as an inset overlay — the recipe's width and colour since plan 370,
  // still exactly one ring, still inside the control (its band lies on the
  // button's edge, where the clip cannot reach).
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <ButtonGroup mode="attached" label="Actions">
        <Button testId="c">Save</Button>
        <Button testId="other">Cancel</Button>
      </ButtonGroup>
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  const root = Option.getOrElse(runtime.element("c"), () =>
    expect.fail("the control painted no root element"),
  );
  expect(root.style.boxShadow).toBeUndefined();
  const rings = Arr.filter(
    runtime.all(),
    (element) =>
      element.style.position === "absolute" &&
      element.style.borderColor === BUTTON_RING.color,
  );
  expect(rings).toHaveLength(1);
  const ring = Option.getOrElse(Arr.head(rings), () =>
    expect.fail("the clipped control painted no ring"),
  );
  expect(ring.style.borderWidth).toBe(BUTTON_RING.spreadRadius);
  expect(isWithin(runtime, ring, root.id)).toBe(true);
});

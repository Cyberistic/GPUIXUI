/**
 * The pointer-feedback matrix: an element that owns a pointer gesture paints a
 * visible response, and a control that cannot act paints none.
 *
 * The bug this guards (plan `361`): `Slider` and `RangeSlider` make the whole
 * track the hit target — it carries the press, the captured drag and even
 * `cursor: "pointer"` — yet its authored style declared no `hover` and no
 * `active`. Measured across the whole Tier 1 set, they were the only controls
 * that answered a hover with nothing. Plan `355` had fixed the same class on
 * group rows one control family at a time; this file is the cross-control rule.
 *
 * The invariant has two halves:
 *
 *   enabled  → some element in the component changes something on hover and on
 *              press (the library's own roles, not a specific colour, so a
 *              restyle is not a test failure);
 *   disabled → **no** element changes anything in either state, whichever
 *              convention the control uses (`controlStyle` declares the resting
 *              fill, `selectionRowStyle` omits the keys — both are inert).
 *
 * The renderer reports the **authored** `StyleDesc` normalised to a full record
 * with unset properties as `null`, so an interaction rule is compared over the
 * properties this package's rules actually set. GPUI applies the declaration
 * natively; the applied colour is not observable through `TestElement.style`
 * (the same limit plan `355` records for the row wash).
 *
 * `Rating` is the recorded exception: a star declares no `hover` style because
 * hovering repaints the stars up to the pointer (`previewRating`, plan `094`) —
 * feedback through paint, not through a pseudo-state rule.
 *
 * `ScrollArea` is out of scope: it has no pointer gesture. Its scrolling is the
 * wheel and the keyboard, so it promises no pointer feedback.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Equal from "effect/Equal";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { TestElement } from "@gpuix/react/testing";
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
import type { Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

/** The properties any interaction rule in this package sets. */
const INTERACTION_PROPERTIES = [
  "backgroundColor",
  "borderColor",
  "color",
  "textDecoration",
  "boxShadow",
] as const;

const Rule = Schema.Record(Schema.String, Schema.Unknown);
const decodeRule = Schema.decodeUnknownOption(Rule);

/** A reported interaction rule, which the runtime normalises to a full record. */
const ruleOf = (
  element: TestElement,
  state: "hover" | "active",
): Option.Option<Record<string, unknown>> =>
  decodeRule(
    Option.getOrElse(Option.fromNullishOr(element.style[state]), () => null),
  );

/** The interaction properties a rule changes from the element's resting style. */
const changesOf = (
  element: TestElement,
  state: "hover" | "active",
): ReadonlyArray<string> =>
  Option.match(ruleOf(element, state), {
    onNone: () => [],
    onSome: (rule) =>
      Arr.filter(INTERACTION_PROPERTIES, (property) => {
        const declared = rule[property];
        return (
          declared !== null &&
          declared !== undefined &&
          !Equal.equals(declared, element.style[property])
        );
      }),
  });

/** The elements that answer a pointer state with a visible change. */
const responding = (
  runtime: Runtime,
  state: "hover" | "active",
): ReadonlyArray<TestElement> =>
  Arr.filter(runtime.all(), (element) => changesOf(element, state).length > 0);

interface FeedbackCase {
  readonly name: string;
  readonly node: (disabled: boolean) => ReactElement;
}

const CASES: ReadonlyArray<FeedbackCase> = [
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
      <IconButton testId="c" icon="plus" label="Add" disabled={disabled} />
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

it.each(Arr.map(CASES, (testCase) => [testCase.name, testCase.node] as const))(
  "%s responds to hover and to a press",
  async (_name, node) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{node(false)}</Surface>);
    expect(responding(runtime, "hover").length).toBeGreaterThan(0);
    expect(responding(runtime, "active").length).toBeGreaterThan(0);
  },
);

it.each(Arr.map(CASES, (testCase) => [testCase.name, testCase.node] as const))(
  "%s paints no pointer response while disabled",
  async (_name, node) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{node(true)}</Surface>);
    expect(
      Arr.map(responding(runtime, "hover"), (element) => element.testId),
    ).toStrictEqual([]);
    expect(
      Arr.map(responding(runtime, "active"), (element) => element.testId),
    ).toStrictEqual([]);
  },
);

/**
 * The read-only half, for the surfaces whose pointer *is* the gesture.
 *
 * Plan `802`: the slider track owns the press, the captured drag and the
 * `cursor`, so a read-only track that kept its hover/active wash would promise
 * an edit it refuses. Plan `804` adds the pressed family for the same reason: a
 * read-only `Toggle`/`ToggleGroup` item is a mode shown for review. This is not
 * a general read-only rule — a read-only text field still invites text
 * selection and therefore keeps its boundary hover (`core/recipes.ts`), and
 * `Rating` declares no pointer style at all.
 */
const READ_ONLY_GESTURES: ReadonlyArray<{
  readonly name: string;
  readonly node: ReactElement;
}> = [
  { name: "Slider", node: <Slider testId="c" label="Volume" readOnly /> },
  {
    name: "RangeSlider",
    node: <RangeSlider testId="c" label="Band" readOnly />,
  },
  { name: "Toggle", node: <Toggle testId="c" label="Snap" readOnly /> },
  {
    name: "ToggleGroup",
    node: (
      <ToggleGroup
        type="single"
        testId="c"
        label="Align"
        options={[{ value: "left", label: "Align left" }]}
        readOnly
      />
    ),
  },
];

it.each(
  READ_ONLY_GESTURES.map((testCase) => [testCase.name, testCase.node] as const),
)("%s paints no pointer response while read-only", async (_name, node) => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  expect(
    Arr.map(responding(runtime, "hover"), (element) => element.testId),
  ).toStrictEqual([]);
  expect(
    Arr.map(responding(runtime, "active"), (element) => element.testId),
  ).toStrictEqual([]);
});

it("records Rating's preview as the one exception to a hover style", async () => {
  // A star's pointer feedback is the repaint of the stars up to it, not a
  // pseudo-state rule; `rating.runtime.test.tsx` owns that paint (plan 094).
  // This case exists so a future "no hover style" finding is read as the
  // recorded decision instead of re-discovered as a defect.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="c" label="Score" />
    </Surface>,
  );
  expect(responding(runtime, "hover")).toStrictEqual([]);
});

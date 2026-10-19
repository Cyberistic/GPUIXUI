/**
 * The focus ring and keyboard cursor of a roving composite must not outlive
 * focus.
 *
 * **The bug guarded (plan `601`).** `ToggleGroup`, `RadioGroup` and `Rating`
 * keep their cursor in React state written by `onFocus` and cleared by
 * `onBlur`. The pinned 0.10.0 release build moves focus but dispatches neither
 * event (plan `583`), so the state was never cleared: after focus left the
 * group, its last item kept painting a focus ring (a second, false focus
 * indicator), and a `RadioGroup` whose controlled parent defers resumed its
 * arrow walk from the abandoned item instead of from the tab stop it returned
 * to. `CheckboxGroup` is the control — its only focus source is the native
 * tracker, so it was immune by accident. `RangeSlider` (plan `602`) had the
 * same defect one component later: its thumbs hand-rolled the id map, event
 * cursor and tracker merge, so a thumb the user had left kept a second ring.
 * Every focus owner now uses `useRovingFocus` or `useFocus`.
 *
 * Each case waits for the tracker's sample (`settleFocus`), because the clear
 * is a sample-driven effect and the tracker polls every 50 ms.
 *
 * The table at the bottom is the **focus-lifetime matrix** (plan `603`): every
 * focusable Tier 1 control, not only the ones that had the bug, proves a ring
 * while it holds focus and none after focus leaves.
 */

import type { ReactElement, ReactNode } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { IconButton } from "../src/components/IconButton.js";
import { InfoTip } from "../src/components/InfoTip.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { OTPField } from "../src/components/OTPField.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Rating } from "../src/components/Rating.js";
import { ScrollArea } from "../src/components/ScrollArea.js";
import { Select } from "../src/components/Select.js";
import { RangeSlider, Slider } from "../src/components/Slider.js";
import { Stack } from "../src/components/Stack.js";
import { Switch } from "../src/components/Switch.js";
import { Text } from "../src/components/Text.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import type { Runtime } from "../src/testing/index.js";
import { isFocusRing, isWithin } from "../src/testing/index.js";
import { Surface, openWindow, settleFocus } from "./fixture.js";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

const focused = (runtime: Runtime): string =>
  Option.getOrElse(runtime.focused(), () => "nothing");

/** How many focus rings the window paints. */
const ringCount = (runtime: Runtime): number =>
  Arr.length(
    Arr.filter(runtime.all(), (element) =>
      isFocusRing(element.style.boxShadow),
    ),
  );

/** Whether any ring is painted inside the element carrying `testId`. */
const ringWithin = (runtime: Runtime, testId: string): boolean => {
  const root = Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`no element ${testId}`),
  );
  return Arr.some(
    runtime.all(),
    (element) =>
      isFocusRing(element.style.boxShadow) &&
      isWithin(runtime, element, root.id),
  );
};

const mount = async (node: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{node}</Surface>);
  return runtime;
};

/** Move focus inside, leave the composite, and wait for the tracker's sample. */
const leave = async (runtime: Runtime): Promise<void> => {
  runtime.click("before");
  await settleFocus();
};

const before = <Button testId="before">Before</Button>;

it("clears a multiple ToggleGroup's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <ToggleGroup
        type="multiple"
        testId="tg"
        label="Format"
        options={OPTIONS}
      />
    </Stack>,
  );
  runtime.keyDown("tg", "right");
  await settleFocus();
  expect(ringWithin(runtime, "tg-b")).toBe(true);
  await leave(runtime);
  expect(focused(runtime)).toBe("before");
  expect(ringWithin(runtime, "tg-b")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("clears a RadioGroup's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <RadioGroup testId="rg" label="Choice" options={OPTIONS} />
    </Stack>,
  );
  runtime.keyDown("rg", "down");
  await settleFocus();
  expect(focused(runtime)).toBe("rg-b");
  expect(ringWithin(runtime, "rg-b")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "rg-b")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("clears a Rating's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <Rating testId="rating" label="Quality" defaultValue={2} />
    </Stack>,
  );
  runtime.keyDown("rating", "right");
  await settleFocus();
  expect(focused(runtime)).toBe("rating-star-3");
  expect(ringWithin(runtime, "rating-star-3")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "rating-star-3")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("clears a RangeSlider thumb's ring when focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <RangeSlider testId="rs" label="Band" defaultValue={[20, 60]} />
    </Stack>,
  );
  runtime.click("rs");
  await settleFocus();
  expect(ringWithin(runtime, "rs-thumb-end")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "rs-thumb-end")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("keeps a CheckboxGroup row plain after focus leaves", async () => {
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <CheckboxGroup testId="cg" label="Columns" options={OPTIONS} />
    </Stack>,
  );
  runtime.click("cg-c");
  await settleFocus();
  expect(ringWithin(runtime, "cg-c")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "cg-c")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

it("restarts a deferred radio walk from the tab stop, not the abandoned item", async () => {
  // The parent keeps "a" no matter what the group reports, so the value-derived
  // tab stop stays Alpha while the cursor moves to Beta (plan `359`).
  const runtime = await mount(
    <Stack direction="row">
      {before}
      <RadioGroup
        testId="rg"
        label="Choice"
        options={OPTIONS}
        value="a"
        onValueChange={() => {}}
      />
    </Stack>,
  );
  runtime.keyDown("rg", "down");
  await settleFocus();
  expect(focused(runtime)).toBe("rg-b");
  await leave(runtime);
  runtime.focusNext();
  expect(focused(runtime)).toBe("rg-a");
  runtime.keyDown("rg", "down");
  expect(focused(runtime)).toBe("rg-b");
});

it("clears a seeded autoFocus ring when focus leaves", async () => {
  // Plan `591`: the runtime grants `autoFocus` on mount without dispatching
  // `onFocus`, so the field's event state starts `true`. Only the tracker's
  // sample can clear it on the release build (plan `603`, direction 1).
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row">
        {before}
        <Input testId="c" label="Name" autoFocus />
      </Stack>
    </Surface>,
  );
  await settleFocus();
  expect(ringWithin(runtime, "c")).toBe(true);
  await leave(runtime);
  expect(ringWithin(runtime, "c")).toBe(false);
  expect(ringCount(runtime)).toBe(1);
});

/** One row of the focus-lifetime matrix (plan `603`). */
interface LifetimeCase {
  readonly name: string;
  readonly node: () => ReactElement;
  /** A real gesture that focuses the control — Tab, or the control's own press. */
  readonly focus: (runtime: Runtime) => void;
}

/** Tab twice: the first stop is the outside button, the second the control. */
const tabIn = (runtime: Runtime): void => {
  runtime.focusNext();
  runtime.focusNext();
};

/**
 * Every focusable Tier 1 control, in its smallest honest shape — the same set
 * as `runtime/focus-ring.runtime.test.tsx` (plans `084`, `375`).
 *
 * A press is used where the control focuses a part programmatically on press
 * (`Rating`, `ToggleGroup`, `RadioGroup`, `RangeSlider`): that is the gesture
 * that writes an event cursor, so the row reproduces the class plan `602`
 * fixed. The rest take focus with Tab, as a keyboard user would.
 */
const LIFETIME: ReadonlyArray<LifetimeCase> = [
  {
    name: "Button",
    node: () => <Button testId="c">Save</Button>,
    focus: (r) => r.click("c"),
  },
  {
    name: "IconButton",
    node: () => <IconButton testId="c" icon="x" label="Close" />,
    focus: (r) => r.click("c"),
  },
  {
    name: "Toggle",
    node: () => <Toggle testId="c">Bold</Toggle>,
    focus: (r) => r.click("c"),
  },
  {
    name: "Checkbox",
    node: () => <Checkbox testId="c" label="Accept" />,
    focus: (r) => r.click("c"),
  },
  {
    name: "Switch",
    node: () => <Switch testId="c" label="On" />,
    focus: (r) => r.click("c"),
  },
  {
    name: "Input",
    node: () => <Input testId="c" label="Name" />,
    focus: tabIn,
  },
  {
    name: "TextArea",
    node: () => <TextArea testId="c" label="Notes" />,
    focus: tabIn,
  },
  {
    name: "NumberField",
    node: () => <NumberField testId="c" label="Count" />,
    focus: tabIn,
  },
  {
    name: "OTPField",
    node: () => <OTPField testId="c" label="Code" />,
    focus: tabIn,
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
    focus: tabIn,
  },
  {
    name: "Rating",
    node: () => <Rating testId="c" label="Score" />,
    focus: (r) => r.keyDown("c", "right"),
  },
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
    focus: (r) => r.click("c-l"),
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
    focus: (r) => r.keyDown("c", "down"),
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
    focus: (r) => r.click("c-a"),
  },
  {
    name: "Slider",
    node: () => <Slider testId="c" label="Volume" />,
    focus: tabIn,
  },
  {
    name: "RangeSlider",
    node: () => <RangeSlider testId="c" label="Band" />,
    focus: (r) => r.click("c"),
  },
  {
    name: "InfoTip",
    node: () => <InfoTip content="A hint" label="More" testId="c" />,
    focus: tabIn,
  },
  {
    name: "ScrollArea",
    node: () => (
      <ScrollArea label="Log" testId="c" axis="vertical" style={{ height: 60 }}>
        <Text>Line</Text>
      </ScrollArea>
    ),
    focus: tabIn,
  },
];

it.each(Arr.map(LIFETIME, (testCase) => [testCase.name, testCase] as const))(
  "%s paints a ring while focused and none after focus leaves",
  async (_name, testCase) => {
    const runtime = await mount(
      <Stack direction="row">
        {before}
        {testCase.node()}
      </Stack>,
    );
    testCase.focus(runtime);
    await settleFocus();
    expect(ringWithin(runtime, "c")).toBe(true);
    await leave(runtime);
    expect(ringWithin(runtime, "c")).toBe(false);
    expect(ringCount(runtime)).toBe(1);
  },
);

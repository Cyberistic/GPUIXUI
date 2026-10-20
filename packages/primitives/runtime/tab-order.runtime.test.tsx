/**
 * The tab-order matrices: every control that cannot act leaves the tab order,
 * every control that can act is reached, and a **read-only** control keeps its
 * stop.
 *
 * The bug these guard: each component writes its own "not a tab stop while
 * disabled" guard — sixteen hand-written copies of one rule (`tabIndex:
 * undefined`, or `-1` where the runtime's editor owns the element). That
 * duplication is the shape of two bugs this workstream already shipped: an
 * `OTPField` that was six tab stops (plan `076`) and a `Select` trigger that
 * forgot its focus ring (plan `083`). A keyboard user who tabs into a dead
 * control cannot tell a disabled UI from a broken one.
 *
 * Both halves run per control, because the disabled half alone also passes for a
 * control wrongly removed from the tab order altogether. The read-only table
 * (plan `800`) is the other side of the same gate: read-only is a display state
 * that must stay reachable, so it is neither "enabled" nor "disabled" in the
 * rule above — and `Rating` had it wrong.
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
import type { Runtime } from "../src/testing/index.js";
import { isWithin } from "../src/testing/index.js";
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

/**
 * Read-only is a display state, not a disabled one.
 *
 * The bug this guards (plan `800`): `Rating` gated its tab stop on
 * "interactive", so a read-only rating was the one value control a keyboard user
 * could not reach, while the nine other read-only parts keep theirs (plan `786`
 * for the fields, `797` for `Select`, `799` for the selection family, `802` for
 * the slider family). The disabled half above cannot see it, because a rating
 * that is skipped looks correct there. A read-only control must stay reachable,
 * so Tab has to land inside it rather than on the trailing sentinel.
 */
const READ_ONLY_CASES: ReadonlyArray<{
  readonly name: string;
  readonly node: ReactElement;
}> = [
  { name: "Input", node: <Input testId="c" label="Name" readOnly /> },
  { name: "TextArea", node: <TextArea testId="c" label="Notes" readOnly /> },
  {
    name: "NumberField",
    node: <NumberField testId="c" label="Count" readOnly />,
  },
  { name: "OTPField", node: <OTPField testId="c" label="Code" readOnly /> },
  {
    name: "Select",
    node: (
      <Select testId="c" label="Fruit" options={[...ONE_OPTION]} readOnly />
    ),
  },
  {
    name: "Rating",
    node: <Rating testId="c" label="Score" defaultValue={3} readOnly />,
  },
  { name: "Checkbox", node: <Checkbox testId="c" label="Accept" readOnly /> },
  { name: "Switch", node: <Switch testId="c" label="On" readOnly /> },
  {
    name: "CheckboxGroup",
    node: (
      <CheckboxGroup
        testId="c"
        label="Topics"
        options={[...ONE_OPTION]}
        readOnly
      />
    ),
  },
  {
    name: "RadioGroup",
    node: (
      <RadioGroup testId="c" label="Size" options={[...ONE_OPTION]} readOnly />
    ),
  },
  { name: "Slider", node: <Slider testId="c" label="Volume" readOnly /> },
  {
    name: "RangeSlider",
    node: <RangeSlider testId="c" label="Band" readOnly />,
  },
];

it.each(
  READ_ONLY_CASES.map((testCase) => [testCase.name, testCase.node] as const),
)("%s keeps its tab stop while read-only", async (_name, node) => {
  const runtime = await mountAtStart(node);
  runtime.focusNext();
  const root = Option.getOrElse(runtime.element("c"), () =>
    expect.fail("the control painted no root element"),
  );
  const focused = Option.getOrElse(runtime.focusedElement(), () =>
    expect.fail("the read-only control took no focus"),
  );
  expect(isWithin(runtime, focused, root.id)).toBe(true);
});

/**
 * The disabled guard must not be conditional on a second prop.
 *
 * Plan 340 measured the case the matrix above cannot see: `Button` decided its
 * tab stop with `disabled === true && loading !== true`, so the common
 * `disabled={saving} loading={saving}` call left the dead control in the tab
 * order, while both docs pages say a disabled button is not tabbable. `loading`
 * alone is the documented exception and must stay reachable, so both halves run.
 */
const BUSY_CASES: ReadonlyArray<{
  readonly name: string;
  readonly node: ReactElement;
}> = [
  {
    name: "Button",
    node: (
      <Button testId="c" disabled loading>
        Save
      </Button>
    ),
  },
  {
    name: "IconButton",
    node: <IconButton testId="c" icon="x" label="Close" disabled loading />,
  },
];

const LOADING_CASES: ReadonlyArray<{
  readonly name: string;
  readonly node: ReactElement;
}> = [
  {
    name: "Button",
    node: (
      <Button testId="c" loading>
        Save
      </Button>
    ),
  },
  {
    name: "IconButton",
    node: <IconButton testId="c" icon="x" label="Close" loading />,
  },
];

it.each(BUSY_CASES.map((testCase) => [testCase.name, testCase.node] as const))(
  "%s leaves the tab order when disabled while loading",
  async (_name, node) => {
    const runtime = await mountAtStart(node);
    runtime.focusNext();
    expect(focusedId(runtime)).toBe("after");
  },
);

it.each(
  LOADING_CASES.map((testCase) => [testCase.name, testCase.node] as const),
)("%s keeps its tab stop while loading", async (_name, node) => {
  const runtime = await mountAtStart(node);
  runtime.focusNext();
  expect(focusedId(runtime)).toBe("c");
});

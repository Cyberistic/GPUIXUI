/**
 * A control must contain its own label.
 *
 * The bug this guards (plan `368`): a text run is a flex item, and GPUix never
 * shrinks one. Measured on 0.10.0, a 70-character label painted 80 px outside a
 * 220 px `Button`, 141 px outside a `CheckboxGroup`, and pushed a `Select`'s
 * chevron 192 px outside its own trigger; a 200-character option opened a
 * 1482 px list in a 1280 px window. Every case here mounts the same narrow frame
 * with a label that cannot fit and requires the painted text to stay inside the
 * control (and, for the select, the list to stay inside the window).
 *
 * A control that wraps (a `Label`, a group row) may grow taller; a fixed-height
 * control truncates. Both keep the text inside their own box.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import type { TestElement } from "@gpuix/react/testing";
import { Button } from "../src/components/Button.js";
import { ButtonGroup } from "../src/components/ButtonGroup.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { Label } from "../src/components/Label.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Select } from "../src/components/Select.js";
import { Stack } from "../src/components/Stack.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { FLOATING_MARGIN } from "../src/core/index.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { WINDOW, Surface, openWindow } from "./fixture.js";

const LONG =
  "A very long option label that will not fit in a narrow control at all";

const FRAME = 220;

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const painted = (runtime: Runtime, text: string): ReadonlyArray<TestElement> =>
  runtime.renderer
    .findByType("text")
    .filter((element) => element.text === text);

const boxText = (box: Bounds): string =>
  `x ${box.x}…${box.x + box.width}, y ${box.y}…${box.y + box.height}`;

/**
 * Every painted copy of `text` that escapes `control`.
 *
 * The renderer reports the text element's own laid-out box, so a label that
 * merely *paints* clipped would still fail: containment has to be real layout.
 * An empty list is the rule holding.
 */
const escapes = (
  runtime: Runtime,
  control: string,
  text: string,
): ReadonlyArray<string> => {
  const box = boundsOf(runtime, control);
  return painted(runtime, text).flatMap((element) =>
    Option.match(
      Option.fromNullishOr(runtime.renderer.getElementBounds(element.id)),
      {
        onNone: () => [],
        onSome: (label) => {
          const fits =
            label.x >= box.x - 0.5 &&
            label.y >= box.y - 0.5 &&
            label.x + label.width <= box.x + box.width + 0.5 &&
            label.y + label.height <= box.y + box.height + 0.5;
          return fits
            ? []
            : [`the label (${boxText(label)}) escapes (${boxText(box)})`];
        },
      },
    ),
  );
};

/** Mount one control in the narrow frame every case shares. */
const mount = async (control: ReactNode): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" gap="md" style={{ width: FRAME }}>
        {control}
      </Stack>
    </Surface>,
  );
  return runtime;
};

const options = [
  { value: "a", label: LONG },
  { value: "b", label: "Short" },
];

const cases: ReadonlyArray<{
  readonly name: string;
  readonly control: string;
  readonly open: () => Promise<Runtime>;
}> = [
  {
    name: "Button",
    control: "button",
    open: () =>
      mount(
        <Button testId="button" variant="primary">
          {LONG}
        </Button>,
      ),
  },
  {
    name: "Toggle",
    control: "toggle",
    open: () =>
      mount(
        <Toggle testId="toggle" pressed={false}>
          {LONG}
        </Toggle>,
      ),
  },
  {
    name: "ToggleGroup",
    control: "tg",
    open: () =>
      mount(
        <ToggleGroup
          testId="tg"
          label="Modes"
          type="single"
          options={options}
          style={{ width: FRAME }}
        />,
      ),
  },
  {
    name: "CheckboxGroup row",
    control: "cg-a",
    open: () =>
      mount(<CheckboxGroup testId="cg" label="Checks" options={options} />),
  },
  {
    name: "RadioGroup row",
    control: "rg-a",
    open: () =>
      mount(<RadioGroup testId="rg" label="Radios" options={options} />),
  },
  {
    name: "Label",
    control: "label",
    open: () => mount(<Label testId="label">{LONG}</Label>),
  },
];

it.each(cases)("contains its own label: $name", async ({ control, open }) => {
  const runtime = await open();
  expect(painted(runtime, LONG)).not.toHaveLength(0);
  expect(escapes(runtime, control, LONG)).toStrictEqual([]);
});

it("shares a constrained group's width between its buttons", async () => {
  // Plan 369: measured, a 220 px attached group left its first button 401 px
  // wide and the second at x 413…463 — outside the group and clipped away. Both
  // buttons now share the width, and the long label truncates (plan 368).
  const runtime = await mount(
    <ButtonGroup testId="group" mode="attached" style={{ width: FRAME }}>
      <Button testId="first" variant="primary">
        {LONG}
      </Button>
      <Button testId="second" variant="secondary">
        Save
      </Button>
    </ButtonGroup>,
  );
  const group = boundsOf(runtime, "group");
  for (const id of ["first", "second"]) {
    const button = boundsOf(runtime, id);
    expect(button.x).toBeGreaterThanOrEqual(group.x);
    expect(button.x + button.width).toBeLessThanOrEqual(group.x + group.width);
  }
  expect(escapes(runtime, "group", LONG)).toStrictEqual([]);
});

it("keeps a vertical group stretched instead of shrinking it", async () => {
  const runtime = await mount(
    <ButtonGroup
      testId="group"
      mode="attached"
      orientation="vertical"
      style={{ width: FRAME }}
    >
      <Button testId="first" variant="primary">
        {LONG}
      </Button>
      <Button testId="second" variant="secondary">
        Save
      </Button>
    </ButtonGroup>,
  );
  const group = boundsOf(runtime, "group");
  const first = boundsOf(runtime, "first");
  const second = boundsOf(runtime, "second");
  expect(first.width).toBeCloseTo(group.width, 0);
  expect(second.width).toBeCloseTo(group.width, 0);
  expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
  expect(escapes(runtime, "group", LONG)).toStrictEqual([]);
});

it("keeps a long select value and its chevron inside the trigger", async () => {
  const runtime = await mount(
    <Select
      testId="select"
      label="Workspace"
      options={options}
      defaultValue="a"
      fullWidth
    />,
  );
  expect(escapes(runtime, "select-trigger", LONG)).toStrictEqual([]);
  const trigger = boundsOf(runtime, "select-trigger");
  const chevron = boundsOf(runtime, "select-chevron");
  expect(chevron.x).toBeGreaterThanOrEqual(trigger.x);
  expect(chevron.x + chevron.width).toBeLessThanOrEqual(
    trigger.x + trigger.width,
  );
});

it("caps a long option list to the window and contains its rows", async () => {
  const huge = `${"A very long option label ".repeat(10)}end`;
  const runtime = await mount(
    <Select
      testId="select"
      label="Workspace"
      options={[
        { value: "a", label: huge },
        { value: "b", label: "Short" },
      ]}
      defaultValue="b"
      fullWidth
    />,
  );
  runtime.click("select-trigger");
  const content = boundsOf(runtime, "select-content");
  expect(content.x).toBeGreaterThanOrEqual(FLOATING_MARGIN);
  expect(content.x + content.width).toBeLessThanOrEqual(
    WINDOW.width - FLOATING_MARGIN,
  );
  expect(escapes(runtime, "select-content", huge)).toStrictEqual([]);
});

it("still hugs a short option list", async () => {
  const runtime = await mount(
    <Select
      testId="select"
      label="Workspace"
      options={[
        { value: "a", label: "Short" },
        { value: "b", label: "Also short" },
      ]}
      defaultValue="a"
      fullWidth
    />,
  );
  runtime.click("select-trigger");
  const trigger = boundsOf(runtime, "select-trigger");
  const content = boundsOf(runtime, "select-content");
  // `minWidth` is the trigger's measured width, so a list that fits is exactly
  // that wide — the cap must not have become a fixed width.
  expect(content.width).toBeCloseTo(trigger.width, 0);
});

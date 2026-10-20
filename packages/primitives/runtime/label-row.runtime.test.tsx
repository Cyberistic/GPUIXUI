/**
 * A label that mixes an icon with text paints on one line (plan 803).
 *
 * The bug this guards: GPUix lays a box's children on the cross axis by
 * default, so the documented shape `<Checkbox><Icon name="star" /> Accept
 * </Checkbox>` painted the 16 px star above the word — measured `y 12…28` for
 * the star and `28…45` for the word in a 33 px label column, where a
 * text-only `Checkbox` row is 17 px. `Button` and `Toggle` children stacked the
 * same way inside their 36 px recipes. Each case measures the painted boxes of
 * the icon and the words; the old direction leaves their vertical extents
 * touching instead of overlapping, and doubles the label's height.
 *
 * A mixed label is split into one fitted text run and its opaque parts, so the
 * long-label cases prove the row did not bring back the plan-368 overflow: the
 * words stay inside a narrow control.
 */

import type { ReactElement } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { expect, it } from "vitest";
import type { TestElement } from "@gpuix/react/testing";
import { Icon } from "@gpuixui/icons";
import { Box } from "../src/components/Box.js";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { Switch } from "../src/components/Switch.js";
import { Toggle } from "../src/components/Toggle.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { openWindow, Surface } from "./fixture.js";

const FRAME = 220;
const LONG = "Containmentwordthatcannotfitinanarrowcontrolatall";
const ICON = <Icon name="star" color="#123456" />;

interface Case {
  readonly name: string;
  readonly testId: string;
  readonly mixed: ReactElement;
  readonly textOnly: ReactElement;
  /** The label container's index among the control's children. */
  readonly label: number;
}

const CASES: ReadonlyArray<Case> = [
  {
    name: "Button",
    testId: "b",
    label: 0,
    mixed: (
      <Button testId="b">
        {ICON}
        Add
      </Button>
    ),
    textOnly: <Button testId="b">Add</Button>,
  },
  {
    name: "Toggle",
    testId: "t",
    label: 0,
    mixed: (
      <Toggle testId="t">
        {ICON}
        Bold
      </Toggle>
    ),
    textOnly: <Toggle testId="t">Bold</Toggle>,
  },
  {
    name: "Checkbox",
    testId: "c",
    label: 1,
    mixed: (
      <Checkbox testId="c">
        {ICON}
        Accept
      </Checkbox>
    ),
    textOnly: <Checkbox testId="c">Accept</Checkbox>,
  },
  {
    name: "Switch",
    testId: "s",
    label: 1,
    mixed: (
      <Switch testId="s">
        {ICON}
        Pause
      </Switch>
    ),
    textOnly: <Switch testId="s">Pause</Switch>,
  },
];

const box = (runtime: Runtime, elementId: number): Bounds =>
  Option.getOrElse(
    Option.fromNullishOr(runtime.renderer.getElementBounds(elementId)),
    () => expect.fail("the runtime painted no box for the measured element"),
  );

/** The label container's host id on a mounted control. */
const labelId = (runtime: Runtime, testCase: Case): number =>
  Option.getOrElse(
    Option.flatMap(runtime.element(testCase.testId), (root) =>
      Option.fromNullishOr(root.children[testCase.label]),
    ),
    () => expect.fail(`${testCase.name} painted no label container`),
  );

/** The label, its icon and its fitted text part, for a mixed label. */
const mixedBoxes = (
  runtime: Runtime,
  testCase: Case,
): { readonly label: Bounds; readonly icon: Bounds; readonly text: Bounds } => {
  const id = labelId(runtime, testCase);
  const parts = Option.getOrElse(
    Option.fromNullishOr(runtime.renderer.getElement(id)?.children),
    () => expect.fail(`${testCase.name}'s label painted no children`),
  );
  const iconId = Option.getOrElse(Option.fromNullishOr(parts[0]), () =>
    expect.fail(`${testCase.name}'s label painted no icon`),
  );
  const textId = Option.getOrElse(Option.fromNullishOr(parts[1]), () =>
    expect.fail(`${testCase.name}'s label painted no text`),
  );
  return {
    label: box(runtime, id),
    icon: box(runtime, iconId),
    text: box(runtime, textId),
  };
};

it.each(CASES)(
  "$name puts an icon and its word on one line",
  async (testCase) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{testCase.mixed}</Surface>);
    const { label, icon, text } = mixedBoxes(runtime, testCase);
    // Old direction: the icon's bottom equalled the text's top (no overlap).
    expect(icon.y + icon.height).toBeGreaterThan(text.y);
    expect(icon.y).toBeLessThan(text.y + text.height);
    expect(icon.x + icon.width).toBeLessThanOrEqual(text.x + 0.5);
    // One line: the label is no taller than the run it holds.
    expect(Math.abs(label.height - text.height)).toBeLessThanOrEqual(0.5);
  },
);

it.each(CASES)(
  "$name keeps a text-only label free of the row layout",
  async (testCase) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{testCase.textOnly}</Surface>);
    const id = labelId(runtime, testCase);
    const style = Option.getOrElse(
      Option.fromNullishOr(runtime.renderer.getElement(id)?.style),
      () => expect.fail(`${testCase.name}'s label painted no style`),
    );
    expect(style.display).toBeUndefined();
  },
);

it.each([
  {
    name: "Button",
    testId: "b",
    control: (
      <Box tone="card" style={{ width: FRAME }}>
        <Button testId="b">
          {ICON}
          {LONG}
        </Button>
      </Box>
    ),
  },
  {
    name: "Checkbox",
    testId: "c",
    control: (
      <Box tone="card" style={{ width: FRAME }}>
        <Checkbox testId="c">
          {ICON}
          {LONG}
        </Checkbox>
      </Box>
    ),
  },
])(
  "$name keeps a long mixed label inside a narrow control",
  async ({ testId, control }) => {
    const runtime = await openWindow();
    runtime.render(<Surface>{control}</Surface>);
    const bounds = Option.getOrElse(runtime.bounds(testId), () =>
      expect.fail("the narrow control painted no box"),
    );
    const painted = runtime.renderer
      .findByType("text")
      .filter((element: TestElement) => element.text === LONG);
    expect(painted.length).toBeGreaterThan(0);
    Arr.forEach(painted, (element) => {
      const text = box(runtime, element.id);
      expect(text.x).toBeGreaterThanOrEqual(bounds.x - 0.5);
      expect(text.x + text.width).toBeLessThanOrEqual(
        bounds.x + bounds.width + 0.5,
      );
    });
  },
);

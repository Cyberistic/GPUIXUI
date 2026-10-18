/**
 * The activation contract, proved across every button-shaped control.
 *
 * The class this guards (plan `354`, found by plan `353`): a control wired on
 * only one key phase, or a group whose activation target comes from the value
 * instead of the focused item. Both were invisible to per-control tests because
 * each drove one key, and because focus and value agree in the common
 * uncontrolled case.
 *
 * `core/keyboard.ts` owns the rule: **Enter on key down, Space on key up**, a
 * held key never activates, and the pointer activates once. This table drives
 * all of it against the eight controls that share the rule, in a fresh window
 * per case, with the target genuinely focused first.
 */

import type { ReactElement } from "react";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { Runtime } from "../src/testing/index.js";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { CheckboxGroup } from "../src/components/CheckboxGroup.js";
import { IconButton } from "../src/components/IconButton.js";
import { RadioGroup } from "../src/components/RadioGroup.js";
import { Switch } from "../src/components/Switch.js";
import { Toggle } from "../src/components/Toggle.js";
import { ToggleGroup } from "../src/components/ToggleGroup.js";
import { Surface, openWindow } from "./fixture.js";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

interface ActivationCase {
  readonly name: string;
  /** The element the sequence targets — a group's second item, not the root. */
  readonly focusId: string;
  readonly node: (report: () => void) => ReactElement;
}

const CASES: ReadonlyArray<ActivationCase> = [
  {
    name: "Button",
    focusId: "x",
    node: (report) => (
      <Button testId="x" onActivate={report}>
        Save
      </Button>
    ),
  },
  {
    name: "IconButton",
    focusId: "x",
    node: (report) => (
      <IconButton testId="x" label="Add" icon="plus" onActivate={report} />
    ),
  },
  {
    name: "Toggle",
    focusId: "x",
    node: (report) => (
      <Toggle testId="x" onPressedChange={report}>
        Bold
      </Toggle>
    ),
  },
  {
    name: "Checkbox",
    focusId: "x",
    node: (report) => (
      <Checkbox testId="x" label="Accept" onValueChange={report} />
    ),
  },
  {
    name: "Switch",
    focusId: "x",
    node: (report) => <Switch testId="x" label="On" onValueChange={report} />,
  },
  {
    name: "CheckboxGroup",
    focusId: "x-b",
    node: (report) => (
      <CheckboxGroup testId="x" options={options} onValueChange={report} />
    ),
  },
  {
    name: "RadioGroup",
    focusId: "x-b",
    node: (report) => (
      <RadioGroup testId="x" options={options} onValueChange={report} />
    ),
  },
  {
    name: "ToggleGroup",
    focusId: "x-b",
    node: (report) => (
      <ToggleGroup
        testId="x"
        type="single"
        options={options}
        onValueChange={report}
      />
    ),
  },
];

interface Sequence {
  readonly name: string;
  readonly run: (runtime: Runtime, focusId: string) => void;
  readonly expected: number;
}

const SEQUENCES: ReadonlyArray<Sequence> = [
  {
    name: "enter down",
    run: (runtime, id) => runtime.keyDown(id, "enter"),
    expected: 1,
  },
  {
    name: "enter up",
    run: (runtime, id) => runtime.keyUp(id, "enter"),
    expected: 0,
  },
  {
    name: "space down",
    run: (runtime, id) => runtime.keyDown(id, "space"),
    expected: 0,
  },
  {
    name: "space up",
    run: (runtime, id) => runtime.keyUp(id, "space"),
    expected: 1,
  },
  {
    name: "enter held",
    run: (runtime, id) => runtime.keyDown(id, "enter", true),
    expected: 0,
  },
  {
    name: "space held",
    run: (runtime, id) => runtime.keyDown(id, "space", true),
    expected: 0,
  },
  {
    name: "enter pair",
    run: (runtime, id) => {
      runtime.keyDown(id, "enter");
      runtime.keyUp(id, "enter");
    },
    expected: 1,
  },
  {
    name: "space pair",
    run: (runtime, id) => {
      runtime.keyDown(id, "space");
      runtime.keyUp(id, "space");
    },
    expected: 1,
  },
  {
    name: "pointer click",
    run: (runtime, id) => runtime.click(id),
    expected: 1,
  },
];

/** Focus the named element, so the sequence is delivered where a user's would be. */
const focus = (runtime: Runtime, testId: string): void => {
  const element = Option.getOrElse(runtime.element(testId), () =>
    expect.fail(`no element ${testId} in the activation scene`),
  );
  runtime.renderer.focusElement(element.id);
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
};

it.each(
  Arr.flatMap(CASES, (activationCase) =>
    Arr.map(
      SEQUENCES,
      (sequence) =>
        [activationCase.name, sequence.name, activationCase, sequence] as const,
    ),
  ),
)(
  "%s activates per the contract on %s",
  async (_name, _sequence, testCase, sequence) => {
    const runtime = await openWindow();
    let reports = 0;
    runtime.render(
      <Surface>
        {testCase.node(() => {
          reports += 1;
        })}
      </Surface>,
    );
    runtime.flush();
    focus(runtime, testCase.focusId);
    sequence.run(runtime, testCase.focusId);
    runtime.flush();
    // One callback per activation; a repeat and a directional key report nothing.
    expect(reports).toBe(sequence.expected);
  },
);

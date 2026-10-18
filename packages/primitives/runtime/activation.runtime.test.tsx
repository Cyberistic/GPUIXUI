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
 * per case, with the target genuinely focused first. It asserts the reported
 * **value** as well as the count, so a group that activates the stale tab stop
 * fails even though it reported exactly once.
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

/** What a case reports; buttons report no value, so they use a sentinel. */
type Report = (value?: string) => void;

interface ActivationCase {
  readonly name: string;
  /** The element the sequence targets — a group's second item, not the root. */
  readonly focusId: string;
  /** The value a single activation must report. */
  readonly reported: string;
  readonly node: (report: Report) => ReactElement;
}

const CASES: ReadonlyArray<ActivationCase> = [
  {
    name: "Button",
    focusId: "x",
    reported: "activated",
    node: (report) => (
      <Button testId="x" onActivate={() => report()}>
        Save
      </Button>
    ),
  },
  {
    name: "IconButton",
    focusId: "x",
    reported: "activated",
    node: (report) => (
      <IconButton
        testId="x"
        label="Add"
        icon="plus"
        onActivate={() => report()}
      />
    ),
  },
  {
    name: "Toggle",
    focusId: "x",
    reported: "true",
    node: (report) => (
      <Toggle testId="x" onPressedChange={(pressed) => report(String(pressed))}>
        Bold
      </Toggle>
    ),
  },
  {
    name: "Checkbox",
    focusId: "x",
    reported: "true",
    node: (report) => (
      <Checkbox
        testId="x"
        label="Accept"
        onValueChange={(checked) => report(String(checked))}
      />
    ),
  },
  {
    name: "Switch",
    focusId: "x",
    reported: "true",
    node: (report) => (
      <Switch
        testId="x"
        label="On"
        onValueChange={(checked) => report(String(checked))}
      />
    ),
  },
  {
    name: "CheckboxGroup",
    focusId: "x-b",
    reported: "b",
    node: (report) => (
      <CheckboxGroup
        testId="x"
        options={options}
        onValueChange={(values) => report(String(values))}
      />
    ),
  },
  {
    name: "RadioGroup",
    focusId: "x-b",
    reported: "b",
    node: (report) => (
      <RadioGroup
        testId="x"
        options={options}
        onValueChange={(value) => report(value)}
      />
    ),
  },
  {
    name: "ToggleGroup",
    focusId: "x-b",
    reported: "b",
    node: (report) => (
      <ToggleGroup
        testId="x"
        type="single"
        options={options}
        onValueChange={(values) => report(String(values))}
      />
    ),
  },
];

interface Sequence {
  readonly name: string;
  readonly run: (runtime: Runtime, focusId: string) => void;
  /** How many times the control must report. */
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
    const reports: string[] = [];
    runtime.render(
      <Surface>
        {testCase.node((value) => {
          reports.push(value ?? "activated");
        })}
      </Surface>,
    );
    runtime.flush();
    focus(runtime, testCase.focusId);
    sequence.run(runtime, testCase.focusId);
    runtime.flush();
    // A repeat and the wrong key phase report nothing; an activation reports
    // once, and a group must report the item the sequence targeted.
    expect(reports).toEqual(sequence.expected === 0 ? [] : [testCase.reported]);
  },
);

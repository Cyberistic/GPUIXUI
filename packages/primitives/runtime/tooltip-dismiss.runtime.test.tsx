/**
 * A click dismisses a focus-opened tooltip on every single-root trigger.
 *
 * The bug guarded (plan `605`): `Tooltip` remembered a dismissal only through
 * the slot's `onClick`, but `TriggerHandlers` has no `click` — it is the button
 * family's public activation callback. Every other control dropped the cloned
 * prop, so a tip opened by keyboard focus stayed painted after a click. The
 * runtime's own `onMouseDown` close was computed from the previous frame in the
 * same dismiss dispatch, so it alone could not close the tip either.
 *
 * Each case focuses the trigger (the tip opens from the native-focus tracker on
 * the pinned release build), clicks it for real, and asserts the tip's text is
 * no longer painted.
 */

import { expect, it } from "vitest";
import type { ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import * as Option from "effect/Option";
import { Button } from "../src/components/Button.js";
import { Checkbox } from "../src/components/Checkbox.js";
import { IconButton } from "../src/components/IconButton.js";
import { InfoTip } from "../src/components/InfoTip.js";
import { Input } from "../src/components/Input.js";
import { NumberField } from "../src/components/NumberField.js";
import { Select } from "../src/components/Select.js";
import { Slider } from "../src/components/Slider.js";
import { Switch } from "../src/components/Switch.js";
import { TextArea } from "../src/components/TextArea.js";
import { Toggle } from "../src/components/Toggle.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { openWindow, settleFocus, Surface } from "./fixture.js";

/** The hint the tip paints; no other element uses it. */
const TIP = "A hint";

const tipPainted = (text: ReadonlyArray<string>): boolean => text.includes(TIP);

interface TriggerCase {
  readonly name: string;
  readonly node: ReactNode;
  /** The host that takes focus: a field's inner input, a select's trigger. */
  readonly focusedId?: string;
  /** `Tooltip.style`, for a trigger that asks for `width: "100%"`. */
  readonly rootStyle?: StyleDesc;
}

const TRIGGERS: ReadonlyArray<TriggerCase> = [
  { name: "Button", node: <Button testId="target">Delete</Button> },
  {
    name: "IconButton",
    node: <IconButton testId="target" icon="x" label="Close" />,
  },
  {
    name: "Toggle",
    node: (
      <Toggle testId="target" label="Bold">
        Bold
      </Toggle>
    ),
  },
  { name: "Checkbox", node: <Checkbox testId="target" label="Agree" /> },
  { name: "Switch", node: <Switch testId="target" label="Pause" /> },
  { name: "Input", node: <Input testId="target" label="Name" /> },
  { name: "TextArea", node: <TextArea testId="target" label="Notes" /> },
  {
    name: "NumberField",
    node: <NumberField testId="target" label="Copies" />,
    focusedId: "target-input",
  },
  {
    name: "Select",
    node: (
      <Select
        testId="target"
        label="Fruit"
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    ),
    focusedId: "target-trigger",
  },
  {
    name: "Slider",
    node: <Slider testId="target" label="Volume" />,
    rootStyle: { width: 320 },
  },
];

it.each(TRIGGERS)(
  "a focused $name trigger dismisses its tip on click",
  async ({ node, rootStyle, focusedId = "target" }) => {
    const runtime = await openWindow();
    runtime.render(
      <Surface>
        <Tooltip content={TIP} side="bottom" testId="tip" style={rootStyle}>
          {node}
        </Tooltip>
      </Surface>,
    );
    runtime.focusNext();
    runtime.flush();
    await settleFocus();
    expect(Option.getOrUndefined(runtime.focused())).toBe(focusedId);
    expect(tipPainted(runtime.allText())).toBe(true);
    runtime.click(focusedId);
    runtime.flush();
    expect(tipPainted(runtime.allText())).toBe(false);
  },
);

it("an InfoTip trigger dismisses its tip on click", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <InfoTip
        testId="target"
        tipTestId="tip"
        label="More information"
        content={TIP}
        side="bottom"
      />
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await settleFocus();
  expect(Option.getOrUndefined(runtime.focused())).toBe("target");
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.click("target");
  runtime.flush();
  expect(tipPainted(runtime.allText())).toBe(false);
});

it("a click dismisses a hovered tip, and leaving then re-entering reopens it", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={TIP} side="bottom" testId="tip">
        <Checkbox testId="target" label="Agree" />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  runtime.flush();
  expect(tipPainted(runtime.allText())).toBe(true);
  runtime.click("target");
  runtime.flush();
  expect(tipPainted(runtime.allText())).toBe(false);
  runtime.hover("surface");
  runtime.flush();
  // The runtime closes a hover tip 80 ms after leave; the hover gate clears on
  // that close (plan `605`), so a fresh entry opens the tip again.
  await new Promise((resolve) => setTimeout(resolve, 120));
  runtime.flush();
  runtime.hover("target");
  runtime.flush();
  expect(tipPainted(runtime.allText())).toBe(true);
});

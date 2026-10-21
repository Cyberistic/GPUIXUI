/**
 * The pressable-target floor for the icon-sized controls, in the real renderer.
 *
 * The bug this guards: a clear or remove control drawn as a 16–18px glyph was
 * also its own press box — under the 24px floor WCAG 2.2 SC 2.5.8 states and
 * every density's control height already meets. The suite measures the painted
 * box, so shrinking one back to its drawing fails by name.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { HotkeyRecorder } from "../hotkey-recorder.js";
import { sizeOf } from "../internal/interaction.js";
import { targetSize } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { SearchInput } from "../search-input.js";
import { TagInput, TagInputChip, TagInputField } from "../tag-input.js";
import {
  TimePicker,
  TimePickerClear,
  TimePickerSegment,
} from "../time-picker.js";

const floor = {
  width: targetSize.minimum,
  height: targetSize.minimum,
} as const;

/** The painted box of a chip's removal control, which carries no `testId`. */
const removeBoxOf = (root: ComponentTestRoot, chipTestId: string) => {
  const chip = root.renderer.findByTestId(chipTestId);
  const id = chip?.children[1];
  const element = id === undefined ? undefined : root.renderer.getElement(id);
  const bounds =
    element === undefined ? null : root.renderer.getElementBounds(element.id);
  return bounds === null
    ? undefined
    : { width: bounds.width, height: bounds.height };
};

describe("pressable targets", () => {
  it("paints each icon-sized control at the pressable floor", () => {
    const search = renderComponent(<SearchInput defaultValue="alpha" />);
    expect(sizeOf(search, "search-clear")).toEqual(Option.some(floor));
    search.unmount();

    const time = renderComponent(
      <TimePicker defaultValue="09:30" clearable>
        <TimePickerSegment segment="hours" />
        <TimePickerSegment segment="minutes" />
        <TimePickerClear />
      </TimePicker>,
    );
    expect(sizeOf(time, "time-picker-clear")).toEqual(Option.some(floor));
    time.unmount();

    const recorder = renderComponent(
      <HotkeyRecorder
        testId="recorder"
        label="Toggle palette"
        value="mod+k"
        onChange={() => undefined}
      />,
    );
    expect(sizeOf(recorder, "recorder-clear")).toEqual(Option.some(floor));
    recorder.unmount();

    const tags = renderComponent(
      <TagInput label="Tags" value={["design"]} onValueChange={() => undefined}>
        <TagInputChip testId="chip-design" value="design" />
        <TagInputField />
      </TagInput>,
    );
    expect(removeBoxOf(tags, "chip-design")).toEqual(floor);
    tags.unmount();
  });

  it("does not shrink a control to its drawing", () => {
    // The glyphs are 16px (tag/recorder) and 18px (search/time); a registered
    // floor of 24 would be meaningless if the controls still measured those.
    expect(targetSize.minimum).toBeGreaterThan(18);
  });
});

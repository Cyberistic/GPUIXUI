/**
 * The selection wash, in the real GPUix renderer.
 *
 * The bug this guards: `@gpuix/native@0.11.0` defaults `selectionColor` to the
 * theme accent at 35%, a colour no token contract measures, so every selectable
 * host in this package painted a wash the design system never checked. Each one
 * now declares the theme's own `selection` role — the wash `selectionFailures`
 * holds to a visibility and a legibility floor.
 */

import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { ColorPicker } from "../color-picker.js";
import { CommandMenu, CommandMenuInput } from "../command-menu.js";
import { Field, FieldInput } from "../field.js";
import { InlineEdit } from "../inline-edit.js";
import { clickCentreOf } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "../mention-input.js";
import { SearchInput } from "../search-input.js";
import { TagInput, TagInputField } from "../tag-input.js";
import { TimePicker, TimePickerSegment } from "../time-picker.js";

/** The declared wash of every input host in the tree, in tree order. */
const washes = (root: ComponentTestRoot): ReadonlyArray<unknown> =>
  Arr.map(
    root.renderer.findByType("input"),
    (element) => element.style.selectionColor,
  );

/** One minimal composition per component that paints a selectable host. */
const cases: ReadonlyArray<readonly [string, () => ComponentTestRoot]> = [
  ["SearchInput", () => renderComponent(<SearchInput testId="search" />)],
  [
    "Field",
    () =>
      renderComponent(
        <Field label="Email">
          <FieldInput />
        </Field>,
      ),
  ],
  [
    "TimePicker",
    () =>
      renderComponent(
        <TimePicker>
          <TimePickerSegment segment="hours" />
          <TimePickerSegment segment="minutes" />
        </TimePicker>,
      ),
  ],
  [
    "TagInput",
    () =>
      renderComponent(
        <TagInput label="Tags" value={[]} onValueChange={() => undefined}>
          <TagInputField />
        </TagInput>,
      ),
  ],
  [
    "MentionInput",
    () =>
      renderComponent(
        <MentionInput label="Comment">
          <MentionInputList>
            <MentionInputItem value="ada" />
          </MentionInputList>
        </MentionInput>,
      ),
  ],
  ["ColorPicker", () => renderComponent(<ColorPicker label="Accent" />)],
  [
    "CommandMenu",
    () =>
      renderComponent(
        <CommandMenu open onOpenChange={() => undefined} actions={[]}>
          <CommandMenuInput />
        </CommandMenu>,
      ),
  ],
];

describe("selection wash", () => {
  it("paints the theme's measured selection role on every selectable host", () => {
    Arr.forEach(cases, ([name, mount]) => {
      const root = mount();
      const declared = washes(root);

      expect(Arr.length(declared), name).toBeGreaterThan(0);
      Arr.forEach(declared, (wash) =>
        expect(wash, name).toBe(darkTheme.colors.selection),
      );

      root.unmount();
    });
  });

  it("declares it on the input InlineEdit swaps in", () => {
    const root = renderComponent(
      <InlineEdit
        testId="name"
        label="Workspace name"
        value="Alpha"
        onCommit={() => undefined}
      />,
    );

    clickCentreOf(root, "name");

    expect(washes(root)).toEqual([darkTheme.colors.selection]);

    root.unmount();
  });

  it("is not the runtime's unmeasured accent default", () => {
    // An accent default would pass a test that only compared the hosts with
    // each other, so the role itself has to differ from the role it replaced.
    expect(darkTheme.colors.selection).not.toBe(darkTheme.colors.primary);
  });
});

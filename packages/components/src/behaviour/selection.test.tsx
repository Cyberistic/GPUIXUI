/**
 * The selection wash, in the real GPUix renderer.
 *
 * The bug this guards: `@gpuix/native@0.11.0` defaults `selectionColor` to the
 * theme accent at 35%, a colour no token contract measures, so every selectable
 * host in this package painted a wash the design system never checked. Each one
 * now declares the theme's own `selection` role — the wash `selectionFailures`
 * holds to a visibility and a legibility floor. The combobox's own search field
 * was the last host still handing the runtime's default (it passes only the
 * recipe and the ring), so a run selected there kept a wash no contract measured.
 *
 * The second bug these guard: a message's own tint is not one of those content
 * tones, so the designed role leaves a selectable run's copy under the body floor
 * in 30 of the 32 dark tint placements. `Alert` derives the wash per surface
 * (`selectionOn` through `messageSelection`), and the suite holds the paint and
 * the premise it is derived from.
 */

import * as Arr from "effect/Array";
import {
  alphaOf,
  blend,
  contrastFloorsFor,
  contrastRatio,
  decorativeFloor,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, type AlertTone } from "../alert.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
} from "../combobox.js";
import { ColorPicker } from "../color-picker.js";
import { CommandMenu, CommandMenuInput } from "../command-menu.js";
import { Field, FieldInput } from "../field.js";
import { InlineEdit } from "../inline-edit.js";
import { clickCentreOf, settle } from "../internal/interaction.js";
import {
  darkTheme,
  lightTheme,
  messageSelection,
  tone,
} from "../internal/theme.js";
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

  it("declares it on the combobox search field", () => {
    const root = renderComponent(
      <Combobox options={[{ value: "calendar", label: "Calendar" }]}>
        <ComboboxTrigger label="Assign reviewer" />
        <ComboboxContent>
          <ComboboxInput />
          <ComboboxList />
        </ComboboxContent>
      </Combobox>,
    );

    clickCentreOf(root, "combobox-trigger");
    settle(root);

    expect(washes(root)).toEqual([darkTheme.colors.selection]);

    root.unmount();
  });

  it("is not the runtime's unmeasured accent default", () => {
    // An accent default would pass a test that only compared the hosts with
    // each other, so the role itself has to differ from the role it replaced.
    expect(darkTheme.colors.selection).not.toBe(darkTheme.colors.primary);
  });

  it("derives the wash a selectable run inside a message is read through", () => {
    const styles = [
      ["dark", darkTheme],
      ["light", lightTheme],
    ] as const;
    const tones: ReadonlyArray<AlertTone> = [
      "info",
      "success",
      "warning",
      "danger",
    ];

    Arr.forEach(styles, ([name, theme]) => {
      Arr.forEach(tones, (value) => {
        const root = renderComponent(
          <Alert testId="alert" tone={value}>
            <AlertDescription>
              Two files could not be uploaded.
            </AlertDescription>
          </Alert>,
          name,
        );

        const wash = root.renderer.findByTestId("alert")?.style.selectionColor;
        const derived = messageSelection(theme, value);
        expect(wash, `${name} ${value}`).toBe(derived);

        // The description keeps the page ink, and a wash inherits down the
        // subtree, so the pair is the copy the message paints read through the
        // wash on the tone's own tint.
        const tint = tone(theme, value).bg;
        const composed = blend(tint, derived, alphaOf(derived));

        expect(
          contrastRatio(theme.colors.foreground, composed),
          `${name} ${value}`,
        ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).body);
        expect(
          contrastRatio(composed, tint),
          `${name} ${value}`,
        ).toBeGreaterThanOrEqual(decorativeFloor);

        root.unmount();
      });
    });
  });

  it("does not leave a dark tint on the page's designed wash", () => {
    // The premise: the role `selectionFailures` measures on the content tones is
    // under the body floor when it washes a message's own tint, which is why the
    // wash is derived against the surface the run is read on.
    const designed = blend(
      darkTheme.colors.warningSoft,
      darkTheme.colors.selection,
      alphaOf(darkTheme.colors.selection),
    );

    expect(contrastRatio(darkTheme.colors.foreground, designed)).toBeLessThan(
      contrastFloorsFor(darkTheme).body,
    );
    expect(messageSelection(darkTheme, "warning")).not.toBe(
      darkTheme.colors.selection,
    );
    // A light tint carries the designed role, so the derivation is per surface
    // rather than a second wash for every message.
    expect(messageSelection(lightTheme, "warning")).toBe(
      lightTheme.colors.selection,
    );
  });
});

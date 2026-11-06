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
import { ChatComposer, ChatRoot } from "../chat.js";
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

const washes = (root: ComponentTestRoot): ReadonlyArray<unknown> =>
  Arr.map(
    root.renderer.findByType("input"),
    (element) => element.style.selectionColor,
  );

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
  [
    "ColorPicker",
    () => {
      const root = renderComponent(
        <ColorPicker testId="picker" label="Accent" />,
      );
      clickCentreOf(root, "picker");
      settle(root);
      return root;
    },
  ],
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

  it("declares it on the chat composer's textarea", () => {
    const root = renderComponent(
      <ChatRoot onSubmit={() => undefined}>
        <ChatComposer testId="composer" />
      </ChatRoot>,
    );

    const declared = Arr.map(
      root.renderer.findByType("textarea"),
      (element) => element.style.selectionColor,
    );
    expect(declared).toEqual([darkTheme.colors.selection]);

    root.unmount();
  });

  it("is not the runtime's unmeasured accent default", () => {
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

    expect(messageSelection(lightTheme, "warning")).toBe(
      lightTheme.colors.selection,
    );
  });
});

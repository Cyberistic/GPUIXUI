import * as Arr from "effect/Array";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatComposer, ChatRoot } from "../chat.js";
import { ColorPicker } from "../color-picker.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxOption,
} from "../combobox.js";
import { CommandMenu, CommandMenuInput } from "../command-menu.js";
import { Field, FieldInput } from "../field.js";
import { clickCentreOf, settle } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { InlineEdit } from "../inline-edit.js";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "../mention-input.js";
import { SearchInput } from "../search-input.js";
import { TagInput, TagInputField } from "../tag-input.js";
import { TimePicker, TimePickerSegment } from "../time-picker.js";

const declarations = (root: ComponentTestRoot): ReadonlyArray<unknown> =>
  Arr.map(
    Arr.appendAll(
      root.renderer.findByType("input"),
      root.renderer.findByType("textarea"),
    ),
    (element) => element.style.keyboardFocusDim,
  );

const options: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar" },
];

let mounted: ComponentTestRoot | undefined;

const mount = (node: ReactNode): ComponentTestRoot => {
  mounted = renderComponent(node);
  return mounted;
};

const cleanup = (): void => {
  mounted?.unmount();
  mounted = undefined;
};

afterEach(cleanup);

const cases: ReadonlyArray<readonly [string, () => ComponentTestRoot]> = [
  ["SearchInput", () => mount(<SearchInput testId="search" />)],
  [
    "Field",
    () =>
      mount(
        <Field label="Email">
          <FieldInput />
        </Field>,
      ),
  ],
  [
    "TimePicker",
    () =>
      mount(
        <TimePicker>
          <TimePickerSegment segment="hours" />
          <TimePickerSegment segment="minutes" />
        </TimePicker>,
      ),
  ],
  [
    "TagInput",
    () =>
      mount(
        <TagInput label="Tags" value={[]} onValueChange={() => undefined}>
          <TagInputField />
        </TagInput>,
      ),
  ],
  [
    "MentionInput",
    () =>
      mount(
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
      const root = mount(<ColorPicker testId="picker" label="Accent" />);
      clickCentreOf(root, "picker");
      settle(root);
      return root;
    },
  ],
  [
    "CommandMenu",
    () =>
      mount(
        <CommandMenu open onOpenChange={() => undefined} actions={[]}>
          <CommandMenuInput />
        </CommandMenu>,
      ),
  ],
  [
    "Chat",
    () =>
      mount(
        <ChatRoot onSubmit={() => undefined}>
          <ChatComposer />
        </ChatRoot>,
      ),
  ],
];

describe("keyboard dim", () => {
  it("keeps every field host's own value out of the dim", () => {
    Arr.forEach(cases, ([name, render]) => {
      const root = render();
      const declared = declarations(root);

      expect(Arr.length(declared), name).toBeGreaterThan(0);
      Arr.forEach(declared, (dim) => expect(dim, name).toBe(false));

      cleanup();
    });
  });

  it("declares it on the input InlineEdit swaps in", () => {
    const root = mount(
      <InlineEdit
        testId="name"
        label="Workspace name"
        value="Alpha"
        onCommit={() => undefined}
      />,
    );

    clickCentreOf(root, "name");

    expect(declarations(root)).toEqual([false]);
  });

  it("declares it on the combobox's search field", async () => {
    const root = mount(
      <Combobox options={options}>
        <ComboboxTrigger label="Assign reviewer" />
        <ComboboxContent>
          <ComboboxInput />
          <ComboboxList />
        </ComboboxContent>
      </Combobox>,
    );

    clickCentreOf(root, "combobox-trigger");

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(declarations(root)).toEqual([false]);
  });

  it("lets a caller put the cue back", () => {
    const root = mount(
      <Field label="Email">
        <FieldInput style={{ keyboardFocusDim: true }} />
      </Field>,
    );

    expect(declarations(root)).toEqual([true]);
  });
});

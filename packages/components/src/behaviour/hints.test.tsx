import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatComposer, ChatRoot } from "../chat.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  type ComboboxOption,
} from "../combobox.js";
import {
  CommandMenu,
  CommandMenuInput,
  CommandMenuList,
} from "../command-menu.js";
import { Field, FieldInput } from "../field.js";
import { a11yNodes } from "../internal/a11y.js";
import {
  clickCentreOf,
  focusedTestId,
  requireBounds,
} from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
  type TestTheme,
} from "../internal/test-root.js";
import { darkTheme, disabledOpacity, lightTheme } from "../internal/theme.js";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "../mention-input.js";
import { SearchInput } from "../search-input.js";
import { TagInput, TagInputField } from "../tag-input.js";
import { TimePicker, TimePickerSegment } from "../time-picker.js";

interface HostCase {
  readonly name: string;
  readonly hostId: string;
  readonly hintId: string;
  readonly hint: string;
  readonly render: (theme?: TestTheme) => ComponentTestRoot;
}

let mounted: ComponentTestRoot | undefined;

const mount = (node: ReactNode, theme?: TestTheme): ComponentTestRoot => {
  mounted = renderComponent(node, theme);
  return mounted;
};

const cleanup = (): void => {
  mounted?.unmount();
  mounted = undefined;
};

afterEach(cleanup);

const options: ReadonlyArray<ComboboxOption> = [
  { value: "calendar", label: "Calendar" },
];

const hosts: ReadonlyArray<HostCase> = [
  {
    name: "FieldInput",
    hostId: "field-input",
    hintId: "field-input-hint",
    hint: "you@example.com",
    render: (theme) =>
      mount(
        <Field label="Email">
          <FieldInput testId="field-input" placeholder="you@example.com" />
        </Field>,
        theme,
      ),
  },
  {
    name: "SearchInput",
    hostId: "search",
    hintId: "search-hint",
    hint: "Filter files…",
    render: (theme) =>
      mount(<SearchInput testId="search" placeholder="Filter files…" />, theme),
  },
  {
    name: "TagInputField",
    hostId: "tag-field",
    hintId: "tag-field-hint",
    hint: "Add a tag",
    render: (theme) =>
      mount(
        <TagInput label="Tags" value={[]} onValueChange={() => undefined}>
          <TagInputField testId="tag-field" placeholder="Add a tag" />
        </TagInput>,
        theme,
      ),
  },
  {
    name: "MentionInput",
    hostId: "mention-field",
    hintId: "mention-field-hint",
    hint: "Type a comment",
    render: (theme) =>
      mount(
        <MentionInput
          label="Comment"
          testId="mention-field"
          placeholder="Type a comment"
        >
          <MentionInputList>
            <MentionInputItem value="ada" />
          </MentionInputList>
        </MentionInput>,
        theme,
      ),
  },
  {
    name: "ChatComposer",
    hostId: "chat-field",
    hintId: "chat-field-hint",
    hint: "Send a message…",
    render: (theme) =>
      mount(
        <ChatRoot onSubmit={() => undefined}>
          <ChatComposer />
        </ChatRoot>,
        theme,
      ),
  },
  {
    name: "TimePicker",
    hostId: "time-hours",
    hintId: "time-hours-hint",
    hint: "HH",
    render: (theme) =>
      mount(
        <TimePicker testId="time">
          <TimePickerSegment segment="hours" />
          <TimePickerSegment segment="minutes" />
        </TimePicker>,
        theme,
      ),
  },
  {
    name: "CommandMenuInput",
    hostId: "command-input",
    hintId: "command-input-hint",
    hint: "Type a command…",
    render: (theme) =>
      mount(
        <CommandMenu open onOpenChange={() => undefined} actions={[]}>
          <CommandMenuInput />
          <CommandMenuList />
        </CommandMenu>,
        theme,
      ),
  },
];

const hintColour = (root: ComponentTestRoot, hintId: string): unknown =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(root.renderer.findByTestId(hintId)),
      (element) => element.style.color,
    ),
    () => expect.fail(`no hint painted as ${hintId}`),
  );

const isPainted = (root: ComponentTestRoot, testId: string): boolean =>
  root.renderer.findByTestId(testId) !== undefined;

const help = (root: ComponentTestRoot): ReadonlyArray<string> =>
  Arr.getSomes(Arr.map(a11yNodes(root.renderer), (node) => node.description));

describe("the painted field hint", () => {
  it("says the words it paints, because the host lost its own announcement", () => {
    Arr.forEach(hosts, (host) => {
      const root = host.render();

      expect(
        root.renderer.findByTestId(host.hostId)?.customProps?.placeholder,
        host.name,
      ).toBeUndefined();
      expect(help(root), host.name).toContain(host.hint);

      cleanup();
    });
  });

  it("keeps a caller's permanent help over the hint, and drops the hint once typed", () => {
    const permanent = mount(
      <SearchInput
        testId="search"
        aria-description="Searches the whole workspace"
        placeholder="Filter files…"
      />,
    );
    expect(help(permanent)).toContain("Searches the whole workspace");
    expect(help(permanent)).not.toContain("Filter files…");
    cleanup();

    const typed = mount(
      <SearchInput testId="search" value="readme" onChange={() => undefined} />,
    );
    expect(help(typed)).not.toContain("Search…");
  });

  it("says the combobox field's hint once its popup opens", async () => {
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

    expect(help(root)).toContain("Search…");
  });

  it("paints every host's hint in the measured role, and hands the host none", () => {
    Arr.forEach(hosts, (host) => {
      const root = host.render();
      const field = root.renderer.findByTestId(host.hostId);

      expect(field?.customProps?.placeholder, host.name).toBeUndefined();
      expect(hintColour(root, host.hintId), host.name).toBe(
        darkTheme.colors.placeholder,
      );
      expect(root.renderer.getAllText(), host.name).toContain(host.hint);

      cleanup();
    });
  });

  it("paints the light theme's own role rather than the runtime's grey", () => {
    const root = mount(
      <Field label="Email">
        <FieldInput testId="field-input" placeholder="you@example.com" />
      </Field>,
      "light",
    );

    expect(hintColour(root, "field-input-hint")).toBe(
      lightTheme.colors.placeholder,
    );
    expect(hintColour(root, "field-input-hint")).not.toBe("#8F8F8F");
  });

  it("puts the hint at the field's own text origin", () => {
    const root = mount(
      <Field label="Email">
        <FieldInput testId="field-input" placeholder="you@example.com" />
      </Field>,
    );
    const field = requireBounds(root, "field-input");
    const hint = requireBounds(root, "field-input-hint");

    expect(Math.abs(hint.x - (field.x + 9))).toBeLessThanOrEqual(1);
    expect(hint.y).toBeGreaterThan(field.y);
    expect(hint.y + hint.height).toBeLessThan(field.y + field.height);
  });

  it("keeps the press for the host underneath", () => {
    const root = mount(
      <Field label="Email">
        <FieldInput testId="field-input" placeholder="you@example.com" />
      </Field>,
    );

    clickCentreOf(root, "field-input-hint");

    expect(focusedTestId(root)).toStrictEqual(Option.some("field-input"));
  });

  it("hides the hint once the reader types, and brings it back when the field clears", () => {
    const root = mount(
      <Field label="Email">
        <FieldInput testId="field-input" placeholder="you@example.com" />
      </Field>,
    );
    root.renderer.focusElement(
      root.renderer.findByTestId("field-input")?.id ?? -1,
    );
    root.renderer.simulateKeystrokes("a");

    expect(isPainted(root, "field-input-hint")).toBe(false);

    root.rerender(
      <Field label="Email">
        <FieldInput
          testId="field-input"
          value=""
          placeholder="you@example.com"
        />
      </Field>,
    );

    expect(isPainted(root, "field-input-hint")).toBe(true);
  });

  it("fades a disabled hint with the field it sits in", () => {
    const root = mount(
      <Field label="Email">
        <FieldInput
          testId="field-input"
          placeholder="you@example.com"
          disabled
        />
      </Field>,
    );

    const hint = root.renderer.findByTestId("field-input-hint");
    expect(hint?.style.color).toBe(darkTheme.colors.placeholder);
    expect(hint?.style.opacity).toBe(disabledOpacity);

    root.rerender(
      <Field label="Email">
        <FieldInput testId="field-input" placeholder="you@example.com" />
      </Field>,
    );
    expect(root.renderer.findByTestId("field-input-hint")?.style.opacity).toBe(
      undefined,
    );
  });

  it("puts a textarea's hint on its first row", () => {
    const root = mount(
      <ChatRoot onSubmit={() => undefined}>
        <ChatComposer />
      </ChatRoot>,
    );
    const field = requireBounds(root, "chat-field");
    const hint = requireBounds(root, "chat-field-hint");

    expect(Math.abs(hint.x - (field.x + 8))).toBeLessThanOrEqual(1);
    expect(Math.abs(hint.y - (field.y + 4))).toBeLessThanOrEqual(1);
  });

  it("paints the combobox search field's hint once its popup opens", async () => {
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

    expect(
      root.renderer.findByTestId("combobox-input")?.customProps?.placeholder,
    ).toBeUndefined();
    expect(hintColour(root, "combobox-input-hint")).toBe(
      darkTheme.colors.placeholder,
    );
    expect(root.renderer.getAllText()).toContain("Search…");

    expect(requireBounds(root, "combobox-input").width).toBeGreaterThan(150);
  });
});

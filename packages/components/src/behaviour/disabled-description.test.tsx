/**
 * Disabled parts announce their state in the real GPUix accessibility tree.
 *
 * The bug these guard: `@gpuix/native@0.10.0` has no `aria-disabled`, so a
 * part that dropped its handlers, left the tab order and dimmed was still
 * announced as an ordinary control. `aria-description` is supported, so every
 * disabled part appends `Disabled` to the description it or its caller already
 * supplied (plan 516).
 *
 * Each case reads the accessibility dump, not a style or a handler: the claim
 * is about what assistive technology receives.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Accordion, AccordionItem, AccordionTrigger } from "../accordion.js";
import { ColorPicker } from "../color-picker.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
} from "../combobox.js";
import { Collapsible, CollapsibleTrigger } from "../collapsible.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import { Field, FieldInput } from "../field.js";
import { Fieldset } from "../fieldset.js";
import { HotkeyRecorder } from "../hotkey-recorder.js";
import { InlineEdit } from "../inline-edit.js";
import { nodesNamed, nodesWithRole } from "../internal/a11y.js";
import { Button, IconButton } from "../internal/button.js";
import { clickCentreOf } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { List, ListItem } from "../list.js";
import { MentionInput } from "../mention-input.js";
import { SearchInput } from "../search-input.js";
import { Tabs, TabsList, TabsTrigger } from "../tabs.js";
import { TagInput, TagInputField } from "../tag-input.js";
import { TimePicker, TimePickerSegment } from "../time-picker.js";

/** The first description among the nodes named `name`, or `None`. */
const descriptionOf = (
  renderer: Parameters<typeof nodesNamed>[0],
  name: string,
): Option.Option<string> =>
  Option.firstSomeOf(
    Arr.map(nodesNamed(renderer, name), (node) => node.description),
  );

/** Let the headless combobox open before reading the accessibility tree. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("disabled descriptions", () => {
  it("announces a disabled Button and IconButton, keeping the caller's text", () => {
    const view = renderComponent(
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
        <Button testId="save" disabled>
          Save
        </Button>
        <Button testId="open" disabled aria-description="Opens settings">
          Open
        </Button>
        <IconButton testId="close" label="Close" disabled>
          ✕
        </IconButton>
        <Button testId="enabled">Enabled</Button>
      </div>,
    );

    expect(descriptionOf(view.renderer, "Save")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Open")).toEqual(
      Option.some("Opens settings. Disabled"),
    );
    expect(descriptionOf(view.renderer, "Close")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Enabled")).toEqual(Option.none());

    view.unmount();
  });

  it("announces a disabled tab and a disabled accordion section", () => {
    const view = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="billing" disabled>
              Billing
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Accordion type="single" defaultValue="advanced">
          <AccordionItem value="basic">
            <AccordionTrigger>Basics</AccordionTrigger>
          </AccordionItem>
          <AccordionItem value="advanced" disabled>
            <AccordionTrigger>Advanced</AccordionTrigger>
          </AccordionItem>
        </Accordion>
      </div>,
    );

    expect(descriptionOf(view.renderer, "Profile")).toEqual(Option.none());
    expect(descriptionOf(view.renderer, "Billing")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Advanced")).toEqual(
      Option.some("Disabled"),
    );

    view.unmount();
  });

  it("announces a disabled Collapsible trigger and a disabled List row", () => {
    const view = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Collapsible>
          <CollapsibleTrigger disabled>Details</CollapsibleTrigger>
        </Collapsible>
        <List selectionMode="single" defaultValue="alpha">
          <ListItem value="alpha" textValue="Alpha" aria-label="Alpha">
            <text>Alpha</text>
          </ListItem>
          <ListItem value="beta" textValue="Beta" aria-label="Beta" disabled>
            <text>Beta</text>
          </ListItem>
        </List>
      </div>,
    );

    expect(descriptionOf(view.renderer, "Details")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Alpha")).toEqual(Option.none());
    expect(descriptionOf(view.renderer, "Beta")).toEqual(
      Option.some("Disabled"),
    );

    view.unmount();
  });

  it("announces a disabled menu row", () => {
    const view = renderComponent(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent label="Actions">
          <DropdownMenuItem disabled>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(
      nodesWithRole(view.renderer, "menuitem").map((node) => [
        node.name,
        Option.getOrUndefined(node.description),
      ]),
    ).toEqual([["Rename", "Disabled"]]);

    view.unmount();
  });

  it("announces a disabled search field and a disabled mention field", () => {
    const view = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <SearchInput aria-label="Search files" disabled testId="search" />
        <MentionInput label="Comment" disabled />
      </div>,
    );

    expect(descriptionOf(view.renderer, "Search files")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Comment")).toEqual(
      Option.some("Disabled"),
    );

    view.unmount();
  });

  it("keeps a Field's message and appends its disabled state", () => {
    const view = renderComponent(
      <Field label="Email" error="Enter a valid email">
        <FieldInput testId="email" disabled />
      </Field>,
    );

    expect(descriptionOf(view.renderer, "Email")).toEqual(
      Option.some("Enter a valid email. Disabled"),
    );

    view.unmount();
  });

  it("announces both disabled time segments", () => {
    const view = renderComponent(
      <TimePicker label="Time" disabled defaultValue="09:30">
        <TimePickerSegment segment="hours" />
        <TimePickerSegment segment="minutes" />
      </TimePicker>,
    );

    expect(descriptionOf(view.renderer, "Time hours")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Time minutes")).toEqual(
      Option.some("Disabled"),
    );

    view.unmount();
  });

  it("announces a disabled tag field", () => {
    const view = renderComponent(
      <TagInput
        label="Tags"
        value={["one"]}
        onValueChange={() => undefined}
        disabled
      >
        <TagInputField testId="tag-field" />
      </TagInput>,
    );

    expect(descriptionOf(view.renderer, "Tags")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "one")).toEqual(Option.none());

    view.unmount();
  });

  it("announces a disabled colour picker and keeps its invalid message", () => {
    const view = renderComponent(
      <ColorPicker label="Brand colour" value="#zzzzzz" disabled />,
    );

    expect(descriptionOf(view.renderer, "Brand colour")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Brand colour hex value")).toEqual(
      Option.some("Invalid hex colour. Disabled"),
    );

    view.unmount();
  });

  it("announces a disabled combobox trigger and a disabled option", async () => {
    const view = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Combobox options={[{ value: "a", label: "Alpha" }]} disabled>
          <ComboboxTrigger label="Assignee" />
          <ComboboxContent>
            <ComboboxInput label="Search assignees" />
            <ComboboxList />
          </ComboboxContent>
        </Combobox>
        <Combobox
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta", disabled: true },
          ]}
        >
          <ComboboxTrigger label="Reviewer" testId="reviewer" />
          <ComboboxContent>
            <ComboboxInput label="Search reviewers" />
            <ComboboxList />
          </ComboboxContent>
        </Combobox>
      </div>,
    );

    expect(descriptionOf(view.renderer, "Assignee")).toEqual(
      Option.some("Disabled"),
    );

    clickCentreOf(view, "reviewer");
    await settle();
    expect(
      Option.firstSomeOf(
        Arr.map(
          nodesWithRole(view.renderer, "listboxoption"),
          (node) => node.description,
        ),
      ),
    ).toEqual(Option.some("Disabled"));

    view.unmount();
  });

  it("announces a disabled fieldset and the field it inherits into", () => {
    const view = renderComponent(
      <Fieldset legend="Account" disabled>
        <Field label="Email">
          <FieldInput testId="email" />
        </Field>
      </Fieldset>,
    );

    expect(descriptionOf(view.renderer, "Account")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Email")).toEqual(
      Option.some("Disabled"),
    );

    view.unmount();
  });

  it("announces disabled recorder and inline-edit controls", () => {
    const view = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <HotkeyRecorder label="Shortcut" disabled onChange={() => undefined} />
        <InlineEdit
          label="Project name"
          value="GPUIXUI"
          onCommit={() => undefined}
          disabled
        />
      </div>,
    );

    expect(descriptionOf(view.renderer, "Shortcut")).toEqual(
      Option.some("Disabled"),
    );
    expect(descriptionOf(view.renderer, "Project name")).toEqual(
      Option.some("Disabled"),
    );

    view.unmount();
  });
});

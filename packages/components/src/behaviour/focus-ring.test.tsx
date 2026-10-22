/**
 * The components' focus ring, in the real GPUix renderer.
 *
 * The bug this guards: every focusable part learned it was focused in React
 * state and merged `focusRing(theme)` — a spread shadow — so a mouse press
 * showed a ring the platform would not, and each part re-rendered on focus and
 * blur to paint it. `@gpuix/native@0.11.0` paints `focusVisible` itself, so a
 * part now **declares** the outline at rest while the runtime decides whether a
 * Tab or a press shows it. The old shadow must not come back, the invalid
 * variant must stay destructive, and a composite field must ring the input that
 * takes focus rather than a group that never does.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
} from "../combobox.js";
import { ColorPicker } from "../color-picker.js";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
} from "../command-menu.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible.js";
import { Carousel, CarouselControl, CarouselTrack } from "../carousel.js";
import { Field, FieldInput } from "../field.js";
import { HotkeyRecorder } from "../hotkey-recorder.js";
import { Button, IconButton } from "../internal/button.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import { renderComponent } from "../internal/test-root.js";
import { darkTheme } from "../internal/theme.js";
import { InlineEdit } from "../inline-edit.js";
import { List, ListItem } from "../list.js";
import { SearchInput } from "../search-input.js";
import { Tabs, TabsList, TabsTrigger } from "../tabs.js";
import { TagInput, TagInputChip, TagInputField } from "../tag-input.js";
import { TimePicker, TimePickerSegment } from "../time-picker.js";

/** The outline every part declares, read from the dark theme's roles. */
const outline = {
  outlineWidth: darkTheme.borderWidth.strong,
  outlineColor: darkTheme.colors.ring,
  outlineOffset: darkTheme.borderWidth.strong,
};

describe("focus ring", () => {
  it("declares the runtime's keyboard outline at rest on every focusable part", () => {
    const root = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Tabs defaultValue="a">
          <TabsList testId="list">
            <TabsTrigger testId="tab" value="a">
              A
            </TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
        </Tabs>
        <List testId="rows" selectionMode="single">
          <ListItem testId="row" value="a">
            <text>A</text>
          </ListItem>
        </List>
        <Accordion type="single" defaultValue="one">
          <AccordionItem value="one">
            <AccordionTrigger testId="header">One</AccordionTrigger>
            <AccordionContent>
              <text>Body</text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <SearchInput testId="search" aria-label="Search" />
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger testId="collapsible">More</CollapsibleTrigger>
          <CollapsibleContent>
            <text>Hidden</text>
          </CollapsibleContent>
        </Collapsible>
        <InlineEdit
          label="Name"
          value="Ada"
          onCommit={() => undefined}
          testId="inline"
        />
        <Carousel label="Screenshots" defaultValue={0} testId="carousel">
          <CarouselTrack>
            <text>One</text>
          </CarouselTrack>
          <CarouselControl direction="next" />
        </Carousel>
      </div>,
    );

    Arr.forEach(
      ["tab", "row", "header", "search", "collapsible", "inline", "carousel"],
      (testId) =>
        expect(
          root.renderer.findByTestId(testId)?.style.focusVisible,
          `${testId} declares the outline`,
        ).toMatchObject(outline),
    );

    root.unmount();
  });

  it("paints no shadow when a control takes focus", () => {
    const root = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Tabs defaultValue="a">
          <TabsList testId="list">
            <TabsTrigger testId="tab" value="a">
              A
            </TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchInput testId="search" aria-label="Search" />
        <Carousel label="Screenshots" defaultValue={0} testId="carousel">
          <CarouselTrack>
            <text>One</text>
          </CarouselTrack>
        </Carousel>
      </div>,
    );

    Arr.forEach(["tab", "search", "carousel"], (testId) => {
      root.renderer.focusElement(root.renderer.findByTestId(testId)?.id ?? -1);
      root.renderer.flush();

      expect(Option.contains(focusedTestId(root), testId)).toBe(true);
      expect(
        root.renderer.findByTestId(testId)?.style.boxShadow,
        `${testId} paints no spread shadow`,
      ).toBeUndefined();
      expect(
        root.renderer.findByTestId(testId)?.style.focusVisible,
        `${testId} keeps the outline while focused`,
      ).toMatchObject(outline);
    });

    root.unmount();
  });

  it("rings an invalid field destructively", () => {
    const root = renderComponent(
      <Field label="Email" error="Enter a valid email">
        <FieldInput testId="email" />
      </Field>,
    );

    expect(
      root.renderer.findByTestId("email")?.style.focusVisible,
    ).toMatchObject({
      ...outline,
      outlineColor: darkTheme.colors.destructive,
    });

    root.unmount();
  });

  it("declares no ring on a read-only field, which leaves the tab order", () => {
    const root = renderComponent(
      <Field label="Email">
        <FieldInput testId="email" disabled />
      </Field>,
    );

    expect(root.renderer.findByTestId("email")?.style.focusVisible).toBe(
      undefined,
    );

    root.unmount();
  });

  it("rings the input that takes focus in a composite field", () => {
    const root = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <TagInput
          label="Tags"
          value={[]}
          onValueChange={() => undefined}
          testId="tags"
        >
          <TagInputField testId="tag-field" />
        </TagInput>
        <TimePicker testId="time" defaultValue="09:30">
          <TimePickerSegment segment="hours" />
          <TimePickerSegment segment="minutes" />
        </TimePicker>
      </div>,
    );

    // The group is not what focus lands on, so a group-level shadow ring was
    // the wrong place for it.
    expect(root.renderer.findByTestId("tags")?.style.focusVisible).toBe(
      undefined,
    );
    expect(
      root.renderer.findByTestId("tag-field")?.style.focusVisible,
    ).toMatchObject(outline);
    expect(root.renderer.findByTestId("time")?.style.focusVisible).toBe(
      undefined,
    );
    expect(
      root.renderer.findByTestId("time-hours")?.style.focusVisible,
    ).toMatchObject(outline);
    expect(
      root.renderer.findByTestId("time-minutes")?.style.focusVisible,
    ).toMatchObject(outline);

    root.unmount();
  });

  it("declares the outline on a swatch, a chip's remove control and a palette field", () => {
    const picker = renderComponent(
      <ColorPicker label="Accent colour" testId="picker" value="#000000" />,
    );
    Arr.forEach(["picker-swatch-0", "picker-hex"], (testId) =>
      expect(
        picker.renderer.findByTestId(testId)?.style.focusVisible,
        `${testId} declares the outline`,
      ).toMatchObject(outline),
    );
    picker.unmount();

    const tags = renderComponent(
      <TagInput label="Tags" value={["design"]} onValueChange={() => undefined}>
        <TagInputChip testId="chip" value="design" />
        <TagInputField testId="tag-field" />
      </TagInput>,
    );
    expect(
      tags.renderer.findByTestId("chip-remove")?.style.focusVisible,
      "a chip's remove control declares the outline",
    ).toMatchObject(outline);
    tags.unmount();

    const menu = renderComponent(
      <CommandMenu
        open
        onOpenChange={() => undefined}
        actions={[{ id: "save", label: "Save", perform: vi.fn() }]}
      >
        <CommandMenuInput />
        <CommandMenuList />
        <CommandMenuEmpty />
      </CommandMenu>,
    );
    expect(
      menu.renderer.findByTestId("command-input")?.style.focusVisible,
      "the palette's field declares the outline",
    ).toMatchObject(outline);
    menu.unmount();
  });

  it("declares the outline on a combobox trigger and its search field", async () => {
    const picker = renderComponent(
      <Combobox options={[{ value: "calendar", label: "Calendar" }]}>
        <ComboboxTrigger label="Assign reviewer" />
        <ComboboxContent>
          <ComboboxInput label="Search reviewers" />
          <ComboboxList label="Reviewers" />
        </ComboboxContent>
      </Combobox>,
    );

    expect(
      picker.renderer.findByTestId("combobox-trigger")?.style.focusVisible,
      "the trigger declares the outline",
    ).toMatchObject(outline);

    clickCentreOf(picker, "combobox-trigger");
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    picker.renderer.flush();

    expect(
      picker.renderer.findByTestId("combobox-input")?.style.focusVisible,
      "the search field declares the outline",
    ).toMatchObject(outline);

    picker.unmount();
  });

  it("declares no outline on a control that cannot act", () => {
    const root = renderComponent(
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button testId="button" disabled>
          Save
        </Button>
        <IconButton testId="icon" label="Close" disabled />
        <Tabs defaultValue="a">
          <TabsList testId="list">
            <TabsTrigger testId="tab" value="a" disabled>
              A
            </TabsTrigger>
            <TabsTrigger testId="tab-b" value="b">
              B
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <List testId="rows" selectionMode="single">
          <ListItem testId="row" value="a" disabled>
            <text>A</text>
          </ListItem>
          <ListItem testId="row-b" value="b">
            <text>B</text>
          </ListItem>
        </List>
        <Accordion type="single" defaultValue="one">
          <AccordionItem value="one" disabled>
            <AccordionTrigger testId="header">One</AccordionTrigger>
            <AccordionContent>
              <text>Body</text>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="two">
            <AccordionTrigger testId="header-b">Two</AccordionTrigger>
            <AccordionContent>
              <text>Body</text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger testId="collapsible" disabled>
            More
          </CollapsibleTrigger>
          <CollapsibleContent>
            <text>Hidden</text>
          </CollapsibleContent>
        </Collapsible>
        <InlineEdit
          label="Name"
          value="Ada"
          disabled
          onCommit={() => undefined}
          testId="inline"
        />
        <HotkeyRecorder
          label="Shortcut"
          disabled
          onChange={() => undefined}
          testId="recorder"
        />
        <ColorPicker label="Accent colour" testId="picker" disabled />
        <Combobox options={[]} disabled>
          <ComboboxTrigger testId="combobox-trigger" label="Assign" />
        </Combobox>
        <SearchInput testId="search" aria-label="Search" disabled />
        <TagInput
          label="Tags"
          value={["design"]}
          disabled
          onValueChange={() => undefined}
        >
          <TagInputChip testId="chip" value="design" />
          <TagInputField testId="tag-field" />
        </TagInput>
        <TimePicker testId="time" defaultValue="09:30" disabled>
          <TimePickerSegment segment="hours" />
          <TimePickerSegment segment="minutes" />
        </TimePicker>
      </div>,
    );

    Arr.forEach(
      [
        "button",
        "icon",
        "tab",
        "row",
        "header",
        "collapsible",
        "inline",
        "recorder",
        "picker-swatch-0",
        "picker-hex",
        "combobox-trigger",
        "search",
        "tag-field",
        "time-hours",
        "time-minutes",
      ],
      (testId) =>
        expect(
          root.renderer.findByTestId(testId)?.style.focusVisible,
          `${testId} declares no outline while it cannot act`,
        ).toBeUndefined(),
    );

    root.unmount();
  });
});

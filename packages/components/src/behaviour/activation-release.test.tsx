/**
 * The activation contract's two halves, on every composite that owns a key
 * handler.
 *
 * The bug these guard: Space activated a control on the **press**, so one
 * keystroke both ran the action and scrolled the region behind it, and a press a
 * reader cancelled before releasing had already acted. Space now activates on the
 * release (Enter still on the press), and a Space press is swallowed so the
 * platform default cannot run. `internal/key.test.ts` proves the decision and the
 * wiring on a plain control; each case below proves a composite installed it, so
 * a part that kept press activation fails by name.
 */

import * as Option from "effect/Option";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "../breadcrumb.js";
import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
} from "../date-picker.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import { HotkeyRecorder } from "../hotkey-recorder.js";
import { clickCentreOf, focusedTestId } from "../internal/interaction.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";
import { List, ListItem, ListItemTitle } from "../list.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs.js";

const focused = (root: ComponentTestRoot): number => {
  const id = root.renderer.getFocusedElementId();
  if (id === null) throw new Error("behaviour: nothing holds focus");
  return id;
};

/** The press half of a Space gesture on whatever holds focus. */
const pressSpace = (root: ComponentTestRoot): void => {
  root.renderer.nativeSimulateKeyDown(focused(root), "space");
};

/** The release half, which is where Space activates. */
const releaseSpace = (root: ComponentTestRoot): void => {
  root.renderer.nativeSimulateKeyUp(focused(root), "space");
};

describe("Space activates on the release, not the press", () => {
  it("leaves an accordion header shut until the key comes up", () => {
    const faq = renderComponent(
      <Accordion type="single" collapsible>
        <AccordionItem value="one">
          <AccordionTrigger testId="trigger">Where is it?</AccordionTrigger>
          <AccordionContent testId="content">
            <text>In the packages.</text>
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    faq.renderer.focusElement(faq.renderer.findByTestId("trigger")?.id ?? -1);

    pressSpace(faq);
    expect(faq.renderer.findByTestId("content")).toBeUndefined();

    releaseSpace(faq);
    expect(faq.renderer.findByTestId("content")).toBeDefined();

    faq.unmount();
  });

  it("keeps a tab on its panel until the key comes up", () => {
    const tabs = renderComponent(
      <Tabs defaultValue="profile">
        <TabsList testId="list">
          <TabsTrigger testId="tab-profile" value="profile">
            Profile
          </TabsTrigger>
          <TabsTrigger testId="tab-danger" value="danger">
            Danger
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="panel-profile" value="profile">
          <text>Profile panel</text>
        </TabsContent>
        <TabsContent testId="panel-danger" value="danger">
          <text>Danger panel</text>
        </TabsContent>
      </Tabs>,
    );
    tabs.renderer.focusElement(
      tabs.renderer.findByTestId("tab-danger")?.id ?? -1,
    );

    pressSpace(tabs);
    expect(tabs.renderer.findByTestId("panel-profile")).toBeDefined();
    expect(focusedTestId(tabs)).toEqual(Option.some("tab-danger"));

    releaseSpace(tabs);
    expect(tabs.renderer.findByTestId("panel-danger")).toBeDefined();

    tabs.unmount();
  });

  it("keeps a list's selection until the key comes up", () => {
    const onValueChange = vi.fn();
    const list = renderComponent(
      <List selectionMode="single" onValueChange={onValueChange} testId="list">
        <ListItem testId="row-a" value="a" textValue="Alpha">
          <ListItemTitle>Alpha</ListItemTitle>
        </ListItem>
        <ListItem testId="row-b" value="b" textValue="Bravo">
          <ListItemTitle>Bravo</ListItemTitle>
        </ListItem>
      </List>,
    );
    list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);

    pressSpace(list);
    expect(onValueChange).not.toHaveBeenCalled();

    releaseSpace(list);
    expect(onValueChange).toHaveBeenLastCalledWith("a");

    list.unmount();
  });

  it("runs a menu row on the release, and not on the press", () => {
    const onSelect = vi.fn();
    const menu = renderComponent(
      <div style={{ padding: 40 }}>
        <DropdownMenu>
          <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
          <DropdownMenuContent testId="menu" label="File actions">
            <DropdownMenuItem
              testId="rename"
              onSelect={() => onSelect("rename")}
            >
              Rename
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>,
    );

    // Enter opens on the press and lands on the first row.
    menu.renderer.nativeSimulateKeyDown(
      menu.renderer.findByTestId("trigger")?.id ?? -1,
      "enter",
    );
    expect(menu.renderer.findByTestId("menu")).toBeDefined();
    expect(focusedTestId(menu)).toEqual(Option.some("rename"));

    pressSpace(menu);
    expect(onSelect).not.toHaveBeenCalled();
    expect(menu.renderer.findByTestId("menu")).toBeDefined();

    releaseSpace(menu);
    expect(onSelect).toHaveBeenCalledWith("rename");
    expect(menu.renderer.findByTestId("menu")).toBeUndefined();

    menu.unmount();
  });

  it("chooses a calendar day on the release, not on the press", () => {
    const onValueChange = vi.fn();
    const picker = renderComponent(
      <div style={{ width: 420, padding: 40 }}>
        <DatePicker
          today="2026-10-17"
          defaultValue="2026-10-17"
          onValueChange={onValueChange}
        >
          <DatePickerTrigger label="Due date" />
          <DatePickerContent>
            <DatePickerCalendar />
          </DatePickerContent>
        </DatePicker>
      </div>,
    );
    clickCentreOf(picker, "date-picker-trigger");
    expect(focusedTestId(picker)).toEqual(Option.some("date-day-2026-10-17"));

    pressSpace(picker);
    expect(onValueChange).not.toHaveBeenCalled();

    releaseSpace(picker);
    expect(onValueChange).toHaveBeenCalledWith("2026-10-17");

    picker.unmount();
  });

  it("follows a breadcrumb link on the release, not on the press", () => {
    const onSelect = vi.fn();
    const trail = renderComponent(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink testId="projects" onSelect={onSelect}>
              Projects
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    trail.renderer.focusElement(
      trail.renderer.findByTestId("projects")?.id ?? -1,
    );

    pressSpace(trail);
    expect(onSelect).not.toHaveBeenCalled();

    releaseSpace(trail);
    expect(onSelect).toHaveBeenCalledTimes(1);

    trail.unmount();
  });

  it("starts a hotkey recording on the release, and a recorded Space does not restart it", () => {
    const Harness = () => {
      const [value, setValue] = useState<string | null>(null);
      return (
        <HotkeyRecorder
          testId="recorder"
          label="Toggle command palette"
          value={value}
          onChange={setValue}
        />
      );
    };
    const recorder = renderComponent(<Harness />);
    recorder.renderer.focusElement(
      recorder.renderer.findByTestId("recorder")?.id ?? -1,
    );

    pressSpace(recorder);
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    releaseSpace(recorder);
    expect(recorder.renderer.getAllText()).toContain("Press keys…");

    // Recording a Space chord must not treat the release that follows as a
    // second activation: the recorder would start listening again immediately.
    pressSpace(recorder);
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");
    releaseSpace(recorder);
    expect(recorder.renderer.getAllText()).not.toContain("Press keys…");

    recorder.unmount();
  });
});

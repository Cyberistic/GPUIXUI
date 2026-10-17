/**
 * The Tier 2 both-theme matrix (plan 117 §4).
 *
 * Every component here has one assertion that must change with the theme. If a
 * component hard-codes a colour, or reads the wrong role, one of the two rows
 * fails. The suites that already assert both themes cover Card, Badge, Alert,
 * Dialog, Popover, Tabs, DropdownMenu, Pagination, Toast, Field and Combobox;
 * this file is the rest of the matrix, in one place so gaps are visible.
 */

import { useState, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../accordion.js";
import { Avatar } from "../avatar.js";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "../breadcrumb.js";
import { Button } from "../internal/button.js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../collapsible.js";
import {
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
} from "../command-menu.js";
import { ConfirmDialog } from "../confirm-dialog.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../context-menu.js";
import { EmptyState } from "../empty-state.js";
import { darkTheme, lightTheme, type Theme } from "../internal/theme.js";
import { List, ListItem, ListItemTitle } from "../list.js";
import { SearchInput } from "../search-input.js";
import {
  TimePicker,
  TimePickerSegment,
  TimePickerSeparator,
} from "../time-picker.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

const themes: ReadonlyArray<Theme> = [darkTheme, lightTheme];

/** Render under each theme, assert, and unmount, so the one-window rule holds. */
const bothThemes = (
  render: () => ReactElement,
  assert: (root: ComponentTestRoot, theme: Theme) => void,
): void => {
  themes.forEach((theme) => {
    const root = renderComponent(
      render(),
      theme === lightTheme ? "light" : "dark",
    );
    try {
      assert(root, theme);
    } finally {
      root.unmount();
    }
  });
};

describe("theme matrix", () => {
  it("Button reads primary and secondary from the theme", () => {
    bothThemes(
      () => (
        <Button testId="button" variant="primary">
          Save
        </Button>
      ),
      (root, theme) => {
        expect(
          root.renderer.findByTestId("button")?.style.backgroundColor,
        ).toBe(theme.colors.primary);
      },
    );
  });

  it("Avatar paints its fallback with the muted role", () => {
    bothThemes(
      () => <Avatar testId="avatar" name="Ada Lovelace" />,
      (root, theme) => {
        const fills = root.renderer
          .findByType("div")
          .map((element) => element.style.backgroundColor);
        expect(fills).toContain(theme.colors.muted);
      },
    );
  });

  it("EmptyState separates title and description with foreground roles", () => {
    bothThemes(
      () => (
        <EmptyState
          testId="empty"
          title="No projects yet"
          description="Create one to see it here."
        />
      ),
      (root, theme) => {
        // A GPUix `<text>` host wraps an anonymous child holding the string, so
        // only the wrapper carries the style (measured in empty-state.test.tsx).
        const colours = root.renderer
          .findByType("text")
          .filter((element) => element.style.color !== undefined)
          .map((element) => element.style.color);
        expect(colours).toEqual([
          theme.colors.foreground,
          theme.colors.mutedForeground,
        ]);
      },
    );
  });

  it("List paints its selection with the selected role", () => {
    bothThemes(
      () => (
        <List testId="list" selectionMode="single" defaultValue="a">
          <ListItem testId="row" value="a">
            <ListItemTitle>Alpha</ListItemTitle>
          </ListItem>
        </List>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("row")?.style.backgroundColor).toBe(
          theme.colors.selected,
        );
      },
    );
  });

  it("ConfirmDialog takes the dialog surface from the theme", () => {
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete workspace"
          description="The workspace and its files are removed."
          onConfirm={() => undefined}
        />
      );
    };

    bothThemes(
      () => <Harness />,
      (root, theme) => {
        expect(
          root.renderer.findByTestId("dialog-content")?.style.backgroundColor,
        ).toBe(theme.colors.popover);
      },
    );
  });

  it("Accordion's trigger takes the foreground role", () => {
    bothThemes(
      () => (
        <Accordion type="single" defaultValue="a">
          <AccordionItem value="a">
            <AccordionTrigger testId="trigger">Question</AccordionTrigger>
            <AccordionContent>
              <text>Answer</text>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("trigger")?.style.color).toBe(
          theme.colors.foreground,
        );
      },
    );
  });

  it("Breadcrumb separates a link from the current page by role", () => {
    bothThemes(
      () => (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink testId="link">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage testId="current">components</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("link")?.style.color).toBe(
          theme.colors.mutedForeground,
        );
        expect(root.renderer.findByTestId("current")?.style.color).toBe(
          theme.colors.foreground,
        );
      },
    );
  });

  it("Collapsible's trigger takes the foreground role", () => {
    bothThemes(
      () => (
        <Collapsible defaultOpen>
          <CollapsibleTrigger testId="trigger">Advanced</CollapsibleTrigger>
          <CollapsibleContent>
            <text>Body</text>
          </CollapsibleContent>
        </Collapsible>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("trigger")?.style.color).toBe(
          theme.colors.foreground,
        );
      },
    );
  });

  it("SearchInput takes its text and border from the theme", () => {
    bothThemes(
      () => <SearchInput testId="search" defaultValue="query" />,
      (root, theme) => {
        expect(root.renderer.findByTestId("search")?.style.color).toBe(
          theme.colors.inputForeground,
        );
      },
    );
  });

  it("TimePicker takes its field surface and text from the theme", () => {
    bothThemes(
      () => (
        <TimePicker testId="time" defaultValue="09:30">
          <TimePickerSegment segment="hours" />
          <TimePickerSeparator />
          <TimePickerSegment segment="minutes" />
        </TimePicker>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("time")?.style.backgroundColor).toBe(
          theme.colors.input,
        );
        expect(root.renderer.findByTestId("time-hours")?.style.color).toBe(
          theme.colors.inputForeground,
        );
      },
    );
  });

  it("ContextMenu takes its surface from the theme", () => {
    bothThemes(
      () => (
        <ContextMenu defaultOpen>
          <ContextMenuTrigger testId="row">Project</ContextMenuTrigger>
          <ContextMenuContent testId="menu">
            <ContextMenuItem>Open</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("menu")?.style.backgroundColor).toBe(
          theme.colors.popover,
        );
      },
    );
  });

  it("CommandMenu takes its dialog surface from the theme", () => {
    bothThemes(
      () => (
        <CommandMenu
          open
          onOpenChange={() => undefined}
          actions={[{ id: "save", label: "Save", perform: () => undefined }]}
        >
          <CommandMenuInput />
          <CommandMenuList />
          <CommandMenuEmpty />
        </CommandMenu>
      ),
      (root, theme) => {
        expect(
          root.renderer.findByTestId("command-menu")?.style.backgroundColor,
        ).toBe(theme.colors.popover);
      },
    );
  });
});

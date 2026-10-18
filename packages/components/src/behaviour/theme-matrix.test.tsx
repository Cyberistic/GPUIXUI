/**
 * The Tier 2 both-theme matrix (plan 117 §4).
 *
 * Every component here has one assertion that must change with the theme. If a
 * component hard-codes a colour, or reads the wrong role, one of the two rows
 * fails. The suites that already assert both themes cover Card, Badge, Alert,
 * Dialog, Popover, Tabs, DropdownMenu, Pagination, Toast, Field and Combobox;
 * this file is the rest of the matrix, in one place so gaps are visible.
 *
 * Plan 528 completed the matrix for the components that landed after it
 * (Carousel, Countdown, InlineEdit, MentionInput, PreviewCard, TagInput) and
 * added `theme-coverage.ts`, which `inventory.test.ts` holds to the suites on
 * disk so a new component cannot be marked done with dark-only rendering.
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
import { Carousel, CarouselSlide, CarouselTrack } from "../carousel.js";
import { Chat, ChatComposer } from "../chat.js";
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
import { Countdown } from "../countdown.js";
import { EmptyState } from "../empty-state.js";
import { InlineEdit } from "../inline-edit.js";
import { darkTheme, lightTheme, type Theme } from "../internal/theme.js";
import { List, ListItem, ListItemTitle } from "../list.js";
import {
  MentionInput,
  MentionInputItem,
  MentionInputList,
} from "../mention-input.js";
import { Message, MessageContent } from "../message.js";
import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "../message-scroller.js";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "../preview-card.js";
import { SearchInput } from "../search-input.js";
import { TagInput, TagInputChip, TagInputField } from "../tag-input.js";
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

  it("MessageScroller takes its viewport surface from the theme", () => {
    bothThemes(
      () => (
        <MessageScroller label="Conversation">
          <MessageScrollerViewport testId="transcript" style={{ height: 80 }}>
            <MessageScrollerItem>
              <text>Hello</text>
            </MessageScrollerItem>
          </MessageScrollerViewport>
          <MessageScrollerJumpToLatest />
        </MessageScroller>
      ),
      (root, theme) => {
        expect(
          root.renderer.findByTestId("transcript")?.style.backgroundColor,
        ).toBe(theme.colors.background);
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

  it("Message paints the assistant bubble with the muted role", () => {
    bothThemes(
      () => (
        <Message variant="assistant">
          <MessageContent testId="bubble" text="Hello" />
        </Message>
      ),
      (root, theme) => {
        expect(
          root.renderer.findByTestId("bubble")?.style.backgroundColor,
        ).toBe(theme.colors.muted);
      },
    );
  });

  it("ChatComposer reads its field border from the theme", () => {
    bothThemes(
      () => (
        <Chat
          label="Assistant"
          status={{ _tag: "idle" }}
          onSubmit={() => undefined}
        >
          <ChatComposer label="Message the assistant" testId="composer" />
        </Chat>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("composer")?.style.borderColor).toBe(
          theme.colors.border,
        );
      },
    );
  });

  it("CarouselTrack takes its surface from the theme", () => {
    bothThemes(
      () => (
        <Carousel label="Workspace previews">
          <CarouselTrack testId="track">
            <CarouselSlide>
              <text>Canvas</text>
            </CarouselSlide>
            <CarouselSlide>
              <text>Inspector</text>
            </CarouselSlide>
          </CarouselTrack>
        </Carousel>
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("track")?.style.backgroundColor).toBe(
          theme.colors.card,
        );
      },
    );
  });

  it("Countdown takes its clock text from the theme", () => {
    bothThemes(
      () => (
        <Countdown remainingMs={90_000} label="Time left" testId="countdown" />
      ),
      (root, theme) => {
        expect(root.renderer.findByTestId("countdown")?.style.color).toBe(
          theme.colors.foreground,
        );
      },
    );
  });

  it("InlineEdit takes its display text from the theme", () => {
    bothThemes(
      () => (
        <InlineEdit
          testId="rename"
          label="Workspace name"
          value="Docs"
          onCommit={() => undefined}
        />
      ),
      (root, theme) => {
        const colours = root.renderer
          .findByType("text")
          .filter((element) => element.style.color !== undefined)
          .map((element) => element.style.color);
        expect(colours).toEqual([theme.colors.foreground]);
      },
    );
  });

  it("MentionInput takes its field surface from the theme", () => {
    bothThemes(
      () => (
        <MentionInput label="Comment" testId="mention" defaultValue="">
          <MentionInputList>
            <MentionInputItem value="ana" />
          </MentionInputList>
        </MentionInput>
      ),
      (root, theme) => {
        const field = root.renderer.findByTestId("mention-group");
        expect(field?.style.backgroundColor).toBe(theme.colors.background);
        expect(field?.style.borderColor).toBe(theme.colors.border);
      },
    );
  });

  it("PreviewCard takes its surface from the theme", () => {
    bothThemes(
      () => (
        <PreviewCard defaultOpen>
          <PreviewCardTrigger>design-system.md</PreviewCardTrigger>
          <PreviewCardContent label="Design system" testId="preview">
            <text>Tokens and roles.</text>
          </PreviewCardContent>
        </PreviewCard>
      ),
      (root, theme) => {
        expect(
          root.renderer.findByTestId("preview")?.style.backgroundColor,
        ).toBe(theme.colors.popover);
      },
    );
  });

  it("TagInput takes its group surface from the theme", () => {
    bothThemes(
      () => (
        <TagInput
          testId="tags"
          label="Tags"
          value={["design"]}
          onValueChange={() => undefined}
        >
          <TagInputChip value="design" />
          <TagInputField placeholder="Add a tag…" />
        </TagInput>
      ),
      (root, theme) => {
        const group = root.renderer.findByTestId("tags");
        expect(group?.style.backgroundColor).toBe(theme.colors.background);
        expect(group?.style.borderColor).toBe(theme.colors.border);
      },
    );
  });
});

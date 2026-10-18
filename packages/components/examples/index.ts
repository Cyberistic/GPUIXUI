/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * `apps/playground` mounts these in real GPUix. The browser docs site must not
 * render them as live components: they are GPUix host elements, not DOM, so a
 * browser render would be a fake native preview (MISSION.md's preview rules).
 * The docs pages carry the same source as a code block.
 *
 * The key is the example module's basename: `examples/<id>.example.tsx` is
 * registered under `<id>`, with a page at `docs/<id>.mdx`. `src/inventory.test.ts`
 * enforces that one-to-one rule and `src/behaviour/examples.test.tsx` mounts every
 * entry, so a registered example is a rendered example (plan 330).
 */

import type { ComponentType } from "react";
import { AccordionExample } from "./accordion.example.js";
import { AlertExample } from "./alert.example.js";
import { AvatarExample } from "./avatar.example.js";
import { BadgeExample } from "./badge.example.js";
import { BreadcrumbExample } from "./breadcrumb.example.js";
import { CardExample } from "./card.example.js";
import { CarouselExample } from "./carousel.example.js";
import { ChatExample } from "./chat.example.js";
import { CollapsibleExample } from "./collapsible.example.js";
import { ColorPickerExample } from "./color-picker.example.js";
import { ComboboxExample } from "./combobox.example.js";
import { CommandMenuExample } from "./command-menu.example.js";
import { ConfirmDialogExample } from "./confirm-dialog.example.js";
import { ContextMenuExample } from "./context-menu.example.js";
import { CountdownExample } from "./countdown.example.js";
import { DatePickerExample } from "./date-picker.example.js";
import { DialogExample } from "./dialog.example.js";
import { DrawerExample } from "./drawer.example.js";
import { DropdownMenuExample } from "./dropdown-menu.example.js";
import { EmptyStateExample } from "./empty-state.example.js";
import { FieldExample } from "./field.example.js";
import { FieldsetExample } from "./fieldset.example.js";
import { FormExample } from "./form.example.js";
import { HotkeyRecorderExample } from "./hotkey-recorder.example.js";
import { InlineEditExample } from "./inline-edit.example.js";
import { KeyboardShortcutsExample } from "./keyboard-shortcuts.example.js";
import { ListExample } from "./list.example.js";
import { MentionInputExample } from "./mention-input.example.js";
import { MessageExample } from "./message.example.js";
import { MessageScrollerExample } from "./message-scroller.example.js";
import { NavigationMenuExample } from "./navigation-menu.example.js";
import { PaginationExample } from "./pagination.example.js";
import { PopoverExample } from "./popover.example.js";
import { PreviewCardExample } from "./preview-card.example.js";
import { SearchInputExample } from "./search-input.example.js";
import { StepperExample } from "./stepper.example.js";
import { TabsExample } from "./tabs.example.js";
import { TagInputExample } from "./tag-input.example.js";
import { TimePickerExample } from "./time-picker.example.js";
import { TimelineExample } from "./timeline.example.js";
import { ToastExample } from "./toast.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  accordion: AccordionExample,
  alert: AlertExample,
  avatar: AvatarExample,
  badge: BadgeExample,
  breadcrumb: BreadcrumbExample,
  card: CardExample,
  carousel: CarouselExample,
  chat: ChatExample,
  collapsible: CollapsibleExample,
  "color-picker": ColorPickerExample,
  combobox: ComboboxExample,
  "command-menu": CommandMenuExample,
  "confirm-dialog": ConfirmDialogExample,
  "context-menu": ContextMenuExample,
  countdown: CountdownExample,
  "date-picker": DatePickerExample,
  dialog: DialogExample,
  drawer: DrawerExample,
  "dropdown-menu": DropdownMenuExample,
  "empty-state": EmptyStateExample,
  field: FieldExample,
  fieldset: FieldsetExample,
  form: FormExample,
  "hotkey-recorder": HotkeyRecorderExample,
  "inline-edit": InlineEditExample,
  "keyboard-shortcuts": KeyboardShortcutsExample,
  list: ListExample,
  "mention-input": MentionInputExample,
  message: MessageExample,
  "message-scroller": MessageScrollerExample,
  "navigation-menu": NavigationMenuExample,
  pagination: PaginationExample,
  popover: PopoverExample,
  "preview-card": PreviewCardExample,
  "search-input": SearchInputExample,
  stepper: StepperExample,
  tabs: TabsExample,
  "tag-input": TagInputExample,
  "time-picker": TimePickerExample,
  timeline: TimelineExample,
  toast: ToastExample,
};

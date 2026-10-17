/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * `apps/playground` mounts these in real GPUix. The browser docs site must not
 * render them as live components: they are GPUix host elements, not DOM, so a
 * browser render would be a fake native preview (MISSION.md's preview rules).
 * The docs pages carry the same source as a code block.
 */

import type { ComponentType } from "react";
import { AlertExample } from "./alert.example.js";
import { AccordionExample } from "./accordion.example.js";
import { AvatarExample } from "./avatar.example.js";
import { BadgeExample } from "./badge.example.js";
import { BreadcrumbExample } from "./breadcrumb.example.js";
import { CardExample } from "./card.example.js";
import { CollapsibleExample } from "./collapsible.example.js";
import { ComboboxExample } from "./combobox.example.js";
import { CommandMenuExample } from "./command-menu.example.js";
import { ConfirmDialogExample } from "./confirm-dialog.example.js";
import { ContextMenuExample } from "./context-menu.example.js";
import { DatePickerExample } from "./date-picker.example.js";
import { DialogExample } from "./dialog.example.js";
import { DropdownMenuExample } from "./dropdown-menu.example.js";
import { EmptyStateExample } from "./empty-state.example.js";
import { FieldExample } from "./field.example.js";
import { ListExample } from "./list.example.js";
import { PaginationExample } from "./pagination.example.js";
import { PopoverExample } from "./popover.example.js";
import { SearchInputExample } from "./search-input.example.js";
import { TabsExample } from "./tabs.example.js";
import { TimePickerExample } from "./time-picker.example.js";
import { ToastExample } from "./toast.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  accordion: AccordionExample,
  alert: AlertExample,
  avatar: AvatarExample,
  badge: BadgeExample,
  breadcrumb: BreadcrumbExample,
  card: CardExample,
  collapsible: CollapsibleExample,
  combobox: ComboboxExample,
  "command-menu": CommandMenuExample,
  "confirm-dialog": ConfirmDialogExample,
  "context-menu": ContextMenuExample,
  "date-picker": DatePickerExample,
  dialog: DialogExample,
  "dropdown-menu": DropdownMenuExample,
  "empty-state": EmptyStateExample,
  field: FieldExample,
  list: ListExample,
  pagination: PaginationExample,
  popover: PopoverExample,
  "search-input": SearchInputExample,
  tabs: TabsExample,
  "time-picker": TimePickerExample,
  toast: ToastExample,
};

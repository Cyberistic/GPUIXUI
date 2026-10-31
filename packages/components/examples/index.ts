/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * `apps/playground` mounts these in real GPUix. The browser docs site must not
 * render them as live components: they are GPUix host elements, not DOM, so a
 * browser render would be a fake native preview (.agents/slop/MISSION.md's preview rules).
 * The docs pages carry the same source as a code block.
 *
 * `src/examples.test.ts` holds the registry to the directory: every
 * `*.example.tsx` file is registered under its own name and exports the symbol
 * the registry imports, so a new example cannot be unplayable.
 */

import type { ComponentType } from "react";
import { AccordionExample } from "./accordion.example.js";
import { AlertExample } from "./alert.example.js";
import { AspectRatioExample } from "./aspect-ratio.example.js";
import { DisclosureExample } from "./disclosure.example.js";
import { InsetGroupExample } from "./inset-group.example.js";
import { SegmentedControlExample } from "./segmented-control.example.js";
import { AutoHeightExample } from "./auto-height.example.js";
import { AvatarExample } from "./avatar.example.js";
import { AvatarGroupExample } from "./avatar-group.example.js";
import { BadgeExample } from "./badge.example.js";
import { BreadcrumbExample } from "./breadcrumb.example.js";
import { BubbleExample } from "./bubble.example.js";
import { CalendarExample } from "./calendar.example.js";
import { CardExample } from "./card.example.js";
import { CarouselExample } from "./carousel.example.js";
import { ChatExample } from "./chat.example.js";
import { CodeBlockExample } from "./code-block.example.js";
import { CollapsibleExample } from "./collapsible.example.js";
import { ColorPickerExample } from "./color-picker.example.js";
import { ComboboxExample } from "./combobox.example.js";
import { CommandMenuExample } from "./command-menu.example.js";
import { ConfirmDialogExample } from "./confirm-dialog.example.js";
import { ContextMenuExample } from "./context-menu.example.js";
import { CopyButtonExample } from "./copy-button.example.js";
import { CountdownExample } from "./countdown.example.js";
import { CountingNumberExample } from "./counting-number.example.js";
import { DatePickerExample } from "./date-picker.example.js";
import { DialogExample } from "./dialog.example.js";
import { DrawerExample } from "./drawer.example.js";
import { SheetExample } from "./sheet.example.js";
import { DropdownMenuExample } from "./dropdown-menu.example.js";
import { EmptyStateExample } from "./empty-state.example.js";
import { FieldExample } from "./field.example.js";
import { FieldsetExample } from "./fieldset.example.js";
import { GradientExample } from "./gradient.example.js";
import { GradientTextExample } from "./gradient-text.example.js";
import { HighlightTextExample } from "./highlight-text.example.js";
import { FormExample } from "./form.example.js";
import { GlyphExample } from "./glyph.example.js";
import { HotkeyRecorderExample } from "./hotkey-recorder.example.js";
import { HoverCardExample } from "./hover-card.example.js";
import { InputGroupExample } from "./input-group.example.js";
import { ItemExample } from "./item.example.js";
import { ImageZoomExample } from "./image-zoom.example.js";
import { InlineEditExample } from "./inline-edit.example.js";
import { KeyboardShortcutsExample } from "./keyboard-shortcuts.example.js";
import { ListExample } from "./list.example.js";
import { MentionInputExample } from "./mention-input.example.js";
import { MessageExample } from "./message.example.js";
import { MessageScrollerExample } from "./message-scroller.example.js";
import { MotionExample } from "./motion.example.js";
import { MultiStepFormExample } from "./multi-step-form.example.js";
import { NavigationMenuExample } from "./navigation-menu.example.js";
import { PageTransitionExample } from "./page-transition.example.js";
import { PaginationExample } from "./pagination.example.js";
import { PinnedListExample } from "./pinned-list.example.js";
import { PopoverExample } from "./popover.example.js";
import { PreviewCardExample } from "./preview-card.example.js";
import { ProgressExample } from "./progress.example.js";
import { RevealExample } from "./reveal.example.js";
import { ScrollFadeExample } from "./scroll-fade.example.js";
import { ScrollProgressExample } from "./scroll-progress.example.js";
import { SearchInputExample } from "./search-input.example.js";
import { SeparatorExample } from "./separator.example.js";
import { ShimmerExample } from "./shimmer.example.js";
import { SidebarExample } from "./sidebar.example.js";
import { SkeletonExample } from "./skeleton.example.js";
import { SliderExample } from "./slider.example.js";
import { SpinnerExample } from "./spinner.example.js";
import { SlidingNumberExample } from "./sliding-number.example.js";
import { StepperExample } from "./stepper.example.js";
import { TabsExample } from "./tabs.example.js";
import { TagInputExample } from "./tag-input.example.js";
import { ThemeTogglerExample } from "./theme-toggler.example.js";
import { TimePickerExample } from "./time-picker.example.js";
import { TimelineExample } from "./timeline.example.js";
import { ToastExample } from "./toast.example.js";
import { ToggleExample } from "./toggle.example.js";
import { ToggleGroupExample } from "./toggle-group.example.js";
import { UserMenuExample } from "./user-menu.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  accordion: AccordionExample,
  alert: AlertExample,
  "aspect-ratio": AspectRatioExample,
  disclosure: DisclosureExample,
  "inset-group": InsetGroupExample,
  "segmented-control": SegmentedControlExample,
  "auto-height": AutoHeightExample,
  avatar: AvatarExample,
  "avatar-group": AvatarGroupExample,
  badge: BadgeExample,
  breadcrumb: BreadcrumbExample,
  bubble: BubbleExample,
  calendar: CalendarExample,
  card: CardExample,
  carousel: CarouselExample,
  chat: ChatExample,
  "code-block": CodeBlockExample,
  collapsible: CollapsibleExample,
  "color-picker": ColorPickerExample,
  combobox: ComboboxExample,
  "command-menu": CommandMenuExample,
  "confirm-dialog": ConfirmDialogExample,
  "context-menu": ContextMenuExample,
  "copy-button": CopyButtonExample,
  countdown: CountdownExample,
  "counting-number": CountingNumberExample,
  "date-picker": DatePickerExample,
  dialog: DialogExample,
  drawer: DrawerExample,
  sheet: SheetExample,
  "dropdown-menu": DropdownMenuExample,
  "empty-state": EmptyStateExample,
  field: FieldExample,
  fieldset: FieldsetExample,
  gradient: GradientExample,
  "gradient-text": GradientTextExample,
  "highlight-text": HighlightTextExample,
  form: FormExample,
  glyph: GlyphExample,
  "hotkey-recorder": HotkeyRecorderExample,
  "hover-card": HoverCardExample,
  "input-group": InputGroupExample,
  item: ItemExample,
  "image-zoom": ImageZoomExample,
  "inline-edit": InlineEditExample,
  "keyboard-shortcuts": KeyboardShortcutsExample,
  list: ListExample,
  "mention-input": MentionInputExample,
  message: MessageExample,
  "message-scroller": MessageScrollerExample,
  motion: MotionExample,
  "multi-step-form": MultiStepFormExample,
  "navigation-menu": NavigationMenuExample,
  "page-transition": PageTransitionExample,
  pagination: PaginationExample,
  "pinned-list": PinnedListExample,
  popover: PopoverExample,
  "preview-card": PreviewCardExample,
  progress: ProgressExample,
  reveal: RevealExample,
  "scroll-fade": ScrollFadeExample,
  "scroll-progress": ScrollProgressExample,
  "search-input": SearchInputExample,
  separator: SeparatorExample,
  shimmer: ShimmerExample,
  sidebar: SidebarExample,
  skeleton: SkeletonExample,
  slider: SliderExample,
  spinner: SpinnerExample,
  "sliding-number": SlidingNumberExample,
  stepper: StepperExample,
  tabs: TabsExample,
  "tag-input": TagInputExample,
  "theme-toggler": ThemeTogglerExample,
  "time-picker": TimePickerExample,
  timeline: TimelineExample,
  toast: ToastExample,
  toggle: ToggleExample,
  "toggle-group": ToggleGroupExample,
  "user-menu": UserMenuExample,
};

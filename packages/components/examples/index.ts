/**
 * The example registry: `id → example`, for the **native** playground.
 *
 * `apps/playground` mounts these in real GPUix. The browser docs site must not
 * render them as live components: they are GPUix host elements, not DOM, so a
 * browser render would be a fake native preview (MISSION.md's preview rules).
 * The docs pages carry the same source as a code block.
 *
 * `src/examples.test.ts` holds the registry to the directory: every
 * `*.example.tsx` file is registered under its own name and exports the symbol
 * the registry imports, so a new example cannot be unplayable.
 */

import type { ComponentType } from "react";
import { AccordionExample } from "./accordion.example.js";
import { AlertExample } from "./alert.example.js";
import { AutoHeightExample } from "./auto-height.example.js";
import { AvatarExample } from "./avatar.example.js";
import { AvatarGroupExample } from "./avatar-group.example.js";
import { BadgeExample } from "./badge.example.js";
import { BreadcrumbExample } from "./breadcrumb.example.js";
import { BubblesExample } from "./bubbles.example.js";
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
import { DropdownMenuExample } from "./dropdown-menu.example.js";
import { EmptyStateExample } from "./empty-state.example.js";
import { FieldExample } from "./field.example.js";
import { FieldsetExample } from "./fieldset.example.js";
import { FireworksExample } from "./fireworks.example.js";
import { GradientExample } from "./gradient.example.js";
import { GravityStarsExample } from "./gravity-stars.example.js";
import { HexagonExample } from "./hexagon.example.js";
import { HighlightTextExample } from "./highlight-text.example.js";
import { FormExample } from "./form.example.js";
import { HotkeyRecorderExample } from "./hotkey-recorder.example.js";
import { ImageZoomExample } from "./image-zoom.example.js";
import { InlineEditExample } from "./inline-edit.example.js";
import { KeyboardShortcutsExample } from "./keyboard-shortcuts.example.js";
import { LiquidButtonExample } from "./liquid-button.example.js";
import { ListExample } from "./list.example.js";
import { MagneticExample } from "./magnetic.example.js";
import { MentionInputExample } from "./mention-input.example.js";
import { MessageExample } from "./message.example.js";
import { MessageScrollerExample } from "./message-scroller.example.js";
import { MotionExample } from "./motion.example.js";
import { NavigationMenuExample } from "./navigation-menu.example.js";
import { PageTransitionExample } from "./page-transition.example.js";
import { PaginationExample } from "./pagination.example.js";
import { ParticlesExample } from "./particles.example.js";
import { PinnedListExample } from "./pinned-list.example.js";
import { PopoverExample } from "./popover.example.js";
import { PreviewCardExample } from "./preview-card.example.js";
import { RevealExample } from "./reveal.example.js";
import { RippleButtonExample } from "./ripple-button.example.js";
import { RollingTextExample } from "./rolling-text.example.js";
import { RotatingTextExample } from "./rotating-text.example.js";
import { ScrollFadeExample } from "./scroll-fade.example.js";
import { ScrollProgressExample } from "./scroll-progress.example.js";
import { SearchInputExample } from "./search-input.example.js";
import { ShineButtonExample } from "./shine-button.example.js";
import { SlidingNumberExample } from "./sliding-number.example.js";
import { SplittingTextExample } from "./splitting-text.example.js";
import { StarsExample } from "./stars.example.js";
import { StepperExample } from "./stepper.example.js";
import { TabsExample } from "./tabs.example.js";
import { TagInputExample } from "./tag-input.example.js";
import { ThemeTogglerExample } from "./theme-toggler.example.js";
import { TimePickerExample } from "./time-picker.example.js";
import { TimelineExample } from "./timeline.example.js";
import { ToastExample } from "./toast.example.js";
import { TopographyExample } from "./topography.example.js";
import { TypingTextExample } from "./typing-text.example.js";

/** Every example, by the id a docs page and the playground both use. */
export const examples: Readonly<Record<string, ComponentType>> = {
  accordion: AccordionExample,
  alert: AlertExample,
  "auto-height": AutoHeightExample,
  avatar: AvatarExample,
  "avatar-group": AvatarGroupExample,
  badge: BadgeExample,
  breadcrumb: BreadcrumbExample,
  bubbles: BubblesExample,
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
  "dropdown-menu": DropdownMenuExample,
  "empty-state": EmptyStateExample,
  field: FieldExample,
  fieldset: FieldsetExample,
  fireworks: FireworksExample,
  gradient: GradientExample,
  "gravity-stars": GravityStarsExample,
  hexagon: HexagonExample,
  "highlight-text": HighlightTextExample,
  form: FormExample,
  "hotkey-recorder": HotkeyRecorderExample,
  "image-zoom": ImageZoomExample,
  "inline-edit": InlineEditExample,
  "keyboard-shortcuts": KeyboardShortcutsExample,
  "liquid-button": LiquidButtonExample,
  list: ListExample,
  magnetic: MagneticExample,
  "mention-input": MentionInputExample,
  message: MessageExample,
  "message-scroller": MessageScrollerExample,
  motion: MotionExample,
  "navigation-menu": NavigationMenuExample,
  "page-transition": PageTransitionExample,
  pagination: PaginationExample,
  particles: ParticlesExample,
  "pinned-list": PinnedListExample,
  popover: PopoverExample,
  "preview-card": PreviewCardExample,
  reveal: RevealExample,
  "ripple-button": RippleButtonExample,
  "rolling-text": RollingTextExample,
  "rotating-text": RotatingTextExample,
  "scroll-fade": ScrollFadeExample,
  "scroll-progress": ScrollProgressExample,
  "search-input": SearchInputExample,
  "shine-button": ShineButtonExample,
  "sliding-number": SlidingNumberExample,
  "splitting-text": SplittingTextExample,
  stars: StarsExample,
  stepper: StepperExample,
  tabs: TabsExample,
  "tag-input": TagInputExample,
  "theme-toggler": ThemeTogglerExample,
  "time-picker": TimePickerExample,
  timeline: TimelineExample,
  toast: ToastExample,
  topography: TopographyExample,
  "typing-text": TypingTextExample,
};

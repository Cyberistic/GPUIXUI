/**
 * The component inventory: one record per implemented component.
 *
 * Each module owns its record, so the inventory cannot drift from the code it
 * describes; this file only collects them. `inventory.test.ts` checks the records
 * against the files on disk and the rows in `COMPONENTS.md` — the Tier 2 table
 * and the animated-primitives table plan 600 fills.
 */

import { accordionMeta } from "./accordion.js";
import { alertMeta } from "./alert.js";
import { aspectRatioMeta } from "./aspect-ratio.js";
import { autoHeightMeta } from "./auto-height.js";
import { avatarMeta } from "./avatar.js";
import { avatarGroupMeta } from "./avatar-group.js";
import { badgeMeta } from "./badge.js";
import { breadcrumbMeta } from "./breadcrumb.js";
import { bubblesMeta } from "./bubbles.js";
import { carouselMeta } from "./carousel.js";
import { cardMeta } from "./card.js";
import { chatMeta } from "./chat.js";
import { codeBlockMeta } from "./code-block.js";
import { collapsibleMeta } from "./collapsible.js";
import { colorPickerMeta } from "./color-picker.js";
import { comboboxMeta } from "./combobox.js";
import { commandMenuMeta } from "./command-menu.js";
import { confirmDialogMeta } from "./confirm-dialog.js";
import { contextMenuMeta } from "./context-menu.js";
import { copyButtonMeta } from "./copy-button.js";
import { countdownMeta } from "./countdown.js";
import { countingNumberMeta } from "./counting-number.js";
import { calendarMeta } from "./calendar.js";
import { datePickerMeta } from "./date-picker.js";
import { dialogMeta } from "./dialog.js";
import { drawerMeta } from "./drawer.js";
import { sheetMeta } from "./sheet.js";
import { dropdownMenuMeta } from "./dropdown-menu.js";
import { emptyStateMeta } from "./empty-state.js";
import { fieldMeta } from "./field.js";
import { fieldsetMeta } from "./fieldset.js";
import { fireworksMeta } from "./fireworks.js";
import { formMeta } from "./form.js";
import { gradientMeta } from "./gradient.js";
import { gradientTextMeta } from "./gradient-text.js";
import { glyphMeta } from "./glyph.js";
import { gravityStarsMeta } from "./gravity-stars.js";
import { hexagonMeta } from "./hexagon.js";
import { highlightTextMeta } from "./highlight-text.js";
import { hoverCardMeta } from "./hover-card.js";
import { hotkeyRecorderMeta } from "./hotkey-recorder.js";
import { imageZoomMeta } from "./image-zoom.js";
import { inlineEditMeta } from "./inline-edit.js";
import { inputGroupMeta } from "./input-group.js";
import { itemMeta } from "./item.js";
import { keyboardShortcutsMeta } from "./keyboard-shortcuts.js";
import { liquidButtonMeta } from "./liquid-button.js";
import { listMeta } from "./list.js";
import { magneticMeta } from "./magnetic.js";
import { mentionInputMeta } from "./mention-input.js";
import { messageMeta } from "./message.js";
import { messageScrollerMeta } from "./message-scroller.js";
import { motionGridMeta } from "./motion-grid.js";
import { multiStepFormMeta } from "./multi-step-form.js";
import { navigationMenuMeta } from "./navigation-menu.js";
import { pageTransitionMeta } from "./page-transition.js";
import { paginationMeta } from "./pagination.js";
import { particlesMeta } from "./particles.js";
import { pinnedListMeta } from "./pinned-list.js";
import { popoverMeta } from "./popover.js";
import { previewCardMeta } from "./preview-card.js";
import { progressMeta } from "./progress.js";
import { revealMeta } from "./reveal.js";
import { rippleButtonMeta } from "./ripple-button.js";
import { rollingTextMeta } from "./rolling-text.js";
import { rotatingTextMeta } from "./rotating-text.js";
import { scrollFadeMeta } from "./scroll-fade.js";
import { scrollProgressMeta } from "./scroll-progress.js";
import { searchInputMeta } from "./search-input.js";
import { separatorMeta } from "./separator.js";
import { shineButtonMeta } from "./shine-button.js";
import { sidebarMeta } from "./sidebar.js";
import { skeletonMeta } from "./skeleton.js";
import { sliderMeta } from "./slider.js";
import { slidingNumberMeta } from "./sliding-number.js";
import { slidingTextMeta } from "./sliding-text.js";
import { spinnerMeta } from "./spinner.js";
import { splittingTextMeta } from "./splitting-text.js";
import { starsMeta } from "./stars.js";
import { stepperMeta } from "./stepper.js";
import { tabsMeta } from "./tabs.js";
import { tagInputMeta } from "./tag-input.js";
import { themeTogglerMeta } from "./theme-toggler.js";
import { timelineMeta } from "./timeline.js";
import { timePickerMeta } from "./time-picker.js";
import { toggleMeta } from "./toggle.js";
import { toggleGroupMeta } from "./toggle-group.js";
import { toastMeta } from "./toast.js";
import { typingTextMeta } from "./typing-text.js";
import { userMenuMeta } from "./user-menu.js";

/** One component's inventory record. */
export interface ComponentMeta {
  /** Exactly the label used in `COMPONENTS.md`. */
  readonly name: string;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly status: "todo" | "wip" | "done" | "blocked" | "unsupported";
  readonly gpuixSupport: "yes" | "partial" | "no";
  /** Empty array when there is no limitation. Never omitted. */
  readonly limitations: ReadonlyArray<string>;
  /** `docs/<name>.mdx` */
  readonly docs: string;
  /** `examples/<name>.example.tsx` */
  readonly example: string;
  /** `src/behaviour/<name>.test.tsx` */
  readonly testFile: string;
}

/** Every implemented Tier 2 component. */
export const inventory: ReadonlyArray<ComponentMeta> = [
  accordionMeta,
  aspectRatioMeta,
  autoHeightMeta,
  alertMeta,
  avatarMeta,
  avatarGroupMeta,
  badgeMeta,
  breadcrumbMeta,
  bubblesMeta,
  carouselMeta,
  cardMeta,
  chatMeta,
  codeBlockMeta,
  collapsibleMeta,
  colorPickerMeta,
  comboboxMeta,
  commandMenuMeta,
  confirmDialogMeta,
  contextMenuMeta,
  copyButtonMeta,
  countdownMeta,
  countingNumberMeta,
  calendarMeta,
  datePickerMeta,
  dialogMeta,
  drawerMeta,
  sheetMeta,
  dropdownMenuMeta,
  emptyStateMeta,
  fieldMeta,
  fieldsetMeta,
  fireworksMeta,
  formMeta,
  gradientMeta,
  gradientTextMeta,
  glyphMeta,
  gravityStarsMeta,
  hexagonMeta,
  highlightTextMeta,
  hotkeyRecorderMeta,
  imageZoomMeta,
  inlineEditMeta,
  inputGroupMeta,
  itemMeta,
  hoverCardMeta,
  keyboardShortcutsMeta,
  liquidButtonMeta,
  listMeta,
  magneticMeta,
  mentionInputMeta,
  messageMeta,
  messageScrollerMeta,
  motionGridMeta,
  multiStepFormMeta,
  navigationMenuMeta,
  pageTransitionMeta,
  paginationMeta,
  particlesMeta,
  pinnedListMeta,
  popoverMeta,
  previewCardMeta,
  progressMeta,
  revealMeta,
  rippleButtonMeta,
  rollingTextMeta,
  rotatingTextMeta,
  scrollFadeMeta,
  scrollProgressMeta,
  searchInputMeta,
  separatorMeta,
  shineButtonMeta,
  sidebarMeta,
  skeletonMeta,
  sliderMeta,
  slidingNumberMeta,
  slidingTextMeta,
  spinnerMeta,
  splittingTextMeta,
  starsMeta,
  stepperMeta,
  tabsMeta,
  tagInputMeta,
  themeTogglerMeta,
  timelineMeta,
  timePickerMeta,
  toastMeta,
  toggleMeta,
  toggleGroupMeta,
  typingTextMeta,
  userMenuMeta,
];

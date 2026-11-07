import { accordionMeta } from "./accordion.js";
import { alertMeta } from "./alert.js";
import { aspectRatioMeta } from "./aspect-ratio.js";
import { disclosureMeta } from "./disclosure.js";
import { colorSwatchesMeta } from "./color-swatches.js";
import { insetGroupMeta } from "./inset-group.js";
import { segmentedControlMeta } from "./segmented-control.js";
import { autoHeightMeta } from "./auto-height.js";
import { avatarMeta } from "./avatar.js";
import { avatarGroupMeta } from "./avatar-group.js";
import { badgeMeta } from "./badge.js";
import { breadcrumbMeta } from "./breadcrumb.js";
import { bubbleMeta } from "./bubble.js";
import { carouselMeta } from "./carousel.js";
import { cardMeta } from "./card.js";
import { chatMeta } from "./chat.js";
import { codeBlockMeta } from "./code-block.js";
import { diagramMeta } from "./diagram.js";
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
import { formMeta } from "./form.js";
import { gradientMeta } from "./gradient.js";
import { gradientTextMeta } from "./gradient-text.js";
import { glyphMeta } from "./glyph.js";
import { highlightTextMeta } from "./highlight-text.js";
import { hoverCardMeta } from "./hover-card.js";
import { hotkeyRecorderMeta } from "./hotkey-recorder.js";
import { imageZoomMeta } from "./image-zoom.js";
import { inlineEditMeta } from "./inline-edit.js";
import { inputGroupMeta } from "./input-group.js";
import { itemMeta } from "./item.js";
import { kanbanMeta } from "./kanban.js";
import { keyboardShortcutsMeta } from "./keyboard-shortcuts.js";
import { listMeta } from "./list.js";
import { mentionInputMeta } from "./mention-input.js";
import { messageMeta } from "./message.js";
import { messageScrollerMeta } from "./message-scroller.js";
import { multiStepFormMeta } from "./multi-step-form.js";
import { navigationMenuMeta } from "./navigation-menu.js";
import { pageTransitionMeta } from "./page-transition.js";
import { paginationMeta } from "./pagination.js";
import { pinnedListMeta } from "./pinned-list.js";
import { popoverMeta } from "./popover.js";
import { previewCardMeta } from "./preview-card.js";
import { progressMeta } from "./progress.js";
import { revealMeta } from "./reveal.js";
import { scrollFadeMeta } from "./scroll-fade.js";
import { scrollProgressMeta } from "./scroll-progress.js";
import { searchInputMeta } from "./search-input.js";
import { separatorMeta } from "./separator.js";
import { shimmerMeta } from "./shimmer.js";
import { sidebarMeta } from "./sidebar.js";
import { skeletonMeta } from "./skeleton.js";
import { sliderMeta } from "./slider.js";
import { slidingNumberMeta } from "./sliding-number.js";
import { spinnerMeta } from "./spinner.js";
import { stepperMeta } from "./stepper.js";
import { tabsMeta } from "./tabs.js";
import { tagInputMeta } from "./tag-input.js";
import { themeTogglerMeta } from "./theme-toggler.js";
import { timelineMeta } from "./timeline.js";
import { timePickerMeta } from "./time-picker.js";
import { toggleMeta } from "./toggle.js";
import { toggleGroupMeta } from "./toggle-group.js";
import { toastMeta } from "./toast.js";
import { userMenuMeta } from "./user-menu.js";

export interface ComponentMeta {
  readonly name: string;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly status: "todo" | "wip" | "done" | "blocked" | "unsupported";
  readonly gpuixSupport: "yes" | "partial" | "no";

  readonly limitations: ReadonlyArray<string>;

  readonly docs: string;

  readonly example: string;

  readonly testFile: string;
}

export const inventory: ReadonlyArray<ComponentMeta> = [
  accordionMeta,
  aspectRatioMeta,
  disclosureMeta,
  colorSwatchesMeta,
  insetGroupMeta,
  segmentedControlMeta,
  autoHeightMeta,
  alertMeta,
  avatarMeta,
  avatarGroupMeta,
  badgeMeta,
  breadcrumbMeta,
  bubbleMeta,
  carouselMeta,
  cardMeta,
  chatMeta,
  codeBlockMeta,
  diagramMeta,
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
  formMeta,
  gradientMeta,
  gradientTextMeta,
  glyphMeta,
  highlightTextMeta,
  hotkeyRecorderMeta,
  imageZoomMeta,
  inlineEditMeta,
  inputGroupMeta,
  itemMeta,
  kanbanMeta,
  hoverCardMeta,
  keyboardShortcutsMeta,
  listMeta,
  mentionInputMeta,
  messageMeta,
  messageScrollerMeta,
  multiStepFormMeta,
  navigationMenuMeta,
  pageTransitionMeta,
  paginationMeta,
  pinnedListMeta,
  popoverMeta,
  previewCardMeta,
  progressMeta,
  revealMeta,
  scrollFadeMeta,
  scrollProgressMeta,
  searchInputMeta,
  separatorMeta,
  shimmerMeta,
  sidebarMeta,
  skeletonMeta,
  sliderMeta,
  slidingNumberMeta,
  spinnerMeta,
  stepperMeta,
  tabsMeta,
  tagInputMeta,
  themeTogglerMeta,
  timelineMeta,
  timePickerMeta,
  toastMeta,
  toggleMeta,
  toggleGroupMeta,
  userMenuMeta,
];

/**
 * The live probes: one real-window view and one `steps` effect each.
 *
 * A probe is deliberately **not** a headless scenario: a window's automation
 * API is asynchronous and its renderer reports no style, so a probe asserts
 * focus and captures paint states as screenshots. The checks are still the
 * shared `Smoke` ones, so both suites emit one report shape.
 */
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { Duration, Effect, flow, Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import {
  extendTheme,
  elevationShadow,
  filledHover,
  keyboardFocusRing,
  nativeTextTheme,
  statusTone,
  textStyle,
  watchSystemTheme,
  type FontSource,
  type NativeTextTheme,
  type PlatformName,
  type Theme,
} from "@gpuixui/tokens";
import { examples as dataExamples } from "@gpuixui/data/examples";
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxList,
  ComboboxTrigger,
  CommandMenu,
  CommandMenuEmpty,
  CommandMenuInput,
  CommandMenuList,
  ConfirmDialog,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  Field,
  FieldInput,
  Form,
  List,
  ListItem,
  ListItemTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
  MotionProvider,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Stepper,
  StepperStep,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToastProvider,
  ToastViewport,
  useToast,
  type CommandAction,
} from "@gpuixui/components";
import { SplitPane as DockSplitPane } from "@gpuixui/dock";
import {
  Button,
  Checkbox,
  Input,
  OTPField,
  RangeSlider,
  ScrollArea,
  Select as PrimitiveSelect,
  Slider,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  Text,
  ThemeProvider as PrimitiveThemeProvider,
  Tooltip,
} from "@gpuixui/primitives";
import {
  ThemeProvider as TokensThemeProvider,
  useTheme,
} from "@gpuixui/tokens/react";
import {
  createPortal,
  flushSync,
  useGpuix,
  useWindowInsets,
  useWindowSize,
  motion,
} from "@gpuix/react";
import type {
  ImgInstance,
  KeyEvent,
  NativeWindowInsets,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import type { EventPayload } from "@gpuix/native";
import { FloatingLayer } from "@gpuix/react/floating";
import {
  Select as GpuixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gpuix/react/select";
import { Pixels, Smoke } from "@gpuixui/testing";
import { nextPalette, palettes, type PaletteId } from "../palettes.js";
import {
  SplitPane,
  SPLIT_DIVIDER_WIDTH,
  SPLIT_KEYBOARD_STEP,
} from "../panels/split-pane.js";
import { isResizeKey, keySize } from "../panels/resize.js";
import { Body, Pressable, Readout, Toolbar } from "../ui.js";
import { useWindowKey, useWindowSelection } from "../window-handlers.js";
import { useWindowFacts } from "./window-facts.js";
import type { LiveProbeId } from "./registry.js";
import {
  BAR_HEIGHT,
  CHROME_FILL,
  SAFE_BAR_X,
  SAFE_FILL,
  TitlebarChrome,
  barPoint,
  insetBarPoint,
  decodeEdges,
  formatEdges,
  type Edges,
} from "./chrome.js";
import {
  OTP_PASTE_FIELD,
  OTP_PASTE_LENGTH,
  OTP_PASTE_LONGER,
  OTP_PASTE_LONGER_VALUE,
  OTP_PASTE_READOUT,
  OTP_PASTE_SOURCE,
  OTP_PASTE_SOURCE_VALUE,
  otpPasteCellId,
  otpPasteMarker,
  otpPasteOver,
  otpPasteReadout,
} from "./otp-paste.js";
import {
  OTP_KEYS_CHANNELS,
  OTP_KEYS_FIELD,
  OTP_KEYS_LENGTH,
  OTP_KEYS_READOUT,
  otpKeysCellId,
  otpKeysChannels,
  otpKeysReadout,
} from "./otp-keys.js";
import {
  MULTI_STEP_IDS,
  MULTI_STEP_NAME_MESSAGE,
  MULTI_STEP_PORT_MESSAGE,
  MULTI_STEP_STEPS,
  MULTI_STEP_TERMS_MESSAGE,
  WorkspaceSetup,
  appliedReadout,
  emptyMultiStepDraft,
  multiStepReadout,
  nextStep,
  previousStep,
  stepError,
  type MultiStepDraft,
  type MultiStepStep,
} from "./multi-step.js";

import {
  DATA_TREE_COLLAPSE,
  DATA_TREE_EXPAND,
  DATA_TREE_INITIAL,
  DATA_TREE_READOUT,
  DATA_TREE_REVEAL,
  DATA_TREE_REVEALED,
  DATA_TREE_ROWS_ALL,
  DATA_TREE_ROWS_FOLDED,
  DATA_TREE_ROWS_OPEN,
  DATA_TREE_ROWS_REVEALED,
  dataTreeReadout,
  dataTreeRow,
} from "./data-tree.js";

import {
  VIRTUAL_TABLE,
  VIRTUAL_TABLE_FILTER,
  VIRTUAL_TABLE_FILTERED_ROWS,
  VIRTUAL_TABLE_INITIAL,
  VIRTUAL_TABLE_NAME_SORT,
  VIRTUAL_TABLE_READOUT,
  VIRTUAL_TABLE_REVEAL,
  virtualTableReadout,
  virtualTableRow,
} from "./virtual-table.js";

import {
  DATA_TABLE_BODY,
  DATA_TABLE_COLUMNS,
  DATA_TABLE_COLUMN_RESET,
  DATA_TABLE_COLUMNS_ORDER,
  DATA_TABLE_CONTENT_WIDTH,
  DATA_TABLE_DIVIDER,
  DATA_TABLE_DRAG,
  DATA_TABLE_FILTER,
  DATA_TABLE_INITIAL,
  DATA_TABLE_NAME_HEADER,
  DATA_TABLE_NAME_SORT,
  DATA_TABLE_NAME_WIDTH,
  DATA_TABLE_READOUT,
  DATA_TABLE_SORT_ASC,
  DATA_TABLE_SORT_DESC,
  dataTableCell,
  dataTableColumnToggle,
  dataTableContent,
  dataTableReadout,
  dataTableRow,
} from "./data-table.js";

import {
  DATE_PICKER_AFTER,
  DATE_PICKER_CHOSEN_LABEL,
  DATE_PICKER_CLEAR,
  DATE_PICKER_CONTENT,
  DATE_PICKER_EMPTY_TRIGGER,
  DATE_PICKER_MAX,
  DATE_PICKER_MIN,
  DATE_PICKER_MONTH,
  DATE_PICKER_MONTH_LABEL,
  DATE_PICKER_NAV_ARROW,
  DATE_PICKER_NEXT,
  DATE_PICKER_PLACEHOLDER,
  DATE_PICKER_PROBE,
  DATE_PICKER_READOUT,
  DATE_PICKER_ROUTES,
  DATE_PICKER_TODAY,
  DATE_PICKER_TODAY_LABEL,
  DATE_PICKER_TRIGGER,
  DATE_PICKER_UNAVAILABLE,
  datePickerCell,
  formatDatePickerReadout,
} from "./date-picker.js";

import {
  ALPHA_BASE,
  ALPHA_OVER,
  ALPHA_POINTS,
  ALPHA_SHARE,
  BAR_PIXEL,
  MARGIN_PIXEL,
  PLOT,
  PLOT_BACKING,
  PLOT_SIZE,
  PLOT_SVG,
  REPLACEMENT,
  SERIES,
  VECTOR,
  alphaBasePixels,
  alphaOverPixels,
  compositeOver,
  plotPixels,
  pointIn,
  type Box,
} from "./chart.js";
import {
  BUFFER_COLOUR,
  CANVAS_PARENT,
  CHART_SVG,
  hexOf,
  IMAGE_COLOUR,
  IMAGE_DATA_URL,
  IMAGE_SIZE,
  imagePixels,
  LAYER_SHAPES,
  layerColour,
  layerSvg,
  SOURCE_FILL,
  SVG_TINT,
  type Rgb,
} from "./content.js";
import {
  COMB,
  COMB_SIZE,
  OVERHANG_SIZE,
  PATTERN_IDS,
  PATTERN_TINTS,
  SQUARE_BOX,
  SQUARE_RESIZED_BOX,
  TALL,
  WIDE,
  combPoints,
  logicalRegion,
  overhangFraction,
  patternReadout,
  shapeSvg,
  shapeTint,
  squareFraction,
  strokeWeight,
  type PatternShape,
} from "./pattern.js";
import {
  MISSING_FAMILY,
  SQUARE_BYTES,
  SQUARE_FACE,
  SQUARE_FAMILY,
  SQUARE_SIZE,
  SQUARE_WORD,
  SQUARE_WORD_WIDTH,
} from "./fonts.js";
import {
  BACKDROP_BOX,
  BACKDROP_FILL,
  BACKDROP_FILL_RGBA,
  backdropPoint,
  contentPoint,
  decodeWindowBackground,
  surfaceAlpha,
} from "./backdrop.js";
import {
  captureScale,
  describeColour,
  distanceFrom,
  framePoint,
} from "./frame.js";
import {
  OVERLAY_ENTER_COUNT,
  OVERLAY_FRAME,
  OVERLAY_GAP,
  OVERLAY_MARK,
  OVERLAY_PAGE,
  OVERLAY_SOURCE,
  overlayCodeStyle,
  overlayFieldStyle,
  overlayMetrics,
  overlayReadout,
  overlayRegion,
  type OverlayInk,
} from "./editor-overlay.js";
import {
  MULTI_PANE,
  MULTI_PANE_FILES,
  MULTI_PANE_IDS,
  MULTI_PANE_VALUES,
  dragWidth,
  multiPaneReadout,
  paneWidths,
  type PaneOpen,
  type PaneSide,
} from "./multi-pane.js";
import {
  FILTER_IDS,
  FILTER_ROW_HEIGHT,
  FILTER_VIEWPORT,
  filterReadout,
  filterRows,
  keepSelection,
  rowLabel,
  stepRow,
} from "./table-filter.js";
import {
  COLUMN_IDS,
  COLUMN_ORDER,
  COLUMN_ROW_HEIGHT,
  COLUMN_ROW_INDEXES,
  COLUMN_VIEWPORT_WIDTH,
  cellLabel,
  columnOffset,
  columnWidth,
  columnsReadout,
  contentWidth,
  maxOffsetX,
  moveColumn,
  visibleColumns,
  type ColumnId,
} from "./table-columns.js";
import {
  COLUMN_RESIZE,
  COLUMN_RESIZE_IDS,
  COLUMN_RESIZE_ROWS,
  CONTROL_MOVES,
  DRAG_STEPS,
  columnResizeReadout,
  movedPastDivider,
  resizeContentWidth,
  resizedWidth,
} from "./column-resize.js";
import {
  FADE_BACKING,
  FADE_BACKING_RGBA,
  FADE_CAPTURE_ATTEMPTS,
  FADE_PARTIAL_MS,
  FADE_REST_MS,
  fadeSample,
  isBacking,
  isFading,
  isSurface,
  surfaceFadeColour,
  type FadeBox,
} from "./fade.js";
import { moveRow, rowAt, type RowHandle } from "./reorder.js";
import {
  firesOf,
  initialSelectionLog,
  recordSelection,
  SELECTION_EVENT_CHROME,
  SELECTION_EVENT_LINE,
  SELECTION_EVENT_READOUT,
  SELECTION_EVENT_TAIL,
  selectionReadout,
} from "./selection-event.js";
import { settleNumber, settleUntil } from "./settle.js";
import {
  FIELD_INK_IDS,
  HINT_TEXT,
  HINT_TYPED,
  INK_PEAK_FLOOR,
  INK_PEAK_TOLERANCE,
  countDarker,
  fieldInk,
  hasInk,
  luminanceOf,
  peakInk,
} from "./field-ink.js";
import {
  BASE_PAGE,
  BASE_SWATCH,
  NIGHT_PAGE,
  NIGHT_SWATCH,
  PAPER_PAGE,
  PAPER_SWATCH,
  PROBE_BOX,
  SWATCH_BOX,
  SYSTEM_THEME_IDS,
  SYSTEM_THEME_POLL_MS,
  baseTheme,
  readSystemPalette,
  recordMount,
  resetSystemPalette,
  setSystemPalette,
  clearSystemPalette,
  pagePoint,
  swatchPoint,
  paperPalette,
} from "./system-theme.js";
import {
  CODE_SAMPLE,
  CODE_LEADING,
  DIFF_LEADING_GAIN,
  DOCUMENT_TYPE_HOST,
  DOCUMENT_TYPE_IDS,
  DOCUMENT_TYPE_THEME,
  MARKDOWN_SAMPLE,
  PATCH_SAMPLE,
  CODE_SIZE,
  RUNTIME_CODE_LEADING,
  RUNTIME_HEADER_SIZE,
  bandHeight,
  headerBands,
  inkBands,
  near,
} from "./document-type.js";
import {
  THEME_CARD,
  THEME_CARD_PADDING,
  THEME_CONTROL_WIDTH,
  THEME_PAGE,
  THEME_PAGE_PADDING,
  controlHeight,
  nextPlatformInCycle,
  roleColour,
  sameColour,
  themeCardPoint,
  themeFor,
  themePagePoint,
  themeSwitchReadout,
} from "./theme-switch.js";
import {
  EDGE_HEIGHT,
  MESSAGE_ROWS,
  MESSAGE_TOP,
  NEWER_FIRST,
  OLDER_FIRST,
  PAGE_ROWS,
  READER_TOP,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  VOID_TOP,
  loadingRowRestore,
  messageIds,
  pageFirstId,
  voidRow,
  type PageDirection,
} from "./loading-row.js";
import {
  FILLER_ROWS,
  FILLER_ROW_HEIGHT,
  INNER_MAX,
  INNER_ROW_HEIGHT,
  INNER_ROWS,
  INNER_STEP,
  INNER_VIEWPORT,
  PANE_FILLER_HEIGHT,
  PANE_FILLER_ROWS,
  PANE_VIEWPORT,
  PANE_ROWS,
  PANE_ROW_HEIGHT,
  PANE_PAGE_VIEWPORT,
  OUTER_ONLY_ROW,
  OUTER_MAX,
  OUTER_VIEWPORT,
} from "./nested-scroll.js";
import {
  FIELD_SLOT,
  HORIZONTAL_COLUMNS,
  HORIZONTAL_COLUMN_WIDTH,
  HORIZONTAL_MAX,
  HORIZONTAL_VIEWPORT,
  KEYBOARD_SCROLL_IDS,
  VERTICAL_MAX,
  VERTICAL_ROWS,
  VERTICAL_ROW_HEIGHT,
  VERTICAL_VIEWPORT,
  lineStep,
  offsetText,
  predictedOffset,
  type ScrollAction,
} from "./keyboard-scroll.js";
import { REVIEWERS } from "./combobox.js";
import {
  VALIDATION_DESCRIPTION,
  VALIDATION_FIELD,
  VALIDATION_INPUT,
  VALIDATION_MESSAGE,
  VALIDATION_READOUT,
  submitSlug,
  validationReadout,
} from "./validation.js";
import {
  CONFIRM_ACCEPT,
  CONFIRM_CANCEL,
  CONFIRM_OPENER,
  CONFIRM_READOUT,
  confirmFlow,
  confirmReadout,
  initialConfirmFlow,
} from "./confirm.js";
import {
  NESTED_DIALOG,
  NESTED_MENU_ITEM,
  NESTED_MENU_PANEL,
  NESTED_MENU_TRIGGER,
  NESTED_OPENER,
  NESTED_OUTSIDE,
  NESTED_POPOVER_PANEL,
  NESTED_POPOVER_TRIGGER,
  NESTED_READOUT,
  initialNestedFlow,
  nestedFlow,
  nestedReadout,
  type NestedSurface,
} from "./nested-overlay.js";
import {
  INITIAL_OBJECT,
  INSPECTOR_LABEL_WIDTH,
  INSPECTOR_IDS,
  INSPECTOR_PANE_HEIGHT,
  INSPECTOR_ROW_HEIGHT,
  INSPECTOR_SCROLL_HEIGHT,
  INSPECTOR_TOOLBAR_HEIGHT,
  INSPECTOR_VALUE_WIDTH,
  WIDE_WIDTH,
  inspectorReadout,
  metricReadout,
  previewCaption,
  propertyRows,
  renameTag,
  resetSize,
  sizeValue,
  tagValue,
  widen,
  type InspectedObject,
} from "./inspector.js";
import { listAnchorOf } from "./host.js";
import { LIST_ROWS, TYPEAHEAD_LETTER, type ListRow } from "./list.js";
import {
  TRANSCRIPT_PAGE_ROWS,
  TRANSCRIPT_ROW_HEIGHT,
  TRANSCRIPT_START_ROWS,
  TRANSCRIPT_TAIL_HEIGHT,
  TRANSCRIPT_THRESHOLD,
  TRANSCRIPT_VIEWPORT_HEIGHT,
  scrollRange,
} from "./message-scroller.js";
import {
  TABLE_HEIGHT,
  TABLE_HEADER_HEIGHT,
  TABLE_ROWS,
  TABLE_ROW_HEIGHT,
  TABLE_SORT,
  TABLE_WIDTH,
  TABLE_Y_RANGE,
  COLUMN_WIDTH,
  sortLabel,
  sortTable,
  toggleSort,
  type TableRow,
  type TableSort,
} from "./table.js";
import {
  HEADER_COLUMNS,
  HEADER_FIRST_ITEM,
  HEADER_FRAME,
  HEADER_FRAME_WIDTH,
  HEADER_TRIGGER,
  HEADER_TRIGGER_AFTER,
  HEADER_TRIGGER_CELL,
  HEADER_TRIGGER_WIDTH,
  headerCellId,
  headerContentWidth,
  toggleHidden,
  type HeaderColumn,
} from "./header-menu.js";
import {
  DOCK_GUARDED_ACTION,
  DOCK_SIDEBAR_WIDTH,
  DOCK_STATUS,
  DOCK_TABS,
  DOCK_TOGGLE,
  dockActionId,
  dockFieldId,
  dockPaneId,
  dockRailId,
  dockStops,
  stepTab,
  type DockTab,
} from "./dock-focus.js";
import {
  MOVABLE_DRAFT,
  MOVABLE_READOUT,
  TAB_GROUP_GAP,
  TAB_GROUP_INITIAL,
  TAB_GROUP_IDS,
  groupAt,
  groupBoxId,
  groupOf,
  insertionIndex,
  moveTab,
  panelFieldId,
  panelId,
  panelTitle,
  panelTitleId,
  stepTab as stepMovableTab,
  stripId,
  tabId,
  tabReadout,
  type GroupBox,
  type TabBox,
  type TabGroupId,
  type TabLayout,
} from "./tabs-drag.js";
import {
  TREE_ALL_DIRECTORIES,
  TREE_INDENT,
  TREE_REVEAL_INDEX,
  TREE_ROW_HEIGHT,
  TREE_VIEWPORT_HEIGHT,
  labelInset,
  labelTestId,
  rowTestId,
  toggleTestId,
  visibleRows,
  type TreeNode,
} from "./virtual-tree.js";
import {
  CORRUPT_WORKSPACE,
  WORKSPACE_DIVIDER,
  WORKSPACE_DOCUMENT,
  WORKSPACE_IDS,
  WORKSPACE_PANE,
  WORKSPACE_ROWS,
  WORKSPACE_ROW_HEIGHT,
  WORKSPACE_SIDEBAR,
  WORKSPACE_TABS,
  WorkspaceLayout,
  clampedSample,
  decodeWorkspace,
  defaultWorkspace,
  encodeWorkspace,
  restoreWorkspace,
  stepDocument,
  toggleSidebar,
  updateWorkspace,
  type WorkspaceTab,
} from "./workspace-restore.js";
import {
  readTruncation,
  TRUNCATION_BLEED,
  TRUNCATION_CLAMP_LINES,
  TRUNCATION_IDS,
  TRUNCATION_LABEL,
  TRUNCATION_PROSE,
  TRUNCATION_WIDTH,
} from "./truncation.js";
import {
  directionOf,
  readEndInk,
  RTL_FONT_SIZE,
  RTL_IDS,
  RTL_SAMPLES,
  shaped,
  shapingOf,
} from "./rtl-text.js";
import {
  countInk,
  countInkOn,
  DARK_KEYWORD,
  isPainted,
  LIGHT_KEYWORD,
  RUNTIME_KEYWORD,
  RUNTIME_KEYWORD_TOLERANCE,
  SYNTAX_IDS,
  SYNTAX_LANGUAGE,
  SYNTAX_SOURCE,
} from "./syntax-palette.js";
import {
  inkBounds,
  thumbCentreAt,
  VERTICAL_FRACTION,
  VERTICAL_SLIDER_HEIGHT,
  VERTICAL_SLIDER_IDS,
} from "./vertical-slider.js";
import {
  emptySelection,
  MODIFIER_ROWS,
  MODIFIER_ROW_HEIGHT,
  MODIFIER_SELECT_IDS,
  pressedModifiers,
  selectRow,
  selectionState,
  type LastPress,
  type RowSelection,
} from "./modifier-select.js";
import {
  LIST_ROW_CAPTION,
  LIST_ROW_CLEAR,
  LIST_ROW_LIST,
  LIST_ROW_PRESSES,
  LIST_ROW_READOUT,
  LIST_ROW_ROWS,
  formatSelection,
  listRowId,
  listRowTrailingId,
  type TrailingShape,
} from "./list-row.js";
import {
  BUTTON_ACTIVATION_PROBE,
  BUTTON_AFTER,
  BUTTON_BUSY,
  BUTTON_CAPTION,
  BUTTON_DISABLED,
  BUTTON_ENABLED,
  BUTTON_READOUT,
  BUTTON_REFUSAL_READOUT,
  BUTTON_ROUTES,
  BUTTON_TAB_ORDER,
  activationKind,
  buttonRoute,
  fieldOf,
  formatActivation,
  formatCounts,
  formatRefusals,
  type ActivationKind,
  type ButtonGesture,
  type Point,
} from "./button.js";
import {
  PRESS_CAPTION,
  PRESS_CLEAR,
  PRESS_CASES,
  PRESS_DRAFT,
  PRESS_READOUT,
  formatHits,
  pressCase,
  pressCellId,
  pressRowId,
  type Nesting,
  type PressCase,
} from "./press-routing.js";
import {
  BOX_PAINT_BORDER,
  BOX_PAINT_BORDER_WIDTH,
  BOX_PAINT_FILL,
  BOX_PAINT_HEIGHT,
  BOX_PAINT_IDS,
  BOX_PAINT_STOPS,
  BOX_PAINT_WIDTH,
  pointAcross,
  colourAt,
  countPaint,
  differs,
  isColour,
  type PaintBox,
  type PaintPoint,
} from "./box-paint.js";
import {
  ASPECT_CASES,
  ASPECT_COLUMN_WIDTH,
  ASPECT_HEIGHT,
  ASPECT_IDS,
  ASPECT_PORTRAIT_RATIO,
  ASPECT_PORTRAIT_WIDTH,
  ASPECT_RATIO,
  ASPECT_ROW_HEIGHT,
  ASPECT_WIDTH,
  type AspectExpectation,
} from "./aspect-ratio.js";
import {
  FLEX_ALIGN_CASES,
  FLEX_ALIGN_COLUMN_WIDTH,
  FLEX_ALIGN_CONTENT,
  FLEX_ASKED_WIDTH,
  FLEX_FIT_CONTENT,
  FLEX_FIXED_WIDTH,
  FLEX_FLOOR_CONTENT,
  FLEX_FLOOR_ROW_WIDTH,
  FLEX_IDS,
  FLEX_LONG_CONTENT,
  FLEX_MAX_WIDTH,
  FLEX_NARROW_WIDTH,
  FLEX_OVER_CONTENT,
  FLEX_ROW_WIDTH,
  FLEX_SHORT_CONTENT,
  FLEX_WIDTH_CASES,
} from "./flex-sizing.js";
import {
  DRAG_BAND,
  DRAG_BY,
  DRAG_CONTENT,
  DRAG_FILL,
  DRAG_GRAB,
  DRAG_IDS,
  DRAG_THICKNESS,
  DRAG_THUMB,
  DRAG_TINT,
  DRAG_TRACK_GRAB,
  DRAG_VIEWPORT,
  DRAG_WHEEL,
  dragThumbAfter,
} from "./scrollbar-drag.js";
import {
  COLLAPSE_BODY,
  COLLAPSE_GROW_BEFORE,
  COLLAPSE_GROWN,
  COLLAPSE_IDS,
  COLLAPSE_MOUNTED,
  COLLAPSE_PRESSES,
  COLLAPSE_REST,
  COLLAPSE_WIDTH,
  collapseReadout,
  type CollapsePress,
} from "./collapse.js";
import {
  BOTH_AXES,
  BOTH_CONTENT,
  BOTH_FILL,
  BOTH_IDS,
  BOTH_SHORT_CONTENT,
  BOTH_STOPS,
  BOTH_THICKNESS,
  BOTH_THUMBS,
  BOTH_TINT,
  BOTH_VIEWPORT,
  bothBandOf,
  type BothBox,
  type BothThumb,
} from "./scrollbar-both.js";
import {
  SCROLLBAR_DEFAULT,
  SCROLLBAR_FILL,
  SCROLLBAR_FLOOR,
  SCROLLBAR_HORIZONTAL,
  SCROLLBAR_HORIZONTAL_SCROLLED_BY,
  SCROLLBAR_HORIZONTAL_STOP,
  SCROLLBAR_IDS,
  SCROLLBAR_SHORT,
  SCROLLBAR_STOPS,
  SCROLLBAR_SWATCH,
  SCROLLBAR_THUMBS,
  SCROLLBAR_TINTED,
  SCROLLBAR_TINTED_THUMBS,
  SCROLLBAR_VIEWPORT,
  SCROLLBAR_VIEWPORTS,
  SCROLLBAR_WIDE,
  type ScrollbarCase,
} from "./scrollbar.js";
import {
  IMAGE_BOX_CASES,
  IMAGE_BOX_IDS,
  IMAGE_HEIGHT,
  IMAGE_INTRINSIC_SIZE,
  IMAGE_RATIO,
  IMAGE_WIDTH,
  type ImageBoxExpectation,
} from "./image-box.js";
import {
  bandHex,
  bandSamples,
  edgeSamples,
  FIT_CASES,
  FIT_SOURCE_HEIGHT,
  FIT_SOURCE_WIDTH,
  fitPixels,
  roundCase,
  roundSamples,
  type FitCase,
} from "./image-fit.js";
import {
  cellId,
  formatReadout,
  GRID_COLUMNS,
  GRID_FOCUS_IDS,
  GRID_ROWS,
  gridKeyOf,
  GridFocusReadout,
  initialReadout,
  moveIndex,
  tabIndexOf,
} from "./grid-focus.js";
import { bandPoint, leftOf, RING_OFFSET } from "./ring-offset.js";
import {
  decodeReadout,
  localPoint,
  MOVED_BY,
  SURFACE_ORIGIN_MOVE,
  SURFACE_ORIGIN_NUDGE,
  SURFACE_ORIGIN_PROBE,
  SURFACE_ORIGIN_READOUT,
  SURFACE_ORIGIN_TARGET,
  type SurfaceReadout,
} from "./surface-origin.js";
import { HoverRoutingProbe, hoverRoutingSteps } from "./hover-probe.js";
import {
  ACTION_RING_DANGER,
  ACTION_RING_NEIGHBOUR,
  ACTION_RING_PRIMARY,
  ACTION_RING_PROBE,
  insidePoint,
} from "./action-ring.js";
import {
  aroundBox,
  ELEVATION_BLUR,
  ELEVATION_DEPTH,
  ELEVATION_FADE_MID,
  ELEVATION_FADE_NEAR,
  ELEVATION_FAR,
  ELEVATION_FILL,
  ELEVATION_HEIGHT,
  ELEVATION_IDS,
  ELEVATION_INSIDE,
  ELEVATION_NEAR,
  ELEVATION_OFFSET,
  ELEVATION_RAISED,
  ELEVATION_ROW,
  ELEVATION_SECOND,
  ELEVATION_SHADOW,
  ELEVATION_SPREAD,
  ELEVATION_UNREADABLE,
  ELEVATION_WIDTH,
} from "./elevation.js";
import {
  mixedAt,
  OPACITY_ABOVE_ONE,
  OPACITY_FILL,
  OPACITY_HALF,
  OPACITY_HEIGHT,
  OPACITY_IDS,
  OPACITY_INK,
  OPACITY_QUARTER,
  OPACITY_SHADOW,
  OPACITY_SHADOW_OFFSET,
  OPACITY_SHADOW_SAMPLE,
  OPACITY_WIDTH,
  withinBytes,
} from "./opacity.js";
/** Long enough for one paint after an input reaches the window. */
const SETTLE = Duration.millis(40);

/** One focusable sample; every sample carries the ring the library ships. */
const Sample = ({
  testId,
  label,
}: {
  readonly testId: string;
  readonly label: string;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 240,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        ...keyboardFocusRing(theme),
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

const FocusVisibleProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="focus-visible-probe"
      style={{
        width: 720,
        height: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The ring is focusVisible: it should appear only after keyboard input.
      </text>
      <Sample testId="press-ring" label="press target" />
      <Sample testId="tab-ring" label="tab target" />
      <Sample testId="programmatic-ring" label="programmatic target" />
    </div>
  );
};

/** One focusable sample whose outline sits `offset` points outside its box. */
const OffsetRingSample = ({
  testId,
  offset,
  label,
}: {
  readonly testId: string;
  readonly offset: number;
  readonly label: string;
}): ReactNode => {
  const theme = useTheme();
  const ring = keyboardFocusRing(theme);
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 240,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        ...ring,
        focusVisible: { ...ring.focusVisible, outlineOffset: offset },
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

/**
 * Two identical controls, one with the ring flush to its border box and one
 * with the theme's gap, plus a sibling that must not move when either appears.
 *
 * The gap is read on the page between the two: offset 2 puts the line three
 * points out, so the point one point out is the page and the sibling's `y` is
 * the layout proof.
 */
const FocusRingOffsetProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="focus-ring-offset-probe"
      style={{
        width: 720,
        height: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        An outline takes no layout space; offset 2 leaves the page behind it.
      </text>
      <OffsetRingSample testId="ring-flush" offset={0} label="flush ring" />
      <OffsetRingSample
        testId="ring-offset"
        offset={RING_OFFSET}
        label="offset ring"
      />
      <div
        testId="ring-neighbour"
        style={{
          width: 240,
          height: theme.spacing.xl,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.card,
        }}
      />
    </div>
  );
};

/**
 * Two shipped filled actions plus a non-focusable sibling, to read the ring a
 * real control paints against its own fill.
 *
 * The actions are the primitives' `Button`, which declares `controlRing` — the
 * one component seam both packages route through — so this measures the
 * library rather than a sample style. `primary` and `destructive` are the two
 * faces whose fill is a role the ring shares: a flush line is drawn in the
 * fill's own colour, and the gap is the whole point of the offset.
 */
const ActionRingProbe = (): ReactNode => {
  const theme = palettes.dark;
  return (
    <PrimitiveThemeProvider theme={theme}>
      <div
        testId={ACTION_RING_PROBE}
        style={{
          width: 560,
          height: 360,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          A filled action's ring sits on the page, one line clear of its fill.
        </text>
        <Button testId={ACTION_RING_PRIMARY} variant="primary">
          Primary action
        </Button>
        <Button testId={ACTION_RING_DANGER} variant="destructive">
          Danger action
        </Button>
        <div
          testId={ACTION_RING_NEIGHBOUR}
          style={{
            width: 160,
            height: theme.spacing.xl,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.card,
          }}
        />
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * A surface that can be moved without being resized, and a one-pixel probe at
 * its origin.
 *
 * The control above opens a panel, which pushes the surface down by
 * `MOVED_BY`; the surface's size is unchanged, so its own `onLayout` — which
 * the runtime fires on a size change — has nothing to report. The probe's
 * width alternates on every pointer read, and its report carries the origin
 * the surface has now. The readout publishes the frame facts the probe
 * asserts, so a failure names the numbers it read.
 */
const SurfaceOriginProbeView = (): ReactNode => {
  const theme = useTheme();
  const [pad, setPad] = useState(0);
  const [surface, setSurface] = useState(0);
  const [probe, setProbe] = useState(0);
  const [origin, setOrigin] = useState<Option.Option<Painted>>(Option.none());
  const [reported, setReported] = useState<Option.Option<Painted>>(
    Option.none(),
  );
  const [point, setPoint] = useState<Option.Option<Point>>(Option.none());
  const [nudge, setNudge] = useState(0);
  const number = (value: Option.Option<number>): string =>
    Option.match(value, {
      onNone: () => "none",
      onSome: (at) => `${Math.round(at)}`,
    });
  const xOf = (value: Option.Option<Point | Painted>): string =>
    number(Option.map(value, (at) => at.x));
  const yOf = (value: Option.Option<Point | Painted>): string =>
    number(Option.map(value, (at) => at.y));
  return (
    <div
      testId={SURFACE_ORIGIN_PROBE}
      style={{
        width: 560,
        height: 420,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A moved surface reports no layout; a nudged probe reports its origin.
      </text>
      <div
        testId={SURFACE_ORIGIN_MOVE}
        role="button"
        tabIndex={0}
        aria-label="Open a panel above the surface"
        onClick={() => setPad(MOVED_BY)}
        style={{
          height: theme.density.controlHeight.md,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.secondary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <text
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.secondaryForeground,
          }}
        >
          Open a panel above
        </text>
      </div>
      <div
        style={{
          height: pad,
          backgroundColor: theme.colors.muted,
        }}
      />
      <div
        onLayout={(payload) => {
          setSurface((count) => count + 1);
          Option.match(boxOf(payload), {
            onNone: () => {},
            onSome: (box) => setReported(Option.some(box)),
          });
        }}
        style={{
          position: "relative",
          width: 240,
          height: 60,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.card,
        }}
      >
        <div
          testId={SURFACE_ORIGIN_NUDGE}
          onLayout={(payload) => {
            setProbe((count) => count + 1);
            Option.match(boxOf(payload), {
              onNone: () => {},
              onSome: (box) => setOrigin(Option.some(box)),
            });
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1 + nudge,
            height: 1,
            pointerEvents: "none",
          }}
        />
        <div
          testId={SURFACE_ORIGIN_TARGET}
          onMouseMove={(event) => {
            Option.all([
              Option.fromNullishOr(event.x),
              Option.fromNullishOr(event.y),
            ]).pipe(
              Option.match({
                onNone: () => {},
                onSome: ([x, y]) => {
                  setPoint(Option.some({ x, y }));
                  // The repair a pointer-driven surface performs: ask for a
                  // fresh origin by changing the probe's own size.
                  setNudge((value) => (value === 0 ? 1 : 0));
                },
              }),
            );
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 240,
            height: 60,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.card,
          }}
        />
      </div>
      <text
        testId={SURFACE_ORIGIN_READOUT}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {`pad=${pad} surface=${surface} probe=${probe} originX=${xOf(origin)} originY=${yOf(origin)} pointX=${xOf(point)} pointY=${yOf(point)} reportedX=${xOf(reported)} reportedY=${yOf(reported)}`}
      </text>
    </div>
  );
};

/** One sample with the runtime's default focus dimming, or opted out. */
const DimSample = ({
  testId,
  label,
  keyboardFocusDim,
}: {
  readonly testId: string;
  readonly label: string;
  readonly keyboardFocusDim?: boolean;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 240,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.muted,
        keyboardFocusDim,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

/**
 * Three identical samples, one opted out of the runtime's focus dimming.
 *
 * The outside pair models "the rest of the window" while the keyboard focus is
 * elsewhere; the third shows the per-element opt-out the runtime documents.
 */
const FocusDimProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="focus-dim-probe"
      style={{
        width: 720,
        height: 360,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        keyboardFocusDim: the first sample dims, the third opts out.
      </text>
      <DimSample testId="dim-first" label="dims on Tab" />
      <DimSample testId="dim-second" label="takes focus on Tab" />
      <DimSample
        testId="dim-opt-out"
        label="opts out of dimming"
        keyboardFocusDim={false}
      />
    </div>
  );
};

/**
 * The shipped actions under the runtime's keyboard dim.
 *
 * The token layer measures the dim (`focus-dim.test.ts`) and the components
 * declare the opt-out their behaviour suites read from the style tree; neither
 * paints the pair in a window. Here the fourth action takes the keyboard focus,
 * so the three measured actions are "other focusables", and each is counted in a
 * colour nothing else in the view paints: the filled action keeps every pixel of
 * its fill, the action a caller forces back into the cue loses all of them, and
 * the ghost action's label — a role no other element uses — is dimmed away. The
 * ghost's label takes its colour and a 28px size from the caller `style`,
 * because a ghost paints no fill and the label is the only pixel the mechanism
 * can change; the size keeps enough exact-coloured glyph interiors for the count
 * to read on a non-retina display.
 *
 * A text field is **not** the focus target: the runtime skips the dim entirely
 * while an `<input>`/`<textarea>` holds the focus ("typing is keyboard input too,
 * and dimming the window while someone types is noise", `renderer.rs`
 * `keyboard_focus_path`), so tabbing into a field measures no dim at all.
 */
const FilledActionDimProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="filled-action-dim-probe"
        style={{
          width: 560,
          height: 280,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <Button testId="dim-filled" variant="secondary">
          Filled action
        </Button>
        <Button
          testId="dim-ghost"
          variant="ghost"
          style={{ color: theme.colors.success, fontSize: 28 }}
        >
          Ghost action
        </Button>
        <Button
          testId="dim-forced"
          variant="destructive"
          style={{ keyboardFocusDim: true }}
        >
          Forced into the cue
        </Button>
        <Button testId="dim-focus" variant="ghost">
          Takes the focus
        </Button>
      </div>
    </PrimitiveThemeProvider>
  );
};

/** One sample of `SQUARE_WORD` at the probe's size, in `family` or the default. */
const FaceSample = ({
  testId,
  family,
}: {
  readonly testId: string;
  readonly family?: string;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <text
        testId={testId}
        style={{
          ...textStyle(theme, "body"),
          fontFamily: family,
          fontSize: SQUARE_SIZE,
          color: theme.colors.foreground,
        }}
      >
        {SQUARE_WORD}
      </text>
    </div>
  );
};

/**
 * The same word three ways: the theme's family, a family no runtime knows, and
 * the family the runner registered before this view first painted.
 *
 * The unknown name is the control: it proves the family *string* changes
 * nothing on its own, so a width difference in the third row is the font file,
 * not the style.
 */
const RegisterFontProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="register-font-probe"
      style={{
        width: 720,
        height: 320,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The third word paints the installed face's own advances.
      </text>
      <FaceSample testId="face-default" />
      <FaceSample testId="face-missing" family={MISSING_FAMILY} />
      <FaceSample testId="face-registered" family={SQUARE_FAMILY} />
    </div>
  );
};

/**
 * Text naming a family the renderer does not know yet, and a control that
 * repaints it.
 *
 * Nothing installs the face before this view mounts — that is the measurement.
 * The probe installs it afterwards and presses the re-layout control, so the
 * second width is the same text laid out again by a runtime that now knows the
 * family. The tint alternates on every press, so the node's style really
 * changes: a re-render that skips an unchanged node could not hide the
 * measurement behind a reconciler bail-out.
 */
const LateRegistrationProbe = (): ReactNode => {
  const theme = useTheme();
  const [relayouts, setRelayouts] = useState(0);
  const tint =
    relayouts % 2 === 0
      ? theme.colors.foreground
      : theme.colors.mutedForeground;
  const sample = {
    ...textStyle(theme, "body"),
    fontSize: SQUARE_SIZE,
    color: tint,
  };
  return (
    <div
      testId="font-late-probe"
      style={{
        width: 720,
        height: 320,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The face arrives after this text first painted.
      </text>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <text
          testId="late-face"
          style={{ ...sample, fontFamily: SQUARE_FAMILY }}
        >
          {SQUARE_WORD}
        </text>
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <text
          testId="late-control"
          style={{ ...sample, fontFamily: MISSING_FAMILY }}
        >
          {SQUARE_WORD}
        </text>
      </div>
      <div
        testId="late-relayout"
        role="button"
        tabIndex={0}
        onClick={() => setRelayouts((count) => count + 1)}
        style={{
          width: 240,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          testId="late-relayouts"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`relayouts=${relayouts}`}
        </text>
      </div>
    </div>
  );
};

/**
 * Three anchors in a real window, one per placement this probe asks about.
 *
 * The headless `floating-placement` scenario proves the same engine against the
 * `TestRenderer`. A window can differ (it did for the tabs indicator), and the
 * left/right sides plus the `align="center"` quirk were never measured live, so
 * each anchor mounts its own layer: `side=right`, `side=left`, and
 * `side=right align=center` — the state every menu compensates for.
 */
const FloatingSidesProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const place = { left: 260, width: 120, height: 40 } as const;
  const panel = (testId: string): ReactNode => (
    <div
      testId={testId}
      style={{
        width: 160,
        height: 80,
        padding: theme.spacing.sm,
        pointerEvents: "auto",
        backgroundColor: theme.colors.popover,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        panel
      </text>
    </div>
  );
  const anchor = (testId: string, top: number, layer: ReactNode): ReactNode => (
    <div
      testId={testId}
      role="button"
      tabIndex={0}
      style={{
        position: "absolute",
        left: place.left,
        top,
        width: place.width,
        height: place.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.muted,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {testId}
      </text>
      {layer}
    </div>
  );

  return (
    <div
      testId="float-live-window"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      {anchor(
        "anchor-right",
        80,
        <FloatingLayer side="right" align="start" sideOffset={GAP}>
          {panel("panel-right")}
        </FloatingLayer>,
      )}
      {anchor(
        "anchor-left",
        220,
        <FloatingLayer side="left" align="start" sideOffset={GAP}>
          {panel("panel-left")}
        </FloatingLayer>,
      )}
      {anchor(
        "anchor-centre",
        360,
        <FloatingLayer side="right" align="center" sideOffset={GAP}>
          {panel("panel-centre")}
        </FloatingLayer>,
      )}
    </div>
  );
};

/**
 * The library's own `Input`, wired to a readout.
 *
 * The readout is the proof: it shows the value React received through
 * `onChange`, so a keystroke that the window delivered but the component
 * swallowed fails by name rather than by a screenshot nobody reads.
 */
const TextInputProbe = (): ReactNode => {
  const theme = useTheme();
  const [value, setValue] = useState("");
  const [submits, setSubmits] = useState(0);
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="text-input-probe"
        style={{
          width: 480,
          height: 240,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Input: typing reaches onChange, Enter reaches onSubmit.
        </text>
        <Input
          testId="input-field"
          label="Name"
          placeholder="type here"
          value={value}
          onChange={setValue}
          onSubmit={() => setSubmits((count) => count + 1)}
        />
        <text
          testId="input-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`value=${value} submits=${submits}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * The shipped `Field` with a schema-backed message the caller owns.
 *
 * `Field` never validates on a keystroke — it paints the `error` it is handed —
 * so the probe *is* the caller: `submitSlug` runs the package's `validate` when
 * the field submits, and the field swaps its description for the schema's own
 * message. What a window proves and a `TestRenderer` cannot: `Enter` in the
 * field submits through the host, the focus stays in the field, and the invalid
 * message is paint (counted in the frame) rather than a declared style.
 */
const ValidationProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState(Option.none<string>());
  const [applied, setApplied] = useState(Option.none<string>());
  const [submits, setSubmits] = useState(0);

  /** The caller's half: validate on submit, and record what it accepted. */
  const submit = (): void => {
    setSubmits((count) => count + 1);
    const message = submitSlug(slug);
    setError(message);
    if (Option.isNone(message)) setApplied(Option.some(slug));
  };

  return (
    <div
      testId="validation-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 520,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Field: validate on submit, one message at a time.
        </text>
        <Field
          label="Workspace URL"
          description={VALIDATION_DESCRIPTION}
          error={Option.getOrUndefined(error)}
          testId={VALIDATION_FIELD}
        >
          <FieldInput
            testId={VALIDATION_INPUT}
            placeholder="design-system"
            value={slug}
            onChange={(event) => setSlug(event.value ?? "")}
            onSubmit={submit}
          />
        </Field>
        <Readout testId={VALIDATION_READOUT}>
          {validationReadout(error, applied, submits)}
        </Readout>
      </div>
    </div>
  );
};

/**
 * The shipped `Form`, `Stepper`, `Field` and `Checkbox` as one three-step
 * wizard.
 *
 * The app owns the step, the draft and the acceptance; the step gate is the
 * wizard's own rule, while the form's schema decodes the whole record once, at
 * submit. Keeping both layers visible is the point: a wizard that gates forward
 * movement and then trusts it would carry an invalid record, so the review
 * step's acceptance is checked by `Form` alone.
 */
const MultiStepProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [step, setStep] = useState<MultiStepStep>(1);
  const [draft, setDraft] = useState<MultiStepDraft>(emptyMultiStepDraft);
  const [attempted, setAttempted] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submits, setSubmits] = useState(0);
  const [applied, setApplied] = useState<Option.Option<WorkspaceSetup>>(
    Option.none(),
  );

  // The message follows the value once the reader has tried to move on, so a
  // corrected field clears it without another press.
  const error = attempted ? stepError(step, draft) : Option.none<string>();

  const advance = (): void => {
    const refusal = stepError(step, draft);
    setAttempted(Option.isSome(refusal));
    if (Option.isNone(refusal)) setStep(nextStep(step));
  };

  const back = (): void => {
    setAttempted(false);
    setStep(previousStep(step));
  };

  return (
    <div
      testId={MULTI_STEP_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 520,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <Stepper value={step} label="Workspace setup" style={{ width: 460 }}>
          {MULTI_STEP_STEPS.map((label, index) => (
            <StepperStep key={label} value={index + 1} label={label} />
          ))}
        </Stepper>
        <Form
          schema={WorkspaceSetup}
          value={{ ...draft, accepted }}
          onSubmit={(setup) => {
            setApplied(Option.some(setup));
            setSubmits((count) => count + 1);
          }}
          label="Create a workspace"
        >
          {(form) => (
            <>
              {Match.value(step).pipe(
                Match.when(1, () => (
                  <Field
                    label="Workspace name"
                    description="3–24 lowercase letters, digits or hyphens"
                    error={Option.getOrUndefined(error)}
                    testId={MULTI_STEP_IDS.name}
                  >
                    <FieldInput
                      testId={MULTI_STEP_IDS.nameInput}
                      placeholder="design-system"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.value ?? "" })
                      }
                      onSubmit={advance}
                    />
                  </Field>
                )),
                Match.when(2, () => (
                  <Field
                    label="Port"
                    description="1024 to 65535"
                    error={Option.getOrUndefined(error)}
                    testId={MULTI_STEP_IDS.port}
                  >
                    <FieldInput
                      testId={MULTI_STEP_IDS.portInput}
                      placeholder="3000"
                      value={draft.port}
                      onChange={(event) =>
                        setDraft({ ...draft, port: event.value ?? "" })
                      }
                      onSubmit={advance}
                    />
                  </Field>
                )),
                Match.when(3, () => (
                  <>
                    <Readout testId={MULTI_STEP_IDS.review}>
                      {`name=${draft.name} port=${draft.port}`}
                    </Readout>
                    <Checkbox
                      testId={MULTI_STEP_IDS.terms}
                      checked={accepted}
                      onCheckedChange={setAccepted}
                      label="The port is free"
                    />
                  </>
                )),
                Match.exhaustive,
              )}
              <div style={{ display: "flex", gap: theme.spacing.sm }}>
                <Button
                  testId={MULTI_STEP_IDS.back}
                  variant="secondary"
                  disabled={step === 1}
                  onClick={back}
                >
                  Back
                </Button>
                {step === 3 ? (
                  <Button
                    testId={MULTI_STEP_IDS.submit}
                    variant="primary"
                    onClick={form.submit}
                  >
                    Create workspace
                  </Button>
                ) : (
                  <Button
                    testId={MULTI_STEP_IDS.next}
                    variant="primary"
                    onClick={advance}
                  >
                    Next
                  </Button>
                )}
              </div>
              <Readout testId={MULTI_STEP_IDS.readout}>
                {multiStepReadout(step, draft, accepted, submits)}
              </Readout>
              <Readout testId={MULTI_STEP_IDS.applied}>
                {appliedReadout(applied)}
              </Readout>
            </>
          )}
        </Form>
      </div>
    </div>
  );
};

/**
 * The library's own `Checkbox`: a press and a Space key each toggle it, with a
 * readout that prints the state React received.
 *
 * Both paths matter in a window rather than in the offscreen renderer: the press
 * proves the painted box is hit-testable, and Space proves the runtime routes the
 * key to a focused `div role="checkbox"` — the component's own keyboard
 * contract, not a host element's.
 */
const CheckboxProbe = (): ReactNode => {
  const theme = useTheme();
  const [checked, setChecked] = useState(false);
  const [changes, setChanges] = useState(0);
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="checkbox-probe"
        style={{
          width: 480,
          height: 240,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Checkbox: a press and Space each report a change.
        </text>
        <Checkbox
          testId="checkbox-field"
          label="Enable telemetry"
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next);
            setChanges((count) => count + 1);
          }}
        />
        <text
          testId="checkbox-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`checked=${checked} changes=${changes}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * The shipped `Tabs` from `@gpuixui/components`: four triggers (the third
 * disabled) and a controlled value the readout prints.
 *
 * The readout is the proof the selection is React's own state, and the
 * `tabs-indicator` element is the component's measured selected surface — a
 * window reports it in `bounds`, so the probe can assert the pill actually
 * covers the selected trigger rather than trusting the renderer's layout.
 */
const TabsProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState("overview");
  const [changes, setChanges] = useState(0);
  const [focuses, setFocuses] = useState(0);
  return (
    <div
      testId="tabs-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <Tabs
        value={value}
        onValueChange={(next) => {
          setValue(next);
          setChanges((count) => count + 1);
        }}
      >
        <TabsList testId="tabs-list" label="Workspace tabs">
          <TabsTrigger
            testId="tabs-overview"
            value="overview"
            onFocus={() => setFocuses((count) => count + 1)}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger testId="tabs-reports" value="reports">
            Reports
          </TabsTrigger>
          <TabsTrigger testId="tabs-settings" value="settings" disabled>
            Settings
          </TabsTrigger>
          <TabsTrigger testId="tabs-archive" value="archive">
            Archive
          </TabsTrigger>
        </TabsList>
        <TabsContent testId="tabs-panel-overview" value="overview">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            overview panel
          </text>
        </TabsContent>
        <TabsContent testId="tabs-panel-reports" value="reports">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            reports panel
          </text>
        </TabsContent>
        <TabsContent testId="tabs-panel-settings" value="settings">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            settings panel
          </text>
        </TabsContent>
        <TabsContent testId="tabs-panel-archive" value="archive">
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            archive panel
          </text>
        </TabsContent>
      </Tabs>
      <text
        testId="tabs-focus-readout"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`focuses=${focuses}`}
      </text>
      <text
        testId="tabs-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`value=${value} changes=${changes}`}
      </text>
    </div>
  );
};

/**
 * The shipped `Slider` from `@gpuixui/primitives`: a controlled value, a
 * readout, and a second disabled track beside it.
 *
 * The readout carries `centred` so a press in the middle of the track is an
 * exact check without parsing a number: the hit-test has to turn the pointer's
 * x into a value near 50, which a wrapper that never read the track's box cannot
 * do.
 */
const SliderProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState(0);
  const [changes, setChanges] = useState(0);
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="slider-probe"
        style={{
          width: window.width,
          height: window.height,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Slider: a press positions it, the keys step it, a disabled
          track ignores both.
        </text>
        <div style={{ width: 400 }}>
          <Slider
            testId="slider"
            label="Volume"
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setChanges((count) => count + 1);
            }}
          />
        </div>
        <div style={{ width: 400 }}>
          <Slider
            testId="slider-disabled"
            label="Locked"
            value={value}
            disabled
          />
        </div>
        <text
          testId="slider-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`value=${value} changes=${changes} centred=${value > 45 && value < 55}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * What the runtime does with a press that leaves the element.
 *
 * GPUix captures the pointer on left mouse down **only** for an element that
 * listens to both `mouseDown` and `mouseMove` (`renderer.rs` arms
 * `capture_pointer` from that pair). A splitter, a drag handle and the shipped
 * `Slider` all qualify; a move-only element does not, and the element under the
 * pointer receives the moves instead. The probe mounts both cases and the
 * shipped `Slider`, then reads the counters back, because a drag control's
 * whole behaviour depends on this rule.
 */
const PointerCaptureProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [bothMoves, setBothMoves] = useState(0);
  const [bothUp, setBothUp] = useState(0);
  const [bothUnder, setBothUnder] = useState(0);
  const [moveMoves, setMoveMoves] = useState(0);
  const [moveUnder, setMoveUnder] = useState(0);
  const [value, setValue] = useState(0);
  const [changes, setChanges] = useState(0);
  const [range, setRange] = useState<readonly [number, number]>([10, 30]);
  const [rangeChanges, setRangeChanges] = useState(0);

  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="capture-probe"
        style={{
          width: window.width,
          height: window.height,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Press the 24px sample and drag 120px right: the element that took the
          press keeps the moves only when it listens to mouseDown and mouseMove.
        </text>
        <div style={{ display: "flex", height: 24 }}>
          <div
            testId="capture-both"
            style={{
              width: 24,
              height: 24,
              backgroundColor: theme.colors.primary,
            }}
            onMouseDown={() => {
              setBothMoves(0);
              setBothUp(0);
            }}
            onMouseMove={() => setBothMoves((count) => count + 1)}
            onMouseUp={() => setBothUp((count) => count + 1)}
          />
          <div
            testId="capture-both-under"
            style={{
              width: 400,
              height: 24,
              backgroundColor: theme.colors.muted,
            }}
            onMouseMove={() => setBothUnder((count) => count + 1)}
          />
        </div>
        <div style={{ display: "flex", height: 24 }}>
          <div
            testId="capture-move-only"
            style={{
              width: 24,
              height: 24,
              backgroundColor: theme.colors.primary,
            }}
            onMouseMove={() => setMoveMoves((count) => count + 1)}
          />
          <div
            testId="capture-move-under"
            style={{
              width: 400,
              height: 24,
              backgroundColor: theme.colors.muted,
            }}
            onMouseMove={() => setMoveUnder((count) => count + 1)}
          />
        </div>
        <div style={{ width: 400 }}>
          <Slider
            testId="capture-slider"
            label="Follows the pointer"
            value={value}
            onValueChange={(next) => {
              setValue(next);
              setChanges((count) => count + 1);
            }}
          />
        </div>
        <div style={{ width: 400 }}>
          <RangeSlider
            testId="capture-range"
            label="Range follows the pointer"
            value={range}
            onValueChange={(next) => {
              setRange(next);
              setRangeChanges((count) => count + 1);
            }}
          />
        </div>
        <text
          testId="capture-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`both=${bothMoves} bothUnder=${bothUnder} bothUp=${bothUp} move=${moveMoves} moveUnder=${moveUnder} slider=${value} sliderChanges=${changes} sliderFollowed=${value > 60 && changes >= 5} range=${range[0]}-${range[1]} rangeChanges=${rangeChanges} rangeFollowed=${range[1] > 30 && range[0] === 10}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * A cross-pane drag: an item in the left pane, dropped on the right one.
 *
 * The source records the press; the **drop target** resolves the travel and the
 * release. That split is forced by a measured window timing: the automation
 * protocol delivers the whole drag (press, eight moves, release) before React
 * commits the press's render, so a handler that gated on `dragging` **state**
 * saw `false` for every move and the drag never started. The pointer flag
 * therefore lives in a ref; the state only drives the readout.
 */
const DragProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [zone, setZone] = useState("left");
  const [leftMoves, setLeftMoves] = useState(0);
  const [rightMoves, setRightMoves] = useState(0);
  const [drops, setDrops] = useState(0);
  const [dragging, setDragging] = useState(false);
  // The protocol delivers the whole drag before React commits the press's
  // render, so a handler that gated on `dragging` state would see `false` for
  // every move and never count the gesture. The ref is the synchronous truth;
  // the state only drives the readout.
  const draggingRef = useRef(false);

  const pane = (side: "left" | "right", children?: ReactNode): ReactNode => (
    <div
      key={side}
      testId={`drag-${side}`}
      onMouseMove={() => {
        if (!draggingRef.current) return;
        if (side === "left") setLeftMoves((count) => count + 1);
        else setRightMoves((count) => count + 1);
      }}
      onMouseUp={() => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        setZone(side);
        setDrops((count) => count + 1);
        setDragging(false);
      }}
      style={{
        width: 300,
        height: 240,
        padding: theme.spacing.md,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.secondary,
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      testId="drag-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          height: 280,
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.lg,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.muted,
        }}
      >
        {pane(
          "left",
          <div
            testId="drag-item"
            onMouseDown={() => {
              draggingRef.current = true;
              setDragging(true);
            }}
            style={{
              width: 140,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.primary,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.primaryForeground,
              }}
            >
              Drag me
            </text>
          </div>,
        )}
        {pane("right")}
      </div>
      <text
        testId="drag-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`zone=${zone} leftMoves=${leftMoves} rightMoves=${rightMoves} drops=${drops} dragging=${dragging}`}
      </text>
    </div>
  );
};

/** The rows `drag-reorder` moves, in their declared order. */
const REORDER_ROWS = ["alpha", "bravo", "charlie", "delta"] as const;

/** One row's height, so a probe can aim at a row it read a box from. */
const REORDER_ROW_HEIGHT = 44;

/** What `drag-reorder`'s readout prints; one flat shape keeps a failure readable. */
interface ReorderReadout {
  readonly from: Option.Option<string>;
  readonly over: Option.Option<string>;
  readonly drops: number;
  readonly misses: number;
  readonly heard: number;
  readonly moves: number;
  readonly top: string;
}

const REORDER_START: ReorderReadout = {
  from: Option.none(),
  over: Option.none(),
  drops: 0,
  misses: 0,
  heard: 0,
  moves: 0,
  top: "none",
};

/** A row name, or `"none"`, so the readout reads the same either way. */
const nameOf = (value: Option.Option<string>): string =>
  Option.getOrElse(value, () => "none");

/**
 * What the topmost hit belongs to: a row of this list, another element, nothing.
 *
 * The distinction is the reason the drop rule looks past the first id: the
 * pointer is often over a painted child (a row's `<text>` label), which reads
 * `other` while the row beneath it is the target.
 */
const topOf = (
  hits: ReadonlyArray<number>,
  handles: ReadonlyArray<RowHandle<string>>,
): string =>
  Option.match(Arr.head(hits), {
    onNone: () => "none",
    onSome: (hit) =>
      Arr.some(handles, (handle) => handle.id === hit) ? "own" : "other",
  });

/**
 * One row in the reorder list: a press starts the drag, a move hit-tests the
 * pointer, and a release on the dragged row resolves the drop.
 *
 * The row registers its own native id — and nothing else: the hit test reports
 * its `<text>` label first, because a painted child sits above its parent, so
 * the drop rule has to walk past ids that are not the row.
 */
const ReorderRow = ({
  name,
  register,
  press,
  move,
  release,
}: {
  readonly name: string;
  readonly register: (handle: RowHandle<string>) => void;
  readonly press: (row: string) => void;
  readonly move: (event: EventPayload) => void;
  readonly release: (row: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const bind = useCallback(
    (instance: PublicInstance | null) => {
      if (instance) register({ id: instance.id, row: name });
    },
    [name, register],
  );
  return (
    <div
      testId={`row-${name}`}
      ref={bind}
      onMouseDown={() => press(name)}
      onMouseMove={move}
      onMouseUp={() => release(name)}
      style={{
        height: REORDER_ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: theme.spacing.md,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.card,
      }}
    >
      <text
        testId={`row-${name}-label`}
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {name}
      </text>
    </div>
  );
};

/**
 * A reorderable list whose rows capture the pointer, the other half of
 * `drag-between-panes`.
 *
 * A row that wants the travel after it leaves its box listens to `mouseDown`
 * and `mouseMove`, which makes the runtime capture the pointer: every move and
 * the release stay on the dragged row, so the row under the pointer hears
 * nothing. The drop is therefore resolved by the runtime's hit test
 * (`renderer.getElementsAt`) against the ids the rows registered from their
 * refs — the composition a tier-3 reorder, a file tree or a tab strip needs.
 */
const DragReorderProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const renderer = useGpuix().renderer;
  const [order, setOrder] = useState<ReadonlyArray<string>>(REORDER_ROWS);
  const [readout, setReadout] = useState(REORDER_START);
  const handles = useRef<ReadonlyArray<RowHandle<string>>>([]);
  const pressed = useRef<Option.Option<string>>(Option.none());
  const over = useRef<Option.Option<string>>(Option.none());

  const register = useCallback((handle: RowHandle<string>) => {
    handles.current = [
      ...Arr.filter(handles.current, (current) => current.id !== handle.id),
      handle,
    ];
  }, []);

  const press = useCallback((row: string) => {
    pressed.current = Option.some(row);
  }, []);

  const move = useCallback(
    (event: EventPayload) => {
      if (Option.isNone(pressed.current)) return;
      const hits = renderer?.getElementsAt?.(event.x ?? 0, event.y ?? 0) ?? [];
      const target = rowAt(hits, handles.current);
      over.current = target;
      setReadout((current) => ({
        ...current,
        over: target,
        moves: current.moves + 1,
        top: topOf(hits, handles.current),
      }));
    },
    [renderer],
  );

  const release = useCallback((row: string) => {
    const started = pressed.current;
    pressed.current = Option.none();
    if (Option.isNone(started)) return;
    // Another row heard a release while this list was being dragged: the
    // pointer was not captured, which is the runtime fact the probe reports.
    if (!Option.exists(started, (name) => name === row)) {
      setReadout((current) => ({ ...current, heard: current.heard + 1 }));
      return;
    }
    const target = over.current;
    over.current = Option.none();
    setReadout((current) => ({
      ...current,
      from: started,
      over: target,
      drops: Option.isSome(target) ? current.drops + 1 : current.drops,
      misses: Option.isNone(target) ? current.misses + 1 : current.misses,
    }));
    Option.match(target, {
      onNone: () => {},
      onSome: (name) =>
        setOrder((current) =>
          Option.match(
            Option.all([
              Arr.findFirstIndex(current, (candidate) => candidate === row),
              Arr.findFirstIndex(current, (candidate) => candidate === name),
            ]),
            {
              onNone: () => current,
              onSome: ([from, to]) => moveRow(current, from, to),
            },
          ),
        ),
    });
  }, []);

  return (
    <div
      testId="reorder-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Drag a row onto another: the dragged row keeps the pointer, so the drop
        is resolved by the runtime's hit test.
      </text>
      <div
        testId="reorder-list"
        style={{ width: 280, display: "flex", flexDirection: "column", gap: 6 }}
      >
        {order.map((name) => (
          <ReorderRow
            key={name}
            name={name}
            register={register}
            press={press}
            move={move}
            release={release}
          />
        ))}
      </div>
      <text
        testId="reorder-readout"
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {`order=${order.join(",")} from=${nameOf(readout.from)} over=${nameOf(
          readout.over,
        )} drops=${readout.drops} misses=${readout.misses} heard=${
          readout.heard
        } moves=${readout.moves} top=${readout.top}`}
      </text>
    </div>
  );
};

/**
 * The shipped `Dialog` from `@gpuixui/components`, with a readout of what its
 * `onOpenChange` reported.
 *
 * The readout is the proof the probe is not just seeing a painted box: React has
 * to have received both transitions, and the trigger has to be the opener that
 * gets focus back. The dialog is uncontrolled, so the component owns the state a
 * consumer would otherwise wire by hand.
 */
const DialogProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [opens, setOpens] = useState(0);
  const [closes, setCloses] = useState(0);
  return (
    <div
      testId="dialog-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Dialog: a press opens it, Escape and Close dismiss it.
        </text>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <Dialog
            onOpenChange={(open) => {
              if (open) setOpens((count) => count + 1);
              else setCloses((count) => count + 1);
            }}
          >
            <DialogTrigger testId="dialog-trigger">Open dialog</DialogTrigger>
            <DialogContent label="Delete project" testId="dialog-content">
              <DialogHeader>
                <DialogTitle>Delete this project?</DialogTitle>
                <DialogDescription>
                  The sample project cannot be restored.
                </DialogDescription>
              </DialogHeader>
              {/* Two focusable stops of our own, so the Tab trap's cycle is
                  addressable by testId. */}
              <div
                testId="dialog-field-a"
                tabIndex={0}
                aria-label="Project name"
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.muted,
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  Project name
                </text>
              </div>
              <div
                testId="dialog-field-b"
                tabIndex={0}
                aria-label="Owner"
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.muted,
                }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  Owner
                </text>
              </div>
              <DialogFooter>
                <DialogClose testId="dialog-confirm">Delete</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <text
          testId="dialog-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`opens=${opens} closes=${closes}`}
        </text>
      </div>
    </div>
  );
};

/**
 * The shipped `ConfirmDialog` with the probe playing the caller.
 *
 * The component reports a confirm and leaves the close to the app, so the
 * fixture owns `open` through `confirmFlow`: a confirm closes, a cancel closes
 * without reporting, and the readout carries every count the checks read.
 */
const ConfirmProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [flow, dispatch] = useReducer(confirmFlow, initialConfirmFlow);
  return (
    <div
      testId="confirm-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped ConfirmDialog: Cancel holds the focus, a confirm reports
          once, and the caller owns the close.
        </text>
        <Pressable testId={CONFIRM_OPENER} onClick={() => dispatch("open")}>
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            Delete workspace
          </text>
        </Pressable>
        <ConfirmDialog
          open={flow.open}
          onOpenChange={(next) => dispatch(next ? "open" : "cancel")}
          title="Delete workspace"
          description="The workspace and its 42 files are removed permanently."
          confirmLabel="Delete"
          onConfirm={() => dispatch("confirm")}
        />
        <Readout testId={CONFIRM_READOUT}>{confirmReadout(flow)}</Readout>
      </div>
    </div>
  );
};

/**
 * The shipped `Dialog` over a white page: the entry fade the presence seam
 * paints, as paint rather than bounds.
 *
 * A window reports no style, so a surface's opacity is only provable from the
 * pixel it paints on the way in. The probe reads one point inside the content's
 * own padding (where nothing but the surface is painted) partway through the
 * entry tween and again past it, and the reduce control swaps the motion
 * preference so the same probe measures the journey the timing removes.
 */
const SurfaceFadeProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [preference, setPreference] = useState<"animated" | "reduced">(
    "animated",
  );
  const [opens, setOpens] = useState(0);
  const [closes, setCloses] = useState(0);
  return (
    <div
      testId="fade-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: FADE_BACKING,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: theme.spacing.lg,
          top: theme.spacing.lg,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: theme.spacing.sm,
        }}
      >
        <Pressable
          testId="fade-reduce"
          onClick={() => setPreference("reduced")}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            Reduce motion
          </text>
        </Pressable>
        <MotionProvider preference={preference}>
          <Dialog
            onOpenChange={(open) => {
              if (open) setOpens((count) => count + 1);
              else setCloses((count) => count + 1);
            }}
          >
            <DialogTrigger testId="fade-trigger">Open dialog</DialogTrigger>
            <DialogContent label="Fade in" testId="fade-surface">
              <DialogHeader>
                <DialogTitle>Fade in</DialogTitle>
                <DialogDescription>
                  The surface enters on its own opacity, not on a cut.
                </DialogDescription>
              </DialogHeader>
              {/* Room for the surface to be read below the copy: the sampled
                  point is in the left padding, and a taller box keeps the
                  centre clear of the children's edges. */}
              <div style={{ height: 180 }} />
            </DialogContent>
          </Dialog>
        </MotionProvider>
        <Readout testId="fade-readout">
          {`opens=${opens} closes=${closes} preference=${preference}`}
        </Readout>
      </div>
    </div>
  );
};

/**
 * The shipped `Tooltip` from `@gpuixui/primitives`: one trigger, and a second
 * focusable element to move the pointer onto when the tip has to close.
 *
 * A tooltip has no state a caller can read, so the probe measures the tip the
 * way the runtime paints it: its **text** through `getPaintedText`, and its
 * **box** through the content's own `onLayout`. The automation tree does not
 * address a tooltip's layer by `testId` in a window (measured: the content
 * paints while `text tooltip-content` reports no locator), which is why the box
 * is published on a readout instead. The trigger sits low in the window on
 * purpose: the tip opens on its `side="top"` default, and a trigger near the top
 * would be clamped by the window edge instead of measuring the placement.
 */
const TOOLTIP_CONTENT = "Rename the file";

/** A painted box, as the runtime's own layout report gives it. */
interface Painted {
  readonly y: number;
  readonly height: number;
  readonly x: number;
  readonly width: number;
}

/** The fields an `onLayout` payload may carry; every one is optional. */
interface LayoutPayload {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}

/** A layout report as a box, or `None` while a field is missing. */
const boxOf = (payload: LayoutPayload): Option.Option<Painted> =>
  Option.map(
    Option.all([
      Option.fromNullishOr(payload.x),
      Option.fromNullishOr(payload.y),
      Option.fromNullishOr(payload.width),
      Option.fromNullishOr(payload.height),
    ]),
    ([x, y, width, height]) => ({ x, y, width, height }),
  );

const TooltipProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [enters, setEnters] = useState(0);
  const [leaves, setLeaves] = useState(0);
  const [tip, setTip] = useState<Option.Option<Painted>>(Option.none());
  const [anchor, setAnchor] = useState<Option.Option<Painted>>(Option.none());
  const above = Option.getOrElse(
    Option.flatMap(tip, (painted) =>
      Option.map(anchor, (box) => painted.y + painted.height <= box.y + 1),
    ),
    () => false,
  );
  const overlaps = Option.getOrElse(
    Option.flatMap(tip, (painted) =>
      Option.map(
        anchor,
        (box) =>
          painted.x < box.x + box.width && box.x < painted.x + painted.width,
      ),
    ),
    () => false,
  );
  const offset = (box: Option.Option<Painted>): string =>
    Option.match(box, {
      onNone: () => "none",
      onSome: (painted) => `${Math.round(painted.y)}`,
    });
  const target = (
    testId: string,
    label: string,
    pointer: {
      readonly onMouseEnter?: () => void;
      readonly onMouseLeave?: () => void;
      readonly onLayout?: (payload: LayoutPayload) => void;
    } = {},
  ): ReactNode => (
    <div
      testId={testId}
      tabIndex={0}
      aria-label={label}
      onMouseEnter={pointer.onMouseEnter}
      onMouseLeave={pointer.onMouseLeave}
      onLayout={pointer.onLayout}
      style={{
        width: 160,
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.card,
        ...keyboardFocusRing(theme),
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="tooltip-probe"
        style={{
          width: window.width,
          height: window.height,
          paddingTop: 220,
          paddingLeft: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Tooltip: a hover opens it above its trigger, and leaving
          or Escape closes it. A Tab traversal focuses the trigger without
          running its onFocus, so the tip stays closed.
        </text>
        <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
          <Tooltip
            content={
              <div onLayout={(payload) => setTip(boxOf(payload))}>
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  {TOOLTIP_CONTENT}
                </text>
              </div>
            }
          >
            {target("tooltip-trigger", "Hover me", {
              onMouseEnter: () => setEnters((count) => count + 1),
              onMouseLeave: () => setLeaves((count) => count + 1),
              onLayout: (payload) => setAnchor(boxOf(payload)),
            })}
          </Tooltip>
          {target("tooltip-away", "Leave here")}
        </div>
        <text
          testId="tooltip-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`enters=${enters} leaves=${leaves} above=${above} overlaps=${overlaps} tip=${offset(tip)} anchor=${offset(anchor)}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

/**
 * The shipped `DropdownMenu`: opened from the keyboard at its first row, moved
 * with the arrow keys, activated with Enter, and closed by a pointer press.
 *
 * A menu's highlight is real focus, so every step reads the renderer's focus id
 * rather than a painted colour: an arrow key that moved a highlight without
 * moving focus would fail here.
 */
const MenuProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [last, setLast] = useState("none");
  return (
    <div
      testId="menu-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped DropdownMenu: keyboard open, arrows, Enter and a press.
        </text>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <DropdownMenu>
            <DropdownMenuTrigger testId="menu-trigger">
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent label="File actions" testId="menu-content">
              <DropdownMenuItem
                testId="menu-rename"
                onSelect={() => setLast("rename")}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                testId="menu-delete"
                tone="destructive"
                onSelect={() => setLast("delete")}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <text
          testId="menu-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`last=${last}`}
        </text>
      </div>
    </div>
  );
};

/**
 * The shipped `ContextMenu`, with a sibling that is **not** its trigger.
 *
 * The context menu is the only overlay opened by a right press, so the probe
 * also mounts a neighbouring target: a right press there must open nothing, and
 * while the menu is open it must close it (the menu is scoped to its trigger).
 */
const ContextMenuProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [state, setState] = useState({
    opens: 0,
    closes: 0,
    last: "none",
  });
  return (
    <div
      testId="context-menu-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped ContextMenu: right-press the card, or press Shift+F10 on
          it.
        </text>
        <ContextMenu
          onOpenChange={(open) =>
            setState((current) => ({
              ...current,
              opens: current.opens + (open ? 1 : 0),
              closes: current.closes + (open ? 0 : 1),
            }))
          }
        >
          <ContextMenuTrigger
            testId="context-trigger"
            style={{ width: 320, height: 160 }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.cardForeground,
              }}
            >
              Right-press this card
            </text>
          </ContextMenuTrigger>
          <ContextMenuContent testId="context-menu" label="Item actions">
            <ContextMenuItem
              testId="context-rename"
              onSelect={() =>
                setState((current) => ({ ...current, last: "rename" }))
              }
            >
              Rename
            </ContextMenuItem>
            <ContextMenuItem
              testId="context-delete"
              onSelect={() =>
                setState((current) => ({ ...current, last: "delete" }))
              }
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <div
          testId="context-sibling"
          style={{
            width: 320,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            A sibling, not the trigger
          </text>
        </div>
        <text
          testId="context-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`opens=${state.opens} closes=${state.closes} last=${state.last}`}
        </text>
      </div>
    </div>
  );
};

/**
 * The runtime's `motion` measured on painted geometry.
 *
 * `motion` is the only animation the library has, and two inventory rows name
 * it — Tier 3's "expandable rows" (`motion` height) and Tier 4's "collapsible
 * sidebars" (`motion` width, an **outer clipping container** rather than an
 * inner reflow). Neither had been measured in a window: a `TestRenderer` frame
 * is not a run. The box animates height (and width, if the wrapper shrink-wraps
 * it), and holds a fixed-size child that must not be reflowed while the box is
 * smaller than the child.
 *
 * `testId` is not part of `MotionDivProps`, so the measured node is the plain
 * wrapper that shrink-wraps the animated box.
 */
const MotionProbe = (): ReactNode => {
  const theme = useTheme();
  const [grown, setGrown] = useState(false);
  const [completes, setCompletes] = useState(0);
  return (
    <div
      testId="motion-probe"
      style={{
        width: 720,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        motion: the box animates its height, and the child inside it keeps its
        own size.
      </text>
      <div
        testId="motion-toggle"
        role="button"
        tabIndex={0}
        onClick={() => setGrown((current) => !current)}
        style={{
          padding: theme.spacing.sm,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.muted,
          ...keyboardFocusRing(theme),
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {grown ? "shrink" : "grow"}
        </text>
      </div>
      <div
        testId="motion-box"
        style={{ display: "flex", flexDirection: "column" }}
      >
        <motion.div
          initial={{ width: 120, height: 40 }}
          animate={{ width: grown ? 240 : 120, height: grown ? 240 : 40 }}
          transition={{ duration: 3, ease: "easeInOut" }}
          onMotionComplete={() => setCompletes((current) => current + 1)}
          style={{
            overflow: "hidden",
            backgroundColor: theme.colors.primary,
          }}
        >
          <div
            testId="motion-child"
            style={{
              width: 320,
              height: 200,
              flexShrink: 0,
              backgroundColor: theme.colors.card,
            }}
          />
        </motion.div>
      </div>
      <text
        testId="motion-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`grown=${grown} completes=${completes}`}
      </text>
    </div>
  );
};

/** The panel a `useToast` caller lives in: one push control and a queue count. */
const ToastPanel = (): ReactNode => {
  const theme = useTheme();
  const toast = useToast();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row" }}>
        <PrimitiveThemeProvider theme={palettes.dark}>
          <Button
            testId="toast-push"
            onActivate={() =>
              toast.push({
                title: "Changes published",
                description: "The site rebuilds in about a minute.",
                tone: "success",
              })
            }
          >
            Publish
          </Button>
        </PrimitiveThemeProvider>
      </div>
      <text
        testId="toast-readout"
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`queued=${toast.toasts.length}`}
      </text>
    </div>
  );
};

/**
 * The shipped toast system: a press queues a toast into the viewport, and its
 * dismiss control removes it.
 *
 * The provider owns the store and its own `ManagedRuntime`, so this probe also
 * proves that an Effect-backed store runs inside a real window rather than only
 * under the test clock. The viewport is the last child, as its paint-order
 * contract requires.
 */
const ToastProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  return (
    <div
      testId="toast-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <ToastProvider>
        <div
          style={{
            width: 720,
            height: 360,
            padding: theme.spacing.xl,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            The shipped Toasts: a press queues one, its dismiss control removes
            it.
          </text>
          <ToastPanel />
        </div>
        <ToastViewport />
      </ToastProvider>
    </div>
  );
};

/**
 * The shipped `Popover` — a floating panel anchored to its trigger.
 *
 * Three popovers, because placement is three claims: the default one opens
 * below its trigger on the trigger's start edge, the second asks for `center`
 * (which the runtime centres on the containing block, so the component measures
 * and compensates), and the third sits where a panel below it would not fit.
 */
const PopoverProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [presses, setPresses] = useState(0);
  return (
    <div
      testId="popover-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped Popover: where it opens, and how it leaves.
        </text>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.xl,
            alignItems: "flex-start",
          }}
        >
          <Popover>
            <PopoverTrigger testId="popover-trigger">Filters</PopoverTrigger>
            <PopoverContent testId="popover-panel">
              <text testId="popover-panel-text">Visible columns</text>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger testId="popover-center-trigger">
              Centred
            </PopoverTrigger>
            <PopoverContent testId="popover-center-panel" align="center">
              <text>Centred on the trigger</text>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* Top-right, where no panel below a trigger can cover it: a press that
          lands on a panel is an inside press, so the outside-press check needs
          a target the panels cannot reach. */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: 40,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <PrimitiveThemeProvider theme={palettes.dark}>
          <Button
            testId="popover-elsewhere"
            onActivate={() => setPresses((n) => n + 1)}
          >
            Elsewhere
          </Button>
        </PrimitiveThemeProvider>
        <text
          testId="popover-elsewhere-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`presses=${presses}`}
        </text>
      </div>
      {/* Low in the window, with a panel too tall to fit below the trigger.
          The wrapper is a child of the root on purpose: an absolute element
          resolves against its **direct** parent, so it has to be the root for
          `bottom` to mean the bottom of the window. */}
      <div
        style={{
          position: "absolute",
          left: 40,
          bottom: 40,
        }}
      >
        <Popover>
          <PopoverTrigger testId="popover-low-trigger">Low</PopoverTrigger>
          <PopoverContent testId="popover-low-panel" style={{ height: 220 }}>
            <text>Above the trigger</text>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

/**
 * Measures the shipped popover's placement and its dismissal rules in a window.
 *
 * The placement claims are the ones the runtime got wrong: `align="center"` ends
 * the panel on the trigger's centre line, and a snapped panel near the window
 * edge lands **on** its trigger instead of flipping. The component measures both
 * and compensates, so the checks here are about the compensation, in the
 * runtime the compensation was tuned for.
 */
const popoverSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** Whether `testId` is absent from the window's tree, once it settles. */
    const unpainted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> => settleGone(ctx, testId);

    yield* ctx.host.waitFor("popover-trigger");

    // The default placement: below the trigger, on its start edge, one gap down.
    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    const trigger = yield* paintedBox(ctx, "popover-trigger");
    const panel = yield* paintedBox(ctx, "popover-panel");
    // The panel enters with a few pixels of travel on its entry axis, so the
    // gap is read at rest: a mid-tween read reported `0.5` for `6`.
    const panelY = yield* settleNumber(boxAxis("y")(ctx, "popover-panel"));
    yield* ctx.expectEqual(
      "the panel opens below its trigger",
      panelY >= trigger.y + trigger.height,
      true,
    );
    yield* ctx.expectNear(
      "the panel starts at the trigger's start edge",
      panel.x,
      trigger.x,
      1,
    );
    yield* ctx.expectNear(
      "the panel keeps the measured gap below the trigger",
      panelY - (trigger.y + trigger.height),
      6,
      1,
    );
    yield* ctx.host.capture("popover-open");

    // `center`, which the runtime centres on the containing block.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-center-trigger");
    yield* Effect.sleep(SETTLE);
    const centreTrigger = yield* paintedBox(ctx, "popover-center-trigger");
    const centrePanel = yield* paintedBox(ctx, "popover-center-panel");
    yield* ctx.expectNear(
      "a centred panel is centred on its trigger",
      centrePanel.x + centrePanel.width / 2,
      centreTrigger.x + centreTrigger.width / 2,
      1,
    );
    yield* ctx.host.capture("popover-centred");

    // A trigger with no room below it.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-low-trigger");
    yield* Effect.sleep(SETTLE);
    const lowTrigger = yield* paintedBox(ctx, "popover-low-trigger");
    const lowPanel = yield* paintedBox(ctx, "popover-low-panel");
    yield* ctx.expectEqual(
      "a panel with no room below opens above its trigger",
      lowPanel.y + lowPanel.height <= lowTrigger.y,
      true,
    );
    yield* ctx.host.capture("popover-flipped");
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape gives the focus back to the trigger that opened it",
      yield* focusedAfterPaint(ctx),
      "popover-low-trigger",
    );

    // The dismissal rules, on the first popover.
    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape dismisses the panel",
      yield* unpainted("popover-panel"),
      true,
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "popover-trigger",
    );

    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-elsewhere");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the outside press reaches the control it landed on",
      yield* ctx.host.text("popover-elsewhere-readout"),
      "presses=1",
    );
    yield* ctx.expectEqual(
      "a press outside dismisses the panel",
      yield* unpainted("popover-panel"),
      true,
    );

    yield* ctx.host.click("popover-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("popover-panel-text");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press inside the panel leaves it open",
      yield* settlePainted(ctx, "popover-panel"),
      true,
    );
  });

/**
 * The shipped `CommandMenu` — the Tier 4 command palette — over four actions.
 *
 * The palette is controlled and has no trigger part: the application opens it
 * from a shortcut or from its own control, so the probe's button stands in for
 * that shortcut. The readout is React's report of what ran, which is the
 * difference between a highlighted row and an executed one.
 *
 * The fourth action is disabled: it paints, and it runs nothing — the
 * difference a menu with only enabled rows cannot show.
 */
const CommandPaletteProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState("none");
  const [runs, setRuns] = useState(0);
  const record = (id: string) => () => {
    setRan(id);
    setRuns((count) => count + 1);
  };

  const actions: ReadonlyArray<CommandAction> = [
    {
      id: "new-file",
      label: "New File",
      group: "File",
      shortcut: "⌘N",
      perform: record("new-file"),
    },
    {
      id: "open-settings",
      label: "Open Settings",
      group: "File",
      shortcut: "⌘,",
      perform: record("open-settings"),
    },
    {
      id: "theme",
      label: "Toggle Theme",
      group: "View",
      perform: record("theme"),
    },
    {
      id: "zoom",
      label: "Reset Zoom",
      group: "View",
      disabled: true,
      perform: record("zoom"),
    },
  ];
  return (
    <div
      testId="command-palette-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The shipped CommandMenu: typing filters, the highlight is not focus,
          and Enter runs the row.
        </text>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div
            testId="palette-trigger"
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            style={{
              paddingTop: theme.spacing.sm,
              paddingBottom: theme.spacing.sm,
              paddingLeft: theme.spacing.lg,
              paddingRight: theme.spacing.lg,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.primary,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.primaryForeground,
              }}
            >
              Open palette
            </text>
          </div>
        </div>
        <text
          testId="palette-readout"
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`ran=${ran} runs=${runs}`}
        </text>
      </div>
      <CommandMenu open={open} onOpenChange={setOpen} actions={actions}>
        <CommandMenuInput placeholder="Type a command…" />
        <CommandMenuList testId="command-list" />
        <CommandMenuEmpty />
      </CommandMenu>
    </div>
  );
};

/** What a probe module supplies; the registry supplies the metadata. */
export interface LiveProbeBody {
  readonly id: LiveProbeId;
  /**
   * The faces the runner installs with `registerFonts` before the probe's first
   * paint, in the documented order: a family the runtime did not know when the
   * text was laid out has already fallen back.
   */
  readonly fonts?: ReadonlyArray<FontSource>;
  readonly view: () => ReactNode;
  readonly steps: Smoke.AsyncSmokeScenario["steps"];
}

/** The focused `testId`, with `"none"` for no focus so a failure reads clearly. */
const focusedId = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.focused(), (id) =>
    Option.getOrElse(Option.fromNullishOr(id), () => "none"),
  );

/** How many pixels of the capture under `name` paint exactly `colour`. */
const paintedPixels = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Pixels.Rgba,
): Effect.Effect<number, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.pixels(name), (frame) =>
    Pixels.countColour(frame, colour),
  );

const focusedAfterPaint = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<string, Smoke.SmokeHostError> =>
  Effect.flatMap(Effect.sleep(SETTLE), () => focusedId(ctx));

const focusVisibleSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("focus-visible-probe");
    const ring = yield* ctx.expectSome(
      "the theme names a ring colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.ring)),
    );

    // 1. A mouse press focuses the element; `focusVisible` must not paint.
    yield* ctx.host.click("press-ring");
    yield* ctx.expectEqual(
      "a press focuses the element",
      yield* focusedAfterPaint(ctx),
      "press-ring",
    );
    yield* ctx.host.capture("press");
    yield* ctx.expectEqual(
      "a press paints no focus ring",
      yield* paintedPixels(ctx, "press", ring),
      0,
    );

    // 2. Native traversal (`window.focus_next`) before any key is delivered:
    //    a traversal is not keyboard input, so the ring must stay off.
    yield* ctx.host.focusNext();
    yield* ctx.expectEqual(
      "native traversal moves focus",
      yield* focusedAfterPaint(ctx),
      "tab-ring",
    );
    yield* ctx.host.capture("traversal-before-keyboard");
    yield* ctx.expectEqual(
      "traversal before a key paints no focus ring",
      yield* paintedPixels(ctx, "traversal-before-keyboard", ring),
      0,
    );

    // 3. Programmatic focus, still before any key: same expected null ring.
    yield* ctx.host.focusElement("programmatic-ring");
    yield* ctx.expectEqual(
      "programmatic focus moves native focus",
      yield* focusedAfterPaint(ctx),
      "programmatic-ring",
    );
    yield* ctx.host.capture("programmatic-before-keyboard");
    yield* ctx.expectEqual(
      "programmatic focus before a key paints no focus ring",
      yield* paintedPixels(ctx, "programmatic-before-keyboard", ring),
      0,
    );

    // 4. Tab traverses natively and is the keyboard-input case the ring is
    //    meant for. Focus wraps from the last sample to the first.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab traverses natively and wraps",
      yield* focusedAfterPaint(ctx),
      "press-ring",
    );
    yield* ctx.host.capture("tab");
    yield* ctx.expectEqual(
      "Tab paints the focus ring",
      (yield* paintedPixels(ctx, "tab", ring)) > 0,
      true,
    );

    // 5. Programmatic focus after keyboard input has happened: does the ring
    //    persist, or is it tied to the input that caused the focus?
    yield* ctx.host.focusElement("programmatic-ring");
    yield* ctx.expectEqual(
      "programmatic focus moves native focus after Tab",
      yield* focusedAfterPaint(ctx),
      "programmatic-ring",
    );
    yield* ctx.host.capture("programmatic-after-keyboard");
    yield* ctx.expectEqual(
      "programmatic focus after a key paints the focus ring",
      (yield* paintedPixels(ctx, "programmatic-after-keyboard", ring)) > 0,
      true,
    );
  });

/** A box as one comparable scalar, so a moved control names its new box. */
const boxText = (box: Smoke.Bounds): string =>
  `${box.x},${box.y},${box.width},${box.height}`;

/**
 * The colour at `point`, failing by name when the point is outside the capture.
 *
 * A missing sample is not a mismatch: a probe that reads `None` cannot tell a
 * gap from a frame that cropped the control, so the read is its own check.
 */
const colourAtPoint = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  point: Point,
  scale: number,
  label: string,
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(label, colourAt(frame, point, scale));

/** Whether `sample` is the paint `expected` within the frame's tolerance. */
const expectPaint = (
  ctx: Smoke.AsyncSmokeContext,
  label: string,
  sample: Pixels.Rgba,
  expected: Pixels.Rgba,
): Effect.Effect<void, Smoke.SmokeAssertionError> =>
  ctx.expectEqual(label, differs(sample, expected), false);

const focusRingOffsetSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("focus-ring-offset-probe");
    const theme = palettes.dark;
    const ring = yield* ctx.expectSome(
      "the theme names a ring colour",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.ring)),
    );
    const page = yield* ctx.expectSome(
      "the theme names the page fill",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.background)),
    );
    const line = theme.borderWidth.strong;

    const flushBefore = yield* paintedBox(ctx, "ring-flush");
    const offsetBefore = yield* paintedBox(ctx, "ring-offset");
    const neighbourBefore = yield* paintedBox(ctx, "ring-neighbour");

    const window = yield* ctx.host.windowSize();
    yield* ctx.host.capture("ring-offset-rest");
    const rest = yield* ctx.host.pixels("ring-offset-rest");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(rest, window),
    );
    const restBand = yield* colourAtPoint(
      ctx,
      rest,
      bandPoint(offsetBefore, RING_OFFSET, line),
      scale,
      "the rest frame holds the band the offset ring will paint",
    );
    yield* expectPaint(
      ctx,
      "a control at rest paints no outline outside its box",
      restBand,
      page,
    );

    // A press focuses the flush sample without entering keyboard mode, then Tab
    // walks to the offset sample and paints only its ring.
    yield* ctx.host.click("ring-flush");
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab carries focus to the offset control",
      yield* focusedAfterPaint(ctx),
      "ring-offset",
    );
    yield* ctx.host.capture("ring-offset");
    const offsetFrame = yield* ctx.host.pixels("ring-offset");

    yield* ctx.expectEqual(
      "the offset control paints a ring",
      (yield* paintedPixels(ctx, "ring-offset", ring)) > 0,
      true,
    );
    yield* expectPaint(
      ctx,
      "the ring is painted in the middle of the band the offset names",
      yield* colourAtPoint(
        ctx,
        offsetFrame,
        bandPoint(offsetBefore, RING_OFFSET, line),
        scale,
        "the offset frame holds the ring's band",
      ),
      ring,
    );
    yield* expectPaint(
      ctx,
      "the page shows through the gap between the box and the ring",
      yield* colourAtPoint(
        ctx,
        offsetFrame,
        leftOf(offsetBefore, RING_OFFSET / 2),
        scale,
        "the offset frame holds the gap",
      ),
      page,
    );
    yield* expectPaint(
      ctx,
      "the offset ring paints nothing beyond the band it names",
      yield* colourAtPoint(
        ctx,
        offsetFrame,
        leftOf(offsetBefore, RING_OFFSET + line + 2),
        scale,
        "the offset frame holds the point beyond the band",
      ),
      page,
    );

    // The outline is a paint, not layout: the focused control and its sibling
    // report the same boxes as before the ring appeared.
    yield* ctx.expectEqual(
      "the ring does not move the control it surrounds",
      boxText(yield* paintedBox(ctx, "ring-offset")),
      boxText(offsetBefore),
    );
    yield* ctx.expectEqual(
      "the ring takes no space in the layout beside the control",
      boxText(yield* paintedBox(ctx, "ring-neighbour")),
      boxText(neighbourBefore),
    );

    // Tab wraps to the flush sample: the same outline at offset 0 sits on the
    // border box, so the points the offset ring painted swap their paint.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab wraps to the flush control",
      yield* focusedAfterPaint(ctx),
      "ring-flush",
    );
    yield* ctx.host.capture("ring-flush");
    yield* ctx.expectEqual(
      "the flush control paints a ring",
      (yield* paintedPixels(ctx, "ring-flush", ring)) > 0,
      true,
    );
    yield* expectPaint(
      ctx,
      "a flush ring is painted on the control's own edge",
      yield* colourAtPoint(
        ctx,
        yield* ctx.host.pixels("ring-flush"),
        bandPoint(flushBefore, 0, line),
        scale,
        "the flush frame holds the ring's band",
      ),
      ring,
    );
    yield* expectPaint(
      ctx,
      "a flush ring leaves the page where the offset ring would paint",
      yield* colourAtPoint(
        ctx,
        yield* ctx.host.pixels("ring-flush"),
        bandPoint(flushBefore, RING_OFFSET, line),
        scale,
        "the flush frame holds the point the offset band would use",
      ),
      page,
    );
    yield* ctx.expectEqual(
      "the flush ring does not move its own control",
      boxText(yield* paintedBox(ctx, "ring-flush")),
      boxText(flushBefore),
    );
  });

const actionRingSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(ACTION_RING_PROBE);
    const theme = palettes.dark;
    const line = theme.borderWidth.strong;
    const offset = keyboardFocusRing(theme).focusVisible.outlineOffset;
    const ring = yield* ctx.expectSome(
      "the theme names a ring colour",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.ring)),
    );
    const page = yield* ctx.expectSome(
      "the theme names the page fill",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.background)),
    );
    const primaryFill = yield* ctx.expectSome(
      "the theme names the primary fill",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.primary)),
    );
    const dangerFill = yield* ctx.expectSome(
      "the theme names the destructive fill",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.destructive)),
    );

    const primaryBefore = yield* paintedBox(ctx, ACTION_RING_PRIMARY);
    const dangerBefore = yield* paintedBox(ctx, ACTION_RING_DANGER);
    const neighbourBefore = yield* paintedBox(ctx, ACTION_RING_NEIGHBOUR);

    const window = yield* ctx.host.windowSize();
    yield* ctx.host.capture("action-ring-rest");
    const rest = yield* ctx.host.pixels("action-ring-rest");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(rest, window),
    );

    // At rest nothing declares the ring's paint; the band is the page.
    yield* expectPaint(
      ctx,
      "a filled action at rest paints no ring outside its box",
      yield* colourAtPoint(
        ctx,
        rest,
        bandPoint(primaryBefore, offset, line),
        scale,
        "the rest frame holds the band the ring will paint",
      ),
      page,
    );
    yield* ctx.expectEqual(
      "the fill is the role a flush ring would be drawn in",
      differs(primaryFill, ring),
      false,
    );

    // The pointer path: a press focuses the action and `focusVisible` stays off,
    // so the band is still the page and the fill is untouched.
    yield* ctx.host.click(ACTION_RING_PRIMARY);
    yield* ctx.expectEqual(
      "a press focuses the filled action",
      yield* focusedAfterPaint(ctx),
      ACTION_RING_PRIMARY,
    );
    yield* ctx.host.capture("action-ring-press");
    yield* ctx.expectEqual(
      "a press paints no ring on a filled action",
      yield* paintedPixels(ctx, "action-ring-press", ring),
      0,
    );
    yield* expectPaint(
      ctx,
      "a pressed filled action answers the pointer with its derived hover fill",
      yield* colourAtPoint(
        ctx,
        yield* ctx.host.pixels("action-ring-press"),
        insidePoint(primaryBefore, 2),
        scale,
        "the press frame holds the action's fill",
      ),
      yield* ctx.expectSome(
        "the theme derives a hover fill for the primary action",
        Option.fromNullishOr(Pixels.hexToRgba(filledHover(theme, "primary"))),
      ),
    );

    // Move the pointer off the actions so the keyboard path reads their resting
    // fills: a hovered action paints its derived hover, not the role its ring
    // shares.
    yield* ctx.host.hover(ACTION_RING_NEIGHBOUR);
    yield* Effect.sleep(SETTLE);

    // Tab is the keyboard path the ring exists for. It walks to the danger
    // action: its ring is on the page, one strong-border gap out, and the fill
    // inside the box is still the fill.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab carries focus to the second filled action",
      yield* focusedAfterPaint(ctx),
      ACTION_RING_DANGER,
    );
    yield* ctx.host.capture("action-ring-danger");
    const dangerFrame = yield* ctx.host.pixels("action-ring-danger");
    yield* ctx.expectEqual(
      "the focused filled action paints a ring",
      (yield* paintedPixels(ctx, "action-ring-danger", ring)) > 0,
      true,
    );
    yield* expectPaint(
      ctx,
      "the ring is painted in the middle of the band the offset names",
      yield* colourAtPoint(
        ctx,
        dangerFrame,
        bandPoint(dangerBefore, offset, line),
        scale,
        "the danger frame holds the ring's band",
      ),
      ring,
    );
    yield* expectPaint(
      ctx,
      "the page shows through the gap between the fill and the ring",
      yield* colourAtPoint(
        ctx,
        dangerFrame,
        leftOf(dangerBefore, offset / 2),
        scale,
        "the danger frame holds the gap",
      ),
      page,
    );
    yield* expectPaint(
      ctx,
      "the ring is outside the action's own fill, not on its edge",
      yield* colourAtPoint(
        ctx,
        dangerFrame,
        insidePoint(dangerBefore, 2),
        scale,
        "the danger frame holds the fill inside the box",
      ),
      dangerFill,
    );
    yield* expectPaint(
      ctx,
      "the ring paints nothing beyond the band it names",
      yield* colourAtPoint(
        ctx,
        dangerFrame,
        leftOf(dangerBefore, offset + line + 2),
        scale,
        "the danger frame holds the point beyond the band",
      ),
      page,
    );

    // Back on the primary action — the case the gap exists for, because its fill
    // *is* the ring role. The separation is the page showing between them.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab returns to the primary action",
      yield* focusedAfterPaint(ctx),
      ACTION_RING_PRIMARY,
    );
    yield* ctx.host.capture("action-ring-primary");
    const primaryFrame = yield* ctx.host.pixels("action-ring-primary");
    yield* expectPaint(
      ctx,
      "a brand-filled action paints the ring and its own fill as the same role",
      yield* colourAtPoint(
        ctx,
        primaryFrame,
        bandPoint(primaryBefore, offset, line),
        scale,
        "the primary frame holds the ring's band",
      ),
      ring,
    );
    yield* expectPaint(
      ctx,
      "the page gap is the only separation between the ring and that fill",
      yield* colourAtPoint(
        ctx,
        primaryFrame,
        leftOf(primaryBefore, offset / 2),
        scale,
        "the primary frame holds the gap",
      ),
      page,
    );
    yield* expectPaint(
      ctx,
      "the brand fill is painted unchanged inside the ring",
      yield* colourAtPoint(
        ctx,
        primaryFrame,
        insidePoint(primaryBefore, 2),
        scale,
        "the primary frame holds its fill",
      ),
      primaryFill,
    );

    // The outline is a paint, not layout: both actions and the sibling keep the
    // boxes they had before the rings appeared.
    yield* ctx.expectEqual(
      "the ring does not move the action it surrounds",
      boxText(yield* paintedBox(ctx, ACTION_RING_PRIMARY)),
      boxText(primaryBefore),
    );
    yield* ctx.expectEqual(
      "the ring does not move the other action",
      boxText(yield* paintedBox(ctx, ACTION_RING_DANGER)),
      boxText(dangerBefore),
    );
    yield* ctx.expectEqual(
      "the ring takes no space in the layout beside the action",
      boxText(yield* paintedBox(ctx, ACTION_RING_NEIGHBOUR)),
      boxText(neighbourBefore),
    );
  });

/**
 * Whether two coordinates name the same point to within a rounding point.
 *
 * The window reports whole points while a centre is a box plus half a side, so
 * an exact comparison would fail on the arithmetic rather than on the paint.
 */
const nearPoint = (left: number, right: number): boolean =>
  Math.abs(left - right) <= 1;

const surfaceOriginSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(SURFACE_ORIGIN_PROBE);

    const readout = Effect.flatMap(
      ctx.host.text(SURFACE_ORIGIN_READOUT),
      (text) => Effect.succeed(decodeReadout(text)),
    );
    /** The readout once it decodes and holds, or the last line it rendered. */
    const settled = (holds: (readout: SurfaceReadout) => boolean) =>
      settleUntil(readout, (value) =>
        Option.match(value, { onNone: () => false, onSome: holds }),
      );
    const at = (value: Option.Option<SurfaceReadout>, label: string) =>
      ctx.expectSome(label, value);

    // A pointer read at rest: the probe reports the origin the surface itself
    // reports, so the two agree before anything moves.
    yield* ctx.host.hover(SURFACE_ORIGIN_TARGET);
    const rest = yield* at(
      yield* settled((value) => value.surface >= 1 && value.probe >= 1),
      "the surface and its probe report a box at rest",
    );
    yield* ctx.expectEqual(
      "the probe starts at the origin the surface reports",
      rest.originY,
      rest.reportedY,
    );
    yield* ctx.expectEqual(
      "one layout report each at rest",
      `${rest.surface},${rest.probe > 0}`,
      "1,true",
    );
    yield* ctx.host.capture("surface-origin-rest");
    const restLocal = localPoint(
      { x: rest.originX, y: rest.originY },
      { x: rest.pointX, y: rest.pointY },
    );

    // Opening a panel above the surface moves it without resizing it. The
    // runtime reports a layout on a size change, so the surface's own report —
    // the box a pointer surface would keep — does not move with it.
    yield* ctx.host.click(SURFACE_ORIGIN_MOVE);
    const moved = yield* at(
      yield* settled((value) => value.pad === MOVED_BY),
      "the panel above the surface is open",
    );
    yield* ctx.expectEqual(
      "a moved surface delivers no layout report of its own",
      moved.surface,
      rest.surface,
    );
    yield* ctx.expectEqual(
      "the surface's own report still names the old origin",
      moved.reportedY,
      rest.reportedY,
    );
    yield* ctx.host.capture("surface-origin-moved");

    // The pointer read that follows is what a surface asks for a fresh origin
    // with: the probe's width changes, so the runtime lays the probe out again
    // and its report carries the origin the surface has now.
    yield* ctx.host.hover(SURFACE_ORIGIN_TARGET);
    const after = yield* at(
      yield* settled(
        (value) =>
          value.probe > moved.probe &&
          nearPoint(value.pointY, rest.pointY + MOVED_BY),
      ),
      "the probe reports after the move, and the pointer is on the surface",
    );

    yield* ctx.host.capture("surface-origin-fresh");

    // The pointer payload is fresh: it moved with the surface.
    yield* ctx.expectEqual(
      "the pointer's own point moves with the surface",
      nearPoint(after.pointY - rest.pointY, MOVED_BY),
      true,
    );

    // The probe's report is fresh too, which is the whole repair.
    yield* ctx.expectEqual(
      "the nudged probe reports the origin the surface has now",
      nearPoint(after.originY - rest.originY, MOVED_BY),
      true,
    );
    yield* ctx.expectEqual(
      "the surface's own report is still the stale one",
      nearPoint(after.originY - after.reportedY, MOVED_BY),
      true,
    );

    // Reading the fresh point against the fresh origin is the same local point
    // as at rest; reading it against the surface's own report is a local point
    // a panel's height too far down, which is the defect the repair removes.
    const afterLocal = localPoint(
      { x: after.originX, y: after.originY },
      { x: after.pointX, y: after.pointY },
    );
    const staleLocal = localPoint(
      { x: after.reportedX, y: after.reportedY },
      { x: after.pointX, y: after.pointY },
    );
    yield* ctx.expectEqual(
      "a fresh point read against the fresh origin is the same local point",
      `${nearPoint(afterLocal.x, restLocal.x)},${nearPoint(afterLocal.y, restLocal.y)}`,
      "true,true",
    );
    yield* ctx.expectEqual(
      "the surface's own report would read the point a panel too far down",
      nearPoint(staleLocal.y - restLocal.y, MOVED_BY),
      true,
    );

    // The repair is a paint: the probe is one pixel wide, and neither the move
    // nor the pointer read resized the surface.
    const nudge = yield* ctx.expectSome(
      "the probe paints a box",
      Option.fromNullishOr(yield* ctx.host.bounds(SURFACE_ORIGIN_NUDGE)),
    );
    yield* ctx.expectEqual(
      "the probe takes one point of the layout, at most",
      nudge.width <= 2 && nudge.height <= 1,
      true,
    );
    yield* ctx.expectEqual(
      "neither the move nor the pointer read resized the surface",
      after.surface,
      rest.surface,
    );
  });

/** How many pixels paint the theme's `muted` fill in the capture under `name`. */
const mutedPixels = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
): Effect.Effect<number, Smoke.SmokeHostError | Smoke.SmokeAssertionError> =>
  Effect.gen(function* () {
    const muted = yield* ctx.expectSome(
      "the theme names a muted colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.muted)),
    );
    return yield* paintedPixels(ctx, name, muted);
  });

const focusDimSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("focus-dim-probe");

    // A pointer press focuses a sample without entering keyboard mode, so every
    // fill is at full strength: this is the baseline the dimming is measured
    // against.
    yield* ctx.host.click("dim-first");
    yield* ctx.expectEqual(
      "a press focuses the first sample",
      yield* focusedAfterPaint(ctx),
      "dim-first",
    );
    yield* ctx.host.capture("pointer");
    const plain = yield* mutedPixels(ctx, "pointer");

    // The same three fills after Tab: the focused sample keeps its fill, the
    // dimmed one loses it, and the opted-out one must keep its own.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab focuses the second sample",
      yield* focusedAfterPaint(ctx),
      "dim-second",
    );
    yield* ctx.host.capture("keyboard");
    const dimmed = yield* mutedPixels(ctx, "keyboard");

    yield* ctx.expectEqual("some fills are painted at rest", plain > 0, true);
    yield* ctx.expectEqual(
      "the runtime dims another focusable while one has keyboard focus",
      dimmed < plain,
      true,
    );
    // One sample dims (the first) and one opts out (the third), so the drop is
    // about a third. A whole-window dim would take far more than half.
    yield* ctx.expectEqual(
      "only the default sample dims, not the opted-out one",
      dimmed > plain / 2,
      true,
    );
  });

/** The dark theme's `role` colour, failing by name when it cannot be painted. */
const themeColour = (
  ctx: Smoke.AsyncSmokeContext,
  role: keyof Theme["colors"],
): Effect.Effect<Pixels.Rgba, Smoke.SmokeAssertionError> =>
  ctx.expectSome(
    `the dark theme names its ${role} colour`,
    Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors[role])),
  );

const filledActionDimSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("filled-action-dim-probe");
    const secondary = yield* themeColour(ctx, "secondary");
    const success = yield* themeColour(ctx, "success");
    const destructive = yield* themeColour(ctx, "destructive");

    // A pointer press focuses the fourth action without entering keyboard mode,
    // and leaves the pointer on it, so no measured action is hovered: the
    // baseline is every fill at full strength.
    yield* ctx.host.click("dim-focus");
    yield* ctx.expectEqual(
      "a press focuses the action the dim is measured against",
      yield* focusedAfterPaint(ctx),
      "dim-focus",
    );
    yield* ctx.host.capture("pointer");
    const filled = yield* paintedPixels(ctx, "pointer", secondary);
    const ghost = yield* paintedPixels(ctx, "pointer", success);
    const forced = yield* paintedPixels(ctx, "pointer", destructive);
    yield* ctx.expectEqual(
      "a filled action paints its fill at rest",
      filled > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a ghost action paints its label at rest",
      ghost > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the action forced into the cue paints its fill at rest",
      forced > 0,
      true,
    );

    // Four tab stops in tree order. The first Tab puts the window in keyboard
    // mode, and the fourth lands the focus back on the action it started from —
    // so both captures have the same focus and pointer position, and only the
    // dim differs.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab enters the actions at the first one",
      yield* focusedAfterPaint(ctx),
      "dim-filled",
    );
    yield* ctx.host.key("tab");
    yield* ctx.host.key("tab");
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab returns to the action the dim is measured against",
      yield* focusedAfterPaint(ctx),
      "dim-focus",
    );
    yield* ctx.host.capture("keyboard");

    yield* ctx.expectEqual(
      "a filled action keeps every pixel of its fill",
      yield* paintedPixels(ctx, "keyboard", secondary),
      filled,
    );
    yield* ctx.expectEqual(
      "a ghost action's label is dimmed away",
      yield* paintedPixels(ctx, "keyboard", success),
      0,
    );
    yield* ctx.expectEqual(
      "forcing a filled action into the cue dims its fill",
      yield* paintedPixels(ctx, "keyboard", destructive),
      0,
    );
  });

/** The painted width of `testId`, failing by name when the runtime omitted it. */
const paintedWidth = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<number, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const bounds = yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
    return bounds.width;
  });

/** The placement gap every layer in `floating-sides` uses. */
const GAP = 6;

/**
 * Waits until `testId` stops painting, and reports whether it did.
 *
 * A dismissal is a transition, not an instant: the shipped surfaces stay mounted
 * for their exit tween, so `bounds` still answers for a few hundred milliseconds
 * after Escape. Polling the settled state keeps the check about the dismissal
 * rather than about the tween's duration.
 */
const settleGone = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  settleUntil(
    Effect.map(ctx.host.bounds(testId), (bounds) =>
      Option.isNone(Option.fromNullishOr(bounds)),
    ),
    (gone) => gone,
  );

/**
 * Waits until `testId` paints, and reports whether it did.
 *
 * The mirror of {@link settleGone} for a check that expects a surface to
 * survive its input: polling for the painted state stops as soon as the frame
 * arrives, where polling for its absence spends the whole budget on a surface
 * that is doing exactly what it should.
 */
const settlePainted = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  settleUntil(
    Effect.map(ctx.host.bounds(testId), (bounds) =>
      Option.isSome(Option.fromNullishOr(bounds)),
    ),
    (painted) => painted,
  );

/** The painted `x` or `y` of `testId`; `NaN` while it paints nothing. */
const boxAxis =
  (field: "x" | "y") =>
  (
    ctx: Smoke.AsyncSmokeContext,
    testId: string,
  ): Effect.Effect<number, Smoke.SmokeHostError> =>
    Effect.map(ctx.host.bounds(testId), (bounds) =>
      Option.match(Option.fromNullishOr(bounds), {
        onNone: () => Number.NaN,
        onSome: (box) => box[field],
      }),
    );

/**
 * The painted box of `testId` once it paints, failing by name if it never does.
 *
 * A surface mounts before its entry tween paints it, so a box read on the frame
 * after the press can miss a surface that is arriving.
 */
const settledBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    yield* settlePainted(ctx, testId);
    return yield* paintedBox(ctx, testId);
  });

/** The painted box of `testId`, failing by name when the runtime omitted it. */
const paintedBox = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<
  Smoke.Bounds,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    return yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
  });

const registerFontSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("register-font-probe");

    const fallback = yield* paintedWidth(ctx, "face-default");
    const missing = yield* paintedWidth(ctx, "face-missing");
    const registered = yield* paintedWidth(ctx, "face-registered");
    yield* ctx.host.capture("register-font");

    yield* ctx.expectNear(
      "the installed family paints the face's own advances",
      registered,
      SQUARE_WORD_WIDTH,
      1,
    );
    // The control: a family the runtime does not know must not paint the
    // installed face's advances, so the row above can only come from the file.
    yield* ctx.expectEqual(
      "an unknown family does not paint the installed face",
      Math.abs(missing - SQUARE_WORD_WIDTH) > 5,
      true,
    );
    yield* ctx.expectEqual(
      "the fallback face paints the sample word",
      fallback > 0,
      true,
    );
  });

/**
 * Registers the face after the text naming it has painted, then re-lays it out.
 *
 * The documented order is still "create the renderer, register, then render",
 * because that is the only order with no fallback frame in between. This probe
 * asks the sharper question the typings answer conservatively — a family that
 * arrives later "has already fallen back" — by measuring whether the *next*
 * layout picks the file up. It does: the same node repainted after the install
 * paints the installed advances, so a late registration costs a repaint, not a
 * permanently wrong typeface.
 */
const lateRegistrationSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("late-face");

    const before = yield* paintedWidth(ctx, "late-face");
    const controlBefore = yield* paintedWidth(ctx, "late-control");
    yield* ctx.host.capture("late-before");

    // The control names a family nothing ever installs, so a width change there
    // would make the measurement below meaningless.
    yield* ctx.expectEqual(
      "the control family paints the fallback",
      Math.abs(controlBefore - SQUARE_WORD_WIDTH) > 5,
      true,
    );

    yield* ctx.host.registerFont(SQUARE_BYTES);
    yield* ctx.host.click("late-relayout");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the re-layout control repaints the view",
      yield* ctx.host.text("late-relayouts"),
      "relayouts=1",
    );

    const after = yield* paintedWidth(ctx, "late-face");
    const controlAfter = yield* paintedWidth(ctx, "late-control");
    yield* ctx.host.capture("late-after");

    // The claim: the repaint lays the text out against the face installed a
    // moment earlier. This is the measurand the typings' "already fallen back"
    // warning does not describe: the fallback is not permanent, it is what the
    // next layout replaces.
    yield* ctx.expectNear(
      "the next layout paints the face installed after the first one",
      after,
      SQUARE_WORD_WIDTH,
      1,
    );
    yield* ctx.expectEqual(
      "the face was not painted before it was installed",
      Math.abs(before - SQUARE_WORD_WIDTH) > 5,
      true,
    );
    yield* ctx.expectNear(
      "the never-installed control sample does not move",
      controlAfter,
      controlBefore,
      1,
    );
  });

/**
 * Measures the two horizontal sides and the `align="center"` quirk in a window.
 *
 * Each anchor mounts its layer at rest, so there is no open/close state to race:
 * the probe compares the panel's box with its anchor's on the axis each prop
 * controls. `align="center"` is asserted the way the runtime behaves (the panel
 * ends at the anchor's centre line, short by half its own height), because the
 * components compensate with a measured offset and a live change to that quirk
 * must fail here rather than silently move every menu.
 */
const floatingSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("anchor-right");

    const right = yield* paintedBox(ctx, "anchor-right");
    const rightPanel = yield* paintedBox(ctx, "panel-right");
    yield* ctx.expectNear(
      "side=right sits one gap right of its anchor",
      rightPanel.x,
      right.x + right.width + GAP,
      1,
    );
    yield* ctx.expectNear(
      "align=start keeps the panel at the anchor's top",
      rightPanel.y,
      right.y,
      1,
    );

    const left = yield* paintedBox(ctx, "anchor-left");
    const leftPanel = yield* paintedBox(ctx, "panel-left");
    yield* ctx.expectNear(
      "side=left ends one gap left of its anchor",
      leftPanel.x + leftPanel.width,
      left.x - GAP,
      1,
    );
    yield* ctx.expectNear(
      "align=start holds on the left side too",
      leftPanel.y,
      left.y,
      1,
    );

    const centre = yield* paintedBox(ctx, "anchor-centre");
    const centrePanel = yield* paintedBox(ctx, "panel-centre");
    yield* ctx.expectNear(
      "align=center ends the panel at the anchor's centre line",
      centrePanel.y + centrePanel.height,
      centre.y + centre.height / 2,
      1,
    );
    yield* ctx.host.capture("floating-sides");
  });

const textInputSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("input-field");

    yield* ctx.expectContains(
      "the shipped Input starts empty",
      yield* ctx.host.text("input-readout"),
      "value= submits=0",
    );

    // A field needs focus before the window routes keys to it.
    yield* ctx.host.click("input-field");
    yield* ctx.host.key("h");
    yield* ctx.host.key("i");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "typing reaches the component's onChange",
      yield* ctx.host.text("input-readout"),
      "value=hi",
    );

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Enter reaches the component's onSubmit",
      yield* ctx.host.text("input-readout"),
      "submits=1",
    );
    yield* ctx.host.capture("typed");
  });

/** The width every probe field takes, so a crop is the field and not the page. */
const INK_FIELD_WIDTH = 320;
const INK_FIELD_PADDING = 10;

/** The field chrome the four hosts share: the fill the seam's pairs sit on. */
const inkFieldStyle = (theme: Theme, colour?: string): StyleDesc => ({
  width: INK_FIELD_WIDTH,
  paddingTop: INK_FIELD_PADDING,
  paddingBottom: INK_FIELD_PADDING,
  paddingLeft: INK_FIELD_PADDING + 1,
  paddingRight: INK_FIELD_PADDING + 1,
  borderWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.sm,
  backgroundColor: theme.colors.input,
  color: colour,
});

/**
 * What a field paints for a hint and for a value, four ways.
 *
 * A window reports no style, so the two inks are read from a captured frame:
 * `@gpuix/native@0.11.0` shapes an empty host's placeholder with a fixed
 * `#8F8F8F` whatever `nativeTextTheme` says, and it paints a value in the
 * element's own `color` rather than the theme object's `text`. So the probe
 * shows the runtime's own hint, the workaround the fields ship (an empty host
 * with no placeholder and a `<text>` in the `placeholder` role over it), a value
 * typed into a host given only the seam, and the same value with `color` set
 * from the seam's ink.
 */
const FieldInkProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [plain, setPlain] = useState("");
  const [seamed, setSeamed] = useState("");
  const [shipped, setShipped] = useState("");
  return (
    <div
      testId="fieldink-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A field&apos;s hint and value ink: the host paints its own grey hint
        under any theme, the library paints the placeholder role over an empty
        host, and a value paints the element&apos;s colour — the seam&apos;s
        text alone does not reach it.
      </text>
      <input
        testId={FIELD_INK_IDS.host}
        placeholder={HINT_TEXT}
        theme={nativeTextTheme(palettes.dark)}
        style={inkFieldStyle(theme)}
      />
      <div style={{ position: "relative", width: INK_FIELD_WIDTH }}>
        <input
          testId={FIELD_INK_IDS.painted}
          placeholder=""
          theme={nativeTextTheme(palettes.dark)}
          style={inkFieldStyle(theme)}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: INK_FIELD_PADDING + 2,
            pointerEvents: "none",
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: palettes.dark.colors.placeholder,
            }}
          >
            {HINT_TEXT}
          </text>
        </div>
      </div>
      <input
        testId={FIELD_INK_IDS.plain}
        placeholder={HINT_TEXT}
        value={plain}
        onChange={(event) => setPlain(event.value ?? "")}
        theme={nativeTextTheme(palettes.dark)}
        style={inkFieldStyle(theme)}
      />
      <input
        testId={FIELD_INK_IDS.seamed}
        placeholder={HINT_TEXT}
        value={seamed}
        onChange={(event) => setSeamed(event.value ?? "")}
        theme={nativeTextTheme(palettes.dark)}
        style={inkFieldStyle(theme, palettes.dark.colors.inputForeground)}
      />
      <Input
        testId={FIELD_INK_IDS.shipped}
        label="Search"
        placeholder={HINT_TEXT}
        value={shipped}
        onChange={setShipped}
      />
      <text
        testId={FIELD_INK_IDS.readout}
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {`plain=${plain} seamed=${seamed} shipped=${shipped}`}
      </text>
    </div>
  );
};

/** Types `value` into the field `id` and lets React paint the result. */
const typeInto = (
  ctx: Smoke.AsyncSmokeContext,
  id: string,
  value: string,
): Effect.Effect<void, Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    yield* ctx.host.click(id);
    yield* Effect.forEach(
      Arr.fromIterable(Str.split("")(value)),
      (letter) => ctx.host.key(letter),
      { concurrency: 1 },
    );
    yield* Effect.sleep(SETTLE);
  });

const fieldInkSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(FIELD_INK_IDS.host);
    const window = yield* ctx.host.windowSize();
    yield* ctx.host.capture("field-ink-rest");
    const rest = yield* ctx.host.pixels("field-ink-rest");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(rest, window),
    );
    const placeholder = palettes.dark.colors.placeholder;
    const measured = yield* Effect.forEach(
      [
        FIELD_INK_IDS.host,
        FIELD_INK_IDS.painted,
        FIELD_INK_IDS.plain,
        FIELD_INK_IDS.seamed,
        FIELD_INK_IDS.shipped,
      ],
      (id) =>
        Effect.flatMap(ctx.host.bounds(id), (found) =>
          Effect.flatMap(
            ctx.expectSome(
              `${id} reports its painted box`,
              Option.fromNullishOr(found),
            ),
            (box) => Effect.succeed({ id, box }),
          ),
        ),
      { concurrency: 1 },
    );
    const boxOf = (id: string) =>
      Effect.map(
        ctx.expectSome(
          `${id} was measured`,
          Arr.findFirst(measured, (field) => field.id === id),
        ),
        (field) => field.box,
      );

    // 1. The runtime's own hint: the grey, never the role the seam hands over.
    const host = yield* boxOf(FIELD_INK_IDS.host);
    const hostInk = fieldInk(rest, host, scale, placeholder);
    yield* ctx.expectEqual(
      "an empty host paints its own hint",
      hasInk(hostInk.runtime),
      true,
    );
    yield* ctx.expectEqual(
      "the theme's placeholder role does not reach the host's hint",
      hasInk(hostInk.themed),
      false,
    );

    // 2. The workaround: no host placeholder, the role painted as text over it.
    const paintedField = yield* boxOf(FIELD_INK_IDS.painted);
    const paintedInk = fieldInk(rest, paintedField, scale, placeholder);
    yield* ctx.expectEqual(
      "an empty host with no placeholder paints no hint of its own",
      hasInk(paintedInk.runtime),
      false,
    );
    yield* ctx.expectEqual(
      "the painted hint is the theme's placeholder role",
      hasInk(paintedInk.themed),
      true,
    );

    // 3. A value in a field given only the seam: the runtime's black, not the
    //    seam's ink, because a value paints the element's `color`.
    const plainBox = yield* boxOf(FIELD_INK_IDS.plain);
    yield* ctx.expectEqual(
      "an empty field still shows the runtime's hint",
      hasInk(fieldInk(rest, plainBox, scale, placeholder).runtime),
      true,
    );
    yield* typeInto(ctx, FIELD_INK_IDS.plain, HINT_TYPED);
    yield* ctx.host.capture("field-ink-plain");
    const plainFrame = yield* ctx.host.pixels("field-ink-plain");
    yield* ctx.expectEqual(
      "a value replaces the runtime's hint",
      hasInk(fieldInk(plainFrame, plainBox, scale, placeholder).runtime),
      false,
    );
    const plainPeak = yield* ctx.expectSome(
      "the plain field's box is inside the capture",
      peakInk(plainFrame, plainBox, scale),
    );
    yield* ctx.expectEqual(
      "the seam's text alone does not reach a value's ink",
      plainPeak < INK_PEAK_FLOOR,
      true,
    );
    const plainDarker = yield* ctx.expectSome(
      "the plain field's ink can be counted against its fill",
      countDarker(plainFrame, plainBox, scale, palettes.dark.colors.input),
    );
    yield* ctx.expectEqual(
      "the value still paints, darker than its own fill",
      plainDarker > 0,
      true,
    );

    // 4. The same value with `color` from the seam: the ink a library field
    //    paints.
    const seamedBox = yield* boxOf(FIELD_INK_IDS.seamed);
    yield* typeInto(ctx, FIELD_INK_IDS.seamed, HINT_TYPED);
    yield* ctx.host.capture("field-ink-seamed");
    const seamedFrame = yield* ctx.host.pixels("field-ink-seamed");
    const inkLuminance = yield* ctx.expectSome(
      "the dark theme names the ink a field's value paints",
      luminanceOf(palettes.dark.colors.inputForeground),
    );
    const seamedPeak = yield* ctx.expectSome(
      "the seamed field's box is inside the capture",
      peakInk(seamedFrame, seamedBox, scale),
    );
    yield* ctx.expectEqual(
      "a value paints the colour the field sets, not the theme's text",
      Math.abs(seamedPeak - inkLuminance) <= INK_PEAK_TOLERANCE,
      true,
    );

    // 5. The shipped `Input`: its own hint, and the ink its recipe sets. This is
    //    the half a component owes — the runtime cannot reach either role.
    const shippedBox = yield* boxOf(FIELD_INK_IDS.shipped);
    const shippedRest = fieldInk(rest, shippedBox, scale, placeholder);
    yield* ctx.expectEqual(
      "the shipped field paints the placeholder role when empty",
      hasInk(shippedRest.themed),
      true,
    );
    yield* ctx.expectEqual(
      "the shipped field paints none of the runtime's grey",
      hasInk(shippedRest.runtime),
      false,
    );
    yield* typeInto(ctx, FIELD_INK_IDS.shipped, HINT_TYPED);
    yield* ctx.expectEqual(
      "all three fields received the value",
      yield* ctx.host.text(FIELD_INK_IDS.readout),
      `plain=${HINT_TYPED} seamed=${HINT_TYPED} shipped=${HINT_TYPED}`,
    );
    yield* ctx.host.capture("field-ink-shipped");
    const shippedFrame = yield* ctx.host.pixels("field-ink-shipped");
    yield* ctx.expectEqual(
      "the shipped field's hint is gone once it has a value",
      hasInk(fieldInk(shippedFrame, shippedBox, scale, placeholder).themed),
      false,
    );
    const shippedPeak = yield* ctx.expectSome(
      "the shipped field's box is inside the capture",
      peakInk(shippedFrame, shippedBox, scale),
    );
    yield* ctx.expectEqual(
      "the shipped field's value paints the seam's ink",
      Math.abs(shippedPeak - inkLuminance) <= INK_PEAK_TOLERANCE,
      true,
    );
  });

/**
 * Validates a shipped `Field` on submit and reads the invalid state back.
 *
 * MISSION names "input update/validation": `text-input` measures the update,
 * and this measures validation as a window sees it. The caller owns the rule
 * (`submitSlug`), the field paints `error`, and every check reads something a
 * declared style cannot promise — the message text the field swapped in, the
 * focus the submit left alone, and the destructive role counted in the frame.
 */
const validationSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(VALIDATION_INPUT);
    const destructive = yield* ctx.expectSome(
      "the palette names the destructive text role",
      Option.fromNullishOr(
        Pixels.hexToRgba(statusTone(palettes.dark, "destructive").foreground),
      ),
    );

    yield* ctx.expectEqual(
      "the field starts valid and records nothing",
      yield* ctx.host.text(VALIDATION_READOUT),
      "error=none applied=none submits=0",
    );
    yield* ctx.expectContains(
      "a valid field paints its description",
      yield* ctx.host.text(VALIDATION_FIELD),
      VALIDATION_DESCRIPTION,
    );
    yield* ctx.host.capture("validation-valid");
    yield* ctx.expectEqual(
      "a valid field paints none of the destructive role",
      yield* paintedPixels(ctx, "validation-valid", destructive),
      0,
    );

    // Submit the empty field: the shipped `validate` runs in the caller, and a
    // failed submit must not move the reader out of the field they are fixing.
    yield* ctx.host.focusElement(VALIDATION_INPUT);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an empty submit paints the schema's own message",
      yield* ctx.host.text(VALIDATION_READOUT),
      `error=${VALIDATION_MESSAGE} applied=none submits=1`,
    );
    const rejected = yield* ctx.host.text(VALIDATION_FIELD);
    yield* ctx.expectContains(
      "the message reaches the field's own message slot",
      rejected,
      VALIDATION_MESSAGE,
    );
    yield* ctx.expectEqual(
      "the message replaces the description rather than stacking",
      Str.includes(VALIDATION_DESCRIPTION)(rejected),
      false,
    );
    yield* ctx.expectEqual(
      "a failed submit leaves the focus in the field",
      yield* focusedId(ctx),
      VALIDATION_INPUT,
    );
    yield* ctx.host.capture("validation-rejected");
    yield* ctx.expectEqual(
      "the message and the invalid edge paint the destructive role",
      (yield* paintedPixels(ctx, "validation-rejected", destructive)) > 0,
      true,
    );

    // A usable slug: the next submit clears the message and records the value.
    yield* ctx.host.key("d");
    yield* ctx.host.key("e");
    yield* ctx.host.key("s");
    yield* ctx.host.key("i");
    yield* ctx.host.key("g");
    yield* ctx.host.key("n");
    // The typing reaches React as a state update, so the submit that follows
    // must see the rendered value rather than the closure's.
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a valid submit clears the message and records the slug",
      yield* ctx.host.text(VALIDATION_READOUT),
      "error=none applied=design submits=2",
    );
    const accepted = yield* ctx.host.text(VALIDATION_FIELD);
    yield* ctx.expectContains(
      "the field paints its description again",
      accepted,
      VALIDATION_DESCRIPTION,
    );
    yield* ctx.expectEqual(
      "the cleared field paints none of the destructive role",
      Str.includes(VALIDATION_MESSAGE)(accepted),
      false,
    );
    yield* ctx.host.capture("validation-accepted");
    yield* ctx.expectEqual(
      "the message's pixels are gone with it",
      yield* paintedPixels(ctx, "validation-accepted", destructive),
      0,
    );

    // A trailing space is the last case: the value the field kept is what the
    // next submit validates, so the failure is about content, not focus.
    yield* ctx.host.key("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a trailing space fails the next submit, and the last applied slug stays recorded",
      yield* ctx.host.text(VALIDATION_READOUT),
      `error=${VALIDATION_MESSAGE} applied=design submits=3`,
    );
    yield* ctx.expectEqual(
      "the rejected field still holds the focus",
      yield* focusedAfterPaint(ctx),
      VALIDATION_INPUT,
    );
  });

/**
 * Drives a three-step wizard built from the shipped `Form`, `Stepper`, `Field`
 * and `Checkbox`.
 *
 * The two gates are the measurement: a step refuses to advance on its own
 * field's rule, while the review step's acceptance is decoded by `Form` alone
 * and paints its summary where no step gate looks. The draft stays the app's
 * across Back and Next, so a reader loses nothing on the way through.
 */
const multiStepSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(MULTI_STEP_IDS.next);

    yield* ctx.expectEqual(
      "the wizard opens on the first step with an empty draft",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(1, emptyMultiStepDraft, false, 0),
    );

    // Back cannot move before the first step: the control is disabled, and a
    // disabled action refuses the press in a window.
    yield* ctx.host.click(MULTI_STEP_IDS.back);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on the disabled Back leaves the wizard on the first step",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(1, emptyMultiStepDraft, false, 0),
    );

    // Next with no name: the step gate refuses and the field paints its rule.
    yield* ctx.host.click(MULTI_STEP_IDS.next);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a step with no usable name refuses to advance",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(1, emptyMultiStepDraft, false, 0),
    );
    yield* ctx.expectContains(
      "the refusal paints the name rule in the field's message slot",
      yield* ctx.host.text(MULTI_STEP_IDS.name),
      MULTI_STEP_NAME_MESSAGE,
    );

    // A usable name, then Enter: the field's own submit path advances too.
    yield* typeInto(ctx, MULTI_STEP_IDS.nameInput, "desk");
    yield* ctx.expectEqual(
      "the step's message clears once the value satisfies the rule",
      Str.includes(MULTI_STEP_NAME_MESSAGE)(
        yield* ctx.host.text(MULTI_STEP_IDS.name),
      ),
      false,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter from a valid first step advances the wizard",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(2, { name: "desk", port: "" }, false, 0),
    );

    // The second step's own rule refuses an out-of-range port.
    yield* typeInto(ctx, MULTI_STEP_IDS.portInput, "70000");
    yield* ctx.host.click(MULTI_STEP_IDS.next);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an out-of-range port refuses to advance",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(2, { name: "desk", port: "70000" }, false, 0),
    );
    yield* ctx.expectContains(
      "the port's refusal paints its own message",
      yield* ctx.host.text(MULTI_STEP_IDS.port),
      MULTI_STEP_PORT_MESSAGE,
    );

    // A corrected value clears the message without another press, and Next
    // reaches the review step. The press on Next moved the focus, so the field
    // takes it back before the replacement.
    yield* ctx.host.click(MULTI_STEP_IDS.portInput);
    yield* ctx.host.key("cmd-a");
    yield* Effect.forEach(
      Arr.fromIterable(["3", "0", "0", "0"]),
      (digit) => ctx.host.key(digit),
      { concurrency: 1 },
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the corrected port is what the field holds",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(2, { name: "desk", port: "3000" }, false, 0),
    );
    yield* ctx.expectEqual(
      "the port's message clears with the corrected value",
      Str.includes(MULTI_STEP_PORT_MESSAGE)(
        yield* ctx.host.text(MULTI_STEP_IDS.port),
      ),
      false,
    );
    yield* ctx.host.click(MULTI_STEP_IDS.next);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the review step paints the decoded-looking draft",
      yield* ctx.host.text(MULTI_STEP_IDS.review),
      "name=desk port=3000",
    );
    yield* ctx.expectEqual(
      "the stepper's value and the readout agree on the last step",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(3, { name: "desk", port: "3000" }, false, 0),
    );
    yield* ctx.host.capture("multi-step-review");

    // Back keeps the draft: the port is still there, and Next returns.
    yield* ctx.host.click(MULTI_STEP_IDS.back);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Back preserves the draft it was given",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(2, { name: "desk", port: "3000" }, false, 0),
    );
    yield* ctx.host.click(MULTI_STEP_IDS.next);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Next returns to the review with the same draft",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(3, { name: "desk", port: "3000" }, false, 0),
    );

    // The accepted review is the form's decode: one press reaches the caller
    // with the class instance's own values.
    yield* ctx.host.click(MULTI_STEP_IDS.terms);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the review's acceptance reaches the wizard's state",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(3, { name: "desk", port: "3000" }, true, 0),
    );
    yield* ctx.host.click(MULTI_STEP_IDS.submit);
    yield* Effect.sleep(Duration.millis(200));
    yield* ctx.expectEqual(
      "the caller receives the decoded values, not the draft",
      yield* ctx.host.text(MULTI_STEP_IDS.applied),
      "applied=desk:3000",
    );
    yield* ctx.expectEqual(
      "the accepted record submits once",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(3, { name: "desk", port: "3000" }, true, 1),
    );
    yield* ctx.expectEqual(
      "the record's message is gone once it is accepted",
      Str.includes(MULTI_STEP_TERMS_MESSAGE)(
        yield* ctx.host.text(MULTI_STEP_IDS.probe),
      ),
      false,
    );
    yield* ctx.host.capture("multi-step-submitted");

    // A refused review still records no submit, and the recovery is the gate's
    // own: re-accepting and pressing the same control reaches the caller
    // again. The `Form` clears the field errors its own submit validator owned,
    // so the second attempt is not stuck behind the first failure.
    yield* ctx.host.click(MULTI_STEP_IDS.terms);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "un-accepting the review paints the record's rule before any submit",
      Str.includes(MULTI_STEP_TERMS_MESSAGE)(
        yield* ctx.host.text(MULTI_STEP_IDS.probe),
      ),
      true,
    );
    yield* ctx.host.click(MULTI_STEP_IDS.submit);
    yield* Effect.sleep(Duration.millis(200));
    yield* ctx.expectEqual(
      "a refused review records no second submit",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(3, { name: "desk", port: "3000" }, false, 1),
    );
    yield* ctx.host.click(MULTI_STEP_IDS.terms);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(MULTI_STEP_IDS.submit);
    yield* Effect.sleep(Duration.millis(200));
    yield* ctx.expectEqual(
      "a corrected review submits again once the failure it carried is cleared",
      yield* ctx.host.text(MULTI_STEP_IDS.readout),
      multiStepReadout(3, { name: "desk", port: "3000" }, true, 2),
    );
    yield* ctx.expectEqual(
      "the retried submit hands the caller the decoded record",
      yield* ctx.host.text(MULTI_STEP_IDS.applied),
      "applied=desk:3000",
    );
    yield* ctx.host.capture("multi-step-retry");
  });

const checkboxSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("checkbox-field");

    yield* ctx.expectContains(
      "the shipped Checkbox starts unchecked",
      yield* ctx.host.text("checkbox-readout"),
      "checked=false changes=0",
    );

    yield* ctx.host.click("checkbox-field");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press toggles the checkbox and reports it once",
      yield* ctx.host.text("checkbox-readout"),
      "checked=true changes=1",
    );

    // Space is the component's own keyboard contract: a focused `div
    // role="checkbox"` has to see the key from the window. The release is a
    // separate verb because a window's `keystrokes` delivers only the press.
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Space toggles the focused checkbox",
      yield* ctx.host.text("checkbox-readout"),
      "checked=false changes=2",
    );
    yield* ctx.host.capture("toggled");
  });

/**
 * Drives the shipped `Tabs` through the paths a tab set has to survive in a
 * window: the selected pill covers the selected trigger, a press moves both, an
 * arrow moves **real focus** and selects (skipping the disabled tab), Home/End
 * jump to the ends, and a disabled tab ignores a press.
 *
 * The pill's geometry is the point: `tabs-indicator` is the component's one
 * measured selected surface, so the assertion is the runtime's own `bounds`
 * against the selected trigger's box rather than a colour read off a frame.
 */
const tabsSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("tabs-overview");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the first tab starts selected",
      yield* ctx.host.text("tabs-readout"),
      "value=overview changes=0",
    );
    yield* ctx.expectEqual(
      "an unselected panel paints nothing",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("tabs-panel-reports")),
      ),
      true,
    );

    const overview = yield* paintedBox(ctx, "tabs-overview");
    const first = yield* paintedBox(ctx, "tabs-indicator");
    yield* ctx.expectNear(
      "the pill starts on the selected trigger's left edge",
      first.x,
      overview.x,
      2,
    );
    yield* ctx.expectNear(
      "the pill is the selected trigger's width",
      first.width,
      overview.width,
      2,
    );
    yield* ctx.expectNear(
      "the pill is the selected trigger's height",
      first.height,
      overview.height,
      2,
    );
    yield* ctx.host.capture("tabs-overview");

    // Keyboard first, from the window's own traversal: Tab enters the list on
    // the roving tab stop.
    yield* ctx.host.key("tab");
    yield* Effect.sleep(Duration.millis(150));
    yield* ctx.expectEqual(
      "Tab stops on the selected trigger",
      yield* focusedId(ctx),
      "tabs-overview",
    );
    // Measured on 0.11.0, three runs 2026-10-22: the traversal focuses the
    // element but does not run its `onFocus`, so the counter stays 0. The
    // offscreen host disagrees — `focus-traversal` reads `focusNext` dispatching
    // the event — which is exactly why this is asserted in a window. The
    // component's key-origin anchor is what carries the arrow move here; a row
    // seeded only from `onFocus` would still re-anchor at the first enabled tab.
    yield* ctx.expectEqual(
      "the traversal focuses the trigger without running its onFocus",
      yield* ctx.host.text("tabs-focus-readout"),
      "focuses=0",
    );
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the first arrow moves off the traversal's tab",
      yield* focusedId(ctx),
      "tabs-reports",
    );
    yield* ctx.expectContains(
      "automatic activation follows the focused tab",
      yield* ctx.host.text("tabs-readout"),
      "value=reports changes=1",
    );
    yield* ctx.expectContains(
      "the selected panel paints",
      yield* ctx.host.text("tabs-panel-reports"),
      "reports panel",
    );
    yield* ctx.expectEqual(
      "the previous panel unpaints",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("tabs-panel-overview")),
      ),
      true,
    );
    const reports = yield* paintedBox(ctx, "tabs-reports");
    // The pill slides to the selected trigger's start edge; read it at rest.
    const secondX = yield* settleNumber(boxAxis("x")(ctx, "tabs-indicator"));
    yield* ctx.expectNear(
      "the pill follows the selected trigger",
      secondX,
      reports.x,
      2,
    );
    yield* ctx.expectEqual(
      "the pill moved with the selection",
      secondX === first.x,
      false,
    );
    yield* ctx.host.capture("tabs-reports");

    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the arrow skips the disabled trigger",
      yield* focusedId(ctx),
      "tabs-archive",
    );
    yield* ctx.expectContains(
      "the skipped selection lands on the last tab",
      yield* ctx.host.text("tabs-readout"),
      "value=archive changes=2",
    );

    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home lands on the first trigger",
      yield* focusedId(ctx),
      "tabs-overview",
    );
    yield* ctx.expectContains(
      "Home selects the first tab",
      yield* ctx.host.text("tabs-readout"),
      "value=overview changes=3",
    );

    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End skips the disabled trigger",
      yield* focusedId(ctx),
      "tabs-archive",
    );
    yield* ctx.expectContains(
      "End selects the last enabled tab",
      yield* ctx.host.text("tabs-readout"),
      "value=archive changes=4",
    );

    // A press is the pointer path: it selects without moving through the list.
    yield* ctx.host.click("tabs-reports");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press selects the tab",
      yield* ctx.host.text("tabs-readout"),
      "value=reports changes=5",
    );
    const pressedX = yield* settleNumber(boxAxis("x")(ctx, "tabs-indicator"));
    yield* ctx.expectNear(
      "the pill follows a pressed trigger",
      pressedX,
      reports.x,
      2,
    );

    const beforeDisabled = yield* ctx.host.text("tabs-readout");
    yield* ctx.host.click("tabs-settings");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled tab ignores a press",
      yield* ctx.host.text("tabs-readout"),
      beforeDisabled,
    );
  });

/**
 * Drives the shipped `Slider` in a window: a press in the middle of the track
 * becomes a value there (the hit-test reads the track's box), the keys step and
 * jump to the ends, and a disabled track ignores a press.
 *
 * Pointer capture is real, but it is a separate measurement: `pointer-capture`
 * drags this same component off its track and proves the value follows, because
 * the runtime captures for an element that listens to both `mouseDown` and
 * `mouseMove`. This probe stays on the press and keyboard paths.
 */
const sliderSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("slider");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the slider starts at zero",
      yield* ctx.host.text("slider-readout"),
      "value=0 changes=0 centred=false",
    );

    yield* ctx.host.click("slider");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press in the middle of the track moves the value there",
      yield* ctx.host.text("slider-readout"),
      "centred=true",
    );
    yield* ctx.expectContains(
      "the press reports one change",
      yield* ctx.host.text("slider-readout"),
      "changes=1",
    );
    yield* ctx.host.capture("slider-pressed");

    yield* ctx.host.focusElement("slider");
    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home jumps to the minimum",
      yield* ctx.host.text("slider-readout"),
      "value=0 changes=2 centred=false",
    );

    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End jumps to the maximum",
      yield* ctx.host.text("slider-readout"),
      "value=100 changes=3 centred=false",
    );

    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the left arrow steps down",
      yield* ctx.host.text("slider-readout"),
      "value=99 changes=4 centred=false",
    );

    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the right arrow steps back up",
      yield* ctx.host.text("slider-readout"),
      "value=100 changes=5 centred=false",
    );

    const beforeDisabled = yield* ctx.host.text("slider-readout");
    yield* ctx.host.click("slider-disabled");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled track ignores a press",
      yield* ctx.host.text("slider-readout"),
      beforeDisabled,
    );
    yield* ctx.host.capture("slider-keys");
  });

/**
 * Measures the pointer rule and what it means for a drag control.
 *
 * The check is the counters, not a screenshot: a runtime that kept delivering
 * moves without capture would make `move=8`, and one that stopped at the box
 * edge would leave `both` at 0 with the element under the pointer counting. The
 * shipped `Slider` is the third sample, so the probe measures the component the
 * library ships rather than a stand-in.
 */
const pointerCaptureSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("capture-both");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "nothing has been dragged yet",
      yield* ctx.host.text("capture-readout"),
      "both=0 bothUnder=0 bothUp=0 move=0 moveUnder=0 slider=0 sliderChanges=0 sliderFollowed=false range=10-30 rangeChanges=0 rangeFollowed=false",
    );

    yield* ctx.host.drag("capture-both", 120, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "an element listening to mouseDown and mouseMove keeps every move after the pointer leaves it",
      yield* ctx.host.text("capture-readout"),
      "both=8 bothUnder=0 bothUp=1",
    );

    yield* ctx.host.drag("capture-move-only", 120, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a move-only element captures nothing, so the element under the pointer gets the drag's moves",
      yield* ctx.host.text("capture-readout"),
      "move=1 moveUnder=8",
    );

    yield* ctx.host.drag("capture-slider", 60, 120);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the shipped Slider follows a drag that leaves its track",
      yield* ctx.host.text("capture-readout"),
      "sliderFollowed=true",
    );

    // The range's two thumbs are separate stops on one track: the press picks
    // the nearer end, so the other one must not move.
    yield* ctx.host.drag("capture-range", 60, 120);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the shipped RangeSlider follows a drag that leaves its track",
      yield* ctx.host.text("capture-readout"),
      "rangeFollowed=true",
    );
    yield* ctx.expectContains(
      "only the nearer end of the range moves",
      yield* ctx.host.text("capture-readout"),
      "range=10-",
    );
    yield* ctx.host.capture("pointer-capture");
  });

/**
 * Drives a cross-pane drag in a window: the item records the press, each pane
 * records the travel and the release over itself, and the readout names the side
 * that received the drop.
 *
 * The source records the press; the pane under the pointer counts the travel and
 * resolves the release. The probe drags item → right pane and back and requires
 * the target pane to have counted a move, so a drag that never reached it fails
 * even if the drop lands. The press flag is a ref, not state, because the
 * protocol delivers every move before React commits the press's render.
 */
const dragSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("drag-item");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the item starts in the left pane",
      yield* ctx.host.text("drag-readout"),
      "zone=left leftMoves=0 rightMoves=0 drops=0 dragging=false",
    );

    const item = yield* paintedBox(ctx, "drag-item");
    const right = yield* paintedBox(ctx, "drag-right");
    yield* ctx.host.drag(
      "drag-item",
      right.x + right.width / 2 - (item.x + item.width / 2),
      right.y + right.height / 2 - (item.y + item.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    const dropped = yield* ctx.host.text("drag-readout");
    yield* ctx.expectContains(
      "the drop lands in the right pane",
      dropped,
      "zone=right",
    );
    yield* ctx.expectContains(
      "the right pane resolved one drop",
      dropped,
      "drops=1",
    );
    yield* ctx.expectContains(
      "the drag state is over after the release",
      dropped,
      "dragging=false",
    );
    yield* ctx.expectEqual(
      "the target pane saw the pointer move with the button held",
      Str.includes("rightMoves=0")(dropped),
      false,
    );
    yield* ctx.host.capture("drag-right");

    // Back again, so the gesture is not a one-way special case.
    const left = yield* paintedBox(ctx, "drag-left");
    const moved = yield* paintedBox(ctx, "drag-item");
    yield* ctx.host.drag(
      "drag-item",
      left.x + left.width / 2 - (moved.x + moved.width / 2),
      left.y + left.height / 2 - (moved.y + moved.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    const returned = yield* ctx.host.text("drag-readout");
    yield* ctx.expectContains(
      "a second drag lands back in the left pane",
      returned,
      "zone=left",
    );
    yield* ctx.expectContains(
      "the left pane resolved the second drop",
      returned,
      "drops=2",
    );
    yield* ctx.expectContains(
      "the drag state ended again",
      returned,
      "dragging=false",
    );
    yield* ctx.expectEqual(
      "the left pane saw the return travel",
      Str.includes("leftMoves=0")(returned),
      false,
    );
    yield* ctx.host.capture("drag-left");
  });

/**
 * Drags a row onto another and reads back the order, the pointer's target and
 * which channel resolved it.
 *
 * What it measures: the dragged row keeps every move and the release (the list's
 * other rows never hear it), the row under the pointer comes from
 * `renderer.getElementsAt` matched against the rows' own ids, and the painted
 * order follows with the moved row in the drop row's slot. A release that never
 * left its own row reorders nothing, and a release over no row is a miss rather
 * than a drop on the nearest one.
 */
const dragReorderSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("reorder-readout");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the list starts in its declared order",
      yield* ctx.host.text("reorder-readout"),
      "order=alpha,bravo,charlie,delta from=none over=none drops=0 misses=0 heard=0 moves=0 top=none",
    );

    const first = yield* paintedBox(ctx, "row-alpha");
    const delta = yield* paintedBox(ctx, "row-delta");
    const last = yield* paintedBox(ctx, "row-delta-label");
    yield* ctx.host.drag(
      "row-alpha",
      last.x + last.width / 2 - (first.x + first.width / 2),
      last.y + last.height / 2 - (first.y + first.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    const dropped = yield* ctx.host.text("reorder-readout");
    yield* ctx.expectContains(
      "the dragged row takes the dropped-on row's slot",
      dropped,
      "order=bravo,charlie,delta,alpha",
    );
    yield* ctx.expectContains(
      "the readout names the dragged row",
      dropped,
      "from=alpha",
    );
    yield* ctx.expectContains(
      "the hit test names the row under the pointer",
      dropped,
      "over=delta",
    );
    yield* ctx.expectContains("the drag resolved one drop", dropped, "drops=1");
    yield* ctx.expectContains(
      "no other row heard the release",
      dropped,
      "heard=0",
    );
    yield* ctx.expectEqual(
      "the dragged row received the travel",
      Str.includes("moves=0")(dropped),
      false,
    );
    yield* ctx.expectContains(
      "the pointer is over the row's painted label, not the row",
      dropped,
      "top=other",
    );

    const moved = yield* paintedBox(ctx, "row-alpha");
    yield* ctx.expectNear(
      "the dragged row paints where the drop row was",
      moved.y,
      delta.y,
      1,
    );
    const closed = yield* paintedBox(ctx, "row-bravo");
    yield* ctx.expectNear(
      "the row that was first closes the gap",
      closed.y,
      first.y,
      1,
    );
    yield* ctx.host.capture("drag-reorder");

    // A release that never left its own row is not a reorder.
    yield* ctx.host.drag("row-bravo", 0, 4);
    yield* Effect.sleep(SETTLE);
    const jittered = yield* ctx.host.text("reorder-readout");
    yield* ctx.expectContains(
      "a jitter inside the row keeps the order",
      jittered,
      "order=bravo,charlie,delta,alpha",
    );
    yield* ctx.expectContains(
      "it resolves the row it never left",
      jittered,
      "over=bravo",
    );
    yield* ctx.expectContains(
      "the second drop is counted",
      jittered,
      "drops=2",
    );

    // The hit test decides, not the distance travelled.
    yield* ctx.host.drag("row-alpha", 420, 0);
    yield* Effect.sleep(SETTLE);
    const missed = yield* ctx.host.text("reorder-readout");
    yield* ctx.expectContains(
      "a release outside the list names no row",
      missed,
      "over=none",
    );
    yield* ctx.expectContains(
      "a missed drop leaves the order alone",
      missed,
      "order=bravo,charlie,delta,alpha",
    );
    yield* ctx.expectContains("the miss is counted", missed, "misses=1");
    yield* ctx.expectContains(
      "the missed release is not a drop",
      missed,
      "drops=2",
    );
  });

/** One transcript row, sized so the probe can predict the content height. */
const TranscriptRow = ({
  testId,
  children,
}: {
  readonly testId: string;
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <MessageScrollerItem
      testId={testId}
      style={{ height: TRANSCRIPT_ROW_HEIGHT, paddingBottom: 0 }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {children}
      </text>
    </MessageScrollerItem>
  );
};

/**
 * The input proof: a plain scroller that follows the tail on every render.
 *
 * The real scroller must leave an unpinned reader's offset alone, and "the
 * offset did not move" is also what a probe reads when its append control is
 * dead. This control appends the same page through the same verbs and always
 * follows, so its offset *does* move — proving the wheel and the append reached
 * a scroller before the real transcript's unchanged offset is believed.
 */
const FollowingControl = ({ count }: { readonly count: number }): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const tail = useRef<PublicInstance | null>(null);

  useLayoutEffect(() => {
    const instance = tail.current;
    if (instance !== null && renderer?.scrollIntoView !== undefined) {
      renderer.scrollIntoView(instance.id);
    }
  });

  return (
    <div
      testId="ms-control-viewport"
      style={{
        height: TRANSCRIPT_VIEWPORT_HEIGHT,
        overflowY: "scroll",
        flexDirection: "column",
        backgroundColor: theme.colors.background,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          testId={`ms-control-row-${index}`}
          style={{ height: TRANSCRIPT_ROW_HEIGHT, flexShrink: 0 }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            {`control ${index}`}
          </text>
        </div>
      ))}
      <div
        ref={tail}
        style={{ height: TRANSCRIPT_TAIL_HEIGHT, flexShrink: 0 }}
      />
    </div>
  );
};

/**
 * `message-scroller-lifecycle` — the shipped `MessageScroller` in a real window.
 *
 * The component's rules are `TestRenderer` facts so far: a pinned transcript
 * follows an appended row with `scrollIntoView`, an unpinned one keeps the
 * reader's offset and counts what arrived, and the way back re-pins. The window
 * is where the two scroll channels meet React: `scrollIntoView` has to paint
 * synchronously, `onScroll` has to report the wheel before the rule folds it,
 * and the jump control has to repaint the viewport on the following frame.
 *
 * Two transcripts share the geometry. The real one measures the shipped rules;
 * the control (`FollowingControl`) is a plain scroller that always follows, so
 * the "the reader was not yanked" check has a measured non-zero delta beside it.
 */
const MessageScrollerProbe = (): ReactNode => {
  const theme = useTheme();
  const [count, setCount] = useState(TRANSCRIPT_START_ROWS);
  const [controlCount, setControlCount] = useState(TRANSCRIPT_START_ROWS);
  const [pinned, setPinned] = useState(true);
  const [changes, setChanges] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 8,
      }}
    >
      <text
        testId="ms-state"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`pinned=${pinned} changes=${changes} rows=${count}`}
      </text>
      <div style={{ display: "flex", gap: 8 }}>
        <Pressable
          testId="ms-append"
          onClick={() => setCount((current) => current + TRANSCRIPT_PAGE_ROWS)}
        >
          Append two
        </Pressable>
        <Pressable
          testId="ms-append-control"
          onClick={() =>
            setControlCount((current) => current + TRANSCRIPT_PAGE_ROWS)
          }
        >
          Append to control
        </Pressable>
      </div>
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
        <div style={{ width: 420 }}>
          <MessageScroller
            label="Conversation"
            threshold={TRANSCRIPT_THRESHOLD}
            onPinnedChange={(next) => {
              setPinned(next);
              setChanges((current) => current + 1);
            }}
          >
            <MessageScrollerViewport
              testId="ms-viewport"
              style={{ height: TRANSCRIPT_VIEWPORT_HEIGHT }}
            >
              {Array.from({ length: count }, (_, index) => (
                <TranscriptRow key={index} testId={`ms-row-${index}`}>
                  {`message ${index}`}
                </TranscriptRow>
              ))}
            </MessageScrollerViewport>
            <MessageScrollerJumpToLatest testId="ms-jump" />
          </MessageScroller>
        </div>
        <div style={{ width: 420 }}>
          <FollowingControl count={controlCount} />
        </div>
      </div>
    </div>
  );
};

/** The offset `testId` holds, failing by name when the element is no scroller. */
const scrollY = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<number, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const offset = yield* ctx.expectSome(
      `${testId} is a scroller`,
      Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
    );
    return offset.y;
  });

/** Whether `testId` painted at all. */
const paintedAt = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
): Effect.Effect<boolean, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.bounds(testId), (bounds) => bounds !== null);

/** Whether a row sits wholly inside the viewport's painted box. */
const rowInside = (
  ctx: Smoke.AsyncSmokeContext,
  row: string,
  viewport: string,
): Effect.Effect<boolean, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const box = yield* paintedBox(ctx, row);
    const frame = yield* paintedBox(ctx, viewport);
    return (
      box.y >= frame.y - 1 && box.y + box.height <= frame.y + frame.height + 1
    );
  });

const messageScrollerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("ms-state");
    yield* Effect.sleep(SETTLE);

    // 1. A fresh transcript follows the end.
    yield* ctx.expectEqual(
      "a transcript starts pinned with nothing unseen",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=0 rows=${TRANSCRIPT_START_ROWS}`,
    );
    yield* ctx.expectNear(
      "the mount scrolls to the end of the transcript",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS),
      2,
    );
    yield* ctx.expectEqual(
      "the last message is inside the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS - 1}`,
        "ms-viewport",
      ),
      true,
    );
    yield* ctx.expectEqual(
      "a pinned reader sees no jump control",
      yield* paintedAt(ctx, "ms-jump"),
      false,
    );
    yield* ctx.host.capture("message-scroller-end");

    // 2. An appended page is followed while pinned.
    yield* ctx.host.click("ms-append");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the append keeps the transcript pinned",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=0 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS}`,
    );
    yield* ctx.expectNear(
      "the pinned transcript follows the page by its own height",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS),
      2,
    );
    yield* ctx.expectEqual(
      "the appended message is inside the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS - 1}`,
        "ms-viewport",
      ),
      true,
    );
    yield* ctx.host.capture("message-scroller-followed");

    // 3. Scrolling away unpins and offers the way back.
    yield* ctx.host.wheel("ms-viewport", 0, 400);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "scrolling up unpins the reader",
      yield* ctx.host.text("ms-state"),
      `pinned=false changes=1 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS}`,
    );
    yield* ctx.expectNear(
      "a wheel past the top clamps the offset at zero",
      yield* scrollY(ctx, "ms-viewport"),
      0,
      1,
    );
    yield* ctx.expectEqual(
      "an unpinned reader is offered the way back",
      yield* paintedAt(ctx, "ms-jump"),
      true,
    );
    yield* ctx.expectEqual(
      "nothing has arrived yet, so the control names no count",
      yield* ctx.host.text("ms-jump"),
      "Jump to latest",
    );
    yield* ctx.host.capture("message-scroller-unpinned");

    // 4. A page while unpinned is counted, not followed.
    const before = yield* scrollY(ctx, "ms-viewport");
    yield* ctx.host.click("ms-append");
    yield* Effect.sleep(SETTLE);
    const after = yield* scrollY(ctx, "ms-viewport");
    yield* ctx.expectEqual(
      "the unpinned transcript did not move",
      after,
      before,
    );
    yield* ctx.expectEqual(
      "the page did not pin the reader",
      yield* ctx.host.text("ms-state"),
      `pinned=false changes=1 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2}`,
    );
    yield* ctx.expectEqual(
      "the control counts the two rows that arrived unseen",
      yield* ctx.host.text("ms-jump"),
      "2 new messages",
    );
    yield* ctx.expectEqual(
      "the arrived page waits below the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2 - 1}`,
        "ms-viewport",
      ),
      false,
    );
    yield* ctx.host.capture("message-scroller-unpinned-arrivals");

    // 5. The control proves the verbs above reach a scroller: it always
    //    follows, so the same page moves its offset back to its end.
    yield* ctx.host.wheel("ms-control-viewport", 0, 400);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the control scroller starts at its top",
      yield* scrollY(ctx, "ms-control-viewport"),
      0,
      1,
    );
    yield* ctx.host.click("ms-append-control");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "a following control is yanked back to its end",
      yield* scrollY(ctx, "ms-control-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS),
      2,
    );

    // 6. Jumping returns to the newest row and clears the count.
    yield* ctx.host.click("ms-jump");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "jumping pins the reader again",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=2 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2}`,
    );
    yield* ctx.expectNear(
      "jumping scrolls to the transcript's end",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2),
      2,
    );
    yield* ctx.expectEqual(
      "the jump control leaves once the reader is back",
      yield* paintedAt(ctx, "ms-jump"),
      false,
    );
    yield* ctx.expectEqual(
      "the newest message is inside the viewport",
      yield* rowInside(
        ctx,
        `ms-row-${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 2 - 1}`,
        "ms-viewport",
      ),
      true,
    );
    yield* ctx.host.capture("message-scroller-jumped");

    // 7. A wheel back to the end re-pins without the control.
    yield* ctx.host.wheel("ms-viewport", 0, 400);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("ms-append");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the second page is counted while the reader is away",
      yield* ctx.host.text("ms-jump"),
      "2 new messages",
    );
    yield* ctx.host.wheel("ms-viewport", 0, -10000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel to the end pins the reader",
      yield* ctx.host.text("ms-state"),
      `pinned=true changes=4 rows=${TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 3}`,
    );
    yield* ctx.expectNear(
      "the wheel lands on the transcript's end",
      yield* scrollY(ctx, "ms-viewport"),
      -scrollRange(TRANSCRIPT_START_ROWS + TRANSCRIPT_PAGE_ROWS * 3),
      2,
    );
    yield* ctx.expectEqual(
      "the way back is gone once the end is visible",
      yield* paintedAt(ctx, "ms-jump"),
      false,
    );
    yield* ctx.host.capture("message-scroller-rerolled");
  });

/**
 * `combobox-lifecycle` — the shipped `Combobox` in a real window.
 *
 * The component wraps GPUix's headless combobox, so focus, the active row and
 * the keyboard are the runtime's; its 21 behaviour tests run in a
 * `TestRenderer`, where `renderer.focusElement` lands immediately. A window is
 * the only place that proves the popup takes the focus from a press, that a
 * typed query filters the painted rows, that a disabled row is skipped by the
 * arrow path, and that Escape/outside press close it without stealing the
 * focus back.
 */
const ComboboxProbe = (): ReactNode => {
  const theme = useTheme();
  const [value, setValue] = useState<string | null>(null);
  const [changes, setChanges] = useState(0);
  const [presses, setPresses] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 420,
        gap: 8,
      }}
    >
      <text
        testId="cb-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`value=${value ?? "none"} changes=${changes} presses=${presses}`}
      </text>
      <div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 420,
            gap: 8,
          }}
        >
          <Combobox
            options={REVIEWERS}
            onValueChange={(next) => {
              setValue(typeof next === "string" ? next : null);
              setChanges((current) => current + 1);
            }}
          >
            <ComboboxTrigger
              testId="cb-trigger"
              label="Assign reviewer"
              placeholder="Assign reviewer"
            />
            <ComboboxContent>
              <ComboboxInput />
              <ComboboxList />
              <ComboboxEmpty />
            </ComboboxContent>
          </Combobox>
        </div>
        <Pressable
          testId="cb-outside"
          onClick={() => setPresses((current) => current + 1)}
        >
          Outside control
        </Pressable>
      </div>
    </div>
  );
};

const comboboxSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("cb-trigger");
    yield* Effect.sleep(SETTLE);

    // 1. Closed at rest.
    yield* ctx.expectEqual(
      "the combobox starts closed with nothing chosen",
      yield* ctx.host.text("cb-readout"),
      "value=none changes=0 presses=0",
    );
    yield* ctx.expectEqual(
      "the trigger shows its placeholder",
      yield* ctx.host.text("cb-trigger"),
      "Assign reviewer",
    );
    yield* ctx.expectEqual(
      "a closed combobox paints no list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );

    // 2. A press opens the list below the trigger and moves focus in.
    const trigger = yield* paintedBox(ctx, "cb-trigger");
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    const surface = yield* paintedBox(ctx, "combobox-content");
    yield* ctx.expectEqual(
      "the search field takes the focus when the list opens",
      yield* focusedId(ctx),
      "combobox-input",
    );
    yield* ctx.expectNear(
      "the list opens one gap below the trigger",
      surface.y,
      trigger.y + trigger.height + 4,
      2,
    );
    yield* ctx.expectNear(
      "the list starts on the trigger's edge",
      surface.x,
      trigger.x,
      2,
    );
    yield* Effect.sleep(Duration.millis(200));
    yield* ctx.expectEqual(
      "the first option paints while the query is empty",
      yield* paintedAt(ctx, "combobox-option-ada"),
      true,
    );
    yield* ctx.expectEqual(
      "the last option paints while the query is empty",
      yield* paintedAt(ctx, "combobox-option-margaret"),
      true,
    );
    yield* ctx.host.capture("combobox-open");

    // 3. Typing filters by the component's ranking.
    yield* ctx.host.key("g");
    yield* ctx.host.key("r");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing keeps the matching row",
      yield* paintedAt(ctx, "combobox-option-grace"),
      true,
    );
    yield* ctx.expectEqual(
      "typing drops the rows that do not match",
      Arr.every(
        yield* Effect.all(
          [
            paintedAt(ctx, "combobox-option-ada"),
            paintedAt(ctx, "combobox-option-alan"),
            paintedAt(ctx, "combobox-option-linus"),
            paintedAt(ctx, "combobox-option-margaret"),
          ],
          { concurrency: "unbounded" },
        ),
        (present) => !present,
      ),
      true,
    );
    yield* ctx.host.capture("combobox-filtered");

    // 4. Enter selects the highlighted match, closes and restores focus.
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter selects the highlighted match",
      yield* ctx.host.text("cb-readout"),
      "value=grace changes=1 presses=0",
    );
    yield* ctx.expectEqual(
      "the trigger paints the chosen label",
      yield* ctx.host.text("cb-trigger"),
      "Grace Hopper",
    );
    yield* ctx.expectEqual(
      "choosing closes the list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );
    yield* ctx.expectEqual(
      "choosing returns the focus to the trigger",
      yield* focusedId(ctx),
      "cb-trigger",
    );

    // 5. Arrows move the highlight and skip the disabled row.
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "three arrows skip the disabled row and Enter chooses the next",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=0",
    );
    yield* ctx.host.capture("combobox-selected");

    // 6. A query that only matches a disabled row chooses nothing.
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("a");
    yield* ctx.host.key("l");
    yield* ctx.host.key("a");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the disabled row still paints",
      yield* paintedAt(ctx, "combobox-option-alan"),
      true,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter cannot choose a disabled row",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=0",
    );
    yield* ctx.expectEqual(
      "a refused choice leaves the list open",
      yield* paintedAt(ctx, "combobox-content"),
      true,
    );

    // 7. Escape closes and returns the focus; the value is untouched.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape closes the list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the trigger",
      yield* focusedId(ctx),
      "cb-trigger",
    );
    yield* ctx.expectEqual(
      "Escape leaves the chosen value alone",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=0",
    );

    // 8. The empty state, and an outside press that dismisses without focus.
    yield* ctx.host.click("cb-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("z");
    yield* ctx.host.key("z");
    yield* ctx.host.key("z");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a query that matches nothing paints no row",
      yield* paintedAt(ctx, "combobox-option-ada"),
      false,
    );
    yield* ctx.expectEqual(
      "the empty slot paints its message",
      yield* ctx.host.text("combobox-empty"),
      "No matches",
    );
    yield* ctx.host.capture("combobox-empty");

    yield* ctx.host.click("cb-outside");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an outside press reaches its control",
      yield* ctx.host.text("cb-readout"),
      "value=linus changes=2 presses=1",
    );
    yield* ctx.expectEqual(
      "an outside press dismisses the list",
      yield* paintedAt(ctx, "combobox-content"),
      false,
    );
  });

/** One row of the list probe: a value, a title and the disabled flag. */
const ListRowItem = ({
  row,
  prefix,
}: {
  readonly row: ListRow;
  readonly prefix: string;
}): ReactNode => (
  <ListItem
    value={row.value}
    textValue={row.title}
    disabled={row.disabled}
    testId={`${prefix}-row-${row.value}`}
  >
    <ListItemTitle>{row.title}</ListItemTitle>
  </ListItem>
);

/**
 * `list-lifecycle` — the shipped `List` selection model in a real window.
 *
 * The list is the keyboard and selection foundation the menus and tabs reuse:
 * a roving tab stop, arrow moves that skip disabled rows, Enter/Space
 * activation (Space on the release), Home/End, type-ahead, and `Cmd+A` /
 * `Shift+Arrow` in multiple mode. Its 38 behaviour tests run in a
 * `TestRenderer`; the window is where the key event has to bubble from the
 * focused row to the list, which is the origin rule `keyOrigin` exists for.
 */
const ListProbe = (): ReactNode => {
  const theme = useTheme();
  const [single, setSingle] = useState("");
  const [singleChanges, setSingleChanges] = useState(0);
  const [activations, setActivations] = useState(0);
  const [multi, setMulti] = useState<ReadonlyArray<string>>([]);
  const [multiChanges, setMultiChanges] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 340,
          gap: 6,
        }}
      >
        <text
          testId="list-single-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`selected=${single === "" ? "none" : single} changes=${singleChanges} activates=${activations}`}
        </text>
        <List
          testId="list-single"
          selectionMode="single"
          onValueChange={(value) => {
            setSingle(value);
            setSingleChanges((current) => current + 1);
          }}
          onActivate={() => setActivations((current) => current + 1)}
        >
          {Arr.map(LIST_ROWS, (row) => (
            <ListRowItem key={row.value} row={row} prefix="single" />
          ))}
        </List>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 340,
          gap: 6,
        }}
      >
        <text
          testId="list-multi-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`selected=${multi.length === 0 ? "none" : Arr.join(multi, ",")} changes=${multiChanges}`}
        </text>
        <List
          testId="list-multi"
          selectionMode="multiple"
          onValueChange={(values) => {
            setMulti(values);
            setMultiChanges((current) => current + 1);
          }}
        >
          {Arr.map(LIST_ROWS, (row) => (
            <ListRowItem key={row.value} row={row} prefix="multi" />
          ))}
        </List>
      </div>
    </div>
  );
};

const listSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("list-single-readout");
    yield* Effect.sleep(SETTLE);

    // 1. A press selects and focuses the row it landed on.
    yield* ctx.expectEqual(
      "the single list starts with nothing selected",
      yield* ctx.host.text("list-single-readout"),
      "selected=none changes=0 activates=0",
    );
    yield* ctx.host.click("single-row-grace");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press selects the row and reports one activation",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=1 activates=1",
    );
    yield* ctx.expectEqual(
      "a press focuses the row",
      yield* focusedId(ctx),
      "single-row-grace",
    );

    // 2. An arrow moves real focus and skips the disabled row.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "down skips the disabled row",
      yield* focusedId(ctx),
      "single-row-linus",
    );
    yield* ctx.expectEqual(
      "an arrow moves focus without changing the selection",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=1 activates=1",
    );

    // 3. Enter selects the row focus landed on.
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter selects the focused row and runs its action",
      yield* ctx.host.text("list-single-readout"),
      "selected=linus changes=2 activates=2",
    );

    // 4. Space selects on the release, and never runs the action.
    yield* ctx.host.key("up");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Space on the release selects the focused row",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=3 activates=2",
    );

    // 5. Home/End move to the edges; Enter acts on what focus names.
    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home focuses the first enabled row",
      yield* focusedId(ctx),
      "single-row-ada",
    );
    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End focuses the last enabled row",
      yield* focusedId(ctx),
      "single-row-margaret",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter selects the row End reached",
      yield* ctx.host.text("list-single-readout"),
      "selected=margaret changes=4 activates=3",
    );

    // 6. A typed letter jumps focus, and the next Enter acts from there.
    yield* ctx.host.key(TYPEAHEAD_LETTER);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "type-ahead focuses the matching row",
      yield* focusedId(ctx),
      "single-row-grace",
    );
    yield* ctx.expectEqual(
      "the typed jump does not select",
      yield* ctx.host.text("list-single-readout"),
      "selected=margaret changes=4 activates=3",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter acts on the row the typed jump reached",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=5 activates=4",
    );

    // 7. A disabled row can take the pointer's focus but is never chosen.
    yield* ctx.host.click("single-row-alan");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled row ignores the press",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=5 activates=4",
    );
    yield* ctx.expectEqual(
      "the pointer can still focus a disabled row",
      yield* focusedId(ctx),
      "single-row-alan",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter cannot choose the focused disabled row",
      yield* ctx.host.text("list-single-readout"),
      "selected=grace changes=5 activates=4",
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow leaves the disabled row for the next enabled one",
      yield* focusedId(ctx),
      "single-row-linus",
    );
    yield* ctx.host.capture("list-single");

    // 8. Multiple mode: a plain press replaces, Shift extends, Cmd+A selects.
    yield* ctx.expectEqual(
      "the multiple list starts empty",
      yield* ctx.host.text("list-multi-readout"),
      "selected=none changes=0",
    );
    yield* ctx.host.click("multi-row-ada");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a plain press replaces the selection",
      yield* ctx.host.text("list-multi-readout"),
      "selected=ada changes=1",
    );
    yield* ctx.host.key("shift-down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Shift+down extends from the pressed row",
      yield* ctx.host.text("list-multi-readout"),
      "selected=ada,grace changes=2",
    );
    yield* ctx.host.key("cmd-a");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Cmd+A selects every enabled row",
      yield* ctx.host.text("list-multi-readout"),
      "selected=ada,grace,linus,margaret changes=3",
    );
    yield* ctx.host.click("multi-row-grace");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a plain press after select-all replaces it",
      yield* ctx.host.text("list-multi-readout"),
      "selected=grace changes=4",
    );
    yield* ctx.host.click("multi-row-alan");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled row is not selected",
      yield* ctx.host.text("list-multi-readout"),
      "selected=grace changes=4",
    );
    yield* ctx.host.capture("list-multiple");
  });

/**
 * Opens the shipped Dialog by press, proves focus entered the surface and that
 * Escape closes it and returns focus, then closes it with its own `DialogClose`.
 *
 * Every step is measured through the window: `bounds` is `null` for an element
 * the runtime never painted (the closed state), the focus id is the renderer's,
 * and the readout is React's own report of the two transitions.
 */
const dialogSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("dialog-trigger");
    yield* ctx.expectContains(
      "the dialog starts closed",
      yield* ctx.host.text("dialog-readout"),
      "opens=0 closes=0",
    );
    yield* ctx.expectEqual(
      "a closed dialog paints no surface",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("dialog-content")),
      ),
      true,
    );

    // Control for the trap check below: with the dialog closed the trigger is the
    // page's first stop, so the same focused-id read reports it. A focus that
    // leaked out of an open dialog would therefore be named, not hidden.
    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "outside the dialog a traversal reaches the trigger",
      yield* focusedId(ctx),
      "dialog-trigger",
    );

    yield* ctx.host.click("dialog-trigger");
    yield* Effect.sleep(SETTLE);
    const content = yield* paintedBox(ctx, "dialog-content");
    yield* ctx.expectEqual(
      "a press opens the dialog surface",
      content.width > 0 && content.height > 0,
      true,
    );
    yield* ctx.expectEqual(
      "focus enters the dialog surface",
      yield* focusedId(ctx),
      "dialog-content",
    );
    yield* ctx.expectContains(
      "the open reaches onOpenChange",
      yield* ctx.host.text("dialog-readout"),
      "opens=1 closes=0",
    );
    yield* ctx.host.capture("dialog-open");

    // The Tab trap in a window, which no headless suite can prove: the surface
    // handles Tab itself (`focusNextWithin` + `preventDefault`), so a window
    // that delivered the key to the default traversal instead would leak the
    // focus to `dialog-trigger`. Six presses must cycle every stop, come back
    // to the surface, and never name the trigger.
    const stops = yield* Effect.forEach(
      Arr.range(0, 5),
      () =>
        Effect.flatMap(ctx.host.key("tab"), () =>
          Effect.flatMap(Effect.sleep(SETTLE), () => focusedId(ctx)),
        ),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "Tab never leaves the dialog surface",
      Arr.contains(stops, "dialog-trigger"),
      false,
    );
    yield* ctx.expectEqual(
      "Tab reaches the dialog's first field",
      Arr.contains(stops, "dialog-field-a"),
      true,
    );
    yield* ctx.expectEqual(
      "Tab reaches the dialog's second field",
      Arr.contains(stops, "dialog-field-b"),
      true,
    );
    // The surface itself is not in the tab order (`tabIndex: -1`), so the wrap
    // goes to the first stop again rather than back to `dialog-content`.
    yield* ctx.expectEqual(
      "the trap cycles through the surface's stops",
      Arr.length(Arr.filter(stops, (id) => id === "dialog-field-a")) >= 2,
      true,
    );
    yield* ctx.host.key("shift-tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Shift-Tab stays inside too",
      Arr.contains(
        [
          "dialog-content",
          "dialog-field-a",
          "dialog-field-b",
          "dialog-confirm",
        ],
        yield* focusedId(ctx),
      ),
      true,
    );

    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape unpaints the dialog surface",
      yield* settleGone(ctx, "dialog-content"),
      true,
    );
    yield* ctx.expectEqual(
      "closing returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "dialog-trigger",
    );
    yield* ctx.expectContains(
      "the close reaches onOpenChange",
      yield* ctx.host.text("dialog-readout"),
      "opens=1 closes=1",
    );

    yield* ctx.host.click("dialog-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the dialog reopens after a dismissal",
      (yield* paintedBox(ctx, "dialog-content")).height > 0,
      true,
    );
    yield* ctx.host.click("dialog-confirm");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the dialog's own close control dismisses it",
      yield* ctx.host.text("dialog-readout"),
      "opens=2 closes=2",
    );
    yield* ctx.expectEqual(
      "the close control returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "dialog-trigger",
    );
    yield* ctx.host.capture("dialog-closed");
  });

/**
 * Confirms and cancels the shipped `ConfirmDialog` in a window — the flow
 * MISSION names beside the plain dialog's open/close.
 *
 * Three claims a `TestRenderer` suite cannot make, because they are about real
 * input: `Cancel` holds the initial focus, so `Enter` on an untouched dialog
 * takes the safe path instead of destroying; a confirm reports exactly once and
 * the surface goes away because the *caller* closes it; and every close path —
 * confirm, cancel, Escape — hands the focus back to the app's opener. The
 * fixture is the caller (`confirmFlow`), so the counts the checks read are the
 * app's own, not the component's state.
 */
const confirmSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(CONFIRM_OPENER);
    yield* ctx.expectEqual(
      "the flow starts closed with nothing reported",
      yield* ctx.host.text(CONFIRM_READOUT),
      "open=false opens=0 confirms=0 closes=0",
    );
    yield* ctx.expectEqual(
      "a closed confirmation paints no action",
      yield* settleGone(ctx, CONFIRM_ACCEPT),
      true,
    );

    /**
     * Focuses the app's opener and presses it. The press is what records the
     * restore target, so the opener must hold the focus before it opens.
     */
    const open = Effect.gen(function* () {
      yield* ctx.host.focusElement(CONFIRM_OPENER);
      yield* ctx.host.click(CONFIRM_OPENER);
      yield* settlePainted(ctx, CONFIRM_ACCEPT);
    });

    yield* open;
    yield* ctx.expectEqual(
      "a press opens the confirmation over the page",
      (yield* paintedBox(ctx, CONFIRM_ACCEPT)).width > 0,
      true,
    );
    yield* ctx.expectEqual(
      "Cancel holds the initial focus, not the destructive action",
      yield* focusedAfterPaint(ctx),
      CONFIRM_CANCEL,
    );
    yield* ctx.expectContains(
      "the caller records the open",
      yield* ctx.host.text(CONFIRM_READOUT),
      "open=true opens=1",
    );
    // Capture-only wait: the surface is painted but still fading in on its
    // `slow` level, and a screenshot that shows a half-opacity dialog is poor
    // evidence for the docs. No check reads the frame.
    yield* Effect.sleep(Duration.millis(400));
    yield* ctx.host.capture("confirm-open");

    // The safety property: the focused control is Cancel, so Enter takes the
    // safe path. A dialog that focused its confirm action would destroy here.
    yield* ctx.host.key("enter");
    yield* ctx.expectEqual(
      "Enter on the untouched dialog dismisses it",
      yield* settleGone(ctx, CONFIRM_ACCEPT),
      true,
    );
    yield* ctx.expectEqual(
      "Enter on the untouched dialog confirms nothing",
      yield* ctx.host.text(CONFIRM_READOUT),
      "open=false opens=1 confirms=0 closes=1",
    );
    yield* ctx.expectEqual(
      "the cancelled dialog returns the focus to its opener",
      yield* focusedAfterPaint(ctx),
      CONFIRM_OPENER,
    );
    yield* ctx.host.capture("confirm-cancelled");

    // Confirm: one report, and the surface goes because the fixture closed it.
    yield* open;
    yield* ctx.host.click(CONFIRM_ACCEPT);
    yield* ctx.expectEqual(
      "the confirm action dismisses the surface",
      yield* settleGone(ctx, CONFIRM_ACCEPT),
      true,
    );
    yield* ctx.expectEqual(
      "the confirmation reports once and the caller records the close",
      yield* ctx.host.text(CONFIRM_READOUT),
      "open=false opens=2 confirms=1 closes=2",
    );
    yield* ctx.expectEqual(
      "the confirmed dialog returns the focus to its opener",
      yield* focusedAfterPaint(ctx),
      CONFIRM_OPENER,
    );
    yield* ctx.host.capture("confirm-accepted");

    // Cancel: the destructive action must not run.
    yield* open;
    yield* ctx.host.click(CONFIRM_CANCEL);
    yield* ctx.expectEqual(
      "the cancel action dismisses the surface",
      yield* settleGone(ctx, CONFIRM_ACCEPT),
      true,
    );
    yield* ctx.expectEqual(
      "cancelling reports no confirm",
      yield* ctx.host.text(CONFIRM_READOUT),
      "open=false opens=3 confirms=1 closes=3",
    );
    yield* ctx.expectEqual(
      "the cancelled dialog returns the focus to its opener too",
      yield* focusedAfterPaint(ctx),
      CONFIRM_OPENER,
    );

    // Escape is the third close path, and it is a cancel rather than a confirm.
    yield* open;
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape dismisses the confirmation",
      yield* settleGone(ctx, CONFIRM_ACCEPT),
      true,
    );
    yield* ctx.expectEqual(
      "Escape reports no confirm",
      yield* ctx.host.text(CONFIRM_READOUT),
      "open=false opens=4 confirms=1 closes=4",
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the opener as well",
      yield* focusedAfterPaint(ctx),
      CONFIRM_OPENER,
    );
    yield* ctx.host.capture("confirm-escaped");
  });

/**
 * Reads the fade the presence seam paints, from the pixel the entry leaves.
 *
 * The seam is a `motion` description, and no window exposes one, so the surface
 * is measured where it paints: a point inside the content's own padding, over a
 * page the probe fills white. The reading is taken on the renderer's **motion
 * clock** rather than on wall time — a software renderer can block a paint
 * longer than the tween, and a read "at 107 ms" would then name a frame the
 * renderer had not produced. Freeze, advance by an exact offset, let the frame
 * paint, capture: the same read is repeatable.
 *
 * Partway through the level the pixel is a mix of the surface and the page; past
 * it the pixel is the surface's own colour. The frozen clock then repeats the
 * reading under a reduced preference, where the resting frame paints with no
 * journey at all — so the timing, not the paint, is what the preference removes.
 */
const surfaceFadeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("fade-trigger");
    const surface = yield* ctx.expectSome(
      "the palette names the surface colour",
      surfaceFadeColour(palettes.dark.colors.popover),
    );
    const pauseClock = yield* ctx.expectSome(
      "the window exposes a motion clock",
      Option.fromNullishOr(ctx.host.clockPause),
    );
    const fastForward = yield* ctx.expectSome(
      "the clock can be advanced",
      Option.fromNullishOr(ctx.host.clockFastForward),
    );
    const resumeClock = yield* ctx.expectSome(
      "the clock can be resumed",
      Option.fromNullishOr(ctx.host.clockResume),
    );
    yield* ctx.expectEqual(
      "a closed dialog paints no surface",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("fade-surface")),
      ),
      true,
    );

    /** The surface's painted box right now; frozen time keeps it the sampled frame's. */
    const currentBox = (): Effect.Effect<
      FadeBox,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          "the surface paints a box to sample",
          Option.fromNullishOr(yield* ctx.host.bounds("fade-surface")),
        );
      });

    /**
     * The colour at the sample point of a capture.
     *
     * The device scale is read from a frame once: a capture that is not the
     * window's box cannot be sampled at a logical point, and saying so is better
     * than reading a pixel from another part of the window.
     */
    const sampleIn = (
      frame: Pixels.Pixels,
      box: FadeBox,
      scale: number,
    ): Option.Option<Pixels.Rgba> => {
      const point = framePoint(fadeSample(box), scale);
      return Option.fromNullishOr(Pixels.pixelAt(frame, point.x, point.y));
    };

    /** Captures `name` and samples it, once the paint has caught up with the clock. */
    const captureSample = (
      name: string,
      scale: number,
    ): Effect.Effect<
      Pixels.Rgba,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        const box = yield* currentBox();
        return yield* ctx.expectSome(
          `the ${name} capture holds the sample point`,
          sampleIn(yield* ctx.host.pixels(name), box, scale),
        );
      });

    // ── Animated: the surface arrives on a painted fade ─────────────────────
    // The clock is frozen before the press, so the mount's first frame is
    // opacity 0 and stays there until the probe advances it.
    const frozenAt = yield* pauseClock();
    yield* ctx.host.click("fade-trigger");
    yield* ctx.expectContains(
      "the press opens the dialog",
      yield* settleUntil(ctx.host.text("fade-readout"), (value) =>
        value.includes("opens=1 closes=0"),
      ),
      "opens=1 closes=0",
    );
    yield* ctx.host.waitFor("fade-surface");
    yield* ctx.host.capture("fade-frozen");
    const frozen = yield* ctx.host.pixels("fade-frozen");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frozen, size),
    );
    const frozenSample = yield* ctx.expectSome(
      "the fade-frozen capture holds the sample point",
      sampleIn(frozen, yield* currentBox(), scale),
    );
    yield* ctx.expectEqual(
      "a frozen mount paints the page, not the surface",
      isBacking(frozenSample, FADE_BACKING_RGBA),
      true,
    );

    const partialAt = yield* fastForward(FADE_PARTIAL_MS);
    yield* ctx.expectEqual(
      "the clock advances by the partial offset",
      Math.round(partialAt - frozenAt),
      FADE_PARTIAL_MS,
    );
    const partial = yield* settleUntil(
      captureSample("fade-partial", scale),
      (sample) => isFading(sample, FADE_BACKING_RGBA, surface),
      FADE_CAPTURE_ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "partway through its level the surface is a mix of surface and page",
      isFading(partial, FADE_BACKING_RGBA, surface),
      true,
    );

    yield* fastForward(FADE_REST_MS - FADE_PARTIAL_MS);
    const settled = yield* settleUntil(
      captureSample("fade-settled", scale),
      (sample) => isSurface(sample, surface),
      FADE_CAPTURE_ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "past its level the surface rests on its own colour",
      isSurface(settled, surface),
      true,
    );
    yield* resumeClock();

    // ── Reduced: the journey is gone, the resting frame is not ──────────────
    // Freezing the clock is what makes this a control: an animated surface
    // under the same frozen clock stays at opacity 0, so a preference the
    // runtime ignored could never paint the surface here.
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape unpaints the surface",
      yield* settleGone(ctx, "fade-surface"),
      true,
    );
    yield* ctx.host.click("fade-reduce");
    yield* ctx.expectContains(
      "the reduce control takes the preference",
      yield* settleUntil(ctx.host.text("fade-readout"), (value) =>
        value.includes("preference=reduced"),
      ),
      "preference=reduced",
    );
    yield* pauseClock();
    yield* ctx.host.click("fade-trigger");
    yield* ctx.host.waitFor("fade-surface");
    const reduced = yield* settleUntil(
      captureSample("fade-reduced", scale),
      (sample) => isSurface(sample, surface),
      FADE_CAPTURE_ATTEMPTS,
    );
    yield* ctx.expectEqual(
      "a reduced surface paints at rest under the same frozen clock",
      isSurface(reduced, surface),
      true,
    );
    yield* resumeClock();
    yield* ctx.expectContains(
      "both opens reached onOpenChange",
      yield* ctx.host.text("fade-readout"),
      "opens=2 closes=1",
    );
  });

/**
 * Drives the shipped `Tooltip` through the paths it opens on and the way it
 * leaves: a `Tab` traversal's focus, the pointer entering the trigger, and a
 * pointer leaving or an Escape dismissing it.
 *
 * A window reports no style and a tooltip has no readout, so the checks are the
 * runtime's own bounds for the tip and its text: `bounds` answers nothing while
 * the tip is closed, which is what makes "closed" measurable at all.
 */
const tooltipSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The tip is painted exactly when its text is in the frame. */
    const painted = Effect.map(ctx.host.paintedText(), (lines) =>
      lines.join("\n").includes(TOOLTIP_CONTENT),
    );

    /**
     * Waits until the tip's paint state is `wanted`, then gives up.
     *
     * The shared bounded poll: the assertion that follows reports the state it
     * actually read.
     */
    const settleTip = (
      wanted: boolean,
    ): Effect.Effect<void, Smoke.SmokeHostError> =>
      Effect.asVoid(settleUntil(painted, (shown) => shown === wanted));

    yield* ctx.host.waitFor("tooltip-trigger");
    yield* ctx.expectEqual("a tooltip starts closed", yield* painted, false);
    yield* ctx.expectContains(
      "the trigger has not been entered yet",
      yield* ctx.host.text("tooltip-readout"),
      "enters=0 leaves=0",
    );

    // The keyboard path, measured on 0.11.0 (three runs 2026-10-22): the
    // traversal focuses the trigger without running its `onFocus`, so the tip
    // — which the runtime opens on focus — stays closed. Hover is the only open
    // path in a window; the text still reaches assistive technology as the
    // trigger's `aria-description`. The offscreen host disagrees, which is why
    // this is measured in a window.
    yield* ctx.host.key("tab");
    // Wait the whole window the old "it opens" check allowed (~2s), so a
    // delayed delivery cannot pass as "never delivered": the value the
    // assertion reports is the one this poll settled on.
    const afterTraversal = yield* settleUntil(painted, (shown) => shown);
    yield* ctx.expectEqual(
      "Tab lands on the trigger",
      yield* focusedId(ctx),
      "tooltip-trigger",
    );
    yield* ctx.expectEqual(
      "the traversal does not open the tip",
      afterTraversal,
      false,
    );
    yield* ctx.host.key("escape");
    yield* settleTip(false);
    yield* ctx.expectEqual(
      "Escape leaves a tip the traversal did not open closed",
      yield* painted,
      false,
    );
    yield* ctx.expectEqual(
      "the trigger keeps the focus after Escape",
      yield* focusedId(ctx),
      "tooltip-trigger",
    );

    // The pointer path. The tip opens immediately (the wrapper's provider has a
    // zero delay), so the wait is for the frame, not for a timer.
    yield* ctx.host.hover("tooltip-trigger");
    yield* settleTip(true);
    yield* ctx.expectContains(
      "the pointer enters the trigger",
      yield* ctx.host.text("tooltip-readout"),
      "enters=1 leaves=0",
    );
    yield* ctx.expectEqual(
      "a hover opens the tip with its own content",
      yield* painted,
      true,
    );
    // The tip's box is the content's own layout report: `side="top"` puts it
    // above the trigger, overlapping it on the horizontal axis.
    yield* ctx.expectContains(
      "the tip opens above its trigger on the default side",
      yield* ctx.host.text("tooltip-readout"),
      "above=true overlaps=true",
    );
    yield* ctx.host.capture("tooltip-open");

    // Leaving is a pointer move too: the runtime schedules the close 80ms later,
    // so the probe reads frames until the tip is gone rather than one fixed one.
    yield* ctx.host.hover("tooltip-away");
    yield* settleTip(false);
    yield* ctx.expectContains(
      "the pointer leaves the trigger",
      yield* ctx.host.text("tooltip-readout"),
      "enters=1 leaves=1",
    );
    yield* ctx.expectEqual(
      "leaving the trigger closes the tip",
      yield* painted,
      false,
    );

    // A second hover proves the tip reopens, then Escape (the runtime's
    // window-level dismissal, which does not need the focus inside the layer)
    // is the keyboard way out.
    yield* ctx.host.hover("tooltip-trigger");
    yield* settleTip(true);
    yield* ctx.expectEqual(
      "a second hover reopens the tip",
      yield* painted,
      true,
    );
    yield* ctx.host.key("escape");
    yield* settleTip(false);
    yield* ctx.expectEqual("Escape dismisses the tip", yield* painted, false);
    yield* ctx.expectEqual(
      "Escape leaves the focus on the trigger",
      yield* focusedId(ctx),
      "tooltip-trigger",
    );
  });

/**
 * Drives the shipped `DropdownMenu` through the paths a menu has to survive in a
 * window: a press opens it, Escape dismisses it and returns focus, a keyboard
 * open lands on the first row, arrows move real focus, Enter activates the row,
 * and a press activates one too.
 */
const menuSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The menu surface is gone once its exit tween has finished. */
    const unpainted = settleGone(ctx, "menu-content");

    yield* ctx.host.waitFor("menu-trigger");
    yield* ctx.expectContains(
      "the menu starts with no action taken",
      yield* ctx.host.text("menu-readout"),
      "last=none",
    );
    yield* ctx.expectEqual(
      "a closed menu paints no surface",
      yield* unpainted,
      true,
    );

    yield* ctx.host.click("menu-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press opens the menu surface",
      (yield* paintedBox(ctx, "menu-content")).width > 0,
      true,
    );
    yield* ctx.host.capture("menu-open");

    // Escape is delivered to the trigger, which holds focus after a pointer
    // open: the menu's dismiss layer is what hears it, not the surface.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape unpaints the menu surface",
      yield* unpainted,
      true,
    );
    yield* ctx.expectEqual(
      "Escape returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "menu-trigger",
    );

    // A keyboard open lands on the first row, so the highlight is real focus.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a keyboard open lands on the first row",
      yield* focusedId(ctx),
      "menu-rename",
    );

    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key moves focus to the next row",
      yield* focusedId(ctx),
      "menu-delete",
    );

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Enter activates the focused row",
      yield* ctx.host.text("menu-readout"),
      "last=delete",
    );
    yield* ctx.expectEqual(
      "activation unpaints the menu surface",
      yield* unpainted,
      true,
    );
    yield* ctx.expectEqual(
      "activation returns focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "menu-trigger",
    );

    yield* ctx.host.click("menu-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("menu-rename");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press activates the pressed row",
      yield* ctx.host.text("menu-readout"),
      "last=rename",
    );
    yield* ctx.expectEqual(
      "a pressed row unpaints the menu surface",
      yield* unpainted,
      true,
    );
    yield* ctx.host.capture("menu-closed");
  });

/**
 * Drives the shipped `ContextMenu` in a window.
 *
 * This is the one overlay whose opening input is a **right press**, and no
 * window probe had produced one: the headless suites synthesise the aux click
 * themselves. The checks are the two opening paths and their different close
 * rules — a pointer-opened menu keeps its origin at the pointer and leaves the
 * focus where the close put it, while Shift+F10 places the surface from the
 * trigger's own bounds and hands the focus back.
 */
const contextMenuSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The surface is gone once its exit tween has finished. */
    const unpainted = settleGone(ctx, "context-menu");

    yield* ctx.host.waitFor("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the menu starts closed",
      yield* ctx.host.text("context-readout"),
      "opens=0 closes=0 last=none",
    );
    yield* ctx.expectEqual(
      "a closed context menu paints no surface",
      yield* unpainted,
      true,
    );

    // A primary press is not an aux click, so it must open nothing.
    yield* ctx.host.click("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a left press does not open a context menu",
      yield* unpainted,
      true,
    );

    const trigger = yield* paintedBox(ctx, "context-trigger");
    yield* ctx.host.rightClick("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a right press opens the menu",
      yield* ctx.host.text("context-readout"),
      "opens=1",
    );
    // The panel enters with a few pixels of travel on its entry axis, so both
    // axes are read at rest: a mid-tween read reported `y=121.5` for `124`.
    const pointerX = yield* settleNumber(boxAxis("x")(ctx, "context-menu"));
    const pointerY = yield* settleNumber(boxAxis("y")(ctx, "context-menu"));
    yield* ctx.expectNear(
      "the surface starts at the press point's x",
      pointerX,
      trigger.x + trigger.width / 2,
      1,
    );
    yield* ctx.expectNear(
      "the surface starts at the press point's y",
      pointerY,
      trigger.y + trigger.height / 2,
      1,
    );
    yield* ctx.host.capture("context-open");
    yield* ctx.expectEqual(
      "the open surface holds the focus",
      yield* focusedId(ctx),
      "context-menu",
    );

    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key moves real focus to the first row",
      yield* focusedId(ctx),
      "context-rename",
    );

    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the next arrow moves focus to the second row",
      yield* focusedId(ctx),
      "context-delete",
    );

    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Enter runs the focused row",
      yield* ctx.host.text("context-readout"),
      "last=delete",
    );
    yield* ctx.expectEqual(
      "activation unpaints the surface",
      yield* unpainted,
      true,
    );

    // The keyboard route: Shift+F10 places the surface under the trigger and
    // Escape returns the focus, which a pointer-opened menu does not.
    yield* ctx.host.rightClick("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape dismisses a pointer-opened menu",
      yield* unpainted,
      true,
    );
    yield* ctx.expectContains(
      "the dismiss is reported to the caller",
      yield* ctx.host.text("context-readout"),
      "closes=2",
    );
    yield* ctx.expectEqual(
      "a pointer-opened menu leaves the focus where the close put it",
      yield* focusedAfterPaint(ctx),
      "none",
    );

    yield* ctx.host.focusElement("context-trigger");
    yield* ctx.host.key("shift-f10");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Shift+F10 opens the menu from the keyboard",
      yield* ctx.host.text("context-readout"),
      "opens=3",
    );
    // The surface enters with a few pixels of travel on its entry axis, so both
    // axes are read at rest: a mid-tween read reported `y=201` for `204`.
    const fromKeyboardX = yield* settleNumber(
      boxAxis("x")(ctx, "context-menu"),
    );
    const fromKeyboardY = yield* settleNumber(
      boxAxis("y")(ctx, "context-menu"),
    );
    yield* ctx.expectNear(
      "the keyboard surface starts at the trigger's left edge",
      fromKeyboardX,
      trigger.x,
      1,
    );
    yield* ctx.expectNear(
      "the keyboard surface starts under the trigger",
      fromKeyboardY,
      trigger.y + trigger.height,
      1,
    );

    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape from the keyboard route returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      "context-trigger",
    );

    // The scope rule: a right press on a sibling opens nothing, and while the
    // menu is open the same press dismisses it rather than opening another.
    yield* ctx.host.rightClick("context-sibling");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a right press on a sibling opens nothing",
      yield* unpainted,
      true,
    );

    yield* ctx.host.rightClick("context-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.rightClick("context-sibling");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a right press outside the open menu dismisses it",
      yield* unpainted,
      true,
    );
    yield* ctx.expectContains(
      "the outside press opens no second menu",
      yield* ctx.host.text("context-readout"),
      "opens=4",
    );
    yield* ctx.host.capture("context-closed");
  });

/** A geometry sample the animation is still travelling between. */
const isTravelling = (height: number, from: number, to: number): boolean =>
  height > from + 2 && height < to - 2;

/**
 * Eight painted heights of the animated box, sampled about 50ms apart.
 *
 * A 0.6s `easeInOut` tween moves slowly at both ends, so one sample is not
 * enough to tell a tween from a jump: the run's first 240ms only reaches ~90px.
 * The samples straddle the slow start; the value read after the last one is the
 * settled height.
 */
const motionSamples = (
  ctx: Smoke.AsyncSmokeContext,
): Effect.Effect<
  ReadonlyArray<number>,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.forEach(
    [1, 2, 3, 4, 5, 6, 7, 8],
    () =>
      Effect.gen(function* () {
        const box = yield* paintedBox(ctx, "motion-box");
        yield* Effect.sleep(Duration.millis(50));
        return box.height;
      }),
    { concurrency: 1 },
  );

/**
 * Measures whether `motion` animates **in a window**, and what it does to the
 * content inside a shrinking box.
 *
 * The box tweens 0.6s between 120x40 and 240x240, so intermediate samples are
 * the proof that it animates rather than jumping — the negative control is
 * `transition={{ duration: 0 }}`, which lands on the target with no frame in
 * between. The fixed 320x200 child must keep its own size the whole way: a
 * collapsible sidebar animates its **outer** box and clips, rather than
 * flex-shrinking the content inside it.
 *
 * Measured caveat for the probe itself: a screenshot stalls the animation clock,
 * and the run then completes early once frames resume (a capture taken just
 * before the reverse press made it snap from 238 to 40 in one sample). Captures
 * therefore sit after each run's sampling, with a settle between them.
 */
const motionSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("motion-box");
    // A previous probe's screenshot stalls the animation clock, and a run whose
    // frames resume late completes in one step. Settling the window before the
    // first press is what makes this measurement independent of what ran before.
    yield* Effect.sleep(Duration.millis(800));
    const small = yield* paintedBox(ctx, "motion-box");
    yield* ctx.expectNear(
      "the box starts at its initial height",
      small.height,
      40,
      1,
    );
    yield* ctx.expectNear(
      "the box starts at its initial width",
      small.width,
      120,
      1,
    );

    const narrow = yield* paintedBox(ctx, "motion-child");
    yield* ctx.expectNear(
      "the fixed child keeps its width inside the narrow box",
      narrow.width,
      320,
      1,
    );
    yield* ctx.expectNear(
      "the fixed child keeps its height inside the short box",
      narrow.height,
      200,
      1,
    );

    yield* ctx.host.click("motion-toggle");
    const growSamples = yield* motionSamples(ctx);
    yield* Effect.sleep(Duration.millis(900));
    const grown = yield* paintedBox(ctx, "motion-box");

    yield* ctx.expectEqual(
      "the growth paints a frame between the two sizes",
      Arr.some(growSamples, (height) => isTravelling(height, 40, 240)),
      true,
    );
    yield* ctx.expectNear(
      "the box lands on the animated target height",
      grown.height,
      240,
      1,
    );
    yield* ctx.expectNear(
      "the box lands on the animated target width",
      grown.width,
      240,
      1,
    );
    yield* ctx.expectContains(
      "onMotionComplete reports the end of the run",
      yield* ctx.host.text("motion-readout"),
      "completes=1",
    );

    const wide = yield* paintedBox(ctx, "motion-child");
    yield* ctx.expectNear(
      "the child is not reflowed by the larger box",
      wide.width,
      320,
      1,
    );

    yield* ctx.host.click("motion-toggle");
    const shrinkSamples = yield* motionSamples(ctx);
    yield* Effect.sleep(Duration.millis(900));
    const back = yield* paintedBox(ctx, "motion-box");
    yield* ctx.expectEqual(
      "the reverse run paints an intermediate frame too",
      Arr.some(shrinkSamples, (height) => isTravelling(height, 40, 240)),
      true,
    );
    yield* ctx.expectNear(
      "the reverse run lands back on the initial height",
      back.height,
      40,
      1,
    );
    yield* ctx.expectContains(
      "each run reports one completion",
      yield* ctx.host.text("motion-readout"),
      "completes=2",
    );

    const clipped = yield* paintedBox(ctx, "motion-child");
    yield* ctx.expectNear(
      "the child keeps its size once the box is small again",
      clipped.height,
      200,
      1,
    );

    // Captures come last, after every timed run: a screenshot stalls the
    // animation clock, so a capture taken between a press and its samples makes
    // the next run complete in one step (measured: `240, 238, 40, 40`).
    yield* ctx.host.click("motion-toggle");
    yield* Effect.sleep(Duration.millis(900));
    yield* ctx.host.capture("motion-grown");
    yield* ctx.host.click("motion-toggle");
    yield* Effect.sleep(Duration.millis(900));
    yield* ctx.host.capture("motion-shrunk");
  });

/**
 * Queues a toast from the shipped `ToastProvider` and dismisses it with the
 * card's own control.
 *
 * The queue count is read from `useToast()`, so a toast that never entered the
 * store would not count, and the viewport's text is read separately because the
 * store and the paint are different claims.
 */
const toastSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("toast-probe");
    yield* ctx.host.waitFor("toast-push");
    yield* ctx.expectContains(
      "the queue starts empty",
      yield* ctx.host.text("toast-readout"),
      "queued=0",
    );

    yield* ctx.host.click("toast-push");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press queues one toast",
      yield* ctx.host.text("toast-readout"),
      "queued=1",
    );
    yield* ctx.expectContains(
      "the viewport paints the queued toast",
      yield* ctx.host.text("toast-viewport"),
      "Changes published",
    );
    yield* ctx.host.capture("toast-queued");

    yield* ctx.host.click("toast-dismiss");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the card's dismiss control empties the queue",
      yield* ctx.host.text("toast-readout"),
      "queued=0",
    );
    yield* ctx.host.capture("toast-dismissed");
  });

/**
 * Drives the shipped `CommandMenu` the way an application shortcut would.
 *
 * Six claims, each of which a browser-shaped test cannot make: a window's
 * keystrokes reach the palette's search field, typing really filters the rows,
 * the arrow key moves the *highlight* while the field keeps native focus (the
 * component's documented contract — moving focus would stop the typing), Enter
 * runs the highlighted row rather than the first one, a disabled action paints
 * but runs nothing, and `Escape` dismisses the surface.
 *
 * The focus after the dismissal is the seventh: the palette gives the focus back
 * to its opener, which is what a modal must do. `modal-focus-restore` isolates
 * the three cases that rule depends on.
 */
const commandPaletteSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** Whether `testId` is absent from the window's tree, once it settles. */
    const unpainted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> => settleGone(ctx, testId);

    /** Types a key sequence in order; one keystroke at a time. */
    const type = (
      keys: ReadonlyArray<string>,
    ): Effect.Effect<void, Smoke.SmokeHostError> =>
      Effect.forEach(keys, (key) => ctx.host.key(key), {
        discard: true,
        concurrency: 1,
      });

    /** Presses the trigger and waits for the surface and its field. */
    const openPalette: Effect.Effect<void, Smoke.SmokeHostError> = Effect.gen(
      function* () {
        // A press sent while the last surface is still on its exit tween is
        // dismissed by the layer that is closing, so the palette never opens
        // (measured: `the runtime paints command-zoom — expected a value, got
        // none`, after a reopen that raced the previous close). Waiting for the
        // two states the next steps need — the surface painted, the search
        // field focused — makes the open the probe's, not the box's load.
        yield* settleGone(ctx, "command-menu");
        yield* ctx.host.focusElement("palette-trigger");
        yield* ctx.host.click("palette-trigger");
        yield* settlePainted(ctx, "command-menu");
        yield* settleUntil(ctx.host.focused(), (id) => id === "command-input");
      },
    );

    yield* ctx.host.waitFor("palette-trigger");
    yield* ctx.expectEqual(
      "the palette starts with nothing run",
      yield* ctx.host.text("palette-readout"),
      "ran=none runs=0",
    );
    yield* ctx.expectEqual(
      "a closed palette paints no surface",
      yield* unpainted("command-menu"),
      true,
    );

    // The unfiltered list: four rows, the first one highlighted.
    yield* openPalette;
    yield* ctx.expectEqual(
      "a press opens the palette surface",
      (yield* settledBox(ctx, "command-menu")).width > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the palette opens with its search field focused",
      yield* focusedAfterPaint(ctx),
      "command-input",
    );
    yield* ctx.host.capture("palette-open");

    // The design claim: the highlight moves, the field keeps the focus. If the
    // arrow key moved focus instead, the typing below would stop working.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key keeps the search field focused",
      yield* focusedAfterPaint(ctx),
      "command-input",
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter runs the highlighted action, not the first one",
      yield* ctx.host.text("palette-readout"),
      "ran=open-settings runs=1",
    );
    yield* ctx.expectEqual(
      "running an action dismisses the palette",
      yield* unpainted("command-menu"),
      true,
    );
    yield* ctx.expectEqual(
      "closing the palette returns the focus to its opener",
      yield* focusedAfterPaint(ctx),
      "palette-trigger",
    );
    yield* ctx.host.capture("palette-closed");

    // The filtered list: typing reaches the field and really filters the rows.
    yield* openPalette;
    yield* type(["t", "h", "e", "m", "e"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing filters the palette to the matching row",
      (yield* settledBox(ctx, "command-theme")).width > 0,
      true,
    );
    yield* ctx.expectEqual(
      "an unrelated row is filtered out",
      yield* unpainted("command-new-file"),
      true,
    );
    yield* ctx.expectEqual(
      "a matching query paints no empty state",
      yield* unpainted("command-empty"),
      true,
    );
    yield* ctx.host.capture("palette-filtered");
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter runs the filtered action",
      yield* ctx.host.text("palette-readout"),
      "ran=theme runs=2",
    );

    // A query whose only match is disabled: the row paints, and it runs nothing.
    yield* openPalette;
    yield* type(["z", "o", "o", "m"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled action still paints as a row",
      (yield* settledBox(ctx, "command-zoom")).width > 0,
      true,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter on a disabled action runs nothing",
      yield* ctx.host.text("palette-readout"),
      "ran=theme runs=2",
    );
    yield* ctx.expectEqual(
      "a disabled action leaves the palette open",
      (yield* settledBox(ctx, "command-menu")).width > 0,
      true,
    );

    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape dismisses the palette",
      yield* unpainted("command-menu"),
      true,
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the opener too",
      yield* focusedAfterPaint(ctx),
      "palette-trigger",
    );
  });

/**
 * Three modals and the question the command palette raised: does a modal give
 * the focus back when the focused thing unmounts with it?
 *
 * The three cases differ only in what holds the focus while the surface is
 * open:
 *
 * - the **control** has nothing focusable inside, so the modal's own surface
 *   holds the focus;
 * - the **manual** field is focused by the modal itself (`initialFocus`), after
 *   the surface exists;
 * - the **auto** field takes the focus the way the runtime does it
 *   (`autoFocus`, at mount) — before the modal has looked at the focus.
 *
 * All three unmount with their surface, so all three are the case that matters.
 */
const ModalFocusRestoreProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [manualId, setManualId] = useState<number | null>(null);
  const field = {
    height: 32,
    paddingLeft: theme.spacing.sm,
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
  };
  return (
    <div
      testId="modal-focus-restore-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Three modals: does the focus come back when what held it unmounts with
          the surface?
        </text>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: theme.spacing.md,
          }}
        >
          <Dialog>
            <DialogTrigger testId="restore-control-trigger">
              Nothing inside
            </DialogTrigger>
            <DialogContent
              label="Nothing inside"
              testId="restore-control-content"
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                The surface holds the focus.
              </text>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger testId="restore-manual-trigger">
              Focused field
            </DialogTrigger>
            <DialogContent
              label="Focused field"
              testId="restore-manual-content"
              initialFocus={() => manualId}
            >
              <input
                testId="restore-manual-input"
                ref={(instance) => setManualId(instance?.id ?? null)}
                style={field}
              />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger testId="restore-auto-trigger">
              Auto-focused field
            </DialogTrigger>
            <DialogContent
              label="Auto-focused field"
              testId="restore-auto-content"
            >
              <input testId="restore-auto-input" autoFocus style={field} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

/**
 * Measures where the focus lands after each modal closes.
 *
 * The control comes first: a modal whose own surface held the focus gives it
 * back, so the two readings after it are about the field, not about modals in
 * general.
 */
const modalFocusRestoreSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("restore-control-trigger");

    // The control: nothing focusable inside, the surface holds the focus.
    yield* ctx.host.click("restore-control-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the control's surface holds the focus while it is open",
      yield* focusedAfterPaint(ctx),
      "restore-control-content",
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the control's modal gives the focus back to its opener",
      yield* focusedAfterPaint(ctx),
      "restore-control-trigger",
    );

    // A field the modal focused itself, after the surface existed.
    yield* ctx.host.click("restore-manual-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the manually focused field holds the focus while the modal is open",
      yield* focusedAfterPaint(ctx),
      "restore-manual-input",
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a modal gives the focus back when it focused the field itself",
      yield* focusedAfterPaint(ctx),
      "restore-manual-trigger",
    );

    // A field that took the focus at mount, before the modal looked.
    yield* ctx.host.click("restore-auto-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the auto-focused modal's own surface holds the focus while it is open",
      yield* focusedAfterPaint(ctx),
      "restore-auto-content",
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    // The modal records the opener in the render that opens it, before the
    // field exists, so `autoFocus` cannot steal the restore target: the focus
    // comes back to the trigger.
    yield* ctx.expectEqual(
      "a field that took the focus at mount gives it back to the opener",
      yield* focusedAfterPaint(ctx),
      "restore-auto-trigger",
    );
  });

/**
 * The surfaces a chart or an image preview would draw with.
 *
 * A real chart is generated markup, so the SVG is `source` (no file). Measured:
 * one `<svg>` paints a **tinted mask**, so the chart source is mounted beside
 * one shape per layer, five stacked `<svg>` elements each carrying its own tint.
 * The image arrives the two ways an app supplies one — a data URL and a pixel
 * buffer it already holds — and the canvas sits on a fill of its own, so the
 * frame shows whether it paints anything at all.
 */
const ContentSurfacesProbe = (): ReactNode => {
  const theme = useTheme();
  const image = useRef<ImgInstance>(null);
  const [imageStatus, setImageStatus] = useState("pending");
  // The upstream waveform example uses a layout effect: the pixels must be on
  // the element before the frame that paints it.
  useLayoutEffect(() => {
    const instance = image.current;
    if (instance === null) {
      setImageStatus("no-ref");
      return;
    }
    try {
      instance.setImagePixels(
        IMAGE_SIZE,
        IMAGE_SIZE,
        Buffer.from(imagePixels()),
      );
      setImageStatus("set");
    } catch (error) {
      setImageStatus(`threw ${String(error)}`);
    }
  }, []);
  return (
    <div
      testId="content-probe"
      style={{
        width: 760,
        height: 440,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: "flex", gap: theme.spacing.xl }}>
        <svg
          testId="chart-svg"
          source={CHART_SVG}
          style={{ width: 280, height: 100, color: hexOf(SVG_TINT) }}
        />
        <div
          testId="chart-layers"
          style={{ position: "relative", width: 280, height: 100 }}
        >
          {LAYER_SHAPES.map((shape) => (
            <svg
              key={shape}
              testId={`layer-${shape}`}
              source={layerSvg(shape)}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: 280,
                height: 100,
                color: hexOf(layerColour(shape)),
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: theme.spacing.lg }}>
        <img
          testId="url-image"
          src={IMAGE_DATA_URL}
          alt="A solid square from a data URL"
          objectFit="fill"
          style={{ width: 64, height: 64 }}
        />
        <img
          testId="buffer-image"
          ref={image}
          alt="A solid square from a pixel buffer"
          objectFit="fill"
          style={{ width: 64, height: 64 }}
        />
      </div>
      <div
        testId="canvas-parent"
        style={{
          width: 120,
          height: 40,
          backgroundColor: hexOf(CANVAS_PARENT),
        }}
      >
        <canvas testId="blank-canvas" style={{ width: 120, height: 40 }} />
      </div>
      <text testId="image-status">{imageStatus}</text>
    </div>
  );
};

/** How many pixels of `colour` the capture under `name` paints. */
const painted = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Rgb,
): Effect.Effect<number, Smoke.SmokeHostError> =>
  Effect.map(ctx.host.pixels(name), (frame) =>
    Pixels.countColour(frame, new Pixels.Rgba({ ...colour, a: 0xff })),
  );

/** Asserts that the capture paints `colour`. */
const expectPaints = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Rgb,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.flatMap(painted(ctx, name, colour), (count) =>
    ctx.expectEqual(label, count > 0, true),
  );

/** Asserts that the capture paints no pixel of `colour`. */
const expectAbsent = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  colour: Rgb,
  label: string,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.flatMap(painted(ctx, name, colour), (count) =>
    ctx.expectEqual(label, count, 0),
  );

const contentSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("content-probe");
    yield* ctx.host.capture("content");

    // 1. One `<svg>` with a whole chart in it: GPUI rasterises the markup and
    //    paints it in `style.color`, so every `fill` a chart author writes is
    //    replaced by one tint.
    yield* ctx.expectSome(
      "the svg surface occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("chart-svg")),
    );
    yield* expectPaints(
      ctx,
      "content",
      SVG_TINT,
      "an svg paints the tint its style names",
    );
    yield* expectAbsent(
      ctx,
      "content",
      SOURCE_FILL,
      "an svg does not paint the fills its markup names",
    );

    // 2. One shape per layer, each with its own tint: the only way this runtime
    //    can show a multi-colour chart.
    yield* Effect.forEach(
      LAYER_SHAPES,
      (shape) =>
        Effect.gen(function* () {
          yield* ctx.expectSome(
            `the ${shape} layer occupies space`,
            Option.fromNullishOr(yield* ctx.host.bounds(`layer-${shape}`)),
          );
          yield* expectPaints(
            ctx,
            "content",
            layerColour(shape),
            `the ${shape} layer paints its own tint`,
          );
        }),
      { concurrency: 1 },
    );

    // 3. An image the app holds as bytes: the route for a screenshot or a
    //    decoded photo, which needs no file on disk.
    yield* ctx.expectSome(
      "the buffer image occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("buffer-image")),
    );
    yield* ctx.expectEqual(
      "the buffer image's instance took the pixels",
      yield* ctx.host.text("image-status"),
      "set",
    );
    yield* expectPaints(
      ctx,
      "content",
      BUFFER_COLOUR,
      "an image paints a pixel buffer set after mount",
    );

    // 4. A data URL is the same bytes in a string; whether it loads is the
    //    runtime's answer, so this check records what the frame shows.
    yield* ctx.expectSome(
      "the data-url image occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("url-image")),
    );
    yield* expectPaints(
      ctx,
      "content",
      IMAGE_COLOUR,
      "a data-url image paints its bytes",
    );

    // 5. A canvas is a blank host element: it tracks no painted bounds and
    //    paints nothing, so the fill behind it shows through. Measured on
    //    0.11.0 — the matrix's "no 2D-context or draw props" claim, painted.
    yield* ctx.expectSome(
      "the canvas parent occupies space",
      Option.fromNullishOr(yield* ctx.host.bounds("canvas-parent")),
    );
    yield* ctx.expectEqual(
      "a canvas tracks no painted bounds",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("blank-canvas")),
      ),
      true,
    );
    yield* expectPaints(
      ctx,
      "content",
      CANVAS_PARENT,
      "the fill behind a canvas shows through",
    );
  });

/** The wheel probe's content: 24 rows of 40px in a 320×200 viewport. */
const SCROLL_ROWS = 24;
const SCROLL_ROW_HEIGHT = 40;
const SCROLL_VIEWPORT = { width: 320, height: 200 } as const;
/** Where the offset stops at the end: the viewport minus the content. */
const SCROLL_MAX = SCROLL_VIEWPORT.height - SCROLL_ROWS * SCROLL_ROW_HEIGHT;

/**
 * A vertical strip and the two scroll events, plus a jump control that calls the
 * last row's own `scrollIntoView`.
 *
 * The strip has no padding: the content height is exactly `rows × height`, so
 * the probe can name the clamp a wheel has to stop at instead of only checking
 * that the offset moved. Every row is a fixed height, so the text cannot grow
 * it.
 */
const ScrollProbe = (): ReactNode => {
  const theme = useTheme();
  const [events, setEvents] = useState(0);
  const [delta, setDelta] = useState(0);
  const [offset, setOffset] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const end = useRef<PublicInstance | null>(null);

  return (
    <div
      testId="scroll-probe"
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A wheel is hit-tested: only the strip scrolls, and it clamps at both
        ends.
      </text>
      <div
        testId="scroll-jump"
        role="button"
        onClick={() => end.current?.scrollIntoView?.()}
        style={{
          width: 120,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          jump to end
        </text>
      </div>
      <div
        testId="scroll-view"
        style={{
          ...SCROLL_VIEWPORT,
          overflow: "scroll",
          backgroundColor: theme.colors.card,
        }}
        onScroll={(event) => {
          setEvents((current) => current + 1);
          setDelta(event.deltaY ?? 0);
        }}
        onScrollChange={(event) =>
          setOffset({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
        }
      >
        {Array.from({ length: SCROLL_ROWS }, (_, index) => (
          <div
            key={index}
            testId={`scroll-row-${index}`}
            ref={index === SCROLL_ROWS - 1 ? end : undefined}
            style={{ height: SCROLL_ROW_HEIGHT }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              {`row ${index}`}
            </text>
          </div>
        ))}
      </div>
      <div
        testId="scroll-outside"
        style={{
          width: 200,
          height: 60,
          backgroundColor: theme.colors.muted,
        }}
      />
      <text
        testId="scroll-events"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`events=${events} delta=${delta}`}
      </text>
      <text
        testId="scroll-offset"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`x=${offset.x} y=${offset.y}`}
      </text>
    </div>
  );
};

const scrollSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("scroll-view");
    yield* Effect.sleep(SETTLE);

    const offsetOf = Effect.gen(function* () {
      return yield* ctx.expectSome(
        "the scroller reports a scroll offset",
        Option.fromNullishOr(yield* ctx.host.scrollOffset("scroll-view")),
      );
    });

    const atRest = yield* offsetOf;
    yield* ctx.expectEqual("the strip starts at the top", atRest.y, 0);
    yield* ctx.expectEqual("the strip starts on the X origin", atRest.x, 0);
    yield* ctx.expectEqual(
      "the scroll-change readout starts at the origin",
      yield* ctx.host.text("scroll-offset"),
      "x=0 y=0",
    );

    // The wheel is hit-tested, so an event over a sibling reaches no scroller.
    yield* ctx.host.wheel("scroll-outside", 0, -200);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel outside the strip does not move it",
      (yield* offsetOf).y,
      0,
    );
    yield* ctx.expectEqual(
      "onScroll does not fire for a wheel outside",
      yield* ctx.host.text("scroll-events"),
      "events=0 delta=0",
    );

    // GPUI's sign convention: a negative delta scrolls down.
    yield* ctx.host.wheel("scroll-view", 0, -200);
    yield* Effect.sleep(SETTLE);
    const scrolled = yield* offsetOf;
    yield* ctx.expectNear(
      "the wheel moves the strip by its own delta",
      scrolled.y,
      -200,
      1,
    );
    yield* ctx.expectEqual(
      "onScroll reports one wheel event and its delta",
      yield* ctx.host.text("scroll-events"),
      "events=1 delta=-200",
    );
    yield* ctx.expectEqual(
      "onScrollChange reports the pair the renderer holds",
      yield* ctx.host.text("scroll-offset"),
      `x=${scrolled.x} y=${scrolled.y}`,
    );

    yield* ctx.host.wheel("scroll-view", 0, 100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel past the start clamps at zero",
      (yield* offsetOf).y,
      0,
    );

    // The row's own `scrollIntoView`, with no wheel involved.
    yield* ctx.host.click("scroll-jump");
    yield* Effect.sleep(Duration.millis(300));
    const jumped = yield* offsetOf;
    yield* ctx.expectNear(
      "scrollIntoView reaches the end of the content",
      jumped.y,
      SCROLL_MAX,
      1,
    );
    const view = yield* paintedBox(ctx, "scroll-view");
    const last = yield* paintedBox(ctx, `scroll-row-${SCROLL_ROWS - 1}`);
    yield* ctx.expectEqual(
      "the last row is wholly inside the viewport after the reveal",
      last.y >= view.y && last.y + last.height <= view.y + view.height,
      true,
    );

    yield* ctx.host.wheel("scroll-view", 0, -100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "a wheel past the end clamps at the content's end",
      (yield* offsetOf).y,
      SCROLL_MAX,
      1,
    );
    yield* ctx.host.capture("scroll-end");
  });

/**
 * A scroll region reached by a real traversal and paged by real keys.
 *
 * `ScrollAreaViewport` is a tab stop with a keyboard contract — arrows move one
 * density row, PageUp/PageDown a viewport, Home/End the ends — but its handler
 * stands down unless the focus is its own, so the **window's** delivery path is
 * the thing to measure: a traversal has to land on the stop before any key can
 * move it, a chord has to stay the platform's, and a field inside has to keep
 * its arrows. The offscreen suite reaches the same contract through
 * `runtime.keyDown(elementId, …)`, which names the target and so proves none of
 * that (README §`keyboard-scroll-lifecycle`).
 *
 * The fixture (`keyboard-scroll.ts`) sizes both regions and predicts each
 * offset; the checks assert the value the renderer holds after the key.
 */
const KeyboardScrollProbe = (): ReactNode => (
  <PrimitiveThemeProvider theme={palettes.dark}>
    <KeyboardScrollStage />
  </PrimitiveThemeProvider>
);

/** A focusable, unfilled control: the tab stop on either side of a region. */
const KeyboardScrollStop = ({
  testId,
  label,
}: {
  readonly testId: string;
  readonly label: string;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      tabIndex={0}
      role="button"
      style={{
        width: 120,
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.muted,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

const KeyboardScrollStage = (): ReactNode => {
  const theme = useTheme();
  const [vertical, setVertical] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [horizontal, setHorizontal] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [value, setValue] = useState("");

  return (
    <div
      testId="kscroll-probe"
      style={{
        width: 760,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A traversal reaches the region, then the arrows, PageUp/PageDown, Home
        and End move the renderer&apos;s own offset. A field inside keeps its
        keys.
      </text>
      <KeyboardScrollStop
        testId={KEYBOARD_SCROLL_IDS.before}
        label="before the region"
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.lg,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
          }}
        >
          <ScrollArea
            axis="vertical"
            label="Rows"
            viewportTestId={KEYBOARD_SCROLL_IDS.vertical}
            style={{
              width: VERTICAL_VIEWPORT.width,
              height: VERTICAL_VIEWPORT.height,
            }}
            onScrollChange={(event) =>
              setVertical({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
            }
          >
            <div
              style={{
                height: FIELD_SLOT,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Input
                testId={KEYBOARD_SCROLL_IDS.field}
                label="Filter"
                value={value}
                onChange={setValue}
              />
            </div>
            {Array.from({ length: VERTICAL_ROWS }, (_, index) => (
              <div
                key={index}
                testId={`kscroll-row-${index}`}
                style={{ height: VERTICAL_ROW_HEIGHT }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  {`row ${index}`}
                </text>
              </div>
            ))}
          </ScrollArea>
          <text
            testId={KEYBOARD_SCROLL_IDS.readout}
            style={{
              ...textStyle(theme, "code"),
              color: theme.colors.mutedForeground,
            }}
          >
            {offsetText(vertical)}
          </text>
          <text
            testId={KEYBOARD_SCROLL_IDS.value}
            style={{
              ...textStyle(theme, "code"),
              color: theme.colors.mutedForeground,
            }}
          >
            {`value=${value}`}
          </text>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
          }}
        >
          <ScrollArea
            axis="horizontal"
            label="Columns"
            viewportTestId={KEYBOARD_SCROLL_IDS.horizontal}
            style={{
              width: HORIZONTAL_VIEWPORT.width,
              height: HORIZONTAL_VIEWPORT.height,
            }}
            onScrollChange={(event) =>
              setHorizontal({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
            }
          >
            <div style={{ display: "flex", flexDirection: "row" }}>
              {Array.from({ length: HORIZONTAL_COLUMNS }, (_, index) => (
                <div
                  key={index}
                  testId={`kscroll-column-${index}`}
                  style={{
                    width: HORIZONTAL_COLUMN_WIDTH,
                    height: HORIZONTAL_VIEWPORT.height - 40,
                  }}
                >
                  <text
                    style={{
                      ...textStyle(theme, "body"),
                      color: theme.colors.foreground,
                    }}
                  >
                    {`col ${index}`}
                  </text>
                </div>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea
            axis="vertical"
            focusable={false}
            label="Inert rows"
            viewportTestId={KEYBOARD_SCROLL_IDS.inert}
            style={{ width: 200, height: 120 }}
          >
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} style={{ height: VERTICAL_ROW_HEIGHT }}>
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  {`inert ${index}`}
                </text>
              </div>
            ))}
          </ScrollArea>
          <text
            testId={`${KEYBOARD_SCROLL_IDS.readout}-horizontal`}
            style={{
              ...textStyle(theme, "code"),
              color: theme.colors.mutedForeground,
            }}
          >
            {offsetText(horizontal)}
          </text>
        </div>
      </div>
      <KeyboardScrollStop
        testId={KEYBOARD_SCROLL_IDS.after}
        label="after the region"
      />
    </div>
  );
};

const keyboardScrollSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(KEYBOARD_SCROLL_IDS.vertical);

    const { vertical, horizontal, inert, field, before, after } =
      KEYBOARD_SCROLL_IDS;
    const line = lineStep(palettes.dark);
    const verticalPage = VERTICAL_VIEWPORT.height;
    const horizontalPage = HORIZONTAL_VIEWPORT.width;

    /** The offset the renderer holds for one region. */
    const offsetOf = (
      id: string,
    ): Effect.Effect<
      Smoke.Offset,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `the region ${id} reports a scroll offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(id)),
        );
      });

    /**
     * Presses one key and holds the renderer's answer to the prediction.
     *
     * The renderer moves the scroller; the fixture only says where the move
     * should end, so a drifted contract fails on the window's own value.
     */
    const moved = (
      id: string,
      action: ScrollAction,
      axis: "x" | "y",
      from: number,
      page: number,
      max: number,
    ): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        yield* ctx.host.key(action);
        yield* Effect.sleep(SETTLE);
        const current = yield* offsetOf(id);
        yield* ctx.expectNear(
          `${action} moves ${id}`,
          axis === "x" ? current.x : current.y,
          predictedOffset(from, action, line, page, max),
          1,
        );
      });

    // The traversal is the only route a window has into the region: a key aimed
    // at an element that is not focused cannot scroll it.
    yield* ctx.host.focusElement(before);
    yield* ctx.expectEqual(
      "the control before the region takes the focus",
      yield* focusedAfterPaint(ctx),
      before,
    );
    yield* ctx.host.focusNext();
    yield* ctx.expectEqual(
      "a native traversal lands on the scroll region",
      yield* focusedAfterPaint(ctx),
      vertical,
    );

    yield* ctx.expectEqual(
      "the region starts at the origin",
      offsetText(yield* offsetOf(vertical)),
      "x=0 y=0",
    );
    yield* moved(vertical, "down", "y", 0, verticalPage, VERTICAL_MAX);
    yield* ctx.expectEqual(
      "the region's own readout follows the key",
      yield* ctx.host.text(KEYBOARD_SCROLL_IDS.readout),
      offsetText(yield* offsetOf(vertical)),
    );
    yield* moved(vertical, "down", "y", -line, verticalPage, VERTICAL_MAX);
    yield* moved(vertical, "up", "y", -2 * line, verticalPage, VERTICAL_MAX);
    yield* moved(vertical, "pagedown", "y", -line, verticalPage, VERTICAL_MAX);

    // A chord belongs to the platform: `Cmd+Home` is a document shortcut, not a
    // scroll, so the region keeps the offset it had.
    yield* ctx.host.key("cmd-home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "a chorded Home leaves the region where it was",
      (yield* offsetOf(vertical)).y,
      -line - verticalPage,
      1,
    );

    yield* moved(vertical, "home", "y", 0, verticalPage, VERTICAL_MAX);
    yield* ctx.expectEqual(
      "Home returns the region to the origin",
      offsetText(yield* offsetOf(vertical)),
      "x=0 y=0",
    );
    yield* moved(vertical, "pagedown", "y", 0, verticalPage, VERTICAL_MAX);
    yield* moved(
      vertical,
      "pagedown",
      "y",
      -verticalPage,
      verticalPage,
      VERTICAL_MAX,
    );
    // A third page asks for more than the content has: the runtime clamps it.
    yield* moved(
      vertical,
      "pagedown",
      "y",
      VERTICAL_MAX,
      verticalPage,
      VERTICAL_MAX,
    );
    yield* ctx.expectEqual(
      "a page past the end reports no offset beyond the content",
      (yield* offsetOf(vertical)).y,
      VERTICAL_MAX,
    );
    yield* moved(vertical, "home", "y", 0, verticalPage, VERTICAL_MAX);
    yield* moved(vertical, "end", "y", 0, verticalPage, VERTICAL_MAX);
    yield* ctx.expectEqual(
      "End reaches the content's own end",
      (yield* offsetOf(vertical)).y,
      VERTICAL_MAX,
    );
    yield* moved(vertical, "home", "y", 0, verticalPage, VERTICAL_MAX);
    yield* moved(vertical, "up", "y", 0, verticalPage, VERTICAL_MAX);
    yield* moved(vertical, "pageup", "y", 0, verticalPage, VERTICAL_MAX);

    // A field inside the region keeps its keys: the viewport scrolls only while
    // the focus is its own. A press starts the platform's text session, which a
    // programmatic focus does not (README §`text-input`).
    yield* ctx.host.click(field);
    yield* ctx.expectEqual(
      "the field inside the region takes the focus",
      yield* focusedAfterPaint(ctx),
      field,
    );
    yield* ctx.host.key("a");
    yield* ctx.host.key("b");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing reaches the field inside the region",
      yield* ctx.host.text(KEYBOARD_SCROLL_IDS.value),
      "value=ab",
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow in the field does not scroll its region",
      (yield* offsetOf(vertical)).y,
      0,
    );

    // A sideways region answers the horizontal keys and pages by its width; a
    // vertical key is not its own, so it moves nothing.
    yield* ctx.host.focusElement(horizontal);
    yield* ctx.expectEqual(
      "a native focus reaches the sideways region",
      yield* focusedAfterPaint(ctx),
      horizontal,
    );
    yield* moved(horizontal, "right", "x", 0, horizontalPage, HORIZONTAL_MAX);
    yield* moved(
      horizontal,
      "pagedown",
      "x",
      -line,
      horizontalPage,
      HORIZONTAL_MAX,
    );
    yield* moved(horizontal, "end", "x", 0, horizontalPage, HORIZONTAL_MAX);
    yield* ctx.expectEqual(
      "End reaches the sideways content's own end",
      (yield* offsetOf(horizontal)).x,
      HORIZONTAL_MAX,
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a vertical key leaves the sideways region still",
      (yield* offsetOf(horizontal)).y,
      0,
    );
    yield* ctx.expectEqual(
      "the sideways region keeps its pan through a vertical key",
      (yield* offsetOf(horizontal)).x,
      HORIZONTAL_MAX,
    );
    yield* moved(horizontal, "home", "x", 0, horizontalPage, HORIZONTAL_MAX);

    // A region with `focusable={false}` is no tab stop and answers no keys.
    yield* ctx.host.focusElement(horizontal);
    yield* ctx.host.focusNext();
    yield* ctx.expectEqual(
      "a traversal skips the region that opted out",
      yield* focusedAfterPaint(ctx),
      after,
    );
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a region that opted out answers no key",
      (yield* offsetOf(inert)).y,
      0,
    );
    yield* ctx.host.capture("keyboard-scroll");
  });

/**
 * A scroller inside a scroller: the page a pane's list sits in.
 *
 * A dock pane, a dialog body and a settings form all put a scroller inside
 * another one, so the wheel has a routing decision to make: does the inner
 * scroller keep it while it can move, does the outer one take it when the inner
 * reaches its end, and does the inner's event reach an ancestor's `onScroll`
 * handler? The fixture's geometry (`nested-scroll.ts`) puts the inner scroller
 * wholly inside the page and the page-only wheel on a filler row the list does
 * not cover, so each wheel can only be aimed at the scroller it names.
 */
const NestedScrollProbe = (): ReactNode => {
  const theme = useTheme();
  const [inner, setInner] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [outer, setOuter] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [innerEvents, setInnerEvents] = useState(0);
  const [outerEvents, setOuterEvents] = useState(0);
  const [listPage, setListPage] = useState<Smoke.Offset>({ x: 0, y: 0 });
  const [listEvents, setListEvents] = useState(0);

  return (
    <div
      testId="nested-probe"
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.xl,
      }}
    >
      <div
        style={{
          width: OUTER_VIEWPORT.width,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Wheeling over the list scrolls the page behind it too: one wheel moves
          every scroller above the pointer.
        </text>
        <div
          testId="nested-outer"
          style={{
            ...OUTER_VIEWPORT,
            overflow: "scroll",
            backgroundColor: theme.colors.card,
          }}
          onScroll={() => setOuterEvents((current) => current + 1)}
          onScrollChange={(event) =>
            setOuter({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
          }
        >
          <div
            testId="nested-inner"
            style={{
              ...INNER_VIEWPORT,
              overflow: "scroll",
              backgroundColor: theme.colors.muted,
            }}
            onScroll={() => setInnerEvents((current) => current + 1)}
            onScrollChange={(event) =>
              setInner({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
            }
          >
            {Array.from({ length: INNER_ROWS }, (_, index) => (
              <div
                key={index}
                testId={`nested-inner-row-${index}`}
                style={{ height: INNER_ROW_HEIGHT }}
              >
                <text
                  style={{
                    ...textStyle(theme, "body"),
                    color: theme.colors.foreground,
                  }}
                >
                  {`inner ${index}`}
                </text>
              </div>
            ))}
          </div>
          {Array.from({ length: FILLER_ROWS }, (_, index) => (
            <div
              key={index}
              testId={`nested-filler-${index}`}
              style={{ height: FILLER_ROW_HEIGHT }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {`page ${index}`}
              </text>
            </div>
          ))}
        </div>
        <text
          testId="nested-inner-offset"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`inner=x${inner.x} y${inner.y} events=${innerEvents}`}
        </text>
        <text
          testId="nested-outer-offset"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`outer=x${outer.x} y${outer.y} events=${outerEvents}`}
        </text>
      </div>
      <div
        style={{
          width: PANE_PAGE_VIEWPORT.width,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          The same page with a virtual list as the pane:
        </text>
        <div
          testId="nested-list-page"
          style={{
            ...PANE_PAGE_VIEWPORT,
            overflow: "scroll",
            backgroundColor: theme.colors.card,
          }}
          onScroll={() => setListEvents((current) => current + 1)}
          onScrollChange={(event) =>
            setListPage({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
          }
        >
          <div
            testId="nested-list-frame"
            style={{ height: PANE_VIEWPORT, display: "flex" }}
          >
            <virtual-list
              testId="nested-list"
              style={{ flexGrow: 1, minHeight: 0 }}
            >
              {Array.from({ length: PANE_ROWS }, (_, index) => (
                <div
                  key={index}
                  testId={`nested-list-row-${index}`}
                  style={{ height: PANE_ROW_HEIGHT }}
                >
                  <text
                    style={{
                      ...textStyle(theme, "body"),
                      color: theme.colors.foreground,
                    }}
                  >
                    {`pane row ${index}`}
                  </text>
                </div>
              ))}
            </virtual-list>
          </div>
          {Array.from({ length: PANE_FILLER_ROWS }, (_, index) => (
            <div
              key={index}
              testId={`nested-list-filler-${index}`}
              style={{ height: PANE_FILLER_HEIGHT }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {`list page ${index}`}
              </text>
            </div>
          ))}
        </div>
        <text
          testId="nested-list-offset"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.mutedForeground,
          }}
        >
          {`page=x${listPage.x} y${listPage.y} events=${listEvents}`}
        </text>
      </div>
    </div>
  );
};

const nestedScrollSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("nested-inner-row-0");
    yield* Effect.sleep(SETTLE);

    const offsetOf = (
      testId: string,
    ): Effect.Effect<
      Smoke.Offset,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `the ${testId} scroller reports an offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
        );
      });

    const innerOffset = yield* offsetOf("nested-inner");
    const outerOffset = yield* offsetOf("nested-outer");
    yield* ctx.expectEqual(
      "the inner list starts at the top",
      innerOffset.y,
      0,
    );
    yield* ctx.expectEqual("the page starts at the top", outerOffset.y, 0);

    // The geometry the two wheels rest on: the inner is wholly inside the
    // outer's viewport, and the filler row the page-only wheel aims at starts
    // below the inner, so that wheel cannot land on the list.
    const outerBox = yield* paintedBox(ctx, "nested-outer");
    const innerBox = yield* paintedBox(ctx, "nested-inner");
    const fillerBox = yield* paintedBox(ctx, `nested-filler-${OUTER_ONLY_ROW}`);
    yield* ctx.expectEqual(
      "the inner scroller is painted inside the page scroller",
      innerBox.y >= outerBox.y &&
        innerBox.y + innerBox.height <= outerBox.y + outerBox.height &&
        innerBox.x >= outerBox.x &&
        innerBox.x + innerBox.width <= outerBox.x + outerBox.width,
      true,
    );
    yield* ctx.expectEqual(
      "the page-only wheel aims at a row below the inner list",
      fillerBox.y >= innerBox.y + innerBox.height,
      true,
    );

    // One wheel over the inner list: the measured routing question.
    yield* ctx.host.wheel("nested-inner", 0, INNER_STEP);
    yield* Effect.sleep(SETTLE);
    const innerMoved = yield* offsetOf("nested-inner");
    yield* ctx.expectNear(
      "the inner list takes the wheel's own delta",
      innerMoved.y,
      INNER_STEP,
      1,
    );
    const pageAlong = yield* offsetOf("nested-outer");
    yield* ctx.expectNear(
      "the page scrolls by the same wheel, though the inner list had 240px left",
      pageAlong.y,
      INNER_STEP,
      1,
    );
    yield* ctx.expectEqual(
      "the page's handler heard the wheel aimed inside the list",
      yield* ctx.host.text("nested-outer-offset"),
      `outer=x0 y${INNER_STEP} events=1`,
    );

    // The one wheel that moves a single scroller: aimed below the list.
    yield* ctx.host.wheel(`nested-filler-${OUTER_ONLY_ROW}`, 0, -INNER_STEP);
    yield* Effect.sleep(SETTLE);
    const pageBack = yield* offsetOf("nested-outer");
    yield* ctx.expectNear(
      "a wheel outside the list takes the page back on its own",
      pageBack.y,
      0,
      1,
    );
    yield* ctx.expectNear(
      "the page's wheel leaves the list untouched",
      (yield* offsetOf("nested-inner")).y,
      INNER_STEP,
      1,
    );

    // At the inner's end the page still takes the whole delta: each scroller
    // clamps against its own content, not the other's.
    yield* ctx.host.wheel("nested-inner", 0, -100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the inner list clamps at its content's end",
      (yield* offsetOf("nested-inner")).y,
      INNER_MAX,
      1,
    );
    yield* ctx.expectNear(
      "the page clamps against its own content, not the list's end",
      (yield* offsetOf("nested-outer")).y,
      OUTER_MAX,
      1,
    );

    yield* ctx.expectEqual(
      "the inner readout carries the end and every wheel it heard",
      yield* ctx.host.text("nested-inner-offset"),
      `inner=x0 y${INNER_MAX} events=2`,
    );
    yield* ctx.expectEqual(
      "the page readout counts the wheels aimed inside the list too",
      yield* ctx.host.text("nested-outer-offset"),
      `outer=x0 y${OUTER_MAX} events=3`,
    );

    // The same question for the pane a dock actually ships: a virtual list,
    // which is a native scroll host rather than an `overflow: "scroll"` box.
    yield* ctx.host.waitFor("nested-list-row-0");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the list page starts at the top",
      (yield* offsetOf("nested-list-page")).y,
      0,
    );
    yield* ctx.expectEqual(
      "the virtual list paints its first row",
      Arr.contains(yield* ctx.host.paintedText(), "pane row 0"),
      true,
    );
    yield* ctx.host.wheel("nested-list-frame", 0, INNER_STEP);
    yield* Effect.sleep(Duration.millis(300));
    yield* ctx.expectEqual(
      "the wheel reached the virtual list, whose first row is now gone",
      Arr.contains(yield* ctx.host.paintedText(), "pane row 0"),
      false,
    );
    const listPageMoved = yield* offsetOf("nested-list-page");
    yield* ctx.expectNear(
      "the page behind the virtual list scrolls by the same wheel",
      listPageMoved.y,
      INNER_STEP,
      1,
    );
    yield* ctx.expectEqual(
      "the list page's readout carries the offset and the wheel it heard",
      yield* ctx.host.text("nested-list-offset"),
      `page=x0 y${INNER_STEP} events=1`,
    );
    yield* ctx.host.capture("nested-scroll");
  });

/** The split probe's container width, inside the window. */
const SPLIT_CONTAINER = 500;

/**
 * A two-pane split whose divider is the resize handle.
 *
 * The pane widths are the split's own state; the readout is the caller's copy of
 * each `onResize`, so a drag that repaints the pane but never reaches the caller
 * fails separately from one that does not move at all.
 */
const SplitPaneProbe = (): ReactNode => {
  const theme = useTheme();
  const [size, setSize] = useState(320);
  const [moves, setMoves] = useState(0);

  return (
    <div
      testId="split-probe"
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Drag the divider: pane A takes the width it is dragged to, and the
        container stays put.
      </text>
      <div style={{ width: SPLIT_CONTAINER, height: 160 }}>
        <SplitPane
          id="split"
          initial={320}
          min={80}
          max={520}
          onResize={(next) => {
            setSize(next);
            setMoves((current) => current + 1);
          }}
          primary={
            <div
              testId="split-left"
              style={{
                height: "100%",
                backgroundColor: theme.colors.muted,
              }}
            />
          }
          secondary={
            <div
              testId="split-right"
              style={{ height: "100%", backgroundColor: theme.colors.card }}
            />
          }
        />
      </div>
      <text
        testId="split-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`split=${size}`}
      </text>
      <text
        testId="split-moves"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`moves=${moves}`}
      </text>
    </div>
  );
};

const splitSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("split-divider");
    yield* Effect.sleep(SETTLE);

    yield* ctx.expectEqual(
      "the split starts at its initial width",
      yield* ctx.host.text("split-readout"),
      "split=320",
    );
    const start = yield* paintedBox(ctx, "split-pane-a");
    yield* ctx.expectNear(
      "pane A paints the initial width",
      start.width,
      320,
      1,
    );
    const divider = yield* paintedBox(ctx, "split-divider");
    yield* ctx.expectNear(
      "the divider sits on pane A's right edge",
      divider.x,
      start.x + start.width,
      1,
    );

    // Every drag stays inside the window: a pointer that leaves it stops
    // delivering moves, which would measure the OS rather than the split.
    yield* ctx.host.drag("split-divider", 80, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag grows the pane by its travel",
      yield* ctx.host.text("split-readout"),
      "split=400",
    );
    const grown = yield* paintedBox(ctx, "split-pane-a");
    yield* ctx.expectNear(
      "the painted pane follows the resize",
      grown.width,
      400,
      1,
    );
    yield* ctx.expectEqual(
      "every move of the drag reached the divider, 6px wide and left behind",
      yield* ctx.host.text("split-moves"),
      "moves=8",
    );

    yield* ctx.host.drag("split-divider", -320, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag past the minimum clamps",
      yield* ctx.host.text("split-readout"),
      "split=80",
    );

    yield* ctx.host.drag("split-divider", 600, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag past the maximum clamps",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );

    yield* ctx.host.drag("split-pane-a", 40, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag on the pane itself resizes nothing",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );

    yield* ctx.host.capture("split-resized");

    // The keyboard half. A divider reachable only by pointer is not operable,
    // and the ring is the cue that tells a keyboard reader where the keys go.
    const ring = yield* ctx.expectSome(
      "the theme names a ring colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.ring)),
    );
    yield* ctx.host.capture("split-rest");
    yield* ctx.expectEqual(
      "a pressed divider paints no keyboard ring",
      yield* paintedPixels(ctx, "split-rest", ring),
      0,
    );

    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Tab puts the keyboard on the divider",
      yield* focusedAfterPaint(ctx),
      "split-divider",
    );
    yield* ctx.expectEqual(
      "reaching the divider with a key resizes nothing",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );
    yield* ctx.host.capture("split-focused");
    yield* ctx.expectEqual(
      "the focused divider paints the keyboard ring",
      (yield* paintedPixels(ctx, "split-focused", ring)) > 0,
      true,
    );

    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key narrows the pane by one step",
      yield* ctx.host.text("split-readout"),
      "split=504",
    );
    const narrowed = yield* paintedBox(ctx, "split-pane-a");
    yield* ctx.expectNear(
      "the painted pane follows a key resize",
      narrowed.width,
      504,
      1,
    );
    const narrowedDivider = yield* paintedBox(ctx, "split-divider");
    yield* ctx.expectNear(
      "the divider follows the key resize",
      narrowedDivider.x,
      narrowed.x + narrowed.width,
      1,
    );
    yield* ctx.expectEqual(
      "the divider keeps the focus after a key resize",
      yield* focusedAfterPaint(ctx),
      "split-divider",
    );

    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the opposite arrow widens it back",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow held at the maximum clamps",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );

    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home jumps to the caller's minimum",
      yield* ctx.host.text("split-readout"),
      "split=80",
    );
    const collapsed = yield* paintedBox(ctx, "split-pane-a");
    yield* ctx.expectNear(
      "the painted pane is the minimum Home named",
      collapsed.width,
      80,
      1,
    );

    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End jumps to the caller's maximum",
      yield* ctx.host.text("split-readout"),
      "split=520",
    );

    yield* ctx.host.capture("split-keyboard");
  });

/**
 * The shipped `@gpuixui/dock` `SplitPane`, not a probe-local copy.
 *
 * `split-pane-lifecycle` measures the runtime rules a divider must honour; this
 * probe measures that the component the library actually ships composes them —
 * the controlled `size`, the painted pane, the Tab stop, the ring and the
 * arrow/Home/End steps. A local split would keep the feasibility measurement
 * green while the shipped component drifted.
 *
 * The pointer half is **blocked by the component**, not by the runtime: a press
 * on the shipped divider focuses nothing and reports no resize, because its
 * absolutely positioned highlight layer takes the hit test. That is recorded for
 * the dock owner in `TODO.md` (`Divider`'s pointer path) and the probe measures
 * the keyboard contract until it lands.
 */
const DockSplitProbe = (): ReactNode => {
  const theme = useTheme();
  const [size, setSize] = useState(320);
  const [resizes, setResizes] = useState(0);

  return (
    <div
      testId="dock-split-probe"
      style={{
        width: 720,
        height: 420,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped SplitPane: focus the divider with Tab and use the arrows,
        Home and End.
      </text>
      <div style={{ width: 500, height: 140 }}>
        <DockSplitPane
          size={size}
          min={80}
          max={440}
          dividerLabel="Shipped pane width"
          testId="dock-split"
          onResize={(next) => {
            setSize(next);
            setResizes((current) => current + 1);
          }}
          first={
            <div
              testId="dock-split-left"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: theme.colors.muted,
              }}
            />
          }
          second={
            <div
              testId="dock-split-right"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: theme.colors.card,
              }}
            />
          }
        />
      </div>
      <text
        testId="dock-split-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${Math.round(size)} px`}
      </text>
      <text
        testId="dock-split-resizes"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`resizes=${resizes}`}
      </text>
    </div>
  );
};

const dockSplitSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("dock-split-readout");
    yield* Effect.sleep(SETTLE);

    yield* ctx.expectEqual(
      "the shipped split starts at the caller's size",
      yield* ctx.host.text("dock-split-readout"),
      "320 px",
    );
    const start = yield* paintedBox(ctx, "dock-split-left");
    yield* ctx.expectNear(
      "the shipped first pane paints the caller's size",
      start.width,
      320,
      1,
    );
    const divider = yield* paintedBox(ctx, "dock-split-divider");
    yield* ctx.expectNear(
      "the shipped divider sits on the first pane's right edge",
      divider.x,
      start.x + start.width,
      1,
    );

    // The ring is the cue that tells a keyboard reader where the keys go.
    const ring = yield* ctx.expectSome(
      "the theme names a ring colour",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.ring)),
    );
    yield* ctx.host.capture("dock-split-rest");
    yield* ctx.expectEqual(
      "a divider no key has reached paints no keyboard ring",
      yield* paintedPixels(ctx, "dock-split-rest", ring),
      0,
    );

    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Tab puts the keyboard on the shipped divider",
      yield* focusedAfterPaint(ctx),
      "dock-split-divider",
    );
    yield* ctx.host.capture("dock-split-focused");
    yield* ctx.expectEqual(
      "the focused shipped divider paints the keyboard ring",
      (yield* paintedPixels(ctx, "dock-split-focused", ring)) > 0,
      true,
    );

    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow widens the shipped pane by one step and reports it",
      `${yield* ctx.host.text("dock-split-readout")} ${yield* ctx.host.text("dock-split-resizes")}`,
      "336 px resizes=1",
    );
    const grown = yield* paintedBox(ctx, "dock-split-left");
    yield* ctx.expectNear(
      "the shipped pane paints the widened size",
      grown.width,
      336,
      1,
    );
    yield* ctx.expectEqual(
      "the shipped divider keeps the focus after a key resize",
      yield* focusedAfterPaint(ctx),
      "dock-split-divider",
    );

    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the opposite arrow narrows it back",
      yield* ctx.host.text("dock-split-readout"),
      "320 px",
    );

    yield* ctx.host.key("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home jumps to the caller's minimum",
      yield* ctx.host.text("dock-split-readout"),
      "80 px",
    );
    const collapsed = yield* paintedBox(ctx, "dock-split-left");
    yield* ctx.expectNear(
      "the shipped pane paints the minimum Home named",
      collapsed.width,
      80,
      1,
    );

    yield* ctx.host.key("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End jumps to the caller's maximum",
      yield* ctx.host.text("dock-split-readout"),
      "440 px",
    );

    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow held at the maximum clamps",
      yield* ctx.host.text("dock-split-readout"),
      "440 px",
    );

    yield* ctx.host.capture("dock-split-keyboard");
  });

/** The virtual list probe's row height and count, and its viewport. */
const VLIST_ROWS = 5000;
const VLIST_ROW_HEIGHT = 32;
const VLIST_VIEWPORT = 280;

/**
 * A `<virtual-list>` of 5 000 rows in a 280px viewport.
 *
 * The retained tree holds all 5 000 children; the runtime builds and paints only
 * those near the viewport, so the check is the painted text, never the child
 * count. `onVisibleRange` is the event a table needs to know where it is.
 */
const VirtualListProbe = (): ReactNode => {
  const theme = useTheme();
  const [first, setFirst] = useState(-1);
  const [last, setLast] = useState(-1);
  const [reports, setReports] = useState(0);

  return (
    <div
      testId="vlist-probe"
      style={{
        width: 420,
        height: 420,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        5 000 rows, one viewport: only the painted window exists.
      </text>
      <div
        testId="vlist-frame"
        style={{ display: "flex", height: VLIST_VIEWPORT }}
      >
        <virtual-list
          testId="vlist"
          style={{ flexGrow: 1, minHeight: 0 }}
          onVisibleRange={(event) => {
            setFirst(event.startIndex ?? -1);
            setLast(event.endIndex ?? -1);
            setReports((current) => current + 1);
          }}
        >
          {Array.from({ length: VLIST_ROWS }, (_, index) => (
            <div
              key={index}
              testId={`vlist-row-${index}`}
              style={{ height: VLIST_ROW_HEIGHT }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.foreground,
                }}
              >
                {`row ${index}`}
              </text>
            </div>
          ))}
        </virtual-list>
      </div>
      <text
        testId="vlist-range"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`first=${first} last=${last} reports=${reports}`}
      </text>
    </div>
  );
};

/** The `row <n>` lines the window actually painted. */
const paintedRows = (lines: ReadonlyArray<string>): number =>
  Arr.length(Arr.filter(lines, (line) => Str.startsWith("row ")(line)));

const virtualListSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("vlist");
    yield* Effect.sleep(SETTLE);

    const atRest = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the window paints the first row",
      Arr.contains(atRest, "row 0"),
      true,
    );
    yield* ctx.expectEqual(
      "the last of 5 000 rows is not painted",
      Arr.contains(atRest, `row ${VLIST_ROWS - 1}`),
      false,
    );
    const painted = paintedRows(atRest);
    yield* ctx.expectEqual(
      "only a window of rows exists, not the retained 5 000",
      painted > 0 && painted < 40,
      true,
    );
    yield* ctx.expectEqual(
      "no visible range is reported before the first scroll",
      yield* ctx.host.text("vlist-range"),
      "first=-1 last=-1 reports=0",
    );

    // A `<virtual-list>` reports no painted bounds of its own, so the wheel is
    // aimed at the frame it fills; the hit test still lands on the list.
    yield* ctx.host.wheel("vlist-frame", 0, -400);
    yield* Effect.sleep(Duration.millis(300));
    const scrolled = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the painted window moves past the first row",
      Arr.contains(scrolled, "row 0"),
      false,
    );
    const firstReport = yield* ctx.host.text("vlist-range");
    yield* ctx.expectEqual(
      "the first report still starts at the first row (measured lag)",
      Str.includes("first=0 last=")(firstReport),
      true,
    );
    yield* ctx.expectEqual(
      "one scroll reports one range",
      Str.includes("reports=1")(firstReport),
      true,
    );
    yield* ctx.host.capture("vlist-scrolled");

    // A second scroll's report carries the range the first one reached: the
    // event lags one scroll, so a table cannot read the current window from it.
    yield* ctx.host.wheel("vlist-frame", 0, -400);
    yield* Effect.sleep(Duration.millis(300));
    const secondReport = yield* ctx.host.text("vlist-range");
    yield* ctx.expectEqual(
      "the second report has caught up to the moved window",
      Str.includes("first=0 ")(secondReport),
      false,
    );
    yield* ctx.expectEqual(
      "two scrolls report two ranges",
      Str.includes("reports=2")(secondReport),
      true,
    );

    // Past the start clamps back to the first row.
    yield* ctx.host.wheel("vlist-frame", 0, 100000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel past the start returns to the first row",
      Arr.contains(yield* ctx.host.paintedText(), "row 0"),
      true,
    );
  });

/**
 * One paginated list with a loading void at the edge `direction` names.
 *
 * `correct` applies `loadingRowRestore` after the commit; the twin without it
 * lets the runtime keep whatever row it anchored, which is the behaviour the
 * probe measures against.
 */
const LoadingRowList = ({
  testId,
  prefix,
  direction,
  correct,
}: {
  readonly testId: string;
  readonly prefix: string;
  readonly direction: PageDirection;
  readonly correct: boolean;
}): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [page, setPage] = useState(0);
  const [corrections, setCorrections] = useState(0);
  const [guards, setGuards] = useState(0);
  const [request, setRequest] = useState("none");

  const messages = messageIds(direction, page);
  const loadingRow = voidRow(direction, messages.length);

  const load = (): void => {
    const target = Option.flatMap(
      Option.fromNullishOr(list.current?.id),
      (elementId) =>
        Option.map(
          Option.fromNullishOr(
            listAnchorOf(renderer?.getListScrollTop?.(elementId) ?? null),
          ),
          (anchor) => ({ elementId, anchor }),
        ),
    );
    // The reader's place, decided before the commit and applied after it.
    const arrival = Option.flatMap(target, ({ elementId, anchor }) =>
      Option.map(
        loadingRowRestore({
          direction,
          anchor,
          voidRow: loadingRow,
          pageRows: PAGE_ROWS,
          edgeHeight: EDGE_HEIGHT,
        }),
        (scroll) => ({ elementId, scroll }),
      ),
    );
    // Commit the splice **synchronously** before queueing the scroll: the
    // runtime applies a queued list scroll on the next render, and a scroll
    // queued before the splice lands would name rows in the old child list.
    flushSync(() => setPage(page + 1));
    if (!correct) return;
    Option.match(arrival, {
      onNone: () => setGuards((count) => count + 1),
      onSome: ({ elementId, scroll }) => {
        renderer?.scrollToItem?.(elementId, scroll.index, scroll.offsetInItem);
        setRequest(`${scroll.index}:${scroll.offsetInItem}`);
        setCorrections((count) => count + 1);
      },
    });
  };

  const row = (id: number) => (
    <div key={id} testId={`${testId}-row-${id}`} style={{ height: ROW_HEIGHT }}>
      <text
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {`${prefix} ${id}`}
      </text>
    </div>
  );

  const edge = (
    <div
      key="loading-row"
      testId={`${testId}-void`}
      style={{
        height: EDGE_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`${prefix} loading`}
      </text>
    </div>
  );

  const rows = Arr.map(messages, row);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        testId={`${testId}-frame`}
        style={{ display: "flex", height: VIEWPORT_HEIGHT }}
      >
        <virtual-list
          ref={list}
          testId={testId}
          alignment={direction === "append" ? "bottom" : "top"}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {direction === "prepend"
            ? Arr.prepend(rows, edge)
            : Arr.append(rows, edge)}
        </virtual-list>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Pressable
          testId={`${testId}-load`}
          onClick={load}
          style={{ padding: theme.spacing.xs }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            load page
          </text>
        </Pressable>
        <Readout testId={`${testId}-readout`}>
          {`pages=${page} corrected=${corrections} guarded=${guards} request=${request}`}
        </Readout>
      </div>
    </div>
  );
};

/**
 * The loading-row correction, measured on both edges of a paginated history.
 *
 * Four lists, identical geometry, in two pairs (top void and bottom void): the
 * left pair is left to the runtime, the right pair re-anchors. The reader waits
 * in the void, a page arrives, and the probe asserts the pixel the message they
 * were reading keeps — or loses.
 */
const LoadingRowProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="loading-row-probe"
      style={{
        width: 880,
        height: 500,
        padding: theme.spacing.md,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A page arrives while the reader waits in the loading row. The runtime
        anchors that row, so only the app can put the reader back.
      </text>
      <div style={{ display: "flex", gap: 16 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: 410,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            no correction — the splice keeps the loading row
          </text>
          <LoadingRowList
            testId="loading-top-naive"
            prefix="naive older"
            direction="prepend"
            correct={false}
          />
          <LoadingRowList
            testId="loading-bottom-naive"
            prefix="naive newer"
            direction="append"
            correct={false}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: 410,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            re-anchored on the message under the loading row
          </text>
          <LoadingRowList
            testId="loading-top-fixed"
            prefix="fixed older"
            direction="prepend"
            correct
          />
          <LoadingRowList
            testId="loading-bottom-fixed"
            prefix="fixed newer"
            direction="append"
            correct
          />
        </div>
      </div>
    </div>
  );
};

/**
 * The `loading-row-correction` steps: the same arrival on both edges, once left
 * to the runtime and once re-anchored by the app.
 *
 * Every expected number comes from `loading-row.ts`, so the probe cannot drift
 * from the rule its unit test guards.
 */
const loadingRowSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The painted box of `testId`, or `None` when the row is not painted. */
    const boxOf = (testId: string) =>
      Effect.map(ctx.host.bounds(testId), Option.fromNullishOr);
    /** The window y of `testId`'s top edge, with the check that names it missing. */
    const topOf = (label: string, testId: string) =>
      Effect.flatMap(boxOf(testId), (box) =>
        Effect.map(ctx.expectSome(label, box), (bounds) => bounds.y),
      );
    /**
     * A row's y relative to its list's frame.
     *
     * The renderer reports window coordinates, and the four lists sit below the
     * probe's caption, so an absolute `y` would assert the layout of the probe
     * instead of the list's own placement.
     */
    const yIn =
      (origin: number) =>
      (
        label: string,
        testId: string,
      ): Effect.Effect<
        number,
        Smoke.SmokeAssertionError | Smoke.SmokeHostError
      > =>
        Effect.flatMap(boxOf(testId), (box) =>
          Effect.map(ctx.expectSome(label, box), (bounds) => bounds.y - origin),
        );
    const anchorOf = (label: string, testId: string) =>
      Effect.flatMap(
        Effect.map(ctx.host.listAnchor(testId), Option.fromNullishOr),
        (anchor) => ctx.expectSome(label, anchor),
      );
    /** A row that paints no pixel inside its list's frame: above or below it. */
    const offScreenIn =
      (origin: number) =>
      (
        label: string,
        testId: string,
      ): Effect.Effect<
        void,
        Smoke.SmokeAssertionError | Smoke.SmokeHostError
      > =>
        Effect.flatMap(boxOf(testId), (box) =>
          ctx.expectEqual(
            label,
            Option.match(box, {
              onNone: () => true,
              onSome: (bounds) => {
                const top = bounds.y - origin;
                return top + bounds.height <= 1 || top >= VIEWPORT_HEIGHT - 1;
              },
            }),
            true,
          ),
        );
    /** Presses a list's loader and waits past the commit and the splice. */
    const load = (testId: string) =>
      Effect.gen(function* () {
        yield* ctx.host.click(`${testId}-load`);
        yield* Effect.sleep(Duration.millis(250));
      });

    const topNaive = "loading-top-naive";
    const topFixed = "loading-top-fixed";
    const bottomNaive = "loading-bottom-naive";
    const bottomFixed = "loading-bottom-fixed";
    const newerLast = NEWER_FIRST + MESSAGE_ROWS - 1;

    yield* ctx.host.waitFor(`${topNaive}-row-${OLDER_FIRST}`);
    // `waitFor` answers from the automation tree, which exists a frame before
    // the paint: `bounds` is a painted value, so the four frames need one.
    yield* Effect.sleep(Duration.millis(300));

    const topNaiveTop = yield* topOf(
      "the top naive list's frame painted",
      `${topNaive}-frame`,
    );
    const topFixedTop = yield* topOf(
      "the top re-anchored list's frame painted",
      `${topFixed}-frame`,
    );
    const bottomNaiveTop = yield* topOf(
      "the bottom naive list's frame painted",
      `${bottomNaive}-frame`,
    );
    const bottomFixedTop = yield* topOf(
      "the bottom re-anchored list's frame painted",
      `${bottomFixed}-frame`,
    );
    const topNaiveY = yIn(topNaiveTop);
    const topFixedY = yIn(topFixedTop);
    const bottomNaiveY = yIn(bottomNaiveTop);
    const bottomFixedY = yIn(bottomFixedTop);
    const topNaiveOff = offScreenIn(topNaiveTop);
    const bottomNaiveOff = offScreenIn(bottomNaiveTop);
    const topFixedOff = offScreenIn(topFixedTop);

    // 1. Premise: while the page is in flight the void IS the list's anchor,
    //    and the message the reader is reading sits one void height below it.
    const restAnchor = yield* anchorOf(
      "the top list reports its anchor",
      topNaive,
    );
    yield* ctx.expectEqual(
      "the top void is the list's anchor",
      restAnchor.itemIndex,
      0,
    );
    yield* ctx.expectEqual(
      "the reader waits at the void's own top",
      restAnchor.offsetInItem,
      0,
    );
    yield* ctx.expectNear(
      "the anchor reports the list's viewport",
      restAnchor.viewportHeight,
      VIEWPORT_HEIGHT,
      1,
    );
    const readerTop = yield* topNaiveY(
      "the message under the top void painted",
      `${topNaive}-row-${OLDER_FIRST}`,
    );
    yield* ctx.expectNear(
      "the message under the void sits one void height down",
      readerTop,
      MESSAGE_TOP,
      1,
    );
    yield* ctx.expectNear(
      "both top lists start on the same pixel",
      yield* topFixedY(
        "the re-anchored twin painted",
        `${topFixed}-row-${OLDER_FIRST}`,
      ),
      readerTop,
      1,
    );

    // 2. The same page arrives in both top lists.
    yield* load(topNaive);
    yield* load(topFixed);

    // 3. Left to the runtime, the void stays put and the page takes the
    //    reader's screen: this is the defect the correction exists for.
    yield* ctx.expectEqual(
      "the naive list still anchors the void",
      (yield* anchorOf("the naive list reports its anchor", topNaive))
        .itemIndex,
      0,
    );
    yield* ctx.expectNear(
      "the naive load paints the page where the reader was reading",
      yield* topNaiveY(
        "the page's first row painted",
        `${topNaive}-row-${pageFirstId("prepend", 1)}`,
      ),
      MESSAGE_TOP,
      1,
    );
    yield* topNaiveOff(
      "the naive load takes the reader's message off the screen",
      `${topNaive}-row-${OLDER_FIRST}`,
    );

    // 4. Re-anchored, the page fills the void's old extent and the message the
    //    reader was on does not move a pixel.
    const corrected = yield* anchorOf(
      "the re-anchored list reports its anchor",
      topFixed,
    );
    yield* ctx.expectEqual(
      "the top void is no longer the list's anchor",
      corrected.itemIndex !== 0,
      true,
    );
    yield* ctx.expectNear(
      "the corrected load leaves the reader's message where it was",
      yield* topFixedY(
        "the reader's message painted",
        `${topFixed}-row-${OLDER_FIRST}`,
      ),
      MESSAGE_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the corrected load puts the page above the message",
      yield* topFixedY(
        "the page's last row painted",
        `${topFixed}-row-${OLDER_FIRST - 1}`,
      ),
      (PAGE_ROWS - 1) * ROW_HEIGHT,
      1,
    );
    yield* ctx.expectEqual(
      "the correction asked for the message under the void, one void up",
      yield* ctx.host.text(`${topFixed}-readout`),
      `pages=1 corrected=1 guarded=0 request=${1 + PAGE_ROWS}:-${EDGE_HEIGHT}`,
    );

    // 5. A second page, with the reader already past the void: the anchor is a
    //    message row, so the runtime's own index shift holds the screen and the
    //    app must NOT correct again.
    yield* load(topFixed);
    yield* ctx.expectNear(
      "a second page leaves the reader's message still",
      yield* topFixedY(
        "the reader's message still painted",
        `${topFixed}-row-${OLDER_FIRST}`,
      ),
      MESSAGE_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the page already on screen stays put",
      yield* topFixedY(
        "the first page's last row painted",
        `${topFixed}-row-${OLDER_FIRST - 1}`,
      ),
      (PAGE_ROWS - 1) * ROW_HEIGHT,
      1,
    );
    yield* topFixedOff(
      "the second page joins above the viewport",
      `${topFixed}-row-${pageFirstId("prepend", 2)}`,
    );
    yield* ctx.expectEqual(
      "the app corrected the void arrival and left the scrolled one alone",
      yield* ctx.host.text(`${topFixed}-readout`),
      `pages=2 corrected=1 guarded=1 request=${1 + PAGE_ROWS}:-${EDGE_HEIGHT}`,
    );
    yield* ctx.expectEqual(
      "the naive list never corrected anything",
      yield* ctx.host.text(`${topNaive}-readout`),
      "pages=1 corrected=0 guarded=0 request=none",
    );

    // 6. The bottom edge: a bottom-aligned list resting at its end reports the
    //    at-end sentinel, and its trailing void's top edge is one viewport less
    //    a void below the top.
    const endAnchor = yield* anchorOf(
      "the bottom list reports its anchor",
      bottomNaive,
    );
    yield* ctx.expectEqual(
      "a list resting at its end reports the at-end sentinel",
      endAnchor.itemIndex,
      MESSAGE_ROWS + 1,
    );
    yield* ctx.expectNear(
      "the trailing void's top edge sits one viewport less a void down",
      yield* bottomNaiveY("the trailing void painted", `${bottomNaive}-void`),
      VOID_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the reader's last message sits above the trailing void",
      yield* bottomNaiveY(
        "the reader's last message painted",
        `${bottomNaive}-row-${newerLast}`,
      ),
      READER_TOP,
      1,
    );

    // 7. Left to the runtime, the sentinel follows the new end and the reader
    //    jumps: the message they were on leaves the screen.
    yield* load(bottomNaive);
    yield* ctx.expectEqual(
      "the naive append follows the sentinel to the new row count",
      (yield* anchorOf("the naive bottom list reports its anchor", bottomNaive))
        .itemIndex,
      MESSAGE_ROWS + PAGE_ROWS + 1,
    );
    yield* bottomNaiveOff(
      "the naive append takes the reader's message off the screen",
      `${bottomNaive}-row-${newerLast}`,
    );
    yield* ctx.expectNear(
      "the naive append paints the page at the top of the screen",
      yield* bottomNaiveY(
        "the appended page's first row painted",
        `${bottomNaive}-row-${pageFirstId("append", 1)}`,
      ),
      0,
      1,
    );

    // 8. Re-anchored, the page's first row takes the void's old top edge and
    //    the row above the void keeps its pixel.
    yield* load(bottomFixed);
    const appended = yield* anchorOf(
      "the re-anchored bottom list reports its anchor",
      bottomFixed,
    );
    yield* ctx.expectEqual(
      "the at-end sentinel is no longer the anchor",
      appended.itemIndex < MESSAGE_ROWS + 1,
      true,
    );
    yield* ctx.expectNear(
      "the reader's last message keeps its pixel",
      yield* bottomFixedY(
        "the reader's last message still painted",
        `${bottomFixed}-row-${newerLast}`,
      ),
      READER_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the page's first row takes the void's old top edge",
      yield* bottomFixedY(
        "the appended page's first row painted",
        `${bottomFixed}-row-${pageFirstId("append", 1)}`,
      ),
      VOID_TOP,
      1,
    );
    yield* ctx.expectEqual(
      "the correction asked for the page's first row at the void's top edge",
      yield* ctx.host.text(`${bottomFixed}-readout`),
      `pages=1 corrected=1 guarded=0 request=${MESSAGE_ROWS}:-${VOID_TOP}`,
    );

    // 9. Return to the end and load again: the sentinel rule applies a second
    //    time, so the correction is not a one-shot.
    yield* ctx.host.wheel(`${bottomFixed}-frame`, 0, -100000);
    yield* Effect.sleep(Duration.millis(250));
    yield* ctx.expectEqual(
      "a wheel returns the list to the at-end sentinel",
      (yield* anchorOf("the returned list reports its anchor", bottomFixed))
        .itemIndex,
      MESSAGE_ROWS + PAGE_ROWS + 1,
    );
    yield* ctx.expectNear(
      "the trailing void is back at the bottom edge",
      yield* bottomFixedY(
        "the trailing void painted again",
        `${bottomFixed}-void`,
      ),
      VOID_TOP,
      1,
    );
    yield* load(bottomFixed);
    yield* ctx.expectNear(
      "the second page pins the row that was above the void",
      yield* bottomFixedY(
        "the row above the void painted",
        `${bottomFixed}-row-${newerLast + PAGE_ROWS}`,
      ),
      READER_TOP,
      1,
    );
    yield* ctx.expectNear(
      "the second page's first row takes the void's old top edge",
      yield* bottomFixedY(
        "the second page's first row painted",
        `${bottomFixed}-row-${pageFirstId("append", 2)}`,
      ),
      VOID_TOP,
      1,
    );
    yield* ctx.expectEqual(
      "the app corrected both arrivals at the bottom edge",
      yield* ctx.host.text(`${bottomFixed}-readout`),
      `pages=2 corrected=2 guarded=0 request=${MESSAGE_ROWS + PAGE_ROWS}:-${VOID_TOP}`,
    );

    yield* ctx.host.capture("loading-row-corrected");
  });

/** The fixed pane the resize probe lays its flexible region against. */
const RESIZE_SIDEBAR = 120;

/**
 * A `key=value` field out of a readout, or `-1` when the key is absent.
 *
 * A missing key must never read as `0`: the probe asserts that a width changed,
 * and `0` is a plausible stale width.
 */
const readoutNumber = (readout: string, key: string): number =>
  Option.getOrElse(
    pipe(
      Str.match(new RegExp(`${key}=(-?\\d+)`))(readout),
      Option.flatMap((match) => Option.fromNullishOr(match[1])),
      Option.map((digits) => Number.parseInt(digits, 10)),
    ),
    () => -1,
  );

/**
 * `window-resize-reflow` — the window an app is laid out in changes, and both
 * channels a panel has to it report the change.
 *
 * A workspace is resized by its user, not only by a sibling pane: a split's
 * `max` is the caller's number, and a sidebar, inspector or dock that re-clamps
 * only on `onLayout` still needs the window's own size to pass as that number.
 * Nothing had measured either channel. The renderer's `getWindowSize` is
 * documented as having once answered a hardcoded 800x600, and `useWindowSize()`
 * samples it every 100ms — no probe had read either against a real layout.
 *
 * The probe lays a 120px sidebar beside a flexible centre that fills the row,
 * then zooms the window through the only lever the binding exposes. A window
 * open at 900x520 is a user frame, so the platform's zoom takes it to its
 * standard frame and calling it again restores the user frame; the probe waits
 * for each frame before asserting, because the hook polls and the zoom animates.
 *
 * What it measures: the renderer's size is the box the layout occupies (the
 * sidebar plus centre equal it, so a constant would fail); the app's
 * `useWindowSize()` reports the same pair; zoom changes the size, the flexible
 * pane reflows to it and `onLayout` reports the new width; and the restore puts
 * both back.
 */
const WindowResizeProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [centre, setCentre] = useState({ width: 0, reports: 0 });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        gap: 6,
      }}
    >
      <text
        testId="resize-window-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`w=${Math.round(window.width)} h=${Math.round(window.height)}`}
      </text>
      <div
        testId="resize-row"
        style={{
          display: "flex",
          width: "100%",
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <div
          testId="resize-sidebar"
          style={{
            width: RESIZE_SIDEBAR,
            flexShrink: 0,
            backgroundColor: theme.colors.muted,
          }}
        />
        <div
          testId="resize-centre"
          onLayout={(payload) =>
            setCentre((current) => ({
              width: Math.round(payload.width ?? current.width),
              reports: current.reports + 1,
            }))
          }
          style={{ flexGrow: 1, backgroundColor: theme.colors.card }}
        />
      </div>
      <text
        testId="resize-centre-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`w=${centre.width} reports=${centre.reports}`}
      </text>
    </div>
  );
};

const windowResizeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The app's own read of the window, as its readout prints it. */
    const appSize = () =>
      Effect.map(ctx.host.text("resize-window-readout"), (readout) => ({
        width: readoutNumber(readout, "w"),
        height: readoutNumber(readout, "h"),
      }));
    /**
     * The app's read once its hook has sampled the window.
     *
     * `useWindowSize()` samples the renderer every 100ms, so the mount's first
     * frame can carry the hook's placeholder. The opening checks are about the
     * number the app reports, not about how soon its first sample landed, so
     * they wait for a positive pair before comparing — a hook that never
     * samples still fails, on the placeholder it settled on.
     */
    const settledAppSize = () =>
      Effect.map(
        settleUntil(
          ctx.host.text("resize-window-readout"),
          (readout) =>
            readoutNumber(readout, "w") > 0 && readoutNumber(readout, "h") > 0,
        ),
        (readout) => ({
          width: readoutNumber(readout, "w"),
          height: readoutNumber(readout, "h"),
        }),
      );
    /** The centre pane's `onLayout` count and last reported width. */
    const centreReport = () =>
      Effect.map(ctx.host.text("resize-centre-readout"), (readout) => ({
        width: readoutNumber(readout, "w"),
        reports: readoutNumber(readout, "reports"),
      }));
    /**
     * The centre's report once its first layout pass has run.
     *
     * A fresh mount reports `reports=0` until the runtime lays the row out, and
     * the frame that carries the report depends on the box's load; reading it
     * on the mount's first frame measured `w=0` against a painted 780.
     */
    const settledCentreReport = () =>
      Effect.map(
        settleUntil(
          ctx.host.text("resize-centre-readout"),
          (readout) => readoutNumber(readout, "reports") > 0,
        ),
        (readout) => ({
          width: readoutNumber(readout, "w"),
          reports: readoutNumber(readout, "reports"),
        }),
      );
    /** The centre pane's painted box. */
    const centreBounds = () =>
      Effect.flatMap(
        Effect.map(ctx.host.bounds("resize-centre"), Option.fromNullishOr),
        (bounds) => ctx.expectSome("the centre pane painted", bounds),
      );
    /**
     * The window's size after a zoom has settled in **both** channels.
     *
     * `zoomWindow` is animated and the app's hook polls every 100ms, so a single
     * frame after the call proves neither. The helper samples until the
     * renderer's box changed and `useWindowSize` names it, then returns the
     * renderer's size; a timeout returns what it last read so the assertion
     * reports the number the app actually shows.
     */
    const settledSize = (previous: Smoke.Size) => {
      const poll = (
        tries: number,
      ): Effect.Effect<Smoke.Size, Smoke.SmokeHostError> =>
        Effect.gen(function* () {
          const size = yield* ctx.host.windowSize();
          const app = yield* appSize();
          const followed =
            size.width !== previous.width &&
            app.width === Math.round(size.width) &&
            app.height === Math.round(size.height);
          if (followed || tries <= 0) return size;
          yield* Effect.sleep(Duration.millis(80));
          return yield* poll(tries - 1);
        });
      return poll(12);
    };

    // 1. The renderer's size is a real box and the app reads the same one.
    const size = yield* ctx.host.windowSize();
    const app = yield* settledAppSize();
    yield* ctx.expectEqual(
      "the renderer reports a positive paintable width",
      size.width > 0,
      true,
    );
    yield* ctx.expectEqual(
      "useWindowSize reads the renderer's width",
      app.width,
      Math.round(size.width),
    );
    yield* ctx.expectEqual(
      "useWindowSize reads the renderer's height",
      app.height,
      Math.round(size.height),
    );

    // 2. That number is the box the layout occupies, not a constant: the row
    //    fills it and the flexible pane takes what the sidebar leaves.
    const centre = yield* centreBounds();
    yield* ctx.expectNear(
      "the sidebar plus the centre fill the window's width",
      RESIZE_SIDEBAR + centre.width,
      size.width,
      1,
    );
    yield* ctx.expectNear(
      "the centre is the painted box the onLayout report names",
      (yield* settledCentreReport()).width,
      centre.width,
      1,
    );

    // 3. Zoom changes the window. The app's hook follows it, and the flexible
    //    pane reflows without the app writing a width.
    const reportsBefore = (yield* centreReport()).reports;
    yield* ctx.host.zoomWindow();
    const zoomed = yield* settledSize(size);
    yield* ctx.expectEqual(
      "the platform's zoom changes the window's width",
      zoomed.width !== size.width,
      true,
    );
    yield* ctx.expectEqual(
      "useWindowSize follows the zoomed width",
      (yield* appSize()).width,
      Math.round(zoomed.width),
    );
    const zoomedCentre = yield* centreBounds();
    yield* ctx.expectNear(
      "the flexible pane reflows to the zoomed window",
      RESIZE_SIDEBAR + zoomedCentre.width,
      zoomed.width,
      1,
    );
    const afterZoom = yield* centreReport();
    yield* ctx.expectNear(
      "the pane's layout report is its reflowed box",
      afterZoom.width,
      zoomedCentre.width,
      1,
    );
    yield* ctx.expectEqual(
      "the window resize runs the pane's layout pass again",
      afterZoom.reports > reportsBefore,
      true,
    );
    yield* ctx.host.capture("window-zoomed");

    // 4. Zoom back: the window returns to the size it opened at, and so does
    //    the layout. The probe leaves the window as it found it for the probes
    //    that ran before it and for the next run.
    yield* ctx.host.zoomWindow();
    const restored = yield* settledSize(zoomed);
    yield* ctx.expectNear(
      "zooming back restores the window it opened at",
      restored.width,
      size.width,
      1,
    );
    const restoredCentre = yield* centreBounds();
    yield* ctx.expectNear(
      "the layout returns with the window",
      RESIZE_SIDEBAR + restoredCentre.width,
      restored.width,
      1,
    );
    yield* ctx.expectNear(
      "the restored width is what useWindowSize reports",
      (yield* appSize()).width,
      Math.round(restored.width),
      1,
    );
    yield* ctx.host.capture("window-restored");
  });

/** The app-level shortcut probe: a palette toggled by the window's own key handler. */
const WindowKeyProbe = (): ReactNode => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState("none");

  useWindowKey((event) => {
    if (event.key === "k" && event.modifiers?.cmd === true) {
      setOpen((current) => !current);
      setLast("cmd-k");
    }
    if (event.key === "escape") {
      setOpen(false);
      setLast("escape");
    }
  });

  return (
    <div
      testId="shortcut-probe"
      tabIndex={0}
      autoFocus
      style={{
        width: 720,
        height: 460,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        cmd-k is the window's key, not the focused element's; Escape closes.
      </text>
      <div
        testId="shortcut-other"
        tabIndex={0}
        role="button"
        style={{
          width: 160,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          another focus
        </text>
      </div>
      <text
        testId="shortcut-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`open=${open} last=${last}`}
      </text>
      {open ? (
        <div
          testId="shortcut-palette"
          style={{
            width: 240,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.card,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            command palette
          </text>
        </div>
      ) : null}
    </div>
  );
};

const windowKeySteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("shortcut-readout");
    yield* Effect.sleep(SETTLE);

    yield* ctx.expectEqual(
      "the palette starts closed",
      yield* ctx.host.text("shortcut-readout"),
      "open=false last=none",
    );

    yield* ctx.host.key("cmd-k");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cmd-k reaches the window handler",
      yield* ctx.host.text("shortcut-readout"),
      "open=true last=cmd-k",
    );
    yield* ctx.expectContains(
      "the palette paints",
      Arr.join(yield* ctx.host.paintedText(), "\n"),
      "command palette",
    );
    yield* ctx.host.capture("shortcut-open");

    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape closes the palette",
      yield* ctx.host.text("shortcut-readout"),
      "open=false last=escape",
    );

    // The shortcut belongs to the window, so moving the focus to a control with
    // no key handler must not take it away.
    yield* ctx.host.click("shortcut-other");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the other control holds the focus",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      "shortcut-other",
    );
    yield* ctx.host.key("cmd-k");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cmd-k still opens it from another focus",
      yield* ctx.host.text("shortcut-readout"),
      "open=true last=cmd-k",
    );
  });

/** The gap the select's list opens with, measured back from the paint. */
const SELECT_GAP = 6;

/** One option the probe's selects offer. */
interface ProbeOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * The options every select in the probe offers.
 *
 * `Archived` is disabled and comes last on purpose: an arrow that starts on
 * `Monthly` has to wrap past it to reach `Daily`, so the skip cannot be
 * explained by the list simply ending.
 */
const SELECT_OPTIONS: ReadonlyArray<ProbeOption> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "archived", label: "Archived", disabled: true },
];

/** One select, wired to a readout that prints what React received. */
const ProbeSelect = ({
  testId,
  disabled = false,
  options,
  onValueChange,
}: {
  readonly testId: string;
  readonly disabled?: boolean;
  readonly options: ReadonlyArray<ProbeOption>;
  readonly onValueChange?: (value: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const items = Arr.map(options, (option) => ({
    value: option.value,
    label: option.label,
  }));
  return (
    <GpuixSelect
      items={items}
      defaultValue="daily"
      disabled={disabled}
      onValueChange={onValueChange}
      style={{ width: 260 }}
    >
      <SelectTrigger
        testId={`${testId}-trigger`}
        style={(state) => ({
          ...textStyle(theme, "body"),
          color: state.disabled
            ? theme.colors.disabledForeground
            : theme.colors.foreground,
          padding: theme.spacing.sm,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.input,
        })}
      >
        <SelectValue placeholder="Choose a cadence" />
      </SelectTrigger>
      <SelectContent
        testId={`${testId}-list`}
        sideOffset={SELECT_GAP}
        style={{
          padding: theme.spacing.xs,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.popover,
        }}
      >
        {Arr.map(options, (option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled === true}
            testId={`${testId}-row-${option.value}`}
            style={(state) => ({
              padding: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              backgroundColor: state.highlighted
                ? theme.colors.accent
                : undefined,
            })}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color:
                  option.disabled === true
                    ? theme.colors.disabledForeground
                    : theme.colors.popoverForeground,
              }}
            >
              {option.label}
            </text>
          </SelectItem>
        ))}
      </SelectContent>
    </GpuixSelect>
  );
};

/**
 * The runtime's own `Select` in a window.
 *
 * The list is the runtime's, not the library's: it paints in an anchored layer,
 * takes the focus, moves a highlight over the enabled rows and dismisses on
 * Escape or an outside press. The shipped primitive is a themed wrapper around
 * these parts and passes only a **root** `testId`, so a probe built on the
 * wrapper could not address the trigger or a row. The parts mounted here are
 * the ones the wrapper composes, and the measurement is of the behaviour both
 * share — the claim in `COMPONENTS.md` that open state, positioning and
 * dismissal "are the runtime's".
 */
const SelectProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState("daily");
  const [changes, setChanges] = useState(0);
  const [shipped, setShipped] = useState({ value: "daily", changes: 0 });
  const [presses, setPresses] = useState(0);
  const record = (next: string) => {
    setValue(next);
    setChanges((count) => count + 1);
  };

  return (
    <div
      testId="select-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The runtime's Select: the list opens in its own layer, selects by press
        and by key, and dismisses on Escape or an outside press.
      </text>
      <ProbeSelect
        testId="select"
        options={SELECT_OPTIONS}
        onValueChange={record}
      />
      <text
        testId="select-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {`value=${value} changes=${changes}`}
      </text>
      {/* The shipped wrapper, addressed the way an automation test has to
          address it: the root paints only its width, so the trigger and the
          data-driven rows are the locators (`triggerTestId`/`itemTestId`). */}
      <PrimitiveThemeProvider theme={palettes.dark}>
        <PrimitiveSelect
          label="Shipped cadence"
          defaultValue="daily"
          options={SELECT_OPTIONS}
          triggerTestId="shipped-trigger"
          itemTestId={(option) => `shipped-row-${option}`}
          onValueChange={(next) =>
            setShipped((current) => ({
              value: next,
              changes: current.changes + 1,
            }))
          }
        />
      </PrimitiveThemeProvider>
      <text
        testId="shipped-readout"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {`value=${shipped.value} changes=${shipped.changes}`}
      </text>
      <div
        style={{ display: "flex", flexDirection: "row", gap: theme.spacing.xl }}
      >
        <ProbeSelect
          testId="select-disabled"
          disabled
          options={SELECT_OPTIONS}
        />
      </div>
      {/* Top-right: a press outside the list has to land on something that is
          not the list, and nothing the list opens over can cover this corner. */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: 40,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
        }}
      >
        <div
          testId="select-elsewhere"
          role="button"
          onClick={() => setPresses((count) => count + 1)}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            Elsewhere
          </text>
        </div>
        <text
          testId="select-elsewhere-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.foreground,
          }}
        >
          {`presses=${presses}`}
        </text>
      </div>
    </div>
  );
};

const selectSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** Whether `testId` is absent from the window's tree. */
    const painted = (
      testId: string,
    ): Effect.Effect<boolean, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.isSome(Option.fromNullishOr(bounds)),
      );
    /** Opens the enabled select and waits one paint. */
    const open = Effect.flatMap(ctx.host.click("select-trigger"), () =>
      Effect.sleep(SETTLE),
    );

    yield* ctx.host.waitFor("select-trigger");
    yield* ctx.expectContains(
      "the trigger paints the selected label",
      yield* ctx.host.text("select-trigger"),
      "Daily",
    );
    yield* ctx.expectEqual(
      "the readout starts on the selected value",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=0",
    );
    yield* ctx.expectEqual(
      "the list is not painted before the trigger is pressed",
      yield* painted("select-list"),
      false,
    );

    // The press: the list paints in the runtime's layer, below its trigger.
    yield* open;
    const trigger = yield* paintedBox(ctx, "select-trigger");
    const list = yield* paintedBox(ctx, "select-list");
    yield* ctx.expectEqual(
      "pressing the trigger paints the list",
      yield* painted("select-row-weekly"),
      true,
    );
    yield* ctx.expectEqual(
      "the list opens below its trigger",
      list.y >= trigger.y + trigger.height,
      true,
    );
    yield* ctx.expectNear(
      "the list keeps the gap it was given below the trigger",
      list.y - (trigger.y + trigger.height),
      SELECT_GAP,
      1,
    );
    yield* ctx.expectNear(
      "the list starts at the trigger's start edge",
      list.x,
      trigger.x,
      1,
    );
    yield* ctx.expectEqual(
      "opening moves the focus into the list",
      yield* focusedAfterPaint(ctx),
      "select-list",
    );
    yield* ctx.host.capture("select-open");

    // A pointer selects a row, and the trigger repaints with its label.
    yield* ctx.host.click("select-row-weekly");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a row selects it",
      yield* ctx.host.text("select-readout"),
      "value=weekly changes=1",
    );
    yield* ctx.expectContains(
      "the trigger paints the new label",
      yield* ctx.host.text("select-trigger"),
      "Weekly",
    );
    yield* ctx.expectEqual(
      "selecting unpaints the list",
      yield* painted("select-list"),
      false,
    );
    yield* ctx.host.capture("select-picked");

    // The keyboard path: the list opens on the selected row, one arrow moves the
    // highlight off it, and Enter selects the row the highlight landed on.
    yield* open;
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow moves the highlight off the selected row and Enter selects it",
      yield* ctx.host.text("select-readout"),
      "value=monthly changes=2",
    );

    // From the last enabled row, the next arrow wraps past the disabled one.
    yield* open;
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow skips the disabled row and wraps to the first enabled one",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );

    // Escape closes without choosing, and gives the focus back.
    yield* open;
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape unpaints the list",
      yield* painted("select-list"),
      false,
    );
    yield* ctx.expectEqual(
      "Escape leaves the selection alone",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );
    yield* ctx.expectEqual(
      "Escape gives the focus back to the trigger",
      yield* focusedAfterPaint(ctx),
      "select-trigger",
    );

    // An outside press closes it too, and reaches the control it landed on.
    yield* open;
    yield* ctx.host.click("select-elsewhere");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an outside press reaches the control it landed on",
      yield* ctx.host.text("select-elsewhere-readout"),
      "presses=1",
    );
    yield* ctx.expectEqual(
      "an outside press unpaints the list",
      yield* painted("select-list"),
      false,
    );
    yield* ctx.expectEqual(
      "an outside press leaves the selection alone",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );

    // A disabled row paints and refuses the choice; the list stays open.
    yield* open;
    yield* ctx.host.click("select-row-archived");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled row changes nothing",
      yield* ctx.host.text("select-readout"),
      "value=daily changes=3",
    );
    yield* ctx.expectEqual(
      "a disabled row leaves the list open",
      yield* painted("select-list"),
      true,
    );
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);

    // The trigger toggles its own list closed.
    yield* open;
    yield* ctx.host.click("select-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a second press on the trigger unpaints the list",
      yield* painted("select-list"),
      false,
    );

    // A disabled select refuses the press entirely.
    yield* ctx.host.click("select-disabled-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled select ignores a press",
      yield* painted("select-disabled-list"),
      false,
    );
    yield* ctx.expectContains(
      "a disabled select keeps its label",
      yield* ctx.host.text("select-disabled-trigger"),
      "Daily",
    );

    // The shipped wrapper half: `triggerTestId` and `itemTestId` are what make a
    // Select driveable from automation at all, so these checks address the
    // library's own control rather than the runtime parts.
    yield* ctx.expectContains(
      "the shipped trigger paints its selected label",
      yield* ctx.host.text("shipped-trigger"),
      "Daily",
    );
    yield* ctx.expectEqual(
      "the shipped select starts on its default",
      yield* ctx.host.text("shipped-readout"),
      "value=daily changes=0",
    );
    yield* ctx.expectEqual(
      "the shipped list is closed at rest",
      yield* painted("shipped-row-weekly"),
      false,
    );
    yield* ctx.host.click("shipped-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on the shipped trigger opens its list",
      yield* painted("shipped-row-weekly"),
      true,
    );
    yield* ctx.host.click("shipped-row-weekly");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a shipped row selects it",
      yield* ctx.host.text("shipped-readout"),
      "value=weekly changes=1",
    );
    yield* ctx.expectContains(
      "the shipped trigger repaints with the new label",
      yield* ctx.host.text("shipped-trigger"),
      "Weekly",
    );
    yield* ctx.expectEqual(
      "selecting a shipped row closes the list",
      yield* painted("shipped-row-monthly"),
      false,
    );

    // The keyboard path is still the runtime's: the wrapper must not intercept
    // it. Opening lands on the selected row, so one arrow reaches the next.
    yield* ctx.host.click("shipped-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow and Enter choose the next shipped row",
      yield* ctx.host.text("shipped-readout"),
      "value=monthly changes=2",
    );

    yield* ctx.host.click("shipped-trigger");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape closes the shipped list",
      yield* painted("shipped-row-weekly"),
      false,
    );
    yield* ctx.expectEqual(
      "Escape gives the shipped trigger its focus back",
      yield* focusedAfterPaint(ctx),
      "shipped-trigger",
    );
  });

/**
 * The clipboard in a window: whether the platform's own copy and paste reach a
 * shipped field, and whether the application can see the keys at all.
 *
 * The runtime publishes no clipboard API — no write, no read — so a "copy"
 * action that must reach the OS can only be the platform's text-input action.
 * The probe types into nothing, selects with `cmd-a`, copies with `cmd-c` and
 * pastes into a second field with `cmd-v`, so the value the second field reports
 * through `onChange` is the system clipboard's, round-tripped by GPUI itself.
 * It writes **its own marker** to the clipboard and never reads what was there.
 */
const ClipboardProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  // A marker unique to this mount: a previous run leaves its own text on the
  // system clipboard, so a fixed string could pass a paste check without the
  // copy having run at all.
  const [source, setSource] = useState(
    () => `gpuix clipboard ${Math.random().toString(36).slice(2, 8)}`,
  );
  const [target, setTarget] = useState("");
  const [keys, setKeys] = useState<ReadonlyArray<string>>([]);

  useWindowKey((event) => {
    if (event.modifiers?.cmd !== true) return;
    const key = event.key;
    if (key === undefined) return;
    setKeys((seen) => (Arr.contains(seen, key) ? seen : Arr.append(seen, key)));
  });

  return (
    <div
      testId="clipboard-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The platform's clipboard inside a window: select, copy, paste into the
        second field, and cut it back out.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <Input
          testId="clipboard-source"
          label="Source"
          value={source}
          onChange={setSource}
        />
        <Input
          testId="clipboard-target"
          label="Target"
          value={target}
          onChange={setTarget}
        />
      </PrimitiveThemeProvider>
      <div
        testId="clipboard-other"
        tabIndex={0}
        role="button"
        style={{
          padding: theme.spacing.sm,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          another focus
        </text>
      </div>
      <text
        testId="clipboard-source-value"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {source}
      </text>
      <text
        testId="clipboard-target-value"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.foreground,
        }}
      >
        {target}
      </text>
      <text
        testId="clipboard-keys"
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`keys=${Arr.join(keys, ",")}`}
      </text>
    </div>
  );
};

const clipboardSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("clipboard-source");
    // The window handler is registered from an effect, so the first frame can
    // paint before it is in place.
    yield* Effect.sleep(SETTLE);
    const marker = yield* ctx.host.text("clipboard-source-value");
    yield* ctx.expectContains(
      "the source holds this mount's marker",
      marker,
      "gpuix clipboard ",
    );
    yield* ctx.expectEqual(
      "the target starts empty",
      yield* ctx.host.text("clipboard-target-value"),
      "",
    );

    // Select all and copy in the source, then paste into the empty target.
    yield* ctx.host.click("clipboard-source");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the source takes the focus",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      "clipboard-source",
    );
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("cmd-c");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the field's select and copy reach no window handler",
      yield* ctx.host.text("clipboard-keys"),
      "keys=",
    );
    yield* ctx.host.click("clipboard-target");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-v");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "paste delivers the copied text into the second field",
      yield* ctx.host.text("clipboard-target-value"),
      marker,
    );
    yield* ctx.expectEqual(
      "copying leaves the source as it was",
      yield* ctx.host.text("clipboard-source-value"),
      marker,
    );
    yield* ctx.host.capture("clipboard-pasted");

    // Cut it back out: the platform's own cut must reach `onChange` too.
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("cmd-x");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cut empties the field it ran in",
      yield* ctx.host.text("clipboard-target-value"),
      "",
    );
    // The control: a cmd key reaches the window handler from a focusable control
    // that has no key handler of its own, so the empty log below cannot be a
    // broken registration.
    yield* ctx.host.click("clipboard-other");
    yield* ctx.host.key("cmd-k");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a cmd key reaches the window handler from a control with no handler",
      yield* ctx.host.text("clipboard-keys"),
      "keys=k",
    );

    yield* ctx.expectEqual(
      "the field keeps every clipboard key from the window handler",
      yield* ctx.host.text("clipboard-keys"),
      "keys=k",
    );
  });

/**
 * A one-time code pasted in a window.
 *
 * `OTPField` claims a pasted code arrives as one multi-character `onChange`
 * because the runtime publishes no paste event, and nothing had measured that
 * claim in a window — the capability record says the field's paste is
 * unverified. The probe copies a marker from a shipped `Input` with the
 * platform's own select-all and copy, pastes it into a shipped `OTPField` with
 * `cmd-v`, and reads the value the caller receives: six cells filled from the
 * cell that took the paste, one completion, and the focus in the last cell. A
 * longer paste is truncated, pasting into a full code is not a second
 * completion, and pasting into the third cell rewrites from there.
 */
const OtpPasteProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [source] = useState(() => otpPasteMarker(Math.random));
  const [longer] = useState(() =>
    otpPasteMarker(
      Math.random,
      9,
      Str.slice(0, 1)(source) + Str.slice(2, 3)(source),
    ),
  );
  const [code, setCode] = useState("");
  const [completes, setCompletes] = useState(0);
  const [edits, setEdits] = useState(0);
  return (
    <div
      testId="otp-paste-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A one-time code pasted with the platform's own copy and paste: six cells
        fill from the cell that took it, a longer code truncates, and a full
        code completes once.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <Input
          testId={OTP_PASTE_SOURCE}
          label="Six-character clipboard"
          value={source}
        />
        <Input
          testId={OTP_PASTE_LONGER}
          label="Nine-character clipboard"
          value={longer}
        />
        <OTPField
          testId={OTP_PASTE_FIELD}
          label="Code"
          length={OTP_PASTE_LENGTH}
          value={code}
          onValueChange={(next) => {
            setCode(next);
            setEdits((count) => count + 1);
          }}
          onComplete={() => setCompletes((count) => count + 1)}
        />
      </PrimitiveThemeProvider>
      <text
        testId={OTP_PASTE_SOURCE_VALUE}
        style={{ ...textStyle(theme, "code"), color: theme.colors.foreground }}
      >
        {source}
      </text>
      <text
        testId={OTP_PASTE_LONGER_VALUE}
        style={{ ...textStyle(theme, "code"), color: theme.colors.foreground }}
      >
        {longer}
      </text>
      <text
        testId={OTP_PASTE_READOUT}
        style={{ ...textStyle(theme, "code"), color: theme.colors.foreground }}
      >
        {otpPasteReadout({ value: code, completes, edits })}
      </text>
    </div>
  );
};

const otpPasteSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(OTP_PASTE_READOUT);
    yield* Effect.sleep(SETTLE);
    const marker = yield* ctx.host.text(OTP_PASTE_SOURCE_VALUE);
    const longer = yield* ctx.host.text(OTP_PASTE_LONGER_VALUE);
    yield* ctx.expectEqual(
      "the short clipboard marker is one six-cell code",
      Str.length(marker),
      OTP_PASTE_LENGTH,
    );
    yield* ctx.expectEqual(
      "the longer clipboard marker is nine characters",
      Str.length(longer),
      9,
    );
    yield* ctx.expectEqual(
      "the code starts empty",
      yield* ctx.host.text(OTP_PASTE_READOUT),
      otpPasteReadout({ value: "", completes: 0, edits: 0 }),
    );

    // Copy the six-character marker with the platform's own keys.
    yield* ctx.host.click(OTP_PASTE_SOURCE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("cmd-c");
    yield* Effect.sleep(SETTLE);

    // Paste it into the first cell.
    yield* ctx.host.click(otpPasteCellId(0));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the first cell takes the focus",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      otpPasteCellId(0),
    );
    yield* ctx.host.key("cmd-v");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a pasted code fills the six cells and completes once",
      yield* ctx.host.text(OTP_PASTE_READOUT),
      otpPasteReadout({ value: marker, completes: 1, edits: 1 }),
    );
    yield* ctx.expectEqual(
      "the paste leaves the focus in the last cell",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      otpPasteCellId(OTP_PASTE_LENGTH - 1),
    );

    // Copy a nine-character marker and paste it over the full code.
    yield* ctx.host.click(OTP_PASTE_LONGER);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("cmd-c");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(otpPasteCellId(0));
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-v");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a longer paste truncates to six cells and is not a second completion",
      yield* ctx.host.text(OTP_PASTE_READOUT),
      otpPasteReadout({
        value: Str.takeLeft(OTP_PASTE_LENGTH)(longer),
        completes: 1,
        edits: 2,
      }),
    );
    yield* ctx.expectEqual(
      "the truncating paste still lands on the last cell",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      otpPasteCellId(OTP_PASTE_LENGTH - 1),
    );

    // Paste over the third cell: the run fills forward and keeps the first two.
    yield* ctx.host.click(otpPasteCellId(2));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the third cell takes the focus",
      Option.getOrElse(
        Option.fromNullishOr(yield* ctx.host.focused()),
        () => "none",
      ),
      otpPasteCellId(2),
    );
    yield* ctx.host.key("cmd-v");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a paste into the third cell rewrites from there and keeps the first two",
      yield* ctx.host.text(OTP_PASTE_READOUT),
      otpPasteReadout({
        value: otpPasteOver(Str.takeLeft(OTP_PASTE_LENGTH)(longer), 2, longer),
        completes: 1,
        edits: 3,
      }),
    );
    yield* ctx.host.capture("otp-pasted");
  });

/**
 * The shipped `OTPField`'s key contract in a window.
 *
 * The field's header says the native text editor consumes Left/Right/Home/End/
 * Backspace on key **down**, so its own navigation runs on key **up**, and that a
 * Backspace whose native edit already emptied a cell must not clear the cell
 * before it too. Both were measured in the offscreen renderer; a window
 * dispatches keys differently, so the probe types a code into the shipped field,
 * logs both channels and asserts the focus, the code and the guard.
 */
const OtpKeysProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [code, setCode] = useState("");
  const [completes, setCompletes] = useState(0);
  const [edits, setEdits] = useState(0);
  const [down, setDown] = useState<ReadonlyArray<string>>([]);
  const [up, setUp] = useState<ReadonlyArray<string>>([]);
  const log =
    (set: Dispatch<SetStateAction<ReadonlyArray<string>>>) =>
    (event: KeyEvent): void => {
      const key = event.key;
      if (key !== undefined) set((seen) => Arr.append(seen, key));
    };
  return (
    <div
      testId="otp-keys-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xl,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped code field's keys: typing moves the focus, an arrow arrives
        on key up, and one Backspace clears one cell.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <OTPField
          testId={OTP_KEYS_FIELD}
          label="Code"
          length={OTP_KEYS_LENGTH}
          value={code}
          onValueChange={(next) => {
            setCode(next);
            setEdits((count) => count + 1);
          }}
          onComplete={() => setCompletes((count) => count + 1)}
          onKeyDown={log(setDown)}
          onKeyUp={log(setUp)}
        />
      </PrimitiveThemeProvider>
      <text
        testId={OTP_KEYS_READOUT}
        style={{ ...textStyle(theme, "code"), color: theme.colors.foreground }}
      >
        {otpKeysReadout({ value: code, completes, edits, down, up })}
      </text>
      <text
        testId={OTP_KEYS_CHANNELS}
        style={{
          ...textStyle(theme, "code"),
          color: theme.colors.mutedForeground,
        }}
      >
        {otpKeysChannels({ value: code, completes, edits, down, up })}
      </text>
    </div>
  );
};

const otpKeysSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(OTP_KEYS_READOUT);
    yield* Effect.sleep(SETTLE);
    const focusedCell = (): Effect.Effect<string, Smoke.SmokeHostError> =>
      Effect.map(
        ctx.host.focused(),
        flow(
          Option.fromNullishOr,
          Option.getOrElse(() => "none"),
        ),
      );
    const readout = (code: string, completes: number, edits: number) =>
      otpKeysReadout({
        value: code,
        completes,
        edits,
        down: [],
        up: [],
      });

    yield* ctx.expectEqual(
      "the code starts empty",
      yield* ctx.host.text(OTP_KEYS_READOUT),
      readout("", 0, 0),
    );
    yield* ctx.expectEqual(
      "neither key channel has seen anything",
      yield* ctx.host.text(OTP_KEYS_CHANNELS),
      "down= up=",
    );

    // Type a two-character code: each edit moves the focus to the next cell.
    yield* ctx.host.click(otpKeysCellId(0));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the first cell takes the focus",
      yield* focusedCell(),
      otpKeysCellId(0),
    );
    yield* ctx.host.key("1");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing one character fills the first cell and moves on",
      yield* ctx.host.text(OTP_KEYS_READOUT),
      readout("1", 0, 1),
    );
    yield* ctx.expectEqual(
      "the next cell takes the focus",
      yield* focusedCell(),
      otpKeysCellId(1),
    );
    yield* ctx.host.key("2");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the second character fills the second cell",
      yield* ctx.host.text(OTP_KEYS_READOUT),
      readout("12", 0, 2),
    );
    yield* ctx.expectEqual(
      "the third cell takes the focus",
      yield* focusedCell(),
      otpKeysCellId(2),
    );

    // An arrow on key down alone must not move the field: the native editor
    // consumes it and the field's navigation is the key-up contract.
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow that is only pressed leaves the focus where it was",
      yield* focusedCell(),
      otpKeysCellId(2),
    );
    yield* ctx.host.keyUp("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "releasing the arrow moves the focus one cell left",
      yield* focusedCell(),
      otpKeysCellId(1),
    );
    yield* ctx.expectContains(
      "the key-up channel is the one that carries the arrow",
      yield* ctx.host.text(OTP_KEYS_CHANNELS),
      "up=left",
    );

    // A real press is a down and an up: one move per pair, not two.
    yield* ctx.host.key("left");
    yield* ctx.host.keyUp("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "one press of the arrow moves the focus once",
      yield* focusedCell(),
      otpKeysCellId(0),
    );

    // Home and End are the same key-up contract.
    yield* ctx.host.key("end");
    yield* ctx.host.keyUp("end");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "End puts the focus in the last cell",
      yield* focusedCell(),
      otpKeysCellId(OTP_KEYS_LENGTH - 1),
    );
    yield* ctx.host.key("home");
    yield* ctx.host.keyUp("home");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Home puts the focus back in the first cell",
      yield* focusedCell(),
      otpKeysCellId(0),
    );

    // Move onto the second cell before pressing Backspace there.
    yield* ctx.host.key("right");
    yield* ctx.host.keyUp("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key moves onto the second cell",
      yield* focusedCell(),
      otpKeysCellId(1),
    );

    // A window's automation sends a named key down but no text edit: a
    // printable character is inserted, while Backspace produces no `onChange`,
    // so the platform's native delete cannot be driven from this harness. The
    // field then refuses to delete twice: the cell is filled, so its key-up
    // handler leaves the code alone.
    yield* ctx.host.key("backspace");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a window's automation Backspace runs no native edit",
      yield* ctx.host.text(OTP_KEYS_READOUT),
      readout("12", 0, 2),
    );
    yield* ctx.host.keyUp("backspace");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the key-up of a filled cell deletes nothing",
      yield* ctx.host.text(OTP_KEYS_READOUT),
      readout("12", 0, 2),
    );
    yield* ctx.expectContains(
      "the key-up handler did see the Backspace it refused",
      yield* ctx.host.text(OTP_KEYS_CHANNELS),
      "up=left,left,end,home,right,backspace",
    );
    yield* ctx.expectEqual(
      "the refused Backspace leaves the focus where it was",
      yield* focusedCell(),
      otpKeysCellId(1),
    );

    // The empty cell is where the key-up owns the delete: a press there clears
    // the cell before it and moves onto the cleared cell.
    yield* ctx.host.key("right");
    yield* ctx.host.keyUp("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key moves onto the empty third cell",
      yield* focusedCell(),
      otpKeysCellId(2),
    );
    yield* ctx.host.key("backspace");
    yield* ctx.host.keyUp("backspace");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Backspace in an empty cell clears the cell before it",
      yield* ctx.host.text(OTP_KEYS_READOUT),
      readout("1", 0, 3),
    );
    yield* ctx.expectEqual(
      "the focus moves onto the cell it cleared",
      yield* focusedCell(),
      otpKeysCellId(1),
    );
    yield* ctx.host.capture("otp-keys");
  });

/** The line the selection probe selects: a word a failure can name. */
const SELECTION_LINE = "hello live selection world";

/** The chrome line: the default `Text` must keep a drag from selecting it. */
const SELECTION_CHROME = "chrome must not select";

/**
 * The wash the probe asks for, in a colour no role paints.
 *
 * A capture is device-scaled, so the probe counts a colour rather than reading a
 * point: an opaque green behind the selected run is the one pixel value the drag
 * can produce and nothing else can.
 */
const SELECTION_WASH = "#00FF00FF";

/** The probe's theme: the base palette with a measurable selection wash. */
const selectionTheme = extendTheme(palettes.dark, {
  colors: { selection: SELECTION_WASH },
});

/**
 * Selection in a window, on its **paint** and on what the renderer reports.
 *
 * The headless `text-selection` scenario drives the renderer's own
 * `dragSelect`, because the offscreen renderer registers selection listeners
 * during paint — so "a drag selects" was never measured with a pointer. This
 * probe drags with the automation protocol (a real press, eight moves and a
 * release) and asks two separate questions: does the wash paint, and does
 * `getSelectedText` report the run? A component that copies a selected log line
 * needs both answers, and they turn out to differ.
 */
const SelectionProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [copied, setCopied] = useState("");
  return (
    <PrimitiveThemeProvider theme={selectionTheme}>
      <div
        testId="selection-live-probe"
        style={{
          width: window.width,
          height: window.height,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <Text
          testId="live-selectable-line"
          selectable
          style={{ alignSelf: "start" }}
        >
          {SELECTION_LINE}
        </Text>
        <Text testId="live-chrome-line" style={{ alignSelf: "start" }}>
          {SELECTION_CHROME}
        </Text>
        <Input
          testId="live-selection-field"
          label="Paste target"
          value={copied}
          onChange={setCopied}
        />
        <text
          testId="live-selection-readout"
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.foreground,
          }}
        >
          {`copied=${copied}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

const selectionSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** How many pixels of the capture under `name` paint the probe's wash. */
    const washPixels = (
      name: string,
      wash: Pixels.Rgba,
    ): Effect.Effect<number, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.pixels(name), (frame) =>
        Pixels.countColour(frame, wash),
      );

    yield* ctx.host.waitFor("live-selectable-line");
    const wash = yield* ctx.expectSome(
      "the probe's wash colour parses",
      Option.fromNullishOr(Pixels.hexToRgba(SELECTION_WASH)),
    );
    yield* ctx.expectContains(
      "the selectable line paints its text",
      Arr.join(yield* ctx.host.paintedText(), "\n"),
      SELECTION_LINE,
    );
    yield* ctx.host.clearSelection();
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-before");
    yield* ctx.expectEqual(
      "nothing paints the selection wash before a drag",
      yield* washPixels("selection-before", wash),
      0,
    );

    // A real pointer drag from the middle of the line past its right edge.
    yield* ctx.host.drag("live-selectable-line", 240, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-dragged");
    yield* ctx.expectEqual(
      "a pointer drag paints the selection wash",
      (yield* washPixels("selection-dragged", wash)) > 0,
      true,
    );
    const selected = yield* ctx.expectSome(
      "the renderer reports the text the drag selected",
      Option.fromNullishOr(yield* ctx.host.selectedText()),
    );
    yield* ctx.expectContains(
      "the reported selection reaches the end of the line",
      selected,
      "world",
    );

    // Can a user take the selection with them? `cmd-c` from a selected text run
    // is the copy path a log viewer or a code block would need.
    yield* ctx.host.key("cmd-c");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("live-selection-field");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("cmd-v");
    yield* Effect.sleep(SETTLE);
    const pasted = yield* ctx.host.text("live-selection-readout");
    yield* ctx.expectContains(
      "Cmd+C over the selected run copies it to the clipboard",
      pasted,
      selected,
    );
    yield* ctx.expectContains(
      "the pasted text is the run the drag selected",
      selected,
      "world",
    );

    // Clearing unpaints it, which is the third direction: the same capture,
    // after one call.
    yield* ctx.host.clearSelection();
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-cleared");
    yield* ctx.expectEqual(
      "clearing unpaints the selection wash",
      yield* washPixels("selection-cleared", wash),
      0,
    );

    // The opt-out: the same drag over the default node paints no wash.
    yield* ctx.host.drag("live-chrome-line", 240, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("selection-chrome");
    yield* ctx.expectEqual(
      "a drag over the chrome line paints no selection wash",
      yield* washPixels("selection-chrome", wash),
      0,
    );
  });

/**
 * The window's selection event, on the app that owns the root.
 *
 * `selection-lifecycle` proves the wash and `getSelectedText`; neither tells a
 * toolbar that the reader picked a run. That is
 * `render(<App/>, { onSelectionChange })` — the only route the runtime
 * publishes for a window-level selection change — so the probe *is* the app: it
 * records every change through the runtime's own seam, paints the count and the
 * last run, and the checks read them back after a real drag, a clear, and a drag
 * over a line that opted out.
 */
const WindowSelectionProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [log, setLog] = useState(initialSelectionLog);
  useWindowSelection((event) =>
    setLog((previous) => recordSelection(previous, event.value)),
  );
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId="window-selection-probe"
        style={{
          width: window.width,
          height: window.height,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <Text
          testId="window-selection-line"
          selectable
          style={{ alignSelf: "start" }}
        >
          {SELECTION_EVENT_LINE}
        </Text>
        <Text testId="window-selection-chrome" style={{ alignSelf: "start" }}>
          {SELECTION_EVENT_CHROME}
        </Text>
        <text
          testId={SELECTION_EVENT_READOUT}
          style={{
            ...textStyle(theme, "code"),
            color: theme.colors.foreground,
          }}
        >
          {selectionReadout(log)}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

const windowSelectionSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The count the painted readout carries, or a failed check. */
    const fires = (caption: string, readout: string) =>
      ctx.expectSome(caption, firesOf(readout));

    yield* ctx.host.waitFor(SELECTION_EVENT_READOUT);
    // A clear before the reader has selected anything publishes whatever the
    // runtime thinks an empty change is; taking it as the baseline measures the
    // gesture below rather than assuming the runtime's bookkeeping.
    yield* ctx.host.clearSelection();
    yield* Effect.sleep(SETTLE);
    const baseline = yield* fires(
      "the app reads the window's selection changes",
      yield* ctx.host.text(SELECTION_EVENT_READOUT),
    );

    yield* ctx.host.drag("window-selection-line", 240, 0);
    yield* Effect.sleep(SETTLE);
    const selected = yield* ctx.expectSome(
      "the renderer reports the run the drag selected",
      Option.fromNullishOr(yield* ctx.host.selectedText()),
    );
    yield* ctx.expectContains(
      "the drag reaches the end of the line",
      selected,
      SELECTION_EVENT_TAIL,
    );
    const afterDrag = yield* ctx.host.text(SELECTION_EVENT_READOUT);
    const dragCount = yield* fires("the drag's count parses", afterDrag);
    yield* ctx.expectEqual(
      "a pointer drag publishes a window selection change",
      dragCount > baseline,
      true,
    );
    yield* ctx.expectContains(
      "the event carries the run the renderer reports",
      afterDrag,
      selected,
    );

    // Clearing is the other half of the contract: an app that only hears the
    // first change keeps showing a toolbar for a selection that is gone.
    yield* ctx.host.clearSelection();
    yield* Effect.sleep(SETTLE);
    const cleared = yield* ctx.host.text(SELECTION_EVENT_READOUT);
    const clearedCount = yield* fires("the cleared count parses", cleared);
    yield* ctx.expectEqual(
      "clearing the selection publishes the empty change",
      clearedCount > dragCount,
      true,
    );
    yield* ctx.expectContains(
      "the empty change carries no run",
      cleared,
      "last=none",
    );

    // The opt-out: a drag over chrome is not a selection change, so the app must
    // not be told one happened.
    yield* ctx.host.drag("window-selection-chrome", 240, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag over a non-selectable line publishes nothing",
      yield* fires(
        "the chrome count parses",
        yield* ctx.host.text(SELECTION_EVENT_READOUT),
      ),
      clearedCount,
    );
  });

/**
 * One focusable tree row.
 *
 * The row owns the focus and the keyboard; the disclosure marker is a pointer
 * target only, so opening a directory never adds a second tab stop per row.
 * Its element id is registered by ref: `focusElement` takes a native id, and a
 * row inside a `<virtual-list>` mounts and unmounts as the window moves.
 */
const TreeRow = ({
  node,
  open,
  selected,
  register,
  onSelect,
  onToggle,
  onKey,
}: {
  readonly node: TreeNode;
  readonly open: boolean;
  readonly selected: boolean;
  readonly register: (id: string, elementId: number | null) => void;
  readonly onSelect: (node: TreeNode) => void;
  readonly onToggle: (node: TreeNode) => void;
  readonly onKey: (node: TreeNode, key: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const attach = useCallback(
    (instance: PublicInstance | null) =>
      register(node.id, instance?.id ?? null),
    [node.id, register],
  );
  return (
    <div
      testId={rowTestId(node)}
      ref={attach}
      tabIndex={0}
      role="treeitem"
      aria-level={node.depth + 1}
      aria-expanded={node.kind === "dir" ? open : undefined}
      aria-selected={selected}
      onClick={() => onSelect(node)}
      onKeyDown={(event) => onKey(node, event.key ?? "")}
      style={{
        height: TREE_ROW_HEIGHT,
        display: "flex",
        alignItems: "center",
        paddingLeft: labelInset(node),
        backgroundColor: selected ? theme.colors.accent : theme.colors.card,
        ...keyboardFocusRing(theme),
      }}
    >
      {node.kind === "dir" ? (
        <div
          testId={toggleTestId(node)}
          onClick={() => onToggle(node)}
          style={{ width: TREE_INDENT, height: TREE_ROW_HEIGHT }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            {open ? "v" : ">"}
          </text>
        </div>
      ) : (
        <div style={{ width: TREE_INDENT, height: TREE_ROW_HEIGHT }} />
      )}
      <text
        testId={labelTestId(node)}
        style={{
          ...textStyle(theme, "body"),
          color:
            node.kind === "dir"
              ? theme.colors.foreground
              : theme.colors.mutedForeground,
        }}
      >
        {node.label}
      </text>
    </div>
  );
};

/**
 * A virtualized file tree: one `<virtual-list>` child per visible node.
 *
 * The keyboard model is the tree's own: arrows move native focus between rows
 * through the renderer (`focusElement`), Right opens a directory then enters it,
 * Left collapses or returns to the parent. A row only exists while it is near
 * the viewport, so the ids are kept in a ref keyed by node id.
 */
const VirtualTreeProbe = (): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [expanded, setExpanded] = useState<ReadonlyArray<string>>([]);
  const [selected, setSelected] = useState("none");
  const [range, setRange] = useState("none");
  const [reports, setReports] = useState(0);
  const elements = useRef(new Map<string, number>());

  const rows = visibleRows(expanded);
  const isOpen = (id: string): boolean => Arr.contains(expanded, id);

  const register = useCallback((id: string, elementId: number | null) => {
    const map = elements.current;
    if (elementId === null) map.delete(id);
    else map.set(id, elementId);
  }, []);

  const focusRow = (node: TreeNode): void => {
    const elementId = elements.current.get(node.id);
    if (elementId !== undefined) renderer?.focusElement?.(elementId);
  };

  const toggle = (node: TreeNode): void =>
    setExpanded((current) =>
      Arr.contains(current, node.id)
        ? Arr.filter(current, (id) => id !== node.id)
        : Arr.append(current, node.id),
    );

  /** Moves the roving focus by `delta` visible rows, if the row exists. */
  const step = (node: TreeNode, delta: number): void => {
    Option.match(
      Option.flatMap(
        Arr.findFirstIndex(rows, (row) => row.id === node.id),
        (index) => Arr.get(rows, index + delta),
      ),
      { onNone: () => undefined, onSome: focusRow },
    );
  };

  const onKey = (node: TreeNode, key: string): void => {
    Match.value(key).pipe(
      Match.when("down", () => step(node, 1)),
      Match.when("up", () => step(node, -1)),
      Match.when("right", () => {
        if (node.kind !== "dir") return;
        if (isOpen(node.id)) step(node, 1);
        else toggle(node);
      }),
      Match.when("left", () => {
        if (node.kind === "file") {
          Option.match(
            Arr.findFirst(rows, (row) => row.id === node.parent),
            { onNone: () => undefined, onSome: focusRow },
          );
          return;
        }
        if (isOpen(node.id)) toggle(node);
      }),
      Match.when("enter", () => setSelected(node.id)),
      Match.when("space", () => setSelected(node.id)),
      Match.orElse(() => undefined),
    );
  };

  return (
    <div
      testId="tree-probe"
      style={{
        width: 720,
        height: 470,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        4 000 nodes flattened into one list: only the window near the viewport
        exists.
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <div style={{ display: "flex", gap: theme.spacing.sm }}>
          <Button
            testId="tree-expand-all"
            size="sm"
            onActivate={() => setExpanded(TREE_ALL_DIRECTORIES)}
          >
            Expand all
          </Button>
          <Button
            testId="tree-collapse-all"
            size="sm"
            variant="secondary"
            onActivate={() => setExpanded([])}
          >
            Collapse all
          </Button>
        </div>
      </PrimitiveThemeProvider>
      <div
        testId="tree-frame"
        style={{
          display: "flex",
          height: TREE_VIEWPORT_HEIGHT,
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
        }}
      >
        <virtual-list
          testId="tree-list"
          style={{ flexGrow: 1, minHeight: 0 }}
          onVisibleRange={(event) => {
            setRange(`${event.startIndex ?? -1}..${event.endIndex ?? -1}`);
            setReports((current) => current + 1);
          }}
        >
          {Arr.map(rows, (node) => (
            <TreeRow
              key={node.id}
              node={node}
              open={node.kind === "dir" && isOpen(node.id)}
              selected={selected === node.id}
              register={register}
              onSelect={(row) => setSelected(row.id)}
              onToggle={toggle}
              onKey={onKey}
            />
          ))}
        </virtual-list>
      </div>
      <Readout testId="tree-readout">
        {`visible=${rows.length} expanded=${expanded.length} selected=${selected} range=${range}`}
      </Readout>
      <Readout testId="tree-reports">{`reports=${reports}`}</Readout>
    </div>
  );
};

/** A row line the window painted: the tree's labels, never its readout. */
const paintedTreeRows = (lines: ReadonlyArray<string>): number =>
  Arr.length(
    Arr.filter(
      lines,
      (line) => Str.startsWith("dir ")(line) || Str.startsWith("file ")(line),
    ),
  );

const virtualTreeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    /** The focused row's testId, asserted against the expected one. */
    const expectFocused = (
      label: string,
      testId: string,
    ): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
      Effect.flatMap(focusedId(ctx), (id) =>
        ctx.expectEqual(label, id, testId),
      );

    yield* ctx.host.waitFor("tree-list");
    yield* Effect.sleep(SETTLE);

    // 1. Collapsed, the tree is its forty root directories — and only a window
    //    of those is painted.
    yield* ctx.expectEqual(
      "a collapsed tree paints one row per directory",
      yield* ctx.host.text("tree-readout"),
      "visible=40 expanded=0 selected=none range=none",
    );
    const atRest = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the first directory is painted",
      Arr.contains(atRest, "dir 000"),
      true,
    );
    yield* ctx.expectEqual(
      "the last of forty is outside the painted window",
      Arr.contains(atRest, "dir 039"),
      false,
    );

    // 2. A press takes native focus, which is what every arrow needs.
    yield* ctx.host.click("tree-row-dir-000");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "a press focuses the row it landed on",
      "tree-row-dir-000",
    );

    // 3. Right on a collapsed directory opens it in place: the focus stays on
    //    the directory while ninety-nine files join the flattened rows.
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Right opens a collapsed directory",
      yield* ctx.host.text("tree-readout"),
      "visible=139 expanded=1 selected=dir-000",
    );
    yield* expectFocused(
      "opening a directory keeps the focus on it",
      "tree-row-dir-000",
    );

    // 4. A depth-1 row indents its label by one step.
    const openRows = visibleRows(["dir-000"]);
    const directoryRow = yield* ctx.expectSome(
      "the fixture has a directory row to measure",
      Arr.get(openRows, 0),
    );
    const fileRow = yield* ctx.expectSome(
      "the fixture has a child row to measure",
      Arr.get(openRows, 1),
    );
    const parent = yield* ctx.expectSome(
      "the directory's label painted",
      Option.fromNullishOr(yield* ctx.host.bounds(labelTestId(directoryRow))),
    );
    const child = yield* ctx.expectSome(
      "the child's label painted",
      Option.fromNullishOr(yield* ctx.host.bounds(labelTestId(fileRow))),
    );
    yield* ctx.expectNear(
      "a depth-1 label indents by one step",
      child.x - parent.x,
      TREE_INDENT,
      1,
    );

    // 5. A second Right enters the first child; Left returns to the parent.
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "Right on an open directory enters its first child",
      "tree-row-file-dir-000/000",
    );
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "Left from a child returns to its parent",
      "tree-row-dir-000",
    );

    // 6. Left on an open directory closes it; the rows below move back up.
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Left closes an open directory",
      yield* ctx.host.text("tree-readout"),
      "visible=40 expanded=0",
    );

    // 7. Down and Up move the roving focus row by row.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "Down moves the focus to the next row",
      "tree-row-dir-001",
    );
    yield* ctx.host.key("up");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused("Up moves the focus back", "tree-row-dir-000");

    // 8. A file is a leaf: Right neither opens nor moves.
    yield* ctx.host.click("tree-toggle-dir-000");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click("tree-row-file-dir-000/000");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Right on a file changes no row",
      yield* ctx.host.text("tree-readout"),
      "visible=139 expanded=1",
    );
    yield* expectFocused(
      "Right on a file keeps the focus on it",
      "tree-row-file-dir-000/000",
    );

    // 9. Expanded whole, the tree is 4 000 rows and still paints a window.
    yield* ctx.host.click("tree-expand-all");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "Expand all flattens every node",
      yield* ctx.host.text("tree-readout"),
      "visible=4000 expanded=40",
    );
    yield* ctx.host.capture("vtree-expanded");
    const expandedRows = yield* ctx.host.paintedText();
    const paintedCount = paintedTreeRows(expandedRows);
    yield* ctx.expectEqual(
      "a 4 000-row tree paints only its window",
      paintedCount > 0 && paintedCount < 40,
      true,
    );
    yield* ctx.expectEqual(
      "the last of 4 000 rows is not painted",
      Arr.contains(expandedRows, "file 039/098"),
      false,
    );

    // 10. Reveal by index: the path a file tree takes to a deep node, with no
    //     wheel at all. A pixel offset would be wrong while heights are
    //     estimates, so the renderer's own anchor is the evidence.
    const reportsBefore = yield* ctx.host.text("tree-reports");
    yield* ctx.host.scrollToItem("tree-list", TREE_REVEAL_INDEX);
    yield* Effect.sleep(Duration.millis(300));
    yield* ctx.host.capture("vtree-revealed");
    const revealed = yield* ctx.host.paintedText();
    yield* ctx.expectEqual(
      "the reveal paints the directory the index names",
      Arr.contains(revealed, "dir 030"),
      true,
    );
    yield* ctx.expectEqual(
      "the reveal leaves the top of the tree",
      Arr.contains(revealed, "dir 000"),
      false,
    );
    const anchor = yield* ctx.expectSome(
      "the renderer reports the list's logical anchor",
      Option.fromNullishOr(yield* ctx.host.listAnchor("tree-list")),
    );
    yield* ctx.expectNear(
      "the anchor is the row the reveal asked for",
      anchor.itemIndex,
      TREE_REVEAL_INDEX,
      1,
    );
    const frame = yield* ctx.expectSome(
      "the list's frame painted",
      Option.fromNullishOr(yield* ctx.host.bounds("tree-frame")),
    );
    yield* ctx.expectNear(
      "the anchor reports the list's own viewport",
      anchor.viewportHeight,
      frame.height - 2,
      1,
    );
    yield* ctx.expectEqual(
      "a plain container is not a virtual list",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.listAnchor("tree-frame")),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "a programmatic reveal fires no visible-range report",
      yield* ctx.host.text("tree-reports"),
      reportsBefore,
    );

    // 11. A revealed row is addressable and focusable like any other.
    yield* ctx.host.click("tree-row-dir-030");
    yield* Effect.sleep(SETTLE);
    yield* expectFocused(
      "the revealed row takes the focus",
      "tree-row-dir-030",
    );
  });

/**
 * Two opaque fills counted in the frame: the clipped card's and the portalled
 * card's. A paint report lists laid-out glyphs, a capture lists what a reader
 * sees, and only the capture can tell a clipped box from a painted one.
 */
const CLIPPED_FILL = "#FF00FF";
const CONTROL_FILL = "#00FFFF";
const PORTAL_FILL = "#00FF00";

/**
 * The context a portalled card reads back.
 *
 * A portal renders into another host element but stays in the caller's React
 * tree, so a theme, a locale or an app store has to survive the move.
 */
const PortalContext = createContext("no-context");

/** The card a detached tab or a dialog would move into its own layer. */
const PortalCard = ({
  onPress,
  typed,
  onType,
}: {
  readonly onPress: () => void;
  readonly typed: string;
  readonly onType: (value: string) => void;
}): ReactNode => {
  const theme = useTheme();
  const inherited = useContext(PortalContext);
  return (
    <div
      testId="portal-card"
      style={{
        position: "absolute",
        left: 20,
        top: 20,
        width: 240,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
        backgroundColor: PORTAL_FILL,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.sm,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        portalled card
      </text>
      <text
        testId="portal-context"
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {`ctx=${inherited}`}
      </text>
      <div
        testId="portal-action"
        tabIndex={0}
        role="button"
        onClick={onPress}
        style={{
          padding: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.foreground,
          }}
        >
          press inside the portal
        </text>
      </div>
      <input
        testId="portal-field"
        value={typed}
        placeholder="type inside the portal"
        onChange={(event) => onType(event.value ?? "")}
        style={{
          color: theme.colors.inputForeground,
          backgroundColor: theme.colors.input,
          padding: theme.spacing.xs,
          borderRadius: theme.radius.sm,
        }}
      />
    </div>
  );
};

/**
 * `createPortal` in a window: the published escape hatch an overlay or a
 * detached tab needs when its own ancestor clips.
 *
 * The probe puts one card beyond a clipped box's edge (laid out, not painted)
 * and the same card through a portal into a sibling layer (painted), then
 * measures context, pointer input and keys across the portal boundary.
 */
const PortalProbe = (): ReactNode => {
  const theme = useTheme();
  const [layer, setLayer] = useState<PublicInstance | null>(null);
  const [attached, setAttached] = useState(true);
  const [presses, setPresses] = useState(0);
  const [typed, setTyped] = useState("");

  return (
    <PortalContext.Provider value="portal-context">
      <div
        testId="portal-probe"
        style={{
          position: "relative",
          width: 720,
          height: 440,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          testId="portal-clip"
          style={{
            position: "relative",
            width: 200,
            height: 100,
            overflow: "hidden",
            backgroundColor: theme.colors.card,
          }}
        >
          <div
            testId="portal-clipped"
            style={{
              position: "absolute",
              left: 240,
              top: 20,
              width: 200,
              padding: theme.spacing.sm,
              backgroundColor: CLIPPED_FILL,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              clipped away
            </text>
          </div>
        </div>
        <div
          testId="portal-unclipped"
          style={{
            position: "absolute",
            left: 20,
            top: 280,
            width: 200,
            padding: theme.spacing.sm,
            backgroundColor: CONTROL_FILL,
          }}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            unclipped card
          </text>
        </div>
        <div
          testId="portal-layer"
          ref={setLayer}
          style={{
            position: "absolute",
            left: 420,
            top: 150,
            width: 280,
            height: 160,
            backgroundColor: theme.colors.card,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
          }}
        />
        {layer === null
          ? null
          : attached
            ? createPortal(
                <PortalCard
                  onPress={() => setPresses((count) => count + 1)}
                  typed={typed}
                  onType={setTyped}
                />,
                layer,
              )
            : null}
        <div style={{ position: "absolute", left: 20, top: 130 }}>
          <PrimitiveThemeProvider theme={palettes.dark}>
            <Button
              testId="portal-toggle"
              size="sm"
              variant="secondary"
              onActivate={() => setAttached((current) => !current)}
            >
              {attached ? "Detach" : "Attach"}
            </Button>
          </PrimitiveThemeProvider>
        </div>
        <div style={{ position: "absolute", left: 20, top: 190 }}>
          <Readout testId="portal-readout">
            {`attached=${attached} presses=${presses} typed=${typed}`}
          </Readout>
        </div>
      </div>
    </PortalContext.Provider>
  );
};

const portalSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("portal-card");
    yield* Effect.sleep(SETTLE);

    // 1. The clipped ancestor lays the sibling out and paints none of it; the
    //    same content through the portal paints — the whole reason a detached
    //    tab or an overlay moves into its own layer.
    const clip = yield* ctx.expectSome(
      "the clipping box painted",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-clip")),
    );
    const clipped = yield* ctx.expectSome(
      "the clipped sibling still has a box",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-clipped")),
    );
    yield* ctx.expectEqual(
      "the clipped sibling sits outside the box that clips it",
      clipped.x > clip.x + clip.width,
      true,
    );
    const clippedFill = yield* ctx.expectSome(
      "the clipped fill parses",
      Option.fromNullishOr(Pixels.hexToRgba(CLIPPED_FILL)),
    );
    const portalFill = yield* ctx.expectSome(
      "the portal fill parses",
      Option.fromNullishOr(Pixels.hexToRgba(PORTAL_FILL)),
    );
    const controlFill = yield* ctx.expectSome(
      "the control fill parses",
      Option.fromNullishOr(Pixels.hexToRgba(CONTROL_FILL)),
    );
    yield* ctx.host.capture("portal-attached");
    yield* ctx.expectEqual(
      "the same box paints when nothing clips it",
      (yield* paintedPixels(ctx, "portal-attached", controlFill)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the clipped sibling paints no pixel",
      yield* paintedPixels(ctx, "portal-attached", clippedFill),
      0,
    );
    yield* ctx.expectEqual(
      "the portalled card paints its own fill",
      (yield* paintedPixels(ctx, "portal-attached", portalFill)) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the portalled card paints its text",
      Arr.contains(yield* ctx.host.paintedText(), "portalled card"),
      true,
    );

    // 2. It paints where its target is, not where the caller is.
    const layer = yield* ctx.expectSome(
      "the portal target painted",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-layer")),
    );
    const card = yield* ctx.expectSome(
      "the portalled card painted",
      Option.fromNullishOr(yield* ctx.host.bounds("portal-card")),
    );
    yield* ctx.expectEqual(
      "the card paints inside its target's box",
      card.x >= layer.x && card.y >= layer.y,
      true,
    );

    // 3. The portal keeps the caller's React context across the host boundary.
    yield* ctx.expectEqual(
      "the portalled card reads the caller's context",
      yield* ctx.host.text("portal-context"),
      "ctx=portal-context",
    );

    // 4. Pointer input reaches portalled content.
    yield* ctx.host.click("portal-action");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press reaches a control inside the portal",
      yield* ctx.host.text("portal-readout"),
      "presses=1",
    );

    // 5. So do native focus and keys: the field is not in the caller's subtree.
    yield* ctx.host.click("portal-field");
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("h");
    yield* ctx.host.key("i");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "keys reach a field inside the portal",
      yield* ctx.host.text("portal-readout"),
      "typed=hi",
    );

    // 6. Removing the portal unpaints it and drops it from the tree.
    yield* ctx.host.capture("portal-attached");
    yield* ctx.host.click("portal-toggle");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "detaching unpaints the card",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("portal-card")),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "detaching removes its text",
      Arr.contains(yield* ctx.host.paintedText(), "portalled card"),
      false,
    );

    // 7. And it can be attached again: a tab moved out and back.
    yield* ctx.host.click("portal-toggle");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "reattaching paints the card again",
      Arr.contains(yield* ctx.host.paintedText(), "portalled card"),
      true,
    );
    yield* ctx.host.capture("portal-reattached");
  });

/**
 * One table header cell that sorts by a press.
 *
 * It is the press target itself rather than a row above the table: a header that
 * only responds to a control beside it measures nothing about a table, and the
 * probe's press is hit-tested on the cell's painted centre.
 */
const TableHeaderCell = ({
  testId,
  label,
  width,
  onPress,
}: {
  readonly testId: string;
  readonly label: string;
  readonly width: number;
  readonly onPress: () => void;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      role="button"
      tabIndex={0}
      onClick={onPress}
      style={{
        width,
        height: TABLE_HEADER_HEIGHT,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        paddingLeft: 6,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
        cursor: "pointer",
        hover: { backgroundColor: theme.colors.border },
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {label}
      </text>
    </div>
  );
};

/**
 * A Tier 3 table: a sortable header sibling above the row scroller, inside one
 * horizontal scroller.
 *
 * The composition is the one the headless `data-grid-fixed-header` and
 * `table-select-sort` scenarios measured. What a window adds is that a press is
 * hit-tested rather than a handler invoked, a wheel is aimed by geometry, and a
 * key only reaches the element the press actually focused. Order and selection
 * are keyed by **record**, so a sort cannot leave the highlight on a different
 * row.
 */
const TableProbe = (): ReactNode => {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const renderer = useGpuix().renderer;
  const [sort, setSort] = useState<TableSort>(TABLE_SORT);
  const [selected, setSelected] = useState(Option.none<number>());
  const elements = useRef(new Map<number, number>());

  const rows = sortTable(sort);
  const direction = sort.descending ? "desc" : "asc";
  const isSelected = (row: TableRow): boolean =>
    Option.contains(selected, row.n);
  const cell = {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    paddingLeft: 6,
    height: TABLE_ROW_HEIGHT,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  } as const;

  const register = useCallback((n: number, instance: PublicInstance | null) => {
    const map = elements.current;
    if (instance === null) map.delete(n);
    else map.set(n, instance.id);
  }, []);

  const focus = (n: number): void => {
    const elementId = elements.current.get(n);
    if (elementId !== undefined) renderer?.focusElement?.(elementId);
  };

  /** Moves selection and focus together, as a table's roving focus does. */
  const step = (row: TableRow, delta: number): void =>
    Option.match(
      Option.flatMap(
        Arr.findFirstIndex(rows, (candidate) => candidate.n === row.n),
        (index) => Arr.get(rows, index + delta),
      ),
      {
        onNone: () => undefined,
        onSome: (next) => {
          setSelected(Option.some(next.n));
          focus(next.n);
        },
      },
    );

  return (
    <div
      testId="table-probe"
      style={{
        width: windowSize.width,
        height: windowSize.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Press a header to sort, press a row to select it, and use the arrows to
        walk the table.
      </text>
      <Readout testId="table-readout">
        {`rows=${TABLE_ROWS} sorted=${sortLabel(sort)} selected=${Option.match(
          selected,
          { onNone: () => "none", onSome: (n) => `r${n}` },
        )}`}
      </Readout>
      <div
        testId="table-hscroll"
        style={{
          width: TABLE_WIDTH,
          height: TABLE_HEADER_HEIGHT + TABLE_HEIGHT + 16,
          overflowX: "scroll",
          backgroundColor: theme.colors.card,
        }}
      >
        <div
          style={{
            width: COLUMN_WIDTH.name + COLUMN_WIDTH.status + COLUMN_WIDTH.size,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            testId="table-header"
            style={{
              display: "flex",
              flexDirection: "row",
              height: TABLE_HEADER_HEIGHT,
              backgroundColor: theme.colors.muted,
            }}
          >
            <TableHeaderCell
              testId="table-header-name"
              label={sort.column === "name" ? `name ${direction}` : "name"}
              width={COLUMN_WIDTH.name}
              onPress={() => setSort((current) => toggleSort(current, "name"))}
            />
            <TableHeaderCell
              testId="table-header-size"
              label={sort.column === "size" ? `size ${direction}` : "size"}
              width={COLUMN_WIDTH.size}
              onPress={() => setSort((current) => toggleSort(current, "size"))}
            />
            <div
              testId="table-header-status"
              style={{
                width: COLUMN_WIDTH.status,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                paddingLeft: 6,
                borderBottomWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.muted,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                status
              </text>
            </div>
          </div>
          <div
            testId="table-body"
            style={{ height: TABLE_HEIGHT, overflowY: "scroll" }}
          >
            {rows.map((row, index) => (
              <div
                key={row.n}
                testId={`table-row-${index}`}
                ref={(instance: PublicInstance | null) =>
                  register(row.n, instance)
                }
                tabIndex={0}
                role="row"
                aria-selected={isSelected(row)}
                onClick={() => setSelected(Option.some(row.n))}
                onKeyDown={(event) => {
                  const delta =
                    event.key === "down" ? 1 : event.key === "up" ? -1 : 0;
                  if (delta !== 0) step(row, delta);
                }}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  height: TABLE_ROW_HEIGHT,
                  flexShrink: 0,
                  backgroundColor: isSelected(row)
                    ? theme.colors.accent
                    : index % 2 === 0
                      ? theme.colors.background
                      : theme.colors.card,
                  hover: { backgroundColor: theme.colors.muted },
                  ...keyboardFocusRing(theme),
                }}
              >
                <div style={{ ...cell, width: COLUMN_WIDTH.name }}>
                  <text
                    testId={`table-name-${index}`}
                    style={{
                      ...textStyle(theme, "body"),
                      color: isSelected(row)
                        ? theme.colors.accentForeground
                        : theme.colors.foreground,
                    }}
                  >
                    {row.name}
                  </text>
                </div>
                <div
                  testId={`table-size-${index}`}
                  style={{ ...cell, width: COLUMN_WIDTH.size }}
                >
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {`${row.size} B`}
                  </text>
                </div>
                <div style={{ ...cell, width: COLUMN_WIDTH.status }}>
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: theme.colors.mutedForeground,
                    }}
                  >
                    {row.status}
                  </text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * The table probe's checks.
 *
 * A press is a hit test in a window: the locator aims the element's painted
 * centre, so a header cell that is covered, clipped or misaligned sorts nothing.
 * The readout names the order and the selected **record**, which is what makes
 * "the selection survived the sort" a check rather than a coincidence.
 */
const tableLifecycleSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("table-readout");
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text("table-readout");
    const nameAt = (index: number) => ctx.host.text(`table-name-${index}`);
    const offsetOf: (
      testId: string,
    ) => Effect.Effect<
      Smoke.Offset,
      Smoke.SmokeAssertionError | Smoke.SmokeHostError
    > = (testId) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${testId} reports a scroll offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
        );
      });
    /** The focus id as a readout reads it: `none` rather than a null. */
    const focusOf = Effect.map(ctx.host.focused(), (id) =>
      Option.getOrElse(Option.fromNullishOr(id), () => "none"),
    );

    yield* ctx.expectEqual(
      "the table mounts in name order with nothing selected",
      yield* readout(),
      "rows=60 sorted=name-asc selected=none",
    );

    // The header is a sibling of the row scroller, so it cannot scroll with the
    // rows: the first row starts where the header ends.
    const header = yield* paintedBox(ctx, "table-header");
    const first = yield* paintedBox(ctx, "table-row-0");
    yield* ctx.expectNear(
      "the first row starts below the header",
      first.y,
      header.y + header.height,
      1,
    );

    // 1. A press selects the row it landed on, and that row holds the focus.
    yield* ctx.host.click("table-row-3");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press selects the row it hit",
      yield* readout(),
      "selected=r3",
    );
    yield* ctx.expectEqual(
      "the pressed row took the focus",
      yield* focusOf,
      "table-row-3",
    );

    // 2. An arrow key reaches the focused row and roves both focus and selection.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "down moves the selection one record on",
      yield* readout(),
      "selected=r4",
    );
    yield* ctx.expectEqual(
      "down moves the focus with it",
      yield* focusOf,
      "table-row-4",
    );

    // 3. A press on the size header sorts by the column it hit, not by the other.
    yield* ctx.host.click("table-header-size");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press on the size header sorts by size",
      yield* readout(),
      "sorted=size-asc",
    );
    yield* ctx.expectEqual(
      "the smallest row paints first",
      yield* nameAt(0),
      "Item 005",
    );
    yield* ctx.expectContains(
      "the selection is a record, so it survives the sort",
      yield* readout(),
      "selected=r4",
    );

    // 4. The same header again flips the direction.
    yield* ctx.host.click("table-header-size");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a second press flips the column it is on",
      yield* readout(),
      "sorted=size-desc",
    );
    yield* ctx.expectEqual(
      "the largest row paints first",
      yield* nameAt(0),
      "Item 004",
    );

    // 5. A wheel over the rows scrolls them under a header that does not move.
    const headerBefore = yield* paintedBox(ctx, "table-header");
    const rowBefore = yield* paintedBox(ctx, "table-row-5");
    yield* ctx.host.wheel("table-body", 0, -100);
    yield* Effect.sleep(SETTLE);
    const scrolled = yield* offsetOf("table-body");
    yield* ctx.expectNear("the wheel scrolls the rows", scrolled.y, -100, 2);
    const headerAfter = yield* paintedBox(ctx, "table-header");
    yield* ctx.expectNear(
      "the header keeps its painted y",
      headerAfter.y,
      headerBefore.y,
      1,
    );
    const rowAfter = yield* paintedBox(ctx, "table-row-5");
    yield* ctx.expectNear(
      "the row moved up by the scroll amount",
      rowAfter.y - rowBefore.y,
      scrolled.y,
      2,
    );

    // 6. The header is outside the row scroller, so a wheel over it scrolls nothing.
    yield* ctx.host.wheel("table-header", 0, -100);
    yield* Effect.sleep(SETTLE);
    const afterHeaderWheel = yield* offsetOf("table-body");
    yield* ctx.expectNear(
      "a wheel over the header leaves the rows where they are",
      afterHeaderWheel.y,
      scrolled.y,
      1,
    );

    // 7. One horizontal scroller carries the header and the cells together.
    const headerCellBefore = yield* paintedBox(ctx, "table-header-size");
    const sizeCellBefore = yield* paintedBox(ctx, "table-size-5");
    yield* ctx.host.wheel("table-header", -60, 0);
    yield* Effect.sleep(SETTLE);
    const panned = yield* offsetOf("table-hscroll");
    yield* ctx.expectNear(
      "a horizontal wheel pans the table",
      panned.x,
      -60,
      2,
    );
    const headerCellAfter = yield* paintedBox(ctx, "table-header-size");
    const sizeCellAfter = yield* paintedBox(ctx, "table-size-5");
    yield* ctx.expectNear(
      "the header cell moved with the pan",
      headerCellAfter.x - headerCellBefore.x,
      panned.x,
      2,
    );
    yield* ctx.expectNear(
      "the row's cell moved by the same amount",
      sizeCellAfter.x - sizeCellBefore.x,
      panned.x,
      2,
    );
    yield* ctx.expectEqual(
      "the header and the row stay aligned after the pan",
      headerCellAfter.x,
      sizeCellAfter.x,
    );

    // 8. The rows stop at the content's end.
    yield* ctx.host.wheel("table-body", 0, -10_000);
    yield* Effect.sleep(SETTLE);
    const clamped = yield* offsetOf("table-body");
    yield* ctx.expectNear(
      "the rows clamp at the content's end",
      clamped.y,
      -TABLE_Y_RANGE,
      2,
    );
    yield* ctx.host.capture("table-sorted");
  });

/** The frozen-column probe's geometry: two panes, one row height. */
const FROZEN_ROWS = 60;
const FROZEN_ROW_HEIGHT = 28;
const FROZEN_WIDTH = 120;
const FROZEN_BODY_WIDTH = 240;
const FROZEN_VIEWPORT = 240;
const FROZEN_CELL_WIDTH = 200;
/** `rows × height - viewport`: the offset both panes clamp at. */
const FROZEN_MAX = FROZEN_ROWS * FROZEN_ROW_HEIGHT - FROZEN_VIEWPORT;
const FROZEN_ROW_INDEXES = Arr.range(0, FROZEN_ROWS - 1);

/**
 * A frozen first column beside a grid, in a window.
 *
 * The runtime has no `position: "sticky"`, so a frozen column is two vertical
 * scrollers that must move as one: each `onScrollChange` mirrors its `y` into
 * the other through `renderer.scrollTo`, guarded by a ref because a programmatic
 * scroll reports its own change inside the call. The headless
 * `data-grid-frozen-column` scenario measured the arithmetic; this probe asks
 * whether the mirror holds in a window, where the wheel is hit-tested and a
 * press selects through the painted cell.
 */
const FrozenColumnProbe = (): ReactNode => {
  const theme = useTheme();
  const windowSize = useWindowSize();
  const renderer = useGpuix().renderer;
  const frozen = useRef<PublicInstance | null>(null);
  const body = useRef<PublicInstance | null>(null);
  const syncing = useRef(false);
  const [selected, setSelected] = useState(Option.none<number>());

  const mirror =
    (target: "frozen" | "body") =>
    (event: EventPayload): void => {
      const elementId = (target === "frozen" ? frozen : body).current?.id;
      const y = event.scrollY;
      // The programmatic scroll paints synchronously, so the target's own change
      // arrives inside this call; the flag stops it mirroring back.
      if (elementId == null || y == null || syncing.current) return;
      syncing.current = true;
      renderer?.scrollTo?.(elementId, 0, y);
      syncing.current = false;
    };

  const rowStyle = (index: number) => ({
    display: "flex",
    height: FROZEN_ROW_HEIGHT,
    alignItems: "center",
    flexShrink: 0,
    backgroundColor: Option.contains(selected, index)
      ? theme.colors.accent
      : index % 2 === 0
        ? theme.colors.background
        : theme.colors.card,
    hover: { backgroundColor: theme.colors.muted },
  });

  return (
    <div
      testId="frozen-probe"
      style={{
        width: windowSize.width,
        height: windowSize.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Two scrollers, one offset: either pane's wheel moves both, and the
        frozen column never pans.
      </text>
      <Readout testId="frozen-selected">
        {Option.match(selected, {
          onNone: () => "none",
          onSome: (n) => `r${n}`,
        })}
      </Readout>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          testId="frozen"
          ref={frozen}
          onScrollChange={mirror("body")}
          style={{
            width: FROZEN_WIDTH,
            height: FROZEN_VIEWPORT,
            overflowY: "scroll",
            backgroundColor: theme.colors.muted,
          }}
        >
          {FROZEN_ROW_INDEXES.map((index) => (
            <div
              key={index}
              testId={`frozen-row-${index}`}
              tabIndex={0}
              role="row"
              aria-selected={Option.contains(selected, index)}
              onClick={() => setSelected(Option.some(index))}
              style={rowStyle(index)}
            >
              <text style={{ color: theme.colors.foreground }}>
                {`F${index}`}
              </text>
            </div>
          ))}
        </div>
        <div
          testId="frozen-body"
          ref={body}
          onScrollChange={mirror("frozen")}
          style={{
            width: FROZEN_BODY_WIDTH,
            height: FROZEN_VIEWPORT,
            overflowY: "scroll",
            overflowX: "scroll",
            backgroundColor: theme.colors.card,
          }}
        >
          {FROZEN_ROW_INDEXES.map((index) => (
            <div
              key={index}
              testId={`frozen-body-row-${index}`}
              style={{ ...rowStyle(index), width: FROZEN_CELL_WIDTH * 3 }}
            >
              <div style={{ width: FROZEN_CELL_WIDTH, flexShrink: 0 }}>
                <text style={{ color: theme.colors.foreground }}>
                  {`B${index}`}
                </text>
              </div>
              <div style={{ width: FROZEN_CELL_WIDTH, flexShrink: 0 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`C${index}`}
                </text>
              </div>
              <div style={{ width: FROZEN_CELL_WIDTH, flexShrink: 0 }}>
                <text style={{ color: theme.colors.mutedForeground }}>
                  {`D${index}`}
                </text>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * The frozen column's checks: both panes follow either wheel, the row under the
 * reader lines up across them, the frozen column ignores a horizontal pan, and a
 * frozen cell selects the row for the grid.
 */
const frozenColumnSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("frozen-selected");
    yield* Effect.sleep(SETTLE);

    const offsetOf = (testId: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${testId} reports a scroll offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(testId)),
        );
      });
    const yOf = (testId: string) =>
      Effect.map(paintedBox(ctx, testId), (bounds) => bounds.y);
    const xOf = (testId: string) =>
      Effect.map(paintedBox(ctx, testId), (bounds) => bounds.x);
    const paintedRows = Effect.map(ctx.host.paintedText(), (lines) =>
      Arr.filterMap(lines, (line) =>
        Option.match(Str.match(/^B(\d+)$/)(line), {
          onNone: () => Result.failVoid,
          onSome: (match) =>
            Option.match(Option.fromNullishOr(match[1]), {
              onNone: () => Result.failVoid,
              onSome: (digits) => Result.succeed(Number.parseInt(digits, 10)),
            }),
        }),
      ),
    );

    // 1. Both panes start at the top, and the first row lines up across them.
    yield* ctx.expectEqual(
      "the frozen column starts at the top",
      (yield* offsetOf("frozen")).y,
      0,
    );
    yield* ctx.expectEqual(
      "the grid starts at the top",
      (yield* offsetOf("frozen-body")).y,
      0,
    );
    yield* ctx.expectNear(
      "the first row sits at the same y in both panes",
      yield* yOf("frozen-row-0"),
      yield* yOf("frozen-body-row-0"),
      1,
    );

    // 2. A wheel over the grid moves both panes.
    yield* ctx.host.wheel("frozen-body", 0, -300);
    yield* Effect.sleep(SETTLE);
    const bodyAfterGrid = yield* offsetOf("frozen-body");
    yield* ctx.expectNear(
      "the grid follows the wheel",
      bodyAfterGrid.y,
      -300,
      2,
    );
    yield* ctx.expectNear(
      "the frozen column mirrors the grid in the same frame",
      (yield* offsetOf("frozen")).y,
      bodyAfterGrid.y,
      1,
    );

    // 3. A wheel over the frozen column moves both back: the mirror is two-way.
    yield* ctx.host.wheel("frozen", 0, -300);
    yield* Effect.sleep(SETTLE);
    const frozenAfterBoth = yield* offsetOf("frozen");
    yield* ctx.expectNear(
      "the frozen column's own wheel scrolls it",
      frozenAfterBoth.y,
      -600,
      2,
    );
    yield* ctx.expectNear(
      "the grid mirrors the frozen column",
      (yield* offsetOf("frozen-body")).y,
      frozenAfterBoth.y,
      1,
    );

    // 4. The row the reader is looking at lines up across the panes.
    const rows = yield* paintedRows;
    const row = yield* ctx.expectSome(
      "a row inside the scrolled window is painted",
      Arr.findFirst(rows, (value) => value >= 22 && value <= 25),
    );
    yield* ctx.expectNear(
      `row ${row} lines up between the frozen column and the grid`,
      yield* yOf(`frozen-row-${row}`),
      yield* yOf(`frozen-body-row-${row}`),
      1,
    );

    // 5. A horizontal wheel pans the grid's cells and leaves the frozen column.
    const frozenX = yield* xOf(`frozen-row-${row}`);
    const bodyX = yield* xOf(`frozen-body-row-${row}`);
    yield* ctx.host.wheel("frozen-body", -200, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "a horizontal wheel pans the grid",
      (yield* offsetOf("frozen-body")).x,
      -200,
      2,
    );
    yield* ctx.expectNear(
      "the grid's row moved left with the pan",
      yield* xOf(`frozen-body-row-${row}`),
      bodyX - 200,
      2,
    );
    yield* ctx.expectNear(
      "the frozen column stayed where it was",
      yield* xOf(`frozen-row-${row}`),
      frozenX,
      1,
    );

    // 6. A frozen cell selects the row for the whole grid.
    yield* ctx.host.click(`frozen-row-${row}`);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on a frozen cell selects its row",
      yield* ctx.host.text("frozen-selected"),
      `r${row}`,
    );
    yield* ctx.host.capture("frozen-column");

    // 7. A huge wheel clamps both panes at the same end.
    yield* ctx.host.wheel("frozen-body", 0, -10_000);
    yield* Effect.sleep(SETTLE);
    const bodyEnd = yield* offsetOf("frozen-body");
    yield* ctx.expectNear(
      "the grid clamps at the content's end",
      bodyEnd.y,
      -FROZEN_MAX,
      2,
    );
    yield* ctx.expectNear(
      "the frozen column clamps with it",
      (yield* offsetOf("frozen")).y,
      bodyEnd.y,
      1,
    );
  });

/**
 * `dock-focus-lifecycle` — what a keyboard reaches inside a nested dock.
 *
 * Tier 4's **keyboard navigation** is the one capability with no measurement:
 * a dock is a rail, a collapsible sidebar and a pane inside one layout, and the
 * questions a plan needs answered are which controls a Tab traversal visits and
 * in what order, what a collapsed sidebar's controls do to that traversal, and
 * what a key pressed in the pane's field does to the rail. The fixture is
 * composed by hand — the shipped `Tabs` already owns roving focus
 * (`tabs-lifecycle`), and this is the layer above it.
 */
const DockFocusProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const renderer = useGpuix().renderer;
  const railIds = useRef<Partial<Record<DockTab, number>>>({});
  const [tab, setTab] = useState<DockTab>("explorer");
  const [changes, setChanges] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [actions, setActions] = useState(0);

  const select = (next: DockTab) => {
    setTab(next);
    setChanges((count) => count + 1);
    const id = railIds.current[next];
    if (id !== undefined) renderer?.focusElement?.(id);
  };

  const actionStyle = {
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.muted,
    ...keyboardFocusRing(theme),
  } as const;

  return (
    <div
      testId="dock-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A Tab traversal walks the dock: toggle, sidebar, the selected tab, its
        field, the status bar.
      </text>
      <Readout testId="dock-readout">{`tab=${tab} changes=${changes} sidebar=${
        sidebarOpen ? "open" : "closed"
      } actions=${actions}`}</Readout>
      <div
        testId={DOCK_TOGGLE}
        tabIndex={0}
        role="button"
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((open) => !open)}
        style={{ ...actionStyle, alignSelf: "start" }}
      >
        <text style={{ color: theme.colors.foreground }}>
          {sidebarOpen ? "hide sidebar" : "show sidebar"}
        </text>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.md,
          flexGrow: 1,
        }}
      >
        <div
          testId="dock-sidebar"
          style={{
            width: sidebarOpen ? DOCK_SIDEBAR_WIDTH : 0,
            flexShrink: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.card,
          }}
        >
          {(["new", "settings"] as const).map((action) => (
            <div
              key={action}
              testId={dockActionId(action)}
              // The guard a dock owes: a control in a closed pane leaves the
              // traversal. `new` keeps its stop on purpose — the probe measures
              // the runtime with it.
              tabIndex={sidebarOpen || action !== DOCK_GUARDED_ACTION ? 0 : -1}
              role="button"
              onClick={() => setActions((count) => count + 1)}
              style={actionStyle}
            >
              <text style={{ color: theme.colors.foreground }}>{action}</text>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
            flexGrow: 1,
          }}
        >
          <div
            testId="dock-rail"
            role="tablist"
            style={{ display: "flex", flexDirection: "row", gap: 4 }}
          >
            {DOCK_TABS.map((value) => (
              <div
                key={value}
                testId={dockRailId(value)}
                ref={(instance) => {
                  railIds.current[value] = instance?.id;
                }}
                role="tab"
                aria-selected={tab === value}
                tabIndex={tab === value ? 0 : -1}
                onClick={() => select(value)}
                onKeyDown={(event: EventPayload) => {
                  if (event.key === "right") select(stepTab(value, 1));
                  if (event.key === "left") select(stepTab(value, -1));
                }}
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor:
                    tab === value ? theme.colors.accent : theme.colors.muted,
                  ...keyboardFocusRing(theme),
                }}
              >
                <text
                  style={{
                    color:
                      tab === value
                        ? theme.colors.accentForeground
                        : theme.colors.foreground,
                  }}
                >
                  {value}
                </text>
              </div>
            ))}
          </div>
          <div
            testId={dockPaneId(tab)}
            role="tabpanel"
            style={{
              padding: theme.spacing.md,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.sm,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: theme.colors.foreground,
              }}
            >
              {`${tab} pane`}
            </text>
            <input
              testId={dockFieldId(tab)}
              style={{
                width: 240,
                height: 24,
                borderWidth: theme.borderWidth.thin,
                borderColor: theme.colors.borderStrong,
                color: theme.colors.inputForeground,
                backgroundColor: theme.colors.input,
                padding: theme.spacing.xs,
              }}
            />
          </div>
        </div>
      </div>
      <div
        testId={DOCK_STATUS}
        tabIndex={0}
        role="button"
        style={{ ...actionStyle, alignSelf: "start" }}
      >
        <text style={{ color: theme.colors.mutedForeground }}>
          ready · 0 problems
        </text>
      </div>
    </div>
  );
};

/**
 * The dock's checks: the traversal's order, a closed sidebar's unguarded
 * control still being reached while its guarded one is skipped, the rail
 * stepping focus with its panes, and a field keeping its own arrows.
 */
const dockFocusSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("dock-probe");
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text("dock-readout");
    /** An element's painted width; an unpainted one is zero. */
    const widthOf = (testId: string) =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.match(Option.fromNullishOr(bounds), {
          onNone: () => 0,
          onSome: (value) => value.width,
        }),
      );
    /** Press Tab `count` times, reading the focus each press left behind. */
    const tabThrough = (count: number) =>
      Effect.forEach(
        Arr.range(1, count),
        () => Effect.flatMap(ctx.host.key("tab"), () => focusedAfterPaint(ctx)),
        { concurrency: 1 },
      );

    yield* ctx.expectContains(
      "the dock opens on its first document with the sidebar open",
      yield* readout(),
      "tab=explorer changes=0 sidebar=open",
    );

    // 1. The open dock's traversal, from the toggle through to the status bar.
    yield* ctx.host.focusElement(DOCK_TOGGLE);
    yield* ctx.expectEqual(
      "the sidebar toggle takes the focus",
      yield* focusedAfterPaint(ctx),
      DOCK_TOGGLE,
    );
    const openStops = dockStops(true, "explorer");
    const walked = yield* tabThrough(Arr.length(openStops));
    yield* ctx.expectEqual(
      "a Tab traversal visits the dock's stops in tree order, wrapping at the end",
      Arr.join(walked, " > "),
      Arr.join(Arr.append(Arr.drop(openStops, 1), DOCK_TOGGLE), " > "),
    );

    // 2. A collapsed sidebar paints no width...
    yield* ctx.host.click(DOCK_TOGGLE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the toggle closes the sidebar",
      yield* readout(),
      "sidebar=closed",
    );
    yield* ctx.expectNear(
      "the closed sidebar paints no width",
      yield* widthOf("dock-sidebar"),
      0,
      0.5,
    );

    // 3. ...but the control without a guard keeps its stop, which is the rule
    //    a dock has to apply itself: the runtime does not skip it.
    yield* ctx.host.focusElement(DOCK_TOGGLE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "an unguarded control in a closed sidebar keeps its tab stop",
      yield* focusedAfterPaint(ctx),
      dockActionId("new"),
    );
    const hiddenWidth = yield* widthOf(dockActionId("new"));
    yield* ctx.expectNear(
      "a control inside the closed sidebar still reports its own 12px box",
      hiddenWidth,
      12,
      1,
    );
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "the guarded control is skipped by the same traversal",
      yield* focusedAfterPaint(ctx),
      dockRailId("explorer"),
    );
    yield* ctx.host.click(dockActionId("new"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press on the clipped control does not reach it, though the keyboard did",
      yield* readout(),
      "actions=0",
    );

    // 4. Programmatic focus still lands in the hidden sidebar.
    yield* ctx.host.focusElement(dockActionId("new"));
    yield* ctx.expectEqual(
      "the runtime focuses a control the app never shows",
      yield* focusedAfterPaint(ctx),
      dockActionId("new"),
    );

    // 5. Reopening restores the guarded stop.
    yield* ctx.host.click(DOCK_TOGGLE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.focusElement(DOCK_TOGGLE);
    yield* ctx.host.key("tab");
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "reopening the sidebar restores the guarded stop",
      yield* focusedAfterPaint(ctx),
      dockActionId("settings"),
    );

    // 6. A rail step moves real focus and swaps the pane.
    yield* ctx.host.focusElement(dockRailId("explorer"));
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the rail moves focus to the next document",
      yield* focusedAfterPaint(ctx),
      dockRailId("output"),
    );
    yield* ctx.expectContains(
      "the step changed the selected document",
      yield* readout(),
      "tab=output changes=1",
    );
    yield* ctx.expectEqual(
      "the previous document's field left the tree",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds(dockFieldId("explorer"))),
      ),
      true,
    );
    yield* ctx.expectSome(
      "the new document's field is painted",
      Option.fromNullishOr(yield* ctx.host.bounds(dockFieldId("output"))),
    );

    // 7. The pane's field is the rail's next stop.
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "Tab from the rail reaches the pane's field",
      yield* focusedAfterPaint(ctx),
      dockFieldId("output"),
    );

    // 8. An arrow in the field belongs to the field, not the rail.
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow in a field keeps the focus there",
      yield* focusedAfterPaint(ctx),
      dockFieldId("output"),
    );
    yield* ctx.expectContains(
      "…and does not switch the document",
      yield* readout(),
      "tab=output changes=1",
    );

    // 9. Shift+Tab walks back out, and the rail steps back with it.
    yield* ctx.host.key("shift-tab");
    yield* ctx.expectEqual(
      "Shift+Tab returns to the rail",
      yield* focusedAfterPaint(ctx),
      dockRailId("output"),
    );
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the rail steps back and focus follows",
      yield* focusedAfterPaint(ctx),
      dockRailId("explorer"),
    );
    yield* ctx.expectContains(
      "the step back selected the first document again",
      yield* readout(),
      "tab=explorer changes=2",
    );
    yield* ctx.host.key("tab");
    yield* ctx.expectEqual(
      "the restored document's field is reachable",
      yield* focusedAfterPaint(ctx),
      dockFieldId("explorer"),
    );

    // 10. The rail wraps in the direction it was given.
    yield* ctx.host.focusElement(dockRailId("explorer"));
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the rail wraps to the last document",
      yield* focusedAfterPaint(ctx),
      dockRailId("problems"),
    );
    yield* ctx.expectContains(
      "…and selects it",
      yield* readout(),
      "tab=problems changes=3",
    );
    yield* ctx.host.capture("dock-focus");
  });

/**
 * `header-menu-lifecycle` — a column menu anchored **inside a scrolled header**.
 *
 * Tier 3's column-configuration row is `?`, and the half that decides whether
 * it is buildable is the overlay: the trigger sits in a horizontally scrolled
 * header, whose offset is a paint-level value. The probe opens the shipped
 * `DropdownMenu` from that trigger, then wheels the header and asks whether the
 * painted panel moved with its anchor, dismisses it and reopens it by keyboard,
 * and hides a column from the menu.
 */
const HeaderMenuProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [hidden, setHidden] = useState<ReadonlyArray<HeaderColumn["id"]>>([]);
  const [changes, setChanges] = useState(0);

  const toggle = (id: HeaderColumn["id"]) => {
    setHidden((current) => toggleHidden(current, id));
    setChanges((count) => count + 1);
  };

  const visible = Arr.filter(
    HEADER_COLUMNS,
    (column) => !Arr.contains(hidden, column.id),
  );
  const renderCell = (column: HeaderColumn) => (
    <div
      key={column.id}
      testId={headerCellId(column.id)}
      style={{
        width: column.width,
        flexShrink: 0,
        padding: 6,
        borderBottomWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
      }}
    >
      <text style={{ color: theme.colors.mutedForeground }}>
        {column.label}
      </text>
    </div>
  );

  return (
    <div
      testId="header-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A column menu anchored in a scrolled header: does the panel follow the
        wheel?
      </text>
      <Readout testId="header-readout">{`hidden=${
        Arr.isReadonlyArrayNonEmpty(hidden) ? Arr.join(hidden, "+") : "none"
      } changes=${changes}`}</Readout>
      <div
        testId={HEADER_FRAME}
        style={{
          width: HEADER_FRAME_WIDTH,
          overflowX: "scroll",
          backgroundColor: theme.colors.card,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: headerContentWidth(hidden),
          }}
        >
          {Arr.filter(
            visible,
            (column) => column.id === HEADER_TRIGGER_AFTER,
          ).map(renderCell)}
          <div
            testId={HEADER_TRIGGER_CELL}
            style={{
              width: HEADER_TRIGGER_WIDTH,
              flexShrink: 0,
              padding: 6,
              borderBottomWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger testId={HEADER_TRIGGER}>
                columns…
              </DropdownMenuTrigger>
              <DropdownMenuContent label="Columns" testId="header-menu">
                {Arr.map(Arr.reverse(HEADER_COLUMNS), (column) => (
                  <DropdownMenuItem
                    key={column.id}
                    testId={`header-menu-item-${column.id}`}
                    onSelect={() => toggle(column.id)}
                  >
                    {column.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {Arr.filter(
            visible,
            (column) => column.id !== HEADER_TRIGGER_AFTER,
          ).map(renderCell)}
        </div>
      </div>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        the header is one scroller; the rows are a sibling, as a table has them
      </text>
    </div>
  );
};

/**
 * The menu's checks: it opens under its anchor inside the scroller, the panel
 * follows (or does not follow) the header's wheel, Escape returns the focus,
 * and the first item hides a column without moving the anchor.
 */
const headerMenuSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("header-probe");
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text("header-readout");
    const box = (testId: string) => settledBox(ctx, testId);

    yield* ctx.expectContains(
      "the header starts with every column visible",
      yield* readout(),
      "hidden=none changes=0",
    );

    // 1. The trigger's cell is the first column, then the header's own x.
    const nameCell = yield* box(headerCellId("name"));
    yield* ctx.expectNear(
      "the trigger cell starts where the name column ends",
      (yield* box(HEADER_TRIGGER_CELL)).x,
      nameCell.x + nameCell.width,
      1,
    );
    const trigger = yield* box(HEADER_TRIGGER);

    // 2. A press opens the menu under its anchor.
    yield* ctx.host.click(HEADER_TRIGGER);
    yield* Effect.sleep(SETTLE);
    const menu = yield* box("header-menu");
    yield* ctx.expectEqual(
      "the menu opens below the trigger's box",
      menu.y >= trigger.y + trigger.height,
      true,
    );
    yield* ctx.expectNear(
      "the menu starts from the trigger's own x",
      menu.x,
      trigger.x,
      2,
    );

    // 3. Wheel the header and read where the panel went.
    yield* ctx.host.wheel(HEADER_FRAME, -100, 0);
    yield* Effect.sleep(SETTLE);
    const triggerAfter = yield* box(HEADER_TRIGGER);
    const menuAfter = yield* box("header-menu");
    yield* ctx.expectNear(
      "the wheel moved the trigger with its column",
      triggerAfter.x,
      trigger.x - 100,
      2,
    );
    yield* ctx.expectNear(
      "the menu follows its anchor's wheel",
      menuAfter.x,
      menu.x - 100,
      2,
    );

    // 4. Escape dismisses it and returns the focus.
    yield* ctx.host.key("escape");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Escape unpaints the menu",
      yield* settleGone(ctx, "header-menu"),
      true,
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      HEADER_TRIGGER,
    );

    // 5. Keyboard-open it and hide the last column from the first item.
    yield* ctx.host.wheel(HEADER_FRAME, 100, 0);
    yield* ctx.host.focusElement(HEADER_TRIGGER);
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Enter opens the menu on its first item",
      yield* focusedAfterPaint(ctx),
      HEADER_FIRST_ITEM,
    );
    yield* ctx.host.key("enter");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the first item hides its column",
      yield* readout(),
      "hidden=status changes=1",
    );
    yield* ctx.expectEqual(
      "the hidden column's header unpaints",
      yield* settleGone(ctx, headerCellId("status")),
      true,
    );
    yield* ctx.expectNear(
      "a column after the anchor does not move it",
      (yield* box(HEADER_TRIGGER)).x,
      trigger.x,
      1,
    );

    // 6. The select closes the surface on its exit tween. A press sent during
    //    that tween is dismissed by the layer it is closing, so the probe waits
    //    for the menu to be gone before it reopens it — the measured shape of a
    //    one-shot read here was `a press still opens the menu …  got false`.
    yield* ctx.expectEqual(
      "selecting a column dismisses the menu",
      yield* settleGone(ctx, "header-menu"),
      true,
    );

    // 7. A press on the trigger still opens the menu after the relayout.
    yield* ctx.host.click(HEADER_TRIGGER);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press still opens the menu after the header shrank",
      yield* settlePainted(ctx, "header-menu"),
      true,
    );
    yield* ctx.host.key("escape");
    yield* ctx.host.capture("header-menu");
  });

/**
 * One painted box in a window that is otherwise left to the window server.
 *
 * The paint is deliberately sparse: every pixel the app does not cover is the
 * backdrop under test, so the probe's own chrome would become the measurement.
 * The root carries no background for the same reason, and the children are
 * absolute because an absolute element resolves against its direct parent.
 */
const BackdropProbe = (): ReactNode => {
  const { background } = useWindowFacts();
  const window = useWindowSize();
  return (
    <div
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
      }}
    >
      <div
        testId="backdrop-box"
        style={{
          position: "absolute",
          left: BACKDROP_BOX.x,
          top: BACKDROP_BOX.y,
          width: BACKDROP_BOX.width,
          height: BACKDROP_BOX.height,
          backgroundColor: BACKDROP_FILL,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: BACKDROP_BOX.x,
          top: BACKDROP_BOX.y + BACKDROP_BOX.height + 40,
        }}
      >
        <Readout testId="backdrop-mode">{background}</Readout>
      </div>
    </div>
  );
};

const backdropSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("backdrop-box");
    const mode = yield* ctx.expectSome(
      "the window names the backdrop it opened with",
      decodeWindowBackground(yield* ctx.host.text("backdrop-mode")),
    );
    yield* ctx.host.capture("backdrop");

    // A window is captured at its display's scale, so the fixture's logical
    // points are converted rather than assumed: a hardcoded 2 would read the
    // wrong pixel on a 1x display.
    const frame = yield* ctx.host.pixels("backdrop");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const at = (point: { readonly x: number; readonly y: number }) =>
      Option.fromNullishOr(Pixels.pixelAt(frame, point.x, point.y));

    yield* ctx.expectEqual(
      `${mode}: the box the app paints carries its fill`,
      Option.match(at(framePoint(contentPoint, scale)), {
        onNone: () => "outside the capture",
        onSome: describeColour,
      }),
      describeColour(BACKDROP_FILL_RGBA),
    );
    yield* ctx.expectEqual(
      `${mode}: the window's unpainted surface alpha`,
      Option.match(at(framePoint(backdropPoint(size), scale)), {
        onNone: () => "outside the capture",
        onSome: (colour) => colour.a,
      }),
      surfaceAlpha(mode),
    );
  });

/**
 * The chart probe: the same three-bar plot drawn into a pixel buffer, painted
 * again from a second buffer when the data changes, and pushed as SVG bytes.
 */
const ChartProbe = (): ReactNode => {
  const theme = useTheme();
  const bufferImage = useRef<ImgInstance>(null);
  const svgImage = useRef<ImgInstance>(null);
  const alphaBase = useRef<ImgInstance>(null);
  const alphaOver = useRef<ImgInstance>(null);
  const [frame, setFrame] = useState(1);
  const [plotWidth, setPlotWidth] = useState<number>(PLOT_SIZE.width);
  const [svgStatus, setSvgStatus] = useState("pending");

  // The translucent plot is a second layer over the first: one buffer for the
  // mark beneath, one for the half-alpha series over it.
  useLayoutEffect(() => {
    alphaBase.current?.setImagePixels(
      PLOT.width,
      PLOT.height,
      Buffer.from(alphaBasePixels()),
    );
    alphaOver.current?.setImagePixels(
      PLOT.width,
      PLOT.height,
      Buffer.from(alphaOverPixels()),
    );
  }, []);

  // The pixels must be on the element before the frame that paints it, and a
  // re-push has to be readable as the frame the data changed in.
  useLayoutEffect(() => {
    const instance = bufferImage.current;
    if (instance === null) return;
    instance.setImagePixels(
      PLOT.width,
      PLOT.height,
      Buffer.from(plotPixels(frame === 1 ? SERIES : REPLACEMENT)),
    );
  }, [frame]);

  useLayoutEffect(() => {
    const instance = svgImage.current;
    if (instance === null) return;
    // A layout effect is the boundary: the native decoder is an imperative call
    // that may throw, and there is no Effect runtime inside a render, so the
    // outcome is captured as the readout the probe asserts on.
    const decoded = Effect.try(() => instance.setImage(Buffer.from(PLOT_SVG)));
    setSvgStatus(
      Effect.runSync(
        Effect.match(decoded, {
          onFailure: (error) => `threw ${String(error)}`,
          onSuccess: () => "set",
        }),
      ),
    );
  }, []);

  const plot = (
    testId: string,
    ref: typeof bufferImage,
    width: number = PLOT_SIZE.width,
  ) => (
    <div
      style={{
        width,
        height: PLOT_SIZE.height,
        backgroundColor: hexOf(PLOT_BACKING),
      }}
    >
      <img
        testId={testId}
        ref={ref}
        alt="A three-series bar plot"
        objectFit="fill"
        style={{ width, height: PLOT_SIZE.height }}
      />
    </div>
  );

  return (
    <div
      testId="chart-probe"
      style={{
        width: 760,
        height: 440,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
      }}
    >
      <div style={{ display: "flex", gap: theme.spacing.xl }}>
        {plot("chart-buffer", bufferImage, plotWidth)}
        {plot("chart-svg", svgImage)}
        <div
          testId="chart-alpha"
          style={{
            position: "relative",
            width: PLOT_SIZE.width,
            height: PLOT_SIZE.height,
            backgroundColor: hexOf(PLOT_BACKING),
          }}
        >
          <img
            testId="chart-alpha-base"
            ref={alphaBase}
            alt="The opaque mark under a translucent series"
            objectFit="fill"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: PLOT_SIZE.width,
              height: PLOT_SIZE.height,
            }}
          />
          <img
            testId="chart-alpha-over"
            ref={alphaOver}
            alt="A half-alpha series over the mark"
            objectFit="fill"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: PLOT_SIZE.width,
              height: PLOT_SIZE.height,
            }}
          />
        </div>
      </div>
      <Toolbar>
        <Pressable testId="chart-next" onClick={() => setFrame(2)}>
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            New data
          </text>
        </Pressable>
        <Pressable testId="chart-resize" onClick={() => setPlotWidth(180)}>
          <text
            style={{
              ...textStyle(theme, "label"),
              color: theme.colors.foreground,
            }}
          >
            Wider
          </text>
        </Pressable>
      </Toolbar>
      <Readout testId="chart-frame">{`frame=${frame}`}</Readout>
      <Readout testId="chart-width">{`width=${plotWidth}`}</Readout>
      <Readout testId="chart-svg-status">{`svg=${svgStatus}`}</Readout>
    </div>
  );
};

/** How many pixels of one decoded capture paint `colour` exactly. */
const chartCount = (frame: Pixels.Pixels, colour: Rgb): number =>
  Pixels.countColour(frame, new Pixels.Rgba({ ...colour, a: 0xff }));

/** One buffer pixel read out of the capture, named by the colour it landed on. */
const chartSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("chart-buffer");
    yield* ctx.host.waitFor("chart-alpha-over");
    yield* ctx.host.capture("chart");
    const frame = yield* ctx.host.pixels("chart");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const box = (testId: string) =>
      Effect.flatMap(
        Effect.map(ctx.host.bounds(testId), Option.fromNullishOr),
        (bounds) =>
          ctx.expectSome(`the ${testId} plot occupies its box`, bounds),
      );
    const sampleIn = (
      captured: Pixels.Pixels,
      bounds: Box,
      pixel: { x: number; y: number },
    ): string => {
      const point = framePoint(pointIn(bounds, pixel), scale);
      return Option.match(
        Option.fromNullishOr(Pixels.pixelAt(captured, point.x, point.y)),
        { onNone: () => "outside the capture", onSome: describeColour },
      );
    };
    const sample = (bounds: Box, pixel: { x: number; y: number }): string =>
      sampleIn(frame, bounds, pixel);
    const paints = (captured: Pixels.Pixels, colour: Rgb, label: string) =>
      ctx.expectEqual(label, chartCount(captured, colour) > 0, true);
    const absent = (captured: Pixels.Pixels, colour: Rgb, label: string) =>
      ctx.expectEqual(label, chartCount(captured, colour), 0);

    // 1. A buffer keeps its own per-pixel colours: the route a chart with more
    //    than one series needs, which a tinted `<svg>` cannot take.
    const buffer = yield* box("chart-buffer");
    yield* box("chart-svg");
    yield* Effect.forEach(
      SERIES,
      (colour, index) =>
        paints(frame, colour, `series ${index + 1} paints from the buffer`),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "a bar's body reads its own series colour",
      sample(buffer, BAR_PIXEL),
      describeColour(new Pixels.Rgba({ ...SERIES[0], a: 0xff })),
    );

    // 2. A margin pixel is the card behind the plot, so the element composites
    //    its transparency instead of painting an opaque square.
    yield* ctx.expectEqual(
      "the plot's transparent margin shows the surface behind it",
      sample(buffer, MARGIN_PIXEL),
      describeColour(new Pixels.Rgba({ ...PLOT_BACKING, a: 0xff })),
    );

    // 2b. A half-alpha mark over another mark: the layer a stacked series
    //     paints, read where it covers the opaque mark, where it covers the
    //     card, and against an opaque pixel of the same colour.
    const base = yield* box("chart-alpha-base");
    const over = yield* box("chart-alpha-over");
    yield* ctx.expectEqual(
      "the translucent series paints on the mark's own box",
      `${over.x},${over.y},${over.width},${over.height}`,
      `${base.x},${base.y},${base.width},${base.height}`,
    );
    yield* ctx.expectEqual(
      "a half-alpha mark over another mark composites onto it",
      sample(base, ALPHA_POINTS.overBase),
      describeColour(
        new Pixels.Rgba({
          ...compositeOver(ALPHA_OVER, ALPHA_BASE, ALPHA_SHARE),
          a: 0xff,
        }),
      ),
    );
    yield* ctx.expectEqual(
      "a half-alpha mark over the card composites onto the card",
      sample(base, ALPHA_POINTS.overBacking),
      describeColour(
        new Pixels.Rgba({
          ...compositeOver(ALPHA_OVER, PLOT_BACKING, ALPHA_SHARE),
          a: 0xff,
        }),
      ),
    );
    yield* ctx.expectEqual(
      "an opaque mark keeps its own colour beside the translucent one",
      sample(base, ALPHA_POINTS.opaque),
      describeColour(new Pixels.Rgba({ ...ALPHA_OVER, a: 0xff })),
    );

    // 3. `setImage` decodes SVG bytes: the vector route, with every fill its
    //    own colour rather than one mask tint.
    yield* ctx.expectEqual(
      "the svg bytes reached the element",
      yield* ctx.host.text("chart-svg-status"),
      "svg=set",
    );
    yield* Effect.forEach(
      VECTOR,
      (colour, index) =>
        paints(frame, colour, `vector series ${index + 1} paints its own fill`),
      { concurrency: 1 },
    );

    // 4. New data replaces the frame: a chart that only ever painted once would
    //    be a screenshot.
    yield* ctx.host.click("chart-next");
    yield* ctx.expectEqual(
      "the probe is on the frame the press produced",
      yield* settleUntil(
        ctx.host.text("chart-frame"),
        (value) => value === "frame=2",
      ),
      "frame=2",
    );
    yield* ctx.host.capture("chart-second");
    const updated = yield* ctx.host.pixels("chart-second");
    yield* Effect.forEach(
      REPLACEMENT,
      (colour, index) =>
        paints(
          updated,
          colour,
          `the updated series ${index + 1} paints from the second buffer`,
        ),
      { concurrency: 1 },
    );
    yield* Effect.forEach(
      SERIES,
      (colour, index) =>
        absent(
          updated,
          colour,
          `the first buffer's series ${index + 1} is gone`,
        ),
      { concurrency: 1 },
    );

    // 5. A resize scales the buffer with its box: a chart in a split pane is
    //    laid out again without the app re-drawing its pixels.
    const barOf = (captured: Pixels.Pixels, colour: Rgb) =>
      ctx.expectSome(
        `the ${hexOf(colour)} bar has a painted bound`,
        Option.fromNullishOr(
          Pixels.boundsOfColour(
            captured,
            new Pixels.Rgba({ ...colour, a: 0xff }),
          ),
        ),
      );
    const before = yield* barOf(updated, REPLACEMENT[0]);
    yield* ctx.host.click("chart-resize");
    yield* ctx.expectEqual(
      "the plot reports the width the press gave it",
      yield* settleUntil(
        ctx.host.text("chart-width"),
        (value) => value === "width=180",
      ),
      "width=180",
    );
    yield* ctx.host.capture("chart-resized");
    const resized = yield* ctx.host.pixels("chart-resized");
    const grown = yield* box("chart-buffer");
    yield* ctx.expectNear(
      "the plot's box follows its width",
      grown.width,
      180,
      1,
    );
    yield* ctx.expectEqual(
      "the resized buffer still paints its series",
      sampleIn(resized, grown, BAR_PIXEL),
      describeColour(new Pixels.Rgba({ ...REPLACEMENT[0], a: 0xff })),
    );
    const after = yield* barOf(resized, REPLACEMENT[0]);
    yield* ctx.expectNear(
      "the buffer scales with the box, so the bar grows by the same share",
      after.width / before.width,
      1.5,
      0.05,
    );
    yield* ctx.expectNear(
      "the bar keeps its height through the resize",
      after.height,
      before.height,
      2,
    );
  });

/**
 * The window-chrome probe: where the app's own layout starts, and what the
 * window reports as its safe area.
 */
const WindowChromeProbe = (): ReactNode => {
  const theme = useTheme();
  const facts = useWindowFacts();
  const { renderer } = useGpuix();
  const live = useWindowInsets();
  const [insets, setInsets] = useState<Option.Option<NativeWindowInsets>>(
    Option.none(),
  );

  // The renderer's own answer, read at mount: the hook samples every 100ms, so
  // the two channels are a fact about the app rather than the same read twice.
  useLayoutEffect(() => {
    setInsets(Option.fromNullishOr(renderer?.getWindowInsets?.()));
  }, [renderer]);

  const edge = (pick: (value: NativeWindowInsets) => Edges): ReactNode =>
    Option.match(insets, {
      onNone: () => "pending",
      onSome: (value) => formatEdges(pick(value)),
    });

  return (
    <div
      testId="chrome-probe"
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        testId="chrome-top-bar"
        style={{ height: BAR_HEIGHT, backgroundColor: hexOf(CHROME_FILL) }}
      />
      <div
        testId="chrome-safe-bar"
        style={{
          position: "absolute",
          top: Option.match(insets, {
            onNone: () => 0,
            onSome: (value) => value.effective.top,
          }),
          left: SAFE_BAR_X,
          right: 0,
          height: BAR_HEIGHT,
          backgroundColor: hexOf(SAFE_FILL),
        }}
      />
      <div
        style={{
          marginTop: BAR_HEIGHT * 3,
          padding: theme.spacing.lg,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <Readout testId="chrome-mode">{`titlebar=${facts.chrome}`}</Readout>
        <Readout testId="chrome-renderer-safe">
          {edge((value) => value.safeArea)}
        </Readout>
        <Readout testId="chrome-renderer-ime">
          {edge((value) => value.ime)}
        </Readout>
        <Readout testId="chrome-renderer-effective">
          {edge((value) => value.effective)}
        </Readout>
        <Readout testId="chrome-hook-safe">
          {formatEdges(live.safeArea)}
        </Readout>
      </div>
    </div>
  );
};

/** Where the app's own layout starts, and what the window reports as its safe area. */
const windowChromeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("chrome-top-bar");
    const chrome = yield* ctx.expectSome(
      "the window names the titlebar it opened with",
      pipe(
        yield* ctx.host.text("chrome-mode"),
        Str.replace("titlebar=", ""),
        Schema.decodeUnknownOption(TitlebarChrome),
      ),
    );
    const edgesOf = (testId: string) =>
      Effect.gen(function* () {
        const text = yield* settleUntil(ctx.host.text(testId), (value) =>
          Option.isSome(decodeEdges(value)),
        );
        return yield* ctx.expectSome(
          `the ${testId} readout is four numbers`,
          decodeEdges(text),
        );
      });

    const safe = yield* edgesOf("chrome-renderer-safe");
    const ime = yield* edgesOf("chrome-renderer-ime");
    const effective = yield* edgesOf("chrome-renderer-effective");
    const hookSafe = yield* edgesOf("chrome-hook-safe");

    // 1. The app channel and the renderer answer for the same window: the hook
    //    samples every 100ms, so a mismatch is a lag, and the poll above is what
    //    a consumer's own inset code has to survive.
    yield* ctx.expectEqual(
      "the app channel reports the renderer's safe area",
      formatEdges(hookSafe),
      formatEdges(safe),
    );

    // 2. With no text session there is no keyboard inset, and the effective
    //    edges are the safe area itself — the composite an app insets by.
    yield* ctx.expectEqual(
      "the keyboard inset is empty without a text session",
      formatEdges(ime),
      "0,0,0,0",
    );
    yield* ctx.expectEqual(
      "the effective inset is the safe area while no keyboard is up",
      formatEdges(effective),
      formatEdges(safe),
    );

    // 3. A bar painted at `top: effective.top` starts exactly there, so the
    //    number a toolbar insets by is the number the app is given.
    const safeBar = yield* ctx.expectSome(
      "the inset bar painted",
      Option.fromNullishOr(yield* ctx.host.bounds("chrome-safe-bar")),
    );
    yield* ctx.expectNear(
      "a bar inset by the effective top starts there",
      safeBar.y,
      effective.top,
      1,
    );

    // 4. The app's layout starts at the capture's top edge, so the window's
    //    chrome is the app's to paint over — not something the runtime reserves.
    yield* ctx.host.capture("chrome");
    const frame = yield* ctx.host.pixels("chrome");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const point = framePoint(barPoint(0), scale);
    const insetPoint = framePoint(insetBarPoint(effective.top), scale);
    const at = (spot: { x: number; y: number }) =>
      Option.match(
        Option.fromNullishOr(Pixels.pixelAt(frame, spot.x, spot.y)),
        { onNone: () => "outside the capture", onSome: describeColour },
      );
    yield* ctx.expectEqual(
      "the app's own bar paints at the window's top edge",
      at(point),
      describeColour(new Pixels.Rgba({ ...CHROME_FILL, a: 0xff })),
    );
    yield* ctx.expectEqual(
      "the bar inset by the safe area paints where the inset puts it",
      at(insetPoint),
      describeColour(new Pixels.Rgba({ ...SAFE_FILL, a: 0xff })),
    );

    // 5. The safe area is the one the window reports, not a titlebar band: in
    //    both modes it is empty on this host, so a toolbar that draws under a
    //    transparent titlebar reserves its own inset — there is no reported
    //    number to read it from.
    yield* ctx.expectEqual(
      `${chrome}: the safe area the window reports`,
      formatEdges(safe),
      "0,0,0,0",
    );
  });

/**
 * A workspace arrangement after a restore: the fixed panes, the document rail
 * and the inspector, built from the layout the app hands back.
 *
 * The split is the shipped `SplitPane` in its caller-owned mode, because a
 * restored arrangement cannot reach a component's internal width — the app
 * passes the width and takes every drag through `onResize`. The inspector
 * applies the saved scroll once, on its first layout, since a programmatic
 * scroll before the content is measured would clamp to zero.
 */
const WorkspaceView = ({
  layout,
  onChange,
}: {
  readonly layout: WorkspaceLayout;
  readonly onChange: Dispatch<SetStateAction<WorkspaceLayout>>;
}): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const inspector = useRef<PublicInstance | null>(null);
  const applied = useRef(false);
  const savedScroll = useRef(layout.scroll);
  const [documentLayout, setDocumentLayout] = useState({
    width: 0,
    reports: 0,
  });

  const applySavedScroll = () => {
    if (applied.current) return;
    applied.current = true;
    const elementId = inspector.current?.id;
    if (elementId == null || savedScroll.current <= 0) return;
    renderer?.scrollTo?.(elementId, 0, -savedScroll.current);
  };

  const row = (index: number): ReactNode => (
    <div
      key={index}
      testId={`ws-inspector-row-${index}`}
      style={{
        height: WORKSPACE_ROW_HEIGHT,
        backgroundColor:
          index % 2 === 0 ? theme.colors.background : theme.colors.card,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {`inspector ${index}`}
      </text>
    </div>
  );

  return (
    <div
      testId={WORKSPACE_IDS.row}
      style={{
        display: "flex",
        flexDirection: "row",
        flexGrow: 1,
        minHeight: 0,
      }}
    >
      <div
        testId={WORKSPACE_IDS.sidebar}
        style={{
          width: layout.sidebar,
          flexShrink: 0,
          overflow: "hidden",
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          sidebar
        </text>
      </div>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <SplitPane
          id="ws"
          size={layout.document}
          initial={layout.document}
          min={WORKSPACE_DOCUMENT.min}
          max={WORKSPACE_DOCUMENT.max}
          onResize={(size) =>
            onChange((current) => updateWorkspace(current, { document: size }))
          }
          primary={
            <div
              testId={WORKSPACE_IDS.centre}
              onLayout={(payload) =>
                setDocumentLayout((current) => ({
                  width: Math.round(payload.width ?? current.width),
                  reports: current.reports + 1,
                }))
              }
              style={{
                width: "100%",
                height: "100%",
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.card,
              }}
            >
              <Readout testId={WORKSPACE_IDS.document}>
                {`document=${layout.tab}`}
              </Readout>
              <Readout testId={WORKSPACE_IDS.layout}>
                {`w=${documentLayout.width} reports=${documentLayout.reports}`}
              </Readout>
            </div>
          }
          secondary={
            <div
              testId={WORKSPACE_IDS.inspector}
              ref={inspector}
              onLayout={applySavedScroll}
              onScrollChange={(event) =>
                onChange((current) =>
                  updateWorkspace(current, {
                    scroll: Math.max(0, Math.round(-(event.scrollY ?? 0))),
                  }),
                )
              }
              style={{
                width: "100%",
                height: "100%",
                overflow: "scroll",
                backgroundColor: theme.colors.background,
              }}
            >
              {Arr.map(Arr.range(0, WORKSPACE_ROWS - 1), row)}
            </div>
          }
        />
      </div>
    </div>
  );
};

/**
 * `workspace-restore` — a dock's arrangement survives a re-mount.
 *
 * Tier 4's **persistent panel state** is app-owned: the runtime publishes no
 * storage, so the app writes a layout as a string, decodes it at the boundary
 * and hands it back. Nothing had measured that the second half paints: whether
 * a pane given a restored width paints that box (and the layout pass reports
 * it), whether the chosen document mounts, and whether a saved scroll offset
 * lands where it was. The probe changes the arrangement with controls rather
 * than a drag — the drags are measured by `split-pane-lifecycle` and
 * `dock-focus-lifecycle` — so the restore is the only variable. A corrupt
 * string and one outside the pane's bounds are steps of the same run: the first
 * falls back to the default, the second is clamped, so the boundary is measured
 * in both directions.
 */
const WorkspaceRestoreProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [layout, setLayout] = useState<WorkspaceLayout>(() =>
    defaultWorkspace(),
  );
  const [mount, setMount] = useState(1);
  const [saved, setSaved] = useState("none");
  const [source, setSource] = useState<"none" | "stored" | "default">("none");

  const save = () => setSaved(encodeWorkspace(layout));
  const restoreFrom = (stored: string) => {
    const restored = restoreWorkspace(stored);
    setLayout(restored.layout);
    setSource(restored.source);
    setMount((current) => current + 1);
  };
  const tab = (value: WorkspaceTab) =>
    setLayout((current) => updateWorkspace(current, { tab: value }));

  return (
    <div
      testId={WORKSPACE_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A workspace saved as a string and re-mounted from it: the panes, the
        document and the inspector's scroll come back.
      </text>
      <Toolbar>
        <Pressable
          testId={WORKSPACE_IDS.toggle}
          onClick={() =>
            setLayout((current) =>
              updateWorkspace(current, {
                sidebar: toggleSidebar(current.sidebar),
              }),
            )
          }
        >
          sidebar
        </Pressable>
        <Pressable
          testId={WORKSPACE_IDS.wider}
          onClick={() =>
            setLayout((current) =>
              updateWorkspace(current, {
                document: stepDocument(
                  current.document,
                  WORKSPACE_DOCUMENT.step,
                ),
              }),
            )
          }
        >
          wider
        </Pressable>
        <Pressable
          testId={WORKSPACE_IDS.narrower}
          onClick={() =>
            setLayout((current) =>
              updateWorkspace(current, {
                document: stepDocument(
                  current.document,
                  -WORKSPACE_DOCUMENT.step,
                ),
              }),
            )
          }
        >
          narrower
        </Pressable>
        {Arr.map(WORKSPACE_TABS, (value) => (
          <Pressable
            key={value}
            testId={WORKSPACE_IDS.tab(value)}
            onClick={() => tab(value)}
          >
            {value}
          </Pressable>
        ))}
      </Toolbar>
      <Toolbar>
        <Pressable testId={WORKSPACE_IDS.save} onClick={save}>
          save
        </Pressable>
        <Pressable
          testId={WORKSPACE_IDS.restore}
          onClick={() => restoreFrom(saved)}
        >
          restore
        </Pressable>
        <Pressable
          testId={WORKSPACE_IDS.corrupt}
          onClick={() => {
            setSaved(CORRUPT_WORKSPACE);
            restoreFrom(CORRUPT_WORKSPACE);
          }}
        >
          corrupt
        </Pressable>
        <Pressable
          testId={WORKSPACE_IDS.clamp}
          onClick={() => {
            const stored = encodeWorkspace(clampedSample());
            setSaved(stored);
            restoreFrom(stored);
          }}
        >
          clamp
        </Pressable>
      </Toolbar>
      <Readout testId={WORKSPACE_IDS.readout}>
        {`sidebar=${layout.sidebar} document=${layout.document} tab=${layout.tab} scroll=${layout.scroll} mount=${mount} saved=${saved === "none" ? "no" : "yes"} source=${source}`}
      </Readout>
      <Readout testId={WORKSPACE_IDS.saved}>{saved}</Readout>
      <WorkspaceView key={mount} layout={layout} onChange={setLayout} />
    </div>
  );
};

const workspaceRestoreSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(WORKSPACE_IDS.probe);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(WORKSPACE_IDS.readout);
    /** An element's painted width; an unpainted one is `-1`. */
    const widthOf = (testId: string) =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.match(Option.fromNullishOr(bounds), {
          onNone: () => -1,
          onSome: (value) => value.width,
        }),
      );
    const boxOf = (testId: string) =>
      Effect.flatMap(
        Effect.map(ctx.host.bounds(testId), Option.fromNullishOr),
        (bounds) => ctx.expectSome(`${testId} painted`, bounds),
      );
    /** The inspector's painted scroll offset; `NaN` when it reports none. */
    const scrollY = () =>
      Effect.map(ctx.host.scrollOffset(WORKSPACE_IDS.inspector), (offset) =>
        Option.match(Option.fromNullishOr(offset), {
          onNone: () => Number.NaN,
          onSome: (value) => value.y,
        }),
      );
    /** The readout once it names `expected`, or whatever it last read. */
    const settledReadout = (expected: string) => {
      const poll = (
        tries: number,
      ): Effect.Effect<string, Smoke.SmokeHostError> =>
        Effect.gen(function* () {
          const text = yield* readout();
          if (Str.includes(expected)(text) || tries <= 0) return text;
          yield* Effect.sleep(Duration.millis(40));
          return yield* poll(tries - 1);
        });
      return poll(50);
    };
    /** The inspector offset once it reaches `expected`, or its last value. */
    const settledScroll = (
      expected: number,
    ): Effect.Effect<number, Smoke.SmokeHostError> => {
      const poll = (
        tries: number,
      ): Effect.Effect<number, Smoke.SmokeHostError> =>
        Effect.gen(function* () {
          const y = yield* scrollY();
          if (Math.abs(y - expected) <= 1 || tries <= 0) return y;
          yield* Effect.sleep(Duration.millis(40));
          return yield* poll(tries - 1);
        });
      return poll(50);
    };
    /** The document pane's layout report once it reaches `expected`, or its last value. */
    const settledLayoutWidth = (
      expected: number,
    ): Effect.Effect<number, Smoke.SmokeHostError> => {
      const poll = (
        tries: number,
      ): Effect.Effect<number, Smoke.SmokeHostError> =>
        Effect.gen(function* () {
          const width = readoutNumber(
            yield* ctx.host.text(WORKSPACE_IDS.layout),
            "w",
          );
          if (Math.abs(width - expected) <= 1 || tries <= 0) return width;
          yield* Effect.sleep(Duration.millis(40));
          return yield* poll(tries - 1);
        });
      return poll(50);
    };

    // 1. The default arrangement, and the row it is laid out in.
    const row = yield* boxOf(WORKSPACE_IDS.row);
    yield* ctx.expectContains(
      "the workspace opens at the default arrangement",
      yield* readout(),
      "sidebar=160 document=240 tab=explorer scroll=0 mount=1 saved=no source=none",
    );
    yield* ctx.expectNear(
      "the sidebar paints its width",
      yield* widthOf(WORKSPACE_IDS.sidebar),
      WORKSPACE_SIDEBAR,
      1,
    );
    yield* ctx.expectNear(
      "the document pane paints its width",
      yield* widthOf(WORKSPACE_PANE.a),
      WORKSPACE_DOCUMENT.initial,
      1,
    );
    yield* ctx.expectNear(
      "the inspector takes what the fixed panes leave",
      yield* widthOf(WORKSPACE_PANE.b),
      row.width -
        WORKSPACE_SIDEBAR -
        WORKSPACE_DOCUMENT.initial -
        WORKSPACE_DIVIDER,
      1,
    );
    yield* ctx.expectEqual(
      "the workspace opens on the document it names",
      yield* ctx.host.text(WORKSPACE_IDS.document),
      "document=explorer",
    );
    yield* ctx.expectEqual(
      "the inspector starts at the top",
      yield* scrollY(),
      0,
    );

    // 2. Change every persisted field.
    yield* ctx.host.click(WORKSPACE_IDS.toggle);
    yield* Effect.forEach(
      Arr.range(1, 4),
      () => ctx.host.click(WORKSPACE_IDS.wider),
      { concurrency: 1 },
    );
    yield* ctx.host.click(WORKSPACE_IDS.tab("output"));
    yield* ctx.host.wheel(WORKSPACE_IDS.inspector, 0, -120);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the controls leave a collapsed sidebar, the widest document, the chosen tab and a scroll",
      yield* readout(),
      "sidebar=0 document=360 tab=output scroll=120",
    );
    yield* ctx.expectNear(
      "the fourth widening press stops at the pane's bound",
      yield* widthOf(WORKSPACE_PANE.a),
      WORKSPACE_DOCUMENT.max,
      1,
    );
    yield* ctx.expectNear(
      "a collapsed sidebar paints no width",
      yield* widthOf(WORKSPACE_IDS.sidebar),
      0,
      0.5,
    );
    yield* ctx.expectNear(
      "the inspector takes the enlarged row",
      yield* widthOf(WORKSPACE_PANE.b),
      row.width - WORKSPACE_DOCUMENT.max - WORKSPACE_DIVIDER,
      1,
    );
    yield* ctx.expectEqual(
      "the chosen document is the one painted",
      yield* ctx.host.text(WORKSPACE_IDS.document),
      "document=output",
    );
    yield* ctx.expectNear(
      "the wheel moved the inspector by its delta",
      yield* scrollY(),
      -120,
      1,
    );
    yield* ctx.host.capture("workspace-changed");

    // 3. Save: the string is the arrangement the window is showing.
    yield* ctx.host.click(WORKSPACE_IDS.save);
    yield* Effect.sleep(SETTLE);
    const stored = yield* ctx.expectSome(
      "the app saved a layout the schema decodes",
      decodeWorkspace(yield* ctx.host.text(WORKSPACE_IDS.saved)),
    );
    yield* ctx.expectEqual(
      "the saved string is the arrangement the window shows",
      Arr.join(
        Arr.map(
          [stored.sidebar, stored.document, stored.tab, stored.scroll],
          String,
        ),
        ",",
      ),
      [0, WORKSPACE_DOCUMENT.max, "output", 120].join(","),
    );

    // 4. Restore re-mounts the workspace from that string.
    yield* ctx.host.click(WORKSPACE_IDS.restore);
    const restored = yield* settledReadout("mount=2");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a restore re-mounts the workspace from its saved string",
      restored,
      `sidebar=0 document=${WORKSPACE_DOCUMENT.max} tab=output scroll=120 mount=2 saved=yes source=stored`,
    );
    yield* ctx.expectNear(
      "the restored sidebar paints the saved width",
      yield* widthOf(WORKSPACE_IDS.sidebar),
      0,
      0.5,
    );
    yield* ctx.expectNear(
      "the restored document pane paints the saved width",
      yield* widthOf(WORKSPACE_PANE.a),
      WORKSPACE_DOCUMENT.max,
      1,
    );
    yield* ctx.expectNear(
      "the restored inspector takes the row the saved layout leaves",
      yield* widthOf(WORKSPACE_PANE.b),
      row.width - WORKSPACE_DOCUMENT.max - WORKSPACE_DIVIDER,
      1,
    );
    yield* ctx.expectEqual(
      "the restored document is the one painted",
      yield* ctx.host.text(WORKSPACE_IDS.document),
      "document=output",
    );
    yield* ctx.expectNear(
      "the pane's layout pass reports the restored width",
      yield* settledLayoutWidth(WORKSPACE_DOCUMENT.max),
      WORKSPACE_DOCUMENT.max,
      1,
    );
    yield* ctx.expectNear(
      "the saved scroll paints where it was saved",
      yield* settledScroll(-120),
      -120,
      1,
    );
    yield* ctx.host.capture("workspace-restored");

    // 5. A string that is not a layout opens the default arrangement.
    yield* ctx.host.click(WORKSPACE_IDS.corrupt);
    const fallback = yield* settledReadout("mount=3");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a string that is not a layout restores the default arrangement",
      fallback,
      `sidebar=${WORKSPACE_SIDEBAR} document=${WORKSPACE_DOCUMENT.initial} tab=explorer scroll=0 mount=3 saved=yes source=default`,
    );
    yield* ctx.expectNear(
      "the default sidebar paints again",
      yield* widthOf(WORKSPACE_IDS.sidebar),
      WORKSPACE_SIDEBAR,
      1,
    );
    yield* ctx.expectNear(
      "the default document paints again",
      yield* widthOf(WORKSPACE_PANE.a),
      WORKSPACE_DOCUMENT.initial,
      1,
    );
    yield* ctx.expectEqual(
      "the default document is painted",
      yield* ctx.host.text(WORKSPACE_IDS.document),
      "document=explorer",
    );
    yield* ctx.expectNear(
      "the default layout starts at the top",
      yield* settledScroll(0),
      0,
      1,
    );
    yield* ctx.host.capture("workspace-default");

    // 6. A stored width outside the bounds is clamped to the window's own.
    yield* ctx.host.click(WORKSPACE_IDS.clamp);
    const clamped = yield* settledReadout("mount=4");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a stored width outside the pane's bounds restores clamped",
      clamped,
      `sidebar=0 document=${WORKSPACE_DOCUMENT.max} tab=explorer scroll=0 mount=4 saved=yes source=stored`,
    );
    yield* ctx.expectNear(
      "the clamped document cannot leave the inspector off the frame",
      yield* widthOf(WORKSPACE_PANE.a),
      WORKSPACE_DOCUMENT.max,
      1,
    );
    yield* ctx.expectNear(
      "the clamped inspector still fills the rest of the row",
      yield* widthOf(WORKSPACE_PANE.b),
      row.width - WORKSPACE_DOCUMENT.max - WORKSPACE_DIVIDER,
      1,
    );
    yield* ctx.host.capture("workspace-clamped");
  });

/**
 * The window's theme switch: the provider's value changes and the frame follows.
 *
 * A window's renderer reports no style, so the theme gallery's style-report
 * proof cannot run here. What a window adds is the paint and the layout: the
 * page and card are sampled out of the captured frame, and the `md` control's
 * height is read from `bounds`, which is where a density change has to show. The
 * palette cycle is the shell's own; the platform cycle covers every look the
 * tokens table ships.
 *
 * The high-contrast palette is the measured rule: `applyStyle` reserves its
 * colours while still applying a look's density, so switching the platform with
 * that palette selected must move the control and leave the page's fill alone.
 */
const ThemeSwitchProbe = (): ReactNode => {
  const [palette, setPalette] = useState<PaletteId>("dark");
  const [platform, setPlatform] = useState<PlatformName>("default");
  const theme = themeFor(palette, platform);

  return (
    <TokensThemeProvider theme={theme}>
      <div
        testId="theme-page"
        style={{
          width: THEME_PAGE.width,
          height: THEME_PAGE.height,
          padding: THEME_PAGE_PADDING,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
        }}
      >
        <div
          testId="theme-card"
          style={{
            width: THEME_CARD.width,
            height: THEME_CARD.height,
            padding: THEME_CARD_PADDING,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
          }}
        >
          <text
            testId="theme-card-label"
            style={{
              ...textStyle(theme, "bodyStrong"),
              color: theme.colors.foreground,
            }}
          >
            {`${palette} · ${platform}`}
          </text>
          <div
            testId="theme-control"
            style={{
              width: THEME_CONTROL_WIDTH,
              height: theme.density.controlHeight.md,
              marginTop: theme.spacing.md,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.primary,
            }}
          />
        </div>
        <Toolbar>
          <Pressable
            testId="theme-palette-next"
            onClick={() => setPalette((current) => nextPalette[current])}
          >
            <Body>switch palette</Body>
          </Pressable>
          <Pressable
            testId="theme-platform-next"
            onClick={() =>
              setPlatform((current) => nextPlatformInCycle[current])
            }
          >
            <Body>switch platform</Body>
          </Pressable>
          <Readout testId="theme-switch-readout">
            {themeSwitchReadout(palette, platform, theme)}
          </Readout>
        </Toolbar>
      </div>
    </TokensThemeProvider>
  );
};

const themeSwitchSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("theme-page");
    yield* Effect.sleep(SETTLE);

    const readoutIs = (palette: PaletteId, platform: PlatformName) =>
      Effect.gen(function* () {
        const theme = themeFor(palette, platform);
        const wanted = themeSwitchReadout(palette, platform, theme);
        const settled = yield* settleUntil(
          ctx.host.text("theme-switch-readout"),
          (value) => value === wanted,
        );
        yield* ctx.expectEqual(
          `the readout names ${palette} on ${platform}`,
          settled,
          wanted,
        );
      });

    const boxOf = (testId: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `the ${testId} paints a box`,
          Option.fromNullishOr(yield* ctx.host.bounds(testId)),
        );
      });

    const colourOf = (role: "background" | "card", theme: Theme) =>
      ctx.expectSome(
        `the ${role} role is a colour a frame can hold`,
        roleColour(theme, role),
      );

    const size = yield* ctx.host.windowSize();
    const page = yield* boxOf("theme-page");
    const card = yield* boxOf("theme-card");

    /**
     * Captures `name`, samples `pointOf` its box and settles on `expected`.
     *
     * Each attempt writes the same capture, so a software paint that lands a
     * frame late costs a retry instead of a false failure; the assertion then
     * prints both colours.
     */
    const sample = (
      label: string,
      name: string,
      surface: Smoke.Bounds,
      pointOf: (box: Smoke.Bounds) => {
        readonly x: number;
        readonly y: number;
      },
      expected: Pixels.Rgba,
    ) =>
      Effect.gen(function* () {
        const read = Effect.gen(function* () {
          yield* ctx.host.capture(name);
          const frame = yield* ctx.host.pixels(name);
          const scale = yield* ctx.expectSome(
            "the capture is the window at a whole device scale",
            captureScale(frame, size),
          );
          const at = framePoint(pointOf(surface), scale);
          return yield* ctx.expectSome(
            `the ${name} capture holds the sample point`,
            Option.fromNullishOr(Pixels.pixelAt(frame, at.x, at.y)),
          );
        });
        const settled = yield* settleUntil(
          read,
          (colour) => sameColour(colour, expected),
          4,
        );
        yield* ctx.expectEqual(
          label,
          describeColour(settled),
          describeColour(expected),
        );
        return settled;
      });

    const heightOf = (label: string, theme: Theme) =>
      Effect.gen(function* () {
        const control = yield* boxOf("theme-control");
        yield* ctx.expectNear(
          `${label}: the md control takes the theme's height`,
          control.height,
          controlHeight(theme),
          1,
        );
        return control.height;
      });

    // ── The shell's opening frame ───────────────────────────────────────────
    const dark = themeFor("dark", "default");
    yield* readoutIs("dark", "default");
    const darkPage = yield* sample(
      "the window paints the dark page",
      "theme-dark",
      page,
      themePagePoint,
      yield* colourOf("background", dark),
    );
    const darkCard = yield* sample(
      "the window paints the dark card",
      "theme-dark",
      card,
      themeCardPoint,
      yield* colourOf("card", dark),
    );
    const darkHeight = yield* heightOf("dark", dark);

    // ── A palette press repaints, and leaves density alone ──────────────────
    yield* ctx.host.click("theme-palette-next");
    const light = themeFor("light", "default");
    yield* readoutIs("light", "default");
    const lightPage = yield* sample(
      "a palette press repaints the page",
      "theme-light",
      page,
      themePagePoint,
      yield* colourOf("background", light),
    );
    yield* ctx.expectEqual(
      "the light page is a different fill from the dark one",
      sameColour(lightPage, darkPage),
      false,
    );
    yield* sample(
      "a palette press repaints the card",
      "theme-light",
      card,
      themeCardPoint,
      yield* colourOf("card", light),
    );
    const lightHeight = yield* heightOf("light", light);
    yield* ctx.expectEqual(
      "a palette press leaves the control's height alone",
      lightHeight,
      darkHeight,
    );

    // ── The high-contrast palette is a third page ───────────────────────────
    yield* ctx.host.click("theme-palette-next");
    const high = themeFor("high", "default");
    yield* readoutIs("high", "default");
    const highPage = yield* sample(
      "the high-contrast palette repaints the page again",
      "theme-high",
      page,
      themePagePoint,
      yield* colourOf("background", high),
    );
    yield* ctx.expectEqual(
      "the high-contrast page is a different fill from the light one",
      sameColour(highPage, lightPage),
      false,
    );
    yield* sample(
      "the high-contrast palette repaints the card",
      "theme-high",
      card,
      themeCardPoint,
      yield* colourOf("card", high),
    );
    const highHeight = yield* heightOf("high", high);

    // ── A platform press re-lays the control out ────────────────────────────
    yield* ctx.host.click("theme-platform-next");
    const darwin = themeFor("high", "darwin");
    yield* readoutIs("high", "darwin");
    const darwinPage = yield* sample(
      "a platform look keeps a high-contrast palette's page",
      "theme-darwin",
      page,
      themePagePoint,
      yield* colourOf("background", darwin),
    );
    yield* ctx.expectEqual(
      "the reserved high-contrast fill is the one the last frame painted",
      sameColour(darwinPage, highPage),
      true,
    );
    const darwinHeight = yield* heightOf("darwin", darwin);
    yield* ctx.expectEqual(
      "a platform look re-lays the control out",
      darwinHeight === highHeight,
      false,
    );

    // ── Every look in the cycle moves the density to its own preset ─────────
    yield* ctx.host.click("theme-platform-next");
    const linux = themeFor("high", "linux");
    yield* readoutIs("high", "linux");
    const linuxHeight = yield* heightOf("linux", linux);
    yield* ctx.expectEqual(
      "the next look moves the density again",
      linuxHeight === darwinHeight,
      false,
    );

    yield* ctx.host.click("theme-platform-next");
    yield* readoutIs("high", "win32");
    const win32Height = yield* heightOf("win32", themeFor("high", "win32"));
    yield* ctx.expectEqual(
      "the third look has its own height",
      win32Height === linuxHeight,
      false,
    );

    yield* ctx.host.click("theme-platform-next");
    yield* readoutIs("high", "default");
    const defaultHeight = yield* heightOf("default", high);
    yield* ctx.expectEqual(
      "the platform cycle returns to the base density",
      defaultHeight,
      highHeight,
    );

    // ── The palette cycle closes on the frame it opened on ──────────────────
    yield* ctx.host.click("theme-palette-next");
    const darkAgain = themeFor("dark", "default");
    yield* readoutIs("dark", "default");
    const restoredPage = yield* sample(
      "the palette cycle closes on the page it opened on",
      "theme-restored",
      page,
      themePagePoint,
      yield* colourOf("background", darkAgain),
    );
    yield* ctx.expectEqual(
      "the restored page is the opening frame's fill",
      sameColour(restoredPage, darkPage),
      true,
    );
    const restoredCard = yield* sample(
      "the restored page is the opening frame's card",
      "theme-restored",
      card,
      themeCardPoint,
      yield* colourOf("card", darkAgain),
    );
    yield* ctx.expectEqual(
      "the restored card is the opening frame's fill",
      sameColour(restoredCard, darkCard),
      true,
    );
    const restoredHeight = yield* heightOf("restored", darkAgain);
    yield* ctx.expectEqual(
      "the restored control is the opening height",
      restoredHeight,
      darkHeight,
    );
  });

/**
 * The shipped `Dialog` holding the shipped `Popover` holding the shipped
 * `DropdownMenu` — the three-level stack the shared dismiss layer exists for.
 *
 * Every surface is controlled by the fixture (`nestedFlow`), so a dismissal the
 * stack resolves reaches React and the readout prints which surface each
 * keystroke landed on. A skipped surface is the claim under test: one Escape
 * must close the menu **only**, the next the popover, the last the dialog.
 */
const NestedOverlayProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [flow, dispatch] = useReducer(nestedFlow, initialNestedFlow);
  const change =
    (surface: NestedSurface) =>
    (open: boolean): void => {
      dispatch({ surface, open });
    };
  return (
    <div
      testId="nested-overlay-probe"
      style={{
        width: window.width,
        height: window.height,
        position: "relative",
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 720,
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.lg,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Three shipped surfaces, nested: one Escape dismisses one of them.
        </text>
        <Pressable
          testId={NESTED_OPENER}
          onClick={() => dispatch({ surface: "dialog", open: true })}
        >
          <text
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            Open dialog
          </text>
        </Pressable>
        <Dialog open={flow.open.dialog} onOpenChange={change("dialog")}>
          <DialogContent testId={NESTED_DIALOG} label="Nested overlays">
            <DialogHeader>
              <DialogTitle>Nested overlays</DialogTitle>
              <DialogDescription>
                A popover inside a dialog, and a menu inside that.
              </DialogDescription>
            </DialogHeader>
            {/* A press target inside the dialog and outside both floating
                surfaces: the pointer half's "outside" press lands here. */}
            <div
              testId={NESTED_OUTSIDE}
              style={{ height: 32, backgroundColor: theme.colors.muted }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.lg,
              }}
            >
              <Popover
                open={flow.open.popover}
                onOpenChange={change("popover")}
              >
                <PopoverTrigger testId={NESTED_POPOVER_TRIGGER}>
                  Filters
                </PopoverTrigger>
                <PopoverContent testId={NESTED_POPOVER_PANEL}>
                  <DropdownMenu
                    open={flow.open.menu}
                    onOpenChange={change("menu")}
                  >
                    <DropdownMenuTrigger testId={NESTED_MENU_TRIGGER}>
                      Sort
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      testId={NESTED_MENU_PANEL}
                      label="Sort order"
                    >
                      <DropdownMenuItem testId={NESTED_MENU_ITEM}>
                        Newest first
                      </DropdownMenuItem>
                      <DropdownMenuItem>Oldest first</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </PopoverContent>
              </Popover>
            </div>
          </DialogContent>
        </Dialog>
        <Readout testId={NESTED_READOUT}>{nestedReadout(flow)}</Readout>
      </div>
    </div>
  );
};

/**
 * Drives one Escape at a time through a three-level overlay stack, and reads
 * which surface it landed on.
 *
 * The claim under test is the one `internal/dismiss-layer.ts` is written for: a
 * keystroke bubbles through every enclosing surface, and only the deepest one
 * may consume it. A missing guard closes the menu **and** the popover **and**
 * the dialog on one Escape, which no single-surface probe can see. The stack is
 * three shipped components, so the measurement is also the one a consumer
 * composition gets.
 *
 * The pointer half of the same rule is **not** asserted here: measured on
 * 0.11.0 (2026-10-22), one press outside the popover and the menu raised both
 * surfaces' `onMouseDownOutside`, and the app saw the menu closed **twice**
 * (`closes=1,1,3`, `dismissed=menu,popover,dialog,menu,menu`) because the guard
 * keys the gesture on the payload's identity and the runtime builds one payload
 * per handler. That is a defect in the component package, filed as an interlock
 * row in `TODO.md`; this probe will carry the press checks when it is fixed.
 */
const nestedOverlaySteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(NESTED_OPENER);
    yield* ctx.expectEqual(
      "the stack starts closed",
      yield* ctx.host.text(NESTED_READOUT),
      nestedReadout(initialNestedFlow),
    );
    yield* ctx.expectEqual(
      "a closed stack paints no dialog",
      yield* settleGone(ctx, NESTED_DIALOG),
      true,
    );

    /** Focuses an app control, presses it and waits for `painted` to arrive. */
    const press = (testId: string, painted: string) =>
      Effect.gen(function* () {
        yield* ctx.host.focusElement(testId);
        yield* ctx.host.click(testId);
        yield* settlePainted(ctx, painted);
      });

    yield* press(NESTED_OPENER, NESTED_DIALOG);
    yield* ctx.expectEqual(
      "the opener paints the dialog",
      (yield* paintedBox(ctx, NESTED_DIALOG)).height > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the dialog alone is painted",
      [
        yield* settleGone(ctx, NESTED_POPOVER_PANEL),
        yield* settleGone(ctx, NESTED_MENU_PANEL),
      ].every(Boolean),
      true,
    );
    yield* ctx.expectEqual(
      "focus enters the dialog surface",
      yield* focusedAfterPaint(ctx),
      NESTED_DIALOG,
    );
    yield* ctx.expectEqual(
      "the open reaches the fixture",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=open popover=closed menu=closed opens=1,0,0 closes=0,0,0 dismissed=none",
    );

    yield* press(NESTED_POPOVER_TRIGGER, NESTED_POPOVER_PANEL);
    yield* ctx.expectEqual(
      "the popover opens inside the dialog without dismissing it",
      [
        (yield* paintedBox(ctx, NESTED_DIALOG)).height > 0,
        (yield* paintedBox(ctx, NESTED_POPOVER_PANEL)).height > 0,
        yield* settleGone(ctx, NESTED_MENU_PANEL),
      ].every(Boolean),
      true,
    );
    yield* ctx.expectEqual(
      "focus enters the popover surface",
      yield* focusedAfterPaint(ctx),
      NESTED_POPOVER_PANEL,
    );

    yield* press(NESTED_MENU_TRIGGER, NESTED_MENU_PANEL);
    yield* ctx.expectEqual(
      "the menu opens inside the popover without dismissing either surface",
      [
        (yield* paintedBox(ctx, NESTED_DIALOG)).height > 0,
        (yield* paintedBox(ctx, NESTED_POPOVER_PANEL)).height > 0,
        (yield* paintedBox(ctx, NESTED_MENU_PANEL)).height > 0,
      ].every(Boolean),
      true,
    );
    // Measured, not assumed: a standalone menu leaves a pointer open's focus on
    // its trigger, while this one's surface takes it — so one arrow is what a
    // reader needs before Enter can activate a row.
    yield* ctx.expectEqual(
      "a pointer-opened menu nested in a popover takes the surface's focus",
      yield* focusedAfterPaint(ctx),
      NESTED_MENU_PANEL,
    );
    yield* ctx.host.key("down");
    yield* ctx.expectEqual(
      "one arrow reaches the menu's first row",
      yield* focusedAfterPaint(ctx),
      NESTED_MENU_ITEM,
    );
    yield* ctx.expectEqual(
      "the three opens reached the fixture",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=open popover=open menu=open opens=1,1,1 closes=0,0,0 dismissed=none",
    );
    yield* ctx.host.capture("nested-open");

    // One Escape, one surface: the keystroke reaches all three handlers, and
    // only the deepest layer may consume it.
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape unpaints the menu only",
      [
        yield* settleGone(ctx, NESTED_MENU_PANEL),
        (yield* paintedBox(ctx, NESTED_POPOVER_PANEL)).height > 0,
        (yield* paintedBox(ctx, NESTED_DIALOG)).height > 0,
      ].every(Boolean),
      true,
    );
    yield* ctx.expectEqual(
      "the same Escape left the popover and the dialog open",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=open popover=open menu=closed opens=1,1,1 closes=0,0,1 dismissed=menu",
    );
    yield* ctx.expectEqual(
      "dismissing the menu returns focus to its trigger",
      yield* focusedAfterPaint(ctx),
      NESTED_MENU_TRIGGER,
    );
    yield* ctx.host.capture("nested-menu-dismissed");

    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "the second Escape unpaints the popover only",
      [
        yield* settleGone(ctx, NESTED_POPOVER_PANEL),
        (yield* paintedBox(ctx, NESTED_DIALOG)).height > 0,
      ].every(Boolean),
      true,
    );
    yield* ctx.expectEqual(
      "the second Escape left the dialog open",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=open popover=closed menu=closed opens=1,1,1 closes=0,1,1 dismissed=menu,popover",
    );
    yield* ctx.expectEqual(
      "dismissing the popover returns focus to its trigger",
      yield* focusedAfterPaint(ctx),
      NESTED_POPOVER_TRIGGER,
    );

    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "the third Escape dismisses the dialog",
      yield* settleGone(ctx, NESTED_DIALOG),
      true,
    );
    yield* ctx.expectEqual(
      "the stack dismissed outside-in",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=closed popover=closed menu=closed opens=1,1,1 closes=1,1,1 dismissed=menu,popover,dialog",
    );
    yield* ctx.expectEqual(
      "the dialog returns focus to the app's opener",
      yield* focusedAfterPaint(ctx),
      NESTED_OPENER,
    );
    yield* ctx.host.capture("nested-dismissed");

    // The pointer half. A press outside the floating surfaces raises **every**
    // enclosing surface's `onMouseDownOutside`, and the stack must still dismiss
    // exactly one of them: a gesture guard, not a handler guard.
    yield* press(NESTED_OPENER, NESTED_DIALOG);
    yield* press(NESTED_POPOVER_TRIGGER, NESTED_POPOVER_PANEL);
    yield* press(NESTED_MENU_TRIGGER, NESTED_MENU_PANEL);
    yield* ctx.expectEqual(
      "the stack opens again for the pointer half",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=open popover=open menu=open opens=2,2,2 closes=1,1,1 dismissed=menu,popover,dialog",
    );

    // One press, outside the popover and the menu: only the menu may close.
    yield* ctx.host.click(NESTED_OUTSIDE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "one outside press closes one surface, not every handler it reaches",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=open popover=open menu=closed opens=2,2,2 closes=1,1,2 dismissed=menu,popover,dialog,menu",
    );
    yield* ctx.expectEqual(
      "the first outside press left the popover and the dialog painted",
      [
        yield* settleGone(ctx, NESTED_MENU_PANEL),
        (yield* paintedBox(ctx, NESTED_POPOVER_PANEL)).height > 0,
        (yield* paintedBox(ctx, NESTED_DIALOG)).height > 0,
      ].every(Boolean),
      true,
    );

    // A second press is a new gesture, so the next surface goes.
    yield* ctx.host.click(NESTED_OUTSIDE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a second press closes the popover and leaves the dialog open",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=open popover=closed menu=closed opens=2,2,2 closes=1,2,2 dismissed=menu,popover,dialog,menu,popover",
    );
    yield* ctx.expectEqual(
      "the second outside press left the dialog painted",
      [
        yield* settleGone(ctx, NESTED_POPOVER_PANEL),
        (yield* paintedBox(ctx, NESTED_DIALOG)).height > 0,
      ].every(Boolean),
      true,
    );

    // A press outside the dialog closes the last surface; the veil is what the
    // pointer lands on, which is exactly the dialog's own outside press.
    yield* ctx.host.click(NESTED_OPENER);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press outside the dialog dismisses the last surface",
      yield* settleGone(ctx, NESTED_DIALOG),
      true,
    );
    yield* ctx.expectEqual(
      "the pointer dismissed the stack outside-in",
      yield* ctx.host.text(NESTED_READOUT),
      "dialog=closed popover=closed menu=closed opens=2,2,2 closes=2,2,2 dismissed=menu,popover,dialog,menu,popover,dialog",
    );
    yield* ctx.expectEqual(
      "the dialog returns focus to the app's opener after a press",
      yield* focusedAfterPaint(ctx),
      NESTED_OPENER,
    );
    yield* ctx.host.capture("nested-pointer-dismissed");
  });

/**
 * The editable-code composition: one source painted twice, the left box under a
 * transparent field and the right with no field at all.
 *
 * The pair is the instrument. Both boxes are the same size with the same code,
 * the same metrics and the same fill, so a pixel-for-pixel comparison of the two
 * regions reports exactly what the field painted: nothing while its ink is
 * transparent, its own glyphs while the control's ink is on. Nothing else in the
 * window is inside either region, and the readout prints counts rather than the
 * value, so the probe's own text cannot be mistaken for the code's.
 */
const EditorOverlayProbe = (): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const [value, setValue] = useState(OVERLAY_SOURCE);
  const [ink, setInk] = useState<OverlayInk>("transparent");
  // A text field's caret is drawn for an active window; automation drives a
  // window that may never have taken the OS focus, so the probe asks for it.
  useLayoutEffect(() => {
    renderer?.activateWindow?.();
  }, [renderer]);
  const box: StyleDesc = {
    width: OVERLAY_FRAME.width,
    height: OVERLAY_FRAME.height,
    position: "relative",
    overflow: "hidden",
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
  };
  const stack = (code: string, testId: string): ReactNode => (
    <code
      testId={testId}
      code={code}
      style={{
        ...overlayCodeStyle(theme),
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
  return (
    <div
      testId="editor-overlay-probe"
      style={{
        width: OVERLAY_PAGE.width,
        height: OVERLAY_PAGE.height,
        padding: OVERLAY_GAP,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: OVERLAY_GAP,
      }}
    >
      <Toolbar>
        <Pressable
          testId="overlay-ink-visible"
          onClick={() => setInk("visible")}
        >
          <text style={{ color: theme.colors.foreground }}>Show the ink</text>
        </Pressable>
        <Pressable
          testId="overlay-ink-clear"
          onClick={() => setInk("transparent")}
        >
          <text style={{ color: theme.colors.foreground }}>Hide it</text>
        </Pressable>
        {/* A focus sink: a press here takes the focus off the field, which is
            what a capture of the resting overlay needs. */}
        <Pressable testId="overlay-neutral" onClick={() => undefined}>
          <text style={{ color: theme.colors.foreground }}>Focus here</text>
        </Pressable>
      </Toolbar>
      <div style={{ display: "flex", flexDirection: "row", gap: OVERLAY_GAP }}>
        <div testId="overlay-editor" style={box}>
          {stack(value, "overlay-code")}
          <textarea
            testId="overlay-input"
            value={value}
            onChange={(event) => setValue(event.value ?? "")}
            style={{
              ...overlayFieldStyle(theme, ink),
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
        <div testId="overlay-reference" style={box}>
          {stack(OVERLAY_SOURCE, "overlay-reference-code")}
        </div>
      </div>
      {/* A plain, opaque field: the control that shows the caret reading is the
          runtime's, not this composition's. */}
      <div
        testId="caret-box"
        style={{ width: 200, height: 60, backgroundColor: theme.colors.card }}
      >
        <textarea
          testId="caret-input"
          value="caretfield"
          style={{
            width: 200,
            height: 60,
            padding: 8,
            ...overlayMetrics(theme),
            backgroundColor: theme.colors.input,
            color: theme.colors.inputForeground,
          }}
        />
      </div>
      <Readout testId="overlay-readout">{overlayReadout(value, ink)}</Readout>
    </div>
  );
};

/** The logical box `testId` paints, failing by name when it paints none. */
const paintedRegion = (
  ctx: Smoke.AsyncSmokeContext,
  testId: string,
  scale: number,
): Effect.Effect<
  Pixels.PixelRegion,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError
> =>
  Effect.gen(function* () {
    const box = yield* ctx.expectSome(
      `the runtime paints ${testId}`,
      Option.fromNullishOr(yield* ctx.host.bounds(testId)),
    );
    return overlayRegion(box, scale);
  });

/** One region of a capture, failing (rather than measuring nothing) when absent. */
const cropped = (
  frame: Pixels.Pixels,
  region: Pixels.PixelRegion,
  label: string,
): Effect.Effect<Pixels.Pixels, Smoke.SmokeAssertionError> =>
  Option.match(Option.fromNullishOr(Pixels.crop(frame, region)), {
    onSome: Effect.succeed,
    onNone: () =>
      Effect.fail(
        new Smoke.SmokeAssertionError({
          label: `the ${label} box is inside the capture`,
          expected: "a region the capture covers",
          actual: "no overlap",
        }),
      ),
  });

/** The two editor boxes of one capture, and how many pixels the field added. */
const editorPaint = (
  ctx: Smoke.AsyncSmokeContext,
  name: string,
  regions: EditorRegions,
): Effect.Effect<number, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    const frame = yield* ctx.host.pixels(name);
    const overlay = yield* cropped(frame, regions.overlay, "overlay");
    const reference = yield* cropped(frame, regions.reference, "reference");
    return yield* ctx.expectSome(
      "the two editor boxes are the same box",
      Option.fromNullishOr(Pixels.countDifferingPixels(overlay, reference)),
    );
  });

/** The device-scaled regions the probe compares, read once from the first frame. */
interface EditorRegions {
  readonly overlay: Pixels.PixelRegion;
  readonly reference: Pixels.PixelRegion;
  readonly caret: Pixels.PixelRegion;
}

const editorOverlaySteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor("overlay-editor");
    yield* ctx.host.capture("editor-overlay-transparent");
    const first = yield* ctx.host.pixels("editor-overlay-transparent");
    const scale = yield* ctx.expectSome(
      "the capture is the window's box at one scale",
      captureScale(first, yield* ctx.host.windowSize()),
    );
    const regions: EditorRegions = {
      overlay: yield* paintedRegion(ctx, "overlay-editor", scale),
      reference: yield* paintedRegion(ctx, "overlay-reference", scale),
      caret: yield* paintedRegion(ctx, "caret-box", scale),
    };

    /**
     * Waits for the readout to name the field's ink before a capture.
     *
     * The ink is React state, so a screenshot taken on the click's own frame
     * shows the previous state — the first run of this probe read the control as
     * an unpainted field for exactly that reason.
     */
    const settleInk = (ink: OverlayInk) =>
      Effect.gen(function* () {
        const text = yield* settleUntil(
          ctx.host.text("overlay-readout"),
          (value) => value.includes(`ink=${ink}`),
        );
        yield* ctx.expectContains(
          `the readout names the ${ink} state`,
          text,
          `ink=${ink}`,
        );
      });

    // 1. At rest the field holds the same source the reference paints, and its
    //    ink is transparent: every pixel of the comparison must be the code's.
    yield* settleInk("transparent");
    yield* ctx.expectEqual(
      "a transparent field paints nothing over the code beneath it",
      yield* editorPaint(ctx, "editor-overlay-transparent", regions),
      0,
    );
    const codeInk = yield* themeColour(ctx, "foreground");
    yield* ctx.expectEqual(
      "the code layer is what paints through the field",
      Pixels.countColour(
        yield* cropped(first, regions.overlay, "overlay"),
        codeInk,
      ) > 0,
      true,
    );

    // 2. The negative control: the same comparison with the field's own ink on.
    //    A field that painted nothing at all would make check 1 pass trivially,
    //    so this is what makes it a measurement.
    yield* ctx.host.click("overlay-ink-visible");
    yield* settleInk("visible");
    yield* ctx.host.capture("editor-overlay-control");
    yield* ctx.expectEqual(
      "the comparison sees the field's glyphs when its ink is on",
      (yield* editorPaint(ctx, "editor-overlay-control", regions)) > 0,
      true,
    );
    yield* ctx.host.click("overlay-ink-clear");
    yield* settleInk("transparent");
    yield* ctx.host.capture("editor-overlay-cleared");
    yield* ctx.expectEqual(
      "hiding the ink again leaves the code alone",
      yield* editorPaint(ctx, "editor-overlay-cleared", regions),
      0,
    );

    // 3. The caret. A field with no caret is not an editor, so the claim is
    //    measured on a plain opaque field as well as the transparent one: the
    //    ink is on, the glyphs are therefore identical on both sides of the
    //    focus, and five frames are sampled because a caret blinks.
    yield* ctx.host.capture("editor-overlay-caret-before");
    const caretInk = yield* themeColour(ctx, "inputForeground");
    const caretBefore = yield* cropped(
      yield* ctx.host.pixels("editor-overlay-caret-before"),
      regions.caret,
      "caret",
    );
    yield* ctx.expectEqual(
      "the caret control paints its own text",
      Pixels.countColour(caretBefore, caretInk) > 0,
      true,
    );
    yield* ctx.host.click("caret-input");
    yield* ctx.expectEqual(
      "the caret control takes the focus",
      yield* focusedAfterPaint(ctx),
      "caret-input",
    );
    yield* ctx.host.key("left");
    const caretFrames = yield* Effect.forEach(
      Arr.range(1, 5),
      (n) =>
        Effect.gen(function* () {
          yield* Effect.sleep(Duration.millis(120));
          yield* ctx.host.capture(`editor-overlay-caret-${n}`);
          return yield* ctx.expectSome(
            "the caret capture is the box it names",
            Option.fromNullishOr(
              Pixels.countDifferingPixels(
                caretBefore,
                yield* cropped(
                  yield* ctx.host.pixels(`editor-overlay-caret-${n}`),
                  regions.caret,
                  "caret",
                ),
              ),
            ),
          );
        }),
      { concurrency: 1 },
    );
    yield* ctx.expectEqual(
      "a focused field paints no caret in any of five frames",
      Arr.reduce(caretFrames, 0, (most, count) => Math.max(most, count)),
      0,
    );

    // 4. Typing lands in the app's state; with the field's ink still transparent,
    //    the overlay's code layer is the only thing that can repaint to the edit.
    yield* ctx.host.focusElement("overlay-input");
    yield* ctx.expectEqual(
      "the focus enters the transparent field",
      yield* focusedAfterPaint(ctx),
      "overlay-input",
    );
    yield* ctx.host.key("z");
    yield* ctx.host.key("z");
    yield* ctx.expectEqual(
      "typed text reaches the app through the transparent field",
      yield* settleUntil(ctx.host.text("overlay-readout"), (value) =>
        value.includes(
          `chars=${Str.length(OVERLAY_SOURCE) + Str.length(OVERLAY_MARK)} `,
        ),
      ),
      `ink=transparent chars=${
        Str.length(OVERLAY_SOURCE) + Str.length(OVERLAY_MARK)
      } lines=6`,
    );
    yield* ctx.host.click("overlay-neutral");
    yield* settleUntil(focusedId(ctx), (id) => id === "overlay-neutral");
    yield* ctx.host.capture("editor-overlay-edited");
    yield* ctx.expectEqual(
      "the code layer repaints to the edited value",
      (yield* editorPaint(ctx, "editor-overlay-edited", regions)) > 0,
      true,
    );

    // 5. A file longer than the frame: the offset an app would mirror into the
    //    code view. The field is grown past its own box with real keyboard input,
    //    then asked where its content sits.
    yield* ctx.host.focusElement("overlay-input");
    yield* Effect.forEach(
      Arr.range(1, OVERLAY_ENTER_COUNT),
      () => ctx.host.key("enter"),
      { concurrency: 1 },
    );
    yield* ctx.host.capture("editor-overlay-scrolled");
    const offset = yield* ctx.host.scrollOffset("overlay-input");
    yield* ctx.expectEqual(
      "the field reports no scroll offset of its own",
      Option.match(Option.fromNullishOr(offset), {
        onNone: () => "none",
        onSome: (value) => `y=${value.y}`,
      }),
      "none",
    );
  });

/**
 * `multi-pane-editor` — two files in one split, and the text session between
 * them.
 *
 * Tier 4's **multi-pane editing layouts** row is composition, and the
 * composition has one interaction that nothing had measured: a window has a
 * single platform text session, so a press must move it from one pane's field to
 * the other without either buffer changing, and the splitter between them must
 * resize the panes without taking the session away. The probe drives exactly
 * that: type in one pane, press the other and type there, drag the divider (the
 * shipped `SplitPane`, whose capture contract `split-pane-lifecycle` already
 * measures), then close and reopen a pane. The closed pane keeps its buffer in
 * the app, which is what makes a dock's `close` a layout change rather than data
 * loss.
 */
const MultiPaneEditorProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [left, setLeft] = useState<string>(MULTI_PANE_VALUES.left);
  const [right, setRight] = useState<string>(MULTI_PANE_VALUES.right);
  const [open, setOpen] = useState<PaneOpen>("both");
  const [width, setWidth] = useState<number>(MULTI_PANE.initial);

  const editor = (
    side: PaneSide,
    value: string,
    setValue: (next: string) => void,
  ): ReactNode => (
    <div
      testId={
        side === "left" ? MULTI_PANE_IDS.leftPane : MULTI_PANE_IDS.rightPane
      }
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        backgroundColor: theme.colors.card,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          paddingTop: theme.spacing.xs,
          paddingBottom: theme.spacing.xs,
          paddingLeft: theme.spacing.sm,
          borderBottomWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
        }}
      >
        <text
          testId={MULTI_PANE_IDS.title(side)}
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {MULTI_PANE_FILES[side]}
        </text>
      </div>
      <textarea
        testId={MULTI_PANE_IDS.input(side)}
        value={value}
        onChange={(event) => setValue(event.value ?? "")}
        style={{
          flexGrow: 1,
          minHeight: 0,
          padding: theme.spacing.sm,
          ...textStyle(theme, "code"),
          backgroundColor: theme.colors.input,
          color: theme.colors.inputForeground,
        }}
      />
    </div>
  );

  return (
    <div
      testId={MULTI_PANE_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Two files in one split: typing stays in the pane holding the session,
        and the splitter resizes them without touching either buffer.
      </text>
      <Toolbar>
        <Pressable
          testId={MULTI_PANE_IDS.close}
          onClick={() => setOpen("left")}
        >
          close right
        </Pressable>
        <Pressable
          testId={MULTI_PANE_IDS.reopen}
          onClick={() => setOpen("both")}
        >
          reopen right
        </Pressable>
      </Toolbar>
      <div
        testId={MULTI_PANE_IDS.row}
        style={{ height: 300, width: "100%", display: "flex" }}
      >
        {open === "both" ? (
          <SplitPane
            id="mp"
            size={width}
            initial={MULTI_PANE.initial}
            min={MULTI_PANE.min}
            max={MULTI_PANE.max}
            onResize={setWidth}
            primary={editor("left", left, setLeft)}
            secondary={editor("right", right, setRight)}
          />
        ) : (
          editor("left", left, setLeft)
        )}
      </div>
      <Readout testId={MULTI_PANE_IDS.readout}>
        {multiPaneReadout(left, right, open, width)}
      </Readout>
    </div>
  );
};

const multiPaneSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(MULTI_PANE_IDS.row);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(MULTI_PANE_IDS.readout);
    const leftInput = MULTI_PANE_IDS.input("left");
    const rightInput = MULTI_PANE_IDS.input("right");
    const rightPanePainted = () =>
      Effect.map(ctx.host.bounds(MULTI_PANE_IDS.rightPane), (bounds) =>
        Option.isSome(Option.fromNullishOr(bounds)),
      );

    // 1. Both panes paint, side by side, and the divider is the whole gap.
    yield* ctx.expectEqual(
      "the layout opens with both buffers and the initial split",
      yield* readout(),
      multiPaneReadout(
        MULTI_PANE_VALUES.left,
        MULTI_PANE_VALUES.right,
        "both",
        MULTI_PANE.initial,
      ),
    );
    const row = yield* paintedBox(ctx, MULTI_PANE_IDS.row);
    const leftPane = yield* paintedBox(ctx, MULTI_PANE_IDS.leftPane);
    const divider = yield* paintedBox(ctx, "mp-divider");
    const rightPane = yield* paintedBox(ctx, MULTI_PANE_IDS.rightPane);
    const start = paneWidths(row.width, MULTI_PANE.initial, "both");
    yield* ctx.expectNear(
      "the left pane paints the initial width",
      leftPane.width,
      start.left,
      1,
    );
    yield* ctx.expectNear(
      "the splitter sits on the left pane's right edge",
      divider.x,
      leftPane.x + leftPane.width,
      1,
    );
    yield* ctx.expectNear(
      "the right pane takes what the split leaves",
      rightPane.width,
      start.right,
      1,
    );
    yield* ctx.expectNear(
      "both panes and the divider fill the row",
      leftPane.width + divider.width + rightPane.width,
      row.width,
      1,
    );

    // 2. A press enters one pane's field, and typing reaches only that buffer.
    yield* ctx.host.click(leftInput);
    yield* ctx.expectEqual(
      "a press enters the left pane's field",
      yield* focusedAfterPaint(ctx),
      leftInput,
    );
    yield* ctx.host.key("a");
    yield* Effect.sleep(SETTLE);
    const leftTyped = `${MULTI_PANE_VALUES.left}a`;
    yield* ctx.expectEqual(
      "typing reaches the left pane and leaves the right buffer alone",
      yield* readout(),
      multiPaneReadout(
        leftTyped,
        MULTI_PANE_VALUES.right,
        "both",
        MULTI_PANE.initial,
      ),
    );

    // 3. A press in the other pane moves the one text session.
    yield* ctx.host.click(rightInput);
    yield* ctx.expectEqual(
      "a press moves the text session to the right pane",
      yield* focusedAfterPaint(ctx),
      rightInput,
    );
    yield* ctx.host.key("b");
    yield* Effect.sleep(SETTLE);
    const rightTyped = `${MULTI_PANE_VALUES.right}b`;
    yield* ctx.expectEqual(
      "typing follows the session: the right buffer changed, the left did not",
      yield* readout(),
      multiPaneReadout(leftTyped, rightTyped, "both", MULTI_PANE.initial),
    );

    // 4. The splitter resizes the panes, and neither buffer nor the session moves.
    const dragged = dragWidth(MULTI_PANE.initial, 60);
    yield* ctx.host.drag("mp-divider", 60, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a splitter drag resizes the pane and keeps both buffers",
      yield* readout(),
      multiPaneReadout(leftTyped, rightTyped, "both", dragged),
    );
    yield* ctx.expectNear(
      "the painted left pane follows the drag",
      (yield* paintedBox(ctx, MULTI_PANE_IDS.leftPane)).width,
      dragged,
      1,
    );
    yield* ctx.expectEqual(
      "the drag leaves the text session where the reader left it",
      yield* focusedAfterPaint(ctx),
      rightInput,
    );
    yield* ctx.host.key("c");
    yield* Effect.sleep(SETTLE);
    const rightResized = `${rightTyped}c`;
    yield* ctx.expectEqual(
      "typing after the drag still reaches the pane that held the session",
      yield* readout(),
      multiPaneReadout(leftTyped, rightResized, "both", dragged),
    );

    // 5. Both bounds clamp, and the other editor stays painted at the widest one.
    yield* ctx.host.drag("mp-divider", 200, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag past the maximum stops at the pane's bound",
      yield* readout(),
      multiPaneReadout(leftTyped, rightResized, "both", MULTI_PANE.max),
    );
    yield* ctx.expectNear(
      "the widest pane still leaves the right editor painted",
      (yield* paintedBox(ctx, MULTI_PANE_IDS.rightPane)).width,
      paneWidths(row.width, MULTI_PANE.max, "both").right,
      1,
    );
    yield* ctx.host.drag("mp-divider", -260, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag past the minimum stops at the pane's bound",
      yield* readout(),
      multiPaneReadout(leftTyped, rightResized, "both", MULTI_PANE.min),
    );
    yield* ctx.host.capture("multi-pane-split");

    // 6. Closing a pane is a layout change: its buffer stays in the app and the
    //    survivor takes the row.
    yield* ctx.host.click(MULTI_PANE_IDS.close);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a closed pane keeps its buffer",
      yield* readout(),
      multiPaneReadout(leftTyped, rightResized, "left", MULTI_PANE.min),
    );
    yield* ctx.expectNear(
      "the surviving pane takes the whole row",
      (yield* paintedBox(ctx, MULTI_PANE_IDS.leftPane)).width,
      row.width,
      1,
    );
    yield* ctx.expectEqual(
      "the closed pane paints nothing",
      yield* rightPanePainted(),
      false,
    );
    yield* ctx.host.capture("multi-pane-closed");

    // 7. Reopening restores both panes at the width they held, with both buffers.
    yield* ctx.host.click(MULTI_PANE_IDS.reopen);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "reopening restores both panes at the split they held",
      yield* readout(),
      multiPaneReadout(leftTyped, rightResized, "both", MULTI_PANE.min),
    );
    yield* ctx.expectNear(
      "the restored right pane paints its share of the row",
      (yield* paintedBox(ctx, MULTI_PANE_IDS.rightPane)).width,
      paneWidths(row.width, MULTI_PANE.min, "both").right,
      1,
    );
    yield* ctx.host.click(rightInput);
    yield* ctx.host.key("d");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the restored field takes the text session again",
      yield* readout(),
      multiPaneReadout(leftTyped, `${rightResized}d`, "both", MULTI_PANE.min),
    );
    yield* ctx.host.capture("multi-pane-reopened");
  });

/**
 * `table-filter-lifecycle` — the rules around a grid's filter control.
 *
 * Tier 3's **filtering controls** row is `div` + `<input>`, so the runtime cannot
 * refuse the control; what a data grid has to get right is what happens to the
 * rows, the selection and the focus while the set changes under them. The probe
 * types a literal query into a field above 120 rows, watches the painted set
 * narrow, and measures the three decisions a grid owns: a selection survives only
 * while its record does, the field keeps the text session while rows come and
 * go, and a new set opens at the top. Arrow steps then walk the filtered order
 * (`Item 1` → `Item 10`), not the numeric index, and a clear keeps a selection
 * the full set still holds.
 */
const TableFilterProbe = (): ReactNode => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const field = useRef<PublicInstance | null>(null);
  const rowIds = useRef(HashMap.empty<number, number>());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Option.Option<number>>(
    Option.none(),
  );
  const [offset, setOffset] = useState(0);
  const rows = filterRows(query);

  /** Applies a query: the selection follows the set, and the new set opens at the top. */
  const apply = (next: string) => {
    setQuery(next);
    setSelected((current) => keepSelection(current, filterRows(next)));
    const elementId = list.current?.id;
    if (elementId != null) renderer?.scrollTo?.(elementId, 0, 0);
    setOffset(0);
  };

  const clear = () => {
    apply("");
    const elementId = field.current?.id;
    if (elementId != null) renderer?.focusElement?.(elementId);
  };

  const onRowKey = (event: EventPayload) => {
    const delta = event.key === "down" ? 1 : event.key === "up" ? -1 : 0;
    if (delta === 0) return;
    const next = stepRow(rows, selected, delta);
    setSelected(next);
    Option.match(next, {
      onNone: () => {},
      onSome: (index) =>
        Option.match(HashMap.get(rowIds.current, index), {
          onNone: () => {},
          onSome: (elementId) => renderer?.focusElement?.(elementId),
        }),
    });
  };

  /** Registers a row's native id, so a step can move the real focus to it. */
  const registerRow = (index: number) => (instance: PublicInstance | null) => {
    rowIds.current =
      instance === null
        ? HashMap.remove(rowIds.current, index)
        : HashMap.set(rowIds.current, index, instance.id);
  };

  return (
    <div
      testId={FILTER_IDS.probe}
      style={{
        width: 560,
        height: 460,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A literal filter over 120 rows: the selection follows the set, and the
        filtered order is the arrow order.
      </text>
      <Toolbar>
        <input
          testId={FILTER_IDS.field}
          ref={field}
          value={query}
          onChange={(event) => apply(event.value ?? "")}
          style={{
            width: 200,
            padding: theme.spacing.sm,
            ...textStyle(theme, "body"),
            backgroundColor: theme.colors.input,
            color: theme.colors.inputForeground,
            borderWidth: theme.borderWidth.thin,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.sm,
          }}
        />
        <Pressable testId={FILTER_IDS.clear} onClick={clear}>
          clear
        </Pressable>
      </Toolbar>
      <div
        testId={FILTER_IDS.list}
        ref={list}
        onScrollChange={(event) => setOffset(event.scrollY ?? 0)}
        style={{
          height: FILTER_VIEWPORT,
          overflowY: "scroll",
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(rows, (index) => (
          <div
            key={index}
            testId={FILTER_IDS.row(index)}
            ref={registerRow(index)}
            tabIndex={0}
            role="option"
            aria-selected={Option.contains(selected, index)}
            onClick={() => setSelected(Option.some(index))}
            onKeyDown={onRowKey}
            style={{
              display: "flex",
              alignItems: "center",
              height: FILTER_ROW_HEIGHT,
              paddingLeft: theme.spacing.sm,
              flexShrink: 0,
              backgroundColor: Option.contains(selected, index)
                ? theme.colors.selected
                : theme.colors.card,
              borderBottomWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              ...keyboardFocusRing(theme),
            }}
          >
            <text
              style={{
                ...textStyle(theme, "body"),
                color: Option.contains(selected, index)
                  ? theme.colors.selectedForeground
                  : theme.colors.foreground,
              }}
            >
              {rowLabel(index)}
            </text>
          </div>
        ))}
        {Arr.match(rows, {
          onEmpty: () => (
            <div
              testId={FILTER_IDS.empty}
              style={{
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.muted,
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: theme.colors.mutedForeground,
                }}
              >
                No rows match
              </text>
            </div>
          ),
          onNonEmpty: () => null,
        })}
      </div>
      <Readout testId={FILTER_IDS.readout}>
        {filterReadout(query, rows, selected, offset)}
      </Readout>
    </div>
  );
};

const tableFilterSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(FILTER_IDS.list);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(FILTER_IDS.readout);
    const everyRow = filterRows("");

    // 1. The table opens unfiltered, at its own row height.
    yield* ctx.expectEqual(
      "the grid opens with every row and no filter",
      yield* readout(),
      filterReadout("", everyRow, Option.none(), 0),
    );
    yield* paintedBox(ctx, FILTER_IDS.list);
    yield* ctx.expectNear(
      "a row paints at the height the grid declares",
      (yield* paintedBox(ctx, FILTER_IDS.row(0))).height,
      FILTER_ROW_HEIGHT,
      1,
    );

    // 2. A press selects the record and focuses the row it hit.
    yield* ctx.host.click(FILTER_IDS.row(1));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press selects the record it hit",
      yield* readout(),
      filterReadout("", everyRow, Option.some(1), 0),
    );
    yield* ctx.expectEqual(
      "the pressed row holds the focus, so the next key reaches it",
      yield* focusedAfterPaint(ctx),
      FILTER_IDS.row(1),
    );

    // 3. Typing filters; the field keeps the session and a visible selection stays.
    yield* ctx.host.click(FILTER_IDS.field);
    yield* ctx.host.key("1");
    yield* Effect.sleep(SETTLE);
    const ones = filterRows("1");
    yield* ctx.expectEqual(
      "typing narrows the painted rows and keeps a selection the set still holds",
      yield* readout(),
      filterReadout("1", ones, Option.some(1), 0),
    );
    yield* ctx.expectEqual(
      "the field keeps the text session while the rows change under it",
      yield* focusedAfterPaint(ctx),
      FILTER_IDS.field,
    );

    // 4. A selection the narrower set hides is cleared, not kept invisible.
    yield* ctx.host.key("2");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a selection the narrower set hides is cleared",
      yield* readout(),
      filterReadout("12", filterRows("12"), Option.none(), 0),
    );

    // 5. No match is an empty state, and the filtered-out row paints nothing.
    yield* ctx.host.key("z");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a query with no match paints no rows",
      yield* readout(),
      filterReadout("12z", [], Option.none(), 0),
    );
    yield* ctx.expectEqual(
      "no match paints the empty state",
      Option.isSome(
        Option.fromNullishOr(yield* ctx.host.bounds(FILTER_IDS.empty)),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "a filtered-out record's row paints nothing",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds(FILTER_IDS.row(1))),
      ),
      true,
    );

    // 6. Clearing restores the set and parks the session in the field.
    yield* ctx.host.click(FILTER_IDS.clear);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "clearing restores every row",
      yield* readout(),
      filterReadout("", everyRow, Option.none(), 0),
    );
    yield* ctx.expectEqual(
      "clearing parks the text session back in the filter field",
      yield* focusedAfterPaint(ctx),
      FILTER_IDS.field,
    );

    // 7. A new set opens at the top, even when the reader was scrolled away.
    yield* ctx.host.wheel(FILTER_IDS.list, 0, -200);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the wheel scrolls the list",
      yield* readout(),
      "offset=-200",
    );
    yield* ctx.host.key("1");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a filter change opens the new set at the top",
      yield* readout(),
      filterReadout("1", ones, Option.none(), 0),
    );
    yield* ctx.expectEqual(
      "the list itself paints at the top, not only the readout",
      Option.match(
        Option.fromNullishOr(yield* ctx.host.scrollOffset(FILTER_IDS.list)),
        { onNone: () => Number.NaN, onSome: (value) => value.y },
      ),
      0,
    );

    // 8. Arrows walk the filtered order, with the focus and the selection together.
    yield* ctx.host.click(FILTER_IDS.row(1));
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Down steps to the next record in the filtered order, not the numeric one",
      yield* readout(),
      filterReadout("1", ones, Option.some(10), 0),
    );
    yield* ctx.expectEqual(
      "the arrow step moves the focus with the selection",
      yield* focusedAfterPaint(ctx),
      FILTER_IDS.row(10),
    );

    // 9. Clearing keeps a selection the full set still holds.
    yield* ctx.host.click(FILTER_IDS.clear);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "clearing keeps a selection the full set still holds",
      yield* readout(),
      filterReadout("", everyRow, Option.some(10), 0),
    );
    yield* ctx.host.capture("table-filtered");
  });

/**
 * A grid whose columns can be hidden, restored and moved, in a window.
 *
 * Tier 3's **column configuration** row is `grid tracks + a menu`, and what a
 * menu owes its grid is the consequence: the content width follows the visible
 * set, every later column shifts by the hidden one's width, a horizontal offset
 * left past the new end is clamped after the new layout, and the header and its
 * cells read one column list. The rows live in one scroller with the header, so
 * the horizontal pan and the vertical scroll are the runtime's own; the clamp is
 * the app's, because a shrinking scroller keeps the offset it had.
 */
const TableColumnsProbe = (): ReactNode => {
  const theme = useTheme();
  const grid = useRef<PublicInstance | null>(null);
  const [order, setOrder] = useState<ReadonlyArray<ColumnId>>(COLUMN_ORDER);
  const [hidden, setHidden] = useState<ReadonlyArray<ColumnId>>([]);
  const [view, setView] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState(Option.none<number>());
  const visible = visibleColumns(order, hidden);
  const width = contentWidth(visible);

  const toggle = (id: ColumnId): void => {
    setHidden((current) =>
      Arr.contains(current, id)
        ? Arr.filter(current, (column) => column !== id)
        : Arr.append(current, id),
    );
  };

  const headerStyle = (id: ColumnId): StyleDesc => ({
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    width: columnWidth(id),
    height: COLUMN_ROW_HEIGHT,
    paddingLeft: theme.spacing.sm,
    backgroundColor: theme.colors.muted,
    borderRightWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  });

  const cellStyle = (row: number, id: ColumnId): StyleDesc => ({
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    width: columnWidth(id),
    height: COLUMN_ROW_HEIGHT,
    paddingLeft: theme.spacing.sm,
    cursor: "pointer",
    backgroundColor: Option.contains(selected, row)
      ? theme.colors.selected
      : theme.colors.card,
    borderRightWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    ...keyboardFocusRing(theme),
  });

  return (
    <div
      testId={COLUMN_IDS.probe}
      style={{
        width: 560,
        height: 460,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A configurable grid: hiding a column shrinks the content and shifts
        every later column; the grid clamps an offset left past the new end.
      </text>
      <Toolbar>
        {Arr.map(COLUMN_ORDER, (id) => (
          <Pressable
            key={id}
            testId={COLUMN_IDS.hide(id)}
            onClick={() => toggle(id)}
            style={{ padding: theme.spacing.sm }}
          >
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.foreground,
              }}
            >
              {Arr.contains(hidden, id) ? `show ${id}` : `hide ${id}`}
            </text>
          </Pressable>
        ))}
        <Pressable
          testId={COLUMN_IDS.move("owner")}
          onClick={() => setOrder((current) => moveColumn(current, "owner", 1))}
          style={{ padding: theme.spacing.sm }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            move owner
          </text>
        </Pressable>
      </Toolbar>
      <div
        testId={COLUMN_IDS.grid}
        ref={grid}
        onScrollChange={(event) =>
          setView({ x: event.scrollX ?? 0, y: event.scrollY ?? 0 })
        }
        style={{
          width: COLUMN_VIEWPORT_WIDTH,
          height: 240,
          overflowX: "scroll",
          overflowY: "scroll",
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <div style={{ width, display: "flex", flexDirection: "column" }}>
          <div
            role="row"
            style={{ display: "flex", flexDirection: "row", width }}
          >
            {Arr.map(visible, (id) => (
              <div
                key={id}
                testId={COLUMN_IDS.header(id)}
                role="columnheader"
                style={headerStyle(id)}
              >
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.mutedForeground,
                  }}
                >
                  {id}
                </text>
              </div>
            ))}
          </div>
          {Arr.map(COLUMN_ROW_INDEXES, (row) => (
            <div
              key={row}
              role="row"
              aria-selected={Option.contains(selected, row)}
              style={{ display: "flex", flexDirection: "row", width }}
            >
              {Arr.map(visible, (id) => (
                <div
                  key={id}
                  testId={COLUMN_IDS.cell(row, id)}
                  tabIndex={0}
                  role="gridcell"
                  onClick={() => setSelected(Option.some(row))}
                  style={cellStyle(row, id)}
                >
                  <text
                    style={{
                      ...textStyle(theme, "caption"),
                      color: Option.contains(selected, row)
                        ? theme.colors.selectedForeground
                        : theme.colors.foreground,
                    }}
                  >
                    {cellLabel(row, id)}
                  </text>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Readout testId={COLUMN_IDS.readout}>
        {columnsReadout(visible, view, selected)}
      </Readout>
    </div>
  );
};

const tableColumnsSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(COLUMN_IDS.grid);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(COLUMN_IDS.readout);
    const offsetOf = () => ctx.host.scrollOffset(COLUMN_IDS.grid);
    const offsetX = () =>
      Effect.map(offsetOf(), (found) =>
        Option.match(Option.fromNullishOr(found), {
          onNone: () => Number.NaN,
          onSome: (value) => value.x,
        }),
      );
    const offsetY = () =>
      Effect.map(offsetOf(), (found) =>
        Option.match(Option.fromNullishOr(found), {
          onNone: () => Number.NaN,
          onSome: (value) => value.y,
        }),
      );
    const unpainted = (testId: string) =>
      Effect.map(ctx.host.bounds(testId), (found) =>
        Option.isNone(Option.fromNullishOr(found)),
      );

    // 1. Every column opens in its configured order, at the width it defines.
    yield* ctx.expectEqual(
      "the grid opens with every column in its configured order",
      yield* readout(),
      columnsReadout(COLUMN_ORDER, { x: 0, y: 0 }, Option.none()),
    );
    yield* ctx.expectNear(
      "a column paints at the width its definition gives it",
      (yield* paintedBox(ctx, COLUMN_IDS.header("status"))).width,
      columnWidth("status"),
      1,
    );
    const viewport = yield* paintedBox(ctx, COLUMN_IDS.grid);
    const lastColumn = yield* paintedBox(ctx, COLUMN_IDS.header("kind"));
    yield* ctx.expectEqual(
      "the content is wider than the viewport it scrolls in",
      lastColumn.x + lastColumn.width > viewport.x + COLUMN_VIEWPORT_WIDTH,
      true,
    );

    // 2. A press selects a record, and the cell that took it holds the focus.
    yield* ctx.host.click(COLUMN_IDS.cell(3, "name"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press selects the record whose cell it hit",
      yield* readout(),
      columnsReadout(COLUMN_ORDER, { x: 0, y: 0 }, Option.some(3)),
    );
    yield* ctx.expectEqual(
      "the pressed cell holds the focus, so the next key reaches the row",
      yield* focusedAfterPaint(ctx),
      COLUMN_IDS.cell(3, "name"),
    );

    // 3. The rows scroll under the header; the offset is the runtime's own.
    yield* ctx.host.wheel(COLUMN_IDS.grid, 0, -200);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the wheel scrolls the rows",
      yield* offsetY(),
      -200,
      2,
    );

    // 4. Hiding a column takes its width out and shifts every later column.
    const ownerBefore = yield* paintedBox(ctx, COLUMN_IDS.header("owner"));
    yield* ctx.host.click(COLUMN_IDS.hide("status"));
    yield* Effect.sleep(SETTLE);
    const hidden = visibleColumns(COLUMN_ORDER, ["status"]);
    yield* ctx.expectEqual(
      "hiding a column removes it from the painted order",
      yield* readout(),
      columnsReadout(hidden, { x: 0, y: -200 }, Option.some(3)),
    );
    yield* ctx.expectEqual(
      "a hidden column paints no header",
      yield* unpainted(COLUMN_IDS.header("status")),
      true,
    );
    yield* ctx.expectEqual(
      "a hidden column paints no cell",
      yield* unpainted(COLUMN_IDS.cell(3, "status")),
      true,
    );
    const ownerAfter = yield* paintedBox(ctx, COLUMN_IDS.header("owner"));
    yield* ctx.expectNear(
      "every later column shifts left by the hidden one's width",
      ownerAfter.x - ownerBefore.x,
      -columnWidth("status"),
      1,
    );
    yield* ctx.expectEqual(
      "the header and its cells still read one column list",
      ownerAfter.x,
      (yield* paintedBox(ctx, COLUMN_IDS.cell(3, "owner"))).x,
    );
    yield* ctx.expectNear(
      "a column change leaves the vertical offset where the reader left it",
      yield* offsetY(),
      -200,
      2,
    );
    // Row 9 is inside the viewport at this offset: a press resolves at the
    // element's painted centre, and a row scrolled out of the window would land
    // on whatever paints there instead.
    yield* ctx.host.click(COLUMN_IDS.cell(9, "owner"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the column that moved into the hidden one's place takes its press",
      yield* readout(),
      "selected=r9",
    );

    // 5. The grid pans to the end of the content it has now.
    yield* ctx.host.wheel(COLUMN_IDS.grid, -10_000, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the horizontal wheel pans to the content's end",
      yield* offsetX(),
      maxOffsetX(contentWidth(hidden)),
      2,
    );
    const panned = yield* paintedBox(ctx, COLUMN_IDS.header("kind"));
    yield* ctx.expectNear(
      "the last column's edge paints at the viewport's edge",
      panned.x + panned.width,
      viewport.x + COLUMN_VIEWPORT_WIDTH,
      2,
    );

    // 6. A second hide shrinks the content under an offset left past its end.
    yield* ctx.host.click(COLUMN_IDS.hide("owner"));
    yield* Effect.sleep(SETTLE);
    const narrower = visibleColumns(hidden, ["owner"]);
    yield* ctx.expectNear(
      "the offset clamps to the content's new end",
      yield* offsetX(),
      maxOffsetX(contentWidth(narrower)),
      2,
    );
    const clamped = yield* paintedBox(ctx, COLUMN_IDS.header("kind"));
    yield* ctx.expectNear(
      "the grid paints no blank space past its last column",
      clamped.x + clamped.width,
      viewport.x + COLUMN_VIEWPORT_WIDTH,
      2,
    );
    yield* ctx.expectNear(
      "clamping the pan keeps the vertical offset",
      yield* offsetY(),
      -200,
      2,
    );

    // 7. Restoring a column re-grows the content and paints it where its widths
    //    put it, with the offset the reader left.
    yield* ctx.host.click(COLUMN_IDS.hide("status"));
    yield* ctx.host.click(COLUMN_IDS.hide("owner"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "restoring the hidden columns returns the full order",
      yield* readout(),
      "cols=name,status,owner,updated,size,kind width=690",
    );
    const restored = yield* paintedBox(ctx, COLUMN_IDS.header("owner"));
    const ownerAt = Option.getOrElse(
      columnOffset(COLUMN_ORDER, "owner"),
      () => Number.NaN,
    );
    yield* ctx.expectNear(
      "a restored column paints where its widths put it",
      restored.x,
      viewport.x + ownerAt + (yield* offsetX()),
      2,
    );

    // 8. A column move changes the order, not the width.
    yield* ctx.host.click(COLUMN_IDS.move("owner"));
    yield* Effect.sleep(SETTLE);
    const moved = moveColumn(COLUMN_ORDER, "owner", 1);
    yield* ctx.expectEqual(
      "a column move changes the order it is read in",
      yield* readout(),
      columnsReadout(moved, { x: -90, y: -200 }, Option.some(9)),
    );
    const movedHeader = yield* paintedBox(ctx, COLUMN_IDS.header("owner"));
    yield* ctx.expectNear(
      "the moved header paints at its new offset",
      movedHeader.x,
      viewport.x +
        Option.getOrElse(columnOffset(moved, "owner"), () => Number.NaN) +
        (yield* offsetX()),
      2,
    );
    yield* ctx.expectEqual(
      "the moved column's cells follow its header",
      (yield* paintedBox(ctx, COLUMN_IDS.cell(9, "owner"))).x,
      movedHeader.x,
    );
    yield* ctx.host.capture("table-columns");
  });

/**
 * A generated pattern field's `<svg>` in a real window.
 *
 * Plan 600's `hexagon` and `topography` are one generated `<path>` in a view
 * box, sized by the element — and nothing had measured that this route paints.
 * The probe mounts five shapes with disjoint tints, so one capture answers each
 * question: a stroked square (is the path scaled from its view box, stroke
 * included?), a band drawn past the view box (is it clipped at the view box's
 * edge?), the same band in a 3:1 box and in a 1:2 box (which axis decides the
 * scale, and what happens to the line's weight?), and a twenty-subpath comb
 * (does the whole generated path paint, or a prefix?). A press then gives the
 * square a different aspect ratio: the path is laid out again at the new width,
 * and the square content area it is painted in overflows the shorter box.
 */
const SvgPatternProbe = (): ReactNode => {
  const theme = useTheme();
  const [resized, setResized] = useState(false);
  const square = resized ? SQUARE_RESIZED_BOX : SQUARE_BOX;
  return (
    <div
      testId={PATTERN_IDS.probe}
      style={{
        width: 900,
        height: 500,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <div style={{ display: "flex", gap: theme.spacing.lg }}>
        <svg
          testId={PATTERN_IDS.square}
          source={shapeSvg("square")}
          style={{
            width: square.width,
            height: square.height,
            color: shapeTint("square"),
          }}
        />
        <svg
          testId={PATTERN_IDS.overhang}
          source={shapeSvg("overhang")}
          style={{
            width: OVERHANG_SIZE,
            height: OVERHANG_SIZE,
            color: shapeTint("overhang"),
          }}
        />
        <svg
          testId={PATTERN_IDS.wide}
          source={shapeSvg("wide")}
          style={{
            width: WIDE.width,
            height: WIDE.height,
            color: shapeTint("wide"),
          }}
        />
        <svg
          testId={PATTERN_IDS.tall}
          source={shapeSvg("tall")}
          style={{
            width: TALL.width,
            height: TALL.height,
            color: shapeTint("tall"),
          }}
        />
      </div>
      <div
        style={{ display: "flex", gap: theme.spacing.lg, alignItems: "center" }}
      >
        <svg
          testId={PATTERN_IDS.comb}
          source={shapeSvg("comb")}
          style={{
            width: COMB_SIZE.width,
            height: COMB_SIZE.height,
            color: shapeTint("comb"),
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.md,
          }}
        >
          <Button
            testId={PATTERN_IDS.resize}
            onClick={() => setResized((was) => !was)}
          >
            Resize
          </Button>
          <text testId={PATTERN_IDS.readout}>{patternReadout(square)}</text>
        </div>
      </div>
    </div>
  );
};

/** The ink one shape's tint paints, in the window's logical points. */
const patternInk = (
  ctx: Smoke.AsyncSmokeContext,
  frame: Pixels.Pixels,
  scale: number,
  shape: PatternShape,
  state: string,
): Effect.Effect<Smoke.Bounds, Smoke.SmokeAssertionError> =>
  Effect.map(
    ctx.expectSome(
      `the ${shape} ink paints in the ${state} frame`,
      Option.fromNullishOr(
        Pixels.boundsOfColour(
          frame,
          new Pixels.Rgba({ ...PATTERN_TINTS[shape], a: 0xff }),
        ),
      ),
    ),
    (region) => logicalRegion(region, scale),
  );

/** How many of the comb's strokes paint their own tint at their centre. */
const combPainted = (
  frame: Pixels.Pixels,
  scale: number,
  origin: { readonly x: number; readonly y: number },
): number =>
  Arr.length(
    Arr.filter(combPoints(origin), (point) => {
      const at = framePoint(point, scale);
      return Option.match(
        Option.fromNullishOr(Pixels.pixelAt(frame, at.x, at.y)),
        {
          onNone: () => false,
          onSome: (pixel) =>
            pixel.r === PATTERN_TINTS.comb.r &&
            pixel.g === PATTERN_TINTS.comb.g &&
            pixel.b === PATTERN_TINTS.comb.b &&
            pixel.a === 0xff,
        },
      );
    }),
  );

const svgPatternSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(PATTERN_IDS.probe);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("svg-pattern");
    const frame = yield* ctx.host.pixels("svg-pattern");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const ink = (shape: PatternShape) =>
      patternInk(ctx, frame, scale, shape, "first");

    // 1. A generated path is scaled from its view box, stroke and all.
    const square = yield* paintedBox(ctx, PATTERN_IDS.square);
    yield* ctx.expectEqual(
      "the readout names the box the probe opened in",
      yield* ctx.host.text(PATTERN_IDS.readout),
      patternReadout(SQUARE_BOX),
    );
    yield* ctx.expectNear(
      "the svg element paints the box its style gives it",
      square.width,
      SQUARE_BOX.width,
      1,
    );
    const squareInk = yield* ink("square");
    yield* ctx.expectNear(
      "a generated path is scaled from its view box",
      squareInk.width,
      square.width * squareFraction(),
      4,
    );
    yield* ctx.expectNear(
      "the stroke is scaled by the same rule",
      squareInk.height,
      square.height * squareFraction(),
      4,
    );
    yield* ctx.expectNear(
      "the scaled ink is centred in its box",
      squareInk.x + squareInk.width / 2,
      square.x + square.width / 2,
      3,
    );

    // 2. A path drawn past the view box is clipped at the view box's edge: the
    //    band reaches both edges and paints nothing outside them.
    const overhang = yield* paintedBox(ctx, PATTERN_IDS.overhang);
    const overhangInk = yield* ink("overhang");
    yield* ctx.expectNear(
      "a path past the view box is clipped at the view box's edge",
      overhangInk.width,
      overhang.width,
      3,
    );
    yield* ctx.expectNear(
      "the clipped band is the stroke's own thickness",
      overhangInk.height,
      overhang.height * overhangFraction(),
      3,
    );
    yield* ctx.expectNear(
      "the ink does not grow past the left edge",
      overhangInk.x,
      overhang.x,
      2,
    );
    yield* ctx.expectNear(
      "the ink does not grow past the right edge",
      overhangInk.x + overhangInk.width,
      overhang.x + overhang.width,
      2,
    );

    // 3. A view box in a wider box: the width alone decides the scale, so the
    //    band spans all 300 points rather than the 100 a fitted view box paints,
    //    and its 10-unit stroke paints 30 points thick.
    const wide = yield* paintedBox(ctx, PATTERN_IDS.wide);
    const wideInk = yield* ink("wide");
    yield* ctx.expectNear(
      "a view box in a 3:1 box is scaled by the width, not fitted to the short axis",
      wideInk.width,
      wide.width,
      4,
    );
    yield* ctx.expectNear(
      "the content area is centred in its box",
      wideInk.x + wideInk.width / 2,
      wide.x + wide.width / 2,
      3,
    );
    yield* ctx.expectNear(
      "a stroke paints at the width's scale",
      wideInk.height,
      strokeWeight(WIDE.stroke, WIDE.width),
      4,
    );

    // 3b. The same band in a box twice as tall as it is wide: the height is not
    //     consulted, so the band still spans the 100-point width and keeps a
    //     10-point stroke instead of taking the height's 2× scale.
    const tall = yield* paintedBox(ctx, PATTERN_IDS.tall);
    const tallInk = yield* ink("tall");
    yield* ctx.expectNear(
      "a view box in a 1:2 box keeps the width's scale",
      tallInk.width,
      tall.width,
      4,
    );
    yield* ctx.expectNear(
      "the height does not scale a stroke",
      tallInk.height,
      strokeWeight(TALL.stroke, TALL.width),
      4,
    );
    yield* ctx.expectNear(
      "the content area is centred on the tall box's centre",
      tallInk.y + tallInk.height / 2,
      tall.y + tall.height / 2,
      3,
    );

    // 4. Every subpath of the generated path paints, not its prefix.
    const comb = yield* paintedBox(ctx, PATTERN_IDS.comb);
    yield* ctx.expectEqual(
      "every subpath of a generated path paints",
      combPainted(frame, scale, comb),
      COMB.strokes,
    );

    // 5. The same view box in a 3:1 box: the path is laid out again at the new
    //    width, and the content area grows with it — a square 300-point area,
    //    which the element's 100-point box does not clip, so the pattern paints
    //    above and below the box it was given.
    yield* ctx.host.click(PATTERN_IDS.resize);
    yield* settleUntil(
      ctx.host.text(PATTERN_IDS.readout),
      (text) => text === patternReadout(SQUARE_RESIZED_BOX),
    );
    yield* ctx.host.capture("svg-pattern-resized");
    const resizedFrame = yield* ctx.host.pixels("svg-pattern-resized");
    const resized = yield* paintedBox(ctx, PATTERN_IDS.square);
    yield* ctx.expectEqual(
      "the press re-lays the element out at the new box",
      yield* ctx.host.text(PATTERN_IDS.readout),
      patternReadout(SQUARE_RESIZED_BOX),
    );
    yield* ctx.expectNear(
      "the resized element paints the box its style gives it",
      resized.width,
      SQUARE_RESIZED_BOX.width,
      1,
    );
    const resizedInk = yield* patternInk(
      ctx,
      resizedFrame,
      scale,
      "square",
      "resized",
    );
    yield* ctx.expectNear(
      "a resize lays the path out at the new width",
      resizedInk.width,
      resized.width * squareFraction(),
      6,
    );
    yield* ctx.expectNear(
      "the re-laid-out ink is centred on the element's horizontal centre",
      resizedInk.x + resizedInk.width / 2,
      resized.x + resized.width / 2,
      4,
    );
    yield* ctx.expectEqual(
      "the square content area is not clipped to the element's own box",
      resizedInk.height > resized.height,
      true,
    );
    yield* ctx.expectEqual(
      "the overflow paints above the box the element was given",
      resizedInk.y < resized.y,
      true,
    );
  });

/** The preview half of the inspector workspace: the object at its own size. */
const InspectorPreview = ({
  object,
}: {
  readonly object: InspectedObject;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={INSPECTOR_IDS.preview}
      style={{
        height: "100%",
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <text
        testId={INSPECTOR_IDS.previewCaption}
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {previewCaption(object)}
      </text>
      <div
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <div
          testId={INSPECTOR_IDS.previewBox}
          style={{
            width: object.width,
            height: object.height,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>
    </div>
  );
};

/** The inspector half: a toolbar, a metric, one editor and the property rows. */
const InspectorPanel = ({
  object,
  onChange,
}: {
  readonly object: InspectedObject;
  readonly onChange: (next: InspectedObject) => void;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.colors.card,
        borderWidth: theme.borderWidth.thin,
        borderColor: theme.colors.border,
      }}
    >
      <div
        testId={INSPECTOR_IDS.toolbar}
        style={{
          height: INSPECTOR_TOOLBAR_HEIGHT,
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          borderBottomWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <Pressable
          testId={INSPECTOR_IDS.wide}
          onClick={() => onChange(widen(object))}
          style={{ padding: theme.spacing.xs }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            Wide
          </text>
        </Pressable>
        <Pressable
          testId={INSPECTOR_IDS.reset}
          onClick={() => onChange(resetSize(object))}
          style={{ padding: theme.spacing.xs }}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.foreground,
            }}
          >
            Reset size
          </text>
        </Pressable>
      </div>
      <div
        testId={INSPECTOR_IDS.scroll}
        style={{
          height: INSPECTOR_SCROLL_HEIGHT,
          overflowY: "scroll",
          padding: theme.spacing.sm,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
        }}
      >
        <div
          testId={INSPECTOR_IDS.metric}
          style={{
            height: 36,
            paddingLeft: theme.spacing.sm,
            paddingRight: theme.spacing.sm,
            display: "flex",
            alignItems: "center",
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.muted,
          }}
        >
          <text
            testId={INSPECTOR_IDS.metricValue}
            style={{
              ...textStyle(theme, "bodyStrong"),
              color: theme.colors.foreground,
            }}
          >
            {metricReadout(object)}
          </text>
        </div>
        <Input
          testId={INSPECTOR_IDS.tagField}
          label="Tag"
          value={object.tag}
          onValueChange={(tag) => onChange(renameTag(object, tag))}
          style={{ width: INSPECTOR_LABEL_WIDTH + INSPECTOR_VALUE_WIDTH }}
        />
        {Arr.map(propertyRows(object), (row) => (
          <div
            key={row.key}
            role="row"
            style={{
              height: INSPECTOR_ROW_HEIGHT,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <div
              testId={INSPECTOR_IDS.labelCell(row.key)}
              style={{ width: INSPECTOR_LABEL_WIDTH, flexShrink: 0 }}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                {row.label}
              </text>
            </div>
            <div
              testId={INSPECTOR_IDS.valueCell(row.key)}
              style={{ width: INSPECTOR_VALUE_WIDTH, flexShrink: 0 }}
            >
              <text
                testId={INSPECTOR_IDS.value(row.key)}
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.foreground,
                }}
              >
                {row.value}
              </text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const InspectorProbe = (): ReactNode => {
  const theme = useTheme();
  const [object, setObject] = useState<InspectedObject>(INITIAL_OBJECT);
  return (
    <div
      testId={INSPECTOR_IDS.probe}
      style={{
        width: 900,
        height: 520,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A property inspector beside its preview: the object is read by the
        preview, the key-value rows and the metric card, an edit reaches all of
        them, and the inspector scrolls in its own pane.
      </text>
      <div
        testId={INSPECTOR_IDS.split}
        style={{ height: INSPECTOR_PANE_HEIGHT, display: "flex" }}
      >
        <SplitPane
          id="inspector-split"
          initial={520}
          min={380}
          max={640}
          primary={<InspectorPreview object={object} />}
          secondary={<InspectorPanel object={object} onChange={setObject} />}
        />
      </div>
      <Readout testId={INSPECTOR_IDS.readout}>
        {inspectorReadout(object)}
      </Readout>
    </div>
  );
};

const inspectorSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(INSPECTOR_IDS.previewBox);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(INSPECTOR_IDS.readout);
    const readY = (testId: string) =>
      Effect.map(ctx.host.scrollOffset(testId), (offset) =>
        Option.match(Option.fromNullishOr(offset), {
          onNone: () => Number.NaN,
          onSome: (value) => value.y,
        }),
      );

    // 1. The object is read by its preview, its key-value table and its metric.
    yield* ctx.expectEqual(
      "the inspector opens on the object it holds",
      yield* readout(),
      inspectorReadout(INITIAL_OBJECT),
    );
    yield* ctx.expectEqual(
      "the preview names the object and its size",
      yield* ctx.host.text(INSPECTOR_IDS.previewCaption),
      previewCaption(INITIAL_OBJECT),
    );
    yield* ctx.expectEqual(
      "the key-value table reads the same size",
      yield* ctx.host.text(INSPECTOR_IDS.value("size")),
      sizeValue(INITIAL_OBJECT),
    );
    yield* ctx.expectEqual(
      "the metric card totals the same object",
      yield* ctx.host.text(INSPECTOR_IDS.metricValue),
      metricReadout(INITIAL_OBJECT),
    );
    const previewBox = yield* paintedBox(ctx, INSPECTOR_IDS.previewBox);
    yield* ctx.expectNear(
      "the preview paints the object's width",
      previewBox.width,
      INITIAL_OBJECT.width,
      1,
    );
    yield* ctx.expectNear(
      "the preview paints the object's height",
      previewBox.height,
      INITIAL_OBJECT.height,
      1,
    );

    // 2. The two panes are one group: the divider is the gap, and neither pane
    //    leaves the group its split gives them.
    const left = yield* paintedBox(ctx, "inspector-split-pane-a");
    const right = yield* paintedBox(ctx, "inspector-split-pane-b");
    const divider = yield* paintedBox(ctx, "inspector-split-divider");
    const group = yield* paintedBox(ctx, INSPECTOR_IDS.split);
    yield* ctx.expectNear(
      "the divider sits at the left pane's edge",
      divider.x,
      left.x + left.width,
      1,
    );
    yield* ctx.expectNear(
      "the inspector pane starts after the divider",
      right.x,
      divider.x + SPLIT_DIVIDER_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "both panes share the group's top edge",
      right.y,
      left.y,
      1,
    );
    yield* ctx.expectNear(
      "the panes fill the group they share",
      right.x + right.width,
      group.x + group.width,
      1,
    );

    // 3. A data toolbar is one row, above the properties it acts on.
    const wide = yield* paintedBox(ctx, INSPECTOR_IDS.wide);
    const reset = yield* paintedBox(ctx, INSPECTOR_IDS.reset);
    const firstRow = yield* paintedBox(ctx, INSPECTOR_IDS.labelCell("name"));
    yield* ctx.expectNear(
      "the toolbar's actions sit on one row",
      wide.y,
      reset.y,
      1,
    );
    yield* ctx.expectEqual(
      "the toolbar sits above the property rows",
      wide.y + wide.height <= firstRow.y,
      true,
    );

    // 4. Every key-value row keeps its two columns, so the table reads down.
    const labelName = yield* paintedBox(ctx, INSPECTOR_IDS.labelCell("name"));
    const labelSize = yield* paintedBox(ctx, INSPECTOR_IDS.labelCell("size"));
    const valueName = yield* paintedBox(ctx, INSPECTOR_IDS.valueCell("name"));
    const valueSize = yield* paintedBox(ctx, INSPECTOR_IDS.valueCell("size"));
    yield* ctx.expectNear(
      "one label column holds its x down the rows",
      labelSize.x,
      labelName.x,
      1,
    );
    yield* ctx.expectNear(
      "one value column holds its x down the rows",
      valueSize.x,
      valueName.x,
      1,
    );
    yield* ctx.expectNear(
      "a value begins after its own label",
      valueName.x,
      labelName.x + labelName.width,
      1,
    );

    // 5. The property editor edits the object every other view reads, and the
    //    key it types stays in its own field.
    yield* ctx.host.click(INSPECTOR_IDS.tagField);
    yield* ctx.host.key("a");
    yield* ctx.host.key("b");
    yield* Effect.sleep(SETTLE);
    const tagged = renameTag(INITIAL_OBJECT, "ab");
    yield* ctx.expectEqual(
      "typing reaches the inspector's field",
      yield* readout(),
      inspectorReadout(tagged),
    );
    yield* ctx.expectContains(
      "the preview follows the edit",
      yield* ctx.host.text(INSPECTOR_IDS.previewCaption),
      "#ab",
    );
    yield* ctx.expectEqual(
      "the key-value row follows the edit",
      yield* ctx.host.text(INSPECTOR_IDS.value("tag")),
      tagValue(tagged.tag),
    );
    yield* ctx.expectEqual(
      "the field keeps the session it was typed into",
      yield* focusedAfterPaint(ctx),
      INSPECTOR_IDS.tagField,
    );

    // 6. A toolbar action moves the size in all three views at once.
    yield* ctx.host.click(INSPECTOR_IDS.wide);
    yield* Effect.sleep(SETTLE);
    const widened = widen(tagged);
    yield* ctx.expectEqual(
      "the toolbar action widens the object",
      yield* readout(),
      inspectorReadout(widened),
    );
    const widenedBox = yield* paintedBox(ctx, INSPECTOR_IDS.previewBox);
    yield* ctx.expectNear(
      "the preview paints the width the action set",
      widenedBox.width,
      WIDE_WIDTH,
      1,
    );
    yield* ctx.expectNear(
      "the action moves the width only",
      widenedBox.height,
      INITIAL_OBJECT.height,
      1,
    );
    yield* ctx.expectEqual(
      "the size row follows the action",
      yield* ctx.host.text(INSPECTOR_IDS.value("size")),
      sizeValue(widened),
    );
    yield* ctx.expectEqual(
      "the metric card follows the action",
      yield* ctx.host.text(INSPECTOR_IDS.metricValue),
      metricReadout(widened),
    );

    // 7. Reset restores the size and keeps the edit the reader made.
    yield* ctx.host.click(INSPECTOR_IDS.reset);
    yield* Effect.sleep(SETTLE);
    const restored = resetSize(widened);
    yield* ctx.expectEqual(
      "reset restores the size",
      yield* readout(),
      inspectorReadout(restored),
    );
    const restoredBox = yield* paintedBox(ctx, INSPECTOR_IDS.previewBox);
    yield* ctx.expectNear(
      "the preview paints the restored width",
      restoredBox.width,
      INITIAL_OBJECT.width,
      1,
    );

    // 8. The inspector owns its scroller: its wheel moves the properties and
    //    leaves the pane beside it where it was.
    const inspectorBefore = yield* paintedBox(ctx, "inspector-split-pane-b");
    const captionBefore = yield* paintedBox(ctx, INSPECTOR_IDS.previewCaption);
    yield* ctx.host.wheel(INSPECTOR_IDS.scroll, 0, -200);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the wheel scrolls the inspector",
      yield* readY(INSPECTOR_IDS.scroll),
      -200,
      2,
    );
    const inspectorAfter = yield* paintedBox(ctx, "inspector-split-pane-b");
    const captionAfter = yield* paintedBox(ctx, INSPECTOR_IDS.previewCaption);
    yield* ctx.expectNear(
      "scrolling the inspector leaves its own pane in place",
      inspectorAfter.y,
      inspectorBefore.y,
      1,
    );
    yield* ctx.expectNear(
      "scrolling the inspector leaves the preview in place",
      captionAfter.y,
      captionBefore.y,
      1,
    );
    yield* ctx.expectEqual(
      "the preview pane is not a scroller",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.scrollOffset(INSPECTOR_IDS.preview),
        ),
      ),
      true,
    );
    yield* ctx.host.capture("inspector");
  });

/**
 * One measured box: the fixed width a table cell gives its label, and the clip
 * a cell has to declare for a run to stop at its edge.
 *
 * `lineClamp` is a box prop because the runtime's clamp is a text style on the
 * container, so the probe measures both places a component can put it.
 */
const TruncationBox = ({
  testId,
  clip = true,
  lineClamp,
  children,
}: {
  readonly testId: string;
  readonly clip?: boolean;
  readonly lineClamp?: number;
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId={testId}
      style={{
        width: TRUNCATION_WIDTH,
        position: "relative",
        paddingTop: theme.spacing.xs,
        paddingBottom: theme.spacing.xs,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.card,
        ...(lineClamp === undefined ? {} : { lineClamp }),
        ...(clip ? { overflow: "hidden" } : {}),
      }}
    >
      {children}
    </div>
  );
};

/** A row of boxes, so six measurements fit one window. */
const TruncationRow = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: theme.spacing.xl,
      }}
    >
      {children}
    </div>
  );
};

/**
 * What a window paints for a line that does not fit.
 *
 * Tier 3 and 4 keep their labels on one line — a table cell, a tab, a tree row,
 * a list title — and the capability record called truncation supported because
 * `StyleDesc` declares the fields. No probe had painted one, so this view asks
 * the questions a component needs answered: does the run stop at the box, is the
 * cut marked with an ellipsis or does the last glyph get sliced, does
 * `ellipsis-start` keep the tail instead, and where does `lineClamp` have to be
 * written for a paragraph to be cut at two lines.
 */
const TruncationProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const line = {
    ...textStyle(theme, "body"),
    color: theme.colors.foreground,
    whiteSpace: "nowrap" as const,
  };
  const prose = { ...textStyle(theme, "body"), color: theme.colors.foreground };
  return (
    <div
      testId="truncation-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A line that does not fit: the run stops at its box, the ellipsis
        replaces the tail, and a clamp shortens a paragraph.
      </text>
      <TruncationBox testId={TRUNCATION_IDS.plain}>
        <text style={line}>{TRUNCATION_LABEL}</text>
      </TruncationBox>
      <TruncationBox testId={TRUNCATION_IDS.ellipsis}>
        <text style={{ ...line, textOverflow: "ellipsis" }}>
          {TRUNCATION_LABEL}
        </text>
      </TruncationBox>
      <TruncationBox testId={TRUNCATION_IDS.start}>
        <text style={{ ...line, textOverflow: "ellipsis-start" }}>
          {TRUNCATION_LABEL}
        </text>
      </TruncationBox>
      <text
        testId={TRUNCATION_IDS.own}
        style={{
          ...line,
          width: TRUNCATION_WIDTH,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {TRUNCATION_LABEL}
      </text>
      <PrimitiveThemeProvider theme={palettes.dark}>
        <TruncationBox testId={TRUNCATION_IDS.shipped}>
          <Text truncate>{TRUNCATION_LABEL}</Text>
        </TruncationBox>
      </PrimitiveThemeProvider>
      <TruncationRow>
        <TruncationBox testId={TRUNCATION_IDS.wrapped} clip={false}>
          <text style={prose}>{TRUNCATION_PROSE}</text>
        </TruncationBox>
        <TruncationBox testId={TRUNCATION_IDS.clamp} clip={false}>
          <text style={{ ...prose, lineClamp: TRUNCATION_CLAMP_LINES }}>
            {TRUNCATION_PROSE}
          </text>
        </TruncationBox>
      </TruncationRow>
      <TruncationRow>
        <TruncationBox
          testId={TRUNCATION_IDS.clampBox}
          lineClamp={TRUNCATION_CLAMP_LINES}
        >
          <text style={prose}>{TRUNCATION_PROSE}</text>
        </TruncationBox>
        <TruncationBox testId={TRUNCATION_IDS.clampSized} clip={false}>
          <text
            style={{
              ...prose,
              lineClamp: TRUNCATION_CLAMP_LINES,
              height: (prose.lineHeight ?? 20) * TRUNCATION_CLAMP_LINES,
              overflow: "hidden",
            }}
          >
            {TRUNCATION_PROSE}
          </text>
        </TruncationBox>
        <PrimitiveThemeProvider theme={palettes.dark}>
          <TruncationBox testId={TRUNCATION_IDS.shippedClamp} clip={false}>
            <Text clamp={TRUNCATION_CLAMP_LINES}>{TRUNCATION_PROSE}</Text>
          </TruncationBox>
        </PrimitiveThemeProvider>
      </TruncationRow>
      <TruncationBox testId={TRUNCATION_IDS.bleed} clip={false}>
        <text testId={TRUNCATION_IDS.bleedText} style={line}>
          {TRUNCATION_LABEL}
        </text>
      </TruncationBox>
    </div>
  );
};

const truncationSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(TRUNCATION_IDS.plain);
    const window = yield* ctx.host.windowSize();
    yield* ctx.host.capture("truncation");
    const frame = yield* ctx.host.pixels("truncation");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const ink = palettes.dark.colors.foreground;

    /**
     * The box a fixture element painted, and what its run measures there.
     *
     * `bleed` widens the read past the box so a run that escapes is measured
     * rather than clipped by the reader's own crop — the answer the clip
     * question depends on.
     */
    const read = (id: string, bleed = 0) =>
      Effect.gen(function* () {
        const box = yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(yield* ctx.host.bounds(id)),
        );
        const measured = yield* ctx.expectSome(
          `${id} paints its ink`,
          readTruncation(
            frame,
            { ...box, width: box.width + bleed },
            scale,
            ink,
          ),
        );
        return { box, measured };
      });

    /**
     * Whether an end paints a mark rather than a whole glyph.
     *
     * A capital stem inks dozens of pixels in the upper half of its line; an
     * ellipsis inks a handful near the baseline. The comparison is against the
     * same end of the unmarked run, so the font and the box cancel out.
     */
    const marked = (end: number, whole: number): boolean => end * 3 < whole;

    // 1. A clip with no mark: the run ends at the box and slices the glyph.
    const plain = yield* read(TRUNCATION_IDS.plain, TRUNCATION_BLEED);
    yield* ctx.expectEqual(
      "a clipped run keeps one line",
      plain.measured.lines,
      1,
    );
    yield* ctx.expectNear(
      "a clipped run stops at its box",
      plain.measured.right,
      plain.box.width,
      2,
    );
    yield* ctx.expectEqual(
      "a clipped run has a whole glyph at its head",
      plain.measured.headUpper > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a clipped run slices its last glyph instead of marking the cut",
      marked(plain.measured.tailUpper, plain.measured.headUpper),
      false,
    );

    // 2. The same box with `textOverflow`: the ellipsis stands where the tail was.
    const ellipsis = yield* read(TRUNCATION_IDS.ellipsis, TRUNCATION_BLEED);
    yield* ctx.expectEqual(
      "an ellipsized run keeps one line",
      ellipsis.measured.lines,
      1,
    );
    yield* ctx.expectEqual(
      "an ellipsized run ends inside the box where a sliced glyph runs to the edge",
      ellipsis.measured.right < plain.measured.right,
      true,
    );
    yield* ctx.expectEqual(
      "an ellipsized run keeps a whole glyph at its head",
      marked(ellipsis.measured.headUpper, plain.measured.headUpper),
      false,
    );
    yield* ctx.expectEqual(
      "an ellipsis replaces the tail of the run",
      marked(ellipsis.measured.tailUpper, plain.measured.tailUpper),
      true,
    );

    // 3. `ellipsis-start` marks the other end.
    const start = yield* read(TRUNCATION_IDS.start, TRUNCATION_BLEED);
    yield* ctx.expectEqual(
      "an ellipsis-start run marks its head",
      marked(start.measured.headUpper, plain.measured.headUpper),
      true,
    );
    yield* ctx.expectEqual(
      "an ellipsis-start run keeps a whole glyph at its tail",
      marked(start.measured.tailUpper, plain.measured.tailUpper),
      false,
    );

    // 4. A `<text>` that carries the clip itself, without a wrapping cell.
    const own = yield* read(TRUNCATION_IDS.own, TRUNCATION_BLEED);
    yield* ctx.expectNear(
      "a text element that clips itself is its box's width",
      own.box.width,
      TRUNCATION_WIDTH,
      1,
    );
    yield* ctx.expectEqual(
      "a text element that clips itself keeps one line",
      own.measured.lines,
      1,
    );
    yield* ctx.expectEqual(
      "a text element that clips itself marks its own tail",
      marked(own.measured.tailUpper, own.measured.headUpper),
      true,
    );

    // 4b. The shipped `Text`: the props the library publishes, not raw styles.
    const shipped = yield* read(TRUNCATION_IDS.shipped, TRUNCATION_BLEED);
    yield* ctx.expectEqual(
      "the shipped Text's truncate prop keeps one line",
      shipped.measured.lines,
      1,
    );
    yield* ctx.expectEqual(
      "the shipped Text's truncate prop marks the tail",
      marked(shipped.measured.tailUpper, shipped.measured.headUpper),
      true,
    );

    // 5. The clamp: where a paragraph is asked for two lines, and what paints.
    const wrapped = yield* read(TRUNCATION_IDS.wrapped);
    const clamp = yield* read(TRUNCATION_IDS.clamp);
    const clampBox = yield* read(TRUNCATION_IDS.clampBox);
    const clampSized = yield* read(TRUNCATION_IDS.clampSized);
    const shippedClamp = yield* read(TRUNCATION_IDS.shippedClamp);
    yield* ctx.expectEqual(
      "the control paragraph wraps to the five lines this section quotes",
      wrapped.measured.lines,
      5,
    );
    yield* ctx.expectEqual(
      "a clamp on the text paints every line of the paragraph",
      clamp.measured.lines,
      wrapped.measured.lines,
    );
    yield* ctx.expectEqual(
      "a clamp on the box paints every line too",
      clampBox.measured.lines,
      wrapped.measured.lines,
    );
    yield* ctx.expectNear(
      "a clamp on the box leaves its height where the paragraph put it",
      clampBox.box.height,
      wrapped.box.height,
      1,
    );
    yield* ctx.expectEqual(
      "a definite height with a hidden overflow paints the two lines",
      clampSized.measured.lines,
      TRUNCATION_CLAMP_LINES,
    );
    yield* ctx.expectNear(
      "the two-line box is only as tall as the two lines",
      clampSized.box.height,
      48,
      2,
    );
    yield* ctx.expectEqual(
      "the shipped Text's clamp prop paints the two lines",
      shippedClamp.measured.lines,
      TRUNCATION_CLAMP_LINES,
    );
    yield* ctx.expectNear(
      "the shipped Text's clamp box is only as tall as its two lines",
      shippedClamp.box.height,
      clampSized.box.height,
      2,
    );
    yield* ctx.expectEqual(
      "the cut box is shorter than the uncut one",
      clampSized.box.height < wrapped.box.height,
      true,
    );

    // 6. No clip declared: the run paints past the box it was given.
    const bleed = yield* read(TRUNCATION_IDS.bleed, TRUNCATION_BLEED);
    yield* ctx.expectEqual(
      "an unclipped box lets the run paint past its edge",
      bleed.measured.right > bleed.box.width,
      true,
    );
    const bleedText = yield* ctx.expectSome(
      "the unclipped run reports its own box",
      Option.fromNullishOr(yield* ctx.host.bounds(TRUNCATION_IDS.bleedText)),
    );
    yield* ctx.expectEqual(
      "the layout report keeps an overflowing run inside its cell, so only paint shows the escape",
      bleedText.width > bleed.box.width,
      false,
    );
  });

/**
 * The vertical slider, painted in a window.
 *
 * `Slider`/`RangeSlider` grew an `orientation` axis on the offscreen renderer's
 * reading alone (`runtime/value.runtime.test.tsx`): the parts turned onto the
 * other axis and the track mirrors them because the runtime has no
 * `column-reverse`. Nothing had painted one, so the layout under a real window
 * and the pointer path — which the window delivers as `event.y` — were still the
 * renderer's claim. The probe mounts both a single slider and a range on a
 * 200-point track, one pressed at its centre and dragged to a quarter from the
 * floor, and reads the value plus the thumb's paint.
 */
const VerticalSliderProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState(0);
  const [changes, setChanges] = useState(0);
  const [range, setRange] = useState<readonly [number, number]>([10, 90]);
  const [rangeChanges, setRangeChanges] = useState(0);
  return (
    <PrimitiveThemeProvider theme={palettes.dark}>
      <div
        testId={VERTICAL_SLIDER_IDS.probe}
        style={{
          width: window.width,
          height: window.height,
          padding: theme.spacing.xl,
          backgroundColor: theme.colors.background,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xl,
        }}
      >
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          A vertical slider runs up: a press at the track's centre reports half,
          a drag to a quarter from the floor reports 25, and the thumb's paint
          follows.
        </text>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.xl,
          }}
        >
          <Slider
            testId={VERTICAL_SLIDER_IDS.slider}
            label="Vertical volume"
            orientation="vertical"
            value={value}
            style={{ height: VERTICAL_SLIDER_HEIGHT }}
            onValueChange={(next) => {
              setValue(next);
              setChanges((count) => count + 1);
            }}
          >
            <SliderTrack testId={VERTICAL_SLIDER_IDS.rail}>
              <SliderIndicator />
              <SliderThumb />
            </SliderTrack>
          </Slider>
          <RangeSlider
            testId={VERTICAL_SLIDER_IDS.range}
            label="Vertical price range"
            orientation="vertical"
            value={range}
            style={{ height: VERTICAL_SLIDER_HEIGHT }}
            onValueChange={(next) => {
              setRange(next);
              setRangeChanges((count) => count + 1);
            }}
          >
            <SliderTrack testId={VERTICAL_SLIDER_IDS.rangeRail}>
              <SliderIndicator index={0} />
              <SliderThumb index={0} />
              <SliderIndicator index={1} />
              <SliderThumb index={1} />
            </SliderTrack>
          </RangeSlider>
        </div>
        <text
          testId={VERTICAL_SLIDER_IDS.readout}
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`value=${value} changes=${changes}`}
        </text>
        <text
          testId={VERTICAL_SLIDER_IDS.rangeReadout}
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`range=${range[0]}-${range[1]} changes=${rangeChanges}`}
        </text>
      </div>
    </PrimitiveThemeProvider>
  );
};

const verticalSliderSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(VERTICAL_SLIDER_IDS.slider);
    yield* Effect.sleep(SETTLE);
    const theme = palettes.dark;
    const window = yield* ctx.host.windowSize();
    const track = yield* paintedBox(ctx, VERTICAL_SLIDER_IDS.slider);
    const rail = yield* paintedBox(ctx, VERTICAL_SLIDER_IDS.rail);
    const rangeTrack = yield* paintedBox(ctx, VERTICAL_SLIDER_IDS.range);
    const rangeRail = yield* paintedBox(ctx, VERTICAL_SLIDER_IDS.rangeRail);

    /** Captures the window and returns the frame the checks read. */
    const captured = (name: string) =>
      Effect.gen(function* () {
        yield* ctx.host.capture(name);
        return yield* ctx.host.pixels(name);
      });

    const first = yield* captured("slider-vertical");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(first, window),
    );

    // 1. The box is the horizontal one turned onto its other side: the caller
    //    supplies the length, the control's own height becomes the width, and
    //    half a thumb is reserved at each end so a thumb at an end is centred.
    yield* ctx.expectEqual(
      "the vertical track takes the caller's height",
      track.height,
      VERTICAL_SLIDER_HEIGHT,
    );
    yield* ctx.expectEqual(
      "the vertical track's width is the control's height",
      track.width,
      theme.density.controlHeight.md,
    );
    yield* ctx.expectNear(
      "the rail is the track inside half a thumb at each end",
      rail.height,
      track.height - theme.iconSize.md,
      1,
    );
    yield* ctx.expectEqual(
      "the rail is one spacing step wide",
      rail.width,
      theme.spacing.xs,
    );
    yield* ctx.expectNear(
      "the rail starts one inset below the track's top",
      rail.y,
      track.y + Math.round(theme.iconSize.md / 2),
      1,
    );

    // 2. At rest the value is the floor, and the paint says so: a track that
    //    packed its parts from the ceiling would put the thumb at the top.
    yield* ctx.expectEqual(
      "the slider starts at the floor",
      yield* ctx.host.text(VERTICAL_SLIDER_IDS.readout),
      "value=0 changes=0",
    );
    const floorInk = yield* ctx.expectSome(
      "the thumb paints its fill at rest",
      inkBounds(first, track, scale, theme.colors.input),
    );
    yield* ctx.expectNear(
      "a thumb at zero is centred on the rail's floor",
      floorInk.y + floorInk.height / 2,
      thumbCentreAt(rail, 0),
      1,
    );

    // 3. A press at the track's centre is half the value, because the usable
    //    span is the rail and the pointer maps from the bottom.
    yield* ctx.host.click(VERTICAL_SLIDER_IDS.slider);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press at the track's centre reports half",
      yield* ctx.host.text(VERTICAL_SLIDER_IDS.readout),
      "value=50 ",
    );
    const half = yield* captured("slider-vertical-half");
    const halfInk = yield* ctx.expectSome(
      "the thumb paints its fill after the press",
      inkBounds(half, track, scale, theme.colors.input),
    );
    yield* ctx.expectNear(
      "the thumb is centred at the value it reports",
      halfInk.y + halfInk.height / 2,
      thumbCentreAt(rail, 0.5),
      1,
    );

    // 4. Drag from that centre to a quarter from the floor. The delta is the
    //    rail's own arithmetic, so a wrong inset cannot hide in a round number.
    const quarter = thumbCentreAt(rail, VERTICAL_FRACTION);
    yield* ctx.host.drag(
      VERTICAL_SLIDER_IDS.slider,
      0,
      quarter - (track.y + track.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a drag to a quarter from the floor reports 25",
      yield* ctx.host.text(VERTICAL_SLIDER_IDS.readout),
      "value=25 ",
    );
    const dragged = yield* captured("slider-vertical-quarter");
    const quarterInk = yield* ctx.expectSome(
      "the thumb paints its fill after the drag",
      inkBounds(dragged, track, scale, theme.colors.input),
    );
    yield* ctx.expectNear(
      "the thumb follows the pointer to the quarter mark",
      quarterInk.y + quarterInk.height / 2,
      quarter,
      1,
    );
    const above = yield* ctx.expectSome(
      "the rail above the value paints",
      colourAt(
        dragged,
        { x: rail.x + rail.width / 2, y: rail.y + rail.height * 0.1 },
        scale,
      ),
    );
    yield* ctx.expectEqual(
      "no fill paints above the thumb: the bar grows from the floor",
      isColour(above, theme.colors.muted),
      true,
    );

    // 5. A drag that leaves the box keeps following, clamps at the ceiling, and
    //    stops on the release: a move afterwards leaves the value where it was.
    yield* ctx.host.drag(VERTICAL_SLIDER_IDS.slider, 0, -(track.height + 100));
    yield* Effect.sleep(SETTLE);
    const atTop = yield* ctx.host.text(VERTICAL_SLIDER_IDS.readout);
    yield* ctx.expectContains(
      "a drag past the top reports the maximum",
      atTop,
      "value=100 ",
    );
    yield* ctx.host.hover(VERTICAL_SLIDER_IDS.slider);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a pointer move after the release does not move the value",
      yield* ctx.host.text(VERTICAL_SLIDER_IDS.readout),
      atTop,
    );
    const top = yield* captured("slider-vertical-top");
    const topInk = yield* ctx.expectSome(
      "the thumb paints its fill at the ceiling",
      inkBounds(top, track, scale, theme.colors.input),
    );
    yield* ctx.expectNear(
      "a thumb at the maximum is centred on the rail's ceiling",
      topInk.y + topInk.height / 2,
      thumbCentreAt(rail, 1),
      1,
    );

    // 6. The range is the same axis with two ends: a press at the centre grabs
    //    the nearer end (a tie at 50 goes to the start), and only that end moves.
    yield* ctx.expectEqual(
      "the range starts where the caller set it",
      yield* ctx.host.text(VERTICAL_SLIDER_IDS.rangeReadout),
      "range=10-90 changes=0",
    );
    yield* ctx.host.click(VERTICAL_SLIDER_IDS.range);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press at the centre moves the nearer end and holds the other",
      yield* ctx.host.text(VERTICAL_SLIDER_IDS.rangeReadout),
      "range=50-90 ",
    );
    yield* ctx.host.drag(
      VERTICAL_SLIDER_IDS.range,
      0,
      thumbCentreAt(rangeRail, VERTICAL_FRACTION) -
        (rangeTrack.y + rangeTrack.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the range's active end follows a drag to the quarter mark",
      yield* ctx.host.text(VERTICAL_SLIDER_IDS.rangeReadout),
      "range=25-90 ",
    );

    // The two thumbs paint `input` inside one rail: their bound's top and
    // bottom are the upper and lower ends of the two, which is where the axis
    // says they are.
    const rangeFrame = yield* captured("slider-vertical-range");
    const rangeInk = yield* ctx.expectSome(
      "the range's thumbs paint their fill",
      inkBounds(rangeFrame, rangeTrack, scale, theme.colors.input),
    );
    // Both thumbs paint `input` inside one rail, so the union's top and bottom
    // are the outer halves of the two; the single thumb's painted height is the
    // half each centre is measured from.
    const inkHalf = floorInk.height / 2;
    yield* ctx.expectNear(
      "the range's lower thumb is centred on its value",
      rangeInk.y + rangeInk.height - inkHalf,
      thumbCentreAt(rangeRail, VERTICAL_FRACTION),
      2,
    );
    yield* ctx.expectNear(
      "the range's upper thumb is centred on its value",
      rangeInk.y + inkHalf,
      thumbCentreAt(rangeRail, 0.9),
      2,
    );
  });

/**
 * The library's `Box` page tells a consumer to pass a dashed border, a per-side
 * width and a per-corner radius through `style`, and the capability record calls
 * a two-stop gradient supported; every one of them is declared in `StyleDesc`
 * and none had been painted in a window. A dashed edge is proved against the
 * solid edge of the same geometry, because "fewer border pixels than a solid
 * band" is a measurement where a dash pattern would be a guess.
 */
const BoxPaintProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.xl,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    gap: theme.spacing.xl,
  };
  const bordered = {
    width: BOX_PAINT_WIDTH,
    height: BOX_PAINT_HEIGHT,
    borderWidth: BOX_PAINT_BORDER_WIDTH,
    borderColor: BOX_PAINT_BORDER,
  };
  return (
    <div testId="boxpaint-probe" style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A box&apos;s own edges and fill: a dashed border covers less of its band
        than a solid one, a per-corner radius and a per-side width paint where
        they are asked, and a two-stop gradient grades across the box.
      </text>
      <div style={row}>
        <div
          testId={BOX_PAINT_IDS.solid}
          style={{ ...bordered, borderStyle: "solid" }}
        />
        <div
          testId={BOX_PAINT_IDS.dashed}
          style={{ ...bordered, borderStyle: "dashed" }}
        />
      </div>
      <div style={row}>
        <div
          testId={BOX_PAINT_IDS.corners}
          style={{
            width: 80,
            height: 80,
            backgroundColor: BOX_PAINT_FILL,
            borderTopLeftRadius: 24,
          }}
        />
        <div
          testId={BOX_PAINT_IDS.sides}
          style={{
            width: 80,
            height: 80,
            backgroundColor: BOX_PAINT_FILL,
            borderTopWidth: 8,
            borderColor: BOX_PAINT_BORDER,
          }}
        />
      </div>
      <div
        testId={BOX_PAINT_IDS.gradient}
        style={{
          width: 240,
          height: 60,
          background: {
            type: "linear-gradient",
            angle: 90,
            stops: [
              { color: BOX_PAINT_STOPS[0], position: 0 },
              { color: BOX_PAINT_STOPS[1], position: 1 },
            ],
          },
        }}
      />
    </div>
  );
};

const boxPaintSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(BOX_PAINT_IDS.solid);
    const window = yield* ctx.host.windowSize();
    yield* ctx.host.capture("box-paint");
    const frame = yield* ctx.host.pixels("box-paint");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const page = palettes.dark.colors.background;

    const boxOf = (id: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(yield* ctx.host.bounds(id)),
        );
      });

    /** The colour the capture paints at a logical point. */
    const at = (point: PaintPoint) =>
      ctx.expectSome(
        "the sampled point is inside the capture",
        colourAt(frame, point, scale),
      );

    // 1. A solid edge and a dashed one of the same geometry.
    const solid = yield* boxOf(BOX_PAINT_IDS.solid);
    const dashed = yield* boxOf(BOX_PAINT_IDS.dashed);
    const solidPaint = yield* ctx.expectSome(
      "the solid box is in the capture",
      countPaint(frame, solid, scale, BOX_PAINT_BORDER),
    );
    const dashedPaint = yield* ctx.expectSome(
      "the dashed box is in the capture",
      countPaint(frame, dashed, scale, BOX_PAINT_BORDER),
    );
    yield* ctx.expectEqual(
      "a solid edge paints its border colour",
      solidPaint > 0,
      true,
    );
    yield* ctx.expectEqual("a dashed edge paints", dashedPaint > 0, true);
    yield* ctx.expectEqual(
      "a dashed edge covers less of its band than the solid edge of the same geometry",
      dashedPaint * 10 < solidPaint * 9,
      true,
    );

    // 2. One rounded corner, the other square.
    const corners = yield* boxOf(BOX_PAINT_IDS.corners);
    const cut = yield* at({ x: corners.x + 2, y: corners.y + 2 });
    const square = yield* at({
      x: corners.x + corners.width - 2,
      y: corners.y + 2,
    });
    yield* ctx.expectEqual(
      "a per-corner radius cuts its own corner to the page",
      isColour(cut, page),
      true,
    );
    yield* ctx.expectEqual(
      "the corner no radius names keeps its fill",
      isColour(square, BOX_PAINT_FILL),
      true,
    );

    // 3. A per-side width paints only the side it names.
    const sides = yield* boxOf(BOX_PAINT_IDS.sides);
    const topEdge = yield* at({
      x: sides.x + sides.width / 2,
      y: sides.y + 4,
    });
    const underEdge = yield* at({
      x: sides.x + sides.width / 2,
      y: sides.y + 12,
    });
    const leftEdge = yield* at({
      x: sides.x + 4,
      y: sides.y + sides.height / 2,
    });
    yield* ctx.expectEqual(
      "a named top width paints the top edge",
      isColour(topEdge, BOX_PAINT_BORDER),
      true,
    );
    yield* ctx.expectEqual(
      "the fill starts under the top edge",
      isColour(underEdge, BOX_PAINT_FILL),
      true,
    );
    yield* ctx.expectEqual(
      "the side with no width paints no border",
      isColour(leftEdge, BOX_PAINT_FILL),
      true,
    );

    // 4. A two-stop gradient grades across its box.
    const gradient = yield* boxOf(BOX_PAINT_IDS.gradient);
    const middle = gradient.y + gradient.height / 2;
    const left = yield* at(pointAcross(gradient, 0.1, middle));
    const right = yield* at(pointAcross(gradient, 0.9, middle));
    yield* ctx.expectEqual(
      "the gradient paints its first stop away from the page",
      isColour(left, page),
      false,
    );
    yield* ctx.expectEqual(
      "the two ends of the gradient are different colours",
      differs(left, right),
      true,
    );
    yield* ctx.expectEqual(
      "the gradient paints away from the page at its far end",
      isColour(right, page),
      false,
    );
  });

/**
 * What `aspectRatio` actually fills.
 *
 * The field is documented as "width divided by height, applied to whichever axis
 * is not definite" and every proof of it is an offscreen style report. A window
 * reports no style, so the fixture mounts one box per answer a component needs:
 * a definite width, a definite height, a portrait ratio, both dimensions
 * definite, and a child that inherits one definite axis from its container's
 * stretch — one column and one row.
 */
const AspectRatioProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.md,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: theme.spacing.lg,
  };
  const box = (id: string, style: object) => (
    <div
      testId={id}
      style={{ backgroundColor: theme.colors.primary, ...style }}
    />
  );
  return (
    <div testId="aspect-ratio-probe" style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A box with an aspect ratio fills the axis its container leaves open: a
        definite width derives a height, a definite height derives a width, two
        definite dimensions keep their own, and a stretched child takes the
        container&apos;s axis before the ratio derives the other.
      </text>
      <div style={row}>
        {box(ASPECT_IDS.width, {
          width: ASPECT_WIDTH,
          aspectRatio: ASPECT_RATIO,
        })}
        {box(ASPECT_IDS.portrait, {
          width: ASPECT_PORTRAIT_WIDTH,
          aspectRatio: ASPECT_PORTRAIT_RATIO,
        })}
        {box(ASPECT_IDS.height, {
          height: ASPECT_HEIGHT,
          aspectRatio: ASPECT_RATIO,
        })}
        {box(ASPECT_IDS.both, {
          width: ASPECT_WIDTH,
          height: ASPECT_HEIGHT,
          aspectRatio: ASPECT_RATIO,
        })}
      </div>
      <div style={row}>
        <div
          testId={ASPECT_IDS.columnParent}
          style={{ width: ASPECT_COLUMN_WIDTH }}
        >
          {box(ASPECT_IDS.column, { aspectRatio: ASPECT_RATIO })}
        </div>
        <div
          testId={ASPECT_IDS.rowParent}
          style={{
            height: ASPECT_ROW_HEIGHT,
            width: ASPECT_COLUMN_WIDTH,
            display: "flex" as const,
            flexDirection: "row" as const,
            alignItems: "stretch" as const,
          }}
        >
          {box(ASPECT_IDS.row, { aspectRatio: ASPECT_RATIO })}
        </div>
      </div>
    </div>
  );
};

const aspectRatioSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(ASPECT_IDS.width);
    const boxOf = (id: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(yield* ctx.host.bounds(id)),
        );
      });
    const assertCase = (expectation: AspectExpectation) =>
      Effect.gen(function* () {
        const box = yield* boxOf(expectation.id);
        yield* ctx.expectNear(
          `${expectation.id} paints the width its case expects`,
          box.width,
          expectation.width,
          1,
        );
        yield* ctx.expectNear(
          `${expectation.id} paints the height its case expects`,
          box.height,
          expectation.height,
          1,
        );
      });
    yield* Effect.forEach(ASPECT_CASES, assertCase, {
      concurrency: 1,
      discard: true,
    });

    // A stretched child is the composition a card or a thumbnail uses: the
    // container's axis is definite before the ratio derives the other.
    const column = yield* boxOf(ASPECT_IDS.column);
    const columnParent = yield* boxOf(ASPECT_IDS.columnParent);
    yield* ctx.expectNear(
      "a child stretched by a column takes its container's width",
      column.width,
      columnParent.width,
      1,
    );
    const rowChild = yield* boxOf(ASPECT_IDS.row);
    const rowParent = yield* boxOf(ASPECT_IDS.rowParent);
    yield* ctx.expectNear(
      "a child stretched by a row takes its container's height",
      rowChild.height,
      rowParent.height,
      1,
    );
  });

/**
 * The flex sizing rules a split pane, a table column and a truncating label
 * rest on, painted in a window.
 *
 * `@gpuixui/tw` compiles `flex-1` to `{ flexGrow: 1, flexShrink: 1, flexBasis:
 * 0 }`, `shrink-0` to `{ flexShrink: 0 }`, and every row of the library leans on
 * one of them — but no probe painted a grow, a shrink, a basis or an automatic
 * minimum. The fixture mounts each rule as one row whose widths are derived from
 * `flex-sizing.ts`, so the arithmetic under test is the same arithmetic the
 * README prints.
 */
const FlexSizingProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.sm,
  };
  const row = (id: string, width: number, height: number) => ({
    testId: id,
    style: {
      width,
      height,
      display: "flex" as const,
      flexDirection: "row" as const,
      backgroundColor: theme.colors.muted,
    },
  });
  const item = (id: string, style: object, child?: ReactNode) => (
    <div
      testId={id}
      style={{ backgroundColor: theme.colors.primary, ...style }}
    >
      {child}
    </div>
  );
  const fixed = (id: string, width: number) => (
    <div
      testId={id}
      style={{
        width,
        flexShrink: 0,
        backgroundColor: theme.colors.mutedForeground,
      }}
    />
  );
  /**
   * A grower with `flexBasis: 0` (what `flex-1` compiles to), and its
   * content-sized twin that omits the basis — two declarations, because a style
   * key that is absent is not a value.
   */
  const grower = (id: string, content?: number) => (
    <div
      testId={id}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        backgroundColor: theme.colors.primary,
      }}
    >
      {content === undefined ? null : (
        <div style={{ width: content, height: 20 }} />
      )}
    </div>
  );
  const autoGrower = (id: string, content: number) => (
    <div
      testId={id}
      style={{
        flexGrow: 1,
        flexShrink: 1,
        backgroundColor: theme.colors.primary,
      }}
    >
      <div style={{ width: content, height: 20 }} />
    </div>
  );
  return (
    <div testId="flex-sizing-probe" style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A flex row gives its leftover width to the growers: a basis of zero
        splits it evenly while the content fits, an auto basis grows from its
        content, a grower whose content is wider than its share keeps its
        content and the rest goes to the other, an over-full row shrinks only
        the items that may shrink, an item&apos;s automatic minimum is its
        content unless minWidth lifts it, maxWidth stops a grower, and alignSelf
        overrides a column&apos;s stretch.
      </text>
      <div {...row(FLEX_IDS.growRow, FLEX_ROW_WIDTH, 20)}>
        {fixed(FLEX_IDS.growFixed, FLEX_FIXED_WIDTH)}
        {grower(FLEX_IDS.growFill)}
      </div>
      <div {...row(FLEX_IDS.basisZeroRow, FLEX_ROW_WIDTH, 20)}>
        {fixed(FLEX_IDS.basisZeroFixed, FLEX_FIXED_WIDTH)}
        {grower(FLEX_IDS.basisZeroShort, FLEX_SHORT_CONTENT)}
        {grower(FLEX_IDS.basisZeroFit, FLEX_FIT_CONTENT)}
      </div>
      <div {...row(FLEX_IDS.basisAutoRow, FLEX_ROW_WIDTH, 20)}>
        {fixed(FLEX_IDS.basisAutoFixed, FLEX_FIXED_WIDTH)}
        {autoGrower(FLEX_IDS.basisAutoShort, FLEX_SHORT_CONTENT)}
        {autoGrower(FLEX_IDS.basisAutoLong, FLEX_LONG_CONTENT)}
      </div>
      <div {...row(FLEX_IDS.overRow, FLEX_ROW_WIDTH, 20)}>
        {fixed(FLEX_IDS.overFixed, FLEX_FIXED_WIDTH)}
        {grower(FLEX_IDS.overShort, FLEX_SHORT_CONTENT)}
        {grower(FLEX_IDS.overItem, FLEX_OVER_CONTENT)}
      </div>
      <div {...row(FLEX_IDS.shrinkRow, FLEX_NARROW_WIDTH, 20)}>
        {fixed(FLEX_IDS.shrinkFixed, FLEX_FIXED_WIDTH)}
        {item(FLEX_IDS.shrinkItem, { width: FLEX_ASKED_WIDTH })}
      </div>
      <div {...row(FLEX_IDS.noShrinkRow, FLEX_NARROW_WIDTH, 20)}>
        {item(FLEX_IDS.noShrinkItem, {
          width: FLEX_ASKED_WIDTH,
          flexShrink: 0,
        })}
      </div>
      <div {...row(FLEX_IDS.floorRow, FLEX_FLOOR_ROW_WIDTH, 20)}>
        {item(
          FLEX_IDS.floorItem,
          {},
          <div
            testId={FLEX_IDS.floorContent}
            style={{ width: FLEX_FLOOR_CONTENT, height: 20 }}
          />,
        )}
      </div>
      <div {...row(FLEX_IDS.liftedRow, FLEX_FLOOR_ROW_WIDTH, 20)}>
        {item(
          FLEX_IDS.liftedItem,
          { minWidth: 0 },
          <div
            testId={FLEX_IDS.liftedContent}
            style={{ width: FLEX_FLOOR_CONTENT, height: 20 }}
          />,
        )}
      </div>
      <div {...row(FLEX_IDS.maxRow, FLEX_ROW_WIDTH, 20)}>
        {fixed(FLEX_IDS.maxFixed, FLEX_FIXED_WIDTH)}
        <div
          testId={FLEX_IDS.maxGrow}
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            maxWidth: FLEX_MAX_WIDTH,
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>
      <div
        testId={FLEX_IDS.alignColumn}
        style={{
          width: FLEX_ALIGN_COLUMN_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: theme.spacing.xs,
        }}
      >
        {(
          [
            [FLEX_IDS.alignStart, "start"],
            [FLEX_IDS.alignCenter, "center"],
            [FLEX_IDS.alignEnd, "end"],
            [FLEX_IDS.alignStretch, "stretch"],
          ] as const
        ).map(([id, alignSelf]) => (
          <div
            key={id}
            testId={id}
            style={{
              alignSelf,
              backgroundColor: theme.colors.primary,
              padding: 0,
            }}
          >
            <div
              style={{
                width: FLEX_ALIGN_CONTENT,
                height: 20,
                backgroundColor: theme.colors.success,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const flexSizingSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(FLEX_IDS.growFill);
    // The evidence frame: every row of the table above in one paint, so a
    // reader can check the widths against the picture.
    yield* ctx.host.capture("flex-sizing");
    const boxOf = (id: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(yield* ctx.host.bounds(id)),
        );
      });

    // One check per box, so the printed count is the table's size plus the
    // row comparisons below rather than a number written by hand.
    yield* Effect.forEach(
      FLEX_WIDTH_CASES,
      (expectation) =>
        Effect.gen(function* () {
          const box = yield* boxOf(expectation.id);
          yield* ctx.expectNear(
            `${expectation.id} paints the width its rule expects`,
            box.width,
            expectation.width,
            1,
          );
        }),
      { concurrency: 1, discard: true },
    );

    // The grower ends exactly at the row's right edge: a grower that took its
    // content plus the leftover would leave the row short.
    const growRow = yield* boxOf(FLEX_IDS.growRow);
    const growFill = yield* boxOf(FLEX_IDS.growFill);
    yield* ctx.expectNear(
      "the grower ends at the row's right edge",
      growFill.x + growFill.width,
      growRow.x + growRow.width,
      1,
    );

    // An item that may not shrink keeps the width it asked for and paints past
    // its row, which is the overflow a fixed pane or a column relies on.
    const noShrinkRow = yield* boxOf(FLEX_IDS.noShrinkRow);
    const noShrinkItem = yield* boxOf(FLEX_IDS.noShrinkItem);
    yield* ctx.expectEqual(
      "a non-shrinking item paints past its row's right edge",
      noShrinkItem.x + noShrinkItem.width > noShrinkRow.x + noShrinkRow.width,
      true,
    );

    // The floor rows read their own content: the automatic minimum holds the
    // item at its child's width, and `minWidth: 0` lets the row shrink it while
    // the child keeps painting past the item's edge.
    const floorItem = yield* boxOf(FLEX_IDS.floorItem);
    const floorContent = yield* boxOf(FLEX_IDS.floorContent);
    const liftedItem = yield* boxOf(FLEX_IDS.liftedItem);
    const liftedContent = yield* boxOf(FLEX_IDS.liftedContent);
    yield* ctx.expectNear(
      "an item with no minWidth keeps its content's width",
      floorContent.width,
      floorItem.width,
      1,
    );
    yield* ctx.expectEqual(
      "minWidth zero lets the row shrink an item below its content",
      liftedContent.width > liftedItem.width,
      true,
    );

    const column = yield* boxOf(FLEX_IDS.alignColumn);
    yield* Effect.forEach(
      FLEX_ALIGN_CASES,
      (expectation) =>
        Effect.gen(function* () {
          const box = yield* boxOf(expectation.id);
          yield* ctx.expectNear(
            `${expectation.id} sits where its alignSelf places it`,
            box.x - column.x,
            expectation.x,
            1,
          );
        }),
      { concurrency: 1, discard: true },
    );
  });

/**
 * The native scrollbar thumb a `ScrollArea` paints, and the strip it moves on.
 *
 * `scrollbarColor` and `scrollbarWidth` are the runtime's own knobs, and the
 * shipped `ScrollArea` sets both from the theme — but the offscreen suite only
 * reads the style it passes, so what a consumer actually sees at rest, after a
 * wheel, at the clamp and under the pointer was unmeasured. The fixture
 * (`scrollbar.ts`) derives the binding's thumb rule, and the probe holds two
 * scrollers to their tint and thickness, the shipped default to the theme's
 * role, and a scroller whose content fits to **no thumb at all**.
 */
const ScrollbarProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.lg,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: theme.spacing.lg,
  };
  /**
   * One scroller: every case mounts the shipped `ScrollArea`, and the two knobs
   * are passed only when the fixture names one, so the default case really is
   * the library's default paint. A horizontal case asks the same rule on the
   * other axis, whose content is a strip rather than a column.
   */
  const scroller = (scroller: ScrollbarCase) => (
    <ScrollArea
      key={scroller.id}
      axis={scroller.axis}
      scrollbarColor={Option.getOrUndefined(scroller.tint)}
      scrollbarWidth={Option.getOrUndefined(scroller.width)}
      viewportTestId={scroller.id}
      style={{
        width: SCROLLBAR_VIEWPORT.width,
        height: SCROLLBAR_VIEWPORT.height,
      }}
    >
      <div
        testId={scroller.contentId}
        style={{
          ...(scroller.axis === "horizontal"
            ? {
                width: scroller.content,
                height: SCROLLBAR_VIEWPORT.height,
              }
            : { height: scroller.content, alignSelf: "stretch" }),
          flexShrink: 0,
          backgroundColor: SCROLLBAR_FILL,
        }}
      />
    </ScrollArea>
  );
  return (
    <div testId={SCROLLBAR_IDS.probe} style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A scroller paints a native thumb at the trailing edge, over the content
        rather than in a gutter: its colour and thickness are the caller&apos;s,
        its length is the viewport&apos;s share of the content, it follows the
        offset, and a scroller with nothing to show paints none.
      </text>
      <div style={row}>
        {scroller(SCROLLBAR_TINTED)}
        {scroller(SCROLLBAR_WIDE)}
        {scroller(SCROLLBAR_FLOOR)}
        <div
          testId={SCROLLBAR_IDS.swatch}
          style={{
            width: SCROLLBAR_SWATCH,
            height: SCROLLBAR_SWATCH,
            backgroundColor: theme.colors.scrollbar,
          }}
        />
      </div>
      <div style={row}>
        {scroller(SCROLLBAR_HORIZONTAL)}
        {scroller(SCROLLBAR_SHORT)}
        {scroller(SCROLLBAR_DEFAULT)}
      </div>
    </div>
  );
};

const scrollbarSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(SCROLLBAR_IDS.probe);
    // The resting frame: every scroller in one paint, plus the swatch that names
    // the theme's own thumb colour.
    yield* ctx.host.capture("scrollbar");
    const frame = yield* ctx.host.pixels("scrollbar");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );

    /** The capture pixels a logical box covers. */
    const regionOf = (box: Smoke.Bounds): Pixels.PixelRegion =>
      new Pixels.PixelRegion({
        x: Math.round(box.x * scale),
        y: Math.round(box.y * scale),
        width: Math.round(box.width * scale),
        height: Math.round(box.height * scale),
      });
    /**
     * A capture read as the logical pixels the rule is written in. The rounded
     * caps hide half a pixel at each end from an exact-colour read, so a length
     * is asserted against whole logical pixels with a one-pixel allowance —
     * measured, not assumed: a thumb the rule paints 26 px long reads 25.
     */
    const logical = (pixels: number): number => pixels / scale;
    /** The part of a frame one box covers, or `None` when it is off the frame. */
    const cropIn = (
      source: Pixels.Pixels,
      box: Smoke.Bounds,
    ): Option.Option<Pixels.Pixels> =>
      Option.fromNullishOr(Pixels.crop(source, regionOf(box)));
    /** How many pixels of `colour` a box paints, or `-1` when it is off frame. */
    const countIn = (
      source: Pixels.Pixels,
      box: Smoke.Bounds,
      colour: Pixels.Rgba,
    ): number =>
      Option.match(cropIn(source, box), {
        onNone: () => -1,
        onSome: (crop) => Pixels.countColour(crop, colour),
      });
    /** The box a colour paints inside `box`, or `None` when it paints none. */
    const thumbIn = (
      source: Pixels.Pixels,
      box: Smoke.Bounds,
      colour: Pixels.Rgba,
    ): Option.Option<Pixels.PixelRegion> =>
      Option.flatMap(cropIn(source, box), (crop) =>
        Option.fromNullishOr(Pixels.boundsOfColour(crop, colour)),
      );

    // The swatch is the theme's `scrollbar` role, so the shipped default's paint
    // is compared with a colour this frame measured rather than a remembered one.
    const swatch = yield* paintedBox(ctx, SCROLLBAR_IDS.swatch);
    const swatchColour = yield* ctx.expectSome(
      "the swatch paints the theme's scrollbar role",
      colourAt(
        frame,
        { x: swatch.x + swatch.width / 2, y: swatch.y + swatch.height / 2 },
        scale,
      ),
    );
    /** The tint a case asks for, or the theme's role when it names none. */
    const tintOf = (tint: Option.Option<string>): Effect.Effect<Pixels.Rgba> =>
      Option.match(tint, {
        onNone: () => Effect.succeed(swatchColour),
        onSome: (hex) =>
          Option.match(Option.fromNullishOr(Pixels.hexToRgba(hex)), {
            onNone: () =>
              Effect.die(`the scrollbar fixture's ${hex} is not a colour`),
            onSome: (colour) => Effect.succeed(colour),
          }),
      });

    // Every mounted scroller: its box, its content's box, and the content
    // keeping the viewport's cross axis — a thumb laid out in a gutter would
    // narrow a vertical scroller's content and shorten a horizontal one's.
    const mounted = yield* Effect.forEach(
      SCROLLBAR_VIEWPORTS,
      (scroller) =>
        Effect.gen(function* () {
          const viewport = yield* paintedBox(ctx, scroller.id);
          const content = yield* paintedBox(ctx, scroller.contentId);
          const horizontal = scroller.axis === "horizontal";
          yield* ctx.expectNear(
            `${scroller.id}'s content keeps the scroller's full ${
              horizontal ? "height" : "width"
            }`,
            horizontal ? content.height : content.width,
            horizontal ? viewport.height : viewport.width,
            1,
          );
          return { scroller, viewport };
        }),
      { concurrency: 1 },
    );
    const viewports = HashMap.fromIterable(
      Arr.map(mounted, (entry) => [entry.scroller.id, entry.viewport] as const),
    );
    const viewportOf = (id: string): Effect.Effect<Smoke.Bounds> =>
      Option.match(HashMap.get(viewports, id), {
        onNone: () => Effect.die(`the scrollbar fixture mounts no ${id}`),
        onSome: Effect.succeed,
      });

    // The resting thumb, per case: the tint paints, flush at the trailing edge,
    // at the track's start, at the thickness asked for and the length the
    // content gives it. A horizontal thumb swaps the two coordinates, and the
    // expectations are read the same way rather than through one shared helper,
    // so a read that forgot the axis could not agree with itself.
    yield* Effect.forEach(
      SCROLLBAR_THUMBS,
      (thumb) =>
        Effect.gen(function* () {
          const viewport = yield* viewportOf(thumb.id);
          const colour = yield* tintOf(thumb.tint);
          const box = yield* ctx.expectSome(
            `the ${thumb.id} thumb paints the tint it asks for`,
            thumbIn(frame, viewport, colour),
          );
          const horizontal = thumb.axis === "horizontal";
          yield* ctx.expectNear(
            `${thumb.id}'s thumb ends at the scroller's trailing edge`,
            horizontal
              ? logical(box.y + box.height)
              : logical(box.x + box.width),
            horizontal ? SCROLLBAR_VIEWPORT.height : SCROLLBAR_VIEWPORT.width,
            1,
          );
          yield* ctx.expectNear(
            `${thumb.id}'s thumb starts at the track's start`,
            horizontal ? logical(box.x) : logical(box.y),
            horizontal ? thumb.box.x : thumb.box.y,
            1,
          );
          yield* ctx.expectNear(
            `${thumb.id}'s thumb is the thickness it asks for`,
            horizontal ? logical(box.height) : logical(box.width),
            horizontal ? thumb.box.height : thumb.box.width,
            1,
          );
          yield* ctx.expectNear(
            `${thumb.id}'s thumb is the length its content gives it`,
            horizontal ? logical(box.width) : logical(box.height),
            horizontal ? thumb.box.width : thumb.box.height,
            1,
          );
        }),
      { concurrency: 1, discard: true },
    );

    // The control: content that fits paints no thumb, so the affordance is not a
    // decoration every scroller wears.
    const shortViewport = yield* viewportOf(SCROLLBAR_SHORT.id);
    const shortTint = yield* tintOf(SCROLLBAR_SHORT.tint);
    yield* ctx.expectEqual(
      "a scroller whose content fits paints no thumb",
      countIn(frame, shortViewport, shortTint),
      0,
    );

    // The thumb is confined to its own scroller: the tint's paint in the frame is
    // the tint's paint in the box, so nothing bled into a neighbour.
    yield* Effect.forEach(
      SCROLLBAR_TINTED_THUMBS,
      (thumb) =>
        Effect.gen(function* () {
          const viewport = yield* viewportOf(thumb.id);
          const colour = yield* tintOf(thumb.tint);
          yield* ctx.expectEqual(
            `${thumb.id}'s tint paints inside its own scroller only`,
            countIn(frame, viewport, colour),
            Pixels.countColour(frame, colour),
          );
        }),
      { concurrency: 1, discard: true },
    );

    const tinted = yield* viewportOf(SCROLLBAR_IDS.tinted);
    const tintedColour = yield* tintOf(SCROLLBAR_TINTED.tint);
    const offsetOf = Effect.gen(function* () {
      return yield* ctx.expectSome(
        "the tinted scroller reports a scroll offset",
        Option.fromNullishOr(
          yield* ctx.host.scrollOffset(SCROLLBAR_IDS.tinted),
        ),
      );
    });
    yield* ctx.expectEqual(
      "the tinted scroller starts at the top",
      (yield* offsetOf).y,
      0,
    );

    // One wheel down and one past the end: the offset the renderer holds, and
    // the box the rule says the thumb paints at that offset.
    yield* Effect.forEach(
      SCROLLBAR_STOPS,
      (stop) =>
        Effect.gen(function* () {
          yield* ctx.host.wheel(SCROLLBAR_IDS.tinted, 0, stop.delta);
          yield* Effect.sleep(SETTLE);
          const name = `scrollbar-${-stop.offset}`;
          yield* ctx.host.capture(name);
          const after = yield* ctx.host.pixels(name);
          const box = yield* ctx.expectSome(
            `${stop.label}: the thumb still paints its tint`,
            thumbIn(after, tinted, tintedColour),
          );
          yield* ctx.expectNear(
            `${stop.label}: the wheel leaves the scroller at its offset`,
            (yield* offsetOf).y,
            stop.offset,
            1,
          );
          yield* ctx.expectNear(
            `${stop.label}: the thumb starts where the offset puts it`,
            logical(box.y),
            stop.thumb.start,
            1,
          );
          if (stop.endsAtTrack) {
            yield* ctx.expectNear(
              "at the end the thumb's bottom is the track's bottom",
              logical(box.y + box.height),
              SCROLLBAR_VIEWPORT.height,
              1,
            );
          }
        }),
      { concurrency: 1, discard: true },
    );

    // The other axis: a sideways wheel moves the offset and the thumb along the
    // width, so the same rule has to transpose rather than only apply to height.
    const horizontal = yield* viewportOf(SCROLLBAR_HORIZONTAL.id);
    const horizontalColour = yield* tintOf(SCROLLBAR_HORIZONTAL.tint);
    const sideways = yield* Option.match(SCROLLBAR_HORIZONTAL_STOP, {
      onNone: () =>
        Effect.die(
          "the scrollbar fixture's horizontal case no longer overflows",
        ),
      onSome: Effect.succeed,
    });
    yield* ctx.host.wheel(
      SCROLLBAR_HORIZONTAL.id,
      -SCROLLBAR_HORIZONTAL_SCROLLED_BY,
      0,
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("scrollbar-sideways");
    const sidewaysFrame = yield* ctx.host.pixels("scrollbar-sideways");
    const sidewaysThumb = yield* ctx.expectSome(
      "the sideways wheel keeps the thumb painted",
      thumbIn(sidewaysFrame, horizontal, horizontalColour),
    );
    const sidewaysOffset = yield* ctx.expectSome(
      "the horizontal scroller reports a scroll offset",
      Option.fromNullishOr(
        yield* ctx.host.scrollOffset(SCROLLBAR_HORIZONTAL.id),
      ),
    );
    yield* ctx.expectNear(
      "the sideways wheel leaves the scroller at its offset",
      sidewaysOffset.x,
      sideways.offset,
      1,
    );
    yield* ctx.expectNear(
      "the horizontal thumb starts where the offset puts it",
      logical(sidewaysThumb.x),
      sideways.thumb.start,
      1,
    );

    // The pointer does not appear or fade the thumb: hovering leaves the same
    // paint in the same place.
    yield* ctx.host.hover(SCROLLBAR_IDS.tinted);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("scrollbar-hover");
    const hovered = yield* ctx.host.pixels("scrollbar-hover");
    const hoveredThumb = yield* ctx.expectSome(
      "hovering the scroller keeps its thumb painted",
      thumbIn(hovered, tinted, tintedColour),
    );
    const end = SCROLLBAR_STOPS[SCROLLBAR_STOPS.length - 1];
    yield* ctx.expectNear(
      "hovering the scroller leaves the thumb where the offset put it",
      logical(hoveredThumb.y),
      end?.thumb.start ?? Number.NaN,
      2,
    );

    // Back to the top: the thumb returns to the start of its track.
    yield* ctx.host.wheel(SCROLLBAR_IDS.tinted, 0, 100_000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a wheel past the start returns the offset to zero",
      (yield* offsetOf).y,
      0,
    );
    yield* ctx.host.capture("scrollbar-top");
    const top = yield* ctx.host.pixels("scrollbar-top");
    const topThumb = yield* ctx.expectSome(
      "the thumb paints again at the top",
      thumbIn(top, tinted, tintedColour),
    );
    yield* ctx.expectNear(
      "the thumb returns to the track's top",
      logical(topThumb.y),
      0,
      1,
    );
  });
/**
 * Whether a `ScrollArea` with `axis="both"` paints **both** thumbs.
 *
 * `scrollbar-thumb` asked the thumb rule one axis at a time, as every shipped
 * scroller is built. A log pane or an editor scroller overflows both ways, and
 * the runtime paints the thumb itself — so whether a two-axis scroller gets two
 * affordances or one cannot be answered by a recipe, only by a window. The
 * fixture (`scrollbar-both.ts`) derives both bands from the same rule; this
 * probe reads each band's own corner-free strip, so a vertical thumb cannot be
 * mistaken for a short horizontal one.
 */
const ScrollbarBothProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.lg,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: theme.spacing.lg,
  };
  /**
   * One scroller: both axes on, the caller's tint and thickness, and content
   * that either overflows both ways or fits inside the box on both.
   */
  const scroller = (
    id: string,
    contentId: string,
    content: { readonly width: number; readonly height: number },
  ) => (
    <ScrollArea
      key={id}
      axis="both"
      scrollbarColor={BOTH_TINT}
      scrollbarWidth={BOTH_THICKNESS}
      viewportTestId={id}
      style={{
        width: BOTH_VIEWPORT.width,
        height: BOTH_VIEWPORT.height,
      }}
    >
      <div
        testId={contentId}
        style={{
          width: content.width,
          height: content.height,
          flexShrink: 0,
          backgroundColor: BOTH_FILL,
        }}
      />
    </ScrollArea>
  );
  return (
    <div testId={BOTH_IDS.probe} style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A scroller with more to show on both axes: does the runtime paint a
        thumb on each trailing edge, or only one?
      </text>
      <div style={row}>
        {scroller(BOTH_IDS.scroller, BOTH_IDS.content, BOTH_CONTENT)}
        {scroller(BOTH_IDS.short, BOTH_IDS.shortContent, BOTH_SHORT_CONTENT)}
      </div>
    </div>
  );
};

const scrollbarBothSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(BOTH_IDS.probe);
    yield* ctx.host.capture("scrollbar-both");
    const frame = yield* ctx.host.pixels("scrollbar-both");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );

    const scrollerBox = yield* paintedBox(ctx, BOTH_IDS.scroller);
    yield* paintedBox(ctx, BOTH_IDS.content);
    const shortBox = yield* paintedBox(ctx, BOTH_IDS.short);

    const tint = yield* ctx.expectSome(
      "the fixture's tint is a colour",
      Option.fromNullishOr(Pixels.hexToRgba(BOTH_TINT)),
    );
    const fill = yield* ctx.expectSome(
      "the fixture's content fill is a colour",
      Option.fromNullishOr(Pixels.hexToRgba(BOTH_FILL)),
    );

    /**
     * One band of a scroller, as capture pixels. The band is the strip the
     * axis's thumb owes and stops before the corner the two thumbs share.
     */
    const bandCrop = (
      source: Pixels.Pixels,
      origin: Smoke.Bounds,
      band: BothBox,
    ): Option.Option<Pixels.Pixels> =>
      Option.fromNullishOr(
        Pixels.crop(
          source,
          new Pixels.PixelRegion({
            x: Math.round((origin.x + band.x) * scale),
            y: Math.round((origin.y + band.y) * scale),
            width: Math.round(band.width * scale),
            height: Math.round(band.height * scale),
          }),
        ),
      );
    /** The box the tint paints inside a band, in the band's own pixels. */
    const tintIn = (
      source: Pixels.Pixels,
      origin: Smoke.Bounds,
      band: BothBox,
    ): Option.Option<Pixels.PixelRegion> =>
      Option.flatMap(bandCrop(source, origin, band), (crop) =>
        Option.fromNullishOr(Pixels.boundsOfColour(crop, tint)),
      );
    /** How many pixels of the tint a band paints, or `-1` when it is off frame. */
    const countIn = (
      source: Pixels.Pixels,
      origin: Smoke.Bounds,
      band: BothBox,
    ): number =>
      Option.match(bandCrop(source, origin, band), {
        onNone: () => -1,
        onSome: (crop) => Pixels.countColour(crop, tint),
      });

    // Each axis's own band: a thumb paints there, as long as the content gives
    // it, starting where the offset puts it, and filling the strip it is owed.
    yield* Effect.forEach(
      BOTH_THUMBS,
      (thumb: BothThumb) =>
        Effect.gen(function* () {
          const horizontal = thumb.axis === "horizontal";
          const box = yield* ctx.expectSome(
            `the ${thumb.axis} band paints a thumb`,
            tintIn(frame, scrollerBox, bothBandOf(thumb.axis)),
          );
          yield* ctx.expectNear(
            `the ${thumb.axis} thumb is the length its content gives it`,
            (horizontal ? box.width : box.height) / scale,
            horizontal ? thumb.box.width : thumb.box.height,
            1,
          );
          yield* ctx.expectNear(
            `the ${thumb.axis} thumb starts where the offset puts it`,
            (horizontal ? box.x : box.y) / scale,
            horizontal ? thumb.box.x : thumb.box.y,
            1,
          );
          yield* ctx.expectNear(
            `the ${thumb.axis} thumb fills the strip it is owed`,
            (horizontal ? box.height : box.width) / scale,
            BOTH_THICKNESS,
            1,
          );
        }),
      { concurrency: 1, discard: true },
    );

    // The thumb is painted over the content rather than in a gutter: the content
    // fill reaches the strip the vertical thumb occupies.
    const beside = yield* colourAtPoint(
      ctx,
      frame,
      {
        x: scrollerBox.x + BOTH_VIEWPORT.width - BOTH_THICKNESS - 2,
        y: scrollerBox.y + 2,
      },
      scale,
      "the content paints beside the thumb's strip",
    );
    yield* ctx.expectEqual(
      "the content reaches the thumb, so the thumb is painted over it",
      differs(beside, fill),
      false,
    );

    // The control: content that fits inside the box on both axes paints no
    // thumb at all, so a thumb is the overflow's consequence.
    const shortThumb = Arr.reduce(
      BOTH_AXES,
      0,
      (total, axis) => total + countIn(frame, shortBox, bothBandOf(axis)),
    );
    yield* ctx.expectEqual(
      "a two-axis scroller whose content fits paints no thumb",
      shortThumb,
      0,
    );

    // Each wheel: the offset on both axes, and the thumb on the wheel's own
    // axis following it. The left/right move is the half a one-thumb
    // implementation cannot answer.
    yield* Effect.forEach(
      BOTH_STOPS,
      (stop, index) =>
        Effect.gen(function* () {
          yield* ctx.host.wheel(BOTH_IDS.scroller, stop.deltaX, stop.deltaY);
          yield* Effect.sleep(SETTLE);
          const name = `scrollbar-both-${index}`;
          yield* ctx.host.capture(name);
          const after = yield* ctx.host.pixels(name);
          const offset = yield* ctx.expectSome(
            `${stop.label}: the scroller reports an offset`,
            Option.fromNullishOr(
              yield* ctx.host.scrollOffset(BOTH_IDS.scroller),
            ),
          );
          yield* ctx.expectNear(
            `${stop.label}: the wheel leaves x at its offset`,
            offset.x,
            stop.offset.x,
            1,
          );
          yield* ctx.expectNear(
            `${stop.label}: the wheel leaves y at its offset`,
            offset.y,
            stop.offset.y,
            1,
          );
          const horizontal = stop.axis === "horizontal";
          const box = yield* ctx.expectSome(
            `${stop.label}: the ${stop.axis} thumb still paints its tint`,
            tintIn(after, scrollerBox, bothBandOf(stop.axis)),
          );
          yield* ctx.expectNear(
            `${stop.label}: the thumb starts where the offset puts it`,
            (horizontal ? box.x : box.y) / scale,
            stop.thumb.start,
            1,
          );
          yield* ctx.expectNear(
            `${stop.label}: the thumb keeps its length`,
            (horizontal ? box.width : box.height) / scale,
            stop.thumb.length,
            1,
          );
        }),
      { concurrency: 1, discard: true },
    );
  });

/**
 * Whether the **shipped** `Collapsible` measures its body in a window.
 *
 * `motion-geometry` measured the runtime's `motion` on a raw box. A disclosure
 * section is the other way round: `<AutoHeight>` is told the height its
 * **content** reports through `onLayout`, so whether a section opens at all
 * depends on a layout pass no renderer can stand in for. This probe drives the
 * component the way a reader does, then reads the box that settles, the body
 * inside it, and the unmount after the collapse.
 *
 * The body is grown while the section is closed: the reveal unmounts its
 * subtree then, so the next open has to measure the height on screen instead of
 * reusing the number it closed with.
 */
const CollapsibleProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [open, setOpen] = useState(false);
  const [opens, setOpens] = useState(0);
  const [closes, setCloses] = useState(0);
  const [height, setHeight] = useState(COLLAPSE_BODY);
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.lg,
  };
  /** The box one section is laid out in: the width a reveal must not animate. */
  const section = { width: COLLAPSE_WIDTH };
  /** A body of one fixed height, so the reveal's target is a number. */
  const body = (testId: string, bodyHeight: number) => (
    <div
      testId={testId}
      style={{
        height: bodyHeight,
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.md,
      }}
    />
  );
  const label = (text: string) => (
    <text
      style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}
    >
      {text}
    </text>
  );
  return (
    <div testId={COLLAPSE_IDS.probe} style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A disclosure section is a measured reveal: does the shipped Collapsible
        report its body in a window, clip to it, and unmount the body when it
        closes? The second section is open at mount, so the measurement at mount
        is read too.
      </text>
      <div style={section}>
        <Collapsible
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setOpens((count) => count + 1);
            else setCloses((count) => count + 1);
          }}
        >
          <CollapsibleTrigger testId={COLLAPSE_IDS.trigger}>
            {label("Reveal the body")}
          </CollapsibleTrigger>
          {/* The padding is dropped so the settled height is the body's own. */}
          <CollapsibleContent testId={COLLAPSE_IDS.clip} className="p-0 gap-0">
            {body(COLLAPSE_IDS.body, height)}
          </CollapsibleContent>
        </Collapsible>
      </div>
      <Button
        testId={COLLAPSE_IDS.grow}
        variant="secondary"
        onClick={() => setHeight(COLLAPSE_GROWN)}
      >
        Grow the closed body
      </Button>
      <div style={section}>
        <Collapsible defaultOpen>
          <CollapsibleTrigger testId={COLLAPSE_IDS.initialTrigger}>
            {label("Open at mount")}
          </CollapsibleTrigger>
          <CollapsibleContent
            testId={COLLAPSE_IDS.initialClip}
            className="p-0 gap-0"
          >
            {body(COLLAPSE_IDS.initialBody, COLLAPSE_MOUNTED)}
          </CollapsibleContent>
        </Collapsible>
      </div>
      <text
        testId={COLLAPSE_IDS.readout}
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {collapseReadout({ open, opens, closes, height })}
      </text>
    </div>
  );
};

const collapsibleSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(COLLAPSE_IDS.trigger);
    // A capture stalls the animation clock, so a run that starts right after
    // one misses the mount tween's frames. The section that starts open is
    // settling while this wait runs, which is why its read comes after it.
    yield* Effect.sleep(Duration.millis(400));

    /** A box field, `NaN` while the element paints nothing. */
    const field = (testId: string, name: "width" | "height") =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.match(Option.fromNullishOr(bounds), {
          onNone: () => Number.NaN,
          onSome: (box) => box[name],
        }),
      );

    /** The readout once it names `expected`, which a press reports by a frame. */
    const readout = (expected: string) =>
      settleUntil(ctx.host.text(COLLAPSE_IDS.readout), (line) =>
        line.includes(expected),
      );

    const expectState = (label: string, expected: string) =>
      Effect.gen(function* () {
        const line = yield* readout(expected);
        yield* ctx.expectContains(`${label} reports its state`, line, expected);
      });

    // A closed reveal is unmounted, not a zero-high box: the subtree (and the
    // box that holds it) leaves the tree, so nothing inside it keeps running.
    yield* expectState(
      "a section that starts closed",
      collapseReadout(COLLAPSE_REST),
    );
    const trigger = yield* paintedBox(ctx, COLLAPSE_IDS.trigger);
    yield* ctx.expectEqual(
      "the trigger paints a box of its own",
      trigger.width > 0 && trigger.height > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a closed section paints no clipping box",
      yield* settleGone(ctx, COLLAPSE_IDS.clip),
      true,
    );
    yield* ctx.expectEqual(
      "a closed section mounts no body",
      yield* settleGone(ctx, COLLAPSE_IDS.body),
      true,
    );

    // The mount path: a section that starts open measures its body without a
    // press, so `defaultOpen` is a real reveal rather than a painted box.
    const mountedClip = yield* settleNumber(
      field(COLLAPSE_IDS.initialClip, "height"),
    );
    const mountedBody = yield* paintedBox(ctx, COLLAPSE_IDS.initialBody);
    yield* ctx.expectNear(
      "a section that starts open paints its body at mount",
      mountedBody.height,
      COLLAPSE_MOUNTED,
      1,
    );
    yield* ctx.expectNear(
      "the mount measurement sets the clipping box",
      mountedClip,
      COLLAPSE_MOUNTED,
      1,
    );
    yield* ctx.expectNear(
      "the clipping box keeps the width the caller gave it",
      yield* settleNumber(field(COLLAPSE_IDS.initialClip, "width")),
      COLLAPSE_WIDTH,
      1,
    );

    // The presses, and the grow between the second and third: the body changes
    // while the section is closed, so the reveal has nothing mounted to measure
    // until it opens again.
    yield* Effect.forEach(
      COLLAPSE_PRESSES,
      (press: CollapsePress, index) =>
        Effect.gen(function* () {
          if (index === COLLAPSE_GROW_BEFORE) {
            yield* ctx.host.click(COLLAPSE_IDS.grow);
            yield* expectState(
              "growing the closed section",
              collapseReadout({
                ...COLLAPSE_REST,
                opens: 1,
                closes: 1,
                height: COLLAPSE_GROWN,
              }),
            );
          }
          yield* ctx.host.click(COLLAPSE_IDS.trigger);
          yield* expectState(press.label, collapseReadout(press));
          if (!press.open) {
            yield* ctx.expectEqual(
              `${press.label}: the body leaves the tree`,
              yield* settleGone(ctx, COLLAPSE_IDS.body),
              true,
            );
            yield* ctx.expectEqual(
              `${press.label}: the clipping box leaves with it`,
              yield* settleGone(ctx, COLLAPSE_IDS.clip),
              true,
            );
            return;
          }
          const body = yield* paintedBox(ctx, COLLAPSE_IDS.body);
          yield* ctx.expectNear(
            `${press.label}: the body paints the height the caller set`,
            body.height,
            press.height,
            1,
          );
          yield* ctx.expectNear(
            `${press.label}: the clipping box settles on the measured body`,
            yield* settleNumber(field(COLLAPSE_IDS.clip, "height")),
            press.height,
            1,
          );
          yield* ctx.expectNear(
            `${press.label}: the width is not animated`,
            yield* settleNumber(field(COLLAPSE_IDS.clip, "width")),
            COLLAPSE_WIDTH,
            1,
          );
        }),
      { concurrency: 1, discard: true },
    );

    // Captures come last: a screenshot stalls the animation clock, so one taken
    // between a press and its reads makes the next run complete in one frame.
    yield* ctx.host.capture("collapse-open");
  });

/**
 * Whether the **runtime's** scrollbar thumb takes a drag — it does not.
 *
 * The thumb is painted by the runtime inside the scroller, on a `canvas` with
 * no hitbox, so it is not a node a probe can name: the press is aimed from the
 * scroller's own centre at the strip the rule `scrollbar.ts` measured. A
 * pointer user either has this gesture or has only the wheel and the keys, and
 * no recipe can add it.
 *
 * The sibling handle is the control: the **same** drag on an element that
 * listens to `onMouseDown`/`onMouseMove` runs its eight moves, so a thumb that
 * does not move is the runtime's overlay, not a harness that cannot drag.
 */
const ScrollbarDragProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const pressed = useRef(false);
  const [moves, setMoves] = useState(0);
  return (
    <div
      testId={DRAG_IDS.probe}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex" as const,
        flexDirection: "column" as const,
        gap: theme.spacing.lg,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The runtime paints this scroller&apos;s thumb. Can a pointer grab it, or
        is the wheel the only way down? The handle beside it takes the same
        drag.
      </text>
      <div
        style={{
          display: "flex" as const,
          flexDirection: "row" as const,
          alignItems: "flex-start" as const,
          gap: theme.spacing.xl,
        }}
      >
        <ScrollArea
          axis="vertical"
          viewportTestId={DRAG_IDS.scroller}
          scrollbarColor={DRAG_TINT}
          scrollbarWidth={DRAG_THICKNESS}
          style={{ width: DRAG_VIEWPORT.width, height: DRAG_VIEWPORT.height }}
        >
          <div
            testId={DRAG_IDS.content}
            style={{
              width: DRAG_VIEWPORT.width,
              height: DRAG_CONTENT,
              flexShrink: 0,
              backgroundColor: DRAG_FILL,
            }}
          />
        </ScrollArea>
        <div
          testId={DRAG_IDS.handle}
          onMouseDown={() => {
            pressed.current = true;
          }}
          onMouseMove={() => {
            if (pressed.current) setMoves((count) => count + 1);
          }}
          onMouseUp={() => {
            pressed.current = false;
          }}
          style={{
            width: 160,
            height: 48,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.card,
          }}
        />
        <text
          testId={DRAG_IDS.readout}
          style={{
            ...textStyle(theme, "body"),
            color: theme.colors.foreground,
          }}
        >
          {`moves=${moves}`}
        </text>
      </div>
    </div>
  );
};

const scrollbarDragSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(DRAG_IDS.probe);
    yield* ctx.host.capture("scrollbar-drag-rest");
    const frame = yield* ctx.host.pixels("scrollbar-drag-rest");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const box = yield* paintedBox(ctx, DRAG_IDS.scroller);
    const tint = yield* ctx.expectSome(
      "the fixture's tint is a colour",
      Option.fromNullishOr(Pixels.hexToRgba(DRAG_TINT)),
    );

    /** The offset the renderer reports, failing by name if it reports none. */
    const offsetRead = (label: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${label}: the scroller reports an offset`,
          Option.fromNullishOr(yield* ctx.host.scrollOffset(DRAG_IDS.scroller)),
        );
      });

    /** The thumb the right-hand strip paints, in the strip's own pixels. */
    const thumbIn = (
      source: Pixels.Pixels,
    ): Option.Option<Pixels.PixelRegion> =>
      Option.flatMap(
        Option.fromNullishOr(
          Pixels.crop(
            source,
            new Pixels.PixelRegion({
              x: Math.round((box.x + DRAG_BAND.x) * scale),
              y: Math.round((box.y + DRAG_BAND.y) * scale),
              width: Math.round(DRAG_BAND.width * scale),
              height: Math.round(DRAG_BAND.height * scale),
            }),
          ),
        ),
        (crop) => Option.fromNullishOr(Pixels.boundsOfColour(crop, tint)),
      );

    // At rest: nothing has moved, and the thumb is where the rule puts it —
    // which is also the place the drag below aims at.
    const rest = yield* offsetRead("at rest");
    yield* ctx.expectNear("the scroller starts at the top", rest.y, 0, 1);
    yield* ctx.expectNear("the scroller starts at the left", rest.x, 0, 1);
    const restThumb = yield* ctx.expectSome(
      "the thumb paints its tint at rest",
      thumbIn(frame),
    );
    yield* ctx.expectNear(
      "the resting thumb starts at the track's top",
      restThumb.y / scale,
      DRAG_THUMB.start,
      1,
    );
    yield* ctx.expectNear(
      "the resting thumb is the length its content gives it",
      restThumb.height / scale,
      DRAG_THUMB.length,
      1,
    );

    // The thumb drag: the press lands on the thumb's own centre and travels.
    yield* ctx.host.drag(DRAG_IDS.scroller, 0, DRAG_BY, {
      offset: DRAG_GRAB,
    });
    yield* Effect.sleep(SETTLE);
    const dragged = yield* offsetRead("after the thumb drag");
    yield* ctx.expectNear(
      "a drag on the thumb scrolls nothing",
      dragged.y,
      rest.y,
      1,
    );
    yield* ctx.expectNear(
      "the thumb drag moves no other axis",
      dragged.x,
      rest.x,
      1,
    );

    // The track below it: a browser pages on that press, the overlay takes none.
    yield* ctx.host.drag(DRAG_IDS.scroller, 0, DRAG_BY, {
      offset: DRAG_TRACK_GRAB,
    });
    yield* Effect.sleep(SETTLE);
    const track = yield* offsetRead("after the track drag");
    yield* ctx.expectNear(
      "a drag on the track below the thumb scrolls nothing",
      track.y,
      rest.y,
      1,
    );

    // The control: the same drag on an element that listens for it.
    yield* ctx.expectContains(
      "the handle starts with no moves",
      yield* ctx.host.text(DRAG_IDS.readout),
      "moves=0",
    );
    yield* ctx.host.drag(DRAG_IDS.handle, 0, DRAG_BY);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the same drag runs the handle's moves",
      yield* ctx.host.text(DRAG_IDS.readout),
      "moves=8",
    );

    // The wheel is the path that works, so the scroller is not inert.
    yield* ctx.host.wheel(DRAG_IDS.scroller, 0, DRAG_WHEEL);
    yield* Effect.sleep(SETTLE);
    const wheeled = yield* offsetRead("after the wheel");
    yield* ctx.expectNear(
      "a wheel on the same scroller moves it",
      wheeled.y,
      DRAG_WHEEL,
      1,
    );
    yield* ctx.host.capture("scrollbar-drag-wheeled");
    const wheeledFrame = yield* ctx.host.pixels("scrollbar-drag-wheeled");
    const wheeledThumb = yield* ctx.expectSome(
      "the thumb paints after the wheel",
      thumbIn(wheeledFrame),
    );
    yield* ctx.expectNear(
      "the thumb follows the wheel it cannot be dragged by",
      wheeledThumb.y / scale,
      dragThumbAfter(wheeled.y).start,
      2,
    );
    yield* ctx.expectNear(
      "the thumb keeps its length",
      wheeledThumb.height / scale,
      DRAG_THUMB.length,
      1,
    );
  });

/**
 * What box an `<img>` paints, and what a style can make it paint.
 *
 * An image is the one element whose intrinsic ratio the runtime owns: GPUI
 * fills the element's own `aspect_ratio` from the decoded bitmap once it loads,
 * and the runtime hands the element the declared width ÷ height only when both
 * dimensions are definite pixels. A thumbnail, a preview card or a crop area
 * composes around which one wins, and a window's layout report is the only
 * place to read it.
 */
const ImageBoxProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.xl,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: theme.spacing.xl,
  };
  const image = (id: string, style?: object) => (
    <img
      testId={id}
      src={IMAGE_DATA_URL}
      alt="A solid square from a data URL"
      objectFit="fill"
      style={style}
    />
  );
  return (
    <div testId="image-box-probe" style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        An image owns its own ratio once it loads, so a declared aspect ratio is
        replaced by the bitmap&apos;s unless both dimensions are definite. A
        thumbnail declares both; a width alone gets the bitmap&apos;s square.
      </text>
      <div style={row}>
        {image(IMAGE_BOX_IDS.intrinsic)}
        {image(IMAGE_BOX_IDS.ratio, {
          width: IMAGE_WIDTH,
          aspectRatio: IMAGE_RATIO,
        })}
        {image(IMAGE_BOX_IDS.width, { width: IMAGE_WIDTH })}
        {image(IMAGE_BOX_IDS.both, {
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
        })}
      </div>
    </div>
  );
};

const imageBoxSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(IMAGE_BOX_IDS.ratio);
    // A bitmap arrives after the first layout, so each box is read once it has
    // a size and that size holds; a poll bounded at ~2 s still fails on the
    // value it settled on.
    const settled = (id: string) =>
      Effect.gen(function* () {
        const read = Effect.map(ctx.host.bounds(id), Option.fromNullishOr);
        const box = yield* settleUntil(
          read,
          Option.exists((found) => found.width > 0 && found.height > 0),
        );
        return yield* ctx.expectSome(`${id} reports its painted box`, box);
      });

    yield* Effect.forEach(
      IMAGE_BOX_CASES,
      (expectation: ImageBoxExpectation) =>
        Effect.gen(function* () {
          const box = yield* settled(expectation.id);
          yield* ctx.expectNear(
            `${expectation.id} paints the width its case expects`,
            box.width,
            expectation.width,
            1,
          );
          yield* ctx.expectNear(
            `${expectation.id} paints the height its case expects`,
            box.height,
            expectation.height,
            1,
          );
        }),
      { concurrency: 1, discard: true },
    );

    const ratio = yield* settled(IMAGE_BOX_IDS.ratio);
    const both = yield* settled(IMAGE_BOX_IDS.both);
    yield* ctx.expectNear(
      "the style ratio is replaced by the loaded bitmap's own",
      ratio.height,
      ratio.width,
      1,
    );
    yield* ctx.expectNear(
      "two definite dimensions keep the box the style asked for",
      both.height,
      IMAGE_HEIGHT,
      1,
    );
    yield* ctx.expectEqual(
      "the bitmap's ratio and the declared box paint different heights",
      ratio.height > both.height,
      true,
    );
    const intrinsic = yield* settled(IMAGE_BOX_IDS.intrinsic);
    yield* ctx.expectNear(
      "an unsized image paints the bitmap's intrinsic edge",
      intrinsic.width,
      IMAGE_INTRINSIC_SIZE,
      1,
    );
  });

/**
 * Where a bitmap's pixels land in a box of a different ratio.
 *
 * `image-box` measured the box an `<img>` paints; this measures the paint
 * **inside** it. The fixture's bitmap is 40×20 with three unequal bands, so
 * every mode answers with a different placement: `fill` stretches the bands
 * across the box, `contain` letterboxes the same run, `cover` crops the outer
 * bands, and `scaleDown`/`none` keep the bitmap's own size — one centred, the
 * other anchored at the box's origin. The page is read at each edge the bitmap
 * does not reach, and the last sample clips a `borderRadius` circle so the
 * corner it removes is a measurement rather than a claim.
 */
const ImageFitProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.lg,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: theme.spacing.lg,
  };
  const pixels = fitPixels();
  const FitImage = ({ image }: { readonly image: FitCase }): ReactNode => {
    const ref = useRef<ImgInstance>(null);
    useLayoutEffect(() => {
      ref.current?.setImagePixels(
        FIT_SOURCE_WIDTH,
        FIT_SOURCE_HEIGHT,
        Buffer.from(pixels),
      );
    }, []);
    return (
      <img
        testId={image.id}
        ref={ref}
        alt={`Bitmap painted with objectFit ${Option.getOrElse(image.fit, () => "absent")}`}
        objectFit={Option.getOrUndefined(image.fit)}
        style={{
          width: image.box.width,
          height: image.box.height,
          borderRadius: Option.getOrElse(image.radius, () => 0),
        }}
      />
    );
  };
  return (
    <div testId="image-fit-probe" style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A bitmap in a box of another ratio: fill stretches it, contain
        letterboxes it, cover crops it, scaleDown keeps its size centred, none
        keeps it at the box&apos;s origin, and an absent prop paints what
        contain paints.
      </text>
      <div style={row}>
        {Arr.map(Arr.take(FIT_CASES, 4), (image) => (
          <FitImage key={image.id} image={image} />
        ))}
      </div>
      <div style={row}>
        {Arr.map(Arr.drop(FIT_CASES, 4), (image) => (
          <FitImage key={image.id} image={image} />
        ))}
      </div>
    </div>
  );
};

const imageFitSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* Effect.forEach(FIT_CASES, (image) => ctx.host.waitFor(image.id), {
      concurrency: 1,
      discard: true,
    });
    yield* ctx.host.capture("image-fit");
    const frame = yield* ctx.host.pixels("image-fit");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const pageHex = palettes.dark.colors.background;
    const page = yield* ctx.expectSome(
      "the page's role is a colour a sample can be compared with",
      Option.fromNullishOr(Pixels.hexToRgba(pageHex)),
    );

    const boxOf = (id: string) =>
      Effect.gen(function* () {
        return yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(yield* ctx.host.bounds(id)),
        );
      });
    const at = (box: PaintBox, point: { x: number; y: number }) =>
      ctx.expectSome(
        "the sampled point is inside the capture",
        colourAt(frame, { x: box.x + point.x, y: box.y + point.y }, scale),
      );

    yield* Effect.forEach(
      FIT_CASES,
      (image) =>
        Effect.gen(function* () {
          const box = yield* boxOf(image.id);
          yield* ctx.expectNear(
            `${image.id} paints the width its box asks for`,
            box.width,
            image.box.width,
            1,
          );
          yield* ctx.expectNear(
            `${image.id} paints the height its box asks for`,
            box.height,
            image.box.height,
            1,
          );
          yield* Effect.forEach(
            bandSamples(image),
            (sample) =>
              Effect.gen(function* () {
                const colour = yield* at(box, sample);
                yield* ctx.expectEqual(
                  `${image.id} paints its ${sample.band.name} band where the fit places it`,
                  isColour(colour, bandHex(sample.band)),
                  true,
                );
              }),
            { concurrency: 1, discard: true },
          );
          yield* Effect.forEach(
            edgeSamples(image),
            (sample) =>
              Effect.gen(function* () {
                const colour = yield* at(box, sample);
                yield* ctx.expectEqual(
                  sample.expected === "page"
                    ? `${image.id} leaves the page at its ${sample.edge} edge`
                    : `${image.id} paints the bitmap at its ${sample.edge} edge`,
                  sample.expected === "page"
                    ? isColour(colour, pageHex)
                    : differs(colour, page),
                  true,
                );
              }),
            { concurrency: 1, discard: true },
          );
        }),
      { concurrency: 1, discard: true },
    );

    // The rounded case: the clip removes the corner, leaves the top middle and
    // the centre, and the box it clips is the same square.
    const rounded = yield* ctx.expectSome(
      "the fixture declares a rounded case",
      roundCase,
    );
    const roundBox = yield* boxOf(rounded.id);
    yield* Effect.forEach(
      roundSamples(rounded),
      (sample) =>
        Effect.gen(function* () {
          const colour = yield* at(roundBox, sample);
          yield* ctx.expectEqual(
            sample.expected === "page"
              ? "a rounded image paints the page in the corner its radius cuts"
              : `a rounded image keeps painting its bitmap at its ${sample.what}`,
            sample.expected === "page"
              ? isColour(colour, pageHex)
              : differs(colour, page),
            true,
          );
        }),
      { concurrency: 1, discard: true },
    );
  });

/**
 * What a `boxShadow` paints, one property per box.
 *
 * The library's whole elevation contract is this one `StyleDesc` field: a card,
 * a popover, a menu and a dialog separate from the page with the theme's
 * `elevation` level, and the capability record called `boxShadow` supported
 * because the field exists. So the fixture asks the runtime for each claim in
 * turn — an offset, a blur, a spread, an inset and its outset twin of the same
 * geometry, a two-entry list, a colour the parser cannot read, and the shipped
 * resting and deepest levels on the page they lift — and the reads sample points
 * whose distance is a constant.
 */
const ElevationProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: 16,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 60,
    height: ELEVATION_ROW,
  };
  const lifted = (shadow: StyleDesc["boxShadow"]): StyleDesc => ({
    width: ELEVATION_WIDTH,
    height: ELEVATION_HEIGHT,
    backgroundColor: ELEVATION_FILL,
    boxShadow: shadow,
  });
  const down = {
    offsetX: 0,
    offsetY: ELEVATION_OFFSET,
    blurRadius: 0,
    spreadRadius: 0,
  };
  const spread = {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: ELEVATION_SPREAD,
  };
  const raised = (level: "sm" | "lg"): StyleDesc => ({
    width: ELEVATION_RAISED.width,
    height: ELEVATION_RAISED.height,
    backgroundColor: theme.colors.popover,
    boxShadow: elevationShadow(theme, level),
  });
  return (
    <div testId="elevation-probe" style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A shadow paints outside the box it lifts, inside it when inset, in the
        colour it asks for.
      </text>
      <div style={{ height: 24 }} />
      <div style={row}>
        <div
          testId={ELEVATION_IDS.offset}
          style={lifted({ ...down, color: ELEVATION_SHADOW })}
        />
        <div
          testId={ELEVATION_IDS.blur}
          style={lifted({
            ...down,
            offsetY: 0,
            blurRadius: ELEVATION_BLUR,
            color: ELEVATION_SHADOW,
          })}
        />
        <div
          testId={ELEVATION_IDS.spread}
          style={lifted({ ...spread, color: ELEVATION_SHADOW })}
        />
        <div
          testId={ELEVATION_IDS.inset}
          style={lifted({ ...spread, color: ELEVATION_SHADOW, inset: true })}
        />
      </div>
      <div style={row}>
        <div
          testId={ELEVATION_IDS.outset}
          style={lifted({ ...spread, color: ELEVATION_SHADOW })}
        />
        <div
          testId={ELEVATION_IDS.stacked}
          style={lifted([
            { ...down, color: ELEVATION_SHADOW },
            { ...down, offsetY: -ELEVATION_OFFSET, color: ELEVATION_SECOND },
          ])}
        />
        <div
          testId={ELEVATION_IDS.unreadable}
          style={lifted({ ...down, color: ELEVATION_UNREADABLE })}
        />
      </div>
      <div style={row}>
        <div testId={ELEVATION_IDS.resting} style={raised("sm")} />
        <div testId={ELEVATION_IDS.deepest} style={raised("lg")} />
      </div>
    </div>
  );
};

const elevationSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(ELEVATION_IDS.offset);
    const window = yield* ctx.host.windowSize();
    yield* ctx.host.capture("elevation-paint");
    const frame = yield* ctx.host.pixels("elevation-paint");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const pageHex = palettes.dark.colors.background;
    const page = yield* ctx.expectSome(
      "the page's role is a colour a sample can be compared with",
      Option.fromNullishOr(Pixels.hexToRgba(pageHex)),
    );

    const boxOf = (id: string) =>
      Effect.gen(function* () {
        const painted = yield* ctx.host.bounds(id);
        return yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(painted),
        );
      });

    /** The colour the capture paints at a logical point. */
    const at = (point: PaintPoint) =>
      ctx.expectSome(
        "the sampled point is inside the capture",
        colourAt(frame, point, scale),
      );

    // 1. An offset shadow paints a band below its box, and nothing above it.
    const offset = yield* boxOf(ELEVATION_IDS.offset);
    const offsetPoints = aroundBox(offset, ELEVATION_NEAR);
    const offsetAbove = aroundBox(offset, ELEVATION_INSIDE);
    const below = yield* at({
      x: offsetPoints.middleX,
      y: offsetPoints.below,
    });
    const inside = yield* at({
      x: offsetPoints.middleX,
      y: offsetPoints.middleY,
    });
    const above = yield* at({
      x: offsetAbove.middleX,
      y: offsetAbove.above,
    });
    const farBelow = yield* at({
      x: offsetPoints.middleX,
      y: offset.y + offset.height + ELEVATION_FAR,
    });
    yield* ctx.expectEqual(
      "an offset shadow paints below the box it lifts",
      isColour(below, ELEVATION_SHADOW),
      true,
    );
    yield* ctx.expectEqual(
      "the shadow is behind the box, which keeps its own fill",
      isColour(inside, ELEVATION_FILL),
      true,
    );
    yield* ctx.expectEqual(
      "a downward offset paints nothing above the box",
      isColour(above, pageHex),
      true,
    );
    yield* ctx.expectEqual(
      "an offset shadow stops where its offset ends",
      isColour(farBelow, pageHex),
      true,
    );

    // The band it covers is the shadow's colour and nothing else.
    const band = {
      x: offset.x + 1,
      y: offset.y + offset.height + 1,
      width: offset.width - 2,
      height: ELEVATION_OFFSET - 2,
    };
    const bandPixels = yield* ctx.expectSome(
      "the band under the offset box is inside the capture",
      countPaint(frame, band, scale, ELEVATION_SHADOW),
    );
    yield* ctx.expectEqual(
      "the band an offset shadow covers is its own colour throughout",
      bandPixels,
      Math.round(band.width * band.height * scale * scale),
    );

    // 2. A blur reaches past the edge and fades with distance.
    const blur = yield* boxOf(ELEVATION_IDS.blur);
    const blurPoints = aroundBox(blur, 0);
    const blurNear = yield* at({
      x: blurPoints.middleX,
      y: blur.y + blur.height + ELEVATION_FADE_NEAR,
    });
    const blurMid = yield* at({
      x: blurPoints.middleX,
      y: blur.y + blur.height + ELEVATION_FADE_MID,
    });
    const blurFar = yield* at({
      x: blurPoints.middleX,
      y: blur.y + blur.height + ELEVATION_FAR,
    });
    yield* ctx.expectEqual(
      "a blurred shadow paints past the edge of its box",
      differs(blurNear, page),
      true,
    );
    yield* ctx.expectEqual(
      "a blurred shadow fades as the distance from the box grows",
      distanceFrom(blurNear, page) > distanceFrom(blurMid, page),
      true,
    );
    yield* ctx.expectEqual(
      "a blurred shadow reaches no further than its radius",
      isColour(blurFar, pageHex),
      true,
    );

    // 3. A spread paints every side the offset alone leaves bare.
    const spread = yield* boxOf(ELEVATION_IDS.spread);
    const spreadPoints = aroundBox(spread, ELEVATION_INSIDE);
    const spreadAbove = yield* at({
      x: spreadPoints.middleX,
      y: spreadPoints.above,
    });
    const spreadLeft = yield* at({
      x: spreadPoints.left,
      y: spreadPoints.middleY,
    });
    const spreadBelow = yield* at({
      x: spreadPoints.middleX,
      y: spreadPoints.below,
    });
    yield* ctx.expectEqual(
      "a spread shadow paints above the box",
      isColour(spreadAbove, ELEVATION_SHADOW),
      true,
    );
    yield* ctx.expectEqual(
      "a spread shadow paints to the left of the box",
      isColour(spreadLeft, ELEVATION_SHADOW),
      true,
    );
    yield* ctx.expectEqual(
      "a spread shadow paints below the box",
      isColour(spreadBelow, ELEVATION_SHADOW),
      true,
    );

    // 4. Inset paints on the inside of the same geometry the outset paints on
    //    the outside of — the pair is the measurement.
    const inset = yield* boxOf(ELEVATION_IDS.inset);
    const insetPoints = aroundBox(inset, ELEVATION_INSIDE);
    const insetInside = yield* at({
      x: insetPoints.middleX,
      y: inset.y + ELEVATION_INSIDE,
    });
    const insetMiddle = yield* at({
      x: insetPoints.middleX,
      y: insetPoints.middleY,
    });
    const insetOutside = yield* at({
      x: insetPoints.middleX,
      y: insetPoints.above,
    });
    yield* ctx.expectEqual(
      "an inset shadow paints inside the box",
      isColour(insetInside, ELEVATION_SHADOW),
      true,
    );
    yield* ctx.expectEqual(
      "an inset shadow leaves the box's own fill in the middle",
      isColour(insetMiddle, ELEVATION_FILL),
      true,
    );
    yield* ctx.expectEqual(
      "an inset shadow paints nothing outside the box",
      isColour(insetOutside, pageHex),
      true,
    );

    const outset = yield* boxOf(ELEVATION_IDS.outset);
    const outsetPoints = aroundBox(outset, ELEVATION_INSIDE);
    const outsetAbove = yield* at({
      x: outsetPoints.middleX,
      y: outsetPoints.above,
    });
    const outsetInside = yield* at({
      x: outsetPoints.middleX,
      y: outset.y + ELEVATION_INSIDE,
    });
    yield* ctx.expectEqual(
      "the same geometry without inset paints outside the box",
      isColour(outsetAbove, ELEVATION_SHADOW),
      true,
    );
    yield* ctx.expectEqual(
      "an outset shadow leaves the box's fill at its inside edge",
      isColour(outsetInside, ELEVATION_FILL),
      true,
    );

    // 5. A list paints every entry, one on each side.
    const stacked = yield* boxOf(ELEVATION_IDS.stacked);
    const stackedPoints = aroundBox(stacked, ELEVATION_NEAR);
    const stackedAbove = yield* at({
      x: stackedPoints.middleX,
      y: stackedPoints.above,
    });
    const stackedBelow = yield* at({
      x: stackedPoints.middleX,
      y: stackedPoints.below,
    });
    yield* ctx.expectEqual(
      "a shadow list paints its first entry below the box",
      isColour(stackedBelow, ELEVATION_SHADOW),
      true,
    );
    yield* ctx.expectEqual(
      "the same list paints its second entry above the box",
      isColour(stackedAbove, ELEVATION_SECOND),
      true,
    );

    // 6. A colour the parser cannot read paints no shadow at all.
    const unreadable = yield* boxOf(ELEVATION_IDS.unreadable);
    const unreadablePoints = aroundBox(unreadable, ELEVATION_NEAR);
    const unreadableBelow = yield* at({
      x: unreadablePoints.middleX,
      y: unreadablePoints.below,
    });
    yield* ctx.expectEqual(
      "a shadow colour the runtime cannot parse paints nothing",
      isColour(unreadableBelow, pageHex),
      true,
    );

    // 7. The shipped levels reach the glass, and the deepest reaches further.
    const resting = yield* boxOf(ELEVATION_IDS.resting);
    const deepest = yield* boxOf(ELEVATION_IDS.deepest);
    const restingFar = yield* at({
      x: resting.x + resting.width / 2,
      y: resting.y + resting.height + ELEVATION_DEPTH,
    });
    const deepestNear = yield* at({
      x: deepest.x + deepest.width / 2,
      y: deepest.y + deepest.height + ELEVATION_DEPTH,
    });
    yield* ctx.expectEqual(
      "a surface raised to the deepest level shades the page below it",
      distanceFrom(deepestNear, page) > 0,
      true,
    );
    yield* ctx.expectEqual(
      "the deepest level's shade is darker than the page it falls on",
      distanceFrom(deepestNear, page) > 0 &&
        deepestNear.r <= page.r &&
        deepestNear.g <= page.g &&
        deepestNear.b <= page.b,
      true,
    );
    yield* ctx.expectEqual(
      "the resting level reaches no further than the deepest one",
      isColour(restingFar, pageHex),
      true,
    );
  });

/**
 * What `opacity` paints: one share per box, a parent that fades the ink its child
 * paints, and a shadow under a faded box. The checks are the orderings a fade
 * owes rather than exact bytes, because the runtime composites in its own space.
 */
const OpacityProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const page = {
    width: window.width,
    height: window.height,
    padding: 16,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 40,
    height: 150,
  };
  const box = (opacity: number): StyleDesc => ({
    width: OPACITY_WIDTH,
    height: OPACITY_HEIGHT,
    backgroundColor: OPACITY_FILL,
    opacity,
  });
  /** A box at `opacity` holding a full-colour line, so a parent's share reaches it. */
  const withInk = (testId: string, inkId: string, opacity: number) => (
    <div testId={testId} style={box(opacity)}>
      <text
        testId={inkId}
        style={{ ...textStyle(theme, "body"), color: OPACITY_INK }}
      >
        GPUIXUI FADES
      </text>
    </div>
  );
  return (
    <div testId="opacity-probe" style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Opacity mixes a box with the page, reaches the ink its children paint,
        and fades the shadow it casts.
      </text>
      <div style={{ height: 24 }} />
      <div style={row}>
        <div testId={OPACITY_IDS.full} style={box(1)} />
        <div testId={OPACITY_IDS.half} style={box(OPACITY_HALF)} />
        <div testId={OPACITY_IDS.quarter} style={box(OPACITY_QUARTER)} />
        <div testId={OPACITY_IDS.hidden} style={box(0)} />
        <div testId={OPACITY_IDS.clamped} style={box(OPACITY_ABOVE_ONE)} />
      </div>
      <div style={row}>
        {withInk(OPACITY_IDS.exactParent, OPACITY_IDS.exactInk, 1)}
        {withInk(OPACITY_IDS.fadedParent, OPACITY_IDS.fadedInk, OPACITY_HALF)}
        <div
          testId={OPACITY_IDS.shadow}
          style={{
            ...box(OPACITY_HALF),
            boxShadow: {
              offsetX: 0,
              offsetY: OPACITY_SHADOW_OFFSET,
              blurRadius: 0,
              spreadRadius: 0,
              color: OPACITY_SHADOW,
            },
          }}
        />
      </div>
    </div>
  );
};

const opacitySteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(OPACITY_IDS.full);
    const window = yield* ctx.host.windowSize();
    yield* ctx.host.capture("opacity-paint");
    const frame = yield* ctx.host.pixels("opacity-paint");
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const pageHex = palettes.dark.colors.background;
    const page = yield* ctx.expectSome(
      "the page's role is a colour a sample can be compared with",
      Option.fromNullishOr(Pixels.hexToRgba(pageHex)),
    );
    const fill = yield* ctx.expectSome(
      "the box's fill is a colour a sample can be compared with",
      Option.fromNullishOr(Pixels.hexToRgba(OPACITY_FILL)),
    );

    const boxOf = (id: string) =>
      Effect.gen(function* () {
        const painted = yield* ctx.host.bounds(id);
        return yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(painted),
        );
      });

    const at = (point: PaintPoint) =>
      ctx.expectSome(
        "the sampled point is inside the capture",
        colourAt(frame, point, scale),
      );

    /** The middle of a box, which no child ink covers. */
    const middleOf = (id: string) =>
      Effect.gen(function* () {
        const painted = yield* boxOf(id);
        return yield* at({
          x: painted.x + 4,
          y: painted.y + painted.height - 4,
        });
      });

    // 1. The two ends: a share of one is the fill, a share of zero is the page.
    const opaque = yield* middleOf(OPACITY_IDS.full);
    const hidden = yield* middleOf(OPACITY_IDS.hidden);
    yield* ctx.expectEqual(
      "a box at opacity 1 paints its own fill",
      isColour(opaque, OPACITY_FILL),
      true,
    );
    yield* ctx.expectEqual(
      "a box at opacity 0 paints nothing over the page",
      isColour(hidden, pageHex),
      true,
    );

    // 2. A share mixes the fill with the page, in the share's direction.
    const half = yield* middleOf(OPACITY_IDS.half);
    const quarter = yield* middleOf(OPACITY_IDS.quarter);
    yield* ctx.expectEqual(
      "a half-opacity box paints the fill mixed with the page at half",
      withinBytes(half, mixedAt(fill, page, OPACITY_HALF)),
      true,
    );
    yield* ctx.expectEqual(
      "a quarter-opacity box reads nearer the page than a half-opacity one",
      distanceFrom(quarter, page) < distanceFrom(half, page),
      true,
    );

    // 3. A share above one is not a brighter colour: it is the fill.
    const clamped = yield* middleOf(OPACITY_IDS.clamped);
    yield* ctx.expectEqual(
      "an opacity above one paints the fill at full strength",
      isColour(clamped, OPACITY_FILL),
      true,
    );

    // 4. A parent's share reaches the ink its child paints.
    const exactParent = yield* boxOf(OPACITY_IDS.exactParent);
    const fadedParent = yield* boxOf(OPACITY_IDS.fadedParent);
    const exactInk = yield* ctx.expectSome(
      "the opaque box's ink is inside the capture",
      countPaint(frame, exactParent, scale, OPACITY_INK),
    );
    const fadedInk = yield* ctx.expectSome(
      "the faded box's ink is inside the capture",
      countPaint(frame, fadedParent, scale, OPACITY_INK),
    );
    yield* ctx.expectEqual(
      "an opaque box paints its child's ink at full colour",
      exactInk > 0,
      true,
    );
    yield* ctx.expectEqual(
      "a half-opacity parent fades the ink its child paints",
      fadedInk,
      0,
    );

    // 5. A shadow under a faded box fades with it, and stays a shadow.
    const shadow = yield* boxOf(OPACITY_IDS.shadow);
    const shade = yield* at({
      x: shadow.x + shadow.width / 2,
      y: shadow.y + shadow.height + OPACITY_SHADOW_SAMPLE,
    });
    yield* ctx.expectEqual(
      "a faded box's shadow is no longer its own colour",
      isColour(shade, OPACITY_SHADOW),
      false,
    );
    yield* ctx.expectEqual(
      "the faded shadow still paints away from the page",
      differs(shade, page),
      true,
    );
  });

/**
 * `movable-tabs-lifecycle` — a tab dragged between two strips, and stepped by a
 * keyboard.
 *
 * Tier 4's **detachable / movable tabs** row is `partial` because the binding
 * opens one window per process; the half a window can prove is the move inside
 * it. `workspace-tab-drag` measured the state arithmetic in a `TestRenderer`;
 * this probe asks what a real pointer and a real key do to it: whether the tab
 * keeps the pointer after it leaves its own strip, whether a drop resolves from
 * the group the pointer is actually over (not a distance heuristic), and what a
 * move costs the panel — it changes parent, so the draft has to live above the
 * strips and the focus has to be restored by the app.
 */
const MovableTabsProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const renderer = useGpuix().renderer;
  const layoutRef = useRef<TabLayout>(TAB_GROUP_INITIAL);
  const [layout, setLayout] = useState<TabLayout>(TAB_GROUP_INITIAL);
  const [draft, setDraft] = useState<
    Option.Option<{ readonly tab: string; readonly value: string }>
  >(Option.none());
  const [moves, setMoves] = useState(0);
  const [misses, setMisses] = useState(0);
  const groups = useRef<ReadonlyArray<GroupBox>>([]);
  const tabBoxes = useRef<ReadonlyArray<TabBox>>([]);
  const tabIds = useRef<Partial<Record<string, number>>>({});
  const pressed = useRef<Option.Option<string>>(Option.none());
  const trail = useRef<
    Option.Option<{ readonly x: number; readonly y: number }>
  >(Option.none());
  const pendingFocus = useRef<Option.Option<string>>(Option.none());

  /** A move changes the tab's parent, so its element is new: focus it here. */
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (Option.isNone(pending)) return;
    pendingFocus.current = Option.none();
    const id = tabIds.current[pending.value];
    if (id !== undefined) renderer?.focusElement?.(id);
  });

  const commit = useCallback((next: TabLayout) => {
    layoutRef.current = next;
    setLayout(next);
    setMoves((count) => count + 1);
  }, []);

  /**
   * Apply the release over the last point the pointer reported.
   *
   * The group comes from the painted boxes, so the gap between the strips and
   * the space below them are misses rather than guesses; the slot comes from
   * the tab centres inside the destination strip.
   */
  const drop = useCallback(() => {
    const carried = pressed.current;
    const at = trail.current;
    pressed.current = Option.none();
    trail.current = Option.none();
    if (Option.isNone(carried) || Option.isNone(at)) return;
    const tab = carried.value;
    const point = at.value;
    Option.match(groupAt(point, groups.current), {
      onNone: () => setMisses((count) => count + 1),
      onSome: (destination) => {
        const boxes = Arr.filter(tabBoxes.current, (box) =>
          Arr.contains(layoutRef.current[destination].tabs, box.tab),
        );
        commit(
          moveTab(layoutRef.current, tab, {
            group: destination,
            index: insertionIndex(boxes, point.x),
          }),
        );
        pendingFocus.current = Option.some(tab);
      },
    });
  }, [commit]);

  /** A pointer that never moves a tab is a press, not a move: `trail` stays empty. */
  const press = useCallback((tab: string) => {
    pressed.current = Option.some(tab);
    trail.current = Option.none();
  }, []);

  const follow = useCallback((event: EventPayload) => {
    if (Option.isNone(pressed.current)) return;
    trail.current = Option.some({ x: event.x ?? 0, y: event.y ?? 0 });
  }, []);

  /** A press selects a tab without moving it; the panel follows the selection. */
  const select = useCallback((tab: string) => {
    Option.match(groupOf(layoutRef.current, tab), {
      onNone: () => {},
      onSome: (group) => {
        const next = {
          ...layoutRef.current,
          [group]: {
            ...layoutRef.current[group],
            selected: Option.some(tab),
          },
        };
        layoutRef.current = next;
        setLayout(next);
      },
    });
  }, []);

  /** One keyboard step inside the tab's own strip; it selects the tab it moved. */
  const step = useCallback(
    (tab: string, delta: -1 | 1) => {
      commit(stepMovableTab(layoutRef.current, tab, delta));
    },
    [commit],
  );

  const draftFor = (tab: string): string =>
    Option.match(draft, {
      onNone: () => "",
      onSome: (current) => (current.tab === tab ? current.value : ""),
    });

  const strip = (group: TabGroupId): ReactNode => (
    <div
      testId={stripId(group)}
      style={{
        display: "flex",
        flexDirection: "row",
        gap: theme.spacing.xs,
        padding: theme.spacing.xs,
        backgroundColor: theme.colors.muted,
        borderRadius: theme.radius.sm,
      }}
    >
      {Arr.map(layout[group].tabs, (tab) => (
        <div
          key={tab}
          testId={tabId(tab)}
          ref={(instance) => {
            tabIds.current[tab] = instance?.id;
          }}
          tabIndex={0}
          role="tab"
          aria-selected={Option.exists(
            layout[group].selected,
            (current) => current === tab,
          )}
          onClick={() => select(tab)}
          onMouseDown={() => press(tab)}
          onMouseMove={follow}
          onMouseUp={drop}
          onKeyDown={(event: EventPayload) => {
            if (
              event.modifiers?.cmd !== true ||
              event.modifiers?.shift !== true
            ) {
              return;
            }
            if (event.key === "right") step(tab, 1);
            if (event.key === "left") step(tab, -1);
          }}
          onLayout={(payload) =>
            Option.match(boxOf(payload), {
              onNone: () => {},
              onSome: (box) => {
                tabBoxes.current = [
                  ...Arr.filter(tabBoxes.current, (entry) => entry.tab !== tab),
                  { tab, x: box.x, width: box.width },
                ];
              },
            })
          }
          style={{
            padding: theme.spacing.xs,
            borderRadius: theme.radius.sm,
            ...keyboardFocusRing(theme),
            backgroundColor: Option.exists(
              layout[group].selected,
              (current) => current === tab,
            )
              ? theme.colors.card
              : theme.colors.background,
          }}
        >
          <text style={{ color: theme.colors.foreground }}>{tab}</text>
        </div>
      ))}
    </div>
  );

  const panel = (group: TabGroupId): ReactNode =>
    Option.match(layout[group].selected, {
      onNone: () => (
        <text
          testId={`${panelId(group)}-empty`}
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.placeholder,
          }}
        >
          empty strip
        </text>
      ),
      onSome: (tab) => (
        <div
          testId={panelId(group)}
          style={{
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.sm,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.xs,
          }}
        >
          <text
            testId={panelTitleId(group, tab)}
            style={{
              ...textStyle(theme, "body"),
              color: theme.colors.foreground,
            }}
          >
            {panelTitle(tab)}
          </text>
          <Input
            testId={panelFieldId(tab)}
            label={`${tab} draft`}
            value={draftFor(tab)}
            onValueChange={(value) => setDraft(Option.some({ tab, value }))}
          />
        </div>
      ),
    });

  return (
    <div
      testId="movable-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Drag a tab into the other strip, or Cmd+Shift+Arrow it inside its own:
        the panel follows, the draft stays and the gap is a miss.
      </text>
      <Readout testId={MOVABLE_READOUT}>
        {`${tabReadout(layout)} moves=${moves} misses=${misses}`}
      </Readout>
      <Readout testId={MOVABLE_DRAFT}>
        {`draft=${Option.match(draft, {
          onNone: () => "none",
          onSome: (current) => `${current.tab}:${current.value}`,
        })}`}
      </Readout>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: TAB_GROUP_GAP,
          alignItems: "flex-start",
        }}
      >
        {Arr.map(TAB_GROUP_IDS, (group) => (
          <div
            key={group}
            testId={groupBoxId(group)}
            onLayout={(payload) =>
              Option.match(boxOf(payload), {
                onNone: () => {},
                onSome: (box) => {
                  groups.current = [
                    ...Arr.filter(
                      groups.current,
                      (entry) => entry.group !== group,
                    ),
                    { group, ...box },
                  ];
                },
              })
            }
            style={{
              width: 280,
              height: 200,
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.sm,
              borderWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
              padding: theme.spacing.xs,
            }}
          >
            {strip(group)}
            {panel(group)}
          </div>
        ))}
      </div>
    </div>
  );
};

const movableTabsSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(MOVABLE_READOUT);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(MOVABLE_READOUT);
    const draft = () => ctx.host.text(MOVABLE_DRAFT);
    const painted = (id: string) =>
      Effect.flatMap(ctx.host.bounds(id), (box) =>
        ctx.expectSome(`${id} paints`, Option.fromNullishOr(box)),
      );
    /** Drag a tab so the pointer is released at a window point. */
    const dragTabTo = (tab: string, x: number, y: number) =>
      Effect.gen(function* () {
        const from = yield* painted(tabId(tab));
        yield* ctx.host.drag(
          tabId(tab),
          x - (from.x + from.width / 2),
          y - (from.y + from.height / 2),
        );
        yield* Effect.sleep(SETTLE);
      });

    // 1. Two strips on one row, separated by the dock's whole gap.
    const left = yield* painted(groupBoxId("left"));
    const right = yield* painted(groupBoxId("right"));
    yield* ctx.expectNear("the two strips sit on one row", right.y, left.y, 1);
    yield* ctx.expectNear(
      "the strips are separated by the dock's gap",
      right.x,
      left.x + left.width + TAB_GROUP_GAP,
      1,
    );
    yield* ctx.expectEqual(
      "the dock opens on its own layout",
      yield* readout(),
      `${tabReadout(TAB_GROUP_INITIAL)} moves=0 misses=0`,
    );

    // 2. A press selects a tab and mounts its panel.
    yield* ctx.host.click(tabId("bravo"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press selects the tab it hit",
      yield* readout(),
      "left=alpha,bravo,charlie selected=bravo",
    );
    yield* ctx.expectSome(
      "the selected tab's panel paints",
      Option.fromNullishOr(
        yield* ctx.host.bounds(panelTitleId("left", "bravo")),
      ),
    );

    // 3. The panel's draft is the app's data, not the panel element's.
    yield* ctx.host.click(panelFieldId("bravo"));
    yield* ctx.host.key("a");
    yield* ctx.host.key("b");
    yield* ctx.host.key("c");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing reaches the panel's draft",
      yield* draft(),
      "draft=bravo:abc",
    );

    // 4. Drag the tab out of its strip and drop it at the other strip's start.
    const rightStrip = yield* painted(stripId("right"));
    yield* dragTabTo(
      "bravo",
      rightStrip.x + 2,
      rightStrip.y + rightStrip.height / 2,
    );
    yield* ctx.expectContains(
      "the drop moves the tab into the destination strip at its slot",
      yield* readout(),
      "left=alpha,charlie selected=charlie | right=bravo,delta,echo selected=bravo",
    );
    const moved = yield* painted(tabId("bravo"));
    yield* ctx.expectEqual(
      "the moved tab paints inside the destination group",
      moved.x >= right.x && moved.x + moved.width <= right.x + right.width,
      true,
    );
    yield* ctx.expectNear(
      "the moved tab paints on the destination strip's row",
      moved.y,
      (yield* painted(tabId("delta"))).y,
      1,
    );
    yield* ctx.expectSome(
      "the moved tab's panel and title paint in the destination",
      Option.fromNullishOr(
        yield* ctx.host.bounds(panelTitleId("right", "bravo")),
      ),
    );
    yield* ctx.expectEqual(
      "the source strip mounts the tab it selected instead",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(panelTitleId("left", "bravo")),
        ),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "the draft survives the panel's remount",
      yield* draft(),
      "draft=bravo:abc",
    );
    yield* ctx.expectEqual(
      "the app restores focus to the tab it moved",
      yield* focusedAfterPaint(ctx),
      tabId("bravo"),
    );

    // 5. Cmd+Shift+Right steps the focused tab inside its strip and keeps focus.
    yield* ctx.host.focusElement(tabId("bravo"));
    yield* ctx.host.key("cmd-shift-right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a keyboard step reorders the strip it is in",
      yield* readout(),
      "right=delta,bravo,echo selected=bravo",
    );
    yield* ctx.expectEqual(
      "a keyboard step keeps the focus on the tab it moved",
      yield* focusedAfterPaint(ctx),
      tabId("bravo"),
    );

    // 6. The end of the strip is the end of the travel: no wrap, no second move.
    yield* ctx.host.key("cmd-shift-right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "holding the step reaches the end of the strip",
      yield* readout(),
      "right=delta,echo,bravo selected=bravo",
    );
    yield* ctx.host.key("cmd-shift-right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a step past the end leaves the order alone",
      yield* readout(),
      "right=delta,echo,bravo selected=bravo",
    );
    yield* ctx.host.key("cmd-shift-left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a step back returns the tab one slot",
      yield* readout(),
      "right=delta,bravo,echo selected=bravo",
    );

    // 7. A release below both strips is a miss, not a drop on the nearer one.
    const carried = yield* painted(tabId("echo"));
    yield* ctx.host.drag(
      tabId("echo"),
      0,
      left.y + left.height + 80 - (carried.y + carried.height / 2),
    );
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a release outside both strips is a miss",
      yield* readout(),
      "misses=1",
    );
    yield* ctx.expectContains(
      "a miss leaves both orders alone",
      yield* readout(),
      "left=alpha,charlie selected=charlie | right=delta,bravo,echo",
    );

    // 8. A tab moves back the other way, into the slot it was dropped on.
    const charlie = yield* painted(tabId("charlie"));
    yield* dragTabTo("echo", charlie.x + 2, charlie.y + charlie.height / 2);
    yield* ctx.expectContains(
      "a drop on the other strip's slot inserts the tab there",
      yield* readout(),
      "left=alpha,echo,charlie selected=echo | right=delta,bravo selected=bravo",
    );
    yield* ctx.expectEqual(
      "the draft is still the moved tab's after a second move",
      yield* draft(),
      "draft=bravo:abc",
    );
    yield* ctx.host.capture("movable-tabs");
  });

/**
 * The chord a desktop list selects with: `shift` extends from the row the
 * reader last chose, `cmd` toggles one record, `cmd-shift` adds the range, and
 * a plain press replaces the set.
 *
 * The runtime reports the held modifiers on the click event and the automation
 * protocol takes them, but `AsyncSmokeHost` had no verb that holds one, so no
 * probe had ever measured a modifier press. The readout prints the four flags
 * the payload carried, so the probe reads the event rather than assuming the
 * chord arrived, and the selection's paint is counted from the frame because a
 * window reports no style.
 */
const ModifierSelectProbe = (): ReactNode => {
  const theme = useTheme();
  const [selection, setSelection] = useState<RowSelection>(emptySelection);
  const [last, setLast] = useState<Option.Option<LastPress>>(Option.none());
  const [presses, setPresses] = useState(0);

  const press = (index: number, event: EventPayload) => {
    const modifiers = pressedModifiers(event.modifiers);
    setSelection((current) => selectRow(current, index, modifiers));
    setLast(
      Option.some({
        modifiers,
        clickCount: Option.getOrElse(
          Option.fromNullishOr(event.clickCount),
          () => 0,
        ),
      }),
    );
    setPresses((count) => count + 1);
  };

  return (
    <div
      style={{
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        testId={MODIFIER_SELECT_IDS.caption}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A list selected by chord: shift extends from the anchor, cmd toggles one
        record, cmd-shift adds the range.
      </text>
      <div
        testId={MODIFIER_SELECT_IDS.list}
        style={{
          width: 320,
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(Arr.range(0, MODIFIER_ROWS - 1), (index) => {
          const chosen = Arr.contains(selection.chosen, index);
          return (
            <div
              key={index}
              testId={MODIFIER_SELECT_IDS.row(index)}
              tabIndex={0}
              role="option"
              aria-selected={chosen}
              onClick={(event: EventPayload) => press(index, event)}
              style={{
                display: "flex",
                alignItems: "center",
                height: MODIFIER_ROW_HEIGHT,
                paddingLeft: theme.spacing.sm,
                backgroundColor: chosen
                  ? theme.colors.selected
                  : theme.colors.card,
                borderBottomWidth: theme.borderWidth.thin,
                borderColor: theme.colors.border,
                ...keyboardFocusRing(theme),
              }}
            >
              <text
                style={{
                  ...textStyle(theme, "body"),
                  color: chosen
                    ? theme.colors.selectedForeground
                    : theme.colors.foreground,
                }}
              >
                {`File ${index}`}
              </text>
            </div>
          );
        })}
      </div>
      <text
        testId={MODIFIER_SELECT_IDS.readout}
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
        }}
      >
        {selectionState(selection, last, presses)}
      </text>
    </div>
  );
};

const modifierSelectSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(MODIFIER_SELECT_IDS.list);
    yield* Effect.sleep(SETTLE);

    const theme = palettes.dark;
    const readout = () => ctx.host.text(MODIFIER_SELECT_IDS.readout);
    const none = "cmd:false,ctrl:false,alt:false,shift:false";
    const shift = "cmd:false,ctrl:false,alt:false,shift:true";
    const cmd = "cmd:true,ctrl:false,alt:false,shift:false";
    const both = "cmd:true,ctrl:false,alt:false,shift:true";

    /** The readout after a press: the state the chord leaves and the payload it sent. */
    const expected = (
      chosen: string,
      anchor: string,
      chord: string,
      flags: string,
      presses: number,
    ): string =>
      `selected=${chosen} anchor=${anchor} mods=${chord} flags=${flags} click=1 presses=${presses}`;

    // 1. A list opens with nothing chosen and no press delivered.
    yield* ctx.expectEqual(
      "the list opens with nothing chosen and no press delivered",
      yield* readout(),
      "selected=none anchor=none mods=none flags=none click=none presses=0",
    );

    // 2. A plain press is a set of one, and it anchors the next range.
    yield* ctx.host.click(MODIFIER_SELECT_IDS.row(3));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a plain press selects the record it hit",
      yield* readout(),
      expected("3", "3", "none", none, 1),
    );
    yield* ctx.expectEqual(
      "the pressed row holds the focus",
      yield* focusedAfterPaint(ctx),
      MODIFIER_SELECT_IDS.row(3),
    );

    // 3. Shift extends the range from the anchor, not from the pressed row.
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(6), ["shift"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "shift extends the selection from the anchor",
      yield* readout(),
      expected("3,4,5,6", "3", "shift", shift, 2),
    );

    // 4. The same chord re-ranges backwards; the anchor does not move.
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(1), ["shift"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a backwards range replaces the last one",
      yield* readout(),
      expected("1,2,3", "3", "shift", shift, 3),
    );

    // 5. Cmd adds one record and becomes the new anchor.
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(5), ["cmd"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cmd adds the record it hit and moves the anchor to it",
      yield* readout(),
      expected("1,2,3,5", "5", "cmd", cmd, 4),
    );
    yield* ctx.expectEqual(
      "a chord press holds the focus the plain press does",
      yield* focusedAfterPaint(ctx),
      MODIFIER_SELECT_IDS.row(5),
    );

    // 6. The same chord again removes it, because a toggle is a toggle.
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(5), ["cmd"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cmd removes a record it already chose",
      yield* readout(),
      expected("1,2,3", "5", "cmd", cmd, 5),
    );

    // 7. A toggle inside the set removes and re-adds one record.
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(3), ["cmd"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a toggle removes the record it hit from the middle of the set",
      yield* readout(),
      expected("1,2", "3", "cmd", cmd, 6),
    );
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(3), ["cmd"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a second toggle restores it in ascending order",
      yield* readout(),
      expected("1,2,3", "3", "cmd", cmd, 7),
    );

    // 8. A plain press replaces the whole set, so the next range starts there.
    yield* ctx.host.click(MODIFIER_SELECT_IDS.row(4));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a plain press replaces the set a chord built",
      yield* readout(),
      expected("4", "4", "none", none, 8),
    );
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(7), ["shift"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a range after a plain press starts at that press, not at the last toggle",
      yield* readout(),
      expected("4,5,6,7", "4", "shift", shift, 9),
    );

    // 9. Cmd-shift adds the range to the set instead of replacing it.
    yield* ctx.host.clickWith(MODIFIER_SELECT_IDS.row(2), ["cmd", "shift"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "cmd-shift adds the range and keeps the existing set",
      yield* readout(),
      expected("2,3,4,5,6,7", "4", "cmd-shift", both, 10),
    );

    // 10. The paint follows the set: the chosen rows wear the selected fill and
    //     the rows outside it do not.
    yield* ctx.host.hover(MODIFIER_SELECT_IDS.caption);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("modifier-select");
    const frame = yield* ctx.host.pixels("modifier-select");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const fill = yield* ctx.expectSome(
      "the theme names the selected fill",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.selected)),
    );
    /** The capture pixels a logical box covers. */
    const regionOf = (box: Smoke.Bounds): Pixels.PixelRegion =>
      new Pixels.PixelRegion({
        x: Math.round(box.x * scale),
        y: Math.round(box.y * scale),
        width: Math.round(box.width * scale),
        height: Math.round(box.height * scale),
      });
    const inside = yield* paintedBox(ctx, MODIFIER_SELECT_IDS.row(2));
    const insideCrop = yield* ctx.expectSome(
      "a chosen row's box is inside the capture",
      Option.fromNullishOr(Pixels.crop(frame, regionOf(inside))),
    );
    yield* ctx.expectEqual(
      "a row inside the set paints the selected fill",
      Pixels.countColour(insideCrop, fill) > 0,
      true,
    );
    const outside = yield* paintedBox(ctx, MODIFIER_SELECT_IDS.row(0));
    const outsideCrop = yield* ctx.expectSome(
      "a row outside the set is inside the capture too",
      Option.fromNullishOr(Pixels.crop(frame, regionOf(outside))),
    );
    yield* ctx.expectEqual(
      "a row outside the set paints none of it",
      Pixels.countColour(outsideCrop, fill),
      0,
    );

    // 11. The harness cannot synthesize a double press: the second press on the
    //     same row still reports one click, so a caller who needs a double
    //     press drives it with a key instead.
    yield* ctx.host.click(MODIFIER_SELECT_IDS.row(6));
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(MODIFIER_SELECT_IDS.row(6));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a second press on the same row still reports one click",
      yield* readout(),
      expected("6", "6", "none", none, 12),
    );
  });

/**
 * Whether the runtime shapes and mirrors a right-to-left string by itself.
 *
 * The samples are controlled: each run ends in a capital `T` after short
 * letters, so the end its crossbar reaches is the one thing the layouts
 * disagree about. The Latin run is the reader's own control — its order is not
 * in question — and the Arabic pair holds the same four letters with and
 * without non-joiners.
 */
const RtlTextProbe = (): ReactNode => {
  const theme = useTheme();
  const sample = {
    ...textStyle(theme, "body"),
    fontSize: RTL_FONT_SIZE,
    lineHeight: RTL_FONT_SIZE + 8,
    color: theme.colors.foreground,
  };
  const row = {
    display: "flex" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: theme.spacing.md,
  };
  const label = {
    ...textStyle(theme, "caption"),
    color: theme.colors.mutedForeground,
    width: 180,
  };
  return (
    <div
      testId="rtl-probe"
      style={{
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text testId={RTL_IDS.caption} style={label}>
        Right-to-left text: a trailing capital T lands on the left in a
        right-to-left run, and a non-joiner changes an Arabic run's advance.
      </text>
      <div style={row}>
        <text style={label}>Latin control</text>
        <text testId={RTL_IDS.latin} style={sample}>
          {RTL_SAMPLES.latin}
        </text>
      </div>
      <div style={row}>
        <text style={label}>Hebrew</text>
        <text testId={RTL_IDS.hebrew} style={sample}>
          {RTL_SAMPLES.hebrew}
        </text>
      </div>
      <div style={row}>
        <text style={label}>Hebrew, LTR base</text>
        <text testId={RTL_IDS.hebrewLtr} style={sample}>
          {RTL_SAMPLES.hebrewLtr}
        </text>
      </div>
      <div style={row}>
        <text style={label}>Arabic</text>
        <text testId={RTL_IDS.arabicJoined} style={sample}>
          {RTL_SAMPLES.arabicJoined}
        </text>
        <text testId={RTL_IDS.arabicSeparated} style={sample}>
          {RTL_SAMPLES.arabicSeparated}
        </text>
      </div>
    </div>
  );
};

const rtlTextSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(RTL_IDS.latin);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.hover(RTL_IDS.caption);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("rtl-text");
    const frame = yield* ctx.host.pixels("rtl-text");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );
    const ink = palettes.dark.colors.foreground;

    /** The box a sample painted and the ink height at each end of it. */
    const read = (id: string) =>
      Effect.gen(function* () {
        const box = yield* ctx.expectSome(
          `${id} reports its painted box`,
          Option.fromNullishOr(yield* ctx.host.bounds(id)),
        );
        const ends = yield* ctx.expectSome(
          `${id} paints its glyphs`,
          readEndInk(frame, box, scale, ink),
        );
        return ends;
      });

    // 1. The reader's control: a Latin run whose order is not in question.
    const latin = yield* read(RTL_IDS.latin);
    yield* ctx.expectEqual(
      "a Latin run puts its capital T at the right, so the reader can see the end",
      directionOf(latin),
      "ltr",
    );

    // 2. The Hebrew run differs only in script; a right-to-left paragraph puts
    //    the same neutral at its visual left.
    const hebrew = yield* read(RTL_IDS.hebrew);
    yield* ctx.expectEqual(
      "a Hebrew run's capital T lands on the left, so the runtime lays it out right to left",
      directionOf(hebrew),
      "rtl",
    );

    // 3. The same Hebrew run in an LTR paragraph: the crossbar moves back, so
    //    the previous reading was the text's direction, not a right-aligned box.
    const hebrewLtr = yield* read(RTL_IDS.hebrewLtr);
    yield* ctx.expectEqual(
      "the same Hebrew run behind a Latin letter puts its capital T on the right",
      directionOf(hebrewLtr),
      "ltr",
    );

    // 4. The Arabic pair: only the join controls differ.
    const joinedBox = yield* ctx.expectSome(
      "the joined Arabic run reports its box",
      Option.fromNullishOr(yield* ctx.host.bounds(RTL_IDS.arabicJoined)),
    );
    const separatedBox = yield* ctx.expectSome(
      "the separated Arabic run reports its box",
      Option.fromNullishOr(yield* ctx.host.bounds(RTL_IDS.arabicSeparated)),
    );
    yield* read(RTL_IDS.arabicJoined);
    yield* read(RTL_IDS.arabicSeparated);
    const shaping = shapingOf(joinedBox.width, separatedBox.width);
    yield* ctx.expectEqual(
      "both Arabic runs are wider than a single glyph",
      joinedBox.width > RTL_FONT_SIZE && separatedBox.width > RTL_FONT_SIZE,
      true,
    );
    yield* ctx.expectEqual(
      "a non-joiner changes the Arabic run's advance, so the platform shapes it",
      shaped(shaping),
      true,
    );
    yield* ctx.expectEqual(
      "joining narrows the run, so the shaper chose forms for the letters",
      shaping.separated > shaping.joined,
      true,
    );
  });

/** The width every syntax block takes, so two blocks sit in one row. */
const SYNTAX_BLOCK_WIDTH = 400;

/** The block's own padding; a code host paints no surface of its own. */
const SYNTAX_BLOCK_PADDING = 10;

/** The chrome a code host leaves to its caller: fill, edge, corner, padding. */
const syntaxBlockStyle = (palette: Theme): StyleDesc => ({
  width: SYNTAX_BLOCK_WIDTH,
  paddingTop: SYNTAX_BLOCK_PADDING,
  paddingBottom: SYNTAX_BLOCK_PADDING,
  paddingLeft: SYNTAX_BLOCK_PADDING,
  paddingRight: SYNTAX_BLOCK_PADDING,
  borderWidth: palette.borderWidth.thin,
  borderColor: palette.colors.border,
  borderRadius: palette.radius.sm,
  backgroundColor: palette.colors.background,
  color: palette.colors.inputForeground,
});

/**
 * The seam's host object with no token palette named, so the runtime's own
 * syntax colours paint.
 *
 * This is the honest control, not a hand-built runtime theme: the host still
 * receives the shipped metrics, fonts and surface roles, so the two blocks are
 * laid out identically and only `syntax` is absent — the state of a caller who
 * builds a theme object without `syntaxColors`.
 */
const runtimeSyntaxTheme = (
  palette: Theme,
): Omit<NativeTextTheme, "syntax"> => {
  const { syntax: _syntax, ...host } = nativeTextTheme(palette, "background");
  return host;
};

/** One code host: the probe's source, painted with or without a palette. */
const SyntaxBlock = ({
  id,
  palette,
  syntax,
}: {
  readonly id: string;
  readonly palette: Theme;
  readonly syntax: "shipped" | "runtime";
}): ReactNode => (
  <code
    testId={id}
    code={SYNTAX_SOURCE}
    language={SYNTAX_LANGUAGE}
    theme={
      syntax === "shipped"
        ? nativeTextTheme(palette, "background")
        : runtimeSyntaxTheme(palette)
    }
    style={syntaxBlockStyle(palette)}
  />
);

/**
 * What colour a code host's highlighted glyphs actually paint.
 *
 * The token package ships a palette and `nativeTextTheme` hands it over, but a
 * host object carrying the field is a source read: the runtime owns the
 * tokenizer and the paint. So one source is painted three times — with the
 * light palette, with the dark palette, and with the same dark host minus
 * `syntax` — and each block's own box is counted in the captured frame.
 */
const SyntaxPaletteProbe = (): ReactNode => {
  const theme = useTheme();
  return (
    <div
      testId="syntax-probe"
      style={{
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        testId={SYNTAX_IDS.caption}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        Syntax palette: a native code host paints the keyword its palette names,
        and a host handed no palette paints the runtime&apos;s own.
      </text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.md,
        }}
      >
        <SyntaxBlock
          id={SYNTAX_IDS.light}
          palette={palettes.light}
          syntax="shipped"
        />
        <SyntaxBlock
          id={SYNTAX_IDS.dark}
          palette={palettes.dark}
          syntax="shipped"
        />
      </div>
      <SyntaxBlock
        id={SYNTAX_IDS.runtime}
        palette={palettes.dark}
        syntax="runtime"
      />
    </div>
  );
};

const syntaxPaletteSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(SYNTAX_IDS.light);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.hover(SYNTAX_IDS.caption);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.capture("syntax-palette");
    const frame = yield* ctx.host.pixels("syntax-palette");
    const window = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, window),
    );

    /** How many pixels in a block's own box paint one colour. */
    const inkOf = (id: string, hex: string, tolerance = 0) =>
      Effect.gen(function* () {
        const box = yield* paintedBox(ctx, id);
        return yield* ctx.expectSome(
          `${id} is inside the capture`,
          countInk(frame, box, scale, hex, tolerance),
        );
      });

    const light = yield* paintedBox(ctx, SYNTAX_IDS.light);
    const dark = yield* paintedBox(ctx, SYNTAX_IDS.dark);
    const runtime = yield* paintedBox(ctx, SYNTAX_IDS.runtime);

    // 1. Each palette reaches the glyphs it names: the light block paints the
    //    light keyword and the dark block the dark one.
    yield* ctx.expectEqual(
      "the light block paints the light palette's keyword",
      isPainted(yield* inkOf(SYNTAX_IDS.light, LIGHT_KEYWORD)),
      true,
    );
    yield* ctx.expectEqual(
      "the dark block paints the dark palette's keyword",
      isPainted(yield* inkOf(SYNTAX_IDS.dark, DARK_KEYWORD)),
      true,
    );

    // 2. The palette travels with the host: neither block paints the other's
    //    keyword, so the colour is the object it was handed rather than a shared
    //    runtime default that happened to match one of them.
    yield* ctx.expectEqual(
      "the light block paints none of the dark palette's keyword",
      yield* inkOf(SYNTAX_IDS.light, DARK_KEYWORD),
      0,
    );
    yield* ctx.expectEqual(
      "the dark block paints none of the light palette's keyword",
      yield* inkOf(SYNTAX_IDS.dark, LIGHT_KEYWORD),
      0,
    );

    // 3. The control: the same host without `syntax` paints the runtime's own
    //    palette, which is the fallback the token group exists to replace.
    yield* ctx.expectEqual(
      "a host handed no palette paints none of the shipped keyword",
      yield* inkOf(SYNTAX_IDS.runtime, DARK_KEYWORD),
      0,
    );
    yield* ctx.expectEqual(
      "a host handed no palette paints the runtime's own keyword",
      isPainted(
        yield* inkOf(
          SYNTAX_IDS.runtime,
          RUNTIME_KEYWORD,
          RUNTIME_KEYWORD_TOLERANCE,
        ),
      ),
      true,
    );

    // 4. The control is laid out like the block it is compared with, so the
    //    absent colour is the palette and not a different source or size.
    yield* ctx.expectEqual(
      "the unthemed block is laid out like the dark one",
      `${runtime.width}x${runtime.height}`,
      `${dark.width}x${dark.height}`,
    );

    // 5. Every block paints its source: an absent keyword would otherwise read
    //    as a clean negative.
    yield* Effect.forEach(
      [
        {
          id: SYNTAX_IDS.light,
          box: light,
          fill: palettes.light.colors.background,
        },
        {
          id: SYNTAX_IDS.dark,
          box: dark,
          fill: palettes.dark.colors.background,
        },
        {
          id: SYNTAX_IDS.runtime,
          box: runtime,
          fill: palettes.dark.colors.background,
        },
      ],
      (block) =>
        Effect.flatMap(
          ctx.expectSome(
            `${block.id} is inside the capture`,
            countInkOn(frame, block.box, scale, block.fill),
          ),
          (ink) =>
            ctx.expectEqual(`${block.id} paints its source`, ink > 0, true),
        ),
      { concurrency: 1 },
    );
  });

/** How many cases the left column holds; the rest go right so the frame fits a window. */
const PRESS_LEFT_COUNT = Math.ceil(PRESS_CASES.length / 2);

/** The width of a composite row, and its height, so a press misses the cell when aimed at the row. */
const PRESS_ROW_WIDTH = 320;
const PRESS_ROW_HEIGHT = 34;
/** The width of the cell pinned to a row's trailing edge. */
const PRESS_CELL_WIDTH = 80;

/** The style a row paints: a card face with a hairline under it. */
const pressRowStyle = (theme: Theme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: PRESS_ROW_WIDTH,
  height: PRESS_ROW_HEIGHT,
  paddingLeft: theme.spacing.sm,
  paddingRight: theme.spacing.xs,
  backgroundColor: theme.colors.card,
  borderBottomWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  ...keyboardFocusRing(theme),
});

/**
 * The style a case's inner element paints.
 *
 * `filled` is the case's variable: the runtime inserts a mouse hitbox for an
 * element that paints a background, and that hitbox is the boundary a press
 * stops at, so the same child with and without a fill measures two routes.
 */
const pressCellStyle = (theme: Theme, filled: boolean): StyleDesc => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: PRESS_CELL_WIDTH,
  height: PRESS_ROW_HEIGHT - theme.spacing.sm,
  borderRadius: theme.radius.sm,
  borderWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  ...textStyle(theme, "caption"),
  color: theme.colors.mutedForeground,
  ...(filled ? { backgroundColor: theme.colors.muted } : {}),
});

/** The row-level handlers a case owns, so a spread stays typed. */
interface PressRowHandlers {
  readonly onClick?: () => void;
  readonly onMouseDown?: () => void;
  readonly onMouseMove?: () => void;
  readonly onAuxClick?: () => void;
  readonly onKeyDown?: () => void;
}

/**
 * One nesting: what the row holds at the point the probe presses.
 *
 * The cases are the shapes a Tier 3 row composes — a label, an inert box, a
 * trailing control, a control that steps aside, a drag row, a context-menu row
 * and an editable cell — so the measured route is the one a table or a tree
 * inherits rather than a synthetic pair.
 */
const PressRoutingProbe = (): ReactNode => {
  const theme = useTheme();
  const [hits, setHits] = useState<ReadonlyArray<string>>([]);
  const [draft, setDraft] = useState("");

  const hit = (name: string) => () =>
    setHits((previous) => Arr.append(previous, name));

  /** The inner element a case is measured through. */
  const cellOf = (entry: PressCase): ReactNode => {
    const id = pressCellId(entry.id);
    const filled = pressCellStyle(theme, true);
    const unfilled = pressCellStyle(theme, false);
    return Match.value(entry.id).pipe(
      Match.when("text-unfilled", () => (
        <text testId={id} style={unfilled}>
          {entry.id}
        </text>
      )),
      Match.when("text-filled", () => (
        <text testId={id} style={filled}>
          {entry.id}
        </text>
      )),
      Match.when("div-filled", () => <div testId={id} style={filled} />),
      Match.when("control-filled", () => (
        <div
          testId={id}
          role="button"
          tabIndex={0}
          onClick={hit("cell-click")}
          style={filled}
        >
          Act
        </div>
      )),
      Match.when("control-unfilled", () => (
        <div
          testId={id}
          role="button"
          tabIndex={0}
          onClick={hit("cell-click")}
          style={unfilled}
        >
          Act
        </div>
      )),
      Match.when("inert-control", () => (
        <div
          testId={id}
          role="button"
          tabIndex={0}
          onClick={hit("cell-click")}
          style={{ ...filled, pointerEvents: "none" }}
        />
      )),
      Match.when("drag-row", () => (
        <div testId={id} onClick={hit("cell-click")} style={filled} />
      )),
      Match.when("aux-row", () => <div testId={id} style={filled} />),
      Match.when("field-cell", () => (
        <input
          testId={id}
          value={draft}
          onChange={(event) => setDraft(event.value ?? "")}
          theme={nativeTextTheme(theme)}
          style={{
            width: PRESS_CELL_WIDTH,
            height: PRESS_ROW_HEIGHT - theme.spacing.sm,
            color: theme.colors.inputForeground,
            backgroundColor: theme.colors.input,
          }}
        />
      )),
      Match.when("field-in-row", () => (
        <input
          testId={id}
          value={draft}
          onChange={(event) => setDraft(event.value ?? "")}
          theme={nativeTextTheme(theme)}
          style={{
            width: PRESS_CELL_WIDTH,
            height: PRESS_ROW_HEIGHT - theme.spacing.sm,
            color: theme.colors.inputForeground,
            backgroundColor: theme.colors.input,
          }}
        />
      )),
      Match.exhaustive,
    );
  };

  /** The handlers a case's row itself owns. */
  const rowHandlers = (id: Nesting): PressRowHandlers =>
    Match.value(id).pipe(
      Match.when("drag-row", () => ({
        onMouseDown: hit("row-down"),
        onMouseMove: () => undefined,
      })),
      Match.when("aux-row", () => ({ onAuxClick: hit("row-aux") })),
      Match.when("field-cell", () => ({ onKeyDown: hit("row-key") })),
      Match.when("field-in-row", () => ({ onClick: hit("row-click") })),
      Match.orElse((): PressRowHandlers => ({ onClick: hit("row-click") })),
    );

  return (
    <div
      style={{
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        testId={PRESS_CAPTION}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A composite row: which handler a press on the inner element runs, in the
        order it runs.
      </text>
      <div
        testId={PRESS_CLEAR}
        role="button"
        tabIndex={0}
        onClick={() => setHits([])}
        style={{
          ...pressCellStyle(theme, true),
          width: 72,
          backgroundColor: theme.colors.secondary,
          color: theme.colors.secondaryForeground,
        }}
      >
        Clear
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: theme.spacing.md,
        }}
      >
        {Arr.map(
          [
            Arr.take(PRESS_CASES, PRESS_LEFT_COUNT),
            Arr.drop(PRESS_CASES, PRESS_LEFT_COUNT),
          ],
          (column) => (
            <div
              key={Arr.join(
                Arr.map(column, (entry) => entry.id),
                "-",
              )}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: theme.spacing.xs,
              }}
            >
              {Arr.map(column, (entry) => (
                <div
                  key={entry.id}
                  testId={pressRowId(entry.id)}
                  tabIndex={0}
                  {...rowHandlers(entry.id)}
                  style={pressRowStyle(theme)}
                >
                  {entry.id === "text-unfilled" ||
                  entry.id === "text-filled" ? null : (
                    <text
                      style={{
                        ...textStyle(theme, "body"),
                        color: theme.colors.foreground,
                      }}
                    >
                      {entry.id}
                    </text>
                  )}
                  {cellOf(entry)}
                </div>
              ))}
            </div>
          ),
        )}
      </div>
      <text
        testId={PRESS_DRAFT}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.foreground,
        }}
      >
        {`field=${draft}`}
      </text>
      <text
        testId={PRESS_READOUT}
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {formatHits(hits)}
      </text>
    </div>
  );
};

const pressRoutingSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(pressRowId("text-unfilled"));
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(PRESS_READOUT);
    const draft = () => ctx.host.text(PRESS_DRAFT);
    const clear = () =>
      Effect.flatMap(ctx.host.click(PRESS_CLEAR), () => Effect.sleep(SETTLE));
    const press = (id: string) =>
      Effect.flatMap(ctx.host.click(id), () => Effect.sleep(SETTLE));
    const assertRoute = (id: Nesting) =>
      Effect.gen(function* () {
        const entry = pressCase(id);
        yield* ctx.expectEqual(
          `${entry.caption} runs ${formatHits(entry.hits)}`,
          yield* readout(),
          formatHits(entry.hits),
        );
      });

    // 1. The frame opens with an empty log, so every route below is the press's.
    yield* ctx.expectEqual(
      "the frame opens with an empty log",
      yield* readout(),
      formatHits([]),
    );

    // 2. A label that paints no fill is transparent to the press; the same label
    // with a fill is the boundary the press stops at.
    yield* clear();
    yield* press(pressCellId("text-unfilled"));
    yield* assertRoute("text-unfilled");

    yield* clear();
    yield* press(pressCellId("text-filled"));
    yield* assertRoute("text-filled");

    // 3. A filled child with no handlers.
    yield* clear();
    yield* press(pressCellId("div-filled"));
    yield* assertRoute("div-filled");

    // 4. A control child: filled, it is the only handler; unfilled, the row's
    // painted surface is still inside the hover walk, so both run.
    yield* clear();
    yield* press(pressCellId("control-filled"));
    yield* assertRoute("control-filled");

    yield* clear();
    yield* press(pressCellId("control-unfilled"));
    yield* assertRoute("control-unfilled");

    // The row stays pressable where the control is not: its own painted surface
    // runs its handler and nothing else.
    yield* clear();
    yield* press(pressRowId("control-filled"));
    yield* ctx.expectEqual(
      "a press on the row's own surface runs only the row",
      yield* readout(),
      formatHits(["row-click"]),
    );

    // 5. The workaround: a *drawing* told to ignore the pointer lets the row
    // take the press, but a control that keeps a focus hitbox is still reached.
    yield* clear();
    yield* press(pressCellId("inert-control"));
    yield* assertRoute("inert-control");

    // 6. A row that owns a drag does not hear a press on a filled control in it,
    // so the row's capture is not armed by a press the cell takes.
    yield* clear();
    yield* press(pressCellId("drag-row"));
    yield* assertRoute("drag-row");

    // 7. A row's context menu does not hear a right press on a filled child.
    yield* clear();
    yield* Effect.flatMap(ctx.host.rightClick(pressCellId("aux-row")), () =>
      Effect.sleep(SETTLE),
    );
    yield* assertRoute("aux-row");

    // 8. A field inside the row: the field takes the focus and keeps what is
    // typed, while the row's key handler still hears the key.
    yield* clear();
    yield* press(pressCellId("field-cell"));
    yield* ctx.expectEqual(
      "a press on the field focuses it",
      yield* focusedId(ctx),
      pressCellId("field-cell"),
    );
    yield* ctx.host.key("a");
    yield* Effect.sleep(SETTLE);
    yield* assertRoute("field-cell");
    yield* ctx.expectEqual(
      "the field keeps the key the row also heard",
      yield* draft(),
      "field=a",
    );

    // 9. A press on a field also runs the row it sits in, so an editable cell is
    // selected by the press that starts the edit.
    yield* clear();
    yield* press(pressCellId("field-in-row"));
    yield* assertRoute("field-in-row");
    yield* ctx.expectEqual(
      "the pressed field holds the focus",
      yield* focusedId(ctx),
      pressCellId("field-in-row"),
    );

    yield* ctx.host.capture("press-routing");
  });

/**
 * A selectable row's `trailing` slot: the shipped `Badge`, the same badge
 * declaring `pointerEvents: "none"`, and a plain `<text>`.
 */
const ListRowPressProbe = (): ReactNode => {
  const theme = useTheme();
  const [selected, setSelected] = useState("");

  const trailingOf = (row: TrailingShape): ReactNode =>
    Match.value(row).pipe(
      Match.when("badge", () => (
        <Badge testId={listRowTrailingId("badge")} variant="success" size="sm">
          Ready
        </Badge>
      )),
      Match.when("badge-eager", () => (
        <Badge
          testId={listRowTrailingId("badge-eager")}
          variant="success"
          size="sm"
          style={{ pointerEvents: "auto" }}
        >
          Ready
        </Badge>
      )),
      Match.when("badge-inert", () => (
        <Badge
          testId={listRowTrailingId("badge-inert")}
          variant="success"
          size="sm"
          style={{ pointerEvents: "none" }}
        >
          Ready
        </Badge>
      )),
      Match.when("text", () => (
        <text
          testId={listRowTrailingId("text")}
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          Ready
        </text>
      )),
      Match.exhaustive,
    );

  return (
    <div
      style={{
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        testId={LIST_ROW_CAPTION}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A selectable row&apos;s trailing slot: does a press on a badge reach the
        row it sits in?
      </text>
      <div
        testId={LIST_ROW_CLEAR}
        role="button"
        tabIndex={0}
        onClick={() => setSelected("")}
        style={{
          width: 72,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...textStyle(theme, "caption"),
          backgroundColor: theme.colors.secondary,
          color: theme.colors.secondaryForeground,
          borderRadius: theme.radius.sm,
        }}
      >
        Clear
      </div>
      <List
        testId={LIST_ROW_LIST}
        selectionMode="single"
        value={selected}
        onValueChange={setSelected}
        style={{
          width: 420,
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        {Arr.map(LIST_ROW_ROWS, (row) => (
          <ListItem
            key={row}
            value={row}
            textValue={row}
            testId={listRowId(row)}
            trailing={trailingOf(row)}
          >
            <ListItemTitle>{`Row ${row}`}</ListItemTitle>
          </ListItem>
        ))}
      </List>
      <text
        testId={LIST_ROW_READOUT}
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {formatSelection(selected)}
      </text>
    </div>
  );
};

const listRowPressSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(LIST_ROW_LIST);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(LIST_ROW_READOUT);
    const clear = () =>
      Effect.flatMap(ctx.host.click(LIST_ROW_CLEAR), () =>
        Effect.sleep(SETTLE),
      );

    yield* ctx.expectEqual(
      "the list opens with nothing selected",
      yield* readout(),
      formatSelection(""),
    );

    yield* Effect.forEach(
      LIST_ROW_PRESSES,
      (press) =>
        Effect.gen(function* () {
          yield* clear();
          yield* Effect.flatMap(ctx.host.click(press.target), () =>
            Effect.sleep(SETTLE),
          );
          yield* ctx.expectEqual(
            `${press.caption} leaves ${formatSelection(press.selects)}`,
            yield* readout(),
            formatSelection(press.selects),
          );
        }),
      { concurrency: 1 },
    );

    yield* ctx.host.capture("list-row-press");
  });

/**
 * The shipped `Button`'s **activation contract**, driven through every input a
 * reader has: a pointer press, Enter's press and release, Space's press and
 * release.
 *
 * The rule is the platform's — Enter on the press, Space on the release, never
 * twice — and until this probe it rested on a pure decision function plus a
 * `TestRenderer`. A window is a different delivery path: the automation sends a
 * key **down** with no release (`AsyncSmokeHost.keyUp` exists because of that),
 * so a control that waited for a release without the release ever arriving would
 * be dead in a real window and green in every headless suite.
 *
 * Two consumer-facing facts fall out of the same readout:
 *
 * - a pointer press runs the caller's host `onClick` **and** `onActivate`, while
 *   a key reaches `onActivate` alone — the mapping plan `160` owes when the
 *   components' stand-in hands its `onClick` over;
 * - the activation carries the press point, because the payload is the runtime's
 *   own click and a ripple is born where the pointer was.
 *
 * The disabled and busy buttons count activations nobody may receive, and the
 * traversal proves the half each keeps: a disabled button leaves the tab order
 * and stays addressable from code, a busy one keeps its stop.
 */
const ButtonActivationProbe = (): ReactNode => {
  const theme = useTheme();
  const [host, setHost] = useState(0);
  const [activates, setActivates] = useState(0);
  const [last, setLast] = useState<ActivationKind>("none");
  const [point, setPoint] = useState<Option.Option<Point>>(Option.none());
  const [disabledRefusals, setDisabledRefusals] = useState(0);
  const [busyRefusals, setBusyRefusals] = useState(0);

  const record = (event: EventPayload): void => {
    setActivates((count) => count + 1);
    setLast(activationKind(event));
    Option.match(
      Option.all([
        Option.fromNullishOr(event.x),
        Option.fromNullishOr(event.y),
      ]),
      {
        onNone: () => {},
        onSome: ([x, y]) => setPoint(Option.some({ x, y })),
      },
    );
  };

  return (
    <div
      testId={BUTTON_ACTIVATION_PROBE}
      style={{
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        testId={BUTTON_CAPTION}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped Button: Enter activates on its press, Space on its release,
        and a refused press reaches neither prop.
      </text>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: theme.spacing.sm,
        }}
      >
        <Button
          testId={BUTTON_ENABLED}
          variant="primary"
          onActivate={record}
          onClick={() => setHost((count) => count + 1)}
        >
          Activate
        </Button>
        <Button
          testId={BUTTON_DISABLED}
          variant="secondary"
          disabled
          onActivate={() => setDisabledRefusals((count) => count + 1)}
        >
          Disabled
        </Button>
        <Button
          testId={BUTTON_BUSY}
          variant="secondary"
          loading
          onActivate={() => setBusyRefusals((count) => count + 1)}
        >
          Busy
        </Button>
        <Button testId={BUTTON_AFTER} variant="secondary">
          After
        </Button>
      </div>
      <text
        testId={BUTTON_READOUT}
        style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}
      >
        {formatActivation({ host, activates, last }, point)}
      </text>
      <text
        testId={BUTTON_REFUSAL_READOUT}
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.mutedForeground,
        }}
      >
        {formatRefusals({ disabled: disabledRefusals, busy: busyRefusals })}
      </text>
    </div>
  );
};

/** The gesture a route names, sent as the window's own input. */
const sendGesture = (
  ctx: Smoke.AsyncSmokeContext,
  gesture: ButtonGesture,
): Effect.Effect<void, Smoke.SmokeHostError> =>
  Match.value(gesture).pipe(
    Match.when("click", () => ctx.host.click(BUTTON_ENABLED)),
    Match.when("enter-press", () => ctx.host.key("enter")),
    Match.when("enter-release", () => ctx.host.keyUp("enter")),
    Match.when("space-press", () => ctx.host.key("space")),
    Match.when("space-release", () => ctx.host.keyUp("space")),
    Match.exhaustive,
  );

const buttonActivationSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(BUTTON_ACTIVATION_PROBE);

    const activation = () => ctx.host.text(BUTTON_READOUT);
    const refusals = () => ctx.host.text(BUTTON_REFUSAL_READOUT);
    /** The number the readout prints for `field`, as a settled value. */
    const numberIn = (field: string) =>
      settleNumber(
        Effect.flatMap(activation(), (text) =>
          Effect.succeed(
            Option.getOrElse(fieldOf(text, field), () => Number.NaN),
          ),
        ),
      );

    yield* ctx.expectEqual(
      "the button starts un-activated",
      yield* activation(),
      formatActivation({ host: 0, activates: 0, last: "none" }),
    );

    // 1. Every gesture, in the order the fixture's table names them. Each row
    // asserts the counters *and* the kind, so a press that activates a row early
    // or a release that activates twice names its gesture.
    const box = yield* paintedBox(ctx, BUTTON_ENABLED);
    yield* Effect.forEach(
      BUTTON_ROUTES,
      (route) =>
        Effect.gen(function* () {
          yield* sendGesture(ctx, route.gesture);
          yield* Effect.sleep(SETTLE);
          yield* ctx.expectContains(
            `${route.caption} leaves ${formatCounts(route)}`,
            yield* activation(),
            formatCounts(route),
          );
        }),
      { concurrency: 1 },
    );

    // 2. The pointer activation carries the press point: the payload is the
    // runtime's click, so the point is the centre of the painted box.
    yield* ctx.expectNear(
      "the pointer activation carries the press point's x",
      yield* numberIn("x"),
      box.x + box.width / 2,
      1,
    );
    yield* ctx.expectNear(
      "the pointer activation carries the press point's y",
      yield* numberIn("y"),
      box.y + box.height / 2,
      1,
    );

    // 3. A disabled button refuses the pointer and both keys, and the native
    // focus still lands on it, because code may focus a control it disabled.
    yield* ctx.host.click(BUTTON_DISABLED);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.focusElement(BUTTON_DISABLED);
    yield* ctx.expectEqual(
      "a press focuses the disabled button from code",
      yield* focusedAfterPaint(ctx),
      BUTTON_DISABLED,
    );
    yield* ctx.host.key("enter");
    yield* ctx.host.keyUp("enter");
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a disabled button refuses the pointer, Enter and Space",
      yield* refusals(),
      formatRefusals({ disabled: 0, busy: 0 }),
    );

    // 4. A busy button refuses the same four inputs and stays focusable.
    yield* ctx.host.click(BUTTON_BUSY);
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.focusElement(BUTTON_BUSY);
    yield* ctx.expectEqual(
      "a busy button keeps a focus it can be given",
      yield* focusedAfterPaint(ctx),
      BUTTON_BUSY,
    );
    yield* ctx.host.key("enter");
    yield* ctx.host.keyUp("enter");
    yield* ctx.host.key("space");
    yield* ctx.host.keyUp("space");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a busy button refuses Enter and Space",
      yield* refusals(),
      formatRefusals({ disabled: 0, busy: 0 }),
    );
    yield* ctx.expectContains(
      "no refused gesture reached the enabled button either",
      yield* activation(),
      formatCounts(buttonRoute("space-release")),
    );

    // 5. The tab order: a traversal skips the disabled stop and reaches the
    // busy one, so `tabIndex: -1` and `0` are the difference a reader feels.
    yield* ctx.host.focusElement(
      yield* ctx.expectSome(
        "the tab order names its first stop",
        Arr.head(BUTTON_TAB_ORDER),
      ),
    );
    yield* Effect.forEach(
      BUTTON_TAB_ORDER,
      (id) =>
        Effect.gen(function* () {
          yield* ctx.expectEqual(
            `the traversal reaches ${id}`,
            yield* focusedAfterPaint(ctx),
            id,
          );
          yield* ctx.host.focusNext();
          yield* Effect.sleep(SETTLE);
        }),
      { concurrency: 1 },
    );

    yield* ctx.host.capture("button-activation");
  });

/**
 * The shipped `DatePicker`, driven by a reader's own keys in a real window.
 *
 * The component's key contract is proved offscreen against a `TestRenderer`,
 * where the key is delivered to the grid's `onKeyDown` directly. A window is a
 * different path in three ways: the key lands on the **focused day cell** and
 * has to reach the grid above it, the runtime moves focus only when component
 * code calls `focusElement`, and the cell a move lands on is a `tabIndex` -1
 * `div` inside an anchored surface that a `Popover` owns. The probe therefore
 * reads the focused cell's `testId` after every key rather than the component's
 * state, and the app's `onValueChange` is the second record — a navigation that
 * silently chose a day would move it.
 *
 * The field is controlled by the probe (the app owns the value), `today` is
 * pinned so the grid is deterministic, and both bounds sit inside the month so
 * the month controls and the last week's clamp are measurable.
 */
const DatePickerProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const [value, setValue] = useState<string | null>(DATE_PICKER_TODAY);
  const [changes, setChanges] = useState(0);
  return (
    <div
      testId={DATE_PICKER_PROBE}
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.xl,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.lg,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped DatePicker: arrows move the focused day and clamp to the
        bounds, Enter chooses, Escape and Clear return the focus.
      </text>
      <div
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
        }}
      >
        <DatePicker
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setChanges((count) => count + 1);
          }}
          today={DATE_PICKER_TODAY}
          min={DATE_PICKER_MIN}
          max={DATE_PICKER_MAX}
          clearable
        >
          <DatePickerTrigger label="Due date" />
          <DatePickerContent>
            <DatePickerCalendar />
          </DatePickerContent>
        </DatePicker>
        <Pressable testId={DATE_PICKER_AFTER}>
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            After the field
          </text>
        </Pressable>
        {/*
          A second instance that is never given a day: the first open of an empty
          picker is the only place its "nothing chosen" anchor shows, and a
          reopened instance would inherit the day the first one held.
        */}
        <DatePicker
          today={DATE_PICKER_TODAY}
          min={DATE_PICKER_MIN}
          max={DATE_PICKER_MAX}
        >
          <DatePickerTrigger
            label="Empty due date"
            placeholder="No day chosen"
            testId={DATE_PICKER_EMPTY_TRIGGER}
          />
          <DatePickerContent>
            <DatePickerCalendar />
          </DatePickerContent>
        </DatePicker>
      </div>
      <Readout testId={DATE_PICKER_READOUT}>
        {formatDatePickerReadout({ value, changes })}
      </Readout>
    </div>
  );
};

const datePickerSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(DATE_PICKER_TRIGGER);
    const readout = () => ctx.host.text(DATE_PICKER_READOUT);
    const month = () => ctx.host.text(DATE_PICKER_MONTH);

    // The surface's box paints before its calendar does: an anchored popover
    // mounts the wrapper, measures it and then lays the content out, so the
    // month header is the part that says the grid exists.
    const open = () =>
      Effect.gen(function* () {
        yield* ctx.host.click(DATE_PICKER_TRIGGER);
        yield* ctx.host.waitFor(DATE_PICKER_MONTH);
        yield* Effect.sleep(SETTLE);
      });

    // The closed field: the day the app holds, no surface, no change.
    yield* ctx.expectEqual(
      "the field starts on the day the app holds",
      yield* ctx.host.text(DATE_PICKER_TRIGGER),
      DATE_PICKER_TODAY_LABEL,
    );
    yield* ctx.expectEqual(
      "a closed picker paints no surface",
      yield* settleGone(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "the app has recorded no change yet",
      yield* readout(),
      formatDatePickerReadout({ value: DATE_PICKER_TODAY, changes: 0 }),
    );

    // The open surface: the month of the day the picker calls today, and the
    // focus on a day cell rather than on the surface itself.
    yield* open();
    yield* ctx.expectEqual(
      "a press opens the month of the day the picker calls today",
      yield* month(),
      DATE_PICKER_MONTH_LABEL,
    );
    yield* ctx.expectEqual(
      "the surface opens on a day cell, not on its surface",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_TODAY),
    );

    // The measured route, from the fixture's cumulative table. A key that does
    // not reach the grid leaves the focus on the previous cell, which names the
    // gesture rather than the component.
    yield* Effect.forEach(
      DATE_PICKER_ROUTES,
      (route) =>
        Effect.gen(function* () {
          yield* ctx.host.key(route.key);
          yield* ctx.expectEqual(
            `${route.caption} (from ${datePickerCell(route.from)})`,
            yield* focusedAfterPaint(ctx),
            datePickerCell(route.to),
          );
        }),
      { concurrency: 1 },
    );
    // Navigation moves the focus, never the value.
    yield* ctx.expectEqual(
      "moving the focus chooses nothing",
      yield* readout(),
      formatDatePickerReadout({ value: DATE_PICKER_TODAY, changes: 0 }),
    );
    yield* ctx.host.capture("date-picker-open");

    // Enter chooses the focused cell, the way the platform's radio-like grid
    // does: the surface goes, the trigger repaints and the focus returns.
    yield* ctx.host.key("enter");
    yield* ctx.expectEqual(
      "Enter chooses the focused day and dismisses the surface",
      yield* settleGone(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "the trigger paints the day that was chosen",
      yield* ctx.host.text(DATE_PICKER_TRIGGER),
      DATE_PICKER_CHOSEN_LABEL,
    );
    yield* ctx.expectEqual(
      "the app records one value change",
      yield* readout(),
      formatDatePickerReadout({ value: DATE_PICKER_MAX, changes: 1 }),
    );
    yield* ctx.expectEqual(
      "the chosen field hands the focus back to its trigger",
      yield* focusedAfterPaint(ctx),
      DATE_PICKER_TRIGGER,
    );
    yield* ctx.host.capture("date-picker-chosen");

    // A second open anchors on the chosen day, and the page keys clamp against
    // the bounds instead of stepping onto an unavailable day.
    yield* open();
    yield* ctx.expectEqual(
      "a reopened picker anchors on the chosen day",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_MAX),
    );
    yield* ctx.expectEqual(
      "the clear action paints while a day is chosen",
      yield* settlePainted(ctx, DATE_PICKER_CLEAR),
      true,
    );
    yield* ctx.host.key("pageup");
    yield* ctx.expectEqual(
      "PageUp lands on the earliest available day",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_MIN),
    );
    yield* ctx.host.key("pagedown");
    yield* ctx.expectEqual(
      "PageDown lands back on the latest available day",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_MAX),
    );
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape dismisses the surface without choosing",
      yield* settleGone(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "the value Escape leaves is the one that was chosen",
      yield* readout(),
      formatDatePickerReadout({ value: DATE_PICKER_MAX, changes: 1 }),
    );
    yield* ctx.expectEqual(
      "Escape returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      DATE_PICKER_TRIGGER,
    );

    // Clear is the other close path, and it reports the absence rather than a
    // value: the trigger is a placeholder again and the focus is on it.
    yield* open();
    yield* ctx.host.click(DATE_PICKER_CLEAR);
    yield* ctx.expectEqual(
      "Clear dismisses the surface",
      yield* settleGone(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "Clear reports no day",
      yield* readout(),
      formatDatePickerReadout({ value: null, changes: 2 }),
    );
    yield* ctx.expectEqual(
      "the cleared field is a placeholder again",
      yield* ctx.host.text(DATE_PICKER_TRIGGER),
      DATE_PICKER_PLACEHOLDER,
    );
    yield* ctx.expectEqual(
      "Clear returns the focus to the trigger",
      yield* focusedAfterPaint(ctx),
      DATE_PICKER_TRIGGER,
    );
    yield* ctx.host.capture("date-picker-cleared");

    // A cleared picker anchors on the day it calls today, the anchor it
    // documents: the open effect hands the focus effect the anchor it just set.
    yield* open();
    yield* ctx.expectEqual(
      "a cleared picker reopens on the day it calls today",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_TODAY),
    );

    // A day past the last bound is painted and refuses the press: the surface
    // stays and the value does not move.
    yield* ctx.host.click(datePickerCell(DATE_PICKER_UNAVAILABLE));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a day past the last bound does not dismiss the surface",
      yield* settlePainted(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "a day past the last bound chooses nothing",
      yield* readout(),
      formatDatePickerReadout({ value: null, changes: 2 }),
    );
    yield* ctx.host.key("escape");
    yield* settleGone(ctx, DATE_PICKER_CONTENT);

    // The empty instance's first open. It is a second mount, so its anchor is
    // measured rather than inherited from the driven picker.
    yield* ctx.host.click(DATE_PICKER_EMPTY_TRIGGER);
    yield* ctx.host.waitFor(DATE_PICKER_MONTH);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an empty picker's first open focuses the day it calls today",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_TODAY),
    );
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "the empty picker closes on Escape and keeps its trigger focused",
      yield* settleGone(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "the empty picker still holds no day",
      yield* ctx.host.text(DATE_PICKER_EMPTY_TRIGGER),
      "No day chosen",
    );
    yield* ctx.expectEqual(
      "Escape hands the empty picker's focus back to its own trigger",
      yield* focusedAfterPaint(ctx),
      DATE_PICKER_EMPTY_TRIGGER,
    );

    // Both bounds sit inside March 2026, so neither neighbour month holds a
    // selectable day: the control is disabled at the bound's month.
    yield* open();
    yield* ctx.host.click(DATE_PICKER_NEXT);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the next-month control refuses at the bound's month",
      yield* month(),
      DATE_PICKER_MONTH_LABEL,
    );
    // The press itself: a disabled control leaves the Tab order but the runtime
    // still focuses the element a pointer pressed, so the reader's place is the
    // control they just refused (`button-activation-lifecycle` measured the same
    // focus rule on a disabled `Button`). The nav row answers the movement keys
    // the grid does, so the arrow takes the calendar on and pulls the focus back
    // to the day it lands on.
    yield* ctx.expectEqual(
      "a refused month control leaves the surface open",
      yield* settlePainted(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "a press parks the focus on the refused control",
      yield* focusedAfterPaint(ctx),
      DATE_PICKER_NEXT,
    );
    yield* ctx.host.key("right");
    yield* ctx.expectEqual(
      "the nav row's arrow moves the calendar and takes the focus back to a day",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_NAV_ARROW),
    );
    yield* ctx.expectEqual(
      "a refused month control chooses nothing",
      yield* readout(),
      formatDatePickerReadout({ value: null, changes: 2 }),
    );
    // Escape is the dismiss stack's, not the grid's, so it still closes and
    // returns the focus; the next open restores a day cell.
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "the surface still closes after a refused press",
      yield* settleGone(ctx, DATE_PICKER_CONTENT),
      true,
    );
    yield* ctx.expectEqual(
      "and hands the focus back to the field",
      yield* focusedAfterPaint(ctx),
      DATE_PICKER_TRIGGER,
    );
    yield* open();
    yield* ctx.expectEqual(
      "reopening a cleared picker restores the focus to a day, at the anchor it documents",
      yield* focusedAfterPaint(ctx),
      datePickerCell(DATE_PICKER_TODAY),
    );
    yield* ctx.host.key("escape");
    yield* settleGone(ctx, DATE_PICKER_CONTENT);
  });

/**
 * The shipped `@gpuixui/data` files table, driven in a real window.
 *
 * The example is mounted from the package's registry rather than rebuilt, so the
 * probe measures the screen a consumer copies. The window adds what the offscreen
 * `data-table-core` scenario cannot: a press focuses the row the runtime hit, a
 * row's `focusElement` call has to follow the committed `tabIndex` (the rule the
 * example's `useLayoutEffect` documents), a header press and its menu live in the
 * same anchored layer a window hit-tests, and the `TableColumnDivider` drag is a
 * pointer path with eight moves rather than a synthesised one.
 */
const DataTableProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const TableExample = dataExamples["table"];
  return (
    <div
      testId="data-table-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped data table: a press selects and focuses the row it hit,
        arrows walk the records, the filter releases a hidden selection, the
        column menu hides one and the divider resizes it.
      </text>
      {TableExample === undefined ? null : <TableExample />}
    </div>
  );
};

const dataTableSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(DATA_TABLE_READOUT);
    const readout = () => ctx.host.text(DATA_TABLE_READOUT);
    const initial = yield* ctx.expectSome(
      "the header painted",
      Option.fromNullishOr(yield* ctx.host.bounds(DATA_TABLE_NAME_HEADER)),
    );
    const firstRow = yield* ctx.expectSome(
      "the first row painted",
      Option.fromNullishOr(yield* ctx.host.bounds(dataTableRow(1))),
    );
    yield* ctx.expectEqual(
      "the table opens on the example's own readout",
      yield* readout(),
      DATA_TABLE_INITIAL,
    );
    yield* ctx.expectEqual(
      "the rows start below the header",
      firstRow.y > initial.y,
      true,
    );

    // A press chooses the record it hit, paints the selection wash and takes the
    // focus: the example moves focus after the `tabIndex` commit, and a window is
    // where that ordering matters.
    yield* ctx.host.click(dataTableRow(2));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press chooses the row it hit",
      yield* readout(),
      dataTableReadout({
        rows: 60,
        selected: 1,
        columns: DATA_TABLE_COLUMNS_ORDER,
        width: DATA_TABLE_NAME_WIDTH,
        content: DATA_TABLE_CONTENT_WIDTH,
        sort: "unsorted",
      }),
    );
    yield* ctx.expectEqual(
      "the chosen row takes the focus",
      yield* focusedAfterPaint(ctx),
      dataTableRow(2),
    );
    // The live host reports no style, so the wash is counted in a capture: the
    // row width's worth of the theme's `selected` role cannot come from anything
    // else on the screen.
    const wash = yield* ctx.expectSome(
      "the theme names a selected wash",
      Option.fromNullishOr(Pixels.hexToRgba(palettes.dark.colors.selected)),
    );
    yield* ctx.host.capture("data-table-selected");
    yield* ctx.expectEqual(
      "the chosen row paints the selection wash",
      (yield* paintedPixels(ctx, "data-table-selected", wash)) > 0,
      true,
    );

    // Arrows walk the painted records and move the real focus with them, because
    // `focusElement` refuses an element still outside the tab order. The poll
    // waits for the focus to **leave** the row the key was sent to, then the
    // check names where it landed, so a swallowed key cannot pass by reading the
    // row it started on.
    const step = (key: "down" | "up", from: number, to: number) =>
      Effect.gen(function* () {
        yield* ctx.host.key(key);
        const landed = yield* settleUntil(
          focusedId(ctx),
          (id) => id !== dataTableRow(from),
        );
        yield* ctx.expectEqual(
          key === "down"
            ? "ArrowDown moves the choice and the focus to the next record"
            : "ArrowUp walks back",
          landed,
          dataTableRow(to),
        );
      });
    yield* step("down", 2, 3);
    yield* step("up", 3, 2);

    // A chorded press toggles the record under it — the modifier flags arrive on
    // the window's click event, not only in a `TestRenderer`.
    yield* ctx.host.clickWith(dataTableRow(5), ["cmd"]);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a cmd press adds the record without dropping the first",
      yield* readout(),
      dataTableReadout({
        rows: 60,
        selected: 2,
        columns: DATA_TABLE_COLUMNS_ORDER,
        width: DATA_TABLE_NAME_WIDTH,
        content: DATA_TABLE_CONTENT_WIDTH,
        sort: "unsorted",
      }),
    );
    yield* ctx.expectEqual(
      "and the pressed record holds the focus",
      yield* focusedAfterPaint(ctx),
      dataTableRow(5),
    );

    // The header sorts by the column it hit, and the selection is kept by record
    // rather than by position.
    yield* ctx.host.click(DATA_TABLE_NAME_SORT);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a header press sorts ascending",
      yield* readout(),
      `${DATA_TABLE_SORT_ASC}`,
    );
    yield* ctx.expectContains(
      "the selection survives the sort",
      yield* readout(),
      "2 selected",
    );
    yield* ctx.host.click(DATA_TABLE_NAME_SORT);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a second press flips the direction",
      yield* readout(),
      `${DATA_TABLE_SORT_DESC}`,
    );
    const top = yield* ctx.expectSome(
      "the sorted top row painted",
      Option.fromNullishOr(yield* ctx.host.bounds(dataTableRow(60))),
    );
    yield* ctx.expectNear(
      "the last record paints at the top",
      top.y,
      firstRow.y,
      1,
    );

    // The fixed header: a wheel over the body moves the rows under a header that
    // keeps its painted place.
    yield* ctx.host.wheel(DATA_TABLE_BODY, 0, -300);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the wheel changes nothing the control owns",
      yield* readout(),
      `${DATA_TABLE_SORT_DESC}`,
    );
    const headerAfter = yield* ctx.expectSome(
      "the header still painted",
      Option.fromNullishOr(yield* ctx.host.bounds(DATA_TABLE_NAME_HEADER)),
    );
    yield* ctx.expectNear(
      "the header keeps its painted position",
      headerAfter.y,
      initial.y,
      1,
    );
    const scrolled = yield* ctx.expectSome(
      "the scrolled row painted",
      Option.fromNullishOr(yield* ctx.host.bounds(dataTableRow(60))),
    );
    yield* ctx.expectEqual(
      "and the rows moved under it",
      scrolled.y < top.y,
      true,
    );

    // The shipped column menu, opened from a trigger inside the header: it is a
    // real `DropdownMenu`, so Escape dismisses it and returns the focus.
    yield* ctx.host.click(DATA_TABLE_COLUMNS);
    yield* ctx.host.waitFor(dataTableColumnToggle("status"));
    yield* Effect.sleep(SETTLE);
    const sizeBefore = yield* ctx.expectSome(
      "the last column painted before the hide",
      Option.fromNullishOr(yield* ctx.host.bounds("files-size")),
    );
    yield* ctx.host.key("escape");
    yield* ctx.expectEqual(
      "Escape dismisses the column menu",
      yield* settleGone(ctx, dataTableColumnToggle("status")),
      true,
    );
    yield* ctx.expectEqual(
      "and hands the focus back to its trigger",
      yield* focusedAfterPaint(ctx),
      DATA_TABLE_COLUMNS,
    );
    yield* ctx.host.click(DATA_TABLE_COLUMNS);
    yield* ctx.host.waitFor(dataTableColumnToggle("status"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.host.click(dataTableColumnToggle("status"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "hiding a column takes its width out of the content",
      yield* readout(),
      dataTableReadout({
        rows: 60,
        selected: 2,
        columns: ["name", "size"],
        width: DATA_TABLE_NAME_WIDTH,
        content: dataTableContent(["name", "size"]),
        sort: DATA_TABLE_SORT_DESC,
      }),
    );
    yield* ctx.expectEqual(
      "the hidden column paints no header",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds("files-status")),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "and no cell",
      Option.isNone(
        Option.fromNullishOr(
          yield* ctx.host.bounds(dataTableCell(60, "status")),
        ),
      ),
      true,
    );
    const sizeAfter = yield* ctx.expectSome(
      "the later column still painted",
      Option.fromNullishOr(yield* ctx.host.bounds("files-size")),
    );
    yield* ctx.expectNear(
      "the later column moved left by exactly the hidden width",
      sizeBefore.x - sizeAfter.x,
      110,
      1,
    );

    // Reset restores the declared columns, in the declared order and widths.
    yield* ctx.host.click(DATA_TABLE_COLUMN_RESET);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the reset restores all three columns",
      yield* readout(),
      "cols=name,status,size",
    );
    yield* ctx.expectContains(
      "and the declared content width",
      yield* readout(),
      `content=${DATA_TABLE_CONTENT_WIDTH}`,
    );

    // A leaving surface keeps its shield for the exit tween and takes the press
    // meant for the page behind it (`presence`), so the drag waits until the
    // menu the reset closed is actually gone rather than racing its fade.
    yield* ctx.expectEqual(
      "the reset's menu is gone before the divider takes a press",
      yield* settleGone(ctx, dataTableColumnToggle("status")),
      true,
    );

    // The shipped divider's drag: eight moves, the column's own clamp, and the
    // header and every cell on the width it reports.
    yield* ctx.host.drag(DATA_TABLE_DIVIDER, DATA_TABLE_DRAG, 0);
    yield* Effect.sleep(SETTLE);
    const width = DATA_TABLE_NAME_WIDTH + DATA_TABLE_DRAG;
    yield* ctx.expectContains(
      "a drag widens the column it starts on",
      yield* readout(),
      `w=${width}`,
    );
    yield* ctx.expectContains(
      "and the content grows with it",
      yield* readout(),
      `content=${dataTableContent(DATA_TABLE_COLUMNS_ORDER, width)}`,
    );
    yield* ctx.expectNear(
      "the header paints the new width",
      (yield* paintedBox(ctx, DATA_TABLE_NAME_HEADER)).width,
      width,
      1,
    );
    yield* ctx.expectNear(
      "and so does the cell under it",
      (yield* paintedBox(ctx, dataTableCell(1, "name"))).width,
      width,
      1,
    );
    yield* ctx.host.capture("data-table-resized");

    // The filter last: it narrows the painted set and releases the selection it
    // hides in the same commit, and a query that widens again revives the
    // records the controller still holds — the retention `useTable` documents.
    yield* ctx.host.click(DATA_TABLE_FILTER);
    yield* ctx.host.key("001");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a typed filter narrows the rows and releases the hidden selection",
      yield* readout(),
      dataTableReadout({
        rows: 1,
        selected: 0,
        columns: DATA_TABLE_COLUMNS_ORDER,
        width: DATA_TABLE_NAME_WIDTH + DATA_TABLE_DRAG,
        content: dataTableContent(
          DATA_TABLE_COLUMNS_ORDER,
          DATA_TABLE_NAME_WIDTH + DATA_TABLE_DRAG,
        ),
        sort: DATA_TABLE_SORT_DESC,
      }),
    );
    yield* ctx.expectEqual(
      "the one matching row paints",
      Option.isSome(
        Option.fromNullishOr(yield* ctx.host.bounds(dataTableRow(1))),
      ),
      true,
    );
    yield* ctx.expectEqual(
      "a row the query hides paints nothing",
      Option.isNone(
        Option.fromNullishOr(yield* ctx.host.bounds(dataTableRow(2))),
      ),
      true,
    );
    // A query the whole set matches brings every record back — typed over the
    // narrowed text with the field's own select-all — and it brings the chosen
    // records with it: `useTable` retains the store and only hides what the
    // query releases, so widening the set paints the choice again. That is the
    // rule a grid reading this page must know before it clears a filter in an
    // effect expecting the release to be permanent.
    yield* ctx.host.key("cmd-a");
    yield* ctx.host.key("file");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "clearing the query restores the whole set",
      yield* readout(),
      "60 rows",
    );
    yield* ctx.expectContains(
      "and the records the controller held are chosen again",
      yield* readout(),
      "2 selected",
    );
    yield* ctx.host.capture("data-table-filtered");
  });

/**
 * The shipped `@gpuixui/data` virtualized table, driven in a real window.
 *
 * Tier 3's *Virtualized tables* row says the window is app state, and the
 * runtime's `<virtual-list>` in `itemCount` mode is the mechanism. The offscreen
 * `data-table-core` scenario mounts the plain table and the `virtual-list-*`
 * probes drive the runtime's list itself; nothing had mounted `VirtualTable`,
 * where a reveal moves the app's window **before** it scrolls, a programmatic
 * reveal reports no range event, and the reported range lags the paint by one
 * gesture. The probe mounts the example from the package's registry and asserts
 * its own readout, so the row, window and reveal arithmetic are the shipped
 * screen's.
 */
const VirtualTableProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const Example = dataExamples["virtual-table"];
  return (
    <div
      testId="virtual-table-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped virtualized table: one window of a thousand rows exists, a
        reveal jumps to a row that was never mounted, and the header holds its
        place while the rows move under it.
      </text>
      {Example === undefined ? null : <Example />}
    </div>
  );
};

const virtualTableSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(VIRTUAL_TABLE_READOUT);
    const readout = () => ctx.host.text(VIRTUAL_TABLE_READOUT);
    const present = (id: string) =>
      Effect.map(ctx.host.bounds(id), Option.fromNullishOr);
    const mounted = (n: number) =>
      Effect.map(present(virtualTableRow(n)), Option.isSome);

    yield* ctx.expectEqual(
      "the table opens on the example's own readout, no range reported yet",
      yield* readout(),
      VIRTUAL_TABLE_INITIAL,
    );
    const header = yield* ctx.expectSome(
      "the header painted",
      yield* present(VIRTUAL_TABLE_NAME_SORT),
    );
    yield* ctx.expectEqual("the first row is mounted", yield* mounted(1), true);
    yield* ctx.expectEqual(
      "a row far outside the window is not in the tree",
      yield* mounted(100),
      false,
    );

    // One gesture moves the paint one window: the range event names the window
    // the reader left, not the one now painted — the lag the component's header
    // documents.
    yield* ctx.host.wheel(virtualTableRow(1), 0, -300);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the reported range still names the window the reader left",
      yield* readout(),
      virtualTableReadout({
        rows: 1_000,
        selected: 0,
        first: Option.some(0),
        last: Option.some(8),
      }),
    );
    yield* ctx.expectEqual(
      "while the paint has already moved past it",
      yield* mounted(9),
      true,
    );
    yield* ctx.expectEqual(
      "and the first row is gone",
      yield* mounted(1),
      false,
    );
    const headerAfter = yield* ctx.expectSome(
      "the header still painted",
      yield* present(VIRTUAL_TABLE_NAME_SORT),
    );
    yield* ctx.expectNear(
      "the header keeps its painted position",
      headerAfter.y,
      header.y,
      1,
    );

    // A gesture larger than the mounted window still travels: the list clamps
    // its scroll to the content it was given, and the app's window follows the
    // anchor the runtime reports.
    yield* ctx.host.wheel(virtualTableRow(9), 0, -3000);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the range keeps lagging one gesture",
      yield* readout(),
      virtualTableReadout({
        rows: 1_000,
        selected: 0,
        first: Option.some(8),
        last: Option.some(16),
      }),
    );
    yield* ctx.expectEqual(
      "the window landed near the row a three-thousand-point wheel names",
      yield* mounted(92),
      true,
    );
    yield* ctx.expectEqual(
      "and its last painted row is the ninth of the window",
      yield* mounted(100),
      true,
    );
    yield* ctx.expectEqual(
      "the row after it is not mounted",
      yield* mounted(101),
      false,
    );

    // The reveal is the only way to a row the scroll has never mounted: the app
    // moves its window in the same render and then scrolls, and a programmatic
    // reveal reports no range event at all.
    yield* ctx.host.click(VIRTUAL_TABLE_REVEAL);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the reveal paints a row that was never mounted",
      yield* mounted(901),
      true,
    );
    yield* ctx.expectEqual(
      "the revealed row is the window's first, one above the paint",
      yield* mounted(900),
      false,
    );
    yield* ctx.expectEqual(
      "a programmatic reveal reports no range event",
      yield* readout(),
      virtualTableReadout({
        rows: 1_000,
        selected: 0,
        first: Option.some(8),
        last: Option.some(16),
      }),
    );

    // A press chooses the record it hit. The window then moves away and the
    // reveal brings it back: the choice is kept by record, not by position.
    yield* ctx.host.click(virtualTableRow(905));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press chooses the row it hit",
      yield* readout(),
      virtualTableReadout({
        rows: 1_000,
        selected: 1,
        first: Option.some(8),
        last: Option.some(16),
      }),
    );
    yield* ctx.host.wheel(virtualTableRow(905), 0, -300);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the window leaves the chosen row",
      yield* mounted(905),
      false,
    );
    yield* ctx.expectContains(
      "and the choice is kept",
      yield* readout(),
      "1 selected",
    );
    yield* ctx.host.click(VIRTUAL_TABLE_REVEAL);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the reveal brings the chosen row back into the window",
      yield* mounted(905),
      true,
    );
    yield* ctx.expectContains(
      "with its record still chosen",
      yield* readout(),
      "1 selected",
    );
    yield* ctx.host.capture("virtual-table-revealed");

    // The filter narrows the set while the window sits past its end. A scroll
    // offset belongs to the set it was measured against, so the window commits
    // the narrowed set's clamp in the same render: records the set no longer
    // holds leave the tree, and the tail still fills the viewport. Without the
    // clamp the core lands the stale offset on the new content's end and mounts
    // five rows in a nine-row viewport, so half the table goes blank until the
    // next wheel.
    yield* ctx.host.click(VIRTUAL_TABLE_FILTER);
    yield* ctx.host.key("0");
    yield* ctx.host.key("1");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the query narrows the set and releases the choice",
      yield* readout(),
      `${VIRTUAL_TABLE_FILTERED_ROWS} rows · 0 selected`,
    );
    yield* ctx.expectEqual(
      "a record the narrowed set does not hold leaves the tree",
      yield* mounted(700),
      false,
    );
    yield* ctx.expectEqual(
      "a record the narrowed set still holds stays painted",
      yield* mounted(701),
      true,
    );
    const painted = yield* ctx.host.paintedText();
    const names = Arr.filter(painted, (line) => line.includes("file-"));
    yield* ctx.expectEqual(
      "the tail fills the viewport from the narrowed set",
      names.length >= Math.floor(320 / 36),
      true,
    );
    yield* ctx.expectEqual(
      "and ends on the narrowed set's last record",
      Option.match(Arr.last(names), {
        onNone: () => "",
        onSome: (name) => name,
      }),
      "file-0901.ts",
    );
    yield* ctx.host.wheel(VIRTUAL_TABLE, 0, -300);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "the next scroll reports the narrowed set's range",
      yield* readout(),
      `last=${VIRTUAL_TABLE_FILTERED_ROWS}`,
    );
    yield* ctx.expectEqual(
      "a record outside the narrowed set never returns",
      yield* mounted(700),
      false,
    );
    const afterScroll = yield* ctx.host.paintedText();
    const namesAfter = Arr.filter(afterScroll, (line) =>
      line.includes("file-"),
    );
    yield* ctx.expectEqual(
      "the paint still fills the viewport from the narrowed set",
      namesAfter.length >= Math.floor(320 / 36),
      true,
    );
    yield* ctx.expectEqual(
      "and still ends on the narrowed set's last record",
      Option.getOrElse(Arr.last(namesAfter), () => ""),
      "file-0901.ts",
    );
    yield* ctx.expectEqual(
      "a record outside the narrowed set never paints",
      Arr.some(namesAfter, (name) => name === "file-0700.ts"),
      false,
    );
  });

/**
 * The shipped `@gpuixui/data` workspace tree, driven in a real window.
 *
 * Tier 3's *Tree views* row rests on the offscreen `data-tree-core` scenario,
 * where a key is synthesised into the row's handler. The tree's contract is
 * about **native focus**: one tab stop that follows the cursor, a `focusElement`
 * call made after the row's `tabIndex` commits, and a type-ahead buffer fed by
 * the keys the focused row receives. The probe mounts the example from the
 * package's registry and reads the focused row's `testId` after every gesture, so
 * a key that never reached the row names the gesture rather than the component.
 */
const DataTreeProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const Example = dataExamples["tree"];
  return (
    <div
      testId="data-tree-probe"
      style={{
        width: window.width,
        height: window.height,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        The shipped workspace tree: one tab stop follows the cursor, arrows open
        and close branches, typing jumps to a row, and a reveal opens the path
        to a deep file.
      </text>
      {Example === undefined ? null : <Example />}
    </div>
  );
};

const dataTreeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(DATA_TREE_READOUT);
    const readout = () => ctx.host.text(DATA_TREE_READOUT);
    const present = (key: string) =>
      Effect.map(ctx.host.bounds(dataTreeRow(key)), Option.fromNullishOr);
    const mounted = (key: string) => Effect.map(present(key), Option.isSome);
    const state = (rows: number, active: string) =>
      dataTreeReadout({ rows, active: Option.some(active) });

    yield* ctx.expectEqual(
      "the tree opens on the example's own readout",
      yield* readout(),
      DATA_TREE_INITIAL,
    );
    yield* ctx.expectEqual(
      "the active row is mounted",
      yield* mounted("src"),
      true,
    );
    yield* ctx.expectEqual(
      "a closed branch's children are not in the tree",
      yield* mounted("button.tsx"),
      false,
    );
    yield* ctx.expectEqual(
      "nothing holds the focus until the reader touches the tree",
      yield* focusedId(ctx),
      "none",
    );

    // A press on an **open** folder closes it, and the runtime hands the press's
    // focus to the row: the tree's one tab stop and the focused element agree
    // from the first gesture.
    yield* ctx.host.click(dataTreeRow("src"));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a press on an open folder folds it",
      yield* readout(),
      state(DATA_TREE_ROWS_FOLDED, "src"),
    );
    yield* ctx.expectEqual(
      "and the row takes the focus the press gave it",
      yield* focusedAfterPaint(ctx),
      dataTreeRow("src"),
    );
    yield* ctx.expectEqual(
      "the folded branch's children leave the tree",
      yield* mounted("components"),
      false,
    );

    // Right opens the closed branch, then steps into it: the first press opens,
    // the second moves the cursor, and the row's `tabIndex` commit comes first.
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Right opens the branch the cursor is on",
      yield* readout(),
      state(DATA_TREE_ROWS_OPEN, "src"),
    );
    yield* ctx.expectEqual(
      "and paints its children",
      yield* mounted("components"),
      true,
    );
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Right again steps into the open branch",
      yield* readout(),
      state(DATA_TREE_ROWS_OPEN, "components"),
    );
    yield* ctx.expectEqual(
      "moving the cursor moves the real focus with it",
      yield* focusedAfterPaint(ctx),
      dataTreeRow("components"),
    );

    // Down walks the visible rows in paint order — past a closed branch's hidden
    // children — and Left leaves a branch for its parent.
    yield* ctx.host.key("down");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "ArrowDown walks to the next visible row",
      yield* readout(),
      state(DATA_TREE_ROWS_OPEN, "index.ts"),
    );
    yield* ctx.expectEqual(
      "with the focus",
      yield* focusedAfterPaint(ctx),
      dataTreeRow("index.ts"),
    );
    yield* ctx.host.key("left");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "ArrowLeft leaves the branch for its parent",
      yield* readout(),
      state(DATA_TREE_ROWS_OPEN, "src"),
    );

    // Type-ahead is the third way to move the cursor, and it moves the focus too.
    yield* ctx.host.key("p");
    yield* ctx.host.key("a");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "typing a name jumps to the row it matches",
      yield* readout(),
      state(DATA_TREE_ROWS_OPEN, "package.json"),
    );
    yield* ctx.expectEqual(
      "and the jump moves the focus",
      yield* focusedAfterPaint(ctx),
      dataTreeRow("package.json"),
    );

    // The reveal is the app's action, not the tree's key handler: it opens the
    // path and moves the cursor, and the tree follows the **committed** cursor,
    // so the revealed row takes the focus after its subtree mounts — the shape
    // a search hit or a "show this file" command needs.
    yield* ctx.host.click(DATA_TREE_REVEAL);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the reveal opens the path to a deep file and moves the cursor",
      yield* readout(),
      state(DATA_TREE_ROWS_REVEALED, DATA_TREE_REVEALED),
    );
    yield* ctx.expectEqual(
      "the revealed row is mounted",
      yield* mounted(DATA_TREE_REVEALED),
      true,
    );
    yield* ctx.expectEqual(
      "the reveal leaves the focus on the row it reveals",
      yield* focusedAfterPaint(ctx),
      dataTreeRow(DATA_TREE_REVEALED),
    );
    yield* ctx.host.capture("data-tree-revealed");

    // The two batch actions change the row set without touching the cursor: the
    // active key survives even while its row is hidden, which is what the
    // readout prints.
    yield* ctx.host.click(DATA_TREE_COLLAPSE);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Collapse all folds every branch",
      yield* readout(),
      state(DATA_TREE_ROWS_FOLDED, DATA_TREE_REVEALED),
    );
    yield* ctx.host.click(DATA_TREE_EXPAND);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Expand all shows every row",
      yield* readout(),
      state(DATA_TREE_ROWS_ALL, DATA_TREE_REVEALED),
    );
    yield* ctx.expectEqual(
      "the deepest file in the expanded tree is mounted",
      yield* mounted("header.tsx"),
      true,
    );
    yield* ctx.host.capture("data-tree-expanded");
  });

/**
 * A grid whose first column is drag-resized in a real window.
 *
 * Tier 3's **Resizable columns** row cites only the headless
 * `table-column-resize` scenario, where the pointer is synthesised. A reader's
 * drag differs in the way `SplitPane` documents: a window delivers the press and
 * every move before React commits the press's render, so the press is a **ref**,
 * and the drag survives leaving the divider's own 6px box only because the
 * divider listens to both `onMouseDown` and `onMouseMove` (the rule
 * `pointer-capture` measured). The rows beside the dragged column are the reason
 * the measurement matters: a width the header and the cells do not share is a
 * table that drifts.
 *
 * The divider is a control, not a decoration, so it is a tab stop with the split
 * pane's key contract — arrows move it a step, clamped through `keySize` — and
 * announces its width through `aria-valuetext` (the runtime has no
 * `aria-valuenow`).
 *
 * The divider under the grid keeps only the `onMouseMove` half: it is the
 * negative control, and a drag on it must move nothing.
 */
const ColumnResizeProbe = (): ReactNode => {
  const theme = useTheme();
  const press = useRef(
    Option.none<{ readonly x: number; readonly width: number }>(),
  );
  const [width, setWidth] = useState<number>(COLUMN_RESIZE.name);
  const [moves, setMoves] = useState(0);
  const [outside, setOutside] = useState(0);
  const [controlMoves, setControlMoves] = useState(0);
  const content = resizeContentWidth(width);

  const cellStyle = (column: number): StyleDesc => ({
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    width: column,
    height: COLUMN_RESIZE.rowHeight,
    paddingLeft: theme.spacing.sm,
    borderRightWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  });

  const headerStyle = (column: number): StyleDesc => ({
    ...cellStyle(column),
    backgroundColor: theme.colors.muted,
  });

  const dividerStyle: StyleDesc = {
    display: "flex",
    flexShrink: 0,
    width: COLUMN_RESIZE.divider,
    height: COLUMN_RESIZE.rowHeight,
    cursor: "col-resize",
    backgroundColor: theme.colors.border,
    hover: { backgroundColor: theme.colors.primary },
    ...keyboardFocusRing(theme),
  };

  return (
    <div
      testId={COLUMN_RESIZE_IDS.probe}
      style={{
        width: 560,
        height: 460,
        padding: theme.spacing.lg,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A resizable column: the divider keeps the whole drag past its own box,
        the header and its cells share the width, and the width clamps.
      </text>
      <Readout testId={COLUMN_RESIZE_IDS.readout}>
        {columnResizeReadout({
          width,
          control: COLUMN_RESIZE.control,
          moves,
          outside,
          controlMoves,
        })}
      </Readout>
      <div
        testId={COLUMN_RESIZE_IDS.grid}
        style={{
          width: COLUMN_RESIZE.viewport,
          height: COLUMN_RESIZE.viewportHeight,
          overflowX: "scroll",
          overflowY: "scroll",
          backgroundColor: theme.colors.card,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
        }}
      >
        <div
          style={{ width: content, display: "flex", flexDirection: "column" }}
        >
          <div role="row" style={{ display: "flex", flexDirection: "row" }}>
            <div
              testId={COLUMN_RESIZE_IDS.header}
              role="columnheader"
              style={headerStyle(width)}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                name
              </text>
            </div>
            <div
              testId={COLUMN_RESIZE_IDS.divider}
              role="separator"
              aria-label="Resize the name column"
              aria-valuetext={`${width} pixels`}
              tabIndex={0}
              style={dividerStyle}
              onMouseDown={(event) => {
                press.current = Option.some({
                  x: event.x ?? 0,
                  width,
                });
                setMoves(0);
                setOutside(0);
              }}
              onMouseMove={(event) =>
                Option.match(press.current, {
                  onNone: () => {},
                  onSome: (start) => {
                    const x = event.x ?? 0;
                    setWidth(resizedWidth(start.width, x - start.x));
                    setMoves((count) => count + 1);
                    if (movedPastDivider(start.x, x)) {
                      setOutside((count) => count + 1);
                    }
                  },
                })
              }
              onMouseUp={() => (press.current = Option.none())}
              onKeyDown={(event) =>
                isResizeKey(event.key) &&
                setWidth(
                  keySize({
                    size: width,
                    key: event.key,
                    step: SPLIT_KEYBOARD_STEP,
                    min: COLUMN_RESIZE.min,
                    max: COLUMN_RESIZE.max,
                  }),
                )
              }
            />
            <div
              testId={COLUMN_RESIZE_IDS.statusHeader}
              role="columnheader"
              style={headerStyle(COLUMN_RESIZE.status)}
            >
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                status
              </text>
            </div>
            <div role="columnheader" style={headerStyle(COLUMN_RESIZE.size)}>
              <text
                style={{
                  ...textStyle(theme, "caption"),
                  color: theme.colors.mutedForeground,
                }}
              >
                size
              </text>
            </div>
          </div>
          {Arr.map(COLUMN_RESIZE_ROWS, (row) => (
            <div
              key={row}
              role="row"
              style={{ display: "flex", flexDirection: "row" }}
            >
              <div
                testId={COLUMN_RESIZE_IDS.cell(row)}
                style={cellStyle(width)}
              >
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.foreground,
                  }}
                >
                  {`Item ${row}`}
                </text>
              </div>
              <div style={{ width: COLUMN_RESIZE.divider, flexShrink: 0 }} />
              <div style={cellStyle(COLUMN_RESIZE.status)}>
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.foreground,
                  }}
                >
                  ready
                </text>
              </div>
              <div style={cellStyle(COLUMN_RESIZE.size)}>
                <text
                  style={{
                    ...textStyle(theme, "caption"),
                    color: theme.colors.foreground,
                  }}
                >
                  {`${16 + ((row + 2) % 7) * 8} B`}
                </text>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div
          testId={COLUMN_RESIZE_IDS.controlHeader}
          style={headerStyle(COLUMN_RESIZE.control)}
        >
          <text
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
            }}
          >
            owner
          </text>
        </div>
        <div
          testId={COLUMN_RESIZE_IDS.controlDivider}
          role="separator"
          aria-label="A divider with only the move half"
          style={dividerStyle}
          onMouseMove={() => setControlMoves((count) => count + 1)}
        />
        <text
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
            paddingLeft: theme.spacing.sm,
          }}
        >
          move-only
        </text>
      </div>
    </div>
  );
};

const columnResizeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(COLUMN_RESIZE_IDS.grid);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(COLUMN_RESIZE_IDS.readout);
    const offsetX = () =>
      Effect.map(ctx.host.scrollOffset(COLUMN_RESIZE_IDS.grid), (found) =>
        Option.match(Option.fromNullishOr(found), {
          onNone: () => Number.NaN,
          onSome: (value) => value.x,
        }),
      );

    // 1. The grid opens at the width the fixture declares.
    const opened = {
      width: COLUMN_RESIZE.name,
      control: COLUMN_RESIZE.control,
      moves: 0,
      outside: 0,
      controlMoves: 0,
    };
    yield* ctx.expectEqual(
      "the grid opens at its declared width",
      yield* readout(),
      columnResizeReadout(opened),
    );
    yield* ctx.expectNear(
      "the resized column paints the width the grid declares",
      (yield* paintedBox(ctx, COLUMN_RESIZE_IDS.header)).width,
      COLUMN_RESIZE.name,
      1,
    );
    const viewport = yield* paintedBox(ctx, COLUMN_RESIZE_IDS.grid);
    const lastHeader = yield* paintedBox(ctx, COLUMN_RESIZE_IDS.statusHeader);
    yield* ctx.expectEqual(
      "the content is wider than the viewport it pans in",
      lastHeader.x + lastHeader.width + COLUMN_RESIZE.size >
        viewport.x + COLUMN_RESIZE.viewport,
      true,
    );

    // 2. The divider keeps the whole drag, past its own 6px box.
    yield* ctx.host.drag(COLUMN_RESIZE_IDS.divider, 60, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the divider follows a 60-point drag past its own box",
      yield* readout(),
      columnResizeReadout({
        ...opened,
        width: 220,
        moves: DRAG_STEPS,
        outside: DRAG_STEPS,
      }),
    );
    const widened = yield* paintedBox(ctx, COLUMN_RESIZE_IDS.header);
    yield* ctx.expectNear(
      "the widened header paints the new width",
      widened.width,
      220,
      1,
    );
    const rowCell = yield* paintedBox(ctx, COLUMN_RESIZE_IDS.cell(0));
    yield* ctx.expectEqual(
      "the row's cell takes the width the header took",
      rowCell.width,
      widened.width,
    );
    yield* ctx.expectEqual(
      "the cell starts where its header starts",
      rowCell.x,
      widened.x,
    );
    yield* ctx.expectNear(
      "every later column shifts with the resized one",
      (yield* paintedBox(ctx, COLUMN_RESIZE_IDS.statusHeader)).x - lastHeader.x,
      60,
      1,
    );

    // 3. The release ends the gesture: a move over the divider after it resizes
    //    nothing, however far the pointer is from where the press began.
    yield* ctx.host.hover(COLUMN_RESIZE_IDS.divider);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a move after the release resizes nothing",
      yield* readout(),
      columnResizeReadout({
        ...opened,
        width: 220,
        moves: DRAG_STEPS,
        outside: DRAG_STEPS,
      }),
    );

    // 4. A drag past the floor clamps, and the header paints the clamp.
    yield* ctx.host.drag(COLUMN_RESIZE_IDS.divider, -150, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a drag past the narrowest width clamps to it",
      yield* readout(),
      columnResizeReadout({
        ...opened,
        width: COLUMN_RESIZE.min,
        moves: DRAG_STEPS,
        outside: 0,
      }),
    );
    yield* ctx.expectNear(
      "the clamped header paints the floor, not where the pointer went",
      (yield* paintedBox(ctx, COLUMN_RESIZE_IDS.header)).width,
      COLUMN_RESIZE.min,
      1,
    );

    // 5. A second drag starts from the width its own press saw, not the last
    //    gesture's start.
    yield* ctx.host.drag(COLUMN_RESIZE_IDS.divider, 30, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a second drag measures from the width it found",
      yield* readout(),
      columnResizeReadout({
        ...opened,
        width: 150,
        moves: DRAG_STEPS,
        outside: DRAG_STEPS,
      }),
    );

    // 6. The widened grid still pans in one scroller, header and cells together.
    yield* ctx.host.wheel(COLUMN_RESIZE_IDS.grid, -20, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectNear(
      "the wheel pans the widened content",
      yield* offsetX(),
      -20,
      2,
    );
    const pannedHeader = yield* paintedBox(ctx, COLUMN_RESIZE_IDS.header);
    yield* ctx.expectEqual(
      "the panning header and its cells share one offset",
      (yield* paintedBox(ctx, COLUMN_RESIZE_IDS.cell(0))).x,
      pannedHeader.x,
    );

    // 7. The divider is a control: a key resizes it too.
    yield* ctx.host.focusElement(COLUMN_RESIZE_IDS.divider);
    yield* ctx.host.key("right");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "an arrow key widens the column by the step",
      yield* readout(),
      columnResizeReadout({
        ...opened,
        width: 150 + SPLIT_KEYBOARD_STEP,
        moves: DRAG_STEPS,
        outside: DRAG_STEPS,
      }),
    );
    yield* ctx.expectNear(
      "the keyboard's width is the width the header paints",
      (yield* paintedBox(ctx, COLUMN_RESIZE_IDS.header)).width,
      150 + SPLIT_KEYBOARD_STEP,
      1,
    );

    // 8. The negative control: a divider with only the move half keeps none of
    //    the drag, so its column never changes width.
    yield* ctx.host.drag(COLUMN_RESIZE_IDS.controlDivider, 60, 0);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a divider with only the move half hears one move and resizes nothing",
      yield* readout(),
      columnResizeReadout({
        ...opened,
        width: 150 + SPLIT_KEYBOARD_STEP,
        moves: DRAG_STEPS,
        outside: DRAG_STEPS,
        controlMoves: CONTROL_MOVES,
      }),
    );
    yield* ctx.expectNear(
      "the move-only divider's column paints its declared width",
      (yield* paintedBox(ctx, COLUMN_RESIZE_IDS.controlHeader)).width,
      COLUMN_RESIZE.control,
      1,
    );
    yield* ctx.host.capture("column-resize");
  });

/**
 * The roving-focus grid a data grid, a tree or a toolbar builds.
 *
 * One cell carries `tabIndex: 0` — the app's remembered cell — and every other
 * cell carries `-1`, so the widget is one stop in the traversal. An arrow key
 * arrives at the focused cell's own handler, the app moves real focus with
 * `renderer.focusElement`, and the remembered cell becomes the one Tab enters
 * at. A press activates a cell and moves the memory there, so a reader who
 * leaves and returns lands where they were.
 */
const GridFocusProbe = (): ReactNode => {
  const theme = useTheme();
  const window = useWindowSize();
  const renderer = useGpuix().renderer;
  const [readout, setReadout] = useState<GridFocusReadout>(initialReadout);
  const roving = useRef(0);
  const cellIds = useRef<
    ReadonlyArray<{ readonly index: number; readonly elementId: number }>
  >([]);

  const cellStyle = {
    width: 64,
    height: 32,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: theme.colors.card,
    border: `${theme.borderWidth.thin} solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
  };

  /** Keeps the cell's native id, the handle `focusElement` takes. */
  const register = useCallback(
    (index: number, instance: PublicInstance | null) => {
      const kept = Arr.filter(
        cellIds.current,
        (entry) => entry.index !== index,
      );
      cellIds.current =
        instance === null
          ? kept
          : Arr.append(kept, { index, elementId: instance.id });
    },
    [],
  );

  /** Moves real focus to a cell and remembers it, the app's half of the model. */
  const moveTo = useCallback(
    (index: number) => {
      Option.match(
        Arr.findFirst(cellIds.current, (entry) => entry.index === index),
        {
          onNone: () => {},
          onSome: (entry) => renderer?.focusElement?.(entry.elementId),
        },
      );
      roving.current = index;
      setReadout(
        (current) => new GridFocusReadout({ ...current, roving: index }),
      );
    },
    [renderer],
  );

  const onKey = useCallback(
    (key: string) => {
      Option.match(gridKeyOf(key), {
        onNone: () => {},
        onSome: (gridKey) => moveTo(moveIndex(roving.current, gridKey)),
      });
    },
    [moveTo],
  );

  const page = {
    width: window.width,
    height: window.height,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: theme.spacing.md,
  };
  const stop = {
    ...textStyle(theme, "body"),
    color: theme.colors.mutedForeground,
    padding: theme.spacing.sm,
  };

  return (
    <div testId={GRID_FOCUS_IDS.probe} style={page}>
      <text
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        One tab stop for the grid, arrows moving real focus, and the remembered
        cell restored when a traversal comes back.
      </text>
      <div
        testId={GRID_FOCUS_IDS.before}
        tabIndex={0}
        role="button"
        onClick={() => {}}
        style={stop}
      >
        <text style={stop}>Before the grid</text>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.xs,
        }}
      >
        {Arr.map(Arr.range(0, GRID_ROWS - 1), (row) => (
          <div
            key={`row-${row}`}
            style={{
              display: "flex",
              flexDirection: "row",
              gap: theme.spacing.xs,
            }}
          >
            {Arr.map(Arr.range(0, GRID_COLUMNS - 1), (column) => {
              const index = row * GRID_COLUMNS + column;
              return (
                <div
                  key={cellId(row, column)}
                  testId={cellId(row, column)}
                  ref={(instance) => register(index, instance)}
                  tabIndex={tabIndexOf(index, readout.roving)}
                  role="button"
                  aria-label={`Row ${row + 1}, column ${column + 1}`}
                  onClick={() =>
                    setReadout(
                      (current) =>
                        new GridFocusReadout({
                          roving: index,
                          activations: current.activations + 1,
                        }),
                    )
                  }
                  onKeyDown={(event) => onKey(event.key ?? "")}
                  style={cellStyle}
                >
                  <text style={textStyle(theme, "body")}>
                    {`${row + 1}.${column + 1}`}
                  </text>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div
        testId={GRID_FOCUS_IDS.after}
        tabIndex={0}
        role="button"
        onClick={() => {}}
        style={stop}
      >
        <text style={stop}>After the grid</text>
      </div>
      <text testId={GRID_FOCUS_IDS.readout} style={textStyle(theme, "caption")}>
        {formatReadout(readout)}
      </text>
    </div>
  );
};

const gridFocusSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(GRID_FOCUS_IDS.probe);
    yield* Effect.sleep(SETTLE);

    const readout = () => ctx.host.text(GRID_FOCUS_IDS.readout);
    const cell = (row: number, column: number) => cellId(row, column);
    const focusCell = (label: string, row: number, column: number) =>
      Effect.flatMap(focusedAfterPaint(ctx), (focused) =>
        ctx.expectEqual(label, focused, cell(row, column)),
      );
    const enterFromBefore = Effect.gen(function* () {
      yield* ctx.host.focusElement(GRID_FOCUS_IDS.before);
      yield* ctx.host.key("tab");
    });

    yield* ctx.expectContains(
      "the grid opens on its first cell with nothing activated",
      yield* readout(),
      formatReadout(initialReadout),
    );
    yield* ctx.host.focusElement(GRID_FOCUS_IDS.before);
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "the control before the grid takes the focus",
      yield* focusedId(ctx),
      GRID_FOCUS_IDS.before,
    );

    // 1. One tab stop: the traversal enters at the cell the app remembers.
    yield* enterFromBefore;
    yield* focusCell(
      "Tab enters the grid at its remembered cell, not the first cell",
      0,
      0,
    );

    // 2. Arrows move real focus, and the roving stop follows the move.
    yield* ctx.host.key("right");
    yield* focusCell("Right moves focus one cell along the row", 0, 1);
    yield* ctx.expectContains(
      "the remembered cell follows the move",
      yield* readout(),
      "roving=r0c1",
    );
    yield* ctx.host.key("right");
    yield* focusCell("Right reaches the row's last cell", 0, 2);
    yield* ctx.host.key("right");
    yield* focusCell("Right clamps at the row's end", 0, 2);

    // 3. The vertical axis and the row's ends.
    yield* ctx.host.key("down");
    yield* focusCell("Down moves focus one cell down", 1, 2);
    yield* ctx.host.key("home");
    yield* focusCell("Home reaches the row's first cell", 1, 0);
    yield* ctx.host.key("end");
    yield* focusCell("End reaches the row's last cell", 1, 2);
    yield* ctx.host.key("up");
    yield* focusCell("Up moves focus one cell up", 0, 2);
    yield* ctx.host.key("up");
    yield* focusCell("Up clamps at the grid's top edge", 0, 2);

    // 4. Tab leaves after one press, and a press moves the remembered cell.
    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Tab leaves the grid after one press rather than walking its cells",
      yield* focusedId(ctx),
      GRID_FOCUS_IDS.after,
    );
    yield* enterFromBefore;
    yield* focusCell(
      "Tab re-enters at the cell the reader left, not the first cell",
      0,
      2,
    );

    yield* ctx.host.click(cell(2, 1));
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectContains(
      "a press activates its cell and becomes the widget's remembered cell",
      yield* readout(),
      "roving=r2c1 activations=1",
    );
    yield* enterFromBefore;
    yield* focusCell("the pressed cell is where Tab re-enters", 2, 1);

    // 5. A cell that is not a tab stop is still reachable by the app — and it
    //    keeps a place in the traversal, ordered *before* the zero-index stops,
    //    so a Tab from it lands on the control before the grid.
    yield* ctx.host.focusElement(cell(2, 2));
    yield* Effect.sleep(SETTLE);
    yield* focusCell(
      "the app focuses a cell its roving tab stop excluded",
      2,
      2,
    );
    yield* ctx.host.key("tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "a negative tab index is ordered before the grid's stops, not removed from the chain",
      yield* focusedId(ctx),
      GRID_FOCUS_IDS.before,
    );

    // The remembered stop itself leaves forwards and backwards, one press each.
    yield* enterFromBefore;
    yield* focusCell("the remembered stop is reachable again", 2, 1);
    yield* ctx.host.key("shift-tab");
    yield* Effect.sleep(SETTLE);
    yield* ctx.expectEqual(
      "Shift+Tab leaves the grid backwards after one press",
      yield* focusedId(ctx),
      GRID_FOCUS_IDS.before,
    );

    yield* ctx.host.capture("grid-focus");
  });

/**
 * One window following the desktop's palette.
 *
 * The view is the consumer's whole wiring: `watchSystemTheme` polls the decoder
 * (module state here; a platform file in a real app), its `onChange` is the
 * state the `ThemeProvider` wears, and the surface below paints the palette's
 * page and accent so a capture can read the repaint. The mount count is taken
 * once, lazily, so a re-apply that remounted the tree would show up as `2`.
 */
const SystemThemeSurface = (): ReactNode => {
  const theme = useTheme();
  const [mounts] = useState(recordMount);
  return (
    <div
      testId={SYSTEM_THEME_IDS.probe}
      style={{
        width: PROBE_BOX.width,
        height: PROBE_BOX.height,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        testId={SYSTEM_THEME_IDS.swatch}
        style={{
          width: SWATCH_BOX.width,
          height: SWATCH_BOX.height,
          borderRadius: 8,
          backgroundColor: theme.colors.primary,
        }}
      />
      <Readout testId={SYSTEM_THEME_IDS.page}>
        {theme.colors.background}
      </Readout>
      <Readout testId={SYSTEM_THEME_IDS.mounts}>{`mounts=${mounts}`}</Readout>
    </div>
  );
};

const SystemThemeProbe = (): ReactNode => {
  const [applied, setApplied] = useState<Theme>(baseTheme);
  useEffect(
    () =>
      watchSystemTheme({
        read: readSystemPalette,
        base: baseTheme,
        onChange: setApplied,
        every: SYSTEM_THEME_POLL_MS,
      }),
    [],
  );
  return (
    <TokensThemeProvider theme={applied}>
      <SystemThemeSurface />
    </TokensThemeProvider>
  );
};

const systemThemeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    const page = () => ctx.host.text(SYSTEM_THEME_IDS.page);
    const settled = (expected: string) =>
      settleUntil(page(), (value) => value === expected);
    const paint = (
      frame: Pixels.Pixels,
      scale: number,
      point: { readonly x: number; readonly y: number },
    ) =>
      Option.match(colourAt(frame, point, scale), {
        onNone: () => "outside the capture",
        onSome: describeColour,
      });
    const expected = (hex: string) =>
      Option.match(Option.fromNullishOr(Pixels.hexToRgba(hex)), {
        onNone: () => "unpaintable",
        onSome: describeColour,
      });

    yield* ctx.host.waitFor(SYSTEM_THEME_IDS.probe);

    // 1. The first read applies before anything else: the desktop's page is on
    //    screen with no press and no restart.
    yield* ctx.expectEqual(
      "the first read applies the desktop's page",
      yield* settled(NIGHT_PAGE),
      NIGHT_PAGE,
    );
    const mounts = yield* ctx.host.text(SYSTEM_THEME_IDS.mounts);

    // 2. The paint, not only the readout: the page and the accent box carry the
    //    palette's own colours. One capture sets the device scale for the rest.
    yield* ctx.host.capture("system-theme-night");
    const night = yield* ctx.host.pixels("system-theme-night");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(night, size),
    );
    yield* ctx.expectEqual(
      "the window paints the desktop's page",
      paint(night, scale, pagePoint),
      expected(NIGHT_PAGE),
    );
    yield* ctx.expectEqual(
      "the window paints the desktop's accent",
      paint(night, scale, swatchPoint),
      expected(NIGHT_SWATCH),
    );

    // 3. The desktop changes its theme — `omarchy-theme-set` writes the file,
    //    the poll reads it and the window follows, with the tree already there.
    yield* Effect.sync(() => setSystemPalette(paperPalette));
    yield* ctx.expectEqual(
      "a changed palette re-applies without a restart",
      yield* settled(PAPER_PAGE),
      PAPER_PAGE,
    );
    yield* ctx.expectEqual(
      "the tree is not remounted by the follow",
      yield* ctx.host.text(SYSTEM_THEME_IDS.mounts),
      mounts,
    );
    yield* ctx.host.capture("system-theme-paper");
    const paper = yield* ctx.host.pixels("system-theme-paper");
    yield* ctx.expectEqual(
      "the repaint reaches the page",
      paint(paper, scale, pagePoint),
      expected(PAPER_PAGE),
    );
    yield* ctx.expectEqual(
      "the repaint reaches the accent",
      paint(paper, scale, swatchPoint),
      expected(PAPER_SWATCH),
    );
    yield* ctx.expectEqual(
      "the desktop's two themes paint differently",
      Option.match(
        Option.all([
          colourAt(night, pagePoint, scale),
          colourAt(paper, pagePoint, scale),
        ]),
        {
          onNone: () => "outside the capture",
          onSome: ([before, after]) =>
            differs(before, after) ? "differ" : "same",
        },
      ),
      "differ",
    );

    // 4. The file goes away: the window returns to the application's own theme.
    yield* Effect.sync(clearSystemPalette);
    yield* ctx.expectEqual(
      "a deleted desktop theme returns the window to the application's theme",
      yield* settled(BASE_PAGE),
      BASE_PAGE,
    );
    yield* ctx.host.capture("system-theme-base");
    const base = yield* ctx.host.pixels("system-theme-base");
    yield* ctx.expectEqual(
      "the base theme's page is painted after the deletion",
      paint(base, scale, pagePoint),
      expected(BASE_PAGE),
    );
    yield* ctx.expectEqual(
      "the base theme's accent is painted after the deletion",
      paint(base, scale, swatchPoint),
      expected(BASE_SWATCH),
    );

    yield* Effect.sync(resetSystemPalette);
  });

/** One calibration line at a known size, painted in the strip's own role. */
const DocumentTypeCalibration = ({
  testId,
  size,
  family,
  text,
}: {
  readonly testId: string;
  readonly size: number;
  readonly family?: string;
  readonly text: string;
}): ReactNode => (
  <text
    testId={testId}
    style={{
      fontFamily: family,
      fontSize: size,
      lineHeight: 28,
      color: DOCUMENT_TYPE_THEME.colors.mutedForeground,
    }}
  >
    {text}
  </text>
);

/**
 * Three document hosts in one theme whose code and caption roles are
 * unmistakable, each beside the plain host the runtime's own numbers paint.
 *
 * `<code>` paints no surface, so its ink is read against the page; a `<markdown>`
 * fenced card does paint washes, so its language strip is read by the exact
 * `mutedForeground` glyph pixels instead.
 */
const DocumentTypeProbe = (): ReactNode => {
  const theme = DOCUMENT_TYPE_THEME;
  return (
    <div
      testId={DOCUMENT_TYPE_IDS.probe}
      style={{
        width: 870,
        height: 500,
        padding: 12,
        display: "flex",
        flexDirection: "row",
        gap: 16,
        backgroundColor: theme.colors.background,
      }}
    >
      <div
        style={{
          width: 280,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <DocumentTypeCalibration
          testId={DOCUMENT_TYPE_IDS.codeCalibration}
          size={CODE_SIZE}
          family={theme.typography.mono}
          text="HAMBURG"
        />
        <code
          testId={DOCUMENT_TYPE_IDS.codeThemed}
          code={CODE_SAMPLE}
          language="ts"
          theme={DOCUMENT_TYPE_HOST}
        />
        <DocumentTypeCalibration
          testId={DOCUMENT_TYPE_IDS.codeRuntimeCalibration}
          size={12.5}
          family={theme.typography.mono}
          text="HAMBURG"
        />
        <code
          testId={DOCUMENT_TYPE_IDS.codePlain}
          code={CODE_SAMPLE}
          language="ts"
        />
      </div>
      <div
        style={{
          width: 280,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <diff
          testId={DOCUMENT_TYPE_IDS.diffThemed}
          patch={PATCH_SAMPLE}
          theme={DOCUMENT_TYPE_HOST}
        />
        <diff testId={DOCUMENT_TYPE_IDS.diffPlain} patch={PATCH_SAMPLE} />
      </div>
      <div
        style={{
          width: 240,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <markdown
          testId={DOCUMENT_TYPE_IDS.markdownThemed}
          source={MARKDOWN_SAMPLE}
          theme={DOCUMENT_TYPE_HOST}
        />
        <markdown
          testId={DOCUMENT_TYPE_IDS.markdownPlain}
          source={MARKDOWN_SAMPLE}
        />
        <DocumentTypeCalibration
          testId={DOCUMENT_TYPE_IDS.captionCalibration}
          size={18}
          family={theme.typography.sans}
          text="ts"
        />
        <DocumentTypeCalibration
          testId={DOCUMENT_TYPE_IDS.headerRuntimeCalibration}
          size={RUNTIME_HEADER_SIZE}
          family={theme.typography.sans}
          text="ts"
        />
      </div>
    </div>
  );
};

const documentTypeSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(DOCUMENT_TYPE_IDS.probe);
    yield* ctx.host.capture("document-type");
    const frame = yield* ctx.host.pixels("document-type");
    const size = yield* ctx.host.windowSize();
    const scale = yield* ctx.expectSome(
      "the capture is the window at a whole device scale",
      captureScale(frame, size),
    );
    const theme = DOCUMENT_TYPE_THEME;
    const page = yield* ctx.expectSome(
      "the page role is a colour the frame can measure",
      Option.fromNullishOr(Pixels.hexToRgba(theme.colors.background)),
    );

    /** The part of the capture one host paints, or `None` before it paints. */
    const cropOf = (
      testId: string,
    ): Effect.Effect<Option.Option<Pixels.Pixels>, Smoke.SmokeHostError> =>
      Effect.gen(function* () {
        const bounds = yield* ctx.host.bounds(testId);
        return Option.flatMap(Option.fromNullishOr(bounds), (box) =>
          Option.fromNullishOr(
            Pixels.crop(
              frame,
              new Pixels.PixelRegion({
                x: Math.round(box.x * scale),
                y: Math.round(box.y * scale),
                width: Math.round(box.width * scale),
                height: Math.round(box.height * scale),
              }),
            ),
          ),
        );
      });

    /** A host's height in logical pixels, or `-1` when it paints nothing. */
    const heightOf = (
      testId: string,
    ): Effect.Effect<number, Smoke.SmokeHostError> =>
      Effect.map(ctx.host.bounds(testId), (bounds) =>
        Option.match(Option.fromNullishOr(bounds), {
          onNone: () => -1,
          onSome: (box) => box.height,
        }),
      );

    /** The first ink band's height, or `-1` when the crop paints nothing. */
    const inkHeight = (
      crop: Option.Option<Pixels.Pixels>,
      reference: Pixels.Rgba,
    ): number =>
      Option.getOrElse(
        Option.map(
          Option.flatMap(crop, (pixels) =>
            Arr.get(inkBands(pixels, reference), 0),
          ),
          bandHeight,
        ),
        () => -1,
      );

    /** The first band of the language strip, or `-1` high. */
    const stripHeight = (crop: Option.Option<Pixels.Pixels>): number =>
      Option.getOrElse(
        Option.map(
          Option.flatMap(crop, (pixels) =>
            Arr.get(headerBands(pixels, scale), 0),
          ),
          bandHeight,
        ),
        () => -1,
      );

    const codeThemed = yield* cropOf(DOCUMENT_TYPE_IDS.codeThemed);
    const codePlain = yield* cropOf(DOCUMENT_TYPE_IDS.codePlain);
    const codeCalibration = yield* cropOf(DOCUMENT_TYPE_IDS.codeCalibration);
    const codeRuntime = yield* cropOf(DOCUMENT_TYPE_IDS.codeRuntimeCalibration);
    const markdownThemed = yield* cropOf(DOCUMENT_TYPE_IDS.markdownThemed);
    const markdownPlain = yield* cropOf(DOCUMENT_TYPE_IDS.markdownPlain);
    const caption = yield* cropOf(DOCUMENT_TYPE_IDS.captionCalibration);
    const headerRuntime = yield* cropOf(
      DOCUMENT_TYPE_IDS.headerRuntimeCalibration,
    );

    // 1. The block's glyph is the size the theme names. A painted `<text>` at
    //    the same size and family is the reference, so a host that ignores the
    //    metric cannot pass by painting a different font.
    yield* ctx.expectEqual(
      "the themed block's glyph is the size the theme names",
      inkHeight(codeThemed, page),
      inkHeight(codeCalibration, page),
    );

    // 2. A host handed no theme paints the runtime's own 12.5.
    yield* ctx.expectEqual(
      "a host handed no theme paints the runtime's own code size",
      inkHeight(codePlain, page),
      inkHeight(codeRuntime, page),
    );

    // 3. The two are visibly different.
    yield* ctx.expectEqual(
      "the theme's code size is the larger of the two paints",
      inkHeight(codeThemed, page) > inkHeight(codePlain, page),
      true,
    );

    // 4. The block's lines advance by the leading the seam handed over, which
    //    the host's own box states (two rows of the role's line height).
    const themedHeight = yield* heightOf(DOCUMENT_TYPE_IDS.codeThemed);
    const plainHeight = yield* heightOf(DOCUMENT_TYPE_IDS.codePlain);
    yield* ctx.expectEqual(
      "the themed block's two lines advance by the theme's leading",
      themedHeight,
      2 * CODE_LEADING,
    );
    yield* ctx.expectEqual(
      "the plain block's two lines advance by the runtime's leading",
      plainHeight,
      2 * RUNTIME_CODE_LEADING,
    );

    // 5. A diff's four changed rows advance by `diffLineHeight`; the headers
    //    are the same height in both hosts, so the gain is the rows alone.
    const diffThemed = yield* heightOf(DOCUMENT_TYPE_IDS.diffThemed);
    const diffPlain = yield* heightOf(DOCUMENT_TYPE_IDS.diffPlain);
    yield* ctx.expectEqual(
      "the diff's four rows advance by the theme's leading",
      diffThemed - diffPlain,
      DIFF_LEADING_GAIN,
    );

    // 6. The language strip is painted at the caption role the seam hands it,
    //    and a host with no theme paints the runtime's own 11.
    const themedStrip = stripHeight(markdownThemed);
    const plainStrip = stripHeight(markdownPlain);
    yield* ctx.expectEqual(
      "the fenced card's language strip paints the caption size",
      near(themedStrip, inkHeight(caption, page), 1),
      true,
    );
    yield* ctx.expectEqual(
      "a host handed no theme paints the runtime's own strip size",
      near(plainStrip, inkHeight(headerRuntime, page), 1),
      true,
    );
    yield* ctx.expectEqual(
      "the strip's size is the one the theme moved",
      themedStrip > plainStrip,
      true,
    );
  });

/** The bodies, one per registry id; `Record` makes a missing body a compile error. */
export const liveProbeBodies: Record<LiveProbeId, LiveProbeBody> = {
  "focus-visible": {
    id: "focus-visible",
    view: () => <FocusVisibleProbe />,
    steps: focusVisibleSteps,
  },
  "focus-ring-offset": {
    id: "focus-ring-offset",
    view: () => <FocusRingOffsetProbe />,
    steps: focusRingOffsetSteps,
  },
  "action-ring": {
    id: "action-ring",
    view: () => <ActionRingProbe />,
    steps: actionRingSteps,
  },
  "keyboard-focus-dim": {
    id: "keyboard-focus-dim",
    view: () => <FocusDimProbe />,
    steps: focusDimSteps,
  },
  "filled-action-dim": {
    id: "filled-action-dim",
    view: () => <FilledActionDimProbe />,
    steps: filledActionDimSteps,
  },
  "floating-sides": {
    id: "floating-sides",
    view: () => <FloatingSidesProbe />,
    steps: floatingSteps,
  },
  "font-registration-late": {
    id: "font-registration-late",
    view: () => <LateRegistrationProbe />,
    steps: lateRegistrationSteps,
  },
  "register-font": {
    id: "register-font",
    fonts: [SQUARE_FACE],
    view: () => <RegisterFontProbe />,
    steps: registerFontSteps,
  },
  "text-input": {
    id: "text-input",
    view: () => <TextInputProbe />,
    steps: textInputSteps,
  },
  "field-ink": {
    id: "field-ink",
    view: () => <FieldInkProbe />,
    steps: fieldInkSteps,
  },
  "checkbox-toggle": {
    id: "checkbox-toggle",
    view: () => <CheckboxProbe />,
    steps: checkboxSteps,
  },
  "list-lifecycle": {
    id: "list-lifecycle",
    view: () => <ListProbe />,
    steps: listSteps,
  },
  "tabs-lifecycle": {
    id: "tabs-lifecycle",
    view: () => <TabsProbe />,
    steps: tabsSteps,
  },
  "slider-lifecycle": {
    id: "slider-lifecycle",
    view: () => <SliderProbe />,
    steps: sliderSteps,
  },
  "tooltip-lifecycle": {
    id: "tooltip-lifecycle",
    view: () => <TooltipProbe />,
    steps: tooltipSteps,
  },
  "drag-between-panes": {
    id: "drag-between-panes",
    view: () => <DragProbe />,
    steps: dragSteps,
  },
  "dialog-lifecycle": {
    id: "dialog-lifecycle",
    view: () => <DialogProbe />,
    steps: dialogSteps,
  },
  "surface-fade": {
    id: "surface-fade",
    view: () => <SurfaceFadeProbe />,
    steps: surfaceFadeSteps,
  },
  "menu-lifecycle": {
    id: "menu-lifecycle",
    view: () => <MenuProbe />,
    steps: menuSteps,
  },
  "context-menu-lifecycle": {
    id: "context-menu-lifecycle",
    view: () => <ContextMenuProbe />,
    steps: contextMenuSteps,
  },
  "motion-geometry": {
    id: "motion-geometry",
    view: () => <MotionProbe />,
    steps: motionSteps,
  },
  "toast-lifecycle": {
    id: "toast-lifecycle",
    view: () => <ToastProbe />,
    steps: toastSteps,
  },
  "command-palette": {
    id: "command-palette",
    view: () => <CommandPaletteProbe />,
    steps: commandPaletteSteps,
  },
  "popover-lifecycle": {
    id: "popover-lifecycle",
    view: () => <PopoverProbe />,
    steps: popoverSteps,
  },
  "modal-focus-restore": {
    id: "modal-focus-restore",
    view: () => <ModalFocusRestoreProbe />,
    steps: modalFocusRestoreSteps,
  },
  "content-surfaces": {
    id: "content-surfaces",
    view: () => <ContentSurfacesProbe />,
    steps: contentSteps,
  },
  "scroll-lifecycle": {
    id: "scroll-lifecycle",
    view: () => <ScrollProbe />,
    steps: scrollSteps,
  },
  "keyboard-scroll-lifecycle": {
    id: "keyboard-scroll-lifecycle",
    view: () => <KeyboardScrollProbe />,
    steps: keyboardScrollSteps,
  },
  "nested-scroll-lifecycle": {
    id: "nested-scroll-lifecycle",
    view: () => <NestedScrollProbe />,
    steps: nestedScrollSteps,
  },
  "message-scroller-lifecycle": {
    id: "message-scroller-lifecycle",
    view: () => <MessageScrollerProbe />,
    steps: messageScrollerSteps,
  },
  "split-pane-lifecycle": {
    id: "split-pane-lifecycle",
    view: () => <SplitPaneProbe />,
    steps: splitSteps,
  },
  "dock-split-lifecycle": {
    id: "dock-split-lifecycle",
    view: () => <DockSplitProbe />,
    steps: dockSplitSteps,
  },
  "virtual-list-lifecycle": {
    id: "virtual-list-lifecycle",
    view: () => <VirtualListProbe />,
    steps: virtualListSteps,
  },
  "window-shortcut-lifecycle": {
    id: "window-shortcut-lifecycle",
    view: () => <WindowKeyProbe />,
    steps: windowKeySteps,
  },
  "pointer-capture": {
    id: "pointer-capture",
    view: () => <PointerCaptureProbe />,
    steps: pointerCaptureSteps,
  },
  "clipboard-lifecycle": {
    id: "clipboard-lifecycle",
    view: () => <ClipboardProbe />,
    steps: clipboardSteps,
  },
  "otp-paste-lifecycle": {
    id: "otp-paste-lifecycle",
    view: () => <OtpPasteProbe />,
    steps: otpPasteSteps,
  },
  "otp-keys-lifecycle": {
    id: "otp-keys-lifecycle",
    view: () => <OtpKeysProbe />,
    steps: otpKeysSteps,
  },
  "select-lifecycle": {
    id: "select-lifecycle",
    view: () => <SelectProbe />,
    steps: selectSteps,
  },
  "combobox-lifecycle": {
    id: "combobox-lifecycle",
    view: () => <ComboboxProbe />,
    steps: comboboxSteps,
  },
  "selection-lifecycle": {
    id: "selection-lifecycle",
    view: () => <SelectionProbe />,
    steps: selectionSteps,
  },
  "window-selection-lifecycle": {
    id: "window-selection-lifecycle",
    view: () => <WindowSelectionProbe />,
    steps: windowSelectionSteps,
  },
  "virtual-tree-lifecycle": {
    id: "virtual-tree-lifecycle",
    view: () => <VirtualTreeProbe />,
    steps: virtualTreeSteps,
  },
  "portal-layer": {
    id: "portal-layer",
    view: () => <PortalProbe />,
    steps: portalSteps,
  },
  "loading-row-correction": {
    id: "loading-row-correction",
    view: () => <LoadingRowProbe />,
    steps: loadingRowSteps,
  },
  "window-resize-reflow": {
    id: "window-resize-reflow",
    view: () => <WindowResizeProbe />,
    steps: windowResizeSteps,
  },
  "drag-reorder": {
    id: "drag-reorder",
    view: () => <DragReorderProbe />,
    steps: dragReorderSteps,
  },
  "table-lifecycle": {
    id: "table-lifecycle",
    view: () => <TableProbe />,
    steps: tableLifecycleSteps,
  },
  "frozen-column-lifecycle": {
    id: "frozen-column-lifecycle",
    view: () => <FrozenColumnProbe />,
    steps: frozenColumnSteps,
  },
  "dock-focus-lifecycle": {
    id: "dock-focus-lifecycle",
    view: () => <DockFocusProbe />,
    steps: dockFocusSteps,
  },
  "header-menu-lifecycle": {
    id: "header-menu-lifecycle",
    view: () => <HeaderMenuProbe />,
    steps: headerMenuSteps,
  },
  "window-backdrop": {
    id: "window-backdrop",
    view: () => <BackdropProbe />,
    steps: backdropSteps,
  },
  "chart-raster": {
    id: "chart-raster",
    view: () => <ChartProbe />,
    steps: chartSteps,
  },
  "window-chrome": {
    id: "window-chrome",
    view: () => <WindowChromeProbe />,
    steps: windowChromeSteps,
  },
  "workspace-restore": {
    id: "workspace-restore",
    view: () => <WorkspaceRestoreProbe />,
    steps: workspaceRestoreSteps,
  },
  "theme-switch-lifecycle": {
    id: "theme-switch-lifecycle",
    view: () => <ThemeSwitchProbe />,
    steps: themeSwitchSteps,
  },
  "confirm-dialog-lifecycle": {
    id: "confirm-dialog-lifecycle",
    view: () => <ConfirmProbe />,
    steps: confirmSteps,
  },
  "validation-lifecycle": {
    id: "validation-lifecycle",
    view: () => <ValidationProbe />,
    steps: validationSteps,
  },
  "nested-overlay-lifecycle": {
    id: "nested-overlay-lifecycle",
    view: () => <NestedOverlayProbe />,
    steps: nestedOverlaySteps,
  },
  "editor-overlay": {
    id: "editor-overlay",
    view: () => <EditorOverlayProbe />,
    steps: editorOverlaySteps,
  },
  "multi-pane-editor": {
    id: "multi-pane-editor",
    view: () => <MultiPaneEditorProbe />,
    steps: multiPaneSteps,
  },
  "table-filter-lifecycle": {
    id: "table-filter-lifecycle",
    view: () => <TableFilterProbe />,
    steps: tableFilterSteps,
  },
  "table-columns-lifecycle": {
    id: "table-columns-lifecycle",
    view: () => <TableColumnsProbe />,
    steps: tableColumnsSteps,
  },
  "svg-pattern": {
    id: "svg-pattern",
    view: () => <SvgPatternProbe />,
    steps: svgPatternSteps,
  },
  "inspector-lifecycle": {
    id: "inspector-lifecycle",
    view: () => <InspectorProbe />,
    steps: inspectorSteps,
  },
  "text-truncation": {
    id: "text-truncation",
    view: () => <TruncationProbe />,
    steps: truncationSteps,
  },
  "box-paint": {
    id: "box-paint",
    view: () => <BoxPaintProbe />,
    steps: boxPaintSteps,
  },
  "aspect-ratio-paint": {
    id: "aspect-ratio-paint",
    view: () => <AspectRatioProbe />,
    steps: aspectRatioSteps,
  },
  "image-box": {
    id: "image-box",
    view: () => <ImageBoxProbe />,
    steps: imageBoxSteps,
  },
  "elevation-paint": {
    id: "elevation-paint",
    view: () => <ElevationProbe />,
    steps: elevationSteps,
  },
  "opacity-paint": {
    id: "opacity-paint",
    view: () => <OpacityProbe />,
    steps: opacitySteps,
  },
  "movable-tabs-lifecycle": {
    id: "movable-tabs-lifecycle",
    view: () => <MovableTabsProbe />,
    steps: movableTabsSteps,
  },
  "slider-vertical-lifecycle": {
    id: "slider-vertical-lifecycle",
    view: () => <VerticalSliderProbe />,
    steps: verticalSliderSteps,
  },
  "modifier-select-lifecycle": {
    id: "modifier-select-lifecycle",
    view: () => <ModifierSelectProbe />,
    steps: modifierSelectSteps,
  },
  "rtl-text": {
    id: "rtl-text",
    view: () => <RtlTextProbe />,
    steps: rtlTextSteps,
  },
  "syntax-palette": {
    id: "syntax-palette",
    view: () => <SyntaxPaletteProbe />,
    steps: syntaxPaletteSteps,
  },
  "press-routing-lifecycle": {
    id: "press-routing-lifecycle",
    view: () => <PressRoutingProbe />,
    steps: pressRoutingSteps,
  },
  "list-row-press": {
    id: "list-row-press",
    view: () => <ListRowPressProbe />,
    steps: listRowPressSteps,
  },
  "column-resize-lifecycle": {
    id: "column-resize-lifecycle",
    view: () => <ColumnResizeProbe />,
    steps: columnResizeSteps,
  },
  "button-activation-lifecycle": {
    id: "button-activation-lifecycle",
    view: () => <ButtonActivationProbe />,
    steps: buttonActivationSteps,
  },
  "date-picker-lifecycle": {
    id: "date-picker-lifecycle",
    view: () => <DatePickerProbe />,
    steps: datePickerSteps,
  },
  "data-table-lifecycle": {
    id: "data-table-lifecycle",
    view: () => <DataTableProbe />,
    steps: dataTableSteps,
  },
  "virtual-table-lifecycle": {
    id: "virtual-table-lifecycle",
    view: () => <VirtualTableProbe />,
    steps: virtualTableSteps,
  },
  "data-tree-lifecycle": {
    id: "data-tree-lifecycle",
    view: () => <DataTreeProbe />,
    steps: dataTreeSteps,
  },
  "surface-origin": {
    id: "surface-origin",
    view: () => <SurfaceOriginProbeView />,
    steps: surfaceOriginSteps,
  },
  "hover-routing-lifecycle": {
    id: "hover-routing-lifecycle",
    view: () => <HoverRoutingProbe />,
    steps: hoverRoutingSteps,
  },
  "multi-step-form-lifecycle": {
    id: "multi-step-form-lifecycle",
    view: () => <MultiStepProbe />,
    steps: multiStepSteps,
  },
  "image-fit": {
    id: "image-fit",
    view: () => <ImageFitProbe />,
    steps: imageFitSteps,
  },
  "grid-focus-lifecycle": {
    id: "grid-focus-lifecycle",
    view: () => <GridFocusProbe />,
    steps: gridFocusSteps,
  },
  "system-theme-follow": {
    id: "system-theme-follow",
    view: () => <SystemThemeProbe />,
    steps: systemThemeSteps,
  },
  "document-type": {
    id: "document-type",
    view: () => <DocumentTypeProbe />,
    steps: documentTypeSteps,
  },
  "flex-sizing": {
    id: "flex-sizing",
    view: () => <FlexSizingProbe />,
    steps: flexSizingSteps,
  },
  "scrollbar-thumb": {
    id: "scrollbar-thumb",
    view: () => <ScrollbarProbe />,
    steps: scrollbarSteps,
  },
  "scrollbar-thumb-both": {
    id: "scrollbar-thumb-both",
    view: () => <ScrollbarBothProbe />,
    steps: scrollbarBothSteps,
  },
  "collapsible-lifecycle": {
    id: "collapsible-lifecycle",
    view: () => <CollapsibleProbe />,
    steps: collapsibleSteps,
  },
  "scrollbar-drag": {
    id: "scrollbar-drag",
    view: () => <ScrollbarDragProbe />,
    steps: scrollbarDragSteps,
  },
};

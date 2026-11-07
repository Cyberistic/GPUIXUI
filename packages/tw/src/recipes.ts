export const INPUT_BASE =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

export const INPUT_FOCUS =
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export const INPUT_INVALID =
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";

export const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

export const BUTTON_SIZES = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  icon: "size-9",
  "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
} as const;

export const BUTTON_VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
  outline:
    "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

export const DIALOG_OVERLAY =
  "fixed inset-0 isolate z-50 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-overlay duration-100 supports-backdrop-filter:backdrop-blur-sm";

export const DIALOG_CONTENT =
  "fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/5 dark:ring-foreground/10 grid max-w-[calc(100%-2rem)] gap-6 rounded-4xl p-6 text-sm shadow-xl ring-1 duration-100 sm:max-w-md";

export const POPOVER_CONTENT =
  "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 flex flex-col gap-4 rounded-3xl p-4 text-sm shadow-lg ring-1 duration-100";

export const CARD_BASE = "flex flex-col overflow-hidden rounded-lg bg-card";
export const CARD_VARIANTS = {
  outline: "border border-input",
  elevated: "shadow-sm",
  plain: "",
} as const;
export const CARD_HEADER = "flex flex-col gap-1 px-4 pt-4 pb-3";
export const CARD_TITLE = "text-base font-semibold font-sans text-foreground";
export const CARD_DESCRIPTION = "text-sm font-sans text-muted-foreground";
export const CARD_CONTENT = "flex flex-col gap-3 px-4 pb-4";
export const CARD_FOOTER =
  "flex flex-row items-center justify-end gap-2 px-4 pt-3 pb-4 border-t border-input";

export const BADGE_BASE =
  "flex flex-row items-center self-start rounded-full px-2 pt-0.5 pb-0.5 whitespace-nowrap";
export const BADGE_SIZES = {
  sm: "text-xs font-sans",
  md: "text-sm font-medium font-sans",
} as const;
export const BADGE_VARIANTS = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-successSoft text-successSoftForeground border border-success/30",
  warning: "bg-warningSoft text-warningSoftForeground border border-warning/30",
  danger:
    "bg-destructiveSoft text-destructiveSoftForeground border border-destructive/30",
  info: "bg-infoSoft text-infoSoftForeground border border-info/30",
  outline: "text-muted-foreground border border-strong",
} as const;

export const ALERT_BASE =
  "flex flex-row items-start gap-3 p-3 rounded-md border";
export const ALERT_TONES = {
  info: "bg-infoSoft text-infoSoftForeground border-info/30",
  success: "bg-successSoft text-successSoftForeground border-success/30",
  warning: "bg-warningSoft text-warningSoftForeground border-warning/30",
  danger:
    "bg-destructiveSoft text-destructiveSoftForeground border-destructive/30",
} as const;
export const ALERT_ICON = "flex flex-row items-center shrink-0";
export const ALERT_CONTENT = "flex flex-col gap-0.5 flex-grow";
export const ALERT_TITLE = "text-sm font-semibold font-sans";
export const ALERT_DESCRIPTION = "text-sm font-sans text-foreground";

export const AVATAR_ROOT =
  "relative flex flex-row items-center justify-center shrink-0";
export const AVATAR_DISC =
  "flex flex-row items-center justify-center w-full h-full rounded-full overflow-hidden bg-muted";
export const AVATAR_FALLBACK = "text-sm font-medium font-sans text-foreground";

export const LIST_ROOT = "flex flex-col gap-0.5";
export const LIST_ITEM =
  "flex flex-row items-center gap-3 pl-3 pr-3 rounded-sm";
export const LIST_ITEM_TITLE = "text-sm font-sans text-foreground";
export const LIST_ITEM_DESCRIPTION =
  "text-xs font-sans text-muted-foreground text-ellipsis whitespace-nowrap";

export const PAGINATION_ROOT = "flex flex-row items-center gap-1";
export const PAGINATION_LIST = "flex flex-row items-center gap-1";
export const PAGINATION_ELLIPSIS =
  "text-xs font-sans text-muted-foreground pl-0.5 pr-0.5";

export const EMPTY_STATE_ROOT =
  "flex flex-col items-center justify-center gap-3 p-8";
export const EMPTY_STATE_ICON =
  "flex flex-row items-center text-muted-foreground";
export const EMPTY_STATE_TITLE =
  "text-sm font-semibold font-sans text-foreground text-center";
export const EMPTY_STATE_DESCRIPTION =
  "text-sm font-sans text-muted-foreground text-center";
export const EMPTY_STATE_ACTION = "flex flex-row";

export const STEPPER_ROOT = "flex gap-6";
export const STEPPER_ORIENTATION = {
  horizontal: "flex-row items-start",
  vertical: "flex-col items-stretch",
} as const;
export const STEPPER_STEP = "flex flex-row items-center gap-2";
export const STEPPER_MARKER =
  "flex flex-row items-center justify-center rounded-full";
export const STEPPER_MARKER_TEXT = "text-xs font-sans";
export const STEPPER_LABEL = "text-sm font-medium font-sans";
export const STEPPER_DESCRIPTION = "text-xs font-sans text-muted-foreground";
export const STEPPER_TEXT = "flex flex-col gap-0.5";

export const ACCORDION_ROOT = "flex flex-col w-full";
export const ACCORDION_ITEM = "flex flex-col";
export const ACCORDION_TRIGGER =
  "flex flex-row items-center justify-between gap-2 px-1 w-full text-sm font-medium font-sans text-foreground";
export const ACCORDION_TRIGGER_ROW =
  "flex flex-row items-center flex-grow min-w-0";
export const ACCORDION_INDICATOR = "text-xs font-sans text-muted-foreground";
export const ACCORDION_CONTENT =
  "flex flex-col gap-2 px-1 pb-2 text-muted-foreground";

export const BREADCRUMB_ROOT = "flex flex-row items-center";
export const BREADCRUMB_LIST = "flex flex-row items-center flex-wrap gap-1";
export const BREADCRUMB_ITEM = "flex flex-row items-center gap-1";
export const BREADCRUMB_LINK =
  "text-xs font-sans text-muted-foreground cursor-pointer px-0.5 rounded-sm";
export const BREADCRUMB_PAGE = "text-xs font-sans text-foreground";
export const BREADCRUMB_SEPARATOR =
  "text-xs font-sans text-muted-foreground select-none";
export const BREADCRUMB_ELLIPSIS = "text-xs font-sans text-muted-foreground";

export const CAROUSEL_ROOT = "flex flex-col gap-2";
export const CAROUSEL_INDICATORS =
  "flex flex-row items-center justify-center gap-1";
export const CAROUSEL_TRACK =
  "flex flex-row overflow-hidden rounded-lg border border-input bg-card";
export const CAROUSEL_SLIDE = "flex flex-col flex-grow";

export const COLLAPSIBLE_ROOT = "flex flex-col gap-0.5";
export const COLLAPSIBLE_TRIGGER =
  "flex flex-row items-center justify-between gap-2 px-2 py-1.5 rounded-sm text-sm font-medium font-sans text-foreground cursor-pointer";
export const COLLAPSIBLE_CONTENT =
  "flex flex-col gap-2 px-2 pt-1.5 pb-2 text-muted-foreground";

export const COUNTDOWN = "text-xs font-sans";

export const FIELD_ROOT = "flex flex-col gap-1";
export const FIELD_LABEL_ROW = "flex flex-row gap-0.5";
export const FIELD_LABEL = "text-sm font-medium font-sans text-foreground";
export const FIELD_REQUIRED = "text-sm font-medium font-sans text-destructive";
export const FIELD_DESCRIPTION = "text-xs font-sans text-muted-foreground";
export const FIELD_ERROR = "text-xs font-sans text-destructive";
export const FIELD_INPUT = "text-sm font-sans w-full px-2 rounded-md border";

export const FIELDSET_ROOT =
  "flex flex-col gap-3 rounded-lg border border-input bg-card p-4";
export const FIELDSET_LEGEND = "text-sm font-medium font-sans";

export const FORM_ROOT = "flex flex-col gap-3";
export const FORM_ERRORS = "flex flex-col gap-0.5";
export const FORM_ERROR = "text-xs font-sans text-destructive";

export const HOTKEY_RECORDER =
  "flex flex-row items-center justify-between gap-2 px-2 bg-background rounded-md border border-input";
export const HOTKEY_RECORDER_TEXT = "text-sm font-sans text-muted-foreground";
export const HOTKEY_RECORDER_KEYS = "flex flex-row items-center gap-1";
export const HOTKEY_RECORDER_CLEAR =
  "text-xs font-sans flex items-center justify-center size-4 rounded-sm text-muted-foreground";

export const INLINE_EDIT_DISPLAY =
  "flex flex-row items-center self-start px-1 rounded-sm";
export const INLINE_EDIT_DISPLAY_TEXT = "text-sm font-medium font-sans";
export const INLINE_EDIT_INPUT =
  "text-sm font-sans px-1.5 bg-background text-input-foreground rounded-sm border border-input";

export const KEYBOARD_SHORTCUTS_ROOT = "flex flex-col gap-4";
export const KEYBOARD_SHORTCUTS_GROUP = "flex flex-col gap-0.5";
export const KEYBOARD_SHORTCUTS_HEADING =
  "text-xs font-sans text-muted-foreground";
export const KEYBOARD_SHORTCUTS_ROW = "flex flex-col gap-0.5";
export const KEYBOARD_SHORTCUTS_SEPARATOR = "h-px bg-border";
export const KEYBOARD_SHORTCUT =
  "flex flex-row items-center justify-between gap-3 py-1.5";
export const KEYBOARD_SHORTCUT_LABEL =
  "text-sm font-medium font-sans text-foreground";
export const KEYBOARD_SHORTCUT_KEYS = "flex flex-row items-center gap-1";
export const KEYCAP =
  "flex flex-row items-center justify-center min-w-5 h-5 px-1.5 bg-muted rounded-sm border border-input";
export const KEYCAP_TEXT = "text-xs font-sans text-muted-foreground";

export const MENTION_INPUT_FIELD =
  "flex flex-row items-center px-2 bg-background rounded-md border border-input";
export const MENTION_INPUT_CONTROL =
  "text-sm font-sans flex-grow h-full text-input-foreground";
export const MENTION_INPUT_LIST =
  "flex flex-col min-w-[200px] p-1 bg-popover rounded-md border border-input pointer-events-auto";
export const MENTION_INPUT_ITEM =
  "flex flex-row items-center px-1.5 py-1 rounded-sm";
export const MENTION_INPUT_ITEM_TEXT = "text-sm font-sans";

export const SEARCH_INPUT =
  "flex flex-row items-center gap-2 px-2 bg-background border border-input rounded-md";
export const SEARCH_INPUT_ICON =
  "text-sm font-sans text-muted-foreground select-none";
export const SEARCH_INPUT_CONTROL =
  "text-sm font-sans flex-grow h-full text-input-foreground";
export const SEARCH_INPUT_CLEAR =
  "text-xs font-sans flex items-center justify-center size-[18px] rounded-sm text-muted-foreground cursor-pointer";

export const TAG_INPUT_ROOT =
  "flex flex-row flex-wrap items-center gap-1 px-1.5 py-0.5 bg-background rounded-md border border-input";
export const TAG_INPUT_FIELD =
  "text-sm font-sans flex-grow min-w-20 text-input-foreground";
export const TAG_INPUT_CAPTION = "text-xs font-sans text-muted-foreground";
export const TAG_INPUT_HINT =
  "text-xs font-sans text-muted-foreground select-none";
export const TAG_INPUT_CHIP =
  "flex flex-row items-center gap-1 py-0 pl-2 pr-0.5 bg-secondary rounded-sm";
export const TAG_INPUT_CHIP_TEXT =
  "text-xs font-sans text-secondary-foreground";
export const TAG_INPUT_CHIP_REMOVE =
  "text-xs font-sans flex items-center justify-center size-4 rounded-sm text-muted-foreground";

export const TIMELINE_ROOT = "flex flex-col gap-3";
export const TIMELINE_ITEM = "flex flex-row items-stretch self-stretch gap-2";
export const TIMELINE_RAIL = "flex flex-col items-center w-4";
export const TIMELINE_DOT = "size-2 rounded-full mt-1";
export const TIMELINE_CONNECTOR = "w-px flex-grow bg-border mt-0.5";
export const TIMELINE_CONTENT = "flex flex-col gap-0.5 flex-grow";
export const TIMELINE_TIMESTAMP = "text-xs font-sans text-muted-foreground";
export const TIMELINE_TITLE = "text-sm font-medium font-sans";
export const TIMELINE_DESCRIPTION = "text-sm font-sans text-muted-foreground";

export const DIALOG_HEADER = "flex flex-col gap-2";

export const DIALOG_TITLE = "text-base font-medium text-popover-foreground";

export const DIALOG_DESCRIPTION = "text-sm text-muted-foreground";

export const DIALOG_FOOTER = "flex flex-row items-center justify-end gap-2";

export const MENU_CONTENT =
  "bg-popover text-popover-foreground min-w-48 rounded-3xl p-1.5 gap-0.5 shadow-lg ring-1 ring-foreground/5";

export const MENU_ITEM =
  "flex flex-row items-center gap-2 rounded-2xl pl-1.5 pr-2 text-sm font-medium text-popover-foreground";

export const MENU_LABEL =
  "text-muted-foreground px-3 py-2.5 text-xs select-none";

export const MENU_SEPARATOR = "bg-border/50 my-1.5 h-px";

export const MENU_GROUP = "flex flex-col gap-0.5";

export const COMMAND_INPUT = "w-full text-sm";

export const COMMAND_LIST = "flex flex-col gap-2";

export const COMMAND_EMPTY = "py-6 text-center text-sm text-muted-foreground";

export const COMMAND_SHORTCUT = "text-xs text-muted-foreground";

export const COMMAND_HINT = "text-xs text-muted-foreground";

export const TOAST_VIEWPORT =
  "flex flex-col items-end w-[356px] pointer-events-none";

export const TOAST_STACK = "flex flex-col items-center w-full";

export const TOAST_CARD =
  "w-full bg-popover text-popover-foreground border border-border rounded-xl shadow-md pointer-events-auto overflow-hidden";

export const TOAST_BODY = "flex flex-row items-start gap-2.5 px-4 py-3.5";

export const TOAST_DRAG = "flex flex-row items-start gap-2.5 flex-grow min-w-0";

export const TOAST_COPY = "flex flex-col gap-1 flex-grow min-w-0";

export const TOAST_TITLE =
  "text-sm font-semibold font-sans text-popover-foreground";

export const TOAST_DESCRIPTION = "text-xs font-sans text-muted-foreground";

export const TOAST_GLYPH = "text-sm font-medium font-sans";

export const TABS_ROOT = "flex gap-2";

export const TABS_ORIENTATION = {
  horizontal: "flex-col",
  vertical: "flex-row",
} as const;

export const TABS_LIST =
  "flex items-stretch gap-1 p-1 bg-background border border-border rounded-md";

export const TABS_LIST_ORIENTATION = {
  horizontal: "flex-row",
  vertical: "flex-col",
} as const;

export const TABS_TRIGGER =
  "flex flex-row items-center justify-center px-3 rounded-sm text-sm font-medium font-sans";

export const TABS_CONTENT = "flex flex-col gap-2 text-foreground";

export const PREVIEW_CARD_CONTENT =
  "bg-popover text-popover-foreground min-w-[240px] max-w-[360px] p-3 rounded-lg border border-border shadow-md text-sm font-sans pointer-events-auto";

export const CONFIRM_DIALOG_BUSY = "text-sm font-medium font-sans";

export const DRAWER_OVERLAY = "bg-overlay";

export const DRAWER_CONTENT =
  "flex flex-col gap-3 p-6 bg-popover text-popover-foreground border border-border shadow-lg pointer-events-auto";

export const DRAWER_HEADER = "flex flex-col gap-1 pr-6";

export const DRAWER_TITLE =
  "text-base font-semibold font-sans text-popover-foreground";

export const DRAWER_DESCRIPTION = "text-sm font-sans text-muted-foreground";

export const DRAWER_FOOTER = "flex flex-row items-center justify-end gap-2";

export const NAVIGATION_MENU_ROOT = "flex flex-row items-center";

export const NAVIGATION_MENU_LIST = "flex flex-row items-center gap-0.5";

export const NAVIGATION_MENU_ITEM = "flex flex-row relative";

export const NAVIGATION_MENU_CONTENT =
  "flex flex-col gap-0.5 min-w-[220px] p-1.5 bg-popover text-popover-foreground rounded-lg border border-border shadow-md pointer-events-auto";

export const NAVIGATION_MENU_LINK =
  "flex flex-row items-center justify-start w-full p-1.5 rounded-sm";

export const COMBOBOX_TRIGGER =
  "flex flex-row items-center justify-between gap-2 w-full px-2 bg-background border border-strong rounded-md text-sm font-medium font-sans";

export const COMBOBOX_CONTENT =
  "flex flex-col gap-0.5 min-w-[220px] p-1 bg-popover text-popover-foreground rounded-md border border-border shadow-md pointer-events-auto";

export const COMBOBOX_INPUT =
  "text-sm font-sans px-2 bg-input text-input-foreground rounded-sm border border-border";

export const COMBOBOX_LIST = "flex flex-col";

export const COMBOBOX_ITEM =
  "flex flex-row items-center gap-2 px-2 py-1 rounded-sm text-sm font-sans";

export const COMBOBOX_TRIGGER_TEXT = "text-sm font-medium font-sans";

export const COMBOBOX_CARET = "text-xs font-sans text-muted-foreground";

export const COMBOBOX_ITEM_TEXT = "text-sm font-sans text-popover-foreground";

export const COMBOBOX_ITEM_DESCRIPTION =
  "text-xs font-sans text-muted-foreground";

export const COMBOBOX_ITEM_MARK = "text-xs font-sans text-primary";

export const COMBOBOX_EMPTY = "text-sm font-sans text-muted-foreground py-3";

export const DATE_PICKER_TRIGGER =
  "flex flex-row items-center justify-between gap-2 w-[220px] px-2 bg-background border border-strong rounded-md text-sm font-medium font-sans";

export const DATE_PICKER_TRIGGER_TEXT = "text-sm font-medium font-sans";

export const DATE_PICKER_CARET = "text-xs font-sans text-muted-foreground";

export const DATE_PICKER_CONTENT =
  "flex flex-col gap-2 p-2 bg-popover text-popover-foreground rounded-md border border-border pointer-events-auto";

export const CALENDAR_ROOT = "flex flex-row items-start";

export const CALENDAR_MONTH = "flex flex-col gap-0.5";

export const CALENDAR_MONTH_LABEL =
  "text-sm font-medium font-sans text-foreground";

export const CALENDAR_GRID = "flex flex-col gap-0.5";

export const CALENDAR_WEEKDAY =
  "text-xs font-sans text-muted-foreground text-center";

export const CALENDAR_DAY =
  "text-xs font-sans flex items-center justify-center rounded-sm";

export const TIME_PICKER_ROOT =
  "flex flex-row items-center gap-0.5 px-1.5 bg-input border border-border rounded-md";

export const TIME_PICKER_SEGMENT =
  "text-sm font-sans text-input-foreground text-center h-full p-0";

export const TIME_PICKER_SEPARATOR =
  "text-sm font-sans text-muted-foreground select-none";

export const TIME_PICKER_CLEAR =
  "text-xs font-sans flex items-center justify-center size-[18px] rounded-sm text-muted-foreground cursor-pointer";

export const COLOR_PICKER_TRIGGER =
  "flex flex-row items-center gap-2.5 self-start rounded-full border border-border bg-background p-1.5 pr-4";

export const COLOR_PICKER_PANEL = "flex flex-col gap-3.5 p-3.5";

export const COLOR_PICKER_ROW = "flex flex-col gap-2";

export const COLOR_PICKER_AREA = "relative w-full rounded-xl";

export const COLOR_PICKER_FIELD = "flex flex-row items-center gap-2";

export const COLOR_PICKER_INPUT = "bg-background text-input-foreground";

export const COLOR_PICKER_SWATCHES =
  "flex flex-row flex-wrap items-center gap-1.5";

export const COLOR_PICKER_CONTRAST =
  "flex flex-row items-center gap-2.5 text-sm";

export const COLOR_PICKER_CELL = "rounded-full border border-border";

export const MESSAGE_SCROLLER_ROOT = "relative flex flex-col min-h-0 min-w-0";

export const MESSAGE_SCROLLER_VIEWPORT =
  "flex flex-col min-h-0 min-w-0 bg-background text-foreground";

export const MESSAGE_SCROLLER_CONTENT = "flex flex-col min-w-0";

export const MESSAGE_SCROLLER_ITEM =
  "flex flex-col min-w-0 shrink-0 self-stretch";

export const MESSAGE_SCROLLER_JUMP =
  "flex flex-row items-center justify-center pointer-events-none";

export const BUBBLE_ROOT = "flex flex-row items-end gap-2 min-w-0";

export const BUBBLE_COLUMN = "flex flex-col gap-1 min-w-0";

export const BUBBLE_CONTENT =
  "flex flex-col gap-1 rounded-xl px-3 py-2 text-sm min-w-0";

export const BUBBLE_VARIANTS = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-foreground",
  tinted: "bg-transparent text-foreground",
  outline: "bg-background text-foreground border border-border",
  ghost: "bg-transparent text-foreground",
  destructive: "bg-destructiveSoft text-destructiveSoftForeground",
} as const;

export const BUBBLE_ACTIONS = "flex flex-row items-center gap-1 min-h-0";

export const BUBBLE_REACTIONS =
  "flex flex-row items-center justify-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-sm";

export const BUBBLE_GROUP = "flex flex-col min-w-0";

export const MESSAGE_ROOT = "flex flex-row gap-3 self-stretch px-1";

export const MESSAGE_CONTENT = "flex flex-col gap-2 min-w-0 flex-grow";

export const MESSAGE_HEADER =
  "flex flex-row items-center gap-2 min-w-0 text-xs font-medium font-sans text-muted-foreground";

export const MESSAGE_FOOTER = "flex flex-row items-center gap-2 min-w-0";

export const MESSAGE_GROUP = "flex flex-col min-w-0";

export const MESSAGE_AUTHOR =
  "text-xs font-medium font-sans text-muted-foreground";

export const MESSAGE_REASONING =
  "flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2";

export const MESSAGE_REASONING_TRIGGER =
  "flex flex-row items-center justify-between gap-2 text-xs font-medium font-sans text-muted-foreground";

export const MESSAGE_REASONING_CONTENT =
  "text-xs font-sans text-muted-foreground";

export const MESSAGE_TOOL_CALL =
  "flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2";

export const MESSAGE_TOOL_CALL_HEAD =
  "flex flex-row items-center justify-between gap-2";

export const MESSAGE_TOOL_CALL_NAME =
  "text-xs font-medium font-sans text-foreground";

export const MESSAGE_TOOL_CALL_STATUS =
  "flex flex-row items-center gap-1 text-xs font-sans text-muted-foreground";

export const MESSAGE_TOOL_CALL_RESULT =
  "text-xs font-sans text-muted-foreground";

export const MESSAGE_SOURCES = "flex flex-col gap-1";

export const MESSAGE_SOURCE =
  "flex flex-row items-center gap-1 text-xs font-sans text-muted-foreground";

export const MESSAGE_STREAMING =
  "flex flex-row items-center gap-1.5 text-xs font-sans text-muted-foreground";

export const MESSAGE_ACTIONS = "flex flex-row items-center gap-1";

export const CHAT_ROOT = "flex flex-col gap-3 min-h-0 min-w-0 flex-grow";

export const CHAT_HEADER =
  "flex flex-row items-start justify-between gap-3 shrink-0";

export const CHAT_HEADER_COPY = "flex flex-col gap-0.5 min-w-0 flex-grow";

export const CHAT_HEADER_TITLE =
  "text-sm font-medium font-sans text-foreground";

export const CHAT_HEADER_STATUS = "text-xs font-sans text-muted-foreground";

export const CHAT_HEADER_ACTIONS = "flex flex-row items-center gap-1 shrink-0";

export const CHAT_MESSAGES = "flex flex-col min-h-0 min-w-0 flex-grow";

export const CHAT_EMPTY =
  "flex flex-col items-center justify-center gap-1 py-8 text-center";

export const CHAT_EMPTY_TITLE = "text-sm font-medium font-sans text-foreground";

export const CHAT_EMPTY_DESCRIPTION = "text-xs font-sans text-muted-foreground";

export const CHAT_COMPOSER =
  "flex flex-col gap-2 rounded-lg border border-border bg-background p-2";

export const CHAT_COMPOSER_ROW = "flex flex-row items-center gap-2";

export const CHAT_COMPOSER_FIELD =
  "text-sm font-sans flex-grow px-2 py-1 bg-transparent text-input-foreground";

export const CHAT_COMPOSER_ATTACHMENTS = "flex flex-row flex-wrap gap-1.5";

export const CHAT_COMPOSER_HINT = "text-xs font-sans text-muted-foreground";

export const SIDEBAR_ROOT = "flex flex-row w-full h-full";

export const SIDEBAR_INNER =
  "flex flex-col w-full h-full bg-card text-card-foreground";

export const SIDEBAR_FLOATING = "rounded-lg border border-border shadow-sm";

export const SIDEBAR_INSET = "flex flex-col flex-grow bg-background";

export const SIDEBAR_HEADER = "flex flex-col gap-2 p-2";

export const SIDEBAR_CONTENT = "flex flex-col flex-grow gap-0 min-h-0";

export const SIDEBAR_FOOTER = "flex flex-col gap-2 p-2";

export const SIDEBAR_SEPARATOR = "h-px bg-border mx-2";

export const SIDEBAR_GROUP = "flex flex-col w-full p-2 relative";

export const SIDEBAR_GROUP_LABEL =
  "flex flex-row items-center gap-2 h-8 px-2 rounded-md overflow-hidden";

export const SIDEBAR_GROUP_LABEL_TEXT =
  "text-xs font-medium font-sans text-muted-foreground";

export const SIDEBAR_GROUP_ACTION =
  "flex flex-row items-center justify-center rounded-md text-card-foreground";

export const SIDEBAR_GROUP_CONTENT = "flex flex-col w-full text-sm";

export const SIDEBAR_MENU = "flex flex-col w-full gap-0.5";

export const SIDEBAR_MENU_ITEM = "relative";

export const SIDEBAR_MENU_BUTTON =
  "flex flex-row items-center justify-start w-full gap-2 px-2 rounded-md text-sm text-left text-card-foreground overflow-hidden";

export const SIDEBAR_MENU_BUTTON_SIZES = {
  default: "h-9",
  sm: "h-8",
  lg: "h-12",
} as const;

export const SIDEBAR_MENU_LABEL =
  "flex-grow text-sm font-sans whitespace-nowrap text-ellipsis overflow-hidden";

export const SIDEBAR_MENU_ACTION =
  "flex flex-row items-center justify-center rounded-md text-card-foreground";

export const SIDEBAR_MENU_BADGE =
  "flex flex-row items-center justify-center h-5 min-w-5 px-1 rounded-md text-xs font-medium font-sans text-muted-foreground";

export const SIDEBAR_MENU_SKELETON =
  "flex flex-row items-center h-9 gap-2 px-2 rounded-md";

export const SIDEBAR_MENU_SKELETON_ICON = "size-4 rounded-md bg-muted";

export const SIDEBAR_MENU_SKELETON_TEXT = "h-4 rounded-md bg-muted flex-grow";

export const SIDEBAR_MENU_SUB = "flex flex-col min-w-0 gap-1 py-0.5";

export const SIDEBAR_MENU_SUB_ITEM = "relative";

export const SIDEBAR_MENU_SUB_BUTTON =
  "flex flex-row items-center justify-start min-w-0 gap-2 px-2 rounded-md text-muted-foreground overflow-hidden";

export const SIDEBAR_INPUT = "w-full bg-background";

export const SIDEBAR_TOOLTIP =
  "bg-popover text-popover-foreground rounded-md border border-border px-2 py-1 shadow-sm pointer-events-auto";

export const SIDEBAR_TOOLTIP_TEXT =
  "text-xs font-sans text-popover-foreground whitespace-nowrap";

export const SIDEBAR_SCRIM = "bg-overlay";

export const SIDEBAR_SHEET =
  "flex flex-col h-full bg-card text-card-foreground border-border shadow-lg";

export const USER_MENU_TRIGGER =
  "flex flex-row items-center gap-2 px-2 rounded-md bg-transparent text-card-foreground";

export const USER_MENU_IDENTITY = "flex flex-col items-start min-w-0 flex-grow";

export const USER_MENU_NAME =
  "min-w-0 overflow-hidden text-sm font-medium font-sans text-card-foreground whitespace-nowrap text-ellipsis";

export const USER_MENU_EMAIL =
  "min-w-0 overflow-hidden text-xs font-sans text-muted-foreground whitespace-nowrap text-ellipsis";

export const ASPECT_RATIO = "relative w-full";

export const HOVER_CARD_CONTENT =
  "bg-popover text-popover-foreground w-64 p-4 rounded-md border border-border shadow-md text-sm font-sans pointer-events-auto";

export const ITEM_GROUP = "flex flex-col w-full gap-2";

export const ITEM_BASE = "flex flex-row flex-wrap items-center w-full";

export const ITEM_VARIANTS = {
  default: "",
  outline: "border border-input rounded-md",
  muted: "bg-muted rounded-md",
} as const;

export const ITEM_SIZES = {
  default: "gap-3 p-3",
  sm: "gap-2 p-2",
} as const;

export const ITEM_MEDIA = "flex flex-row items-center justify-center shrink-0";

export const ITEM_MEDIA_VARIANTS = {
  default: "",
  icon: "size-9 rounded-md bg-muted",
  image: "size-10 rounded-md overflow-hidden",
} as const;

export const ITEM_CONTENT = "flex flex-col flex-1 min-w-0 gap-1";

export const ITEM_TITLE =
  "text-sm font-medium font-sans text-foreground whitespace-nowrap text-ellipsis overflow-hidden";

export const ITEM_DESCRIPTION =
  "text-sm font-sans text-muted-foreground overflow-hidden";

export const ITEM_ACTIONS = "flex flex-row items-center gap-2";

export const ITEM_HEADER =
  "flex flex-row items-center justify-between w-full gap-2";

export const ITEM_FOOTER =
  "flex flex-row items-center justify-between w-full gap-2";

export const INPUT_GROUP =
  "flex flex-col w-full min-w-0 rounded-md border border-input bg-transparent";

export const INPUT_GROUP_ROW = "flex flex-row items-center w-full min-w-0";

export const INPUT_GROUP_BLOCK = "flex flex-row items-center w-full min-w-0";

export const INPUT_GROUP_FOCUS = "border-ring ring-[3px] ring-ring/50";

export const INPUT_GROUP_INVALID =
  "border-destructive ring-[3px] ring-destructive/20";

export const INPUT_GROUP_ADDONS = {
  "inline-start": "flex flex-row items-center shrink-0 pl-3 gap-2",
  "inline-end": "flex flex-row items-center shrink-0 pr-3 gap-2",
  "block-start":
    "flex flex-row items-center justify-start w-full shrink-0 px-3 pt-2 gap-2",
  "block-end":
    "flex flex-row items-center justify-start w-full shrink-0 px-3 pb-2 gap-2",
} as const;

export const INPUT_GROUP_TEXT =
  "flex flex-row items-center text-sm font-sans text-muted-foreground whitespace-nowrap";

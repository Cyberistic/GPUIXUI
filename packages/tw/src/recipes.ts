/**
 * Verbatim shadcn/ui recipes for the first conformance slice.
 *
 * Source: `references/ui` @ d2fba50, `apps/v4/registry/new-york-v4/ui/`.
 * Do not edit a string here without checking the upstream file; the
 * `upstream.test.ts` guard fails when the two drift.
 */

/** `input.tsx` — the base class string. */
export const INPUT_BASE =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

/** `input.tsx` — focus. */
export const INPUT_FOCUS =
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** `input.tsx` — invalid. */
export const INPUT_INVALID =
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";

/** `button.tsx` — the cva base. */
export const BUTTON_BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/** `button.tsx` — cva sizes. */
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

/** `button.tsx` — cva variants. */
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

/** `dialog.tsx` + `style-luma.css` — the overlay. shadcn's `bg-black/30`
 * scrim maps to the theme's `overlay` role (`bg-overlay`) so the veil respects
 * light, dark and high-contrast themes instead of a fixed literal. */
export const DIALOG_OVERLAY =
  "fixed inset-0 isolate z-50 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-overlay duration-100 supports-backdrop-filter:backdrop-blur-sm";

/** `dialog.tsx` + `style-luma.css` — the content surface. */
export const DIALOG_CONTENT =
  "fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/5 dark:ring-foreground/10 grid max-w-[calc(100%-2rem)] gap-6 rounded-4xl p-6 text-sm shadow-xl ring-1 duration-100 sm:max-w-md";

/** `popover.tsx` + `style-luma.css` — the content surface. */
export const POPOVER_CONTENT =
  "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 flex flex-col gap-4 rounded-3xl p-4 text-sm shadow-lg ring-1 duration-100";

// ── Components (fixed metrics) ────────────────────────────────────────
//
// The Tier 2 components adopt shadcn's fixed metrics (`h-9` = 36, `px-4` = 16,
// `text-sm` = 14/20) instead of the primitives' density scale. These strings
// are the single source of truth for a component's resting appearance; the
// caller's `className` is joined after them via `cn`. The soft status tones use
// the library's `*Soft` roles, which shadcn's class vocabulary maps through
// `bg-*Soft` / `text-*SoftForeground` / `border-*/30`.

/** `card.tsx` — the surface and its three treatments. */
export const CARD_BASE = "flex flex-col overflow-hidden rounded-lg bg-card";
export const CARD_VARIANTS = {
  outline: "border border-input",
  elevated: "shadow-sm",
  plain: "",
} as const;
export const CARD_HEADER = "flex flex-col gap-1 px-4 pt-4 pb-3";
export const CARD_TITLE = "text-base font-semibold font-sans text-foreground";
export const CARD_DESCRIPTION = "text-sm font-sans text-muted-foreground";
export const CARD_CONTENT = "flex flex-col gap-3 px-4";
export const CARD_FOOTER =
  "flex flex-row items-center justify-end gap-2 px-3 pt-3 border-t border-input";

/** `badge.tsx` — the status pill. */
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
  outline: "text-muted-foreground border border-input",
} as const;

/** `alert.tsx` — the surface and its four tones. */
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

/** `avatar.tsx` — the identity disc. */
export const AVATAR_ROOT =
  "relative flex flex-row items-center justify-center shrink-0";
export const AVATAR_DISC =
  "flex flex-row items-center justify-center w-full h-full rounded-full overflow-hidden bg-muted";
export const AVATAR_FALLBACK = "text-sm font-medium font-sans text-foreground";

/** `list.tsx` — the list and its rows. */
export const LIST_ROOT = "flex flex-col gap-0.5";
export const LIST_ITEM =
  "flex flex-row items-center gap-3 pl-3 pr-3 rounded-sm";
export const LIST_ITEM_TITLE = "text-sm font-sans text-foreground";
export const LIST_ITEM_DESCRIPTION =
  "text-xs font-sans text-muted-foreground text-ellipsis whitespace-nowrap";

/** `pagination.tsx` — the landmarks. */
export const PAGINATION_ROOT = "flex flex-row items-center gap-1";
export const PAGINATION_LIST = "flex flex-row items-center gap-1";
export const PAGINATION_ELLIPSIS =
  "text-xs font-sans text-muted-foreground pl-0.5 pr-0.5";

/** `empty-state.tsx` — the centred panel. */
export const EMPTY_STATE_ROOT =
  "flex flex-col items-center justify-center gap-3 p-8";
export const EMPTY_STATE_ICON =
  "flex flex-row items-center text-muted-foreground";
export const EMPTY_STATE_TITLE =
  "text-sm font-semibold font-sans text-foreground text-center";
export const EMPTY_STATE_DESCRIPTION =
  "text-sm font-sans text-muted-foreground text-center";
export const EMPTY_STATE_ACTION = "flex flex-row";

/** `stepper.tsx` — the step list. */
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

/** `accordion.tsx` — the disclosure stack. The trigger height keeps density
 * (ADR 0006) and the item divider is conditional on the last item, so both stay
 * in the component's `style`. */
export const ACCORDION_ROOT = "flex flex-col w-full";
export const ACCORDION_ITEM = "flex flex-col";
export const ACCORDION_TRIGGER =
  "flex flex-row items-center justify-between gap-2 px-1 w-full text-sm font-medium font-sans text-foreground";
export const ACCORDION_TRIGGER_ROW =
  "flex flex-row items-center flex-grow min-w-0";
export const ACCORDION_INDICATOR = "text-xs font-sans text-muted-foreground";
export const ACCORDION_CONTENT =
  "flex flex-col gap-2 px-1 pb-2 text-muted-foreground";

/** `breadcrumb.tsx` — the trail and its crumbs. */
export const BREADCRUMB_ROOT = "flex flex-row items-center";
export const BREADCRUMB_LIST = "flex flex-row items-center flex-wrap gap-1";
export const BREADCRUMB_ITEM = "flex flex-row items-center gap-1";
export const BREADCRUMB_LINK =
  "text-xs font-sans text-muted-foreground cursor-pointer px-0.5 rounded-sm";
export const BREADCRUMB_PAGE = "text-xs font-sans text-foreground";
export const BREADCRUMB_SEPARATOR =
  "text-xs font-sans text-muted-foreground select-none";
export const BREADCRUMB_ELLIPSIS = "text-xs font-sans text-muted-foreground";

/** `carousel.tsx` — the slide shell. The slide's `display` is the component's
 * active-index switch and stays in `style`. */
export const CAROUSEL_ROOT = "flex flex-col gap-2";
export const CAROUSEL_TRACK =
  "flex flex-row overflow-hidden rounded-lg border border-input bg-card";
export const CAROUSEL_SLIDE = "flex flex-col flex-grow";

/** `collapsible.tsx` — the single disclosure section. */
export const COLLAPSIBLE_ROOT = "flex flex-col gap-0.5";
export const COLLAPSIBLE_TRIGGER =
  "flex flex-row items-center justify-between gap-2 px-2 py-1.5 rounded-sm text-sm font-medium font-sans text-foreground cursor-pointer";
export const COLLAPSIBLE_CONTENT =
  "flex flex-col gap-2 px-2 pt-1.5 pb-2 text-muted-foreground";

/** `countdown.tsx` — the clock text. The expired colour stays in `style`. */
export const COUNTDOWN = "text-xs font-sans";

/** `field.tsx` — the labelled control block. The input height keeps density
 * (ADR 0006) and its validity colours stay in `style`. */
export const FIELD_ROOT = "flex flex-col gap-1";
export const FIELD_LABEL_ROW = "flex flex-row gap-0.5";
export const FIELD_LABEL = "text-sm font-medium font-sans text-foreground";
export const FIELD_REQUIRED = "text-sm font-medium font-sans text-destructive";
export const FIELD_DESCRIPTION = "text-xs font-sans text-muted-foreground";
export const FIELD_ERROR = "text-xs font-sans text-destructive";
export const FIELD_INPUT = "text-sm font-sans w-full px-2 rounded-md border";

/** `fieldset.tsx` — the named group. */
export const FIELDSET_ROOT = "flex flex-col gap-3";
export const FIELDSET_LEGEND = "text-sm font-medium font-sans";

/** `form.tsx` — the owned-value form boundary. */
export const FORM_ROOT = "flex flex-col gap-3";
export const FORM_ERRORS = "flex flex-col gap-0.5";
export const FORM_ERROR = "text-xs font-sans text-destructive";

/** `hotkey-recorder.tsx` — the chord capture control. The min-height keeps
 * density (ADR 0006). */
export const HOTKEY_RECORDER =
  "flex flex-row items-center justify-between gap-2 px-2 bg-background rounded-md border border-input";
export const HOTKEY_RECORDER_TEXT = "text-sm font-sans text-muted-foreground";
export const HOTKEY_RECORDER_KEYS = "flex flex-row items-center gap-1";
export const HOTKEY_RECORDER_CLEAR =
  "text-xs font-sans flex items-center justify-center size-4 rounded-sm text-muted-foreground";

/** `inline-edit.tsx` — the display/input swap. Both heights keep density
 * (ADR 0006). */
export const INLINE_EDIT_DISPLAY =
  "flex flex-row items-center self-start px-1 rounded-sm";
export const INLINE_EDIT_DISPLAY_TEXT = "text-sm font-medium font-sans";
export const INLINE_EDIT_INPUT =
  "text-sm font-sans px-1.5 bg-background text-input-foreground rounded-sm border border-input";

/** `keyboard-shortcuts.tsx` — the cheat sheet and its keycaps. */
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

/** `mention-input.tsx` — the mention field and its floating list. The field
 * height keeps density (ADR 0006). */
export const MENTION_INPUT_FIELD =
  "flex flex-row items-center px-2 bg-background rounded-md border border-input";
export const MENTION_INPUT_CONTROL =
  "text-sm font-sans flex-grow h-full text-input-foreground";
export const MENTION_INPUT_LIST =
  "flex flex-col min-w-[200px] p-1 bg-popover rounded-md border border-input pointer-events-auto";
export const MENTION_INPUT_ITEM =
  "flex flex-row items-center px-1.5 py-1 rounded-sm";
export const MENTION_INPUT_ITEM_TEXT = "text-sm font-sans";

/** `search-input.tsx` — the search field. The height keeps density (ADR 0006). */
export const SEARCH_INPUT =
  "flex flex-row items-center gap-2 px-2 bg-background border border-input rounded-md";
export const SEARCH_INPUT_ICON =
  "text-sm font-sans text-muted-foreground select-none";
export const SEARCH_INPUT_CONTROL =
  "text-sm font-sans flex-grow h-full text-input-foreground";
export const SEARCH_INPUT_CLEAR =
  "text-xs font-sans flex items-center justify-center size-[18px] rounded-sm text-muted-foreground cursor-pointer";

/** `tag-input.tsx` — the token group. The min-height and field height keep
 * density (ADR 0006). */
export const TAG_INPUT_ROOT =
  "flex flex-row flex-wrap items-center gap-1 px-1.5 py-0.5 bg-background rounded-md border border-input";
export const TAG_INPUT_FIELD =
  "text-sm font-sans flex-grow min-w-20 text-input-foreground";
export const TAG_INPUT_CHIP =
  "flex flex-row items-center gap-1 px-1.5 py-0.5 bg-muted rounded-sm";
export const TAG_INPUT_CHIP_TEXT = "text-xs font-sans text-muted-foreground";
export const TAG_INPUT_CHIP_REMOVE =
  "text-xs font-sans flex items-center justify-center size-4 rounded-sm text-muted-foreground";

/** `timeline.tsx` — the event rail. The dot fill and the last item's padding
 * stay in `style`; the connector is a 1px element (`w-px`). */
export const TIMELINE_ROOT = "flex flex-col gap-3";
export const TIMELINE_ITEM = "flex flex-row items-stretch self-stretch gap-2";
export const TIMELINE_RAIL = "flex flex-col items-center w-4";
export const TIMELINE_DOT = "size-2 rounded-full mt-1";
export const TIMELINE_CONNECTOR = "w-px flex-grow bg-border mt-0.5";
export const TIMELINE_CONTENT = "flex flex-col gap-0.5 flex-grow";
export const TIMELINE_TIMESTAMP = "text-xs font-sans text-muted-foreground";
export const TIMELINE_TITLE = "text-sm font-medium font-sans";
export const TIMELINE_DESCRIPTION = "text-sm font-sans text-muted-foreground";

// ── Overlay components (fixed metrics) ────────────────────────────────
//
// The overlay wave converted the floating/modal surfaces onto the shared
// recipes below. Each is the resting appearance in shadcn's class vocabulary;
// density-driven control geometry (row heights), state (highlight, destructive
// tone) and the anchored positioning stay in the component's `style`, exactly
// as the non-overlay components did. `DIALOG_OVERLAY`, `DIALOG_CONTENT` and
// `POPOVER_CONTENT` above keep their full shadcn string (positioning and motion
// included) for provenance; the components compile them and override the
// positioning the renderer already owns.

/** `dialog.tsx` — the heading block. The close-control clearance stays in
 * `style` (it is the only shadcn deviation the library needs). */
export const DIALOG_HEADER = "flex flex-col gap-2";

/** `dialog.tsx` — the surface's title. `leading-none` is dropped because the
 * native `lineHeight` is absolute pixels, where Tailwind's unitless `1` is a
 * ratio; `text-base` already carries the right leading. The colour is explicit:
 * native text does not inherit `color` from the surface. */
export const DIALOG_TITLE = "text-base font-medium text-popover-foreground";

/** `dialog.tsx` — the supporting copy. */
export const DIALOG_DESCRIPTION = "text-sm text-muted-foreground";

/** `dialog.tsx` — the right-aligned actions row. */
export const DIALOG_FOOTER = "flex flex-row items-center justify-end gap-2";

/** `menu/surface.tsx` — the floating menu box, shared verbatim by DropdownMenu,
 * ContextMenu and their submenus (`cn-dropdown-menu-content`,
 * `cn-context-menu-content` and `cn-*-sub-content` agree). The `gap-0.5` is
 * the library's own: the rows keep density height (ADR 0006) with no vertical
 * padding, so the surface carries the 2px separation shadcn gets from `py-2`. */
export const MENU_CONTENT =
  "bg-popover text-popover-foreground min-w-48 rounded-3xl p-1.5 gap-0.5 shadow-lg ring-1 ring-foreground/5";

/** `menu/item.tsx` — the resting row. The accent bar (`borderLeftWidth`), the
 * highlight/destructive colours and the density height stay in `style`; the
 * geometry, radius and type are fixed shadcn metrics. */
export const MENU_ITEM =
  "flex flex-row items-center gap-2 rounded-2xl pl-1.5 pr-2 text-sm font-medium text-popover-foreground";

/** `menu/item.tsx` — the group heading. */
export const MENU_LABEL =
  "text-muted-foreground px-3 py-2.5 text-xs select-none";

/** `menu/item.tsx` — the hairline between rows. `-mx-1.5` is dropped because
 * the native renderer has no negative margin; the separator stays inside the
 * surface's padding. */
export const MENU_SEPARATOR = "bg-border/50 my-1.5 h-px";

/** `menu/item.tsx` — the labelled group of rows. */
export const MENU_GROUP = "flex flex-col gap-0.5";

/** `command-menu.tsx` — the search field. The density height and the field
 * chrome (fill, border, radius) stay in `style`; the width and type are shadcn. */
export const COMMAND_INPUT = "w-full text-sm";

/** `command-menu.tsx` — the match column. */
export const COMMAND_LIST = "flex flex-col gap-2";

/** `command-menu.tsx` — the no-match message. */
export const COMMAND_EMPTY = "py-6 text-center text-sm text-muted-foreground";

/** `command-menu.tsx` — the trailing key hint (`text-xs`; `tracking-widest`
 * and `ml-auto` are dropped — the native renderer has neither). */
export const COMMAND_SHORTCUT = "text-xs text-muted-foreground";

/** `command-menu.tsx` — the keyboard hint under the list. */
export const COMMAND_HINT = "text-xs text-muted-foreground";

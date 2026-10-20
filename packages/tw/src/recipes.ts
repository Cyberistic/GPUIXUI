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

/** `dialog.tsx` + `style-luma.css` — the overlay. */
export const DIALOG_OVERLAY =
  "fixed inset-0 isolate z-50 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm";

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

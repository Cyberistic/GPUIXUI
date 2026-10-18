/**
 * Base UI `cn-*` hooks → the class recipes `style-luma.css` applies.
 *
 * The Base UI registry writes short hook names (`cn-input`, `cn-button`) and
 * the style preset owns the actual rules. This is the one table that turns
 * those hooks into classes before `cn` resolves conflicts, so a caller's
 * `px-6` still wins over the recipe's `px-3`.
 *
 * Values are verbatim from `references/ui` @ d2fba50,
 * `apps/v4/registry/styles/style-luma.css`. Where luma deliberately differs
 * from new-york-v4 (`rounded-3xl` input, filled input surface), the luma value
 * is kept; `aliases.test.ts` records those differences.
 */

/** The luma `cn-*` hooks that the Base UI component sources use. */
export const BASE_ALIASES: Readonly<Record<string, string>> = {
  "cn-input":
    "bg-input/50 border-transparent focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-9 rounded-3xl border px-3 py-1 text-base transition-[color,box-shadow,background-color] file:h-7 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm",
  "cn-textarea":
    "bg-input/50 border-transparent focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 resize-none rounded-2xl border px-3 py-3 text-base transition-[color,box-shadow,background-color] focus-visible:ring-3 aria-invalid:ring-3 md:text-sm",
  "cn-button":
    "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-4xl border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4",
  "cn-button-variant-default":
    "bg-primary text-primary-foreground hover:bg-primary/80",
  "cn-button-variant-outline":
    "border-border bg-background dark:bg-transparent hover:bg-muted hover:text-foreground dark:hover:bg-input/30 aria-expanded:bg-muted aria-expanded:text-foreground",
  "cn-button-variant-secondary":
    "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
  "cn-button-variant-ghost":
    "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
  "cn-button-variant-destructive":
    "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
  "cn-button-variant-link": "text-primary underline-offset-4 hover:underline",
  "cn-button-size-xs":
    "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
  "cn-button-size-sm":
    "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
  "cn-button-size-default":
    "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
  "cn-button-size-lg":
    "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
  "cn-button-size-icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
  "cn-button-size-icon-sm": "size-8",
  "cn-button-size-icon": "size-9",
  "cn-button-size-icon-lg": "size-10",
  "cn-dialog-overlay":
    "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm",
  "cn-dialog-content":
    "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/5 dark:ring-foreground/10 grid max-w-[calc(100%-2rem)] gap-6 rounded-4xl p-6 text-sm shadow-xl ring-1 duration-100 sm:max-w-md",
  "cn-dialog-close": "absolute top-4 right-4 bg-secondary",
  "cn-dialog-header": "gap-1.5",
  "cn-dialog-footer": "gap-2",
  "cn-dialog-title": "text-base leading-none font-medium",
  "cn-dialog-description":
    "text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3",
  "cn-popover-content":
    "bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/5 dark:ring-foreground/10 flex flex-col gap-4 rounded-3xl p-4 text-sm shadow-lg ring-1 duration-100",
  "cn-popover-content-logical":
    "data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2",
  "cn-popover-header": "flex flex-col gap-1 text-sm",
  "cn-popover-title": "text-base font-medium",
  "cn-popover-description": "text-muted-foreground",
  "cn-toast": "rounded-2xl",
  "cn-skeleton": "bg-muted rounded-2xl",
};

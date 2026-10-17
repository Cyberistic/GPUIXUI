/**
 * The icon names, in the order documentation and navigation should show them.
 *
 * This is the single source of truth for *which* icons exist: `registry.ts`
 * must satisfy `Record<IconName, IconMarkup>`, so TypeScript rejects both a
 * missing and an unforeseen icon. Keep the list sorted — `names.test.ts` fails
 * otherwise, which is what keeps a generated icon index stable across builds.
 */
export const ICON_NAMES = [
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "calendar",
  "check",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevrons-up-down",
  "clock",
  "copy",
  "download",
  "ellipsis",
  "error",
  "external-link",
  "eye",
  "eye-off",
  "filter",
  "folder",
  "grid",
  "grip-vertical",
  "home",
  "info",
  "link",
  "list",
  "loader",
  "lock",
  "minus",
  "moon",
  "panel-left",
  "pencil",
  "plus",
  "refresh",
  "search",
  "settings",
  "sort-asc",
  "star",
  "success",
  "sun",
  "trash",
  "upload",
  "user",
  "users",
  "warning",
  "x",
] as const;

/** Every icon this library can render. */
export type IconName = (typeof ICON_NAMES)[number];

import * as Arr from "effect/Array";

/**
 * The icon names, in the order documentation and navigation should show them.
 *
 * This is the single source of truth for *which* icons exist: `registry.ts`
 * must satisfy `Record<IconName, IconMarkup>`, so TypeScript rejects both a
 * missing and an unforeseen icon. Keep the list sorted — `registry.test.ts`
 * fails otherwise, which is what keeps a generated icon index stable across
 * builds.
 */
export const ICON_NAMES = [
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "bell",
  "bot",
  "calendar",
  "check",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "chevrons-up-down",
  "circle",
  "clock",
  "code",
  "copy",
  "database",
  "download",
  "ellipsis",
  "ellipsis-vertical",
  "error",
  "external-link",
  "eye",
  "eye-off",
  "file",
  "file-text",
  "filter",
  "folder",
  "folder-open",
  "git-branch",
  "grid",
  "grip-vertical",
  "help",
  "home",
  "image",
  "info",
  "link",
  "list",
  "loader",
  "lock",
  "mail",
  "maximize",
  "minimize",
  "minus",
  "moon",
  "panel-bottom",
  "panel-left",
  "panel-right",
  "pause",
  "pencil",
  "play",
  "plus",
  "redo",
  "refresh",
  "save",
  "search",
  "settings",
  "shield",
  "sliders-horizontal",
  "sort-asc",
  "sort-desc",
  "sparkles",
  "square",
  "star",
  "star-filled",
  "success",
  "sun",
  "table",
  "terminal",
  "trash",
  "undo",
  "upload",
  "user",
  "users",
  "warning",
  "x",
] as const;

/** Every icon this library can render. */
export type IconName = (typeof ICON_NAMES)[number];

/** The names, typed for a membership test over a decoded value. */
const ICON_SET: ReadonlyArray<string> = ICON_NAMES;

/**
 * Whether a value names an icon the set carries.
 *
 * `name` is `unknown` because it is often a stored value rather than a literal:
 * a saved toolbar, a workspace layout or an action record keeps the name a
 * release may rename or drop, and the type only protects the callers who write
 * a name in source.
 */
export const isIconName = (name: unknown): name is IconName =>
  typeof name === "string" && Arr.contains(ICON_SET, name);

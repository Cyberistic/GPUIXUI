/**
 * The package's public surface: one line per component module.
 *
 * Every module exports its parts, their prop types and its inventory record.
 * Importing a subpath (`@gpuixui/components/badge`) is the finer-grained
 * alternative and is what the docs pages show.
 */

export * from "./alert.js";
export * from "./accordion.js";
export * from "./auto-height.js";
export * from "./avatar.js";
export * from "./badge.js";
export * from "./breadcrumb.js";
export * from "./carousel.js";
export * from "./card.js";
export * from "./chat.js";
export * from "./collapsible.js";
export * from "./color-picker.js";
export * from "./combobox.js";
export * from "./command-menu.js";
export * from "./confirm-dialog.js";
export * from "./context-menu.js";
export * from "./countdown.js";
export * from "./counting-number.js";
export * from "./date-picker.js";
export * from "./dialog.js";
export * from "./drawer.js";
export * from "./dropdown-menu.js";
export * from "./empty-state.js";
export * from "./field.js";
export * from "./fieldset.js";
export * from "./form.js";
export * from "./highlight-text.js";
export * from "./hotkey-recorder.js";
export * from "./inline-edit.js";
export * from "./keyboard-shortcuts.js";
export * from "./list.js";
export * from "./mention-input.js";
export * from "./message.js";
export * from "./message-scroller.js";
export * from "./motion.js";
export * from "./navigation-menu.js";
export * from "./pagination.js";
export * from "./popover.js";
export * from "./preview-card.js";
export * from "./rolling-text.js";
export * from "./rotating-text.js";
export * from "./search-input.js";
export * from "./splitting-text.js";
export * from "./stepper.js";
export * from "./tabs.js";
export * from "./tag-input.js";
export * from "./timeline.js";
export * from "./time-picker.js";
export * from "./toast.js";
export * from "./typing-text.js";

export type { PartChildren } from "./internal/parts.js";

/**
 * The theming surface: the provider every component reads its roles from, and
 * the two themes it ships with.
 *
 * A consumer who installs this package alone must be able to theme it — the
 * isolated linker does not put `@gpuixui/tokens` in their reach — so the
 * provider and the themes are published here. They are the token package's own
 * exports, re-exported through the package's single seam; there is still one
 * provider, not a second one.
 */
export {
  ThemeProvider,
  darkTheme,
  lightTheme,
  useTheme,
  type Theme,
} from "./internal/theme.js";

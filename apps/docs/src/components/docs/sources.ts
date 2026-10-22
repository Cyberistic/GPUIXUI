import button from "../../../../../packages/primitives/src/components/Button.tsx?raw";
import commandMenu from "../../../../../packages/components/src/command-menu.tsx?raw";
import dialog from "../../../../../packages/components/src/dialog.tsx?raw";
import dropdownMenu from "../../../../../packages/components/src/dropdown-menu.tsx?raw";
import popover from "../../../../../packages/components/src/popover.tsx?raw";
import tabs from "../../../../../packages/components/src/tabs.tsx?raw";

/**
 * The real component implementation, shown under Installation as `?raw`.
 *
 * A docs page links the same file on GitHub; importing it read-only keeps the
 * page honest without making the native package a browser dependency.
 */
export const componentSources = {
  button,
  commandMenu,
  dialog,
  dropdownMenu,
  popover,
  tabs,
} as const;

export type ComponentSourceName = keyof typeof componentSources;

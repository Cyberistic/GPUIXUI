import accordion from "../../../../../packages/components/src/accordion.tsx?raw";
import alert from "../../../../../packages/components/src/alert.tsx?raw";
import button from "../../../../../packages/primitives/src/components/Button.tsx?raw";
import card from "../../../../../packages/components/src/card.tsx?raw";
import commandMenu from "../../../../../packages/components/src/command-menu.tsx?raw";
import confirmDialog from "../../../../../packages/components/src/confirm-dialog.tsx?raw";
import dialog from "../../../../../packages/components/src/dialog.tsx?raw";
import dropdownMenu from "../../../../../packages/components/src/dropdown-menu.tsx?raw";
import field from "../../../../../packages/components/src/field.tsx?raw";
import popover from "../../../../../packages/components/src/popover.tsx?raw";
import tabs from "../../../../../packages/components/src/tabs.tsx?raw";
import toast from "../../../../../packages/components/src/toast.tsx?raw";

/**
 * The real component implementation, shown under Installation as `?raw`.
 *
 * A docs page links the same file on GitHub; importing it read-only keeps the
 * page honest without making the native package a browser dependency.
 */
export const componentSources = {
  accordion,
  alert,
  button,
  card,
  commandMenu,
  confirmDialog,
  dialog,
  dropdownMenu,
  field,
  popover,
  tabs,
  toast,
} as const;

export type ComponentSourceName = keyof typeof componentSources;

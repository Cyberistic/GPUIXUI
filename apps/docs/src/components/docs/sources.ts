import accordion from "../../../../../packages/components/src/accordion.tsx?raw";
import alert from "../../../../../packages/components/src/alert.tsx?raw";
import breadcrumb from "../../../../../packages/components/src/breadcrumb.tsx?raw";
import button from "../../../../../packages/primitives/src/components/Button.tsx?raw";
import card from "../../../../../packages/components/src/card.tsx?raw";
import carousel from "../../../../../packages/components/src/carousel.tsx?raw";
import checkbox from "../../../../../packages/primitives/src/components/Checkbox.tsx?raw";
import collapsible from "../../../../../packages/components/src/collapsible.tsx?raw";
import commandMenu from "../../../../../packages/components/src/command-menu.tsx?raw";
import combobox from "../../../../../packages/components/src/combobox.tsx?raw";
import confirmDialog from "../../../../../packages/components/src/confirm-dialog.tsx?raw";
import contextMenu from "../../../../../packages/components/src/context-menu.tsx?raw";
import datePicker from "../../../../../packages/components/src/date-picker.tsx?raw";
import dialog from "../../../../../packages/components/src/dialog.tsx?raw";
import dropdownMenu from "../../../../../packages/components/src/dropdown-menu.tsx?raw";
import drawer from "../../../../../packages/components/src/drawer.tsx?raw";
import field from "../../../../../packages/components/src/field.tsx?raw";
import form from "../../../../../packages/components/src/form.tsx?raw";
import inlineEdit from "../../../../../packages/components/src/inline-edit.tsx?raw";
import list from "../../../../../packages/components/src/list.tsx?raw";
import pagination from "../../../../../packages/components/src/pagination.tsx?raw";
import popover from "../../../../../packages/components/src/popover.tsx?raw";
import searchInput from "../../../../../packages/components/src/search-input.tsx?raw";
import select from "../../../../../packages/primitives/src/components/Select.tsx?raw";
import stepper from "../../../../../packages/components/src/stepper.tsx?raw";
import switchSource from "../../../../../packages/primitives/src/components/Switch.tsx?raw";
import tagInput from "../../../../../packages/components/src/tag-input.tsx?raw";
import tabs from "../../../../../packages/components/src/tabs.tsx?raw";
import table from "../../../../../packages/data/src/table/table.tsx?raw";
import timeline from "../../../../../packages/components/src/timeline.tsx?raw";
import timePicker from "../../../../../packages/components/src/time-picker.tsx?raw";
import toast from "../../../../../packages/components/src/toast.tsx?raw";
import tooltip from "../../../../../packages/primitives/src/components/Tooltip.tsx?raw";

/**
 * The real component implementation, shown under Installation as `?raw`.
 *
 * A docs page links the same file on GitHub; importing it read-only keeps the
 * page honest without making the native package a browser dependency.
 */
export const componentSources = {
  accordion,
  alert,
  breadcrumb,
  button,
  card,
  carousel,
  checkbox,
  collapsible,
  commandMenu,
  combobox,
  confirmDialog,
  contextMenu,
  datePicker,
  dialog,
  dropdownMenu,
  drawer,
  field,
  form,
  inlineEdit,
  list,
  pagination,
  popover,
  searchInput,
  select,
  stepper,
  switch: switchSource,
  table,
  tabs,
  tagInput,
  timeline,
  timePicker,
  toast,
  tooltip,
} as const;

export type ComponentSourceName = keyof typeof componentSources;

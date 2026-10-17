/**
 * The Tier 2 inventory: one record per implemented component.
 *
 * Each module owns its record, so the inventory cannot drift from the code it
 * describes; this file only collects them. `inventory.test.ts` checks the records
 * against the files on disk and the rows in `COMPONENTS.md`.
 */

import { accordionMeta } from "./accordion.js";
import { alertMeta } from "./alert.js";
import { avatarMeta } from "./avatar.js";
import { badgeMeta } from "./badge.js";
import { breadcrumbMeta } from "./breadcrumb.js";
import { cardMeta } from "./card.js";
import { collapsibleMeta } from "./collapsible.js";
import { comboboxMeta } from "./combobox.js";
import { commandMenuMeta } from "./command-menu.js";
import { confirmDialogMeta } from "./confirm-dialog.js";
import { contextMenuMeta } from "./context-menu.js";
import { dialogMeta } from "./dialog.js";
import { dropdownMenuMeta } from "./dropdown-menu.js";
import { emptyStateMeta } from "./empty-state.js";
import { fieldMeta } from "./field.js";
import { listMeta } from "./list.js";
import { paginationMeta } from "./pagination.js";
import { popoverMeta } from "./popover.js";
import { searchInputMeta } from "./search-input.js";
import { tabsMeta } from "./tabs.js";
import { toastMeta } from "./toast.js";

/** One component's inventory record. */
export interface ComponentMeta {
  /** Exactly the label used in `COMPONENTS.md`. */
  readonly name: string;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly status: "todo" | "wip" | "done" | "blocked" | "unsupported";
  readonly gpuixSupport: "yes" | "partial" | "no";
  /** Empty array when there is no limitation. Never omitted. */
  readonly limitations: ReadonlyArray<string>;
  /** `docs/<name>.mdx` */
  readonly docs: string;
  /** `examples/<name>.example.tsx` */
  readonly example: string;
  /** `src/behaviour/<name>.test.tsx` */
  readonly testFile: string;
}

/** Every implemented Tier 2 component. */
export const inventory: ReadonlyArray<ComponentMeta> = [
  accordionMeta,
  alertMeta,
  avatarMeta,
  badgeMeta,
  breadcrumbMeta,
  cardMeta,
  collapsibleMeta,
  comboboxMeta,
  commandMenuMeta,
  confirmDialogMeta,
  contextMenuMeta,
  dialogMeta,
  dropdownMenuMeta,
  emptyStateMeta,
  fieldMeta,
  listMeta,
  paginationMeta,
  popoverMeta,
  searchInputMeta,
  tabsMeta,
  toastMeta,
];

/** @jsxImportSource @gpuix/react */
/**
 * Sheet: the dialog-shaped side surface, under shadcn's names.
 *
 * A sheet and a drawer are the same surface here — a veil over the window, a
 * panel on one edge, a focus trap, Escape and an outside press — and `Drawer`
 * already owns that machinery for all four edges. `Sheet` re-exports it rather
 * than growing a second copy that would drift. What shadcn gives the drawer and
 * not the sheet is the drag gesture, which the runtime cannot paint: 0.11.0 has
 * no drag host and no `transform`, so neither surface swipes.
 *
 * The one difference a caller sees is the default: shadcn's sheet opens from
 * the right, and so does the surface it re-exports.
 */

export {
  Drawer as Sheet,
  DrawerClose as SheetClose,
  DrawerContent as SheetContent,
  DrawerDescription as SheetDescription,
  DrawerFooter as SheetFooter,
  DrawerHeader as SheetHeader,
  DrawerTitle as SheetTitle,
  DrawerTrigger as SheetTrigger,
} from "./drawer.js";

export type {
  DrawerContentProps as SheetContentProps,
  DrawerSide as SheetSide,
  DrawerSize as SheetSize,
} from "./drawer.js";

import { drawerMeta } from "./drawer.js";

/**
 * Inventory record, mirrored into `COMPONENTS.md`.
 *
 * It carries the drawer's limitations — the surface is the same one — and adds
 * the fact a reader needs first: there is one implementation, not two.
 */
export const sheetMeta = {
  name: "Sheet",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "one implementation with Drawer: a sheet is the drawer's surface under shadcn's names",
    ...drawerMeta.limitations,
  ],
  docs: "docs/sheet.mdx",
  example: "examples/sheet.example.tsx",
  testFile: "src/behaviour/sheet.test.tsx",
} as const;

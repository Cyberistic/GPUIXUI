/** @jsxImportSource @gpuix/react */
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

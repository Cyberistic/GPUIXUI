/** @jsxImportSource @gpuix/react */
/**
 * Sheet example: one control per window edge.
 *
 * Uncontrolled: each trigger owns its own open state, which is what a sheet in
 * a toolbar does. A caller coordinating a workflow passes `open`/`onOpenChange`.
 */

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../src/sheet.js";

/** A sheet from the right, the default edge. */
export const SheetExample = () => (
  <Sheet>
    <SheetTrigger>Filters</SheetTrigger>
    <SheetContent side="right" label="Filters">
      <SheetHeader>
        <SheetTitle>Filters</SheetTitle>
        <SheetDescription>Narrow the result set, then apply.</SheetDescription>
      </SheetHeader>
      <SheetFooter>
        <SheetClose>Cancel</SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

/** The same surface from the top edge. */
export const SheetTopExample = () => (
  <Sheet>
    <SheetTrigger>Command bar</SheetTrigger>
    <SheetContent side="top" size="sm" label="Command bar">
      <SheetHeader>
        <SheetTitle>Command bar</SheetTitle>
        <SheetDescription>
          Escape or a press outside closes it.
        </SheetDescription>
      </SheetHeader>
    </SheetContent>
  </Sheet>
);

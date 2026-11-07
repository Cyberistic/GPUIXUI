/** @jsxImportSource @gpuix/react */
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

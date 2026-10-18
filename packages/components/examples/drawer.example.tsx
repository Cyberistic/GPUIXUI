/**
 * Drawer example: filters at the right edge and a details sheet at the bottom.
 *
 * Both are uncontrolled: the trigger and the close control own the open state.
 * A consumer that needs to coordinate with its own workflow passes `open` /
 * `onOpenChange` instead.
 */

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../src/drawer.js";

/** A right-edge filter drawer. */
export const DrawerExample = () => (
  <Drawer>
    <DrawerTrigger>Filters</DrawerTrigger>
    <DrawerContent side="right" size="md" label="Filters">
      <DrawerHeader>
        <DrawerTitle>Filters</DrawerTitle>
        <DrawerDescription>
          Narrow the result set, then apply.
        </DrawerDescription>
      </DrawerHeader>
      <DrawerFooter>
        <DrawerClose>Cancel</DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);

/** A bottom sheet, useful for details on a narrow layout. */
export const DrawerSheetExample = () => (
  <Drawer>
    <DrawerTrigger>Details</DrawerTrigger>
    <DrawerContent side="bottom" size="sm" label="Details">
      <DrawerHeader>
        <DrawerTitle>Details</DrawerTitle>
        <DrawerDescription>
          Escape or a press outside the sheet closes it.
        </DrawerDescription>
      </DrawerHeader>
      <DrawerFooter>
        <DrawerClose>Close</DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);

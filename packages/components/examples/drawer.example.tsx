/** @jsxImportSource @gpuix/react */
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

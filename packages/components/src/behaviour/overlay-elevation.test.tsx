import {
  classesToStyle,
  DIALOG_CONTENT,
  MENU_CONTENT,
  POPOVER_CONTENT,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "../dialog.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown-menu.js";
import {
  darkTheme,
  elevationShadow,
  lightTheme,
  type Theme,
} from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";

const lifted = (theme: Theme, recipe: string) => {
  const edge = Option.getOrElse(
    Option.fromNullishOr(classesToStyle(recipe, theme).style.boxShadow),
    () => [],
  );
  const lift = elevationShadow(theme, "lg");

  return [lift, ...Arr.ensure(edge)].map((shadow) => ({
    ...shadow,
    inset: false,
  }));
};

describe("a floating surface is raised", () => {
  const cases = [
    {
      name: "Dialog",
      recipe: DIALOG_CONTENT,
      node: (
        <Dialog defaultOpen>
          <DialogContent testId="surface" label="Raised">
            <DialogTitle>Raised</DialogTitle>
          </DialogContent>
        </Dialog>
      ),
    },
    {
      name: "Popover",
      recipe: POPOVER_CONTENT,
      node: (
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent testId="surface">Raised</PopoverContent>
        </Popover>
      ),
    },
    {
      name: "DropdownMenu",
      recipe: MENU_CONTENT,
      node: (
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
          <DropdownMenuContent testId="surface" label="Actions">
            <DropdownMenuItem>Rename</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ] as const;

  Arr.forEach(cases, (surface) => {
    it(`${surface.name} paints the theme's lift beside its ring`, () => {
      Arr.forEach([lightTheme, darkTheme], (theme) => {
        const page = renderComponent(surface.node, theme.mode);
        try {
          expect(
            page.renderer.findByTestId("surface")?.style.boxShadow,
            `${surface.name} paints a hairline and no elevation (${theme.name})`,
          ).toEqual(lifted(theme, surface.recipe));
        } finally {
          page.unmount();
        }
      });
    });
  });
});

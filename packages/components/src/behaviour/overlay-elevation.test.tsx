/**
 * A floating surface is raised, in the real GPUix renderer.
 *
 * The bug these guard: `@gpuixui/tw` writes `shadow-*` and `ring-*` through the
 * one `boxShadow` slot and applies the ring last, so the shipped dialog,
 * popover and menu painted a 1px hairline and **no elevation** — every
 * "raised" surface sat flat while its recipe named a lift. The seam composes
 * the theme's `lg` beside the ring, and the runtime paints a list, so the
 * surface now carries both declarations. These cases read the applied style off
 * the rendered element, which is the only place the pair can be seen; a unit
 * test on the seam would not prove the three components ask for it.
 */

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
import { elevationShadow, lightTheme, type Theme } from "../internal/theme.js";
import { renderComponent } from "../internal/test-root.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover.js";

/** The pair a raised surface must paint: the theme's lift, then its ring. */
const lifted = (theme: Theme, recipe: string) => {
  const edge = Option.getOrElse(
    Option.fromNullishOr(classesToStyle(recipe, theme).style.boxShadow),
    () => [],
  );
  const lift = elevationShadow(theme, "lg");
  // The renderer reports the optional `inset` field as `false` on every shadow
  // it applies; the theme's own values omit it.
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
      const page = renderComponent(surface.node, "light");
      try {
        expect(
          page.renderer.findByTestId("surface")?.style.boxShadow,
          `${surface.name} paints a hairline and no elevation`,
        ).toEqual(lifted(lightTheme, surface.recipe));
      } finally {
        page.unmount();
      }
    });
  });
});

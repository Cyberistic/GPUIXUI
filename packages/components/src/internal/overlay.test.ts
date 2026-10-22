/**
 * The overlay surface seam: a floating surface paints the theme's lift beside
 * its hairline edge.
 *
 * The bug these guard: `@gpuixui/tw` writes `shadow-*` and `ring-*` through the
 * one `boxShadow` slot and applies the ring after the utilities, so the shipped
 * dialog, popover and menu recipes compiled to a 1px `foreground` ring and **no
 * elevation** — a "raised" surface that sat flat. The runtime paints a shadow
 * list, so the seam restores the theme's level as a second entry. A recipe that
 * already paints its own lift must keep exactly one (a second would be a
 * double-height shadow), and the reserved, empty `overlay` level must stay flat.
 */

import {
  classesToStyle,
  DIALOG_CONTENT,
  MENU_CONTENT,
  POPOVER_CONTENT,
  TOAST_CARD,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { overlaySurfaceStyle } from "./overlay.js";
import {
  darkTheme,
  elevationShadow,
  lightTheme,
  type BoxShadow,
  type Theme,
} from "./theme.js";

/** The shadows a compiled style paints, in order. */
const painted = (style: { readonly boxShadow?: BoxShadow | BoxShadow[] }) =>
  Option.getOrElse(
    Option.map(Option.fromNullishOr(style.boxShadow), (value) =>
      Arr.ensure(value),
    ),
    () => [],
  );

/** The shadow the recipe itself compiles, before the seam adds a lift. */
const recipeShadow = (recipe: string, theme: Theme) =>
  painted(classesToStyle(recipe, theme).style);

describe("overlaySurfaceStyle", () => {
  it("puts the theme's lift beside the ring the recipe's edge paints", () => {
    const surfaces = [DIALOG_CONTENT, POPOVER_CONTENT, MENU_CONTENT];
    const cases = Arr.flatMap(surfaces, (recipe) =>
      Arr.map([lightTheme, darkTheme], (theme) => ({ recipe, theme })),
    );

    expect(
      Arr.map(cases, ({ recipe, theme }) =>
        painted(overlaySurfaceStyle(recipe, undefined, theme, "lg")),
      ),
    ).toEqual(
      Arr.map(cases, ({ recipe, theme }) => [
        elevationShadow(theme, "lg"),
        ...recipeShadow(recipe, theme),
      ]),
    );
  });

  it("keeps exactly one lift when the recipe already paints its own", () => {
    // TOAST_CARD names `border` and `shadow-md`, so its recipe compiles the md
    // lift; naming a level must not stack a second shadow behind it.
    const style = overlaySurfaceStyle(TOAST_CARD, undefined, lightTheme, "md");
    expect(painted(style)).toEqual([elevationShadow(lightTheme, "md")]);
  });

  it("paints the recipe alone when the surface names no level", () => {
    const style = overlaySurfaceStyle(DIALOG_CONTENT, undefined, lightTheme);
    expect(painted(style)).toEqual(recipeShadow(DIALOG_CONTENT, lightTheme));
  });

  it("keeps the reserved, empty level flat", () => {
    const style = overlaySurfaceStyle(
      DIALOG_CONTENT,
      undefined,
      lightTheme,
      "overlay",
    );
    expect(painted(style)).toEqual(recipeShadow(DIALOG_CONTENT, lightTheme));
  });

  it("joins the caller's className before the lift", () => {
    const style = overlaySurfaceStyle(
      DIALOG_CONTENT,
      "rounded-none",
      lightTheme,
      "lg",
    );
    expect(style.borderRadius).toBe(0);
    expect(painted(style)).toHaveLength(2);
  });
});

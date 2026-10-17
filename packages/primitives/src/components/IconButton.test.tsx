/**
 * `IconButton`'s element tree.
 *
 * The three traps this part exists for are all decided before the runtime: the
 * composed part is a square `Button` with a required name, the icon is tinted
 * with the role the variant paints its text in, and `loading` replaces the icon
 * with the button's spinner instead of painting both.
 */

import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { buttonVariants } from "../core/variants.js";
import { Button } from "./Button.js";
import { renderIconButton, type IconButtonProps } from "./IconButton.js";
import { elementChildren, elementProp, expectSome } from "./testing/element.js";

const render = (props: Omit<IconButtonProps, "icon" | "label"> = {}) =>
  renderIconButton({ icon: "x", label: "Close", ...props }, testTheme);

const iconOf = (element: ReactElement): ReactElement =>
  expectSome(Arr.head(elementChildren(element)));

const colorOf = (props: Omit<IconButtonProps, "icon" | "label">): unknown =>
  Option.getOrUndefined(elementProp(iconOf(render(props)), "color"));

describe("IconButton", () => {
  it("composes a square Button carrying the required name", () => {
    const button = render();
    expect(button.type).toBe(Button);
    expect(elementProp(button, "square")).toStrictEqual(Option.some(true));
    expect(elementProp(button, "label")).toStrictEqual(Option.some("Close"));
  });

  it("paints the icon named by `icon`", () => {
    const icon = iconOf(render());
    expect(elementProp(icon, "name")).toStrictEqual(Option.some("x"));
    expect(elementProp(icon, "size")).toStrictEqual(Option.some("md"));
  });

  it("tints the icon with the role the variant paints its text in", () => {
    // The bug guarded: an icon on a filled button needs the *foreground* role,
    // not the fill or the surface; a hand-rolled copy tinted it with the page
    // colour and the glyph vanished on `primary`.
    expect(colorOf({})).toBe(buttonVariants.primary.foreground(testTheme));
    expect(colorOf({ variant: "ghost" })).toBe(
      buttonVariants.ghost.foreground(testTheme),
    );
    expect(colorOf({ variant: "destructive" })).toBe(
      buttonVariants.destructive.foreground(testTheme),
    );
  });

  it("takes the icon size from the control size", () => {
    const sizeOf = (size: "sm" | "md" | "lg"): unknown =>
      Option.getOrUndefined(elementProp(iconOf(render({ size })), "size"));
    expect([sizeOf("sm"), sizeOf("md"), sizeOf("lg")]).toStrictEqual([
      "sm",
      "md",
      "lg",
    ]);
  });

  it("replaces the icon with the spinner while loading", () => {
    const button = render({ loading: true });
    expect(elementChildren(button)).toStrictEqual([]);
    expect(elementProp(button, "loading")).toStrictEqual(Option.some(true));
    expect(elementProp(button, "label")).toStrictEqual(Option.some("Close"));
  });

  it("forwards the button props it accepts", () => {
    const button = render({ variant: "outline", size: "lg", disabled: true });
    expect(elementProp(button, "variant")).toStrictEqual(
      Option.some("outline"),
    );
    expect(elementProp(button, "size")).toStrictEqual(Option.some("lg"));
    expect(elementProp(button, "disabled")).toStrictEqual(Option.some(true));
  });
});

/**
 * Avatar behaviour, in the real GPUix renderer.
 *
 * The bugs these guard: a fallback that renders nothing instead of the
 * initials; a `src` that never reaches an image; a picture that replaces the
 * initials instead of covering them, leaving a failed load blank; a presence dot
 * painted from a constant, missing entirely, or clipped away by the avatar's own
 * disc; the four sizes collapsing to one diameter; and a lost accessible name.
 */

import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Avatar, type AvatarSize, type AvatarStatus } from "../avatar.js";
import { nodesWithRole } from "../internal/a11y.js";
import { requireBounds, sizeOf } from "../internal/interaction.js";
import { darkTheme } from "../internal/theme.js";
import {
  renderComponent,
  type ComponentTestRoot,
} from "../internal/test-root.js";

/** Every presence state with the theme role its dot must paint. */
const statusFills: ReadonlyArray<readonly [AvatarStatus, string]> = [
  ["online", darkTheme.colors.success],
  ["away", darkTheme.colors.warning],
  ["busy", darkTheme.colors.destructive],
  ["offline", darkTheme.colors.mutedForeground],
];

/** Every size with its diameter in pixels. */
const diameters: ReadonlyArray<readonly [AvatarSize, number]> = [
  ["xs", 20],
  ["sm", 26],
  ["md", 32],
  ["lg", 40],
];

/** The fill of every `div` in the tree, in tree order. */
const backgrounds = (root: ComponentTestRoot): ReadonlyArray<unknown> =>
  Arr.map(
    root.renderer.findByType("div"),
    (element) => element.style.backgroundColor,
  );

describe("Avatar", () => {
  it("falls back to the name's initials", () => {
    const avatar = renderComponent(
      <Avatar testId="avatar" name="Ada Lovelace" />,
    );

    expect(avatar.renderer.getAllText()).toEqual(["AL"]);
    expect(avatar.renderer.findByType("img")).toHaveLength(0);

    avatar.unmount();
  });

  it("shows the picture when given a src", () => {
    const avatar = renderComponent(
      <Avatar testId="avatar" name="Ada Lovelace" src="/photos/ada.png" />,
    );

    const images = avatar.renderer.findByType("img");
    expect(images).toHaveLength(1);
    expect(images[0]?.customProps?.src).toBe("/photos/ada.png");
    // The fallback stays in the tree: the picture covers it, it does not replace it.
    expect(avatar.renderer.getAllText()).toEqual(["AL"]);

    avatar.unmount();
  });

  it("layers the picture over the initials so a failed load still shows them", () => {
    const avatar = renderComponent(
      <Avatar testId="avatar" name="Ada Lovelace" src="/photos/missing.png" />,
    );

    expect(avatar.renderer.getAllText()).toEqual(["AL"]);
    expect(avatar.renderer.findByTestId("avatar-image")?.customProps?.src).toBe(
      "/photos/missing.png",
    );
    // An inset picture covers exactly the disc, so a successful load hides the
    // initials while a failed one leaves them alone.
    expect(requireBounds(avatar, "avatar-image")).toEqual(
      requireBounds(avatar, "avatar"),
    );

    avatar.unmount();
  });

  it("names itself for assistive technology", () => {
    const avatar = renderComponent(
      <Avatar testId="avatar" name="Ada Lovelace" />,
    );
    const images = nodesWithRole(avatar.renderer, "image");

    expect(images).toHaveLength(1);
    expect(images.map((node) => node.name)).toEqual(["Ada Lovelace"]);

    avatar.unmount();
  });

  it("describes its presence without changing its name", () => {
    const avatar = renderComponent(
      <Avatar testId="avatar" name="Ada Lovelace" status="away" />,
    );

    expect(avatar.renderer.findByTestId("avatar")?.customProps).toMatchObject({
      "aria-label": "Ada Lovelace",
      "aria-description": "away",
    });
    expect(
      nodesWithRole(avatar.renderer, "image").map((node) => node.name),
    ).toEqual(["Ada Lovelace"]);

    avatar.unmount();
  });

  it("omits the description without a status and keeps the caller's own", () => {
    const plain = renderComponent(
      <Avatar testId="avatar" name="Ada Lovelace" />,
    );
    expect(
      plain.renderer.findByTestId("avatar")?.customProps?.["aria-description"],
    ).toBeUndefined();
    plain.unmount();

    const authored = renderComponent(
      <Avatar
        testId="avatar"
        name="Ada Lovelace"
        status="busy"
        aria-description="In a meeting"
      />,
    );
    expect(authored.renderer.findByTestId("avatar")?.customProps).toMatchObject(
      { "aria-description": "In a meeting" },
    );
    authored.unmount();
  });

  it("paints the presence dot from the theme's status roles", () => {
    Arr.forEach(statusFills, ([status, expected]) => {
      const avatar = renderComponent(
        <Avatar testId="avatar" name="Ada" status={status} />,
      );

      // The root paints no fill of its own and the clipped disc paints the
      // placeholder, so the dot is the third — and a missing dot shortens this.
      expect(backgrounds(avatar)).toEqual([
        undefined,
        darkTheme.colors.muted,
        expected,
      ]);

      avatar.unmount();
    });
  });

  it("renders no dot when there is no status", () => {
    const avatar = renderComponent(<Avatar testId="avatar" name="Ada" />);

    expect(backgrounds(avatar)).toEqual([undefined, darkTheme.colors.muted]);

    avatar.unmount();
  });

  it("measures each size's diameter", () => {
    Arr.forEach(diameters, ([size, diameter]) => {
      const avatar = renderComponent(
        <Avatar testId="avatar" name="Ada" size={size} />,
      );

      expect(sizeOf(avatar, "avatar")).toEqual(
        Option.some({ width: diameter, height: diameter }),
      );

      avatar.unmount();
    });
  });

  it("lets a consumer's style win", () => {
    const avatar = renderComponent(
      <Avatar testId="avatar" name="Ada" style={{ width: 64 }} />,
    );

    expect(sizeOf(avatar, "avatar")).toEqual(
      Option.some({ width: 64, height: 32 }),
    );

    avatar.unmount();
  });
});

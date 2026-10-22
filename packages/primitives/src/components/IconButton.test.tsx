/**
 * The IconButton contract.
 *
 * An icon-only action has no text to name it, so the two things worth guarding
 * are the name and the shape: the label must be what assistive technology
 * hears (the glyph must never become the name), and the control must be square
 * at the density's height (an icon button that is wider than tall reads as a
 * truncated text button). `Button` alone allowed an unnamed, non-square
 * icon-only control, which is why this component exists.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { testTheme } from "../core/testing/theme.fixture.js";
import { iconButtonProps, renderIconButton } from "./IconButton.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
} from "./testing/element.js";

const glyph = <Icon name="trash" color={testTheme.colors.mutedForeground} />;

const resting = (props: Parameters<typeof renderIconButton>[0]): ReactElement =>
  renderIconButton(props, testTheme, { focused: false });

const press = (
  element: ReactElement,
  key: string,
  phase: "down" | "up",
  held = false,
): void => {
  const handler = expectSome(
    hostHandler(element, phase === "down" ? "onKeyDown" : "onKeyUp"),
  );
  handler(keyEvent(key, held ? { isHeld: true } : {}));
};

describe("IconButton", () => {
  it("uses the label as the name, never the glyph", () => {
    // The bug: an icon-only button was announced by nothing at all, because a
    // div with a rich child has no text for the wrapper to publish.
    expect(
      expectSome(
        hostProp(resting({ label: "Delete layer", icon: glyph }), "aria-label"),
      ),
    ).toBe("Delete layer");
  });

  it("passes a tooltip trigger's pointer pair and description to its button", () => {
    // Bug guarded: the icon action is the usual tooltip trigger, and this
    // component narrowed `Button`'s props without the trigger pair, so a
    // hover could not open a tip and the tip's description stopped here.
    const entered = vi.fn();
    const left = vi.fn();
    const props = iconButtonProps({
      label: "Delete layer",
      icon: glyph,
      onMouseEnter: entered,
      onMouseLeave: left,
      "aria-description": "Deletes the selected layer",
    });
    expect(props.onMouseEnter).toBe(entered);
    expect(props.onMouseLeave).toBe(left);
    expect(props["aria-description"]).toBe("Deletes the selected layer");
  });

  it("carries a trigger's host props onto its button", () => {
    // The bug guarded: an icon action is the usual menu or popover trigger, so
    // a `ref` and `aria-expanded` have to reach the element here too — the
    // props were narrowed away when only the tooltip pair was forwarded.
    const ref = vi.fn();
    const element = resting({
      label: "Open filters",
      icon: glyph,
      ref,
      "aria-expanded": true,
    });
    expect(Option.getOrUndefined(hostProp(element, "ref"))).toBe(ref);
    expect(expectSome(hostProp(element, "aria-expanded"))).toBe(true);
    expect(expectSome(hostProp(element, "role"))).toBe("button");
  });

  it("is square at the density's control height", () => {
    const style = expectSome(
      hostStyleRecord(resting({ label: "Delete layer", icon: glyph })),
    );
    expect(style["width"]).toBe(testTheme.density.controlHeight.md);
    expect(style["height"]).toBe(style["width"]);
  });

  it("is a ghost button by default and takes a variant when asked", () => {
    const ghost = expectSome(
      hostStyleRecord(resting({ label: "Delete", icon: glyph })),
    );
    expect(Option.fromNullishOr(ghost["backgroundColor"])).toStrictEqual(
      Option.none(),
    );
    const primary = expectSome(
      hostStyleRecord(
        resting({ label: "Delete", icon: glyph, variant: "primary" }),
      ),
    );
    expect(primary["backgroundColor"]).toBe(testTheme.colors.primary);
  });

  it("keeps Button's activation contract and refuses when disabled", () => {
    const onActivate = vi.fn();
    const element = resting({ label: "Delete", icon: glyph, onActivate });
    press(element, "enter", "down");
    press(element, "space", "down");
    press(element, "space", "up");
    expect(onActivate).toHaveBeenCalledTimes(2);

    const disabled = resting({
      label: "Delete",
      icon: glyph,
      disabled: true,
      onActivate,
    });
    press(disabled, "enter", "down");
    expect(onActivate).toHaveBeenCalledTimes(2);
    expect(hostProp(disabled, "tabIndex")).toStrictEqual(Option.none());
  });

  it("stays focusable while busy and blocks activation", () => {
    const onActivate = vi.fn();
    const loading = resting({
      label: "Saving",
      icon: glyph,
      loading: true,
      onActivate,
    });
    press(loading, "enter", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(expectSome(hostProp(loading, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(loading, "aria-description"))).toBe("Loading");
  });

  it("hands the busy spinner the caller's reduced-motion preference", () => {
    // The bug guarded: `Button` forwarded `reducedMotion` to its spinner while
    // `IconButton` — the same `Button` with an icon slot — dropped it, so a
    // toolbar built from icon actions could not honour the preference.
    const preference = (reducedMotion: boolean): Option.Option<unknown> =>
      elementProp(
        elementChildren(
          resting({
            label: "Saving",
            icon: glyph,
            loading: true,
            reducedMotion,
          }),
        )[0] ?? expect.fail("the busy icon button drew no spinner"),
        "reducedMotion",
      );
    expect(preference(true)).toStrictEqual(Option.some(true));
    expect(preference(false)).toStrictEqual(Option.some(false));
  });

  it("hands the caller's style the live state and lets it win", () => {
    const element = renderIconButton(
      {
        label: "Delete",
        icon: glyph,
        style: (state) => ({ opacity: state.focused ? 0.9 : 0.4 }),
      },
      testTheme,
      { focused: true },
    );
    expect(expectSome(hostStyleRecord(element))["opacity"]).toBe(0.9);
  });

  it("decides square and ghost once, so the component has no second paint", () => {
    const props = iconButtonProps({
      label: "Delete",
      icon: glyph,
      variant: "outline",
      size: "lg",
    });
    expect(props.square).toBe(true);
    expect(props.variant).toBe("outline");
    expect(props.size).toBe("lg");
    expect(props.label).toBe("Delete");
    expect(iconButtonProps({ label: "Delete", icon: glyph }).variant).toBe(
      "ghost",
    );
  });
});

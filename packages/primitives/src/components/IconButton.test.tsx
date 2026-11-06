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
    expect(
      expectSome(
        hostProp(resting({ label: "Delete layer", icon: glyph }), "aria-label"),
      ),
    ).toBe("Delete layer");
  });

  it("passes a tooltip trigger's pointer pair and description to its button", () => {
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

    expect(hostProp(disabled, "tabIndex")).toStrictEqual(Option.some(-1));
  });

  it("squares its corners inside an attached group", () => {
    const radius = (attached: boolean): unknown =>
      expectSome(
        hostStyleRecord(
          renderIconButton(
            { label: "Delete", icon: glyph },
            testTheme,
            { focused: false },
            attached,
          ),
        ),
      )["borderRadius"];
    expect(radius(false)).toBe(testTheme.radius.md);
    expect(radius(true)).toBe(0);
  });

  it("forwards the activation event Button reports", () => {
    const onActivate = vi.fn();
    const element = resting({ label: "Layers", icon: glyph, onActivate });
    const click = { elementId: 0, eventType: "click", x: 4, y: 5 } as const;
    expectSome(hostHandler(element, "onClick"))(click);
    expect(onActivate).toHaveBeenLastCalledWith(click);
    const enter = keyEvent("enter");
    expectSome(hostHandler(element, "onKeyDown"))(enter);
    expect(onActivate).toHaveBeenLastCalledWith(enter);
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

  it("forwards the caller's busy words to its button", () => {
    const loading = resting({
      label: "Saving",
      icon: glyph,
      loading: true,
      loadingLabel: "Enregistrement",
    });
    expect(expectSome(hostProp(loading, "aria-description"))).toBe(
      "Enregistrement",
    );
    expect(
      expectSome(
        elementProp(
          elementChildren(loading)[0] ?? expect.fail("no busy spinner"),
          "label",
        ),
      ),
    ).toBe("Enregistrement");
  });

  it("hands the busy spinner the caller's reduced-motion preference", () => {
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

  it("carries the Tab stop a leaving surface names", () => {
    expect(
      hostProp(
        resting({ label: "Close", icon: glyph, tabIndex: -1 }),
        "tabIndex",
      ),
    ).toStrictEqual(Option.some(-1));
    expect(
      hostProp(resting({ label: "Close", icon: glyph }), "tabIndex"),
    ).toStrictEqual(Option.some(0));
    expect(
      iconButtonProps({ label: "Close", icon: glyph, tabIndex: -1 }).tabIndex,
    ).toBe(-1);
  });
});

/**
 * The Button keyboard contract.
 *
 * The published `@gpuix/react` ships **no** button (plan 020 §1.5), so this is
 * behaviour the library owns — and the part most worth guarding. Each test
 * below flips a real bug: Enter firing on key *up* (double activation with the
 * platform's own click), Space on key *down* (repeating while held), a held key
 * activating, a busy button still firing, and a disabled button keeping its tab
 * stop. Plan 085 adds the one the props disagreed on: a key activation reported
 * through `onClick`, not only through `onActivate`.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import { buttonRecipeRing } from "../core/recipes.js";
import { buttonVariants } from "../core/variants.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { Text } from "./Text.js";
import { keyEvent, clickEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
  hostTag,
} from "./testing/element.js";

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

const resting = (props: Parameters<typeof renderButton>[0]): ReactElement =>
  renderButton(props, testTheme, { focused: false });

describe("Button", () => {
  it("names itself from text children, and refuses to guess at non-text", () => {
    expect(
      expectSome(hostProp(resting({ children: "Save changes" }), "aria-label")),
    ).toBe("Save changes");
    expect(
      expectSome(
        hostProp(resting({ label: "Close", children: "×" }), "aria-label"),
      ),
    ).toBe("Close");
    expect(hostProp(resting({ children: 3 }), "aria-label")).toStrictEqual(
      Option.some("3"),
    );
    // The visible label is text whatever element wraps it (plan 746): an icon
    // beside a word and a typography-wrapped run both name the button, while
    // an icon alone still names nothing.
    expect(
      expectSome(
        hostProp(
          resting({
            children: [
              <Icon
                key="i"
                name="plus"
                size="sm"
                color={testTheme.colors.foreground}
              />,
              " Add",
            ],
          }),
          "aria-label",
        ),
      ),
    ).toBe("Add");
    expect(
      expectSome(
        hostProp(resting({ children: <Text>Nested</Text> }), "aria-label"),
      ),
    ).toBe("Nested");
    expect(
      expectSome(
        hostProp(
          resting({ children: [<Text key="t">Save</Text>, " changes"] }),
          "aria-label",
        ),
      ),
    ).toBe("Save changes");
    expect(
      hostProp(
        resting({
          children: (
            <Icon name="plus" size="sm" color={testTheme.colors.foreground} />
          ),
        }),
        "aria-label",
      ),
    ).toStrictEqual(Option.none());
    // A child's own accessible name is its own: an icon labelled "Add" names
    // the image, not the button around it.
    expect(
      hostProp(
        resting({
          children: (
            <Icon
              name="plus"
              size="sm"
              color={testTheme.colors.foreground}
              label="Add"
            />
          ),
        }),
        "aria-label",
      ),
    ).toStrictEqual(Option.none());
    expect(
      hostProp(resting({ children: <div /> }), "aria-label"),
    ).toStrictEqual(Option.none());
    expect(hostProp(resting({ children: "   " }), "aria-label")).toStrictEqual(
      Option.none(),
    );
  });

  it("falls back to its text when an explicit label is blank", () => {
    // A computed label (`label={record.name}`) can arrive empty; it must not
    // erase the name the button's own content already provides (plan 396).
    expect(
      expectSome(
        hostProp(
          resting({ label: "", children: "Save changes" }),
          "aria-label",
        ),
      ),
    ).toBe("Save changes");
    expect(
      expectSome(
        hostProp(
          resting({ label: "   ", children: "Save changes" }),
          "aria-label",
        ),
      ),
    ).toBe("Save changes");
  });

  it("trims an explicit label that does say something", () => {
    expect(
      expectSome(
        hostProp(resting({ label: "  Close  ", children: "×" }), "aria-label"),
      ),
    ).toBe("Close");
  });

  it("wraps a text label in one shrinkable item", () => {
    // The bug guarded (plan 368): a text run is a flex item the runtime never
    // shrinks, so a long label painted outside a bounded button. The label is
    // one clipped flex item now, and an empty button still paints no child.
    const element = resting({ children: "A label wider than the button" });
    expect(elementChildren(element)).toHaveLength(1);
    const label = expectSome(Option.fromNullishOr(elementChildren(element)[0]));
    expect(expectSome(hostTag(label))).toBe("div");
    expect(expectSome(hostStyleRecord(label))).toMatchObject({
      flexShrink: 1,
      minWidth: 0,
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
    });
  });

  it("shrinks only when a horizontal group asks it to", () => {
    // Plan 369: a group given a width shares it between its buttons, so the
    // second button is not pushed outside the group. A standalone button keeps
    // its intrinsic width, so the flag must come from the context, not the
    // button itself.
    const grouped = renderButton(
      { children: "Save" },
      testTheme,
      { focused: false },
      { shrink: true },
    );
    expect(expectSome(hostStyleRecord(grouped))).toMatchObject({
      flexShrink: 1,
      minWidth: 0,
    });
    // The recipe's `shrink-0` is the standalone rule; the group overrides it.
    expect(
      Option.getOrUndefined(hostStyleRecord(resting({ children: "Save" })))
        ?.flexShrink,
    ).toBe(0);
  });

  it("activates on Enter key down, never on key up", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    const element = resting({ onActivate, onClick });
    press(element, "enter", "down");
    press(element, "enter", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("activates on Space key up, never on key down", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    const element = resting({ onActivate, onClick });
    press(element, "space", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(onClick).toHaveBeenCalledTimes(0);
    press(element, "space", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ignores a repeating key", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    press(resting({ onActivate, onClick }), "enter", "down", true);
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(onClick).toHaveBeenCalledTimes(0);
  });

  it("reports the activating key to onClick, before onActivate", () => {
    // The bug guarded: only onActivate ran for a key, so a consumer using the
    // familiar `onClick` (as React's own button supports, and as the components
    // contract requires) had no keyboard activation at all (plan 085).
    const onActivate = vi.fn();
    const onClick = vi.fn();
    press(resting({ onActivate, onClick }), "enter", "down");
    expect(onClick).toHaveBeenCalledWith(
      expect.objectContaining({ key: "enter" }),
    );
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(
      onActivate.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("gives a pointer click the same path, and refuses it when disabled", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    expectSome(hostHandler(resting({ onActivate, onClick }), "onClick"))(
      clickEvent,
    );
    expect(onClick).toHaveBeenCalledWith(clickEvent);
    expect(onActivate).toHaveBeenCalledTimes(1);

    const disabled = {
      disabled: true as const,
      onActivate: vi.fn(),
      onClick: vi.fn(),
    };
    expectSome(hostHandler(resting(disabled), "onClick"))(clickEvent);
    expect(disabled.onClick).toHaveBeenCalledTimes(0);
    expect(disabled.onActivate).toHaveBeenCalledTimes(0);
  });

  it("is a named button the runtime can hit-test", () => {
    const element = resting({ children: "Save changes" });
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(hostProp(element, "role"))).toBe("button");
  });

  it("stays focusable while loading but refuses to activate", () => {
    const onActivate = vi.fn();
    const onClick = vi.fn();
    const loading = resting({ loading: true, onActivate, onClick });
    press(loading, "enter", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(onClick).toHaveBeenCalledTimes(0);
    expect(expectSome(hostProp(loading, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(loading, "aria-description"))).toBe("Loading");
  });

  it("makes the busy spinner decorative, because the button announces Loading", () => {
    // The bug guarded (plan 785): the spinner published its own `Status:
    // Loading` node inside a button whose description already said "Loading".
    const element = resting({
      loading: true,
      children: "Save",
      "aria-description": "A hint",
    });
    const spinner = expectSome(
      Option.fromNullishOr(elementChildren(element)[0]),
    );
    expect(elementProp(spinner, "decorative")).toStrictEqual(Option.some(true));
    expect(elementProp(spinner, "label")).toStrictEqual(Option.none());
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Loading. A hint",
    );
  });

  it("fits a square button's loading spinner inside the square", () => {
    // The bug guarded (plan 644): the three 14 px dots plus their gaps made a
    // 46 px row inside a 36 px icon button, so the spinner painted five pixels
    // outside it on each side.
    const spinnerSize = (
      props: Parameters<typeof renderButton>[0],
    ): unknown => {
      const element = resting({ loading: true, ...props });
      const spinner = expectSome(
        Option.fromNullishOr(elementChildren(element)[0]),
      );
      return Option.getOrUndefined(elementProp(spinner, "size"));
    };
    expect(spinnerSize({ square: true, size: "sm" })).toBe(9);
    expect(spinnerSize({ square: true })).toBe(10);
    expect(spinnerSize({ square: true, size: "lg" })).toBe(12);
    // The outline recipe's border is not content space.
    expect(spinnerSize({ square: true, size: "lg", variant: "outline" })).toBe(
      11,
    );
    // A text button is auto-width: its spinner keeps the text-sized step.
    expect(spinnerSize({ children: "Save" })).toBe(testTheme.iconSize.sm);
  });

  it("tints the busy spinner with the variant's foreground", () => {
    // The bug guarded (plan 754): the default spinner lit its dot with
    // `colors.primary`, which is exactly a primary button's fill, so the busy
    // indicator read as a moving hole instead of a lit dot.
    const spinnerColour = (
      variant: Parameters<typeof renderButton>[0]["variant"],
    ): unknown => {
      const element = resting({ loading: true, variant, children: "Save" });
      const spinner = expectSome(
        Option.fromNullishOr(elementChildren(element)[0]),
      );
      return Option.getOrUndefined(elementProp(spinner, "color"));
    };
    Arr.forEach(["primary", "destructive", "outline"] as const, (variant) => {
      expect(spinnerColour(variant)).toBe(
        buttonVariants[variant].foreground(testTheme),
      );
    });
  });

  it("takes a disabled button out of the tab order", () => {
    expect(hostProp(resting({ disabled: true }), "tabIndex")).toStrictEqual(
      Option.none(),
    );
  });

  it("leaves the tab order when disabled, even while loading", () => {
    // The bug guarded (plan 340): the disabled guard read
    // `disabled === true && loading !== true`, so the common
    // `disabled={saving} loading={saving}` call stayed a tab stop — against the
    // rule both docs pages state.
    expect(
      hostProp(resting({ disabled: true, loading: true }), "tabIndex"),
    ).toStrictEqual(Option.none());
    // and the busy-but-live case is untouched
    expect(expectSome(hostProp(resting({ loading: true }), "tabIndex"))).toBe(
      0,
    );
  });

  it("resolves a different chrome while it holds focus", () => {
    const idle = hostProp(resting({}), "style");
    const focused = hostProp(
      renderButton({}, testTheme, { focused: true }),
      "style",
    );
    expect(Option.isSome(idle) && Option.isSome(focused)).toBe(true);
    expect(focused).not.toStrictEqual(idle);
  });

  it("takes a corner radius, and keeps the theme default without one", () => {
    // The bug guarded: an attached ButtonGroup asks its buttons to be square
    // (plan 078); the resolver must honour that and still default to md.
    const radiusOf = (element: ReactElement): unknown =>
      Option.getOrUndefined(hostStyleRecord(element))?.["borderRadius"];
    expect(radiusOf(resting({ radius: "none" }))).toBe(0);
    expect(radiusOf(resting({}))).toBe(testTheme.radius.md);
    expect(radiusOf(resting({ radius: "lg" }))).toBe(testTheme.radius.lg);
  });

  it("forwards the passive handlers a slot injects", () => {
    // The bug guarded (plan 341): `TooltipTrigger asChild` clones mouse props
    // onto this component, and a boundary that drops them leaves the tip shut.
    const handlers = {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onMouseDown: vi.fn(),
      onMouseUp: vi.fn(),
      onMouseDownOutside: vi.fn(),
      onAuxClick: vi.fn(),
      onScroll: vi.fn(),
    };
    const names = [
      "onMouseEnter",
      "onMouseLeave",
      "onMouseMove",
      "onMouseDown",
      "onMouseUp",
      "onMouseDownOutside",
      "onAuxClick",
      "onScroll",
    ] as const;
    const element = resting(handlers);
    Arr.forEach(names, (name) =>
      expectSome(hostHandler(element, name))(clickEvent),
    );
    Arr.forEach(
      Arr.map(names, (name) => handlers[name]),
      (handler) => expect(handler).toHaveBeenCalledTimes(1),
    );
  });

  it("composes focus and blur with the slot's handlers", () => {
    const tracked = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    const element = renderButton({ onFocus, onBlur }, testTheme, tracked);
    expectSome(hostHandler(element, "onFocus"))(clickEvent);
    expectSome(hostHandler(element, "onBlur"))(clickEvent);
    expect(tracked.onFocus).toHaveBeenCalledTimes(1);
    expect(tracked.onBlur).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("runs the activation rule before the slot's key handlers", () => {
    const onActivate = vi.fn();
    const onKeyDown = vi.fn();
    const element = resting({ onActivate, onKeyDown });
    press(element, "enter", "down");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    // Escape must reach the slot (the tooltip's dismissal) without activating.
    press(element, "escape", "down");
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });

  it("forwards the slot's description, keeping the busy one", () => {
    expect(
      hostProp(resting({ "aria-description": "A hint" }), "aria-description"),
    ).toStrictEqual(Option.some("A hint"));
    expect(
      hostProp(
        resting({ "aria-description": "A hint", loading: true }),
        "aria-description",
      ),
    ).toStrictEqual(Option.some("Loading. A hint"));
    expect(
      hostProp(resting({ loading: true }), "aria-description"),
    ).toStrictEqual(Option.some("Loading"));
  });

  it("paints a clipped group's focus ring inside the button", () => {
    // The bug guarded (plan 344): an attached ButtonGroup clips at its buttons'
    // outer edge, so the outer ring shadow was cut away. A clipped button
    // anchors an inset overlay that carries the same ring, and sets no shadow
    // of its own. Since plan 370 the ring is the recipe's (3px), not the
    // token 2px `focusRing`, so inside and outside a group match.
    const focused = renderButton(
      { children: "Save" },
      testTheme,
      { focused: true },
      { clipped: true },
    );
    const chrome = expectSome(hostStyleRecord(focused));
    expect(chrome.boxShadow).toBeUndefined();
    expect(chrome.position).toBe("relative");
    const rings = Arr.filter(
      elementChildren(focused),
      (child) =>
        Option.getOrUndefined(hostStyleRecord(child))?.position === "absolute",
    );
    expect(rings).toHaveLength(1);
    const ring = expectSome(hostStyleRecord(expectSome(Arr.head(rings))));
    expect(ring.boxShadow).toBeUndefined();
    expect(ring.borderWidth).toBe(buttonRecipeRing(testTheme)?.spreadRadius);
    expect(ring.borderColor).toBe(buttonRecipeRing(testTheme)?.color);
    expect(ring.position).toBe("absolute");
  });

  it("keeps the outer ring outside a group, and paints none at rest or disabled", () => {
    // The other two directions of plan 344: a standalone button is unchanged,
    // and neither a resting button in a group nor a disabled one paints a ring
    // inside the clip (plan 332's rule reaches the overlay too).
    const plain = renderButton({}, testTheme, { focused: true });
    expect(
      Option.getOrUndefined(hostStyleRecord(plain))?.boxShadow,
    ).toStrictEqual(buttonRecipeRing(testTheme));
    expect(elementChildren(plain)).toHaveLength(0);

    expect(
      elementChildren(
        renderButton({}, testTheme, { focused: false }, { clipped: true }),
      ),
    ).toHaveLength(0);
    expect(
      elementChildren(
        renderButton(
          { disabled: true },
          testTheme,
          { focused: true },
          { clipped: true },
        ),
      ),
    ).toHaveLength(0);
  });
});

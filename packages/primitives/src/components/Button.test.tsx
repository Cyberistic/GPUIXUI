/**
 * The Button keyboard contract.
 *
 * The published `@gpuix/react` ships **no** button (plan 020 §1.5), so this is
 * behaviour the library owns — and the part most worth guarding. Each test
 * below flips a real bug: Enter firing on key *up* (double activation with the
 * platform's own click), Space on key *down* (repeating while held), a held key
 * activating, a busy button still firing, and a disabled button keeping its tab
 * stop.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  contrastFloors,
  contrastRatio,
  darkTheme,
  lightTheme,
} from "@gpuixui/tokens";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton, type ButtonState } from "./Button.js";
import type { ButtonVariant } from "../core/variants.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
  hostStyleString,
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
  it("activates on Enter key down, never on key up", () => {
    const onActivate = vi.fn();
    const element = resting({ onActivate });
    press(element, "enter", "down");
    press(element, "enter", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("activates on Space key up, never on key down", () => {
    const onActivate = vi.fn();
    const element = resting({ onActivate });
    press(element, "space", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    press(element, "space", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("ignores a repeating key", () => {
    const onActivate = vi.fn();
    press(resting({ onActivate }), "enter", "down", true);
    expect(onActivate).toHaveBeenCalledTimes(0);
  });

  it("is a named button the runtime can hit-test", () => {
    const element = resting({ children: "Save changes" });
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(hostProp(element, "role"))).toBe("button");
  });

  it("publishes its plain text child as the name", () => {
    // The bug: a div named by its text has no accessible name unless the
    // wrapper writes it, so `<Button>Save</Button>` was announced unnamed.
    expect(
      expectSome(hostProp(resting({ children: "Save" }), "aria-label")),
    ).toBe("Save");
  });

  it("prefers an explicit label and omits a blank one", () => {
    expect(
      expectSome(
        hostProp(
          resting({ label: "Save file", children: "Save" }),
          "aria-label",
        ),
      ),
    ).toBe("Save file");
    expect(
      hostProp(resting({ label: "", children: "Save" }), "aria-label"),
    ).toStrictEqual(Option.some("Save"));
    expect(
      hostProp(resting({ label: "   ", children: "Save" }), "aria-label"),
    ).toStrictEqual(Option.some("Save"));
  });

  it("draws an outlined action's edge in the measured boundary role", () => {
    // The bug: the outline variant painted `border`, the decorative role a
    // divider uses — 1.16:1 on the light page against the design system's 3:1
    // control-boundary claim. `borderStrong` is the role the boundary pairs
    // measure on every strip a control sits on.
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const element = renderButton(
        { variant: "outline", children: "Cancel" },
        theme,
        { focused: false },
      );
      const edge = expectSome(hostStyleString(element, "borderColor"));
      expect(edge).toBe(theme.colors.borderStrong);
      Arr.forEach(
        ["background", "card", "popover", "muted", "secondary"] as const,
        (surface) => {
          expect(
            contrastRatio(edge, theme.colors[surface]) ?? 0,
          ).toBeGreaterThanOrEqual(contrastFloors.boundary);
        },
      );
      // The premise: the role it replaced cannot carry a control's shape.
      expect(
        contrastRatio(theme.colors.border, theme.colors.background) ?? Infinity,
      ).toBeLessThan(contrastFloors.boundary);
    });
  });

  it("stays focusable while loading but refuses to activate", () => {
    const onActivate = vi.fn();
    const loading = resting({ loading: true, onActivate });
    press(loading, "enter", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(expectSome(hostProp(loading, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(loading, "aria-description"))).toBe("Loading");
  });

  it("gives a busy button a spinner that reads on its fill", () => {
    // The bug: a filled button rendered the default brand spinner on its own
    // brand fill (1.00:1), so the busy indicator disappeared.
    const accentOf = (variant: ButtonVariant): unknown =>
      expectSome(
        elementProp(
          elementChildren(resting({ variant, loading: true }))[0] ??
            expect.fail("the busy button drew no spinner"),
          "accent",
        ),
      );

    expect(accentOf("primary")).toBe("on-primary");
    expect(accentOf("secondary")).toBe("on-secondary");
    expect(accentOf("destructive")).toBe("on-destructive");
    expect(accentOf("outline")).toBe("primary");
    expect(accentOf("ghost")).toBe("primary");
    expect(accentOf("link")).toBe("primary");
  });

  it("takes a disabled button out of the tab order", () => {
    expect(hostProp(resting({ disabled: true }), "tabIndex")).toStrictEqual(
      Option.none(),
    );
  });

  it("declares the keyboard ring once, so focus does not repaint the chrome", () => {
    // The bug: focus merged a shadow ring, so a mouse press looked like a Tab and
    // the resting style changed when focus moved.
    const idle = expectSome(hostStyleRecord(resting({})));
    const focused = expectSome(
      hostStyleRecord(renderButton({}, testTheme, { focused: true })),
    );
    expect(focused).toStrictEqual(idle);
    expect(idle["focusVisible"]).toBeDefined();
    expect(Option.fromNullishOr(idle["boxShadow"])).toStrictEqual(
      Option.none(),
    );
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: ButtonState[] = [];
    const element = renderButton(
      {
        disabled: true,
        style: (state) => {
          seen.push(state);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      testTheme,
      { focused: true },
    );

    expect(seen).toEqual([{ disabled: true, focused: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("still merges an object style last", () => {
    const element = resting({ style: { opacity: 0.4 } });
    expect(expectSome(hostStyleRecord(element))["opacity"]).toBe(0.4);
  });
});

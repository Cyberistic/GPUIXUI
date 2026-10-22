/**
 * `Toggle` — the element tree the runtime receives.
 *
 * The bug this suite guards is the a11y contract: GPUix has no `aria-pressed`,
 * so a toggle must announce its state through `aria-valuetext` and must not
 * write the attribute the runtime ignores. The rest is the shared activation
 * contract — Enter on key down, Space on key up, a held key ignored — and the
 * pressed paint coming from the accent role rather than a literal.
 */

import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  contrastFloorsFor,
  contrastRatio,
  darkTheme,
  disabledAction,
  filledHover,
  filledPressed,
  lightTheme,
} from "@gpuixui/tokens";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderToggle, type ToggleState } from "./Toggle.js";
import type { FocusState } from "./internal.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleRecord,
  hostStyleString,
} from "./testing/element.js";

const state = (pressed: boolean) => initValueState(Option.some(pressed), false);
const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const focused: FocusState = {
  focused: true,
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

describe("Toggle", () => {
  it("is a button that announces its pressed state instead of aria-pressed", () => {
    const element = renderToggle(
      { label: "Bold" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "role"))).toBe("button");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Bold");
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("not pressed");
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(0);
    expect(hostProp(element, "aria-pressed")).toStrictEqual(Option.none());
  });

  it("forwards a tooltip trigger's pointer pair and description", () => {
    // Bug guarded: a mode in a toolbar is described by a tip, and GPUix's
    // `TooltipTrigger asChild` merges its handlers into the child element while
    // the runtime delivers a hover only to the element that registered the
    // listener — so a toggle without the pair opened on focus but never on
    // hover, and the tip's description stopped at the component.
    const entered = vi.fn();
    const left = vi.fn();
    const element = renderToggle(
      {
        label: "Bold",
        onMouseEnter: entered,
        onMouseLeave: left,
        "aria-description": "  Bolds the selection  ",
      },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(Option.getOrUndefined(hostHandler(element, "onMouseEnter"))).toBe(
      entered,
    );
    expect(Option.getOrUndefined(hostHandler(element, "onMouseLeave"))).toBe(
      left,
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Bolds the selection",
    );
  });

  it("paints a pressed toggle's feedback as an opaque, derived fill", () => {
    // The bug: the hover and press lifted the accent's alpha (`0.9` / `0.8`),
    // so the surface behind the control showed through and the label could not
    // be measured on the fill at all. A pressed toggle is a filled face; it
    // moves to the theme's derived accent fill, which the label reads on.
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const element = renderToggle(
        { pressed: true, label: "Bold" },
        theme,
        state(true),
        idle,
        vi.fn(),
      );
      expect(expectSome(hostStyle(element, "hover"))).toEqual({
        backgroundColor: filledHover(theme, "accent"),
      });
      expect(expectSome(hostStyle(element, "active"))).toEqual({
        backgroundColor: filledPressed(theme, "accent"),
      });
      Arr.forEach(
        [filledHover(theme, "accent"), filledPressed(theme, "accent")],
        (fill) => {
          // Opaque: a translucent value has no ratio at all.
          expect(contrastRatio(fill, theme.colors.background)).toBeDefined();
          expect(
            contrastRatio(theme.colors.accentForeground, fill) ?? 0,
          ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).secondary);
        },
      );
    });
  });

  it("wears the measured neutral pair while disabled and pressed", () => {
    // A disabled pressed toggle is a filled face. The 50% fade composites its
    // label into whatever is behind the control, while the neutral pair
    // `contrastPairs` measures is the paint the design system names for a
    // filled control off the page.
    const theme = lightTheme;
    const element = renderToggle(
      { pressed: true, disabled: true, label: "Bold" },
      theme,
      state(true),
      idle,
      vi.fn(),
    );
    const pair = disabledAction(theme);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      pair.backgroundColor,
    );
    expect(expectSome(hostStyleString(element, "color"))).toBe(pair.color);
    expect(hostStyle(element, "opacity")).toStrictEqual(Option.none());
    expect(expectSome(hostStyle(element, "hover"))).toEqual({
      backgroundColor: pair.backgroundColor,
    });
  });

  it("publishes its plain text child when it has no label", () => {
    const element = renderToggle(
      { children: "Bold" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Bold");
  });

  it("announces a pressed toggle", () => {
    const element = renderToggle(
      { pressed: true },
      testTheme,
      state(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("pressed");
  });

  it("paints the accent role while pressed and nothing at rest", () => {
    const pressed = renderToggle(
      { pressed: true },
      testTheme,
      state(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleString(pressed, "backgroundColor"))).toBe(
      testTheme.colors.accent,
    );
    expect(expectSome(hostStyleString(pressed, "color"))).toBe(
      testTheme.colors.accentForeground,
    );
    const rest = renderToggle({}, testTheme, state(false), idle, vi.fn());
    expect(hostStyleString(rest, "backgroundColor")).toStrictEqual(
      Option.none(),
    );
  });

  it("keeps the outline variant's measured edge while pressed", () => {
    const element = renderToggle(
      { variant: "outline", pressed: true },
      testTheme,
      state(true),
      idle,
      vi.fn(),
    );
    // A bordered control keeps its boundary role while the fill moves; the
    // decorative `border` role is for dividers, not a control's shape.
    expect(expectSome(hostStyleString(element, "borderColor"))).toBe(
      testTheme.colors.borderStrong,
    );
  });

  it("toggles on a click, on Enter down and on Space up", () => {
    const onPressedChange = vi.fn();
    const element = renderToggle(
      {},
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expectSome(hostHandler(element, "onClick"))(keyEvent("click"));
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    expect(onPressedChange).toHaveBeenCalledTimes(2);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("space"));
    expect(onPressedChange).toHaveBeenCalledTimes(2);
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    expect(onPressedChange).toHaveBeenCalledTimes(3);
  });

  it("ignores a held key", () => {
    const onPressedChange = vi.fn();
    const element = renderToggle(
      {},
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expectSome(hostHandler(element, "onKeyDown"))(
      keyEvent("enter", { isHeld: true }),
    );
    expect(onPressedChange).toHaveBeenCalledTimes(0);
  });

  it("refuses activation and leaves the tab order while disabled", () => {
    const onPressedChange = vi.fn();
    const element = renderToggle(
      { disabled: true },
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expect(hostProp(element, "tabIndex")).toStrictEqual(Option.none());
    // No press handler is installed while disabled; the keys stay observable
    // but their activation is refused.
    expect(hostHandler(element, "onClick")).toStrictEqual(Option.none());
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onPressedChange).toHaveBeenCalledTimes(0);
  });

  it("shows a spinner, announces it and refuses activation while busy", () => {
    // The bug this guards: a toolbar action awaiting a request was pressable,
    // so a second press could start the work twice, and nothing said it was
    // busy. `loading` blocks activation without taking the tab stop away, like
    // a `Button`'s.
    const onPressedChange = vi.fn();
    const element = renderToggle(
      { loading: true, label: "Sync", description: "Re-read the branch" },
      testTheme,
      state(false),
      idle,
      onPressedChange,
    );
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(element, "aria-description"))).toBe("Loading");
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onPressedChange).toHaveBeenCalledTimes(0);
    expect(
      Option.isSome(
        elementProp(
          elementChildren(element)[0] ??
            expect.fail("the busy toggle drew no spinner"),
          "accent",
        ),
      ),
    ).toBe(true);
  });

  it("gives a pressed toggle's spinner the accent's on-colour", () => {
    // A pressed toggle paints the accent role; the default brand spinner on it
    // would be the same 1.00:1-class defect the filled button had. A disabled
    // pressed toggle wears the neutral pair, so its dots move with it.
    const accentOf = (pressed: boolean, disabled = false): unknown =>
      expectSome(
        elementProp(
          elementChildren(
            renderToggle(
              { loading: true, pressed, disabled },
              testTheme,
              state(pressed),
              idle,
              vi.fn(),
            ),
          )[0] ?? expect.fail("the busy toggle drew no spinner"),
          "accent",
        ),
      );
    expect(accentOf(true)).toBe("on-accent");
    expect(accentOf(false)).toBe("primary");
    expect(accentOf(true, true)).toBe("on-disabled");
  });

  it("hands the busy spinner the caller's reduced-motion preference", () => {
    const preference = (reducedMotion: boolean): Option.Option<unknown> =>
      elementProp(
        elementChildren(
          renderToggle(
            { loading: true, reducedMotion },
            testTheme,
            state(false),
            idle,
            vi.fn(),
          ),
        )[0] ?? expect.fail("the busy toggle drew no spinner"),
        "reducedMotion",
      );
    expect(preference(true)).toStrictEqual(Option.some(true));
    expect(preference(false)).toStrictEqual(Option.some(false));
  });

  it("tells a style callback that a busy toggle is disabled", () => {
    const seen: ToggleState[] = [];
    renderToggle(
      {
        loading: true,
        style: (next) => {
          seen.push(next);
          return {};
        },
      },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(seen).toEqual([{ disabled: true, focused: false, selected: false }]);
  });

  it("declares the keyboard ring at rest, and never a focus-painted shadow", () => {
    // The bug: the ring was merged only while `focused`, so a click looked
    // exactly like a Tab. The outline is declared once and the runtime paints it
    // after keyboard input (`focusVisible`).
    const rest = renderToggle({}, testTheme, state(false), idle, vi.fn());
    const style = expectSome(hostStyleRecord(rest));
    expect(style["focusVisible"]).toBeDefined();
    expect(Option.fromNullishOr(style["boxShadow"])).toStrictEqual(
      Option.none(),
    );
    const held = renderToggle({}, testTheme, state(false), focused, vi.fn());
    expect(expectSome(hostStyleRecord(held))["focusVisible"]).toEqual(
      style["focusVisible"],
    );
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: ToggleState[] = [];
    const element = renderToggle(
      {
        disabled: true,
        style: (next) => {
          seen.push(next);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      testTheme,
      state(true),
      focused,
      vi.fn(),
    );

    expect(seen).toEqual([{ disabled: true, focused: true, selected: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });
});

describe("a toggle's address and help", () => {
  it("hands its element the caller's ref, id, layout and help", () => {
    // Bug guarded: a toolbar toggle was reachable only by `testId`, and the help
    // a visible `Label` paints was announced by nothing. A tooltip arrives
    // through the same channel, so the field-style help is the explicit one.
    const ref = vi.fn();
    const layout = vi.fn();
    const element = renderToggle(
      {
        label: "Bold",
        description: "Applies to the next word.",
        "aria-description": "A tooltip description",
        ref,
        "aria-id": "bold-toggle",
        onLayout: layout,
      },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(Option.getOrUndefined(hostProp(element, "ref"))).toBe(ref);
    expect(expectSome(hostProp(element, "aria-id"))).toBe("bold-toggle");
    expect(Option.getOrUndefined(hostHandler(element, "onLayout"))).toBe(
      layout,
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Applies to the next word.",
    );
  });

  it("still publishes a tooltip's description when no help is given", () => {
    const element = renderToggle(
      { label: "Bold", "aria-description": "Makes the text bold" },
      testTheme,
      state(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Makes the text bold",
    );
  });
});

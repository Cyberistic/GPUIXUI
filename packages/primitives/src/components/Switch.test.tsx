/**
 * `Switch` — the element tree the runtime receives.
 *
 * The bug this suite guards is the one a part split can reintroduce: the thumb
 * is a real second region, so a caller's glyph lives inside it — and GPUI
 * hit-tests to the deepest element, so a glyph without the `pointerEvents:
 * "none"` guard silently swallows the press that toggles the switch (measured
 * for the filled thumb in `runtime/controls.runtime.test.tsx`).
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Icon } from "@gpuixui/icons";
import { targetSize } from "@gpuixui/tokens";
import { switchThumbInset, switchThumbTravel } from "../core/selection.js";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderSwitch, type SwitchState } from "./Switch.js";
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

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const checked = (value: boolean): ValueState<boolean> =>
  initValueState(Option.some(value), false);
const customGlyph = <Icon name="sun" color="red" size={8} />;

/** The track a switch draws inside its press target. */
const trackOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[0] ?? expect.fail("the switch drew no track");

/** The thumb a switch draws: target → track → the part's context → the knob. */
const thumbOf = (element: ReactElement): ReactElement => {
  const provider =
    elementChildren(trackOf(element))[0] ??
    expect.fail("the switch drew no thumb");
  return (
    elementChildren(provider)[0] ?? expect.fail("the thumb part drew nothing")
  );
};

/**
 * The thumb is a `motion.div`, so its props are the component's rather than a
 * host's: read the `style` it passes down, which is what the runtime paints.
 */
const styleOf = (element: ReactElement): Record<string, unknown> =>
  expectSome(
    Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
      expectSome(elementProp(element, "style")),
    ),
  );

const numberAt = (element: ReactElement, name: string): number =>
  expectSome(
    Option.fromNullishOr(styleOf(element)[name]).pipe(
      Option.flatMap(Schema.decodeUnknownOption(Schema.Number)),
    ),
  );

/** The `left` the thumb animates to, from the motion description. */
const animatedLeft = (element: ReactElement): number =>
  expectSome(
    Schema.decodeUnknownOption(Schema.Struct({ left: Schema.Number }))(
      expectSome(elementProp(element, "animate")),
    ),
  ).left;

describe("Switch", () => {
  it("announces itself as a switch and toggles on Space key up", () => {
    const onValueChange = vi.fn();
    const element = renderSwitch(
      {},
      testTheme,
      checked(false),
      idle,
      onValueChange,
    );
    expect(expectSome(hostProp(element, "role"))).toBe("switch");
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
    expectSome(hostHandler(element, "onKeyUp"))(keyEvent("space"));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});

it("declares the keyboard ring on the track, never a shadow", () => {
  const element = renderSwitch({}, testTheme, checked(false), idle, vi.fn());
  const style = expectSome(hostStyleRecord(element));
  expect(style["focusVisible"]).toBeDefined();
  expect(Option.fromNullishOr(style["boxShadow"])).toStrictEqual(Option.none());
});

it("hands a style callback the live state and lets its result win", () => {
  const seen: SwitchState[] = [];
  const element = renderSwitch(
    {
      checked: true,
      invalid: true,
      style: (state) => {
        seen.push(state);
        return { backgroundColor: testTheme.colors.destructive };
      },
    },
    testTheme,
    checked(true),
    { ...idle, focused: true },
    vi.fn(),
  );
  expect(seen).toEqual([
    { disabled: false, focused: true, checked: true, invalid: true },
  ]);
  expect(expectSome(hostStyleString(trackOf(element), "backgroundColor"))).toBe(
    testTheme.colors.destructive,
  );
});

it("reserves the pressable floor around the track and keeps it out of the press", () => {
  // The track is one icon-height tall (16px at `md`) and was its own press
  // target — under WCAG 2.2 SC 2.5.8's 24px floor. The target grows around it,
  // the track takes `pointerEvents: "none"` so a press anywhere activates once,
  // and the ring stays on the element that holds focus.
  const element = renderSwitch({}, testTheme, checked(false), idle, vi.fn());
  expect(expectSome(hostStyleRecord(element))["minHeight"]).toBe(
    targetSize.minimum,
  );
  expect(Option.isSome(hostStyle(element, "focusVisible"))).toBe(true);
  expect(expectSome(hostStyleString(trackOf(element), "pointerEvents"))).toBe(
    "none",
  );
});

describe("SwitchThumb", () => {
  it("draws a plain knob sized from the theme scale", () => {
    const thumb = thumbOf(
      renderSwitch({}, testTheme, checked(false), idle, vi.fn()),
    );
    const side = testTheme.iconSize.md - testTheme.spacing["2xs"] * 2;
    expect(numberAt(thumb, "width")).toBe(side);
    expect(numberAt(thumb, "height")).toBe(side);
    expect(elementChildren(thumb)).toStrictEqual([]);
  });

  it("declares the slide: one left inset, animated between the two positions", () => {
    // The bug this guards: the thumb was positioned by the track's
    // `justifyContent`, which the runtime cannot animate, so the knob jumped.
    // Its position is now a `left` inset, and the motion target is that same
    // number — a target that drifted from the paint would land the knob off the
    // track's edge.
    const off = thumbOf(
      renderSwitch({}, testTheme, checked(false), idle, vi.fn()),
    );
    const on = thumbOf(
      renderSwitch({ checked: true }, testTheme, checked(true), idle, vi.fn()),
    );
    expect(numberAt(off, "left")).toBe(switchThumbInset(testTheme));
    expect(animatedLeft(off)).toBe(numberAt(off, "left"));
    expect(animatedLeft(on)).toBe(numberAt(on, "left"));
    expect(animatedLeft(on) - animatedLeft(off)).toBe(
      switchThumbTravel(
        {
          state: "checked",
          size: "md",
          accent: "primary",
        },
        testTheme,
      ),
    );
    expect(
      expectSome(
        Schema.decodeUnknownOption(Schema.Struct({ duration: Schema.Number }))(
          expectSome(elementProp(on, "transition")),
        ),
      ).duration,
    ).toBeGreaterThan(0);
  });

  it("lands the thumb instead of sliding it when motion is off", () => {
    // The bug guarded: the slide ran for every reader, because the runtime
    // exposes no reduced-motion preference and nothing passed one down. The
    // positions are still two, so the state is still visible — only the travel
    // between them is gone.
    const thumb = (reducedMotion: boolean): ReactElement =>
      thumbOf(
        renderSwitch(
          { reducedMotion },
          testTheme,
          checked(true),
          idle,
          vi.fn(),
        ),
      );
    const slide = (reducedMotion: boolean): number =>
      expectSome(
        Schema.decodeUnknownOption(Schema.Struct({ duration: Schema.Number }))(
          expectSome(elementProp(thumb(reducedMotion), "transition")),
        ),
      ).duration;
    expect(slide(false)).toBeGreaterThan(0);
    expect(slide(true)).toBe(0);
    expect(animatedLeft(thumb(true))).toBe(animatedLeft(thumb(false)));
  });

  it("draws the caller's glyph inside the knob", () => {
    const thumb = thumbOf(
      renderSwitch(
        { children: customGlyph },
        testTheme,
        checked(false),
        idle,
        vi.fn(),
      ),
    );
    const glyph = elementChildren(thumb)[0] ?? customGlyph;
    expect(expectSome(elementProp(glyph, "name"))).toBe("sun");
  });

  it("keeps a custom glyph out of the press that toggles the switch", () => {
    const thumb = thumbOf(
      renderSwitch(
        { children: customGlyph },
        testTheme,
        checked(true),
        idle,
        vi.fn(),
      ),
    );
    expect(styleOf(thumb)["pointerEvents"]).toBe("none");
  });
});

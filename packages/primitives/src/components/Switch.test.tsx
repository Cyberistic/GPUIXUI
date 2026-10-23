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
import { platformTheme, targetSize, themes } from "@gpuixui/tokens";
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

describe("a switch's address and help", () => {
  it("hands its element the caller's ref, id, layout and help", () => {
    // Bug guarded: the track was reachable only by `testId`, and a `Label`'s
    // description reached nobody — 0.11.0 has no `aria-describedby`, so the
    // control has to carry the words itself.
    const ref = vi.fn();
    const layout = vi.fn();
    const element = renderSwitch(
      {
        label: "Notifications",
        description: "Sends a digest every morning.",
        ref,
        "aria-id": "notification-switch",
        onLayout: layout,
      },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(Option.getOrUndefined(hostProp(element, "ref"))).toBe(ref);
    expect(expectSome(hostProp(element, "aria-id"))).toBe(
      "notification-switch",
    );
    expect(Option.getOrUndefined(hostHandler(element, "onLayout"))).toBe(
      layout,
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Sends a digest every morning.",
    );
  });

  it("publishes nothing rather than a blank description", () => {
    const element = renderSwitch(
      { description: "" },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(hostProp(element, "aria-description")).toStrictEqual(Option.none());
  });

  it("forwards a tooltip trigger's pointer pair and description", () => {
    // Bug guarded: a setting in a toolbar is described by a tip, and GPUix's
    // `TooltipTrigger asChild` merges its handlers into the child element while
    // the runtime delivers a hover only to the element that registered the
    // listener — so a switch without the pair opened the tip on focus but never
    // on hover, and its text stopped at the component.
    const entered = vi.fn();
    const left = vi.fn();
    const element = renderSwitch(
      {
        label: "Notifications",
        onMouseEnter: entered,
        onMouseLeave: left,
        "aria-description": "  Sends a digest every morning  ",
      },
      testTheme,
      checked(false),
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
      "Sends a digest every morning",
    );
  });

  it("keeps its own help over a tooltip's description", () => {
    // Both channels publish `aria-description`; the visible help a settings
    // writer chose is the words the reader needs, so it wins.
    const element = renderSwitch(
      {
        description: "Sends a digest every morning.",
        "aria-description": "A tooltip description",
      },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Sends a digest every morning.",
    );
  });
});

/**
 * The Apple platform's switch.
 *
 * The bug this guards: a theme whose style declares the platform's own switch
 * (Apple's green on, grey off) still drew the library's icon-derived pill, so
 * macOS shipped a 28×16 accent toggle in a theme that names a 51×31 native one.
 * The paint and the box come from the one declaration, and the knob's travel
 * stays the track width less the knob and its two insets.
 */
describe("Switch under the Apple platform", () => {
  const apple = platformTheme(themes.light, "darwin");

  it("draws the 51×31 track with a 27pt knob and no edge", () => {
    const element = renderSwitch({}, apple, checked(false), idle, vi.fn());
    const track = trackOf(element);
    const thumb = thumbOf(element);

    expect(numberAt(track, "width")).toBe(51);
    expect(numberAt(track, "height")).toBe(31);
    expect(numberAt(track, "borderWidth")).toBe(0);
    expect(expectSome(hostStyleString(track, "backgroundColor"))).toBe(
      apple.switch?.off,
    );
    expect(numberAt(thumb, "width")).toBe(27);
    expect(styleOf(thumb)["backgroundColor"]).toBe(apple.switch?.knob);
  });

  it("paints the platform's green when on, and lands the knob at the far edge", () => {
    const element = renderSwitch(
      { checked: true },
      apple,
      checked(true),
      idle,
      vi.fn(),
    );
    const thumb = thumbOf(element);

    expect(
      expectSome(hostStyleString(trackOf(element), "backgroundColor")),
    ).toBe(apple.switch?.on);
    // 51 − 27 − 2 × 2 = 22, the same two-point inset at both ends.
    expect(animatedLeft(thumb)).toBe(22);
  });
});

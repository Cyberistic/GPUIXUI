import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Icon } from "@gpuixui/icons";
import { platformTheme, targetSize, themes } from "@gpuixui/tokens";
import {
  switchThumbInset,
  switchThumbTravel,
  type SelectionAccent,
} from "../core/selection.js";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import type { ControlSize } from "../core/theme.js";
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

const trackOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[0] ?? expect.fail("the switch drew no track");

const thumbOf = (element: ReactElement): ReactElement => {
  const provider =
    elementChildren(trackOf(element))[0] ??
    expect.fail("the switch drew no thumb");
  return (
    elementChildren(provider)[0] ?? expect.fail("the thumb part drew nothing")
  );
};

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

const animatedLeft = (element: ReactElement): number =>
  expectSome(
    Schema.decodeUnknownOption(Schema.Struct({ left: Schema.Number }))(
      expectSome(elementProp(element, "animate")),
    ),
  ).left;

describe("Switch", () => {
  it("draws a size name the scale does not carry at the default size", () => {
    const stored = renderSwitch(
      { size: "xl" as ControlSize },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    const fallback = renderSwitch(
      { size: "md" },
      testTheme,
      checked(false),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleRecord(trackOf(stored)))).toEqual(
      expectSome(hostStyleRecord(trackOf(fallback))),
    );
    expect(expectSome(hostStyle(trackOf(stored), "height"))).toBe(
      testTheme.iconSize.md,
    );
  });

  it("paints an accent name the table does not carry as the brand", () => {
    const stored = renderSwitch(
      { accent: "brand" as SelectionAccent },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    const fallback = renderSwitch(
      { accent: "primary" },
      testTheme,
      checked(true),
      idle,
      vi.fn(),
    );
    expect(expectSome(hostStyleRecord(trackOf(stored)))).toEqual(
      expectSome(hostStyleRecord(trackOf(fallback))),
    );
  });

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
    const off = thumbOf(
      renderSwitch({}, testTheme, checked(false), idle, vi.fn()),
    );
    const on = thumbOf(
      renderSwitch({ checked: true }, testTheme, checked(true), idle, vi.fn()),
    );
    expect(numberAt(off, "left")).toBe(
      switchThumbInset(
        { state: "unchecked", size: "md", accent: "primary" },
        testTheme,
      ) - testTheme.borderWidth.thin,
    );
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

describe("Switch under the Apple platform", () => {
  const apple = platformTheme(themes.light, "darwin");

  it("draws the 38×22 track with a 20pt knob and no edge", () => {
    const element = renderSwitch({}, apple, checked(false), idle, vi.fn());
    const track = trackOf(element);
    const thumb = thumbOf(element);

    expect(numberAt(track, "width")).toBe(38);
    expect(numberAt(track, "height")).toBe(22);
    expect(numberAt(track, "borderWidth")).toBe(0);
    expect(expectSome(hostStyleString(track, "backgroundColor"))).toBe(
      apple.switch?.off,
    );
    expect(numberAt(thumb, "width")).toBe(20);
    expect(numberAt(thumb, "height")).toBe(20);
    expect(numberAt(thumb, "top")).toBe(1);
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

    expect(animatedLeft(thumb)).toBe(17);
  });
});

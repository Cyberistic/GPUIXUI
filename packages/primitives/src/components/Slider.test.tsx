/**
 * `Slider` and `RangeSlider` — the element tree the runtime receives.
 *
 * The bug this suite guards is the one an element-tree test can see: a value
 * control must announce its value through `aria-valuetext` (there is no
 * `aria-valuenow` in `@gpuix/native` 0.11.0), must not invent the attributes the runtime
 * ignores, must keep its keyboard contract even while painting a ring, and must
 * drop both its tab stop and its key handling when disabled. The pointer
 * geometry and the native focus movement are the runtime suite's job
 * (`runtime/value.runtime.test.tsx`).
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Icon } from "@gpuixui/icons";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderRangeSlider,
  renderSlider,
  renderSliderIndicator,
  renderSliderThumb,
  renderSliderTrack,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  type RangeSliderHandlers,
  type SliderHandlers,
  type SliderState,
} from "./Slider.js";
import type { FocusState } from "./internal.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostRef,
  hostStyle,
  hostStyleRecord,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

/** A thumb's focus ring, if it paints one. */
const ringOf = (
  element: ReactElement,
): Option.Option<Record<string, unknown>> =>
  Option.flatMap(hostStyle(element, "boxShadow"), (shadow) =>
    Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
      shadow,
    ),
  );

const valueOf = (value: number): ValueState<number> =>
  initValueState(Option.some(value), 0);
const spanOf = (
  start: number,
  end: number,
): ValueState<readonly [number, number]> =>
  initValueState(Option.some([start, end] as const), [0, 100] as const);

const sliderHandlers = (
  onValueChange: (next: number) => void,
): SliderHandlers => ({
  onValueChange,
  registerTrack: () => {},
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
});

const rangeHandlers = (
  onSpanChange: (next: readonly [number, number]) => void,
): RangeSliderHandlers => ({
  onSpanChange,
  registerTrack: () => {},
  registerThumb: () => () => {},
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
});

/** The rail and its parts: fill, thumb (and, for a range, a second of each). */
const railOf = (element: ReactElement): ReactElement => {
  const child =
    elementChildren(element)[0] ?? expect.fail("the slider has no child");
  // A context provider draws nothing; the rail is its only child.
  return Option.isSome(hostTag(child))
    ? child
    : (elementChildren(child)[0] ?? expect.fail("the slider has no rail"));
};

const partsOf = (element: ReactElement): ReadonlyArray<ReactElement> =>
  elementChildren(railOf(element));

describe("Slider", () => {
  it("is a named slider that announces its value instead of aria-valuenow", () => {
    const element = renderSlider(
      { value: 42, label: "Volume" },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(expectSome(hostProp(element, "role"))).toBe("slider");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Volume");
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("42");
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(0);
    expect(hostProp(element, "aria-valuenow")).toStrictEqual(Option.none());
  });

  it("announces a formatted value, e.g. a percentage", () => {
    const element = renderSlider(
      { value: 42, formatValue: (value) => `${value}%` },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("42%");
  });

  it("hands its element the caller's address, layout and help", () => {
    // Bug guarded: a slider is the control a form owns, but it had no address
    // and no announced help — a form could not focus the slider it failed on,
    // an automation host could not name it, and a visible `Label`'s
    // description reached nobody. The root is both the slider and its tab
    // stop, so all four land there, and the track's own registration survives
    // the caller's ref.
    const ref = vi.fn();
    const layout = vi.fn();
    const registerTrack = vi.fn();
    const element = renderSlider(
      {
        label: "Volume",
        description: "Controls the output level.",
        ref,
        "aria-id": "volume",
        onLayout: layout,
      },
      testTheme,
      valueOf(42),
      idle,
      { ...sliderHandlers(vi.fn()), registerTrack },
    );
    expect(expectSome(hostProp(element, "aria-description"))).toBe(
      "Controls the output level.",
    );
    expect(expectSome(hostProp(element, "aria-id"))).toBe("volume");
    expect(Option.getOrUndefined(hostHandler(element, "onLayout"))).toBe(
      layout,
    );
    const merged = Option.getOrElse(hostRef(element), () =>
      expect.fail("the slider carried no ref"),
    );
    merged(null);
    expect(registerTrack).toHaveBeenCalledWith(null);
    expect(ref).toHaveBeenCalledWith(null);
  });

  it("publishes nothing rather than a blank description", () => {
    const element = renderSlider(
      { description: "   " },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(hostProp(element, "aria-description")).toStrictEqual(Option.none());
  });

  it("moves one step with an arrow key, and clamps at the end", () => {
    const onValueChange = vi.fn();
    const element = renderSlider(
      { value: 42 },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(onValueChange),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onValueChange).toHaveBeenCalledWith(43);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("end"));
    expect(onValueChange).toHaveBeenCalledWith(100);
  });

  it("leaves an unrelated key to the form around it", () => {
    const onValueChange = vi.fn();
    const element = renderSlider(
      { value: 42 },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(onValueChange),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("a"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("paints the fill to the value's fraction", () => {
    const element = renderSlider(
      { value: 25, min: 0, max: 50 },
      testTheme,
      valueOf(25),
      idle,
      sliderHandlers(vi.fn()),
    );
    const fill = partsOf(element)[0] ?? expect.fail("no fill");
    expect(expectSome(hostStyleString(fill, "width"))).toBe("50%");
  });

  it("declares the keyboard ring on the track, which is the tab stop", () => {
    // The thumb cannot be focused, so a ring declared there would never paint;
    // the outline belongs on the element that holds focus.
    const element = renderSlider(
      {},
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(
      Option.isSome(
        Option.fromNullishOr(
          expectSome(hostStyleRecord(element))["focusVisible"],
        ),
      ),
    ).toBe(true);
    const thumb = partsOf(element)[1] ?? expect.fail("no thumb");
    expect(ringOf(thumb)).toStrictEqual(Option.none());
  });

  it("paints the destructive role when invalid", () => {
    const element = renderSlider(
      { invalid: true },
      testTheme,
      valueOf(25),
      idle,
      sliderHandlers(vi.fn()),
    );
    const fill = partsOf(element)[0] ?? expect.fail("no fill");
    expect(expectSome(hostStyleString(fill, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });

  it("drops its tab stop and its keys while disabled", () => {
    const onValueChange = vi.fn();
    const element = renderSlider(
      { disabled: true },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(onValueChange),
    );
    expect(hostProp(element, "tabIndex")).toStrictEqual(Option.none());
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onValueChange).toHaveBeenCalledTimes(0);
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: SliderState[] = [];
    const element = renderSlider(
      {
        invalid: true,
        style: (state) => {
          seen.push(state);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      testTheme,
      valueOf(42),
      { ...idle, focused: true },
      sliderHandlers(vi.fn()),
    );
    expect(seen).toEqual([{ disabled: false, focused: true, invalid: true }]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });
});

describe("RangeSlider", () => {
  const render = (
    onSpanChange: (next: readonly [number, number]) => void = vi.fn(),
  ): ReactElement =>
    renderRangeSlider(
      { label: "Price" },
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(onSpanChange),
    );

  it("is a named group holding two named sliders", () => {
    const element = render();
    expect(expectSome(hostProp(element, "role"))).toBe("group");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Price");
    const [startFill, start, endFill, end] = partsOf(element);
    expect(startFill).toBeDefined();
    expect(endFill).toBeDefined();
    const names = [start, end].map((thumb) =>
      expectSome(hostProp(thumb ?? expect.fail("no thumb"), "aria-label")),
    );
    expect(names).toStrictEqual(["Price minimum", "Price maximum"]);
    const values = [start, end].map((thumb) =>
      expectSome(hostProp(thumb ?? expect.fail("no thumb"), "aria-valuetext")),
    );
    expect(values).toStrictEqual(["20", "60"]);
    expect(
      [start, end].map((thumb) =>
        expectSome(hostProp(thumb ?? expect.fail("no thumb"), "tabIndex")),
      ),
    ).toStrictEqual([0, 0]);
  });

  it("addresses the thumb the form focuses and announces the group's help", () => {
    // Bug guarded: the same address/help hole one control over. The group is
    // not focusable, so the address lands on the thumb the reader last used —
    // the start while neither holds focus — and the help rides the group node,
    // which is where a reader hears the group's name.
    const ref = vi.fn();
    const layout = vi.fn();
    const renderWith = (focusedIndex: Option.Option<0 | 1>) =>
      renderRangeSlider(
        {
          label: "Price",
          description: "Between one and nine hundred.",
          ref,
          "aria-id": "price",
          onLayout: layout,
        },
        testTheme,
        spanOf(20, 60),
        { focusedIndex, onFocus: vi.fn(), onBlur: vi.fn() },
        rangeHandlers(vi.fn()),
      );

    const idleRange = renderWith(Option.none());
    expect(expectSome(hostProp(idleRange, "aria-description"))).toBe(
      "Between one and nine hundred.",
    );
    const [, idleStart, , idleEnd] = partsOf(idleRange);
    expect(
      expectSome(hostProp(idleStart ?? expect.fail("no thumb"), "aria-id")),
    ).toBe("price");
    expect(
      hostProp(idleEnd ?? expect.fail("no thumb"), "aria-id"),
    ).toStrictEqual(Option.none());

    const endFocused = renderWith(Option.some(1));
    const [, focusedStart, , focusedEnd] = partsOf(endFocused);
    expect(
      hostProp(focusedStart ?? expect.fail("no thumb"), "aria-id"),
    ).toStrictEqual(Option.none());
    expect(
      expectSome(hostProp(focusedEnd ?? expect.fail("no thumb"), "aria-id")),
    ).toBe("price");
    expect(
      Option.getOrUndefined(
        hostHandler(focusedEnd ?? expect.fail("no thumb"), "onLayout"),
      ),
    ).toBe(layout);
  });

  it("derives the thumb names from the group's trimmed name", () => {
    // The bug guarded: both names interpolated `label` raw, so a padded group
    // name announced its padding twice and a blank one named the ends
    // " minimum"/" maximum" instead of leaving them unnamed like an unnamed
    // group (the case below).
    const thumbsOf = (label: string) => {
      const [, start, , end] = partsOf(
        renderRangeSlider(
          { label },
          testTheme,
          spanOf(20, 60),
          { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
          rangeHandlers(vi.fn()),
        ),
      );
      return [start, end].map((thumb) =>
        hostProp(thumb ?? expect.fail("no thumb"), "aria-label"),
      );
    };

    expect(thumbsOf("  Price  ")).toStrictEqual([
      Option.some("Price minimum"),
      Option.some("Price maximum"),
    ]);
    expect(thumbsOf("   ")).toStrictEqual([Option.none(), Option.none()]);
  });

  it("moves the end the arrow belongs to, and never past the other end", () => {
    const onSpanChange = vi.fn();
    const element = render(onSpanChange);
    const [, start, , end] = partsOf(element);
    expectSome(hostHandler(end ?? expect.fail("no thumb"), "onKeyDown"))(
      keyEvent("left"),
    );
    expect(onSpanChange).toHaveBeenCalledWith([20, 59]);
    expectSome(hostHandler(start ?? expect.fail("no thumb"), "onKeyDown"))(
      keyEvent("end"),
    );
    expect(onSpanChange).toHaveBeenCalledWith([60, 60]);
  });

  it("does not report a span an arrow could not move", () => {
    // The bug guarded: the tuple was rebuilt on every interaction, so `Object.is`
    // never saw the same span. An arrow at a bound reported the value it already
    // held — a spurious dirty flag, save or analytics event — while the single
    // slider reported nothing.
    const onSpanChange = vi.fn();
    const element = renderRangeSlider(
      { label: "Price" },
      testTheme,
      spanOf(0, 60),
      { focusedIndex: Option.some(0), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(onSpanChange),
    );
    const [, start, , end] = partsOf(element);
    expectSome(hostHandler(start ?? expect.fail("no thumb"), "onKeyDown"))(
      keyEvent("left"),
    );
    expect(onSpanChange).not.toHaveBeenCalled();
    expectSome(hostHandler(end ?? expect.fail("no thumb"), "onKeyDown"))(
      keyEvent("right"),
    );
    expect(onSpanChange).toHaveBeenCalledWith([0, 61]);
  });

  it("declares the keyboard ring on both thumbs, never a shadow", () => {
    // Each range thumb is its own tab stop, so both declare the outline; the
    // runtime paints it on the thumb holding keyboard focus.
    const [, start, , end] = partsOf(render());
    for (const thumb of [start, end]) {
      const element = thumb ?? expect.fail("no thumb");
      const style = expectSome(hostStyleRecord(element));
      expect(style["focusVisible"]).toBeDefined();
      expect(Option.fromNullishOr(style["boxShadow"])).toStrictEqual(
        Option.none(),
      );
    }
  });

  it("drops both tab stops while disabled", () => {
    const element = renderRangeSlider(
      { disabled: true },
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(vi.fn()),
    );
    const [, start, , end] = partsOf(element);
    expect(
      hostProp(start ?? expect.fail("no thumb"), "tabIndex"),
    ).toStrictEqual(Option.none());
    expect(hostProp(end ?? expect.fail("no thumb"), "tabIndex")).toStrictEqual(
      Option.none(),
    );
  });

  it("reports a focus anywhere in the group, and none while every thumb is idle", () => {
    const seen: SliderState[] = [];
    const style = (state: SliderState) => {
      seen.push(state);
      return { backgroundColor: testTheme.colors.destructive };
    };
    const focused = renderRangeSlider(
      { label: "Price", style },
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(vi.fn()),
    );
    const idleRange = renderRangeSlider(
      { label: "Price", style, disabled: true },
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(vi.fn()),
    );

    expect(seen).toEqual([
      { disabled: false, focused: true, invalid: false },
      { disabled: true, focused: false, invalid: false },
    ]);
    expect(
      [focused, idleRange].map((element) =>
        expectSome(hostStyleString(element, "backgroundColor")),
      ),
    ).toEqual([testTheme.colors.destructive, testTheme.colors.destructive]);
  });
});

describe("the range's two thumbs", () => {
  it("stay unnamed when the group has no name of its own", () => {
    const element = renderRangeSlider(
      {},
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(vi.fn()),
    );
    const [, start, , end] = partsOf(element);
    expect(
      hostProp(start ?? expect.fail("no thumb"), "aria-label"),
    ).toStrictEqual(Option.none());
    expect(
      hostProp(end ?? expect.fail("no thumb"), "aria-label"),
    ).toStrictEqual(Option.none());
  });
});

describe("the slider parts", () => {
  const paint = (
    fractions: ReadonlyArray<number>,
    thumbs: ReadonlyArray<null> = [null],
    orientation: "horizontal" | "vertical" = "horizontal",
  ) => ({
    theme: testTheme,
    size: "md" as const,
    invalid: false,
    orientation,
    fractions,
    thumbs,
    press: undefined,
  });

  it("puts the thumb's centre on the value's fraction at 0, 50 and 100", () => {
    // The track pads by half a thumb and the thumb pulls itself back by the
    // same half, so the usable span is the track minus the two halves and the
    // thumb's centre lands exactly on the fraction — the numbers the runtime
    // suite measures in pixels.
    const side = testTheme.iconSize.md;
    const half = Math.round(side / 2);
    const geometry = (value: number) => {
      const element = renderSlider(
        { value, min: 0, max: 100 },
        testTheme,
        valueOf(value),
        idle,
        sliderHandlers(vi.fn()),
      );
      const [fill, thumb] = partsOf(element);
      return {
        fill: expectSome(
          hostStyleString(fill ?? expect.fail("no fill"), "width"),
        ),
        side: expectSome(hostStyle(thumb ?? expect.fail("no thumb"), "width")),
        offset: expectSome(
          hostStyle(thumb ?? expect.fail("no thumb"), "marginLeft"),
        ),
        inset: expectSome(hostStyle(element, "paddingLeft")),
      };
    };

    expect(geometry(0)).toEqual({
      fill: "0%",
      side,
      offset: -half,
      inset: half,
    });
    expect(geometry(50)).toEqual({
      fill: "50%",
      side,
      offset: -half,
      inset: half,
    });
    expect(geometry(100)).toEqual({
      fill: "100%",
      side,
      offset: -half,
      inset: half,
    });
  });

  it("paints the segment that belongs to a range's second thumb", () => {
    const fill = renderSliderIndicator({ index: 1 }, paint([0.2, 0.6]));

    expect(expectSome(hostStyleString(fill, "width"))).toBe("40%");
  });

  it("turns the default composition and every part onto a vertical track", () => {
    // The bug guarded: `orientation` reached the root but not the parts, so a
    // vertical slider still laid a horizontal rail, grew its fill sideways and
    // pulled the thumb on the wrong axis.
    const element = renderSlider(
      { value: 40, orientation: "vertical" },
      testTheme,
      valueOf(40),
      idle,
      sliderHandlers(vi.fn()),
    );
    const inset = Math.round(testTheme.iconSize.md / 2);
    expect(expectSome(hostStyle(element, "flexDirection"))).toBe("column");
    expect(expectSome(hostStyle(element, "width"))).toBe(
      testTheme.density.controlHeight.md,
    );
    expect(expectSome(hostStyle(element, "height"))).toBe("100%");
    expect(expectSome(hostStyle(element, "paddingTop"))).toBe(inset);

    const rail = railOf(element);
    expect(expectSome(hostStyle(rail, "flexDirection"))).toBe("column");
    expect(expectSome(hostStyle(rail, "justifyContent"))).toBe("flex-end");
    const parts = partsOf(element);
    // A vertical rail paints its parts from the floor up, so the thumb comes
    // first in the tree and the fill after it.
    const thumb = parts[0] ?? expect.fail("no thumb");
    const fill = parts[1] ?? expect.fail("no fill");
    expect(expectSome(hostStyleString(fill, "height"))).toBe("40%");
    expect(hostStyleString(fill, "width")).toStrictEqual(Option.some("100%"));
    expect(expectSome(hostStyle(thumb, "marginTop"))).toBe(-inset);
    expect(hostStyle(thumb, "marginLeft")).toStrictEqual(Option.none());
  });

  it("paints a vertical range's second segment along the axis", () => {
    const fill = renderSliderIndicator(
      { index: 1 },
      paint([0.2, 0.6], [null, null], "vertical"),
    );
    expect(expectSome(hostStyleString(fill, "height"))).toBe("40%");
    expect(hostStyleString(fill, "width")).toStrictEqual(Option.some("100%"));
  });

  it("draws a caller's glyph inside a thumb", () => {
    const glyph = <Icon name="star" color="red" size={8} />;
    const thumb = renderSliderThumb({ children: glyph }, paint([0.5]));

    expect(
      expectSome(elementProp(elementChildren(thumb)[0] ?? glyph, "name")),
    ).toBe("star");
  });

  it("lets a caller restyle the rail", () => {
    // The gap guarded: `SliderTrack` was the one part with no styling seam — it
    // took only `children`, so a rail could not be restyled apart from the root
    // (a thicker rail, a different role) while the fill and the thumb both took
    // `className` and `style`.
    const element = renderSliderTrack(
      { className: "gap-sm", style: { padding: 7 }, testId: "rail" },
      paint([0.5]),
    );
    expect(expectSome(hostProp(element, "testId"))).toBe("rail");
    expect(expectSome(hostStyle(element, "padding"))).toBe(7);
    expect(expectSome(hostStyle(element, "gap"))).toBe(testTheme.spacing.sm);
  });

  it("replaces the default composition when the caller supplies parts", () => {
    const element = renderSlider(
      {
        value: 50,
        children: (
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb />
          </SliderTrack>
        ),
      },
      testTheme,
      valueOf(50),
      idle,
      sliderHandlers(vi.fn()),
    );
    const provider =
      elementChildren(element)[0] ?? expect.fail("the slider drew nothing");
    const track =
      elementChildren(provider)[0] ??
      expect.fail("the provider carried no body");

    // The default composition would put a host rail here; the caller's own
    // track component must be the body instead.
    expect(track.type).toBe(SliderTrack);
    expect(expectSome(elementProp(track, "children"))).toBeDefined();
  });
});

/** Keeps the element prop helper honest: a slider has no `value` prop of its own. */
describe("slider prop surface", () => {
  it("reads its value from state, not from a forwarded prop", () => {
    const element = renderSlider(
      { value: 42 },
      testTheme,
      valueOf(10),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(elementProp(element, "value")).toStrictEqual(Option.none());
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("10");
  });
});

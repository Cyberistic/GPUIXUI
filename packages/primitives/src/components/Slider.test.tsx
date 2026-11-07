import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { Icon } from "@gpuixui/icons";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import type { ControlSize } from "../core/theme.js";
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
  type SliderProps,
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
  hostPropString,
  hostRef,
  hostStyle,
  hostStyleRecord,
  hostStyleString,
  hostTag,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

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

const railOf = (element: ReactElement): ReactElement => {
  const child =
    elementChildren(element)[0] ?? expect.fail("the slider has no child");

  return Option.isSome(hostTag(child))
    ? child
    : (elementChildren(child)[0] ?? expect.fail("the slider has no rail"));
};

const partsOf = (element: ReactElement): ReadonlyArray<ReactElement> =>
  elementChildren(railOf(element));

describe("Slider", () => {
  it("draws a size name the scale does not carry at the default size", () => {
    const stored = renderSlider(
      { size: "xl" as ControlSize, value: 40 },
      testTheme,
      valueOf(40),
      idle,
      sliderHandlers(vi.fn()),
    );
    const fallback = renderSlider(
      { size: "md", value: 40 },
      testTheme,
      valueOf(40),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(expectSome(hostStyleRecord(stored))).toEqual(
      expectSome(hostStyleRecord(fallback)),
    );
    expect(expectSome(hostStyle(stored, "height"))).toBe(
      testTheme.density.controlHeight.md,
    );
  });

  it("reads a saved bound it cannot read as the documented range", () => {
    const stored = renderSlider(
      { value: 40, max: "255" } as unknown as SliderProps,
      testTheme,
      valueOf(40),
      idle,
      sliderHandlers(vi.fn()),
    );
    const fallback = renderSlider(
      { value: 40 },
      testTheme,
      valueOf(40),
      idle,
      sliderHandlers(vi.fn()),
    );
    const fill = partsOf(stored)[0] ?? expect.fail("no fill");
    const documented = partsOf(fallback)[0] ?? expect.fail("no fill");
    expect(expectSome(hostStyle(fill, "width"))).toBe(
      expectSome(hostStyle(documented, "width")),
    );
    expect(expectSome(hostStyle(fill, "width"))).toBe("40%");

    expect(
      expectSome(
        hostProp(
          renderSlider(
            { value: 41.4, step: "5" } as unknown as SliderProps,
            testTheme,
            valueOf(41.4),
            idle,
            sliderHandlers(vi.fn()),
          ),
          "aria-valuetext",
        ),
      ),
    ).toBe("41");
  });

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

  it("keeps its own words for a formatter that says nothing", () => {
    const announce = (formatValue?: (value: number) => string): string =>
      expectSome(
        hostPropString(
          renderSlider(
            { value: 42, formatValue },
            testTheme,
            valueOf(42),
            idle,
            sliderHandlers(vi.fn()),
          ),
          "aria-valuetext",
        ),
      );
    expect(announce(() => "")).toBe("42");
    expect(announce(() => "   ")).toBe("42");
    expect(announce((value) => ` ${value}% `)).toBe("42%");
  });

  it("hands its element the caller's address, layout and help", () => {
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

  it("keeps each end's own words for a formatter that says nothing", () => {
    const announce = (
      formatValue?: (value: number) => string,
    ): ReadonlyArray<string> => {
      const [, start, , end] = partsOf(
        renderRangeSlider(
          { label: "Price", formatValue },
          testTheme,
          spanOf(20, 60),
          { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
          rangeHandlers(vi.fn()),
        ),
      );
      return [start, end].map((thumb) =>
        expectSome(
          hostPropString(thumb ?? expect.fail("no thumb"), "aria-valuetext"),
        ),
      );
    };
    expect(announce(() => "")).toStrictEqual(["20", "60"]);
    expect(announce((value) => `$${value}`)).toStrictEqual(["$20", "$60"]);
  });

  it("addresses the thumb the form focuses and announces the group's help", () => {
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

    expect(track.type).toBe(SliderTrack);
    expect(expectSome(elementProp(track, "children"))).toBeDefined();
  });
});

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

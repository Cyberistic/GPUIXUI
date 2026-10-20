/**
 * `Slider` and `RangeSlider` — the element tree the runtime receives.
 *
 * The bug this suite guards is the one an element-tree test can see: a value
 * control must announce its value through `aria-valuetext` (there is no
 * `aria-valuenow` in GPUix 0.10.0), must not invent the attributes the runtime
 * ignores, must keep its keyboard contract even while painting a ring, and must
 * drop both its tab stop and its key handling when disabled. Plan `802` adds the
 * other side of that gate: **read-only keeps the tab stop and refuses the keys**
 * — a value a reviewer can reach, announce and never change. The pointer
 * geometry and the native focus movement are the runtime suite's job
 * (`runtime/value.runtime.test.tsx`, `runtime/slider-read-only.runtime.test.tsx`).
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderRangeSlider,
  renderSlider,
  type RangeSliderHandlers,
  type SliderHandlers,
} from "./Slider.js";
import type { FocusState } from "./internal.js";
import { clickEvent, keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyle,
  hostStyleString,
} from "./testing/element.js";

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const focused: FocusState = {
  focused: true,
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};

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
  onCommit: () => {},
  registerTrack: () => {},
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
});

const rangeHandlers = (
  onSpanChange: (next: readonly [number, number]) => void,
): RangeSliderHandlers => ({
  onSpanChange,
  onSpanCommit: () => {},
  registerTrack: () => {},
  registerThumb: () => () => {},
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
});

/** The rail and its parts: fill, thumb (and, for a range, a second of each). */
const railOf = (element: ReactElement): ReactElement =>
  elementChildren(element)[0] ?? expect.fail("the slider has no rail");

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
    // Plan 026: a blank label is absent, a padded one is trimmed.
    expect(
      hostProp(
        renderSlider(
          { value: 42, label: "   " },
          testTheme,
          valueOf(42),
          idle,
          sliderHandlers(vi.fn()),
        ),
        "aria-label",
      ),
    ).toStrictEqual(Option.none());
    expect(
      expectSome(
        hostProp(
          renderSlider(
            { value: 42, label: "  Volume  " },
            testTheme,
            valueOf(42),
            idle,
            sliderHandlers(vi.fn()),
          ),
          "aria-label",
        ),
      ),
    ).toBe("Volume");
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

  it("falls back to each value when the formatter says nothing", () => {
    // The bug guarded (plan 580): a formatter that trims to nothing erased the
    // announced value — a slider whose computed unit label was missing became
    // silent — although the documented default is `String(value)`.
    const slider = renderSlider(
      { value: 42, formatValue: () => "   " },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(expectSome(hostProp(slider, "aria-valuetext"))).toBe("42");
    const range = renderRangeSlider(
      { formatValue: () => "" },
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(vi.fn()),
    );
    const [, start, , end] = partsOf(range);
    expect(
      expectSome(hostProp(start ?? expect.fail("no thumb"), "aria-valuetext")),
    ).toBe("20");
    expect(
      expectSome(hostProp(end ?? expect.fail("no thumb"), "aria-valuetext")),
    ).toBe("60");
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

  it("rings the thumb only while the slider holds focus", () => {
    const render = (state: FocusState): ReactElement =>
      renderSlider({}, testTheme, valueOf(42), state, sliderHandlers(vi.fn()));
    const thumb = (element: ReactElement): ReactElement =>
      partsOf(element)[1] ?? expect.fail("no thumb");
    expect(ringOf(thumb(render(idle)))).toStrictEqual(Option.none());
    expect(
      Option.map(ringOf(thumb(render(focused))), (ring) => ring["color"]),
    ).toStrictEqual(Option.some(testTheme.colors.ring));
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

  it("keeps its tab stop and refuses its keys while read-only", () => {
    // The bug guarded (plan 802): the slider family had only `disabled`, which
    // both faded the value and removed it from the tab order. A read-only
    // slider is reachable, announced and unchanged.
    const onValueChange = vi.fn();
    const onCommit = vi.fn();
    const element = renderSlider(
      { readOnly: true },
      testTheme,
      valueOf(42),
      idle,
      { ...sliderHandlers(onValueChange), onCommit },
    );
    expect(expectSome(hostProp(element, "tabIndex"))).toBe(0);
    Arr.forEach(["right", "end", "pageup", "home"], (key) =>
      expectSome(hostHandler(element, "onKeyDown"))(keyEvent(key)),
    );
    expect(onValueChange).toHaveBeenCalledTimes(0);
    expect(onCommit).toHaveBeenCalledTimes(0);
    expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("42");
    // `disabled` is the stronger state: both supplied leaves no tab stop.
    const both = renderSlider(
      { disabled: true, readOnly: true },
      testTheme,
      valueOf(42),
      idle,
      sliderHandlers(vi.fn()),
    );
    expect(hostProp(both, "tabIndex")).toStrictEqual(Option.none());
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

  it("leaves the group and its thumbs unnamed when the label is blank", () => {
    // Plan 026: the old composition produced `"   minimum"` from a blank
    // label; a blank name is absent, not whitespace with a suffix.
    const element = renderRangeSlider(
      { label: "   " },
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(vi.fn()),
    );
    expect(hostProp(element, "aria-label")).toStrictEqual(Option.none());
    const [, start, , end] = partsOf(element);
    expect(
      hostProp(start ?? expect.fail("no thumb"), "aria-label"),
    ).toStrictEqual(Option.none());
    expect(
      hostProp(end ?? expect.fail("no thumb"), "aria-label"),
    ).toStrictEqual(Option.none());
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

  it("does not report a key that cannot move its end", () => {
    // Plan 373: `End` at the maximum rebuilt the pair, so the shared
    // `Object.is` rule saw a change and woke the parent for a key that moved
    // nothing. The view now routes through `spanAfterMove`, whose no-op result
    // is the current pair itself.
    const onSpanChange = vi.fn();
    const state = spanOf(20, 100);
    const element = renderRangeSlider(
      { label: "Price" },
      testTheme,
      state,
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      rangeHandlers(onSpanChange),
    );
    const end = partsOf(element)[3] ?? expect.fail("no end thumb");
    expectSome(hostHandler(end, "onKeyDown"))(keyEvent("end"));
    expect(onSpanChange).toHaveBeenCalledTimes(1);
    expect(onSpanChange.mock.calls[0]?.[0]).toBe(state.current);
    expectSome(hostHandler(end, "onKeyDown"))(keyEvent("left"));
    expect(onSpanChange).toHaveBeenLastCalledWith([20, 99]);
  });

  it("rings the focused thumb only", () => {
    const [, start, , end] = partsOf(render());
    expect(ringOf(start ?? expect.fail("no thumb"))).toStrictEqual(
      Option.none(),
    );
    expect(Option.isSome(ringOf(end ?? expect.fail("no thumb")))).toBe(true);
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

  it("keeps both tab stops and refuses the keys while read-only", () => {
    // Plan 802: both ends stay reachable and announced, and neither moves.
    const onSpanChange = vi.fn();
    const onSpanCommit = vi.fn();
    const element = renderRangeSlider(
      { readOnly: true },
      testTheme,
      spanOf(20, 60),
      { focusedIndex: Option.some(1), onFocus: vi.fn(), onBlur: vi.fn() },
      { ...rangeHandlers(onSpanChange), onSpanCommit },
    );
    const [, start, , end] = partsOf(element);
    expect(
      [start, end].map((thumb) =>
        expectSome(hostProp(thumb ?? expect.fail("no thumb"), "tabIndex")),
      ),
    ).toStrictEqual([0, 0]);
    expectSome(hostHandler(end ?? expect.fail("no thumb"), "onKeyDown"))(
      keyEvent("left"),
    );
    expectSome(hostHandler(start ?? expect.fail("no thumb"), "onKeyDown"))(
      keyEvent("end"),
    );
    expect(onSpanChange).toHaveBeenCalledTimes(0);
    expect(onSpanCommit).toHaveBeenCalledTimes(0);
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

describe("slider as a slot trigger", () => {
  it("forwards a slot's handlers and description, and keeps its drag", () => {
    // Plan 345: the tooltip's cloned props stopped at the component boundary.
    // The drag handlers are the slider's own, so the slot's must be composed,
    // not spread over them — a `passiveTriggerHandlers` spread would erase the
    // gesture.
    const onMouseEnter = vi.fn();
    const onMouseDown = vi.fn();
    const onKeyDown = vi.fn();
    const onValueChange = vi.fn();
    const onPointerDown = vi.fn();
    const element = renderSlider(
      { onMouseEnter, onMouseDown, onKeyDown, "aria-description": "A hint" },
      testTheme,
      valueOf(50),
      idle,
      { ...sliderHandlers(onValueChange), onPointerDown },
    );
    expectSome(hostHandler(element, "onMouseEnter"))(clickEvent);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expectSome(hostHandler(element, "onMouseDown"))(clickEvent);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onValueChange).toHaveBeenCalledWith(51);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(expectSome(hostProp(element, "aria-description"))).toBe("A hint");
  });
});

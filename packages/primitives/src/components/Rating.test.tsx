/**
 * `Rating` — the element tree the runtime receives.
 *
 * The guarded defects: an arrow that wraps instead of clamping, a group with one
 * tab stop per star instead of one for the whole rating, an unrated group with
 * no tab stop at all, and a selected star painting the same icon as an empty one.
 * The native focus movement is the runtime suite's job.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { targetSize } from "@gpuixui/tokens";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  noPreview,
  renderRating,
  type RatingHandlers,
  type RatingProps,
  type RatingState,
} from "./Rating.js";
import type { RatingFocus } from "./Rating.js";
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

const state = (value: number) => initValueState(Option.some(value), 0);

const focus = (index?: number): RatingFocus => ({
  focusedIndex: Option.fromNullishOr(index),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
});

const handlers = (over: Partial<RatingHandlers> = {}): RatingHandlers => ({
  onSelect: vi.fn(),
  onMove: vi.fn(),
  registerItem: () => () => {},
  ...over,
});

const render = (
  props: RatingProps,
  value: number,
  focused?: number,
  over: Partial<RatingHandlers> = {},
): ReactElement =>
  renderRating(
    props,
    testTheme,
    state(value),
    focus(focused),
    noPreview,
    handlers(over),
  );

const starsOf = (element: ReactElement): ReadonlyArray<ReactElement> =>
  elementChildren(element);

const labelOf = (star: ReactElement): unknown =>
  expectSome(hostProp(star, "aria-label"));

describe("Rating", () => {
  it("is a named group of stars, each announced as N of max", () => {
    const element = render({ label: "Quality" }, 0);
    expect(expectSome(hostProp(element, "role"))).toBe("radiogroup");
    expect(expectSome(hostProp(element, "aria-label"))).toBe("Quality");
    expect(starsOf(element).map(labelOf)).toStrictEqual([
      "1 of 5",
      "2 of 5",
      "3 of 5",
      "4 of 5",
      "5 of 5",
    ]);
  });

  it("marks the stars up to the value as checked", () => {
    const element = render({}, 3);
    const values = starsOf(element).map((star) =>
      expectSome(hostProp(star, "aria-valuetext")),
    );
    expect(values).toStrictEqual([
      "checked",
      "checked",
      "checked",
      "unchecked",
      "unchecked",
    ]);
  });

  it("holds one tab stop, on the rating or on the first star when unrated", () => {
    const tabStopCount = (value: number): number =>
      starsOf(render({}, value)).filter(
        (star) => Option.getOrUndefined(hostProp(star, "tabIndex")) === 0,
      ).length;
    expect(tabStopCount(3)).toBe(1);
    expect(
      Option.getOrUndefined(
        hostProp(
          starsOf(render({}, 3))[2] ?? expect.fail("no star"),
          "tabIndex",
        ),
      ),
    ).toBe(0);
    expect(
      Option.getOrUndefined(
        hostProp(
          starsOf(render({}, 0))[0] ?? expect.fail("no star"),
          "tabIndex",
        ),
      ),
    ).toBe(0);
  });

  it("paints the destructive role when validation failed", () => {
    const stars = starsOf(render({ invalid: true }, 2));
    const iconColor = (star: ReactElement): unknown =>
      expectSome(
        elementProp(
          elementChildren(star)[0] ?? expect.fail("no icon"),
          "color",
        ),
      );
    expect(iconColor(stars[0] ?? expect.fail("no star"))).toBe(
      testTheme.colors.destructive,
    );
    expect(iconColor(stars[4] ?? expect.fail("no star"))).toBe(
      testTheme.colors.mutedForeground,
    );
  });

  it("paints a filled icon for the selected stars and an outline for the rest", () => {
    const stars = starsOf(render({}, 2));
    const iconName = (star: ReactElement): unknown =>
      Option.getOrUndefined(
        elementProp(elementChildren(star)[0] ?? expect.fail("no icon"), "name"),
      );
    expect(iconName(stars[0] ?? expect.fail("no star"))).toBe("star-filled");
    expect(iconName(stars[1] ?? expect.fail("no star"))).toBe("star-filled");
    expect(iconName(stars[2] ?? expect.fail("no star"))).toBe("star");
  });

  it("previews the star under the pointer in the paint only", () => {
    // The bug guarded: a rating had no hover preview, so a pointer gave no hint
    // which score a press would choose. The preview must not become the answer:
    // the announced state and the tab stop keep reading the value.
    const onHover = vi.fn();
    const onHoverEnd = vi.fn();
    const element = renderRating(
      {},
      testTheme,
      state(2),
      focus(),
      { hoveredIndex: Option.some(4), onHover, onHoverEnd },
      handlers(),
    );
    const stars = starsOf(element);
    const iconName = (star: ReactElement): unknown =>
      Option.getOrUndefined(
        elementProp(elementChildren(star)[0] ?? expect.fail("no icon"), "name"),
      );

    expect(stars.map(iconName)).toStrictEqual([
      "star-filled",
      "star-filled",
      "star-filled",
      "star-filled",
      "star",
    ]);
    expect(
      stars.map((star) => expectSome(hostProp(star, "aria-valuetext"))),
    ).toStrictEqual([
      "checked",
      "checked",
      "unchecked",
      "unchecked",
      "unchecked",
    ]);
    expect(
      stars.map((star) => Option.getOrUndefined(hostProp(star, "tabIndex"))),
    ).toStrictEqual([-1, 0, -1, -1, -1]);

    // The star under the pointer reports it; leaving the group clears it.
    expectSome(hostHandler(stars[3] ?? expect.fail("no star"), "onMouseEnter"))(
      keyEvent("click"),
    );
    expect(onHover).toHaveBeenCalledWith(4);
    expectSome(hostHandler(element, "onMouseLeave"))(keyEvent("click"));
    expect(onHoverEnd).toHaveBeenCalledOnce();
  });

  it("ignores the pointer while disabled or read-only", () => {
    Arr.forEach([{ disabled: true }, { readOnly: true }] as const, (props) => {
      const element = renderRating(
        props,
        testTheme,
        state(2),
        focus(),
        { hoveredIndex: Option.some(5), onHover: vi.fn(), onHoverEnd: vi.fn() },
        handlers(),
      );
      const stars = starsOf(element);
      const iconName = (star: ReactElement): unknown =>
        Option.getOrUndefined(
          elementProp(
            elementChildren(star)[0] ?? expect.fail("no icon"),
            "name",
          ),
        );

      expect(stars.map(iconName)).toStrictEqual([
        "star-filled",
        "star-filled",
        "star",
        "star",
        "star",
      ]);
      expect(
        hostProp(stars[0] ?? expect.fail("no star"), "onMouseEnter"),
      ).toStrictEqual(Option.none());
      expect(hostProp(element, "onMouseLeave")).toStrictEqual(Option.none());
    });
  });

  it("moves with the arrows, clamps at the ends and clears with Delete", () => {
    const onMove = vi.fn();
    const element = render({}, 3, undefined, { onMove });
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onMove).toHaveBeenLastCalledWith(4);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("end"));
    expect(onMove).toHaveBeenLastCalledWith(5);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("delete"));
    expect(onMove).toHaveBeenLastCalledWith(0);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("a"));
    expect(onMove).toHaveBeenCalledTimes(3);
  });

  it("keeps one star when an arrow is nudged at the rated end", () => {
    // The bug guarded: ArrowLeft at one star reported 0, so the group cleared a
    // rating the docs say only Delete clears — one keystroke of data loss while
    // the reader was trying to stay put.
    const onMove = vi.fn();
    const rated = render({}, 1, undefined, { onMove });
    expectSome(hostHandler(rated, "onKeyDown"))(keyEvent("left"));
    expect(onMove).toHaveBeenLastCalledWith(1);
    // An unrated group stays unrated on the same key, and zero is still the
    // clear key's report.
    const unrated = render({}, 0, undefined, { onMove });
    expectSome(hostHandler(unrated, "onKeyDown"))(keyEvent("left"));
    expect(onMove).toHaveBeenLastCalledWith(0);
    expectSome(hostHandler(rated, "onKeyDown"))(keyEvent("backspace"));
    expect(onMove).toHaveBeenLastCalledWith(0);
  });

  it("selects a star when it is clicked", () => {
    const onSelect = vi.fn();
    const stars = starsOf(render({}, 0, undefined, { onSelect }));
    expectSome(hostHandler(stars[2] ?? expect.fail("no star"), "onClick"))(
      keyEvent("click"),
    );
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("drops every tab stop and installs no press when disabled or read-only", () => {
    Arr.forEach([{ disabled: true }, { readOnly: true }] as const, (props) => {
      const element = render(props, 3);
      const star = starsOf(element)[0] ?? expect.fail("no star");
      expect(hostProp(star, "tabIndex")).toStrictEqual(Option.none());
      const onSelect = vi.fn();
      const clicked = render(props, 3, undefined, { onSelect });
      const target = starsOf(clicked)[1] ?? expect.fail("no star");
      // A control that refuses input installs no press handler at all, so a
      // caller's `onClick` is not installed either (the `composePress` rule).
      expect(hostHandler(target, "onClick")).toStrictEqual(Option.none());
    });
  });

  it("declares the keyboard ring on every interactive star, never a shadow", () => {
    // Every star is a tab stop candidate, so every star declares the outline;
    // the runtime paints it on the one that holds keyboard focus.
    const element = render({}, 3, 2);
    const ringed = starsOf(element).map((star) => {
      const style = expectSome(hostStyleRecord(star));
      return [
        style["focusVisible"] !== undefined,
        style["boxShadow"] !== undefined,
      ];
    });
    expect(ringed).toStrictEqual(Arr.map(Arr.range(0, 4), () => [true, false]));
  });

  it("reserves the pressable-target floor around every star", () => {
    // The bug: the glyph plus a 2px hairline was the whole press target (20px at
    // `md`, 18px at `sm`), under WCAG 2.2 SC 2.5.8's 24px floor.
    Arr.forEach(starsOf(render({}, 3)), (star) => {
      expect(expectSome(hostStyle(star, "minWidth"))).toBe(targetSize.minimum);
      expect(expectSome(hostStyle(star, "minHeight"))).toBe(targetSize.minimum);
    });
  });

  it("hands a style callback the live state and lets its result win", () => {
    const seen: RatingState[] = [];
    const element = render(
      {
        invalid: true,
        style: (live) => {
          seen.push(live);
          return { backgroundColor: testTheme.colors.destructive };
        },
      },
      2,
      2,
    );

    expect(seen).toEqual([
      { disabled: false, readOnly: false, focused: true, invalid: true },
    ]);
    expect(expectSome(hostStyleString(element, "backgroundColor"))).toBe(
      testTheme.colors.destructive,
    );
  });
});

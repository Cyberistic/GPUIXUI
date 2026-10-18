/**
 * `Rating` — the element tree the runtime receives.
 *
 * The guarded defects: an arrow that wraps instead of clamping, a group with one
 * tab stop per star instead of one for the whole rating, an unrated group with
 * no tab stop at all, a selected star painting the same icon as an empty one,
 * and a pointer that previews nothing while a preview is an input affordance.
 * The native focus movement and the pointer itself are the runtime suite's job.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderRating,
  type RatingHandlers,
  type RatingHover,
  type RatingProps,
} from "./Rating.js";
import type { RatingFocus } from "./Rating.js";
import { keyEvent } from "./testing/event.js";
import {
  elementChildren,
  elementProp,
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
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

const hover = (preview?: number): RatingHover => ({
  preview: Option.fromNullishOr(preview),
  onEnter: vi.fn(),
  onLeave: vi.fn(),
});

const render = (
  props: RatingProps,
  value: number,
  focused?: number,
  over: Partial<RatingHandlers> = {},
  pointer: RatingHover = hover(),
): ReactElement =>
  renderRating(
    props,
    testTheme,
    state(value),
    focus(focused),
    pointer,
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

  it("paints the hovered star and the ones before it, without changing the rating", () => {
    // The bug guarded: a pointer over star 4 of an unrated control showed five
    // outline stars, so a reader could not tell what a click would set. The
    // second half is the opposite mistake — previewing must not announce itself
    // as a selection.
    const stars = starsOf(render({}, 2, undefined, {}, hover(4)));
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
  });

  it("reports the painted fill to starStyle, not the committed value", () => {
    const fills: boolean[] = [];
    render(
      { starStyle: (star) => (fills.push(star.filled), {}) },
      2,
      undefined,
      {},
      hover(4),
    );
    expect(fills).toStrictEqual([true, true, true, true, false]);
  });

  it("previews only while the rating can take input", () => {
    const interactive = hover();
    const element = render({}, 0, undefined, {}, interactive);
    expectSome(
      hostHandler(
        starsOf(element)[3] ?? expect.fail("no star"),
        "onMouseEnter",
      ),
    )(keyEvent("mouseenter"));
    expect(interactive.onEnter).toHaveBeenCalledWith(4);
    expectSome(hostHandler(element, "onMouseLeave"))(keyEvent("mouseleave"));
    expect(interactive.onLeave).toHaveBeenCalledTimes(1);

    Arr.forEach([{ disabled: true }, { readOnly: true }] as const, (props) => {
      const inert = render(props, 2);
      expect(
        hostProp(starsOf(inert)[3] ?? expect.fail("no star"), "onMouseEnter"),
      ).toStrictEqual(Option.none());
      expect(hostProp(inert, "onMouseLeave")).toStrictEqual(Option.none());
    });
  });

  it("marks the empty stars as an error and leaves the chosen ones on the brand", () => {
    const colorOf = (star: ReactElement): unknown =>
      Option.getOrUndefined(
        elementProp(
          elementChildren(star)[0] ?? expect.fail("no icon"),
          "color",
        ),
      );
    const invalid = starsOf(render({ invalid: true }, 2)).map(colorOf);
    expect(invalid).toStrictEqual([
      testTheme.colors.primary,
      testTheme.colors.primary,
      testTheme.colors.destructive,
      testTheme.colors.destructive,
      testTheme.colors.destructive,
    ]);
    // The control: without `invalid`, an empty star keeps the muted role.
    expect(colorOf(starsOf(render({}, 2))[2] ?? expect.fail("no star"))).toBe(
      testTheme.colors.mutedForeground,
    );
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

  it("selects a star when it is clicked", () => {
    const onSelect = vi.fn();
    const stars = starsOf(render({}, 0, undefined, { onSelect }));
    expectSome(hostHandler(stars[2] ?? expect.fail("no star"), "onClick"))(
      keyEvent("click"),
    );
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("drops every tab stop and every input when disabled or read-only", () => {
    Arr.forEach([{ disabled: true }, { readOnly: true }] as const, (props) => {
      const element = render(props, 3);
      const star = starsOf(element)[0] ?? expect.fail("no star");
      expect(hostProp(star, "tabIndex")).toStrictEqual(Option.none());
      const onSelect = vi.fn();
      const clicked = render(props, 3, undefined, { onSelect });
      expectSome(
        hostHandler(starsOf(clicked)[1] ?? expect.fail("no star"), "onClick"),
      )(keyEvent("click"));
      expect(onSelect).toHaveBeenCalledTimes(0);
    });
  });

  it("rings only the star that holds focus", () => {
    const element = render({}, 3, 2);
    const starred = starsOf(element).map((star) =>
      Option.isSome(
        Option.flatMap(hostStyleRecord(star), (style) =>
          Option.fromNullishOr(style["boxShadow"]),
        ),
      ),
    );
    expect(starred).toStrictEqual([false, true, false, false, false]);
  });
});

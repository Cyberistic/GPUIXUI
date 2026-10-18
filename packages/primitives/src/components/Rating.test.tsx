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
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  renderRating,
  type RatingHandlers,
  type RatingHover,
  type RatingProps,
} from "./Rating.js";
import type { RatingFocus } from "./Rating.js";
import { keyEvent, keyUpEvent } from "./testing/event.js";
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

const hover = (index?: number): RatingHover => ({
  preview: Option.fromNullishOr(index),
  onEnter: vi.fn(),
  onLeave: vi.fn(),
});

const render = (
  props: RatingProps,
  value: number,
  focused?: number,
  over: Partial<RatingHandlers> = {},
  preview?: number,
): ReactElement =>
  renderRating(
    props,
    testTheme,
    state(value),
    focus(focused),
    hover(preview),
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

  it("continues an arrow from the focused star, not the deferred value", () => {
    // The bug guarded (plan 359): a controlled parent that does not apply the
    // reported value leaves the ring one star ahead of the paint; starting the
    // next move from the value repeated the first move and trapped the keyboard.
    const onMove = vi.fn();
    const element = render({}, 2, 3, { onMove });
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onMove).toHaveBeenCalledWith(4);
  });

  it("commits the star the ring is on with Enter down and Space up", () => {
    // Plan 359: with the ring as the cursor, the unrated tab stop (star 1) is
    // not selected by an arrow, so the radio-group activation pair is the way
    // to choose it.
    const onSelect = vi.fn();
    const element = render({}, 2, 3, { onSelect });
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("enter"));
    expect(onSelect).toHaveBeenLastCalledWith(3);
    expectSome(hostHandler(element, "onKeyUp"))(keyUpEvent("space"));
    expect(onSelect).toHaveBeenLastCalledWith(3);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("refuses a held activation key and both keys when inert", () => {
    const onSelect = vi.fn();
    const element = render({}, 2, 3, { onSelect });
    expectSome(hostHandler(element, "onKeyDown"))(
      keyEvent("enter", { isHeld: true }),
    );
    expectSome(hostHandler(element, "onKeyUp"))(
      keyUpEvent("space", { isHeld: true }),
    );
    Arr.forEach([{ disabled: true }, { readOnly: true }] as const, (props) => {
      const inert = render(props, 2, 3, { onSelect });
      expectSome(hostHandler(inert, "onKeyDown"))(keyEvent("enter"));
      expectSome(hostHandler(inert, "onKeyUp"))(keyUpEvent("space"));
    });
    expect(onSelect).toHaveBeenCalledTimes(0);
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

  it("paints the star under the pointer and keeps the announcement committed", () => {
    // The bug guarded (plan 094): a pointer could not preview what a click
    // would set, so an unrated group showed five outline stars under the mouse.
    const element = render({}, 2, undefined, {}, 4);
    const iconName = (star: ReactElement): unknown =>
      Option.getOrUndefined(
        elementProp(elementChildren(star)[0] ?? expect.fail("no icon"), "name"),
      );
    expect(starsOf(element).map(iconName)).toStrictEqual([
      "star-filled",
      "star-filled",
      "star-filled",
      "star-filled",
      "star",
    ]);
    // A preview is paint, not selection: what AT hears must not move.
    expect(
      starsOf(element).map((star) =>
        expectSome(hostProp(star, "aria-valuetext")),
      ),
    ).toStrictEqual([
      "checked",
      "checked",
      "unchecked",
      "unchecked",
      "unchecked",
    ]);
  });

  it("reports the preview paint to starStyle", () => {
    const filled: boolean[] = [];
    render(
      {
        starStyle: (star) => {
          filled.push(star.filled);
          return {};
        },
      },
      2,
      undefined,
      {},
      4,
    );
    expect(filled).toStrictEqual([true, true, true, true, false]);
  });

  it("attaches hover input only to an interactive rating", () => {
    const interactive = render({}, 2);
    const star = starsOf(interactive)[0] ?? expect.fail("no star");
    expect(Option.isSome(hostHandler(star, "onMouseEnter"))).toBe(true);
    expect(Option.isSome(hostHandler(interactive, "onMouseLeave"))).toBe(true);

    Arr.forEach([{ disabled: true }, { readOnly: true }] as const, (props) => {
      const inert = render(props, 2);
      const inertStar = starsOf(inert)[0] ?? expect.fail("no star");
      expect(hostHandler(inertStar, "onMouseEnter")).toStrictEqual(
        Option.none(),
      );
      expect(hostHandler(inert, "onMouseLeave")).toStrictEqual(Option.none());
    });
  });
});

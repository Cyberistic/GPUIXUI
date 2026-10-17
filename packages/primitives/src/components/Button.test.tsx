/**
 * The Button keyboard contract.
 *
 * The published `@gpuix/react` ships **no** button (plan 020 §1.5), so this is
 * behaviour the library owns — and the part most worth guarding. Each test
 * below flips a real bug: Enter firing on key *up* (double activation with the
 * platform's own click), Space on key *down* (repeating while held), a held key
 * activating, a busy button still firing, and a disabled button keeping its tab
 * stop.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { keyEvent } from "./testing/event.js";
import {
  expectSome,
  hostHandler,
  hostProp,
  hostStyleRecord,
  hostTag,
} from "./testing/element.js";

const press = (
  element: ReactElement,
  key: string,
  phase: "down" | "up",
  held = false,
): void => {
  const handler = expectSome(
    hostHandler(element, phase === "down" ? "onKeyDown" : "onKeyUp"),
  );
  handler(keyEvent(key, held ? { isHeld: true } : {}));
};

const resting = (props: Parameters<typeof renderButton>[0]): ReactElement =>
  renderButton(props, testTheme, { focused: false });

describe("Button", () => {
  it("names itself from text children, and refuses to guess at non-text", () => {
    expect(
      expectSome(hostProp(resting({ children: "Save changes" }), "aria-label")),
    ).toBe("Save changes");
    expect(
      expectSome(
        hostProp(resting({ label: "Close", children: "×" }), "aria-label"),
      ),
    ).toBe("Close");
    expect(hostProp(resting({ children: 3 }), "aria-label")).toStrictEqual(
      Option.some("3"),
    );
    expect(
      hostProp(resting({ children: <div /> }), "aria-label"),
    ).toStrictEqual(Option.none());
    expect(hostProp(resting({ children: "   " }), "aria-label")).toStrictEqual(
      Option.none(),
    );
  });

  it("activates on Enter key down, never on key up", () => {
    const onActivate = vi.fn();
    const element = resting({ onActivate });
    press(element, "enter", "down");
    press(element, "enter", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("activates on Space key up, never on key down", () => {
    const onActivate = vi.fn();
    const element = resting({ onActivate });
    press(element, "space", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    press(element, "space", "up");
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it("ignores a repeating key", () => {
    const onActivate = vi.fn();
    press(resting({ onActivate }), "enter", "down", true);
    expect(onActivate).toHaveBeenCalledTimes(0);
  });

  it("is a named button the runtime can hit-test", () => {
    const element = resting({ children: "Save changes" });
    expect(expectSome(hostTag(element))).toBe("div");
    expect(expectSome(hostProp(element, "role"))).toBe("button");
  });

  it("stays focusable while loading but refuses to activate", () => {
    const onActivate = vi.fn();
    const loading = resting({ loading: true, onActivate });
    press(loading, "enter", "down");
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(expectSome(hostProp(loading, "tabIndex"))).toBe(0);
    expect(expectSome(hostProp(loading, "aria-description"))).toBe("Loading");
  });

  it("takes a disabled button out of the tab order", () => {
    expect(hostProp(resting({ disabled: true }), "tabIndex")).toStrictEqual(
      Option.none(),
    );
  });

  it("resolves a different chrome while it holds focus", () => {
    const idle = hostProp(resting({}), "style");
    const focused = hostProp(
      renderButton({}, testTheme, { focused: true }),
      "style",
    );
    expect(Option.isSome(idle) && Option.isSome(focused)).toBe(true);
    expect(focused).not.toStrictEqual(idle);
  });

  it("takes a corner radius, and keeps the theme default without one", () => {
    // The bug guarded: an attached ButtonGroup asks its buttons to be square
    // (plan 078); the resolver must honour that and still default to md.
    const radiusOf = (element: ReactElement): unknown =>
      Option.getOrUndefined(hostStyleRecord(element))?.["borderRadius"];
    expect(radiusOf(resting({ radius: "none" }))).toBe(0);
    expect(radiusOf(resting({}))).toBe(testTheme.radius.md);
    expect(radiusOf(resting({ radius: "lg" }))).toBe(testTheme.radius.lg);
  });
});

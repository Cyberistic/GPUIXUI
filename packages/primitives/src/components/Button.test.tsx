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
});

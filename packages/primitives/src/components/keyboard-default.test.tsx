import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderIconButton } from "./IconButton.js";
import { renderSwitch } from "./Switch.js";
import { renderToggle } from "./Toggle.js";
import { keyEvent } from "./testing/event.js";
import { expectSome, hostHandler } from "./testing/element.js";

const focus = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const state = initValueState<boolean>(Option.none(), false);
const noop = (): void => {};

const CONTROLS: ReadonlyArray<{
  readonly name: string;
  readonly render: () => ReactElement;
}> = [
  { name: "Button", render: () => renderButton({}, testTheme, focus) },
  {
    name: "IconButton",
    render: () =>
      renderIconButton({ label: "Delete", icon: null }, testTheme, focus),
  },
  {
    name: "Checkbox",
    render: () => renderCheckbox({}, testTheme, state, focus, noop),
  },
  {
    name: "Switch",
    render: () => renderSwitch({}, testTheme, state, focus, noop),
  },
  {
    name: "Toggle",
    render: () => renderToggle({}, testTheme, state, focus, noop),
  },
];

const handler = (element: ReactElement, name: "onKeyDown" | "onKeyUp") =>
  expectSome(hostHandler(element, name));

describe("the Space press", () => {
  it.each(CONTROLS)("is swallowed by $name", ({ render }) => {
    const press = keyEvent("space");
    handler(render(), "onKeyDown")(press);
    expect(press.prevented).toBe(true);
  });

  it.each(CONTROLS)("is not swallowed on release by $name", ({ render }) => {
    const release = keyEvent("space");
    handler(render(), "onKeyUp")(release);
    expect(release.prevented).toBe(false);
  });

  it.each(CONTROLS)("leaves Enter's default to $name", ({ render }) => {
    const press = keyEvent("enter");
    handler(render(), "onKeyDown")(press);
    expect(press.prevented).toBe(false);
  });
});

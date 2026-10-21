/**
 * A caller's host handlers run alongside a control's own.
 *
 * The guarded defect: every control declared its own host handlers and a
 * consumer could attach none — `onClick` on a Checkbox, `onFocus` on a Switch,
 * the keys that drive a Toggle, and the click a text field's consumer wants to
 * observe were all dropped, so the only way to react to an interaction was to
 * wrap the control in an element that cannot see inside it.
 *
 * The rule pinned here (`InteractionProps`, `composeEvent`/`composePress`):
 *
 * - the caller's handler runs **first**, once, with the runtime's own event;
 * - the part still acts afterwards, exactly once — a handler observes, it does
 *   not replace the control's contract;
 * - a blocked press installs no handler at all, so neither the caller's
 *   `onClick` nor the action runs;
 * - keys and focus stay observable on a disabled control, because a control
 *   disabled while focused must still report the event it holds.
 */

import type { ReactElement } from "react";
import { describe, expect, it, vi, type Mock } from "vitest";
import * as Option from "effect/Option";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderIconButton } from "./IconButton.js";
import { renderInput, type FieldProps } from "./Input.js";
import { renderSwitch } from "./Switch.js";
import { renderTextArea } from "./TextArea.js";
import { renderToggle } from "./Toggle.js";
import type { InteractionProps, FocusState } from "./internal.js";
import { clickEvent, keyEvent } from "./testing/event.js";
import { expectSome, hostHandler } from "./testing/element.js";

type Spy = Mock<(...args: ReadonlyArray<unknown>) => void>;

/** A rendered part and what its own behaviour reported. */
interface Rendered {
  readonly element: ReactElement;
  /** Value changes the part made on its own. */
  readonly changes: number;
  /** Invocation order of the part's own first change. */
  readonly changeOrder: number;
  /** Focus transitions the part's own tracking saw. */
  readonly focus: number;
}

/** A part, rendered with caller handlers and optionally disabled. */
interface Probe {
  readonly name: string;
  readonly render: (handlers: InteractionProps, disabled: boolean) => Rendered;
}

const nothing = (): Spy => vi.fn<(...args: ReadonlyArray<unknown>) => void>();

const read = (element: ReactElement, change: Spy, focus: Spy): Rendered => ({
  element,
  get changes() {
    return change.mock.calls.length;
  },
  get changeOrder() {
    return change.mock.invocationCallOrder[0] ?? 0;
  },
  get focus() {
    return focus.mock.calls.length;
  },
});

const track = (focus: Spy) => ({
  focused: false,
  onFocus: focus,
  onBlur: focus,
});

const button: Probe = {
  name: "Button",
  render: (handlers, disabled) => {
    const change = nothing();
    const focus = nothing();
    return read(
      renderButton(
        { ...handlers, disabled, onActivate: change },
        testTheme,
        track(focus),
      ),
      change,
      focus,
    );
  },
};

const iconButton: Probe = {
  name: "IconButton",
  render: (handlers, disabled) => {
    const change = nothing();
    const focus = nothing();
    return read(
      renderIconButton(
        {
          ...handlers,
          disabled,
          label: "Delete",
          icon: null,
          onActivate: change,
        },
        testTheme,
        track(focus),
      ),
      change,
      focus,
    );
  },
};

const toggle: Probe = {
  name: "Toggle",
  render: (handlers, disabled) => {
    const change = nothing();
    const focus = nothing();
    return read(
      renderToggle(
        { ...handlers, disabled, onPressedChange: change },
        testTheme,
        initValueState(Option.none(), false),
        track(focus),
        change,
      ),
      change,
      focus,
    );
  },
};

const checkbox: Probe = {
  name: "Checkbox",
  render: (handlers, disabled) => {
    const change = nothing();
    const focus = nothing();
    return read(
      renderCheckbox(
        { ...handlers, disabled },
        testTheme,
        initValueState(Option.none(), false),
        track(focus),
        change,
      ),
      change,
      focus,
    );
  },
};

const switchControl: Probe = {
  name: "Switch",
  render: (handlers, disabled) => {
    const change = nothing();
    const focus = nothing();
    return read(
      renderSwitch(
        { ...handlers, disabled },
        testTheme,
        initValueState(Option.none(), false),
        track(focus),
        change,
      ),
      change,
      focus,
    );
  },
};

const CONTROLS: ReadonlyArray<Probe> = [
  button,
  iconButton,
  toggle,
  checkbox,
  switchControl,
];

/** The two fields read the same props; only their host element differs. */
const field = (
  name: string,
  render: (props: FieldProps, focus: FocusState, change: Spy) => ReactElement,
): Probe => ({
  name,
  render: (handlers, disabled) => {
    const change = nothing();
    const focus = nothing();
    return read(
      render({ ...handlers, disabled }, track(focus), change),
      change,
      focus,
    );
  },
});

const FIELDS: ReadonlyArray<Probe> = [
  field("Input", (props, focus, change) =>
    renderInput(
      props,
      testTheme,
      initValueState(Option.none(), ""),
      focus,
      change,
    ),
  ),
  field("TextArea", (props, focus, change) =>
    renderTextArea(
      props,
      testTheme,
      initValueState(Option.none(), ""),
      focus,
      change,
    ),
  ),
];

const handler = (element: ReactElement, name: string) =>
  expectSome(hostHandler(element, name));

describe("a caller's click", () => {
  it.each(CONTROLS)(
    "runs on $name before the control's own action, which still happens once",
    ({ render }) => {
      const onClick = nothing();
      const part = render({ onClick }, false);
      handler(part.element, "onClick")(clickEvent);
      expect(onClick).toHaveBeenCalledOnce();
      expect(onClick).toHaveBeenCalledWith(clickEvent);
      expect(part.changes).toBe(1);
      expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(
        part.changeOrder,
      );
    },
  );

  it.each(CONTROLS)(
    "installs no press handler at all while $name is disabled",
    ({ render }) => {
      const onClick = nothing();
      const part = render({ onClick }, true);
      expect(hostHandler(part.element, "onClick")).toStrictEqual(Option.none());
      expect(onClick).not.toHaveBeenCalled();
      expect(part.changes).toBe(0);
    },
  );

  it.each(FIELDS)("reaches $name's host element", ({ render }) => {
    const onClick = nothing();
    const part = render({ onClick }, false);
    handler(part.element, "onClick")(clickEvent);
    expect(onClick).toHaveBeenCalledWith(clickEvent);
  });
});

describe("a caller's keys", () => {
  it.each(CONTROLS)(
    "runs both handlers on $name and still activates exactly once",
    ({ render }) => {
      const onKeyDown = nothing();
      const onKeyUp = nothing();
      const part = render({ onKeyDown, onKeyUp }, false);
      handler(part.element, "onKeyDown")(keyEvent("enter"));
      handler(part.element, "onKeyUp")(keyEvent("enter"));
      expect(onKeyDown).toHaveBeenCalledOnce();
      expect(onKeyUp).toHaveBeenCalledOnce();
      expect(part.changes).toBe(1);
    },
  );

  it.each(FIELDS)("reaches $name's host element", ({ render }) => {
    const onKeyDown = nothing();
    const onKeyUp = nothing();
    const part = render({ onKeyDown, onKeyUp }, false);
    handler(part.element, "onKeyDown")(keyEvent("enter"));
    handler(part.element, "onKeyUp")(keyEvent("enter"));
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onKeyUp).toHaveBeenCalledOnce();
  });

  it.each(CONTROLS)(
    "keeps $name's key handlers installed while disabled",
    ({ render }) => {
      const onKeyDown = nothing();
      const part = render({ onKeyDown }, true);
      handler(part.element, "onKeyDown")(keyEvent("enter"));
      expect(onKeyDown).toHaveBeenCalledOnce();
    },
  );
});

describe("a caller's focus", () => {
  it.each([...CONTROLS, ...FIELDS])(
    "runs alongside $name's own focus tracking",
    ({ render }) => {
      const onFocus = nothing();
      const onBlur = nothing();
      const part = render({ onFocus, onBlur }, false);
      handler(part.element, "onFocus")(clickEvent);
      handler(part.element, "onBlur")(clickEvent);
      expect(onFocus).toHaveBeenCalledOnce();
      expect(onBlur).toHaveBeenCalledOnce();
      expect(part.focus).toBe(2);
    },
  );

  it.each([...CONTROLS, ...FIELDS])(
    "stays observable on a disabled $name",
    ({ render }) => {
      const onFocus = nothing();
      const part = render({ onFocus }, true);
      handler(part.element, "onFocus")(clickEvent);
      expect(onFocus).toHaveBeenCalledOnce();
      expect(part.focus).toBe(1);
    },
  );
});

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
import { renderRadioGroup, type RadioGroupFocus } from "./RadioGroup.js";
import { renderRating } from "./Rating.js";
import {
  renderRangeSlider,
  renderSlider,
  type RangeSliderHandlers,
  type SliderHandlers,
} from "./Slider.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import {
  renderOtpField,
  type OTPFieldFocus,
  type OTPFieldHandlers,
} from "./OTPField.js";
import type { InteractionProps, FocusState } from "./internal.js";
import { clickEvent, keyEvent } from "./testing/event.js";
import { elementChildren, expectSome, hostHandler } from "./testing/element.js";

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

/**
 * The parts that compose several elements — a group's rows, a slider's track and
 * thumbs, a field's input and steppers — install the caller's handler on **every**
 * element that part gives that handler to, so the caller observes the interaction
 * wherever it landed. The defect these cases guard: those parts accepted no host
 * handlers at all, so a consumer had to wrap the whole control and could not see
 * which row, thumb or cell the interaction came from.
 */

const RADIO_OPTIONS = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
  { value: "gamma", label: "Gamma", disabled: true },
] as const;

const radioFocus = (): RadioGroupFocus & {
  readonly onFocus: Spy;
  readonly onBlur: Spy;
} => ({
  focusedIndex: Option.none(),
  onFocus: nothing(),
  onBlur: nothing(),
});

const radioHandlers = (onSelect: Spy) => ({
  onSelect,
  onFocusMove: vi.fn(),
  registerItem: () => () => {},
});

/** The option row at `index`; a group draws its rows as direct children. */
const rowOf = (element: ReactElement, index: number): ReactElement =>
  elementChildren(element)[index] ?? expect.fail("the group drew no row");

/** The provider a part wraps its children in, and the children it draws. */
const bodyOf = (element: ReactElement): ReadonlyArray<ReactElement> =>
  elementChildren(elementChildren(element)[0] ?? element);

/** The rail of a slider and the parts on it. */
const railParts = (element: ReactElement): ReadonlyArray<ReactElement> =>
  elementChildren(bodyOf(element)[0] ?? element);

const starOf = (element: ReactElement, index: number): ReactElement =>
  elementChildren(element)[index] ?? expect.fail("the rating drew no star");

describe("a caller's handlers on a group with rows", () => {
  it("runs the caller's press before a RadioGroup selects, exactly once", () => {
    const onClick = nothing();
    const onSelect = nothing();
    const element = renderRadioGroup(
      { options: RADIO_OPTIONS, onClick },
      testTheme,
      initValueState(Option.some("alpha"), ""),
      0,
      radioFocus(),
      radioHandlers(onSelect),
    );
    expectSome(hostHandler(rowOf(element, 1), "onClick"))(clickEvent);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("beta");
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(
      onSelect.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("installs no press on the RadioGroup option the group blocks", () => {
    const onClick = nothing();
    const element = renderRadioGroup(
      { options: RADIO_OPTIONS, onClick },
      testTheme,
      initValueState(Option.some("alpha"), ""),
      0,
      radioFocus(),
      radioHandlers(nothing()),
    );
    // The third option is disabled: neither the caller nor the group may run.
    expect(hostHandler(rowOf(element, 2), "onClick")).toStrictEqual(
      Option.none(),
    );
    expect(onClick).not.toHaveBeenCalled();
  });

  it("composes a RadioGroup's root keys and its rows' focus", () => {
    const onKeyDown = nothing();
    const onFocus = nothing();
    const onBlur = nothing();
    const onSelect = nothing();
    const focus = radioFocus();
    const element = renderRadioGroup(
      { options: RADIO_OPTIONS, onKeyDown, onFocus, onBlur },
      testTheme,
      initValueState(Option.some("alpha"), ""),
      0,
      focus,
      radioHandlers(onSelect),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("down"));
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("beta");

    const row = rowOf(element, 1);
    expectSome(hostHandler(row, "onFocus"))(clickEvent);
    expectSome(hostHandler(row, "onBlur"))(clickEvent);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
    expect(focus.onFocus).toHaveBeenCalledWith(1);
    expect(focus.onBlur).toHaveBeenCalledWith(1);
  });

  it("composes a Rating's star press and root keys", () => {
    const onClick = nothing();
    const onKeyDown = nothing();
    const onSelect = nothing();
    const onMove = nothing();
    const element = renderRating(
      { onClick, onKeyDown },
      testTheme,
      initValueState(Option.some(0), 0),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      { onSelect, onMove, registerItem: () => () => {} },
    );
    expectSome(hostHandler(starOf(element, 2), "onClick"))(clickEvent);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(3);
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onMove).toHaveBeenCalledWith(1);
  });

  it("installs no press on a read-only Rating's stars but keeps its keys observable", () => {
    const onClick = nothing();
    const onKeyDown = nothing();
    const element = renderRating(
      { readOnly: true, onClick, onKeyDown },
      testTheme,
      initValueState(Option.some(2), 0),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      { onSelect: nothing(), onMove: nothing(), registerItem: () => () => {} },
    );
    expect(hostHandler(starOf(element, 1), "onClick")).toStrictEqual(
      Option.none(),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("a caller's handlers on a slider", () => {
  const sliderHandlers = (onValueChange: Spy): SliderHandlers => ({
    onValueChange,
    registerTrack: () => {},
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
  });

  it("composes the track's keys and focus, and observes its press", () => {
    const onKeyDown = nothing();
    const onFocus = nothing();
    const onClick = nothing();
    const onValueChange = nothing();
    const focus: FocusState = {
      focused: false,
      onFocus: nothing(),
      onBlur: nothing(),
    };
    const element = renderSlider(
      { onKeyDown, onFocus, onClick },
      testTheme,
      initValueState(Option.some(50), 0),
      focus,
      sliderHandlers(onValueChange),
    );
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith(51);
    expectSome(hostHandler(element, "onFocus"))(clickEvent);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(focus.onFocus).toHaveBeenCalledOnce();
    expectSome(hostHandler(element, "onClick"))(clickEvent);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("installs no press on a disabled slider but keeps its keys observable", () => {
    const onClick = nothing();
    const onKeyDown = nothing();
    const element = renderSlider(
      { disabled: true, onClick, onKeyDown },
      testTheme,
      initValueState(Option.some(50), 0),
      { focused: false, onFocus: vi.fn(), onBlur: vi.fn() },
      sliderHandlers(nothing()),
    );
    expect(hostHandler(element, "onClick")).toStrictEqual(Option.none());
    expectSome(hostHandler(element, "onKeyDown"))(keyEvent("right"));
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("puts the caller's keys and focus on a range slider's thumbs", () => {
    const onKeyDown = nothing();
    const onFocus = nothing();
    const onSpanChange = nothing();
    const rangeFocus = nothing();
    const handlers: RangeSliderHandlers = {
      onSpanChange,
      registerTrack: () => {},
      registerThumb: () => () => {},
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
    };
    const element = renderRangeSlider(
      { onKeyDown, onFocus, defaultValue: [20, 80] },
      testTheme,
      initValueState<readonly [number, number]>(
        Option.some([20, 80]),
        [0, 100],
      ),
      {
        focusedIndex: Option.none(),
        onFocus: rangeFocus,
        onBlur: nothing(),
      },
      handlers,
    );
    // The rail holds indicator, thumb 0, indicator, thumb 1.
    const thumb = railParts(element)[1] ?? expect.fail("no thumb");
    const event = keyEvent("right");
    expectSome(hostHandler(thumb, "onKeyDown"))(event);
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onSpanChange).toHaveBeenCalledWith([21, 80]);
    expectSome(hostHandler(thumb, "onFocus"))(clickEvent);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(rangeFocus).toHaveBeenCalledWith(0);
  });
});

describe("a caller's handlers on a field with several elements", () => {
  it("composes a NumberField's input click and keys, and its steppers' press", () => {
    const onClick = nothing();
    const onKeyDown = nothing();
    const onValue = nothing();
    const handlers: NumberFieldHandlers = {
      onTextChange: vi.fn(),
      onCommit: vi.fn(),
      onValue,
      registerInput: () => {},
    };
    const element = renderNumberField(
      { value: 50, onClick, onKeyDown },
      testTheme,
      initValueState(Option.some(50), 0),
      "50",
      { focused: false, onFocus: vi.fn(), onBlur: vi.fn() },
      handlers,
    );
    const [input, column] = bodyOf(element);
    const up = column === undefined ? undefined : elementChildren(column)[0];
    expectSome(hostHandler(input ?? expect.fail("no input"), "onClick"))(
      clickEvent,
    );
    expect(onClick).toHaveBeenCalledOnce();
    expectSome(hostHandler(input ?? expect.fail("no input"), "onKeyDown"))(
      keyEvent("up"),
    );
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onValue).toHaveBeenCalledWith(51);

    expectSome(hostHandler(up ?? expect.fail("no stepper"), "onClick"))(
      clickEvent,
    );
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onValue).toHaveBeenLastCalledWith(51);
  });

  it("keeps a NumberField's input press observable while disabled", () => {
    // A field is an observation surface: its keys and focus stay observable
    // while disabled, exactly as `Input`'s do — only the action is refused.
    const onClick = nothing();
    const onValue = nothing();
    const element = renderNumberField(
      { value: 50, disabled: true, onClick },
      testTheme,
      initValueState(Option.some(50), 0),
      "50",
      { focused: false, onFocus: vi.fn(), onBlur: vi.fn() },
      {
        onTextChange: vi.fn(),
        onCommit: vi.fn(),
        onValue,
        registerInput: () => {},
      },
    );
    expectSome(
      hostHandler(bodyOf(element)[0] ?? expect.fail("no input"), "onClick"),
    )(clickEvent);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onValue).not.toHaveBeenCalled();
  });

  it("composes every OTP cell's press, keys and focus", () => {
    const onClick = nothing();
    const onKeyUp = nothing();
    const onKeyDown = nothing();
    const onFocus = nothing();
    const onPick = nothing();
    const focus: OTPFieldFocus & { readonly onFocus: Spy } = {
      focusedIndex: Option.none(),
      onFocus: nothing(),
      onBlur: nothing(),
    };
    const handlers: OTPFieldHandlers = {
      onEdit: vi.fn(),
      onKey: vi.fn(),
      onPick,
      registerCell: () => () => {},
    };
    const element = renderOtpField(
      { onClick, onKeyUp, onKeyDown, onFocus, defaultValue: "" },
      testTheme,
      initValueState(Option.some(""), ""),
      focus,
      handlers,
    );
    const cell = bodyOf(element)[1] ?? expect.fail("no cell");
    expectSome(hostHandler(cell, "onClick"))(clickEvent);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledWith(1);
    expectSome(hostHandler(cell, "onKeyUp"))(keyEvent("backspace"));
    expect(onKeyUp).toHaveBeenCalledOnce();
    expectSome(hostHandler(cell, "onKeyDown"))(keyEvent("backspace"));
    expect(onKeyDown).toHaveBeenCalledOnce();
    expectSome(hostHandler(cell, "onFocus"))(clickEvent);
    expect(onFocus).toHaveBeenCalledOnce();
    expect(focus.onFocus).toHaveBeenCalledWith(1);
  });

  it("keeps a disabled OTP cell's press observable but does not pick it", () => {
    const onClick = nothing();
    const onPick = nothing();
    const element = renderOtpField(
      { disabled: true, onClick },
      testTheme,
      initValueState(Option.some(""), ""),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      {
        onEdit: vi.fn(),
        onKey: vi.fn(),
        onPick,
        registerCell: () => () => {},
      },
    );
    expectSome(
      hostHandler(bodyOf(element)[0] ?? expect.fail("no cell"), "onClick"),
    )(clickEvent);
    expect(onClick).toHaveBeenCalledOnce();
    expect(onPick).not.toHaveBeenCalled();
  });
});

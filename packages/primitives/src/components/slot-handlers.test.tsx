/**
 * Every slot handler a single-root trigger advertises reaches an element and
 * calls the caller's function.
 *
 * The bug guarded (plan 694): `ScrollAreaProps` extends `TriggerHandlers`, so it
 * advertises `onKeyUp`, but `renderScrollArea` forwarded the passive set,
 * `onFocus`/`onBlur`/`onKeyDown` and dropped `onKeyUp` — a consumer's handler
 * silently never ran. It is the class plan `362` fixed on `NumberField` and plan
 * `596` fixed for `ref`; the per-control guards (`084` ring, `089` tab order,
 * `093` names, `354` activation, `361` pointer feedback) each hold one
 * behaviour, so a dropped handler had nowhere to fail.
 *
 * `ScrollArea`'s `ref` is out of scope here: it is the imperative
 * `ScrollAreaHandle`, not a host ref (plan `610`), and its own suite proves it.
 * `RangeSlider` is absent because it is a roving composite with no single
 * focusable root, so it is not a slot trigger (the Tooltip page's table).
 */

import { createRef, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderIconButton } from "./IconButton.js";
import { renderInput } from "./Input.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import { renderScrollArea } from "./ScrollArea.js";
import { renderSelect, type SelectHandlers } from "./Select.js";
import { renderSlider, type SliderHandlers } from "./Slider.js";
import { renderSwitch } from "./Switch.js";
import { renderTextArea } from "./TextArea.js";
import { renderToggle } from "./Toggle.js";
import type { FocusState, TriggerHandlers } from "./internal.js";
import {
  elementChildren,
  elementHandler,
  elementProp,
  expectSome,
} from "./testing/element.js";

/** The slot contract, minus the handle-shaped `ScrollArea` ref. */
interface SlotProps {
  readonly ref?: (instance: PublicInstance) => void;
  readonly onMouseEnter?: (event: EventPayload) => void;
  readonly onMouseLeave?: (event: EventPayload) => void;
  readonly onMouseMove?: (event: EventPayload) => void;
  readonly onMouseDown?: (event: EventPayload) => void;
  readonly onMouseUp?: (event: EventPayload) => void;
  readonly onMouseDownOutside?: (event: EventPayload) => void;
  readonly onAuxClick?: (event: EventPayload) => void;
  readonly onScroll?: (event: EventPayload) => void;
  readonly onFocus?: (event: EventPayload) => void;
  readonly onBlur?: (event: EventPayload) => void;
  readonly onKeyDown?: (event: EventPayload) => void;
  readonly onKeyUp?: (event: EventPayload) => void;
}

type HandlerName = Exclude<keyof SlotProps, "ref">;

/** The twelve functions the slot can inject, one assertion each. */
const HANDLERS = [
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseDown",
  "onMouseUp",
  "onMouseDownOutside",
  "onAuxClick",
  "onScroll",
  "onFocus",
  "onBlur",
  "onKeyDown",
  "onKeyUp",
] as const satisfies ReadonlyArray<HandlerName>;

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };

const textState = (value: string) => initValueState(Option.some(value), "");

const booleanState = (value: boolean) =>
  initValueState(Option.some(value), false);

const numberState = (value: number) => initValueState(Option.some(value), 0);

const numberHandlers = (): NumberFieldHandlers => ({
  onTextChange: vi.fn(),
  onCommit: vi.fn(),
  onBlurCommit: vi.fn(),
  onValue: vi.fn(),
  registerInput: () => {},
});

const selectHandlers = (): SelectHandlers => ({
  onOpenChange: vi.fn(),
  onValueChange: vi.fn(),
  registerTrigger: () => {},
  registerContent: () => {},
  registerItem: () => () => {},
  onHighlight: vi.fn(),
});

const sliderHandlers = (): SliderHandlers => ({
  onValueChange: vi.fn(),
  onCommit: vi.fn(),
  registerTrack: () => {},
  onPointerDown: vi.fn(),
  onPointerMove: vi.fn(),
  onPointerUp: vi.fn(),
});

/** A ref callback decoded at the boundary, the way the harness reads handlers. */
const RefCallback = Schema.declare(
  (input: unknown): input is (instance: PublicInstance) => void =>
    typeof input === "function",
  { description: "A ref callback the runtime assigns a host instance to." },
);

/** The host instance a ref callback receives; only its identity matters. */
const instance: PublicInstance = { id: 1, type: "div", props: {} };

/** Every element in a tree, the root first. */
const tree = (element: ReactElement): ReadonlyArray<ReactElement> => [
  element,
  ...Arr.flatMap(elementChildren(element), tree),
];

/** The first element that carries a named prop. */
const carrierOf = (
  nodes: ReadonlyArray<ReactElement>,
  name: string,
): Option.Option<ReactElement> =>
  Arr.findFirst(nodes, (node) => Option.isSome(elementProp(node, name)));

interface Trigger {
  readonly name: string;
  readonly render: (slot: SlotProps) => ReactElement;
  /** `ScrollArea` exposes its imperative handle instead of a host ref. */
  readonly hostRef?: false;
}

const TRIGGERS: ReadonlyArray<Trigger> = [
  {
    name: "Button",
    render: (slot) => renderButton({ ...slot }, testTheme, idle),
  },
  {
    name: "IconButton",
    render: (slot) =>
      renderIconButton({ icon: "x", label: "Close", ...slot }, testTheme),
  },
  {
    name: "Toggle",
    render: (slot) =>
      renderToggle({ ...slot }, testTheme, booleanState(false), idle, vi.fn()),
  },
  {
    name: "Checkbox",
    render: (slot) =>
      renderCheckbox(
        { ...slot },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "Switch",
    render: (slot) =>
      renderSwitch({ ...slot }, testTheme, booleanState(false), idle, vi.fn()),
  },
  {
    name: "Input",
    render: (slot) =>
      renderInput({ ...slot }, testTheme, textState(""), idle, vi.fn()),
  },
  {
    name: "TextArea",
    render: (slot) =>
      renderTextArea({ ...slot }, testTheme, textState(""), idle, vi.fn()),
  },
  {
    name: "NumberField",
    render: (slot) =>
      renderNumberField(
        { ...slot },
        testTheme,
        numberState(2),
        "2",
        idle,
        numberHandlers(),
      ),
  },
  {
    name: "Slider",
    render: (slot) =>
      renderSlider(
        { ...slot },
        testTheme,
        numberState(50),
        idle,
        sliderHandlers(),
      ),
  },
  {
    name: "Select",
    render: (slot) =>
      renderSelect(
        { options: [], ...slot },
        testTheme,
        textState(""),
        false,
        idle,
        selectHandlers(),
      ),
  },
  {
    name: "ScrollArea",
    hostRef: false,
    render: ({ ref: _ref, ...slot }) =>
      renderScrollArea(
        { axis: "vertical", label: "Properties", ...slot },
        testTheme,
      ),
  },
];

/** An event shaped the way each handler's call site expects one. */
const event = (name: HandlerName): EventPayload => ({
  elementId: 0,
  eventType: name === "onScroll" ? "scroll" : "keyUp",
  key: "up",
});

describe("the slot contract", () => {
  /**
   * One case per part: the table is what makes a new trigger a one-row change,
   * and the failure names the part and the handler that stopped.
   */
  it.each(Arr.map(TRIGGERS, (trigger) => [trigger.name, trigger] as const))(
    "%s: every handler reaches an element and calls the caller",
    (_name, trigger) => {
      Arr.forEach(HANDLERS, (name) => {
        const caller = vi.fn();
        const nodes = tree(trigger.render({ [name]: caller }));
        const handler = Option.flatMap(carrierOf(nodes, name), (node) =>
          elementHandler(node, name),
        );
        Option.match(handler, {
          onNone: () =>
            expect.fail(
              `${trigger.name} drops ${name}: no element carries it as a handler`,
            ),
          onSome: (call) => {
            call(event(name));
            expect(caller).toHaveBeenCalledWith(event(name));
          },
        });
      });
    },
  );

  it.each(
    Arr.filter(
      Arr.map(TRIGGERS, (trigger) => [trigger.name, trigger] as const),
      ([, trigger]) => trigger.hostRef !== false,
    ),
  )("%s: the caller's ref receives the host instance", (_name, trigger) => {
    const ref = createRef<PublicInstance>();
    const nodes = tree(
      trigger.render({ ref: (value) => void (ref.current = value) }),
    );
    const callback = expectSome(
      Option.flatMap(carrierOf(nodes, "ref"), (node) =>
        Option.flatMap(elementProp(node, "ref"), (value) =>
          Schema.decodeUnknownOption(RefCallback)(value),
        ),
      ),
    );
    callback(instance);
    expect(ref.current).toBe(instance);
  });
});

/**
 * A compile-time completeness check: `TriggerHandlers` is exactly the twelve
 * handlers above plus `ref`, so adding a handler to the slot contract fails
 * here until the matrix asserts it too.
 */
const SLOT_CONTRACT: TriggerHandlers = {
  onMouseEnter: () => {},
  onMouseLeave: () => {},
  onMouseMove: () => {},
  onMouseDown: () => {},
  onMouseUp: () => {},
  onMouseDownOutside: () => {},
  onAuxClick: () => {},
  onScroll: () => {},
  onFocus: () => {},
  onBlur: () => {},
  onKeyDown: () => {},
  onKeyUp: () => {},
};
void SLOT_CONTRACT;

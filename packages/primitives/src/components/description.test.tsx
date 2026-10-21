/**
 * A blank `aria-description` is not a description (plan 586).
 *
 * The bug this guards: `ariaName` made a blank label absent (plan 026) and
 * plans 500/573/577 applied the same rule to descriptions a group row or a
 * tooltip publishes, but the public `aria-description` prop that a slot trigger
 * adds (plans 341/345) was forwarded raw. Measured in the real runtime, nine
 * surfaces published `description: "   "` verbatim and a busy `Button`
 * published `"Loading.    "`.
 *
 * This suite reads the element tree every renderer produces, so the rule is
 * asserted before the runtime sees the props, and it scans the source so a new
 * surface cannot forward the prop around the helper.
 */

import type { ReactElement } from "react";
import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Str from "effect/String";
import { describe, expect, it, vi } from "vitest";
import { initValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderButton } from "./Button.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderInput } from "./Input.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import { renderScrollArea } from "./ScrollArea.js";
import { renderSelect, type SelectHandlers } from "./Select.js";
import { renderSlider, type SliderHandlers } from "./Slider.js";
import { renderSwitch } from "./Switch.js";
import { renderTextArea } from "./TextArea.js";
import { renderToggle } from "./Toggle.js";
import { elementChildren, elementProp } from "./testing/element.js";
import { describeState, stateWords, type FocusState } from "./internal.js";

const DESCRIPTION = "Net of refunds.";
const PADDED = "  Net of refunds.  ";
const BLANK = "   ";

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

interface Surface {
  readonly name: string;
  /** Render with the given `aria-description`; `undefined` is the absent prop. */
  readonly render: (description: string | undefined) => ReactElement;
}

const SURFACES: ReadonlyArray<Surface> = [
  {
    name: "Button",
    render: (description) =>
      renderButton(
        { "aria-description": description, children: "Save" },
        testTheme,
        { focused: false },
      ),
  },
  {
    name: "Toggle",
    render: (description) =>
      renderToggle(
        { "aria-description": description, children: "Bold" },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "Checkbox",
    render: (description) =>
      renderCheckbox(
        { "aria-description": description, label: "Accept" },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "Switch",
    render: (description) =>
      renderSwitch(
        { "aria-description": description, label: "Dark" },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "Input",
    render: (description) =>
      renderInput(
        { "aria-description": description, label: "Name" },
        testTheme,
        textState(""),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "TextArea",
    render: (description) =>
      renderTextArea(
        { "aria-description": description, label: "Notes" },
        testTheme,
        textState(""),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "NumberField",
    render: (description) =>
      renderNumberField(
        { "aria-description": description, label: "Count" },
        testTheme,
        numberState(2),
        "2",
        idle,
        numberHandlers(),
      ),
  },
  {
    name: "Select",
    render: (description) =>
      renderSelect(
        {
          "aria-description": description,
          label: "Fruit",
          placeholder: "Pick",
          options: [{ value: "apple", label: "Apple" }],
        },
        testTheme,
        textState(""),
        false,
        idle,
        selectHandlers(),
      ),
  },
  {
    name: "Slider",
    render: (description) =>
      renderSlider(
        { "aria-description": description, label: "Volume" },
        testTheme,
        numberState(50),
        idle,
        sliderHandlers(),
      ),
  },
  {
    name: "ScrollArea",
    render: (description) =>
      renderScrollArea(
        { "aria-description": description, label: "Activity" },
        testTheme,
      ),
  },
];

/** Every `aria-description` any element in the tree carries. */
const descriptions = (element: ReactElement): ReadonlyArray<unknown> =>
  Arr.appendAll(
    Arr.fromIterable(Option.toArray(elementProp(element, "aria-description"))),
    Arr.flatMap(elementChildren(element), descriptions),
  );

describe("a blank description is absent", () => {
  it.each(SURFACES)("$name forwards nothing for a blank string", (surface) => {
    expect(descriptions(surface.render(BLANK))).toStrictEqual([]);
  });

  it.each(SURFACES)(
    "$name forwards nothing when the prop is absent",
    (surface) => {
      expect(descriptions(surface.render(undefined))).toStrictEqual([]);
    },
  );
});

describe("a real description is trimmed", () => {
  it.each(SURFACES)("$name forwards the text without padding", (surface) => {
    expect(descriptions(surface.render(PADDED))).toStrictEqual([DESCRIPTION]);
  });
});

describe("a busy Button", () => {
  const busy = (description: string | undefined): ReactElement =>
    renderButton(
      {
        "aria-description": description,
        loading: true,
        children: "Save",
      },
      testTheme,
      { focused: false },
    );

  it("announces only Loading when there is no tip", () => {
    expect(descriptions(busy(BLANK))).toStrictEqual(["Loading"]);
  });

  it("joins a real tip after Loading without padding", () => {
    expect(descriptions(busy(PADDED))).toStrictEqual([
      `Loading. ${DESCRIPTION}`,
    ]);
  });
});

/**
 * The state words, as a pure rule (plan `810`).
 *
 * `disabled` wins over `readOnly` — the rule every control's paint, handlers and
 * tab stop follow — and `loading` leads because it is an activity.
 */
describe("the state words", () => {
  it("says nothing for a working control", () => {
    expect(stateWords({})).toBe("");
    expect(describeState(DESCRIPTION, {})).toBe(DESCRIPTION);
    expect(describeState(undefined, {})).toBeUndefined();
  });

  it("announces a disabled control as unavailable", () => {
    expect(stateWords({ disabled: true })).toBe("unavailable");
  });

  it("announces a read-only control as read only", () => {
    expect(stateWords({ readOnly: true })).toBe("read only");
  });

  it("lets disabled win over read only", () => {
    expect(stateWords({ disabled: true, readOnly: true })).toBe("unavailable");
  });

  it("leads with the activity, then the state", () => {
    expect(stateWords({ disabled: true, loading: true })).toBe(
      "Loading. unavailable",
    );
  });

  it("announces a failed validation as invalid", () => {
    expect(stateWords({ invalid: true })).toBe("invalid");
  });

  it("keeps the validation independent of the inert pair", () => {
    expect(stateWords({ disabled: true, invalid: true })).toBe(
      "unavailable. invalid",
    );
    expect(stateWords({ readOnly: true, invalid: true })).toBe(
      "read only. invalid",
    );
  });

  it("puts the whole state before a description", () => {
    expect(stateWords({ disabled: true, loading: true, invalid: true })).toBe(
      "Loading. unavailable. invalid",
    );
    expect(describeState(DESCRIPTION, { invalid: true })).toBe(
      `invalid. ${DESCRIPTION}`,
    );
  });

  it("composes a description after the state, and ignores a blank one", () => {
    expect(describeState(DESCRIPTION, { disabled: true })).toBe(
      `unavailable. ${DESCRIPTION}`,
    );
    expect(describeState(BLANK, { readOnly: true })).toBe("read only");
  });
});

/** One part that can be disabled (and, where it has the prop, read-only). */
interface InertSurface {
  readonly name: string;
  readonly readOnly: boolean;
  readonly render: (state: {
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
  }) => ReactElement;
}

const INERT: ReadonlyArray<InertSurface> = [
  {
    name: "Button",
    readOnly: false,
    render: (state) =>
      renderButton({ ...state, children: "Save" }, testTheme, {
        focused: false,
      }),
  },
  {
    name: "Toggle",
    readOnly: true,
    render: (state) =>
      renderToggle(
        { ...state, children: "Bold" },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "Checkbox",
    readOnly: true,
    render: (state) =>
      renderCheckbox(
        { ...state, label: "Accept" },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "Switch",
    readOnly: true,
    render: (state) =>
      renderSwitch(
        { ...state, label: "Dark" },
        testTheme,
        booleanState(false),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "Input",
    readOnly: true,
    render: (state) =>
      renderInput(
        { ...state, label: "Name" },
        testTheme,
        textState(""),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "TextArea",
    readOnly: true,
    render: (state) =>
      renderTextArea(
        { ...state, label: "Notes" },
        testTheme,
        textState(""),
        idle,
        vi.fn(),
      ),
  },
  {
    name: "NumberField",
    readOnly: true,
    render: (state) =>
      renderNumberField(
        { ...state, label: "Count" },
        testTheme,
        numberState(2),
        "2",
        idle,
        numberHandlers(),
      ),
  },
  {
    name: "Select",
    readOnly: true,
    render: (state) =>
      renderSelect(
        {
          ...state,
          label: "Fruit",
          placeholder: "Pick",
          options: [{ value: "apple", label: "Apple" }],
        },
        testTheme,
        textState(""),
        false,
        idle,
        selectHandlers(),
      ),
  },
  {
    name: "Slider",
    readOnly: true,
    render: (state) =>
      renderSlider(
        { ...state, label: "Volume" },
        testTheme,
        numberState(50),
        idle,
        sliderHandlers(),
      ),
  },
];

/**
 * The wiring: a state the runtime cannot express must reach the host prop.
 *
 * Element-level, so a part that forgets the rule fails by name here rather than
 * in a native suite that cannot say which part lost it.
 */
describe("an inert control announces its state", () => {
  it.each(INERT)("$name says nothing while it works", (surface) => {
    expect(descriptions(surface.render({}))).toStrictEqual([]);
  });

  it.each(INERT)("$name says unavailable while disabled", (surface) => {
    expect(descriptions(surface.render({ disabled: true }))).toStrictEqual([
      "unavailable",
    ]);
  });

  it.each(Arr.filter(INERT, (surface) => surface.readOnly))(
    "$name says read only while read-only",
    (surface) => {
      expect(descriptions(surface.render({ readOnly: true }))).toStrictEqual([
        "read only",
      ]);
    },
  );

  it("composes the state before a caller's description", () => {
    const element = renderButton(
      { disabled: true, "aria-description": DESCRIPTION, children: "Save" },
      testTheme,
      { focused: false },
    );
    expect(descriptions(element)).toStrictEqual([
      `unavailable. ${DESCRIPTION}`,
    ]);
  });

  it("folds a busy button's Loading into the same rule", () => {
    const element = renderButton(
      { loading: true, disabled: true, children: "Save" },
      testTheme,
      { focused: false },
    );
    expect(descriptions(element)).toStrictEqual(["Loading. unavailable"]);
  });
});

const at = (segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    return path.join(import.meta.dirname, ...segments);
  }).pipe(Effect.provide(NodePath.layer));
const scan = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const dir = yield* at([]);
  const files = yield* fs.readDirectory(dir);
  const sources = yield* Effect.forEach(
    Arr.filter(
      files,
      (file) => Str.endsWith(".tsx")(file) && !Str.includes(".test.")(file),
    ),
    (file) =>
      Effect.flatMap(at([file]), (path) =>
        Effect.map(fs.readFileString(path), (body) => ({
          file,
          body,
        })),
      ),
    { concurrency: 1 },
  );
  return sources;
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** The component sources that declare an `aria-description` prop. */
const declaresDescription = (source: { readonly body: string }): boolean =>
  Str.includes('readonly "aria-description"?: string;')(source.body);

describe("every surface that declares the prop applies the rule", () => {
  it("forwards it through ariaName or the state rule, by file", async () => {
    const sources = Arr.filter(
      await Effect.runPromise(scan),
      declaresDescription,
    );
    expect(Arr.length(sources)).toBeGreaterThan(0);
    const raw = Arr.filter(
      sources,
      (source) =>
        // A part with an inert state announces it here (plan 810), and
        // `describeState` trims the description it carries.
        !Str.includes("describeState(")(source.body) &&
        !Str.includes("aria-description={ariaName(")(source.body) &&
        !Str.includes('"aria-description": ariaName(')(source.body) &&
        !Str.includes('ariaName(props["aria-description"])')(source.body) &&
        // A join helper (`joinDescription`) trims both of its sources, so a
        // visible description and a slot tip compose without padding (748).
        !(
          Str.includes('"aria-description": joinDescription(')(source.body) &&
          Str.includes('props["aria-description"]')(source.body)
        ),
    );
    expect(Arr.map(raw, (source) => source.file)).toStrictEqual([]);
  });

  /**
   * The cross-control wiring guard (plan `810`).
   *
   * The unit cases above prove the rule; this proves every part that *has* an
   * inert state calls it, so a new control cannot ship its disabled state
   * unannounced — the class the probe measured on all thirteen parts.
   */
  it("every part with a disabled prop announces the state, by file", async () => {
    const sources = await Effect.runPromise(scan);
    const inert = Arr.filter(sources, (source) =>
      Str.includes("readonly disabled?: boolean;")(source.body),
    );
    expect(Arr.length(inert)).toBeGreaterThan(10);
    const unwired = Arr.filter(
      inert,
      (source) =>
        !Str.includes("describeState(")(source.body) &&
        !Str.includes("stateWords(")(source.body),
    );
    expect(Arr.map(unwired, (source) => source.file)).toStrictEqual([]);
  });

  /**
   * The validation wiring guard (plan `812`).
   *
   * The rule above proves `invalid` is announced; this proves the parts that
   * *declare* a validation state are the ones the native matrix in
   * `runtime/invalid-announcement.runtime.test.tsx` measures. The list is
   * explicit on purpose: a new invalid-bearing part, or a part that drops the
   * prop, must be a deliberate diff here rather than ship a painted error that
   * assistive technology never hears. `Label.tsx` is the one exception it
   * names — a caption, whose control owns the node and the state.
   */
  it("records every part that declares a validation state, by file", async () => {
    const sources = await Effect.runPromise(scan);
    const invalid = Arr.filter(sources, (source) =>
      Str.includes("readonly invalid?: boolean;")(source.body),
    );
    expect(
      Arr.sort(
        Arr.map(invalid, (source) => source.file),
        Order.String,
      ),
    ).toStrictEqual([
      "Checkbox.tsx",
      "CheckboxGroup.tsx",
      "Input.tsx",
      "Label.tsx",
      "NumberField.tsx",
      "OTPField.tsx",
      "RadioGroup.tsx",
      "Rating.tsx",
      "Select.tsx",
      "Slider.tsx",
      "Switch.tsx",
    ]);
  });
});

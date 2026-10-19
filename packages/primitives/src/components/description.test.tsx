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
import type { FocusState } from "./internal.js";

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
  return Arr.filter(sources, (source) =>
    Str.includes('readonly "aria-description"?: string;')(source.body),
  );
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("every surface that declares the prop applies the rule", () => {
  it("forwards it through ariaName, by file", async () => {
    const sources = await Effect.runPromise(scan);
    expect(Arr.length(sources)).toBeGreaterThan(0);
    const raw = Arr.filter(
      sources,
      (source) =>
        !Str.includes("aria-description={ariaName(")(source.body) &&
        !Str.includes('"aria-description": ariaName(')(source.body) &&
        !Str.includes('ariaName(props["aria-description"])')(source.body),
    );
    expect(Arr.map(raw, (source) => source.file)).toStrictEqual([]);
  });
});

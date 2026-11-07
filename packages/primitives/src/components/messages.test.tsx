import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  busyWord,
  defaultMessages,
  indeterminateWord,
  pressWord,
  rangeThumbNames,
  resolveMessages,
  selectionWord,
  starWord,
  type MessagesSource,
  type PrimitiveMessages,
} from "../core/messages.js";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderCheckbox } from "./Checkbox.js";
import { renderCheckboxGroup } from "./CheckboxGroup.js";
import type { FocusState } from "./internal.js";
import { otpFieldPart, renderOtpFieldInput } from "./OTPField.js";
import { renderRadioGroup } from "./RadioGroup.js";
import { renderRating } from "./Rating.js";
import { renderScrollAreaViewport, scrollPart } from "./ScrollArea.js";
import { renderProgress } from "./Progress.js";
import { renderRangeSlider } from "./Slider.js";
import { renderButton } from "./Button.js";
import { renderSpinner } from "./Spinner.js";
import { renderSwitch } from "./Switch.js";
import { renderToggle } from "./Toggle.js";
import { renderToggleGroup } from "./ToggleGroup.js";
import {
  expectSome,
  elementChildren,
  elementProp,
  hostProp,
  hostPropString,
} from "./testing/element.js";

const french: PrimitiveMessages = {
  selection: { checked: "coché", unchecked: "décoché", mixed: "partiel" },
  press: { pressed: "enfoncé", notPressed: "relâché" },
  star: { checked: "plein", half: "demi", unchecked: "vide" },
  starName: (index, max) => `étoile ${index} sur ${max}`,
  scrollRegion: "Zone de défilement",
  codeDigit: (index, label) => `${label ?? "Code"} chiffre ${index + 1}`,
  loading: { busy: "Chargement", indeterminate: "chargement" },
  rangeEnd: (label, end) =>
    `${end === "start" ? "minimum" : "maximum"} de ${label}`,
};

const silent: PrimitiveMessages = {
  ...french,
  starName: () => "",
  codeDigit: () => "",
  rangeEnd: () => "",
};

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const flag = (value: boolean): ValueState<boolean> =>
  initValueState(Option.some(value), false);
const text = (value: string): ValueState<string> =>
  initValueState(Option.some(value), "");

const announced = (element: ReactElement) =>
  expectSome(hostProp(element, "aria-valuetext"));

const rows = (element: ReactElement) =>
  Arr.map(elementChildren(element), announced);

const groupHandlers = { onFocusMove: vi.fn(), registerItem: () => () => {} };

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("resolveMessages", () => {
  it("hands back the shipped table itself when nothing is overridden", () => {
    expect(resolveMessages()).toBe(defaultMessages);
    expect(defaultMessages.scrollRegion).toBe("Scroll region");
  });

  it("replaces a named group whole and keeps the groups left out", () => {
    const resolved = resolveMessages({ press: french.press });
    expect(resolved.press).toEqual(french.press);
    expect(resolved.selection).toEqual(defaultMessages.selection);
    expect(resolved.scrollRegion).toBe("Scroll region");
    expect(resolved.loading).toEqual(defaultMessages.loading);
    expect(resolved.rangeEnd).toBe(defaultMessages.rangeEnd);
  });

  it("extends the table above it, which is what a nested provider does", () => {
    const resolved = resolveMessages({ selection: french.selection }, french);
    expect(resolved.selection).toEqual(french.selection);
    expect(resolved.press).toEqual(french.press);
    expect(resolved.codeDigit(0, "Code")).toBe("Code chiffre 1");
  });

  it("keeps a key a forwarded table leaves undefined", () => {
    const resolved = resolveMessages(
      {
        selection: undefined,
        press: undefined,
        star: undefined,
        starName: undefined,
        scrollRegion: undefined,
        codeDigit: undefined,
        loading: undefined,
        rangeEnd: undefined,
      },
      french,
    );
    expect(resolved).toEqual(french);
    expect(resolved.starName(1, 2)).toBe("étoile 1 sur 2");
    expect(resolved.codeDigit(0, undefined)).toBe("Code chiffre 1");
    expect(resolved.loading).toEqual(french.loading);
  });

  it("reads a words table a store handed back, without a cast", () => {
    expect(resolveMessages(null)).toBe(defaultMessages);

    const stored: MessagesSource = {
      selection: { checked: "coché", unchecked: null, mixed: null },
      press: null,
      starName: null,
      scrollRegion: null,
    };
    const resolved = resolveMessages(stored, french);

    expect(resolved.selection.checked).toBe("coché");
    expect(resolved.selection.unchecked).toBe("décoché");
    expect(resolved.selection.mixed).toBe("partiel");
    expect(resolved.press).toEqual(french.press);
    expect(resolved.starName(1, 3)).toBe("étoile 1 sur 3");
    expect(resolved.codeDigit(0, undefined)).toBe("Code chiffre 1");
    expect(resolved.scrollRegion).toBe("Zone de défilement");

    expect(
      selectionWord(
        "checked",
        resolveMessages({ selection: { checked: "" } }, french).selection,
      ),
    ).toBe("checked");
  });
  it("reads a slot a store wrote as data as the table above it", () => {
    const stored: MessagesSource = {
      starName: "star {index} of {max}",
      codeDigit: 42,
      rangeEnd: true,
      scrollRegion: 7,
      selection: { checked: 1, unchecked: "décoché" },
    };
    const resolved = resolveMessages(stored, french);
    expect(resolved.starName(1, 2)).toBe("étoile 1 sur 2");
    expect(resolved.codeDigit(0, undefined)).toBe("Code chiffre 1");
    expect(resolved.rangeEnd("Prix", "start")).toBe("minimum de Prix");
    expect(resolved.scrollRegion).toBe("Zone de défilement");

    expect(resolved.selection).toEqual({
      checked: french.selection.checked,
      unchecked: "décoché",
      mixed: french.selection.mixed,
    });

    expect(
      Arr.map(
        elementChildren(
          renderRating(
            { max: 2 },
            testTheme,
            initValueState(Option.none(), 0),
            { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
            {
              onSelect: vi.fn(),
              onMove: vi.fn(),
              registerItem: () => () => {},
            },
            undefined,
            resolved,
          ),
        ),
        (star) => expectSome(hostPropString(star, "aria-label")),
      ),
    ).toEqual(["étoile 1 sur 2", "étoile 2 sur 2"]);
  });
});

describe("every control announces the table it is handed", () => {
  it("names a range's two ends in the caller's sentence", () => {
    expect(rangeThumbNames("Prix", french.rangeEnd)).toEqual([
      "minimum de Prix",
      "maximum de Prix",
    ]);

    expect(rangeThumbNames(undefined, french.rangeEnd)).toEqual([
      undefined,
      undefined,
    ]);
    expect(rangeThumbNames("Price")).toEqual([
      "Price minimum",
      "Price maximum",
    ]);

    const range = renderRangeSlider(
      { label: "Prix" },
      testTheme,
      initValueState<readonly [number, number]>(
        Option.some([20, 60]),
        [0, 100],
      ),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      {
        onSpanChange: vi.fn(),
        registerTrack: () => () => {},
        registerThumb: () => () => {},
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
      },
      french,
    );
    const provider = elementChildren(range)[0] ?? expect.fail("no parts");
    const rail = elementChildren(provider)[0] ?? expect.fail("no rail");
    const thumbs = Arr.filter(elementChildren(rail), (part) =>
      Option.contains(hostProp(part, "role"), "slider"),
    );
    expect(
      Arr.map(thumbs, (thumb) => expectSome(hostProp(thumb, "aria-label"))),
    ).toEqual(["minimum de Prix", "maximum de Prix"]);
  });

  it("announces a selection's three states", () => {
    const box = (indeterminate: boolean, checked: boolean) =>
      renderCheckbox(
        { checked, indeterminate },
        testTheme,
        flag(checked),
        idle,
        vi.fn(),
        french,
      );
    expect(announced(box(false, true))).toBe("coché");
    expect(announced(box(false, false))).toBe("décoché");
    expect(announced(box(true, false))).toBe("partiel");
  });

  it("announces each row of a checkbox group", () => {
    const element = renderCheckboxGroup(
      { options },
      testTheme,
      ["a"],
      Option.some(0),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      { ...groupHandlers, onToggle: vi.fn() },
      french,
    );
    expect(rows(element)).toEqual(["coché", "décoché"]);
  });

  it("announces each row of a radio group", () => {
    const element = renderRadioGroup(
      { options },
      testTheme,
      text("a"),
      0,
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      { ...groupHandlers, onSelect: vi.fn() },
      french,
    );
    expect(rows(element)).toEqual(["coché", "décoché"]);
  });

  it("names each star and announces its fill in the caller's words", () => {
    const stars = elementChildren(
      renderRating(
        { max: 3, allowHalf: true },
        testTheme,
        initValueState(Option.some(2.5), 0),
        { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
        { onSelect: vi.fn(), onMove: vi.fn(), registerItem: () => () => {} },
        undefined,
        french,
      ),
    );
    expect(
      Arr.map(stars, (star) => expectSome(hostProp(star, "aria-label"))),
    ).toEqual(["étoile 1 sur 3", "étoile 2 sur 3", "étoile 3 sur 3"]);
    expect(Arr.map(stars, announced)).toEqual(["plein", "plein", "demi"]);
  });

  it("announces a switch and both toggle states", () => {
    expect(
      announced(
        renderSwitch(
          { checked: true },
          testTheme,
          flag(true),
          idle,
          vi.fn(),
          french,
        ),
      ),
    ).toBe("coché");
    expect(
      announced(
        renderToggle(
          { pressed: true },
          testTheme,
          flag(true),
          idle,
          vi.fn(),
          french,
        ),
      ),
    ).toBe("enfoncé");
    expect(
      announced(
        renderToggle({}, testTheme, flag(false), idle, vi.fn(), french),
      ),
    ).toBe("relâché");
  });

  it("announces each row of a toggle group", () => {
    const element = renderToggleGroup(
      { options },
      testTheme,
      ["a"],
      Option.some(0),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      { ...groupHandlers, onToggle: vi.fn() },
      french,
    );
    expect(rows(element)).toEqual(["enfoncé", "relâché"]);
  });

  it("names a focusable scroll region, and lets the caller's own name win", () => {
    const region = (label?: string) =>
      renderScrollAreaViewport(
        { label },
        scrollPart({ axis: "vertical" }, testTheme),
        undefined,
        french,
      );
    expect(expectSome(hostProp(region(), "aria-label"))).toBe(
      "Zone de défilement",
    );
    expect(expectSome(hostProp(region("Chat"), "aria-label"))).toBe("Chat");

    expect(
      hostProp(
        renderScrollAreaViewport(
          { focusable: false },
          scrollPart({ axis: "vertical" }, testTheme),
          undefined,
          french,
        ),
        "aria-label",
      ),
    ).toStrictEqual(Option.none());
  });

  it("names every code cell, keeping the caller's field name", () => {
    const cell = (label: string | undefined, index: number) =>
      renderOtpFieldInput(
        { index },
        otpFieldPart(
          { length: 4, label },
          testTheme,
          text("1234"),
          {
            focusedIndex: Option.none(),
            onFocus: vi.fn(),
            onBlur: vi.fn(),
          },
          {
            onEdit: vi.fn(),
            onKey: vi.fn(),
            onPick: vi.fn(),
            registerCell: () => () => {},
          },
        ),
        french,
      );
    expect(expectSome(hostProp(cell(undefined, 0), "aria-label"))).toBe(
      "Code chiffre 1",
    );
    expect(expectSome(hostProp(cell("Vérification", 1), "aria-label"))).toBe(
      "Vérification chiffre 2",
    );
  });

  it("announces a busy action and an indeterminate bar in the caller's words", () => {
    const button = renderButton(
      { loading: true },
      testTheme,
      idle,
      false,
      french,
    );
    expect(expectSome(hostProp(button, "aria-description"))).toBe("Chargement");

    const [spinner] = elementChildren(button);
    expect(
      expectSome(elementProp(spinner ?? expect.fail("no spinner"), "label")),
    ).toBe("Chargement");
    expect(
      expectSome(
        hostProp(renderSpinner({}, testTheme, 0, french), "aria-label"),
      ),
    ).toBe("Chargement");
    expect(
      announced(renderProgress({ label: "Import" }, testTheme, 0, french)),
    ).toBe("chargement");

    expect(announced(renderProgress({ value: 42 }, testTheme, 0, french))).toBe(
      "42%",
    );
  });

  it("lets a caller's own loading word win over the table", () => {
    const button = renderButton(
      { loading: true, loadingLabel: "Enregistrement" },
      testTheme,
      idle,
      false,
      french,
    );
    expect(expectSome(hostProp(button, "aria-description"))).toBe(
      "Enregistrement",
    );
    expect(
      expectSome(
        hostProp(
          renderSpinner({ label: "Récupération" }, testTheme, 0, french),
          "aria-label",
        ),
      ),
    ).toBe("Récupération");
    expect(
      announced(
        renderProgress({ loadingText: "en cours" }, testTheme, 0, french),
      ),
    ).toBe("en cours");
  });
});

describe("a sentence a caller's table says nothing for", () => {
  it("names a range's ends from the shipped sentence", () => {
    expect(rangeThumbNames("Prix", silent.rangeEnd)).toEqual([
      "Prix minimum",
      "Prix maximum",
    ]);
    expect(rangeThumbNames("Prix", () => "   ")).toEqual([
      "Prix minimum",
      "Prix maximum",
    ]);
    expect(
      rangeThumbNames(
        "Prix",
        (label, end) => ` ${end === "start" ? "min" : "max"} ${label} `,
      ),
    ).toEqual(["min Prix", "max Prix"]);

    expect(rangeThumbNames("", french.rangeEnd)).toEqual([
      undefined,
      undefined,
    ]);
    expect(rangeThumbNames("   ", french.rangeEnd)).toEqual([
      undefined,
      undefined,
    ]);

    const range = renderRangeSlider(
      { label: "Prix" },
      testTheme,
      initValueState<readonly [number, number]>(
        Option.some([20, 60]),
        [0, 100],
      ),
      { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
      {
        onSpanChange: vi.fn(),
        registerTrack: () => () => {},
        registerThumb: () => () => {},
        onPointerDown: vi.fn(),
        onPointerMove: vi.fn(),
        onPointerUp: vi.fn(),
      },
      silent,
    );
    const provider = elementChildren(range)[0] ?? expect.fail("no parts");
    const rail = elementChildren(provider)[0] ?? expect.fail("no rail");
    const thumbs = Arr.filter(elementChildren(rail), (part) =>
      Option.contains(hostProp(part, "role"), "slider"),
    );
    expect(
      Arr.map(thumbs, (thumb) =>
        expectSome(hostPropString(thumb, "aria-label")),
      ),
    ).toEqual(["Prix minimum", "Prix maximum"]);
  });

  it("names each star from the shipped sentence", () => {
    const stars = (messages: PrimitiveMessages): ReadonlyArray<string> =>
      Arr.map(
        elementChildren(
          renderRating(
            { max: 3, allowHalf: true },
            testTheme,
            initValueState(Option.some(2.5), 0),
            { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
            {
              onSelect: vi.fn(),
              onMove: vi.fn(),
              registerItem: () => () => {},
            },
            undefined,
            messages,
          ),
        ),
        (star) => expectSome(hostPropString(star, "aria-label")),
      );
    expect(stars(silent)).toEqual(["1 of 3", "2 of 3", "3 of 3"]);
    expect(stars({ ...french, starName: () => "  " })).toEqual([
      "1 of 3",
      "2 of 3",
      "3 of 3",
    ]);
    expect(
      stars({ ...french, starName: (index, max) => ` ${index}/${max} ` }),
    ).toEqual(["1/3", "2/3", "3/3"]);
  });

  it("names each code cell from the shipped sentence", () => {
    const cells = (
      label: string | undefined,
      messages: PrimitiveMessages,
    ): ReadonlyArray<string> =>
      Arr.map(Arr.range(0, 1), (index) =>
        expectSome(
          hostPropString(
            renderOtpFieldInput(
              { index },
              otpFieldPart(
                { length: 2, label },
                testTheme,
                text("12"),
                {
                  focusedIndex: Option.none(),
                  onFocus: vi.fn(),
                  onBlur: vi.fn(),
                },
                {
                  onEdit: vi.fn(),
                  onKey: vi.fn(),
                  onPick: vi.fn(),
                  registerCell: () => () => {},
                },
              ),
              messages,
            ),
            "aria-label",
          ),
        ),
      );
    expect(cells("Vérification", silent)).toEqual([
      "Vérification digit 1",
      "Vérification digit 2",
    ]);
    expect(cells(undefined, silent)).toEqual(["Code digit 1", "Code digit 2"]);
    expect(
      cells("Vérification", {
        ...french,
        codeDigit: (index, label) => ` ${label ?? "Code"} ${index + 1} `,
      }),
    ).toEqual(["Vérification 1", "Vérification 2"]);
  });
});

const hollow: PrimitiveMessages = {
  ...french,
  selection: { checked: "", unchecked: "", mixed: "" },
  press: { pressed: "", notPressed: "" },
  star: { checked: "", half: "", unchecked: "" },
  scrollRegion: "",
  loading: { busy: "", indeterminate: "" },
};

describe("a state word a caller's table says nothing for", () => {
  it("answers the shipped word for the state that is blank", () => {
    expect(selectionWord("checked", hollow.selection)).toBe("checked");
    expect(selectionWord("unchecked", hollow.selection)).toBe("unchecked");
    expect(selectionWord("indeterminate", hollow.selection)).toBe("mixed");
    expect(pressWord(true, hollow.press)).toBe("pressed");
    expect(pressWord(false, hollow.press)).toBe("not pressed");
    expect(starWord("checked", hollow.star)).toBe("checked");
    expect(starWord("half", hollow.star)).toBe("half");
    expect(starWord("unchecked", hollow.star)).toBe("unchecked");

    expect(busyWord(hollow.loading)).toBe("Loading");
    expect(indeterminateWord(hollow.loading)).toBe("loading");

    expect(
      selectionWord("checked", {
        checked: "coché",
        unchecked: "",
        mixed: "partiel",
      }),
    ).toBe("coché");
    expect(
      selectionWord("indeterminate", {
        checked: "coché",
        unchecked: "",
        mixed: "partiel",
      }),
    ).toBe("partiel");

    expect(
      selectionWord("checked", {
        checked: "  coché  ",
        unchecked: "décoché",
        mixed: "partiel",
      }),
    ).toBe("coché");
    expect(
      busyWord({ busy: "  Chargement  ", indeterminate: "chargement" }),
    ).toBe("Chargement");
  });

  it("paints the shipped words on every control that carries one", () => {
    const box = (checked: boolean, indeterminate: boolean) =>
      renderCheckbox(
        { checked, indeterminate },
        testTheme,
        flag(checked),
        idle,
        vi.fn(),
        hollow,
      );
    expect(announced(box(true, false))).toBe("checked");
    expect(announced(box(false, true))).toBe("mixed");
    expect(announced(box(false, false))).toBe("unchecked");
    expect(
      announced(
        renderSwitch(
          { checked: false },
          testTheme,
          flag(false),
          idle,
          vi.fn(),
          hollow,
        ),
      ),
    ).toBe("unchecked");
    expect(
      announced(
        renderToggle({}, testTheme, flag(false), idle, vi.fn(), hollow),
      ),
    ).toBe("not pressed");
    const stars = elementChildren(
      renderRating(
        { max: 2, allowHalf: true },
        testTheme,
        initValueState(Option.some(0.5), 0),
        { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
        { onSelect: vi.fn(), onMove: vi.fn(), registerItem: () => () => {} },
        undefined,
        hollow,
      ),
    );
    expect(Arr.map(stars, announced)).toEqual(["half", "unchecked"]);

    expect(
      expectSome(
        hostProp(
          renderScrollAreaViewport(
            {},
            scrollPart({ axis: "vertical" }, testTheme),
            undefined,
            hollow,
          ),
          "aria-label",
        ),
      ),
    ).toBe("Scroll region");
    const button = renderButton(
      { loading: true },
      testTheme,
      idle,
      false,
      hollow,
    );
    expect(expectSome(hostProp(button, "aria-description"))).toBe("Loading");
    const [spinner] = elementChildren(button);
    expect(
      expectSome(elementProp(spinner ?? expect.fail("no spinner"), "label")),
    ).toBe("Loading");
    expect(
      expectSome(
        hostProp(renderSpinner({}, testTheme, 0, hollow), "aria-label"),
      ),
    ).toBe("Loading");
    expect(
      announced(renderProgress({ label: "Import" }, testTheme, 0, hollow)),
    ).toBe("loading");
  });

  it("keeps a busy prop's blank as the silence it documents", () => {
    const silentButton = renderButton(
      { loading: true, loadingLabel: "" },
      testTheme,
      idle,
      false,
      hollow,
    );
    expect(hostProp(silentButton, "aria-description")).toStrictEqual(
      Option.none(),
    );
    const [spinner] = elementChildren(silentButton);
    expect(
      hostProp(spinner ?? expect.fail("no spinner"), "aria-label"),
    ).toStrictEqual(Option.none());
  });
});

describe("a caller who names no words", () => {
  it("gets exactly the words the library shipped", () => {
    expect(
      announced(
        renderCheckbox({ checked: true }, testTheme, flag(true), idle, vi.fn()),
      ),
    ).toBe("checked");
    expect(
      announced(renderToggle({}, testTheme, flag(false), idle, vi.fn())),
    ).toBe("not pressed");
    expect(
      expectSome(
        hostProp(
          renderScrollAreaViewport(
            {},
            scrollPart({ axis: "vertical" }, testTheme),
          ),
          "aria-label",
        ),
      ),
    ).toBe("Scroll region");
    const stars = elementChildren(
      renderRating(
        { max: 2, allowHalf: true },
        testTheme,
        initValueState(Option.some(0.5), 0),
        { focusedIndex: Option.none(), onFocus: vi.fn(), onBlur: vi.fn() },
        { onSelect: vi.fn(), onMove: vi.fn(), registerItem: () => () => {} },
      ),
    );
    expect(
      Arr.map(stars, (star) => expectSome(hostProp(star, "aria-label"))),
    ).toEqual(["1 of 2", "2 of 2"]);
    expect(Arr.map(stars, announced)).toEqual(["half", "unchecked"]);

    const button = renderButton({ loading: true }, testTheme, idle);
    expect(expectSome(hostProp(button, "aria-description"))).toBe("Loading");
    expect(announced(renderProgress({}, testTheme, 0))).toBe("loading");
  });
});

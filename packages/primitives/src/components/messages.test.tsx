/**
 * The words a control announces, in the caller's language.
 *
 * The bug this suite guards: every state word was an English literal baked into
 * a component (`checked`/`mixed`, `pressed`, `Scroll region`, `Code digit 1`,
 * and a rating star's `checked`/`half`/`unchecked` plus its `N of max` name),
 * so a localised interface had no seam and heard English from its own controls —
 * the same defect `loadingLabel` fixed for the busy state. A per-control prop
 * would repeat one vocabulary at every instance, so the seam is a `messages`
 * table on the provider and the pure render functions take the resolved table as
 * their last argument. This file proves both halves that can be proved without a
 * window: the merge rule a nested provider relies on, and that **every** render
 * path announces the table it is handed. `runtime/messages.runtime.test.tsx`
 * proves the provider reaches them through `useMessages`.
 *
 * The default direction is held too: a caller who names no words gets exactly
 * what the library shipped, so adopting the seam changes no existing screen.
 */

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

/** A caller's table: the words a French interface announces. */
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

/**
 * A table whose three sentences answer nothing.
 *
 * A localised table is written once and indexed per row, so a row that was not
 * translated answers `""` — the same shape a formatter with no entry for one
 * value has. The sentences are the only names a star, a code cell and a range's
 * two thumbs have.
 */
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

/** The announced state word of an element. */
const announced = (element: ReactElement) =>
  expectSome(hostProp(element, "aria-valuetext"));

/** The announced state words of a group's option rows. */
const rows = (element: ReactElement) =>
  Arr.map(elementChildren(element), announced);

const groupHandlers = { onFocusMove: vi.fn(), registerItem: () => () => {} };

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("resolveMessages", () => {
  it("hands back the shipped table itself when nothing is overridden", () => {
    // A copy per provider would be a second table to compare; the shipped one
    // is the identity a caller who names no words should get.
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
    // The bug guarded: a nested provider that names only the words it changes
    // used to reset every other group, so a dialog's own vocabulary silenced the
    // page around it.
    const resolved = resolveMessages({ selection: french.selection }, french);
    expect(resolved.selection).toEqual(french.selection);
    expect(resolved.press).toEqual(french.press);
    expect(resolved.codeDigit(0, "Code")).toBe("Code chiffre 1");
  });

  it("keeps a key a forwarded table leaves undefined", () => {
    // The bug guarded: the merge spread the caller's keys over the inherited
    // table, so a group a caller forwarded as `undefined` (an optional prop it
    // never received) erased it. A localised tree dropped back to the shipped
    // English for that group, and the two keys that are sentences made their
    // component throw during render — `messages.starName is not a function`
    // from Rating and `messages.codeDigit is not a function` from OTPField —
    // which a window paints as an empty area, not an error. A key written
    // `undefined` inherits, the rule `extendTheme` applies to a theme's groups.
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
});

describe("every control announces the table it is handed", () => {
  it("names a range's two ends in the caller's sentence", () => {
    // The bug this guards: both thumb names were built as `<label> minimum` /
    // `<label> maximum` inside the component, so a localised range announced an
    // English suffix with no seam at all — not even a per-instance prop, unlike
    // the busy word. A sentence over the name is what a language that puts the
    // end first needs.
    expect(rangeThumbNames("Prix", french.rangeEnd)).toEqual([
      "minimum de Prix",
      "maximum de Prix",
    ]);
    // A blank group name names nothing, rather than " minimum".
    expect(rangeThumbNames(undefined, french.rangeEnd)).toEqual([
      undefined,
      undefined,
    ]);
    expect(rangeThumbNames("Price")).toEqual([
      "Price minimum",
      "Price maximum",
    ]);
    // The component asks the table for the sentence: the painted thumbs carry
    // the caller's words, not a suffix.
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
    // The bug this guards: a star's name was the template `"N of max"` and its
    // state was the fill vocabulary `checked`/`half`/`unchecked`, both English
    // literals inside the component, so a localised rating spoke English while
    // every other control followed the provider's table. A star's fill is not a
    // selection state — every star of a rated group is "checked" — which is why
    // it is its own group and its own sentence.
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
    // A non-focusable viewport is not a region at all, named or not.
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
    // The bug this guards: the busy word and the indeterminate word were the
    // only announced copy outside the table, so a French tree that named every
    // state word still heard "Loading" from each action and "loading" from each
    // bar until it repeated a prop on every instance.
    const button = renderButton(
      { loading: true },
      testTheme,
      idle,
      false,
      french,
    );
    expect(expectSome(hostProp(button, "aria-description"))).toBe("Chargement");
    // The busy spinner is handed the same word; its own case below proves the
    // word becomes the status name.
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
    // A determined bar reports a share, so the loading word cannot reach it.
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
    // The bug guarded: `rangeEnd` is a sentence the range calls with the
    // caller's own label, and a table with a missing row answers `""` — the
    // exact shape `spokenText` exists for. Both thumbs published an empty name,
    // so a reader heard two unnamed sliders. A blank answer is absence, so the
    // shipped sentence names the ends; a real answer is trimmed and used.
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
    // The group's own name is the other blank: a caller who has not named the
    // control names neither end, which is what the helper's own doc promises
    // and what `accessibleName` decides for every other name site.
    expect(rangeThumbNames("", french.rangeEnd)).toEqual([
      undefined,
      undefined,
    ]);
    expect(rangeThumbNames("   ", french.rangeEnd)).toEqual([
      undefined,
      undefined,
    ]);
    // The painted thumbs carry the fallback too, so the rule is not the
    // helper's alone.
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
    // The bug guarded, one control over: a star's `starName` answer was
    // published as it arrived, so a table with a missing row left every star of
    // the group an unnamed radio — a reader heard "checked" with no idea which
    // star. The shipped sentence is the fallback, and a real answer is trimmed.
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
    // The bug guarded, the third sentence: `codeDigit` is called per cell with
    // the field's own name, and a blank answer named every cell with nothing —
    // six unnamed inputs a reader can only count by pressing Tab. The field's
    // name still leads the shipped sentence, so the cells stay groupable.
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

/**
 * A table whose state words are there but blank.
 *
 * A translation is written once and filled per state, so a row nobody reached
 * is `""` — the same blank a formatter or a sentence answers, and the shape
 * every rule in this package reads as absence.
 */
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
    // The bug guarded: `selectionWord`, `pressWord` and `starWord` published a
    // caller's word as it arrived, so one state a localised table never reached
    // (`""`) announced **nothing** on `aria-valuetext` — the only channel this
    // runtime gives a checkbox, a switch, a toggle or a rating star, because it
    // has no `aria-checked`/`aria-pressed`. A blank answer is absence, the rule
    // `spokenText` already applies to a formatter and `spokenSentence` to a
    // sentence, so the shipped word stands; a real one is trimmed and used.
    expect(selectionWord("checked", hollow.selection)).toBe("checked");
    expect(selectionWord("unchecked", hollow.selection)).toBe("unchecked");
    expect(selectionWord("indeterminate", hollow.selection)).toBe("mixed");
    expect(pressWord(true, hollow.press)).toBe("pressed");
    expect(pressWord(false, hollow.press)).toBe("not pressed");
    expect(starWord("checked", hollow.star)).toBe("checked");
    expect(starWord("half", hollow.star)).toBe("half");
    expect(starWord("unchecked", hollow.star)).toBe("unchecked");
    // The loading words are the same kind of word: `busy` names a busy action
    // and its spinner, `indeterminate` is a bar's only report.
    expect(busyWord(hollow.loading)).toBe("Loading");
    expect(indeterminateWord(hollow.loading)).toBe("loading");
    // Resolution is per word, not per group: the rows a table did translate
    // keep the caller's language.
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
    // A real word is trimmed, the rule every name site follows.
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
    // A focusable scroller is a tab stop, and a tab stop with no name is one
    // assistive technology cannot describe — the defect `DEFAULT_SCROLL_NAME`
    // exists to prevent.
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
    // The opt-out is the **prop**, not the table: a blank `loadingLabel` is a
    // deliberate silence on an action whose own text still says what is
    // happening, while a blank table row is a missing translation. The two must
    // not collapse into one rule.
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
    // The compatibility direction: adopting the seam must not change a screen
    // that names nothing.
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
    // The loading words ship as the library's own English too.
    const button = renderButton({ loading: true }, testTheme, idle);
    expect(expectSome(hostProp(button, "aria-description"))).toBe("Loading");
    expect(announced(renderProgress({}, testTheme, 0))).toBe("loading");
  });
});

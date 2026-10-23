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
  defaultMessages,
  resolveMessages,
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
import { renderSwitch } from "./Switch.js";
import { renderToggle } from "./Toggle.js";
import { renderToggleGroup } from "./ToggleGroup.js";
import { expectSome, elementChildren, hostProp } from "./testing/element.js";

/** A caller's table: the words a French interface announces. */
const french: PrimitiveMessages = {
  selection: { checked: "coché", unchecked: "décoché", mixed: "partiel" },
  press: { pressed: "enfoncé", notPressed: "relâché" },
  star: { checked: "plein", half: "demi", unchecked: "vide" },
  starName: (index, max) => `étoile ${index} sur ${max}`,
  scrollRegion: "Zone de défilement",
  codeDigit: (index, label) => `${label ?? "Code"} chiffre ${index + 1}`,
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
      },
      french,
    );
    expect(resolved).toEqual(french);
    expect(resolved.starName(1, 2)).toBe("étoile 1 sur 2");
    expect(resolved.codeDigit(0, undefined)).toBe("Code chiffre 1");
  });
});

describe("every control announces the table it is handed", () => {
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
  });
});

/**
 * The field family's shared geometry (plan `372`).
 *
 * The bug guarded: plan `370` pinned `Input`/`TextArea` to shadcn's
 * new-york-v4 field recipe (36 high, 12 horizontal, radius 6, 14/20), but
 * `Select`'s trigger, `NumberField` and `OTPField`'s cells still resolved the
 * `comfortable` density metrics (32 high, 10 horizontal, 13/18), so a form that
 * put any two of them in a row painted two field heights 4 px apart. This table
 * proves the five text-entry surfaces read the one recipe, and pins the two
 * deliberate differences: `TextArea` has no single-line height (its rows own
 * the box) and `NumberField` hands its right edge to the steppers.
 */

import type { StyleDesc } from "@gpuix/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { fieldRecipeStyle } from "../core/recipes.js";
import { initValueState, type ValueState } from "../core/state.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { renderInput } from "./Input.js";
import type { FocusState } from "./internal.js";
import { renderNumberField, type NumberFieldHandlers } from "./NumberField.js";
import {
  renderOtpField,
  type OTPFieldFocus,
  type OTPFieldHandlers,
} from "./OTPField.js";
import { selectTriggerStyle } from "./Select.js";
import { renderTextArea } from "./TextArea.js";
import {
  elementChildren,
  expectSome,
  hostStyleRecord,
} from "./testing/element.js";

/** The properties this table compares; every field chrome has them. */
interface SurfaceGeometry {
  readonly height?: unknown;
  readonly width?: unknown;
  readonly paddingLeft?: unknown;
  readonly paddingRight?: unknown;
  readonly fontSize?: unknown;
  readonly lineHeight?: unknown;
  readonly borderRadius?: unknown;
  readonly borderWidth?: unknown;
  readonly justifyContent?: unknown;
  readonly textAlign?: unknown;
  readonly display?: unknown;
  readonly flexDirection?: unknown;
}

const geometryOf = (style: Record<string, unknown>): SurfaceGeometry => ({
  height: style["height"],
  width: style["width"],
  paddingLeft: style["paddingLeft"],
  paddingRight: style["paddingRight"],
  fontSize: style["fontSize"],
  lineHeight: style["lineHeight"],
  borderRadius: style["borderRadius"],
  borderWidth: style["borderWidth"],
  justifyContent: style["justifyContent"],
  textAlign: style["textAlign"],
  display: style["display"],
  flexDirection: style["flexDirection"],
});

const idle: FocusState = { focused: false, onFocus: vi.fn(), onBlur: vi.fn() };
const text = (value: string): ValueState<string> =>
  initValueState(Option.some(value), "");

const otpFocus: OTPFieldFocus = {
  focusedIndex: Option.none(),
  onFocus: vi.fn(),
  onBlur: vi.fn(),
};
const otpHandlers: OTPFieldHandlers = {
  onEdit: vi.fn(),
  onKey: vi.fn(),
  onPick: vi.fn(),
  registerCell: () => () => {},
};
const numberHandlers: NumberFieldHandlers = {
  onTextChange: vi.fn(),
  onCommit: vi.fn(),
  onBlurCommit: vi.fn(),
  onValue: vi.fn(),
  registerInput: () => {},
};

const rendered = (element: ReactElement): SurfaceGeometry =>
  geometryOf(expectSome(hostStyleRecord(element)));

const renderOtp = (): ReactElement =>
  renderOtpField(
    { label: "Code", length: 2 },
    testTheme,
    text("1"),
    otpFocus,
    otpHandlers,
  );

const otpCell = (): SurfaceGeometry =>
  rendered(expectSome(Arr.head(elementChildren(renderOtp()))));

const renderNumber = (style?: StyleDesc): ReactElement =>
  renderNumberField(
    { label: "Count", style },
    testTheme,
    initValueState(Option.some(1), 0),
    "1",
    idle,
    numberHandlers,
  );

/** Every text-entry surface's resting chrome, by name. */
const SURFACES: ReadonlyArray<{
  readonly name: string;
  readonly geometry: () => SurfaceGeometry;
}> = [
  {
    name: "Input",
    geometry: () =>
      rendered(
        renderInput({ label: "Name" }, testTheme, text(""), idle, () => {}),
      ),
  },
  { name: "NumberField", geometry: () => rendered(renderNumber()) },
  {
    name: "Select",
    geometry: () =>
      selectTriggerStyle(
        {},
        testTheme,
      )({
        open: false,
        disabled: false,
        placeholder: false,
        focused: false,
      }),
  },
  { name: "OTPField", geometry: otpCell },
  {
    name: "TextArea",
    geometry: () =>
      rendered(
        renderTextArea({ label: "Notes" }, testTheme, text(""), idle, () => {}),
      ),
  },
];

const geometry = (name: string): SurfaceGeometry =>
  expectSome(
    Option.map(
      Arr.findFirst(SURFACES, (surface) => surface.name === name),
      (surface) => surface.geometry(),
    ),
  );

describe("the field family", () => {
  const recipe = fieldRecipeStyle(
    { focused: false, invalid: false, disabled: false },
    testTheme,
  );

  it.each(Arr.map(SURFACES, (surface) => [surface.name, surface] as const))(
    "%s reads the field recipe's type, radius and border",
    (_name, surface) => {
      const style = surface.geometry();
      expect(style.fontSize).toBe(recipe.fontSize);
      expect(style.lineHeight).toBe(recipe.lineHeight);
      expect(style.borderRadius).toBe(recipe.borderRadius);
      expect(style.borderWidth).toBe(recipe.borderWidth);
    },
  );

  it("paints one height on every editable box", () => {
    // Before plan 372 these were 32 and the recipe was 36.
    const heights = Arr.map(
      Arr.filter(SURFACES, (surface) => surface.name !== "TextArea"),
      (surface) => surface.geometry().height,
    );
    expect(heights).toStrictEqual([36, 36, 36, 36]);
  });

  it("leaves a TextArea's height to its rows", () => {
    const area = rendered(
      renderTextArea(
        { label: "Notes", minRows: 3 },
        testTheme,
        text(""),
        idle,
        () => {},
      ),
    );
    expect(area.height).toBeUndefined();
  });

  it("keeps the field's horizontal padding, with two named exceptions", () => {
    expect(geometry("Input").paddingLeft).toBe(12);
    expect(geometry("Select").paddingLeft).toBe(12);
    // The steppers own the right edge; the left edge stays a field's.
    expect(geometry("NumberField").paddingLeft).toBe(12);
    expect(geometry("NumberField").paddingRight).toBe(0);
    expect(geometry("OTPField").paddingLeft).toBe(0);
  });

  it("hugs the select's trigger and keeps its value at the far edge", () => {
    // The recipe is `w-full`; a select hugs unless the caller asks for
    // `fullWidth` (plan 372). This pins the one property the recipe forced us
    // to clear — and the prop that still sets it.
    const trigger = geometry("Select");
    expect(trigger.width).toBeUndefined();
    expect(trigger.justifyContent).toBe("space-between");
    const stretched = selectTriggerStyle(
      { fullWidth: true },
      testTheme,
    )({
      open: false,
      disabled: false,
      placeholder: false,
      focused: false,
    });
    expect(stretched.width).toBe("100%");
  });

  it("makes an OTP cell square and centres its digit", () => {
    const cell = geometry("OTPField");
    expect(cell.width).toBe(cell.height);
    expect(cell.width).toBe(36);
    expect(cell.textAlign).toBe("center");
  });

  it("lays the number field out as a row", () => {
    const number = geometry("NumberField");
    expect(number.display).toBe("flex");
    expect(number.flexDirection).toBe("row");
  });

  it("still lets the caller's style win last", () => {
    expect(rendered(renderNumber({ height: 120 })).height).toBe(120);
  });
});

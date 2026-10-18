/**
 * The first shadcn conformance slice (plan `370`).
 *
 * The bug guarded: `Input`/`TextArea` and `Button` used the invented
 * `comfortable` density metrics (32 px high, 10 px horizontal, 13/18 label)
 * instead of the new-york-v4 recipes (36 / 12 / 4 / 6 / 14/20, and the button's
 * `h-9 px-4 py-2` family). `@gpuixui/tw` already proves the compiler; these
 * cases prove the primitive **consumes** it: the resolved chrome equals the
 * compiler's output for the same class string, and the focus/invalid/disabled
 * buckets reach the field.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { alpha } from "@gpuixui/tokens";
import {
  BUTTON_BASE,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  INPUT_BASE,
  INPUT_FOCUS,
  INPUT_INVALID,
  classesToStyle,
} from "@gpuixui/tw";
import {
  buttonRecipeRing,
  buttonRecipeStyle,
  fieldRecipeStyle,
  fieldRowStyle,
  squareFieldRecipeStyle,
} from "./recipes.js";
import { testTheme } from "./testing/theme.fixture.js";

const resting = { focused: false, invalid: false, disabled: false };

const compilerInput = classesToStyle(
  `${INPUT_BASE} ${INPUT_FOCUS} ${INPUT_INVALID}`,
  testTheme,
);

/** The geometry and type a field must take from the recipe. */
const GEOMETRY = [
  "height",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
  "borderRadius",
  "borderWidth",
  "fontSize",
  "lineHeight",
  "width",
  "minWidth",
] as const;

describe("the Input recipe", () => {
  it("resolves shadcn's 36 / 12 / 4 / 6 / 14/20 through the compiler", () => {
    const style = fieldRecipeStyle(resting, testTheme);
    Arr.forEach(GEOMETRY, (key) => {
      expect(style[key]).toStrictEqual(compilerInput.style[key]);
    });
    expect(style.height).toBe(36);
    expect(style.paddingLeft).toBe(12);
    expect(style.paddingRight).toBe(12);
    expect(style.paddingTop).toBe(4);
    expect(style.paddingBottom).toBe(4);
    expect(style.borderRadius).toBe(6);
    expect(style.fontSize).toBe(14);
    expect(style.lineHeight).toBe(20);
    expect(style.width).toBe("100%");
  });

  it("keeps the token fill and text role over the recipe's transparent bg", () => {
    const style = fieldRecipeStyle(resting, testTheme);
    expect(style.backgroundColor).toBe(testTheme.colors.input);
    expect(style.color).toBe(testTheme.colors.inputForeground);
    expect(style.hover?.borderColor).toBe(testTheme.colors.borderStrong);
    expect(style.active?.borderColor).toBe(testTheme.colors.ring);
  });

  it("takes focus, invalid and disabled from the returned buckets", () => {
    const focused = fieldRecipeStyle({ ...resting, focused: true }, testTheme);
    expect(focused.borderColor).toBe(compilerInput.focus.borderColor);
    expect(focused.boxShadow).toStrictEqual(compilerInput.focus.boxShadow);
    expect(focused.boxShadow?.spreadRadius).toBe(3);
    expect(focused.boxShadow?.color).toBe(alpha(testTheme.colors.ring, 0.5));

    const invalid = fieldRecipeStyle({ ...resting, invalid: true }, testTheme);
    expect(invalid.borderColor).toBe(testTheme.colors.destructive);
    expect(invalid.boxShadow).toStrictEqual(compilerInput.invalid.boxShadow);

    const disabled = fieldRecipeStyle(
      { ...resting, disabled: true },
      testTheme,
    );
    expect(disabled.opacity).toBe(0.5);
    expect(disabled.pointerEvents).toBe("none");
    expect(disabled.cursor).toBe("not-allowed");
  });

  it("keeps the error cue when an invalid field is focused", () => {
    const both = fieldRecipeStyle(
      { focused: true, invalid: true, disabled: false },
      testTheme,
    );
    // Invalid is applied after focus, so the destructive boundary survives the
    // caret (the rule plan 091 established, now expressed by the buckets). The
    // soft `aria-invalid:ring-destructive/20` is a colour-only ring in its own
    // bucket, which the compiler cannot give a width; the focus ring is the one
    // that paints (recorded as a `packages/tw` gap in `TODO.md`).
    expect(both.borderColor).toBe(testTheme.colors.destructive);
    expect(both.boxShadow).toStrictEqual(compilerInput.focus.boxShadow);
    expect(compilerInput.invalid.boxShadow).toBeUndefined();
  });

  it("drops no ring on a disabled field that still holds focus", () => {
    const style = fieldRecipeStyle(
      { focused: true, invalid: false, disabled: true },
      testTheme,
    );
    expect(style.boxShadow).toStrictEqual(compilerInput.style.boxShadow);
  });
});

describe("the square field (an OTP cell)", () => {
  it("is the field's height, as wide as it is high", () => {
    // The bug guarded (plan 372): `otpCellStyle` resolved `controlStyle`'s
    // density square (32 at `md`, 13/18 type) beside a 36-high Input.
    const style = squareFieldRecipeStyle(resting, testTheme);
    expect(style.height).toBe(36);
    expect(style.width).toBe(36);
    expect(style.minWidth).toBe(36);
    expect(style.paddingLeft).toBe(0);
    expect(style.paddingRight).toBe(0);
    expect(style.borderRadius).toBe(compilerInput.style.borderRadius);
    expect(style.fontSize).toBe(compilerInput.style.fontSize);
    expect(style.lineHeight).toBe(compilerInput.style.lineHeight);
    expect(style.justifyContent).toBe("center");
    expect(style.textAlign).toBe("center");
  });

  it("keeps the field's focus, invalid and disabled buckets", () => {
    const focused = squareFieldRecipeStyle(
      { ...resting, focused: true },
      testTheme,
    );
    expect(focused.boxShadow).toStrictEqual(compilerInput.focus.boxShadow);

    const invalid = squareFieldRecipeStyle(
      { ...resting, invalid: true },
      testTheme,
    );
    expect(invalid.borderColor).toBe(testTheme.colors.destructive);

    const disabled = squareFieldRecipeStyle(
      { ...resting, disabled: true },
      testTheme,
    );
    expect(disabled.opacity).toBe(0.5);
    expect(disabled.pointerEvents).toBe("none");
    expect(disabled.boxShadow).toBeUndefined();
  });
});

describe("a field-shaped row", () => {
  it("supplies the row layout a flat recipe box has no use for", () => {
    // A `Select` trigger and a `NumberField` carry the field's chrome but are
    // rows, not native inputs; the recipe describes a flat box.
    expect(fieldRowStyle).toStrictEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    });
  });
});

describe("the Button recipe", () => {
  const chrome = (
    variant: Parameters<typeof buttonRecipeStyle>[0]["variant"],
    size: Parameters<typeof buttonRecipeStyle>[0]["size"],
    extra: Partial<Parameters<typeof buttonRecipeStyle>[0]> = {},
  ) =>
    buttonRecipeStyle(
      {
        variant,
        size,
        square: false,
        fullWidth: false,
        disabled: false,
        focused: false,
        ...extra,
      },
      testTheme,
    );

  const compiled = (
    size: keyof typeof BUTTON_SIZES,
    variant: keyof typeof BUTTON_VARIANTS = "default",
  ) =>
    classesToStyle(
      `${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]}`,
      testTheme,
    );

  it("resolves base + size + variant to shadcn's metrics", () => {
    const md = chrome("primary", "md");
    const tw = compiled("default").style;
    Arr.forEach(
      [
        "height",
        "paddingLeft",
        "paddingTop",
        "gap",
        "borderRadius",
        "fontSize",
        "lineHeight",
      ] as const,
      (key) => {
        expect(md[key]).toStrictEqual(tw[key]);
      },
    );
    expect(md.height).toBe(36);
    expect(md.paddingLeft).toBe(16);
    expect(md.paddingTop).toBe(8);
    expect(md.paddingRight).toBe(16);
    expect(md.gap).toBe(8);
    expect(md.fontSize).toBe(14);

    expect(chrome("primary", "sm").height).toBe(32);
    expect(chrome("primary", "sm").paddingLeft).toBe(12);
    expect(chrome("primary", "lg").height).toBe(40);
    expect(chrome("primary", "lg").paddingLeft).toBe(24);
  });

  it("sizes a square button from the icon table", () => {
    const icon = chrome("primary", "md", { square: true });
    expect(icon.width).toBe(36);
    expect(icon.height).toBe(36);
    expect(chrome("primary", "sm", { square: true }).height).toBe(32);
    expect(chrome("primary", "lg", { square: true }).height).toBe(40);
  });

  it("keeps the token paint for every variant", () => {
    const destructive = chrome("destructive", "md");
    // The recipe's `text-white` is a literal; the theme owns the role.
    expect(destructive.color).toBe(testTheme.colors.destructiveForeground);
    expect(destructive.backgroundColor).toBe(testTheme.colors.destructive);

    const outline = chrome("outline", "md");
    expect(outline.borderWidth).toBe(1);
    expect(outline.borderColor).toBe(testTheme.colors.border);
  });

  it("takes focus and disabled from the returned buckets", () => {
    const focused = chrome("primary", "md", { focused: true });
    expect(focused.boxShadow).toStrictEqual(
      compiled("default").focus.boxShadow,
    );
    expect(focused.boxShadow?.spreadRadius).toBe(3);
    expect(buttonRecipeRing(testTheme)).toStrictEqual(
      compiled("default").focus.boxShadow,
    );

    const disabled = chrome("primary", "md", { disabled: true });
    expect(disabled.opacity).toBe(0.5);
    expect(disabled.pointerEvents).toBe("none");
    expect(disabled.cursor).toBe("not-allowed");
  });

  it("keeps the label out of a text selection", () => {
    // Plan 386: the runtime's root is selectable, so chrome has to opt out.
    expect(chrome("primary", "md").userSelect).toBe("none");
    expect(chrome("primary", "sm", { square: true }).userSelect).toBe("none");
    expect(chrome("primary", "md", { disabled: true }).userSelect).toBe("none");
  });

  it("lets an explicit radius and full width win over the recipe", () => {
    expect(chrome("primary", "md", { radius: "lg" }).borderRadius).toBe(
      testTheme.radius.lg,
    );
    expect(chrome("primary", "md", { fullWidth: true }).width).toBe("100%");
  });
});

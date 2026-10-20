/**
 * The recipe → `StyleDesc` equivalence guard.
 *
 * The migration moved the resting appearance of Button, Input, Text and Stack
 * from `core/style.ts`'s imperative resolvers to Tailwind class strings compiled
 * through `@gpuixui/tw`. This suite proves the two expressions agree: for every
 * variant, size and modifier, the compiled recipe equals what the pre-migration
 * resolver produced.
 *
 * Exact equality is achievable because the primitives' recipe uses theme-scale
 * utilities (`h-md`, `gap-sm`, `type-label`) instead of shadcn's fixed metrics
 * (`h-9`, `gap-2`, `text-sm`): control height and padding come from the active
 * density, gap from the spacing scale, type from the typography scale, exactly
 * as `controlStyle` did. `toEqual` ignores the oracle's `undefined`-valued keys
 * (`backgroundColor: undefined` on a borderless variant), which the recipe
 * simply omits — no border, no fill.
 *
 * A regression in either side fails here: change a recipe string or a resolver
 * and the two drift.
 */

import { describe, expect, it } from "vitest";
import type { StyleDesc } from "@gpuix/react";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import type { ControlSize } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import {
  controlStyle,
  fieldTextStyle,
  textStyle,
  type TextSpec,
} from "../core/style.js";
import { stackStyle, type StackSpec } from "../core/layout.js";
import type { PrimitiveTheme, TextRole } from "../core/theme.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  BUTTON_VARIANTS,
  buttonVariants,
  fieldVariant,
  type ButtonVariant,
} from "../core/variants.js";
import { mergeStyle } from "../components/internal.js";
import { buttonClass, fieldClass, stackClass, textClass } from "./index.js";
import { recipeTw } from "./registry.js";

const SIZES: ReadonlyArray<ControlSize> = ["sm", "md", "lg"];

/** The field's resting chrome, as `fieldChrome` resolved it before the migration. */
const fieldOracle = (
  theme: PrimitiveTheme,
  size: ControlSize,
  over: {
    readonly invalid?: boolean;
    readonly disabled?: boolean;
    readonly fullWidth?: boolean;
  } = {},
): StyleDesc =>
  mergeStyle(
    mergeStyle(
      controlStyle({ variant: fieldVariant, size, ...over }, theme),
      fieldTextStyle(theme),
    ),
    over.disabled === true ? { cursor: "not-allowed" } : undefined,
  );

const button = (variant: ButtonVariant, size: ControlSize) =>
  recipeTw.classesToStyle(buttonClass(variant, size), testTheme).style;

const buttonOracle = (variant: ButtonVariant, size: ControlSize) =>
  controlStyle({ variant: buttonVariants[variant], size }, testTheme);

describe("Button recipe", () => {
  it("matches controlStyle for every variant and size", () => {
    Arr.forEach(BUTTON_VARIANTS, (variant) => {
      Arr.forEach(SIZES, (size) => {
        expect(button(variant, size)).toEqual(buttonOracle(variant, size));
      });
    });
  });

  it("matches the square and full-width shapes", () => {
    const square = recipeTw.classesToStyle(
      buttonClass("primary", "md", { square: true }),
      testTheme,
    ).style;
    expect(square).toEqual(
      controlStyle(
        { variant: buttonVariants.primary, size: "md", square: true },
        testTheme,
      ),
    );
    const full = recipeTw.classesToStyle(
      buttonClass("primary", "md", { fullWidth: true }),
      testTheme,
    ).style;
    expect(full).toEqual(
      controlStyle(
        { variant: buttonVariants.primary, size: "md", fullWidth: true },
        testTheme,
      ),
    );
  });

  it("resolves the semantic roles against the shipped themes", () => {
    const light = recipeTw.classesToStyle(
      buttonClass("primary", "md"),
      lightTheme,
    );
    const dark = recipeTw.classesToStyle(
      buttonClass("primary", "md"),
      darkTheme,
    );
    expect(light.style.backgroundColor).toBe(lightTheme.colors.primary);
    expect(light.style.color).toBe(lightTheme.colors.primaryForeground);
    expect(dark.style.backgroundColor).toBe(darkTheme.colors.primary);
    expect(dark.style.color).toBe(darkTheme.colors.primaryForeground);
    expect(light.style.backgroundColor).not.toBe(dark.style.backgroundColor);
  });
});

describe("Input recipe", () => {
  it("matches the resting chrome for every size", () => {
    Arr.forEach(SIZES, (size) => {
      expect(
        recipeTw.classesToStyle(fieldClass({ size }), testTheme).style,
      ).toEqual(fieldOracle(testTheme, size));
    });
  });

  it("routes invalid to the destructive bucket", () => {
    const resolved = recipeTw.classesToStyle(
      fieldClass({ size: "md", invalid: true }),
      testTheme,
    );
    expect(resolved.invalid).toEqual({
      backgroundColor: testTheme.colors.destructive,
      borderColor: testTheme.colors.destructive,
    });
    expect(mergeStyle(resolved.style, resolved.invalid).backgroundColor).toBe(
      fieldOracle(testTheme, "md", { invalid: true }).backgroundColor,
    );
  });

  it("routes disabled opacity and cursor to their bucket", () => {
    const resolved = recipeTw.classesToStyle(
      fieldClass({ size: "md" }),
      testTheme,
    );
    expect(resolved.disabled).toEqual({
      opacity: 0.5,
      cursor: "not-allowed",
    });
  });

  it("keeps the full-width field a whole line", () => {
    const resolved = recipeTw.classesToStyle(
      fieldClass({ size: "md", fullWidth: true }),
      testTheme,
    );
    expect(resolved.style.width).toBe("100%");
  });
});

describe("Text recipe", () => {
  const roles: ReadonlyArray<TextRole> = [
    "display",
    "h1",
    "h2",
    "h3",
    "body",
    "bodyStrong",
    "label",
    "caption",
    "code",
    "codeBlock",
  ];

  it("matches textStyle for every role and tone", () => {
    Arr.forEach(roles, (role) => {
      Arr.forEach(
        ["default", "muted", "primary", "destructive", "inherit"] as const,
        (tone) => {
          const spec: TextSpec = { role, tone };
          expect(
            recipeTw.classesToStyle(textClass({ role, tone }), testTheme).style,
          ).toEqual(textStyle(spec, testTheme));
        },
      );
    });
  });

  it("matches the align, truncate, clamp and select modifiers", () => {
    const cases: ReadonlyArray<TextSpec> = [
      { role: "body", tone: "default", align: "center" },
      { role: "body", tone: "default", align: "end" },
      { role: "body", tone: "default", truncate: true },
      { role: "body", tone: "default", clamp: 3 },
      { role: "body", tone: "default", selectable: true },
    ];
    Arr.forEach(cases, (spec) => {
      expect(
        recipeTw.classesToStyle(
          textClass({
            role: spec.role,
            tone: spec.tone,
            align: spec.align,
            truncate: spec.truncate,
            clamp: spec.clamp,
            selectable: spec.selectable,
          }),
          testTheme,
        ).style,
      ).toEqual(textStyle(spec, testTheme));
    });
  });
});

describe("Stack recipe", () => {
  it("matches stackStyle across the layout axes", () => {
    const cases: ReadonlyArray<StackSpec> = [
      { direction: "row" },
      { direction: "column", gap: "lg" },
      { direction: "row", gap: "sm", align: "center", justify: "between" },
      { direction: "column", align: "stretch", justify: "end" },
      { direction: "row", wrap: true, grow: true },
      { direction: "column", fullWidth: true, fullHeight: true },
      { direction: "row", align: "baseline", justify: "around" },
    ];
    Arr.forEach(cases, (spec) => {
      expect(
        recipeTw.classesToStyle(stackClass(spec), testTheme).style,
      ).toEqual(stackStyle(spec, testTheme));
    });
  });

  it("resolves the gap from the spacing scale, not a fixed value", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      spacing: { ...testTheme.spacing, sm: 99 },
    };
    expect(
      recipeTw.classesToStyle(
        stackClass({ direction: "row", gap: "sm" }),
        repainted,
      ).style.gap,
    ).toBe(99);
  });
});

describe("the recipe stays one expression, not a stub", () => {
  it("changes when the resolver's decision changes", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      colors: { ...testTheme.colors, primary: "#FF00FF" },
    };
    expect(button("primary", "md").backgroundColor).toBe(
      testTheme.colors.primary,
    );
    expect(
      recipeTw.classesToStyle(buttonClass("primary", "md"), repainted).style
        .backgroundColor,
    ).toBe("#FF00FF");
  });

  it("registers no unsupported classes for the four recipes", () => {
    const joined = [
      buttonClass("primary", "md"),
      fieldClass({ size: "md", invalid: true, fullWidth: true }),
      textClass({ role: "code", tone: "muted", truncate: true }),
      stackClass({ direction: "column", gap: "lg" }),
    ];
    const unsupported = Arr.flatMap(
      joined,
      (className) => recipeTw.classesToStyle(className, testTheme).unsupported,
    );
    expect(unsupported).toStrictEqual([]);
  });
});

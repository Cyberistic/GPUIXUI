/**
 * The recipe → `StyleDesc` equivalence guard.
 *
 * The migration moved the resting appearance of the primitives from
 * `core/style.ts`'s / `core/layout.ts`'s imperative resolvers to Tailwind class
 * strings compiled through `@gpuixui/tw`. This suite proves the two expressions
 * agree: for every variant, size and modifier, the compiled recipe equals what
 * the pre-migration resolver produced.
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
import {
  contrastFloors,
  contrastRatio,
  darkTheme,
  lightTheme,
} from "@gpuixui/tokens";
import type { ControlSize } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import {
  controlStyle,
  fieldTextStyle,
  otpCellStyle,
  otpGroupStyle,
  ratingStarStyle,
  ruleStyle,
  scrollStyle,
  surfaceStyle,
  textStyle,
  type TextSpec,
} from "../core/style.js";
import {
  boxStyle,
  gridStyle,
  stackStyle,
  type BoxSpec,
  type GridSpec,
  type StackSpec,
} from "../core/layout.js";
import type { PrimitiveTheme, TextRole } from "../core/theme.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import {
  BUTTON_VARIANTS,
  buttonVariants,
  fieldVariant,
  TOGGLE_VARIANTS,
  toggleVariants,
  type ButtonVariant,
  type ToggleVariant,
} from "../core/variants.js";
import { mergeStyle, suppressFeedback } from "../components/internal.js";
import {
  boxClass,
  buttonClass,
  buttonGroupClass,
  fieldClass,
  fieldSquareClass,
  gridClass,
  otpGroupClass,
  ratingGroupClass,
  ratingStarClass,
  scrollClass,
  selectContentClass,
  selectItemClass,
  selectTriggerClass,
  separatorClass,
  stackClass,
  textClass,
  toggleClass,
  tooltipClass,
} from "./index.js";
import { recipeTw } from "./registry.js";

const SIZES: ReadonlyArray<ControlSize> = ["sm", "md", "lg"];

/** The field's resting chrome, as `fieldChrome` resolved it before the migration. */
const fieldOracle = (theme: PrimitiveTheme, size: ControlSize): StyleDesc =>
  mergeStyle(
    controlStyle({ variant: fieldVariant, size }, theme),
    fieldTextStyle(theme),
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

  /**
   * A failed validation is an edge, not a fill: `destructive` is designed to
   * carry `destructiveForeground`, so painting it behind the value left the
   * text at 2.45:1 in the dark theme. The regression this guards is the solid
   * destructive box the recipe used to merge in.
   */
  it("takes the destructive edge and keeps the field's own fill", () => {
    const resolved = recipeTw.classesToStyle(
      fieldClass({ size: "md", invalid: true }),
      testTheme,
    );
    expect(resolved.invalid).toEqual({
      borderColor: testTheme.colors.destructive,
    });
    expect(mergeStyle(resolved.style, resolved.invalid).backgroundColor).toBe(
      testTheme.colors.input,
    );
  });

  it("keeps an invalid field's value above the body floor", () => {
    Arr.forEach([lightTheme, darkTheme] as const, (theme) => {
      const resolved = recipeTw.classesToStyle(
        fieldClass({ size: "md", invalid: true }),
        theme,
      );
      const painted = mergeStyle(resolved.style, resolved.invalid);
      const fill =
        painted.backgroundColor ?? expect.fail("the invalid field had no fill");
      expect(
        contrastRatio(theme.colors.inputForeground, fill) ?? 0,
      ).toBeGreaterThanOrEqual(contrastFloors.body);
      // The premise: the fill the recipe used to paint cannot carry the value.
      expect(
        contrastRatio(theme.colors.inputForeground, theme.colors.destructive) ??
          Infinity,
      ).toBeLessThan(contrastFloors.body);
    });
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

describe("Grid recipe", () => {
  it("matches gridStyle across the track layouts", () => {
    const cases: ReadonlyArray<GridSpec> = [
      { columns: 1 },
      { columns: 12 },
      { columns: 3, gap: "md" },
      { columns: 12, rows: 2, gap: "lg" },
      { columns: 2, rows: 6 },
      { columns: 4, rows: 3, gap: "sm", grow: true },
      // clamps and floors exactly as the resolver did
      { columns: 0 },
      { columns: 2.9 },
      { columns: 1, rows: 0 },
    ];
    Arr.forEach(cases, (spec) => {
      expect(recipeTw.classesToStyle(gridClass(spec), testTheme).style).toEqual(
        gridStyle(spec, testTheme),
      );
    });
  });

  it("reads the gap from the spacing scale, not a fixed value", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      spacing: { ...testTheme.spacing, sm: 99 },
    };
    expect(
      recipeTw.classesToStyle(gridClass({ columns: 3, gap: "sm" }), repainted)
        .style.gap,
    ).toBe(99);
  });

  it("rejects an arbitrary template instead of resolving it", () => {
    const result = recipeTw.classesToStyle(
      "grid-cols-[repeat(3,minmax(0,1fr))]",
      testTheme,
    );
    expect(result.style.gridTemplateColumns).toBeUndefined();
    expect(result.unsupported).toContain("grid-cols-[repeat(3,minmax(0,1fr))]");
  });
});

describe("Box recipe", () => {
  it("matches boxStyle across surfaces and layout facts", () => {
    const cases: ReadonlyArray<BoxSpec> = [
      { tone: "none" },
      { tone: "background", padding: "md", radius: "lg" },
      { tone: "card", border: true },
      { tone: "popover", radius: "md", border: true, elevation: "overlay" },
      { tone: "muted", elevation: "md" },
      { tone: "accent", grow: true },
      { tone: "selected", shrink: true, fullWidth: true },
      { tone: "skeleton", fullHeight: true },
    ];
    Arr.forEach(cases, (spec) => {
      expect(recipeTw.classesToStyle(boxClass(spec), testTheme).style).toEqual(
        boxStyle(spec, testTheme),
      );
    });
  });

  it("reads the surface role from the theme, not a fixed value", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      colors: { ...testTheme.colors, card: "#ABCDEF" },
    };
    expect(
      recipeTw.classesToStyle(boxClass({ tone: "card" }), repainted).style
        .backgroundColor,
    ).toBe("#ABCDEF");
  });
});

describe("Toggle recipe", () => {
  it("matches controlStyle for every variant, state and size", () => {
    Arr.forEach(TOGGLE_VARIANTS, (variant: ToggleVariant) => {
      Arr.forEach([false, true] as const, (pressed) => {
        Arr.forEach(SIZES, (size) => {
          const spec = {
            variant: pressed
              ? toggleVariants[variant].pressed
              : toggleVariants[variant].rest,
            size,
          };
          expect(
            recipeTw.classesToStyle(
              toggleClass(variant, pressed, size),
              testTheme,
            ).style,
          ).toEqual(controlStyle(spec, testTheme));
        });
      });
    });
  });

  it("reads the accent role from the theme while pressed", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      colors: { ...testTheme.colors, accent: "#112233" },
    };
    expect(
      recipeTw.classesToStyle(toggleClass("default", true, "md"), repainted)
        .style.backgroundColor,
    ).toBe("#112233");
  });
});

describe("Separator recipe", () => {
  it("matches ruleStyle for both orientations and insets", () => {
    Arr.forEach(["horizontal", "vertical"] as const, (orientation) => {
      Arr.forEach([undefined, "sm", "lg"] as const, (inset) => {
        expect(
          recipeTw.classesToStyle(separatorClass(orientation, inset), testTheme)
            .style,
        ).toEqual(ruleStyle({ orientation, inset }, testTheme));
      });
    });
  });
});

describe("ScrollArea recipe", () => {
  it("matches scrollStyle for each axis", () => {
    Arr.forEach(["vertical", "horizontal", "both"] as const, (axis) => {
      expect(
        recipeTw.classesToStyle(scrollClass(axis), testTheme).style,
      ).toEqual(scrollStyle({ axis }));
    });
  });
});

describe("ButtonGroup recipe", () => {
  it("matches the attached and separated layouts", () => {
    expect(
      recipeTw.classesToStyle(buttonGroupClass("attached", "sm"), testTheme)
        .style,
    ).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 0,
      borderRadius: testTheme.radius.md,
      overflow: "hidden",
    });
    expect(
      recipeTw.classesToStyle(buttonGroupClass("separated", "sm"), testTheme)
        .style,
    ).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: testTheme.spacing.sm,
    });
  });
});

describe("OTP recipe", () => {
  it("matches otpGroupStyle", () => {
    expect(recipeTw.classesToStyle(otpGroupClass, testTheme).style).toEqual(
      otpGroupStyle(testTheme),
    );
  });

  it("matches otpCellStyle for every size and invalid state", () => {
    Arr.forEach(SIZES, (size) => {
      Arr.forEach([false, true] as const, (invalid) => {
        const resolved = recipeTw.classesToStyle(
          fieldSquareClass({ size, invalid }),
          testTheme,
        );
        const actual = mergeStyle(
          resolved.style,
          invalid ? resolved.invalid : undefined,
        );
        expect(actual).toEqual(otpCellStyle({ size, invalid }, testTheme));
      });
    });
  });

  it("suppresses feedback for a disabled cell", () => {
    const resolved = recipeTw.classesToStyle(
      fieldSquareClass({ size: "md" }),
      testTheme,
    );
    expect(
      suppressFeedback(mergeStyle(resolved.style, resolved.disabled)),
    ).toEqual(otpCellStyle({ size: "md", disabled: true }, testTheme));
  });
});

describe("Select recipe", () => {
  it("matches the trigger's field chrome and space-between justify", () => {
    Arr.forEach(SIZES, (size) => {
      Arr.forEach([false, true] as const, (invalid) => {
        const resolved = recipeTw.classesToStyle(
          selectTriggerClass({ size, invalid }),
          testTheme,
        );
        const actual = mergeStyle(
          resolved.style,
          invalid ? resolved.invalid : undefined,
        );
        const oracle = mergeStyle(
          controlStyle({ variant: fieldVariant, size, invalid }, testTheme),
          { justifyContent: "space-between" },
        );
        expect(actual).toEqual(oracle);
      });
    });
  });

  it("matches the popover list surface", () => {
    const oracle = {
      ...surfaceStyle(
        { tone: "popover", radius: "md", border: true, elevation: "overlay" },
        testTheme,
      ),
      padding: testTheme.spacing.xs,
      gap: testTheme.spacing["2xs"],
      minWidth: "100%",
    };
    expect(
      recipeTw.classesToStyle(selectContentClass, testTheme).style,
    ).toEqual(oracle);
  });

  it("matches an item's paint for each reported state", () => {
    const states = [
      { selected: false, highlighted: false, disabled: false },
      { selected: true, highlighted: false, disabled: false },
      { selected: false, highlighted: true, disabled: false },
      { selected: false, highlighted: false, disabled: true },
    ] as const;
    Arr.forEach(states, (state) => {
      const oracle = {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: testTheme.density.controlHeight.sm,
        paddingLeft: testTheme.spacing.sm,
        paddingRight: testTheme.spacing.sm,
        borderRadius: testTheme.radius.sm,
        fontSize: testTheme.typography.label.fontSize,
        lineHeight: testTheme.typography.label.lineHeight,
        color:
          state.disabled === true
            ? testTheme.colors.disabledForeground
            : testTheme.colors.popoverForeground,
        backgroundColor:
          state.disabled === true
            ? undefined
            : state.selected === true
              ? testTheme.colors.selected
              : state.highlighted === true
                ? testTheme.colors.hover
                : undefined,
        cursor: state.disabled === true ? "not-allowed" : "pointer",
      };
      expect(
        recipeTw.classesToStyle(selectItemClass(state), testTheme).style,
      ).toEqual(oracle);
    });
  });
});

describe("Rating recipe", () => {
  it("matches ratingStarStyle for each interactivity", () => {
    const cases = [
      { disabled: false, readOnly: false },
      { disabled: true, readOnly: false },
      { disabled: false, readOnly: true },
    ] as const;
    Arr.forEach(cases, (options) => {
      const resolved = recipeTw.classesToStyle(
        ratingStarClass(options),
        testTheme,
      );
      const actual = mergeStyle(
        resolved.style,
        options.disabled === true ? resolved.disabled : undefined,
      );
      expect(actual).toEqual(
        ratingStarStyle({ size: "md", ...options }, testTheme),
      );
    });
  });

  it("matches the star row", () => {
    expect(recipeTw.classesToStyle(ratingGroupClass, testTheme).style).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: testTheme.spacing["2xs"],
    });
  });
});

describe("Tooltip recipe", () => {
  it("matches the popover surface, caption type and padding", () => {
    const oracle = {
      ...surfaceStyle(
        { tone: "popover", radius: "sm", border: true, elevation: "overlay" },
        testTheme,
      ),
      paddingLeft: testTheme.spacing.sm,
      paddingRight: testTheme.spacing.sm,
      paddingTop: testTheme.spacing.xs,
      paddingBottom: testTheme.spacing.xs,
      fontSize: testTheme.typography.caption.fontSize,
      lineHeight: testTheme.typography.caption.lineHeight,
      whiteSpace: "nowrap",
    };
    expect(recipeTw.classesToStyle(tooltipClass, testTheme).style).toEqual(
      oracle,
    );
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

  it("registers no unsupported classes for the migrated recipes", () => {
    const joined = [
      buttonClass("primary", "md"),
      fieldClass({ size: "md", invalid: true, fullWidth: true }),
      textClass({ role: "code", tone: "muted", truncate: true }),
      stackClass({ direction: "column", gap: "lg" }),
      gridClass({ columns: 3, rows: 2, gap: "md" }),
      boxClass({ tone: "card", border: true, elevation: "md" }),
      toggleClass("outline", true, "lg"),
      separatorClass("horizontal", "md"),
      scrollClass("both"),
      buttonGroupClass("attached", "sm"),
      fieldSquareClass({ size: "md", invalid: true }),
      otpGroupClass,
      ratingStarClass({ disabled: true }),
      ratingGroupClass,
      tooltipClass,
      selectTriggerClass({ size: "md", invalid: true, fullWidth: true }),
      selectContentClass,
      selectItemClass({ selected: true, highlighted: false, disabled: false }),
    ];
    const unsupported = Arr.flatMap(
      joined,
      (className) => recipeTw.classesToStyle(className, testTheme).unsupported,
    );
    expect(unsupported).toStrictEqual([]);
  });
});

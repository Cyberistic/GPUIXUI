/**
 * The geometry recipes → `StyleDesc` equivalence guard.
 *
 * The second migration wave converted the ten primitives whose resting
 * appearance was a *computed* numeric or dynamic value — `NumberField`,
 * `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `RangeSlider`, `Meter`,
 * `Progress`, `Spinner`, `Skeleton`. The fix is three tiers: static classes,
 * derived tokens (a utility that is a function of the theme, e.g.
 * `switch-track` = `round(iconSize × 1.75)`), and a typed `style` seam for
 * data (percentage fills, caller sizes, pulse opacity).
 *
 * This suite proves the recipe + `style` agree with the pre-migration `core/`
 * resolvers, exactly as `recipe.test.ts` does for the first wave. For each
 * primitive, the compiled recipe (plus the data-driven `style` where the value
 * is data) equals the resolver's output. The data (`width: "50%"`, a dot's
 * opacity) is the *caller's* contribution and is merged in the test the same
 * way the component merges it, so a drift on either side fails here.
 */

import { describe, expect, it } from "vitest";
import type { StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import type { ControlSize } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import {
  spinnerDotStyle,
  skeletonStyle,
  type SkeletonSpec,
} from "../core/loading.js";
import {
  radioDotStyle,
  selectionBoxStyle,
  switchThumbStyle,
  switchTrackStyle,
  type SelectionSpec,
} from "../core/selection.js";
import {
  controlStyle,
  fieldTextStyle,
  numberInputStyle,
  numberStepperColumnStyle,
  numberStepperStyle,
  progressFillStyle,
  progressTrackStyle,
  sliderFillStyle,
  sliderRailStyle,
  sliderThumbStyle,
  sliderTrackStyle,
  type ProgressSpec,
  type SliderSpec,
} from "../core/style.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { fieldVariant } from "../core/variants.js";
import {
  mergeStyle,
  suppressSelectionFeedback,
} from "../components/internal.js";
import {
  numberFieldClass,
  numberInputClass,
  numberStepperClass,
  numberStepperColumnClass,
  progressFillClass,
  progressTrackClass,
  radioDotClass,
  selectionBoxClass,
  skeletonClass,
  sliderFillClass,
  sliderRailClass,
  sliderThumbClass,
  sliderTrackClass,
  spinnerDotClass,
  spinnerGroupClass,
  switchThumbClass,
  switchTrackClass,
} from "./index.js";
import { recipeTw } from "./registry.js";

const SIZES: ReadonlyArray<ControlSize> = ["sm", "md", "lg"];

const compiled = (className: string): StyleDesc =>
  recipeTw.classesToStyle(className, testTheme).style;

describe("NumberField recipes", () => {
  it("matches the field chrome with a zero right pad", () => {
    Arr.forEach(SIZES, (size) => {
      const oracle = mergeStyle(
        mergeStyle(
          controlStyle({ variant: fieldVariant, size }, testTheme),
          fieldTextStyle(testTheme),
        ),
        { paddingRight: 0 },
      );
      expect(compiled(numberFieldClass({ size }))).toEqual(oracle);
    });
  });

  it("matches the stepper column, buttons and input", () => {
    expect(compiled(numberStepperColumnClass)).toEqual(
      numberStepperColumnStyle(testTheme),
    );
    expect(compiled(numberStepperClass(false))).toEqual(
      numberStepperStyle({}, testTheme),
    );
    expect(compiled(numberStepperClass(true))).toEqual(
      numberStepperStyle({ disabled: true }, testTheme),
    );
    expect(compiled(numberInputClass)).toEqual(numberInputStyle());
  });
});

describe("selection recipes", () => {
  const boxSpec = (
    state: SelectionSpec["state"],
    over = {},
  ): SelectionSpec => ({
    state,
    size: "md",
    accent: "primary",
    shape: "square",
    ...over,
  });

  it("matches the checkbox and radio box for every state and shape", () => {
    Arr.forEach(["unchecked", "checked", "indeterminate"] as const, (state) => {
      Arr.forEach(["square", "circle"] as const, (shape) => {
        Arr.forEach([false, true] as const, (invalid) => {
          const spec = boxSpec(state, { shape, invalid });
          expect(compiled(selectionBoxClass(spec))).toEqual(
            selectionBoxStyle(spec, testTheme),
          );
        });
      });
    });
  });

  it("matches the radio dot", () => {
    Arr.forEach(["checked", "unchecked"] as const, (state) => {
      const spec = boxSpec(state, { shape: "circle" });
      expect(compiled(radioDotClass(spec))).toEqual(
        radioDotStyle(spec, testTheme),
      );
    });
  });

  it("matches the switch track and thumb", () => {
    Arr.forEach(["checked", "unchecked"] as const, (state) => {
      Arr.forEach([false, true] as const, (invalid) => {
        const spec = boxSpec(state, { invalid });
        expect(compiled(switchTrackClass(spec))).toEqual(
          switchTrackStyle(spec, testTheme),
        );
        expect(compiled(switchThumbClass(spec))).toEqual(
          switchThumbStyle(spec, testTheme),
        );
      });
    });
  });

  it("resolves the icon-derived geometry from the theme", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      iconSize: { ...testTheme.iconSize, md: 40 },
    };
    expect(
      recipeTw.classesToStyle(selectionBoxClass(boxSpec("checked")), repainted)
        .style.width,
    ).toBe(40);
  });

  it("matches a disabled box through the feedback suppression", () => {
    const spec = boxSpec("checked", { disabled: true });
    const resolved = recipeTw.classesToStyle(
      selectionBoxClass(spec),
      testTheme,
    );
    expect(
      suppressSelectionFeedback(mergeStyle(resolved.style, resolved.disabled)),
    ).toEqual(selectionBoxStyle(spec, testTheme));
  });
});

describe("slider recipes", () => {
  const spec = (over: { readonly invalid?: boolean } = {}): SliderSpec => ({
    size: "md",
    invalid: false,
    disabled: false,
    ...over,
  });

  it("matches the track, rail, fill and thumb", () => {
    expect(compiled(sliderTrackClass("md"))).toEqual(
      sliderTrackStyle(spec(), testTheme),
    );
    expect(compiled(sliderRailClass)).toEqual(sliderRailStyle(testTheme));

    const fraction = 0.5;
    expect(
      mergeStyle(compiled(sliderFillClass(false)), {
        width: `${fraction * 100}%`,
      }),
    ).toEqual(sliderFillStyle(fraction, spec(), testTheme));

    expect(compiled(sliderThumbClass("md", false))).toEqual(
      sliderThumbStyle(spec(), testTheme),
    );
  });

  it("paints the destructive roles when invalid", () => {
    expect(
      mergeStyle(compiled(sliderFillClass(true)), { width: "0%" }),
    ).toEqual(sliderFillStyle(0, spec({ invalid: true }), testTheme));
    expect(compiled(sliderThumbClass("md", true))).toEqual(
      sliderThumbStyle(spec({ invalid: true }), testTheme),
    );
  });

  it("reads the thumb's negative margin from the icon size", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      iconSize: { ...testTheme.iconSize, md: 40 },
    };
    const thumb = recipeTw.classesToStyle(
      sliderThumbClass("md", false),
      repainted,
    ).style;
    expect(thumb.marginLeft).toBe(-20);
    expect(thumb.marginRight).toBe(-20);
  });
});

describe("progress and meter recipes", () => {
  const track = (size: ProgressSpec["size"]): ProgressSpec => ({
    tone: "primary",
    size,
  });

  it("matches the track and fill", () => {
    Arr.forEach(["sm", "md"] as const, (size) => {
      expect(compiled(progressTrackClass(size))).toEqual(
        progressTrackStyle(track(size), testTheme),
      );
      const fillSpec: ProgressSpec = { value: 40, tone: "primary", size };
      expect(
        mergeStyle(compiled(progressFillClass("primary")), { width: "40%" }),
      ).toEqual(progressFillStyle(fillSpec, testTheme));
    });
  });

  it("reads the track height from the spacing scale", () => {
    const repainted: PrimitiveTheme = {
      ...testTheme,
      spacing: { ...testTheme.spacing, sm: 99 },
    };
    expect(
      recipeTw.classesToStyle(progressTrackClass("md"), repainted).style.height,
    ).toBe(99);
  });
});

describe("spinner and skeleton recipes", () => {
  it("matches the spinner row and a lit dot", () => {
    expect(compiled(spinnerGroupClass)).toEqual({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: testTheme.spacing["2xs"],
    });

    const point = { active: true, opacity: 1 };
    expect(
      mergeStyle(compiled(spinnerDotClass("primary")), {
        width: 12,
        height: 12,
        opacity: 1,
      }),
    ).toEqual(
      spinnerDotStyle({ size: 12, accent: "primary" }, point, testTheme),
    );
  });

  it("matches the skeleton shape with data dimensions", () => {
    const spec: SkeletonSpec = { width: 120, height: 40 };
    expect(
      mergeStyle(compiled(skeletonClass(spec)), { width: 120, height: 40 }),
    ).toEqual(skeletonStyle(spec, testTheme));
  });

  it("paints a circle skeleton with the full radius", () => {
    const spec: SkeletonSpec = { width: 48, height: 48, circle: true };
    expect(
      mergeStyle(compiled(skeletonClass(spec)), { width: 48, height: 48 }),
    ).toEqual(skeletonStyle(spec, testTheme));
  });
});

describe("merge order", () => {
  it("lets the caller's className win the recipe, and its style win both", () => {
    const recipe = selectionBoxClass({
      size: "md",
      accent: "primary",
      state: "unchecked",
    });
    const resting = compiled(recipe);

    const classOverridden = recipeTw.classesToStyle(
      cn(recipe, "rounded-full"),
      testTheme,
    ).style;
    expect(classOverridden.borderRadius).toBe(testTheme.radius.full);
    expect(resting.borderRadius).toBe(testTheme.radius.sm);

    const styleOverridden = mergeStyle(classOverridden, { borderRadius: 7 });
    expect(styleOverridden.borderRadius).toBe(7);
  });
});

describe("the geometry recipes register no unsupported classes", () => {
  it("compiles every converted recipe to a StyleDesc", () => {
    const recipes = [
      numberFieldClass({ size: "md", invalid: true }),
      numberStepperColumnClass,
      numberStepperClass(false),
      numberInputClass,
      selectionBoxClass({ size: "md", accent: "primary", state: "checked" }),
      radioDotClass({ size: "md", accent: "primary", state: "checked" }),
      switchTrackClass({ size: "md", accent: "primary", state: "checked" }),
      switchThumbClass({ size: "md", accent: "primary", state: "checked" }),
      sliderTrackClass("md"),
      sliderRailClass,
      sliderFillClass(false),
      sliderThumbClass("md", false),
      progressTrackClass("md"),
      progressFillClass("primary"),
      spinnerGroupClass,
      spinnerDotClass("primary"),
      skeletonClass({ circle: true }),
    ];
    const unsupported = Arr.flatMap(
      recipes,
      (className) => recipeTw.classesToStyle(className, testTheme).unsupported,
    );
    expect(unsupported).toStrictEqual([]);
  });
});

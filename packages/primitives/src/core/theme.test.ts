import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import {
  borderWidth as libraryBorderWidth,
  defaultDensity as libraryDensity,
  iconSize as libraryIconSize,
  isTextRole as tokenTextRole,
  keyboardFocusRing,
  radius as libraryRadius,
  spacing as librarySpacing,
  textRoles,
  typography as libraryScale,
} from "@gpuixui/tokens";
import {
  sliderInset,
  sliderFillStyle,
  sliderThumbStyle,
  sliderTrackStyle,
} from "./style.js";
import { stackStyle } from "./layout.js";
import {
  controlStyle,
  progressTrackStyle,
  ratingStarColor,
  ruleStyle,
  surfaceStyle,
  textStyle,
  toneColor,
} from "./style.js";
import { skeletonStyle } from "./loading.js";
import { keyboardRing } from "./focus.js";
import {
  radioDotStyle,
  selectionBoxStyle,
  selectionMarkColor,
  selectionTargetStyle,
  switchBox,
  switchThumbStyle,
  switchTrackStyle,
} from "./selection.js";
import { pressWash } from "./pointer.js";
import { actionOnColor, buttonVariants, fieldVariant } from "./variants.js";
import { testTheme } from "./testing/theme.fixture.js";
import * as primitives from "../index.js";
import {
  borderWidthOf,
  colorRole,
  colorsOf,
  controlHeightOf,
  controlPaddingOf,
  controlSize,
  elevationLevel,
  familyOf,
  iconSideOf,
  iconStepValue,
  isIconStep,
  isSpaceStep,
  isRadiusStep,
  isTextRole,
  radiusStep,
  radiusValue,
  rowHeightOf,
  scaleValue,
  spaceStep,
  spaceValue,
  typeOf,
  type ControlSize,
  type PrimitiveTheme,
} from "./theme.js";

const coreDir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = fileURLToPath(new URL("../", import.meta.url));

const COLOUR_FILES = [join("testing", "theme.fixture.ts")];

const SHADOW_FILES = [join("testing", "theme.fixture.ts")];

const isSource = (name: string): boolean =>
  name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".d.ts");

const walk = (dir: string): ReadonlyArray<string> =>
  Arr.flatMap(readdirSync(dir, { withFileTypes: true }), (entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : isSource(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

const isPaintSource = (name: string): boolean =>
  (name.endsWith(".ts") || name.endsWith(".tsx")) &&
  !name.includes(".test.") &&
  !name.endsWith(".d.ts");

const walkPaint = (dir: string): ReadonlyArray<string> =>
  Arr.flatMap(readdirSync(dir, { withFileTypes: true }), (entry) =>
    entry.isDirectory()
      ? walkPaint(join(dir, entry.name))
      : isPaintSource(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b/g;

const OUTLINE_WIDTH = /outlineWidth\s*:/;

const spacious: PrimitiveTheme = {
  ...testTheme,
  density: {
    name: "spacious",
    controlHeight: { sm: 32, md: 36, lg: 40 },
    controlPaddingX: { sm: 10, md: 12, lg: 14 },
    rowHeight: 36,
  },
};

describe("the theme is the only source of colour", () => {
  it("finds no hex literal in any file that is not itself about colour", () => {
    const scanned = Arr.filter(
      walk(coreDir),
      (path) => !Arr.some(COLOUR_FILES, (allowed) => path.endsWith(allowed)),
    );

    expect(scanned.length).toBeGreaterThan(4);
    const offenders = Arr.flatMap(scanned, (path) =>
      Arr.map(
        readFileSync(path, "utf8").match(COLOUR_LITERAL) ?? [],
        (match) => `${path}: ${match}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});

describe("the focus ring has one definition", () => {
  const scanned = Arr.filter(
    walk(sourceDir),
    (path) => !Arr.some(SHADOW_FILES, (allowed) => path.endsWith(allowed)),
  );

  it("finds no local focus-ring geometry in the package's source", () => {
    expect(Arr.some(scanned, (path) => path.endsWith("selection.ts"))).toBe(
      true,
    );
    const offenders = Arr.filter(scanned, (path) =>
      OUTLINE_WIDTH.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("declares the shared keyboard ring once, from the tokens helper", () => {
    expect(keyboardRing(testTheme).focusVisible).toEqual(
      keyboardFocusRing(testTheme).focusVisible,
    );
  });
});

describe("a control size is a stored choice", () => {
  it("paints the documented default for a name the scale does not carry", () => {
    expect(controlSize("sm")).toBe("sm");
    expect(controlSize("md")).toBe("md");
    expect(controlSize("lg")).toBe("lg");

    expect(controlSize("xl")).toBe("md");
    expect(controlSize("")).toBe("md");
    expect(controlSize(2)).toBe("md");
    expect(controlSize(undefined)).toBe("md");
    expect(controlSize(null)).toBe("md");
  });

  it("is the read every component takes its size prop through", () => {
    const dir = join(sourceDir, "components");
    const sized = Arr.getSomes(
      Arr.map(
        Arr.filter(
          readdirSync(dir),
          (name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"),
        ),
        (name) => {
          const source = readFileSync(join(dir, name), "utf8");
          return source.includes("size?: ControlSize")
            ? Option.some({ name, source })
            : Option.none();
        },
      ),
    );

    expect(Arr.map(sized, (file) => file.name)).toEqual(
      expect.arrayContaining([
        "Button.tsx",
        "Checkbox.tsx",
        "Input.tsx",
        "Select.tsx",
        "Slider.tsx",
      ]),
    );
    expect(
      Arr.map(
        Arr.filter(sized, (file) => !file.source.includes("controlSize(")),
        (file) => file.name,
      ),
    ).toEqual([]);

    const inline = Arr.flatMap(sized, (file) =>
      Arr.map(
        Arr.filter(['props.size ?? "md"', 'size = "md"'], (pattern) =>
          file.source.includes(pattern),
        ),
        (pattern) => `${file.name}: ${pattern}`,
      ),
    );
    expect(inline).toEqual([]);
  });

  const storedSize = "xlarge" as ControlSize;
  const checked = { state: "checked", accent: "primary" } as const;
  const paintings: ReadonlyArray<
    readonly [string, () => unknown, () => unknown]
  > = [
    [
      "controlStyle",
      () =>
        controlStyle(
          { variant: buttonVariants.primary, size: storedSize },
          testTheme,
        ),
      () =>
        controlStyle(
          { variant: buttonVariants.primary, size: "md" },
          testTheme,
        ),
    ],
    [
      "sliderInset",
      () => sliderInset(storedSize, testTheme),
      () => sliderInset("md", testTheme),
    ],
    [
      "sliderTrackStyle",
      () => sliderTrackStyle({ size: storedSize }, testTheme),
      () => sliderTrackStyle({ size: "md" }, testTheme),
    ],
    [
      "selectionBoxStyle",
      () => selectionBoxStyle({ ...checked, size: storedSize }, testTheme),
      () => selectionBoxStyle({ ...checked, size: "md" }, testTheme),
    ],
    [
      "selectionTargetStyle",
      () => selectionTargetStyle({ ...checked, size: storedSize }, testTheme),
      () => selectionTargetStyle({ ...checked, size: "md" }, testTheme),
    ],
    [
      "radioDotStyle",
      () => radioDotStyle({ ...checked, size: storedSize }, testTheme),
      () => radioDotStyle({ ...checked, size: "md" }, testTheme),
    ],
    [
      "switchBox",
      () => switchBox(storedSize, testTheme),
      () => switchBox("md", testTheme),
    ],
    [
      "switchThumbStyle",
      () => switchThumbStyle({ ...checked, size: storedSize }, testTheme),
      () => switchThumbStyle({ ...checked, size: "md" }, testTheme),
    ],
  ];

  Arr.forEach(paintings, ([name, withStored, withDefault]) => {
    it(`reads the size through controlSize in ${name}`, () => {
      expect(withStored()).toStrictEqual(withDefault());
    });
  });
});

describe("an elevation level is a stored choice", () => {
  it("reads a name the scale does not carry as the default lift, and absence as none", () => {
    expect(elevationLevel("sm")).toBe("sm");
    expect(elevationLevel("md")).toBe("md");
    expect(elevationLevel("lg")).toBe("lg");

    expect(elevationLevel("raised")).toBe("md");
    expect(elevationLevel("")).toBe("md");
    expect(elevationLevel(2)).toBe("md");

    expect(elevationLevel(undefined)).toBeUndefined();
    expect(elevationLevel(null)).toBeUndefined();

    expect(elevationLevel("overlay")).toBe("overlay");
  });
});

describe("a spacing step is a stored choice", () => {
  it("reads a name the theme does not carry as absence, never an index", () => {
    expect(spaceStep(testTheme, "md")).toBe("md");
    expect(spaceStep(testTheme, "5xl")).toBe("5xl");

    expect(spaceStep(testTheme, "normal")).toBeUndefined();
    expect(spaceStep(testTheme, " md ")).toBeUndefined();
    expect(spaceStep(testTheme, "")).toBeUndefined();
    expect(spaceStep(testTheme, 8)).toBeUndefined();
    expect(spaceStep(testTheme, undefined)).toBeUndefined();
    expect(spaceStep(testTheme, null)).toBeUndefined();
    expect(isSpaceStep(testTheme, "normal")).toBe(false);
    expect(isSpaceStep(testTheme, "lg")).toBe(true);
  });

  it("takes the theme's group as the authority, and its absence as none", () => {
    expect(spaceStep({ spacing: undefined }, "lg")).toBeUndefined();
    expect(spaceStep({ spacing: null }, "lg")).toBeUndefined();
    expect(spaceStep({}, "lg")).toBeUndefined();

    expect(spaceStep({ spacing: testTheme.spacing }, "lg")).toBe("lg");
  });
});

describe("a corner step is a stored choice", () => {
  it("reads a name the release does not carry as absence, never a class", () => {
    Arr.forEach(R.keys(libraryRadius), (step) => {
      expect(radiusStep(step)).toBe(step);
    });

    expect(radiusStep("xl2")).toBeUndefined();
    expect(radiusStep(" md ")).toBeUndefined();
    expect(radiusStep("")).toBeUndefined();
    expect(radiusStep(8)).toBeUndefined();
    expect(radiusStep(undefined)).toBeUndefined();
    expect(radiusStep(null)).toBeUndefined();
    expect(isRadiusStep("xl2")).toBe(false);
    expect(isRadiusStep("lg")).toBe(true);
  });

  it("answers a theme's own number for a step it still names", () => {
    expect(radiusValue(testTheme, "lg")).toBe(testTheme.radius.lg);
    const brand: PrimitiveTheme = {
      ...testTheme,
      radius: { ...testTheme.radius, lg: 11 },
    };
    expect(radiusValue(brand, "lg")).toBe(11);
  });
});

describe("a numeric group a store gave back", () => {
  const stored = (group: Record<string, unknown>): PrimitiveTheme =>
    ({ ...testTheme, ...group }) as unknown as PrimitiveTheme;

  it("paints the library's number for a group the theme lost", () => {
    expect(spaceValue({}, "md")).toBe(librarySpacing.md);
    expect(spaceValue({ spacing: null }, "4xl")).toBe(librarySpacing["4xl"]);
    expect(radiusValue({}, "md")).toBe(libraryRadius.md);
    expect(radiusValue({ radius: null }, "full")).toBe(libraryRadius.full);
    expect(iconSideOf({}, "md")).toBe(libraryIconSize.md);
    expect(iconSideOf({ iconSize: null }, "sm")).toBe(libraryIconSize.sm);
    expect(controlHeightOf({}, "md")).toBe(libraryDensity.controlHeight.md);
    expect(controlPaddingOf({}, "lg")).toBe(libraryDensity.controlPaddingX.lg);
    expect(rowHeightOf({})).toBe(libraryDensity.rowHeight);
    expect(rowHeightOf({ density: null })).toBe(libraryDensity.rowHeight);

    expect(scaleValue(null, librarySpacing, "xs")).toBe(librarySpacing.xs);
    expect(scaleValue({ xs: Number.NaN }, librarySpacing, "xs")).toBe(
      librarySpacing.xs,
    );
  });

  it("keeps the theme's own number, and reads a nulled step as the library's", () => {
    const brand = stored({
      spacing: { ...testTheme.spacing, md: 42 },
      radius: { ...testTheme.radius, md: 7 },
      iconSize: { ...testTheme.iconSize, lg: 18 },
      density: {
        ...testTheme.density,
        controlHeight: { ...testTheme.density.controlHeight, sm: 30 },
        controlPaddingX: { ...testTheme.density.controlPaddingX, sm: 9 },
        rowHeight: 26,
      },
    });
    expect(spaceValue(brand, "md")).toBe(42);
    expect(radiusValue(brand, "md")).toBe(7);
    expect(iconSideOf(brand, "lg")).toBe(18);
    expect(controlHeightOf(brand, "sm")).toBe(30);
    expect(controlPaddingOf(brand, "sm")).toBe(9);
    expect(rowHeightOf(brand)).toBe(26);

    const nulledStep = {
      spacing: { ...testTheme.spacing, md: null },
    } as unknown as PrimitiveTheme["spacing"];
    expect(spaceValue({ spacing: nulledStep }, "md")).toBe(librarySpacing.md);
  });

  it("reads a stored size name as the default step before it falls back", () => {
    const renamed = "huge" as ControlSize;
    expect(iconSideOf({}, renamed)).toBe(libraryIconSize.md);
    expect(controlHeightOf({}, renamed)).toBe(libraryDensity.controlHeight.md);
    expect(controlPaddingOf({}, renamed)).toBe(
      libraryDensity.controlPaddingX.md,
    );
  });

  it("reads an icon step, not a control size, for a glyph painter", () => {
    const brand = stored({ iconSize: { ...testTheme.iconSize, xs: 10 } });
    expect(iconStepValue(brand, "xs")).toBe(10);
    expect(iconStepValue(testTheme, "xs")).toBe(libraryIconSize.xs);
    expect(iconStepValue(testTheme, "xl")).toBe(libraryIconSize.xl);
    expect(iconStepValue(testTheme, "xl")).not.toBe(
      iconSideOf(testTheme, "lg"),
    );

    expect(iconStepValue({}, "lg")).toBe(libraryIconSize.lg);
    expect(iconStepValue({ iconSize: null }, "lg")).toBe(libraryIconSize.lg);
    expect(iconStepValue(testTheme, "huge")).toBe(libraryIconSize.md);
    expect(iconStepValue(testTheme, 18)).toBe(libraryIconSize.md);
    expect(isIconStep("xs")).toBe(true);
    expect(isIconStep("huge")).toBe(false);
    expect(isIconStep(12)).toBe(false);
  });

  it("paints the library's border width for a group the theme lost", () => {
    expect(borderWidthOf({}, "thin")).toBe(libraryBorderWidth.thin);
    expect(borderWidthOf({}, "strong")).toBe(libraryBorderWidth.strong);
    expect(borderWidthOf(stored({ borderWidth: null }), "thin")).toBe(
      libraryBorderWidth.thin,
    );

    const brand = stored({ borderWidth: { thin: 3, strong: 5 } });
    expect(borderWidthOf(brand, "thin")).toBe(3);
    expect(borderWidthOf(brand, "strong")).toBe(5);

    const lost = stored({ borderWidth: null });
    expect(ruleStyle({ orientation: "vertical" }, lost).width).toBe(
      libraryBorderWidth.thin,
    );
    expect(
      selectionBoxStyle(
        { state: "unchecked", size: "md", accent: "primary" },
        lost,
      ).borderWidth,
    ).toBe(libraryBorderWidth.thin);
    expect(
      controlStyle({ variant: fieldVariant, size: "md" }, lost).borderWidth,
    ).toBe(libraryBorderWidth.thin);
    expect(sliderThumbStyle({ size: "md" }, lost).borderWidth).toBe(
      libraryBorderWidth.strong,
    );
  });

  it("keeps a switch box on the accent metrics when a store nulled its table", () => {
    const declared = stored({
      switch: { on: "#008800", off: "#888888", knob: "#ffffff" },
      switchMetrics: null,
    });
    expect(switchBox("md", declared)).toEqual(switchBox("md", testTheme));
  });

  it("keeps every painter on its feet with the groups a store lost", () => {
    const lost: PrimitiveTheme = stored({
      spacing: null,
      radius: null,
      iconSize: null,
      density: null,
    });
    const control = controlStyle(
      { variant: buttonVariants.primary, size: "md" },
      lost,
    );
    expect(control.height).toBe(libraryDensity.controlHeight.md);
    expect(control.paddingLeft).toBe(libraryDensity.controlPaddingX.md);
    expect(control.gap).toBe(librarySpacing.sm);
    expect(control.borderRadius).toBe(libraryRadius.md);
    expect(stackStyle({ direction: "row", gap: "md" }, lost).gap).toBe(
      librarySpacing.md,
    );
    expect(
      selectionBoxStyle(
        { state: "unchecked", size: "md", accent: "primary" },
        lost,
      ),
    ).toStrictEqual(
      selectionBoxStyle(
        { state: "unchecked", size: "md", accent: "primary" },
        testTheme,
      ),
    );
    expect(sliderTrackStyle({ size: "md" }, lost).height).toBe(
      sliderTrackStyle({ size: "md" }, testTheme).height,
    );
    expect(sliderThumbStyle({ size: "md" }, lost).width).toBe(
      sliderThumbStyle({ size: "md" }, testTheme).width,
    );
    expect(
      radioDotStyle({ state: "checked", size: "sm", accent: "primary" }, lost)
        .width,
    ).toBe(
      radioDotStyle(
        { state: "checked", size: "sm", accent: "primary" },
        testTheme,
      ).width,
    );
    expect(
      selectionTargetStyle(
        { state: "unchecked", size: "sm", accent: "primary" },
        lost,
      ),
    ).toStrictEqual(
      selectionTargetStyle(
        { state: "unchecked", size: "sm", accent: "primary" },
        testTheme,
      ),
    );
    expect(switchBox("md", lost).width).toBe(switchBox("md", testTheme).width);
    expect(switchBox("md", lost).inset).toBe(testTheme.spacing["2xs"]);
  });

  it("is the read every painter takes a numeric group through", () => {
    const read =
      /\.(spacing|radius|iconSize)\s*\[|\.(spacing|radius|iconSize)\.[A-Za-z]|\.density\.(controlHeight|controlPaddingX|rowHeight)|\.borderWidth\.[A-Za-z]/;
    const offenders = Arr.filter(walk(sourceDir), (path) => {
      if (path.endsWith(join("core", "theme.ts"))) return false;
      return read.test(readFileSync(path, "utf8"));
    });
    expect(offenders).toEqual([]);
  });

  it("teaches the fallback where a consumer hands a theme over", () => {
    const read = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
    const readme = read("../../README.md");
    expect({
      readers: Arr.every(
        [
          "scaleValue",
          "spaceValue",
          "radiusValue",
          "iconSideOf",
          "controlHeightOf",
          "rowHeightOf",
          "borderWidthOf",
        ],
        (name) => readme.includes(name),
      ),
      rule:
        readme.includes("the **library's**") &&
        readme.includes("typeOf`/`familyOf") &&
        readme.includes("mid-render"),
      gate: readme.includes("missingTokens"),
    }).toEqual({ readers: true, rule: true, gate: true });
  });

  it("publishes the paint-side readers from the package entry", () => {
    expect({
      spaceValue: primitives.spaceValue === spaceValue,
      radiusValue: primitives.radiusValue === radiusValue,
      iconSideOf: primitives.iconSideOf === iconSideOf,
      iconStepValue: primitives.iconStepValue === iconStepValue,
      controlHeightOf: primitives.controlHeightOf === controlHeightOf,
      controlPaddingOf: primitives.controlPaddingOf === controlPaddingOf,
      rowHeightOf: primitives.rowHeightOf === rowHeightOf,
      borderWidthOf: primitives.borderWidthOf === borderWidthOf,
    }).toEqual({
      spaceValue: true,
      radiusValue: true,
      iconSideOf: true,
      iconStepValue: true,
      controlHeightOf: true,
      controlPaddingOf: true,
      rowHeightOf: true,
      borderWidthOf: true,
    });
  });

  it("answers through the entry for a theme that lost every group", () => {
    const lost: PrimitiveTheme = stored({
      spacing: null,
      radius: null,
      iconSize: null,
      density: null,
      borderWidth: null,
    });
    expect({
      space: primitives.spaceValue(lost, "md"),
      radius: primitives.radiusValue(lost, "md"),
      icon: primitives.iconSideOf(lost, "md"),
      height: primitives.controlHeightOf(lost, "md"),
      padding: primitives.controlPaddingOf(lost, "md"),
      row: primitives.rowHeightOf(lost),
      border: primitives.borderWidthOf(lost, "thin"),
    }).toEqual({
      space: librarySpacing.md,
      radius: libraryRadius.md,
      icon: libraryIconSize.md,
      height: libraryDensity.controlHeight.md,
      padding: libraryDensity.controlPaddingX.md,
      row: libraryDensity.rowHeight,
      border: libraryBorderWidth.thin,
    });

    expect(primitives.rowHeightOf(testTheme)).toBe(testTheme.density.rowHeight);
  });

  it("teaches the published set where another package paints", () => {
    const readme = readFileSync(
      fileURLToPath(new URL("../../README.md", import.meta.url)),
      "utf8",
    );

    const prose = readme.replace(/\s+/g, " ");
    expect({
      published: prose.includes("published from the package root"),
      readers: Arr.every(["rowHeightOf", "spaceValue", "iconSideOf"], (name) =>
        readme.includes(name),
      ),
    }).toEqual({ published: true, readers: true });
  });
});

describe("a colour group a store gave back", () => {
  const stored = (colors: unknown): PrimitiveTheme =>
    ({ ...testTheme, colors }) as unknown as PrimitiveTheme;

  it("reads the roles the theme still carries", () => {
    expect(colorsOf(testTheme)).toBe(testTheme.colors);
    expect(colorRole(testTheme, "primary")).toBe(testTheme.colors.primary);
    expect(colorRole(testTheme, "skeleton")).toBe(testTheme.colors.skeleton);

    const brand = {
      ...testTheme,
      colors: { ...testTheme.colors, primary: "#123456" },
    };
    expect(colorRole(brand, "primary")).toBe("#123456");
  });

  it("answers no role for a group, or a role, the theme lost", () => {
    expect(colorsOf({})).toEqual({});
    expect(colorsOf(stored(null))).toEqual({});
    expect(colorRole({}, "primary")).toBeUndefined();
    expect(colorRole({}, "card")).toBeUndefined();

    const nulled = stored({ primary: null, card: 7 });
    expect(colorsOf(nulled)).toEqual({});
    expect(colorRole(nulled, "primary")).toBeUndefined();
  });

  it("keeps every painter on its feet with the colour group a store lost", () => {
    const lost = stored(null);
    const control = controlStyle(
      { variant: buttonVariants.primary, size: "md" },
      lost,
    );

    const complete = controlStyle(
      { variant: buttonVariants.primary, size: "md" },
      testTheme,
    );
    expect(control.backgroundColor).toBeUndefined();
    expect(control.color).toBeUndefined();
    expect(control.height).toBe(complete.height);
    expect(control.fontSize).toBe(complete.fontSize);

    expect(
      surfaceStyle({ tone: "card" }, lost).backgroundColor,
    ).toBeUndefined();
    expect(
      textStyle({ role: "body", tone: "default" }, lost).color,
    ).toBeUndefined();
    expect(
      selectionBoxStyle(
        { state: "checked", size: "md", accent: "primary" },
        lost,
      ).backgroundColor,
    ).toBeUndefined();

    expect(toneColor(lost, "primary")).toBeUndefined();
    expect(ratingStarColor(true, lost)).toBeUndefined();
    expect(actionOnColor(lost, "primary")).toBeUndefined();
    expect(pressWash(lost)).toBeUndefined();
    expect(ruleStyle({ orientation: "horizontal" }, lost).backgroundColor).toBe(
      control.backgroundColor,
    );
    expect(
      progressTrackStyle({ tone: "primary", size: "md" }, lost).backgroundColor,
    ).toBeUndefined();
    expect(skeletonStyle({}, lost).backgroundColor).toBeUndefined();
    expect(
      selectionMarkColor(
        { state: "checked", size: "md", accent: "primary" },
        lost,
      ),
    ).toBeUndefined();
    expect(
      switchTrackStyle(
        { state: "unchecked", size: "md", accent: "primary" },
        lost,
      ).backgroundColor,
    ).toBeUndefined();
    expect(
      switchThumbStyle(
        { state: "unchecked", size: "md", accent: "primary" },
        lost,
      ).backgroundColor,
    ).toBeUndefined();
    expect(
      sliderFillStyle(0.5, { size: "md" }, lost).backgroundColor,
    ).toBeUndefined();
    expect(sliderThumbStyle({ size: "md" }, lost).borderColor).toBeUndefined();
  });

  it("is the read every painter takes the colour group through", () => {
    const read = /\.colors\b/;
    const offenders = Arr.filter(walkPaint(sourceDir), (path) =>
      read.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("teaches the colour absence where a consumer hands a theme over", () => {
    const read = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
    const readme = read("../../README.md");
    expect({
      readers: ["colorsOf", "colorRole", "ColorRef"].every((name) =>
        readme.includes(name),
      ),
      rule:
        readme.includes("paints nothing") &&
        readme.includes("themeColors") &&
        readme.includes("invalidColorRoles"),
    }).toEqual({ readers: true, rule: true });
  });
});

describe("density", () => {
  it("changes control dimensions and leaves every colour alone", () => {
    const comfortable = controlStyle(
      { variant: buttonVariants.primary, size: "md" },
      testTheme,
    );
    const dense = controlStyle(
      { variant: buttonVariants.primary, size: "md" },
      spacious,
    );
    expect(dense.height).not.toBe(comfortable.height);
    expect(dense.paddingLeft).not.toBe(comfortable.paddingLeft);
    expect(dense.backgroundColor).toBe(comfortable.backgroundColor);
    expect(dense.color).toBe(comfortable.color);
  });
});

describe("a type role is read through one seam", () => {
  const withoutBody = (): Partial<PrimitiveTheme["typography"]> => {
    const { body: _body, ...typography } = testTheme.typography;
    return typography;
  };

  it("paints the theme's own role", () => {
    expect(typeOf(testTheme, "body")).toBe(testTheme.typography.body);
    expect(typeOf(testTheme, "h1")).toBe(testTheme.typography.h1);

    const branded: PrimitiveTheme = {
      ...testTheme,
      typography: {
        ...testTheme.typography,
        body: { fontSize: 21, lineHeight: 27, fontWeight: 500 },
      },
    };
    expect(typeOf(branded, "body").fontSize).toBe(21);
  });

  it("paints the library's own role for one the theme lost", () => {
    expect(typeOf({ typography: withoutBody() }, "body")).toEqual(
      libraryScale.body,
    );

    expect(typeOf({}, "body")).toEqual(libraryScale.body);

    expect(typeOf({ typography: { body: null } }, "body")).toEqual(
      libraryScale.body,
    );

    expect(typeOf({ typography: withoutBody() }, "h1")).toBe(
      testTheme.typography.h1,
    );
  });

  it("reads a role name the scale does not carry as the body default", () => {
    expect(isTextRole("body")).toBe(true);
    expect(isTextRole("bodyStrong")).toBe(true);
    expect(isTextRole("bodyy")).toBe(false);
    expect(isTextRole("sans")).toBe(false);
    expect(typeOf(testTheme, "bodyy")).toEqual(testTheme.typography.body);
    expect(typeOf(testTheme, undefined)).toEqual(testTheme.typography.body);
    expect(typeOf({}, "bodyy")).toEqual(libraryScale.body);
  });

  it("reads stored roles through the token guard, not a second list", () => {
    expect(
      isTextRole,
      "the primitives must read the token package's role index, not a second list",
    ).toBe(tokenTextRole);
    expect(Arr.every(textRoles, isTextRole)).toBe(true);
  });

  it("reads the font family the same way", () => {
    expect(familyOf(testTheme, "sans")).toBe(testTheme.typography.sans);
    expect(familyOf(testTheme, "mono")).toBe(testTheme.typography.mono);
    expect(familyOf({}, "sans")).toBe(libraryScale.sans);
    expect(familyOf({}, "mono")).toBe(libraryScale.mono);
  });

  it("is the read every painter takes the type group through", () => {
    const read = /\.typography\s*\[|\.typography\.[A-Za-z]/;
    const offenders = Arr.filter(walk(sourceDir), (path) => {
      if (path.endsWith(join("core", "theme.ts"))) return false;
      return read.test(readFileSync(path, "utf8"));
    });
    expect(offenders).toEqual([]);
  });
});

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

/**
 * Guards the two rules that keep the design system in one place.
 *
 * 1. A colour may only enter the library through the theme. A hex literal in a
 *    resolver is how a second, invisible palette appears: it survives review,
 *    ignores the mode switch, and only shows up as a component that is wrong in
 *    dark mode. The scan below fails the build on one.
 * 2. Density changes numbers and never colour. If it changed a colour, the
 *    "compact" and "comfortable" variants of one component would disagree about
 *    what "primary" looks like.
 *
 * The scan reads the source text of this package. The test fixture (whose
 * subjects are obviously-fake values) is the only file allowed to contain a hex
 * literal; the colour arithmetic itself lives in `@gpuixui/tokens`.
 *
 * Node's `fs` is used directly here on purpose: this is a test boundary doing a
 * one-shot read of the package's own source, not runtime domain code, and the
 * package does not resolve `vite/client` types for `import.meta.glob`.
 */

const coreDir = fileURLToPath(new URL(".", import.meta.url));
const sourceDir = fileURLToPath(new URL("../", import.meta.url));

/** The fixture is the one file whose subject is a colour. */
const COLOUR_FILES = [join("testing", "theme.fixture.ts")];

/** The fixture's subjects are obviously-fake shadow metrics, too. */
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

/**
 * The paint sources, components included.
 *
 * A colour is read in `.tsx` as often as in a resolver — the components own
 * their own role reads — so the colour scan cannot reuse {@link walk}, which
 * stays on the `.ts` sources the hex and numeric scans read.
 */
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

/** The one property only `@gpuixui/tokens`' `keyboardFocusRing` may set. */
const OUTLINE_WIDTH = /outlineWidth\s*:/;

/** The theme with every density number changed, and nothing else. */
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
    // The walk must actually see the resolvers, or the scan proves nothing.
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
    // The walk must reach the file that used to carry a local ring, or the scan
    // proves nothing.
    expect(Arr.some(scanned, (path) => path.endsWith("selection.ts"))).toBe(
      true,
    );
    const offenders = Arr.filter(scanned, (path) =>
      OUTLINE_WIDTH.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("declares the shared keyboard ring once, from the tokens helper", () => {
    // `core/focus.ts` is the one place a package control asks for the ring;
    // `focus.test.ts` holds its geometry, and this holds the source of truth.
    expect(keyboardRing(testTheme).focusVisible).toEqual(
      keyboardFocusRing(testTheme).focusVisible,
    );
  });
});

describe("a control size is a stored choice", () => {
  it("paints the documented default for a name the scale does not carry", () => {
    // A size a release kept is the size it asked for...
    expect(controlSize("sm")).toBe("sm");
    expect(controlSize("md")).toBe("md");
    expect(controlSize("lg")).toBe("lg");
    // ...and a preference from another release, a number a caller forwarded or
    // an absent value is the `md` default every control documents, not a scale
    // index that answers `undefined` through a height and a box side.
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
    // The walk must reach the controls that accept a size, or the scan proves
    // nothing: an action, a field and a selection control are the families.
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
    // The retracted pattern, both halves: a default written at the prop read
    // and a destructuring default both bypass the scale's own membership rule.
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

  // The core resolvers the components are built on are exported for a consumer
  // painting its own control, so the same rule has to hold there: a stored size
  // answered `undefined` for a height, a box side or a thumb offset — a
  // collapsed control and a vanished selection mark — while the components had
  // already moved to `controlSize`.
  // A name neither scale carries: `xl` is an icon step, so it would still
  // resolve through the wrong table and hide the index the components no
  // longer take.
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
    // A level a saved workspace recorded is the level it gets...
    expect(elevationLevel("sm")).toBe("sm");
    expect(elevationLevel("md")).toBe("md");
    expect(elevationLevel("lg")).toBe("lg");
    // ...a name this release renamed is the default lift `elevationShadow`
    // already answers, and a level that is not a name at all answers the same.
    expect(elevationLevel("raised")).toBe("md");
    expect(elevationLevel("")).toBe("md");
    expect(elevationLevel(2)).toBe("md");
    // A box with no level paints no lift, and JSON writes `null` where a record
    // carried none, so both are absence rather than the default.
    expect(elevationLevel(undefined)).toBeUndefined();
    expect(elevationLevel(null)).toBeUndefined();
    // The one reserved level stays itself: the theme ships it empty, and it is
    // not a name that went missing.
    expect(elevationLevel("overlay")).toBe("overlay");
  });
});

describe("a spacing step is a stored choice", () => {
  it("reads a name the theme does not carry as absence, never an index", () => {
    // A step the theme paints is the step it asked for...
    expect(spaceStep(testTheme, "md")).toBe("md");
    expect(spaceStep(testTheme, "5xl")).toBe("5xl");
    // ...and a name from another release, a padded one, a number a caller
    // forwarded or an absent value is **absence**: the layout props document an
    // omitted step as no inset, no gap and no padding, so a name no release
    // ships must paint that same box rather than an `undefined` the runtime
    // drops after the paint decided it had a step.
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
    // A theme restored from storage can lose the whole group, and JSON writes
    // `null` where it carried none: both are absence, not a throw — the token
    // audit (`missingTokens`) is what refuses such a theme, not a paint seam.
    expect(spaceStep({ spacing: undefined }, "lg")).toBeUndefined();
    expect(spaceStep({ spacing: null }, "lg")).toBeUndefined();
    expect(spaceStep({}, "lg")).toBeUndefined();
    // The test theme's group is the one every other case reads.
    expect(spaceStep({ spacing: testTheme.spacing }, "lg")).toBe("lg");
  });
});

describe("a corner step is a stored choice", () => {
  it("reads a name the release does not carry as absence, never a class", () => {
    // Every corner this release ships is the corner it asks for...
    Arr.forEach(R.keys(libraryRadius), (step) => {
      expect(radiusStep(step)).toBe(step);
    });
    // ...and a name from another release, a padded one, a number a caller
    // forwarded or an absent value is **absence**: each painter documents what
    // it paints for a corner it cannot place, so the Box and the scroll frame
    // paint none and the Skeleton keeps its `sm`.
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
    // The userland question is membership in the release's scale; the number
    // is the theme's, and a theme that lost the group paints the library's —
    // the rule `radiusValue` states. A bogus name has no number either way.
    expect(radiusValue(testTheme, "lg")).toBe(testTheme.radius.lg);
    const brand: PrimitiveTheme = {
      ...testTheme,
      radius: { ...testTheme.radius, lg: 11 },
    };
    expect(radiusValue(brand, "lg")).toBe(11);
  });
});

describe("a numeric group a store gave back", () => {
  // Bug guarded: a theme restored from storage writes `null` for a group it
  // did not carry and JSON has no `undefined`, so every painter that indexed a
  // scale directly threw `TypeError: Cannot read properties of null (reading
  // 'md')` from the first layout that asked for a gap — one truncated theme
  // emptied the window. The type seam (`typeOf`, `familyOf`) already answers
  // the library's own role for a group it lost; the numeric groups answer the
  // library's own numbers the same way, and the gate still refuses the theme.
  // The cast is the storage boundary: a stored theme is decoded JSON, where a
  // group it did not carry is `null` rather than absent.
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
    // The generic reader behind them is the same rule for any table.
    expect(scaleValue(null, librarySpacing, "xs")).toBe(librarySpacing.xs);
    expect(scaleValue({ xs: Number.NaN }, librarySpacing, "xs")).toBe(
      librarySpacing.xs,
    );
  });

  it("keeps the theme's own number, and reads a nulled step as the library's", () => {
    // A brand's scale is the one that paints: the numbers below differ from the
    // library's own in every group, so a fallback that ignored the theme cannot
    // pass this case. (The test fixture mirrors the library's scale, which is
    // why the brand is written out.)
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
    // A key a store kept without a value is a token that is not there.
    const nulledStep = {
      spacing: { ...testTheme.spacing, md: null },
    } as unknown as PrimitiveTheme["spacing"];
    expect(spaceValue({ spacing: nulledStep }, "md")).toBe(librarySpacing.md);
  });

  it("reads a stored size name as the default step before it falls back", () => {
    // A size name this release does not carry is `md` (the rule every control
    // documents), and a lost scale is the library's `md` — one answer either way.
    const renamed = "huge" as ControlSize;
    expect(iconSideOf({}, renamed)).toBe(libraryIconSize.md);
    expect(controlHeightOf({}, renamed)).toBe(libraryDensity.controlHeight.md);
    expect(controlPaddingOf({}, renamed)).toBe(
      libraryDensity.controlPaddingX.md,
    );
  });

  it("paints the library's border width for a group the theme lost", () => {
    expect(borderWidthOf({}, "thin")).toBe(libraryBorderWidth.thin);
    expect(borderWidthOf({}, "strong")).toBe(libraryBorderWidth.strong);
    expect(borderWidthOf(stored({ borderWidth: null }), "thin")).toBe(
      libraryBorderWidth.thin,
    );
    // A brand's own widths are the ones that paint.
    const brand = stored({ borderWidth: { thin: 3, strong: 5 } });
    expect(borderWidthOf(brand, "thin")).toBe(3);
    expect(borderWidthOf(brand, "strong")).toBe(5);
    // And every painter that asks for one takes the seam.
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
    // A platform's metrics are an optional group, so the gate does not require
    // them; JSON writes `null` for one a store did not carry. The declared
    // paint still reads, and the box falls back to the derived accent switch
    // instead of handing `switchMetricsAt` a `null` to measure.
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
    // A second direct read would be a second rule, and the painter would throw
    // on the theme the seam survives.
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
    const page = read("../../docs/theme-provider.mdx");
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
      page:
        page.includes("library's own numbers") &&
        page.includes("missingTokens") &&
        page.includes("extendTheme"),
    }).toEqual({ readers: true, rule: true, gate: true, page: true });
  });

  it("publishes the paint-side readers from the package entry", () => {
    // Bug guarded: `rowHeightOf` and its siblings are the one rule that keeps a
    // truncated theme from throwing mid-paint, but this package published none
    // of them, so a package that paints rows had to index
    // `theme.density.rowHeight` directly — the read this seam exists to remove —
    // and `@gpuixui/data` did. Each reader is the painters' own function, not a
    // second copy, and each answers through the entry a consumer imports.
    expect({
      spaceValue: primitives.spaceValue === spaceValue,
      radiusValue: primitives.radiusValue === radiusValue,
      iconSideOf: primitives.iconSideOf === iconSideOf,
      controlHeightOf: primitives.controlHeightOf === controlHeightOf,
      controlPaddingOf: primitives.controlPaddingOf === controlPaddingOf,
      rowHeightOf: primitives.rowHeightOf === rowHeightOf,
      borderWidthOf: primitives.borderWidthOf === borderWidthOf,
    }).toEqual({
      spaceValue: true,
      radiusValue: true,
      iconSideOf: true,
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
    // A brand's own numbers still win through the same entry.
    expect(primitives.rowHeightOf(testTheme)).toBe(testTheme.density.rowHeight);
  });

  it("teaches the published set where another package paints", () => {
    const readme = readFileSync(
      fileURLToPath(new URL("../../README.md", import.meta.url)),
      "utf8",
    );
    // Prose wraps, so the claim is read as one line.
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
  // Bug guarded: a theme restored from storage writes `null` for a group it
  // did not carry and JSON has no `undefined`, so every painter read a role off
  // the group directly — `theme.colors.primary` and 87 more — and the first
  // control to ask for its fill threw `TypeError: Cannot read properties of
  // null (reading 'primary')`, emptying the window. A role is additive, so the
  // tokens package *reports* the group (`invalidColorRoles`) rather than
  // refusing the theme; the paint seam answers no role for it, and the control
  // keeps whatever its recipe already declared.
  // The cast is the storage boundary: a stored theme is decoded JSON, where a
  // group it did not carry is `null` rather than absent.
  const stored = (colors: unknown): PrimitiveTheme =>
    ({ ...testTheme, colors }) as unknown as PrimitiveTheme;

  it("reads the roles the theme still carries", () => {
    expect(colorsOf(testTheme)).toBe(testTheme.colors);
    expect(colorRole(testTheme, "primary")).toBe(testTheme.colors.primary);
    expect(colorRole(testTheme, "skeleton")).toBe(testTheme.colors.skeleton);
    // A brand's own role is the one that paints.
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
    // A key a store kept without a value is a token that is not there: JSON
    // writes `null`, and a hand-edited literal can carry a number.
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
    // Only the colour is gone: the metrics the same resolver reads still paint,
    // so a lost role does not collapse the control's box with its fill.
    const complete = controlStyle(
      { variant: buttonVariants.primary, size: "md" },
      testTheme,
    );
    expect(control.backgroundColor).toBeUndefined();
    expect(control.color).toBeUndefined();
    expect(control.height).toBe(complete.height);
    expect(control.fontSize).toBe(complete.fontSize);
    // The four probes the group was reported on.
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
    // And the rest of the paint seams, so a second raw read cannot hide here.
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
    // A second direct read would be a second rule, and the painter would throw
    // on the theme the seam survives. The tokens' own reader is the one place
    // the group is opened; the package reads a role through `colorRole`.
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
    const page = read("../../docs/theme-provider.mdx");
    expect({
      readers: ["colorsOf", "colorRole", "ColorRef"].every((name) =>
        readme.includes(name),
      ),
      rule:
        readme.includes("paints nothing") &&
        readme.includes("themeColors") &&
        readme.includes("invalidColorRoles"),
      page:
        page.includes("no role") &&
        page.includes("resting fill") &&
        page.includes("invalidColorRoles"),
    }).toEqual({ readers: true, rule: true, page: true });
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
  /** The type group without the `body` role, as a store hands it back. */
  const withoutBody = (): Partial<PrimitiveTheme["typography"]> => {
    const { body: _body, ...typography } = testTheme.typography;
    return typography;
  };

  it("paints the theme's own role", () => {
    expect(typeOf(testTheme, "body")).toBe(testTheme.typography.body);
    expect(typeOf(testTheme, "h1")).toBe(testTheme.typography.h1);
    // A theme that overrode a role paints the override, not the library's.
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
    // The bug this holds: every painter read `theme.typography[role]` directly,
    // so a theme restored from storage that predates a role threw
    // `TypeError: Cannot read properties of undefined (reading 'fontSize')` in
    // the first paint and took the tree down with it.
    expect(typeOf({ typography: withoutBody() }, "body")).toEqual(
      libraryScale.body,
    );
    // The whole group lost is the same absence.
    expect(typeOf({}, "body")).toEqual(libraryScale.body);
    // A role a store wrote as `null` is the absence it is.
    expect(typeOf({ typography: { body: null } }, "body")).toEqual(
      libraryScale.body,
    );
    // And the roles the theme does carry are still its own.
    expect(typeOf({ typography: withoutBody() }, "h1")).toBe(
      testTheme.typography.h1,
    );
  });

  it("reads a role name the scale does not carry as the body default", () => {
    // The same rule `controlSize` follows for a size name a release dropped: a
    // name the scale does not carry is the documented default, not a lookup
    // that answers `undefined`. The default is the **theme's** body — a brand
    // that resized its scale keeps its own type, and only a theme that lost the
    // role falls back to the library's.
    expect(isTextRole("body")).toBe(true);
    expect(isTextRole("bodyStrong")).toBe(true);
    expect(isTextRole("bodyy")).toBe(false);
    expect(isTextRole("sans")).toBe(false);
    expect(typeOf(testTheme, "bodyy")).toEqual(testTheme.typography.body);
    expect(typeOf(testTheme, undefined)).toEqual(testTheme.typography.body);
    expect(typeOf({}, "bodyy")).toEqual(libraryScale.body);
  });

  it("reads stored roles through the token guard, not a second list", () => {
    // The bug this holds: the seam kept its own `R.keys(typography)` list beside
    // the token package's published index, so a role the tokens package grew
    // would be accepted by the guard a consumer iterates and refused here — the
    // primitive would paint `body` for a role the library documents.
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
    // A second direct read would be a second rule: the painter would crash on
    // the theme the seam survives.
    const read = /\.typography\s*\[|\.typography\.[A-Za-z]/;
    const offenders = Arr.filter(walk(sourceDir), (path) => {
      if (path.endsWith(join("core", "theme.ts"))) return false;
      return read.test(readFileSync(path, "utf8"));
    });
    expect(offenders).toEqual([]);
  });
});

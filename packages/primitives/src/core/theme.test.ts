import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  isTextRole as tokenTextRole,
  keyboardFocusRing,
  textRoles,
  typography as libraryScale,
} from "@gpuixui/tokens";
import { sliderInset, sliderTrackStyle } from "./style.js";
import { controlStyle } from "./style.js";
import { keyboardRing } from "./focus.js";
import {
  radioDotStyle,
  selectionBoxStyle,
  selectionTargetStyle,
  switchBox,
  switchThumbStyle,
} from "./selection.js";
import { buttonVariants } from "./variants.js";
import { testTheme } from "./testing/theme.fixture.js";
import {
  controlSize,
  elevationLevel,
  familyOf,
  isTextRole,
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

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { keyboardFocusRing } from "@gpuixui/tokens";
import { controlStyle } from "./style.js";
import { keyboardRing } from "./focus.js";
import { buttonVariants } from "./variants.js";
import { testTheme } from "./testing/theme.fixture.js";
import { controlSize, type PrimitiveTheme } from "./theme.js";

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

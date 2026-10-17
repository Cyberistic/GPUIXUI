import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { controlStyle } from "./style.js";
import { buttonVariants } from "./variants.js";
import { testTheme } from "./testing/theme.fixture.js";
import type { PrimitiveTheme } from "./theme.js";

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

/** The fixture is the one file whose subject is a colour. */
const COLOUR_FILES = [join("testing", "theme.fixture.ts")];

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

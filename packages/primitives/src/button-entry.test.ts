/**
 * The `@gpuixui/primitives/button` route.
 *
 * The bug this suite guards: before the subpath existed, the only way to reach
 * `Button` from another package was the root barrel, which re-exports every
 * primitive. Plan 160 measured that route at **52 modules / 416 KiB** against a
 * subpath's 5 / 49, so `@gpuixui/components` kept a second button
 * implementation rather than load the whole Tier 1 package to paint one
 * control. A manifest entry that later points at the barrel, or an entry that
 * re-exports one more component, brings that cost back — and nothing about the
 * import looks different at the call site.
 *
 * The second bug: a layer painted over an action (a busy loader, a chevron, an
 * effect's wash) had to guess the action's label role, and a role belonging to
 * another fill is invisible — `secondaryForeground` on a `primary` fill measures
 * 1.42:1 in Windows dark. `actionOnColor` publishes the table's own answer, so
 * the guess has one home.
 */

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import * as buttonEntry from "@gpuixui/primitives/button";
import type * as ButtonTypes from "@gpuixui/primitives/button";
import { Button } from "./components/Button.js";
import { IconButton } from "./components/IconButton.js";
import { testTheme } from "./core/testing/theme.fixture.js";
import {
  actionOnColor,
  buttonVariants,
  BUTTON_VARIANTS,
} from "./core/variants.js";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const entryFile = join(packageRoot, "src", "button.ts");
const componentsRoot = join(packageRoot, "src", "components");
const manifestFile = join(packageRoot, "package.json");

const Manifest = Schema.Struct({
  exports: Schema.Record(
    Schema.String,
    Schema.Struct({ types: Schema.String, default: Schema.String }),
  ),
});

const manifest = (): typeof Manifest.Type =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
    readFileSync(manifestFile, "utf8"),
  );

/** A relative specifier, the only kind that reaches another module in this package. */
const RELATIVE_IMPORT = /(?:from|import)\s+"(\.[^"]+)"/g;

const resolveModule = (from: string, specifier: string): string => {
  const base = resolve(dirname(from), Str.replace(/\.js$/, "")(specifier));
  return Option.match(
    Arr.findFirst([".ts", ".tsx"], (extension) =>
      existsSync(`${base}${extension}`),
    ),
    {
      onNone: () =>
        expect.fail(
          `${basename(from)} imports ${specifier}, which resolves to no module`,
        ),
      onSome: (extension) => `${base}${extension}`,
    },
  );
};

/** Every module the entry's own imports reach, the entry included. */
const importClosure = (entry: string): ReadonlySet<string> => {
  const visit = (
    file: string,
    seen: ReadonlySet<string>,
  ): ReadonlySet<string> =>
    seen.has(file)
      ? seen
      : Arr.reduce<RegExpMatchArray, ReadonlySet<string>>(
          Arr.fromIterable(
            readFileSync(file, "utf8").matchAll(RELATIVE_IMPORT),
          ),
          new Set([...seen, file]),
          (reached, match) =>
            visit(resolveModule(file, match[1] ?? ""), reached),
        );
  return visit(entry, new Set());
};

const modulesIn = (
  directory: string,
  files: ReadonlySet<string>,
): ReadonlyArray<string> =>
  Arr.sort(
    Arr.map(
      Arr.filter(
        Arr.fromIterable(files),
        (file) => dirname(file) === directory,
      ),
      (file) => basename(file),
    ),
    Order.String,
  );

describe("the action subpath", () => {
  it("publishes the action without the package barrel", () => {
    // The names are the route: a manifest entry that fell back to `src/index.ts`
    // would make this list every primitive the package ships.
    expect(Arr.sort(Object.keys(buttonEntry), Order.String)).toEqual([
      "Button",
      "IconButton",
      "actionOnColor",
    ]);
    expect(buttonEntry.Button).toBe(Button);
    expect(buttonEntry.IconButton).toBe(IconButton);
    expect(buttonEntry.actionOnColor).toBe(actionOnColor);
  });

  it("answers every variant with the role its label paints", () => {
    // The role map is read from the table the recipe paints from, so a variant
    // added here cannot answer `undefined` or a role belonging to another fill.
    expect(
      Arr.every(
        BUTTON_VARIANTS,
        (variant) =>
          buttonVariants[variant].foreground(testTheme) ===
          actionOnColor(testTheme, variant),
      ),
    ).toBe(true);
    // The four roles plan 160's callers name, held by value.
    expect(actionOnColor(testTheme, "primary")).toBe(
      testTheme.colors.primaryForeground,
    );
    expect(actionOnColor(testTheme, "destructive")).toBe(
      testTheme.colors.destructiveForeground,
    );
    expect(actionOnColor(testTheme, "secondary")).toBe(
      testTheme.colors.secondaryForeground,
    );
    expect(actionOnColor(testTheme, "ghost")).toBe(testTheme.colors.foreground);
    // A filled action's label role is not its fill: the premise the helper
    // exists for.
    expect(actionOnColor(testTheme, "primary")).not.toBe(
      testTheme.colors.primary,
    );
  });

  it("carries the prop types a consumer builds on", () => {
    const action: ButtonTypes.ButtonProps = { children: "Save changes" };
    const icon: ButtonTypes.IconButtonProps = { label: "Close", icon: null };
    expect(action.children).toBe("Save changes");
    expect(icon.label).toBe("Close");
  });

  it("declares the route in the manifest at the action entry", () => {
    expect(manifest().exports["./button"]).toEqual({
      types: "./src/button.ts",
      default: "./src/button.ts",
    });
  });

  it("reaches no other component than the action's own", () => {
    const closure = importClosure(entryFile);
    expect(closure.has(entryFile)).toBe(true);
    // `src/index.ts` is the barrel: reaching it is the cost this route exists
    // to avoid, whatever the manifest says.
    expect(closure.has(join(packageRoot, "src", "index.ts"))).toBe(false);
    // A new name here is a new module every consumer of the route loads, so it
    // has to be a deliberate change rather than a convenience re-export.
    // `MessagesProvider` rides the theme wrapper (`ThemeProvider` hands it the
    // words an interface announces), and it is a context plus one merge.
    expect(modulesIn(componentsRoot, closure)).toEqual([
      "Button.tsx",
      "IconButton.tsx",
      "MessagesProvider.tsx",
      "Spinner.tsx",
      "ThemeProvider.tsx",
      "internal.ts",
    ]);
  });
});

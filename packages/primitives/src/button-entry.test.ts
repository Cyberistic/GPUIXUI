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
    expect(
      Arr.every(
        BUTTON_VARIANTS,
        (variant) =>
          buttonVariants[variant].foreground(testTheme) ===
          actionOnColor(testTheme, variant),
      ),
    ).toBe(true);

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

    expect(closure.has(join(packageRoot, "src", "index.ts"))).toBe(false);

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

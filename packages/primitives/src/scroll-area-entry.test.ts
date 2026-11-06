import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import * as scrollAreaEntry from "@gpuixui/primitives/scroll-area";
import type * as ScrollAreaTypes from "@gpuixui/primitives/scroll-area";
import { ScrollArea, ScrollAreaViewport } from "./components/ScrollArea.js";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const entryFile = join(packageRoot, "src", "scroll-area.ts");
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

describe("the scroll subpath", () => {
  it("publishes the scroll box without the package barrel", () => {
    expect(Arr.sort(Object.keys(scrollAreaEntry), Order.String)).toEqual([
      "ScrollArea",
      "ScrollAreaViewport",
    ]);
    expect(scrollAreaEntry.ScrollArea).toBe(ScrollArea);
    expect(scrollAreaEntry.ScrollAreaViewport).toBe(ScrollAreaViewport);
  });

  it("carries the props a scroll reading measures with", () => {
    const area: ScrollAreaTypes.ScrollAreaProps = {
      axis: "vertical",
      viewportTestId: "rows",
      onLayout: () => {},
      onScrollChange: () => {},
    };
    const viewport: ScrollAreaTypes.ScrollAreaViewportProps = {
      onLayout: () => {},
    };
    expect(area.viewportTestId).toBe("rows");
    expect(area.onLayout).toBeTypeOf("function");
    expect(area.onScrollChange).toBeTypeOf("function");
    expect(viewport.onLayout).toBeTypeOf("function");
  });

  it("declares the route in the manifest at the scroll entry", () => {
    expect(manifest().exports["./scroll-area"]).toEqual({
      types: "./src/scroll-area.ts",
      default: "./src/scroll-area.ts",
    });
  });

  it("reaches the scroll box and no other component", () => {
    const closure = importClosure(entryFile);
    expect(closure.has(entryFile)).toBe(true);

    expect(closure.has(join(packageRoot, "src", "index.ts"))).toBe(false);

    expect(modulesIn(componentsRoot, closure)).toEqual([
      "MessagesProvider.tsx",
      "ScrollArea.tsx",
      "ThemeProvider.tsx",
      "internal.ts",
    ]);
  });
});

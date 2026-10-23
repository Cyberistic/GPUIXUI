/**
 * The `@gpuixui/primitives/scroll-area` route.
 *
 * The bug this suite guards: another package's scroll reading duplicated a
 * viewport instead of composing `ScrollArea`, because the scroll box was
 * reachable only through the root barrel — and the hint seam measured that
 * route at **52 modules / 416 KiB** against a subpath's 5 / 49. The duplication
 * cost the reading its keyboard contract (arrow keys, PageUp/PageDown,
 * Home/End). A manifest entry that later points at the barrel, or an entry that
 * re-exports one more component, brings that cost back, and nothing about the
 * import looks different at the call site.
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

describe("the scroll subpath", () => {
  it("publishes the scroll box without the package barrel", () => {
    // The names are the route: a manifest entry that fell back to `src/index.ts`
    // would make this list every primitive the package ships.
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
    // `src/index.ts` is the barrel: reaching it is the cost this route exists
    // to avoid, whatever the manifest says.
    expect(closure.has(join(packageRoot, "src", "index.ts"))).toBe(false);
    // A new name here is a new module every consumer of the route loads, so it
    // has to be a deliberate change rather than a convenience re-export. The
    // two providers carry the theme and the words the scroller announces.
    expect(modulesIn(componentsRoot, closure)).toEqual([
      "MessagesProvider.tsx",
      "ScrollArea.tsx",
      "ThemeProvider.tsx",
      "internal.ts",
    ]);
  });
});

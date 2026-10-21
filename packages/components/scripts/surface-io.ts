/**
 * The filesystem behind the surface measurement.
 *
 * `src/surface.ts` walks a graph through `SurfaceIO`; this is the one
 * implementation that reads the real workspace, used by both the gate
 * (`src/surface.test.ts`) and the report (`scripts/surface.ts`). Reading the
 * workspace from source is the point: every workspace package resolves through
 * its `exports` map to `src`, which is what a consumer's toolchain compiles.
 *
 * Node's sync filesystem and path APIs are deliberate: this is a one-shot
 * repository measurement, not runtime code.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";
import {
  measureSurface,
  packageName,
  type Surface,
  type SurfaceIO,
} from "../src/surface.js";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const packagesRoot = fileURLToPath(
  new URL("../../../packages/", import.meta.url),
);

/** The manifest fields this measurement reads. */
const Manifest = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  main: Schema.optionalKey(Schema.String),
  exports: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Record(Schema.String, Schema.Unknown)]),
  ),
});

/** One form of an `exports` entry. */
const ExportConditions = Schema.Struct({
  import: Schema.optionalKey(Schema.String),
  default: Schema.optionalKey(Schema.String),
  types: Schema.optionalKey(Schema.String),
});

const manifestOf = (directory: string): typeof Manifest.Type =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
    readFileSync(join(directory, "package.json"), "utf8"),
  );

/** A workspace package's directory, by the name its manifest declares. */
const workspace: ReadonlyMap<string, string> = new Map(
  pipe(
    readdirSync(packagesRoot),
    Arr.filter((entry) =>
      existsSync(join(packagesRoot, entry, "package.json")),
    ),
    Arr.map((entry) => {
      const directory = join(packagesRoot, entry);
      return Option.map(
        Option.fromNullishOr(manifestOf(directory).name),
        (name) => [name, directory] as const,
      );
    }),
    Arr.getSomes,
  ),
);

/** Extensions a relative specifier can resolve to, source first. */
const EXTENSIONS: ReadonlyArray<string> = [".ts", ".tsx", ".js", ".mjs"];

/** Every file `path` could name, source extensions first. */
const withExtensions = (path: string): ReadonlyArray<string> => {
  const bare = Str.replace(/\.(?:js|jsx)$/, "")(path);
  return Arr.appendAll(
    Arr.map(EXTENSIONS, (extension) => `${bare}${extension}`),
    [path, join(bare, "index.ts"), join(bare, "index.tsx")],
  );
};

/** The first candidate that is a file. */
const firstFile = (candidates: ReadonlyArray<string>): Option.Option<string> =>
  Arr.findFirst(candidates, existsSync);

/** The target of one `exports` entry, however the manifest writes it. */
const exportTarget = (value: unknown): Option.Option<string> => {
  if (typeof value === "string") return Option.some(value);
  return Schema.is(ExportConditions)(value)
    ? Option.fromNullishOr(value.import ?? value.default ?? value.types)
    : Option.none();
};

/** The value a manifest's `exports` map declares for a key. */
const declaredExport = (
  manifest: typeof Manifest.Type,
  key: string,
): Option.Option<unknown> =>
  typeof manifest.exports === "string"
    ? key === "."
      ? Option.some(manifest.exports)
      : Option.none()
    : Option.fromNullishOr(manifest.exports?.[key]);

/** The file a bare specifier resolves to inside a workspace package. */
const resolveBare = (
  specifier: string,
  name: string,
  directory: string,
): Option.Option<string> => {
  const manifest = manifestOf(directory);
  const subpath = specifier.slice(name.length + 1);
  const declared =
    specifier === name
      ? Option.flatMap(declaredExport(manifest, "."), exportTarget)
      : Option.flatMap(declaredExport(manifest, `./${subpath}`), exportTarget);
  return pipe(
    Option.orElse(declared, () => Option.fromNullishOr(manifest.main)),
    Option.map((target) => resolve(directory, target)),
    Option.flatMap((target) =>
      existsSync(target)
        ? Option.some(target)
        : firstFile(withExtensions(join(directory, "src", subpath))),
    ),
  );
};

const io: SurfaceIO = {
  read: (path) =>
    existsSync(path) ? Option.some(readFileSync(path, "utf8")) : Option.none(),
  resolve: (from, specifier) => {
    if (Str.startsWith(".")(specifier)) {
      return firstFile(withExtensions(resolve(dirname(from), specifier)));
    }
    return pipe(
      packageName(specifier),
      Option.flatMap((name) =>
        Option.flatMap(Option.fromNullishOr(workspace.get(name)), (directory) =>
          resolveBare(specifier, name, directory),
        ),
      ),
    );
  },
  group: (path) => {
    const owner = Arr.findFirst(Arr.fromIterable(workspace), ([, directory]) =>
      path.startsWith(`${directory}/`),
    );
    return Option.getOrElse(
      Option.map(owner, ([name]) => name),
      () => "external",
    );
  },
};

/** Walk this package's entry and everything it reaches. */
export const measurePackageSurface = (): Surface =>
  measureSurface(join(packageRoot, "src/index.ts"), io);

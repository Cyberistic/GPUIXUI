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

const Manifest = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  main: Schema.optionalKey(Schema.String),
  exports: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Record(Schema.String, Schema.Unknown)]),
  ),
});

const ExportConditions = Schema.Struct({
  import: Schema.optionalKey(Schema.String),
  default: Schema.optionalKey(Schema.String),
  types: Schema.optionalKey(Schema.String),
});

const manifestOf = (directory: string): typeof Manifest.Type =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
    readFileSync(join(directory, "package.json"), "utf8"),
  );

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

const EXTENSIONS: ReadonlyArray<string> = [".ts", ".tsx", ".js", ".mjs"];

const withExtensions = (path: string): ReadonlyArray<string> => {
  const bare = Str.replace(/\.(?:js|jsx)$/, "")(path);
  return Arr.appendAll(
    Arr.map(EXTENSIONS, (extension) => `${bare}${extension}`),
    [path, join(bare, "index.ts"), join(bare, "index.tsx")],
  );
};

const firstFile = (candidates: ReadonlyArray<string>): Option.Option<string> =>
  Arr.findFirst(candidates, existsSync);

const exportTarget = (value: unknown): Option.Option<string> => {
  if (typeof value === "string") return Option.some(value);
  return Schema.is(ExportConditions)(value)
    ? Option.fromNullishOr(value.import ?? value.default ?? value.types)
    : Option.none();
};

const declaredExport = (
  manifest: typeof Manifest.Type,
  key: string,
): Option.Option<unknown> =>
  typeof manifest.exports === "string"
    ? key === "."
      ? Option.some(manifest.exports)
      : Option.none()
    : Option.fromNullishOr(manifest.exports?.[key]);

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

export const measurePackageSurface = (
  entry: string = join(packageRoot, "src/index.ts"),
): Surface => measureSurface(entry, io);

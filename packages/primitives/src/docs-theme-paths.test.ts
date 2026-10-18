/**
 * A documented theme path must resolve (plan `333`).
 *
 * The icons README documented `theme.color.mutedForeground` and
 * `theme.color.destructive.background`; neither exists on the shipped `Theme`,
 * and a reader copying the snippet got a type error. The docs, READMEs,
 * examples and source docstrings of both Tier 1 packages are scanned here, so a
 * token rename cannot leave a false claim behind.
 *
 * Both packages are scanned from this one test because they document the same
 * token API and both are owned by this workstream; the alternative is the same
 * scanner twice.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { PlatformError } from "effect/PlatformError";
import { describe, expect, it } from "vitest";
import { lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as R from "effect/Record";
import * as Str from "effect/String";

/** A path whose last segment is one of these names a file, not a theme key. */
const SOURCE_EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "json"];

/** `theme.x.y` — the identifier chain a reader would copy. */
const THEME_PATH =
  /\btheme\.([A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*)/g;

const SCANNABLE = /\.(md|mdx|ts|tsx)$/;
/** A suite may carry a deliberately wrong path; only shipped docs are claims. */
const TEST_FILE = /\.test\.(ts|tsx)$/;

/** What a scan found: the document (relative to the repo root) and the path. */
interface Claim {
  readonly file: string;
  readonly segments: ReadonlyArray<string>;
}

/** Every file under a path, recursively. */
const filesUnder = (
  path: Path.Path,
  fs: FileSystem.FileSystem,
  root: string,
): Effect.Effect<ReadonlyArray<string>, PlatformError> =>
  Effect.gen(function* () {
    const info = yield* fs.stat(root);
    if (info.type === "File") return [root];
    const entries = yield* fs.readDirectory(root);
    const children = yield* Effect.forEach(
      entries,
      (entry) => filesUnder(path, fs, path.join(root, entry)),
      { concurrency: 8 },
    );
    return Arr.flatten(children);
  });

/** The theme paths a document claims. */
const claimsIn = (file: string, text: string): ReadonlyArray<Claim> =>
  Arr.getSomes(
    Arr.map(Arr.fromIterable(text.matchAll(THEME_PATH)), (match) =>
      Option.map(Option.fromNullishOr(match[1]), (chain) => ({
        file,
        segments: Str.split(chain, "."),
      })),
    ),
  );

const scan = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const here = import.meta.dirname;
  const primitives = path.join(here, "..");
  const icons = path.join(here, "..", "..", "icons");
  const workspace = path.join(primitives, "..", "..");
  const roots = [
    path.join(primitives, "README.md"),
    path.join(primitives, "docs"),
    path.join(primitives, "examples"),
    path.join(primitives, "src"),
    path.join(icons, "README.md"),
    path.join(icons, "docs"),
    path.join(icons, "src"),
  ];
  const files = Arr.flatten(
    yield* Effect.forEach(roots, (root) => filesUnder(path, fs, root), {
      concurrency: 4,
    }),
  );
  const scannable = Arr.filter(
    files,
    (file) => SCANNABLE.test(file) && !TEST_FILE.test(file),
  );
  const claims = yield* Effect.forEach(
    scannable,
    (file) =>
      Effect.map(fs.readFileString(file), (text) =>
        claimsIn(path.relative(workspace, file), text),
      ),
    { concurrency: 8 },
  );
  return { files: scannable, claims: Arr.flatten(claims) };
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** A file reference (`theme.ts`, `theme.fixture.js`) is not a theme path. */
const isFileReference = (segments: ReadonlyArray<string>): boolean =>
  Arr.contains(
    SOURCE_EXTENSIONS,
    Option.getOrElse(Arr.last(segments), () => ""),
  );

/** One segment of a documented path, resolved on the real theme. */
const child = (value: unknown, segment: string): Option.Option<unknown> =>
  P.isObject(value) ? R.get(value, segment) : Option.none();

/** Resolve a documented path on the real theme; `None` when it does not exist. */
const resolveThemePath = (
  segments: ReadonlyArray<string>,
): Option.Option<unknown> =>
  Option.flatMap(Arr.head(segments), (head) =>
    Option.flatMap(
      P.isObject(lightTheme) ? R.get(lightTheme, head) : Option.none(),
      (value) =>
        Arr.reduce(
          Arr.drop(segments, 1),
          Option.some(value),
          (current, segment) =>
            Option.flatMap(current, (resolved) => child(resolved, segment)),
        ),
    ),
  );

const label = (claim: Claim): string =>
  `${claim.file}: theme.${Arr.join(claim.segments, ".")}`;

describe("documented theme paths", () => {
  it("resolve on the shipped theme", async () => {
    const { claims } = await Effect.runPromise(scan);
    const broken = Arr.filter(
      claims,
      (claim) =>
        !isFileReference(claim.segments) &&
        Option.isNone(resolveThemePath(claim.segments)),
    );
    expect(Arr.map(broken, label)).toStrictEqual([]);
  });

  it("reads the icon page, so the scan is live", async () => {
    const { claims } = await Effect.runPromise(scan);
    expect(
      Arr.some(
        claims,
        (claim) => claim.file === "packages/icons/docs/icon.mdx",
      ),
    ).toBe(true);
  });
});

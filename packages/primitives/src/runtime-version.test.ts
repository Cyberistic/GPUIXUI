/**
 * The version a capability verdict was taken on.
 *
 * A page that says "GPUix has no `aria-checked`" is a claim about one build, and
 * it went stale the moment the workspace adopted 0.11.0: fourteen primitives
 * pages still cited 0.10.0. The claims themselves were re-verified against the
 * installed typings (`aria-valuenow`/`checked`/`pressed`/`labelledby` are still
 * absent; `aria-description` and `aria-level` are present and used), so this
 * suite holds the *version* to the workspace pin — the half a find-and-replace
 * would have broken silently in the other direction.
 *
 * `node:fs` is the test-time boundary `docs.test.ts` and `inventory.test.ts`
 * already use.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

const read = (base: URL, relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, base)), "utf8");

/** The version the workspace pins for one GPUix package. */
const pin = (name: string): string => {
  const manifest = read(repoRoot, "package.json");
  const match = new RegExp(`"${name}": "([^"]+)"`).exec(manifest);
  if (match?.[1] === undefined) {
    throw new Error(`the workspace pins no ${name}`);
  }
  return match[1];
};

/** Every file under a directory with one extension, relative to the package. */
const walk = (dir: string, extension: string): ReadonlyArray<string> =>
  Arr.flatMap(
    readdirSync(fileURLToPath(new URL(dir, packageRoot)), {
      withFileTypes: true,
    }),
    (entry) => {
      const path = `${dir}${entry.name}`;
      return entry.isDirectory()
        ? walk(`${path}/`, extension)
        : Str.endsWith(extension)(entry.name)
          ? [path]
          : [];
    },
  );

/** Every file whose prose or comments can name a runtime version. */
const sources = (): ReadonlyArray<string> => [
  ...walk("docs/", ".mdx"),
  "docs/README.md",
  "README.md",
  "MIGRATION.md",
  ...walk("src/", ".ts"),
  ...walk("src/", ".tsx"),
  ...walk("runtime/", ".tsx"),
  ...walk("examples/", ".tsx"),
];

interface Mention {
  readonly file: string;
  readonly packageName: string;
  readonly version: string;
}

/** Every `@gpuix/<package> <version>` and `GPUix <version>` a file names. */
const mentions = (): ReadonlyArray<Mention> =>
  Arr.flatMap(sources(), (file) => {
    const source = read(packageRoot, file);
    const packages = Arr.map(
      [...source.matchAll(/@gpuix\/(native|react)`?\s*@?(\d+\.\d+\.\d+)/g)],
      (match) => ({
        file,
        packageName: `@gpuix/${match[1] ?? ""}`,
        version: match[2] ?? "",
      }),
    );
    const bare = Arr.map(
      [...source.matchAll(/GPUix\s+(\d+\.\d+\.\d+)/g)],
      (match) => ({
        file,
        packageName: "@gpuix/native",
        version: match[1] ?? "",
      }),
    );
    return [...packages, ...bare];
  });

describe("the runtime version the primitives name", () => {
  it("is the one the workspace pins", () => {
    const pins: Readonly<Record<string, string>> = {
      "@gpuix/native": pin("@gpuix/native"),
      "@gpuix/react": pin("@gpuix/react"),
    };
    const problems = Arr.flatMap(mentions(), (mention) =>
      Option.match(R.get(pins, mention.packageName), {
        onNone: () => [],
        onSome: (version) =>
          mention.version === version
            ? []
            : [
                `${mention.file}: says ${mention.packageName} ${mention.version}, the workspace pins ${version}`,
              ],
      }),
    );
    expect(problems).toEqual([]);
  });

  it("is named often enough for the check to mean something", () => {
    // A scan that stopped matching would otherwise pass over nothing.
    expect(Arr.length(mentions())).toBeGreaterThan(8);
  });
});

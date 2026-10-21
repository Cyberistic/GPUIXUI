/**
 * The runtime version the component docs and sources name.
 *
 * A page that says "GPUix has no `aria-current`" is a claim about one build, so
 * the version beside it has to follow the workspace pin: this package still
 * cited the previous release in 66 places after the repo adopted 0.11.0. Those
 * claims were re-read
 * against the installed typings before the bump (`aria-valuenow`/`checked`/
 * `pressed`/`labelledby` are still absent, and the order of the aria set is
 * unchanged), and the claims that had genuinely closed were corrected rather
 * than relabelled: `focusVisible` paints (List), `preventDefault` exists
 * (HotkeyRecorder now swallows a recorded key), `createPortal` and a headless
 * `Button` are published (Dialog and the local stand-in say so), `win32-arm64`
 * has a binding, and motion animates box geometry rather than only width/left.
 *
 * This suite holds the *version* to the pin — the half a find-and-replace would
 * break silently in the other direction. Every `x.y.z` token in this package's
 * prose, source comments and examples is treated as a runtime claim, because no
 * other version is named here today; the floor fails if the scan stops matching.
 * The shared API spec (`docs/component-api.md`), which this package owns, is
 * scanned too: it went five releases stale while the scan covered only the
 * package's own files.
 *
 * `node:fs` is the test-time boundary `inventory.test.ts` and
 * `packages/primitives/src/runtime-version.test.ts` already use.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
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
  "README.md",
  ...walk("src/", ".ts"),
  ...walk("src/", ".tsx"),
  ...walk("examples/", ".tsx"),
];

/**
 * The shared API spec at the repo root. This package owns it, and it went five
 * releases stale while this scan covered only the package's own files. The other
 * root documents belong to the workstreams that write them and are guarded by
 * their own suites.
 */
const sharedSources = (): ReadonlyArray<string> => ["docs/component-api.md"];

/** A file to scan, the root it is read from and the label a failure prints. */
interface Source {
  readonly base: URL;
  readonly file: string;
  readonly label: string;
}

const scanned = (): ReadonlyArray<Source> => [
  ...Arr.map(sources(), (file) => ({
    base: packageRoot,
    file,
    label: `packages/components/${file}`,
  })),
  ...Arr.map(sharedSources(), (file) => ({
    base: repoRoot,
    file,
    label: file,
  })),
];

/**
 * A version token is a runtime claim when it is the runtime's own 0.x line (no
 * other 0.x version is named in this package) or is attached to `GPUix` or a
 * `@gpuix/*` package. Example data such as a "Release 2.4.0" label is not a
 * claim.
 */
const version =
  /(?:GPUix|@gpuix\/(?:native|react))`?\s*@?(\d+\.\d+\.\d+)|\b(0\.\d+\.\d+)\b/g;

interface Mention {
  readonly file: string;
  readonly line: number;
  readonly version: string;
}

/** Every version token a file names, with the line it sits on. */
const mentions = (): ReadonlyArray<Mention> =>
  Arr.flatMap(scanned(), ({ base, file, label }) => {
    const source = read(base, file);
    return Arr.map(Array.from(source.matchAll(version)), (match) => ({
      file: label,
      line: source.slice(0, match.index ?? 0).split("\n").length,
      version: match[1] ?? match[2] ?? "",
    }));
  });

describe("the runtime version the components name", () => {
  it("is the one the workspace pins", () => {
    const native = pin("@gpuix/native");
    const react = pin("@gpuix/react");
    const problems = Arr.filterMap(mentions(), (mention) =>
      mention.version === native
        ? Result.failVoid
        : Result.succeed(
            `${mention.file}:${mention.line}: says ${mention.version}, the workspace pins ${native}`,
          ),
    );

    expect(react).toBe(native);
    expect(problems).toEqual([]);
  });

  it("is named often enough for the check to mean something", () => {
    // A scan that stopped matching would otherwise pass over nothing.
    expect(Arr.length(mentions())).toBeGreaterThanOrEqual(100);
  });
});

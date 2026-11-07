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

const pin = (name: string): string => {
  const manifest = read(repoRoot, "package.json");
  const match = new RegExp(`"${name}": "([^"]+)"`).exec(manifest);
  if (match?.[1] === undefined) {
    throw new Error(`the workspace pins no ${name}`);
  }
  return match[1];
};

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
    expect(Arr.length(mentions())).toBeGreaterThan(3);
  });
});

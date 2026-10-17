import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { importSpecifiers } from "../lib/source-imports";
import { components } from "./registry";

/**
 * Guards tier V (plan 432). The bug: a component covered by a real GPUix suite
 * was rendered as "Not verified in the GPUix runtime" because no screenshot
 * existed. These checks make the coverage data prove itself: the file exists,
 * the command is the package's own script, and the suite imports the component.
 *
 * Node `fs` is deliberate here: this is a test boundary reading the repository,
 * the same way `registry.test.ts` and `dependencies.test.ts` do.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url));

const read = (path: string): string => readFileSync(join(root, path), "utf8");

const basename = (path: string): string =>
  path
    .split("/")
    .pop()
    ?.replace(/\.(tsx|ts|jsx|js)$/, "") ?? path;

const parentBasename = (path: string): string => basename(dirname(path));

const PackageJson = class PackageJson extends Schema.Class<PackageJson>(
  "PackageJson",
)({
  name: Schema.String,
  scripts: Schema.Record(Schema.String, Schema.String),
}) {};

type PackageJson = InstanceType<typeof PackageJson>;

const decodePackageJson = Schema.decodeUnknownSync(
  Schema.fromJsonString(PackageJson),
);

/** The nearest `package.json` at or above a directory. */
const packageAbove = (directory: string): Option.Option<string> => {
  const candidate = join(directory, "package.json");
  if (existsSync(join(root, candidate))) return Option.some(candidate);
  return directory === "." || directory === "/" || directory === ""
    ? Option.none()
    : packageAbove(dirname(directory));
};

/** The `package.json` that owns a file. Its absence is a broken fixture. */
const packageOf = (path: string): { path: string; json: PackageJson } =>
  pipe(
    packageAbove(dirname(path)),
    Option.match({
      onNone: () => expect.fail(`no package.json above ${path}`),
      onSome: (file) => ({ path: file, json: decodePackageJson(read(file)) }),
    }),
  );
/** The command the docs must print: the package's runtime script. */
const expectedCommand = (path: string): string => {
  const { json } = packageOf(path);
  const script =
    json.scripts["test:runtime"] !== undefined
      ? "test:runtime"
      : "test:behaviour";
  return `nub run --filter ${json.name} ${script}`;
};

/** Whether the suite mounts the component (plan 432 §5). */
const drivesComponent = (
  suite: string,
  record: (typeof components)[number],
): boolean => {
  const sourcePath = record.sourcePath;
  if (sourcePath === null) return false;
  const specifiers = importSpecifiers(read(suite));

  if (record.packageName === "@gpuixui/primitives") {
    return specifiers.some(
      (specifier) =>
        specifier.startsWith(".") &&
        basename(specifier) === basename(sourcePath),
    );
  }

  if (record.packageName !== "@gpuixui/components") {
    return specifiers.includes(record.packageName);
  }

  const suiteName = suite
    .split("/")
    .pop()
    ?.replace(/\.test\.tsx$/, "");
  return (
    suiteName === basename(sourcePath) ||
    suiteName === parentBasename(sourcePath)
  );
};

const delivered = components.filter((record) => record.sourcePath !== null);

describe("native coverage", () => {
  it("gives every delivered component a suite, and no planned one", () => {
    const violations = components.flatMap((record) => {
      const isDelivered = record.sourcePath !== null;
      if (isDelivered && record.runtime === null) {
        return [`${record.slug}: delivered without a native suite`];
      }
      if (!isDelivered && record.runtime !== null) {
        return [`${record.slug}: planned with a native suite`];
      }
      return [];
    });
    expect(violations).toEqual([]);
  });

  it("points every suite at a file that exists", () => {
    const missing = delivered.flatMap((record) => {
      const testFile = record.runtime?.testFile;
      if (testFile === undefined) return [];
      return existsSync(join(root, testFile)) && testFile.endsWith(".test.tsx")
        ? []
        : [`${record.slug}: ${testFile} is not a test file on disk`];
    });
    expect(missing).toEqual([]);
  });

  it("prints the command the suite's own package defines", () => {
    const drifted = delivered.flatMap((record) => {
      const runtime = record.runtime;
      if (runtime === null) return [];
      const expected = expectedCommand(runtime.testFile);
      return runtime.command === expected
        ? []
        : [
            `${record.slug}: expected "${expected}", found "${runtime.command}"`,
          ];
    });
    expect(drifted).toEqual([]);
  });

  it("names a suite that imports the component it claims to cover", () => {
    const unproven = delivered.flatMap((record) => {
      const runtime = record.runtime;
      if (runtime === null) return [];
      return drivesComponent(runtime.testFile, record)
        ? []
        : [`${record.slug}: ${runtime.testFile} does not import it`];
    });
    expect(unproven).toEqual([]);
  });
});

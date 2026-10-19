import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NativePlatforms } from "@/components/native-platforms";
import { GPUixVersion, nativePlatforms } from "./native-platforms";

/**
 * Guards plan 584: the installation page's native-binding table states the
 * platforms GPUix really publishes, and the one it does not.
 *
 * The bug being guarded is a page that quietly offers a binary the pinned
 * package cannot install: Intel macOS follows the install and fails when the
 * window opens. The published rows are compared with the installed
 * `@gpuix/native` package's own `napi.targets` and optional dependencies, so
 * adding a target to a future release fails this test until the page lists it,
 * and removing one fails it until the page stops listing it.
 *
 * `node:fs`/`node:module`/`node:path` and `JSON.parse` are deliberate: this is
 * a vitest boundary reading an installed package, the same pattern
 * `accessibility.test.ts` and `typography-truth.test.ts` use. The parsed value
 * is narrowed by a guard rather than asserted.
 */
interface NativeManifest {
  readonly version: string;
  readonly napi: { readonly targets: ReadonlyArray<string> };
  readonly optionalDependencies: Readonly<Record<string, string>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isNativeManifest = (value: unknown): value is NativeManifest => {
  if (!isRecord(value) || typeof value.version !== "string") return false;
  const napi = value.napi;
  const dependencies = value.optionalDependencies;
  return (
    isRecord(napi) &&
    isStringArray(napi.targets) &&
    isRecord(dependencies) &&
    Object.values(dependencies).every((item) => typeof item === "string")
  );
};

const resolve = createRequire(import.meta.url).resolve;
const packagePath = join(dirname(resolve("@gpuix/native")), "package.json");
const parsed: unknown = JSON.parse(readFileSync(packagePath, "utf8"));
if (!isNativeManifest(parsed)) {
  throw new Error(`${packagePath} is not a @gpuix/native manifest`);
}
const native = parsed;

const published = nativePlatforms.filter((platform) => platform.published);
const unpublished = nativePlatforms.filter((platform) => !platform.published);

const html = renderToStaticMarkup(<NativePlatforms />);

describe("native platform table data", () => {
  it("targets the installed @gpuix/native release", () => {
    expect(native.version).toBe(GPUixVersion);
  });

  it("publishes exactly the targets the package declares", () => {
    expect(published.map((platform) => platform.target)).toEqual(
      native.napi.targets,
    );
  });

  it("names the optional binary package for every published target", () => {
    const missing = published
      .filter(
        (platform) =>
          native.optionalDependencies[platform.packageName] !== GPUixVersion,
      )
      .map((platform) => platform.packageName);
    expect(missing).toEqual([]);
  });

  it("does not claim a binary for an unpublished target", () => {
    const claimed = unpublished
      .filter((platform) => platform.packageName in native.optionalDependencies)
      .map((platform) => platform.packageName);
    expect(claimed).toEqual([]);
  });

  it("lists Intel macOS as the unpublished target with no duplicate rows", () => {
    expect(unpublished.map((platform) => platform.target)).toEqual([
      "x86_64-apple-darwin",
    ]);
    const targets = nativePlatforms.map((platform) => platform.target);
    expect(new Set(targets).size).toBe(targets.length);
    expect(nativePlatforms.every((platform) => platform.label !== "")).toBe(
      true,
    );
  });
});

describe("native platform table render", () => {
  it("renders one row per platform with its published state", () => {
    expect(html.match(/data-target="/g) ?? []).toHaveLength(
      nativePlatforms.length,
    );
    expect(html.match(/data-published="yes"/g) ?? []).toHaveLength(
      published.length,
    );
    expect(html.match(/data-published="no"/g) ?? []).toHaveLength(
      unpublished.length,
    );
  });

  it("names every platform and the source-build remedy", () => {
    nativePlatforms.forEach((platform) => {
      expect(html).toContain(platform.label);
      expect(html).toContain(platform.target);
    });
    expect(html).toContain("build the pinned source");
  });
});

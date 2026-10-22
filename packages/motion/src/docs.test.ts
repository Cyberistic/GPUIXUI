/**
 * The runtime the package documents, and the preference verdict it quotes.
 *
 * The bugs these guard: the README and the hook JSDoc still said "GPUix 0.10"
 * after the workspace moved to 0.11.0, the timing seam said the capability
 * matrix "records the detection as unverified" while the record marks it `not
 * supported`, and that same header said the library ships "four levels" while
 * `motionLevels` has five. A reader of the package was told the wrong runtime,
 * a softer verdict than the repo measured, and a shorter table than it ships.
 *
 * The facts are derived from the workspace catalog, the capability record and
 * `motionLevels`, so the guard fails in both directions: a pin bump without the
 * docs, or a docs edit that drifts from the pin.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { motionLevels } from "./timing.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** A JSON object, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A catalog entry, failing when the manifest does not carry it. */
const catalogVersion = (
  catalog: Record<string, unknown>,
  name: string,
): string => {
  const version = catalog[name];
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(`docs: the workspace catalog has no "${name}" pin`);
  }
  return version;
};

const manifest: unknown = JSON.parse(read("../../../package.json"));
const workspaces = isRecord(manifest) ? manifest["workspaces"] : undefined;
const catalog = isRecord(workspaces) ? workspaces["catalog"] : undefined;
if (!isRecord(catalog)) {
  throw new Error("docs: the root manifest carries no workspace catalog");
}

const reactMinor = catalogVersion(catalog, "@gpuix/react");
const nativeMinor = catalogVersion(catalog, "@gpuix/native");
const [major = "", minor = ""] = reactMinor.split(".");
const pinnedMinor = `${major}.${minor}`;

/** Every source file in the package, so a comment cannot drift alone. */
const sources = readdirSync(new URL(".", import.meta.url))
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .map((name) => ({ name, text: read(`./${name}`) }));
const readme = read("../README.md");
const documents = [...sources, { name: "README.md", text: readme }];

/** The `GPUix <major>.<minor>` claims in a document. */
const namedMinors = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/GPUix (\d+\.\d+)/g)].map((match) => match[1] ?? "");

/** The `@gpuix/react@<version>` / `@gpuix/native@<version>` claims. */
const namedReleases = (text: string): ReadonlyArray<string> =>
  [...text.matchAll(/@gpuix\/(?:react|native)@(\d+\.\d+\.\d+)/g)].map(
    (match) => match[1] ?? "",
  );

describe("the runtime the motion package documents", () => {
  it("pins one renderer release for the React binding and its binding package", () => {
    expect(nativeMinor).toBe(reactMinor);
    expect(pinnedMinor).toMatch(/^\d+\.\d+$/);
  });

  it("names that release wherever a document names one", () => {
    const driftedMinors = documents.flatMap(({ name, text }) =>
      namedMinors(text)
        .filter((version) => version !== pinnedMinor)
        .map((version) => `${name}: GPUix ${version} (pinned ${pinnedMinor})`),
    );
    const driftedReleases = documents.flatMap(({ name, text }) =>
      namedReleases(text)
        .filter((version) => version !== reactMinor)
        .map(
          (version) => `${name}: @gpuix/*@${version} (pinned ${reactMinor})`,
        ),
    );

    expect(driftedMinors).toEqual([]);
    expect(driftedReleases).toEqual([]);
    // A document that names no runtime at all cannot satisfy the rule above.
    expect(documents.some(({ text }) => namedMinors(text).length > 0)).toBe(
      true,
    );
  });
});

describe("the reduced-motion verdict the package quotes", () => {
  const record = read("../../../docs/gpuix-capabilities.md");
  const verdict =
    record.match(/^\| Reduced-motion detection \| ([^|]+) \|/m)?.[1]?.trim() ??
    "";

  it("is the verdict the capability record measures", () => {
    expect(verdict).toBe("not supported");
  });

  it("is quoted by the seam that owns the preference, not softened", () => {
    const seam = read("../../components/src/motion.tsx");
    [
      sources.find(({ name }) => name === "timing.ts")?.text ?? "",
      seam,
    ].forEach((text) => {
      expect(text).toContain(verdict);
      expect(text).not.toContain("unverified");
    });
  });
});

describe("the level table the timing seam describes", () => {
  const numberWords = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
  ] as const;
  const count = Object.keys(motionLevels).length;

  it("counts its levels with the word the table has", () => {
    const timing = sources.find(({ name }) => name === "timing.ts")?.text ?? "";
    const claimed = timing.match(/named: (\w+) levels/)?.[1] ?? "";
    expect(claimed).toBe(numberWords[count] ?? `${count}`);
  });

  it("names every level in the README", () => {
    const missing = Object.keys(motionLevels).filter(
      (level) => !readme.includes(`\`${level}\``),
    );
    expect(missing).toEqual([]);
  });
});

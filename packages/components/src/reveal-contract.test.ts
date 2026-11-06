import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

interface Source {
  readonly path: string;
  readonly body: string;
}

const vanished = (error: unknown): boolean =>
  P.isObject(error) && "code" in error && error.code === "ENOENT";

const readSource = (path: string): Option.Option<Source> =>
  Result.match(
    Result.try(() =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8"),
    ),
    {
      onSuccess: (body) => Option.some({ path, body }),
      onFailure: (error): Option.Option<Source> => {
        if (vanished(error)) return Option.none();

        throw error;
      },
    },
  );

const scan = (relative: string): ReadonlyArray<Source> => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Arr.flatMap(
    readdirSync(directory, { withFileTypes: true }),
    (entry) => {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) return scan(`${path}/`);
      if (!/\.tsx?$/.test(entry.name)) return [];
      if (Str.includes(".test.")(entry.name)) return [];
      return Option.match(readSource(path), {
        onNone: () => [],
        onSome: (source) => [source],
      });
    },
  );
};

const sources = scan("src/");

const bodyOf = (path: string): string =>
  Option.getOrElse(
    Option.map(
      Arr.findFirst(sources, (source) => source.path === path),
      (source) => source.body,
    ),
    () => {
      throw new Error(`reveal contract: ${path} was not read`);
    },
  );

const mentions = (path: string, needle: string): boolean =>
  Str.includes(needle)(bodyOf(path));

const reveal = "src/auto-height.tsx";
const consumers = ["src/accordion.tsx", "src/collapsible.tsx"] as const;

describe("the measured reveal", () => {
  it("reads the tree it judges", () => {
    expect(Arr.length(sources)).toBeGreaterThan(100);
    expect(Arr.map(consumers, bodyOf)).toHaveLength(consumers.length);
  });

  it("has one implementation, so its rules cannot drift apart", () => {
    const offenders = Arr.filterMap(sources, (source) =>
      Str.includes("onLayout")(source.body) &&
      Str.includes("presenceMotion(")(source.body)
        ? Result.succeed(source.path)
        : Result.failVoid,
    );
    expect(offenders).toEqual([reveal]);
  });

  it("is composed by both disclosure parts", () => {
    const missing = Arr.filter(
      consumers,
      (file) => !mentions(file, "auto-height.js"),
    );
    expect(missing).toEqual([]);
  });

  it("is not re-inlined by the accordion", () => {
    expect(mentions("src/accordion.tsx", "onLayout")).toBe(false);
    expect(mentions("src/accordion.tsx", "presenceMotion(")).toBe(false);
  });

  it("still measures and tweens, so the rule cannot pass by deletion", () => {
    expect(mentions(reveal, "onLayout")).toBe(true);
    expect(mentions(reveal, "presenceMotion(")).toBe(true);
    expect(mentions(reveal, "useSurfacePresence(")).toBe(true);
    expect(mentions(reveal, "height: 0")).toBe(true);
  });
});

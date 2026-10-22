/**
 * The measured reveal has one implementation.
 *
 * The bug this guards: `AccordionContent` re-implemented `AutoHeight` — the same
 * `onLayout` measurement, the same clipped outer box and the same
 * `presenceMotion` height tween — so the reveal's rules had two homes. A fix to
 * one (the exit retarget, the reduced preference) need not reach the other, and
 * the accordion's copy had already drifted: its animate frame ignored the closed
 * state and it had no `style` state for a caller. The disclosure parts now
 * compose `AutoHeight`, and this suite keeps the rule in one module: no source
 * may both measure a body and tween its height, and both disclosure parts must
 * import the reveal.
 *
 * **The tree is read once, and an entry a concurrent writer removed is skipped**
 * — five sessions write this package, so a listing can name a file that is gone
 * at open time. `presence-contract.test.ts` measured that race (106 throws in a
 * five-second run against a directory another process was writing) and its walk
 * tolerates exactly one case: `ENOENT` between listing and read. Any other
 * failure still fails this suite, and a source floor keeps an empty scan from
 * satisfying the rule below by accident.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

/** One source file and the text read from it in the same pass. */
interface Source {
  readonly path: string;
  readonly body: string;
}

/** True for an entry another session removed between the listing and the read. */
const vanished = (error: unknown): boolean =>
  P.isObject(error) && "code" in error && error.code === "ENOENT";

/** Read one listed entry; a vanished one is skipped, anything else throws. */
const readSource = (path: string): Option.Option<Source> =>
  Result.match(
    Result.try(() =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8"),
    ),
    {
      onSuccess: (body) => Option.some({ path, body }),
      onFailure: (error): Option.Option<Source> => {
        if (vanished(error)) return Option.none();
        // A suite that cannot read the tree it judges is broken, not empty.
        throw error;
      },
    },
  );

/** Every readable source file under `relative`, recursively, minus suites. */
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

/** The body of one scanned source, or a broken suite when it is absent. */
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

/** Whether a source mentions `needle` at all. */
const mentions = (path: string, needle: string): boolean =>
  Str.includes(needle)(bodyOf(path));

/** Where the reveal lives, and the parts that must compose it. */
const reveal = "src/auto-height.tsx";
const consumers = ["src/accordion.tsx", "src/collapsible.tsx"] as const;

describe("the measured reveal", () => {
  it("reads the tree it judges", () => {
    // A scan that read nothing must not satisfy the rules below.
    expect(Arr.length(sources)).toBeGreaterThan(100);
    expect(Arr.map(consumers, bodyOf)).toHaveLength(consumers.length);
  });

  it("has one implementation, so its rules cannot drift apart", () => {
    // Measuring a body and tweening its height is `AutoHeight`'s job. A second
    // copy reads the same `onLayout` and paints the same frames, and the two
    // then have to be fixed twice.
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
    // The specific regression: the body measuring and tweening itself again.
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

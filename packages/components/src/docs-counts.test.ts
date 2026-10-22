/**
 * The native-test count every component page states.
 *
 * A page's `## Verification` says how many cases prove the component. The count
 * is prose, so it drifts when a case is added: `field.mdx` claimed 5 for a suite
 * that runs 6. `apps/docs` holds the four curated pages to their count and
 * `inventory.test.ts` holds the `COMPONENTS.md` rows; the package's own pages
 * had no guard, so this suite reads every `(N tests)` claim and counts the suite
 * it names. A claim that names no suite fails too, so an indirect count like
 * "the others are the guard (18 tests)" cannot hide. The pattern also reads a
 * claim a page wrapped onto the next line (`(36` / `tests)`): the space-only
 * pattern skipped exactly the page that had drifted.
 *
 * `node:fs` is a test-time repository read, the boundary `inventory.test.ts`
 * and `packages/primitives/src/docs.test.ts` already use.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);
const docsDir = new URL("docs/", packageRoot);

/** A stated count and the suite the page attributes it to. */
interface Claim {
  readonly page: string;
  readonly line: number;
  readonly stated: number;
  readonly suite: Option.Option<string>;
}

/**
 * How far before a count its suite may be named: enough for a claim that wraps
 * onto the next line, short enough that a path from an earlier section is not
 * borrowed.
 */
const ATTRIBUTION_WINDOW = 400;

/** A stated count. `\s+` matters: a page that wraps `(36` / `tests)` is still a
 *  claim, and the space-only pattern silently skipped the one page that had
 *  drifted. */
const countClaim = /\((\d+)\s+tests?\)/g;
const suitePath = /`(src\/[^`]+\.test\.tsx?)`/g;

/** The cases a suite declares, by the package's test-call convention. */
const countCases = (source: string): number =>
  Arr.length(source.match(/^\s*it\s*(?:\.effect\s*)?\(/gm) ?? []);

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

/** The suite named closest before each count, when one is in the window. */
const claimsIn = (page: string, source: string): ReadonlyArray<Claim> =>
  Arr.map(Array.from(source.matchAll(countClaim)), (match) => {
    const index = match.index ?? 0;
    const before = source.slice(Math.max(0, index - ATTRIBUTION_WINDOW), index);
    const named = Array.from(before.matchAll(suitePath));
    return {
      page,
      line: source.slice(0, index).split("\n").length,
      stated: Number(match[1]),
      suite: Option.fromNullishOr(named.at(-1)?.[1]),
    };
  });

const pages = Arr.filter(readdirSync(docsDir), Str.endsWith(".mdx"));
const claims = Arr.flatMap(pages, (page) =>
  claimsIn(page, read(`docs/${page}`)),
);

/** The cases the named suite declares, `None` when the page names no file. */
const actualCount = (suite: string): Option.Option<number> =>
  existsSync(fileURLToPath(new URL(suite, packageRoot)))
    ? Option.some(countCases(read(suite)))
    : Option.none();

/** Every claim that does name a suite, with the suite in hand. */
const named = Arr.filterMap(claims, (claim) =>
  Option.match(claim.suite, {
    onNone: () => Result.failVoid,
    onSome: (suite) => Result.succeed({ claim, suite }),
  }),
);

describe("docs test counts", () => {
  it("names the suite behind every stated count", () => {
    const anonymous = Arr.filterMap(claims, (claim) =>
      Option.isNone(claim.suite)
        ? Result.succeed(
            `${claim.page}:${claim.line} states ${claim.stated} tests without naming a suite`,
          )
        : Result.failVoid,
    );

    expect(anonymous).toEqual([]);
  });

  it("states the count the named suite runs", () => {
    const wrong = Arr.filterMap(named, ({ claim, suite }) =>
      Option.match(actualCount(suite), {
        onNone: () =>
          Result.succeed(
            `${claim.page}:${claim.line}: ${suite} does not exist`,
          ),
        onSome: (actual) =>
          actual === claim.stated
            ? Result.failVoid
            : Result.succeed(
                `${claim.page}:${claim.line} says ${claim.stated}, ${suite} runs ${actual}`,
              ),
      }),
    );

    expect(wrong).toEqual([]);
  });

  it("reads the claims it is meant to check", () => {
    expect(claims.length).toBeGreaterThanOrEqual(35);
  });

  it("reads a count that wraps onto the next line", () => {
    const fixture =
      "`src/behaviour/example.test.tsx` runs in the real renderer (36\n" +
      "tests): a claim a line break must not hide";
    const parsed = claimsIn("fixture.mdx", fixture);

    expect(
      Arr.map(parsed, (claim) => [claim.stated, claim.suite] as const),
    ).toEqual([[36, Option.some("src/behaviour/example.test.tsx")]]);
  });
});

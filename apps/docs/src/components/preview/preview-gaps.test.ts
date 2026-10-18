import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";
import { NO_LIVE_SCENE } from "./gaps";

/**
 * The bug this guards: `docs/preview-strategy.md` said "five records remain"
 * while `gaps.ts` measured nine, because plan 461 added four interaction-only
 * pages and nothing compared the prose to the code. The document is the
 * reader's only account of why a page has no live scene, so it is a contract.
 *
 * `readFileSync` is deliberate here: a test reads a fixed repository file at
 * import time, which is the boundary, not runtime domain code.
 */

const documentPath = fileURLToPath(
  new URL("../../../../../docs/preview-strategy.md", import.meta.url),
);
const document = readFileSync(documentPath, "utf8");

const heading = "### Pages with neither a live scene nor an illustration";

const section = ((): string => {
  const start = document.indexOf(heading);
  if (start < 0) return "";
  const rest = document.slice(start + heading.length);
  const next = rest.search(/^#{2,3} /m);
  return next < 0 ? rest : rest.slice(0, next);
})();

/** `| `slug` | reason |` → a row; header and separator rows yield nothing. */
const parseRow = (
  line: string,
): Result.Result<readonly [string, string], void> => {
  const cells = line.trim().match(/^\| (.*) \| (.*) \|$/);
  if (cells === null) return Result.failVoid;
  const [, first = "", second = ""] = cells;
  const slug = first.match(/^`([a-z0-9-]+)`$/)?.[1];
  return slug === undefined
    ? Result.failVoid
    : Result.succeed([slug, second.trim()] as const);
};

const rows = pipe(section.split("\n"), Arr.filterMap(parseRow));

const slugs = Arr.sort(
  Arr.map(rows, ([slug]) => slug),
  Order.String,
);

describe("preview-strategy gap list", () => {
  it("has the section the code is compared against", () => {
    expect(section).not.toBe("");
  });

  it("lists exactly the pages the code measures as gaps", () => {
    const measured = Arr.sort([...NO_LIVE_SCENE.keys()], Order.String);
    const missing = Arr.difference(measured, slugs);
    const extra = Arr.difference(slugs, measured);
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it("gives every documented gap a reason", () => {
    const empty = Arr.filterMap(rows, ([slug, reason]) =>
      reason.length === 0 || /TODO/i.test(reason)
        ? Result.succeed(slug)
        : Result.failVoid,
    );
    expect(empty).toEqual([]);
  });
});

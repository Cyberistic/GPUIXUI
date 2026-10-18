import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";
import { LIVE_SCENES, SCENE_GESTURE } from "../../../preview/scenes";
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

const readme = readFileSync(
  fileURLToPath(new URL("../../../README.md", import.meta.url)),
  "utf8",
);

const heading = "### Pages with neither a live scene nor an illustration";

/** The body of a section, from its heading to the next heading. */
const sectionAfter = (title: string): string => {
  const start = document.indexOf(title);
  if (start < 0) return "";
  const rest = document.slice(start + title.length);
  const next = rest.search(/^#{2,3} /m);
  return next < 0 ? rest : rest.slice(0, next);
};

const section = sectionAfter(heading);

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

/**
 * The bug this guards: plans 450 and 464 each fixed a hand-counted preview
 * total that had drifted from the registry, and plan 493 changed both totals
 * again. The document and the README are what a reader trusts, so their numbers
 * are derived from the scene table here instead of remembered at authoring time.
 */
describe("preview counts", () => {
  const gestureCount = Arr.length(
    Arr.filter(LIVE_SCENES, (scene) => SCENE_GESTURE[scene] !== undefined),
  );
  const gestureSection = sectionAfter("## Gestures are proved, not implied");

  const countIn = (source: string, pattern: RegExp): number =>
    Number(pattern.exec(source)?.[1] ?? Number.NaN);

  it("states the scene total the code ships", () => {
    const stated = countIn(document, /(\d+) scenes ship today/);
    expect(stated).toBe(Arr.length(LIVE_SCENES));
  });

  it("states the gesture total the code ships, in both documents", () => {
    const stated = {
      document: countIn(
        document,
        /(\d+) scenes document state only a gesture produces/,
      ),
      readme: countIn(readme, /(\d+) of\s+those/),
    };
    expect(stated).toEqual({ document: gestureCount, readme: gestureCount });
  });

  it("lists one gesture row per gesture scene", () => {
    const rows = pipe(
      gestureSection.split("\n"),
      Arr.filter((line) => /^\|.*\|$/.test(line)),
      Arr.length,
    );
    // The table's own header and separator are not scenes.
    expect(rows - 2).toBe(gestureCount);
  });
});

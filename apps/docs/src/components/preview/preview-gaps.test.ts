import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";
import {
  LIVE_SCENES,
  SCENE_GESTURE,
  SCENE_LABEL,
  SCENE_PAGE,
  isLiveScene,
} from "../../../preview/scenes";
import { components } from "../../component-meta/registry";
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

const componentPages = readFileSync(
  fileURLToPath(
    new URL("../../../content/docs/component-pages.mdx", import.meta.url),
  ),
  "utf8",
);

/**
 * The two scene kinds: one per delivered record, and one per composed page
 * (`SCENE_PAGE`, which has no component record). Both totals are derived here
 * once so no document can remember a number the registry does not ship.
 */
const liveRecordScenes = pipe(
  components,
  Arr.filterMap((component) => {
    const scene = component.liveScene;
    return scene === null || !isLiveScene(scene)
      ? Result.failVoid
      : Result.succeed({ scene, title: component.title });
  }),
);

const composedScenes = Arr.filter(
  LIVE_SCENES,
  (scene) => SCENE_PAGE[scene] !== undefined,
);

const patternScenes = Arr.filter(
  composedScenes,
  (scene) => SCENE_PAGE[scene] !== "/docs/showcase",
);

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"] as const;

const numberWord = (value: number): string =>
  Option.getOrElse(Arr.get(NUMBER_WORDS, value), () => `${value}`);

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

  const wordIn = (source: string, pattern: RegExp): string =>
    pattern.exec(source)?.[1] ?? "";

  it("states the scene total the code ships", () => {
    const stated = countIn(document, /(\d+) scenes ship today/);
    expect(stated).toBe(Arr.length(LIVE_SCENES));
  });

  it("states the record and composed split the strategy ships", () => {
    const stated = {
      records: countIn(document, /(\d+) are one per record/),
      composed: wordIn(document, /and (\w+) are composed pages/),
    };
    expect(stated).toEqual({
      records: Arr.length(liveRecordScenes),
      composed: numberWord(Arr.length(composedScenes)),
    });
  });

  it("states the open and gesture split in the tier-L paragraph", () => {
    const stated = countIn(document, /(\d+) more are opened by a real gesture/);
    expect(stated).toBe(gestureCount);
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

  it("states the component-scene total in the README", () => {
    const stated = countIn(readme, /\((\d+) today\)/);
    expect(stated).toBe(Arr.length(liveRecordScenes));
  });

  it("states the scene split on the component-pages template", () => {
    expect(Arr.length(patternScenes)).toBeGreaterThanOrEqual(1);
    const stated = {
      scenes: countIn(componentPages, /(\d+) scenes today/),
      patterns: wordIn(
        componentPages,
        /the Showcase page and the (\w+) pattern pages/,
      ),
    };
    expect(stated).toEqual({
      scenes: Arr.length(LIVE_SCENES),
      patterns: numberWord(Arr.length(patternScenes)),
    });
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

/**
 * The bug this guards: plan 513 added `message-scroller` and updated the counts,
 * but the tier-L row still ended at `Carousels`; the row and the gesture table
 * also used editorial plurals the registry does not use (`Sliders`,
 * `Number fields`, `Hotkey inputs`). Nothing compared a name, so a missing or
 * renamed component kept the counts right. The document and the index must name
 * a component the same way: the registry title, which `registry.test.ts` already
 * proves equals `COMPONENTS.md`.
 */
describe("the strategy names the code's scenes", () => {
  const gestures = Arr.filter(
    liveRecordScenes,
    ({ scene }) => SCENE_GESTURE[scene] !== undefined,
  );

  const tierRow = document.match(/^\| \*\*L\*\*.*$/m)?.[0] ?? "";

  const listed = pipe(
    /declares a `liveScene` \((.*?)\); click-to-load/.exec(tierRow)?.[1] ?? "",
    (value) => value.split(", "),
    Arr.map((name) => name.trim()),
  );

  const rowsUnder = (section: string): ReadonlyArray<string> =>
    pipe(
      section.split("\n"),
      Arr.filterMap((line) => {
        const cells = /^\| (.*?) \| (.*?) \|$/.exec(line.trim());
        if (cells === null) return Result.failVoid;
        const name = (cells[1] ?? "").trim();
        return name === "Scene" || /^-+$/.test(name)
          ? Result.failVoid
          : Result.succeed(name);
      }),
    );

  const expectedTitles = Arr.sort(
    Arr.map(liveRecordScenes, ({ title }) => title),
    Order.String,
  );
  const expectedGestures = Arr.sort(
    [
      ...Arr.map(gestures, ({ title }) => title),
      ...Arr.filterMap(SCENE_LABEL, ({ scene, title }) =>
        SCENE_GESTURE[scene] !== undefined
          ? Result.succeed(title)
          : Result.failVoid,
      ),
    ],
    Order.String,
  );

  it("names every live scene in the tier table", () => {
    expect(tierRow).not.toBe("");
    const named = Arr.sort(listed, Order.String);
    expect(new Set(named).size).toBe(named.length);
    expect({
      missing: Arr.difference(expectedTitles, named),
      extra: Arr.difference(named, expectedTitles),
    }).toEqual({ missing: [], extra: [] });
  });

  it("names one gesture row per gesture scene", () => {
    const named = Arr.sort(
      rowsUnder(sectionAfter("## Gestures are proved, not implied")),
      Order.String,
    );
    expect(new Set(named).size).toBe(named.length);
    expect({
      missing: Arr.difference(expectedGestures, named),
      extra: Arr.difference(named, expectedGestures),
    }).toEqual({ missing: [], extra: [] });
  });
});

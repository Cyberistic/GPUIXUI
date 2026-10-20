import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  deriveRoadmap,
  roadmapProblems,
  renderGeneratedModule,
  type RoadmapTarget,
} from "./roadmap";
import { noteSpans, plainNote } from "./roadmap-note";
import { roadmapTargets } from "./roadmap.generated";

/**
 * Guards the generated roadmap (plan 518). The page mirrors `COMPONENTS.md`, so
 * the failures worth catching are silent: the inventory gains or loses a row and
 * nobody regenerates, the parser reads a header or a separator as a target, or a
 * note's Markdown reaches the reader as literal backticks.
 *
 * `node:fs` is deliberate: this is a vitest boundary reading a repository file,
 * like `icon-catalogue.test.ts` and `capabilities.test.ts`.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const generatedPath = fileURLToPath(
  new URL("./roadmap.generated.ts", import.meta.url),
);
const live = deriveRoadmap({ root });
const generated = roadmapTargets;

const names = (targets: ReadonlyArray<RoadmapTarget>) =>
  targets.map((target) => target.name);

describe("the roadmap is generated from the inventory", () => {
  it("reads all three target tiers, in file order", () => {
    expect(new Set(live.map((target) => target.tier))).toEqual(
      new Set([3, 4, 5]),
    );
    expect(live[0]?.name).toBe("Tables");
    expect(live.at(-1)?.name).toBe("Message (AI message row)");
  });

  it("matches the committed module byte for byte", () => {
    expect(readFileSync(generatedPath, "utf8")).toBe(
      renderGeneratedModule(live),
    );
  });

  it("covers every inventory row in both directions", () => {
    expect({
      missing: names(live).filter((n) => !names(generated).includes(n)),
    }).toEqual({
      missing: [],
    });
    expect({
      extra: names(generated).filter((n) => !names(live).includes(n)),
    }).toEqual({
      extra: [],
    });
  });

  it("keeps every row's exact cells", () => {
    const byName = new Map(live.map((target) => [target.name, target]));
    const wrong = generated
      .filter((target) => {
        const source = byName.get(target.name);
        return (
          source === undefined ||
          source.status !== target.status ||
          source.support !== target.support ||
          source.note !== target.note
        );
      })
      .map((target) => target.name);
    expect(wrong).toEqual([]);
  });

  it("publishes no Tier 1 or Tier 2 component", () => {
    expect(generated.filter((target) => target.tier < 3)).toEqual([]);
    expect(names(generated)).not.toContain("Button");
    expect(names(generated)).not.toContain("Dialog");
  });

  it("reports no problem for the real inventory", () => {
    expect(roadmapProblems(live)).toEqual([]);
  });

  it("imports no node module into the browser bundle", () => {
    expect(readFileSync(generatedPath, "utf8")).not.toMatch(/from "node:/);
  });
});

describe("a note is split into readable spans", () => {
  const virtualized = live.find(
    (target) => target.name === "Virtualized tables",
  );

  it("renders backticked and bold content as spans, not punctuation", () => {
    const spans = noteSpans(virtualized?.note ?? "");
    expect(
      spans.filter((span) => span.kind === "code").map((span) => span.text),
    ).toContain("onVisibleRange");
    expect(
      spans.filter((span) => span.kind === "strong").map((span) => span.text),
    ).toContain("lags the painted window by one gesture");
    const plain = plainNote(virtualized?.note ?? "");
    expect(plain).not.toContain("`");
    expect(plain).not.toContain("**");
    expect(plain).toContain("onVisibleRange");
  });

  it("splits a synthetic note the same way", () => {
    expect(noteSpans("No `<table>` **element** here")).toEqual([
      { kind: "text", text: "No " },
      { kind: "code", text: "<table>" },
      { kind: "text", text: " " },
      { kind: "strong", text: "element" },
      { kind: "text", text: " here" },
    ]);
  });
});

describe("problems are reported instead of published", () => {
  const target: RoadmapTarget = {
    tier: 3,
    tierTitle: "data presentation",
    name: "Tables",
    status: "todo",
    support: "?",
    note: "rows",
  };

  it("rejects a duplicate name", () => {
    expect(roadmapProblems([target, target])).toContain(
      "Tables: duplicate target",
    );
  });

  it("rejects an empty cell", () => {
    expect(roadmapProblems([{ ...target, status: "" }])).toContain(
      "Tables: an empty cell",
    );
  });

  it("names each missing tier", () => {
    expect(roadmapProblems([target])).toContain("Tier 4: no targets");
    expect(roadmapProblems([target])).toContain("Tier 5: no targets");
  });
});

/**
 * Plan 618: `coverage` and `coming soon` reach the Roadmap, so the page has to
 * answer them. This guard fails when the section is deleted, when it stops
 * saying what coverage it is not, or when one of the three evidence pages it
 * links is dropped — the aliases would then land on a page with no answer.
 */
describe("the roadmap says what coverage it publishes", () => {
  const pagePath = fileURLToPath(
    new URL("../../content/docs/roadmap.mdx", import.meta.url),
  );
  const page = readFileSync(pagePath, "utf8");
  const start = page.indexOf("## What coverage means here");
  const end = start === -1 ? -1 : page.indexOf("\n## ", start + 1);
  const section =
    start === -1 ? "" : page.slice(start, end === -1 ? undefined : end);

  it("names the status coverage and the absent code coverage", () => {
    expect(section).toContain("status coverage");
    expect(section).toContain("No line, branch or function coverage");
    expect(section).toContain("todo");
  });

  it("links the three pages that own the evidence", () => {
    expect(section).toContain("(/docs/capabilities)");
    expect(section).toContain("(/docs/native-testing)");
    expect(section).toContain("(/docs/previews)");
  });
});

import { describe, expect, it } from "vitest";
import { componentAliases } from "./component-aliases";
import { components } from "@/component-meta/registry";
import { componentSymbols } from "@/component-meta/symbols";
import { plainNote } from "./roadmap-note";
import { roadmapAliases } from "./roadmap-aliases";
import { roadmapTargets } from "./roadmap.generated";
import { roadmapSearchEntry } from "./roadmap-search";
import { search } from "./search";
import { source } from "./source";

/**
 * Guards the roadmap's search document (plan 518). The page renders its rows
 * React from `roadmap.generated.ts`, so the MDX index never sees a target name —
 * `Resizable split panes` would return nothing. The failures worth catching are
 * a dropped document, a target absent from the content, and a promotion that
 * steals a plain word from the page that owns it (the rule plan 504 measured).
 */

const content = roadmapSearchEntry.index.content ?? "";

describe("the roadmap is indexed", () => {
  it("names every target, status and support value", () => {
    const missing = roadmapTargets.flatMap((target) => [
      ...(content.includes(target.name) ? [] : [target.name]),
      ...(content.includes(target.status) ? [] : [target.status]),
      ...(content.includes(target.support) ? [] : [target.support]),
      ...(content.includes(plainNote(target.note)) ? [] : [target.name]),
    ]);
    expect(missing).toEqual([]);
  });

  it("promotes exactly the multiword names and the guarded aliases", () => {
    const multiword = roadmapTargets
      .map((target) => target.name)
      .filter((name) => name.includes(" "));
    const aliases = [...roadmapAliases.values()].flat();
    expect(roadmapSearchEntry.names).toEqual([...multiword, ...aliases]);
    expect(roadmapSearchEntry.names).not.toContain("Tables");
  });
});

/**
 * Plan 585: a reader names a multiword target by one word (`diff`, `editor`,
 * `drag`, `markdown`, `toolbar`). The table is editorial vocabulary, so it must
 * name a real target, use a word the target already contains, and never shadow
 * a component, a page title or another alias.
 */
describe("roadmap aliases (plan 585)", () => {
  const terms = (): ReadonlyArray<{ target: string; term: string }> =>
    [...roadmapAliases].flatMap(([target, aliases]) =>
      aliases.map((term) => ({ target, term })),
    );

  it("keys every alias to a real target and uses a word the target contains", () => {
    const words = (value: string): ReadonlyArray<string> =>
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 0);
    const missing = [...roadmapAliases].flatMap(([name, aliases]) => {
      const target = roadmapTargets.find((entry) => entry.name === name);
      if (target === undefined) return [name];
      const targetWords = words(`${target.name} ${target.note}`);
      return aliases
        .filter((term) =>
          words(term).every(
            (word) => !targetWords.some((entry) => entry.startsWith(word)),
          ),
        )
        .map((term) => `${name}: ${term}`);
    });
    expect(missing).toEqual([]);
  });

  it("stores every term lower-case, trimmed and for one target only", () => {
    const malformed = terms()
      .filter(({ term }) => term !== term.trim().toLowerCase())
      .map(({ term }) => term);
    expect(malformed).toEqual([]);
    const counts = new Map<string, number>();
    terms().forEach(({ term }) =>
      counts.set(term, (counts.get(term) ?? 0) + 1),
    );
    expect(
      [...counts].filter(([, count]) => count > 1).map(([term]) => term),
    ).toEqual([]);
  });

  it("does not shadow a component, a page title or another alias", () => {
    const componentNames = new Set(
      components.flatMap((component) => [
        component.title.trim().toLowerCase(),
        ...componentSymbols(component).map((name) => name.toLowerCase()),
      ]),
    );
    const aliasTerms = new Set(
      [...componentAliases.values()].flat().map((term) => term.toLowerCase()),
    );
    const pageTitles = new Set(
      source.getPages().map((page) => (page.data.title ?? "").toLowerCase()),
    );
    const shadowing = terms()
      .filter(
        ({ term }) =>
          componentNames.has(term) ||
          aliasTerms.has(term) ||
          pageTitles.has(term),
      )
      .map(({ term }) => term);
    expect(shadowing).toEqual([]);
  });
});

describe("roadmap search", { timeout: 120_000 }, () => {
  it("finds the roadmap from a tracked target name", async () => {
    const results = await search("Resizable split panes", 5);
    expect(results[0]?.url).toBe("/docs/roadmap");
  });

  it("finds the roadmap from the singular or a prefix of a target", async () => {
    const queries = [
      "file tree",
      "log viewer",
      "code editor",
      "split panes",
      "property editor",
      "inspector panel",
    ];
    const first = await Promise.all(
      queries.map(async (query) => (await search(query, 5))[0]?.url),
    );
    expect(first).toEqual(queries.map(() => "/docs/roadmap"));
  });

  it("returns a single-word target in the results without promoting it", async () => {
    const results = await search("Toolbars", 5);
    expect(results.some((result) => result.url === "/docs/roadmap")).toBe(true);
  });

  it("does not invent a target", async () => {
    expect(await search("zzzznosuchtarget", 5)).toEqual([]);
  });

  /**
   * Plan 614: `chat` named a performance prose chunk although the roadmap ships
   * the `Chat (AI conversation)` target. The word is in the target's name and
   * note, so it is a roadmap alias, not a page alias.
   */
  it("finds the planned chat target by the word a reader types", async () => {
    const [first] = await search("chat", 5);
    expect(first?.url).toBe("/docs/roadmap");
  });
});

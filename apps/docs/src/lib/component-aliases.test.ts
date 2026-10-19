import { describe, expect, it } from "vitest";
import { components, bySlug } from "@/component-meta/registry";
import { componentSymbols } from "@/component-meta/symbols";
import { aliasesFor, componentAliases } from "./component-aliases";
import { componentSearchIndex } from "./search";

/**
 * Guards the reader-vocabulary table (plan 566). The bug being prevented is a
 * component that a reader names correctly but the site never matches: the
 * registry document is built from the record's title, summary, parts and props
 * types, so `textbox`, `navbar`, `snackbar`, `kbd` and `searchbox` returned
 * nothing, and `check box`, `one time password`, `modal` and `colour picker`
 * landed on prose or a different component.
 *
 * These tests fail when the table is keyed to a missing record, a term is
 * stored in a form the ranker cannot compare, two records claim the same term,
 * a term shadows another component's title or exported symbol (the misroute
 * class), or a term never reaches the record's search document.
 */
const normalize = (value: string): string => value.trim().toLowerCase();

const terms = (): ReadonlyArray<{ slug: string; term: string }> =>
  [...componentAliases].flatMap(([slug, aliases]) =>
    aliases.map((term) => ({ slug, term })),
  );

describe("component aliases", () => {
  it("keys every alias to a record that exists", () => {
    const missing = [...componentAliases.keys()].filter(
      (slug) => !bySlug.has(slug),
    );
    expect(missing).toEqual([]);
  });

  it("gives every keyed record at least one term", () => {
    const empty = [...componentAliases]
      .filter(([, aliases]) => aliases.length === 0)
      .map(([slug]) => slug);
    expect(empty).toEqual([]);
  });

  it("stores every term lower-case and trimmed", () => {
    const malformed = terms()
      .filter(({ term }) => term !== normalize(term) || term.length === 0)
      .map(({ term }) => term);
    expect(malformed).toEqual([]);
  });

  it("uses a term for one record only", () => {
    const counts = new Map<string, number>();
    terms().forEach(({ term }) =>
      counts.set(term, (counts.get(term) ?? 0) + 1),
    );
    const shared = [...counts]
      .filter(([, count]) => count > 1)
      .map(([term]) => term);
    expect(shared).toEqual([]);
  });

  it("does not shadow another record's title or exported symbol", () => {
    const names = new Set(
      components.flatMap((component) => [
        normalize(component.title),
        ...componentSymbols(component).map(normalize),
      ]),
    );
    const shadowing = terms()
      .filter(({ term }) => names.has(term))
      .map(({ term }) => term);
    expect(shadowing).toEqual([]);
  });

  it("indexes every term in its record's search document", () => {
    const missing = [...componentAliases].flatMap(([slug, aliases]) => {
      const record = bySlug.get(slug);
      if (record === undefined) return [slug];
      const document = componentSearchIndex(record);
      const text = `${document.content}\n${document.keywords ?? ""}`;
      return aliases
        .filter((term) => !text.includes(term))
        .map((term) => `${slug}: ${term}`);
    });
    expect(missing).toEqual([]);
  });

  it("returns no terms for a record without an entry", () => {
    expect(aliasesFor("not-a-component")).toEqual([]);
  });
});

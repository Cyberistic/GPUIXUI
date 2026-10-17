import { fileURLToPath } from "node:url";
import { createGenerator } from "fumadocs-typescript";
import type { GeneratedDoc } from "fumadocs-typescript";
import { describe, expect, it } from "vitest";
import { generator } from "./type-table-generator";

/**
 * Guards the API-table contract the component pages depend on (plan 415). The
 * load-bearing failure is a props type whose `@internal` prop leaks into the
 * published table, or whose `@`-tags stop being read at all: the page still
 * renders a table, so nothing else notices, and the contract the component
 * workstream was given is no longer true.
 *
 * The default assertions use the app's own generator (`type-table-generator.ts`),
 * so this cannot pass against a configuration the site does not run.
 */

const fixture = fileURLToPath(
  new URL("./type-table.fixture.tsx", import.meta.url),
);

const propNames = (docs: ReadonlyArray<GeneratedDoc>): ReadonlyArray<string> =>
  docs.flatMap((doc) => doc.entries.map((entry) => entry.name));

describe("type table contract", () => {
  it("reads every public prop, its type, its tsdoc and its optionality", async () => {
    const [doc] = await generator.generateDocumentation(
      { path: fixture },
      "FixtureProps",
    );
    expect(
      doc?.entries.map((entry) => ({
        name: entry.name,
        type: entry.type,
        description: entry.description,
        required: entry.required,
      })),
    ).toEqual([
      {
        name: "label",
        type: "string",
        description: "The visible label.",
        required: true,
      },
      {
        name: "tone",
        type: '"calm" | "loud" | undefined',
        description: "Optional; the table must mark it optional.",
        required: false,
      },
    ]);
  });

  it("hides an @internal prop by default and includes it on request", async () => {
    const defaultDocs = await generator.generateDocumentation(
      { path: fixture },
      "FixtureProps",
    );

    // `allowInternal` cannot be asked of the app's generator: its file cache key
    // is `${path}:${name}:${content}`, so the second call would return the first
    // result (`fumadocs-typescript` notes that options are not cache
    // dependencies). A fresh generator is the only honest way to see the
    // difference — and the reason no two pages may generate the same type with
    // different options.
    const uncached = createGenerator({ cache: false });
    const [withInternal] = await uncached.generateDocumentation(
      { path: fixture },
      "FixtureProps",
      { allowInternal: true },
    );

    expect(propNames(defaultDocs)).not.toContain("internal");
    expect(withInternal?.entries.map((entry) => entry.name) ?? []).toContain(
      "internal",
    );
  });

  it("returns no documentation for a type the file does not export", async () => {
    const docs = await generator.generateDocumentation(
      { path: fixture },
      "NoSuchProps",
    );
    expect(docs).toEqual([]);
  });
});

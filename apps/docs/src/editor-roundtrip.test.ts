import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  admonitionSpec,
  createSyntax,
  parseMdxToDoc,
  serializeDocToMdx,
} from "@fumadocs-editor/core";
import { fumadocsUiComponents } from "@fumadocs-editor/ui";
import * as Arr from "effect/Array";
import { Effect } from "effect";
import { pipe } from "effect";
import * as Order from "effect/Order";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";

/**
 * The bug this guards: authoring a component page in Fumadocs Editor is only
 * safe if every untouched block survives the round trip. If one page parses to
 * a different serialization, saving an unrelated sentence rewrites that page.
 * The editor is a dev-only tool, so this test is the only place its promise is
 * checked against the real content tree.
 *
 * `readFileSync` is deliberate: a test reads fixed repository files at import
 * time, which is the boundary, not runtime domain code.
 */

const contentRoot = fileURLToPath(new URL("../content/docs/", import.meta.url));

const walk = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(join(directory, entry.name))
      : entry.name.endsWith(".mdx")
        ? [join(directory, entry.name)]
        : [],
  );

const pages = Arr.sort(walk(contentRoot), Order.String);
const relative = (file: string) => file.slice(contentRoot.length);

const syntax = createSyntax([...fumadocsUiComponents, admonitionSpec]);

/**
 * One page through the editor's parse/serialize pair. A parse throw is a failure
 * of that page, so the page name travels with the error — otherwise a broken
 * page fails the suite with a position and no file.
 */
const roundTrip = (file: string) =>
  Effect.runSync(
    Effect.result(
      Effect.try({
        try: () => {
          const source = readFileSync(file, "utf8");
          const { doc, snapshot } = parseMdxToDoc(source, syntax);
          return {
            page: relative(file),
            source,
            serialized: serializeDocToMdx(doc, snapshot),
          };
        },
        catch: (cause) => `${relative(file)}: ${String(cause)}`,
      }),
    ),
  );

describe("Fumadocs Editor round trip", () => {
  it("walks the real content tree", () => {
    expect(pages.length).toBeGreaterThanOrEqual(60);
  });

  it(
    "serializes every page back to the same bytes",
    { timeout: 120_000 },
    () => {
      const changed = pages.flatMap((file) =>
        pipe(
          roundTrip(file),
          Result.match({
            onFailure: (message) => [message],
            onSuccess: ({ page, source, serialized }) =>
              serialized === source
                ? []
                : [
                    `${page}: ${source.length} bytes in, ${serialized.length} bytes out`,
                  ],
          }),
        ),
      );
      expect(changed).toEqual([]);
    },
  );

  it("re-serializes only the edited block", () => {
    const source = readFileSync(join(contentRoot, "installation.mdx"), "utf8");
    const { doc, snapshot } = parseMdxToDoc(source, syntax);
    const edited = structuredClone(doc);
    const heading = edited.content?.find((node) => node.type === "heading");
    const text = heading?.content?.[0];
    if (text?.type !== "text" || text.text === undefined) {
      throw new Error("installation.mdx has no text heading to edit");
    }
    const headingText = text.text;
    text.text = `${headingText} (edited)`;

    const before = source.split("\n");
    const after = serializeDocToMdx(edited, snapshot).split("\n");
    const index = before.findIndex(
      (line) => line.startsWith("#") && line.endsWith(headingText),
    );
    const changed = before.flatMap((line, i) => (line === after[i] ? [] : [i]));
    expect(changed).toEqual([index]);
    expect(after[index]).toBe(`${before[index]} (edited)`);
  });
});

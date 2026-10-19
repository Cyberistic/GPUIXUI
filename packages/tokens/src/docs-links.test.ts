/**
 * Guards the relative links in the three documents the package publishes.
 *
 * The bug: four links in `docs/tokens.md` were written as `./src/…`, but the
 * page lives in `docs/`, so they resolved to `docs/src/…` — a directory that
 * does not exist. The page's "runnable example" links for the native field, the
 * find highlight and the native text document were dead while every gate stayed
 * green, because nothing read a link target. A target must resolve against the
 * document's own directory, not the repository root.
 *
 * `node:fs` is deliberate for the same reason `docs.test.ts` states: this is a
 * documentation test over the tree's own files and the package ships no runtime
 * dependency.
 */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../", import.meta.url);

/** The documents whose prose this workstream owns. */
const documents = [
  "docs/tokens.md",
  "docs/design-system.md",
  "packages/tokens/README.md",
] as const;

const isRelative = (target: string): boolean =>
  target.startsWith("./") || target.startsWith("../");

const linkTargets = (source: string): ReadonlyArray<string> =>
  Array.from(source.matchAll(/\]\(([^)\s]+)\)/g), (match) => match[1]).filter(
    (target): target is string => target !== undefined,
  );

/**
 * The relative file links in `source` that do not resolve from `document`.
 * Anchors are stripped; absolute URLs and same-page anchors are not links to a
 * file and are ignored.
 */
const missingLinks = (
  document: string,
  source: string,
): ReadonlyArray<string> =>
  linkTargets(source)
    .filter(isRelative)
    .filter(
      (target) =>
        !existsSync(
          new URL(target.split("#")[0] ?? "", new URL(document, root)),
        ),
    );

describe("document links", () => {
  it("resolves every relative file link in the guarded documents", () => {
    const missing = documents.flatMap((document) =>
      missingLinks(document, readFileSync(new URL(document, root), "utf8")).map(
        (target) => `${document} -> ${target}`,
      ),
    );
    expect(missing).toEqual([]);
  });

  it("catches a link resolved against the document's directory", () => {
    expect(
      missingLinks("docs/tokens.md", "[example](./src/example.ts)"),
    ).toHaveLength(1);
  });

  it("accepts a link that climbs to the package", () => {
    expect(
      missingLinks(
        "docs/tokens.md",
        "[example](../packages/tokens/src/index.ts)",
      ),
    ).toEqual([]);
  });
});

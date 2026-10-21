/**
 * Guards the relative links in the three documents the package publishes: the
 * file a link points at, and the heading an anchor inside it names.
 *
 * The path bug: four links in `docs/tokens.md` were written as `./src/…`, but
 * the page lives in `docs/`, so they resolved to `docs/src/…` — a directory that
 * does not exist. The page's "runnable example" links for the native field, the
 * find highlight and the native text document were dead while every gate stayed
 * green, because nothing read a link target. A target must resolve against the
 * document's own directory, not the repository root.
 *
 * The anchor bug: the same helper stripped `#anchor`, so the 21 anchors the three
 * documents write — `#text-selection`, `#find-highlighting`, `#9-accessibility`
 * and the rest — were read by nothing. Renaming `## Text selection` to
 * `## Selection of text` left the package green while the Limitations link aimed
 * at a heading that no longer existed.
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

/** The guarded documents by repository-relative path, read once. */
const guarded = new Map(
  documents.map((document) => [
    document,
    readFileSync(new URL(document, root), "utf8"),
  ]),
);

const isRelative = (target: string): boolean =>
  target.startsWith("./") || target.startsWith("../");

const linkTargets = (source: string): ReadonlyArray<string> =>
  Array.from(source.matchAll(/\]\(([^)\s]+)\)/g), (match) => match[1]).filter(
    (target): target is string => target !== undefined,
  );

/**
 * The relative file links in `source` that do not resolve from `document`.
 * Absolute URLs and same-page anchors are not links to a file and are ignored
 * here; {@link missingAnchors} owns the `#` half.
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

/**
 * The anchor the rendered page derives from a heading: the text slug. Two
 * headings make the rule observable — `## 9. Accessibility` → `#9-accessibility`
 * and `## Custom typefaces are unavailable in 0.10.0` →
 * `#custom-typefaces-are-unavailable-in-0100`. No guarded document has two
 * headings with the same text, so the `-1` suffix a duplicate earns is not
 * implemented; a duplicate must be argued before it is added.
 */
const slug = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .replaceAll(/\s+/g, "-");

/** Every heading's anchor in `source`. */
const headingAnchors = (source: string): ReadonlyArray<string> =>
  Array.from(source.matchAll(/^#{1,6} (.+)$/gm), (match) =>
    slug(match[1] ?? ""),
  );

/**
 * The `#anchor` of a link target, or `undefined` when it names none. A
 * same-page anchor has an empty file — `#focus` splits to `["", "focus"]` — so
 * the file half is not the test.
 */
const anchorOf = (target: string): string | undefined => {
  const [, anchor] = target.split("#");
  return anchor === undefined || anchor === "" ? undefined : anchor;
};

/**
 * The anchors in `source` that the document they point at does not declare. A
 * same-page anchor resolves against `document`; a cross-document one against the
 * guarded document it names, and a link to a document outside the guarded list is
 * skipped — its headings are another workstream's prose.
 */
const missingAnchors = (
  document: string,
  source: string,
  headings: ReadonlyMap<string, string>,
): ReadonlyArray<string> => {
  const directory = document.split("/").slice(0, -1).join("/");
  return linkTargets(source).flatMap((target) => {
    const anchor = anchorOf(target);
    if (anchor === undefined) {
      return [];
    }
    const [file = ""] = target.split("#");
    const targetDocument =
      file === ""
        ? document
        : new URL(
            `${directory === "" ? "" : `${directory}/`}${file}`,
            root,
          ).pathname.replace(root.pathname, "");
    const targetSource = headings.get(targetDocument);
    if (targetSource === undefined) {
      return [];
    }
    return headingAnchors(targetSource).includes(anchor)
      ? []
      : [`${document} -> ${targetDocument}#${anchor}`];
  });
};

describe("document links", () => {
  it("resolves every relative file link in the guarded documents", () => {
    const missing = [...guarded].flatMap(([document, source]) =>
      missingLinks(document, source).map(
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

describe("document anchors", () => {
  it("resolves every in-page and cross-document anchor", () => {
    const missing = [...guarded].flatMap(([document, source]) =>
      missingAnchors(document, source, guarded),
    );

    // The count is owned here so the case cannot pass because the reader stopped
    // finding anchors: the three documents write 21, and a link added or dropped
    // is a deliberate edit to this number.
    const anchored = [...guarded].flatMap(([, source]) =>
      linkTargets(source).filter((target) => anchorOf(target) !== undefined),
    );
    expect(anchored).toHaveLength(21);
    expect(missing).toEqual([]);
  });

  it("catches an anchor a renamed heading orphaned", () => {
    const fixture = new Map([
      ["docs/tokens.md", "# Tokens\n\n## Selection\n\nthe wash"],
      ["docs/design-system.md", "# Design\n\n## 9. Accessibility\n"],
    ]);

    expect(
      missingAnchors("docs/tokens.md", "[focus](#focus)", fixture),
    ).toEqual(["docs/tokens.md -> docs/tokens.md#focus"]);
    expect(
      missingAnchors(
        "docs/design-system.md",
        "[selection](./tokens.md#text-selection)",
        fixture,
      ),
    ).toEqual(["docs/design-system.md -> docs/tokens.md#text-selection"]);
    expect(
      missingAnchors(
        "docs/design-system.md",
        "[selection](./tokens.md#selection) and [focus](./tokens.md#focus)",
        new Map([
          ...fixture,
          ["docs/tokens.md", "# Tokens\n\n## Selection\n\n## Focus\n"],
        ]),
      ),
    ).toEqual([]);
  });

  it("strips the punctuation a heading's slug drops", () => {
    const fixture = new Map([
      [
        "docs/tokens.md",
        "## 9. Accessibility\n\n## Custom typefaces are unavailable in 0.10.0",
      ],
    ]);

    expect(
      missingAnchors(
        "docs/tokens.md",
        "[a](#9-accessibility) and [b](#custom-typefaces-are-unavailable-in-0100)",
        fixture,
      ),
    ).toEqual([]);
  });
});

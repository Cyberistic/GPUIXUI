/**
 * Guards the links a reader follows out of the three token documents: the
 * catalogue (`docs/tokens.md`), the design-system page and this package's
 * README.
 *
 * The bug this guards: the README's syntax-palette evidence row was written
 * `../apps/playground/README.md`, which resolves against
 * `packages/tokens/README.md` to `packages/apps/playground/README.md` — a path
 * this repository does not have — while every sibling row links `../../`, so
 * the one row a reader opens to check the measured pixels answered 404. A
 * link is resolved against the document it is written in, which the prose
 * cannot show: `../apps/…` and `../../apps/…` read alike two directories up.
 *
 * The second drift is an anchor: `#data-series` is a promise that the page it
 * points into still has a heading that slug. A renamed section leaves every
 * cross-reference pointing at the top of a page instead of the rule the
 * sentence cites.
 *
 * A fenced block is code a reader copies, not a link, so the scan reads only
 * prose — the `](…)` inside a snippet is not a link the document site follows.
 *
 * `node:fs` is deliberate, as in `docs.test.ts` and `exports.test.ts`: this is a
 * check over the repository's own Markdown, and the package keeps zero runtime
 * dependencies by design — no Effect, and so no `Option` for a parsed absence.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** One document this package teaches with, as a path below this test file. */
const documents = [
  "../../../docs/tokens.md",
  "../../../docs/design-system.md",
  "../README.md",
] as const;

const text = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** One line of prose, with the number a failure names it by. */
interface ProseLine {
  /** The 1-based line in the document. */
  readonly line: number;
  /** The line's text. */
  readonly text: string;
}

/**
 * The lines of a document that are prose rather than a fenced snippet.
 *
 * A fence opens and closes on a line whose first non-space characters are three
 * backticks; everything between is code.
 */
const prose = (markdown: string): ReadonlyArray<ProseLine> =>
  markdown
    .split("\n")
    .reduce<{ readonly fenced: boolean; readonly lines: ProseLine[] }>(
      (state, line, index) =>
        line.trimStart().startsWith("```")
          ? { fenced: !state.fenced, lines: state.lines }
          : state.fenced
            ? state
            : {
                fenced: false,
                lines: [...state.lines, { line: index + 1, text: line }],
              },
      { fenced: false, lines: [] },
    ).lines;

/** One inline Markdown link, with the line that holds it. */
interface DocumentLink {
  /** The 1-based line the link is written on. */
  readonly line: number;
  /** The target as written, anchor included. */
  readonly target: string;
  /** The part before `#`, or `""` for a link into the same document. */
  readonly file: string;
  /** The part after `#`, or `undefined` when the link names no anchor. */
  readonly anchor: string | undefined;
}

/**
 * The inline links in a document's prose.
 *
 * Absolute links are not this guard's business — they need the network — so
 * they are left out rather than checked against the filesystem.
 */
const linksIn = (markdown: string): ReadonlyArray<DocumentLink> =>
  prose(markdown).flatMap(({ line, text: lineText }) =>
    [...lineText.matchAll(/\]\(([^)\s]+)\)/g)].flatMap((match) => {
      const target = match[1] ?? "";
      if (target.startsWith("http") || target.startsWith("mailto:")) {
        return [];
      }
      const [file = "", anchor] = target.split("#");
      return [
        {
          line,
          target,
          file,
          anchor: anchor === undefined || anchor === "" ? undefined : anchor,
        },
      ];
    }),
  );

/**
 * The slugs a document's headings answer to, in GitHub's form: a heading is
 * lower-cased, its inline code markers and punctuation dropped, and its spaces
 * turned into hyphens. The three documents carry no duplicate heading, so one
 * slug names one heading.
 */
const headings = (markdown: string): ReadonlySet<string> =>
  new Set(
    prose(markdown).flatMap(({ text: lineText }) => {
      const heading = /^#{1,6}\s+(.*)$/.exec(lineText);
      return heading === null
        ? []
        : [
            (heading[1] ?? "")
              .trim()
              .toLowerCase()
              .replace(/`/g, "")
              .replace(/[^\w\- ]/g, "")
              .replace(/ /g, "-"),
          ];
    }),
  );

/** The file a link points at, resolved from the document that writes it. */
const resolvesTo = (document: string, link: DocumentLink): string =>
  fileURLToPath(
    new URL(
      link.file === "" ? "" : link.file,
      new URL(document, import.meta.url),
    ),
  );

/**
 * The documents a link can point into, read once.
 *
 * Forty links across three documents resolve into the same handful of targets —
 * the catalogue and the playground README account for most of them — and the
 * suite runs against a two-second budget, so a scan that re-read and re-slugged
 * one large page per link timed out. The repository does not change while the
 * suite runs.
 */
const contents = new Map<string, string>();
const slugs = new Map<string, ReadonlySet<string>>();

const contentOf = (path: string): string => {
  const cached = contents.get(path);
  if (cached !== undefined) {
    return cached;
  }
  const value = readFileSync(path, "utf8");
  contents.set(path, value);
  return value;
};

const headingsOf = (path: string): ReadonlySet<string> => {
  const cached = slugs.get(path);
  if (cached !== undefined) {
    return cached;
  }
  const value = headings(contentOf(path));
  slugs.set(path, value);
  return value;
};

describe("the token documents' links", () => {
  it("skips a snippet and keeps every prose link", () => {
    const links = linksIn(
      [
        "```md",
        "[copied](./nowhere.md)",
        "```",
        "[read](./found.md#section)",
        "[external](https://example.com)",
      ].join("\n"),
    );

    expect(links.map((link) => link.target)).toEqual(["./found.md#section"]);
    expect(links[0]?.anchor).toBe("section");
  });

  it("reads a link out of every document", () => {
    const found = documents.map((document) => [
      document,
      linksIn(text(document)).length,
    ]);

    expect(found.filter(([, count]) => count === 0)).toEqual([]);
  });

  it("points every relative link at a file the repository has", () => {
    const missing = documents.flatMap((document) =>
      linksIn(text(document))
        .filter((link) => !existsSync(resolvesTo(document, link)))
        .map(
          (link) =>
            `${document}:${link.line}: ${link.target} is not a file on disk`,
        ),
    );

    expect(missing).toEqual([]);
  });

  it("points every anchor at a heading the target document has", () => {
    const dangling = documents.flatMap((document) =>
      linksIn(text(document)).flatMap((link) => {
        if (link.anchor === undefined) {
          return [];
        }
        const target = resolvesTo(document, link);
        // A missing file is the case above's failure, and is named there; a
        // heading cannot be read from it here.
        if (!existsSync(target)) {
          return [];
        }
        return headingsOf(target).has(link.anchor)
          ? []
          : [
              `${document}:${link.line}: #${link.anchor} is not a heading in ${link.file === "" ? document : link.file}`,
            ];
      }),
    );

    expect(dangling).toEqual([]);
  });
});

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const documents = [
  "../../../docs/tokens.md",
  "../../../docs/design-system.md",
  "../README.md",
] as const;

const text = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

interface ProseLine {
  readonly line: number;

  readonly text: string;
}

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

interface DocumentLink {
  readonly line: number;

  readonly target: string;

  readonly file: string;

  readonly anchor: string | undefined;
}

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

const resolvesTo = (document: string, link: DocumentLink): string =>
  fileURLToPath(
    new URL(
      link.file === "" ? "" : link.file,
      new URL(document, import.meta.url),
    ),
  );

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

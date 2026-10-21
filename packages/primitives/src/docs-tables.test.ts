/**
 * Every row of every page sits inside a well-formed table.
 *
 * **The bug guarded (plan `813`).** Two pages put a table row after the table's
 * closing paragraph. Markdown ends a table at the first blank line, so the row
 * was painted as body text with its pipes visible and the key it documented was
 * missing from the table it belonged to: `Rating`'s clear row (`Delete` /
 * `Backspace`, the only route back to an unrated value) and `CheckboxGroup`'s
 * "arrows not handled" row. No guard read a page's **structure** — plan `074`
 * guards that a page exists, plan `027` that it names every prop, plan `394`
 * that a keyboard row names its axis — so a row that fell out of its table was
 * invisible to all of them and to a source review, because it still starts
 * with `|`.
 *
 * The rules: a block is a maximal run of lines beginning with `|`; it needs a
 * header, a delimiter row and one cell count throughout; a lone row is body
 * text wherever it sits. Cells split on unescaped `|` only, so a type union
 * written `"sm" \| "md"` is one cell.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  docTableBlocks,
  isDelimiterRow,
  tableCells,
  type DocLine,
} from "./testing/index.js";

/** A page and the file it came from, for a by-file message. */
interface Document {
  readonly file: string;
  readonly body: string;
}

/** A row with no table neighbour: Markdown paints it as a paragraph. */
const ORPHAN = "a row outside a table renders as body text";

/** A table whose second row is not a delimiter row. */
const NO_DELIMITER = "the second row of a table must be its delimiter row";

/** A table whose rows disagree with its header. */
const cellCountIssue = (count: number, header: number): string =>
  `a row has ${count} of the header's ${header} cells`;

/** Every structural problem in one page. */
const pageIssues = (file: string, body: string): ReadonlyArray<string> =>
  Arr.flatMap(docTableBlocks(body), (block) =>
    Arr.match(block, {
      onEmpty: () => [],
      onNonEmpty: (rows) => {
        const header = Arr.headNonEmpty(rows);
        const at = (line: DocLine): string => `${file}:${line.number}`;
        if (Arr.length(rows) === 1) return [`${at(header)}: ${ORPHAN}`];
        const delimiter = Option.getOrElse(Arr.get(rows, 1), () => header);
        const columnCount = Arr.length(tableCells(header.text));
        const malformed = isDelimiterRow(delimiter.text)
          ? []
          : [`${at(delimiter)}: ${NO_DELIMITER}`];
        const widths = Arr.flatMap(Arr.drop(rows, 2), (row) => {
          const count = Arr.length(tableCells(row.text));
          return count === columnCount
            ? []
            : [`${at(row)}: ${cellCountIssue(count, columnCount)}`];
        });
        return Arr.appendAll(malformed, widths);
      },
    }),
  );

/** Every `.md`/`.mdx` page directly inside a directory. */
const readPages = (
  directory: string,
  label: string,
): Effect.Effect<ReadonlyArray<Document>, Error> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const files = yield* fs.readDirectory(directory);
    const pages = Arr.filter(files, (file) => /\.mdx?$/.test(file));
    return yield* Effect.forEach(
      pages,
      (file) =>
        Effect.map(fs.readFileString(path.join(directory, file)), (body) => ({
          file: path.join(label, file),
          body,
        })),
      { concurrency: 8 },
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

/** A README beside a page directory, read from the package that owns it. */
const readReadme = (
  file: string,
  label: string,
): Effect.Effect<ReadonlyArray<Document>, Error> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return [{ file: label, body: yield* fs.readFileString(file) }];
  }).pipe(Effect.provide(NodeFileSystem.layer));

/** Both packages this workstream owns, pages and READMEs. */
const readDocuments: Effect.Effect<ReadonlyArray<Document>, Error> = Effect.gen(
  function* () {
    const path = yield* Path.Path;
    const primitives = path.join(import.meta.dirname, "..");
    const icons = path.join(import.meta.dirname, "..", "..", "icons");
    const sources: ReadonlyArray<
      Effect.Effect<ReadonlyArray<Document>, Error>
    > = [
      readPages(path.join(primitives, "docs"), "primitives/docs"),
      readReadme(path.join(primitives, "README.md"), "primitives/README.md"),
      readPages(path.join(icons, "docs"), "icons/docs"),
      readReadme(path.join(icons, "README.md"), "icons/README.md"),
    ];
    const groups = yield* Effect.all(sources, { concurrency: 4 });
    return Arr.flatten(groups);
  },
).pipe(Effect.provide(NodePath.layer));

const issues = (documents: ReadonlyArray<Document>): ReadonlyArray<string> =>
  Arr.flatMap(documents, ({ file, body }) => pageIssues(file, body));

describe("the package's documentation tables", () => {
  it("keeps every row of every page inside a well-formed table", async () => {
    const documents = await Effect.runPromise(readDocuments);
    // The scan must not pass by reading nothing (plan 813 §5.3).
    expect(Arr.length(documents)).toBeGreaterThan(20);
    expect(issues(documents)).toStrictEqual([]);
  });

  it("fails a row that fell out of its table, by line", () => {
    const page = [
      "Intro.",
      "",
      "| Key | Effect |",
      "| --- | ------ |",
      "| Tab | moves |",
      "",
      "Prose about the next key.",
      "| arrows | not handled |",
    ].join("\n");
    expect(pageIssues("page.mdx", page)).toStrictEqual([
      `page.mdx:8: ${ORPHAN}`,
    ]);
  });

  it("counts an escaped pipe as one cell", () => {
    const page = [
      "| Prop | Type |",
      "| ---- | ---- |",
      '| `size` | `"sm" \\| "md"` |',
    ].join("\n");
    expect(pageIssues("page.mdx", page)).toStrictEqual([]);
  });

  it("fails a row whose cell count differs from the header", () => {
    const page = ["| A | B |", "| --- | --- |", "| 1 |"].join("\n");
    expect(pageIssues("page.mdx", page)).toStrictEqual([
      "page.mdx:3: a row has 1 of the header's 2 cells",
    ]);
  });

  it("fails a block with no delimiter row", () => {
    const page = ["| A | B |", "| 1 | 2 |"].join("\n");
    expect(pageIssues("page.mdx", page)).toStrictEqual([
      `page.mdx:2: ${NO_DELIMITER}`,
    ]);
  });
});

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packageCollections } from "./collection-routes";
import { componentIndex } from "./component-index-data";
import {
  buildExamples,
  filterExamples,
  pageFor,
  summaryOf,
  type ExampleEntry,
} from "./examples";
import { examples } from "./examples-data";

/**
 * The example registry.
 *
 * The page claims to list every example the packages ship, so the guard is the
 * filesystem: a new `packages/<pkg>/examples/<id>.example.tsx` that the glob
 * misses, or a row whose link goes nowhere, is a page that lies to a reader.
 * The summaries are read from each file's own header, so one cannot describe an
 * example differently from the file it links.
 */

const root = new URL("../../../../", import.meta.url);

/** Every example file on disk, repo-relative. */
const onDisk = readdirSync(new URL("packages/", root)).flatMap(
  (packageName) => {
    const dir = new URL(`packages/${packageName}/examples/`, root);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => name.endsWith(".example.tsx"))
      .map((name) => `packages/${packageName}/examples/${name}`);
  },
);

const pid = (entry: ExampleEntry): string => `${entry.packageName}/${entry.id}`;

describe("the example registry", () => {
  it("lists every example file and nothing else", () => {
    expect(examples.length).toBeGreaterThan(40);
    expect(
      onDisk.filter((file) => !examples.some((entry) => entry.file === file)),
    ).toEqual([]);
    expect(examples.filter((entry) => !onDisk.includes(entry.file))).toEqual(
      [],
    );
    expect(new Set(examples.map(pid)).size).toBe(examples.length);
  });

  it("links every row to a page that exists", () => {
    const routes = new Set([
      ...componentIndex.map((entry) => entry.url),
      ...packageCollections.map((collection) => collection.route),
    ]);
    expect(examples.filter((entry) => !routes.has(entry.url))).toEqual([]);
  });

  it("sends a grouped example to its lane index, never to a guessed page", () => {
    const misplaced = examples.filter((entry) => {
      if (!entry.grouped) return false;
      const collection = packageCollections.find(
        (candidate) => candidate.section === entry.section,
      );
      return entry.url !== collection?.route;
    });
    expect(misplaced).toEqual([]);
    expect(examples.some((entry) => entry.grouped)).toBe(true);
  });

  it("reads each summary from the file it links", () => {
    const unexplained = examples.filter((entry) => {
      const source = readFileSync(
        new URL(
          `packages/${entry.packageName}/examples/${entry.id}.example.tsx`,
          root,
        ),
        "utf8",
      );
      const opening = entry.summary.slice(0, 20).toLowerCase();
      return (
        entry.summary.length < 12 ||
        !entry.summary.endsWith(".") ||
        !/^[A-Z]/.test(entry.summary) ||
        !source.toLowerCase().includes(opening)
      );
    });
    expect(unexplained.map(pid)).toEqual([]);
  });
});

describe("the summary parser", () => {
  it("takes the half after `example:` and capitalises it", () => {
    expect(
      summaryOf(
        "/**\n * Card example: a plan card with figures.\n */\nexport {};\n",
      ),
    ).toBe("A plan card with figures.");
  });

  it("joins a header that wrapped before the sentence ended", () => {
    expect(
      summaryOf(
        "/**\n * Form example: a signup form that validates\n * and shows a summary.\n */\n",
      ),
    ).toBe("A signup form that validates and shows a summary.");
  });

  it("falls back to the header's first sentence without the `example:` prefix", () => {
    expect(
      summaryOf("/**\n * Two-factor verification. More detail follows.\n */\n"),
    ).toBe("Two-factor verification.");
  });

  it("has no summary for a file without a header", () => {
    expect(summaryOf("export const Nothing = 1;\n")).toBeUndefined();
  });
});

describe("matching an example to its page", () => {
  it("prefers the exact page name", () => {
    expect(pageFor("card", "/docs/components", componentIndex)?.title).toBe(
      "Card",
    );
  });

  it("accepts the one page that extends the id", () => {
    expect(pageFor("otp", "/docs/primitives", componentIndex)?.url).toBe(
      "/docs/primitives/otp-field",
    );
  });

  it("refuses an ambiguous match", () => {
    const pages = [
      {
        title: "A",
        description: "",
        url: "/docs/primitives/a-one",
        section: "Primitives",
        parts: [],
        props: [],
        types: [],
        limitations: "",
        preview: false,
      },
      {
        title: "B",
        description: "",
        url: "/docs/primitives/a-two",
        section: "Primitives",
        parts: [],
        props: [],
        types: [],
        limitations: "",
        preview: false,
      },
    ];
    expect(pageFor("a", "/docs/primitives", pages)).toBeUndefined();
  });
});

describe("building rows from arbitrary files", () => {
  const pages = componentIndex;

  it("skips a file that is not an example", () => {
    const rows = buildExamples(
      [
        { file: "packages/components/examples/index.ts", source: "export {};" },
        { file: "packages/components/docs/card.mdx", source: "# Card" },
      ],
      pages,
    );
    expect(rows).toEqual([]);
  });

  it("falls back to a named summary when the file has no header", () => {
    const [row] = buildExamples(
      [
        {
          file: "packages/components/examples/card.example.tsx",
          source: "export {};",
        },
      ],
      pages,
    );
    expect(row?.summary).toBe("A worked example in `@gpuixui/components`.");
    expect(row?.title).toBe("Card");
  });
});

describe("filtering the rows", () => {
  it("keeps the rows every term appears in", () => {
    const dialog = filterExamples(examples, "dialog").map(pid);
    expect(dialog).toContain("components/dialog");
    expect(dialog).toContain("components/confirm-dialog");
    expect(dialog).not.toContain("components/card");
  });

  it("narrows to one lane by package", () => {
    const primitives = filterExamples(examples, "primitives").map(pid);
    expect(primitives.length).toBeGreaterThan(5);
    expect(primitives.every((id) => id.startsWith("primitives/"))).toBe(true);
  });

  it("returns the whole registry for an empty query, and nothing for a miss", () => {
    expect(filterExamples(examples, "   ")).toBe(examples);
    expect(filterExamples(examples, "no-such-example")).toEqual([]);
  });
});

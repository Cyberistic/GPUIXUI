/**
 * The page contract for `packages/primitives/docs`.
 *
 * `docs/README.md` §Page contract is the promise a reader and the docs site rely
 * on, and seven pages had drifted out of it: `meter`, `number-field`,
 * `otp-field`, `range-slider`, `rating`, `slider` and `toggle` carried their
 * prop table under "Variants, sizes and states", so nothing on the page was a
 * `## API` section and a reader looking for the API found a heading that does
 * not name it. This suite holds every page to the contract, so the next page
 * that forgets a section fails here instead of on the site.
 *
 * `node:fs` is used only because this is a test-time repository check, the same
 * boundary `inventory.test.ts` and `components/src/inventory.test.ts` use; the
 * package's runtime code stays on Effect's platform services.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import * as primitives from "./index.js";

const docsDir = new URL("../docs/", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);
const packageRoot = new URL("../", import.meta.url);

const read = (name: string): string =>
  readFileSync(fileURLToPath(new URL(name, docsDir)), "utf8");

const pages: ReadonlyArray<string> = Arr.filter(
  readdirSync(docsDir),
  Str.endsWith(".mdx"),
);

interface Section {
  readonly heading: string;
  readonly body: string;
}

/** The `## ` sections of a page, in document order. */
const sections = (source: string): ReadonlyArray<Section> => {
  const lines = source.split("\n");
  const starts = Arr.filterMap(lines, (line, index) =>
    Str.startsWith("## ")(line) ? Result.succeed(index) : Result.failVoid,
  );

  return Arr.map(starts, (start, position) => ({
    heading: (lines[start] ?? "").slice("## ".length).trim(),
    body: lines
      .slice(start + 1, starts[position + 1] ?? lines.length)
      .join("\n")
      .trim(),
  }));
};

const bodyOf = (source: string, heading: string): Option.Option<string> =>
  Option.map(
    Arr.findFirst(sections(source), (section) => section.heading === heading),
    (section) => section.body,
  );

/**
 * The prop names a page's API table puts in backticks in its first column.
 *
 * Rows name several props with `/` — `onClick` / `onKeyDown` — so each name is
 * split out; a row's prose, a part name and the header row are not props.
 */
const documentedProps = (source: string): ReadonlyArray<string> =>
  Arr.flatMap(
    Option.getOrElse(bodyOf(source, "API"), () => "").split("\n"),
    (line) => {
      const cell = /^\|\s*([^|]*)/.exec(line)?.[1];
      return Arr.flatMap([...(cell ?? "").matchAll(/`([^`]+)`/g)], (match) =>
        Arr.filter(
          Arr.map((match[1] ?? "").split("/"), (name) => name.trim()),
          Str.isNonEmpty,
        ),
      );
    },
  );

/**
 * Props a page denies in the sentence "There is no `onKeyDown` prop".
 *
 * `docs/input.mdx` said that while its API table listed `onKeyDown`, and the
 * component accepts it: `FieldProps` extends `InteractionProps`, whose handlers
 * are composed with the field's own. A page teaching a caller that a prop does
 * not exist is worse than one that omits it. The pattern is deliberately the
 * component-level phrasing: "GPUix has no `disabled` prop" is a true statement
 * about the host, and `disabled` is still the component's prop.
 */
const deniedProps = (source: string): ReadonlyArray<string> =>
  Arr.filterMap(
    [...source.matchAll(/[Tt]here is no `([^`]+)` prop/g)],
    (match) => Result.succeed(match[1] ?? ""),
  );

/** The plan paths a document cites, e.g. the plan file a comment names with `§9`. */
const citedPlans = (source: string): ReadonlyArray<string> =>
  Arr.map(
    [...source.matchAll(/\.agents\/slop\/plans\/[A-Za-z0-9._-]+/g)],
    (match) => match[0],
  );

const TEXT_EXTENSIONS = [".ts", ".tsx", ".md", ".mdx"] as const;

/** Every text file this workstream owns, so a citation cannot go stale in a comment. */
const workstreamFiles = (): ReadonlyArray<{
  readonly name: string;
  readonly source: string;
}> =>
  Arr.flatMap(
    [
      { prefix: "packages/primitives/", root: packageRoot },
      {
        prefix: "packages/icons/",
        root: new URL("../../icons/", import.meta.url),
      },
    ],
    ({ prefix, root }) => {
      const base = fileURLToPath(root);
      return Arr.filterMap(
        readdirSync(base, { recursive: true, encoding: "utf8" }),
        (entry) => {
          if (/(^|\/)(node_modules|dist)\//.test(entry)) return Result.failVoid;
          if (!Arr.some(TEXT_EXTENSIONS, (ext) => Str.endsWith(ext)(entry)))
            return Result.failVoid;
          return Result.succeed({
            name: `${prefix}${entry}`,
            source: readFileSync(`${base}${entry}`, "utf8"),
          });
        },
      );
    },
  );

/** The names a page's snippets import from this package, aliases resolved. */
const importedNames = (source: string): ReadonlyArray<string> =>
  Arr.flatMap(
    [
      ...source.matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@gpuixui\/primitives"/g,
      ),
    ],
    (match) =>
      Arr.filter(
        Arr.map((match[1] ?? "").split(","), (specifier) =>
          (
            specifier
              .trim()
              .replace(/^type\s+/, "")
              .split(/\s+as\s+/)[0] ?? ""
          ).trim(),
        ),
        Str.isNonEmpty,
      ),
  );

/** Every page must document these sections, in this order (README §Page contract). */
const REQUIRED = [
  "Usage",
  "API",
  "Keyboard",
  "Accessibility",
  "Theming",
  "Limitations",
  "Verification",
  "Related",
] as const;

const problemsFor = (
  page: string,
  check: (source: string) => ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Arr.map(check(read(page)), (problem) => `${page}: ${problem}`);

/** The contract items as plain predicates over one page's source. */
const contract: ReadonlyArray<{
  readonly check: (source: string) => ReadonlyArray<string>;
  readonly it: string;
}> = [
  {
    it: "covers the contract's sections, in order",
    check: (source) => {
      const headings = Arr.map(sections(source), (section) => section.heading);
      const present = Arr.filter(REQUIRED, (heading) =>
        Arr.contains(headings, heading),
      );

      return [
        ...Arr.map(
          Arr.filter(REQUIRED, (heading) => !Arr.contains(headings, heading)),
          (heading) => `no ${heading}`,
        ),
        ...(Arr.join(
          Arr.filter(headings, (heading) => Arr.contains(REQUIRED, heading)),
          " → ",
        ) === Arr.join(present, " → ")
          ? []
          : ["sections out of order"]),
      ];
    },
  },
  {
    it: "documents every prop in an API table with the contract's columns",
    check: (source) =>
      Option.match(bodyOf(source, "API"), {
        onNone: () => [],
        onSome: (api) =>
          api.includes("| Prop | Type | Default | Consequence |")
            ? []
            : ["no prop table in API"],
      }),
  },
  {
    it: "shows usage that imports the public package root",
    check: (source) =>
      Option.match(bodyOf(source, "Usage"), {
        onNone: () => [],
        onSome: (usage) =>
          usage.includes('from "@gpuixui/primitives"')
            ? []
            : ["usage does not import @gpuixui/primitives"],
      }),
  },
  {
    it: "opens with a YAML frontmatter carrying a title and a description",
    check: (source) => {
      const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";
      return [
        ...(frontmatter === "" ? ["no frontmatter"] : []),
        ...(/^title: .+/m.test(frontmatter) ? [] : ["no title"]),
        ...(/^description: .+/m.test(frontmatter) ? [] : ["no description"]),
      ];
    },
  },
];

describe("the primitives docs page contract", () => {
  it("has at least one page", () => {
    expect(Arr.length(pages)).toBeGreaterThan(0);
  });

  it("imports only names the package exports", () => {
    // The bug guarded: `tooltip.mdx` taught `import { Icon, Tooltip } from
    // "@gpuixui/primitives"`, and this package does not export `Icon` — it is
    // `@gpuixui/icons`. A reader copying that snippet got a build error, and
    // nothing in the repo read the page's imports.
    expect(
      Arr.flatMap(pages, (page) =>
        Arr.filterMap(importedNames(read(page)), (name) =>
          name in primitives
            ? Result.failVoid
            : Result.succeed(
                `${page}: imports ${name}, which @gpuixui/primitives does not export`,
              ),
        ),
      ),
    ).toEqual([]);
  });

  Arr.forEach(contract, ({ it: title, check }) => {
    it(title, () => {
      expect(Arr.flatMap(pages, (page) => problemsFor(page, check))).toEqual(
        [],
      );
    });
  });

  it("does not deny a prop its own API table lists", () => {
    expect(
      Arr.flatMap(pages, (page) =>
        Arr.map(
          Arr.filter(deniedProps(read(page)), (name) =>
            Arr.contains(documentedProps(read(page)), name),
          ),
          (name) =>
            `${page}: says there is no ${name} prop, and its API table lists it`,
        ),
      ),
    ).toEqual([]);
  });

  it("records the tooltip's measured keyboard limit", () => {
    // Measured in a real window by the playground's `tooltip-lifecycle` probe: a
    // Tab traversal focuses the trigger but never runs React's `onFocus`, so the
    // GPUix tooltip stays closed. The page claimed the opposite, so it is held to
    // the measurement instead of to the `TestRenderer`'s behaviour.
    const source = read("tooltip.mdx");
    const keyboard = Option.getOrElse(bodyOf(source, "Keyboard"), () => "");
    const limitations = Option.getOrElse(
      bodyOf(source, "Limitations"),
      () => "",
    );

    expect({
      keyboard: keyboard.includes("does not open it in a real window"),
      limitation: limitations.includes(
        "only open path the runtime's wiring leaves",
      ),
      evidence: keyboard.includes("tooltip-lifecycle"),
    }).toEqual({ keyboard: true, limitation: true, evidence: true });
  });

  it("is indexed by the package's own page table", () => {
    const index = read("README.md");
    const linked = Arr.filterMap(
      Arr.filter(index.split("\n"), Str.startsWith("| [")),
      (line) =>
        Option.match(
          Option.fromNullishOr(/\]\(([^)]+\.mdx)\)/.exec(line)?.[1]),
          {
            onNone: () => Result.failVoid,
            onSome: Result.succeed,
          },
        ),
    );

    expect([
      ...Arr.filter(pages, (page) => !Arr.contains(linked, page)).map(
        (page) => `${page}: not linked from docs/README.md`,
      ),
      ...Arr.filter(linked, (target) => !Arr.contains(pages, target)).map(
        (target) => `${target}: linked but missing`,
      ),
    ]).toEqual([]);
  });

  it("cites only plans that exist", () => {
    // The bug guarded: completed plans are deleted (`.agents/slop/plans/README.md`),
    // but this workstream still sent readers to plans 020, 041, 055 and 140 for
    // the Tier 1 runtime evidence and the binding recipe. A citation to a deleted
    // plan is a dead end; the evidence lives in `COMPONENTS.md`, the suite each
    // `src/inventory.ts` record names, `docs/gpuix-capabilities.md` and
    // `apps/playground/README.md`.
    const missing = Arr.flatMap(workstreamFiles(), (file) =>
      Arr.map(
        Arr.filter(
          citedPlans(file.source),
          (path) => !existsSync(fileURLToPath(new URL(path, repoRoot))),
        ),
        (path) => `${file.name}: cites ${path}, which does not exist`,
      ),
    );

    expect(missing).toEqual([]);
  });
});

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
import { fileURLToPath, pathToFileURL } from "node:url";
import { lightTheme } from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import * as primitives from "./index.js";
import { inventory } from "./inventory.js";
import { decideNumberKey } from "./core/number.js";
import { TEXT_TONES } from "./core/style.js";
import { renderText } from "./components/Text.js";
import { hostProp } from "./components/testing/element.js";

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
 * The backticked names in a section's first table column, header excluded.
 *
 * A page's role and tone tables are the sets a reader copies into code, so a
 * test compares them with the sets the package resolves rather than trusting
 * the prose beside them.
 */
const tableNames = (source: string, heading: string): ReadonlyArray<string> =>
  Arr.flatMap(
    Arr.drop(
      Arr.filter(
        Option.getOrElse(bodyOf(source, heading), () => "").split("\n"),
        Str.startsWith("|"),
      ),
      2,
    ),
    (line) => {
      const cell = /^\|\s*([^|]*)/.exec(line)?.[1] ?? "";
      return Arr.filterMap([...cell.matchAll(/`([^`]+)`/g)], (match) =>
        match[1] === undefined ? Result.failVoid : Result.succeed(match[1]),
      );
    },
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

/** The first cell of a markdown table row, trimmed. */
const firstCell = (line: string): string =>
  /^\|\s*([^|]*)/.exec(line)?.[1]?.trim() ?? "";

/** The backticked prop names in one table row's first cell, `/`-split. */
const rowNames = (line: string): ReadonlyArray<string> =>
  Arr.flatMap([...firstCell(line).matchAll(/`([^`]+)`/g)], (match) =>
    Arr.filter(Arr.map((match[1] ?? "").split("/"), Str.trim), Str.isNonEmpty),
  );

/**
 * The prop names a page's API **prop** tables document.
 *
 * {@link documentedProps} reads every backticked first cell under `## API`,
 * which is right for the denial check but also reads the size, key and part
 * tables. A prop table is the one whose header's first cell is `Prop`; this
 * reads only those, so an icon's `xl` size cannot look like a prop.
 */
const propTableNames = (source: string): ReadonlyArray<string> => {
  interface Scan {
    readonly names: ReadonlyArray<string>;
    readonly inTable: boolean;
    readonly propTable: boolean;
    readonly header: boolean;
  }
  const start: Scan = {
    names: [],
    inTable: false,
    propTable: false,
    header: false,
  };
  return Arr.reduce(
    Option.getOrElse(bodyOf(source, "API"), () => "").split("\n"),
    start,
    (scan, line) => {
      if (!Str.startsWith("|")(line))
        return { ...scan, inTable: false, propTable: false, header: false };
      if (!scan.inTable)
        return {
          ...scan,
          inTable: true,
          propTable: firstCell(line) === "Prop",
          header: true,
        };
      // The row under the header is its separator, never a prop.
      if (scan.header) return { ...scan, header: false };
      return scan.propTable
        ? { ...scan, names: [...scan.names, ...rowNames(line)] }
        : scan;
    },
  ).names;
};

/** A relative specifier, the only kind that reaches another module in this repo. */
const RELATIVE_IMPORT = new RegExp('(?:from|import)\\s+"(\\.[^"]+)"', "g");

/** The module a relative specifier names, or none when no file matches it. */
const resolveModule = (
  from: string,
  specifier: string,
): Option.Option<string> => {
  const base = fileURLToPath(
    new URL(Str.replace(/\.js$/, "")(specifier), pathToFileURL(from)),
  );
  return Option.map(
    Arr.findFirst([".ts", ".tsx"], (extension) =>
      existsSync(`${base}${extension}`),
    ),
    (extension) => `${base}${extension}`,
  );
};

/**
 * The text of every module a component's own sources reach, imports included.
 *
 * A documented prop may be declared on a shared spec rather than the component
 * file — `Box`'s `shrink` is `core/layout.ts`'s and `Button`'s host handlers are
 * `components/internal.ts`'s — so a prop table is compared with the component's
 * module graph, not one file. A source outside this package (`../icons/src`)
 * resolves the same way, from its own directory.
 */
const sourceClosure = (sources: ReadonlyArray<string>): string => {
  const visit = (
    file: string,
    seen: ReadonlySet<string>,
  ): ReadonlySet<string> =>
    seen.has(file)
      ? seen
      : Arr.reduce<RegExpMatchArray, ReadonlySet<string>>(
          Arr.fromIterable(
            readFileSync(file, "utf8").matchAll(RELATIVE_IMPORT),
          ),
          new Set([...seen, file]),
          (reached, match) =>
            Option.match(resolveModule(file, match[1] ?? ""), {
              onNone: () => reached,
              onSome: (next) => visit(next, reached),
            }),
        );
  const files = Arr.reduce<string, ReadonlySet<string>>(
    sources,
    new Set<string>(),
    (seen, source) => visit(fileURLToPath(new URL(source, packageRoot)), seen),
  );
  return Arr.join(
    Arr.map(Arr.fromIterable(files), (file) => readFileSync(file, "utf8")),
    "\n",
  );
};

/**
 * Host props a component forwards rather than declares.
 *
 * `ActionHostProps` is `Omit<Props, …>`, so the runtime's own host surface owns
 * these names: a trigger's announced state has no property signature in this
 * package, and the forwarding type is its declaration. Naming them here keeps
 * an invented prop failing while a forwarded one does not.
 */
const FORWARDED_HOST_PROPS = HashSet.fromIterable([
  "aria-expanded",
  "aria-selected",
]);

/**
 * Whether a module graph declares `name` as a property.
 *
 * Every props interface in these packages writes `readonly name: …` or
 * `name?: …`; an object literal key (`{ name: icon }`) is neither, and a
 * parameter ends in a comma. A name that is only mentioned in prose is not a
 * declaration.
 */
const declaresProp = (source: string, name: string): boolean => {
  const property = `(?:"${RegExp.escape(name)}"|${RegExp.escape(name)})`;
  return new RegExp(`(?:readonly\\s+${property}|${property}\\?)`).test(source);
};

/**
 * The plan paths a document cites, e.g. the plan file a comment names with `§9`.
 *
 * Both spellings count: the repo-relative `.agents/slop/plans/…` and the short
 * `plans/…` a package config uses.
 */
const citedPlans = (source: string): ReadonlyArray<string> =>
  Arr.map(
    [...source.matchAll(/(?:\.agents\/slop\/)?plans\/[A-Za-z0-9._-]+\.md/g)],
    (match) => match[0],
  );

/** Where a citation resolves: the short form is the plan directory's own path. */
const planFile = (citation: string): string =>
  Str.startsWith(".agents/")(citation) ? citation : `.agents/slop/${citation}`;

/** The plan numbers a document cites by number, e.g. "plan 053 §6". */
const citedPlanNumbers = (source: string): ReadonlyArray<string> =>
  Arr.map(
    [...source.matchAll(/\bplans? (\d{3})\b/g)],
    (match) => match[1] ?? "",
  );

/** The plan numbers that still have a file in the plan directory. */
const existingPlanNumbers = (): HashSet.HashSet<string> =>
  HashSet.fromIterable(
    Arr.filterMap(
      readdirSync(fileURLToPath(new URL(".agents/slop/plans/", repoRoot)), {
        encoding: "utf8",
      }),
      (name) => {
        const match = /^(\d{3})-/.exec(name);
        return match === null
          ? Result.failVoid
          : Result.succeed(match[1] ?? "");
      },
    ),
  );

const TEXT_EXTENSIONS = [".ts", ".tsx", ".md", ".mdx"] as const;

/** Directories a citation scan never reads: package-manager and build output. */
const SKIPPED_DIRECTORIES = HashSet.fromIterable(["node_modules", "dist"]);

interface WorkstreamFile {
  readonly name: string;
  readonly source: string;
}

/** A package root the citation scan reads, with the prefix its file names carry. */
interface WorkstreamRoot {
  readonly prefix: string;
  readonly root: URL;
}

/** The result of the scan: the text files and the directory entries it looked at. */
interface Scan {
  readonly entries: number;
  readonly files: ReadonlyArray<WorkstreamFile>;
}

/** The entries and text files one directory holds, subdirectories included. */
interface Walk {
  readonly entries: number;
  readonly files: ReadonlyArray<{
    readonly name: string;
    readonly path: string;
  }>;
}

const WORKSTREAM_ROOTS: ReadonlyArray<WorkstreamRoot> = [
  { prefix: "packages/primitives/", root: packageRoot },
  { prefix: "packages/icons/", root: new URL("../../icons/", import.meta.url) },
];

const isTextFile = (name: string): boolean =>
  Arr.some(TEXT_EXTENSIONS, (extension) => Str.endsWith(extension)(name));

/**
 * Walk a package root for the text files a citation scan reads.
 *
 * `node_modules` and `dist` are skipped **whole**. Filtering them out after a
 * recursive `readdirSync` enumerated 17 884 directory entries to keep 191 files
 * and cost 0.45–0.53 s on a warm cache, because the walk had already entered
 * both trees; skipping them at the directory level reads 208 entries for the
 * same file set, and the whole scan (208 entries plus 191 reads of 1.6 MB) takes
 * ~16 ms. That is what keeps the case inside its budget when the full suite
 * starts 49 workers on this box. `entries` is the measured cost, so a
 * regression that reads those trees again fails the case that holds it.
 *
 * Paths are slash-joined the way `readdirSync`'s recursive entries are; the
 * package runs on macOS and Linux, and this is a test-time repository check.
 */
const walkTextFiles = (directory: string, relative = ""): Walk => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const walks = Arr.map(entries, (entry): Walk => {
    if (entry.isDirectory() && !HashSet.has(SKIPPED_DIRECTORIES, entry.name)) {
      return walkTextFiles(
        `${directory}/${entry.name}`,
        `${relative}${entry.name}/`,
      );
    }
    if (!entry.isFile() || !isTextFile(entry.name)) {
      return { entries: 0, files: [] };
    }
    return {
      entries: 0,
      files: [
        {
          name: `${relative}${entry.name}`,
          path: `${directory}/${entry.name}`,
        },
      ],
    };
  });

  return {
    entries:
      Arr.length(entries) +
      Arr.reduce(walks, 0, (count, walk) => count + walk.entries),
    files: Arr.flatMap(walks, (walk) => walk.files),
  };
};

/** Read one root's text files, naming each by the repo-relative path it owns. */
const scanRoot = (scan: Scan, { prefix, root }: WorkstreamRoot): Scan => {
  const walk = walkTextFiles(fileURLToPath(root));
  return {
    entries: scan.entries + walk.entries,
    files: [
      ...scan.files,
      ...Arr.map(walk.files, (file) => ({
        name: `${prefix}${file.name}`,
        source: readFileSync(file.path, "utf8"),
      })),
    ],
  };
};

/**
 * Every text file this workstream owns, so a citation cannot go stale in a comment.
 *
 * The tree is static for a run, so it is read once when the module loads rather
 * than inside the case that cites plans.
 */
const workstream: Scan = Arr.reduce(
  WORKSTREAM_ROOTS,
  { entries: 0, files: [] },
  scanRoot,
);

/** The plan numbers that still have a file in the plan directory. */
const existingPlans = existingPlanNumbers();

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

  it("lists every type role and tone the theme resolves", () => {
    // The bug guarded: `text.mdx` opened by saying a `Text` "is not a heading
    // element in the accessibility tree" while its own Accessibility section —
    // and `renderText` — publish `role="heading"` with the level, and the
    // inventory row still counted "six roles, four tone roles" against a scale
    // of ten and five. Both pages are derived here from the source that paints
    // them, so a new role or tone fails until they are named.
    const page = read("text.mdx");
    const roles = Arr.filter(
      R.keys(lightTheme.typography),
      (key) => key !== "sans" && key !== "mono",
    );
    expect(Arr.sort(tableNames(page, "Roles"), Order.String)).toStrictEqual(
      Arr.sort(roles, Order.String),
    );
    expect(Arr.sort(tableNames(page, "Tones"), Order.String)).toStrictEqual(
      Arr.sort(TEXT_TONES, Order.String),
    );
    // The page's opening claim and its Accessibility section must agree, and
    // the element must still carry the role the section promises.
    expect(page).not.toContain("not a heading element");
    expect(page).toContain('role="heading"');
    expect(
      hostProp(renderText({ role: "h2" }, lightTheme), "role"),
    ).toStrictEqual(Option.some("heading"));
    // The inventory row enumerates the same two sets, so it cannot fall behind.
    // Two rows carry this label — the capability map's and the Tier 1
    // inventory's — and only the latter is the component record.
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Arr.findFirst(
      catalogue.split("\n"),
      (line) =>
        Str.startsWith("| Text / typography |")(line) &&
        Str.includes("| done |")(line),
    );
    const cell = Option.getOrElse(row, () => "");
    expect(
      Arr.filter([...roles, ...TEXT_TONES], (name) => !cell.includes(name)),
    ).toEqual([]);
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

  it("documents the caller's className on every primitive page", () => {
    // The bug guarded: the tw migration gave every primitive a compiled
    // Tailwind escape hatch joined after its recipe, and sixteen pages never
    // grew the row — a reader of `/docs/primitives/button` found `style` and
    // `testId` but not the prop that reaches the recipe. `Spacer` was the one
    // component without the prop, so it gained one rather than an exception
    // here; `Select` is the documented exception, because its root paints only
    // the wrapper's width and its seams are the trigger and the rows.
    const withoutClassName = ["docs/select.mdx"];
    const missing = Arr.filterMap(inventory, (record) => {
      if (!Str.startsWith("docs/")(record.docs)) return Result.failVoid;
      if (Arr.contains(withoutClassName, record.docs)) return Result.failVoid;
      const path = fileURLToPath(new URL(record.docs, packageRoot));
      if (!existsSync(path))
        return Result.succeed(`${record.docs}: page does not exist`);
      const api = Option.getOrElse(
        bodyOf(readFileSync(path, "utf8"), "API"),
        () => "",
      );
      return Str.includes("`className`")(api)
        ? Result.failVoid
        : Result.succeed(
            `${record.docs}: the API section never names className`,
          );
    });
    expect(missing).toEqual([]);
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

  it("teaches every group of the words table", () => {
    // The bug guarded: `PrimitiveMessages` grew `star` and `starName` for the
    // rating's fill vocabulary and its star sentence, and the page that teaches
    // the seam listed only the five groups it shipped with — so a caller could
    // not discover the words a rating speaks. Every group is a required field of
    // the default table, so the table itself is the complete list to teach.
    const words = Option.getOrElse(
      bodyOf(read("theme-provider.mdx"), "Words"),
      () => "",
    );
    expect(
      Arr.filter(
        R.keys(primitives.defaultMessages),
        (group) => !words.includes(`\`${group}\``),
      ),
    ).toEqual([]);
  });

  it("lists only props its module graph declares", () => {
    // The bug guarded: the Switches inventory row promised a `loading` prop
    // while `SwitchProps` declares none (see `inventory.test.ts`'s `keeps the
    // switch's pending state honest`), and no page suite compared a prop table
    // with the component. A page is copyable source, so a prop no interface in
    // the component's own graph declares is code a reader cannot compile: the
    // comparison reads that graph and not the whole package, so a prop borrowed
    // from a sibling component fails too, and prose that mentions a word is not
    // a declaration.
    const problems = Arr.flatMap(inventory, (record) => {
      const declared = sourceClosure(record.source);
      const page = readFileSync(
        fileURLToPath(new URL(record.docs, packageRoot)),
        "utf8",
      );
      return Arr.filter(
        propTableNames(page),
        (name) =>
          !HashSet.has(FORWARDED_HOST_PROPS, name) &&
          !declaresProp(declared, name),
      ).map(
        (name) =>
          `${record.docs}: lists ${name}, which its module graph never declares`,
      );
    });

    expect(problems).toEqual([]);
  });

  it("records the tooltip's measured keyboard path", () => {
    // Bug guarded: one window run read the frame before React's `onFocus`
    // arrived, so the page was corrected to teach that a `Tab` traversal opens
    // the tip. Three clean runs at HEAD then read the opposite — the traversal
    // focuses the trigger and the tip stays closed (`tooltip-lifecycle` asserts
    // `focuses=0` and no open) — so the page must record the window's gap while
    // keeping the half the `TestRenderer` does deliver.
    const source = read("tooltip.mdx");
    const keyboard = Option.getOrElse(bodyOf(source, "Keyboard"), () => "");
    const limitations = Option.getOrElse(
      bodyOf(source, "Limitations"),
      () => "",
    );

    expect({
      closedInWindow: keyboard.includes(
        "`Tab` traversal leaves the tip closed",
      ),
      evidence: keyboard.includes("tooltip-lifecycle"),
      headlessHalf: keyboard.includes("`TestRenderer`"),
      retracted: source.includes("A `Tab` traversal opens the tip"),
      limit: limitations.includes("no keyboard open path"),
    }).toEqual({
      closedInWindow: true,
      evidence: true,
      headlessHalf: true,
      retracted: false,
      limit: true,
    });
  });

  it("teaches the trigger's shape in the accessibility tree", () => {
    // Bug guarded: the page's usage snippet painted a trigger with no `role`,
    // and the measured tree (`a11y-tree`) drops a node that has no role — so
    // the tip's `aria-description` was published onto an element a screen
    // reader never visits. The page also promised a description without citing
    // the measurement, and called a control trigger impossible after
    // `Button`/`IconButton` learned to forward `TooltipTriggerProps`.
    const source = read("tooltip.mdx");
    const accessibility = Option.getOrElse(
      bodyOf(source, "Accessibility"),
      () => "",
    );
    expect({
      roleOnTheTrigger:
        /<div role="button" aria-label="Revenue definition"/.test(source),
      controlTrigger: source.includes("TooltipTriggerProps"),
      treeFact: accessibility.includes("getA11yTree()"),
      roleRule: accessibility.includes("needs a `role`"),
      probe: accessibility.includes("a11y-tree"),
    }).toEqual({
      roleOnTheTrigger: true,
      controlTrigger: true,
      treeFact: true,
      roleRule: true,
      probe: true,
    });
  });

  it("names every control that forwards a tooltip's trigger pair", () => {
    // Bug guarded: the page listed three triggers while `Checkbox` and `Switch`
    // dropped the pair — a tip on a toolbar box opened on focus and never on
    // hover, and its text stopped at the component. The page and the sources
    // have to agree, so a control that stops forwarding (or a forwarding control
    // the page forgets) fails here by name.
    const page = read("tooltip.mdx");
    const limitations = Option.getOrElse(bodyOf(page, "Limitations"), () => "");
    const controls = [
      { name: "Button", file: "Button.tsx" },
      { name: "IconButton", file: "IconButton.tsx" },
      { name: "Toggle", file: "Toggle.tsx" },
      { name: "Checkbox", file: "Checkbox.tsx" },
      { name: "Switch", file: "Switch.tsx" },
    ] as const;
    const sourceOf = (file: string): string =>
      readFileSync(
        fileURLToPath(new URL(`../src/components/${file}`, import.meta.url)),
        "utf8",
      );
    expect(
      Arr.filter(
        Arr.map(controls, ({ name, file }) => ({
          name,
          forwards: sourceOf(file).includes("TooltipTriggerProps"),
          named: limitations.includes(`\`${name}\``),
        })),
        (control) => !control.forwards || !control.named,
      ),
    ).toEqual([]);
  });

  it("gives the separator's line-style limit its real cause", () => {
    // Bug guarded: the page and the inventory said a dashed rule was missing
    // because "the runtime paints solid borders". The pinned runtime accepts
    // `borderStyle: "solid" | "dashed"`, so that reason is false; what is true
    // is that the separator paints a filled box rather than a border, so the
    // property has nothing to style. A reader with the old sentence would wait
    // for a runtime feature that already exists.
    const source = read("separator.mdx");
    const limitations = Option.getOrElse(
      bodyOf(source, "Limitations"),
      () => "",
    );
    expect({
      filled: limitations.includes("paints a **filled** 1px box"),
      runtimeGrammar: limitations.includes('borderStyle: "dashed"'),
      alternative: limitations.includes("Compose a `Box`"),
      retracted: limitations.includes("runtime paints solid borders"),
      dottedPromise: limitations.includes("No dashed or dotted style"),
    }).toEqual({
      filled: true,
      runtimeGrammar: true,
      alternative: true,
      retracted: false,
      dottedPromise: false,
    });
  });

  it("gives the fields' missing cap its measured cause", () => {
    // Bug guarded: `input.mdx` listed `maxLength` among the props it does not
    // expose with no reason, so a reader could not tell an unwritten feature
    // from one the runtime forbids. The runtime applies a field's `value` only
    // when it **changes**, so a correction that leaves the value where it was —
    // a five-character cap refusing the sixth — is never taken back from the
    // box, and the next edit hands the refused character over. The fields'
    // runtime suite measures both directions; the pages say so, point at it, and
    // no page may list a cap as a prop.
    const input = read("input.mdx");
    const limitations = Option.getOrElse(
      bodyOf(input, "Limitations"),
      () => "",
    );
    const theming = Option.getOrElse(bodyOf(input, "Theming"), () => "");
    const textarea = Option.getOrElse(
      bodyOf(read("textarea.mdx"), "Limitations"),
      () => "",
    );
    const numberField = Option.getOrElse(
      bodyOf(read("number-field.mdx"), "Limitations"),
      () => "",
    );
    const evidence = readFileSync(
      fileURLToPath(
        new URL("../runtime/fields.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );

    expect({
      rule: theming.includes("re-applies that text only when it"),
      cause: limitations.includes("only when it **changes**"),
      refusal: limitations.includes("cannot be taken back from the box"),
      reports: limitations.includes("`abcde`, `abcdef`, `abcdefg`"),
      citation: limitations.includes("runtime/fields.runtime.test.tsx"),
      textarea: textarea.includes("same measured limit as `Input`"),
      numberField: numberField.includes("only when it changes"),
      applied: evidence.includes(
        "applies a value the field's owner pushes mid-edit",
      ),
      refused: evidence.includes(
        "cannot take back an edit that leaves the owner's value where it was",
      ),
      offered: documentedProps(input).includes("maxLength"),
    }).toEqual({
      rule: true,
      cause: true,
      refusal: true,
      reports: true,
      citation: true,
      textarea: true,
      numberField: true,
      applied: true,
      refused: true,
      offered: false,
    });
  });

  it("cites the window's paste measurement instead of the gap", () => {
    // Bug guarded: the page, the inventory record and the catalogue row said a
    // code field's paste was unverified while `otp-paste-lifecycle` had already
    // measured it in a real window, so a reader was told the library had not
    // observed the one path the probe drives. The absence of `onPaste` is still
    // true; the sentence has to name the probe and what it read, not the gap.
    const page = read("otp-field.mdx");
    const limitations = Option.getOrElse(bodyOf(page, "Limitations"), () => "");
    const verification = Option.getOrElse(
      bodyOf(page, "Verification"),
      () => "",
    );
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), Str.startsWith("| OTP Field |")),
      () => "",
    );
    const record = Option.getOrElse(
      Arr.findFirst(inventory, (entry) => entry.name === "OTP Field"),
      () => expect.fail("the inventory has no OTP Field record"),
    );
    const recordSays = (text: string): boolean =>
      Arr.some(record.limitations, Str.includes(text));

    expect({
      absence: limitations.includes("There is no `onPaste`"),
      probe: limitations.includes("`otp-paste-lifecycle`"),
      distribution: limitations.includes("the field fills\n  it forward"),
      truncation: limitations.includes("truncates at six"),
      testRenderer: limitations.includes("`TestRenderer` drives no"),
      verified: verification.includes("`otp-paste-lifecycle`"),
      rowMeasured: row.includes("**Paste is measured, not provided**"),
      rowProbe: row.includes("`otp-paste-lifecycle` window probe"),
      recordMeasured: recordSays("measured by otp-paste-lifecycle"),
      retractedPage: limitations.includes("Paste is unverified"),
      retractedRow: row.includes("Paste is unverified"),
      retractedRecord: recordSays("Paste is unverified"),
    }).toEqual({
      absence: true,
      probe: true,
      distribution: true,
      truncation: true,
      testRenderer: true,
      verified: true,
      rowMeasured: true,
      rowProbe: true,
      recordMeasured: true,
      retractedPage: false,
      retractedRow: false,
      retractedRecord: false,
    });
  });

  it("records the headless button decision as made, not pending", () => {
    // Bug guarded: the package README and `Button`'s header both promised the
    // headless `./button` adoption was "tracked in TODO.md" / "yet", while the
    // decision had been evaluated and declined (the runtime's `buttonProps`
    // would regress four measured behaviours) and the page already said so. A
    // reader was sent looking for work that does not exist.
    const readme = readFileSync(
      fileURLToPath(new URL("../README.md", import.meta.url)),
      "utf8",
    );
    const source = readFileSync(
      fileURLToPath(new URL("./components/Button.tsx", import.meta.url)),
      "utf8",
    );
    const page = read("button.mdx");

    expect({
      readmeDecision: readme.includes("evaluated and declined"),
      readmeReason: readme.includes("held-key guard"),
      readmePointer: readme.includes("docs/button.mdx"),
      sourceDecision: source.includes("**evaluated and"),
      sourceDeclined: source.includes("declined**"),
      pageDecision: page.includes("Adoption was evaluated"),
      pageDeclined: page.includes("and declined"),
      pagePointer: page.includes("TODO.md"),
      readmePending: readme.includes("headless one yet"),
      sourcePending: source.includes("tracked decision"),
    }).toEqual({
      readmeDecision: true,
      readmeReason: true,
      readmePointer: true,
      sourceDecision: true,
      sourceDeclined: true,
      pageDecision: true,
      pageDeclined: true,
      pagePointer: true,
      readmePending: false,
      sourcePending: false,
    });
  });

  it("teaches the axis a page key moves, and reads it off the tree", () => {
    // Bug guarded: a page step carried one number — the scroller's height — and
    // moved only the vertical axis, so `axis="horizontal"` dropped
    // PageUp/PageDown entirely while this page promised "one measured viewport
    // per PageUp/PageDown" for every axis. A reader sizing a sideways region
    // was told about a key that did nothing.
    const readSource = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
    const keyboard = Option.getOrElse(
      bodyOf(read("scroll-area.mdx"), "Keyboard"),
      () => "",
    ).replace(/\s+/g, " ");
    const logic = readSource("./core/scroll.ts");
    const area = readSource("./components/ScrollArea.tsx");

    expect({
      pageVertical: keyboard.includes(
        "PageUp/PageDown page the **vertical** axis",
      ),
      pageSideways: keyboard.includes(
        "the **horizontal** one of a region that scrolls nothing else",
      ),
      pageWidth: keyboard.includes("pages by the width in view"),
      pageDeclared: keyboard.includes(
        'give a width-only strip `axis="horizontal"`',
      ),
      logicAxis: logic.includes("const pageAxis"),
      logicWidth: logic.includes("metrics.page.width"),
      areaBox: area.includes("page: { width: box.width, height: box.height }"),
      retractedAxis: logic.includes("const acts ="),
      retractedBox: area.includes("page: box.height"),
    }).toEqual({
      pageVertical: true,
      pageSideways: true,
      pageWidth: true,
      pageDeclared: true,
      logicAxis: true,
      logicWidth: true,
      areaBox: true,
      retractedAxis: false,
      retractedBox: false,
    });
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

  it("tints the glyph the icon-button page and example show from a theme role", () => {
    // The bug guarded: the page taught `color="#000000"` in three snippets and
    // the mounted example painted every glyph black — invisible on the dark
    // theme and on the filled destructive action, the exact failure `Icon`'s
    // required `color` exists to prevent.
    const files = [
      { name: "docs/icon-button.mdx", source: read("icon-button.mdx") },
      {
        name: "examples/icon-button.example.tsx",
        source: readFileSync(
          fileURLToPath(
            new URL("../examples/icon-button.example.tsx", import.meta.url),
          ),
          "utf8",
        ),
      },
    ];
    Arr.forEach(files, ({ name, source }) => {
      expect(source, name).not.toMatch(/color="#[0-9A-Fa-f]{3,8}"/);
      expect(source, name).toContain("useTheme()");
    });
  });

  it("teaches the number field's real arrow keys", () => {
    // The bug guarded: the Keyboard table said `ArrowUp` / `ArrowRight` step up
    // and `ArrowDown` / `ArrowLeft` step down, while `decideNumberKey` answers
    // only up/down — Left/Right belong to the host text editor's caret, or the
    // caret could never cross a digit without the number changing.
    const range = { min: 0, max: 100, step: 1 };
    const keyboard = Option.getOrElse(
      bodyOf(read("number-field.mdx"), "Keyboard"),
      () => "",
    );
    const keyRows = Arr.filter(keyboard.split("\n"), (line) =>
      Str.startsWith("| `")(line),
    );
    expect(
      Arr.filter(keyRows, (row) => /Arrow(Left|Right)/.test(row)),
      "a table row claims Left/Right step the value",
    ).toEqual([]);
    expect(keyboard).toContain("host text editor");
    expect(
      Arr.map(["up", "down"], (key) =>
        Option.isSome(decideNumberKey(50, range, key)),
      ),
    ).toEqual([true, true]);
    expect(
      Arr.map(["left", "right"], (key) =>
        Option.isSome(decideNumberKey(50, range, key)),
      ),
    ).toEqual([false, false]);
  });

  it("pairs a display format with a reading of it", () => {
    // The bug guarded: `formatValue` is display-only, and the page taught that a
    // locale decimal "needs `formatValue` for display and parsing before the
    // value reaches the field" — a route the field never had. A field showing a
    // grouped "1,234" therefore dropped every keystroke (measured in a window:
    // no change at all), and a controlled owner's echo reformatted the text
    // under the caret because the draft was judged through the decimal grammar.
    // The page now names the `parseValue` counterpart, and both suites that
    // prove it are cited.
    const page = read("number-field.mdx");
    const api = Option.getOrElse(bodyOf(page, "API"), () => "");
    const runtime = readFileSync(
      fileURLToPath(
        new URL("../runtime/number-field.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );
    const core = readFileSync(
      fileURLToPath(new URL("./core/number.test.ts", import.meta.url)),
      "utf8",
    );
    expect({
      row: api.includes("| `parseValue` |"),
      displayOnly: api.includes("display-only"),
      retracted: page.includes("display and parsing"),
      reading: page.includes("consulted before the decimal grammar"),
      edited: runtime.includes("reads back the display format"),
      controlled: runtime.includes(
        "keeps a grouped draft the controlled owner",
      ),
      draft: page.includes("owner's echo"),
      unit: core.includes('describe("parseNumberText"'),
    }).toEqual({
      row: true,
      displayOnly: true,
      retracted: false,
      reading: true,
      edited: true,
      controlled: true,
      draft: true,
      unit: true,
    });
  });

  it("states the invalid state the checkbox group paints", () => {
    // The bug guarded: the API table said `invalid` "paints every box and its
    // ring destructive", while a checked box keeps its accent fill — only an
    // empty box's border and the row's focus ring take the destructive role.
    const api = Option.getOrElse(
      bodyOf(read("checkbox-group.mdx"), "API"),
      () => "",
    );
    expect(api).not.toContain("paints every box and its ring destructive");
    expect(api).toContain("empty box's border");
    expect(api).toContain("focus ring");
  });

  it("gives both value controls their second axis", () => {
    // The bug guarded: `orientation` reached the root but not the parts, so a
    // vertical slider laid a horizontal rail, grew its fill sideways and pulled
    // the thumb on the wrong axis — while the page documented the prop and the
    // window reported the value moving correctly. The pages name the axis and
    // its two measured limits; the painter keeps feeding it to all four parts.
    Arr.forEach(["slider.mdx", "range-slider.mdx"], (page) => {
      const source = read(page);
      expect(source, page).toContain("| `orientation` |");
      expect(source, page).toContain('"horizontal" \\| "vertical"');
      expect(source, page).toContain("needs a definite height");
      expect(source, page).toContain("`aria-orientation`");
    });
    const painter = readFileSync(
      fileURLToPath(new URL("../src/components/Slider.tsx", import.meta.url)),
      "utf8",
    );
    expect(painter).toContain("sliderTrackClass(size, orientation)");
    expect(painter).toContain("sliderRailClass(part.orientation)");
    expect(painter).toContain("sliderThumbClass(size, invalid, orientation)");
    expect(painter).toContain("verticalPointerValue");
    expect(painter).toContain("Arr.reverse(flattenParts(children))");
  });

  it("cites the window that painted the vertical slider", () => {
    // Bug guarded: both pages presented the vertical axis as the TestRenderer's
    // reading (`runtime/value.runtime.test.tsx`) even after
    // `slider-vertical-lifecycle` had painted it in a real window, so a reader
    // could not tell the arithmetic from the paint and a plan could reimplement
    // work the window already measures. The citation has to name the probe, say
    // what each lane proves, and resolve: the id is read out of the playground's
    // own live registry and the fixture that supplies its arithmetic, so a
    // renamed or deleted probe fails here rather than reading as evidence.
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const fixture = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/live/vertical-slider.ts", repoRoot),
      ),
      "utf8",
    );
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = (label: string): string =>
      Option.getOrElse(
        Arr.findFirst(catalogue.split("\n"), (line) =>
          Str.startsWith(`| ${label} |`)(line),
        ),
        () => "",
      );
    const lane = (page: string) => {
      const verification = Option.getOrElse(
        bodyOf(read(page), "Verification"),
        () => "",
      );
      return {
        probe: verification.includes("`slider-vertical-lifecycle`"),
        renderer: verification.includes("`TestRenderer`"),
        window: verification.includes("the paint and the runtime's"),
      };
    };

    expect({
      slider: lane("slider.mdx"),
      range: lane("range-slider.mdx"),
      registered: registry.includes('id: "slider-vertical-lifecycle"'),
      fixture:
        fixture.includes("thumbCentreAt") && fixture.includes("inkBounds"),
      sliderRow: row("Slider").includes("`slider-vertical-lifecycle`"),
      rangeRow: row("Range slider").includes("`slider-vertical-lifecycle`"),
    }).toEqual({
      slider: { probe: true, renderer: true, window: true },
      range: { probe: true, renderer: true, window: true },
      registered: true,
      fixture: true,
      sliderRow: true,
      rangeRow: true,
    });
  });

  it("cites the window that measured a scroll region's keyboard", () => {
    // Bug guarded: the page and the Scrollable containers row taught the
    // keyboard contract from the offscreen suites alone, which reach a key
    // through `runtime.keyDown(elementId, …)` — a verb a window does not have.
    // A window delivers a key to the focused element and bubbles, so the
    // traversal that reaches the stop is part of the contract, and a reader
    // planning a scroll region could not learn it. The printed offsets are
    // derived from the probe's own fixture, so a moved geometry fails here
    // rather than leaving the page teaching a step the window no longer shows.
    const page = read("scroll-area.mdx");
    const keyboard = Option.getOrElse(bodyOf(page, "Keyboard"), () => "");
    const verification = Option.getOrElse(
      bodyOf(page, "Verification"),
      () => "",
    );
    const fixture = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/live/keyboard-scroll.ts", repoRoot),
      ),
      "utf8",
    );
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const readme = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(
        catalogue.split("\n"),
        Str.startsWith("| Scrollable containers | done"),
      ),
      () => "",
    );
    // The page is wrapped prose, so a sentence is held flat: a paragraph's
    // line breaks are the page's, not the contract's.
    const flat = Str.replace(/\s+/g, " ");
    const count = (pattern: RegExp): number => {
      const match = pattern.exec(fixture);
      return match === null ? Number.NaN : Number(match[1]);
    };
    const line = lightTheme.density.rowHeight;
    const vertical = count(/VERTICAL_VIEWPORT = \{ width: \d+, height: (\d+)/);
    const verticalContent =
      count(/VERTICAL_ROWS = (\d+)/) * count(/VERTICAL_ROW_HEIGHT = (\d+)/) +
      count(/FIELD_SLOT = (\d+)/);
    const sideways = count(
      /HORIZONTAL_VIEWPORT = \{ width: (\d+), height: \d+/,
    );
    const sidewaysContent =
      count(/HORIZONTAL_COLUMNS = (\d+)/) *
      count(/HORIZONTAL_COLUMN_WIDTH = (\d+)/);

    const contract = flat(keyboard);
    expect({
      lane: contract.includes("`keyboard-scroll-lifecycle`"),
      traversal: contract.includes("stands down unless the focus is its own"),
      line: contract.includes(`(\`-${line}\`)`),
      page: contract.includes(`(\`${-line - vertical}\` from \`-${line}\`)`),
      clamp: contract.includes(`(\`${vertical - verticalContent}\`)`),
      sideways:
        contract.includes(`\`${-line - sideways}\``) &&
        contract.includes(`\`${sideways - sidewaysContent}\``),
      skipped: contract.includes(
        "`focusable={false}` region is skipped by the traversal",
      ),
      verified: verification.includes("`keyboard-scroll-lifecycle`"),
      checks: verification.includes("62 checks on 0.11.0"),
      evidence: verification.includes("§`keyboard-scroll-lifecycle`"),
      heading: readme.includes("### `keyboard-scroll-lifecycle`"),
      registry: registry.includes('id: "keyboard-scroll-lifecycle"'),
      row: row.includes("`keyboard-scroll-lifecycle`"),
    }).toEqual({
      lane: true,
      traversal: true,
      line: true,
      page: true,
      clamp: true,
      sideways: true,
      skipped: true,
      verified: true,
      checks: true,
      evidence: true,
      heading: true,
      registry: true,
      row: true,
    });
  });

  it("cites the window that measured a button's activation", () => {
    // Bug guarded: the Button page's Keyboard section and its inventory row
    // taught the Enter/Space rule from `core/keyboard.test.ts` and the
    // offscreen `runtime/controls.runtime.test.tsx` alone, while the shipped
    // control had been driven in a real window. A reader could not tell the
    // decision from the delivery, and two facts only the window shows — the
    // automation's key down with no release, and a key reaching `onActivate`
    // without the caller's host `onClick` — were missing from the contract.
    // The citation must resolve: the id is read from the playground's live
    // registry and the fixture that supplies its route table, so a renamed or
    // deleted probe fails here instead of reading as evidence.
    const page = read("button.mdx");
    const keyboard = Option.getOrElse(bodyOf(page, "Keyboard"), () => "");
    const verification = Option.getOrElse(
      bodyOf(page, "Verification"),
      () => "",
    );
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const fixture = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/button.ts", repoRoot)),
      "utf8",
    );
    const readme = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), Str.startsWith("| Buttons |")),
      () => "",
    );

    expect({
      lane: keyboard.includes("`button-activation-lifecycle`"),
      renderer: keyboard.includes("`TestRenderer`"),
      noRelease: keyboard.includes("down with no release"),
      keyAlone: keyboard.includes("`onActivate` alone"),
      pointerHost: keyboard.includes("`onClick` as well"),
      verified: verification.includes("`button-activation-lifecycle`"),
      printed: verification.includes("18 checks on 0.11.0"),
      evidence: verification.includes("§`button-activation-lifecycle`"),
      registered: registry.includes('id: "button-activation-lifecycle"'),
      routes:
        fixture.includes('"space-release"') &&
        fixture.includes('"keyUp:space"') &&
        fixture.includes("activationKind"),
      readme: readme.includes(
        "18 checks, `--only button-activation-lifecycle`",
      ),
      row: row.includes("`button-activation-lifecycle`"),
    }).toEqual({
      lane: true,
      renderer: true,
      noRelease: true,
      keyAlone: true,
      pointerHost: true,
      verified: true,
      printed: true,
      evidence: true,
      registered: true,
      routes: true,
      readme: true,
      row: true,
    });
  });

  it("teaches the wheel a nested scroller cannot keep", () => {
    // Bug guarded: the page documented one scroller and said nothing about a
    // scroller inside another, while a window had measured that a wheel moves
    // every scrollable ancestor on the hit path and that no prop can refuse it
    // — the fact a dock, or a page holding a list, is designed around.
    const page = read("scroll-area.mdx");
    const nesting = Option.getOrElse(bodyOf(page, "Nesting"), () => "");
    const verification = Option.getOrElse(
      bodyOf(page, "Verification"),
      () => "",
    );
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const readme = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );

    expect({
      ancestor: nesting.includes("every scrollable ancestor"),
      noPrevent: nesting.includes("no `preventDefault`"),
      ownOffset: nesting.includes("`onScrollChange` offset"),
      probe: nesting.includes("`nested-scroll-lifecycle`"),
      verified: verification.includes("`nested-scroll-lifecycle`"),
      checks: verification.includes("31 checks on 0.11.0"),
      evidence: verification.includes("§`nested-scroll-lifecycle`"),
      heading: readme.includes("### `nested-scroll-lifecycle`"),
      registry: registry.includes('id: "nested-scroll-lifecycle"'),
    }).toEqual({
      ancestor: true,
      noPrevent: true,
      ownOffset: true,
      probe: true,
      verified: true,
      checks: true,
      evidence: true,
      heading: true,
      registry: true,
    });
  });

  it("names only package paths that exist", () => {
    // Bug guarded: ScrollArea's limitations handed the virtual-list work to a
    // `data-grid` package "when it lands" — a directory this workspace has
    // never had — while `@gpuixui/data` had already shipped `VirtualList`. A
    // citation to a directory no reader can open is a dead end, so every
    // workspace path a file names must resolve to a real package.
    const missing = Arr.flatMap(workstream.files, (file) =>
      Arr.filterMap(
        [...file.source.matchAll(/packages\/([a-z0-9-]+)/g)],
        (match) => {
          const name = match[1] ?? "";
          return existsSync(
            fileURLToPath(new URL(`packages/${name}`, repoRoot)),
          )
            ? Result.failVoid
            : Result.succeed(
                `${file.name}: names packages/${name}, which does not exist`,
              );
        },
      ),
    );
    expect(missing).toEqual([]);

    // The positive half: the page has to point at the composition that really
    // windows a list, not merely stop naming the dead path.
    const limitations = Option.getOrElse(
      bodyOf(read("scroll-area.mdx"), "Limitations"),
      () => "",
    );
    expect(limitations).toContain("`VirtualList`");
    expect(limitations).toContain("@gpuixui/data");
  });

  it("cites only plans that exist", () => {
    // The bug guarded: completed plans are deleted (`.agents/slop/plans/README.md`),
    // but this workstream still sent readers to four completed plans for the
    // Tier 1 runtime evidence and the binding recipe. A citation to a deleted
    // plan is a dead end; the evidence lives in `COMPONENTS.md`, the suite each
    // `src/inventory.ts` record names, `docs/gpuix-capabilities.md` and
    // `apps/playground/README.md`.
    const missing = [
      ...Arr.flatMap(workstream.files, (file) =>
        Arr.map(
          Arr.filter(
            citedPlans(file.source),
            (path) =>
              !existsSync(fileURLToPath(new URL(planFile(path), repoRoot))),
          ),
          (path) => `${file.name}: cites ${path}, which does not exist`,
        ),
      ),
      ...Arr.flatMap(workstream.files, (file) =>
        Arr.map(
          Arr.filter(
            citedPlanNumbers(file.source),
            (number) => !HashSet.has(existingPlans, number),
          ),
          (number) =>
            `${file.name}: cites plan ${number}, which does not exist`,
        ),
      ),
    ];

    expect(missing).toEqual([]);
  });

  it("walks the tree without reading package-manager or build output", () => {
    // The bug guarded: the citation scan filtered `node_modules` and `dist` out
    // *after* a recursive `readdirSync`, so it enumerated 17 884 directory
    // entries to keep 191 files and took 0.45–0.53 s — enough for the case to
    // blow its 5 s budget when the full suite started 49 workers at once
    // (measured 2026-10-22). The walk now skips those directories whole, which
    // is the same file set for a fraction of the entries; this case is what
    // fails if the walk ever descends into them again.
    expect(
      workstream.entries,
      `${workstream.entries} entries read for ${Arr.length(workstream.files)} files`,
    ).toBeLessThan(Arr.length(workstream.files) * 2);
    expect(Arr.length(workstream.files)).toBeGreaterThanOrEqual(150);
    expect(
      Arr.filter(workstream.files, (file) =>
        /(^|\/)(node_modules|dist)\//.test(file.name),
      ),
    ).toEqual([]);
    // Both roots still contribute: a walk that quietly read one package would
    // otherwise spend its budget on nothing and pass.
    const names = Arr.map(workstream.files, (file) => file.name);
    expect(Arr.some(names, Str.startsWith("packages/icons/"))).toBe(true);
    expect(Arr.some(names, Str.startsWith("packages/primitives/docs/"))).toBe(
      true,
    );
  });
});

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
 * One `###` heading's body, up to the next `###`.
 *
 * The playground's README records each probe under its own heading; a page that
 * cites a probe has to print what that record measured, so the record's body is
 * read rather than the whole document.
 */
const probeRecord = (source: string, heading: string): string => {
  const marker = `### ${heading}`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const rest = source.slice(start + marker.length);
  const end = rest.indexOf("\n### ");
  return end < 0 ? rest : rest.slice(0, end);
};

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

/** Every page must document these sections, in this order. */
const REQUIRED = ["Usage", "API", "Limitations"] as const;

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

  it("says what a press on the words does to the control beside them", () => {
    // The bug guarded: `Label` gained `target`, so a press on the words focuses
    // the control — and both box pages still called the visible label "text
    // only", which after that change reads as inert. The other direction is
    // just as wrong: the runtime publishes no press verb for another element,
    // so a page must not promise that the words toggle the box either. The
    // truth is focus-only, and a row whose words toggle is the group's row.
    const limitationsOf = (page: string): string =>
      Option.getOrElse(bodyOf(read(page), "Limitations"), () => "");
    const checkbox = limitationsOf("checkbox.mdx");
    expect(checkbox).toContain("`Label target`");
    expect(checkbox).toContain("CheckboxGroup");
    expect(checkbox).not.toMatch(/visible\s+text only/);
    const toggle = limitationsOf("switch.mdx");
    expect(toggle).toContain("`Label target`");
    expect(toggle).not.toMatch(/paints text only/);
    const label = limitationsOf("label.mdx");
    expect(label).toContain("does not activate");
    expect(label).toContain("CheckboxGroup");

    // The premise, read off the painter: the press is `focusElement` and
    // nothing else. A label that learned to activate its target would make both
    // pages wrong in the other direction.
    const source = readFileSync(
      fileURLToPath(new URL("src/components/Label.tsx", packageRoot)),
      "utf8",
    );
    expect(source).toContain("renderer.focusElement?.(instance.id)");
    expect(source).not.toMatch(/\bdispatch\b|\.activate\b|\.toggle\b/);
  });

  it("moves the one floating tip on the house timing, and says so", () => {
    // The bug guarded: `Tooltip` rendered the runtime's content with no
    // `motion`, so a tip appeared at rest beside every popover, menu and preview
    // card that fades. The seam is in `core/presence.ts` (the frames and the
    // hold), `Tooltip` composes it, and the page teaches what the reader will
    // see — so a page that stops naming the timing, a painter that stops using
    // the seam, or a manifest that drops the timing package all fail here.
    const page = read("tooltip.mdx");
    const motion = Option.getOrElse(bodyOf(page, "Motion"), () => "");
    expect(motion).toContain("motionLevels.fast");
    expect(motion).toContain("160");
    expect(motion).toContain("`reducedMotion`");
    expect(page).toContain("| `reducedMotion` |");
    const sourceOf = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8");
    // The seam composes the published rule rather than restating it: the frames,
    // the window and the pointer rule are `@gpuixui/motion/presence`'s, and the
    // level is named through that module's own phase pairing.
    const presence = sourceOf("src/core/presence.ts");
    expect(presence).toContain('from "@gpuixui/motion/presence"');
    expect(presence).toContain('presenceTiming("fast"');
    const tooltip = sourceOf("src/components/Tooltip.tsx");
    expect(tooltip).toContain("surfaceMotion(");
    expect(tooltip).toContain("useHeldOpen(");
    expect(sourceOf("package.json")).toContain(
      '"@gpuixui/motion": "workspace:*"',
    );
    // The record a reader finds without the page says the tip is not static
    // either, and names the seam's suite.
    const row = Arr.findFirst(
      inventory,
      (record) => record.name === "Tooltips",
    );
    const record = Option.getOrElse(row, () =>
      expect.fail("the inventory carries no Tooltips record"),
    );
    expect(
      Arr.some(record.limitations, Str.includes("motionLevels.fast")),
    ).toBe(true);
    expect(record.tests).toContain("src/core/presence.test.ts");
  });

  Arr.forEach(contract, ({ it: title, check }) => {
    it(title, () => {
      expect(Arr.flatMap(pages, (page) => problemsFor(page, check))).toEqual(
        [],
      );
    });
  });

  it("holds the page contract to the sections the pages carry", () => {
    // The bug guarded: `docs/README.md` still promised eleven sections per page
    // after the pages were rewritten — `## Keyboard`, `## Accessibility`,
    // `## Theming`, `## Verification` and `## Related` were on no page — so a
    // reader or an agent filling a gap followed a contract the package had
    // abandoned. The contract is a table now: a required row is on every page,
    // an optional row is on at least one, and a page carries no section the
    // table does not name.
    interface ContractRow {
      readonly heading: string;
      readonly required: boolean;
    }
    const rows: ReadonlyArray<ContractRow> = Arr.filterMap(
      read("README.md").split("\n"),
      (line): Result.Result<ContractRow, void> => {
        const match = /^\| `## (.+?)` \| (yes|no) \|/.exec(line);
        return match === null
          ? Result.failVoid
          : Result.succeed({
              heading: match[1] ?? "",
              required: match[2] === "yes",
            });
      },
    );
    const headingsOf = (page: string): ReadonlyArray<string> =>
      Arr.map(sections(read(page)), (section) => section.heading);
    const carried = Arr.map(pages, (page) => ({
      page,
      headings: headingsOf(page),
    }));
    expect(Arr.length(rows)).toBeGreaterThanOrEqual(5);
    expect(
      Arr.flatMap(rows, (row) =>
        row.required
          ? Arr.filterMap(carried, ({ page, headings }) =>
              Arr.contains(headings, row.heading)
                ? Result.failVoid
                : Result.succeed(`${page}: no ## ${row.heading}`),
            )
          : [],
      ),
    ).toEqual([]);
    expect(
      Arr.flatMap(carried, ({ page, headings }) =>
        Arr.filterMap(headings, (heading) =>
          Arr.some(rows, (row) => row.heading === heading)
            ? Result.failVoid
            : Result.succeed(
                `${page}: ## ${heading} is not in the page contract`,
              ),
        ),
      ),
    ).toEqual([]);
    expect(
      Arr.filterMap(rows, (row) =>
        Arr.some(carried, ({ headings }) => Arr.contains(headings, row.heading))
          ? Result.failVoid
          : Result.succeed(
              `docs/README.md: ## ${row.heading} is promised but no page carries it`,
            ),
      ),
    ).toEqual([]);
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

  it("names the one opt-out a busy word has, and how a bar's words differ", () => {
    // The bug guarded: `Button`, `Toggle` and `IconButton` publish the busy word
    // as the action's description and the spinner's name, and a blank
    // `loadingLabel` silences both (the opt-out their source comments record) —
    // while all three pages listed the default and stopped, so a caller could
    // neither find the opt-out nor tell it apart from a bar's `formatValue`,
    // whose blank answer keeps the component's own words because a progressbar
    // has no second channel. Neither half may be documented alone.
    const silent = Arr.filter(
      ["button.mdx", "toggle.mdx", "icon-button.mdx"],
      (page) => !read(page).includes("a blank one silences both"),
    );
    expect(silent).toEqual([]);
    expect(read("progress.mdx")).toContain("a blank answer keeps the default");
    expect(read("meter.mdx")).toContain("a blank answer keeps the number");
    const words = Option.getOrElse(
      bodyOf(read("theme-provider.mdx"), "Words"),
      () => "",
    );
    expect(words).toContain("a deliberate silence");
  });

  it("paints a silent spinner as decoration, not an unnamed status", () => {
    // The bug guarded: a blank `label` — a deliberate silence, or a translation
    // table that answered nothing — still declared `role="status"` with no
    // `aria-label`, so a window's accessibility tree carried a Status node with
    // nothing to announce. Silence is decoration (`Icon`'s blank-label rule);
    // the painter must take its role from the name it resolved, and both pages
    // must teach the difference between the shipped word and an explicit blank.
    const spinnerSource = readFileSync(
      fileURLToPath(new URL("../src/components/Spinner.tsx", import.meta.url)),
      "utf8",
    );
    expect(spinnerSource).toContain("const name = accessibleName(");
    expect(spinnerSource).toMatch(
      /role=\{name === undefined \? "presentation" : "status"\}/,
    );
    expect(read("spinner.mdx")).toContain("paints the dots as decoration");
    expect(read("spinner.mdx")).toContain("no node to walk into");
    const limitations = Option.getOrElse(
      bodyOf(read("spinner.mdx"), "Limitations"),
      () => "",
    );
    expect(limitations).toContain('role="presentation"');
    expect(limitations).toContain("unnamed");
    const words = Option.getOrElse(
      bodyOf(read("theme-provider.mdx"), "Words"),
      () => "",
    );
    expect(words).toContain('role="presentation"');
  });

  it("keeps a slider's own words when its formatter says nothing", () => {
    // The bug guarded: `Slider`/`RangeSlider`'s `formatValue` is a caller's
    // localised copy and its answer was published as it arrived, so a formatter
    // with no row for this value (`""`) left the control announcing nothing on
    // `aria-valuetext` — the only channel a slider has. The painter must ask
    // `spokenText`, and all three pages must teach the rule, or a reader cannot
    // tell it from a busy word's deliberate silence.
    const painter = readFileSync(
      fileURLToPath(new URL("../src/components/Slider.tsx", import.meta.url)),
      "utf8",
    );
    const announcement = painter
      .slice(painter.indexOf("export const sliderValueText"))
      .split("\n\n")[0];
    expect(announcement).toContain("spokenText");
    expect(announcement).not.toContain("formatValue?.(value) ??");
    const unstated = Arr.filter(["slider.mdx", "range-slider.mdx"], (page) => {
      const text = read(page).replaceAll("*", "");
      return (
        !text.includes("a blank answer is absence") ||
        !text.includes("a blank answer keeps the number")
      );
    });
    expect(unstated).toEqual([]);
    const words = Option.getOrElse(
      bodyOf(read("theme-provider.mdx"), "Words"),
      () => "",
    );
    expect(words).toContain("`Slider`");
    expect(words).toContain("`RangeSlider`");
  });

  it("keeps a control's own sentence when the table's says nothing", () => {
    // The bug guarded: `starName`, `codeDigit` and `rangeEnd` are sentences a
    // component calls with the caller's data, and each answer was published as
    // it arrived — so a localised table with a missing row (`""`) named a
    // rating's stars and a code field's cells with nothing and left both of a
    // range's thumbs unnamed, while every report stayed empty. The three
    // painters must ask `spokenSentence`, and the words page plus each control
    // page must teach the rule, or a reader cannot tell a missing row from a
    // deliberate silence.
    const rating = readFileSync(
      fileURLToPath(new URL("../src/components/Rating.tsx", import.meta.url)),
      "utf8",
    );
    expect(rating).toContain("spokenSentence");
    expect(rating).not.toContain("aria-label={messages.starName(");
    const otp = readFileSync(
      fileURLToPath(new URL("../src/components/OTPField.tsx", import.meta.url)),
      "utf8",
    );
    const cell = otp
      .slice(otp.indexOf("export const otpCellLabel"))
      .split("\n\n")[0];
    expect(cell).toContain("spokenSentence");
    expect(cell).not.toContain(
      "messages.codeDigit(index, accessibleName(label))",
    );
    const messages = readFileSync(
      fileURLToPath(new URL("../src/core/messages.ts", import.meta.url)),
      "utf8",
    );
    const ends = messages
      .slice(messages.indexOf("const spokenEnd"))
      .split("\n\n")[0];
    expect(ends).toContain("spokenSentence");
    expect(ends).not.toContain("): string =>\n  end(");
    expect(ends).toContain("end(label, side)");
    const unstated = Arr.filter(
      ["rating.mdx", "otp-field.mdx", "range-slider.mdx"],
      (page) =>
        !read(page)
          .replaceAll("*", "")
          .replaceAll(/\s+/g, " ")
          .includes("A blank answer is absence"),
    );
    expect(unstated).toEqual([]);
    const words = Option.getOrElse(
      bodyOf(read("theme-provider.mdx"), "Words"),
      () => "",
    );
    expect(words).toContain("`starName`");
    expect(words).toContain("`codeDigit`");
    expect(words).toContain("`rangeEnd`");
    expect(words).toContain("`rangeEnd` has a second blank");
    // The package README teaches the same seam, and a renamed export would
    // otherwise leave it naming a helper that no longer exists.
    expect(
      readFileSync(
        fileURLToPath(new URL("../README.md", import.meta.url)),
        "utf8",
      ),
    ).toContain("`spokenSentence`");
  });

  it("keeps a control's own state word when the table's says nothing", () => {
    // The bug guarded: a `messages` group is filled per state, so a row nobody
    // translated answers `""` — the shape a formatter and a sentence already
    // read as absence. These are not sentences but static words, and they are
    // the **only** channel this runtime gives a checkbox, a switch, a toggle or
    // a star, so a blank row announced nothing at all while the control still
    // held a value; a blank `scrollRegion` left a tab-stop scroller a `group`
    // with an empty name. Every reader must resolve through `spokenWord`, and
    // the words page plus the README must teach the rule so a reader can tell a
    // missing translation from the busy prop's deliberate silence.
    const messages = readFileSync(
      fileURLToPath(new URL("../src/core/messages.ts", import.meta.url)),
      "utf8",
    );
    const helper = (name: string): string => {
      const start = messages.indexOf(`export const ${name} = (`);
      const end = messages.indexOf("\n\nexport", start);
      return messages.slice(start, end === -1 ? undefined : end);
    };
    expect(
      Arr.filter(
        [
          "selectionWord",
          "pressWord",
          "starWord",
          "busyWord",
          "indeterminateWord",
        ],
        (name) => !helper(name).includes("spokenWord"),
      ),
    ).toEqual([]);
    const readComponent = (path: string): string =>
      readFileSync(
        fileURLToPath(new URL(`../src/components/${path}`, import.meta.url)),
        "utf8",
      );
    // The busy word is a static field on two more painters and a bar's word on
    // a third, so each must ask its helper rather than publish the table raw.
    expect(readComponent("Button.tsx")).toContain("busyWord(messages.loading)");
    expect(readComponent("Toggle.tsx")).toContain("busyWord(messages.loading)");
    expect(readComponent("Spinner.tsx")).toContain(
      "busyWord(messages.loading)",
    );
    expect(readComponent("Progress.tsx")).toContain(
      "indeterminateWord(messages.loading)",
    );
    // `scrollRegion` is a name, not only a word: it is trimmed, and a blank row
    // keeps the shipped name instead of leaving the stop unnamed.
    expect(readComponent("ScrollArea.tsx")).toContain(
      "spokenWord(messages.scrollRegion, defaultMessages.scrollRegion)",
    );
    const words = Option.getOrElse(
      bodyOf(read("theme-provider.mdx"), "Words"),
      () => "",
    );
    expect(words).toContain("are read one state at a time");
    expect(words).toContain("`scrollRegion` has no blank of its own");
    expect(
      readFileSync(
        fileURLToPath(new URL("../README.md", import.meta.url)),
        "utf8",
      ),
    ).toContain("`spokenWord`");
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
      cause: limitations.includes("only when it **changes**"),
      refusal: limitations.includes("cannot be taken back from the box"),
      reports: limitations.includes("`abcde`, `abcdef`, `abcdefg`"),
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
      cause: true,
      refusal: true,
      reports: true,
      textarea: true,
      numberField: true,
      applied: true,
      refused: true,
      offered: false,
    });
  });

  it("announces the hint a field paints, and says what the hint answers", () => {
    // Bug guarded: a field paints its own hint because the runtime shapes an
    // empty host's placeholder in a fixed grey (`fieldHint`), and handing the
    // host no `placeholder` also takes the runtime's `aria_placeholder` with it —
    // so an empty field announced no format at all, and the inventory said the
    // hint "reads as a label beside the field" as if that were the whole answer.
    // The words ride the one help channel 0.11.0 has, while the box is empty.
    const source = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, packageRoot)), "utf8");
    const rule = source("src/core/a11y.ts");
    const input = source("src/components/Input.tsx");
    const number = source("src/components/NumberField.tsx");
    const evidence = source("runtime/labelling.runtime.test.tsx");
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), (line) =>
        Str.startsWith("| Text inputs |")(line),
      ),
      () => "",
    );
    const announcement =
      "announced as the field's description while the box is empty";

    expect({
      // The three pages that paint a hint say what a reader hears.
      pages: Arr.filter(
        ["input.mdx", "textarea.mdx", "number-field.mdx"],
        (page) => !read(page).includes(announcement),
      ),
      // One rule, and the host is given no placeholder to announce instead.
      rule: rule.includes("export const fieldHelp"),
      empty: rule.includes("value.length === 0"),
      hostless: !input.includes("placeholder: props.placeholder"),
      input: input.includes(
        '"aria-description": fieldHelp(props, state.current)',
      ),
      number: number.includes("description: fieldHelp(props, text)"),
      // The row states the announcement and stops promising a label is enough.
      row: row.includes(announcement),
      retracted: row.includes("reads as a label beside the field"),
      // The window case that measured it.
      measured: evidence.includes(
        "announces the hint a field paints, while the box is empty",
      ),
    }).toEqual({
      pages: [],
      rule: true,
      empty: true,
      hostless: true,
      input: true,
      number: true,
      row: true,
      retracted: false,
      measured: true,
    });
  });

  it("paints the number it holds, and says which keys a window delivers", () => {
    // Bug guarded: the display defaulted to zero decimals, so the field painted
    // a number it did not hold — a stored `1.5` read `2` and a `2.5` maximum
    // painted `3` — and the page promised a Home/End bounds jump a native
    // `<input>` never delivers, because the host consumes both for its caret.
    // The runtime suite measures both, so the page cannot promise either again.
    const page = read("number-field.mdx");
    const keyboard = Option.getOrElse(bodyOf(page, "Keyboard"), () => "");
    const limitations = Option.getOrElse(bodyOf(page, "Limitations"), () => "");
    const api = Option.getOrElse(bodyOf(page, "API"), () => "");
    const evidence = readFileSync(
      fileURLToPath(
        new URL("../runtime/number-field.runtime.test.tsx", import.meta.url),
      ),
      "utf8",
    );

    expect({
      display: page.includes("paints the number it holds"),
      precision: api.includes("rounds and pads the text"),
      notDelivered: keyboard.includes(
        "**not delivered to a field in a window**",
      ),
      measured: keyboard.includes(
        "neither the input's `onKeyDown` nor a wrapper's",
      ),
      alternative: keyboard.includes("@gpuixui/keyboard"),
      retracted: `${keyboard}${limitations}`.includes(
        "`Home`/`End` jump to the ends",
      ),
      paintCase: evidence.includes(
        "paints the number it holds, including the decimals its step needs",
      ),
      keyCase: evidence.includes(
        "hears no Home or End in a window, because the text host owns them",
      ),
    }).toEqual({
      display: true,
      precision: true,
      notDelivered: true,
      measured: true,
      alternative: true,
      retracted: false,
      paintCase: true,
      keyCase: true,
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

  it("describes a group option's caption the way the shared row paints it", () => {
    // Bug guarded: `checkbox-group.mdx` said the caption sat *under* the name,
    // while `optionBody` paints one row (name, then caption) and the radio and
    // toggle pages say "beside". A reader styling a two-line checkbox row got a
    // one-line row, and the three pages taught two layouts for one component.
    const row = readFileSync(
      fileURLToPath(new URL("../src/components/group.tsx", import.meta.url)),
      "utf8",
    );
    expect(row).toContain('"flex flex-row items-center gap-sm"');
    Arr.forEach(
      ["checkbox-group.mdx", "radio-group.mdx", "toggle-group.mdx"],
      (page) => {
        const text = read(page);
        expect(text, page).toContain("a caption beside the name");
        expect(text, page).not.toContain("under the name");
      },
    );
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
    // Bug guarded: the shadcn-brief rewrite dropped the pages' probe citation —
    // and this guard with it — so the vertical axis read as the headless
    // renderer's claim alone even though `slider-vertical-lifecycle` had painted
    // it in a real window. A plan could reimplement what is already proved, and
    // `TODO.md` still recorded the citation as landed. The citation must name
    // the probe and the headless suite, print the geometry the probe measured,
    // and resolve: the id is read out of the playground's registry and the
    // track's length out of the fixture, so a renamed or deleted probe cannot
    // read as evidence.
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
    const record = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const height = Option.getOrElse(
      Option.map(
        Option.fromNullishOr(
          /VERTICAL_SLIDER_HEIGHT = (\d+);/.exec(fixture)?.[1],
        ),
        Number.parseFloat,
      ),
      () => Number.NaN,
    );
    // The probe's geometry is the theme's arithmetic: the caller's length, the
    // control's own height as the width, and half a thumb reserved at each end.
    const track = `${lightTheme.density.controlHeight.md} × ${height}`;
    const rail = `${lightTheme.spacing.xs} × ${
      height - lightTheme.iconSize.md
    }`;
    /** The probe's own record, up to the next probe section. */
    const probeRecord = (source: string): string => {
      const heading = "### `slider-vertical-lifecycle`";
      const start = source.indexOf(heading);
      if (start < 0) return "";
      const rest = source.slice(start + heading.length);
      const end = rest.indexOf("\n### ");
      return end < 0 ? rest : rest.slice(0, end);
    };
    const measured = probeRecord(record);
    const api = (page: string): string =>
      Option.getOrElse(bodyOf(read(page), "API"), () => "");
    const cites = (page: string): boolean =>
      api(page).includes("`slider-vertical-lifecycle`") &&
      api(page).includes("`runtime/value.runtime.test.tsx`") &&
      api(page).includes("holds the arithmetic") &&
      api(page).includes("holds the paint");
    const prints = (page: string, values: ReadonlyArray<string>): boolean =>
      Arr.every(values, (value) => api(page).includes(value));
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

    expect({
      registered: registry.includes('id: "slider-vertical-lifecycle"'),
      fixture:
        fixture.includes("thumbCentreAt") && fixture.includes("inkBounds"),
      length: Number.isFinite(height) && height > 0,
      recorded: measured.includes(track) && measured.includes(rail),
      slider: {
        cites: cites("slider.mdx"),
        prints: prints("slider.mdx", [track, rail, "240", "148", "194", "56"]),
      },
      range: {
        cites: cites("range-slider.mdx"),
        prints: prints("range-slider.mdx", ["50-90", "25-90", "194", "74.5"]),
      },
      sliderRow: row("Slider").includes("`slider-vertical-lifecycle`"),
      rangeRow: row("Range slider").includes("`slider-vertical-lifecycle`"),
    }).toEqual({
      registered: true,
      fixture: true,
      length: true,
      recorded: true,
      slider: { cites: true, prints: true },
      range: { cites: true, prints: true },
      sliderRow: true,
      rangeRow: true,
    });
  });

  it("cites the window that drove a scroll region from the keyboard", () => {
    // Bug guarded: the shadcn-brief rewrite dropped the scroll page's probe
    // citation — and the guard that held it — so the keyboard contract read as
    // the offscreen renderer's claim alone while `keyboard-scroll-lifecycle` had
    // driven it in a window. The same page taught that a sideways arrow moves
    // "one column", but `core/scroll.ts` steps one `density.rowHeight` on both
    // axes and the runtime has no column metric: the probe's columns are 80px
    // wide while the step it measured is 32, so a reader planning a sideways
    // region was told the wrong distance. The citation, the step and the
    // geometry are derived from the probe's own fixture and record.
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const fixture = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/live/keyboard-scroll.ts", repoRoot),
      ),
      "utf8",
    );
    const record = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const scene = readFileSync(
      fileURLToPath(new URL("../src/core/scroll.ts", import.meta.url)),
      "utf8",
    );
    const painter = readFileSync(
      fileURLToPath(
        new URL("../src/components/ScrollArea.tsx", import.meta.url),
      ),
      "utf8",
    );
    /** One number the probe fixture declares, or `NaN` when the line moved. */
    const declared = (pattern: string): number =>
      Option.getOrElse(
        Option.map(
          Option.fromNullishOr(new RegExp(pattern).exec(fixture)?.[1]),
          Number.parseFloat,
        ),
        () => Number.NaN,
      );
    /** The probe's own record, up to the next probe section. */
    const measured = probeRecord(record, "`keyboard-scroll-lifecycle`");
    const checks = /(\d+) checks/.exec(measured)?.[1] ?? "";
    const keyboard = Option.getOrElse(
      bodyOf(read("scroll-area.mdx"), "Keyboard"),
      () => "",
    );
    // One line is the theme's own row; a page is the viewport's own side, and
    // the content's end is the side less the content, which is what makes the
    // printed offsets derive rather than a second implementation.
    const line = lightTheme.density.rowHeight;
    const vertical = declared(
      "VERTICAL_VIEWPORT = \\{ width: \\d+, height: (\\d+) \\}",
    );
    const rows = declared("VERTICAL_ROWS = (\\d+)");
    const rowHeight = declared("VERTICAL_ROW_HEIGHT = (\\d+)");
    const field = declared("FIELD_SLOT = (\\d+)");
    const side = declared(
      "HORIZONTAL_VIEWPORT = \\{ width: (\\d+), height: \\d+ \\}",
    );
    const columns = declared("HORIZONTAL_COLUMNS = (\\d+)");
    const column = declared("HORIZONTAL_COLUMN_WIDTH = (\\d+)");
    const fixtureNumbers = [
      vertical,
      rows,
      rowHeight,
      field,
      side,
      columns,
      column,
    ];
    const firstPage = -(line + vertical);
    const sidePage = -(line + side);
    const verticalEnd = vertical - (rows * rowHeight + field);
    const sideEnd = side - columns * column;
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), (line) =>
        Str.startsWith("| Scrollable containers | done |")(line),
      ),
      () => "",
    );

    expect({
      registered: registry.includes('id: "keyboard-scroll-lifecycle"'),
      geometry:
        Arr.every(fixtureNumbers, Number.isFinite) && line > 0 && column > line,
      arithmetic:
        firstPage === -192 &&
        sidePage === -352 &&
        verticalEnd === -320 &&
        sideEnd === -1120,
      recorded:
        Str.isNonEmpty(checks) &&
        measured.includes("density.rowHeight") &&
        measured.includes(`${firstPage}`) &&
        measured.includes(`${sidePage}`) &&
        measured.includes(`${verticalEnd}`) &&
        measured.includes(`${sideEnd}`),
      source:
        scene.includes("One line of content — the theme's `rowHeight`") &&
        scene.includes("current + direction * metrics.line") &&
        painter.includes("line: theme.density.rowHeight"),
      page:
        keyboard.includes("`keyboard-scroll-lifecycle`") &&
        keyboard.includes(`${checks} checks`) &&
        keyboard.includes(`${line}px`) &&
        keyboard.includes(`\`-${line}\` → \`${firstPage}\``) &&
        keyboard.includes(`${sidePage}`) &&
        keyboard.includes("on either axis") &&
        keyboard.includes("not one column") &&
        keyboard.includes("getFocusedElementId"),
      retracted: !keyboard.includes("one column in a sideways region"),
      row:
        row.includes("`keyboard-scroll-lifecycle`") &&
        row.includes("one theme row per arrow"),
    }).toEqual({
      registered: true,
      geometry: true,
      arithmetic: true,
      recorded: true,
      source: true,
      page: true,
      retracted: true,
      row: true,
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

  it("splits the press route from the keyboard route", () => {
    // The measured split (`key-hold-lifecycle`, 17 checks on 0.11.0): a keyboard
    // activation of the shipped `Button` reaches `onActivate` alone — six key
    // events ran no press — so a consumer wiring the React habit `onClick` has a
    // control no keyboard can trigger. The page states which route is which, and
    // the shared prop's JSDoc says it where a caller reads it.
    const page = read("button.mdx");
    const api = Option.getOrElse(bodyOf(page, "API"), () => "");
    const limitations = Option.getOrElse(bodyOf(page, "Limitations"), () => "");
    const props = readFileSync(
      fileURLToPath(new URL("./components/internal.ts", import.meta.url)),
      "utf8",
    );

    expect({
      row: api.includes("`onClick` is the **pointer** route"),
      keyboard: api.includes("a keyboard activation never runs it"),
      limitation: limitations.includes("`onClick` is the pointer route"),
      pointer: props.includes("A **pointer** press"),
      editor: props.includes("never for a key"),
      action: props.includes("`onActivate` on an action"),
    }).toEqual({
      row: true,
      keyboard: true,
      limitation: true,
      pointer: true,
      editor: true,
      action: true,
    });
  });

  it("states the activation a window measured, both halves of it", () => {
    // Bug guarded: the shadcn-brief rewrite dropped the Button page's §Keyboard
    // — and the guard that held it — so the page no longer said which half of a
    // key activates (Enter's press, Space's release), that a held key is
    // ignored, or which tab stop a disabled/busy action keeps; a reader could
    // only learn the route split from §Limitations. Every control in the
    // library composes this action, so the contract it omits is MISSION's first
    // critical interaction. The probe's own record and the deciding source are
    // read, so the page cannot print a rule the runtime does not hold.
    const keyboard = Option.getOrElse(
      bodyOf(read("button.mdx"), "Keyboard"),
      () => "",
    );
    const decision = readFileSync(
      fileURLToPath(new URL("../src/core/keyboard.ts", import.meta.url)),
      "utf8",
    );
    const painter = readFileSync(
      fileURLToPath(new URL("../src/components/Button.tsx", import.meta.url)),
      "utf8",
    );
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const record = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    const measured = probeRecord(record, "`button-activation-lifecycle`");
    const checks = /(\d+) checks/.exec(measured)?.[1] ?? "";
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const row = Option.getOrElse(
      Arr.findFirst(catalogue.split("\n"), (line) =>
        Str.startsWith("| Buttons | done |")(line),
      ),
      () => "",
    );

    expect({
      registered: registry.includes('id: "button-activation-lifecycle"'),
      recorded:
        Str.isNonEmpty(checks) &&
        measured.includes("last=click") &&
        measured.includes("keyDown:enter") &&
        measured.includes("keyUp:space") &&
        measured.includes("tabIndex: -1") &&
        measured.includes("focusElement"),
      decision:
        decision.includes('ENTER_KEY = "enter"') &&
        decision.includes('SPACE_KEY = "space"') &&
        decision.includes("if (held) return false;") &&
        decision.includes('return phase === "down";') &&
        decision.includes('return phase === "up";'),
      stops: painter.includes("disabled === true ? -1 : 0"),
      page:
        keyboard.includes("`button-activation-lifecycle`") &&
        keyboard.includes(`${checks} checks`) &&
        keyboard.includes("on the **press**") &&
        keyboard.includes("on the **release**") &&
        keyboard.includes("held key is ignored") &&
        keyboard.includes("`tabIndex: -1`") &&
        keyboard.includes("`loading` button") &&
        keyboard.includes("press point") &&
        keyboard.includes("`runtime/controls.runtime.test.tsx`"),
      row: row.includes("`button-activation-lifecycle`"),
    }).toEqual({
      registered: true,
      recorded: true,
      decision: true,
      stops: true,
      page: true,
      row: true,
    });
  });

  it("states the reveal a traversal does not give a scrolled control", () => {
    // The bug guarded: the page taught the keyboard step and said nothing about
    // the control a traversal focuses below the fold — `focus-reveal-lifecycle`
    // measured the offset staying `0`, 200 points of row below the pane — so a
    // consumer planning a long form in a bounded pane had no way to learn that
    // no reveal is coming. The distances are derived from the probe's own
    // geometry, so a moved fixture fails the page rather than agreeing with it.
    const page = read("scroll-area.mdx");
    const keyboard = Option.getOrElse(bodyOf(page, "Keyboard"), () => "");
    const fixture = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/live/focus-reveal.ts", repoRoot),
      ),
      "utf8",
    );
    const registry = readFileSync(
      fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
      "utf8",
    );
    const catalogue = readFileSync(
      fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
      "utf8",
    );
    const pane = /FOCUS_REVEAL_PANE = \{ width: (\d+), height: (\d+) \}/.exec(
      fixture,
    );
    const count = (name: string): number =>
      Number(new RegExp(`${name} = (\\d+);`).exec(fixture)?.[1] ?? Number.NaN);
    const paneWidth = Number(pane?.[1] ?? Number.NaN);
    const paneHeight = Number(pane?.[2] ?? Number.NaN);
    const rows = count("FOCUS_REVEAL_ROWS");
    const row = count("FOCUS_REVEAL_ROW");
    // The last row's start, measured from the pane's bottom edge...
    const below = (rows - 1) * row - paneHeight;
    // ...and the two offsets a reveal can produce: the first row a roving cursor
    // scrolls to, and the content's end.
    const firstReveal = paneHeight - (paneHeight / row + 1) * row;
    const end = -(rows * row - paneHeight);
    const rowOf = (label: string): string =>
      Option.getOrElse(
        Arr.findFirst(catalogue.split("\n"), (line) =>
          Str.startsWith(`| ${label} | done |`)(line),
        ),
        () => "",
      );

    expect({
      registered: registry.includes('id: "focus-reveal-lifecycle"'),
      geometry:
        Number.isFinite(below) && Number.isFinite(firstReveal) && end < 0,
      pane: keyboard.includes(`${paneWidth}×${paneHeight}`),
      listed: keyboard.includes(`nine ${row}px rows`),
      focused: keyboard.includes("focused the ninth row"),
      still: keyboard.includes("offset still `0`"),
      below: keyboard.includes(`${below} points below`),
      roving: keyboard.includes(`\`${firstReveal}\``),
      end: keyboard.includes(`\`${end}\``),
      row: rowOf("Scrollable containers").includes("`focus-reveal-lifecycle`"),
      rowFacts:
        rowOf("Scrollable containers").includes(`${below} points below`) &&
        rowOf("Scrollable containers").includes(`\`${firstReveal}\``),
    }).toEqual({
      registered: true,
      geometry: true,
      pane: true,
      listed: true,
      focused: true,
      still: true,
      below: true,
      roving: true,
      end: true,
      row: true,
      rowFacts: true,
    });
  });
  it("documents the tooltip provider's own props, and no others", () => {
    // The bug guarded: the `### TooltipProvider` table listed `reducedMotion`,
    // which `TooltipProviderProps` does not declare — a caller following the
    // page passed a prop TypeScript rejects. The API guard resolves a page's
    // names against the union of its types, so a row copied from the tip's table
    // into the provider's passed it.
    const api = Option.getOrElse(bodyOf(read("tooltip.mdx"), "API"), () => "");
    const start = api.indexOf("### TooltipProvider");
    const documented = Arr.flatMap(
      Arr.filter((start < 0 ? "" : api.slice(start)).split("\n"), (line) =>
        line.startsWith("|"),
      ),
      rowNames,
    );
    const declared = propsOf("TooltipProviderProps", declaredTypes());

    expect({
      section: start >= 0,
      extra: Arr.filter(documented, (name) => !Arr.contains(declared, name)),
      missing: Arr.filter(declared, (name) => !Arr.contains(documented, name)),
    }).toEqual({ section: true, extra: [], missing: [] });
  });

  it("defaults an animated control's reduced motion from the provider", () => {
    // The bug guarded: every page gave `reducedMotion` the default `false`, and
    // the components read only the prop — so an application that wrapped its
    // tree in the library's one `MotionProvider` still animated every primitive
    // unless it repeated the flag on each instance. The API rows name the
    // provider as the default, the prop as the override; `core/motion.test.ts`
    // holds the sources to the one rule.
    const pages = [
      "button.mdx",
      "icon-button.mdx",
      "progress.mdx",
      "skeleton.mdx",
      "spinner.mdx",
      "switch.mdx",
      "toggle.mdx",
      "tooltip.mdx",
    ];
    const rows = (page: string): ReadonlyArray<string> =>
      Arr.filter(
        read(page).split("\n"),
        (line) =>
          line.startsWith("| `reducedMotion` |") && !line.includes("`—`"),
      );
    expect({
      // Every animated page states the provider's default in its API row.
      stale: Arr.filter(pages, (page) =>
        Arr.some(rows(page), (row) => !row.includes("the motion provider")),
      ),
      // And at least the pages whose controls move name the provider itself.
      named: Arr.filter(
        ["switch.mdx", "tooltip.mdx"],
        (page) => !read(page).includes("`MotionProvider`"),
      ),
    }).toEqual({ stale: [], named: [] });
  });
});

/**
 * The props type each page's API table documents.
 *
 * `documentedProps` checks the direction a page is easy to get wrong one row at
 * a time: a prop a page names must exist. This is the other half — every prop a
 * component **declares** has a row — and it needs to know which type a page
 * speaks for. The name is not derivable from the file name (`otp-field.mdx` is
 * `OTPFieldProps`) and a page may own more than one public type (`Tooltip` and
 * its provider, `ScrollArea` and its viewport), so the contract is written down
 * here. A page absent from this table fails the suite: adding a primitive means
 * naming the type its API documents.
 */
const PAGE_PROPS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "box.mdx": ["BoxProps"],
  "button-group.mdx": ["ButtonGroupProps"],
  "button.mdx": ["ButtonProps"],
  "checkbox-group.mdx": ["CheckboxGroupProps"],
  "checkbox.mdx": ["CheckboxProps"],
  "grid.mdx": ["GridProps"],
  "icon-button.mdx": ["IconButtonProps"],
  "input.mdx": ["InputProps"],
  "label.mdx": ["LabelProps"],
  "meter.mdx": ["MeterProps"],
  "number-field.mdx": ["NumberFieldProps"],
  "otp-field.mdx": ["OTPFieldProps"],
  "progress.mdx": ["ProgressProps"],
  "radio-group.mdx": ["RadioGroupProps"],
  "range-slider.mdx": ["RangeSliderProps"],
  "rating.mdx": ["RatingProps"],
  "scroll-area.mdx": ["ScrollAreaProps", "ScrollAreaViewportProps"],
  "select.mdx": ["SelectProps"],
  "separator.mdx": ["SeparatorProps"],
  "skeleton.mdx": ["SkeletonProps"],
  "slider.mdx": ["SliderProps"],
  "spacer.mdx": ["SpacerProps"],
  "spinner.mdx": ["SpinnerProps"],
  "stack.mdx": ["StackProps"],
  "switch.mdx": ["SwitchProps"],
  "text.mdx": ["TextProps"],
  "textarea.mdx": ["TextAreaProps"],
  "theme-provider.mdx": ["ThemeProviderProps", "MessagesProviderProps"],
  "toggle-group.mdx": ["SingleToggleGroupProps", "MultipleToggleGroupProps"],
  "toggle.mdx": ["ToggleProps"],
  "tooltip.mdx": ["TooltipProps", "TooltipProviderProps"],
};

/**
 * An interface header, however its `extends` list is wrapped.
 *
 * The body is found by brace balance rather than a character class, because a
 * prop's doc comment contains braces of its own.
 */
const INTERFACE_HEADER =
  /(?:^|\n)(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g;

/** A type alias header; its body is taken up to the terminating `;`. */
const TYPE_ALIAS = /(?:^|\n)(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g;

/** `readonly name?:` and `readonly "aria-id"?:`, the shape every prop is written in. */
const PROP_SIGNATURE =
  /(?:readonly\s+|^[ \t]*)(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/gm;

/** The prop names one object type's body declares. */
const signatureNames = (body: string): ReadonlyArray<string> =>
  Arr.filterMap([...body.matchAll(PROP_SIGNATURE)], (match) => {
    const name = match[1] ?? match[2];
    return name === undefined ? Result.failVoid : Result.succeed(name);
  });

/**
 * The text between a `{` and its matching `}`, comments and all.
 *
 * A bracket scan at an index is the one place an index walk says more than a
 * combinator can: it stops at the first balanced close instead of visiting the
 * rest of the file.
 */
const balancedBody = (source: string, open: number): Option.Option<string> => {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return Option.some(source.slice(open + 1, index));
    }
  }
  return Option.none();
};

/** A props type as the source declares it: fields, parents, or an alias body. */
interface DeclaredType {
  readonly props: ReadonlyArray<string>;
  readonly parents: ReadonlyArray<string>;
  readonly alias?: string;
}

/**
 * Every props declaration the package's own source carries, by type name.
 *
 * This is a test-time repository read, the boundary `inventory.test.ts` and
 * `docs.test.ts`'s citation scan already use; the package's runtime source
 * stays on Effect's platform services.
 */
const declaredTypes = (): ReadonlyMap<string, DeclaredType> => {
  const types = new Map<string, DeclaredType>();
  Arr.forEach(
    Arr.filter(
      readdirSync(new URL("./", import.meta.url), {
        recursive: true,
        encoding: "utf8",
      }),
      (name) => /\.tsx?$/.test(name) && !name.includes(".test."),
    ),
    (name) => {
      const source = readFileSync(new URL(name, import.meta.url), "utf8");
      Arr.forEach([...source.matchAll(INTERFACE_HEADER)], (match) => {
        const open = (match.index ?? 0) + match[0].length - 1;
        Option.match(balancedBody(source, open), {
          onNone: () => {},
          onSome: (body) =>
            types.set(match[1] ?? "", {
              props: signatureNames(body),
              parents: Arr.filter(
                Arr.map((match[2] ?? "").split(","), (parent) =>
                  parent.trim().replace(/<[\s\S]*$/, ""),
                ),
                Str.isNonEmpty,
              ),
            }),
        });
      });
      Arr.forEach([...source.matchAll(TYPE_ALIAS)], (match) => {
        const start = (match.index ?? 0) + match[0].length;
        Option.match(aliasBody(source, start), {
          onNone: () => {},
          onSome: (alias) =>
            types.set(match[1] ?? "", { props: [], parents: [], alias }),
        });
      });
    },
  );
  return types;
};

/**
 * An alias body, up to the `;` that ends it at its own level.
 *
 * Only bracketing is tracked: a function type's `=>` would look like the close
 * of a generic to a `<>` counter, and a `;` inside an inline object is behind
 * a `{`. This is the same first-balanced-close scan as {@link balancedBody}.
 */
const aliasBody = (source: string, start: number): Option.Option<string> => {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if ("{([".includes(char)) depth += 1;
    else if ("})]".includes(char)) depth -= 1;
    else if (char === ";" && depth === 0)
      return Option.some(source.slice(start, index));
  }
  return Option.none();
};

/** The members of an intersection or union, split only at its own level. */
const typeParts = (body: string): ReadonlyArray<string> => {
  const opened = HashSet.fromIterable(["{", "(", "["]);
  const closed = HashSet.fromIterable(["}", ")", "]"]);
  const initial: {
    readonly parts: ReadonlyArray<string>;
    readonly current: string;
    readonly depth: number;
  } = { parts: [], current: "", depth: 0 };
  const scanned = Arr.reduce(Arr.fromIterable(body), initial, (state, char) => {
    const depth = HashSet.has(opened, char)
      ? state.depth + 1
      : HashSet.has(closed, char)
        ? state.depth - 1
        : state.depth;
    return state.depth === 0 && (char === "&" || char === "|")
      ? { parts: [...state.parts, state.current], current: "", depth }
      : { parts: state.parts, current: `${state.current}${char}`, depth };
  });
  return Arr.filter(
    Arr.map([...scanned.parts, scanned.current], Str.trim),
    Str.isNonEmpty,
  );
};

/**
 * Every prop a type carries, through `extends`, an alias intersection and
 * `Omit`.
 *
 * A name the package does not declare is the runtime's own surface (`Props`,
 * and what `ActionHostProps` omits it from): its properties are not this
 * package's to document, so it contributes nothing. `seen` keeps a cycle from
 * recursing, and the result is deduplicated by the caller.
 */
const propsOf = (
  name: string,
  types: ReadonlyMap<string, DeclaredType>,
  seen: HashSet.HashSet<string> = HashSet.empty(),
): ReadonlyArray<string> => {
  if (HashSet.has(seen, name)) return [];
  const next = HashSet.add(seen, name);
  const declared = types.get(name);
  if (declared === undefined) return [];
  if (declared.alias === undefined)
    return [
      ...declared.props,
      ...Arr.flatMap(declared.parents, (parent) =>
        propsOf(parent, types, next),
      ),
    ];
  return Arr.flatMap(typeParts(declared.alias), (part) => {
    if (part.startsWith("{")) return signatureNames(part);
    const omit = /^Omit<([\w.]+)\s*,\s*([\s\S]+)>$/.exec(part);
    if (omit !== null) {
      const removed = Arr.map(
        [...(omit[2] ?? "").matchAll(/"([^"]+)"/g)],
        (match) => match[1] ?? "",
      );
      return Arr.filter(
        propsOf(omit[1] ?? "", types, next),
        (prop) => !Arr.contains(removed, prop),
      );
    }
    const named = /^([A-Za-z_]\w*)/.exec(part)?.[1];
    return named === undefined ? [] : propsOf(named, types, next);
  });
};

describe("the primitives API tables", () => {
  it("documents every prop a component declares", () => {
    // Bug guarded: the address surface (`ref`, `aria-id`, `onLayout`) is what a
    // form focuses, an automation host locates and a layout measures, and five
    // pages stopped before it — `textarea`, `number-field`, `otp-field`,
    // `rating` and `slider` — because each page lists the props it remembers.
    // The page contract reads `## API` prop tables only, so an unmapped page or
    // a new prop is reported instead of drifting.
    const types = declaredTypes();
    const pageSet = HashSet.fromIterable(pages);
    const problems = [
      ...Arr.flatMap(R.keys(PAGE_PROPS), (page) =>
        HashSet.has(pageSet, page) ? [] : [`${page}: no such docs page`],
      ),
      ...Arr.flatMap(pages, (page) => {
        const names = PAGE_PROPS[page];
        if (names === undefined) return [`${page}: no props type is mapped`];
        const documented = HashSet.fromIterable(propTableNames(read(page)));
        return Arr.flatMap(names, (name) => {
          const props = propsOf(name, types);
          if (props.length === 0)
            return [`${page}: ${name} declares no prop this suite can read`];
          return Arr.filterMap([...new Set(props)], (prop) =>
            HashSet.has(documented, prop)
              ? Result.failVoid
              : Result.succeed(`${page}: ${name}.${prop} has no API row`),
          );
        });
      }),
    ];

    expect(problems).toEqual([]);
  });

  it("reads a composed props type through extends, an alias and Omit", () => {
    // The reader itself: an interface's own fields and its parents, an alias's
    // intersection, and an `Omit` that must subtract. Measured against the
    // package's real declarations, so a reader that quietly resolves nothing
    // cannot pass by reading no types at all.
    const types = declaredTypes();
    const button = propsOf("ButtonProps", types);
    expect({
      own: Arr.contains(propsOf("TextProps", types), "truncate"),
      parent: Arr.contains(button, "onFocus"),
      alias: Arr.contains(propsOf("TextAreaProps", types), "minRows"),
      omitted: Arr.contains(propsOf("TextAreaProps", types), "onSubmit"),
      // The runtime's own prop surface is opaque here by design.
      runtime: Arr.contains(button, "aria-expanded"),
    }).toEqual({
      own: true,
      parent: true,
      alias: true,
      omitted: false,
      runtime: false,
    });
  });
});

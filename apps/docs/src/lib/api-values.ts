import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

/**
 * The generated index of every runtime value a documented package exports
 * (plan 490). `/docs/api-values` renders it, so a helper such as
 * `checkboxState` or an inventory record such as `tabsMeta` is documented by
 * name instead of only in the source.
 *
 * This module is a **test/script boundary**: it reads the repository with
 * `node:fs`, and the browser bundle never imports it. The page imports
 * `api-values.generated.ts`, whose only reference here is `import type`. Native
 * array helpers are deliberate at this boundary for the same reason
 * `component-meta/registry.ts` uses them: `effect/*` in a non-test module of
 * `apps/docs` would fail `src/architecture.test.ts`.
 */

export type ValueKind =
  | "function"
  | "hook"
  | "class"
  | "constant"
  | "record"
  | "namespace";

export type Visibility = "public" | "internal";

export interface ValueExport {
  readonly name: string;
  readonly package: string;
  readonly kind: ValueKind;
  readonly summary: string;
  readonly source: string;
  readonly visibility: Visibility;
}

export interface PackageEntry {
  readonly package: string;
  readonly entry: string;
}

/**
 * The documented entry points. A subpath is its own entry because
 * `@gpuixui/tokens/react` exports values the package root does not, while
 * `@gpuixui/primitives/core` is the root's decision layer twice — see
 * `EXCLUDED_ENTRIES`.
 */
export const ENTRIES: ReadonlyArray<PackageEntry> = [
  { package: "@gpuixui/tokens", entry: "packages/tokens/src/index.ts" },
  { package: "@gpuixui/tokens/react", entry: "packages/tokens/src/react.ts" },
  {
    package: "@gpuixui/primitives",
    entry: "packages/primitives/src/index.ts",
  },
  {
    package: "@gpuixui/components",
    entry: "packages/components/src/index.ts",
  },
  { package: "@gpuixui/icons", entry: "packages/icons/src/index.ts" },
];

/**
 * Packages a reader could import but this page deliberately does not index.
 * Each reason is shown nowhere else: the guard fails when an exclusion names no
 * real package, so this list cannot rot into a lie.
 */
export const EXCLUDED_ENTRIES: ReadonlyArray<{
  readonly package: string;
  readonly reason: string;
}> = [
  {
    package: "@gpuixui/primitives/core",
    reason:
      "the same objects the package root exports as its decision layer; indexing both would list every helper twice",
  },
  {
    package: "@gpuixui/testing",
    reason:
      "the native smoke harness, built to dist and not a dependency of the docs site; its runs are documented on Contributing",
  },
];

/**
 * Exports that are public only because the package's own modules need them.
 * Keyed by `package#name`; the reason is the contract the badge stands for.
 */
export const INTERNAL_EXPORTS: Readonly<Record<string, string>> = {
  "@gpuixui/components#useFieldsetDisabled":
    "a Fieldset-internal reader so its parts share disabled state; Fieldset is the consumer surface",
};

/**
 * Summaries for exports whose declaration carries no TSDoc. The source is the
 * first place a summary belongs, so this table is only for the exports the
 * package owners have not annotated yet — `indexProblems` fails when one of
 * them gains a doc comment, so the override cannot outlive the gap.
 */
export const SUMMARIES: Readonly<Record<string, string>> = {
  "@gpuixui/primitives#BUTTON_GROUP_MODES":
    "The button-group modes: attached and separated.",
  "@gpuixui/primitives#BUTTON_VARIANTS":
    "The button variant names: primary, secondary, outline, ghost, destructive and link.",
  "@gpuixui/primitives#buttonVariants":
    "The button variant table: each ButtonVariant name mapped to its spec.",
  "@gpuixui/primitives#ENTER_KEY": "The key name GPUix reports for Enter.",
  "@gpuixui/primitives#PROGRESS_TONES":
    "The progress tones: primary, success, destructive and muted.",
  "@gpuixui/primitives#SELECTION_STATES":
    "The paint states a checkbox, radio or switch can be in.",
  "@gpuixui/primitives#SPACE_KEY": "The key name GPUix reports for Space.",
  "@gpuixui/primitives#STACK_DIRECTIONS":
    "The stack directions: row and column.",
  "@gpuixui/primitives#SURFACE_TONES":
    "The surface tones a painted box can use.",
  "@gpuixui/primitives#surfaceStyle":
    "Resolve a surface spec to a GPUix StyleDesc.",
  "@gpuixui/primitives#textStyle":
    "Resolve a text spec to a GPUix StyleDesc at the theme's type ramp.",
  "@gpuixui/primitives#TOGGLE_VARIANTS":
    "The toggle variant names: default and outline.",
};

/** How the page orders kinds inside a package. */
export const KIND_ORDER: ReadonlyArray<ValueKind> = [
  "function",
  "hook",
  "class",
  "constant",
  "record",
  "namespace",
];

const read = (path: string): string => readFileSync(path, "utf8");

const resolveFile = (base: string): string | null => {
  const stem = base.replace(/\.js$/, "");
  const candidates = [
    `${stem}.tsx`,
    `${stem}.ts`,
    `${stem}/index.tsx`,
    `${stem}/index.ts`,
    base,
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
};

const resolveSpecifier = (
  fromFile: string,
  specifier: string,
  root: string,
  entries: ReadonlyArray<PackageEntry>,
): string | null => {
  if (specifier.startsWith(".")) {
    return resolveFile(join(dirname(fromFile), specifier));
  }
  const entry = entries.find((candidate) => candidate.package === specifier);
  return entry === undefined ? null : join(root, entry.entry);
};

/** The `/** … *\/` comment immediately above `at`, or `""`. */
const docBefore = (source: string, at: number): string => {
  const before = source.slice(0, at).trimEnd();
  if (!before.endsWith("*/")) return "";
  const start = before.lastIndexOf("/**");
  return start === -1 ? "" : before.slice(start + 3, -2);
};

/** The first sentence of a TSDoc block, without tags or backticks. */
export const summaryOf = (doc: string): string =>
  doc
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line.length > 0 && !line.startsWith("@"))
    .join(" ")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)[0] ?? "";

type DeclarationKeyword = "const" | "function" | "class";

interface Declaration {
  readonly keyword: DeclarationKeyword;
  readonly at: number;
  readonly text: string;
}

const isKeyword = (value: string): value is DeclarationKeyword =>
  value === "const" || value === "function" || value === "class";

const declaration = (source: string, name: string): Declaration | null => {
  const match = new RegExp(
    `export\\s+(const|function|class)\\s+${name}\\b`,
  ).exec(source);
  const keyword = match?.[1];
  if (match === null || keyword === undefined || !isKeyword(keyword)) {
    return null;
  }
  return {
    keyword,
    at: match.index,
    text: source.slice(match.index, match.index + 400),
  };
};

/** A member of an `export { … }` list: the local name and its public alias. */
interface Member {
  readonly original: string;
  readonly alias: string | null;
}

const members = (list: string): ReadonlyArray<Member> =>
  list.split(",").flatMap((spec) => {
    const [originalRaw, aliasRaw] = spec.trim().split(/\s+as\s+/);
    const original = originalRaw?.trim() ?? "";
    if (original === "" || original.startsWith("type ")) return [];
    const alias = aliasRaw?.trim() ?? null;
    return /^[A-Za-z0-9_]+$/.test(alias ?? original)
      ? [{ original, alias }]
      : [];
  });

const ORIGIN_SEARCH_DEPTH = 8;

/** Where `name` is really declared: through `export *` and re-export aliases. */
const originOf = (
  root: string,
  entries: ReadonlyArray<PackageEntry>,
  file: string,
  name: string,
  depth = ORIGIN_SEARCH_DEPTH,
): { readonly file: string; readonly declaration: Declaration } | null => {
  if (depth === 0) return null;
  const source = read(file);
  const found = declaration(source, name);
  if (found !== null) return { file, declaration: found };
  for (const match of source.matchAll(
    /export\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g,
  )) {
    const target = resolveSpecifier(file, match[2] ?? "", root, entries);
    const member = members(match[1] ?? "").find(
      (candidate) => (candidate.alias ?? candidate.original) === name,
    );
    if (target === null || member === undefined) continue;
    const origin = originOf(root, entries, target, member.original, depth - 1);
    if (origin !== null) return origin;
  }
  for (const match of source.matchAll(/export\s+\*\s+from\s+"([^"]+)"/g)) {
    const target = resolveSpecifier(file, match[1] ?? "", root, entries);
    if (target === null) continue;
    const origin = originOf(root, entries, target, name, depth - 1);
    if (origin !== null) return origin;
  }
  return null;
};

type ParsedKind = ValueKind | "component";

const kindOf = (name: string, found: Declaration | null): ParsedKind => {
  if (/^use[A-Z]/.test(name)) return "hook";
  if (name.endsWith("Meta")) return "record";
  if (/^[A-Z][A-Z0-9_]+$/.test(name)) return "constant";
  if (found === null) return "constant";
  if (found.keyword === "class") return "class";
  if (/^[A-Z]/.test(name)) return "component";
  if (found.keyword === "function") return "function";
  const initializer = found.text.slice(found.text.indexOf("=") + 1);
  return /^\s*(?:async\s*)?\(/.test(initializer) ? "function" : "constant";
};

interface Draft {
  readonly name: string;
  readonly package: string;
  readonly kind: ParsedKind;
  readonly summary: string;
  readonly source: string;
}

const collectFile = (input: {
  readonly root: string;
  readonly entries: ReadonlyArray<PackageEntry>;
  readonly packageName: string;
  readonly file: string;
  readonly seen: Set<string>;
}): ReadonlyArray<Draft> => {
  const { root, entries, packageName, file, seen } = input;
  if (seen.has(file)) return [];
  seen.add(file);
  const source = read(file);
  const drafts: Draft[] = [];

  for (const match of source.matchAll(
    /export\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from\s+"([^"]+)"/g,
  )) {
    drafts.push({
      name: match[1] ?? "",
      package: packageName,
      kind: "namespace",
      summary: summaryOf(docBefore(source, match.index)),
      source: relative(root, file),
    });
  }

  for (const match of source.matchAll(
    /export\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g,
  )) {
    const target = resolveSpecifier(file, match[2] ?? "", root, entries);
    for (const member of members(match[1] ?? "")) {
      const origin =
        target === null
          ? null
          : originOf(root, entries, target, member.original);
      const originSource = origin === null ? "" : read(origin.file);
      drafts.push({
        name: member.alias ?? member.original,
        package: packageName,
        kind: kindOf(
          member.alias ?? member.original,
          origin?.declaration ?? null,
        ),
        summary:
          origin === null
            ? ""
            : summaryOf(docBefore(originSource, origin.declaration.at)),
        source: relative(root, origin?.file ?? target ?? file),
      });
    }
  }

  for (const match of source.matchAll(
    /export\s+(?:const|function|class)\s+([A-Za-z0-9_]+)/g,
  )) {
    const found = declaration(source, match[1] ?? "");
    drafts.push({
      name: match[1] ?? "",
      package: packageName,
      kind: kindOf(match[1] ?? "", found),
      summary: summaryOf(docBefore(source, match.index)),
      source: relative(root, file),
    });
  }

  for (const match of source.matchAll(/export\s+\*\s+from\s+"([^"]+)"/g)) {
    const target = resolveSpecifier(file, match[1] ?? "", root, entries);
    if (target === null) continue;
    drafts.push(
      ...collectFile({ root, entries, packageName, file: target, seen }),
    );
  }

  return drafts;
};

const kindRank = (kind: ValueKind): number => {
  const index = KIND_ORDER.indexOf(kind);
  return index === -1 ? KIND_ORDER.length : index;
};

/**
 * Every value export of the documented entries, in the order the page renders:
 * entry order, then `KIND_ORDER`, then name. A component is not a value — its
 * component page documents it — so it is dropped here.
 */
export const deriveValueExports = (input: {
  readonly root: string;
  readonly entries?: ReadonlyArray<PackageEntry>;
}): ReadonlyArray<ValueExport> => {
  const root = input.root;
  const entries = input.entries ?? ENTRIES;
  const drafts = entries.flatMap((entry) =>
    collectFile({
      root,
      entries,
      packageName: entry.package,
      file: join(root, entry.entry),
      seen: new Set<string>(),
    }),
  );
  return drafts
    .flatMap(
      (draft): ReadonlyArray<ValueExport> =>
        draft.kind === "component"
          ? []
          : [
              {
                name: draft.name,
                package: draft.package,
                kind: draft.kind,
                summary:
                  draft.summary === ""
                    ? (SUMMARIES[`${draft.package}#${draft.name}`] ?? "")
                    : draft.summary,
                source: draft.source,
                visibility:
                  INTERNAL_EXPORTS[`${draft.package}#${draft.name}`] ===
                  undefined
                    ? "public"
                    : "internal",
              },
            ],
    )
    .sort(
      (left, right) =>
        entries.findIndex((entry) => entry.package === left.package) -
          entries.findIndex((entry) => entry.package === right.package) ||
        kindRank(left.kind) - kindRank(right.kind) ||
        left.name.localeCompare(right.name),
    );
};

export const keyOf = (value: ValueExport): string =>
  `${value.package}#${value.name}`;

export interface IndexInput {
  readonly root: string;
  readonly values: ReadonlyArray<ValueExport>;
  readonly generated: ReadonlyArray<ValueExport>;
  /** Test seam: defaults to the shipped policy. */
  readonly entries?: ReadonlyArray<PackageEntry>;
  readonly excluded?: ReadonlyArray<{
    readonly package: string;
    readonly reason: string;
  }>;
  readonly internal?: Readonly<Record<string, string>>;
  readonly summaries?: Readonly<Record<string, string>>;
}

const quotes = (name: string): string => JSON.stringify(name);

/** The `summary` field, wrapped the way `oxfmt` wraps a line over 80 columns. */
const summaryLines = (summary: string): ReadonlyArray<string> => {
  const line = `    summary: ${quotes(summary)},`;
  return line.length <= 80
    ? [line]
    : ["    summary:", `      ${quotes(summary)},`];
};

/**
 * Every way the index can be wrong, as messages that name the export and its
 * file. Empty means the committed module is current, every export is
 * documented, and every classification names something real.
 */
export const indexProblems = ({
  root,
  values,
  generated,
  entries = ENTRIES,
  excluded = EXCLUDED_ENTRIES,
  internal = INTERNAL_EXPORTS,
  summaries = SUMMARIES,
}: IndexInput): ReadonlyArray<string> => {
  const counts = values.reduce<Record<string, number>>((tally, value) => {
    const key = keyOf(value);
    return { ...tally, [key]: (tally[key] ?? 0) + 1 };
  }, {});
  const duplicateProblems = Object.keys(counts).flatMap((key) =>
    (counts[key] ?? 0) > 1 ? [`duplicate export ${key}`] : [],
  );

  const rowProblems = values.flatMap((value) => {
    const key = keyOf(value);
    const problems: string[] = [];
    if (value.summary === "") {
      problems.push(
        `undocumented export ${value.name} (${value.source}) has no doc comment`,
      );
    }
    const path = join(root, value.source);
    if (!existsSync(path)) {
      problems.push(
        `missing source for ${key}: ${value.source} does not exist`,
      );
    }
    const override = summaries[key];
    if (override !== undefined && existsSync(path)) {
      const source = read(path);
      const found = declaration(source, value.name);
      if (found !== null && summaryOf(docBefore(source, found.at)) !== "") {
        problems.push(
          `SUMMARIES overrides ${key}, but ${value.source} now documents it; delete the override`,
        );
      }
    }
    return problems;
  });

  const current = new Set(values.map(keyOf));
  const committed = new Set(generated.map(keyOf));
  const added = [...current].filter((key) => !committed.has(key));
  const removed = [...committed].filter((key) => !current.has(key));
  const staleProblems =
    added.length > 0 ||
    removed.length > 0 ||
    JSON.stringify(values) !== JSON.stringify(generated)
      ? [
          `the generated index is stale; run nub run --filter docs api:values (added: ${added.join(", ") || "none"}; removed: ${removed.join(", ") || "none"})`,
        ]
      : [];

  const policyProblems = [
    ...Object.keys(internal).flatMap((key) =>
      current.has(key)
        ? []
        : [
            `INTERNAL_EXPORTS names ${key}, which no entry exports (a stale classification)`,
          ],
    ),
    ...Object.keys(summaries).flatMap((key) =>
      current.has(key)
        ? []
        : [`SUMMARIES names ${key}, which no entry exports`],
    ),
  ];

  const classified = new Set(
    [
      ...entries.map((entry) => entry.package),
      ...excluded.map((entry) => entry.package),
    ].map((name) => name.split("/").slice(0, 2).join("/")),
  );
  const packagesRoot = join(root, "packages");
  const packageProblems = !existsSync(packagesRoot)
    ? []
    : readdirSync(packagesRoot, { withFileTypes: true })
        .filter(
          (directory) =>
            directory.isDirectory() &&
            existsSync(join(packagesRoot, directory.name, "package.json")) &&
            existsSync(join(packagesRoot, directory.name, "src", "index.ts")),
        )
        .flatMap((directory) =>
          classified.has(`@gpuixui/${directory.name}`)
            ? []
            : [
                `package @gpuixui/${directory.name} is neither indexed in ENTRIES nor excluded in EXCLUDED_ENTRIES`,
              ],
        );

  return [
    ...new Set([
      ...duplicateProblems,
      ...rowProblems,
      ...staleProblems,
      ...policyProblems,
      ...packageProblems,
    ]),
  ].sort((left, right) => left.localeCompare(right));
};

const HEADER = `// Generated by \`nub run --filter docs api:values\` from the packages' real
// entry points (plan 490). Do not edit: \`src/api-values.test.ts\` fails when
// this file is stale.`;

/** The committed module's exact text, so the writer and the guard share it. */
export const renderGeneratedModule = (
  values: ReadonlyArray<ValueExport>,
): string =>
  [
    HEADER,
    'import type { ValueExport } from "./api-values.js";',
    "",
    "export const valueExports: readonly ValueExport[] = [",
    ...values.flatMap((value) => [
      "  {",
      `    name: ${quotes(value.name)},`,
      `    package: ${quotes(value.package)},`,
      `    kind: ${quotes(value.kind)},`,
      ...summaryLines(value.summary),
      `    source: ${quotes(value.source)},`,
      `    visibility: ${quotes(value.visibility)},`,
      "  },",
    ]),
    "];",
    "",
  ].join("\n");

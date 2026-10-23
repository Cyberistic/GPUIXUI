/**
 * The public API contract in `docs/component-api.md`, checked against code.
 *
 * §8 is the parts spec, and §3 is the state vocabulary: `focused` arrives on
 * every focus path, so the six parts that expose it are held to the ring that
 * carries the cue — the flag is presentational, not the cue — and their pages to
 * the measured rule.
 *
 * The bug these guard: §8 is the spec a consumer reads, and §9 claims every
 * shipped Tier 2 component exports the parts its row names — but nothing read
 * the table against the package. A renamed part, or a row promising a part
 * nobody wrote, shipped silently.
 *
 * Both directions are checked: every part a row names is an exported function,
 * and every exported function in a component's family is named by some row. The
 * reverse check uses the row's root part as the family prefix, so a part that
 * shares no prefix with its root (KeyboardShortcuts' `Keycap`) is covered only
 * by the forward direction; the forward direction is exact.
 *
 * The props half reads each Tier 2 page's `## API` against the `*Props`
 * interfaces its own source declares, so a prop added to a type is reported
 * until the page names it. The shape props every part carries (`className`,
 * `children`, `style`, `ref`, `testId`, `aria-id`, `onLayout`) are the
 * package-wide convention in `docs/component-api.md` and are exempt.
 *
 * `node:fs` is a test-time repository read, as in `inventory.test.ts`; no
 * component runtime imports it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";
import { inventory, type ComponentMeta } from "./inventory.js";

const repoRoot = new URL("../../../", import.meta.url);

/** The contract document, read once per test that needs a section of it. */
const contract = (): string =>
  readFileSync(
    fileURLToPath(new URL("docs/component-api.md", repoRoot)),
    "utf8",
  );

/** A `##` section's text, from its heading to the next one. */
const section = (heading: string): string => {
  const markdown = contract();
  const start = markdown.indexOf(heading);
  if (start < 0) return "";
  const next = markdown.indexOf("\n## ", start + heading.length);
  return next < 0 ? markdown.slice(start) : markdown.slice(start, next);
};

/** The Tier 2 table of §8: implemented parts, not the planned shape table. */
const tier2Table = (): string => {
  const tier2 = section("## 8. Parts by component");
  const start = tier2.indexOf("### Tier 2 — composition and feedback");
  const end = tier2.indexOf("**Planned Tier 2 additions**");
  if (start < 0 || end <= start) return "";
  return tier2.slice(start, end);
};

/** One row's component name and the parts it names in backticks. */
const rowOf = (
  line: string,
): Result.Result<
  { readonly name: string; readonly parts: ReadonlyArray<string> },
  void
> => {
  if (!Str.startsWith("|")(line)) return Result.failVoid;
  const cells = Arr.map(line.split("|").slice(1, -1), Str.trim);
  const name = cells[0];
  const partsCell = cells[1];
  if (name === undefined || partsCell === undefined) return Result.failVoid;
  if (name === "" || name === "Component" || Str.startsWith("---")(name)) {
    return Result.failVoid;
  }
  const parts = Arr.map(
    Arr.fromIterable(partsCell.matchAll(/`([A-Z][A-Za-z0-9]*)`/g)),
    (match) => String(match[1]),
  );
  return Result.succeed({ name, parts });
};

const rows: ReadonlyArray<{
  readonly name: string;
  readonly parts: ReadonlyArray<string>;
}> = Arr.filterMap(tier2Table().split("\n"), rowOf);

/** The §8 reservation table: parts fixed before their component lands. */
const plannedTable = (): string => {
  const tier2 = section("## 8. Parts by component");
  const start = tier2.indexOf("**Planned Tier 2 additions**");
  return start < 0 ? "" : tier2.slice(start);
};

const planned: ReadonlyArray<{
  readonly name: string;
  readonly parts: ReadonlyArray<string>;
}> = Arr.filterMap(plannedTable().split("\n"), rowOf);

const partsOf = (name: string): Option.Option<ReadonlyArray<string>> =>
  Option.map(
    Arr.findFirst(rows, (row) => row.name === name),
    (row) => row.parts,
  );

const documented: ReadonlySet<string> = new Set(
  Arr.flatMap(rows, (row) => row.parts),
);

const exports = Arr.fromIterable(Object.entries(api));

const isExportedPart = (name: string): boolean =>
  Arr.some(
    exports,
    ([key, value]) => key === name && typeof value === "function",
  );

/** A top-level part file's source, read from this test's own directory. */
const sourceOf = (file: string): string =>
  readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8");

const partFiles: ReadonlyArray<string> = Arr.filter(
  readdirSync(fileURLToPath(new URL("./", import.meta.url))),
  (name) => Str.endsWith(".tsx")(name) && !Str.endsWith(".test.tsx")(name),
);

/** The page an inventory record points at, read from this suite's own package. */
const pageOf = (docs: string): string =>
  readFileSync(fileURLToPath(new URL(`../${docs}`, import.meta.url)), "utf8");

/** The rule line of a Markdown table, e.g. `| ---- | ---- |`. */
const tableRule = /^\|[\s:|-]*-[\s:|-]*$/;

/** A table row's cells inside a page's `## API` section, header and rule dropped. */
const apiRows = (page: string): ReadonlyArray<ReadonlyArray<string>> => {
  const start = page.indexOf("\n## API\n");
  if (start < 0) return [];
  const end = page.indexOf("\n## ", start + 5);
  const body = end < 0 ? page.slice(start) : page.slice(start, end);
  return Arr.filterMap(body.split("\n"), (line) => {
    if (!Str.startsWith("|")(line) || tableRule.test(line)) {
      return Result.failVoid;
    }
    const cells = Arr.map(line.split(/(?<!\\)\|/).slice(1, -1), Str.trim);
    const first = cells[0] ?? "";
    return first === "Part" || first === "Prop"
      ? Result.failVoid
      : Result.succeed(cells);
  });
};

/** Whether one row documents `part`: its first two cells name it in a code span. */
const rowNamesPart = (cells: ReadonlyArray<string>, part: string): boolean =>
  Arr.some(Arr.take(cells, 2), (cell) => cell.includes(`\`${part}\``));

/**
 * The props every part inherits from the runtime or from this package's own
 * layout convention.
 *
 * A page lists the props a reader decides, and these are the surface every part
 * carries (`ref` addresses, `testId` locates, `onLayout` measures, `style` and
 * `className` paint, `children` composes). They are documented once in
 * `docs/component-api.md`; this contract holds the rest, so a substantive prop
 * added to a part's type is reported until its page names it.
 */
const SHAPE_PROPS: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "className",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

/** An interface header, however its `extends` list is wrapped. */
const INTERFACE_HEADER =
  /(?:^|\n)(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([^{]+))?\s*\{/g;

/** A type alias header; its body is taken up to the terminating `;`. */
const TYPE_ALIAS = /(?:^|\n)(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g;

/** `readonly name?:` and `readonly "aria-id"?:`, the shape a prop is written in. */
const PROP_SIGNATURE =
  /(?:readonly\s+|^[ \t]*)(?:"([^"]+)"|([A-Za-z_][\w-]*))\s*\??:/gm;

/** The prop names one object type's body declares. */
const signatureNames = (body: string): ReadonlyArray<string> =>
  Arr.filterMap(Arr.fromIterable(body.matchAll(PROP_SIGNATURE)), (match) =>
    Result.succeed(match[1] ?? match[2] ?? ""),
  );

/**
 * The text between a `{` and its matching `}`, comments and all.
 *
 * A bracket scan is the one place an index walk says more than a combinator
 * can: it stops at the first balanced close instead of visiting the rest of the
 * file. A prop's doc comment contains braces of its own, which a character
 * class cannot track.
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

/** A type alias body, up to the `;` that ends it at its own level. */
const aliasBody = (source: string, start: number): Option.Option<string> => {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index] ?? "";
    if ("{([".includes(char)) depth += 1;
    else if ("})]".includes(char)) depth -= 1;
    else if (char === ";" && depth === 0) {
      return Option.some(source.slice(start, index));
    }
  }
  return Option.none();
};

/** The members of an intersection or union, split only at its own level. */
const typeParts = (body: string): ReadonlyArray<string> => {
  const opened = "{([";
  const closed = "})]";
  const initial: {
    readonly parts: ReadonlyArray<string>;
    readonly current: string;
    readonly depth: number;
  } = { parts: [], current: "", depth: 0 };
  const scanned = Arr.reduce(Arr.fromIterable(body), initial, (state, char) => {
    const depth = opened.includes(char)
      ? state.depth + 1
      : closed.includes(char)
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

/** A props type as the source declares it: fields, parents, or an alias body. */
interface DeclaredType {
  readonly file: string;
  readonly props: ReadonlyArray<string>;
  readonly parents: ReadonlyArray<string>;
  readonly alias?: string;
}

/** Every source file whose declarations a page's props are read from. */
const sourceFiles: ReadonlyArray<string> = Arr.filter(
  readdirSync(fileURLToPath(new URL("./", import.meta.url)), {
    recursive: true,
    encoding: "utf8",
  }),
  (name) => /\.tsx?$/.test(name) && !name.includes(".test."),
);

/**
 * Every props declaration this package's source carries, by type name.
 *
 * A test-time repository read, the boundary `inventory.test.ts` already uses;
 * `sourceOf` is the same relative read, including the subdirectories a family
 * keeps its logic in.
 */
const declaredTypes = (): ReadonlyMap<string, DeclaredType> => {
  const types = new Map<string, DeclaredType>();
  Arr.forEach(sourceFiles, (file) => {
    const source = sourceOf(file);
    Arr.forEach(
      Arr.fromIterable(source.matchAll(INTERFACE_HEADER)),
      (match) => {
        const open = (match.index ?? 0) + match[0].length - 1;
        Option.match(balancedBody(source, open), {
          onNone: () => undefined,
          onSome: (body) =>
            types.set(match[1] ?? "", {
              file,
              props: signatureNames(body),
              parents: Arr.filter(
                Arr.map((match[2] ?? "").split(","), (parent) =>
                  Str.replace(/<[\s\S]*$/, "")(Str.trim(parent)),
                ),
                Str.isNonEmpty,
              ),
            }),
        });
      },
    );
    Arr.forEach(Arr.fromIterable(source.matchAll(TYPE_ALIAS)), (match) => {
      const start = (match.index ?? 0) + match[0].length;
      Option.match(aliasBody(source, start), {
        onNone: () => undefined,
        onSome: (alias) =>
          types.set(match[1] ?? "", { file, props: [], parents: [], alias }),
      });
    });
  });
  return types;
};

/**
 * Every prop a type carries, through `extends`, an alias intersection, a
 * parenthesised branch of a union, and an `Omit`.
 *
 * A name the package does not declare is the runtime's own surface (`Props` and
 * the floating helpers): its properties are not this package's to document, so
 * it contributes nothing. `seen` keeps a cycle from recursing.
 */
const propsOf = (
  name: string,
  types: ReadonlyMap<string, DeclaredType>,
  seen: ReadonlySet<string> = new Set(),
): ReadonlyArray<string> => {
  if (seen.has(name)) return [];
  const next = new Set([...seen, name]);
  const declared = types.get(name);
  if (declared === undefined) return [];
  if (declared.alias === undefined) {
    return [
      ...declared.props,
      ...Arr.flatMap(declared.parents, (parent) =>
        propsOf(parent, types, next),
      ),
    ];
  }
  return Arr.flatMap(typeParts(declared.alias), (part) =>
    resolvePart(part, types, next),
  );
};

/** One alias member, through a grouping parenthesis, an object, or an `Omit`. */
const resolvePart = (
  part: string,
  types: ReadonlyMap<string, DeclaredType>,
  seen: ReadonlySet<string>,
): ReadonlyArray<string> => {
  if (part.startsWith("(") && part.endsWith(")")) {
    return Arr.flatMap(typeParts(part.slice(1, -1)), (inner) =>
      resolvePart(inner, types, seen),
    );
  }
  if (part.startsWith("{")) return signatureNames(part);
  const omit = /^Omit<([\w.]+)\s*,\s*([\s\S]+)>$/.exec(part);
  if (omit !== null) {
    const removed = Arr.map(
      Arr.fromIterable((omit[2] ?? "").matchAll(/"([^"]+)"/g)),
      (match) => match[1] ?? "",
    );
    return Arr.filter(
      propsOf(omit[1] ?? "", types, seen),
      (prop) => !Arr.contains(removed, prop),
    );
  }
  const named = /^([A-Za-z_]\w*)/.exec(part)?.[1];
  return named === undefined ? [] : propsOf(named, types, seen);
};

/** The identifiers a page's `## API` tables name in code spans. */
const documentedProps = (page: string): ReadonlySet<string> =>
  new Set(
    Arr.flatMap(apiRows(page), (cells) =>
      Arr.filterMap(
        Arr.flatMap(cells, (cell) =>
          Arr.fromIterable(cell.matchAll(/`([^`]+)`/g)),
        ),
        (match) => {
          const name = /^[A-Za-z_][\w-]*/.exec(match[1] ?? "")?.[0];
          return name === undefined ? Result.failVoid : Result.succeed(name);
        },
      ),
    ),
  );

/** The docs page's slug: the source file and directory a record's page owns. */
const slugOf = (meta: ComponentMeta): string =>
  Str.replace(/\.mdx$/, "")(Str.replace(/^docs\//, "")(meta.docs));

/** The `*Props` types the record's own source file or directory declares. */
const pageTypes = (
  meta: ComponentMeta,
  types: ReadonlyMap<string, DeclaredType>,
): ReadonlyArray<string> => {
  const slug = slugOf(meta);
  return Arr.filter(Arr.fromIterable(types.keys()), (name) => {
    const file = types.get(name)?.file ?? "";
    return (
      Str.endsWith("Props")(name) &&
      (file === `${slug}.tsx` || Str.startsWith(`${slug}/`)(file))
    );
  });
};

describe("component API contract", () => {
  it("names the boolean change callback beside the value one", () => {
    const controlled = section("## 2. Controlled and uncontrolled");
    expect(controlled).toContain("onValueChange");
    expect(controlled).toContain("onCheckedChange");
    expect(contract()).toContain(
      "| `.on_checked_change(f)` | `onCheckedChange` |",
    );
  });

  it("has a §8 parts row for every shipped component", () => {
    expect(tier2Table()).not.toBe("");
    const missing = Arr.filter(inventory, (meta) =>
      Option.isNone(partsOf(meta.name)),
    ).map((meta) => meta.name);

    expect(missing).toEqual([]);
  });

  it("exports every part its §8 row names", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(partsOf(meta.name), {
        onNone: () => [`${meta.name}: no §8 parts row`],
        onSome: (parts) =>
          Arr.filter(parts, (part) => !isExportedPart(part)).map(
            (part) =>
              `${meta.name}: §8 names ${part}, which the package does not export`,
          ),
      }),
    );

    expect(problems).toEqual([]);
  });

  it("names every exported part of a family in some §8 row", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(Option.flatMap(partsOf(meta.name), Arr.head), {
        onNone: () => [],
        onSome: (root) =>
          Arr.filter(
            Arr.map(exports, ([name]) => name),
            (name) =>
              Str.startsWith(root)(name) &&
              Str.isNonEmpty(name) &&
              isExportedPart(name) &&
              !documented.has(name),
          ).map((name) => `${meta.name}: exports ${name} with no §8 entry`),
      }),
    );

    expect(problems).toEqual([]);
  });

  it("documents every part its §8 row names on the page it owns", () => {
    // §8 is what the package exports; the page is the API a consumer copies.
    // The dialog page named two of its eight parts, so a reader learned
    // `DialogTrigger`, `DialogClose`, `DialogHeader`, `DialogTitle`,
    // `DialogDescription` and `DialogFooter` existed only by reading the usage
    // snippet — and the alert page named three of seven. A one-part component
    // documents its props directly (the primitives' convention), so the row
    // rule applies to a family with more than one part.
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(partsOf(meta.name), {
        onNone: () => [],
        onSome: (parts) =>
          Arr.length(parts) < 2
            ? []
            : Arr.filter(
                parts,
                (part) =>
                  !Arr.some(apiRows(pageOf(meta.docs)), (cells) =>
                    rowNamesPart(cells, part),
                  ),
              ).map((part) => `${meta.docs}: ${part} has no API row`),
      }),
    );

    expect(problems).toEqual([]);
  });

  it("names no part on a page that its §8 row does not carry", () => {
    // The other direction: a page whose part column names a part the contract
    // dropped (a rename, or a part moved to another family) teaches a symbol
    // the package no longer exports. Only a bare part cell is read, so a
    // prop-only table (`| `List` prop | …`) is left to the page's own contract.
    const barePart = /^`([A-Z][A-Za-z0-9]*)`$/;
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(partsOf(meta.name), {
        onNone: () => [],
        onSome: (parts) =>
          Arr.flatMap(apiRows(pageOf(meta.docs)), (cells) => {
            const name = barePart.exec(cells[0] ?? "")?.[1];
            return name !== undefined &&
              !Arr.some(parts, (part) => part === name)
              ? [`${meta.docs}: ${name} is documented but not in the §8 row`]
              : [];
          }),
      }),
    );

    expect(problems).toEqual([]);
  });

  it("states the focus a traversal does not deliver, and keeps the cue on the ring", () => {
    // A `Tab` traversal focuses an element **without running its `onFocus`**:
    // `tabs-lifecycle` reads `focuses=0` while `focusedId` names the trigger,
    // and `tooltip-lifecycle`'s tip does not open. `blur-delivery-lifecycle`
    // measured the cause — the automation window never becomes active, so no
    // route delivers the pair, while the offscreen host fakes activation and
    // does — and an earlier run read one, so the handler is not a channel to
    // depend on. The ring, declared at rest, is the cue. This holds the spec's
    // sentence and every part that carries the `focused` flag to that rule, so
    // a new part cannot ship `focused` as its only feedback.
    const vocabulary = section("## 3. State-aware styling");

    expect(vocabulary).toContain("without running its `onFocus`");
    expect(vocabulary).toContain("blur-delivery-lifecycle");
    expect(vocabulary).toContain("never becomes active");
    expect(vocabulary).toContain("keyboardRing");

    const flagged = Arr.filter(partFiles, (file) =>
      Str.includes("readonly focused: boolean")(sourceOf(file)),
    );

    // The audit's result: six parts expose the flag today. A seventh must add
    // its name to the sentence above and the ring to its source.
    expect(Arr.length(flagged)).toBe(6);

    const missingRing = Arr.filter(flagged, (file) => {
      const source = sourceOf(file);
      // A part that can be disabled declares `controlRing`, which is the same
      // ring while it can act and none once it cannot.
      return (
        !Str.includes("keyboardRing(")(source) &&
        !Str.includes("controlRing(")(source)
      );
    });

    expect(missingRing).toEqual([]);

    // The pages a reader reads must state the measured rule: the traversal
    // focuses the element without running its handler, and the flag is not the
    // cue.
    const silentPage = Arr.filter(
      flagged,
      (file) =>
        !Str.includes("without running its `onFocus`")(
          sourceOf(`../docs/${Str.replace(/\.tsx$/, ".mdx")(file)}`),
        ),
    );

    expect(silentPage).toEqual([]);
  });

  it("keeps a planned part out of the package until its row lands", () => {
    // The reservation table called Tag / token input, Countdown and Inline
    // edit "not implemented" long after all three shipped, so the spec a
    // consumer reads denied components they could already import. A part in
    // that table must move to its §8 row in the same change that ships it.
    // The table is empty now (Chat and Message were the last reservation,
    // plan 207); the check still runs over any row a later plan reserves.
    const landed = Arr.flatMap(planned, (row) =>
      Arr.filter(row.parts, isExportedPart).map(
        (part) =>
          `${row.name}: §8 plans ${part}, which the package already exports`,
      ),
    );

    expect(landed).toEqual([]);
  });

  it("documents every prop its parts declare", () => {
    // Bug guarded: a page that lists the props it remembers drifts from the
    // type a consumer compiles against. `ChatComposer` shipped `submitLabel`,
    // `stopLabel` and `attachments` — the two words its controls say and the
    // one slot above its field — and `DropdownMenuContent` shipped
    // `alignOffset`, with none of the four named anywhere on their pages. The
    // shape props (`className`, `children`, `style`, `ref`, `testId`,
    // `aria-id`, `onLayout`) are the package-wide convention and are exempt.
    const types = declaredTypes();
    const tier2: ReadonlyArray<ComponentMeta> = Arr.filter(
      inventory,
      (meta) => meta.tier === 2,
    );
    let checked = 0;
    const problems = Arr.flatMap(
      tier2,
      (meta) => {
        const documented = documentedProps(pageOf(meta.docs));
        return Arr.flatMap(pageTypes(meta, types), (name) => {
          const props = Arr.dedupe(propsOf(name, types));
          checked += Arr.length(props);
          return Arr.filter(
            props,
            (prop) => !SHAPE_PROPS.has(prop) && !documented.has(prop),
          ).map((prop) => `${meta.docs}: ${name}.${prop} has no API row`);
        });
      },
    );

    expect(problems).toEqual([]);
    // A reader that resolved nothing would pass vacuously: every Tier 2 page
    // declares its props several times over, so the check counts them.
    expect(checked).toBeGreaterThan(250);
  });

  it("reads a props type through an alias union, a parent and the runtime", () => {
    // The reader itself, measured against the package's real declarations: an
    // alias union of intersections (`ListProps`, `AccordionProps`), a field of
    // an interface that declares it directly, and a runtime alias whose
    // surface this package does not own. A reader that resolved nothing would
    // report every page clean, so this case fails first.
    const types = declaredTypes();

    expect(propsOf("ChatComposerProps", types)).toEqual(
      expect.arrayContaining(["attachments", "submitLabel"]),
    );
    expect(propsOf("AccordionProps", types)).toEqual(
      expect.arrayContaining(["collapsible", "type"]),
    );
    expect(propsOf("ListProps", types)).toEqual(
      expect.arrayContaining(["dense", "onActivate", "selectionMode"]),
    );
    expect(propsOf("PaginationNextProps", types)).toEqual([]);
  });
});

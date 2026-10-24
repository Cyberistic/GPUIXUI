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
 * The props half reads each recorded component page's `## API` against the
 * `*Props` interfaces its own source declares for its **exported** parts, so a
 * prop added to a public type is reported until the page names it while an
 * internal part's own props (a field's loop, not its caller's surface) are not.
 * The shape props every part carries (`className`, `children`, `style`, `ref`,
 * `testId`, `aria-id`, `onLayout`) are the package-wide convention in
 * `docs/component-api.md` and are exempt.
 *
 * `node:fs` is a test-time repository read, as in `inventory.test.ts`; no
 * component runtime imports it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Source } from "@gpuixui/testing";
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
 * The props a page must name, including the surface every part inherits.
 *
 * The shape props (`className`, `children`, `style`, `ref`, `testId`,
 * `aria-id`, `onLayout`) used to be exempt because they are the package-wide
 * convention documented once in `docs/component-api.md` — and that exemption is
 * exactly the gap this contract had: `Card` documented one of its three props
 * and `BreadcrumbLink` none of its three, while every suite stayed green.
 * A reader copies a part's row, so the row says what the part takes; the
 * convention section teaches the meaning of the shared half.
 */

/** The two package trees a components page's props resolve through. */
const packageRoots: ReadonlyArray<Source.PropsRoot> = [
  { pkg: "components", dir: new URL("./", import.meta.url) },
  { pkg: "primitives", dir: new URL("../../primitives/src/", import.meta.url) },
];

/** Every props declaration the two packages carry, read once. */
const types = Source.indexProps(packageRoots);

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
/**
 * The props types one page is held to: the exported parts declared in its own
 * source.
 *
 * An **internal** part is not public API — `Bubbles`' `Bubble`, `Stars`' `Star`
 * and `Gradient`'s `Breath` are the implementation behind the field a caller
 * names, and their `spec`/`ink`/`radius` props are the field's own loop, not
 * something a consumer passes. Holding a page to them would demand it document
 * a type nobody can import. A part this package exports, or one named in the §8
 * parts table, is the surface a reader compiles against.
 */
const pageTypes = (
  meta: ComponentMeta,
  index: Source.PropsIndex,
): ReadonlyArray<string> => {
  const slug = slugOf(meta);
  return Arr.filter(Source.typeNames(index), (name) => {
    const local = Source.declarationIn(name, index, "components");
    const file = Option.match(local, {
      onNone: () => "",
      onSome: (declared) => declared.file,
    });
    return (
      Str.endsWith("Props")(name) &&
      isExportedPart(name.slice(0, -"Props".length)) &&
      Option.isSome(local) &&
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
    // shape props are no longer exempt: the shared `className`/`children`/
    // `style`/`ref`/`testId`/`aria-id`/`onLayout` surface is the half a reader
    // copies most often, and the pages omitted it from Accordion to Field.
    // Every recorded component page is held, the specialised row included:
    // `MultiStepForm` is a Tier 5 component like the Tier 2 ones, and its page
    // was the one place a prop could ship undocumented.
    const recorded: ReadonlyArray<ComponentMeta> = Arr.filter(
      inventory,
      (meta) => meta.tier === 2 || meta.tier === 5,
    );
    let checked = 0;
    const problems = Arr.flatMap(recorded, (meta) => {
      const documented = documentedProps(pageOf(meta.docs));
      return Arr.flatMap(pageTypes(meta, types), (name) => {
        const props = Arr.dedupe(Source.propsOf(name, types));
        checked += Arr.length(props);
        return Arr.filter(props, (prop) => !documented.has(prop)).map(
          (prop) => `${meta.docs}: ${name}.${prop} has no API row`,
        );
      });
    });

    expect(problems).toEqual([]);
    // A reader that resolved nothing would pass vacuously: every Tier 2 page
    // declares its props several times over, and a field inherits the
    // primitives' whole input surface, so the check counts them.
    expect(checked).toBeGreaterThan(250);
  });

  it("reads a props type through an alias union, a parent and the runtime", () => {
    // The reader itself, measured against the package's real declarations: an
    // alias union of intersections (`ListProps`, `AccordionProps`), a field of
    // an interface that declares it directly, and a runtime alias whose
    // surface this package does not own. A reader that resolved nothing would
    // report every page clean, so this case fails first.

    expect(Source.propsOf("ChatComposerProps", types)).toEqual(
      expect.arrayContaining(["attachments", "submitLabel"]),
    );
    expect(Source.propsOf("AccordionProps", types)).toEqual(
      expect.arrayContaining(["collapsible", "type"]),
    );
    expect(Source.propsOf("ListProps", types)).toEqual(
      expect.arrayContaining(["dense", "onActivate", "selectionMode"]),
    );
    expect(Source.propsOf("PaginationNextProps", types)).toEqual([]);
    // The cross-package parent: a field extends the primitives' input surface,
    // so a reader that scans only this package sees three props where the field
    // actually carries twenty-five and every shape row would pass unmeasured.
    expect(Source.propsOf("FieldInputProps", types)).toEqual(
      expect.arrayContaining(["placeholder", "ref", "aria-id", "fullWidth"]),
    );
    expect(Source.propsOf("TagInputFieldProps", types)).toEqual(
      expect.arrayContaining(["placeholder", "onKeyDown", "onLayout"]),
    );
  });
});

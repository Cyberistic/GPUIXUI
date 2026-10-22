/**
 * Plan 600's catalogue against the motion inventory.
 *
 * The bug this guards: plan 600 §2 names 47 animated primitives and §5 requires
 * every one to land with an inventory record — or, where the runtime cannot
 * paint it, to be declined with evidence. Fourteen names had no record a reader
 * of `COMPONENTS.md` could see: eight cannot be painted on
 * `@gpuix/native@0.11.0` (`blur`, `zoom`, `tilt`, `flip-button`, `hole`,
 * `morphing-text`, `click`, `github-stars`) and six resolve to a primitive that
 * already ships (`fade` and `slide` to `Reveal`, `highlight` to `Highlight text`,
 * `icon-button` to the primitives' `IconButton`, `swapping-text` and
 * `scrolling-number` to their two implementations). The declines lived only in
 * `TODO.md` sub-bullets, which the inventory does not render, so the animated
 * table read complete while a reader could not tell a declined entry from work
 * nobody had started.
 *
 * Every catalogue name is placed here — a row, a shipped primitive, or a decline
 * whose reason names the runtime gap — and `COMPONENTS.md`'s recorded entries
 * are held to the same placements, so the plan, the code and the record cannot
 * drift apart.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as R from "effect/Record";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const read = (relative: string): string =>
  readFileSync(join(repoRoot, relative), "utf8");

/** The text between two headings, so a block cannot leak into its neighbour. */
const section = (text: string, from: string, to: string): string => {
  const start = text.indexOf(from);
  const rest = start < 0 ? "" : text.slice(start + from.length);
  const end = rest.indexOf(to);
  if (start < 0 || end < 0) {
    throw new Error(`catalogue: the block ${from} → ${to} was not found`);
  }
  return rest.slice(0, end);
};

/** A catalogue slug: the plan writes every primitive as one backticked token. */
const SLUG = /^[a-z][a-z-]*$/;

/** Every backticked slug in a block, in the order it is written. */
const slugs = (text: string): ReadonlyArray<string> => {
  const parts = Str.split("`")(text);
  return Arr.filterMap(parts, (part, index) =>
    index % 2 === 1 && SLUG.test(part) ? Result.succeed(part) : Result.failVoid,
  );
};

const catalogue = Arr.dedupe(
  slugs(
    section(
      read(".agents/slop/plans/600-animated-primitives.md"),
      "## 2.",
      "## 3.",
    ),
  ),
);

/** Where one catalogue name lives: a row, a shipped primitive, or a decline. */
type Placement =
  | { readonly _tag: "row"; readonly name: string }
  | { readonly _tag: "covered"; readonly by: ReadonlyArray<string> }
  | {
      readonly _tag: "published";
      readonly source: string;
      readonly name: string;
    }
  | { readonly _tag: "declined"; readonly gap: string };

/**
 * The placement of every catalogue name. `row` names an animated table row,
 * `covered` names the rows that already implement the idea, `published` names a
 * primitive another package ships, and `declined` names the gap that makes the
 * effect unrepresentable — the same clause `COMPONENTS.md` records.
 */
const placements: Readonly<Record<string, Placement>> = {
  "splitting-text": { _tag: "row", name: "Splitting text" },
  "typing-text": { _tag: "row", name: "Typing text" },
  "morphing-text": { _tag: "declined", gap: "no `filter`" },
  "rotating-text": { _tag: "row", name: "Rotating text" },
  "swapping-text": { _tag: "covered", by: ["Rolling text", "Sliding text"] },
  "sliding-text": { _tag: "row", name: "Sliding text" },
  "rolling-text": { _tag: "row", name: "Rolling text" },
  "scrolling-number": {
    _tag: "covered",
    by: ["Sliding number", "Counting number"],
  },
  "sliding-number": { _tag: "row", name: "Sliding number" },
  "counting-number": { _tag: "row", name: "Counting number" },
  "gradient-text": { _tag: "row", name: "Gradient text" },
  "highlight-text": { _tag: "row", name: "Highlight text" },
  blur: { _tag: "declined", gap: "no `filter`" },
  fade: { _tag: "covered", by: ["Reveal"] },
  zoom: { _tag: "declined", gap: "no `transform`" },
  slide: { _tag: "covered", by: ["Reveal"] },
  highlight: { _tag: "covered", by: ["Highlight text"] },
  "auto-height": { _tag: "row", name: "Auto height" },
  "scroll-fade": { _tag: "row", name: "Scroll fade" },
  "scroll-progress": { _tag: "row", name: "Scroll progress" },
  magnetic: { _tag: "row", name: "Magnetic" },
  tilt: { _tag: "declined", gap: "no `transform`" },
  click: { _tag: "declined", gap: "measured" },
  "ripple-button": { _tag: "row", name: "Ripple button" },
  "icon-button": {
    _tag: "published",
    source: "packages/primitives/src/components/index.ts",
    name: "IconButton",
  },
  "flip-button": { _tag: "declined", gap: "no `transform`" },
  "liquid-button": { _tag: "row", name: "Liquid button" },
  shine: { _tag: "row", name: "Shine button" },
  "image-zoom": { _tag: "row", name: "Image zoom" },
  "avatar-group": { _tag: "row", name: "Avatar group" },
  "pinned-list": { _tag: "row", name: "Pinned list" },
  "motion-grid": { _tag: "row", name: "Motion grid" },
  particles: { _tag: "row", name: "Particles" },
  bubble: { _tag: "row", name: "Bubbles" },
  fireworks: { _tag: "row", name: "Fireworks" },
  glyph: { _tag: "row", name: "Glyph" },
  gradient: { _tag: "row", name: "Gradient" },
  "gravity-stars": { _tag: "row", name: "Gravity stars" },
  hexagon: { _tag: "row", name: "Hexagon" },
  hole: { _tag: "declined", gap: "two-stop" },
  stars: { _tag: "row", name: "Stars" },
  topography: { _tag: "row", name: "Topography" },
  "code-block": { _tag: "row", name: "Code block" },
  "copy-button": { _tag: "row", name: "Copy button" },
  "page-transition": { _tag: "row", name: "Page transition" },
  "theme-toggler": { _tag: "row", name: "Theme toggler" },
  "github-stars": { _tag: "declined", gap: "out of scope" },
};

/** One table cell, trimmed, or the empty string when the cell is absent. */
const cell = (cells: ReadonlyArray<string>, index: number): string =>
  Option.getOrElse(Arr.get(cells, index), () => "");

interface Row {
  readonly name: string;
  readonly status: string;
}

/** The animated primitives table, parsed from `COMPONENTS.md`. */
const rows = (): ReadonlyArray<Row> => {
  const markdown = read("COMPONENTS.md");
  const heading = "## Animated primitives (plan 600)";
  const start = markdown.indexOf(heading);
  if (start < 0) throw new Error("catalogue: the animated table is gone");
  return Arr.filterMap(Str.split("\n")(markdown.slice(start)), (line) => {
    if (!Str.startsWith("|")(line)) return Result.failVoid;
    const cells = Arr.map(Str.split("|")(line).slice(1, -1), Str.trim);
    const name = cell(cells, 0);
    if (name === "" || name === "Component" || Str.startsWith("---")(name)) {
      return Result.failVoid;
    }
    return Result.succeed({ name, status: cell(cells, 1) });
  });
};

/** One line of `COMPONENTS.md`'s declined-and-covered block. */
interface Recorded {
  readonly slug: string;
  readonly kind: "declined" | "covered";
  readonly tail: string;
}

const ENTRY = /^- `([a-z][a-z-]*)` — \*\*(declined|covered)\*\*(.*)$/;

/** The entries the inventory records, one bullet each. */
const recorded = (): ReadonlyArray<Recorded> =>
  Arr.filterMap(Str.split("\n")(read("COMPONENTS.md")), (line) =>
    Option.match(Str.match(ENTRY)(line), {
      onNone: () => Result.failVoid,
      onSome: (match) =>
        Result.succeed({
          slug: match[1] ?? "",
          kind:
            match[2] === "declined"
              ? ("declined" as const)
              : ("covered" as const),
          tail: match[3] ?? "",
        }),
    }),
  );

const placed = R.toEntries(placements);
const names = (tag: Placement["_tag"]): ReadonlyArray<string> =>
  Arr.sort(
    Arr.filterMap(placed, ([slug, placement]) =>
      placement._tag === tag ? Result.succeed(slug) : Result.failVoid,
    ),
    Order.String,
  );

describe("the plan-600 catalogue", () => {
  it("reads the names the plan lists", () => {
    // A floor rather than the exact count: a new catalogue entry has to be
    // placed below, and a scan that read nothing must not pass by accident.
    expect(catalogue.length).toBeGreaterThan(40);
    expect(Arr.dedupe(catalogue)).toEqual(catalogue);
  });

  it("places every name the plan lists, and no name it does not", () => {
    expect(Arr.sort(R.keys(placements), Order.String)).toEqual(
      Arr.sort(catalogue, Order.String),
    );
  });

  it("names a done animated row for every primitive that ships as one", () => {
    const table = rows();
    const problems = Arr.filterMap(placed, ([slug, placement]) => {
      if (placement._tag !== "row") return Result.failVoid;
      return Option.match(
        Arr.findFirst(table, (candidate) => candidate.name === placement.name),
        {
          onNone: () =>
            Result.succeed(`${slug}: no row named ${placement.name}`),
          onSome: (found) =>
            found.status === "done"
              ? Result.failVoid
              : Result.succeed(`${slug}: ${placement.name} is ${found.status}`),
        },
      );
    });
    expect(problems).toEqual([]);
    // The placements are not vacuous: most of the catalogue ships as a row.
    expect(names("row").length).toBeGreaterThan(30);
  });

  it("covers an entry only with a primitive that ships", () => {
    const table = rows();
    const problems = Arr.flatMap(placed, ([slug, placement]) => {
      if (placement._tag === "published") {
        const exported = `export { ${placement.name}`;
        return Str.includes(exported)(read(placement.source))
          ? []
          : [
              `${slug}: ${placement.name} is not published by ${placement.source}`,
            ];
      }
      if (placement._tag !== "covered") return [];
      return Arr.filterMap(placement.by, (name) =>
        Arr.some(table, (row) => row.name === name && row.status === "done")
          ? Result.failVoid
          : Result.succeed(`${slug}: ${name} is not a done row`),
      );
    });
    expect(problems).toEqual([]);
  });

  it("records every decline and cover in the inventory, with its reason", () => {
    const entries = recorded();
    const expected = Arr.sort(
      [...names("declined"), ...names("covered"), ...names("published")],
      Order.String,
    );
    expect(
      Arr.sort(
        Arr.map(entries, (entry) => entry.slug),
        Order.String,
      ),
    ).toEqual(expected);

    const problems = Arr.filterMap(placed, ([slug, placement]) => {
      if (placement._tag === "row") return Result.failVoid;
      const kind = placement._tag === "declined" ? "declined" : "covered";
      return Option.match(
        Arr.findFirst(
          entries,
          (entry) => entry.slug === slug && entry.kind === kind,
        ),
        {
          onNone: () => Result.succeed(`${slug}: no ${kind} entry`),
          onSome: (entry) => {
            if (placement._tag === "declined") {
              return Str.includes(placement.gap)(entry.tail)
                ? Result.failVoid
                : Result.succeed(
                    `${slug}: the entry does not name ${placement.gap}`,
                  );
            }
            const named =
              placement._tag === "published"
                ? [placement.name, "@gpuixui/primitives"]
                : placement.by;
            const missing = Arr.filter(
              named,
              (name) => !Str.includes(`\`${name}\``)(entry.tail),
            );
            return Arr.isReadonlyArrayEmpty(missing)
              ? Result.failVoid
              : Result.succeed(
                  `${slug}: the entry does not name ${missing.join(", ")}`,
                );
          },
        },
      );
    });
    expect(problems).toEqual([]);
  });

  it("counts what the block records, so a reader is not told a stale total", () => {
    const markdown = read("COMPONENTS.md");
    const block = markdown.slice(
      markdown.indexOf("### Declined and covered catalogue entries"),
    );
    const resolved = names("covered").length + names("published").length;
    expect(
      Str.includes(`lists **${catalogue.length}** primitives`)(block),
    ).toBe(true);
    expect(Str.includes(`${resolved} resolve to a`)(block)).toBe(true);
    expect(
      Str.includes(`${names("declined").length} cannot be painted`)(block),
    ).toBe(true);
  });
});

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

const section = (text: string, from: string, to: string): string => {
  const start = text.indexOf(from);
  const rest = start < 0 ? "" : text.slice(start + from.length);
  const end = rest.indexOf(to);
  if (start < 0 || end < 0) {
    throw new Error(`catalogue: the block ${from} → ${to} was not found`);
  }
  return rest.slice(0, end);
};

const SLUG = /^[a-z][a-z-]*$/;

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

type Placement =
  | { readonly _tag: "row"; readonly name: string }
  | { readonly _tag: "covered"; readonly by: ReadonlyArray<string> }
  | {
      readonly _tag: "published";
      readonly source: string;
      readonly name: string;
    }
  | { readonly _tag: "declined"; readonly gap: string };

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
  "code-block": { _tag: "row", name: "Code block" },
  "copy-button": { _tag: "row", name: "Copy button" },
  "page-transition": { _tag: "row", name: "Page transition" },
  "theme-toggler": { _tag: "row", name: "Theme toggler" },
  "github-stars": { _tag: "declined", gap: "out of scope" },
};

const cell = (cells: ReadonlyArray<string>, index: number): string =>
  Option.getOrElse(Arr.get(cells, index), () => "");

interface Row {
  readonly name: string;
  readonly status: string;
}

const rows = (): ReadonlyArray<Row> => {
  const markdown = read(".agents/slop/COMPONENTS.md");
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

interface Recorded {
  readonly slug: string;
  readonly kind: "declined" | "covered";
  readonly tail: string;
}

const ENTRY = /^- `([a-z][a-z-]*)` — \*\*(declined|covered)\*\*(.*)$/;

const recorded = (): ReadonlyArray<Recorded> =>
  Arr.filterMap(Str.split("\n")(read(".agents/slop/COMPONENTS.md")), (line) =>
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
    const markdown = read(".agents/slop/COMPONENTS.md");
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

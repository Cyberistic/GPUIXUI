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

const contract = (): string =>
  readFileSync(
    fileURLToPath(new URL("docs/component-api.md", repoRoot)),
    "utf8",
  );

const section = (heading: string): string => {
  const markdown = contract();
  const start = markdown.indexOf(heading);
  if (start < 0) return "";
  const next = markdown.indexOf("\n## ", start + heading.length);
  return next < 0 ? markdown.slice(start) : markdown.slice(start, next);
};

const partsTable = (): string => {
  const parts = section("## 8. Parts by component");
  const start = parts.indexOf("### Tier 1 — foundational");
  const end = parts.indexOf("**Planned Tier 2 additions**");
  if (start < 0 || end <= start) return "";
  return parts.slice(start, end);
};

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
}> = Arr.filterMap(partsTable().split("\n"), rowOf);

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

const sourceOf = (file: string): string =>
  readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8");

const partFiles: ReadonlyArray<string> = Arr.filter(
  readdirSync(fileURLToPath(new URL("./", import.meta.url))),
  (name) => Str.endsWith(".tsx")(name) && !Str.endsWith(".test.tsx")(name),
);

const pageOf = (docs: string): string =>
  readFileSync(fileURLToPath(new URL(`../${docs}`, import.meta.url)), "utf8");

const tableRule = /^\|[\s:|-]*-[\s:|-]*$/;

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

const rowNamesPart = (cells: ReadonlyArray<string>, part: string): boolean =>
  Arr.some(Arr.take(cells, 2), (cell) => cell.includes(`\`${part}\``));

const packageRoots: ReadonlyArray<Source.PropsRoot> = [
  { pkg: "components", dir: new URL("./", import.meta.url) },
  { pkg: "primitives", dir: new URL("../../primitives/src/", import.meta.url) },
];

const types = Source.indexProps(packageRoots);

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

const slugOf = (meta: ComponentMeta): string =>
  Str.replace(/\.mdx$/, "")(Str.replace(/^docs\//, "")(meta.docs));

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
    expect(partsTable()).not.toBe("");
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
    const vocabulary = section("## 3. State-aware styling");

    expect(vocabulary).toContain("without running its `onFocus`");
    expect(vocabulary).toContain("blur-delivery-lifecycle");
    expect(vocabulary).toContain("never becomes active");
    expect(vocabulary).toContain("keyboardRing");

    const flagged = Arr.filter(partFiles, (file) =>
      Str.includes("readonly focused: boolean")(sourceOf(file)),
    );

    expect(Arr.length(flagged)).toBe(6);

    const missingRing = Arr.filter(flagged, (file) => {
      const source = sourceOf(file);

      return (
        !Str.includes("keyboardRing(")(source) &&
        !Str.includes("controlRing(")(source)
      );
    });

    expect(missingRing).toEqual([]);
  });

  it("keeps a planned part out of the package until its row lands", () => {
    const landed = Arr.flatMap(planned, (row) =>
      Arr.filter(row.parts, isExportedPart).map(
        (part) =>
          `${row.name}: §8 plans ${part}, which the package already exports`,
      ),
    );

    expect(landed).toEqual([]);
  });

  it("documents every prop its parts declare", () => {
    const recorded: ReadonlyArray<ComponentMeta> = Arr.filter(
      inventory,
      (meta) => meta.tier === 1 || meta.tier === 2 || meta.tier === 5,
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

    expect(checked).toBeGreaterThan(250);
  });

  it("reads a props type through an alias union, a parent and the runtime", () => {
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

    expect(Source.propsOf("FieldInputProps", types)).toEqual(
      expect.arrayContaining(["placeholder", "ref", "aria-id", "fullWidth"]),
    );
    expect(Source.propsOf("TagInputFieldProps", types)).toEqual(
      expect.arrayContaining(["placeholder", "onKeyDown", "onLayout"]),
    );
  });
});

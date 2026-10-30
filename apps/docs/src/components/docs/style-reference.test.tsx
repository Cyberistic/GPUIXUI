import { platformTheme, themes } from "@gpuixui/tokens";
import { classesToStyle, unsupportedReason } from "@gpuixui/tw";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  classGroups,
  refusedClasses,
  resolveClass,
  type ResolvedClass,
} from "../../lib/style-reference";
import { StyleReferenceBody } from "./style-reference";

/**
 * The class reference on `/themes`.
 *
 * The page taught ten representative classes, so a consumer writing a recipe
 * had to read `packages/tw` to learn the other eighty. The table is now
 * compiled: every row is `classesToStyle`'s own answer. This suite holds it in
 * both directions — a class the compiler accepts must be taught (the vocabulary
 * is parsed out of `utilities.ts`), and a class the table teaches must compile
 * (a typo would otherwise render a reason instead of a height) — then holds the
 * painted cells and the platform switch to the theme the page resolves.
 */

const utilities = readFileSync(
  new URL("../../../../../packages/tw/src/utilities.ts", import.meta.url),
  "utf8",
);

/** The literal classes `resolveUtility` names (`name === "border"`). */
const literals = [...utilities.matchAll(/name === "([^"]+)"/g)].flatMap(
  (match) => (match[1] === undefined ? [] : [match[1]]),
);

/** The families it resolves by prefix (`name.startsWith("gap-")`). */
const prefixes = [
  ...utilities.matchAll(/name\.startsWith\("([^"]+)"\)/g),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const documented = classGroups.flatMap((group) => group.classes);

const groupNamed = (name: string): ReadonlyArray<string> => {
  const group = classGroups.find((candidate) => candidate.name === name);
  if (group === undefined) throw new Error(`no group named ${name}`);
  return group.classes;
};

const markupFor = (theme: typeof themes.light): string =>
  renderToStaticMarkup(<StyleReferenceBody theme={theme} />);

/** The second cell of one row, so a printed value is read where it lands. */
const paintedCell = (markup: string, className: string): string | undefined => {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `data-style-class="${escaped}"[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>`,
  ).exec(markup);
  return match?.[1];
};

const expectedCell = (resolved: ResolvedClass): string =>
  resolved._tag === "Refused"
    ? resolved.reason
    : resolved.paints.length === 0
      ? "no property"
      : resolved.paints.join(" · ");

describe("the class reference", () => {
  it("teaches every utility the compiler resolves", () => {
    // Floors, so a parse that stopped matching cannot pass on an empty list.
    expect(literals.length).toBeGreaterThanOrEqual(50);
    expect(prefixes.length).toBeGreaterThanOrEqual(30);

    const missingLiterals = literals.filter(
      (className) => !documented.includes(className),
    );
    const missingFamilies = prefixes.filter(
      (prefix) => !documented.some((className) => className.startsWith(prefix)),
    );

    expect(missingLiterals).toEqual([]);
    expect([...new Set(missingFamilies)]).toEqual([]);
  });

  it("compiles every class it teaches, and refuses every class it does not", () => {
    const light = themes.light;

    const refusedRows = documented.flatMap((className) =>
      resolveClass(light, className)._tag === "Refused" ? [className] : [],
    );
    const paintedRefusals = refusedClasses.flatMap((className) =>
      resolveClass(light, className)._tag === "Painted" ? [className] : [],
    );

    expect(refusedRows).toEqual([]);
    expect(paintedRefusals).toEqual([]);
    // A class in both tables would teach two answers for one name.
    expect(refusedClasses.filter((c) => documented.includes(c))).toEqual([]);
  });

  it("prints the reason the compiler records for a refused class", () => {
    const reasons = refusedClasses.map((className) => ({
      className,
      reason: unsupportedReason(className),
      refused: classesToStyle(className, themes.dark).unsupported,
    }));

    const silent = reasons.filter(
      (row) =>
        row.reason === undefined ||
        row.reason.length === 0 ||
        !row.refused.includes(row.className),
    );

    expect(silent).toEqual([]);
  });

  it("keeps the classes that paint nothing to the group that says so", () => {
    const empty = documented.filter((className) => {
      const resolved = resolveClass(themes.light, className);
      return resolved._tag === "Painted" && resolved.paints.length === 0;
    });

    expect(empty).toEqual([...groupNamed("A class that paints nothing")]);
    // Every other row paints something, so a dropped style is visible.
    expect(documented.length - empty.length).toBeGreaterThanOrEqual(80);
  });

  it("names every class once, in a named group", () => {
    const names = classGroups.map((group) => group.name);

    expect([...new Set(names)]).toEqual(names);
    expect(classGroups.filter((group) => group.classes.length === 0)).toEqual(
      [],
    );
    expect(documented.length).toBe(new Set(documented).size);
  });

  it("prints the value the resolved theme produces", () => {
    const theme = platformTheme(themes.light, "linux");
    const markup = markupFor(theme);

    const printed = documented.map((className) => ({
      className,
      cell: paintedCell(markup, className),
      expected: expectedCell(resolveClass(theme, className)),
    }));

    expect(printed.filter((row) => row.cell !== row.expected)).toEqual([]);
    expect(
      documented.filter((c) => paintedCell(markup, c) === undefined),
    ).toEqual([]);
  });

  it("repaints its cells when the platform switch changes the theme", () => {
    const darwin = platformTheme(themes.light, "darwin");
    const linux = platformTheme(themes.light, "linux");
    const darwinMarkup = markupFor(darwin);
    const linuxMarkup = markupFor(linux);

    const cells = (theme: typeof themes.light, className: string) =>
      paintedCell(markupFor(theme), className);

    // The two platform styles differ in density and radius, so a table frozen
    // at one of them would answer the same number for both.
    expect(cells(darwin, "h-9")).not.toBe(cells(linux, "h-9"));
    expect(cells(darwin, "rounded-lg")).not.toBe(cells(linux, "rounded-lg"));
    expect(cells(darwin, "h-9")).toBe(
      expectedCell(resolveClass(darwin, "h-9")),
    );
    expect(cells(linux, "h-9")).toBe(expectedCell(resolveClass(linux, "h-9")));
    expect(darwinMarkup).not.toBe(linuxMarkup);
  });
});

describe("the theme page", () => {
  const page = readFileSync(
    new URL("../../../content/docs/themes.mdx", import.meta.url),
    "utf8",
  );

  it("mounts the generated reference", () => {
    expect(page).toContain("## The style reference");
    expect(page).toContain("<StyleReference />");
  });
});

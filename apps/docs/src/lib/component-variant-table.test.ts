import { readFileSync, readdirSync } from "node:fs";
import {
  BADGE_BASE,
  BADGE_SIZES,
  BADGE_VARIANTS,
  CARD_BASE,
  CARD_VARIANTS,
  classesToStyle,
} from "@gpuixui/tw";
import {
  alpha,
  colorRoles,
  darkTheme,
  lightTheme,
  type Theme,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/**
 * The variant tables a curated page prints, held to the recipe it documents.
 *
 * Bug guarded: `badge.mdx` and `card.mdx` answered a variant prop with "the
 * table above" while the page printed no variants table at all — the only
 * table under `## API reference` was the prop list, and the prune that removed
 * the old prose took the table with it. A reader was told what a variant
 * changes and could not find it, on two of the pages the mission's template
 * asks to carry the important variants.
 *
 * The tables are now held from both sides: a page states every variant the
 * recipe ships and no other, and each cell is exactly the roles the component's
 * own classes compile to — resolved through `classesToStyle` with the shipped
 * themes, so a paint change moves the page instead of leaving it teaching an
 * old role. The same file refuses a page that points at a table its own section
 * does not print.
 */

const dir = new URL("../../content/docs/components/", import.meta.url);
const page = (name: string): string => readFileSync(new URL(name, dir), "utf8");

type Role = (typeof colorRoles)[number];

/** A role a recipe names, if the name is one the theme carries. */
const role = (name: string): Role | undefined =>
  colorRoles.find((candidate) => candidate === name);

/** `muted-foreground` → `mutedForeground`: a utility's name for a role. */
const camel = (name: string): string =>
  name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

/** The roles one recipe paints, read from the classes the component passes. */
interface Paint {
  readonly fill?: Role;
  readonly ink?: Role;
  readonly edge?: { readonly role: Role; readonly share: number };
  readonly lift?: "sm" | "md" | "lg";
}

/**
 * `border-input` and `border-strong` are the two edges `@gpuixui/tw` names
 * outright rather than resolving from a role.
 *
 * The compiler maps the token, not the utility family: `input` is the fill a
 * field paints, so `bg-input` stays the `input` role while an edge named
 * `input` is the `border` role; `strong` is the picker trigger's stronger edge,
 * a role shadcn has no name for (`packages/tw/src/utilities.ts`).
 */
const edgeRole = (name: string): Role | undefined =>
  name === "input"
    ? role("border")
    : name === "strong"
      ? role("borderStrong")
      : role(camel(name));

const paintOf = (classes: string): Paint =>
  classes.split(/\s+/).reduce<Paint>((paint, utility) => {
    const [head = "", ...rest] = utility.split("-");
    const name = rest.join("-");
    if (rest.length === 0) return paint;
    if (head === "bg") return { ...paint, fill: role(camel(name)) };
    if (head === "text") {
      const named = role(camel(name));
      return named === undefined ? paint : { ...paint, ink: named };
    }
    if (head === "border") {
      const [token = "", share] = name.split("/");
      const named = edgeRole(token);
      return named === undefined
        ? paint
        : {
            ...paint,
            edge: {
              role: named,
              share: share === undefined ? 1 : Number(share) / 100,
            },
          };
    }
    if (head === "shadow" && (name === "sm" || name === "md" || name === "lg"))
      return { ...paint, lift: name };
    return paint;
  }, {});

/** The cells of one Markdown table row. */
const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

/** The table under one `###` heading, as a header and its rows. */
const tableUnder = (
  body: string,
  heading: string,
): {
  readonly header: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
} => {
  const start = body.indexOf(`### ${heading}`);
  expect(start, `no ### ${heading}`).toBeGreaterThan(-1);
  const after = body.slice(start + heading.length);
  const end = after.search(/\n#{2,3} /);
  const section = end === -1 ? after : after.slice(0, end);
  const lines = section.split("\n").filter((line) => line.startsWith("|"));
  expect(lines.length, `${heading} prints no table`).toBeGreaterThan(2);
  const [header = "", , ...rows] = lines;
  return { header: cells(header), rows: rows.map(cells) };
};

/** The paint the shipped themes give one recipe, and the roles it names. */
const paintsIn = (theme: Theme, classes: string) => {
  const style = classesToStyle(classes, theme).style;
  const paint = paintOf(classes);
  if (paint.fill !== undefined)
    expect(style.backgroundColor, `${paint.fill} fill`).toBe(
      theme.colors[paint.fill],
    );
  if (paint.ink !== undefined)
    expect(style.color, `${paint.ink} ink`).toBe(theme.colors[paint.ink]);
  if (paint.edge !== undefined) {
    expect(style.borderWidth).toBe(1);
    const colour = theme.colors[paint.edge.role];
    expect(style.borderColor).toBe(
      paint.edge.share === 1 ? colour : alpha(colour, paint.edge.share),
    );
  }
  if (paint.lift !== undefined)
    expect([style.boxShadow]).toEqual(theme.elevation[paint.lift]);
  return { style, paint };
};

/** The cell a variant with no role to name prints. */
const none = "none";

/** The edge cell a soft tone prints: the solid role at the share it is mixed. */
const edgeCell = (edge: Paint["edge"]): string =>
  edge === undefined
    ? none
    : edge.share === 1
      ? `\`${edge.role}\``
      : `\`${edge.role}\` at ${Math.round(edge.share * 100)}%`;

const themes = [
  ["light", lightTheme],
  ["dark", darkTheme],
] as const;

describe("the badge page's variant table", () => {
  it("lists every variant the recipe ships, and the roles it paints", () => {
    const table = tableUnder(page("badge.mdx"), "Variants");
    expect(table.header).toEqual(["Variant", "Fill", "Ink", "Edge"]);

    for (const [mode, theme] of themes) {
      const expected = Object.entries(BADGE_VARIANTS).map(
        ([variant, classes]) => {
          const { paint } = paintsIn(theme, `${BADGE_BASE} ${classes}`);
          return [
            `\`${variant}\``,
            paint.fill === undefined ? none : `\`${paint.fill}\``,
            paint.ink === undefined ? none : `\`${paint.ink}\``,
            edgeCell(paint.edge),
          ];
        },
      );

      expect(table.rows, mode).toEqual(expected);
    }
  });

  it("teaches the two size steps the recipe compiles", () => {
    const table = tableUnder(page("badge.mdx"), "Sizes");
    expect(table.header).toEqual(["Size", "Type", "Pill height"]);

    for (const [mode, theme] of themes) {
      const expected = Object.entries(BADGE_SIZES).map(([size, classes]) => {
        const { style } = paintsIn(theme, `${BADGE_BASE} ${classes}`);
        const height =
          (style.paddingTop ?? 0) +
          (style.paddingBottom ?? 0) +
          (style.lineHeight ?? 0);
        return [
          `\`${size}\``,
          `${style.fontSize}/${style.lineHeight}, weight ${style.fontWeight ?? 400}`,
          `${height}px`,
        ];
      });

      expect(table.rows, mode).toEqual(expected);
    }
  });
});

describe("the card page's treatment table", () => {
  it("lists every treatment the recipe ships, and the paint it carries", () => {
    const table = tableUnder(page("card.mdx"), "Treatments");
    expect(table.header).toEqual(["Treatment", "Edge", "Lift"]);

    for (const [mode, theme] of themes) {
      const expected = Object.entries(CARD_VARIANTS).map(
        ([treatment, classes]) => {
          const { paint } = paintsIn(theme, `${CARD_BASE} ${classes}`);
          expect(paint.fill, `${mode} ${treatment} fill`).toBe("card");
          return [
            `\`${treatment}\``,
            paint.edge === undefined ? none : `1px ${edgeCell(paint.edge)}`,
            paint.lift === undefined ? none : `\`elevation.${paint.lift}\``,
          ];
        },
      );

      expect(table.rows, mode).toEqual(expected);
    }
  });

  it("states the shared surface and the token its edge is spelled as", () => {
    // The note is the only place a reader learns that `border-input` is
    // compiled to the `border` role — the mistake the package page made before
    // it was corrected — and that a card's corner is fixed rather than the
    // platform's.
    const body = page("card.mdx");
    const start = body.indexOf("### Treatments");
    const end = body.indexOf("\n## ", start + 1);
    const note = body.slice(start, end === -1 ? undefined : end);
    const { style } = paintsIn(
      lightTheme,
      `${CARD_BASE} ${CARD_VARIANTS.outline}`,
    );

    expect(note).toContain(`${style.borderRadius}px`);
    expect(note).toContain("`card`");
    expect(note).toContain("border-input");
    expect(note).toContain("`border`");
  });
});

describe("the component page template", () => {
  it("points only at a table the section prints", () => {
    // The two pages above were the only writers of the phrase, and both were
    // wrong; the rule is general so a third page cannot repeat it.
    const pages = readdirSync(dir).filter(
      (name) => name.endsWith(".mdx") && name !== "index.mdx",
    );

    const dangling = pages.flatMap((name) => {
      const body = page(name);
      const sections = body.split(/^## /m).slice(1);
      return sections.flatMap((section) => {
        const lines = section.split("\n");
        const heading = lines[0]?.trim() ?? "";
        return lines.flatMap((line, index) => {
          const found = /the table (above|below)/i.exec(line);
          if (found === null) return [];
          const direction = found[1];
          // A row of the table it prints in is not the table it points at: the
          // prop row that writes the phrase must not satisfy its own reference,
          // so the scan starts after the table the phrase sits in.
          const boundary = lines
            .slice(0, index + 1)
            .findLastIndex((candidate) => !candidate.startsWith("|"));
          const start = boundary + 1;
          const after = lines.findIndex(
            (candidate, position) =>
              position > index && !candidate.startsWith("|"),
          );
          const end = after === -1 ? lines.length : after;
          const printed = (
            direction === "above" ? lines.slice(0, start) : lines.slice(end)
          ).some((candidate) => candidate.startsWith("|"));
          return printed
            ? []
            : [`${name}: ## ${heading} points at a table it does not print`];
        });
      });
    });

    expect(dangling).toEqual([]);
  });
});

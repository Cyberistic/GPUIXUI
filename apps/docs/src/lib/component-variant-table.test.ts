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

const dir = new URL("../../content/docs/components/", import.meta.url);
const page = (name: string): string => readFileSync(new URL(name, dir), "utf8");

type Role = (typeof colorRoles)[number];

const role = (name: string): Role | undefined =>
  colorRoles.find((candidate) => candidate === name);

const camel = (name: string): string =>
  name.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());

interface Paint {
  readonly fill?: Role;
  readonly ink?: Role;
  readonly edge?: { readonly role: Role; readonly share: number };
  readonly lift?: "sm" | "md" | "lg";
}

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

const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const tableUnder = (
  body: string,
  heading: string,
): {
  readonly header: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
} => {
  const start = body.search(new RegExp(`^\\*\\*${heading}\\*\\*$`, "m"));
  expect(start, `no **${heading}**`).toBeGreaterThan(-1);
  const lines = body.slice(start).split("\n");
  const first = lines.findIndex((line) => line.startsWith("|"));
  expect(first, `${heading} prints no table`).toBeGreaterThan(-1);
  const fromFirst = lines.slice(first);
  const afterTable = fromFirst.findIndex((line) => !line.startsWith("|"));
  const table = afterTable === -1 ? fromFirst : fromFirst.slice(0, afterTable);
  expect(table.length, `${heading} prints no rows`).toBeGreaterThan(2);
  const [header = "", , ...rows] = table;
  return { header: cells(header), rows: rows.map(cells) };
};

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

const none = "none";

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
    const body = page("card.mdx");
    const start = body.search(/^\*\*Treatments\*\*$/m);
    expect(start).toBeGreaterThan(-1);
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

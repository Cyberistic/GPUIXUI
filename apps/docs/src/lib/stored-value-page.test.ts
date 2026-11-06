import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

interface StoredValue {
  readonly page: string;

  readonly prop: string;

  readonly source: string;

  readonly reader: string;
}

const badge = "packages/components/src/badge.tsx";
const card = "packages/components/src/card.tsx";
const drawer = "packages/components/src/drawer.tsx";
const dialog = "packages/components/src/dialog.tsx";
const mentionMenu = "packages/components/src/menu/item.tsx";
const placement = "packages/components/src/internal/placement.ts";
const tabs = "packages/components/src/tabs/logic.ts";
const stepper = "packages/components/src/stepper/logic.ts";
const alertTone = "packages/components/src/internal/theme.ts";
const colourHex = "packages/components/src/color-picker/logic.ts";
const tagLogic = "packages/components/src/tag-input/logic.ts";
const comboboxLogic = "packages/components/src/combobox/logic.ts";
const commandLogic = "packages/components/src/menu/fuzzy.ts";
const accordionLogic = "packages/components/src/accordion/logic.ts";

const storedValues: ReadonlyArray<StoredValue> = [
  { page: "badge.mdx", prop: "variant", source: badge, reader: "variantOf" },
  { page: "badge.mdx", prop: "size", source: badge, reader: "sizeOf" },
  { page: "card.mdx", prop: "variant", source: card, reader: "variantOf" },
  { page: "drawer.mdx", prop: "side", source: drawer, reader: "drawerSide" },
  { page: "drawer.mdx", prop: "size", source: drawer, reader: "drawerSize" },
  { page: "dialog.mdx", prop: "size", source: dialog, reader: "dialogSize" },
  { page: "popover.mdx", prop: "side", source: placement, reader: "sideOf" },
  {
    page: "popover.mdx",
    prop: "align",

    source: "packages/components/src/popover.tsx",
    reader: "popoverAlign",
  },
  {
    page: "combobox.mdx",
    prop: "side",
    source: placement,
    reader: "sideOf",
  },
  {
    page: "combobox.mdx",
    prop: "align",
    source: placement,
    reader: "alignOf",
  },
  {
    page: "dropdown-menu.mdx",
    prop: "side",
    source: placement,
    reader: "sideOf",
  },
  {
    page: "dropdown-menu.mdx",
    prop: "align",
    source: placement,
    reader: "alignOf",
  },
  { page: "alert.mdx", prop: "tone", source: alertTone, reader: "toneOf" },
  {
    page: "tabs.mdx",
    prop: "orientation",
    source: tabs,
    reader: "orientationOf",
  },
  {
    page: "tabs.mdx",
    prop: "activation",
    source: tabs,
    reader: "activationOf",
  },
  {
    page: "stepper.mdx",
    prop: "orientation",
    source: stepper,
    reader: "orientationOf",
  },
  {
    page: "dropdown-menu.mdx",
    prop: "tone",
    source: mentionMenu,
    reader: "menuToneOf",
  },
  {
    page: "context-menu.mdx",
    prop: "tone",
    source: mentionMenu,
    reader: "menuToneOf",
  },
];

const pageText = (name: string): string =>
  read(`apps/docs/content/docs/components/${name}`);

const fallbackOf = (source: string, reader: string): string | undefined => {
  const start = new RegExp(`const ${reader} =`).exec(source);
  if (start === null) return undefined;
  const body = source.slice(start.index, start.index + 400);
  return /\? \w+ : "([a-z]+)"/.exec(body)?.[1];
};

interface StoredBoundary {
  readonly page: string;

  readonly prop: string;

  readonly source: string;

  readonly reader: string;

  readonly fallback: string;

  readonly clause: string;
}

const boundaries: ReadonlyArray<StoredBoundary> = [
  {
    page: "color-picker.mdx",
    prop: "value",
    source: colourHex,
    reader: "storedDraft",
    fallback: "Option.none()",
    clause: "a stored value that is not text means uncontrolled",
  },
  {
    page: "color-picker.mdx",
    prop: "defaultValue",
    source: colourHex,
    reader: "storedDraft",
    fallback: "Option.none()",
    clause: "a stored default that is not text",
  },
  {
    page: "color-picker.mdx",
    prop: "swatches",
    source: colourHex,
    reader: "storedSwatches",
    fallback: "Option.none()",
    clause: "a stored value that is not a list paints the theme's defaults",
  },
  {
    page: "tag-input.mdx",
    prop: "value",
    source: tagLogic,
    reader: "tokensOf",
    fallback: "[]",
    clause: "a stored value that is not a list carries no tokens",
  },
  {
    page: "combobox.mdx",
    prop: "options",
    source: comboboxLogic,
    reader: "optionsOf",
    fallback: "[]",
    clause: "a stored value that is not a list paints no rows",
  },
  {
    page: "combobox.mdx",
    prop: "value",
    source: comboboxLogic,
    reader: "selectionOf",
    fallback: "Option.none()",
    clause: "a stored value that is neither text nor a list means uncontrolled",
  },
  {
    page: "command-menu.mdx",
    prop: "actions",
    source: commandLogic,
    reader: "commandListOf",
    fallback: "[]",
    clause: "a stored value that is not a list paints the empty state",
  },
  {
    page: "command-menu.mdx",
    prop: "recents",
    source: commandLogic,
    reader: "recentIdsOf",
    fallback: "[]",
    clause: "a stored value that is not a list carries no recents",
  },
  {
    page: "accordion.mdx",
    prop: "value",
    source: accordionLogic,
    reader: "openSectionsOf",
    fallback: "Option.none()",
    clause: "a stored open set that is not a list means uncontrolled",
  },
  {
    page: "accordion.mdx",
    prop: "defaultValue",
    source: accordionLogic,
    reader: "openSectionsOf",
    fallback: "Option.none()",
    clause: "a stored default that is not a list opens no sections",
  },
];

const branchOf = (source: string, reader: string): string | undefined => {
  const start = new RegExp(`export const ${reader} =`).exec(source);
  if (start === null) return undefined;

  const rest = source.slice(start.index + 1);
  const end = rest.search(/\nexport const /);
  const body = end === -1 ? rest : rest.slice(0, end);
  return [...body.matchAll(/:\s*(\[\]|Option\.none\(\))/g)].at(-1)?.[1];
};

const rowOf = (text: string, prop: string): string | undefined =>
  text
    .split("\n")
    .find((line) =>
      new RegExp(`^\\| (?:[^|]+ \\| )?\`${prop}\` \\|`).test(line),
    );

const apiLineOf = (text: string, prop: string): string | undefined => {
  const start = text.indexOf("## API reference");
  if (start === -1) return undefined;
  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ");
  return (end === -1 ? rest : rest.slice(0, end))
    .split("\n")
    .find((line) => line.startsWith("|") && line.includes(`\`${prop}\``));
};

describe("a value a store kept", () => {
  it("reads each default from the guard the component runs", () => {
    expect(
      storedValues.flatMap((value) =>
        fallbackOf(read(value.source), value.reader) === undefined
          ? [`${value.source}: ${value.reader}`]
          : [],
      ),
    ).toEqual([]);

    expect(
      new Set(
        storedValues.map((value) =>
          fallbackOf(read(value.source), value.reader),
        ),
      ).size,
    ).toBeGreaterThanOrEqual(5);
  });

  it("teaches the answer in the served page's own prop row", () => {
    expect(
      storedValues.flatMap((value) => {
        const row = rowOf(pageText(value.page), value.prop);
        const fallback = fallbackOf(read(value.source), value.reader);
        if (row === undefined)
          return [`${value.page}: no \`${value.prop}\` row`];
        if (fallback === undefined) return [`${value.page}: ${value.prop}`];

        const gaps: Array<string> = [];
        if (!row.includes(`\`"${fallback}"\``)) gaps.push(fallback);
        if (!/stored name the union does not carry/.test(row))
          gaps.push("rule");
        return gaps.map((gap) => `${value.page}: ${value.prop} — ${gap}`);
      }),
    ).toEqual([]);
  });
});

describe("a list a store kept", () => {
  it("teaches the boundary each picker reads a saved value at", () => {
    const policy = read("docs/preview-strategy.md");

    expect(
      boundaries.flatMap((boundary) => {
        const branch = branchOf(read(boundary.source), boundary.reader);
        const page = pageText(boundary.page);
        const row =
          rowOf(page, boundary.prop) ?? apiLineOf(page, boundary.prop);
        const gaps: Array<string> = [];
        if (branch !== boundary.fallback)
          gaps.push(`the reader answers ${String(branch)}`);
        if (row === undefined) gaps.push("no row");
        else if (!row.includes(boundary.clause)) gaps.push(boundary.clause);
        return gaps.map((gap) => `${boundary.page}: ${boundary.prop} — ${gap}`);
      }),
    ).toEqual([]);

    expect(new Set(boundaries.map((boundary) => boundary.clause)).size).toBe(
      boundaries.length,
    );
    expect(policy.replace(/\s+/g, " ")).toContain(
      "prints the answer a restored value gets",
    );
  });

  it("prints the colour a stored default falls back to", () => {
    const colour = /const DEFAULT_COLOUR = "([^"]+)"/.exec(
      read(colourHex),
    )?.[1];
    expect(colour).not.toBeUndefined();
    expect(typeof colour).toBe("string");

    const row = rowOf(pageText("color-picker.mdx"), "defaultValue") ?? "";
    expect(
      colour === undefined || row.includes(`\`"${colour}"\``)
        ? []
        : [`defaultValue — ${colour}`],
    ).toEqual([]);
  });
});

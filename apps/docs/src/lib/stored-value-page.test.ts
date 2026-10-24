import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The value a store kept, on the pages the site serves.
 *
 * A variant, size, tone, axis, edge or activation is stored with the workspace
 * as often as it is a literal, so it arrives as a name a later release renamed
 * or dropped. Every one of these components reads the stored value through a guard
 * (`Schema.is(...) ? value : "<default>"`) because the raw table read painted
 * the wrong thing: a badge with no ink, a card with no boundary, a tab set laid
 * out vertical, a menu row that threw out of its matcher.
 *
 * The components workstream measured each fallback and documented it on the
 * **package** page, and the site's curated page owns the same URL for all of
 * them, so the package files are shadowed and never served. This guard derives
 * each default from the guard function itself and holds the served page's own
 * prop row to it, so a page cannot teach a union without the answer a restored
 * value gets.
 */

const repo = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, repo), "utf8");

/** One prop whose stored value the component reads through a guard. */
interface StoredValue {
  /** The curated page the site serves. */
  readonly page: string;
  /** The prop as the page's table names it. */
  readonly prop: string;
  /** The module the guard lives in. */
  readonly source: string;
  /** The guard function's name. */
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
const colourPicker = "packages/components/src/color-picker.tsx";
const colourHex = "packages/components/src/color/hex.ts";
const tagLogic = "packages/components/src/tag-input/logic.ts";
const comboboxLogic = "packages/components/src/combobox/logic.ts";

const storedValues: ReadonlyArray<StoredValue> = [
  { page: "badge.mdx", prop: "variant", source: badge, reader: "variantOf" },
  { page: "badge.mdx", prop: "size", source: badge, reader: "sizeOf" },
  { page: "card.mdx", prop: "variant", source: card, reader: "variantOf" },
  { page: "drawer.mdx", prop: "side", source: drawer, reader: "drawerSide" },
  { page: "drawer.mdx", prop: "size", source: drawer, reader: "drawerSize" },
  { page: "dialog.mdx", prop: "size", source: dialog, reader: "dialogSize" },
  { page: "popover.mdx", prop: "side", source: placement, reader: "sideOf" },
  { page: "popover.mdx", prop: "align", source: placement, reader: "alignOf" },
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

/** The default a guard answers for a name it does not carry. */
const fallbackOf = (source: string, reader: string): string | undefined => {
  const start = new RegExp(`const ${reader} =`).exec(source);
  if (start === null) return undefined;
  const body = source.slice(start.index, start.index + 400);
  return /\? \w+ : "([a-z]+)"/.exec(body)?.[1];
};

/** One prop whose stored value a reader answers with a whole list or absence. */
interface StoredBoundary {
  /** The curated page the site serves. */
  readonly page: string;
  /** The prop as the page's table names it. */
  readonly prop: string;
  /** The module that owns the reader. */
  readonly source: string;
  /** The reader function's name. */
  readonly reader: string;
  /** The branch the reader answers when the stored value is not the shape. */
  readonly fallback: string;
  /** The clause the served page's row must carry beside the prop. */
  readonly clause: string;
}

/**
 * The pickers read a stored palette, token list or selection through a reader
 * that answers a list or an absence, so the page's row has to say what that
 * absence paints. `optionsOf` and `tokensOf` drop every entry that is not the
 * right shape and answer `[]`; `storedSwatches`, `storedDraft` and
 * `selectionOf` answer `Option.none()`, which the caller turns into the theme's
 * defaults, the documented colour or an uncontrolled control.
 */
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
];

/** The fallback a boundary reader answers with, read out of its own branch. */
const branchOf = (source: string, reader: string): string | undefined => {
  const start = new RegExp(`export const ${reader} =`).exec(source);
  if (start === null) return undefined;
  // The reader's own declaration only: a sibling's absence is not its answer.
  const rest = source.slice(start.index + 1);
  const end = rest.search(/\nexport const /);
  const body = end === -1 ? rest : rest.slice(0, end);
  return [...body.matchAll(/:\s*(\[\]|Option\.none\(\))/g)].at(-1)?.[1];
};

/** The table row that documents a prop, from its name cell. */
const rowOf = (text: string, prop: string): string | undefined =>
  text
    .split("\n")
    .find((line) =>
      new RegExp(`^\\| (?:[^|]+ \\| )?\`${prop}\` \\|`).test(line),
    );

describe("a value a store kept", () => {
  it("reads each default from the guard the component runs", () => {
    expect(
      storedValues.flatMap((value) =>
        fallbackOf(read(value.source), value.reader) === undefined
          ? [`${value.source}: ${value.reader}`]
          : [],
      ),
    ).toEqual([]);

    // The fallbacks are not one word: a modal card keeps its edge, a badge its
    // ink, a tab set its horizontal axis and a menu row its default emphasis.
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

  it("answers a stored side with its edge, not with the size's absence", () => {
    // Bug guarded: the served Drawer page merged the two guards into one
    // sentence — a `size` the union does not name "paints the house `md` box
    // instead of an `undefined` side" — so a reader storing a dropped `side`
    // was told the component leaves an edge undefined, when `drawerSide` reads
    // it as the house `right` edge the box, layout and entry travel all use.
    const page = pageText("drawer.mdx").replace(/\s+/g, " ");

    expect(page).not.toContain("an `undefined` side");
    expect(page).toContain("A `side` restored from storage");
    expect(page).toContain("house `right` edge");
    expect(page).toContain("house `md` box");
  });
});

/**
 * The list a store kept.
 *
 * A palette, a token list, a picker's rows and its selection are saved with the
 * workspace as often as they are literals, so a record's `null` reaches the
 * component. Each picker reads the saved value at its boundary and answers a
 * list or an absence; the curated page owns the URL, so the package page that
 * documents the answer is never served. This case derives each reader's own
 * fallback branch and holds the served page's row to the clause that says what
 * it paints.
 */
describe("a list a store kept", () => {
  it("teaches the boundary each picker reads a saved value at", () => {
    const policy = read("docs/preview-strategy.md");
    const page = (name: string): string =>
      read(`apps/docs/content/docs/components/${name}`);

    expect(
      boundaries.flatMap((boundary) => {
        const branch = branchOf(read(boundary.source), boundary.reader);
        const row = rowOf(page(boundary.page), boundary.prop);
        const gaps: Array<string> = [];
        if (branch !== boundary.fallback)
          gaps.push(`the reader answers ${String(branch)}`);
        if (row === undefined) gaps.push("no row");
        else if (!row.includes(boundary.clause)) gaps.push(boundary.clause);
        return gaps.map((gap) => `${boundary.page}: ${boundary.prop} — ${gap}`);
      }),
    ).toEqual([]);

    // Six boundaries, six clauses: a page cannot pass by printing one sentence
    // six times, and the list cannot shrink without the table losing a row.
    expect(new Set(boundaries.map((boundary) => boundary.clause)).size).toBe(
      boundaries.length,
    );
    expect(policy.replace(/\s+/g, " ")).toContain(
      "prints the answer a restored value gets",
    );
  });

  it("prints the colour a stored default falls back to", () => {
    // The default a stored `defaultValue` cannot answer with is not prose: the
    // picker's own constant is the colour, so the page's cell must print it.
    const colour = /const DEFAULT_COLOUR = "([^"]+)"/.exec(
      read(colourPicker),
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

/**
 * Guards the defect plan 838 fixes: `themeEdit` writes the `{ base, overrides }`
 * pair the catalogue, the design system and the README all tell a consumer to
 * store, but its only load path was a cast — `JSON.parse(...) as ThemeEdit`. A
 * cast is not a check, and `extendTheme` spreads only what it is given, so a
 * stored override it cannot merge is dropped in silence: `{ spacing: "8" }`
 * contributes no entries, a typo'd `{ colour: { … } }` is never read, and
 * `{ spacing: { md: "8" } }` reaches the theme as a string that no check
 * reports — `numericMembers` measures numbers, and `positive` reads
 * `Math.fround("8") === NaN` and stays silent. The settings screen restores a
 * theme missing the user's edit while `themeFailures` returns `[]`.
 *
 * `themeEditFromRow(value)` is the boundary: the base narrows through
 * `themeChoiceFromRow`, each override group and member is held to the kind
 * `ThemeOverrides` declares and to the ordered index that owns it, and an
 * artifact the merge would misread is refused with `undefined`. Values stay the
 * ten checks' job, which case 4 pins in both directions.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyThemeEdit,
  extendTheme,
  getTheme,
  lightElevation,
  shippedThemes,
  themeChoiceFromRow,
  themeEdit,
  themeEditFromRow,
  themeFailures,
  elevationShapeFields,
  type ShippedTheme,
  type Theme,
  type ThemeChoice,
  type ThemeEdit,
  type ThemeOverrides,
} from "./index.js";

/** The stored pair, failing the test where the artifact cannot express it. */
const editOf = (choice: ThemeChoice, edited: Theme): ThemeEdit => {
  const edit = themeEdit(choice, edited);
  if (edit === undefined) {
    throw new Error(`themeEdit returned undefined for ${edited.name}`);
  }
  return edit;
};

/** A decoded pair, failing the test where the decoder refuses a legal edit. */
const decodedOf = (row: unknown): ThemeEdit => {
  const decoded = themeEditFromRow(row);
  if (decoded === undefined) {
    throw new Error(`themeEditFromRow refused ${JSON.stringify(row)}`);
  }
  return decoded;
};

/** The choice a shipped set came from, so `themeEdit` measures its own base. */
const choiceOf = (entry: ShippedTheme): ThemeChoice => {
  const { mode, contrast } = entry.theme;
  if (entry.source === "platform") {
    return { mode, contrast, platform: entry.platform };
  }
  if (entry.source === "recipe") {
    return { mode, contrast, recipe: entry.recipe };
  }
  return { mode, contrast };
};

/** The storage boundary: what a settings screen writes and reads back. */
const persist = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe("a stored edit decodes at its boundary", () => {
  it("decodes and replays every shipped set's edit through JSON", () => {
    expect(shippedThemes).toHaveLength(24);
    shippedThemes.forEach((entry) => {
      const edited = extendTheme(entry.theme, { radius: { md: 8 } });
      const stored = editOf(choiceOf(entry), edited);
      const decoded = decodedOf(persist(stored));

      expect(decoded).toEqual(stored);
      expect(applyThemeEdit(decoded)).toEqual(edited);
    });
  });

  it("accepts every group the artifact can carry", () => {
    const base = getTheme("light");
    const overrides: ThemeOverrides = {
      name: "Acme light",
      contrast: "high",
      colors: { primary: "#5B4BD6" },
      typography: { sans: "Inter", body: { fontSize: 15 } },
      spacing: { md: 10 },
      radius: { md: 8 },
      density: { preset: "compact", controlHeight: { md: 30 }, rowHeight: 28 },
      dimensions: { overlayWidth: 240 },
      elevation: {
        overlay: [
          {
            offsetX: 0,
            offsetY: 12,
            blurRadius: 24,
            spreadRadius: 0,
            alpha: 0.2,
          },
        ],
      },
      motion: { normal: 220, ease: { enter: [0.4, 0, 0.2, 1] } },
      borderWidth: { strong: 3 },
      iconSize: { md: 18 },
      avatarSize: { sm: 22 },
    };

    const decoded = decodedOf(persist({ base: { mode: "light" }, overrides }));
    expect(decoded.overrides).toEqual(overrides);
    expect(applyThemeEdit(decoded)).toEqual(extendTheme(base, overrides));
  });

  it("refuses every group or member the merge would drop", () => {
    const plants: ReadonlyArray<unknown> = [
      { spacing: "8" },
      { spacing: 42 },
      { colour: { primary: "#000000" } },
      { spacing: { huge: 8 } },
      { colors: { primary: 42 } },
      { colors: { nope: "#000000" } },
      { typography: { body: { fontSize: "14px" } } },
      { typography: { body: 14 } },
      { typography: { sans: 42 } },
      { density: "tiny" },
      { density: { controlHeight: { xl: 40 } } },
      { density: { rowHeight: "28px" } },
      { elevation: { sm: 42 } },
      {
        elevation: {
          sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0 }],
        },
      },
      { elevation: { huge: [] } },
      { motion: { fast: "120ms" } },
      { motion: { ease: { enter: [0.4, 0, 0.2] } } },
      { motion: { ease: { enter: 42 } } },
      { motion: { ease: { swoosh: "ease" } } },
      { name: 42 },
      { contrast: "max" },
      { iconSize: { md: "16px" } },
    ];

    plants.forEach((overrides) => {
      expect(
        themeEditFromRow({ base: { mode: "light" }, overrides }),
        JSON.stringify(overrides),
      ).toBeUndefined();
    });
  });

  it("leaves values to the checks it already ships", () => {
    const width = decodedOf({
      base: { mode: "light" },
      overrides: { borderWidth: { strong: 0 } },
    });
    const ink = decodedOf({
      base: { mode: "light" },
      overrides: { colors: { primary: "#12345" } },
    });

    expect(
      themeFailures(applyThemeEdit(width)).map(({ kind }) => kind),
    ).toContain("metric");
    expect(
      themeFailures(applyThemeEdit(ink)).map(({ kind }) => kind),
    ).toContain("color");
  });

  it("opens an absent artifact and refuses what is not one", () => {
    const empty = decodedOf({});
    expect(empty.base).toEqual(themeChoiceFromRow({}));
    expect(empty.overrides).toEqual({});
    expect(applyThemeEdit(empty)).toEqual(getTheme("light"));

    const versioned = decodedOf({ base: {}, overrides: {}, version: 2 });
    expect(versioned.base).toEqual(themeChoiceFromRow({}));

    [null, undefined, "null", 42, [], () => {}].forEach((value) => {
      expect(themeEditFromRow(value), JSON.stringify(value)).toBeUndefined();
    });
  });

  it("states the decoder and its rule in the documents", () => {
    const read = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8").replace(/\s+/g, " ");
    const catalogue = read("../../../docs/tokens.md");
    const designSystem = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const ledger = read("../../../COMPONENTS.md");

    [catalogue, designSystem, readme, ledger].forEach((document) => {
      expect(document).toContain("themeEditFromRow");
    });
    expect(catalogue).toContain("`themeChoiceFromRow`");
    expect(catalogue).toContain("is refused with `undefined`");
    expect(readme).toContain("refuses a group the merge would drop");

    const [resting] = lightElevation.sm;
    expect(resting === undefined ? [] : Object.keys(resting)).toEqual([
      ...elevationShapeFields,
    ]);
  });
});

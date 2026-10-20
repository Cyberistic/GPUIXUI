import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generator } from "@/lib/type-table-generator";
import { stylingSearchEntry } from "./styling-search";
import { installedNativeDeclarations } from "./native-declarations.testing";
import { search } from "./search";
import {
  absentStylingConcepts,
  familiesOf,
  familyOf,
  styleFieldFamilies,
  styleFieldNames,
  styleFieldViolations,
  styleFields,
  stylingPageViolations,
} from "./styling";
import { typeTableTargets } from "./type-tables";

/**
 * Guards plan 606. The bug: the docs never said the runtime has no CSS, so a
 * React reader's first move (`className`) returned nothing at all, and `style`,
 * `css`, `sx`, `media query` and `pseudo class` reached an unrelated page
 * (measured 2026-10-20 at `f84d20fa`), while six `StyleDesc` field names could
 * not be found because generated type-table rows are dropped from search
 * (plan 479).
 *
 * The page's supported surface is rendered by `fumadocs-typescript` from the
 * installed `@gpuix/native` declarations, so the interesting failures are
 * drift: a field the catalogue does not classify, a family whose anchor the
 * runtime removed, or a concept the page calls absent that the runtime now
 * provides. Each of those fails here by name, in both directions.
 */
const appDirectory = fileURLToPath(new URL("../../", import.meta.url));
const page = readFileSync(
  join(appDirectory, "content/docs/styling.mdx"),
  "utf8",
);
const declarations = installedNativeDeclarations().join("\n");

const fixture = `/** A surface. */
export interface StyleDesc {
  display?: string;
  /** Not a field of this interface: the brace below ends the body. */
  hover?: Omit<StyleDesc, "hover" | "active">;
  width?: DimensionValue;
}
export interface Other {
  onClick?: () => void;
}`;

describe("the style field parser", () => {
  it("reads name and type from StyleDesc only, skipping comments", () => {
    expect(styleFields(fixture)).toEqual([
      { name: "display", type: "string" },
      { name: "hover", type: 'Omit<StyleDesc, "hover" | "active">' },
      { name: "width", type: "DimensionValue" },
    ]);
  });

  it("returns nothing when the interface is missing", () => {
    expect(styleFields("export interface Props { style?: string }")).toEqual(
      [],
    );
  });
});

describe("the installed style surface", () => {
  it("matches the authored catalogue in both directions", () => {
    expect(
      styleFieldViolations({
        declarations,
        names: styleFieldNames,
        families: styleFieldFamilies,
        absent: absentStylingConcepts,
      }),
    ).toEqual([]);
  });

  it("declares the surface the page renders", () => {
    expect(styleFieldNames.length).toBeGreaterThanOrEqual(70);
    expect(styleFieldNames).toEqual(
      styleFields(declarations).map((field) => field.name),
    );
  });

  it("classifies every field into exactly one family", () => {
    expect(
      styleFieldNames
        .filter((name) => familiesOf(name).length !== 1)
        .map(
          (name) => `${name} belongs to ${familiesOf(name).length} families`,
        ),
    ).toEqual([]);
    expect(styleFieldFamilies.map((family) => family.title)).toContain(
      familyOf("flexDirection")?.title,
    );
  });

  it("reports a catalogue that drifts from the runtime", () => {
    const run = (input: {
      names?: ReadonlyArray<string>;
      families?: typeof styleFieldFamilies;
      absent?: typeof absentStylingConcepts;
    }) =>
      styleFieldViolations({
        declarations,
        names: input.names ?? styleFieldNames,
        families: input.families ?? styleFieldFamilies,
        absent: input.absent ?? absentStylingConcepts,
      });

    expect(
      run({ names: styleFieldNames.filter((name) => name !== "lineClamp") }),
    ).toContain(
      "lineClamp is declared by StyleDesc but the catalogue omits it",
    );
    expect(run({ names: [...styleFieldNames, "gridGap"] })).toContain(
      "gridGap is catalogued but StyleDesc does not declare it",
    );
    expect(
      run({
        families: styleFieldFamilies.map((family) =>
          family.anchor === "pointerEvents"
            ? { ...family, anchor: "focusVisible" }
            : family,
        ),
      }),
    ).toContain("focusVisible anchors Interaction but is not a field");
    expect(
      run({
        families: styleFieldFamilies.map((family) =>
          family.title === "Spacing" ? { ...family, title: " " } : family,
        ),
      }),
    ).toContain("padding anchors a family with no title");
    expect(
      run({
        absent: [
          ...absentStylingConcepts,
          {
            concept: "A cursor keyword",
            replacement: "None.",
            wouldBeFields: ["cursor"],
          },
        ],
      }),
    ).toContain(
      "A cursor keyword is claimed absent, but StyleDesc declares cursor",
    );
    expect(
      run({
        absent: [
          ...absentStylingConcepts,
          { concept: "A shadow stack", replacement: " ", wouldBeFields: [] },
        ],
      }),
    ).toContain("A shadow stack has no replacement");
  });
});

describe("the styling page", () => {
  it("names every family, anchor and absent concept", () => {
    expect(
      stylingPageViolations({
        mdx: page,
        families: styleFieldFamilies,
        absent: absentStylingConcepts,
      }),
    ).toEqual([]);
  });

  it("renders the real StyleDesc table from the installed declarations", async () => {
    const targets = typeTableTargets(page);
    expect(targets.map((target) => target.name)).toContain("StyleDesc");
    const target = targets.find((entry) => entry.name === "StyleDesc");
    const path = resolve(appDirectory, "content/docs", target?.path ?? "");
    const entries = (
      await generator.generateDocumentation({ path }, "StyleDesc")
    ).flatMap((document) => document.entries);
    expect(entries.length).toBe(styleFieldNames.length);
  });

  it("fails when the page loses a claim or a table", () => {
    expect(
      stylingPageViolations({
        mdx: page.replace("<AbsentStylingConcepts />", ""),
        families: styleFieldFamilies,
        absent: absentStylingConcepts,
      }),
    ).toContain("the page does not render <AbsentStylingConcepts />");
    expect(
      stylingPageViolations({
        mdx: page.replace(/<auto-type-table[^>]*StyleDesc[^>]*>/, ""),
        families: styleFieldFamilies,
        absent: absentStylingConcepts,
      }),
    ).toContain("the page has no <auto-type-table> for StyleDesc");
    expect(
      stylingPageViolations({
        mdx: page.replace("Layout and flow", "Layout"),
        families: styleFieldFamilies,
        absent: absentStylingConcepts,
      }),
    ).toContain("the page does not name the Layout and flow family");
  });
});

describe("the style fields in search", () => {
  it("promotes distinctive field names and keeps the type fields as prose", () => {
    expect(
      stylingSearchEntry.names.filter((name) => !/[A-Z]/.test(name)),
    ).toEqual([]);
    expect(stylingSearchEntry.names).toContain("pointerEvents");
    expect(stylingSearchEntry.names).not.toContain("gap");
    expect(stylingSearchEntry.names).not.toContain("fontSize");
    expect(stylingSearchEntry.index.content).toContain("fontSize");
  });

  it("reaches the styling page for the words a reader brings", async () => {
    const queries = [
      "className",
      "tailwind",
      "css",
      "sx",
      "style prop",
      "media query",
      "pointerEvents",
      "lineClamp",
      "rowGap",
      "selectionColor",
      "textOverflow",
      "gridTemplateColumns",
      "borderWidth",
    ];
    const results = await Promise.all(
      queries.map(async (query) => ({
        query,
        first: (await search(query, 3))[0],
      })),
    );
    expect(
      results
        .filter(
          (result) => !(result.first?.url ?? "").startsWith("/docs/styling"),
        )
        .map((result) => `${result.query} → ${result.first?.url ?? "(none)"}`),
    ).toEqual([]);
  }, 120_000);

  it("states the letter-spacing absence its search phrase promises", async () => {
    const row = absentStylingConcepts.find((concept) =>
      concept.wouldBeFields.includes("letterSpacing"),
    );
    expect(row?.concept).toBe("Letter spacing and tracking");
    const [first] = await search("letter spacing");
    expect(first?.url).toBe("/docs/styling");
  }, 120_000);

  it("does not take a word another page owns", async () => {
    const queries: ReadonlyArray<[string, string]> = [
      ["spacing", "/docs/theming"],
      ["font size", "/docs/typography"],
      ["font family", "/docs/typography"],
      ["table", "/docs/data-display"],
      ["panel", "/docs/workspace"],
      ["aria", "/docs/accessibility"],
      ["theme switch", "/docs/dark-mode"],
      ["radius.md", "/docs/theming#scales-and-control-metrics"],
    ];
    const results = await Promise.all(
      queries.map(async ([query, expected]) => ({
        query,
        expected,
        first: (await search(query, 3))[0]?.url,
      })),
    );
    expect(
      results
        .filter((result) => result.first !== result.expected)
        .map((result) => `${result.query} → ${result.first ?? "(none)"}`),
    ).toEqual([]);
  }, 120_000);
});

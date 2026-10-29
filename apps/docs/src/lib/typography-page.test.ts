import { readFileSync } from "node:fs";
import { TEXT_TONES } from "@gpuixui/primitives/core";
import {
  densityPresets,
  platformNames,
  platformStyles,
  systemUiFont,
  typography,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/**
 * `/typography` is the page the mission's information architecture names
 * for type, and it carried a false limitation: "**No heading semantics**:
 * `role="h2"` paints the style, not a heading node." `Text` publishes
 * `role="heading"` with the role's own level for `h1`/`h2`/`h3` and `code` for
 * `code`/`codeBlock`, which the primitives' own `text.mdx` teaches and its
 * `docs.test.ts` holds to `renderText` — so the site told a reader the opposite
 * of what a screen reader hears. The page also hand-typed its mono roles, the
 * platform mono faces and the tone list, the drift this repository holds to a
 * derivation everywhere else.
 *
 * Everything here is read from the source that decides it: the theme for the
 * roles, `Text`'s `semanticsOf` table for what a role publishes, the two
 * `MONO_ROLES` declarations for the mono family, `platformStyles` for the
 * faces, and `TEXT_TONES` for the tones. The reads are synchronous because this
 * is a test boundary, like the site's other Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/typography.mdx");

/** The body of one `##` heading, up to the next one. */
const section = (heading: string): string => {
  const start = page.indexOf(`## ${heading}`);
  if (start < 0) return "";
  const rest = page.slice(start + heading.length + 3);
  const end = rest.search(/^## /m);
  return end < 0 ? rest : rest.slice(0, end);
};

/** Backticked words in a passage, in the order they are written. */
const backticked = (passage: string): ReadonlyArray<string> =>
  [...passage.matchAll(/`([^`]+)`/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

const roles = Object.keys(typography).filter(
  (key) => key !== "sans" && key !== "mono",
);

/** The mono roles a declaration names, read from the array it writes. */
const declaredMonoRoles = (path: string): ReadonlyArray<string> => {
  const source = read(path);
  const block =
    /const MONO_ROLES: ReadonlyArray<TextRole> = \[([^\]]*)\]/.exec(
      source,
    )?.[1] ?? "";
  return [...block.matchAll(/"(\w+)"/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const monoDeclarations = [
  "packages/primitives/src/core/style.ts",
  "packages/primitives/src/recipe/index.ts",
];

/**
 * The roles `Text` publishes semantics for, read from `semanticsOf`: a heading
 * role carries its level, and the code roles carry `code`.
 */
const publishedRoles = (() => {
  const source = read("packages/primitives/src/components/Text.tsx");
  const block = source.slice(
    source.indexOf("const semanticsOf = ("),
    source.indexOf("/** The element `Text` renders."),
  );
  const headings = [
    ...block.matchAll(
      /role === "(h[123])"\s*\?\s*\{ role: "heading", level: (\d+) \}/g,
    ),
  ].flatMap((match) =>
    match[1] === undefined || match[2] === undefined
      ? []
      : [{ role: match[1], semantics: "heading", level: Number(match[2]) }],
  );
  const codes =
    /role === "code" \|\| role === "codeBlock"\s*\?\s*\{ role: "code" \}/.test(
      block,
    )
      ? [
          { role: "code", semantics: "code", level: undefined },
          { role: "codeBlock", semantics: "code", level: undefined },
        ]
      : [];
  return [...headings, ...codes];
})();

describe("the typography page", () => {
  it("counts the roles the theme carries", () => {
    // The description's word and the theme's roles ship together: a role added
    // to `Typography` fails here until the sentence and this count move.
    expect(roles).toHaveLength(10);
    expect(page).toContain("The ten type roles");
  });

  it("names the roles the mono family paints", () => {
    const declared = monoDeclarations.map(declaredMonoRoles);

    // Two declarations paint the mono family — the resolver and the class
    // recipe — and a page can only teach one list, so they must agree.
    expect(declared[1]).toEqual(declared[0]);

    const named = backticked(section("Families")).filter((word) =>
      roles.includes(word),
    );
    expect(named).toEqual(declared[0]);
  });

  it("names the mono face every platform style resolves", () => {
    const families = section("Families");

    // A platform naming its own UI face would make the page's sentinel
    // sentence false, so the table and the styles are read together.
    expect(platformNames.map((name) => platformStyles[name].sans)).toEqual(
      platformNames.map(() => systemUiFont),
    );
    expect(families).toContain(`\`${systemUiFont}\``);

    const missing = platformNames.flatMap((name) => {
      const style = platformStyles[name];
      const row = `| ${style.label} | \`${style.mono}\` |`;
      return families.includes(row) ? [] : [row];
    });
    expect(missing).toEqual([]);
  });

  it("publishes exactly the semantics the runtime gives each role", () => {
    // The limitation this page used to print: headings paint type only.
    expect(page).not.toContain("not a heading node");

    // The parse is the table itself: a heading role carries its own level and
    // the two code roles carry `code`.
    expect(
      publishedRoles.map(
        (entry) => `${entry.role}:${entry.level ?? entry.semantics}`,
      ),
    ).toEqual(["h1:1", "h2:2", "h3:3", "code:code", "codeBlock:code"]);

    const semantics = section("Semantics");
    const named = backticked(semantics).filter((word) => roles.includes(word));

    expect(named).toEqual(publishedRoles.map((entry) => entry.role));
    // The level is the fact a reader needs, not just the word "heading".
    expect(semantics).toContain("publish `heading` with their own level");
    expect(semantics).toContain("publish the code");
    expect(semantics).toContain("paragraph, list or");
  });

  it("lists the tones `Text` accepts and none it does not", () => {
    const tones = backticked(section("Tones")).filter(
      (word) => word !== "Text",
    );

    expect(tones).toEqual([...TEXT_TONES]);
  });

  it("keeps density out of the type scale", () => {
    // The page's sentence is only true while a preset carries no type step.
    const presetKeys = Object.keys(densityPresets.comfortable);

    expect(presetKeys.filter((key) => roles.includes(key))).toEqual([]);
    expect(presetKeys).not.toContain("fontSize");
    expect(section("Families")).toContain("Density never changes type sizes");
  });
});

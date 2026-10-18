import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  missingPartSources,
  missingSections,
  sectionsFor,
} from "./component-meta/contract";
import { components } from "./component-meta/registry";

/**
 * Guards the component-page template (plan 411 §4, `MISSION.md` "Every
 * component page"). Nothing else reads a page's body: a finished component
 * whose page omits the status block, the preview or a required section still
 * builds, still sits in the sidebar and still passes `registry.test.ts`, so the
 * omission is invisible until a reader notices there is no API table.
 *
 * The heading check alone was not enough: a page could keep `## Usage`,
 * `## API reference` and `## Source` and lose the `tsx` example, the
 * `<auto-type-table>` and the `<include>` under them, and still pass — the
 * section rendered empty while the template guard stayed green. The last test
 * reads the blocks a page must keep, not only the headings it must have.
 *
 * The template itself lives in `apps/docs/README.md`; the first test makes the
 * README and this list agree, the second makes every finished component's page
 * follow it. A compound or workspace record owes extra sections (plan 427),
 * so the required list is a function of the record's `pattern`.
 */

const pageDirectory = fileURLToPath(
  new URL("../content/docs/components/", import.meta.url),
);
const readme = fileURLToPath(new URL("../README.md", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const patterns = ["static", "stateful", "workspace"] as const;

/** Every section any pattern can require, in first-documented order. */
const documentedSections = [
  ...new Set(patterns.flatMap((pattern) => sectionsFor(pattern))),
];

const headings = (document: string): ReadonlyArray<string> =>
  document
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice("## ".length).trim());

/** The body under one `## ` heading, up to the next heading. */
const sectionBody = (document: string, name: string): string => {
  const start = document.indexOf(`## ${name}`);
  if (start < 0) return "";
  const rest = document.slice(start + name.length + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};

/** The simple `key: value` frontmatter every component page uses. */
const frontmatter = (document: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    (document.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "")
      .split("\n")
      .flatMap((line) => {
        const field = line.match(/^([a-zA-Z]+):\s*(.*)$/);
        return field === null ? [] : [[field[1] ?? "", field[2] ?? ""]];
      }),
  );

describe("component page template", () => {
  it("documents every section any pattern can require", () => {
    const documented = headings(readFileSync(readme, "utf8"));
    expect(
      documentedSections.filter((section) => !documented.includes(section)),
    ).toEqual([]);
  });

  it("keeps a finished page's title and description equal to its registry record", () => {
    const mismatches = components
      .filter((component) => component.status !== "planned")
      .flatMap((component) => {
        const meta = frontmatter(
          readFileSync(join(pageDirectory, `${component.slug}.mdx`), "utf8"),
        );
        return [
          meta.title === component.title
            ? []
            : [
                `${component.slug}: page title "${meta.title ?? ""}" != "${component.title}"`,
              ],
          meta.description === component.summary
            ? []
            : [
                `${component.slug}: page description "${meta.description ?? ""}" != "${component.summary}"`,
              ],
        ].flat();
      });
    expect(mismatches).toEqual([]);
  });

  it("gives every finished component's page the template's blocks and sections", () => {
    const problems = components
      .filter((component) => component.status !== "planned")
      .flatMap((component) => {
        const body = readFileSync(
          join(pageDirectory, `${component.slug}.mdx`),
          "utf8",
        );
        const missing = missingSections(component.pattern, headings(body));
        const missingBlocks = [
          `<ComponentState slug="${component.slug}"`,
          `<NativePreview slug="${component.slug}"`,
          `<ComponentDependencies slug="${component.slug}"`,
        ].filter((block) => !body.includes(block));
        return [
          ...missing.map(
            (section) => `${component.slug}: missing section "${section}"`,
          ),
          ...missingBlocks.map(
            (block) => `${component.slug}: missing ${block} …`,
          ),
        ];
      });
    expect(problems).toEqual([]);
  });

  it("keeps each finished page's example, API table and source", () => {
    const problems = components
      .filter((component) => component.status !== "planned")
      .flatMap((component) => {
        const body = readFileSync(
          join(pageDirectory, `${component.slug}.mdx`),
          "utf8",
        );
        const usage = sectionBody(body, "Usage");
        return [
          /^```(tsx|ts)\b/m.test(usage) && usage.includes("@gpuixui/")
            ? []
            : [`${component.slug}: Usage has no @gpuixui example`],
          sectionBody(body, "API reference").includes("<auto-type-table")
            ? []
            : [`${component.slug}: API reference has no <auto-type-table>`],
          sectionBody(body, "Source").includes("<include")
            ? []
            : [`${component.slug}: Source has no <include>`],
        ].flat();
      });
    expect(problems).toEqual([]);
  });
});

describe("compound page contract", () => {
  const stateful = sectionsFor("stateful");
  const workspace = sectionsFor("workspace");

  it("puts each extra section where the template documents it", () => {
    expect(stateful.indexOf("State and ownership")).toBe(
      stateful.indexOf("Composition") + 1,
    );
    expect(workspace.indexOf("Anatomy")).toBe(workspace.indexOf("Usage") + 1);
    expect(workspace.indexOf("Persistence")).toBe(
      workspace.indexOf("State and ownership") + 1,
    );
  });

  it("fails a stateful page that omits the state section", () => {
    expect(missingSections("stateful", sectionsFor("static"))).toEqual([
      "State and ownership",
    ]);
  });

  it("fails a workspace page that omits anatomy and persistence", () => {
    expect(missingSections("workspace", stateful)).toEqual([
      "Anatomy",
      "Persistence",
    ]);
  });

  it("fails a compound page that includes its entry file but not its parts", () => {
    const parts = [
      {
        name: "Card",
        sourcePath: "packages/components/src/card.tsx",
      },
      {
        name: "Badge",
        sourcePath: "packages/components/src/badge.tsx",
      },
    ];
    const absolute = (sourcePath: string) => join(repoRoot, sourcePath);

    expect(
      missingPartSources(
        { parts },
        [absolute("packages/components/src/card.tsx")],
        absolute,
      ),
    ).toEqual(["Badge (packages/components/src/badge.tsx) is not included"]);

    expect(
      missingPartSources(
        { parts },
        parts.map((part) => absolute(part.sourcePath)),
        absolute,
      ),
    ).toEqual([]);
  });
});

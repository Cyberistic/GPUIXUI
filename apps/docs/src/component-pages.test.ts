import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { components } from "./component-meta/registry";

/**
 * Guards the component-page template (plan 411 §4, `MISSION.md` "Every
 * component page"). Nothing else reads a page's body: a finished component
 * whose page omits the status block, the preview or a required section still
 * builds, still sits in the sidebar and still passes `registry.test.ts`, so the
 * omission is invisible until a reader notices there is no API table.
 *
 * The template itself lives in `apps/docs/README.md`; the first test makes the
 * README and this list agree, the second makes every finished component's page
 * follow it.
 */

const pageDirectory = fileURLToPath(
  new URL("../content/docs/components/", import.meta.url),
);
const readme = fileURLToPath(new URL("../README.md", import.meta.url));

/** Every section the template requires, in a documented order (see README). */
const sections = [
  "Usage",
  "Variants",
  "Sizes",
  "States",
  "Composition",
  "API reference",
  "Keyboard and focus",
  "Theming",
  "Accessibility and limitations",
  "Source",
  "Related",
] as const;

const headings = (document: string): ReadonlyArray<string> =>
  document
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice("## ".length).trim());

describe("component page template", () => {
  it("documents every required section in the template", () => {
    const documented = headings(readFileSync(readme, "utf8"));
    expect(sections.filter((section) => !documented.includes(section))).toEqual(
      [],
    );
  });

  it("gives every finished component's page the template's blocks and sections", () => {
    const problems = components
      .filter((component) => component.status !== "planned")
      .flatMap((component) => {
        const body = readFileSync(
          join(pageDirectory, `${component.slug}.mdx`),
          "utf8",
        );
        const missingSections = sections.filter(
          (section) => !headings(body).includes(section),
        );
        const missingBlocks = [
          `<ComponentState slug="${component.slug}"`,
          `<NativePreview slug="${component.slug}"`,
        ].filter((block) => !body.includes(block));
        return [
          ...missingSections.map(
            (section) => `${component.slug}: missing section "${section}"`,
          ),
          ...missingBlocks.map(
            (block) => `${component.slug}: missing ${block} …`,
          ),
        ];
      });
    expect(problems).toEqual([]);
  });
});

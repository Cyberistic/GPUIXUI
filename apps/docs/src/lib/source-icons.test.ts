import { readFileSync, readdirSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

/**
 * Guards plan 604. `lucideIconsPlugin()` resolves a page's `icon` name through
 * `import { icons } from "lucide-react"`, so enabling it shipped all 1 849 icon
 * definitions in one 701 KiB chunk on every page, while no page in this site
 * declares an `icon` at all. The defects this fails on:
 *
 * - the namespace plugin returning to `src/lib/source.ts` (payload regression);
 * - an `icon` field appearing in a `meta.json` or a page's frontmatter, which
 *   would now render nothing and must instead name a component or adopt an
 *   explicit icon map.
 */

const loader = new URL("./source.ts", import.meta.url);
const contentDir = new URL("../../content/docs/", import.meta.url);

const SidebarMeta = Schema.Struct({ icon: Schema.optional(Schema.String) });
const decodeSidebarMeta = Schema.decodeUnknownSync(
  Schema.fromJsonString(SidebarMeta),
);

const files = (
  dir: URL,
  matches: (name: string) => boolean,
): ReadonlyArray<URL> => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const here = entries
    .filter((entry) => entry.isFile() && matches(entry.name))
    .map((entry) => new URL(entry.name, dir));
  const children = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => new URL(`${entry.name}/`, dir));
  return [...here, ...children.flatMap((child) => files(child, matches))];
};

const isMeta = (name: string): boolean => name === "meta.json";
const isPage = (name: string): boolean => name.endsWith(".mdx");

const frontmatter = (source: string): string =>
  /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? "";

const iconLines = (source: string): ReadonlyArray<string> =>
  Arr.filter(frontmatter(source).split("\n"), (line) =>
    line.startsWith("icon:"),
  );

describe("source icons", () => {
  it("does not load the lucide icon set into the loader", () => {
    expect(readFileSync(loader, "utf8")).not.toContain("lucide");
  });

  it("declares no icon in any sidebar meta.json", () => {
    const offenders = files(contentDir, isMeta).flatMap((file) => {
      const decoded = decodeSidebarMeta(readFileSync(file, "utf8"));
      return Option.match(Option.fromNullishOr(decoded.icon), {
        onNone: () => [],
        onSome: (icon) =>
          [
            `${file.pathname.replace(contentDir.pathname, "")}: ${icon}`,
          ] as const,
      });
    });
    expect(offenders).toEqual([]);
  });

  it("declares no icon in any page frontmatter", () => {
    const offenders = files(contentDir, isPage).flatMap((file) =>
      iconLines(readFileSync(file, "utf8")).map(
        (line) => `${file.pathname.replace(contentDir.pathname, "")}: ${line}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});

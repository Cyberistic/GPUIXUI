import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

/**
 * Guards the site's information architecture (plan 410 §8–§10). The interesting
 * failure is silent drift: a `MISSION.md` IA section that never got a page, a
 * sidebar entry pointing at a file that does not exist, or a page on disk that
 * nothing links to. Each check reports the names it could not resolve so the
 * assertion is a claim about the content tree, not about a stubbed value.
 */

const contentDir = new URL("../content/docs/", import.meta.url);
const missionPath = fileURLToPath(
  new URL("../../../../MISSION.md", contentDir),
);

const meta = Schema.Struct({ pages: Schema.Array(Schema.String) });
const decodeMeta = Schema.decodeUnknownSync(Schema.fromJsonString(meta));

const readPages = (dir: URL): ReadonlyArray<string> =>
  decodeMeta(readFileSync(new URL("meta.json", dir), "utf8")).pages;

/** A Fumadocs sidebar separator is `---Title---`, not a page (plan 437). */
const isSeparator = (page: string): boolean => /^---.*---$/.test(page);

/**
 * Every `MISSION.md` IA section and the page that delivers it. The `label` is
 * asserted to be present in `MISSION.md`; the `page` is asserted to be ordered
 * in `meta.json` and to resolve to a real file.
 */
const informationArchitecture = [
  { label: "Introduction", page: "index" },
  { label: "Installation", page: "installation" },
  { label: "Getting started", page: "getting-started" },
  { label: "Architecture", page: "architecture" },
  { label: "Theming", page: "theming" },
  { label: "Typography", page: "typography" },
  { label: "Components", page: "components" },
  { label: "Layouts", page: "layouts" },
  { label: "Workspace", page: "workspace" },
  { label: "Data display", page: "data-display" },
  { label: "Patterns", page: "patterns" },
  { label: "Examples", page: "examples" },
  { label: "API reference", page: "api-reference" },
  { label: "Contributing", page: "contributing" },
  { label: "License and attribution", page: "license" },
] as const;

/** A Fumadocs page is either `<name>.mdx` or `<name>/index.mdx`. */
const pageExists = (dir: URL, page: string): boolean =>
  existsSync(new URL(`${page}.mdx`, dir)) ||
  existsSync(new URL(`${page}/index.mdx`, dir));

const mission = readFileSync(missionPath, "utf8");
const missionIa = mission.match(/clear IA: ([^.]+)\./)?.[1] ?? "";
const missionLabels = missionIa.split(/,\s*/).map((label) => label.trim());

describe("information architecture", () => {
  it("covers every MISSION.md IA section with a page", () => {
    const pages = readPages(contentDir);
    const missing = informationArchitecture.filter(
      (item) => !pages.includes(item.page),
    );
    expect(missing.map((item) => item.page)).toEqual([]);
  });

  it("keeps the IA mapping honest against MISSION.md itself", () => {
    const drift = informationArchitecture
      .map((item) => item.label)
      .filter((label) => !missionLabels.includes(label));
    expect(drift).toEqual([]);
  });

  it("resolves every ordered top-level page to a file", () => {
    const dangling = readPages(contentDir).filter(
      (page) => !pageExists(contentDir, page),
    );
    expect(dangling).toEqual([]);
  });

  it("orders every top-level page on disk in the sidebar", () => {
    const pages = new Set(readPages(contentDir));
    const onDisk = readdirSync(contentDir, { withFileTypes: true })
      .filter((entry) => entry.name !== "meta.json")
      .map((entry) =>
        entry.isDirectory()
          ? entry.name
          : entry.name.endsWith(".mdx")
            ? entry.name.slice(0, -".mdx".length)
            : null,
      )
      .filter((name): name is string => name !== null);
    const orphaned = Arr.sort(
      onDisk.filter((name) => !pages.has(name)),
      Order.String,
    );
    expect(orphaned).toEqual([]);
  });

  it("resolves every page in each section's own sidebar", () => {
    const sections = readPages(contentDir).filter((page) =>
      existsSync(new URL(`${page}/meta.json`, contentDir)),
    );
    const dangling = sections.flatMap((section) => {
      const dir = new URL(`${section}/`, contentDir);
      return readPages(dir)
        .filter((page) => !isSeparator(page) && !pageExists(dir, page))
        .map((page) => `${section}/${page}`);
    });
    expect(dangling).toEqual([]);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demos } from "../components/docs/demos";
import { sidebarPages } from "./sidebar-pages.test-util";

const dir = new URL("../../content/docs/", import.meta.url);

const read = (name: string): string => readFileSync(new URL(name, dir), "utf8");

interface LanePage {
  readonly file: string;
  readonly lane: string;
  readonly title: string;
}

const dataDisplayPage = "data-display/index.mdx";

const workspacePage = "workspace/index.mdx";

const pages: ReadonlyArray<LanePage> = [
  { file: workspacePage, lane: "workspace", title: "Workspace" },
  { file: dataDisplayPage, lane: "data-display", title: "Data display" },
];

const sidebar = sidebarPages(new URL("../../", import.meta.url));

describe("the composition pages", () => {
  it("exist with a title and a one-sentence description", () => {
    const incomplete = pages.filter(({ file, title }) => {
      const body = read(file);
      return !(
        body.startsWith("---\n") &&
        body.includes(`title: ${title}\n`) &&
        /^description: .+$/m.test(body)
      );
    });

    expect(incomplete.map(({ file }) => file)).toEqual([]);
  });

  it("render their rows from the inventory instead of restating them", () => {
    const missing = pages
      .filter(
        ({ file, lane }) =>
          !read(file).includes(`<LaneTable lane="${lane}" />`),
      )
      .map(({ file }) => file);

    expect(missing).toEqual([]);
  });

  it("list the pages their packages ship from the collections, not by hand", () => {
    const mounted = [
      { file: dataDisplayPage, lane: "data-display" },
      { file: workspacePage, lane: "workspace" },
    ];

    expect(
      mounted
        .filter(
          ({ file, lane }) =>
            !read(file).includes(`<LanePages lane="${lane}" />`),
        )
        .map(({ file }) => file),
    ).toEqual([]);
    expect(read(dataDisplayPage)).toContain("## What ships today");
    expect(read(workspacePage)).toContain("## What ships today");
  });

  it("mount the page list in the policy, beside the inventory table", () => {
    const policy = readFileSync(
      new URL("../../../../docs/preview-strategy.md", import.meta.url),
      "utf8",
    );

    expect(policy).toContain('| What ships today | `<LanePages lane="…" />`');
    expect(policy).toContain("**The page list is generated too.**");
  });

  it("show the surface the lane is about, from a demo that exists", () => {
    const mounted = pages.flatMap(({ file }) =>
      [...read(file).matchAll(/<ComponentPreview\s+name="([^"]+)"/g)].map(
        (match) => [file, match[1] ?? ""] as const,
      ),
    );

    expect(
      pages.filter(({ file }) => !read(file).includes("<ComponentPreview")),
    ).toEqual([]);
    expect(mounted.length).toBeGreaterThanOrEqual(pages.length);
    expect(
      mounted
        .filter(([, name]) => demos[name] === undefined)
        .map(([file, name]) => `${file}: no demo named "${name}"`),
    ).toEqual([]);

    const policy = readFileSync(
      new URL("../../../../docs/preview-strategy.md", import.meta.url),
      "utf8",
    );
    expect(policy).toContain("**A lane page shows the surface it is about.**");
  });

  it("name the inventory as the source of their status", () => {
    const silent = pages
      .filter(({ file }) => !read(file).includes(".agents/slop/COMPONENTS.md"))
      .map(({ file }) => file);

    expect(silent).toEqual([]);
  });

  it("sit in the sidebar beside the component lanes", () => {
    const positions = pages.map(({ file }) => {
      const slug = file.replace(/\/index\.mdx$/, "").replace(/\.mdx$/, "");
      return sidebar.indexOf(slug);
    });

    expect(positions.every((position) => position > 0)).toBe(true);

    expect(sidebar.indexOf("data-display")).toBeGreaterThan(
      sidebar.indexOf("components"),
    );
    expect(sidebar.indexOf("workspace")).toBeGreaterThan(
      sidebar.indexOf("data-display"),
    );
  });

  it("cross-link the lane they hand off to", () => {
    const orphans = pages
      .filter(({ file }) => {
        const links = read(file).match(/\]\(\/[a-z-]+\)/g) ?? [];
        return links.length < 2;
      })
      .map(({ file }) => file);

    expect(orphans).toEqual([]);
  });
});

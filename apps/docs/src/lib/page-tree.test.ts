import type * as PageTree from "fumadocs-core/page-tree";
import { describe, expect, it } from "vitest";
import { completeSection, type SectionPage } from "./page-tree";

/**
 * The sidebar completion.
 *
 * The site writes a page for a few components; the package writes one for all of
 * them. The tree must keep the curated order, never list a URL twice, and stay
 * stable when the package adds a page — so the guards below check all three.
 */

const tree = (children: ReadonlyArray<PageTree.Node>): PageTree.Root => ({
  name: "Docs",
  children: [...children],
});

const page = (name: string, url: string): PageTree.Node => ({
  type: "page",
  name,
  url,
});

const folder = (
  name: string,
  children: ReadonlyArray<PageTree.Node>,
): PageTree.Node => ({ type: "folder", name, children: [...children] });

/** The page URLs under the first folder with this name. */
const urlsIn = (root: PageTree.Root, name: string): ReadonlyArray<string> =>
  root.children.flatMap((node) =>
    node.type === "folder" && node.name === name
      ? node.children.flatMap((child) =>
          child.type === "page" ? [child.url] : [],
        )
      : [],
  );

const shipped: ReadonlyArray<SectionPage> = [
  { name: "Tabs", url: "/docs/components/tabs" },
  { name: "Accordion", url: "/docs/components/accordion" },
  { name: "Badge", url: "/docs/components/badge" },
];

describe("the component section", () => {
  it("keeps the curated pages first and appends the rest alphabetically", () => {
    const completed = completeSection(
      tree([
        page("Introduction", "/docs"),
        folder("Components", [
          page("Button", "/docs/components/button"),
          page("Tabs", "/docs/components/tabs"),
        ]),
        page("Contributing", "/docs/contributing"),
      ]),
      "Components",
      shipped,
    );

    // Button and Tabs are curated; Tabs must not appear a second time.
    expect(urlsIn(completed, "Components")).toEqual([
      "/docs/components/button",
      "/docs/components/tabs",
      "/docs/components/accordion",
      "/docs/components/badge",
    ]);
    // Siblings outside the folder are untouched, order included.
    expect(completed.children.map((node) => node.name)).toEqual([
      "Introduction",
      "Components",
      "Contributing",
    ]);
  });

  it("marks the appended pages with their own separator", () => {
    const completed = completeSection(
      tree([folder("Components", [page("Button", "/docs/components/button")])]),
      "Components",
      shipped,
    );
    const [components] = completed.children;
    if (components?.type !== "folder") throw new Error("no components folder");

    const separator = components.children.findIndex(
      (node) => node.type === "separator",
    );
    expect(separator).toBe(1);
    expect(components.children[separator]?.name).toBe("All components");
    // Everything after the separator is a page, so the group reads as one list.
    expect(
      components.children.slice(separator + 1).every((n) => n.type === "page"),
    ).toBe(true);
  });

  it("presses an already-listed page only once", () => {
    const completed = completeSection(
      tree([folder("Components", [page("Tabs", "/docs/components/tabs")])]),
      "Components",
      [
        { name: "Tabs", url: "/docs/components/tabs" },
        { name: "Render prop", url: "/docs/components/render-prop" },
      ],
    );

    expect(urlsIn(completed, "Components")).toEqual([
      "/docs/components/tabs",
      "/docs/components/render-prop",
    ]);
  });

  it("finds the folder when it is nested", () => {
    const completed = completeSection(
      tree([
        folder("Reference", [
          folder("Components", [page("Button", "/docs/components/button")]),
        ]),
      ]),
      "Components",
      [{ name: "Card", url: "/docs/components/card" }],
    );

    const [reference] = completed.children;
    if (reference?.type !== "folder") throw new Error("no reference folder");
    expect(
      urlsIn({ name: "x", children: reference.children }, "Components"),
    ).toEqual(["/docs/components/button", "/docs/components/card"]);
  });

  it("returns the tree untouched when there is nothing to add", () => {
    const original = tree([
      folder("Components", [page("Button", "/docs/components/button")]),
    ]);

    expect(completeSection(original, "Components", [])).toBe(original);
  });
});

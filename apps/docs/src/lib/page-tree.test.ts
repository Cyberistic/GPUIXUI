import type * as PageTree from "fumadocs-core/page-tree";
import { describe, expect, it } from "vitest";
import { completeSection, type SectionPage } from "./page-tree";

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

const separator = (name: string): PageTree.Node => ({
  type: "separator",
  name,
});

const urlsIn = (root: PageTree.Root, name: string): ReadonlyArray<string> =>
  root.children.flatMap((node) =>
    node.type === "folder" && node.name === name
      ? node.children.flatMap((child) =>
          child.type === "page" ? [child.url] : [],
        )
      : [],
  );

const namesIn = (root: PageTree.Root, name: string): ReadonlyArray<string> =>
  root.children.flatMap((node) =>
    node.type === "folder" && node.name === name
      ? node.children.flatMap((child) =>
          child.type === "page" && typeof child.name === "string"
            ? [child.name]
            : [],
        )
      : [],
  );

const shipped: ReadonlyArray<SectionPage> = [
  { name: "Tabs", url: "/components/tabs" },
  { name: "Accordion", url: "/components/accordion" },
  { name: "Badge", url: "/components/badge" },
];

describe("the effects category", () => {
  it("keeps the decorative surfaces under one folder, and no page elsewhere", () => {
    const completed = completeSection(
      tree([folder("Components", [page("Button", "/components/button")])]),
      "Components",
      [
        { name: "Button", url: "/components/button" },
        { name: "Fireworks", url: "/components/fireworks" },
        { name: "Particles", url: "/components/particles" },
        { name: "Tabs", url: "/components/tabs" },
      ],
    );
    const components = completed.children.find(
      (node) => node.type === "folder" && node.name === "Components",
    );
    const children = components?.type === "folder" ? components.children : [];
    const effects = children.find(
      (node) => node.type === "folder" && node.name === "Effects",
    );
    const effectUrls =
      effects?.type === "folder"
        ? effects.children.flatMap((node) =>
            node.type === "page" ? [node.url] : [],
          )
        : [];

    expect(effectUrls).toEqual([
      "/components/fireworks",
      "/components/particles",
    ]);
    expect(
      children.flatMap((node) => (node.type === "page" ? [node.url] : [])),
    ).toEqual(["/components/button", "/components/tabs"]);
  });
});

describe("the component section", () => {
  it("folds curated and package pages into one alphabetical list", () => {
    const completed = completeSection(
      tree([
        page("Introduction", "/"),
        folder("Components", [
          page("Button", "/components/button"),
          page("Tabs", "/components/tabs"),
        ]),
        page("Guide", "/getting-started"),
      ]),
      "Components",
      shipped,
    );

    expect(namesIn(completed, "Components")).toEqual([
      "Accordion",
      "Badge",
      "Button",
      "Tabs",
    ]);
    expect(urlsIn(completed, "Components")).toEqual([
      "/components/accordion",
      "/components/badge",
      "/components/button",
      "/components/tabs",
    ]);

    expect(completed.children.map((node) => node.name)).toEqual([
      "Introduction",
      "Components",
      "Guide",
    ]);
  });

  it("drops the old group separators, so the lane reads flat", () => {
    const completed = completeSection(
      tree([
        folder("Components", [
          page("Button", "/components/button"),
          separator("Surfaces"),
          page("Card", "/components/card"),
        ]),
      ]),
      "Components",
      shipped,
    );
    const [components] = completed.children;
    if (components?.type !== "folder") throw new Error("no components folder");

    expect(components.children.every((node) => node.type === "page")).toBe(
      true,
    );
  });

  it("presses an already-listed page only once", () => {
    const completed = completeSection(
      tree([folder("Components", [page("Tabs", "/components/tabs")])]),
      "Components",
      [
        { name: "Tabs", url: "/components/tabs" },
        { name: "Render prop", url: "/components/render-prop" },
      ],
    );

    expect(urlsIn(completed, "Components")).toEqual([
      "/components/render-prop",
      "/components/tabs",
    ]);
  });

  it("finds the folder when it is nested", () => {
    const completed = completeSection(
      tree([
        folder("Reference", [
          folder("Components", [page("Button", "/components/button")]),
        ]),
      ]),
      "Components",
      [{ name: "Card", url: "/components/card" }],
    );

    const [reference] = completed.children;
    if (reference?.type !== "folder") throw new Error("no reference folder");
    expect(
      urlsIn({ name: "x", children: reference.children }, "Components"),
    ).toEqual(["/components/button", "/components/card"]);
  });

  it("leaves a tree with no matching folder alone", () => {
    const original = tree([page("Introduction", "/")]);

    expect(completeSection(original, "Components", shipped)).toEqual(original);
  });
});

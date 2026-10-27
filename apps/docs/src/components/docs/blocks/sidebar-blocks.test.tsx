import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { blockList, blocks } from "../blocks";

/**
 * The sixteen sidebar blocks.
 *
 * shadcn ships `sidebar-01` … `sidebar-16`, and the docs index counts whatever
 * the registry holds — so a block that loses its composition still counts, a
 * copying mistake can make two slugs paint the same screen, and a panel that
 * lost its content still passes the page/thumbnail guards. This holds the set,
 * each block's own content, and that no two blocks paint the same markup.
 */

const SIGNS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "sidebar-01": ["Documentation", "v1.0.1", "Data Fetching", "Edge regions"],
  "sidebar-02": [
    "Community",
    "Contribution Guide",
    "Edge Runtime",
    "Turbopack",
  ],
  "sidebar-03": ["Getting Started", "Project Structure", "Data Fetching"],
  "sidebar-04": ["Documentation", "API Reference", "Cached routes"],
  "sidebar-05": ["Getting Started", "Routing", "Data Fetching", "Examples"],
  "sidebar-06": [
    "Subscribe to our newsletter",
    "Subscribe",
    "Getting Started",
    "Installation",
  ],
  "sidebar-07": [
    "Acme Inc",
    "Enterprise",
    "Platform",
    "Playground",
    "History",
    "Projects",
    "Design Engineering",
    "Ada Lovelace",
  ],
  "sidebar-08": ["Acme Inc", "Platform", "Support", "Feedback", "Ada Lovelace"],
  "sidebar-09": ["Inbox", "Unreads", "William Smith", "Meeting Tomorrow"],
  "sidebar-10": [
    "Favorites",
    "Workspaces",
    "Edit Oct 08",
    "Customize Page",
    "Notifications",
  ],
  "sidebar-11": ["Changes", "README.md", "components", "button.tsx"],
  "sidebar-12": [
    "October 2024",
    "My Calendars",
    "Holidays",
    "New Calendar",
    "Design review",
  ],
  "sidebar-13": [
    "Settings",
    "Messages",
    "Notifications",
    "Privacy",
    "Read receipts",
  ],
  "sidebar-14": ["Table of Contents", "Build Your Application", "Installation"],
  "sidebar-15": [
    "Favorites",
    "Personal Life Management",
    "October 2024",
    "New Calendar",
    "Draft the project brief",
  ],
  "sidebar-16": [
    "Acme Inc",
    "Platform",
    "Projects",
    "Design Engineering",
    "Type to search...",
  ],
};

const rendered = new Map(
  blockList.map((block) => [
    block.name,
    renderToStaticMarkup(createElement(block.render)),
  ]),
);

describe("the sidebar blocks", () => {
  const names = Object.keys(SIGNS);

  it("registers all sixteen shadcn slugs, each with its source", () => {
    const expected = Array.from(
      { length: 16 },
      (_, index) => `sidebar-${`${index + 1}`.padStart(2, "0")}`,
    );
    expect(names).toEqual(expected);
    expect(blockList.map((block) => block.name)).toEqual(
      expect.arrayContaining(expected),
    );
    expect(
      expected.filter((name) => (blocks[name]?.source ?? "").length < 400),
    ).toEqual([]);
  });

  it("paints each block's own panel, header and content", () => {
    const missing = names.flatMap((name) => {
      const markup = rendered.get(name) ?? "";
      return (SIGNS[name] ?? []).flatMap((sign) =>
        markup.includes(sign) ? [] : [`${name} lacks ${sign}`],
      );
    });
    expect(missing).toEqual([]);
  });

  it("paints a screen, never an empty state", () => {
    const thin = names.filter((name) => {
      const markup = rendered.get(name) ?? "";
      const text = markup.replace(/<[^>]+>/g, "").trim();
      return markup.length < 2000 || text.length < 200;
    });
    expect(thin).toEqual([]);
  });

  it("paints sixteen different screens", () => {
    const counts = new Map<string, ReadonlyArray<string>>();
    for (const [name, markup] of rendered) {
      counts.set(markup, [...(counts.get(markup) ?? []), name]);
    }
    expect([...counts.values()].filter((group) => group.length > 1)).toEqual(
      [],
    );
  });

  it("teaches the sidebar family in every recipe", () => {
    const broken = names.filter((name) => {
      const source = blocks[name]?.source ?? "";
      return (
        !source.includes("SidebarProvider") || !source.includes("<Sidebar")
      );
    });
    expect(broken).toEqual([]);

    // The browser drawing is not the shipped tree, and a page that claims it is
    // would send a reader looking for DOM markup the runtime never paints.
    const page = (name: string): string =>
      readFileSync(
        new URL(`../../../../content/docs/blocks/${name}.mdx`, import.meta.url),
        "utf8",
      );
    expect(
      names.filter((name) => !page(name).includes("browser reproduction")),
    ).toEqual([]);
  });
});

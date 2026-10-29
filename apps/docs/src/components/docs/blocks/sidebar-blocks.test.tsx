import { themes } from "@gpuixui/tokens";
import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { blockList, blocks } from "../blocks";
import { SIDEBAR_EXAMPLES, SidebarExample } from "../sidebar-examples";

/**
 * The one Sidebar page.
 *
 * The sixteen shadcn sidebar blocks used to be sixteen pages and sixteen index
 * tiles. They are now sections of `/blocks/sidebar`: one registry entry,
 * one tile, one thumbnail, and sixteen drawings that keep their own state. This
 * guards the merge — a lost example, a slug that points at nothing, a section
 * without its shadcn link, or a control that regressed to paint would all still
 * build and still count as a block.
 */

vi.mock("../platform-toggle", () => ({
  usePlatform: () => ({
    platform: "darwin",
    look: "native",
    mode: "dark",
    theme: themes.dark,
    setPlatform: () => undefined,
    setLook: () => undefined,
    setMode: () => undefined,
  }),
}));

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
  "sidebar-10": ["Favorites", "Workspaces", "Edit Oct 08"],
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

const markupFor = (slug: string): string =>
  renderToStaticMarkup(<SidebarExample slug={slug} />);

const page = readFileSync(
  new URL("../../../../content/docs/blocks/sidebar.mdx", import.meta.url),
  "utf8",
);

interface Section {
  readonly number: string;
  readonly title: string;
  readonly href: string;
  readonly slug: string;
}

/** Each `## Sidebar NN — title`, its shadcn link and the example it mounts. */
const sections: ReadonlyArray<Section> = [
  ...page.matchAll(
    /^## Sidebar (\d\d) — (.+)\n\nReproduces \[shadcn's `sidebar-\d\d` block\]\((https:\/\/ui\.shadcn\.com\/blocks\/sidebar#sidebar-\d\d)\)\.\n\n<SidebarExample slug="(sidebar-\d\d)" \/>$/gm,
  ),
].map((match) => {
  const [, number, title, href, slug] = match;
  if (
    number === undefined ||
    title === undefined ||
    href === undefined ||
    slug === undefined
  ) {
    throw new Error("a sidebar section did not parse");
  }
  return { number, title, href, slug };
});

const css = readFileSync(
  new URL("../../../styles/blocks.css", import.meta.url),
  "utf8",
);

describe("the Sidebar page", () => {
  it("is one registry entry, one page and one tile", () => {
    expect(
      Object.keys(blocks).filter((name) => name.startsWith("sidebar")),
    ).toEqual(["sidebar"]);
    expect(blocks["sidebar"]?.title).toBe("Sidebar");
    expect(blockList.filter((block) => block.slug === "sidebar")).toHaveLength(
      1,
    );
    expect(
      readdirSync(
        new URL("../../../../content/docs/blocks/", import.meta.url),
      ).filter((file) => /^sidebar-\d\d\.mdx$/.test(file)),
    ).toEqual([]);
  });

  it("lists the page once, and only the page, under Blocks", () => {
    const meta: unknown = JSON.parse(
      readFileSync(
        new URL("../../../../content/docs/blocks/meta.json", import.meta.url),
        "utf8",
      ),
    );
    const pages =
      typeof meta === "object" && meta !== null && "pages" in meta
        ? meta.pages
        : undefined;

    expect(Array.isArray(pages)).toBe(true);
    expect(
      Array.isArray(pages)
        ? pages.filter(
            (entry): entry is string =>
              typeof entry === "string" && entry.startsWith("sidebar"),
          )
        : [],
    ).toEqual(["sidebar"]);
  });

  it("reproduces all sixteen examples, in order, each with its shadcn link", () => {
    expect(sections.map((section) => section.slug)).toEqual(
      SIDEBAR_EXAMPLES.map((example) => example.slug),
    );
    expect(sections.map((section) => section.title)).toEqual(
      SIDEBAR_EXAMPLES.map((example) => example.title),
    );
    expect(sections.map((section) => section.href)).toEqual(
      SIDEBAR_EXAMPLES.map((example) => example.href),
    );
    expect(sections.map((section) => section.number)).toEqual(
      Array.from({ length: 16 }, (_, index) => `${index + 1}`.padStart(2, "0")),
    );
  });

  it("mounts one page, at the stage width, never the component panel", () => {
    const markup = renderToStaticMarkup(
      <>
        {SIDEBAR_EXAMPLES.map((example) => (
          <SidebarExample key={example.slug} slug={example.slug} />
        ))}
      </>,
    );
    expect(markup.match(/class="gx-demo gx-block-stage"/g)).toHaveLength(16);
    expect(markup).not.toContain("gx-component");
    expect(markup).toContain("Recipe — sidebar-16");
  });

  it("paints each example's own panel, header and content", () => {
    const missing = SIDEBAR_EXAMPLES.flatMap((example) =>
      (SIGNS[example.slug] ?? []).flatMap((sign) =>
        markupFor(example.slug).includes(sign)
          ? []
          : [`${example.slug} lacks ${sign}`],
      ),
    );
    expect(missing).toEqual([]);
  });

  it("paints sixteen different screens, each a whole one", () => {
    const painted = SIDEBAR_EXAMPLES.map((example) => ({
      slug: example.slug,
      markup: markupFor(example.slug),
    }));
    const duplicates = painted.filter(
      (entry, index) =>
        painted.findIndex((other) => other.markup === entry.markup) !== index,
    );
    expect(duplicates.map((entry) => entry.slug)).toEqual([]);

    const thin = painted.filter((entry) => {
      const text = entry.markup.replace(/<[^>]+>/g, "").trim();
      return entry.markup.length < 2000 || text.length < 200;
    });
    expect(thin.map((entry) => entry.slug)).toEqual([]);
  });

  it("keeps a copyable recipe for every example", () => {
    const broken = SIDEBAR_EXAMPLES.filter(
      (example) =>
        example.source.length < 400 ||
        !example.source.includes("SidebarProvider") ||
        !example.source.includes("<Sidebar"),
    );
    expect(broken.map((example) => example.slug)).toEqual([]);
    expect(markupFor("sidebar-01")).toContain("Recipe — sidebar-01");
  });
});

describe("the sidebar controls", () => {
  const has = (slug: string, value: string): boolean =>
    markupFor(slug).includes(value);

  it("gives every example a button, and every state a name", () => {
    const buttonless = SIDEBAR_EXAMPLES.filter(
      (example) => !markupFor(example.slug).includes("<button"),
    );
    expect(buttonless.map((example) => example.slug)).toEqual([]);

    const stateless = SIDEBAR_EXAMPLES.filter((example) => {
      const markup = markupFor(example.slug);
      return (
        !markup.includes("aria-expanded") && !markup.includes("aria-modal")
      );
    });
    expect(stateless.map((example) => example.slug)).toEqual([]);
  });

  it("collapses icon panels to a rail and offcanvas panels off the edge", () => {
    expect(has("sidebar-07", 'data-collapse="icon"')).toBe(true);
    expect(has("sidebar-09", 'data-collapse="icon"')).toBe(true);
    expect(has("sidebar-01", 'data-collapse="offcanvas"')).toBe(true);
    expect(has("sidebar-01", 'class="gx-sb-rail"')).toBe(true);
    expect(has("sidebar-01", 'aria-label="Collapse sidebar"')).toBe(true);
    expect(has("sidebar-14", 'aria-label="Collapse sidebar"')).toBe(true);
    expect(has("sidebar-07", 'data-tooltip="Playground"')).toBe(true);
  });

  it("marks the panels that do not collapse, and says so", () => {
    expect(has("sidebar-13", 'data-collapse="none"')).toBe(true);
    expect(has("sidebar-13", 'role="dialog"')).toBe(true);
    expect(has("sidebar-13", 'class="gx-sb-scrim gx-sb-scrim--scene"')).toBe(
      true,
    );
    expect(has("sidebar-13", "has no collapse trigger")).toBe(true);
    expect(has("sidebar-15", 'data-collapse="none"')).toBe(true);
  });

  it("folds sections, submenus and dropdown groups with the same reveal", () => {
    expect(has("sidebar-02", 'class="gx-sb-fold"')).toBe(true);
    expect(has("sidebar-05", 'class="gx-sb-fold"')).toBe(true);
    expect(has("sidebar-06", 'class="gx-sb-fold"')).toBe(true);
    expect(has("sidebar-06", 'aria-expanded="false"')).toBe(true);
    expect(has("sidebar-07", 'aria-expanded="true"')).toBe(true);
    expect(has("sidebar-11", 'aria-expanded="true"')).toBe(true);

    expect(css).toContain("grid-template-rows 200ms ease-out");
    expect(css).toContain('.gx-sb-fold[data-open="true"]');
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*\.gx-sb-fold/);
  });

  it("opens the actions menu and the account from their triggers", () => {
    expect(has("sidebar-10", 'aria-label="Page actions"')).toBe(true);
    expect(has("sidebar-10", 'aria-expanded="false"')).toBe(true);
    expect(has("sidebar-10", "Customize Page")).toBe(false);
    expect(has("sidebar-07", 'aria-haspopup="menu"')).toBe(true);
    expect(has("sidebar-07", "Upgrade to Pro")).toBe(false);
    expect(has("sidebar-09", 'data-rail="true"')).toBe(true);
  });

  it("paints hover and focus on a row, and snaps under reduced motion", () => {
    expect(css).toContain(".gx-sb-row:focus-visible");
    expect(css).toContain("outline: 2px solid var(--ring)");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*\.gx-sb-panel/);
  });

  it("keeps one thumbnail for the page, and none for the old blocks", () => {
    const files = readdirSync(
      new URL("../../../../public/blocks/", import.meta.url),
    );
    expect(files).toContain("sidebar.webp");
    expect(files.filter((file) => /^sidebar-\d\d\.webp$/.test(file))).toEqual(
      [],
    );
  });
});

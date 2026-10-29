import type { ReactNode } from "react";
import { BlockScreen } from "./block-preview";
import { Sidebar01Render, sidebar01Source } from "./blocks/sidebar-01";
import { Sidebar02Render, sidebar02Source } from "./blocks/sidebar-02";
import { Sidebar03Render, sidebar03Source } from "./blocks/sidebar-03";
import { Sidebar04Render, sidebar04Source } from "./blocks/sidebar-04";
import { Sidebar05Render, sidebar05Source } from "./blocks/sidebar-05";
import { Sidebar06Render, sidebar06Source } from "./blocks/sidebar-06";
import { Sidebar07Render, sidebar07Source } from "./blocks/sidebar-07";
import { Sidebar08Render, sidebar08Source } from "./blocks/sidebar-08";
import { Sidebar09Render, sidebar09Source } from "./blocks/sidebar-09";
import { Sidebar10Render, sidebar10Source } from "./blocks/sidebar-10";
import { Sidebar11Render, sidebar11Source } from "./blocks/sidebar-11";
import { Sidebar12Render, sidebar12Source } from "./blocks/sidebar-12";
import { Sidebar13Render, sidebar13Source } from "./blocks/sidebar-13";
import { Sidebar14Render, sidebar14Source } from "./blocks/sidebar-14";
import { Sidebar15Render, sidebar15Source } from "./blocks/sidebar-15";
import { Sidebar16Render, sidebar16Source } from "./blocks/sidebar-16";

/**
 * The sixteen sidebar examples, in shadcn's order.
 *
 * They were sixteen pages; they are now the sections of one page. The page
 * writes each heading and the shadcn link, and mounts the drawing with
 * `<SidebarExample slug="sidebar-01" />` so the section stays in the Markdown
 * table of contents while the drawing keeps its own state.
 */
export interface SidebarExampleBlock {
  readonly slug: string;
  readonly title: string;
  /** The section shadcn publishes the block in, anchored on its current page. */
  readonly href: string;
  readonly render: () => ReactNode;
  readonly source: string;
}

const shadcn = (slug: string): string =>
  `https://ui.shadcn.com/blocks/sidebar#${slug}`;

export const SIDEBAR_EXAMPLES: ReadonlyArray<SidebarExampleBlock> = [
  {
    slug: "sidebar-01",
    title: "Sectioned docs navigation",
    href: shadcn("sidebar-01"),
    render: Sidebar01Render,
    source: sidebar01Source,
  },
  {
    slug: "sidebar-02",
    title: "Collapsible sections",
    href: shadcn("sidebar-02"),
    render: Sidebar02Render,
    source: sidebar02Source,
  },
  {
    slug: "sidebar-03",
    title: "Submenus",
    href: shadcn("sidebar-03"),
    render: Sidebar03Render,
    source: sidebar03Source,
  },
  {
    slug: "sidebar-04",
    title: "Floating submenus",
    href: shadcn("sidebar-04"),
    render: Sidebar04Render,
    source: sidebar04Source,
  },
  {
    slug: "sidebar-05",
    title: "Collapsible submenus",
    href: shadcn("sidebar-05"),
    render: Sidebar05Render,
    source: sidebar05Source,
  },
  {
    slug: "sidebar-06",
    title: "Dropdown sections",
    href: shadcn("sidebar-06"),
    render: Sidebar06Render,
    source: sidebar06Source,
  },
  {
    slug: "sidebar-07",
    title: "Icon rail",
    href: shadcn("sidebar-07"),
    render: Sidebar07Render,
    source: sidebar07Source,
  },
  {
    slug: "sidebar-08",
    title: "Inset panel",
    href: shadcn("sidebar-08"),
    render: Sidebar08Render,
    source: sidebar08Source,
  },
  {
    slug: "sidebar-09",
    title: "Nested inbox",
    href: shadcn("sidebar-09"),
    render: Sidebar09Render,
    source: sidebar09Source,
  },
  {
    slug: "sidebar-10",
    title: "Actions popover",
    href: shadcn("sidebar-10"),
    render: Sidebar10Render,
    source: sidebar10Source,
  },
  {
    slug: "sidebar-11",
    title: "File tree",
    href: shadcn("sidebar-11"),
    render: Sidebar11Render,
    source: sidebar11Source,
  },
  {
    slug: "sidebar-12",
    title: "Calendar",
    href: shadcn("sidebar-12"),
    render: Sidebar12Render,
    source: sidebar12Source,
  },
  {
    slug: "sidebar-13",
    title: "Settings dialog",
    href: shadcn("sidebar-13"),
    render: Sidebar13Render,
    source: sidebar13Source,
  },
  {
    slug: "sidebar-14",
    title: "Right panel",
    href: shadcn("sidebar-14"),
    render: Sidebar14Render,
    source: sidebar14Source,
  },
  {
    slug: "sidebar-15",
    title: "Two panels",
    href: shadcn("sidebar-15"),
    render: Sidebar15Render,
    source: sidebar15Source,
  },
  {
    slug: "sidebar-16",
    title: "Site header",
    href: shadcn("sidebar-16"),
    render: Sidebar16Render,
    source: sidebar16Source,
  },
];

export const sidebarExample = (slug: string): SidebarExampleBlock => {
  const example = SIDEBAR_EXAMPLES.find((entry) => entry.slug === slug);
  if (example === undefined) {
    throw new Error(`SidebarExample: no example named "${slug}"`);
  }
  return example;
};

/**
 * One example on the sidebar page, in the same frame as every other block
 * page. The page supplies the group, the heading and the shadcn link around it.
 */
export function SidebarExample({ slug }: { readonly slug: string }) {
  const example = sidebarExample(slug);

  return (
    <BlockScreen
      name={example.slug}
      render={example.render}
      source={example.source}
    />
  );
}

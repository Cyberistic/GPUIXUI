import { MANIFEST_PATH } from "./site-head";

/** A route the docs site serves without an MDX page behind it. */
export interface SiteOutputRoute {
  readonly route: string;
  readonly module: string;
  /** The name ⌘K promotes this route for, when it has one (plan 597). */
  readonly searchName?: string;
}

/**
 * The discovery routes the site serves (plans 418, 510, 516, 525, 594, 596).
 * The Contributing page's `### Site output` table, its guard and the generated
 * search document all read this list, so a route cannot be served, undocumented
 * or unsearchable without one of them failing.
 */
export const SITE_OUTPUT_ROUTES: ReadonlyArray<SiteOutputRoute> = [
  {
    route: "/sitemap.xml",
    module: "src/routes/sitemap[.]xml.ts",
    searchName: "sitemap.xml",
  },
  {
    route: "/robots.txt",
    module: "src/routes/robots[.]txt.ts",
    searchName: "robots.txt",
  },
  {
    route: "/llms.txt",
    module: "src/routes/llms[.]txt.ts",
    searchName: "llms.txt",
  },
  {
    route: "/llms-full.txt",
    module: "src/routes/llms-full[.]txt.ts",
    searchName: "llms-full.txt",
  },
  {
    route: "/docs/<slug>.md",
    module: "src/routes/docs/{$}[.]md.ts",
  },
  {
    route: MANIFEST_PATH,
    module: "src/routes/site[.]webmanifest.ts",
    searchName: "site.webmanifest",
  },
];

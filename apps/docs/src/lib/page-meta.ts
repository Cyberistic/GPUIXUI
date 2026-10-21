import { absoluteUrl } from "./site";
import { appName } from "./shared";

/**
 * The document metadata of one docs page.
 *
 * Every docs page previously shared the root layout's title, so a reader with
 * three tabs open saw "GPUIxUI Docs" three times and a crawler saw one title for
 * seventy pages. The title, description and canonical URL come from the page
 * that is rendering; `page-meta.test.ts` holds them to an absolute URL and to
 * the frontmatter.
 */

/** What a head needs from a page; the loader supplies it for both collections. */
export interface DocsPageMeta {
  /** The frontmatter title, without the site name. */
  readonly title: string;
  /** The frontmatter description, if the page has one. */
  readonly description?: string;
  /** The page's URL path, such as `/docs/components/dialog`. */
  readonly url: string;
}

const fallbackDescription = `Documentation for ${appName}, the native UI component library for GPUix and React.`;

/** The title as a browser tab, a search result and a share card show it. */
export const pageTitle = (title: string): string => `${title} · ${appName}`;

/**
 * The landing page's document metadata.
 *
 * The landing is a route, not a collection document, so it never went through
 * `docsMetadata` — and a link to the site's front door shared without an
 * `og:description` or a canonical URL. It lives here rather than in the route
 * so the guard can read it: the route module imports `@/` components, which a
 * unit test cannot load.
 */
export const landingTitle = "GPUIxUI — one library, three native looks";

/** What the landing page tells a search engine and a share card. */
export const landingDescription =
  "GPUIxUI is a native UI component library for GPUix + React — one component set that looks at home on macOS, Windows 11 and Linux.";

export const landingMeta = () => {
  const url = absoluteUrl("/");

  return {
    meta: [
      { title: landingTitle },
      { name: "description", content: landingDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: appName },
      { property: "og:title", content: landingTitle },
      { property: "og:description", content: landingDescription },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: landingTitle },
      { name: "twitter:description", content: landingDescription },
    ],
    links: [{ rel: "canonical", href: url }],
  };
};

/**
 * The `head` contribution of a docs page.
 *
 * A canonical link is the page's own absolute URL: the platform switch is a
 * query string, so `?platform=win32` reads as one page rather than four.
 */
export const docsMetadata = ({
  title,
  description,
  url: path,
}: DocsPageMeta) => {
  const url = absoluteUrl(path);
  const summary = description?.trim() || fallbackDescription;

  return {
    meta: [
      { title: pageTitle(title) },
      { name: "description", content: summary },
      { property: "og:type", content: "article" },
      { property: "og:site_name", content: appName },
      { property: "og:title", content: pageTitle(title) },
      { property: "og:description", content: summary },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: pageTitle(title) },
      { name: "twitter:description", content: summary },
    ],
    links: [{ rel: "canonical", href: url }],
  };
};

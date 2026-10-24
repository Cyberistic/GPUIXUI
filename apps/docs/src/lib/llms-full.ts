import { orderedSections, servedPageList, type LlmsPage } from "./llms";
import { appName } from "./shared";
import { absoluteUrl } from "./site";

/**
 * `/llms-full.txt`, the whole documentation as one Markdown document.
 *
 * `/llms.txt` is the map: one line per page, so an agent knows what exists
 * before it reads anything. This is the territory: every page's own Markdown,
 * in the map's order, so a reader that cannot open the site — or that would
 * rather search one text than a hundred requests — gets the prose, the API
 * tables and the limits in a single fetch. The two documents are built from the
 * same page list and the same section order, so they cannot disagree about
 * which page is served at an address or where it sits.
 *
 * The body is the collection's processed Markdown: the authored page with the
 * MDX compiled away, which is what `page.getText("processed")` returns because
 * every collection is configured with `includeProcessedMarkdown`.
 */

/** One page in the full document: its prose as the collection serves it. */
export interface LlmsFullPage extends LlmsPage {
  /** The page's Markdown, with no frontmatter and no MDX. */
  readonly markdown: string;
}

/**
 * The page's own Markdown.
 *
 * Fumadocs' processed text is the authored body, but a raw file passed through
 * the same seam may still carry its frontmatter: the title and description
 * belong to the document's heading block, not to the body, and an agent reading
 * a second `title:` line learns the same thing twice.
 */
const bodyOf = (markdown: string): string =>
  markdown
    .replace(/^\uFEFF/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .trim();

/** One page's block: its heading, the address it is served at, and its prose. */
const block = (page: LlmsFullPage): string => {
  const body = bodyOf(page.markdown);
  const description = page.description?.replaceAll(/\s+/g, " ").trim();

  return [
    `# ${page.title}`,
    "",
    `Source: ${absoluteUrl(page.url)}`,
    ...(description === undefined || description === ""
      ? []
      : ["", description]),
    ...(body === "" ? [] : ["", body]),
  ].join("\n");
};

/**
 * The document for these pages.
 *
 * `site` and `packaged` carry the precedence `/llms.txt` uses: the site's own
 * page wins the address it shares with a package page, and a package page a
 * curated page in another section replaces is not served at all.
 */
export const llmsFullTxt = (
  site: ReadonlyArray<LlmsFullPage>,
  packaged: ReadonlyArray<LlmsFullPage>,
): string => {
  const pages = orderedSections(servedPageList(site, packaged)).flatMap(
    ([, entries]) => entries,
  );

  return [
    `# ${appName}`,
    "",
    "> The documentation for GPUIxUI, a native UI component library for GPUix and React. Components render through GPUix host elements, not the DOM.",
    "",
    "This is every page the site serves, as Markdown, in the order the sidebar",
    "shows them. `/llms.txt` is the same list as an index, one line per page.",
    "The site is a browser application documenting a native library, so a browser",
    "preview is a labelled approximation of the component unless the page says it",
    "mounts the real renderer (`/live`, the wasm build). `COMPONENTS.md` in the",
    "repository — not a page's existence — is the status record for every",
    "component.",
    "",
    "---",
    "",
    pages.map(block).join("\n\n---\n\n"),
    "",
  ].join("\n");
};

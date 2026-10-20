import { llms, type InferPageType } from "fumadocs-core/source";
import { SITE_URL, absoluteUrl } from "./site";
import { source } from "./source";

type SourcePage = InferPageType<typeof source>;

/** `llms()` writes page-relative links; the file is read outside the site. */
const absoluteLinks = (document: string): string =>
  document.replaceAll("](/", `](${SITE_URL}/`);

/**
 * One page as the Markdown the site renders: the title, the authored summary,
 * the page's canonical URL and the processed document. Both the full manual and
 * the per-page route are this function, so they cannot disagree (plan 596).
 */
export const renderPageMarkdown = async (page: SourcePage): Promise<string> => {
  const description = page.data.description ?? "";
  return [
    `# ${page.data.title}`,
    description.length > 0 ? `> ${description}` : null,
    `Source: ${absoluteUrl(page.url)}`,
    await page.data.getText("processed"),
    "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
};

/** The `llms()` document: the index, one page, and the full manual. */
export const docsLlms = llms(source, { renderPage: renderPageMarkdown });

/** `/llms.txt`: the page tree's titles, summaries and links (plan 525). */
export const renderLlmsIndex = (): Promise<string> =>
  Promise.resolve(absoluteLinks(docsLlms.index()));

/** `/llms-full.txt`: every page as the Markdown the site renders. */
export const renderLlmsFull = (): Promise<string> => docsLlms.full();

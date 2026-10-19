import { llms } from "fumadocs-core/source";
import { SITE_URL, absoluteUrl } from "./site";
import { source } from "./source";

/** `llms()` writes page-relative links; the file is read outside the site. */
const absoluteLinks = (document: string): string =>
  document.replaceAll("](/", `](${SITE_URL}/`);

/** `/llms.txt`: the page tree's titles, summaries and links (plan 524). */
export const renderLlmsIndex = (): Promise<string> =>
  Promise.resolve(absoluteLinks(llms(source).index()));

/** `/llms-full.txt`: every page as the Markdown the site renders. */
export const renderLlmsFull = (): Promise<string> =>
  llms(source, {
    renderPage: async (page) => {
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
    },
  }).full();

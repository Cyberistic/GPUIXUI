import { orderedSections, servedPageList, type LlmsPage } from "./llms";
import { appName } from "./shared";
import { absoluteUrl } from "./site";

export interface LlmsFullPage extends LlmsPage {
  readonly markdown: string;
}

const bodyOf = (markdown: string): string =>
  markdown
    .replace(/^\uFEFF/, "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .trim();

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
    "mounts the real renderer (`/live`, the wasm build). `.agents/slop/COMPONENTS.md` in the",
    "repository — not a page's existence — is the status record for every",
    "component.",
    "",
    "---",
    "",
    pages.map(block).join("\n\n---\n\n"),
    "",
  ].join("\n");
};

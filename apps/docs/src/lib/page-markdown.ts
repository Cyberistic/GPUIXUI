import { createGetUrl } from "fumadocs-core/source";

/** The docs base URL; a page's Markdown URL is this path plus its slugs. */
export const DOCS_ROUTE = "/docs";

const getDocsUrl = createGetUrl(DOCS_ROUTE);

/**
 * The Markdown URL for a page: the docs route with the page's slugs, the last
 * one suffixed `.md`; the root page becomes `/docs/index.md`. The route
 * `src/routes/docs/{$}[.]md.ts` decodes it with {@link decodeMarkdownUrl}.
 */
export function getPageMarkdownUrl(page: {
  readonly slugs: ReadonlyArray<string>;
}): { readonly segments: ReadonlyArray<string>; readonly url: string } {
  const segments = [...page.slugs];
  if (segments.length === 0) segments.push("index.md");
  else segments[segments.length - 1] += ".md";
  return { segments, url: getDocsUrl(segments) };
}

/** The page slugs a `/docs/<slug>.md` request names. */
export function decodeMarkdownUrl(segments: ReadonlyArray<string>): string[] {
  if (segments.length === 0) return [];
  const out = [...segments];
  const last = out[out.length - 1];
  if (last !== undefined) out[out.length - 1] = last.replace(/\.md$/, "");
  if (out.length === 1 && out[0] === "index") out.pop();
  return out;
}

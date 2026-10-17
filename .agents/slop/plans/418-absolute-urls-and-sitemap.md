# 418 — absolute canonical URLs, `sitemap.xml` and `robots.txt`

- **Workstream:** docs-site
- **Phase:** B (metadata completion) → F (polish)
- **Owns:** `apps/docs/**`, the docs rows in `TODO.md`
- **Depends on:** 410 (SSR app), 413 (page metadata)
- **Depended on by:** nothing in the library.

## 1. Why

Plan 410 chose SSR partly so the site has real document metadata for search
engines. Plan 413 shipped per-page titles, descriptions and a canonical link, but
the canonical (and every OpenGraph tag) is **relative** — `/docs/installation`.
Search engines require an absolute canonical, and the site has no sitemap.

The deploy resource already fixes the public domain:
`packages/deploy/alchemy.run.docs.ts` declares `DOCS_DOMAIN = "docs.gpuixui.dev"`.
This plan turns that into one docs-side constant, overridable by
`VITE_SITE_URL`, and generates the sitemap and robots file from the same source
the pages come from.

## 2. Decisions

- **One site URL constant.** `src/lib/site.ts` exports `SITE_URL`,
  `absoluteUrl(path)` and `siteUrl(path)`. The default is
  `https://docs.gpuixui.dev` (the declared deploy domain); `VITE_SITE_URL`
  overrides it for previews and self-hosting. No trailing slash is kept.
- **The sitemap is generated from the Fumadocs source**, not a hard-coded list:
  `/`, `/docs`, then every `source.getPages()` URL. A new page appears without
  editing the route; a deleted page disappears.
- **`robots.txt` points at the sitemap** and allows everything (a public docs
  site; no private routes to disallow).
- **No `lastModified`.** The content has no git-derived timestamp at build time,
  and fabricating one is worse than omitting it. `changefreq`/`priority` are
  optional and omitted for the same reason.
- **Server routes, not prerendered files.** TanStack Start file routes
  `sitemap[.]xml.ts` and `robots[.]txt.ts` (the `[.]` escape is the router's
  documented literal-dot syntax) return `Response`s. This keeps one source of
  truth and works in dev, preview and the Worker.

## 3. Files to create or change

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/site.ts` | **new** — `SITE_URL`, `absoluteUrl(path)`, `siteUrl(path)` |
| `apps/docs/src/lib/site.test.ts` | **new** — absolute, no trailing slash, path joining |
| `apps/docs/src/lib/page-meta.ts` | use `absoluteUrl` for canonical; add `og:url` |
| `apps/docs/src/lib/page-meta.test.ts` | update the canonical expectation to absolute; add `og:url` |
| `apps/docs/src/lib/sitemap.ts` | **new** — `sitemapEntries(pages)` and `renderSitemap(entries)` |
| `apps/docs/src/lib/sitemap.test.ts` | **new** — completeness, uniqueness, absolute `<loc>`, XML shape |
| `apps/docs/src/routes/sitemap[.]xml.ts` | **new** — GET → `renderSitemap(source.getPages())` as `application/xml` |
| `apps/docs/src/routes/robots[.]txt.ts` | **new** — GET → `text/plain` with the sitemap URL |
| `apps/docs/src/routes/index.tsx` | canonical + `og:url` for `/` |
| `apps/docs/src/routes/__root.tsx` | `og:site_name` only; no per-page values here |
| `apps/docs/README.md` | document `VITE_SITE_URL` and the two routes |
| `TODO.md` | close the "relative canonical" owner row; add this unit's row |

## 4. Implementation notes

```ts
// src/lib/site.ts
const DEFAULT_SITE_URL = "https://docs.gpuixui.dev";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

/** The site's public origin. Set `VITE_SITE_URL` for previews or self-hosting. */
export const SITE_URL = trimTrailingSlash(
  import.meta.env.VITE_SITE_URL ?? DEFAULT_SITE_URL,
);

/** An absolute URL for a site path. */
export const absoluteUrl = (path: string): string =>
  new URL(path, `${SITE_URL}/`).toString();
```

- `absoluteUrl("/docs")` → `https://docs.gpuixui.dev/docs`;
  `absoluteUrl("docs")` → the same; `absoluteUrl("/")` → the origin plus `/`.
- `docsPageHead` keeps its current shape plus
  `{ property: "og:url", content: absoluteUrl(meta.url) }`, and the canonical
  link uses the same value.
- Sitemap:

```ts
export interface SitemapPage {
  readonly url: string;
}

export const sitemapEntries = (
  pages: ReadonlyArray<SitemapPage>,
): ReadonlyArray<string> => [
  "/",
  "/docs",
  ...pages.map((page) => page.url).filter((url) => url !== "/docs"),
];

export const renderSitemap = (
  pages: ReadonlyArray<SitemapPage>,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries(pages)
  .map((path) => `  <url><loc>${absoluteUrl(path)}</loc></url>`)
  .join("\n")}
</urlset>`;
```

  `/docs` is the Introduction page in this content tree; the explicit entries
  come first so the ordering is stable and `/` is never duplicated.
- Routes:

```ts
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(renderSitemap(source.getPages()), {
          headers: { "content-type": "application/xml; charset=utf-8" },
        }),
    },
  },
});
```

  `robots.txt` is the same with `content-type: text/plain; charset=utf-8` and
  `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`.
- `index.tsx` adds a `head()` with canonical `absoluteUrl("/")` and
  `og:url`; the root keeps only `og:site_name` so page-level values are never
  duplicated.

## 5. Test plan

| Test | File | Catches |
| ---- | ---- | ------- |
| `absoluteUrl` joins paths and is absolute | `site.test.ts` | a relative canonical; a double slash; a missing trailing slash on the origin path |
| canonical and `og:url` are absolute | `page-meta.test.ts` | the page head reverting to `meta.url` |
| sitemap lists `/`, `/docs`, every page once | `sitemap.test.ts` | a page missing from the sitemap; a duplicate; a relative `<loc>` |
| XML and robots are well-formed | `sitemap.test.ts` | malformed XML; a robots file without the sitemap line |

Two-direction proofs:
- replace `absoluteUrl` with the raw path in `docsPageHead` → `page-meta.test.ts`
  fails;
- drop `...pages` from `sitemapEntries` → the completeness test fails.

## 6. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass; report the count |
| `nub run --filter docs check-types` | exit 0 |
| `nub run --filter docs build` | exit 0 |
| `nub run --filter docs dev` + `curl -s localhost:3000/sitemap.xml` | 200, `application/xml`, every page `<loc>` |
| `curl -s localhost:3000/robots.txt` | 200, `Sitemap: https://docs.gpuixui.dev/sitemap.xml` |
| `curl -s localhost:3000/docs/installation` | `<link rel="canonical" href="https://docs.gpuixui.dev/docs/installation">` |
| `nub run check` / `nub run lint` / `nub run test` | pass |

## 7. STOP conditions

- The router does not accept `sitemap[.]xml.ts` as `/sitemap.xml`. Report the
  generated route tree; do not switch the app to a custom Worker entry.
- `import.meta.env.VITE_SITE_URL` is not available in the server bundle. Stop;
  report the build output. Do not read `process.env` in the browser module.
- `source.getPages()` cannot be called from a server route without a client
  import. Report the error; the search route already does the same thing and is
  the reference.

## 8. Acceptance criteria

- [ ] The canonical link and `og:url` on every docs page are absolute.
- [ ] `/sitemap.xml` lists `/`, `/docs` and every content page exactly once,
      absolute, with an XML content type.
- [ ] `/robots.txt` allows the site and points at the sitemap.
- [ ] Tests and both two-direction proofs pass; dev-server checks recorded.
- [ ] Gates and the docs build pass; work is committed on `agent/docs-site`.

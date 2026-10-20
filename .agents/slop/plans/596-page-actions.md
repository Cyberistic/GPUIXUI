# 596 — Every page is readable and copyable as Markdown

**Phase:** F (documentation platform and machine discovery)
**Workstream:** docs-site
**Depends on:** 410, 413, 414, 418, 439, 467, 490, 525, 594
**Status:** implemented

## 1. The measured defect

The site already serves its whole manual to a machine — `/llms.txt` is the
index and `/llms-full.txt` renders every page as processed Markdown (plan 525) —
but a **reader on a page** has no way to take that page away. Measured on
2026-10-19 against the built site (`nub run --filter docs build`):

| Probe | Result |
| ----- | ------ |
| `GET /docs/components/button.md` | `404` — the route does not exist |
| `GET /docs/getting-started.md` | `404` |
| built `/docs/components/button` HTML | no "Copy Markdown" control, no link to a Markdown representation |
| `apps/docs/src/routes/` | `docs/$.tsx` only; no Markdown route |

`llms-full.txt` is 700 KB+ (measured in `llms.test.ts`: < 10 MB), so it is not
what a reader copies for one component. The missing piece is Fumadocs'
documented **page actions** integration: a per-page `*.md` route plus the
"Copy Markdown" control, both built from the same `llms()` document the site
already produces.

Feasibility measured before this plan was written (probe route, reverted):
`src/routes/docs/{$}[.]md.ts` with `createFileRoute("/docs/{$}.md")` is
recognised by the installed TanStack Router generator — `routeTree.gen.ts` gains
`'/docs/{$}.md'` — so the upstream TanStack Start recipe applies to this app
unchanged.

## 2. What to build

### 2.1 One Markdown URL scheme

New file: `apps/docs/src/lib/page-markdown.ts`.

```ts
import { createGetUrl } from "fumadocs-core/source";

/** The docs base URL; the Markdown URL is this path plus the page's slugs. */
export const DOCS_ROUTE = "/docs";

const getDocsUrl = createGetUrl(DOCS_ROUTE);

/**
 * The Markdown URL for a page: the docs route with the last slug suffixed
 * `.md`, and `index.md` for the root page. The route
 * `src/routes/docs/{$}[.]md.ts` decodes it with `decodeMarkdownUrl`.
 */
export function getPageMarkdownUrl(page: { readonly slugs: ReadonlyArray<string> }) {
  const segments = [...page.slugs];
  if (segments.length === 0) segments.push("index.md");
  else segments[segments.length - 1] += ".md";
  return { segments, url: getDocsUrl(segments) };
}

/** The page slugs a `/docs/…​.md` request names. */
export function decodeMarkdownUrl(segments: ReadonlyArray<string>): string[] {
  if (segments.length === 0) return [];
  const out = [...segments];
  const last = out[out.length - 1];
  if (last !== undefined) out[out.length - 1] = last.replace(/\.md$/, "");
  if (out.length === 1 && out[0] === "index") out.pop();
  return out;
}
```

Both are pure; the round trip over every real page is a test (§4).

### 2.2 `llms.ts` owns the rendered page, and `docsLlms` serves it

File: `apps/docs/src/lib/llms.ts`.

Extract the current inline `renderPage` from `renderLlmsFull` into one exported
function, and build the Fumadocs `llms()` document from it:

```ts
import { llms } from "fumadocs-core/source";
import { SITE_URL, absoluteUrl } from "./site";
import { source } from "./source";

const absoluteLinks = (document: string): string =>
  document.replaceAll("](/", `](${SITE_URL}/`);

/** One page as the Markdown the site renders, for LLMs and page actions. */
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

export const renderLlmsIndex = (): Promise<string> =>
  Promise.resolve(absoluteLinks(docsLlms.index()));

export const renderLlmsFull = (): Promise<string> => docsLlms.full();
```

`renderLlmsIndex` and `renderLlmsFull` keep their exact public signatures, so
`src/routes/llms[.]txt.ts`, `src/routes/llms-full[.]txt.ts` and
`src/lib/llms.test.ts` are unchanged. The page type is
`InferPageType<typeof source>` — import it rather than restating the shape.

### 2.3 The route

New file: `apps/docs/src/routes/docs/{$}[.]md.ts` (literal braces and dot in the
file name, as upstream's TanStack Start recipe writes it).

```ts
import { createFileRoute, notFound } from "@tanstack/react-router";
import { docsLlms } from "@/lib/llms";
import { decodeMarkdownUrl } from "@/lib/page-markdown";
import { source } from "@/lib/source";

export const Route = createFileRoute("/docs/{$}.md")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = decodeMarkdownUrl(params._splat?.split("/") ?? []);
        const page = source.getPage(slugs);
        if (!page) throw notFound();

        return new Response(await docsLlms.page(page), {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        });
      },
    },
  },
});
```

`routeTree.gen.ts` is regenerated by the TanStack plugin; commit the regenerated
file.

### 2.4 The control on every page

File: `apps/docs/src/routes/docs/$.tsx`, inside `Content` between
`<DocsDescription>` and `<DocsBody>`:

```tsx
const markdownUrl = getPageMarkdownUrl(page).url;

<div className="flex flex-row items-center gap-2 border-b pb-6">
  <MarkdownCopyButton markdownUrl={markdownUrl} />
  <a
    href={markdownUrl}
    className="rounded-md border border-fd-border px-3 py-1.5 text-sm hover:bg-fd-accent"
  >
    View as Markdown
  </a>
</div>
```

`MarkdownCopyButton` is Fumadocs' own component
(`fumadocs-ui/layouts/docs/page`), so the copy path is the supported one. The
plain anchor is deliberate: `ViewOptionsPopover` bundles third-party AI links
(`Open in Scira AI`, `Open in ChatGPT`, …) and this site does not advertise
services it has not chosen. **No `githubUrl`**: measured 2026-10-19,
`github.com/Cyberistic/GPUIXUI/blob/master/apps/docs/content/docs/getting-started.mdx`
is `404` (the default branch carries a different docs tree), so a per-file GitHub
link would be a dead link, exactly the defect plan 578 removed.

### 2.5 The site documents the route

File: `apps/docs/content/docs/contributing.mdx`, `### Site output` table — add
one row:

| Route | What it serves | Source |
| ----- | -------------- | ------ |
| `/docs/<slug>.md` | one page as the Markdown the site renders, for a reader or an agent | `apps/docs/src/lib/page-markdown.ts` |

and one sentence naming the page control (`Copy Markdown` / `View as Markdown`)
and that the document is the same `llms()` render `llms-full.txt` uses.

File: `apps/docs/src/contributing-page.test.ts` — add
`["/docs/<slug>.md", "src/routes/docs/{$}[.]md.ts"]` to `routes`, so the route
module and the documented row cannot drift apart.

File: `apps/docs/README.md`, `## Machine discovery` — add the per-page route and
the control to the two existing bullets.

## 3. Order of work and commands

Run from `apps/docs` unless stated.

1. `src/lib/page-markdown.ts` + `src/lib/page-markdown.test.ts` (§4).
2. `src/lib/llms.ts` refactor.
   `nubx vitest run src/lib/llms.test.ts` → passes unchanged.
3. `src/routes/docs/{$}[.]md.ts`.
4. `src/routes/docs/$.tsx` control.
5. `nubx vite build` (regenerates `src/routeTree.gen.ts`; confirm the diff adds
   `'/docs/{$}.md'` and nothing else).
6. `nub run --filter docs check-types`.
7. `nub run --filter docs test`.
8. `contributing.mdx` + `contributing-page.test.ts` + `README.md`.
9. `nub run --filter docs smoke:build` (§4). It builds and serves the production
   worker; the `.md` URL, the control in the built HTML and every internal link
   are checked here.
10. `nub run --filter docs smoke:a11y`, `smoke:responsive`, `smoke:console`
    (the new control is on every page).
11. Root gates: `nub run check`, `nub run lint`, `nub run test`.

## 4. Test plan

**`src/lib/page-markdown.test.ts` (new, offline, can fail).**

| Test | Fails when |
| ---- | ---------- |
| `getPageMarkdownUrl` for `{ slugs: ["installation"] }` is `/docs/installation.md` | the suffix rule changes |
| for the root page (`slugs: []`) is `/docs/index.md` | the index rule is dropped |
| for `["components", "button"]` is `/docs/components/button.md` | the join drops a segment |
| `decodeMarkdownUrl(["components", "button.md"])` is `["components", "button"]` | the suffix strip is dropped |
| `decodeMarkdownUrl(["index.md"])` is `[]` | the index pop is dropped |
| every page in `source.getPages()` round-trips: `source.getPage(decodeMarkdownUrl(getPageMarkdownUrl(page).segments))` is that page | any page's URL scheme is wrong — the guard covers all ~98 pages |
| `renderPageMarkdown(page)` starts with `# <title>`, carries `Source: <absolute url>` and contains no `---\ntitle:` frontmatter | the route serves raw MDX or an empty document |
| `docsLlms.page(page)` equals the page's block in `docsLlms.full()` | the two documents diverge |

**`scripts/smoke-build.ts` (production, added checks).**

- `GET /docs/components/button.md` → `200`, `content-type` starts with
  `text/markdown`, body starts with `# Buttons`, body does not contain
  `---\ntitle:`.
- `GET /docs/nope.md` → `404`.
- the built `/docs/components/button` HTML contains `Copy Markdown` and
  `View as Markdown`, and the anchor's `href` is `/docs/components/button.md`
  (the existing internal-link audit then proves it answers < 400).

**Browser gates.** `smoke:a11y` (both schemes, 98+ pages) proves the two new
controls are named and contrast-checked; `smoke:responsive` proves the row does
not clip at 390 px; `smoke:console` proves the page still loads clean.

**Two-direction proofs (run, then revert):**

1. Delete the `decodeMarkdownUrl` suffix strip → the round-trip test fails.
2. Remove the route's `Content-Type` header → `smoke:build` fails on the type.
3. Remove the control from `$.tsx` → `smoke:build` fails on "Copy Markdown".
4. Drop the `contributing.mdx` row → `contributing-page.test.ts` fails.

## 5. STOP conditions

- Stop if `fumadocs-ui/layouts/docs/page` stops exporting `MarkdownCopyButton`;
  report the version and do not reimplement the clipboard path.
- Stop if the TanStack generator does not emit `/docs/{$}.md` for
  `src/routes/docs/{$}[.]md.ts`; report the generated tree instead of renaming
  routes until one works.
- Stop if `source.getPage([])` does not return the root page, or
  `page.data.getText("processed")` is unavailable; that means
  `includeProcessedMarkdown` is off and plan 525's premise changed.
- Stop if a page's Markdown URL would collide with a real page path (the sitemap
  is the check: no sitemap path may end in `.md`).
- `smoke:build` exit `2` is "unverified", never a pass.

## 6. Measured results

Implemented 2026-10-20 on `agent/docs-site`. State before: `docsLlms` was built
inline inside `renderLlmsFull`, there was no `/docs/<slug>.md` route and no
page control; `GET /docs/components/button.md` was `404`.

### 6.1 What shipped

| File | What it owns |
| ---- | ------------ |
| `apps/docs/src/lib/page-markdown.ts` | `getPageMarkdownUrl` / `decodeMarkdownUrl`: one URL scheme, pure |
| `apps/docs/src/lib/llms.ts` | `renderPageMarkdown` (the one page render), `docsLlms` built from it, the two existing entry points unchanged |
| `apps/docs/src/routes/docs/{$}[.]md.ts` | the per-page route: `text/markdown; charset=utf-8`, `# <title>` body, `404` for an unknown slug |
| `apps/docs/src/routes/docs/$.tsx` | the `Copy Markdown` button (`MarkdownCopyButton`) and the `View as Markdown` anchor, both addressing the page's `.md` URL |
| `apps/docs/scripts/smoke-build.ts` | fetches the route, its type and body, the `404`, and both controls in the built HTML |
| `apps/docs/content/docs/contributing.mdx`, `apps/docs/README.md` | the route and the control, on-site and in the maintainer ledger |
| `apps/docs/src/contributing-page.test.ts` | the documented row and the route module cannot drift apart |
| `apps/docs/src/lib/page-markdown.test.ts` | 11 tests, §4 |

The route carries `content-type: text/markdown; charset=utf-8` explicitly: without
it the framework answered `text/plain`, which is what proof 2 below measured.

The page document is the `llms()` render, so the served Markdown is the same
block `llms-full.txt` carries; `renderPageMarkdown` is the only renderer and both
`docsLlms.page` and `docsLlms.full` call it (`fumadocs-core` 16.17.3).

### 6.2 Commands run

| Command | Result |
| ------- | ------ |
| `nubx vitest run src/lib/page-markdown.test.ts src/lib/llms.test.ts` | 2 files / 16 tests pass |
| `nub run --filter docs check-types` | pass (app and `preview/` projects) |
| `nub run --filter docs test` | **109 files / 801 tests pass** |
| `nub run --filter docs smoke:build` | exit `0`; **99 pages**, 220 links, `smoke: page markdown checked` |
| `nub run --filter docs smoke:a11y` | exit `0`; **99 pages × 2 schemes, 0 violations** |
| `nub run --filter docs smoke:responsive` | exit `0`; 99 pages responsive checked |
| `nub run --filter docs smoke:console` | exit `0`; 99 pages, 0 console errors |

The first full `test` run failed the "serves the same document the full manual
carries" case with a 5 s timeout: rendering the 700 KB manual inside one test
while 109 workers start at once exceeds the default budget. The manual is now
rendered once at module scope, the way `llms.test.ts` already does, so the
assertion is unchanged and the suite is green (801 tests). This is the same
cold-budget finding plan 468 recorded.

### 6.3 Two-direction proofs (each run, then reverted)

| Proof | Measured failure |
| ----- | ---------------- |
| Drop `decodeMarkdownUrl`'s `.md` strip | `page-markdown.test.ts`: **3 failed** / 8 passed (decode, index fold, all-page round trip) |
| Drop the `contributing.mdx` route row | `contributing-page.test.ts`: **1 failed** / 4 passed (`page omits /docs/<slug>.md`) |
| Remove the route's `Content-Type` header | `smoke:build` exit `1`: `/docs/components/button.md: content-type text/plain;charset=UTF-8 is not text/markdown` |
| Remove the two controls from `$.tsx` | `smoke:build` exit `1`: `/docs/components/button: does not offer Copy Markdown, View as Markdown, href="/docs/components/button.md"` |

### 6.4 Limits

- The clipboard write itself is not driven by a gate: `MarkdownCopyButton` is
  Fumadocs' own control and the smoke proves the document it addresses. A Chrome
  clipboard-permission run would be a new gate, not a different assertion.
- No `githubUrl` / `ViewOptionsPopover`: measured before the plan, the GitHub
  blob URL for a page is `404` on the default branch, and the popover advertises
  third-party AI services this site has not chosen.

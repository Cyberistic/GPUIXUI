# 413 — per-page document metadata for the docs site

- **Workstream:** docs-site
- **Phase:** B (shell) — closes a gap left by plan 410
- **Owns:** `apps/docs/src/lib/page-meta.ts`, `apps/docs/src/routes/docs/$.tsx`,
  `apps/docs/src/lib/page-meta.test.ts`
- **Depends on:** 410 (the app shell, `src/lib/source.ts`)
- **Depended on by:** every documentation page (it is the page's `<title>`)

---

## 1. Goal

Every documentation page currently renders the **root** title — `GPUIXUI` — and
the root description, whatever page is open:

```
apps/docs/src/routes/__root.tsx   head: () => ({ meta: [{ title: "GPUIXUI" }, ...] })
apps/docs/src/routes/docs/$.tsx   (no `head`)
```

Plan 410 chose SSR over a client-only SPA precisely for "server-side search and
real HTML for SEO" (plan 410 §3). A site where all fifteen pages share one title
and one description does not deliver that: the browser tab, a search-engine
result, and a shared link all describe the same page.

This plan gives every docs page its own `<title>`, `description`, `og:title`,
`og:description` and `<link rel="canonical">`, taken from the page's real
frontmatter — never retyped.

## 2. How the page data reaches the head

TanStack Router merges `head()` output from the root match to the leaf match and
the **deepest match wins** for `title` and for each `name`/`property` attribute
(verified in `@tanstack/react-router@1.170.41`
`dist/esm/headContentUtils.js`: `buildTagsFromMatches` walks matches leaf-first
and keeps the first `title` and the first meta per attribute). `links` are
concatenated, so adding a canonical link next to the root's stylesheet is safe.

The docs route already has the page on the server (`source.getPage(slugs)`). The
plan therefore returns the page's metadata from the existing `serverLoader`
server function and builds the tags in `head`, rather than looking the page up a
second time (on the client) or hard-coding any text.

## 3. Files to change or create

```
apps/docs/src/lib/page-meta.ts            new — the pure page → head mapping
apps/docs/src/lib/page-meta.test.ts       new — the guard (see §6)
apps/docs/src/routes/docs/$.tsx           change — serverLoader returns `meta`; route gains `head`
```

`apps/docs/README.md` gains one sentence in "Adding a component page": a new page
inherits its title and description from its frontmatter.

## 4. The contract

`apps/docs/src/lib/page-meta.ts`:

```ts
/** A page as the Fumadocs loader exposes it: enough to build the head. */
export interface DocsPageLike {
  readonly url: string;
  readonly data: {
    readonly title?: string | undefined;   // see §9: optional in the type, required by the schema
    readonly description?: string | undefined;
  };
}

/** The metadata a page contributes to the document head. */
export interface DocsPageMeta {
  readonly title: string;
  readonly description: string | undefined;
  readonly url: string;
}

export const docsPageMeta = (page: DocsPageLike): DocsPageMeta => ...
export const docsPageTitle = (title: string): string => `${title} — GPUIXUI`

/** The `head()` payload: title, description, OpenGraph tags and canonical URL. */
export const docsPageHead = (meta: DocsPageMeta) => ({ meta: [...], links: [...] });
```

Title format: `` `${title} — GPUIXUI` `` (em dash, matching the site's existing
prose). `og:title` keeps the bare page title. A page without a description emits
**no** `description`/`og:description` meta rather than an empty one, so the root
description is not replaced by a blank string. A page without a title raises
`DocsPageTitleMissing` instead of borrowing the site title (§9).

No text is retyped: `docsPageMeta` reads the page, `docsPageHead` formats it, and
the route passes the record through the existing server loader.

## 5. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/docs-site`).

| Command | Expected | Result |
| --- | --- | --- |
| `nub run --filter docs check-types` | exit 0 | pass |
| `nub run --filter docs test` | the new suite passes with the existing ones | 39 tests, 8 files, pass |
| `nub run --filter docs build` | exit 0 | pass |
| `nub run --filter docs dev` + `curl /docs/installation` | the page's own title in the HTML | pass — see §9 |
| `nub run lint`, `nub run check`, `nub run test` | exit 0 | pass |

Two-direction proof (AGENTS §3), both required:

1. **Unit level.** Remove the `head:` option from the route: the wiring test
   fails (`1 failed | 38 passed`). Restore it: all pass (`8 files, 39 tests`).
2. **Runtime level.** With the dev server running, remove the `head:` option:
   `/docs/installation` returns `<title>GPUIXUI</title>` — the defect. Restore
   it: `<title>Installation — GPUIXUI</title>`. Recorded in §9.

## 6. Test plan — `apps/docs/src/lib/page-meta.test.ts`

| # | Assertion | The failure it catches |
| - | --------- | ---------------------- |
| 1 | `docsPageMeta` of the real `/docs/installation` page (from `source.getPage(["installation"])`) equals that page's `data.title`, `data.description` and `url` | a mapping that ignores the page and returns a constant |
| 2 | the head built from that real page contains `` `${title} — GPUIXUI` `` and the page's own description, and the canonical link is the page's `url` | a head that reuses the root title, drops the description, or emits the wrong canonical |
| 3 | the head built from a page without a description contains no `description` and no `og:description` entry | an empty description silently replacing the root's for pages that have none |
| 4 | `apps/docs/src/routes/docs/$.tsx` wires `head:` through `docsPageHead` (read the file, as `src/architecture.test.ts` already reads sources) | the feature existing but not being wired — the only regression a unit test cannot otherwise see |

Tests 1–3 use the real content tree, so renaming a page's frontmatter title is
visible in the test. Test 4 is a wiring guard and its header comment says so.

## 7. STOP conditions

- **`data.title` is optional in the installed Fumadocs types.** **Hit, resolved
  in §9**: a page without a title raises `DocsPageTitleMissing`; no title is ever
  fabricated from the URL, and the runtime guarantee is recorded with its
  evidence.
- **The route's `head` cannot see `loaderData`** (a different TanStack Router
  major than the one verified in §2). Stop and report the installed version and
  the type error; do not fetch the page again on the client.
- **Anything would need a site-wide absolute URL** (for an absolute canonical or
  `og:url`). The domain lives in `packages/deploy/alchemy.run.docs.ts`, which is
  outside this workstream. Keep the canonical relative and record the task
  (recorded in `TODO.md`).
- A gate fails for a reason outside this workstream. Report the failing
  workspace and leave it untouched.

## 8. Acceptance criteria

- [x] A docs page's `<title>` is its own frontmatter title plus the site name.
- [x] A docs page's description, `og:title`, `og:description` and canonical link
      come from the page, not from a constant.
- [x] A page without a description emits no empty description meta.
- [x] `page-meta.test.ts` proves the mapping from the real content tree and the
      route wiring; the wiring guard has been shown to fail in both directions.
- [x] `nub run check`, `nub run lint`, `nub run test` pass.
- [x] The docs rows in `TODO.md` and the plans index are current; committed on
      `agent/docs-site`.

## 9. Findings and verification

**Finding — `PageData.title` is optional.** `fumadocs-core@16.17.3` declares
`interface PageData { title?: string | undefined; ... }`
(`dist/index-CzLpE50a.d.ts:404`), and `fumadocs-mdx@15.4.7`'s
`MacroDocsCollection<Frontmatter extends PageData = PageData>` only ever requires
`extends PageData`, so no loader type can prove a title
(`dist/runtime/macro.d.ts`). The frontmatter schema, however, requires one:
`frontmatterSchema = { title: ZodString, description: ZodOptional<ZodString>, ... }`
(`dist/index-DosG5f9I.d.ts:10`), which `fumadocs-mdx` validates MDX frontmatter
against at build time.

Resolution: the type is loosened at this boundary (`DocsPageLike.data.title?`),
checked once in `requireTitle`, and a violation raises `DocsPageTitleMissing`
with the page's URL. Nothing is fabricated. The failure is unreachable for
content that built, which is why the guard is a `throw` in a browser-app
boundary module (the same deliberate exception as `captures.ts`: `effect` must
not enter the client bundle, so `Option`/`Effect.fail` are not available here).

**Verification — dev server, both directions.** `nub run --filter docs dev`, then:

```
head: removed     GET /docs/installation → <title>GPUIXUI</title>
head: restored    GET /docs/installation → <title>Installation — GPUIXUI</title>
                  <meta name="description" content="Add GPUIXUI to a GPUix application."/>
                  <meta property="og:title" content="Installation"/>
                  <link rel="canonical" href="/docs/installation"/>
                  GET /docs/theming       → <title>Theming — GPUIXUI</title>
```

Unit level: the wiring guard fails with `head:` removed (`1 failed | 38 passed`)
and passes with it (`8 files, 39 tests`). `check-types`, `build`, `lint`, `check`
and `test` all pass.

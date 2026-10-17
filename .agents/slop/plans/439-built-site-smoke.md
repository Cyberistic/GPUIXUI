# 439 — Built-site smoke check: crawl the production build, not the source tree

**Phase:** G (release readiness, docs half) · **Owner:** docs-site
**Depends on:** 410 (the site), 418 (sitemap/robots), 426 (prose truth)

## 1. Why this plan exists

Every docs guard today reads the **source tree** (`content.test.ts` parses MDX,
`internal-links.test.ts` resolves literal links, `content-references.test.ts`
checks includes). None of them render the app. A page can therefore pass all
184 tests and still fail in production:

- a server-render error (`window` at module scope, a bad `use()` boundary) makes
  a route return 500 while the build succeeds;
- a Fumadocs layout change can drop the `<h1>`, the `<main>` landmark or the
  canonical link without touching MDX;
- the sitemap/robots routes can disagree with the real route table;
- `/api/search` can answer in dev and fail in the built worker;
- an unknown `/docs/*` slug can return 200 with an empty shell instead of 404.

The manual check that proved the site during plan 438 was a throwaway script.
This plan makes it a committed, re-runnable gate with a real failure mode.

## 2. What to build

One script: `apps/docs/scripts/smoke-build.ts`, run as
`nub run --filter docs smoke:build`.

By default it:

1. runs `nub run --filter docs build` (13 s on this host — acceptable for a
   smoke gate, not for the unit suite);
2. starts `vite preview` on a free loopback port, waits until `/` answers;
3. crawls the built site (checks in §3);
4. always terminates the preview process (including on failure);
5. exits `0` (pass), `1` (the site is broken) or `2` (could not verify — build
   or preview failed to start).

`--base-url <url>` skips steps 1–2 and crawls an already-running server, for
iteration. `--no-build` starts the preview against the existing `dist`.

Exit `2` deliberately mirrors the native smoke suite's "unverified" convention
(plan 020): a machine that cannot run the check must not report a pass.

## 3. Checks (each one can fail)

Every failure is printed as `<where>: <what>` and the exit code is `1`.

### 3a. Sitemap

- `GET /sitemap.xml` is `200` and `application/xml` (or `text/xml`);
- it contains at least one `<loc>`;
- every `<loc>` is an absolute URL; the check crawls its **pathname**, so a
  preview port or a non-default `VITE_SITE_URL` still passes;
- `/docs/components/button` and `/docs/api-reference` are present (two real
  pages; the check is not allowed to pass on an empty sitemap).

### 3b. Every sitemap page

For each sitemap path:

- status is `200`;
- `<title>` is non-empty;
- exactly one `<h1>`;
- exactly one `<main>` landmark;
- `<html lang="en">`;
- `<link rel="canonical" href="…">` exists, is absolute and its **pathname**
  equals the page path (host comparison is skipped so `VITE_SITE_URL` previews
  still pass).

### 3c. Every internal link and asset

Collect `href="/…"` and `src="/…"` from every crawled page, strip query and
fragment, dedupe, and request each one. A page link must return `200`; an asset
may return `200` after a redirect. Ignore `mailto:`, `tel:`, protocol-relative
and external URLs.

### 3d. Search, built

- `GET /api/search?query=button` is `200` JSON, and one result has
  `url === "/docs/components/button"`;
- `GET /api/search` (no query) is `200` and `[]`;
- `GET /api/search?query=` is `200` and `[]`.

### 3e. Not found

- `GET /docs/this-page-does-not-exist` returns `404`.

### 3f. Robots

- `GET /robots.txt` is `200` and contains a `Sitemap:` line with an absolute URL.

## 4. Files

| File | Change |
| ---- | ------ |
| `apps/docs/scripts/smoke-build.ts` | **new** — the crawl described above. Node 24 `fetch`; `node:child_process` / `node:net` only for the preview lifecycle. No new dependency. |
| `apps/docs/package.json` | add `"smoke:build": "nub scripts/smoke-build.ts"` to `scripts` |
| `apps/docs/tsconfig.json` | add `"scripts/**/*.ts"` to `include`, so the script is type-checked |
| `apps/docs/README.md` | one command section: what it checks, the exit codes, `--base-url` |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | tick the docs-site row and note the verification |

Do not add the script to `vitest` or to the root `check`: it builds for 13 s and
starts a server, and the default suite must stay fast on a bare checkout. It is
a release/verification command, like `test:runtime` in the packages.

## 5. Commands and expected results

```sh
nub run --filter docs check-types
# exit 0 — the script is in the type-check set

nub run --filter docs test
# exit 0 — existing 184 tests unchanged

nub run --filter docs smoke:build
# build, preview on a free port, then:
#   sitemap: N pages
#   pages: N ok (title, h1, main, lang, canonical)
#   links: N resolved
#   search: query + empty ok
#   not-found: 404 ok
#   robots: ok
# exit 0
```

### Two-direction proof (required before calling it done)

1. With the check green, temporarily delete the `canonical` link from one page's
   metadata path (or rename one `<loc>` target) and re-run `smoke:build`:
   it must print the offending path and exit `1`.
2. Restore the change; re-run: exit `0`.
3. Record both commands and the exact failing line in §8 of this plan.

Do **not** fake the second direction by passing `--base-url` at a dead port:
that only proves the harness exits `2`.

## 6. STOP conditions

- `vite preview` cannot serve the Cloudflare worker in this environment (no
  workerd, missing credentials): stop and record the error and the exact command
  in §8. Do not rewrite the check against `vite dev` and call it build
  validation — dev and build differ, which is the whole point.
- The server needs more than 30 s to answer on this host: raise the timeout to
  60 s, record the measurement; do not remove the readiness wait.
- A check in §3 fails for a real site defect: fix the page or the route in the
  same commit, with the failing output in the plan. Do not weaken the check to
  go green.
- Adding a dependency (a DOM parser, Playwright) is **not** authorised; the HTML
  is generated by our own app, so the minimal regexes in §3 are enough. If that
  proves false, stop and report rather than adding a browser.

## 7. Acceptance

- [ ] `nub run --filter docs smoke:build` exits `0` on this host and prints the
      counts.
- [ ] It exits `1` with the offending path when one page's canonical is removed
      (evidence in §8).
- [ ] It exits `2` when the build fails (e.g. a deliberate type error), and never
      reports a pass.
- [ ] `nub run check`, `nub run lint`, `nub run test` still pass.
- [ ] README, plan index and `TODO.md` updated.

## 8. Evidence

Measured on this host, 2026-10-17.

### Green run

```sh
$ nub apps/docs/scripts/smoke-build.ts
smoke: building apps/docs
smoke: sitemap 66 pages
smoke: pages 66 checked
smoke: links 85 checked
smoke: search checked
smoke: not-found checked
smoke: robots checked
smoke: ok            # exit 0
```

### The check failed on the site first — and found a real defect

The first run, before any page was changed:

```text
FAIL /: expected one <main>, found 2
FAIL /docs/this-page-does-not-exist: expected one <main>, found 2
```

`Landing` and `NotFound` each rendered their own `<main>` **inside**
`HomeLayout`'s `<main id="nd-home-layout">`, so `/` and every 404 shipped two
page landmarks. Both bodies now render a `<div>`; `HomeLayout` owns the single
landmark. The regression is guarded twice: the smoke checks the rendered page,
and `landing.test.tsx` / `not-found.test.tsx` assert the body opens no
landmark, so the default suite can fail without starting a server.

### Both directions

Broken canonical (temporarily `absoluteUrl("/bogus")` in
`src/lib/page-meta.ts`), rebuilt:

```text
FAIL /docs: canonical /bogus, expected /docs
exit 1
```

Restored:

```text
smoke: ok            # exit 0
```

Unreachable server (`--base-url http://127.0.0.1:1`):

```text
smoke: not verified — cannot reach http://127.0.0.1:1/sitemap.xml
exit 2
```

### Commands that must stay green

```sh
nub run --filter docs check-types   # exit 0 (the script is in the tsconfig include)
nub run --filter docs test          # 33 files / 187 tests, exit 0
nub run check                       # exit 0
```

The `nub run --filter docs smoke:build -- --base-url …` form passes the literal
`--` through to the script (exit `2`, unknown argument); use the direct
`nub apps/docs/scripts/smoke-build.ts --base-url …` form documented in the
README.


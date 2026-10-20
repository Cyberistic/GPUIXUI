# 619 — Security and privacy have a page

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 413, 419, 431, 568, 598, 603, 609, 617, 618

## 1. Why this plan exists

`MISSION.md` requires honest documentation of what the library is and is not.
The site answers installation, capabilities, performance, deployment and
licensing, but not the question a consumer or an operator asks before any of
them: **what does this code do with my machine and my data?**

Measured 2026-10-20 at `43d7b676`, through the real index (`search(query, 3)`):

| Query | First result |
| ----- | ------------ |
| `security` | *(nothing)* |
| `privacy` | *(nothing)* |
| `telemetry` | *(nothing)* |
| `cookies` | *(nothing)* |
| `vulnerability` | *(nothing)* |
| `gdpr` | *(nothing)* |
| `sandbox` | *(nothing)* |
| `analytics` | `/docs/site-search#what-search-does-not-do` |
| `data collection` | `/docs/data-display` |
| `security policy` | `/docs/components/timeline#accessibility-and-limitations` |
| `report a vulnerability` | `/docs/native-testing#what-it-does-not-prove` |
| `remote code` | `/docs/components/mention-input#accessibility-and-limitations` |
| `network` | `/docs/performance#what-is-not-measured` |
| `tracking` | `/docs/styling` — **correct**; it is the Styling page's letter-spacing alias (plan 608) |

The repository facts the page will state, measured the same day:

```sh
grep -rnE "\bfetch\(|XMLHttpRequest|WebSocket|EventSource" \
  packages/{tokens,primitives,components,icons}/src          # only SVG xmlns attributes
grep -rnE "localStorage|sessionStorage|indexedDB|document\.cookie" \
  packages/{tokens,primitives,components,icons}/src          # no matches
grep -rnE "\beval\(|new Function|dangerouslySetInnerHTML|innerHTML" \
  packages/{tokens,primitives,components,icons}/src          # no matches
grep -rniE "gtag|googletagmanager|plausible|umami|posthog|segment|sentry|mixpanel|matomo|hotjar" \
  apps/docs/src apps/docs/package.json                       # no matches
ls SECURITY.md .github/SECURITY.md                           # neither exists
```

The only runtime requests in the docs app are the same-origin `/api/search`
query and a `HEAD` for the live-preview bundle in
`src/components/preview/live-surface.tsx`; the only storage the app's own code
writes is `gpuixui:platform` (`src/platform/platform.ts`) plus the docs
provider's colour mode. This is a real subject with real evidence, not a
placeholder page.

## 2. The decision

1. **One page owns the subject: `/docs/security`, titled "Security and
   privacy".** It states the library's behaviour, the native trust boundary,
   what this site stores and sends, how to report a vulnerability, and what is
   not verified. It sits after Troubleshooting, because a reader arrives from a
   failure or before an install, and before Theming.
2. **Every claim is derived from the repository, in both directions.** The new
   guard computes the facts (no network calls, no storage, no dynamic code, no
   analytics, the two request sites, the iframe sandbox, the platform storage
   key, the absence of a security policy) and requires the page to state them.
   A claim that stops being true fails by name; a page section that is removed
   fails by name.
3. **The page does not overclaim.** It says the library has no sandbox between
   itself and the host application (a native process is not a browser origin),
   that no dependency audit/SBOM/fuzzing/penetration test is committed, and that
   no private vulnerability channel exists. It does not say "secure", "audited"
   or "sandboxed".
4. **Exact aliases route the question forms.** The page-alias table (plan 598)
   gains the measured terms. `tracking` is deliberately **not** added: Styling
   owns it as the letter-spacing alias. `data collection` moves from Data
   display, which only matched its two words; the privacy subject is the owner.

## 3. Files

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/619-security-and-privacy.md` | this plan |
| `apps/docs/content/docs/security.mdx` | the page |
| `apps/docs/src/security-page.test.ts` | the both-direction guard over the repository, the app sources and the page |

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/meta.json` | `"security"` after `"troubleshooting"` |
| `apps/docs/src/lib/page-aliases.ts` | the `/docs/security` block |
| `apps/docs/src/lib/page-aliases.test.ts` | one `owned` row per term and a `tracking` regression row |
| `apps/docs/scripts/smoke-build.ts` | two production search checks |
| `apps/docs/README.md` | a short paragraph beside the licence note |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | tick the docs-site task; progress fraction |

Nothing outside `apps/docs/`, `TODO.md` and the plan index is edited. No
package source changes: the guard reports the library's current behaviour, it
does not add a security feature.

## 4. The page

`apps/docs/content/docs/security.mdx`, exact content. The guard reads these
sentences, so do not paraphrase them.

```mdx
---
title: Security and privacy
description: "What the library and this site do with your data: no telemetry, analytics or cookies, no network calls in the library, the native trust boundary, and the security work still owed."
---

The library is native code that ships into your application; this site is a
separate documentation app. They have different trust boundaries, and neither
sends telemetry.

## The library

`@gpuixui/tokens`, `@gpuixui/primitives`, `@gpuixui/components` and
`@gpuixui/icons` are source you compile into your own binary. In the shipped
sources they:

- **make no network requests** — no `fetch`, `XMLHttpRequest`, `WebSocket` or
  `EventSource`;
- **write nothing to storage** — no `localStorage`, `sessionStorage`,
  `indexedDB` or `document.cookie`;
- **run no remote or dynamic code** — no `eval`, no `new Function`, and no
  `innerHTML` or `dangerouslySetInnerHTML`.

There is no analytics client, no crash reporter and no update check. Components
read the theme you provide and call the handlers you pass; what your application
does with a value is your application's decision.

## The native trust boundary

GPUix draws the interface inside your process, not in a web view or an iframe.
There is no sandbox between the library and the rest of your application, and no
browser origin boundary to rely on: a component can read the state you give it
and call the handlers you pass, and that is the whole surface. Files, network
access, secrets and process privileges are the application's responsibility, not
the library's.

Run untrusted content outside the process. [Architecture](/docs/architecture)
names the renderer boundary, and [Styling](/docs/styling) records what the
runtime supports.

## This site

The documentation site has no accounts, no analytics and no advertising. Its own
code sets no cookies. It stores two preferences in your browser's
`localStorage`: the colour mode the theme switch uses, and `gpuixui:platform`
for the platform style. Both are UI state; neither is sent anywhere.

Two requests leave the page:

- a search query goes to this site's own `/api/search`, which reads the built
  index and stores nothing about the query ([Site search](/docs/site-search));
- pressing **Load live preview** sends a `HEAD` request for the same-origin
  preview bundle, then loads it in an iframe with
  `sandbox="allow-scripts allow-same-origin"`. It is a ~20 MB WebAssembly build
  served from this site, not a third party, and it loads only when you ask.

There are no third-party embeds, fonts or scripts. [Deployment](/docs/deployment)
names the host.

## Reporting a vulnerability

No security policy is committed: there is no `SECURITY.md` and no private
disclosure channel. Report a suspected vulnerability through the repository's
issue tracker
([Contributing](/docs/contributing#issues-and-pull-requests)) and do not include
secrets, tokens or personal data in the report. Until a policy exists, do not
assume a private channel.

## What is not verified

No dependency audit, software bill of materials, fuzzing run or penetration test
is committed. The browser gates (`smoke:a11y`, `smoke:console`, the responsive
and keyboard smokes) test behaviour and accessibility, not security. The
[License](/docs/license) page owns the library's licensing status, which is a
separate question.

## Related

- [Architecture](/docs/architecture) — what runs where.
- [Troubleshooting](/docs/troubleshooting) — the failures readers hit.
- [Contributing](/docs/contributing) — issues, tests and the gates.
- [License](/docs/license) — the library's licence status.
```

## 5. The aliases

Append to `apps/docs/src/lib/page-aliases.ts`:

```ts
[
  "/docs/security",
  [
    "security",
    "privacy",
    "telemetry",
    "analytics",
    "cookies",
    "data collection",
    "vulnerability",
    "vulnerabilities",
    "security policy",
    "report a vulnerability",
    "report vulnerabilities",
    "gdpr",
    "sandbox",
    "sandboxing",
    "remote code",
    "network requests",
    "network access",
    "tracking cookies",
    "browser tracking",
  ],
],
```

Rules the existing guard enforces: lower-case, one page per term, no term equal
to a page title or a component title/name/alias. Do not add `tracking` (Styling
owns letter spacing), `support`/`help` (Troubleshooting), `license` (License) or
`safe` (too generic to own).

## 6. The guards

### 6.1 `apps/docs/src/security-page.test.ts`

Read the page and the repository. `node:fs`/`node:path` are deliberate, exactly
as in `license-page.test.ts`: the tests run in Node and the Effect runtime must
not reach the browser bundle.

1. **Library source scans.** Walk `packages/{tokens,primitives,components,icons}/src`
   recursively for `.ts`/`.tsx` files, skipping `*.test.ts`/`*.test.tsx`
   (behaviour suites under `src/behaviour/` are tests, not shipped code), and
   collect matches for:
   - `/\bfetch\s*\(|XMLHttpRequest|new WebSocket|EventSource/`
   - `/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|document\.cookie/`
   - `/\beval\s*\(|new Function\s*\(|dangerouslySetInnerHTML|\.innerHTML\s*=/`

   Assert each list is empty **and** the page carries the matching sentence
   (`make no network requests`, `write nothing to storage`,
   `run no remote or dynamic code`). Both directions: adding a `fetch` fails the
   empty list; deleting the sentence fails the text.
2. **No analytics in the docs app.** Assert `apps/docs/package.json` declares
   none of `@vercel/analytics`, `@sentry/*`, `posthog-js`, `plausible-tracker`,
   `react-ga`, `mixpanel-browser`, `matomo`, `hotjar`; scan
   `apps/docs/src/**/*.{ts,tsx}` (excluding tests) for the vendor hosts/globals
   (`gtag`, `googletagmanager`, `plausible`, `umami`, `posthog`, `segment`,
   `sentry`, `mixpanel`, `matomo`, `hotjar`). Assert both empty and the page says
   `no analytics`.
3. **The only runtime requests.** Collect every file under `apps/docs/src`
   (excluding tests) containing `fetch(`. Assert the set is exactly
   `["apps/docs/src/components/preview/live-surface.tsx"]`, that the call is a
   `HEAD` for `src`, that `src/routes/api/search.ts` serves `/api/search`, and
   that the page names both `/api/search` and the `HEAD`.
4. **The iframe sandbox.** Assert `live-surface.tsx` carries
   `sandbox="allow-scripts allow-same-origin"` and the page names the same
   attribute value.
5. **Storage.** Import `PLATFORM_STORAGE_KEY` from `@/platform/platform` and
   assert it is `gpuixui:platform` and the page names it. Assert no
   `document.cookie` in `apps/docs/src` (excluding tests) and the page says the
   site's own code sets no cookies.
6. **The policy, both directions.** `policyPaths = ["SECURITY.md",
   ".github/SECURITY.md", "docs/SECURITY.md"]`. If none exists the page must say
   `No security policy is committed`; if one exists the page must name its path
   and must not carry that sentence. This mirrors plan 617's licence status
   guard.
7. **The sidebar.** Assert `meta.json` orders `security` directly after
   `troubleshooting`.

The suite must fail if any claim is removed from the page or becomes false in
the repository; record those runs in §8.

### 6.2 `page-aliases.test.ts`

One `owned` row per term in §5, and one regression row:

```ts
["tracking", "/docs/styling"],
```

because `tracking` is the letter-spacing alias and must not be stolen.

### 6.3 `smoke:build`

Add three production checks beside the licence ones (`security` and
`telemetry` also match the title and summary, so `gdpr` guards the alias path
that has no other match):

```ts
{
  query: "security",
  expected: "/docs/security",
  first: true,
  what: "the security page readers ask for before installing",
},
{
  query: "telemetry",
  expected: "/docs/security",
  first: true,
  what: "the telemetry question the page now answers",
},
{
  query: "gdpr",
  expected: "/docs/security",
  first: true,
  what: "an alias-only trust term with no title or summary match",
},
```

## 7. Commands and expected results

From `apps/docs`:

```sh
nub exec vitest run src/security-page.test.ts
# pre-fix (guard present, page absent): the page read throws ENOENT — create the
#   page, then the first run fails on the missing sentences; post-fix: all pass
nub exec vitest run src/lib/page-aliases.test.ts
# pre-fix: one failing owned row per new term; post-fix: all pass
```

From the workspace root:

```sh
nub run --filter docs test          # exit 0 — 126 files / 1 295 tests
nub run --filter docs check-types   # exit 0
nub run --filter docs smoke:build   # exit 0 — 107 pages, 235 links, 1 375 anchors, search ok
nub run check                       # exit 0
nub run lint                        # exit 0
```

No browser smoke is needed: the change adds one static page and no rendered
control or live scene. The next cross-cutting docs change runs `smoke:a11y`
over it (the page is plain prose and lists).

## 8. Two-direction proofs

Record each run here after implementation; a proof that was not run is not a
pass. All five were run on 2026-10-20.

1. **Deleting a claim fails the text assertion.** Replaced
   `**make no network requests**` with `**make no outbound requests**`:
   `security-page.test.ts` failed at line 150 with
   `expected … to contain "make no network requests"`; the page was restored.
2. **A new network call fails the empty scan and names the file.** Added
   `packages/icons/src/__security-proof.ts` containing
   `fetch("https://example.com")`: the first test failed with the received list
   `+ "packages/icons/src/__security-proof.ts"` (10 passed, 1 failed); the file
   was removed.
3. **An alias-only term proves the table.** Removing the `security` entry from
   the `/docs/security` block did **not** fail, and that is correct: the page's
   own title and summary contain the word, so the ranker still returns it
   (measured — 325 passed). Removing `gdpr` instead failed the owned row
   (`expected undefined to be '/docs/security'`, 324 passed / 1 failed); the
   block was restored. §6.3's `gdpr` production query is the same alias-only
   path.
4. **A term cannot name two pages.** Adding `tracking` to the security block
   failed `uses a term for one page only` with `expected [ 'tracking' ] to
   deeply equal []`; the block was restored.
5. **A committed policy flips the guard.** A temporary root `SECURITY.md` failed
   `states the policy absence until a policy is committed` (10 passed, 1
   failed); it was removed and the suite passed again (11/11).

## 9. STOP conditions

- Stop if a `SECURITY.md` (or `.github/SECURITY.md`, `docs/SECURITY.md`) already
  exists: the premise changed. Name it on the page and rewrite §2/§4 instead of
  claiming absence.
- Stop if any library source already makes a network request, writes storage or
  uses dynamic code. The page cannot claim otherwise; report the file and adjust
  the claims to the measured reality rather than deleting the guard.
- Stop if the app already declares an analytics/tracking dependency. Report it
  and rewrite the "This site" section; do not remove the dependency in this
  plan (that is a product decision).
- Stop if a proposed alias shadows a page title or a component name, or is
  already owned by another page: the alias guard names it. Drop the term; do not
  weaken the shadow rules.
- Stop if `smoke:build` is not green for a reason unrelated to this change
  (exit `2` = unverified, never a pass).
- Do not claim the library is "secure", "audited" or "sandboxed"; do not add a
  `SECURITY.md`; do not edit `LICENSES/`.

## 10. Acceptance

- `/docs/security` answers "what do you do with my data?" for both the library
  and the site, and states the native trust boundary and the unverified work.
- The guard reads the repository in both directions: every claim fails when it
  becomes false, and the page fails when a claim is removed.
- `security`, `privacy`, `telemetry`, `analytics`, `cookies`, `data collection`,
  `vulnerability`, `security policy`, `report a vulnerability`, `gdpr`,
  `sandbox` and `remote code` reach `/docs/security` first; `tracking` keeps
  Styling.
- The page is in the sidebar after Troubleshooting, in the sitemap, and three
  queries are proved against the production index.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`
  and `nub run lint` pass; the exact counts and the five proofs are recorded in
  §8.

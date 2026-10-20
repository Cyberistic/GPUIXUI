# 620 — Operational vocabulary reaches its owner

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410, 413, 419, 431, 568, 594, 598, 599, 603, 609, 612, 617, 619

## 1. Why this plan exists

Plans 566–619 closed the reader-vocabulary gaps they measured. This is the next
sweep, run 2026-10-20 at `63106d82` against the production index
(`/api/search?query=…` on a built preview):

| Query | First result | What the reader wanted |
| ----- | ------------ | ---------------------- |
| `code of conduct` | `/docs/components/text#variants` | whether the project has one |
| `coc` | `/docs/roadmap` | the same question, abbreviated |
| `changelog` | *(nothing)* | what changed between versions |
| `release notes` | `/docs/license#still-owed-before-release` | the same question |
| `releases` | `/docs/component-api#shared-host-props` | the same question |
| `upgrade` | `/docs/capabilities#where-the-verdicts-come-from` | how to move to a newer version |
| `breaking changes` | `/docs/porting-from-shadcn#what-changes-in-the-code` | what a release would break |
| `faq` | `/docs/components/accordion#composition` | a starting point for common questions |
| `frequently asked questions` | `/docs/native-testing#run-it` | the same question |
| `command line` | `/docs/components/command-menu` | the commands a contributor runs |
| `command-line` | `/docs/components/command-menu#accessibility-and-limitations` | the same question |
| `environment variables` | `/docs/porting-from-shadcn` | the site's own `VITE_SITE_URL` |
| `env var` / `env vars` | `/docs/components/button#variants` / `/docs/roadmap` | the same question |
| `site url` | `/docs/site-search` | the same question |
| `offline` / `offline access` | `/docs/components/avatar#variants` / `/docs/accessibility` | whether the site works offline |

The repository facts the new prose states, measured the same day:

```sh
ls CHANGELOG.md packages/*/CHANGELOG.md   # none exists
ls CODE_OF_CONDUCT.md .github/CODE_OF_CONDUCT.md docs/CODE_OF_CONDUCT.md  # none exists
git tag                                   # no tags: nothing has been released
grep -n '"version"\|"private"' packages/*/package.json
# every package is "version": "0.0.0", "private": true
grep -n VITE_SITE_URL apps/docs/src/lib/site.ts
# src/lib/site.ts:15 reads import.meta.env?.VITE_SITE_URL
```

So this is not a keyword table with nothing behind it. Four pages already own
the answers and only fail to be *named* that way:

- **Installation** states that nothing is published and that GPUix is pre-1.0
  and can break between releases. It does not use the words a reader searches
  for.
- **Contributing** states that the site has no service worker, so no PWA or
  offline claim (plan 594). It has no code-of-conduct section.
- **Deployment** documents `VITE_SITE_URL` for self-hosting.
- **Introduction** is the site's starting point and has no quick-answer list.

## 2. The decision

1. **Releases and versioning are Installation's subject.** It already owns the
   pinned version table and the "not published yet" statement; a
   `## Releases and versioning` section says there is no changelog or upgrade
   guide because nothing has been released, so `changelog`, `release notes`,
   `releases`, `upgrade` and `breaking changes` reach the page that owns the
   version contract.
2. **Conduct, offline and commands are Contributing's subjects.** A
   `## Code of conduct` section states the absence until a policy is committed
   (the same both-direction pattern as the licence and security-policy guards);
   the existing `### Site output` paragraph already answers offline, and the
   `## Gates` command list already answers the command line.
3. **`VITE_SITE_URL` is Deployment's subject.** The page already documents it;
   the aliases make the environment-variable question reach it.
4. **The Introduction gains a real quick-answer list.** Six questions, each a
   link to the page that owns the answer. This is a navigation hub, not a
   duplicate of those pages, and `faq` becomes honest.
5. **A new guard reads the repository in both directions.**
   `src/operational-docs.test.ts` fails when a changelog or code of conduct is
   committed without the page naming it, and fails when the page claims an
   absence that no longer holds. It also proves every FAQ link resolves to a
   real page and that the env-var name is the one `site.ts` reads.

## 3. Files

### Create

| File | Responsibility |
| ---- | -------------- |
| `.agents/slop/plans/620-operational-vocabulary.md` | this plan |
| `apps/docs/src/operational-docs.test.ts` | the both-direction guard over the repository, `site.ts` and the four pages |

### Change

| File | Change |
| ---- | ------ |
| `apps/docs/content/docs/installation.mdx` | `## Releases and versioning` after `## Packages are not published yet` |
| `apps/docs/content/docs/contributing.mdx` | `## Code of conduct` after `## Issues and pull requests` |
| `apps/docs/content/docs/index.mdx` | `## Frequently asked questions` after `## Where to start` |
| `apps/docs/src/lib/page-aliases.ts` | four existing blocks gain the operational terms, plus a new `/docs` block for `faq` |
| `apps/docs/src/lib/page-aliases.test.ts` | one `owned` row per term plus four regression rows |
| `apps/docs/scripts/smoke-build.ts` | four production search checks |
| `apps/docs/README.md` | one paragraph naming the guard |
| `.agents/slop/plans/README.md` | this plan's row |
| `TODO.md` | the workstream task and progress fraction |

No package source changes. Nothing outside `apps/docs/`, `TODO.md` and the plan
index is edited.

## 4. The page sections

### 4.1 `installation.mdx` — after `## Packages are not published yet`

```mdx
## Releases and versioning

Nothing here has been released: there is **no changelog**, no upgrade guide and
no versioning policy to consult, because every package is still `0.0.0` and
private to this repository. The pinned versions in the table above are the only
contract the project states today.

When the first release lands, its notes belong here beside that table. Until
then, upgrading means updating the workspace and re-running
`nub run check-types`: GPUix is pre-1.0, so a newer `@gpuix/react` can require a
newer adapter even when the component API has not changed.
```

### 4.2 `contributing.mdx` — after `## Issues and pull requests`

```mdx
## Code of conduct

No code of conduct is committed. Until one is, the repository's issue tracker
([Issues and pull requests](#issues-and-pull-requests)) is the only channel for
conduct concerns, and it is public: do not include personal or sensitive details
in a report.
```

### 4.3 `index.mdx` — after `## Where to start`

```mdx
## Frequently asked questions

- **Is it finished?** No. [Status](/docs/roadmap) lists what is implemented,
  what is planned and what is blocked.
- **Does it run on my machine?** [Installation](/docs/installation#native-bindings)
  names the three published native targets and the Intel macOS remedy.
- **Is it a web UI library?** No — there is no web view.
  [Porting from shadcn/ui](/docs/porting-from-shadcn#not-a-web-ui-library)
  answers the framework question from the renderer boundary.
- **Is it free?** [License](/docs/license) records the library's own licensing
  status and what is still owed.
- **Does it collect data?** No telemetry, analytics or cookies.
  [Security and privacy](/docs/security) states both trust boundaries.
```

## 5. The aliases

Append to the existing page blocks, and add one `/docs` block.

`/docs/installation` gains:

```ts
"changelog",
"change log",
"release notes",
"releases",
"upgrade",
"upgrading",
"breaking changes",
```

`/docs/contributing` gains:

```ts
"code of conduct",
"coc",
"command line",
"command-line",
"offline",
"offline access",
"service worker",
"service workers",
```

`/docs/deployment` gains:

```ts
"environment variable",
"environment variables",
"env var",
"env vars",
"site url",
```

`/docs` (Introduction) gains a new block:

```ts
"faq",
"frequently asked questions",
```

Rules the existing guard enforces: lower-case, one page per term, and no term
equal to a page title or a component title/name/alias. `versioning` already
reaches Installation through the ranker, so it is added as an `owned` row but
not as an alias.

## 6. The guards

### 6.1 `src/operational-docs.test.ts`

`node:fs`/`node:path` are deliberate, as in `license-page.test.ts`,
`security-page.test.ts` and `contributing-page.test.ts`: the tests run in Node
and the Effect runtime must not reach the browser bundle. The page URLs come
from `src/lib/source.ts`, as in the other content guards.

1. **The changelog, both directions.** Collect `CHANGELOG.md` and
   `packages/*/CHANGELOG.md` with `existsSync`. When the list is empty,
   Installation must contain `no changelog`; when it is not, the page must name
   every path. A committed changelog therefore fails the page until it is
   linked.
2. **The code of conduct, both directions.** The same rule over
   `CODE_OF_CONDUCT.md`, `.github/CODE_OF_CONDUCT.md` and
   `docs/CODE_OF_CONDUCT.md`, with `No code of conduct is committed` in
   Contributing.
3. **The environment variable.** Assert `src/lib/site.ts` reads
   `VITE_SITE_URL`, and that Deployment names the same string. The guard fails
   on a renamed variable or a page that stops naming it.
4. **The FAQ links resolve.** Parse the `## Frequently asked questions` block of
   the Introduction, extract every `](/docs/…)`, strip the fragment, and assert
   each path is a `url` in `source.getPages()`. A deleted or renamed destination
   fails by name; the section may not promise a page the site does not serve.
5. **The headings hold.** Assert Contributing's `## Code of conduct` sits before
   `## Gates`, and Installation's `## Releases and versioning` sits before
   `## The intended install`, so the sections cannot drift into an unrelated
   part of the page.

### 6.2 `page-aliases.test.ts`

One `owned` row per §5 term (22 exclusive terms plus `versioning`, 23 rows), and
regressions that pin the words the new blocks must **not** steal:

```ts
["tracking", "/docs/styling"],
["pwa", "/docs/contributing"],
["bundle size", "/docs/performance"],
["version", "/docs/installation"],
```

### 6.3 `smoke:build`

Four production checks beside the security ones:

```ts
{
  query: "changelog",
  expected: "/docs/installation",
  first: true,
  what: "the release question the version page now answers",
},
{
  query: "faq",
  expected: "/docs",
  first: true,
  what: "the starting point the Introduction now provides",
},
{
  query: "offline",
  expected: "/docs/contributing",
  first: true,
  what: "the offline claim Contributing already states",
},
{
  query: "environment variables",
  expected: "/docs/deployment",
  first: true,
  what: "the self-hosting variable Deployment owns",
},
```

## 7. Commands and expected results

From `apps/docs`:

```sh
nub exec vitest run src/operational-docs.test.ts
# pre-fix: the changelog and code-of-conduct sentences are absent, and the FAQ
#   block is missing; post-fix: all pass
nub exec vitest run src/lib/page-aliases.test.ts
# pre-fix: one failing owned row per new term; post-fix: all pass
```

From the workspace root:

```sh
nub run --filter docs test          # exit 0 — 127 files / 1 326 tests
nub run --filter docs check-types   # exit 0
nub run --filter docs smoke:build   # exit 0 — 107 pages, 235 links, 1 380 anchors, four new queries
nub run check                       # exit 0
nub run lint                        # exit 0
```

The pages are prose and lists; the scoped accessibility sweep was run over the
three changed pages, one invocation each:
`nub scripts/smoke-a11y.ts --no-build --only /docs`, `… --only /docs/installation`
and `… --only /docs/contributing`. Each reported `1 pages × 2 schemes, 0
violations` and exit `0`. No live scene changes.

## 8. Two-direction proofs

All seven were run on 2026-10-20.

1. **Deleting the changelog sentence fails by name.** Replaced
   `**no changelog**` with `**no release log**`: the first test failed with
   `expected false to be true`; the page was restored.
2. **A committed changelog flips the guard.** A temporary root `CHANGELOG.md`
   failed the same test with `expected true to be false` (the page still claimed
   the absence); removing it restored 5/5.
3. **Deleting the conduct sentence fails by name.** Replaced
   `No code of conduct is committed` with `No conduct policy is committed`: the
   second test failed with `expected false to be true`; the page was restored.
4. **A committed code of conduct flips the guard.** A temporary root
   `CODE_OF_CONDUCT.md` failed the same test (`expected true to be false`);
   removing it restored 5/5.
5. **An abbreviation needs its alias.** Removing `faq` from the `/docs` block
   failed the owned row with
   `expected '/docs/components/accordion#composition' to be '/docs'`
   (349 passed / 1 failed); the alias was restored.
6. **A broken FAQ link fails by URL.** Changing the Security link to
   `/docs/not-a-page` failed with
   `expected [ '/docs/not-a-page' ] to deeply equal []`; the link was restored.
7. **A renamed variable fails the page.** Replacing `VITE_SITE_URL` with
   `SITE_URL` in Deployment failed with
   `expected '---\ntitle: Deployment and hosting\nd…' to contain 'VITE_SITE_URL'`;
   the page was restored.

One correction found by the full suite: the first FAQ wording named the "Intel
macOS remedy", which outranked Installation for `intel mac` (plan 584's guard
failed with `intel mac -> /docs`). The answer now points at the platform table
without repeating its vocabulary, and both suites pass.

## 9. STOP conditions

- Stop if a `CHANGELOG.md` or `CODE_OF_CONDUCT.md` already exists: the premise
  changed. Name it in the page and rewrite §4 instead of claiming absence.
- Stop if `VITE_SITE_URL` is no longer the variable `site.ts` reads.
- Stop if a proposed alias shadows a page title or a component name, or is
  already owned by another page: the alias guard names it. Drop the term.
- Stop if the FAQ would have to state a fact no other page owns; link the owner
  instead of writing a second version of its prose.
- Stop if `smoke:build` exits `2` (unverified is never a pass).
- Do not add a changelog, a code of conduct or a versioning policy in this
  plan: those are repository decisions, not docs edits.

## 10. Acceptance

- `changelog`, `release notes`, `releases`, `upgrade`, `upgrading`,
  `breaking changes`, `code of conduct`, `coc`, `offline`, `offline access`,
  `service worker`, `command line`, `environment variables`, `env var`,
  `site url` and `faq` reach the page that answers them, first.
- `tracking` keeps Styling, `pwa` keeps Contributing, `bundle size` keeps
  Performance and `version` keeps Installation.
- Installation states the release status, Contributing states the conduct
  absence, and both flip when the repository changes.
- Every FAQ link resolves to a served page; no duplicate prose is introduced.
- `nub run --filter docs test`, `check-types`, `smoke:build`, `nub run check`
  and `nub run lint` pass; the counts and seven proofs are recorded in §8.

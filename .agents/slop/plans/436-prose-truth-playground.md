# 436 — Prose truth: the playground exists, and the guard must catch the sentence that shipped

**Phase:** F · **Owner:** docs-site · **Status:** implemented
**Depends on:** 412, 426, 432; playground 120/140/150

## 1. The bug being guarded

Plan 426 added `apps/docs/src/prose-truth.test.ts` with an **inverted** guard:
while `apps/playground/package.json` is absent it stays green; once the app
lands it must fail on prose that says the playground is not built. The guard
matches the literal phrase `not built yet`.

The pages do not use that phrase. They say **“has not been built yet”** (and
“no `package.json` yet”, “`nub run dev:playground` does not resolve”). So the
playground landed in plans 120/140/150, the suite went 20/20 green, and two
pages kept announcing that the app does not exist. The site built, every link
resolved, and all 180 docs tests passed: this is exactly the drift the guard
was written to prevent, hidden by a wording mismatch.

Two further pages repeat the same false mental model in different words:

- `content/docs/index.mdx` says a component page “points at the native
  playground”. No record has a `playgroundScreen`; pages point at the native
  suite (tier V) or a labelled approximation (tier A).
- `content/docs/architecture.mdx` lists four preview tiers and says the
  playground run is “named per component”. `docs/preview-strategy.md` defines
  five tiers (N, S, V, A, X) and no per-component screen exists yet.

## 2. Measured current state (2026-10-17, `6c9bfae`)

```
apps/playground/package.json                 exists; name "playground"
apps/playground` scripts                     dev, build, smoke, test, check-types
COMPONENTS.md                                native suite 20/20 green
apps/docs/content/docs/getting-started.mdx:45-52   "will host", "Phase B deliverable",
                                                   "no package.json yet", "does not resolve"
apps/docs/content/docs/examples/index.mdx:43-50    "Phase B deliverable", "not been built yet",
                                                   "no package.json", "does not resolve"
apps/docs/content/docs/index.mdx:15                "points at the native playground"
apps/docs/content/docs/architecture.mdx:27-37      four tiers, "named per component"
apps/docs/src/prose-truth.test.ts:89-99            only matches "not built yet"
```

The four component pages with a labelled approximation are Button, Card,
Dropdown menu and Tabs (`<ComponentPreview>` in
`content/docs/components/{button,card,dropdown-menu,tabs}.mdx`). Every other
delivered page shows tier V (its package's native suite and command), not the
playground and not tier X.

## 3. Exact changes

### 3.1 `apps/docs/src/prose-truth.test.ts`

Replace the single-phrase playground test with a rule that covers the wording
class, and add a command-resolves check.

```ts
/**
 * Bug guarded (plan 436): the first version matched only "not built yet" while
 * the pages said "has not been built yet", so the site kept announcing a
 * playground that had been green since plan 140.
 */
const stalePlaygroundClaims = [
  /\bnot built yet\b/i,
  /\bnot been built\b/i,
  /\bno `?package\.json`?/i,
  /\bdoes not resolve\b/i,
  /\bPhase B deliverable\b/i,
  /\bwill host\b/i,
];
```

- The `revisit the playground claim` test keeps its inverted shape: it only
  runs its assertions when `playgroundIsRunnable`.
- It collects pages whose body mentions `apps/playground` or
  `dev:playground` and fails for any matching phrase, reporting
  `path: "phrase"`.
- Add: every `nub run dev:playground` mention requires the root
  `package.json` scripts to define `dev:playground`, so a renamed script fails
  the page rather than the reader.

Do not match the phrase on pages that do not mention the playground (Badge's
“chip … not built yet” is a different, true claim).

### 3.2 `apps/docs/content/docs/getting-started.mdx` — replace `## The native playground`

State what exists and the honest prerequisites: `apps/playground` runs
`nub run dev:playground`; it hosts the capability scenarios + theme gallery and
the 20/20 suite; it needs the GPUix binding and a desktop session (the Intel
binding is a local build, ADR 0003); per-component screens are not written yet,
so component pages name the native suite that drives them.

### 3.3 `apps/docs/content/docs/examples/index.mdx` — replace `## The native playground`

Same facts, plus why the pages do not show a screen: the playground supplies
capability scenarios and the theme gallery, not one screen per component; four
pages carry a labelled tier-A approximation and the rest show tier V. Keep the
existing index links; do not claim the example app was launched.

### 3.4 `apps/docs/content/docs/index.mdx`

Replace “points at the native playground” with “names the native suite that
drives it” (the playground is named only where a screen exists).

### 3.5 `apps/docs/content/docs/architecture.mdx` — `## Preview strategy`

List the five tiers from `docs/preview-strategy.md` in order: real native run
(N), real screenshot (S), native coverage by a suite (V), labelled browser
approximation (A), source + limitation (X). Say the playground screen is named
per component **when one exists**; today the delivered pages use V and four use
A.

### 3.6 The quick start names the runner it needs

The same truth standard applies to the command the landing page and
`installation.mdx` present as the quick start. `examples/basic-app`'s `dev`
script is `bun src/main.tsx`; Bun is not the repository's package manager and is
absent on a clean host, so the advertised command stops at the runner.

- `apps/docs/content/docs/installation.mdx`: after the first shell block, state
  that the example currently needs Bun + the native binding + a desktop session,
  and that `nub run --filter @gpuixui/basic-app check-types` is the check that
  runs without a window.
- `apps/docs/content/docs/getting-started.mdx`: the same one-line prerequisite
  next to the example command.
- `apps/docs/src/components/landing.tsx`: the quick-start paragraph names Bun
  and `check-types` instead of implying the dev command runs everywhere.
- `apps/docs/src/components/landing.test.tsx`: assert the paragraph names the
  runner (`Bun`) and the verifying command, so removing the caveat fails.

The commands themselves stay identical to `installation.mdx`; the existing
equality test keeps that true. Fixing the example's runner is an `examples`
task, already recorded in `TODO.md` — do not edit it here.

## 4. Commands and expected results

Run in `workspaces/docs-site`:

1. **Before the page edits**, with only §3.1 applied:
   `nub run --filter docs test` → **FAIL** on `getting-started.mdx` and
   `examples/index.mdx`, naming `not been built` / `does not resolve` /
   `Phase B deliverable`. Capture this output in the plan's completion note.
2. Apply §3.2–§3.5.
3. `nub run --filter docs test` → **PASS**, 181+ tests, 0 failures.
4. `nub run --filter docs check-types` → exit 0.
5. `nub run --filter docs build` → exit 0.
6. `nub run check` and `nub run lint` at the repository root → exit 0.
7. Browser check (dev server): open `/docs/getting-started` and
   `/docs/examples`; neither says the playground is missing, and both show
   `nub run dev:playground`. Open `/docs/architecture`; it lists five tiers.
   Expected: no console error, no 404 link.

## 5. STOP conditions

- STOP if `apps/playground/package.json` is absent (the guard's inverted state
  must stay as it is; only the phrasing coverage may change).
- STOP if `nub run dev:playground` does not resolve from the root
  `package.json`.
- STOP if any fixed sentence would claim a per-component playground screen:
  none exists (`TODO.md`, playground task).
- STOP if a page edit would require touching a path outside `apps/docs` or
  `docs/preview-strategy.md`; record it in `TODO.md` instead.

## 6. Test plan and two-direction proof

- The test that can fail is the stale-phrase scan in §3.1. Prove both
  directions: run it against the pre-fix pages (fails, §4.1), then against the
  fixed pages (passes, §4.3). `scripts/verify-two-directions.sh` is jj-based
  and does not run here (TODO.md), so record both commands and outputs instead.
- The command-resolves check fails if the root script is renamed; prove it by
  temporarily changing the assertion's script name to `dev:playground-missing`
  (expect failure) and back.
- No runtime test: this is prose and a test-only guard; the playground's own
  20/20 native suite (plan 150 §8) is the runtime evidence the prose cites.

## 7. Acceptance

- The four pages describe the playground that exists, with its real command,
  prerequisites and the missing per-component screens stated as missing.
- The guard fails on the exact wording that shipped, not on a phrase only the
  plan author imagined.
- Every `nub run dev:playground` claim resolves to a real root script.
- All commands in §4 pass; the plan status and `TODO.md` are updated in the
  same commit.

## 8. Completion evidence (2026-10-17)

**Two directions, stale-claim guard.** Before the page edits, with only §3.1
applied:

```
FAIL src/prose-truth.test.ts > prose truth > revisit the playground claim once the playground app exists
Received: [
  "getting-started.mdx: /\\bno `?package\\.json`?/i",
  "getting-started.mdx: /\\bdoes not resolve\\b/i",
  "getting-started.mdx: /\\bPhase B deliverable\\b/i",
  "getting-started.mdx: /\\bwill host\\b/i",
  "examples/index.mdx: /\\bnot been built\\b/i",
  … 3 more
]
```

After the edits: `182 passed (182)`, 31 files.

**Two directions, command-resolves guard.** The first draft matched inline
backticks only, so it found no command (the page uses a fenced block) and the
`-missing` mutation still passed — a vacuous test. The regex now matches
`nub run <script>` anywhere; mutating the check to `"${script}-missing"` then
fails with:

```
FAIL src/prose-truth.test.ts > prose truth > names only playground commands the root package defines
Received: ["getting-started.mdx: nub run dev:playground", …]
```

Restored, it passes.

**Gates.** `nub run check` (includes `check:tests`), `nub run lint`,
`nub run test` (docs 182, components 157, primitives 282, tokens/icons/testing
green), `nub run --filter docs build` and `--filter docs check-types` all exited
`0`. Headless Chrome renders of `/docs/getting-started`, `/docs/examples`,
`/docs/architecture` and `/docs/installation` show the built playground, the
`dev:playground` command, the five preview tiers and the Bun/`check-types`
prerequisite, with no stale claim.

**Follow-ups deliberately not done here:** fixing `examples/basic-app`'s `dev`
runner (an `examples` task recorded in `TODO.md`), per-component playground
screens (playground task), and `docs/architecture.md` (outside this workstream).

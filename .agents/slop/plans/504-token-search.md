# 504 — A token role is findable from ⌘K (the generated catalogue joins search)

**Status:** planned · **Phase:** F (search / theming truth) · **Owner:** docs-site
**Depends on:** `410`, `416`, `419`, `430`, `431`, `447`, `490`, `500`; the
shipped `@gpuixui/tokens` package.

## 1. The defect this plan fixes

The site's most-used reference tables are **rendered React, not authored MDX** —
`<TokenColors />` (`src/components/token-colors.tsx`), `<TokenScales />`
(`src/components/token-scales.tsx`) and `<TypeScale />`
(`src/components/type-scale.tsx`) all read `@gpuixui/tokens` at render time.
Fumadocs' page index is built from the MDX source, so it never sees those rows.
The registry index fixed this class of bug for components (plan 419), props types
(plan 442), parts (plan 481), exported values (plan 490) and exported symbols
(plan 500). **Tokens were never indexed.**

Measured against the production build on 2026-10-18 (`vite preview`, `/api/search`):

| Query | Result before this plan | Should be |
| ----- | ----------------------- | --------- |
| `destructiveSoft` | **`[]` — zero results** | `/docs/theming#semantic-roles` |
| `primaryForeground` | badge, button, pagination, date-picker prose | `/docs/theming#semantic-roles` (first) |
| `bodyStrong` | the Text component page | `/docs/typography` |
| `spacing.2` | `/docs/tokens-api` | `/docs/theming#scales-and-control-metrics` |

So a consumer who reads a role in the package and pastes it into search is told
the library has no such token. That contradicts `MISSION.md`'s "component
search" and "theming behaviour" requirements and the site's own promise that
`/docs/theming` documents every role.

## 2. Files to change

All paths relative to `apps/docs` unless noted. **Do not edit `packages/*`,
`examples/*`, `apps/playground` or `docs/*`** — record those asks in `TODO.md`
instead.

### 2.1 `src/lib/token-catalogue.ts` (new)

One browser-safe module (imports only `@gpuixui/tokens`) that owns the derivation
of every token group, so the rendered tables and the search index cannot disagree:

- move `TokenRow`, `ScaleGroup`, `px`, `numericRows`, `controlSizes`,
  `densityRows`, `scaleGroups`, `elevationLevels` and `shadow` **out of**
  `src/components/token-scales.tsx` into this module, exported;
- export `textRoles: ReadonlyArray<TextRole>` derived from `typography` (every
  key except `sans` and `mono`), replacing the hand-written list in
  `src/components/type-scale.tsx`;
- export `platformNames: ReadonlyArray<PlatformName>` (`darwin`, `linux`,
  `win32`, `default`) and re-export `platformTypes`;
- no behavioural change: the rendered tables must produce byte-identical rows
  (`token-scales.test.tsx` and `type-scale.test.tsx` stay green untouched).

Then `src/components/token-scales.tsx` and `src/components/type-scale.tsx`
import those names; their local copies are deleted. Net LOC must not grow.

### 2.2 `src/lib/token-search.ts` (new)

Builds the search documents from the package, one per rendered surface:

| Title | URL | Content |
| ----- | --- | ------- |
| `Colour roles` | `/docs/theming#semantic-roles` | `role: <light hex> (light), <dark hex> (dark)` for every `colorRoles` entry |
| `Type scale` | `/docs/typography` | `role: 14px/20px 400` for every text role, plus the two family fields |
| `Scales and control metrics` | `/docs/theming#scales-and-control-metrics` | `spacing.4: 16px`, `radius.md: …`, `borderWidth.strong: 2px`, `iconSize.lg: 20px`, every density metric, `elevation.sm: …` |
| `Platform styles` | `/docs/theming#platform-styles` | `macOS (darwin): Menlo`, `Linux (linux): DejaVu Sans Mono`, `Windows (win32): Consolas`, `Default (default): Menlo` |

Exports:

- `tokenSearchEntries: ReadonlyArray<{ index: Index; names: ReadonlyArray<string>; title: string }>`
  — `names` are the tokens the document owns, for ranking;
- `tokenEntryByUrl: ReadonlyMap<string, { names; title }>`;
- `tokenRank(url, query): number | undefined` — `0` only when the query is an
  **exact, case-insensitive match for a *distinctive* token name**: a name with
  an uppercase letter (`destructiveSoft`, `bodyStrong`) or a dot
  (`spacing.2`, `elevation.overlay`). Plain lowercase words (`input`, `label`,
  `body`, `ring`) are deliberately **not** promoted, so the Text inputs and
  Labels component pages keep the top result (the regression this rule exists to
  avoid).

Include every colour role's **values** in the content, so pasting a hex the
reader copied from a theme finds the role that owns it.

### 2.3 `src/lib/search.ts`

- Add the four token documents to the existing `registrySearch` index list
  (`valueSearchIndex` stays).
- In `mergeResults`, extend the per-candidate rank: a component match keeps
  `componentRank`; otherwise `tokenRank(result.url, query)`. A token rank must
  never displace a component **title** match (component rank `0` wins; the
  token rank is only computed when the URL names no component, and no distinctive
  token name collides with a component title). Use the token document's title
  length for the tie-break, not `0`.
- Keep the page dedupe and the empty-query guard unchanged.

### 2.4 `src/components/token-scales.tsx`, `src/components/type-scale.tsx`

Delete the moved derivations and import them from `@/lib/token-catalogue`.
No markup, class name, `data-token`, caption or test id changes.

### 2.5 `src/lib/token-search.test.ts` (new)

Header comment names the bug: *the token catalogue is rendered React, so
`destructiveSoft` returned `[]` and `primaryForeground` never reached Theming.*
Assertions derive their expectations **independently of production helpers**
(from `colorRoles`, `typography`, `lightTheme` directly):

1. every `colorRoles` entry appears in the Colour roles content, and
   `destructiveSoft` is one of them;
2. every key of `lightTheme.spacing` / `radius` / `borderWidth` / `iconSize`
   appears as `<group>.<key>`; every density metric and every elevation level
   appears too (this catches a group silently dropped from
   `token-catalogue.ts`);
3. every text role derived from `typography` (all keys except `sans`/`mono`)
   appears in the Type scale content;
4. `search("destructiveSoft")[0]?.url` is `/docs/theming#semantic-roles`;
5. `search("primaryForeground")[0]?.url` is the same (the measured bug);
6. `search("bodyStrong")[0]?.url` is `/docs/typography`;
7. `search("spacing.2")[0]?.url` is `/docs/theming#scales-and-control-metrics`;
8. `search(lightTheme.colors.destructiveSoft)[0]?.url` is the colour table
   (a pasted value finds its role);
9. **no regression:** `search("input")[0]?.url` is
   `/docs/components/text-input` and `search("label")[0]?.url` is
   `/docs/components/label`;
10. `search("destructiveSoftProbe")` is `[]` (the index matches real names only);
11. every token document URL's `#fragment` is an id the destination page
    renders: read `content/docs/theming.mdx` and `content/docs/typography.mdx`
    with `node:fs`, slug the `##`/`###` headings (lowercase, non-alphanumerics →
    `-`), and compare. This is the plan-501 class of break: renaming
    `## Semantic roles` must fail by name, not ship a dead search result.

Keep the suite ≤ 11 `it` blocks. Reuse the existing 120 s timeout pattern in
`search.test.ts` for the tests that call `search()` (the first query builds the
page index).

### 2.6 `scripts/smoke-build.ts`

Add one production search check next to the `Spinner` one:

```ts
{
  query: "destructiveSoft",
  expected: "/docs/theming",
  first: true,
  what: "a token role from the generated token index",
},
```

### 2.7 Site copy and records

- `apps/docs/README.md` § Search: state that the token catalogue (colour roles,
  type roles, scales, platform styles) is indexed from `@gpuixui/tokens`, so a
  role such as `destructiveSoft` or a scale token such as `spacing.2` reaches its
  table.
- `content/docs/theming.mdx`: one sentence after the generated colour table —
  every role on the page is searchable by name (and by its value) from any page.
  Do not restate the counts; they stay generated.
- `apps/docs/README.md` § Commands: add the missing `smoke:keyboard` row (it
  shipped in plan 496 and the command list was never updated).
- `TODO.md`: one ticked row under **Docs site workstream**, and bump the
  section counter from `104/104` to `105/105`.
- `.agents/slop/plans/README.md`: add `504` to the docs-site table and extend
  the `500`–`503` free-number note to `500`–`504`.
- `PLAN.md` § 4: add decision D32 — *generated React tables are invisible to the
  MDX search index; every generated surface owns an index document* (components
  419, parts 481, values 490, symbols 500, tokens 504).

## 3. Commands and expected results

Run from the worktree root, in order.

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass, including `src/lib/token-search.test.ts`; previously 57 files / 380 tests |
| `nub run check:tests` | `tests: every test asserts something, and nothing asserts itself` |
| `nub run --filter docs check-types` | `fumadocs-mdx` + both `tsc --noEmit` runs exit `0` |
| `nub run check` | exit `0` (test quality, lint, format, every workspace's types) |
| `nub run --filter docs smoke:build` | build + crawl exit `0`; the new token query returns `/docs/theming` first |

Do not claim the smoke passed without running it.

## 4. Two-direction proofs (record the exact messages under Results)

1. Delete the four documents from `registrySearch`'s `indexes` array → tests 4,
   5, 6 and 7 fail (`expected undefined to be …` → the token result is absent);
   restore.
2. Remove the `destructiveSoft` line from the colour content (or filter it out)
   → test 1 fails naming the role; restore.
3. Remove the `spacing` group from `scaleGroups` → test 2 fails naming the group;
   restore.
4. Widen `tokenRank` to every name (drop the distinctive-name rule) → test 9
   fails on `input` (Theming displaces Text inputs); restore.
5. Rename `## Semantic roles` to `## Roles` in `theming.mdx` → test 11 fails
   naming the dead fragment; restore byte-for-byte.
6. Re-run the production query before the fix (`destructiveSoft` → `[]`) and
   after (`/docs/theming#semantic-roles`) and record both responses.

## 5. STOP conditions

- **Fumadocs' simple index splits dotted names** so `spacing.2` cannot be a
  query: do not invent a second search client. Index the readable form
  (`spacing 2`) in `keywords` and assert the query the reader actually types
  works; if neither works, STOP and record the tokenizer's behaviour before
  changing the design.
- **A token document outranks a component page for an ordinary word** after the
  ranking change: STOP — the distinctive-name rule is the invariant, not a
  preference.
- **The token tables render differently after the `token-catalogue` move**:
  STOP and restore the component-local code; a refactor may not change markup.
- **`search()` becomes slower than the 120 s budget** on a cold host: record the
  measurement; do not remove assertions.
- Any fix needs a path outside `apps/docs`, `TODO.md`, `PLAN.md` or
  `.agents/slop/plans/`: record a TODO row; do not edit it.

## 6. Acceptance criteria

- Searching any shipped colour role, type role, scale token or platform family
  reaches the table that documents it; `destructiveSoft` returns Theming first.
- A pasted light-theme hex value finds its role.
- `input` still reaches Text inputs and `label` still reaches Labels.
- The token index is derived from `@gpuixui/tokens`, so a new role or scale token
  is searchable without a docs edit; the test derives its expectations from the
  package, not from the index module.
- Every token result fragment is a heading the page renders.
- `nub run check`, `nub run --filter docs test` and `smoke:build` exit `0`.
- `TODO.md`, `PLAN.md` and the plan index are updated; the commits are pushed to
  `origin/agent/docs-site`.

## 7. Why no `COMPONENTS.md` row

No library surface and no component status changes. This is a docs-search fix;
the inventory is untouched.

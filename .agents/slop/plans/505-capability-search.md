# 505 — A scenario id finds the capability page (the measured matrix joins search)

**Status:** implemented (2026-10-18) · **Phase:** F (search / capability truth) · **Owner:** docs-site
**Depends on:** `410`, `419`, `431`, `448`, `490`, `500`, `504`; the playground
scenario registry and `COMPONENTS.md`.

## 1. The defect this plan fixes

`/docs/capabilities` renders `<CapabilityMatrix />` (`src/components/capability-matrix.tsx`)
from `src/lib/capabilities.ts`. That data — 15 capabilities, their verdicts and
the playground scenario ids that prove them — is **React, not MDX**, so the
Fumadocs page index never sees a scenario id. The page itself promises the
opposite: "the scenario id is what you can run yourself."

Measured against the production build on 2026-10-18 (`/api/search`, 10 results):

| Query | Result before this plan | Should be |
| ----- | ----------------------- | --------- |
| `modal-focus-trap` | Command menu prose | `/docs/capabilities` (first) |
| `floating-placement` | Dialog / Spinner / Message scroller prose | `/docs/capabilities` (first) |
| `theme-color-roles` | Colour picker prose | `/docs/capabilities` (first) |
| `tree-view` | `/docs/native-testing` | `/docs/capabilities` (first) |
| `window-key-shortcut` | Text input prose | `/docs/capabilities` (first) |

Plan 504 fixed the same class for the token tables: a generated surface gets its
own index document and an exact, distinctive name is promoted ahead of prose.
This plan applies that pattern to the capability matrix and makes the promoted
name machinery shared instead of token-specific.

## 2. Files to change

All paths relative to `apps/docs`. **Do not edit `apps/playground` or
`COMPONENTS.md`** — they own the scenario registry and the verdicts.

### 2.1 `src/lib/generated-search.ts` (new)

The small shared contract plan 504 introduced informally:

```ts
export interface GeneratedSearchEntry {
  readonly index: Index;                 // the Fumadocs document
  readonly names: ReadonlyArray<string>; // exact names this document is promoted for
}

/** `0` when `query` is exactly one of the entry's promoted names. */
export const exactNameRank = (
  entry: GeneratedSearchEntry | undefined,
  query: string,
): number | undefined;
```

`names` means **promoted** names, not every word the content contains. Each
producer filters at construction:

- tokens: camelCase (`destructiveSoft`) or dotted (`spacing.md`) — never a plain
  word (`input`, `label`);
- capabilities: hyphenated (`modal-focus-trap`, `virtual-list`) — never a plain
  word (`theme`, `text`, `log`).

### 2.2 `src/lib/token-search.ts`

- Use `GeneratedSearchEntry` / `exactNameRank`; delete the local `tokenRank` and
  the local distinctive predicate.
- Keep `tokenSearchEntries`; filter each entry's `names` to its **distinctive**
  names at construction (the content is unchanged, so every role and scale token
  is still searchable).
- Keep `tokenEntryByUrl` (used by the test) or replace it with a direct
  `tokenSearchEntries` lookup — do not leave two ways to find the same entry.

### 2.3 `src/lib/capability-search.ts` (new)

One generated document:

| Field | Value |
| ----- | ----- |
| title | `GPUix capabilities` |
| description | The measured 0.10.0 matrix and the scenarios that prove it. |
| url | `/docs/capabilities` |
| content | one block per capability: `label (capability): verdict. proves Scenarios: a, b. Plans: 140, 155.` |
| keywords | every scenario id and every hyphenated capability name |
| names (promoted) | every scenario id, plus a capability name that contains `-` (`virtual-list`) |

Derived from `capabilities` in `./capabilities.ts`, so a new row or scenario is
searchable without a docs edit.

### 2.4 `src/lib/search.ts`

- Add `capabilitySearchEntry.index` to `registrySearch`'s `indexes`.
- Build one promoted-entry map from `tokenSearchEntries` plus the capability
  entry; preserve the existing component rank precedence:
  component title → exact promoted name (`exactNameRank`) → index order.
- The tie-break uses the promoted entry's `index.title` length.
- Keep the page dedupe and the empty-query guard unchanged.

### 2.5 `src/lib/capability-search.test.ts` (new)

Header comment names the bug: *the matrix is rendered React, so `modal-focus-trap`
never reached `/docs/capabilities`.* Assertions derive from `capabilities`:

1. every capability's `label`, `capability`, `verdict` and every scenario id
   appear in the document's content;
2. every scenario id is in the entry's promoted `names`; a plain-word capability
   (`theme`, `text`, `log`) is **not** promoted;
3. `search("modal-focus-trap")[0]?.url` is `/docs/capabilities`;
4. `search("virtual-list")[0]?.url` is `/docs/capabilities` (a hyphenated
   capability name);
5. `search("theme-color-roles")[0]?.url` is `/docs/capabilities`;
6. no regression: `search("input")[0]?.url` is `/docs/components/text-input`
   and `search("label")[0]?.url` is `/docs/components/label`;
7. `search("modal-focus-trap-probe")` is `[]`.

Update the unit test in `token-search.test.ts` that called `tokenRank` to call
`exactNameRank` with the token entry; its two assertions are unchanged in
meaning (a distinctive name promotes, a plain word does not).

### 2.6 `scripts/smoke-build.ts`

Add one production search check:

```ts
{
  query: "modal-focus-trap",
  expected: "/docs/capabilities",
  first: true,
  what: "a scenario id from the generated capability index",
},
```

### 2.7 Site copy and records

- `apps/docs/README.md` § Search: name the capability document alongside the
  token catalogue.
- `content/docs/capabilities.mdx`: one sentence under the matrix — every
  scenario id here is searchable, so a reader who finds an id in a suite log can
  reach the row it proves.
- `TODO.md`: one ticked row; bump the docs counter to `106/106`.
- `.agents/slop/plans/README.md`: add `505` and extend the free-number note.
- `PLAN.md` D32: extend the list of generated surfaces with capabilities (505).

## 3. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass, including `src/lib/capability-search.test.ts`; previously 58 files / 394 tests |
| `nub run check:tests` | `tests: every test asserts something, and nothing asserts itself` |
| `nub run check` | exit `0` |
| `nub run --filter docs smoke:build` | build + crawl exit `0`; `modal-focus-trap` returns `/docs/capabilities` first |

## 4. Two-direction proofs (record the exact messages under Results)

1. Drop the capability document from `registrySearch` → tests 3–5 fail
   (`expected undefined to be '/docs/capabilities'`); restore.
2. Remove the scenario ids from the promoted `names` (leave the content) → tests
   3–5 fail; restore.
3. Add a plain capability name (`theme`) to the promoted names → test 2 fails
   naming `theme`; restore.
4. Re-run the production query before (`modal-focus-trap` → Command menu prose)
   and after (`/docs/capabilities` first); record both.
5. Re-run the 504 regression checks (`input`, `label`) after the shared ranker
   lands — a behaviour change there is a failure, not an acceptable trade.

## 5. STOP conditions

- **A component page loses the first result for its own title** after the shared
  ranker lands: STOP and fix the precedence; exact promoted names must never
  outrank a component *title* match.
- **The capability document pushes a page result out of the top ten for a broad
  query** (`verified`, `native`): STOP — one promoted document may not flood.
- Any edit outside `apps/docs`, `TODO.md`, `PLAN.md` or `.agents/slop/plans/`:
  record a TODO row; do not edit it.

## 6. Acceptance criteria

- Every scenario id in `src/lib/capabilities.ts` reaches `/docs/capabilities`
  first from ⌘K; a hyphenated capability name does too.
- Plain words (`theme`, `text`, `log`, `input`, `label`) keep their existing
  first result.
- The derivation is from `capabilities`, so a new measured row is searchable
  with no docs edit.
- `nub run check`, `nub run --filter docs test` and `smoke:build` exit `0`;
  records updated; pushed to `origin/agent/docs-site`.

## 7. Why no `COMPONENTS.md` row

No library surface and no status changes.

## 8. Results (2026-10-18)

Implemented on `agent/docs-site`. `apps/docs/src/lib/capability-search.test.ts`
(8 tests) and the docs suite is **59 files / 402 tests passing**, up from 58 /
394. The shared ranker is `src/lib/generated-search.ts`; `token-search.ts` now
declares only its promoted (distinctive) names, and the token suite's promotion
test calls `exactNameRank` directly.

### What changed beyond the plan

- The token entry map is gone: `search.ts` builds one promoted-entry map from
  `tokenSearchEntries` plus `capabilitySearchEntry`, so the token and capability
  documents cannot rank differently. The 504 tests were updated accordingly
  (same assertions, one lookup).
- `capabilitySearchEntry` promotes every scenario id and every hyphenated
  capability name; `theme`, `text`, `log` are indexed but never promoted. The
  proof below shows the difference: promoting `theme` fails the guard.

### Two-direction proofs

| Break | Failure |
| ----- | ------- |
| Dropped the capability document from `registrySearch` | `finds the matrix from a scenario id` — `expected '/docs/contributing' to be '/docs/capabilities'`; `… from a hyphenated capability name` — `'/docs/data-display'`; `… from a theme scenario` — `'/docs/theming'` |
| Removed the scenario ids from the promoted `names` | `promotes every scenario id and no plain-word capability` — `expected [ 'layout-flex', …(18) ] to deeply equal []`; the scenario-id and theme queries fell back to prose |
| Added the plain word `theme` to the promoted names | `promotes every scenario id and no plain-word capability` — `expected [ 'theme' ] to deeply equal []` |
| Production `/api/search` before the fix | `modal-focus-trap` → Command menu; `floating-placement` → Dialog/Spinner; `theme-color-roles` → Colour picker; `virtual-list` → List |
| Production `/api/search` after the fix | `modal-focus-trap`, `theme-color-roles`, `floating-placement` and `virtual-list` → `/docs/capabilities` first; `input` → `/docs/components/text-input`; `label` → `/docs/components/label`; `theme` → `/docs/tokens-api`; `log` → Text |

### Commands

- `nub run --filter docs test` → `59 passed (59)`, `402 passed (402)`.
- `nub run check` → exit `0` (test quality, lint, format, all workspace types).
- `nub run --filter docs smoke:build` → exit `0`; `90 pages`, `109 links`,
  `1145 anchors`, search and robots checked, including the new
  `modal-focus-trap` production query.

# 443 — The registry mirrors the inventory's GPUix-support column

**Phase:** F (truth) · **Owner:** docs-site · **Status:** planned
**Depends on:** 411 (metadata contract), 429 (status is owned by the inventory),
432 (native coverage), 435

## 1. The defect

A component page shows **two facts that contradict each other**.

`apps/docs/content/docs/components/button.mdx` renders
`<ComponentState slug="button" />` (status, GPUix support, package, limitations)
and then, under *Accessibility and limitations*:

> **No native button element**: the runtime renders a `div` with role and
> handlers.

The same page's status block says **`GPUix support: yes`**, because
`src/component-meta/entries.ts` records `gpuix: "yes"` for `button` while the
`COMPONENTS.md` row says `ours`. Seven records are wrong this way and two more
flatten `reuse` to `yes`:

| Slug | `COMPONENTS.md` | Registry today |
| ---- | --------------- | -------------- |
| `button` | `ours` | `yes` |
| `slider` | `ours` | `yes` |
| `range-slider` | `ours` | `yes` |
| `number-field` | `ours` | `yes` |
| `otp-field` | `ours` | `yes` |
| `toggle` | `ours` | `yes` |
| `rating` | `ours` | `yes` |
| `select` | `reuse` | `yes` |
| `tooltip` | `reuse` | `yes` |

**Root cause.** Plan 429 made the *status* column inventory-owned and guarded it
(`inventoryStatuses` in `registry.test.ts`). The GPUix-support column was never
guarded, so it was hand-typed and drifted. The vocabulary is also missing two
words the inventory actually uses (`ours`, `reuse`), which is why the first
author had to flatten them.

**Why it matters.** `MISSION.md` requires every component page to state its
implementation status honestly; a page that says "GPUix provides this" next to
"the runtime has no such primitive" teaches the reader the wrong thing about
the library and about GPUix.

## 2. Decision

The registry mirrors the inventory **word for word**; the docs site does not
re-interpret it.

1. `GpuixSupport` becomes the inventory's vocabulary:
   `"yes" | "partial" | "reuse" | "ours" | "no" | "unverified"`.
   - `?` in the inventory is `unverified`.
   - a parenthetical is dropped: `yes (a bar, no host element)` → `yes`.
   - `unsupported` in the inventory is `no`.
   - any other word is a **test failure**, not a guess — a new word means a
     human decides how the docs render it.
2. `ComponentState` and the component index render the word **plus its
   meaning** from one shared map, so a reader never needs the inventory's
   legend:
   `yes` = GPUix provides it · `partial` = GPUix provides part of it ·
   `reuse` = this wraps GPUix's own · `ours` = implemented in this library ·
   `no` = not provided by GPUix · `unverified` = not established.
3. `statusViolations` stops treating "GPUix provides it" as the evidence for
   `done`. The evidence is the **native suite** (`runtime`), which every
   delivered record already carries and every planned record lacks. Without
   this change a Tier 1 row marked `done` would be rejected for being `ours`,
   which is exactly the honest, verified state those rows will reach.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `apps/docs/src/component-meta/schema.ts` | extend `GpuixSupport` with `reuse` and `ours`; restate the field's doc comment as "what GPUix already provides, in the inventory's words" |
| `apps/docs/src/component-meta/entries.ts` | correct the nine records in §1 (`ours` ×7, `reuse` ×2) |
| `apps/docs/src/component-meta/contract.ts` | `statusViolations`: `done` requires `runtime`, not `gpuix` `yes`/`partial`; keep "partial needs a limitation" and "unsupported requires no + a limitation" |
| `apps/docs/src/components/component-state.tsx` | render the shared support label beside the badge |
| `apps/docs/src/components/component-index.tsx` | render the shared support label in the chip (`title`) and the legend paragraph |
| `apps/docs/src/component-meta/support.ts` (new) | `supportMeaning: Record<GpuixSupport, string>` and `supportLegend: readonly { value, meaning }[]` — one map used by both renderers |
| `apps/docs/src/component-meta/registry.test.ts` | parse the inventory support column and compare every record; fixtures for the vocabulary map; prove the new `done` rule |
| `apps/docs/src/components/component-state.test.tsx` (new) | every enum value renders its meaning; an unknown slug still renders the honest "Unknown component" |
| `apps/docs/src/components/component-index.test.tsx` | the legend names every value; chips expose `data-gpuix` unchanged |
| `apps/docs/README.md` | the "Adding a component page" step: the support word is mirrored exactly like the status word |
| `TODO.md` | tick the new row under the docs-site workstream |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Tests

`registry.test.ts` gains:

```
tierSupport(heading) → Map<normalized title, inventory word>
supportWord(cell)    → "yes" | "partial" | "reuse" | "ours" | "no" | "unverified" | undefined
```

- **"takes every GPUix support word from its COMPONENTS.md row"** — the
  end-to-end guard. Fails today with the nine rows in §1.
- **"maps each inventory word to exactly one registry value"** — a table over
  all six words plus two parenthetical forms plus `?`; fails if a word is added
  to the inventory and not to the map.
- **"rejects an unknown inventory word"** — `supportWord("maybe")` is
  `undefined`, so the guard reports it instead of silently passing.
- **"keeps `done` on the native suite, not on GPUix's kindness"** — fixture:
  `done` + `ours` + a runtime passes; `done` + `yes` and no runtime fails with
  `demo: done requires a native suite`. This is the fixture that would have
  blocked the Tier 1 `done` transition.
- **"partial still needs a limitation"** — unchanged fixture, still fails.

`component-state.test.tsx` renders each of the six values and asserts its
meaning appears; `component-index.test.tsx` asserts the legend mentions every
value (it already renders the whole index).

### Two-direction proof (AGENTS §3)

1. Write the inventory-agreement test first and run it **before** correcting
   the records: it must fail listing all nine slugs with
   `button: inventory ours, registry yes`.
2. Correct the records, rerun: green.
3. Revert one (`toggle` → `yes`) and rerun: red on `toggle` only. Restore.
4. Delete one `supportMeaning` entry and run `component-state.test.tsx`: red;
   restore.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all suites pass after the fix; the new guard fails before it |
| `nub run --filter docs check-types` | exit `0` |
| `nub run --filter docs build` | exit `0` |
| `nub run --filter docs dev` + `curl -s localhost:3000/docs/components/button` | the page contains `data-gpuix="ours"` and the meaning text, not `data-gpuix="yes"` |
| `nub run --filter docs smoke:build` | exit `0`; 66 pages still render |
| `nub run check` / `nub run lint` / `nub run test` | green (§7 of `AGENTS.md`) |

## 6. STOP conditions

- The inventory uses a support word this plan does not list: stop and record it
  in `TODO.md`; do not invent a mapping or edit `COMPONENTS.md` (another
  workstream owns the Tier 1–2 rows).
- Correcting a record makes a page's prose false (e.g. a page claims "GPUix
  provides the primitive"): fix the prose on that page in the same commit; if
  that needs a package change, record a cross-team row instead.
- `statusViolations`' new `runtime` rule breaks a delivered record: stop —
  every `done` row is supposed to carry a suite (plan 432); report which one
  does not rather than weakening the rule.
- Any test can only pass by stubbing the inventory parser: stop; the guard must
  read the real `COMPONENTS.md`.

## 7. Acceptance

- Every record's GPUix-support word equals its `COMPONENTS.md` row, proven by a
  test that reads the markdown.
- A component page and the component index state the word **and** its meaning;
  every enum value is covered by a test.
- `done` is backed by a native suite rather than by GPUix having written the
  primitive, with a fixture proving both directions.
- All docs suites, type-check, build, the built-site crawl and the repository
  gate pass; `TODO.md`, the plan index and `apps/docs/README.md` are current;
  the work is committed and pushed on `agent/docs-site`.

## 8. Progress (2026-10-17)

- **The guard failed first, on the real inventory.** With the parser and the
  agreement test added and the records untouched, `registry.test.ts` reported
  exactly the nine rows in §1 (`button: inventory ours, registry yes`, …).
- **Implemented.** `GpuixSupport` now carries `ours` and `reuse`; the nine
  records mirror the inventory; `src/component-meta/support.ts` is the single
  word→meaning map used by `<ComponentState>` and the index legend (which now
  translates all six words and titles each chip); `statusViolations` requires a
  native suite for `done` instead of GPUix support.
- **Both directions proven.**
  - `toggle` reverted to `yes` → the agreement test failed on `toggle` only;
    restored → green.
  - `"no"` removed from `supportOrder` → `component-state.test.tsx` failed on
    the map-coverage test; restored → green.
  - The new `done` fixture passes for `gpuix: "ours"` + a suite and fails for
    `runtime: null` — the old rule would have rejected a runtime-verified
    "implemented here" row.
- **Verified.** `nub run --filter docs test`: 36 files, 208 tests pass;
  `check-types`, `lint`, the docs build and `smoke:build` green; the dev server
  serves `/docs/components/button` with `data-gpuix="ours"` and the meaning.


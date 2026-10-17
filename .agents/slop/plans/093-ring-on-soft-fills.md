# 093 — The focus ring on the soft status fills

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `086` (the ring surfaces), `090` (the soft status edge), `092` (the control boundary on the soft fills) |
| Status | planned |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

The focus ring (`ring`) is measured on eight surfaces: `background`, `card`,
`popover`, `muted`, `accent`, `hover`, `active` and `selected` (plan `086`). It
is **not** measured on the four soft status fills.

An Alert or Toast can carry a focused control — plan `092` established that a
field or checkbox sits inside one — and a toast's action button ("Retry",
"Undo", "Dismiss") receives focus while it sits directly on `warningSoft` or
`destructiveSoft`. The ring is the only indicator that says which control is
focused, so it is a `boundary` pair on those fills too.

The audit found **no defect**: every shipped set already clears the floor —
identity light `warningSoft` at 3.37:1 is the tightest, dark platform sets are
3.89–7.36, and both high-contrast sets are 5.53–8.47 against the 4.5:1 AAA
floor. So this plan moves **no colour**. It closes a contract gap: today an
edited theme could make the ring disappear on a soft fill and the checker would
stay silent.

## 2. Design decisions (do not re-litigate)

1. **A separate list, not a widened `ringSurfaces`.** The documented sentence
   "the eight surfaces a focused control can sit on" stays true, and the eight
   are the surfaces a control *sits on*; a soft fill is a status composition.
   `ringSoftPairs` holds `ring` over each soft fill as a `boundary` pair, built
   from `softSurfaceRoles`, mirroring `controlBoundarySoftPairs` (plan `092`).
2. **No value moves.** All sixteen shipped variants pass today. The pairs exist
   so a palette or platform edit cannot break them silently.
3. **No floor changes.** The `boundary` class keeps 3:1 / 4.5:1.
4. **Pair count.** `contrastPairs` moves **113 → 117**.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/093-ring-on-soft-fills.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the `093` row and paragraph |
| `packages/tokens/src/contrast.ts` | `ringSoftPairs`; spread it; JSDoc |
| `packages/tokens/src/ring-soft.test.ts` | **new** — floors, AAA, public checker, pair wiring |
| `packages/tokens/src/contrast.test.ts` | header paragraph; pair count `113` → `117` |
| `packages/tokens/src/docs.test.ts` | the ring sentence, the §9 row |
| `packages/tokens/src/readme.test.ts` | the README ring sentence |
| `packages/tokens/README.md` | the ring paragraph |
| `docs/tokens.md` | §Checking a theme, §Verification ring paragraph |
| `docs/design-system.md` | §9 row |
| `COMPONENTS.md` | *Theme contrast check* row |
| `TODO.md` | tick this row, bump the bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

After `ringPairs`:

```ts
/**
 * The soft status fills a focused control can sit on. An Alert or Toast carries
 * actions — a Retry or Dismiss button — and the ring is the only indicator of
 * which control holds focus, so each fill is held to the boundary floor like the
 * surfaces a control normally sits on.
 */
export const ringSoftPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["ring", background, "boundary"],
);
```

Spread it in `contrastPairs` after `...ringPairs`, and extend the `contrastPairs`
and `themeContrastFailures` JSDoc to name the soft fills.

### 4.2 `packages/tokens/src/ring-soft.test.ts` (new)

Header states the gap (the ring was measured on eight surfaces; a toast action
button focuses on a soft fill; no shipped set fails, but nothing guarded it).

Tests:

1. **Every shipped set keeps the ring perceivable on all four soft fills.**
   Build the sixteen variants; collect misses; assert empty.
2. **High contrast clears 4.5:1** on all four, for both modes and the platform
   variants.
3. **The identity light floor has margin** — assert the tightest shipped pair
   (`warningSoft`) is `>= 3` without quoting a literal ratio; it is reported as
   the weakest of the four.
4. **The public checker reports the pairs.** Extend the identity light theme
   with `ring: light.background`; filter `themeContrastFailures` to soft
   backgrounds and assert exactly the four at `boundary` / floor 3.
5. **Publishes one pair per soft fill** — `ringSoftPairs` has four entries, one
   per fill, no duplicates, and they are in `contrastPairs`.

Keep the file under ~100 lines.

### 4.3 `packages/tokens/src/contrast.test.ts`

- Header: plan 093 paragraph — the ring was measured on eight surfaces but not
  the four soft status fills a toast action button sits on; all sixteen shipped
  variants already clear the floor, so no colour moves and the pairs are the
  guarantee.
- `covers every documented pair`: `113` → `117`.

### 4.4 `packages/tokens/src/docs.test.ts`

- The ring sentence gains: "It is also measured on the four soft status fills,
  because a Toast's action button is focused while it sits on its own tint."
  Mirror the exact wording in `docs/tokens.md` and `docs/design-system.md` §9.

### 4.5 `docs/tokens.md`

- §Checking a theme: the ring clause adds the four soft fills and names
  `ringSoftPairs`.
- §Verification ring paragraph: add the sentence from §4.4, a note that all
  sixteen shipped variants already clear the floor (the tightest is identity
  light `warningSoft`), and the pair count.

### 4.6 `docs/design-system.md`

- §9 row: `focus ring on … washes and the four soft status fills, and essential
  boundaries on …`.

### 4.7 `packages/tokens/README.md`, `readme.test.ts`, `COMPONENTS.md`, `TODO.md`

- README ring paragraph: add the soft fills and the "no shipped set fails"
  sentence; `readme.test.ts` asserts it.
- `COMPONENTS.md` *Theme contrast check* row: `113` → `117`, add the plan 093
  sentence, add `ring-soft.test.ts` to the test list.
- `TODO.md`: tick the row and bump `60/79` → `61/80`.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes with 31 files, `check`/`lint`/root `test`
clean.

**Two-direction proof:**

1. Remove `...ringSoftPairs` from `contrastPairs`: the pair-count test must fail
   (`expected 113 to be 117`) and the four-pair test must fail. Restore.
2. Set identity dark `ring` to its `successSoft` value: the shipped-theme test
   must fail on `successSoft` at 1:1. Restore.
3. Confirm the final suite is green.

Record the exact failure text in §8.

## 6. STOP conditions

- **A shipped set fails a soft ring pair.** Every set was measured during the
  audit and passes (3.37:1 at the tightest). A failure means a palette or
  platform value moved after plan 092 — report the set and value instead of
  picking a new ring.
- **`ringSurfaces` changes.** The eight-surface sentence is pinned by
  `docs.test.ts`; the soft fills belong to their own list.
- **A consumer hard-codes the ring value.** Record it in `TODO.md`; do not edit
  the other workstream.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `ring-soft` #1 | unit | a shipped theme losing the ring on a soft status fill |
| `ring-soft` #2 | unit | the AAA ring dropping under 4.5 on a soft fill |
| `ring-soft` #3 | unit | the tightest default pair losing its margin |
| `ring-soft` #4 | unit | the public checker silently dropping the soft fills |
| `ring-soft` #5 | unit | the soft list shrinking or growing without a deliberate edit |
| `contrast.test.ts` pair count | unit | a pair added or removed without updating the stated total |
| `docs.test.ts` sentence and §9 row | unit | a document that stops naming a surface the contract checks |

## 8. Outcome

Filled in after execution; the numbers and the commands that produced them are
recorded here, not predicted.

## 9. Acceptance

- [ ] `ringSoftPairs` is public (via `contrastPairs`) and reported by
      `themeContrastFailures`.
- [ ] Every shipped theme clears the boundary floor on all four soft fills, and
      both high-contrast sets clear 4.5:1.
- [ ] The checker names the four soft fills when a theme regresses.
- [ ] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` name the surfaces and the counts.
- [ ] `nub run check`, `nub run lint` and `nub run test` pass.
- [ ] The plan index row is marked done and the `TODO.md` row is ticked.

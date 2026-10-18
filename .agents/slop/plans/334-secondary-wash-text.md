# 334 — The secondary control's label on the washes it paints

Phase: F (docs-truth and contrast completeness) · Workstream: `tokens-theme` ·
Depends on: 097, 309, 318, 332 · Block: `300–399` (free)

## 1. The defect

`contrastPairs` measures `secondaryForeground` on the designed neutral family —
`secondary`, `secondaryHover`, `secondaryActive` — but not on the generic
`hover`/`active` washes. The shipped secondary Button in
`packages/components/src/internal/button.tsx` (on `master`) paints exactly that
composition:

```ts
Match.when("secondary", () => ({
  backgroundColor: theme.colors.secondary,
  color: theme.colors.secondaryForeground,
  borderWidth: theme.borderWidth.thin,
  borderColor: theme.colors.border,
  hover: { backgroundColor: theme.colors.hover },
  active: { backgroundColor: theme.colors.active },
})),
```

The label keeps `secondaryForeground` while the fill becomes `hover` or
`active`. The edge is already measured there (`controlFillPairs`), the label is
not. So a copied platform style or brand theme can retint `hover`/`active`
until the neutral button's label disappears mid-interaction while
`themeContrastFailures` returns `[]`. This is the same class of defect plans
316 and 318 closed one role over: a documented composition with no pair.

The intended design is still the designed family (`secondaryHover` /
`secondaryActive`, plan 097); the cross-team migration of the consumer is
recorded in `TODO.md`. The contract cannot wait for it: the library ships the
generic-wash composition today, and an edited theme must not erase a label that
is on screen.

## 2. Measured baseline

Across the 24 distinct shipped colour sets (identity, the three real platform
variants and the XP/Aero recipes, each in light/dark and default/high), the two
pairs already clear their floors, so **no colour moves**:

| Pair | Floor (default / high) | Tightest shipped | Theme |
| ---- | ---------------------- | ---------------- | ----- |
| `secondaryForeground` on `hover` | 4.5 / 7 | **10.42:1** | `darwin` dark default |
| `secondaryForeground` on `active` | 4.5 / 7 | **9.44:1** | `linux` dark default |

The pair count is `290 + 2 = **292**`.

## 3. Files to change

### 3.1 `packages/tokens/src/contrast.ts`

After the three `secondaryForeground` family entries in `contrastPairs`
(currently lines 551–553), add a named list beside the other small contract
lists and spread it there. Suggested shape:

```ts
/**
 * The generic washes the shipped secondary control paints behind its label.
 * `components/internal/button.tsx` keeps `secondaryForeground` while the fill
 * becomes `hover`/`active`; the designed family is `secondaryHover` /
 * `secondaryActive` (plan 097) and the consumer migration is cross-team, but
 * the shipped composition needs a pair until it lands.
 */
const secondaryWashPairs: readonly ContrastPair[] = [
  ["secondaryForeground", "hover", "secondary"],
  ["secondaryForeground", "active", "secondary"],
];
```

and in `contrastPairs`, next to the family:

```ts
["secondaryForeground", "secondary"],
["secondaryForeground", "secondaryHover", "secondary"],
["secondaryForeground", "secondaryActive", "secondary"],
...secondaryWashPairs,
```

Extend the `contrastPairs` doc comment with one sentence naming the two washes
and the shipped secondary control.

### 3.2 `packages/tokens/src/contrast.test.ts`

- `expect(contrastPairs.length).toBe(290)` → `292` (line 350).
- Keep the uniqueness assertion — the two new tuples are distinct.

### 3.3 `packages/tokens/src/secondary-wash-text.test.ts` (new)

Header comment states the guarded bug: the secondary Button keeps
`secondaryForeground` on the generic washes while the contract measured only the
designed family, so an edited wash could erase the label silently.

Cases (mirror the structure of `neutral-press-edge.test.ts`, including its
`themes` array of identity + real platforms + recipes across both axes):

1. **The contract names both washes once each.**
   Filter `contrastPairs` for `secondaryForeground`; assert the backgrounds are
   exactly `["secondary", "secondaryHover", "secondaryActive", "hover",
   "active"]`, each with class `secondary`.
2. **Every shipped theme clears its declared floor.**
   For each theme in `themes` and both washes, assert
   `contrastRatio(theme.colors.secondaryForeground, theme.colors[wash]) >=
   contrastFloors[theme.contrast].secondary`; collect failures as strings and
   assert `[]`.
3. **The erased-label regression is reported.** Build
   `extendTheme(getTheme("light"), { colors: { secondaryForeground:
   getTheme("light").colors.hover } })`, run `themeContrastFailures`, filter to
   the `secondaryForeground`/`hover` pair; assert one failure with class
   `secondary`, floor `contrastFloors.default.secondary` and ratio
   `toBeCloseTo(1, 5)`. Repeat with `active`.
4. **The AAA level is the declared one.** Build the same regression from
   `getTheme("dark", "high")` against its `hover`; assert `floor` is
   `contrastFloors.high.secondary` and the failure is reported without a second
   argument (the theme declares `high`).
5. **The figures the catalogue quotes are pinned.** Reduce the same `themes`
   list to the tightest ratio per wash and assert `10.42` (`darwin` dark
   default, `hover`) and `9.44` (`linux` dark default, `active`), so a palette
   edit cannot leave the prose quoting a number the themes no longer produce
   while the floor still passes — the guard plan 075 established for quoted
   figures.

### 3.4 `packages/tokens/src/docs.test.ts`

- The pair-count history now ends at 292: change the fixed start in
  `ends the pair-count history at the contract's shipped size` from 276 to 290
  (`taking it from 290 to **${contrastPairs.length}**`).
- `names the audit series through the latest plan`: `plans \`076\`–\`332\` closed`
  → `076`–`334`.

### 3.5 `docs/tokens.md`

- Pair-count history (the paragraph ending at line 1494): keep the 332 sentence
  and append: “Plan `334` adds the secondary control's label on the generic
  `hover`/`active` washes the shipped Button paints, taking it from 290 to
  **292**.”
- Filled-state paragraph (after line 1513): add two sentences — the shipped
  `components` secondary Button keeps `secondaryForeground` while it steps onto
  the generic washes instead of the designed family; the contract holds the
  label there (tightest 10.42:1 on `hover`, 9.44:1 on `active`), and the
  designed family remains the target for the cross-team migration.
- Do not change the role table or any numeric role count (no role is added).

### 3.6 `docs/design-system.md`

In §8, after the filled-control paragraph (line 287–307), add one sentence: a
consumer that still paints the generic `hover`/`active` washes under a neutral
control keeps `secondaryForeground` at the secondary floor on both, because the
shipped secondary Button does; the designed `secondaryHover`/`secondaryActive`
family is the preferred state.

### 3.7 `COMPONENTS.md`

`Theme contrast check` row: `the same 290 contrast pairs` →
`the same 292 contrast pairs`, and append one sentence naming the secondary
label pair and the shipped composition. `inventory.test.ts` derives the phrase,
so the number must match `contrastPairs.length`.

### 3.8 `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)”, after the plan-333 row:

```
`[x]` Hold the shipped secondary control's label on the generic washes it
paints — `components/internal/button.tsx` keeps `secondaryForeground` while
hovering and pressing onto `hover`/`active`, but the contract measured only the
designed family, so an edited wash could erase the label while the checker
returned `[]`; every shipped set already passes (10.42:1 at the tightest), so no
colour moves and the contract grows 290 → 292 (plan 334)
```

Keep the section's progress bar current (`101/134` → `102/135`).
**Do not** keep the cross-team row that asks `components` to migrate to
`xHover`/`xActive` — it stays open; this plan guards the shipped composition
regardless.

### 3.9 `.agents/slop/plans/README.md`

- Add the table row after 333:

```
| [334](./334-secondary-wash-text.md) | The secondary control's label on the washes it paints | F | 097, 309, 318, 332 | done |
```

- Append a rationale paragraph after the plan-333 paragraph, in the same voice:
  the shipped secondary Button paints `hover`/`active`, the designed family is
  `secondaryHover`/`secondaryActive`, and the two pairs are the safety net until
  the cross-team migration lands; no colour moves.

## 4. Commands and expected results

From the worktree root, on branch `agent/tokens-theme`:

```bash
nub run --filter @gpuixui/tokens test
```

Expected: **56 test files, 3670 tests, all green**; the run before the change was
55 files / 3646 tests and the new file adds four cases.

```bash
nub run check
```

Expected: `check:tests` reports every test asserts something; oxlint and oxfmt
are clean; `packages/tokens` and `packages/deploy` type-check.

```bash
nub run test
```

Expected: the workspace suite is green (tokens, docs, playground, deploy). If a
failure is outside `packages/tokens`, `docs/tokens.md` or
`docs/design-system.md`, stop and record it rather than editing another
workstream's paths.

## 5. Two-directions proof

`scripts/verify-two-directions.sh` drives `jj`, which is not installed on this
box (`PLAN.md` D1). Prove the test by hand:

1. With the two pairs absent from `contrastPairs` (comment the
   `...secondaryWashPairs,` spread out), run
   `nub run --filter @gpuixui/tokens test -- src/secondary-wash-text.test.ts`.
   Expect **failure** in case 1 (the pair is missing) and in cases 3/4
   (`themeContrastFailures` returns no failure for the erased label).
2. Restore the spread, re-run the file. Expect **green**.

Observed on 2026-10-18: unfixed → `Tests 3 failed | 1 passed (4)` (the
contract-list case, the light erased-label case and the AAA case; the shipped
sets case stays green because no colour fails); fixed → `Tests 4 passed (4)`.
Record both outputs in the commit message; do not claim the proof without
running it.

## 6. STOP conditions

- Any shipped theme fails one of the two pairs. Then this is not a guard but a
  palette defect: stop, record the failing set and ratio, and write a follow-up
  plan that moves the wash or the label with the contrast floors intact. Do not
  silently move a value in this plan.
- The pair already exists (a duplicate tuple), or `contrastPairs.length` is not
  290 before the change. Re-read the branch state; another plan may have landed.
- A test file outside the three owned paths must change to make the suite green.
  Stop and record it as a cross-team task in `TODO.md`.

## 7. Acceptance criteria

- `secondaryForeground` on `hover` and `active` are documented pairs with the
  `secondary` class, exactly once each.
- All 24 shipped colour sets pass the two pairs; no token value moves.
- `contrastPairs.length` is 292 and every document, ledger row and guard that
  states it agrees.
- The new test fails without the pairs and passes with them (both directions
  observed).
- `nub run --filter @gpuixui/tokens test`, `nub run check` and `nub run test`
  pass; the work is committed on `agent/tokens-theme` and pushed.

## 8. Outcome (executed on this host, 2026-10-18)

- `secondaryWashPairs` joins `contrastPairs` beside the designed neutral family;
  the contract is **292** pairs and `contrast.test.ts` pins the new length.
- Both quoted figures were re-derived over the **24** distinct shipped colour
  sets before they were written into the documents: the tightest
  `secondaryForeground` on `hover` is **10.42:1** (`darwin` dark default) and on
  `active` **9.44:1** (`linux` dark default), matching the plan's baseline, and
  now pinned by a case so the prose cannot drift from the themes.
- Two-direction proof, run and restored: with `...secondaryWashPairs` removed the
  new file reported **3 failed | 1 passed (4)** — the pair list was missing both
  washes, and `themeContrastFailures` returned `[]` for the erased label in the
  light and AAA regressions; with the spread restored all **4** cases pass.
- Green, run not assumed: **56 test files, 3670 tests** (3646 before the four new
  cases), `nub run check`, `nub run lint` and `nub run test`.
- No token value, role, floor or platform style changes; the designed
  `secondaryHover`/`secondaryActive` family stays the migration target recorded
  cross-team.

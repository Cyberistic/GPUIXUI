# 340 — The invalid control's focus ring

Phase: F (contrast completeness) · Workstream: `tokens-theme` ·
Depends on: 017, 071–095, 300, 325, 339 · Block: `300–399` (free)

## 1. The defect

GPUix 0.10.0 has no `outline*` and no `focusVisible`, so the focus ring is a
zero-offset, zero-blur `boxShadow` spread by `borderWidth.strong`
(`focusRing(theme)`). A control can recolour that ring when it is invalid:
`packages/primitives/src/core/style.ts` `controlFocusStyle` returns the ring with
`color: theme.colors.destructive` when `spec.invalid === true`, and
`otpCellStyle` / `NumberField` call it for a focused invalid field.

The contrast contract measures the ring role on the surfaces a focused control
sits on (`ringPairs`, eight surfaces) and on the four soft status fills
(`ringSoftPairs`), but it measures `destructive` only as a **fill** (its
on-colour foreground, its hover and pressed steps, and its perceivability on a
surface) and as an **edge on the field's own fill** (`invalidEdgePairs`, plan
325). The invalid control's ring is neither: it is `destructive` painted
*outside* the control, on the surface behind it.

So a copied platform style or brand theme can set `destructive` close to a card,
a popover, a row wash or a soft status fill and erase the only focus indicator an
invalid control has — the runtime cannot draw a second one — while
`themeContrastFailures` returns `[]`. This is the same class of gap plans 074, 086
and 093 closed for the regular ring, and plan 325 opened for the invalid state.

## 2. Measured baseline

Across the 24 shipped colour sets, `destructive` on the ring surfaces
already clears the boundary floor, so **no colour moves**:

| Pair class | Floor (default / high) | Tightest shipped | Theme / surface |
| ---------- | ---------------------- | ---------------- | --------------- |
| `destructive` as the ring | 3 / 4.5 | **3.048:1** | `linux` dark default on `selected` |
| `destructive` as the ring | 3 / 4.5 | **5.502:1** | the dark AAA sets on `active` |

Next-tightest default sets: Linux dark `active` 3.401, Windows dark `active`
3.455 (the XP/Aero dark halves share that palette), identity dark `active`
3.640. The AAA minimum is 5.502:1 on `active`; every AAA surface clears the 4.5:1
boundary floor with margin.

The pair count is `294 + 11 = **305**`.

## 3. Files to change

### 3.1 `packages/tokens/src/contrast.ts`

`ringSurfaces` stays module-local — exporting it would add a public value the
reference page must name for no consumer gain. Add, after `ringSoftPairs`:

```ts
/**
 * The invalid control's focus ring. `controlFocusStyle` recolours the ring with
 * `destructive` when a field fails validation, and the runtime can draw only
 * one ring, so the error ring is the control's only focus indicator. It is
 * painted outside the control on the same surfaces the regular ring sits on,
 * not on the field's own fill.
 */
export const invalidRingPairs: readonly ContrastPair[] = [
  // `destructive` on `background` is already the ColorPicker hex field's error
  // edge (plan 325), and the ring shares that composition; adding it twice
  // would break the contract's uniqueness.
  ...ringSurfaces
    .filter((background) => background !== "background")
    .map(
      (background): ContrastPair => ["destructive", background, "boundary"],
    ),
  ...softSurfaceRoles.map(
    (background): ContrastPair => ["destructive", background, "boundary"],
  ),
];
```

In `contrastPairs`, immediately after `...ringSoftPairs,`, spread
`...invalidRingPairs,`. `background` is deliberately not added twice: the field
edge already measures it, so `invalidRingPairs` holds eleven pairs and the total
moves 294 → 305.

Extend the `contrastPairs` doc comment with one sentence: the invalid control's
ring is `destructive` on the same surfaces, because the runtime can draw only one
ring and the error colour replaces the focus colour.

### 3.2 `packages/tokens/src/contrast.test.ts`

`expect(contrastPairs.length).toBe(294)` → `305`.

Add to the completeness suite's measured-role walk nothing: `destructive` and the
surfaces are already measured roles.

### 3.3 `packages/tokens/src/invalid-ring.test.ts` (new)

Header comment states the guarded bug: `controlFocusStyle` paints the invalid
field's only focus indicator with `destructive`, but the contract measured that
role as a fill and as the field's own edge, never as the ring on the surface
behind the control. State that every shipped set passes (3.048:1 at the
tightest) so no colour moves.

Build the 24-set `themes` array as `field-adornment-text.test.ts`.

Cases:

1. **The contract names the invalid ring on every surface it adds once.** Assert
   `invalidRingPairs` is exactly `card`, `popover`, `muted`, `accent`, `hover`,
   `active`, `selected`, `infoSoft`, `successSoft`, `warningSoft`,
   `destructiveSoft`, each `[destructive, surface, "boundary"]`; every entry is in
   `contrastPairs`; and `["destructive", "background", "boundary"]` already
   exists from the invalid field edge, so the ring adds no duplicate.
2. **Every shipped theme clears its declared boundary floor.** For each theme and
   each surface, `contrastRatio(theme.colors.destructive, theme.colors[surface])
   >= contrastFloors[theme.contrast].boundary`; collect failures as strings and
   assert `[]`.
3. **The erased focus ring is reported on a light card.** `extendTheme(
   getTheme("light"), { colors: { destructive: getTheme("light").colors.card }
   })`, filter `themeContrastFailures` to `foreground === "destructive" &&
   background === "card" && pairClass === "boundary"`; assert exactly one
   failure with floor `contrastFloors.default.boundary` and ratio
   `toBeCloseTo(1, 5)`.
4. **The AAA level is the declared one.** The same regression from
   `getTheme("dark", "high")` on `popover`; assert floor
   `contrastFloors.high.boundary` (4.5) and ratio 1 with no second argument.
5. **The soft status fills are covered too.** Assert the four soft fills appear in
   `invalidRingPairs`, so an invalid cell inside an Alert keeps its ring; every
   shipped set clears 5.5:1 or better there.
6. **Pin the tightest figures the catalogue quotes.** Reduce the 24 themes to the
   worst default and the worst AAA, surfacing `[label, surface, ratio]` from the
   reduce; assert `["linux dark default", "selected", 3.048]` and
   `["identity dark high", "active", 5.502]` with `Number(ratio.toFixed(3))`.
   Every AAA platform variant carries the identity palette, so the AAA label is
   the first dark set in the loop's order.

### 3.4 `packages/tokens/src/docs.test.ts`

- `ends the pair-count history at the contract's shipped size`: the fixed start
  becomes `taking it from 294 to **${contrastPairs.length}**`.
- `names the audit series through the latest plan`: `plans \`076\`–\`339\` closed`
  → `076`–`340`.
- The design-system floor row for focus (around line 1201) gains the invalid-ring
  clause described in §3.6.

### 3.5 `docs/tokens.md`

- `themeContrastFailures` list paragraph: after the focus-ring sentences, add
  “An invalid control recolours that ring with `destructive` (the runtime can
  draw only one), so the role is measured as a boundary on the seven ring
  surfaces the field edge does not already cover and the four soft status
  fills.”
- The Focus section: after the ring paragraph, add a sentence that an invalid
  field's ring takes `destructive` and is held to the same boundary floors on
  every surface a control sits on (`invalidRingPairs`).
- Verification paragraph: the “3:1 for focus and essential boundaries” clause
  gains “including the `destructive` ring an invalid control paints”.
- Pair-count history: after the plan-339 sentence add “Plan `340` holds the
  invalid control's `destructive` focus ring on the eleven surfaces the ring
  adds — `background` is already the field edge (plan 325) — taking it from 294
  to **305**.”
- The audit-series sentence names plan `340`.

### 3.6 `docs/design-system.md`

- §7 focus: one sentence — an invalid field's ring is `destructive`; the runtime
  can draw only one ring, so the error colour is the focus indicator and the
  boundary floors apply where it is painted.
- §9 floor table, focus row: append “, and the `destructive` ring an invalid
  control paints on the same surfaces” after the invalid field edge clause.

### 3.7 `packages/tokens/README.md`

Add one sentence to the paragraph that describes the ring pairs: an invalid
control recolours the ring with `destructive`, so the same surfaces are measured
for the error ring too (plan 340).

### 3.8 `COMPONENTS.md`

- `Theme contrast check` row: `the same 294 contrast pairs` → `the same 305
  contrast pairs`.
- Append after the plan-339 sentence: “Plan 340 holds the invalid control's
  `destructive` focus ring on the seven ring surfaces it did not already share
  with the field edge and the four soft status fills (294 → 305 pairs).”

### 3.9 `TODO.md`

Add under “Design tokens and theming (`tokens-theme`)”:

```
`[x]` Hold the invalid control's focus ring — `controlFocusStyle` recolours the
ring with `destructive` when a field fails validation, and the runtime can draw
only one ring, but the contract measured that role as a fill and as the field's
own edge, never as the ring on the surface behind the control; every shipped set
passes (3.048:1 at the tightest), so no colour moves and the contract grows
294 → 305 (plan 340)
```

Bump the section bar by one (`107/140` → `108/141`).

### 3.10 `.agents/slop/plans/README.md`

- Table row after 339:

```
| [340](./340-invalid-control-ring.md) | The invalid control's focus ring | F | 017, 071–095, 300, 325, 339 | done |
```

- A rationale paragraph after the 339 paragraph: the ring is the runtime's only
  focus indicator and an invalid control recolours it with `destructive`; the
  contract had measured the role as a fill and a field edge but not as a ring on
  the surface behind the control, so the eleven pairs close the invalid focus
  state without moving a colour.

## 4. Commands and expected results

From the worktree root on branch `agent/tokens-theme`:

```bash
nub run --filter @gpuixui/tokens test
```

Expected: **60 test files, all green** (59 before; the new file adds six cases).

```bash
nub run check
nub run lint
nub run test
```

Expected: all green. A failure outside `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `packages/tokens/README.md`, `COMPONENTS.md`,
`TODO.md` or the plan index belongs to another workstream: stop and record it.

## 5. Two-directions proof

`scripts/verify-two-directions.sh` drives `jj`, which is not installed
(`PLAN.md` D1). Prove by hand:

1. With `...invalidRingPairs` commented out of `contrastPairs`, run
   `./node_modules/.bin/vitest run src/invalid-ring.test.ts` from
   `packages/tokens`. Expect **failure** in cases 1, 3 and 4 (the pair is
   missing and the erased ring is not reported); cases 2, 5 and 6 read the
   palette and the list, so they still pass.
2. Restore the spread and re-run. Expect **green**.
3. Record both outputs in the commit message and in §8; do not claim the proof
   without running it.

## 6. STOP conditions

- Any shipped theme fails `destructive` on a ring surface at its declared
  boundary floor. Then this is a palette defect, not a guard: record the set,
  surface and ratio, write a follow-up plan that moves the value, and do not move
  a colour in this plan.
- `contrastPairs.length` is not 294 before the change, or `destructive` already
  has boundary pairs on the ring surfaces. Re-read the branch; a peer may have
  landed the same plan.
- `ringSurfaces` cannot be exported without changing its type or breaking an
  existing import. Stop and record why; do not restructure the module for one
  list.
- A test outside the listed files must change to make the suite green. Stop and
  record it as a cross-team task in `TODO.md`.
- A peer `tokens-theme` session is writing the same files: this worktree has
  documented concurrent writers
  (`.agents/slop/blockers/2026-10-17-concurrent-tokens-writers.md`). If
  `git status` shows changes you did not make, stop and reconcile before
  committing; never `git add -A` over a peer's edits.

## 7. Acceptance criteria

- `destructive` as the invalid control's ring is a documented `boundary` pair on
  all eight ring surfaces and the four soft status fills, exactly once each.
- All 24 shipped colour sets pass it; no token value moves.
- `contrastPairs.length` is 305 and every document, ledger row and guard that
  states it agrees.
- The new test fails without the pair and passes with it (both directions
  observed).
- `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test` pass; the work is committed on `agent/tokens-theme` and pushed.

## 8. Outcome (recorded by the executor)

- Baseline confirmed by a probe over the 24 shipped sets: tightest default is
  `linux` dark on `selected` at **3.048:1**, then Linux dark `active` 3.401 and
  Windows dark `active` 3.455; tightest AAA is **5.502:1** on `active` in every
  dark AAA set. All clear 3:1 / 4.5:1, so no shipped value moved.
- Two directions observed: with `...invalidRingPairs` commented out,
  `invalid-ring.test.ts` reported **3 failed | 3 passed (6)**; restored,
  **6 passed**.
- Green, run not assumed: **60 test files, 3831 tests**,
  `nub run --filter @gpuixui/tokens test`, `nub run check`, `nub run lint` and
  `nub run test`.

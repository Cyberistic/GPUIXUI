# 095 — The decorative divider on the soft status fills

| Field | Value |
| ----- | ----- |
| Phase | F (accessibility truth) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`, `docs/design-system.md`) |
| Depends on | plans `076` (the soft surface floor), `080` (the decorative divider), `090` (the soft status edge), `094` (the skeleton on the row washes) |
| Status | done |

Self-contained. A weaker executor can follow it in order.

---

## 1. Why

Plan `094` audited the remaining compositions and measured the decorative
`border` role on the four soft status fills for the first time. It is **below the
1.05:1 divider floor** in three dark sets:

| Set | Surface | Measured |
| --- | ------- | -------- |
| Windows dark | `successSoft` | **1.015:1** |
| identity dark | `successSoft` | **1.023:1** |
| identity dark | `destructiveSoft` | **1.040:1** |
| Linux dark | `successSoft` | **1.047:1** |

An Alert, Badge or Toast can contain a divider: a status panel with a footer or
an action row separates it with a line. The line disappears on the fills above.

Two fixes were measured before choosing:

1. **Move the decorative role.** The dark greys sit in the same luminance band as
   the `successSoft` green, and Windows and Linux dark cannot lighten `border`
   far enough without colliding with their own `active` wash (the control-fill
   divider pair needs 1.05:1 there). Rejected.
2. **Darken the two offending fills** in the identity dark set — `successSoft`
   `#0C452D` → `#0A3E28`, `destructiveSoft` `#6B1A1D` → `#66191B` (each 20% of
   the way to its family's 950 step). Every other set inherits them, Linux dark
   keeps its own `destructiveSoft`. Measured cost: identity card 1.53:1 → 1.39:1
   and popover 1.36:1 → 1.24:1; Linux dark card 1.20:1 → 1.09:1. All stay above
   the 1.05:1 surface floor, and every other contract pair stays green. Accepted.

With the move, `border` clears the divider floor on all four fills in all
sixteen shipped variants; the tightest is identity dark on `infoSoft` at
**1.051:1** (a pre-existing value, unchanged), then identity dark
`successSoft` at 1.075:1.

## 2. Design decisions (do not re-litigate)

1. **The four soft fills join the `divider` class** for `border`, beside
   `background`, `card`, `popover` and the four control fills. Pair count
   `121 → 125`.
2. **Two identity dark fills move; no border moves.** Every platform dark style
   inherits the identity's `successSoft` and `destructiveSoft` (Linux keeps its
   own `destructiveSoft`, which already passes at 1.159:1).
3. **The surface floor still holds.** The tints lose 9–15% of their distance from
   the canvas and remain at or above 1.09:1 on their weakest surface; plan `076`
   is not weakened.
4. **No floor changes.** `divider` stays 1.05:1 default, 3:1 high contrast.
5. **The designed edge is still the edge *of* a soft surface.** `xSoftBorder`
   (plan `090`) keeps its role; this plan only covers a plain `border` painted
   inside one.

## 3. Exact files to create or change

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/095-soft-fill-divider.md` | **new** — this plan |
| `.agents/slop/plans/README.md` | add the `095` row and paragraph |
| `packages/tokens/src/contrast.ts` | `border` on the four soft fills; JSDoc |
| `packages/tokens/src/color.ts` | the two dark fills; comments |
| `packages/tokens/src/soft-divider.test.ts` | **new** — floors, exact regression, checker, surface cost, pair wiring |
| `packages/tokens/src/contrast.test.ts` | header paragraph; pair count `121` → `125` |
| `packages/tokens/src/docs.test.ts` | the divider sentence and the quoted figures |
| `packages/tokens/src/readme.test.ts` | the README clause |
| `packages/tokens/README.md` | the divider sentence |
| `docs/tokens.md` | colour values, the status and verification prose |
| `docs/design-system.md` | §7 `border` bullet, §9 row |
| `COMPONENTS.md` | *Theme contrast check* row |
| `TODO.md` | tick the row, bump the bar |

Do **not** edit `apps/*`, `packages/components`, `packages/primitives` or any
other workstream's path.

## 4. Exact changes

### 4.1 `packages/tokens/src/contrast.ts`

After `softBorderPairs`:

```ts
/**
 * The soft status fills a plain divider is painted on. An Alert or Toast can
 * separate a footer or an action row with a line, and the divider must stay
 * visible there like it does on the canvas.
 */
const softDividerPairs: readonly ContrastPair[] = softSurfaceRoles.map(
  (background): ContrastPair => ["border", background, "divider"],
);
```

Spread it after `...softBorderPairs`, and name the soft fills in the
`contrastPairs` JSDoc.

### 4.2 `packages/tokens/src/color.ts`

In `darkColors`:

```
successSoft: "#0A3E28",        // was #0C452D
destructiveSoft: "#66191B",    // was #6B1A1D
```

Extend the `darkColors` comment: the two fills are dark enough for a divider to
stay visible on them while keeping the soft surface floor on the card (plan 095).

### 4.3 `packages/tokens/src/soft-divider.test.ts` (new)

Header states the defect and the trade (the four figures above, the tint cost).

Tests:

1. **Every shipped set keeps the divider perceivable on all four soft fills** —
   sixteen variants, `border` on each fill, floor by declared contrast.
2. **The exact regression** — identity dark's old `#0C452D` measures < 1.05 with
   its border while the shipped value clears it; Windows dark's inherited fill
   was 1.015, the worst; Linux dark 1.047.
3. **The surface floor survived the move** — identity dark `successSoft` on card
   is still ≥ 1.35 and Linux dark's is ≥ 1.05 (it is 1.09), so the tint did not
   trade its own contract.
4. **The public checker reports the fills** — extend the identity light theme
   with `border: light.colors.successSoft`; filter to soft backgrounds and assert
   the failing fills at `divider` / floor 1.05.
5. **Publishes one pair per soft fill** — four, no duplicates, in order.

Keep the file under ~100 lines.

### 4.4 `packages/tokens/src/contrast.test.ts`

- Header: plan 095 paragraph — `border` was measured on the canvas, the card, the
  popover and the control fills but not the soft status fills; four dark pairs
  were under 1.05, the worst Windows dark at 1.015, so the four fills join the
  divider class and two dark tints move.
- `covers every documented pair`: `121` → `125`.

### 4.5 `docs/tokens.md`

- Default colour table: dark `successSoft` `#0C452D` → `#0A3E28`,
  `destructiveSoft` `#6B1A1D` → `#66191B`.
- Status section: a divider inside a soft surface is held to the divider floor;
  state the worst measured pair and the tint cost of the fix.
- §Checking a theme and §Verification: the divider clause adds the four fills and
  the figures, derived in `docs.test.ts`.
- §8 of the design system and §9 rows per §4.6.

### 4.6 `docs/design-system.md`

- §7 `border` bullet: it is held on the soft status fills too, and a divider
  inside an Alert uses `border` (the `xSoftBorder` role is the edge *around* the
  surface, not a divider inside it).
- §9 row: the decorative-divider row adds `infoSoft`/`successSoft`/`warningSoft`/
  `destructiveSoft`.

### 4.7 `packages/tokens/README.md`, `readme.test.ts`, `COMPONENTS.md`, `TODO.md`

- README: the divider sentence gains the four fills, the worst figure and the
  two moved tints.
- `readme.test.ts` asserts it.
- `COMPONENTS.md` *Theme contrast check*: `121` → `125`, plan 095 sentence,
  `soft-divider.test.ts` in the test list. *Design tokens*: extend the divider
  clause.
- `TODO.md`: tick the pending row and bump `62/82` → `63/82`.

## 5. Commands, in order

```sh
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens check-types
nub run check
nub run lint
nub run test
```

Expected: the package suite passes with 33 files.

**Two-direction proof:**

1. Restore identity dark `successSoft` to `#0C452D`: the new suite must fail on
   `successSoft` (1.023) and the inherited dark sets, and the surface-floor test
   must still pass. Restore.
2. Remove the four soft fills from the pair list: the pair count must fail
   (`expected 121 to be 125`) and the four-pair test must fail. Restore.
3. Confirm the final suite is green.

Record the exact failure text in §8.

## 6. STOP conditions

- **A soft fill drops below the 1.05:1 surface floor on `background`, `card` or
  `popover` after the move.** The measured worst is Linux dark at 1.09:1; a lower
  value means another fill or surface moved. Do not accept it.
- **Any other contract pair turns red.** The four moved values were checked
  against every pair (soft text, selection wash, ring, boundary); a new failure
  means the palette moved elsewhere.
- **`border` collides with `xSoftBorder` in a set.** They are different roles:
  the edge around the surface versus a divider inside it.
- **A consumer hard-codes the old fills.** Record it in `TODO.md`; do not edit
  the other workstream.

## 7. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `soft-divider` #1 | unit | a shipped theme losing the divider on a soft fill |
| `soft-divider` #2 | unit | the exact 1.015–1.047 regressions |
| `soft-divider` #3 | unit | the tint giving up its own surface floor for the divider |
| `soft-divider` #4 | unit | the public checker silently dropping the fills |
| `soft-divider` #5 | unit | the pair list shrinking or growing without a deliberate edit |
| `contrast.test.ts` pair count | unit | a pair added or removed without updating the stated total |
| `docs.test.ts` figures | unit | a document quoting ratios the palette no longer produces |

## 8. Outcome (executed on this host, 2026-10-17)

- `contrastPairs` now holds **125** pairs: 121 + `border` on `infoSoft`,
  `successSoft`, `warningSoft` and `destructiveSoft`.
- Identity dark `successSoft` `#0C452D` → `#0A3E28` and `destructiveSoft`
  `#6B1A1D` → `#66191B`. The divider now measures 1.051–1.083:1 across the dark
  fills (identity `infoSoft` 1.051 is the tightest and unchanged); the tints stay
  at 1.39:1 on the identity card and 1.09:1 on the Linux card, above the 1.05
  surface floor.
- Two-direction proof (`nub run --filter @gpuixui/tokens test`):
  - restoring the success fill to `#0C452D` failed **2** tests with
    `identity dark default: border on successSoft at 1.0226504549179722`,
    `linux dark default: border on successSoft at 1.046912523451884` and
    `win32 dark default: border on successSoft at 1.0149771829745682`;
  - removing the four pairs failed **4** tests: `expected 121 to be 125`, the
    invisible-divider list, the checker test (`expected [] to include
    'successSoft'`) and the four-pair test
    (`expected [] to have a length of 4 but got +0`);
  - restored, the package suite is green: **33 files, 1612 tests**.
- `nub run check`, `nub run lint` and `nub run test` all pass.

## 9. Acceptance

- [x] `border` is measured on the four soft fills and reported by
      `themeContrastFailures`.
- [x] Every shipped theme clears 1.05:1 (3:1 at high contrast) on all four fills.
- [x] The two moved fills keep the surface floor on every canvas.
- [x] `docs/tokens.md`, `docs/design-system.md`, the package README and
      `COMPONENTS.md` name the surfaces, values and figures.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.
- [x] The plan index row is marked done and the `TODO.md` row is ticked.

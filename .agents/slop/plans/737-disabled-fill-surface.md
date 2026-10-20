# Plan 737 — the disabled fill is a fill: measured on the panel it paints on

**Workstream:** `tokens-theme` · **Phase:** F (contract truth) ·
**Depends on:** plans `306` (the inactive state), `309` (every interactive fill
on its panel), `595` (the field fill joins the fill surfaces), `610` (the scrim
over the resting fills), `733` (the unchecked selection control).

## 1. The defect this plan closes

`disabledControl(theme)` is the shipped designed state for an unavailable
control. It returns **three** properties and `opacity: 1`:

| Property | Role | Measured today? |
| -------- | ---- | --------------- |
| `backgroundColor` | `disabled` | **no** — no pair anywhere measures it against a panel |
| `color` | `disabledForeground` | yes — `inactivePairs`, `inactiveSoftPairs`, `selectionInactivePairs` |
| `borderColor` | `border` | yes — `["border", "disabled", "divider"]` |

So the helper's first property is dead data in the check: an edited theme whose
`disabled` equals the panel it paints on returns `[]` from all ten checks while
the control paints no fill at all. Probe on the shipped sets
(`shippedThemes`, `contrastRatio`) — the fill against the four panels a filled
control sits on (`background`, `card`, `popover`, `muted`) and the field fill
(`input`):

| Shipped set | `disabled` | panels under 1.05:1 |
| ----------- | ---------- | ------------------- |
| `Light · macOS` | `#EEF1F5` | `background` **1.015:1** |
| `Light · Linux` | `#EEF1F5` | `background` **1.040:1** |
| `Light · Windows` | `#EEF1F5` | `background` **1.021:1** |
| `Light · Windows 7` | `#EAF0F7` | `background` **1.025:1**, `muted` **1.025:1** |
| `Dark` | `#222730` | `popover` **1.000:1**, `muted` **1.000:1** |
| `Dark · Linux` | `#222730` | `background` **1.036:1** |

Eight pairs in six shipped sets. Two of them are the exact collision plan `306`
named as the defect and left in place: the identity dark `disabled` **is** its
`muted` panel and its `popover`, and the identity light `disabled` **is** its
`hover` wash. In the four light platform variants the fill is *lighter* than the
window behind it (macOS `background: #F2F2F7` under `#EEF1F5`), so a disabled
filled button reads as a raised panel rather than an unavailable control.

### 1.1 The recorded exemption is not true

Plan `306` exempted the fill deliberately, with this reason (`docs/tokens.md`,
`docs/design-system.md` §9): *"no neutral can clear both a white card and the
quiet panel"*. That is false, and the shipped palette already disproves it: the
identity light `disabled` measures **1.133:1** on its `card` and **1.103:1** on
its `muted` panel *at the same time*, because the surface floor is 1.05:1, not
3:1. The usable band for a light fill is wide — every candidate from `#E9EDF2`
to `#DDE2E9` clears `card`, `popover`, `muted` and the macOS canvas together
(probe in §4.1). The exemption was never forced by the palette; it survived
because nothing measured the fill.

The remaining justification — *"a disabled control keeps its shape with its
`border` edge, held to the divider floor on `disabled` itself"* — measures the
edge against the **fill**, not against the panel. With an invisible fill, the
edge's own distance from the panel is the product of two 1.05:1 steps; plan `610`
already treats the same fill as a resting surface a window shows (the modal scrim
is measured over it), and `overlaySurfaces` names it. A fill the contract says a
dialog opens over is a fill the contract should say is visible on its panel.

## 2. Decision (do not re-litigate)

- **`disabled` is measured as a fill on the same five surfaces every other fill
  is measured on** — `stateFillSurfaces`: `background`, `card`, `popover`, the
  quiet `muted` panel and the field's `input` fill. It is *not* measured on the
  pointer washes, for the same reason `stateFillSurfacePairs` excludes them: a
  wash is a row state, not the panel a control is placed on. A disabled control
  receives no pointer state of its own (plan `306`).
- **The pair list is `disabledFillPairs`**, exported beside
  `stateFillSurfacePairs`, held to the `surface` class (1.05:1 at both contrast
  levels). It is folded into `contrastPairs`: **465 → 470** pairs.
- **Five palette values move**, chosen to be designed steps inside each set's
  own neutral family and to keep every other pair (`disabledForeground` on the
  fill, `border` on the fill, the selection wash over it, the scrim, the dialog
  face, the elevation shadow) above its floor:

  | Set | Before | After | Why |
  | --- | ------ | ----- | --- |
  | `Light` (and the macOS, Linux, Windows light variants that inherit it) | `#EEF1F5` (`neutral[100]`, the `hover` wash) | `#E6EAF0` | a half-step between `neutral[100]` and `neutral[200]`; clears `background` at 1.082–1.134, and leaves the `hover` wash (1.066) |
  | `Dark` (and the Windows, XP and Win7 dark halves that inherit it) | `#222730` (`neutral[850]`, the `muted` panel and `popover`) | `#2A303B` (`neutral[800]`) | the next ramp step; clears `muted`/`popover` at 1.131 |
  | `Dark · macOS` | inherits `#222730` | `#353537` | its `muted`/`card`/`popover` are `#2C2C2E`; clears them at 1.139 |
  | `Dark · Linux` | inherits `#222730` | `#383838` | its `muted`/`card`/`popover` are `#303030`; clears them at 1.126 |
  | `Light · Windows 7` (Aero recipe) | `#EAF0F7` | `#E2EBF5` | its `muted` is `#EBF3FC`; clears it at 1.076 |

  The high-contrast sets (`#E8E8E8`, `#2E2E2E`) and XP light (`#E7E2CE`) already
  clear the floor at 1.065–1.282 and do **not** move.
- **The two documents stop calling the fill exempt** and state the measured rule;
  the false premise is deleted, not reworded around.

## 3. Files to change

All paths are relative to this worktree
(`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`).

### 3.1 `packages/tokens/src/color.ts`

1. `lightColors.disabled`: `palette.neutral[100]` → `"#E6EAF0"`, with a comment:
   the fill is its own neutral half-step, one perceivable step off the canvas,
   card and quiet panel, and no longer the `hover` wash plan `306` recorded.
2. `darkColors.disabled`: `palette.neutral[850]` → `palette.neutral[800]`, with a
   comment: `neutral[850]` is the `muted` panel and the `popover`, so a disabled
   filled control had no fill on either.

### 3.2 `packages/tokens/src/platform-styles/macos.ts`

Add `disabled: "#353537"` to `colors.dark`, beside `hover`/`active`, with a
comment naming its `#2C2C2E` panel.

### 3.3 `packages/tokens/src/platform-styles/linux.ts`

Add `disabled: "#383838"` to `colors.dark`, beside `hover`/`active`, with a
comment naming its `#303030` panel.

### 3.4 `packages/tokens/src/platform-styles/recipes/aero.ts`

`colors.light.disabled`: `"#EAF0F7"` → `"#E2EBF5"`, with a comment naming the
`#EBF3FC` quiet panel.

### 3.5 `packages/tokens/src/contrast.ts`

Add the list below `stateFillSurfacePairs` (its JSDoc states the rule and the
shared surface list, so a sixth fill surface reaches both lists):

```ts
export const disabledFillPairs: readonly ContrastPair[] = stateFillSurfaces.map(
  (background): ContrastPair => ["disabled", background, "surface"],
);
```

Fold it into `contrastPairs` immediately after `...stateFillSurfacePairs`, and
extend the JSDoc above `contrastPairs` with the new list's row.

### 3.6 `packages/tokens/src/index.ts`

Export `disabledFillPairs` beside the other pair lists.

### 3.7 `packages/tokens/src/styles.ts`

`disabledControl`'s JSDoc: replace "The fill is allowed to sit near the panel —
no neutral clears both a white card and the quiet panel — so the `border` edge
carries the control's shape." with the measured rule: the fill is held to the
surface floor on the five surfaces a control is placed on (`disabledFillPairs`)
and the `border` edge is held to the divider floor on the fill.

### 3.8 `packages/tokens/src/disabled-state.example.ts`

Same sentence in the module JSDoc: the fill is a perceivable step off its panel,
not a near-panel mute.

### 3.9 `packages/tokens/src/disabled-fill.test.ts` (new)

Header comment names the bug in the AGENTS §3 form. Cases in §6.

### 3.10 Tests to correct

- `src/contrast.test.ts` — `covers every documented pair`: `465` → `470`.
- `src/resting-fill-scrim.test.ts` — the pinned `contrastPairs.length`: `465` →
  `470`.
- `src/inactive-state.test.ts` — delete
  `keeps the fill exempt by measuring the edge that carries the shape`; its
  `disabled`-is-not-a-foreground assertion is what this plan overturns. Keep the
  edge half (move it into `disabled-fill.test.ts`). The pre-fix figure
  `2.09:1` becomes `contrastRatio("#A1A9B7", "#EEF1F5")` — the historical pair
  it was measured on — instead of reading the current fill.
- `src/selection-inactive.test.ts` — the planted pre-`510` label must be planted
  on the fill it was measured on (`disabled: "#EEF1F5"`), so the case keeps
  proving the same six washed surfaces and the same `2.635:1` figure.

### 3.11 `docs/tokens.md`

1. The `disabled` role row: new values (`#E6EAF0` / `#2A303B`) and the new use
   cell (the fill of an unavailable control, measured on the five surfaces it
   paints on by `disabledFillPairs`; the `border` edge on it).
2. The inactive-state section (`## High contrast` → the `disabledForeground`
   paragraph): replace the exemption sentence with the measured rule and name
   `disabledFillPairs`; keep the plan-306 historical figures but pin them to the
   fill they were measured on.
3. The contract's pair-count history: append the plan-737 sentence and end at
   `470` (the two hand-typed counts the guard checks).
4. The public value index: name `disabledFillPairs`.
5. The accessibility floor table's `surface` row: name the disabled fill beside
   the interactive fills (the guard derives its members from the pair list).

### 3.12 `docs/design-system.md`

1. §9's inactive paragraph: delete "no neutral can clear both a white card and
   the quiet panel"; state that the fill is measured on the five surfaces a
   control is placed on and the edge on the fill, and that the identity dark fill
   used to be its own panel.
2. §8's `disabled` state row: the fill is now a measured surface.
3. The floor table's `surface` row: name `disabled` (derived guard).

### 3.13 `packages/tokens/README.md`

If a sentence claims the fill is exempt or that the edge is the only shape,
update it; check with
`rg -n "disabled fill|exempt|shape" packages/tokens/README.md`.

### 3.14 `COMPONENTS.md`

The `Theme contrast check` ledger row: every derived count phrase (`465` →
`470`) and the plan-737 sentence. The design-token progress row.

### 3.15 `TODO.md` and `.agents/slop/plans/README.md`

Tick the new row, bump the progress bar, and index plan 737.

## 4. Commands and expected results

All token commands run from `packages/tokens`.

### 4.1 Evidence (before touching source)

A throwaway probe under `src/` that prints, per shipped set, the five surface
ratios for `disabled`. Expected: the eight pairs in §1 under 1.05:1. Delete the
probe afterwards.

### 4.2 Scoped tests

```sh
nub exec vitest run src/disabled-fill.test.ts
nub exec vitest run src/inactive-state.test.ts src/selection-inactive.test.ts
nub exec vitest run src/contrast.test.ts src/resting-fill-scrim.test.ts
nub exec vitest run src/docs.test.ts src/inventory.test.ts
```

Expected: the first four green after §3.1–3.10; the last two green after
§3.11–3.14.

### 4.3 Whole package

```sh
nub run --filter @gpuixui/tokens test
```

Expected: `200 passed`/`201 passed` (the new suite) and `0 failed`; the suite
stays inside the 20 s budget plan `333` set.

### 4.4 Gates

```sh
nub run check
nub run lint
nub run test
```

Expected: all three green. `nub run check` includes `check:tests`, so the new
suite must assert something that can fail.

### 4.5 Native verification

`apps/playground` has no built smoke/live runner in this worktree (`dist/` is
absent), so no scenario can be executed here. The theme gallery that paints
every role is `playground`'s plan `150`, and the re-run against the current role
set is already a cross-team row in `TODO.md`; this plan adds one value to that
row's scope (the gallery still paints `disabled`, so it can only be re-verified
there). Record this in the plan's amendment section — do not claim a native run.

## 5. STOP conditions

- **STOP** if any *other* pair in any shipped set fails after the five values
  move. Report the set, the pair and the ratio; do not move a second value to
  compensate.
- **STOP** if `themeFailures` reports a `direction`, `hierarchy`, `alpha` or
  `nativeText` failure on a shipped set.
- **STOP** if a documented figure that names the disabled fill (not the label)
  changes and you cannot derive its replacement from `shippedThemes`.
- **STOP** if a platform style's own `disabled` cannot clear its panel without
  falling below the divider floor on `border` or the inactive floor on
  `disabledForeground`; report the geometry instead of inventing a role.

## 6. Test plan

New suite `src/disabled-fill.test.ts` (header comment states the bug):

1. **"measures the fill on every surface a control is placed on"** —
   `disabledFillPairs` equals `stateFillSurfaces.map((s) => ["disabled", s,
   "surface"])`, and `contrastPairs` contains every member. Fails without §3.5.
2. **"keeps every shipped set above the surface floor"** — every
   `shippedThemes` entry, every `disabledFillPairs` member, at
   `contrastFloors[theme.contrast].surface`. This is the case that fails on the
   pre-fix palettes (eight pairs, six sets) and passes after §3.1–3.4.
3. **"reports the pre-fix palette"** — rebuild the pre-fix themes with
   `extendTheme(theme, { colors: { disabled: <old hex> } })` for the six sets and
   assert `themeContrastFailures` returns exactly the eight `(disabled, surface)`
   pairs, so the checker can fail and the guard names the regression.
4. **"no shipped fill is its own panel"** — the identity light and dark values
   differ from `hover`, `muted` and `popover` by value and by at least 1.05:1
   where the pair list measures them; the historical collisions plan `306`
   recorded are gone.
5. **"keeps the label and the edge on the fill"** — `contrastRatio(disabled,
   disabledForeground)` ≥ the `inactive` floor and `contrastRatio(disabled,
   border)` ≥ the `divider` floor for every set (the two pairs the fill's move
   could have broken).
6. **"orders the shipped sets' margins"** — the tightest shipped
   `disabledFillPairs` ratio is ≥ 1.05 and the set that holds it is reported, so
   a future palette edit that lowers the margin is visible.

Two-direction verification (the jj-based `scripts/verify-two-directions.sh` is
broken on these worktrees — cross-team row): run case 2 with the five old hex
values restored in a throwaway copy of the tree (or via `extendTheme` as case 3
does) and confirm it fails; then with the new values and confirm it passes.

## 7. Acceptance criteria

- `disabledFillPairs` is public, documented and folded into `contrastPairs`
  (**470**), and every shipped theme, platform variant and recipe passes it.
- The five values move exactly as §2 states; no other colour, pair, floor or
  metric moves.
- Both documents state the measured rule and no longer claim the fill is exempt
  or that "no neutral can clear both panels".
- The new suite fails on the pre-fix palettes (case 3 proves it) and the whole
  package, `nub run check`, `nub run lint` and `nub run test` are green.
- `TODO.md`, `COMPONENTS.md` and the plan index carry the row.

## 8. Amendments found while implementing

1. **`index.ts` needs no edit.** It re-exports `./contrast.js` wholesale
   (`export * from "./contrast.js"`), so `disabledFillPairs` is public with the
   list alone. §3.6 is void.
2. **The pre-fix pair count is eight, not seven.** The four light platform
   variants and the three Windows-family dark halves *inherit* the identity
   value, so a probe that rebuilds the failing sets with `extendTheme` must
   restore the fill on each composed set, not only on the identity palettes.
   The corrected evidence — both documents and the suite carry it — is **eight
   pairs in six sets**: `Dark` (popover, muted), `Dark · Linux` (background),
   `Light · macOS` (background), `Light · Linux` (background), `Light · Windows`
   (background), `Light · Windows 7` (background, muted).
3. **`src/contrast.test.ts` carries a compile-checked inventory**,
   `publishedPairLists: Record<PairListName, …>` (plan `546`). A new `*Pairs`
   export fails `check-types` until it is listed there, so §3.10 also adds
   `disabledFillPairs` to that record and to the named import list. The runtime
   suite cannot catch this; only `check-types` can.
4. **The macOS dark fill is `#353537`, not `#333335`.** The first candidate
   cleared the `#2C2C2E` panel at 1.105:1 but sat 1.047:1 from a `#303030`
   border — the value `native-text-check.test.ts` plants in its macOS dark
   fixture to create a native separator defect. A fill 1.047:1 from a border is
   a genuine divider defect, so the fixture was right and the fill moved one
   small step: `#353537` clears the panel at 1.139:1, the planted border at
   1.06:1, and the macOS `hover` wash at 1.078:1.
5. **The AAA sets keep `disabled === hover`.** The pointer washes stay outside
   the fill contract for every fill (an interactive `secondary` fill is not
   measured on `hover` either), so `#E8E8E8` remains the AAA light fill and the
   AAA light `hover` at once. The documents say the washes stay out; they do not
   claim a disabled control on a hovered row is measured.
6. **`docs/tokens.md`'s role-coverage paragraph** ended "… and `disabled` is
   measured as its own fill"; it now names `disabledFillPairs`, so the paragraph
   and the list agree.
7. **Native verification is unavailable in this worktree** (§4.5): `apps/` has
   no built playground. The theme gallery re-run stays the `playground`
   workstream's row in `TODO.md`; no native run is claimed.

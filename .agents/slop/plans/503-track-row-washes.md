# 503 — The value indicator's groove on the row washes and status panels

**Phase:** F (integration and polish)
**Depends on:** 347 (the `track` role), 094/322 (the skeleton precedent), 300/090–095
(the soft fills as first-class surfaces), 309 (the state fills on a surface),
366 (a status role moved to satisfy a contract), 381 (a designed step, not a
shared value).

**Owner:** `tokens-theme`. Paths: `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`, `TODO.md`, `COMPONENTS.md`.

---

## 1. The defect

Plan `347` shipped `track` — the unfilled groove of a `Progress`, `Meter` or
`Slider` — and measured it on six surfaces: `background`, `card`, `popover`,
`muted`, and the persistent `accent`/`selected` row fills. It deliberately left
`hover` and `active` out, with this reasoning in `contrast.ts`:

> The momentary `hover`/`active` washes are deliberately absent: the filled part
> of the indicator still carries the value while the pointer is down, and the XP
> light palette has no track that clears both the 1.05:1 wash floor and the 3:1
> mark floor at once.

Both halves of that reasoning are now false for the library's actual surfaces:

1. **A groove is not a value.** An *indeterminate* `Progress` is only its track
   (the fill is zero-width — the same case plan `347` itself used), and a
   `Slider`'s unfilled rail is the span between the thumb and the end. A
   selectable `List`, table row or tree row is hovered and pressed by definition
   before it is used, and the **four soft status fills** are first-class
   surfaces since plans `090`–`095`, `307`, `320`, `340` and `346`: an Alert's
   "Uploading…" progress and a slider in a status panel sit on them.
2. **XP light is only infeasible with the mark it inherits.** The blocker is
   `success` — XP inherits the identity's `#158754`, whose luminance forces the
   groove above 0.643 while XP's own `active` fill forces it below 0.618. A
   recipe that owns its era's palette can name a deeper Luna green and open the
   window (plan `328` already made both recipes own their dark palette;
   plan `366` moved six light status roles to satisfy a new contract).

### Measured

| Set | failing pair (before) |
| --- | --- |
| identity light | `track` on `infoSoft` **1.038:1**, `successSoft` 1.022, `warningSoft` 1.037, `destructiveSoft` **1.009** |
| identity dark | `infoSoft` **1.019:1**, `successSoft` 1.043, `warningSoft` 1.039 |
| macOS light | `active` **1.020:1** |
| Linux light | `active` **1.047:1** |
| XP light | `hover` **1.030:1**, `infoSoft` 1.008, `successSoft` 1.008, `warningSoft` **1.007**, `destructiveSoft` 1.020 |
| AAA dark (and every high-contrast platform/recipe set, which inherit the AAA palette) | `active` **1.047:1**, `warningSoft` 1.030 |

Floor is 1.05:1 at default contrast (`contrastFloors[mode].surface`).

---

## 2. The fix

Twelve surfaces, as `trackSurfacePairs`: the six today plus `hover`, `active`,
`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` (6 → 12 pairs;
`contrastPairs` 388 → 394). Values that pass on all 24 shipped sets, verified
against every existing pair with `themeFailures`:

| File | Role | Before | After |
| --- | --- | --- | --- |
| `src/color.ts` (light) | `track` | `#DBDFE5` | `#D5D9E2` |
| `src/color.ts` (dark) | `track` | `#323945` | `palette.neutral[700]` (`#3D4552`) |
| `src/color.ts` (AAA dark) | `track` | `#3A3A3A` | `#414141` |
| `src/platform-styles/macos.ts` (light) | `track` | `#DADADF` | `#D3D3D8` |
| `src/platform-styles/linux.ts` (light) | `track` | `#DAD8D6` | `#D8D8D8` |
| `src/platform-styles/recipes/xp.ts` (light) | `track` | `#E6E2D1` | `#D2CCB4` |
| `src/platform-styles/recipes/xp.ts` (light) | `success` | inherited `#158754` | `#0E6B40` |

Direction is preserved: light tracks move one step **darker** (away from the
canvas), dark tracks one step **lighter**. No other role moves; XP's `success`
is the only mark that moves, and it is a Luna-scale green named by the recipe
that paints it (its on-colour foreground is white and improves).

The four soft fills are **not** a separate family: each is measured with the
same `surface` floor on the groove, so a `Progress` inside an `Alert` keeps its
rail exactly like one on a card. The XP constraint is a *mark* constraint, so it
is solved at the mark, not by excluding six surfaces from the contract.

---

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

Replace the `trackSurfaces` block and its JSDoc (currently lines 111–136) with:

```ts
/**
 * The surfaces a value indicator's unfilled groove sits on. A progress bar,
 * meter or slider rail can be placed on the four base surfaces, a selectable
 * row's persistent `accent` fill, a selected row's `selected` fill, the
 * `hover`/`active` washes a row or a slider paints under the pointer, and the
 * four soft status fills an Alert or Badge provides. An indeterminate progress
 * bar is only its groove, and a slider's unfilled span is the value the reader
 * is about to change, so every surface is measured.
 */
const trackSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;
```

`trackMarkPairs` is unchanged. Update the long `contrastPairs` JSDoc sentence
that describes the groove (around line 831) so it names the row washes and the
soft fills beside `trackSurfacePairs`, and says the four progress fills remain
the mark contract.

### 3.2 `packages/tokens/src/color.ts`

- `lightColors.track`: `palette.neutral[300]` (`#CBD1DB`) is **not** the value;
  write `"#D5D9E2"` with a short comment: one step darker than plan 347's
  value so the groove clears the `hover`/`active` washes and the soft tints.
- `darkColors.track`: `palette.neutral[700]` — the ramp step between the 800
  press and the 600 boundary.
- `highContrastDarkColors.track`: `"#414141"` (one step lighter than `#3A3A3A`).
- Extend the three JSDoc paragraphs (light, dark, AAA) with the one-line reason:
  the groove now clears the row washes and the soft status fills as well.

### 3.3 Platform files

`src/platform-styles/macos.ts`: `track: "#D3D3D8"`.
`src/platform-styles/linux.ts`: `track: "#D8D8D8"`.
`src/platform-styles/recipes/xp.ts`: `track: "#D2CCB4"` and a new
`success: "#0E6B40"` with a comment stating that it is XP's own Luna green: the
inherited identity green is too light for the groove the row washes require
(plan 503). `aero.ts` does not change.

### 3.4 `packages/tokens/src/track-contrast.test.ts`

- Header comment: add the second regression — a groove invisible in a hovered
  or pressed row, and on a status panel — and the plan `503` reference.
- Replace the local `trackSurfaces` constant with the same twelve names (keep it
  local so the suite states the contract it claims, as plan `388` requires a
  suite that claims "every shipped set" to enumerate `shippedThemes`, which it
  already does).
- "publishes six surface pairs and four mark pairs" → twelve.
- Add a case: `extendTheme(base, { colors: { track: base.colors.hover } })`
  returns a `track`/`hover` failure from `themeContrastFailures`; the same for
  `active` and `infoSoft`.
- Keep the shipped-ratio cases; they now include the new surfaces.

### 3.5 `packages/tokens/src/platform-recipes.test.ts`

The "inherits every role the recipe does not name" case lists `success` for both
recipes. Split it: `aero` keeps the list including `success`; `xp` drops
`success` and gains a case asserting `xpPlatformRecipe.colors.light.success` is
defined and differs from the Windows base `success`, and that the resolved XP
light theme uses it.

### 3.6 `packages/tokens/src/contrast.test.ts`

`expect(contrastPairs.length).toBe(388)` → `394`.

### 3.7 `packages/tokens/src/docs.test.ts`

- The accessibility floor row for the groove (around line 1972) becomes:
  `` `track` on `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills ``.
- The "quotes the weakest value groove and the mark it carries" case: derive the
  two figures from the new palette (`tightest("track", …)` already derives the
  surface; update the expected label/value from the test output) and update the
  two `markdownProse` assertions to the same derived values. Expected after the
  fix: identity light is no longer the tightest groove — recompute; the Aero
  light `success` mark moves because the identity `success` did not change but
  XP's did, so recompute both from the suite's own output rather than guessing.
- Any other guarded phrase naming the old six surfaces: search for
  `accent`/`selected` in `docs.test.ts` and update only the groove sentence.

### 3.8 Docs

- `docs/tokens.md`:
  - the two `track` value-table rows: light `#D5D9E2`, dark `#3D4552`, AAA
    light unchanged `#C6C8CD`, AAA dark `#414141`;
  - the plan-history paragraph (around line 2250): append plan `503` — twelve
    surfaces, 388 → 394, the row washes and soft fills, the XP mark;
  - the rationale paragraph (around line 2454): replace "the four base surfaces
    and the persistent `accent`/`selected` row fills" with the twelve, delete the
    "momentary washes are out of scope" sentence, and replace it with the XP
    explanation and the new tightest figures;
  - the accessibility floor table row (same twelve surfaces).
- `docs/design-system.md`:
  - §8 groove sentence: the twelve surfaces, the indeterminate/slider reason;
  - §9 floor row: the twelve surfaces.
- `packages/tokens/README.md`: the groove paragraph (around line 372): the
  twelve surfaces; keep the `trackMarkPairs` sentence.

### 3.9 Ledger

- `COMPONENTS.md` Design tokens row: replace "the value indicator's track ... six
  surfaces" wording with the row washes and soft fills (keep it one clause); the
  Theme contrast check row's `388 contrast pairs` → `394`.
- `TODO.md`: add a ticked row under the tokens section describing plan 503
  (the shipped defect and the fix), and a `[x]` for the plan itself if the ledger
  tracks plans separately (follow the neighbours' shape).

---

## 4. Commands and expected results

Run from the repo root unless a workdir is given.

```sh
nub run --filter @gpuixui/tokens test
```

Expected: `102 passed` files (103 with the new case count unchanged — the file
count does not grow), all tests green. If `track-contrast.test.ts` fails, read
the failure — it names the theme and the pair.

```sh
nub run --filter @gpuixui/tokens check-types
```

Expected: exit 0, no output.

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `nub run check` runs the test-shape guard, lint, format and
the workspace type check.

---

## 5. STOP conditions

Stop and report instead of improvising if:

- any shipped set still fails a `track` pair after the seven values above — the
  matrix in §2 was verified, so a failure means a value was mistyped or another
  file also defines `track`;
- `themeFailures` on any shipped set is non-empty — the XP `success` move is
  intended to keep every other pair green; do not move another role to chase it;
- the docs guard names a figure that differs from the suite output — update the
  prose to the derived figure; never hand-write a ratio;
- a change would require editing `packages/primitives`, `packages/components`,
  `apps/docs` or `apps/playground`: that is another workstream. Record it in
  `TODO.md` and continue.

---

## 6. Test plan (prove both directions)

1. **Fails without the fix.** Before editing `contrast.ts`, add the twelve
   surfaces to the local list in `track-contrast.test.ts` and run the suite. It
   must fail, naming at least identity light `destructiveSoft` (1.009) and
   macOS light `active` (1.020). Record the failure in the commit message.
2. **Passes with the fix.** Apply §2 and re-run; every case green.
3. **The regression can be re-broken.** Add the case from §3.4 (track = hover)
   and confirm `themeContrastFailures` reports `track`/`hover`; temporarily
   remove the pair from `trackSurfaces` and confirm the case fails. Restore.
4. **The XP mark is load-bearing.** Temporarily set XP's `success` back to the
   inherited value (delete the line) and confirm the suite fails on XP light
   `track`/…; restore. This proves the plan's premise rather than asserting it.
5. **Every shipped set.** `shippedThemes` already enumerates the 24 sets; the
   suite must keep using it (plan `388` guard). Do not hand-build a list.
6. **Docs.** `docs.test.ts` must pass with the updated values; the floor-table
   case derives its surfaces from `trackSurfacePairs`, so adding a surface to
   the contract without the page fails.

## 7. Acceptance

- `trackSurfacePairs` has twelve `surface` pairs and `trackMarkPairs` four
  `mark` pairs; `contrastPairs.length === 394`.
- All 24 shipped sets pass `themeFailures` and every track pair.
- XP's light palette names its own `success`; both recipes are still resolvable
  through `applyPlatformStyle` and the high-contrast variants inherit the AAA
  palette unchanged.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
  `COMPONENTS.md` and `TODO.md` state the twelve surfaces, the new values and
  the plan; every figure is derived by `docs.test.ts`, none written by hand.
- The three gates are green and the branch is pushed.

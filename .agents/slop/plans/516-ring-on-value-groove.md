# Plan 516 — The focus ring on the value groove

**Phase:** F · **Owner:** `tokens-theme` · **Status:** planned (2026-10-18)
**Depends on:** 086 (the ring's surface list), 093 (the ring on the soft
fills), 332 (a fill used as a mark), 342/354 (the step lists and the
interaction-state table), 347/503 (`track` and its surface contract), 384 (the
content box).

**Owns:** `packages/tokens/src/color.ts`,
`packages/tokens/src/contrast.ts`,
`packages/tokens/src/ring-surfaces.test.ts`,
`packages/tokens/src/contrast.test.ts`,
`packages/tokens/src/ring-track.test.ts` (new),
`packages/tokens/src/docs.test.ts`, `packages/tokens/src/readme.test.ts`,
`packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The gap

`Slider` and `RangeSlider` are ours (GPUix publishes no slider). The value
indicator is built from a track, a rail and a thumb (`primitives`:

- `sliderTrackStyle` — the focusable, hit-test container;
- `sliderRailStyle` — the groove, **still painted with `muted`**; the
  cross-team row asks `primitives` to paint `track`;
- `sliderFillStyle` — the filled part, `primary` (or `destructive` when
  invalid);
- `sliderThumbStyle` — an `input`-filled disc ringed by `primary`, and, when
  focused, `boxShadow: focusRing(theme).boxShadow`.

The thumb is taller than the groove (`iconSize.*` against `spacing.xs`) and its
negative margins centre it on the value, so the **focus ring's left and right
arcs are painted on the rail** — the surface plan 503 named `track` — while its
top and bottom arcs land on the surface behind the slider. Plan 086 measures the
ring on eight surfaces and plan 093 on the four soft status fills; `track` is not
one of them.

Measured across the 24 shipped sets (`ring` on `track`, boundary floor 3:1 /
4.5:1):

| set | ratio | floor |
| --- | ----- | ----- |
| identity light | **2.983:1** | 3:1 |
| every other shipped set | ≥ 3.0:1 | 3:1 / 4.5:1 |

Identity light is the shipped defect: `ring` is `palette.iris[500]` `#7567F2`
and the light `track` is `#D5D9E2`. A focused slider's ring therefore loses its
contrast exactly on the groove the reader is dragging over. Today the rail still
paints `muted` (the cross-team migration is open), so the *current* pixel is
covered by `ring` on `muted`; the intended composition plan 503 shipped is not.
Plan 344 set the precedent: measure the composition the migration will paint,
not only the one the old code paints.

The same audit found the reference's focus paragraph and the README's are
already one surface list short: both omit the `muted` panel and the `accent`
wash from the eight `ringSurfaces`, and neither names the groove.

## 2. Decision (do not re-litigate)

1. Publish **one** new pair, `["ring", "track", "boundary"]`, as
   `ringTrackPairs`, spread into `contrastPairs` immediately after
   `...ringPairs,`. The focus ring is a boundary (3:1, 4.5:1 at AAA), not a
   mark: it is a UI boundary painted outside the control.
2. Do **not** add `track` to `ringSurfaces`. `invalidRingPairs` derives from
   that list, and an invalid slider does not recolour its ring: `sliderThumbStyle`
   only recolours the fill and the thumb border with `destructive`, while
   `focusRing(theme)` keeps the accent. Adding `track` there would publish a
   composition nothing paints and could fail on the red/beige pair for no
   reason.
3. Move **only** the identity light `ring` one ramp step:
   `palette.iris[500]` `#7567F2` → `palette.iris[700]` `#4C39B5`.
   - On `track` it measures **7.24:1** (was 2.983:1).
   - It clears every existing ring surface with more room (the tightest
     `selected`/`active` move from 3.334:1 to ≈6.9:1).
   - `iris[700]` is chosen over `iris[600]` (`primary`) deliberately: the
     known `primitives` defect `clippedFocusRingStyle` paints `ring` **inset on
     the button's own `primary` fill**, which measures 1.000:1 in seven shipped
     sets and is a cross-team row. Choosing `iris[600]` would add the identity
     light set to that broken composition; `iris[700]` keeps the ring distinct
     from the fill. The high-contrast light set already ships `#4C39B5`, so the
     ring keeps one deep-iris tonality at both contrast levels.
   - The field's pressed edge (`ring` on `input`) improves from identity light
     **4.218:1** to **≈8.2:1**; update the two places that quote the old
     tightest figure (the `contrast.test.ts` header and the docs if they quote
     it).
4. No other role, floor, type or metric moves. `contrastPairs` grows
   395 → **396**; `themeContrastFailures` reports the new pair for an edited
   theme whose ring meets the groove.

## 3. Exact changes

### 3.1 `packages/tokens/src/color.ts`

In `lightColors`, change:

```ts
ring: palette.iris[500],
```

to:

```ts
// The focus ring's one non-shadow surface is the value groove, so the ring is
// the deep iris step rather than the mid step: iris[500] measured 2.983:1 on
// `track` (plan 516) and the inset ring a clipped button paints sits on the
// primary fill, which iris[600] would equal.
ring: palette.iris[700],
```

Do not touch `selection` (`#7567F23D`, which follows the accent, plan 331),
`highContrastLightColors.ring`, the dark sets or any platform style.

### 3.2 `packages/tokens/src/contrast.ts`

1. After `ringPairs` (and beside `ringSoftPairs`), add:

   ```ts
   /**
    * The focus ring on the value groove. A slider's focus shadow is painted
    * around a thumb centred on the rail, so its left and right arcs land on
    * `track` while the top and bottom land on the surface behind the slider.
    * The groove is the one ring surface that is not a plain panel or a wash;
    * identity light measured **2.983:1** on it with the pre-516 ring (plan
    * 516), under the boundary floor, while every other shipped set passed.
    * An invalid slider does not recolour its ring, so this pair is deliberately
    * outside `ringSurfaces`/`invalidRingPairs`.
    */
   export const ringTrackPairs: readonly ContrastPair[] = [
     ["ring", "track", "boundary"],
   ];
   ```

2. In `contrastPairs`, after `...ringPairs,`, add `...ringTrackPairs,`.

3. Extend the big JSDoc above `contrastPairs` where the focus ring is
   described: the ring is measured on the plain surfaces, the quiet panel, the
   washes, the soft status fills **and the value groove a focused slider's thumb
   sits on** (`ringTrackPairs`), because the groove is a surface the ring's
   arcs are painted on, and an invalid slider keeps the accent ring.

4. Extend `themeContrastFailures`' JSDoc list of applied lists with
   `ringTrackPairs` (it currently names the ring lists only through
   `contrastPairs`; add the name beside the other ring mentions — do not restate
   counts).

5. Update the `ringSurfaces` JSDoc's claim that it is "the one list" so it
   refers to the shadow surfaces, and say the groove is the one extra ring
   surface (`ringTrackPairs`); keep the eight entries unchanged.

### 3.3 `packages/tokens/src/ring-track.test.ts` (new)

Header comment states the guarded defect: a focused slider's ring was never
measured on the groove; identity light measured 2.983:1 and the old ring value
is the regression to keep out.

Imports from `./index.js`: `contrastFloors`, `contrastPairs`, `contrastRatio`,
`extendTheme`, `getTheme`, `invalidRingPairs`, `ringTrackPairs`, `shippedThemes`,
`themeContrastFailures`, `themeFailures`.

Cases:

1. **`"publishes the ring on the groove once"`** — `ringTrackPairs` is exactly
   `[["ring", "track", "boundary"]]`; `contrastPairs` contains that composition
   exactly once; no `["destructive", "track", …]` pair exists (the invalid ring
   is not a groove composition).
2. **`"keeps the ring visible on every shipped groove"`** — for every
   `shippedThemes` entry, `contrastRatio(theme.colors.ring, theme.colors.track)
   >= contrastFloors[theme.contrast].boundary`; collect labelled failures and
   expect `[]`. Assert the tightest is identity light and **≥ 4.0:1** (the new
   value measures 7.24; the lower bound leaves room for a future ramp edit while
   still failing the 2.983 regression).
3. **`"reports an edited theme whose ring meets the groove"`** —
   `extendTheme(getTheme("light"), { colors: { ring: getTheme("light").colors.track } })`;
   `themeContrastFailures` contains `{ foreground: "ring", background: "track",
   pairClass: "boundary", floor: 3, ratio: 1 }`; `themeFailures` also reports it
   under `kind: "contrast"`.
4. **`"rejects the pre-516 ring on the groove"`** — pin the regression:
   `extendTheme(getTheme("light"), { colors: { ring: "#7567F2" } })` must return
   the groove failure with `ratio` below 3 (measured 2.983), and the shipped
   identity light ring must **not** be `#7567F2`. This case fails on the
   pre-fix contract (no pair) and states why the colour moved.
5. **`"does not measure an invalid ring on the groove"`** — assert
   `invalidRingPairs.some(([, background]) => background === "track")` is
   `false`, and that the invalid slider's destructive signal is the thumb border
   (the existing `markPairs` `destructive` on `input`), i.e. the rationale guard
   for decision 2.

Every case compares independent published values or derives its figure from the
shipped sets; none asserts back a value it stubbed.

### 3.4 `packages/tokens/src/ring-surfaces.test.ts`

1. Add `"track"` to the local `ringSurfaces` list (last), retitle the two
   affected cases "the nine ring surfaces" and update the header comment to name
   plan 516 and the groove.
2. The expected failure list in `"reports a ring that vanishes into every
   surface"` then includes `track`, because the invisible ring equals
   `background` but not `track`; the case derives its list, so it stays honest.
3. Keep the quiet-panel/accent floor case unchanged.

### 3.5 `packages/tokens/src/contrast.test.ts`

1. Add `"track"` to the local ring-surface array in `"checks the focus ring on
   every surface a focused control sits on"` and to the expected failure list.
2. Change `expect(contrastPairs.length).toBe(395)` to `396`.
3. Update the header comment's field-pressed-edge figure: the identity light
   pressed edge is no longer 4.218:1; re-derive the tightest after the change and
   state it (the ring move only raises it). Do not invent a figure — compute it
   with a probe and write the measured value.

### 3.6 `packages/tokens/src/docs.test.ts`

1. Replace the exact focus paragraph tested in *docs/tokens.md contrast
   surfaces* with the new sentence: **nine** surfaces, naming `track` (the value
   groove a focused slider's thumb sits on), and keep the existing claims about
   the soft fills, `input`/`secondary` exclusions, the pressed field edge and
   `ring-surfaces.test.ts`.
2. In the design-system floor-row array, add `` `track` `` to the focus ring
   clause and keep every other member; the derived `backgroundsOf("ring")` case
   then covers the groove automatically.
3. Any exact row that names the focus-ring surfaces gets the same member; do
   not restate the contract's counts.
4. `docs/tokens.md`'s colour table must show `ring` as `#4C39B5` in the light
   column (the table is guarded elsewhere; update it with the code).

### 3.7 `packages/tokens/src/readme.test.ts`

Replace the exact sentence at *"states the state washes and floating surface the
ring is checked on"* with the nine-surface sentence (canvas, card, popover, the
`muted` panel, the `accent` wash, the three washes, the four soft status fills
and the `track` groove). Keep the alert-action rationale.

### 3.8 `docs/tokens.md`

1. Colour table: `ring` light `#7567F2` → `#4C39B5` (dark stays `#A7A9FF`).
2. Focus section: after the runtime limit paragraph, add one short paragraph:
   the ring is measured on the plain surfaces, the quiet panel, the washes, the
   four soft status fills **and the value groove**, because a focused slider's
   shadow is painted around a thumb centred on the rail; an invalid slider keeps
   the accent ring, so the groove is not an `invalidRingPairs` surface.
3. The contrast-surfaces paragraph (the one `docs.test.ts` compares exactly):
   change "the focus ring on the plain surfaces, the `muted` panel, the `accent`
   wash, the three state washes … and the four soft status fills" to name the
   ninth surface — the `track` groove — and `ringTrackPairs`.
4. Pair-count history: append

   > Plan `516` holds the focus ring on the value groove — `ring` on `track` for
   > a slider's thumb — and moves the identity light ring one ramp step to
   > `#4C39B5`, because `#7567F2` measured **2.983:1** on the light track, under
   > the boundary floor. `contrastPairs` grows 395 → **396**.

   This must be the newest sentence the history guard anchors on.
5. If the prose quotes the field pressed edge's tightest figure (4.218:1),
   replace it with the re-derived value.

### 3.9 `docs/design-system.md`

1. §8 focus row: add the `track` groove to the surface list (the slider thumb's
   ring lands on the rail; an invalid slider keeps the accent ring). Keep it one
   clause.
2. §9 floor table focus row: add the `track` groove to the surface list; the
   row is derived by `docs.test.ts`, so the member must be present.
3. No new row: the groove is a focus-ring surface, not a new state.

### 3.10 `packages/tokens/README.md`

1. Replace the focus paragraph's stale "canvas, card, popover and the
   `hover`/`active`/`selected` washes" sentence with the complete nine-surface
   list (it currently omits `muted`, `accent` and the groove). Keep the soft-fill
   and invalid-ring sentences.
2. Add one sentence: the ring is a boundary, and the value groove is the one
   surface a focused slider paints it on.
3. `readme.test.ts` must be updated with the same sentence (3.7).

### 3.11 `COMPONENTS.md`

1. **Theme contrast check**: "the same 395 contrast pairs" → **396**.
2. **Focus state** row: append "and the `track` groove a focused slider's thumb
   sits on (`ringTrackPairs`); an invalid slider keeps the accent ring, so the
   groove is not an invalid-ring surface."
3. **Design tokens** row: only if it enumerates the focus surfaces; one clause at
   most.

### 3.12 `TODO.md`

1. Add a ticked row in **Design tokens and theming**:

   ```
   `[x]` Hold the focus ring on the value groove — a focused slider's shadow is
   painted around a thumb centred on the rail, so its arcs land on `track`, but
   the ring was measured only on the plain surfaces, the washes and the soft
   fills; identity light `#7567F2` measured **2.983:1** on the light groove,
   under the 3:1 boundary floor, while every other set passed. The identity
   light ring moves one ramp step to `#4C39B5` (7.24:1 on the groove, and every
   existing ring pair gains contrast), `ringTrackPairs` publishes the pair and
   `contrastPairs` grows 395 → 396 (plan 516)
   ```

2. Update the section's numerator/denominator and progress bar to the real
   count after the edit.
3. Do not add a cross-team row: the `primitives` migration to `track` is already
   recorded ("paints the value indicator's groove with `theme.colors.track`").

### 3.13 `.agents/slop/plans/README.md`

1. Add the table row after 514:

   ```
   | [516](./516-ring-on-value-groove.md) | The focus ring on the value groove | F | 086, 093, 332, 342, 347, 354, 384, 503 | planned |
   ```

2. Append a prose paragraph: the gap (the slider thumb's ring arcs on the rail),
   the measured shipped defect (identity light 2.983:1), the fix (one pair, one
   colour step, 395 → 396), the reason `iris[700]` over `iris[600]`, and the fact
   that no other value, floor or type moves.
3. Mark the row `done` once the gates pass.

## 4. Commands

Run from the worktree root (`workspaces/tokens-theme`):

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
```

While iterating, run the new suite alone:

```sh
cd packages/tokens && ../../node_modules/.bin/vitest run src/ring-track.test.ts
```

(or `nub run --filter @gpuixui/tokens test` and read the file's result).

Expected: `ring-track.test.ts` passes; the full package suite grows by its five
cases and stays green; the three repo gates pass.

## 5. STOP conditions

Stop and report (do not improvise) if:

- `contrastPairs.length` is not **395** before the change — another plan landed;
  rebase and re-derive the history anchor and the ledger count;
- any shipped set other than identity light fails `ring` on `track` at its
  declared boundary floor — that is a palette defect, not a missing pair; report
  the set and ratio instead of moving more colours;
- the new `#4C39B5` fails any existing ring surface at its floor, or the dark /
  high-contrast / platform ring values need to move — report instead of widening
  the colour change;
- `track` is already in `ringSurfaces` or `invalidRingPairs` from a concurrent
  change — stop and re-derive the list shape with the other change;
- a docs guard's exact sentence no longer matches after a concurrent docs edit —
  reconcile the document and the guard, never delete the guard.

## 6. Test plan (both directions)

- **Without the fix:** write `ring-track.test.ts` first and run it. Case 1 fails
  (no pair), case 3 returns `[]`, case 4 fails (the shipped ring is still
  `#7567F2`), case 5 passes. Run `ring-surfaces.test.ts`: its nine-surface case
  fails once the local list is updated but `contrast.ts` is not.
- **With the fix:** all five new cases pass; `contrastPairs.length` is 396;
  `themeContrastFailures` reports `ring` on `track` for an edited theme; every
  shipped set clears the pair; `ring-surfaces.test.ts`, `contrast.test.ts`,
  `docs.test.ts`, `readme.test.ts` and `inventory.test.ts` agree with the
  documents and the ledger.
- Verify the colour move is the only one: a probe prints the ratio for `ring`
  on `track` and on every existing ring surface before and after; only the
  identity light `ring` changes.
- Verify the new pair can fail: case 4's pre-516 value is **2.983:1** and the
  public checker must report it.

## 7. Acceptance

- `themeContrastFailures` reports the focus ring on the value groove for an
  edited theme whose ring equals the track, and every shipped set passes with no
  other colour change.
- The identity light `ring` is one ramp step deeper and every existing ring pair
  gains contrast.
- `docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md` and
  `COMPONENTS.md` name the groove and the 396-pair contract; `docs.test.ts`,
  `readme.test.ts`, `inventory.test.ts` and `ring-surfaces.test.ts` hold them.
- `nub run check`, `nub run lint` and `nub run test` pass; the commits are on
  `agent/tokens-theme` and pushed.

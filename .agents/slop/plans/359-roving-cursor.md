# 359 — A roving composite's keyboard cursor is the focused item

**Bug guarded.** Measured on 0.10.0, 2026-10-18, in this worktree: with a
**controlled** `RadioGroup`, `ToggleGroup` (`type="single"`) or `Rating` whose
parent does not apply the reported value, the **second** arrow key repeats the
first move. Focus lands on the next item once and then stays there:

| Control | mount | keys | expected focus | measured focus |
| ------- | ----- | ---- | -------------- | -------------- |
| `RadioGroup` | `value="a"`, `onValueChange` no-op, options a/b/c | `down`, `down` | `rg-c` | **`rg-b`** |
| `ToggleGroup` single | `value="left"`, no-op, left/centre/right | `right`, `right` | `tg-right` | **`tg-centre`** |
| `Rating` | `value={2}`, no-op | `right`, `right` | `r-star-4` | **`r-star-3`** |

The probe (deleted before implementation) printed exactly those three failures.
The cause is one shared shape: each component starts an arrow move from the
**value-derived tab stop** (`activeIndex` / `value`) while native focus — and
therefore the ring — has already moved. Plan `353` established that a deferring
controlled parent is a supported scenario (its own comment cites the measurement)
and fixed *activation* to use `focus.focusedIndex`; **movement was left on the
tab stop**, so the ring and the keyboard disagree after one key.

Plan `354`'s activation matrix cannot see this: it drives one key from a fresh
focus per case.

## 1. The rule

A roving composite has two positions: the committed value and the keyboard's
cursor (the ring). They agree whenever the parent applies the change, and diverge
exactly when it defers or rejects one. **Every relative move starts from the
cursor**, and the tab stop is the fallback when focus is outside the composite.

```ts
// core/keyboard.ts
export const moveFrom = (
  tabStop: number,
  focusedIndex: Option.Option<number>,
): number => Option.getOrElse(focusedIndex, () => tabStop);
```

`Home`/`End` are absolute and need no base. `ToggleGroup` `multiple` already
moved from its last focused item (`multipleIndex`); it is routed through the
same helper so both modes read alike. `CheckboxGroup` has no arrow contract (each
row is its own tab stop) and is out of scope. `Slider`/`RangeSlider` arrows are
**value steps on a single thumb**, not focus moves — their cursor cannot diverge
from the paint, so they are out of scope too (recorded in §7).

## 2. `Rating` needs an activation key, or the fix removes star 1

Today an unrated rating's tab stop is star 1, and `Right` computes `0 + 1 = 1`,
so star 1 is reachable by keyboard. Once the cursor is the focused star, `Right`
from star 1 lands on 2 (`1 + 1`) — correct radio-group behaviour (the ring is on
star 1, which is *not* selected), but it leaves **no way to choose 1** from the
keyboard, because arrows always commit the star they land on.

The rating is documented as radio-group shaped, and plan `354`'s contract is
Enter-down / Space-up. So `Rating` gains that contract for its focused star:

- `Enter` (key down) and `Space` (key up) commit the star the ring is on;
- a held key commits nothing;
- `disabled`/`readOnly` refuse it.

With that, `Tab` → star 1 → `Space` selects 1, and `Right` moves the ring to 2 as
a radio group's arrow would.

## 3. Changes

### 3.1 `packages/primitives/src/core/keyboard.ts`

Add `moveFrom` with the JSDoc above, placed after `decideAbsolute`. Document the
divergence reason and cite plans `353`/`359`.

### 3.2 `packages/primitives/src/components/RadioGroup.tsx`

- Rename `activationIndex` to `cursorIndex` and compute it with
  `moveFrom(activeIndex, focus.focusedIndex)`.
- `move(key)` calls `decideMove(cursorIndex, …)` (was `activeIndex`).
- `activate` keeps using `cursorIndex` (behaviour unchanged).
- Update the doc comment: one cursor drives movement **and** activation.

### 3.3 `packages/primitives/src/components/ToggleGroup.tsx`

In `renderToggleGroup`, compute
`const cursorIndex = moveFrom(activeIndex, focus.focusedIndex)` and use it as the
`decideMove` base. `decideAbsolute` is unchanged. No signature change.

### 3.4 `packages/primitives/src/components/Rating.tsx`

- Import `decideActivation` (from `core/keyboard.js`) and `moveFrom`.
- Compute `const cursor = moveFrom(value, focus.focusedIndex)` inside
  `renderRating`.
- `onKeyDown`: `decideRating(cursor, max, key)` → `handlers.onMove`, then, if
  `decideActivation(key, "down", held)`, `handlers.onSelect(cursor)`.
- Add `onKeyUp`: if `decideActivation(key, "up", held)`, `handlers.onSelect(cursor)`.
- Both guarded by `interactive`, exactly like the arrow path.
- Update the doc comment and the props' JSDoc keyboard note.

### 3.5 Tests

1. `src/core/keyboard.test.ts` — `moveFrom`: a focused index wins over the tab
   stop; `Option.none()` returns the tab stop.
2. `src/components/selection.test.tsx` — `RadioGroup`: value `alpha`, **focused
   index 1**, `Down` selects `gamma` (not `beta`) and moves focus to 2; and the
   activation case (`Space` up on focused index 1) selects `beta`.
3. `src/components/ToggleGroup.test.tsx` — the same two for `single`: focused
   index 1 + `Right` presses `right`; `Enter` down on focused index 1 presses
   `beta`.
4. `src/components/Rating.test.tsx` — focused index 3 with value 2: `Right`
   reports 4; `Enter` down reports 3 (`onSelect`); `Space` up reports 3; a held
   `Space` reports nothing; `readOnly`/`disabled` refuse both keys.
5. `runtime/roving-arrows.runtime.test.tsx` (**new**, the class guard) — one
   fresh window per case, a **deferring** controlled parent (`onValueChange`
   records, never applies):
   - `RadioGroup` a/b/c: `down`×3 → focus `b`, `c`, `a`; reports `["b","c","a"]`;
   - `RadioGroup` with `b` disabled: `down` → `c` (skipping still works);
   - `ToggleGroup` single: `right`×3 → `centre`, `right`, `left`;
   - `ToggleGroup` multiple: `right`×2 → `italic`, `underline`, and nothing
     reported (focus-only movement);
   - `Rating` 2: `right`×2 → `star-4` (reports `3`, `4`), then `left` → `star-3`;
   - `Rating` unrated: focus `star-1`, `right` → `star-2` (the cursor rule), and
     `Space` up on `star-1` reports `1` (the access path §2 adds).
   - A liveness case: an **applying** parent (`useState`) still moves and
     reports — the fix must not be passing because nothing works.
6. `runtime/activation.runtime.test.tsx` — add `Rating` to `CASES`
   (`focusId: "x-star-3"`, `reported: "3"`), so the 9-sequence contract now
   covers nine controls (81 cases).

## 4. Commands and expected results

```sh
cd packages/primitives
nub run test            # offline: 43 files, all green (593 + new cases)
nub run test:runtime    # native: 28 files, all green (537 + ~12 new cases)
cd ../..
nub run check           # check:tests, lint, fmt, check-types: all pass
nub run test            # every workspace green
```

Run `nub run test:runtime` **before** the fix with the new matrix: it must fail
by case name on `RadioGroup`, `ToggleGroup` single and `Rating` (three
directions). Record the output in this plan's §6.

## 5. STOP conditions

- Stop if `renderer.focusElement` no longer moves focus for a group item, or if
  a key event from a focused item no longer reaches the group root — the whole
  design assumes both (measured in plans `049`, `353`, `354`).
- Stop if the new `Rating` key-up handler breaks an existing `TestRenderer` case
  in a way that is not the intended contract change; do not delete an assertion
  to make it pass. Report instead.
- Stop if `activation.runtime.test.tsx` cannot express `Rating` without a
  special case — report the table's limit rather than weakening the other eight.

## 6. Both-direction proof (measured 2026-10-18)

The fix was reverted for the measurement (`git checkout --` on the three
components; `core/keyboard.ts` kept so the tests still compile) and restored
afterwards.

**New runtime matrix against unfixed source — 4 of 6 cases fail:**

| Case | Old direction |
| ---- | ------------- |
| radio arrows from the focused option | `["rg-b","rg-b","rg-b"]` |
| single toggle group | `["tg-centre","tg-centre","tg-centre"]` |
| rating arrows | `["ra-star-3","ra-star-3","ra-star-3"]` |
| unrated rating commits star 1 | `[]` (no activation key existed) |

The two cases that pass are expected to: the disabled-skip case drives one key
(no divergence yet), and `multiple` already moved from its last focused item.

**Offline cases against unfixed source — 5 fail:** `Rating` arrow from the
focused star, `Rating` Enter/Space activation, `Rating` held/inert refusal,
`ToggleGroup` cursor, `RadioGroup` cursor. (`RadioGroup`'s activation case
passes: plan `353` had already fixed that half.)

**After the fix:** offline **601 tests in 43 files**; runtime **552 tests in 28
files**; `nub run check` green. All six matrix cases and all nine `Rating`
activation sequences pass.

## 7. Docs, inventory and ledger

- `packages/primitives/docs/radio-group.mdx` — keyboard section: an arrow
  continues from the **focused** option, so a parent that defers the value cannot
  trap the keyboard; the tab stop is still derived from the value.
- `packages/primitives/docs/toggle-group.mdx` — the same, for both modes.
- `packages/primitives/docs/rating.mdx` — the same; the keyboard table gains
  `Enter`/`Space` = select the focused star, and the unrated-tab-stop note says
  how to choose 1.
- `COMPONENTS.md` — Radio groups, Toggle Group and Rating rows gain the plan
  `359` note; the runtime-count line is updated to the measured total.
- `TODO.md` — add the task under the primitives workstream and tick it.
- `.agents/slop/plans/README.md` — index this plan.
- `PLAN.md` — D39: a roving composite's cursor is the focused item; activation
  and movement share it.

## 8. Acceptance

- The three measured failures are gone and the matrix fails without the fix.
- The normal (applying) path is unchanged for all three controls.
- `Rating` can choose star 1 from the keyboard with `Space`/`Enter`.
- Every gate in §4 is green, with the real counts recorded.

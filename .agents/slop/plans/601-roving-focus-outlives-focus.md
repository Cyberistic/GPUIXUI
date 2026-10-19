# 601 — A roving composite's focus ring and cursor outlive focus on the pinned runtime

**Phase:** F (verification truth) — **implementation**
**Depends on:** `049`, `056`, `083`, `084`, `089`, `332`, `353`, `359`, `583`, `590`, `591`, `600`
**Owns:** `packages/primitives` (`internal.ts`, `ToggleGroup`, `RadioGroup`,
`Rating`, a new runtime suite and the pages), `COMPONENTS.md`,
`packages/primitives/README.md`, `.agents/slop/plans/README.md`, `TODO.md`.

## 1. The evidence

`ToggleGroup`, `RadioGroup` and `Rating` each keep their keyboard cursor in
local state (`focusedIndex`) written by an item's `onFocus` and cleared by its
`onBlur`, then merged with the native-focus tracker:

```ts
const mergedFocus = Option.isSome(focusedIndex) ? focusedIndex : trackedIndex;
```

The pinned 0.10.0 release build **never dispatches `onBlur`** (plan `583`), so
the event state is never cleared. The tracker then cannot win the merge, because
`focusedIndex` is still `Some`: the ring stays on an item the user has left, and
the keyboard's cursor points at that stale item.

Measured 2026-10-19 in the real `TestRenderer` (1280 × 800, the store's
release-tag build). Each case moved focus inside the composite with its own
keyboard, then clicked a `Button before` outside it, then waited for the tracker
(`settleFocus`):

| Composite | Keyboard step | Focused item after leaving | Ring on the left item |
| --- | --- | --- | --- |
| `ToggleGroup` (`multiple`) | `Right` to Italic | `before` | **ringed** |
| `RadioGroup` | `Down` to Italic | `before` | **ringed** |
| `Rating` (`defaultValue={2}`) | `Right` to star 3 | `before` | **ringed** |
| `CheckboxGroup` | click Underline | `before` | plain |

`CheckboxGroup` is the control: its only focus source is the tracker (a row's
`onFocus` sets the same state, but the release runtime never calls it), so it
was immune by accident. The three moving composites are the bug.

The cursor half is not only paint. In a `RadioGroup` whose controlled parent
defers (plan `359`), focus Beta, leave, Tab back: the tab stop is Alpha (the
value) but the stale cursor is Beta, so `Down` moves to **Gamma**, skipping the
choice the user re-entered on.

`Rating`'s clear rule (plan `334`) and `ToggleGroup`'s tab stop (plan `600`)
both write the same state, so the stale value is not specific to a keyboard
move.

## 2. The rule

**A sample that names none of a composite's items clears its event focus.**

This is plan `591`'s rule (`useFocus`) applied at group level, and it has to be
an effect keyed on the sample rather than a derived value: an event that
legitimately fired before the next sample names this item must still paint, and
only a *new* sample can prove the state stale.

One hook in `internal.ts` owns it, replacing the same eleven lines in three
components:

```ts
export const useRovingFocus = (): RovingFocus
// focusedIndex: event state while set, else the tracker's item
// onFocus / onBlur: the event state, as today
// registerItem: the id map, for the tracker and focusElement
// idOf: an Option of an item's host id
```

```ts
useEffect(() => {
  if (sample === undefined || !sample.sampled) return;
  if (Option.isSome(trackedFocusIndex(ids.current, sample.focused))) return;
  setEventFocus(Option.none());
}, [sample]);
```

- No provider or no sample yet → the event state is the only source (unchanged).
- A sample naming one of this composite's items → keep the event state (the
  ring is already on the right item) and the tracker still fills in when events
  are absent.
- A sample naming any other host (or none) → the event state is stale; clear it.
- The effect clears **on a sample change**, never on every render, so a focus
  event that beats the next sample is not erased.

`idOf` returns `Option` instead of `number | undefined`; the three call sites
already wrapped the value in `Option.fromNullishOr`.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/components/internal.ts` | `RovingFocus` + `useRovingFocus`, with the plan-`583`/`591` rationale |
| `packages/primitives/src/components/ToggleGroup.tsx` | use the hook; drop the local cursor/id map/merge |
| `packages/primitives/src/components/RadioGroup.tsx` | the same; `focus.idOf` replaces the `Option.all` lookup |
| `packages/primitives/src/components/Rating.tsx` | the same |
| `packages/primitives/runtime/focus-loss.runtime.test.tsx` | **new** — the matrix in §4 |
| `packages/primitives/docs/toggle-group.mdx`, `radio-group.mdx`, `rating.mdx` | the release-runtime note names the cursor/ring clear |
| `packages/primitives/README.md` | the release-runtime paragraph names the sampled clear |
| `COMPONENTS.md` | the three rows record plan `601` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/601-roving-focus-outlives-focus.md` | this file |
| `TODO.md` | one ticked row under the primitives workstream |

`CheckboxGroup` keeps its existing code: measured immune, and it has no roving
cursor to clear. `OTPField` was fixed by plan `591` and is out of scope.

## 4. Test plan

**Runtime — `runtime/focus-loss.runtime.test.tsx` (every case uses a fresh
window through `openWindow`).**

1. `ToggleGroup` (`multiple`): `Right` to Italic, click `before`,
   `settleFocus` → Italic paints no ring; the window paints exactly one ring
   (the button).
2. `RadioGroup`: `Down` to Italic, click `before`, settle → Italic plain, one
   ring in the window.
3. `Rating` (`defaultValue={2}`): `Right` to star 3, click `before`, settle →
   star 3 plain, one ring.
4. `CheckboxGroup`: click Underline, click `before`, settle → Underline plain,
   one ring (the liveness case for the class).
5. `RadioGroup` **cursor**: a controlled parent that keeps `value="a"` and
   ignores `onValueChange`; `Down` once (focus Beta, value Alpha), click
   `before`, settle, Tab back into the group (stop Alpha), then `Down` → focus
   Beta — the cursor restarts from the tab stop, not from stale Beta
   (`Gamma` without the clear).

**Both directions.**

- Delete the hook's clearing effect: cases 1–3 fail with the item ringed
  (measured) and case 5 lands on `rg-c`.
- Keep the clear but run it on every render instead of on the sample: the event
  path would be erased before the sample catches up. There is no event-dispatch
  runtime on this host to measure that, so the `sampled`/`[sample]` guard is
  reviewed and documented rather than claimed as a measured direction.
- The full focus matrix (`focus-ring`, `disabled`, `tab-order`) must stay green:
  it proves the event/seed path still paints when the tracker agrees.

## 5. Commands and expected results

```sh
cd packages/primitives

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/focus-loss.runtime.test.tsx
# expect: 5/5 pass; with the clear removed 1–3 and 5 fail by name

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/focus-ring.runtime.test.tsx \
  runtime/disabled.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx \
  runtime/roving-arrows.runtime.test.tsx \
  runtime/toggle-group.runtime.test.tsx \
  runtime/rating.runtime.test.tsx
# expect: all pass

nub run --filter @gpuixui/primitives test     # offline suite
nub run check
```

## 6. STOP conditions

- Stop if the clear removes a ring while the item really holds native focus
  (the sample and `getFocusedElementId()` disagree); report the measurement.
- Stop if an existing focus-matrix case fails after adopting the hook in a
  component: the event path and the tracker must both still paint.
- Do not change `CheckboxGroup` or `OTPField` — measured outside the defect.
- Do not derive the multiple tab stop from the sampled index: the sample is
  gone once focus leaves, so the stop would snap back (plan `600` §6).

## 7. Acceptance

- The three composites paint no ring after focus leaves, measured in the
  runtime, and the window paints one ring.
- The cursor restarts from the tab stop after leaving and returning.
- One hook replaces three copies; `idOf` is an `Option`.
- Pages, README and inventory agree; the offline suite, the scoped runtime
  suites and `nub run check` are green.

## 8. Result (2026-10-19)

- Before: `toggle-group`, `radio-group` and `rating` each left the last item
  ringed after focus moved to a `Button` (`tg-italic/ringed->before/ringed`,
  `rg-italic/ringed->before/ringed`, `rating-star-3/ringed->before/ringed`);
  `CheckboxGroup` was plain.
- After `useRovingFocus`: all four read `…/ringed->before/plain`, and the stale
  cursor case moves Alpha → Beta.
- Scoped: `toggle-group` + `focus-loss` 17/17; `focus-ring`, `disabled`,
  `tab-order`, `roving-arrows`, `rating`, `checkbox-group` green. Offline 59
  files / 820 tests. **Full runtime: 53 files / 742 tests green** on the
  release-tag build.
- One assertion in the existing `ToggleGroup` disabled-skip case is updated to
  the measured cursor rule: a click on a disabled item does move native focus,
  so the group's next `Right` starts there and lands on the first enabled item
  (the case now waits for the tracker before delivering the key).

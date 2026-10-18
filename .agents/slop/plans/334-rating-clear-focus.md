# 334 — `Rating`'s clear paints its ring on a star that does not hold focus

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives (`packages/primitives`) |
| Depends on | `030`, `041`, `047`, `054`, `070`, `079`, `081`, `093`, `094` |
| Status | implemented |
| Fixes | `Rating`'s Delete/Backspace path leaves native focus on the old star while the ring and the tab stop move to star 1 |

---

## 1. The defect (measured)

`Rating`'s arrow/clear handler is `onMove`, in
`packages/primitives/src/components/Rating.tsx`:

```ts
onMove: (value) => {
  state.set(value);
  Option.match(Option.fromNullishOr(itemIds.current.get(value)), {
    onNone: () => {},
    onSome: (id) => renderer?.focusElement?.(id),
  });
  setFocusedIndex(Option.some(value === 0 ? 1 : value));
},
```

A rating has no star `0`: `decideRating` returns `Option.some(0)` for
`Delete`/`Backspace`, and clamping at the left edge also returns `0`. The lookup
`itemIds.current.get(0)` therefore misses, `focusElement` is never called, and
only the *painted* focus index moves to star 1. Native focus never moves.

Measured on this host (GPUix 0.10.0 `TestRenderer`, a click on star 4 then
Delete through the focused element):

```
focused before: 'ra-star-4'
ringed before:  ['4 of 5']
focused after:  '4 of 5'      ← native focus stayed on the old star
ringed after:   ['1 of 5']    ← the ring moved to the tab stop
```

Three documented invariants disagree with the frame:

- `docs/rating.mdx` — "an arrow moves the selection and native focus together,
  so the ring is always on the star the value came from";
- `docs/rating.mdx` — the group holds one tab stop, "on the current rating, or on
  the first star when unrated" — the tab stop is star 1 after a clear;
- `COMPONENTS.md` — Delete clears the rating, and the component owns its
  keyboard contract.

The material consequence: after a keyboard clear the user sees the ring on star
1 while Tab and the remaining keys are anchored to star 4 (whose `tabIndex` is
now `-1`). A screen-reader/assistive-tech user is told a different element is
focused from the one that paints as focused.

## 2. The rule

> **A keyboard move must leave native focus on the star that owns the tab stop.**
> When the value is `0` the tab stop is star 1 (`ratingTabStop`); when it is
> `1..max` it is that star. The paint and the platform focus are the same fact,
> so the handler resolves one target with `ratingTabStop` and uses it for both
> `focusElement` and `setFocusedIndex`.

This is plan `332`'s class ("the ring rule has one owner") applied to `Rating`'s
clear path: the paint must not name a focused element the platform is not on.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Rating.tsx` | `onMove` computes `ratingTabStop(value, ratingMax(props.max))` once and uses it for both the native call and the painted index |
| `packages/primitives/runtime/rating.runtime.test.tsx` | **new case**: a real click on star 4, Delete through the focused element, then native focus and the ring are both on star 1 |
| `packages/primitives/docs/rating.mdx` | the Keyboard section states where focus lands after a clear; the Verification list names the new case |
| `packages/primitives/README.md` | the measured runtime count moves `348 → 349`; the runtime sentence names the new invariant |
| `COMPONENTS.md` | the Rating row records the fix; the global runtime count and plan list move |
| `TODO.md` | add and tick the task under the primitives workstream |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/334-rating-clear-focus.md` | this plan |

No `core/` change: `ratingTabStop` is already the pure rule and is already
tested (`src/core/rating.test.ts`). The defect is the component's glue.

## 4. Exact implementation

### 4.1 `Rating.tsx`

Import `ratingMax` and `ratingTabStop` from `../core/rating.js` (both are
already exported there; `ratingTabStop` is already imported). Replace the
handler's body with:

```ts
onMove: (value) => {
  state.set(value);
  // A rating has no star 0: a clear lands on the tab stop, star 1. Resolve
  // the same target for the native call and the paint so they cannot disagree.
  const target = ratingTabStop(value, ratingMax(props.max));
  Option.match(Option.fromNullishOr(itemIds.current.get(target)), {
    onNone: () => {},
    onSome: (id) => renderer?.focusElement?.(id),
  });
  setFocusedIndex(Option.some(target));
},
```

`ratingMax` is declared in this module and exported, so no new import is needed
for it; `ratingTabStop` is already in the existing import list. Delete the
`value === 0 ? 1 : value` expression, which encoded the same intent without the
native call.

### 4.2 The runtime case — `runtime/rating.runtime.test.tsx`

Add beside the existing Delete test. It must not re-use that test's assertions:
this one is about where **native focus** is, which no existing test reads after
a clear.

```tsx
it("moves native focus to the tab stop when Delete clears the rating", async () => {
  // The bug guarded (plan 334): Delete cleared the value and painted the ring on
  // star 1, but `onMove(0)` looked for a star "0", found none, and never moved
  // native focus — so the ring and the keyboard were on different stars.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Rating testId="ra" label="Quality" defaultValue={4} />
    </Surface>,
  );
  runtime.click("ra-star-4");
  runtime.flush();
  expect(runtime.focused()).toStrictEqual(Option.some("ra-star-4"));
  const focusedId = Option.getOrElse(
    Option.fromNullishOr(runtime.renderer.getFocusedElementId()),
    () => expect.fail("the clicked star took no native focus"),
  );
  // Delete through the focused element, as the keyboard would deliver it.
  runtime.renderer.nativeSimulateKeyDown(focusedId, "delete");
  runtime.renderer.dispatchNativeEvents();
  runtime.flush();
  expect(runtime.focused()).toStrictEqual(Option.some("ra-star-1"));
  expect(checkedStars(runtime)).toStrictEqual([
    "unchecked",
    "unchecked",
    "unchecked",
    "unchecked",
    "unchecked",
  ]);
  const ringed = (label: string): boolean =>
    Option.isSome(
      Option.fromNullishOr(byLabel(runtime, label).style["boxShadow"]),
    );
  expect(ringed("1 of 5")).toBe(true);
  expect(ringed("4 of 5")).toBe(false);
});
```

`byLabel` and `checkedStars` already exist in the file.

### 4.3 The docs

`docs/rating.mdx`, after the keyboard table's tab-stop paragraph:

```
Clearing moves native focus to the first star — the group's tab stop when it is
unrated — so the ring and the keyboard are always on the same star.
```

Add to **Verification**:

```
- `runtime/rating.runtime.test.tsx` — … (existing list) …; and Delete through
  the focused star leaves native focus and the ring on star 1 (plan `334`).
```

## 5. Commands, in order

| # | Command | Expected |
| - | ------- | -------- |
| 1 | add the §4.2 case **before** the §4.1 fix, then `nub x vitest run --config vitest.runtime.config.ts runtime/rating.runtime.test.tsx` (run inside `packages/primitives`) | **red**: `expected … value: "ra-star-4" … to strictly equal … value: "ra-star-1"` |
| 2 | apply §4.1 | — |
| 3 | re-run step 1's command | green: `1 file, 15 tests` (14 + 1) |
| 4 | revert §4.1 only, re-run step 1's command | red again, the same assertion — the proof that the test, not the harness, decides |
| 5 | restore §4.1 and run `nub run --filter @gpuixui/primitives test` | 41 files, 536 tests green (offline unchanged) |
| 6 | `nub run --filter @gpuixui/primitives test:runtime` | 22 files, 349 tests green |
| 7 | `nub run check` | tests, lint, fmt and types green |
| 8 | `nub run lint` and `nub run test` | green |

## 6. STOP conditions

- **STOP** if `ratingTabStop` would move focus for a value that is already the
  tab stop when the user pressed a key that changed nothing: `state.set` already
  suppresses `onValueChange`, and re-focusing the same star is harmless; do not
  add a "did the value change" branch unless a measured case needs it.
- **STOP** if the fix needs a change in `core/rating.ts` or a new prop: the pure
  rule already answers the question.
- **STOP** if `runtime.focused()` reports anything other than a star testId
  after `click("ra-star-4")` — the probe's premise would be wrong; report the
  frame instead of weakening the assertion.
- **STOP** outside §3's files.

## 7. Test plan

| Test | Must catch |
| ---- | ---------- |
| the new runtime case (before the fix) | native focus stays on the old star while the ring moves to the tab stop |
| the same case after the fix | focus and ring both on star 1; the value is cleared |
| the existing "clears the rating with Delete" case | a regression that drops the clear itself |
| the existing "moves with the arrows and takes native focus with it" case | a regression that stops moving focus for `1..max` |
| the existing one-tab-stop case | the tab stop remains star 1 when unrated |

The new case can fail in both directions: without §4.1 it fails on the native
focus (and, in the old code, the ring moved), with §4.1 it passes. `check-tests`
sees four assertions on runtime state, none of them self-referential.

## 8. Measured results

### 8.1 Both directions

The probe that found the defect (before any change) printed:

```
focused after: '4 of 5'      (ring on '1 of 5')
```

With the new case added and §4.1 **not** applied:

```
× moves native focus to the tab stop when Delete clears the rating
  AssertionError: expected { _id: 'Option', _tag: 'Some', value: 'ra-star-4' }
    to strictly equal { _id: 'Option', _tag: 'Some', value: 'ra-star-1' }
```

After §4.1 the case passes. Reverting §4.1 alone reproduces the same failure;
restoring it makes the whole Rating suite green.

### 8.2 After the fix

```
nub x vitest run --config vitest.runtime.config.ts runtime/rating.runtime.test.tsx
  Test Files  1 passed (1)
       Tests  15 passed (15)        (14 + 1)

nub run --filter @gpuixui/primitives test
  Test Files  41 passed (41)
       Tests  536 passed (536)

nub run --filter @gpuixui/primitives test:runtime
  Test Files  22 passed (22)
       Tests  349 passed (349)      (348 + 1)

nub run check
  tests: every test asserts something, and nothing asserts itself
  oxlint: no findings
  oxfmt: All matched files use the correct format.
  check-types: every workspace Done

nub run lint                          exit 0
nub run test                          every workspace green
```

## 9. Acceptance

- [x] A clear leaves native focus on star 1, the tab stop, and paints exactly one
      ring there.
- [x] The new runtime case fails without the fix and passes with it; both
      directions are recorded in §8.
- [x] `docs/rating.mdx`, `COMPONENTS.md`, `README.md`, `TODO.md` and the plan
      index agree with the shipped behaviour.
- [x] `nub run check`, `nub run lint` and `nub run test` are green.

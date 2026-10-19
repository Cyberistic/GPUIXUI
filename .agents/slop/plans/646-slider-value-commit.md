# 646 — The sliders need a commit signal, not only a continuous change

**Phase:** F (integration and polish)
**Owner:** primitives
**Depends on:** 030, 041, 047, 053, 063, 079, 080, 081, 097, 324, 337, 361, 373, 637
**Status:** planned — 2026-10-19

## 1. The gap

`Slider` and `RangeSlider` expose `onValueChange`, which fires continuously: once
per pointer move during a drag, and once per key step. There is no way to learn
that a gesture **finished**, which is what a settings screen or a form actually
needs — save on release, recompute on release, or validate only the settled
value.

The shadcn/ui reference does expose this: its `Slider` is Radix's, whose
`onValueCommit` fires when the value is settled (pointer release, or a keyboard
change), beside the continuous `onValueChange`. Consumers of this package have
only the continuous callback, so every one of them must invent a debounce and
guess when a drag ended.

Measured baseline (2026-10-19, before any change):

- `nub run --filter @gpuixui/primitives test` — **60 files / 860 tests**, green.
- `nub run --filter @gpuixui/primitives test:runtime` — **58 files / 812 tests**,
  green on the release-tag build in the shared store.
- `grep -n "onValueCommit" packages/primitives/src packages/primitives/docs`
  returns nothing: the prop does not exist in code or in a page.

The runtime already gives us every edge needed:

- `onMouseUp` is delivered on the track (the runtime captures the pressed
  element, measured in plan `063`), and the `onPointerUp` handler already exists;
- a drag that leaves the track still delivers moves and the release (plan `063`);
- `event.pressedButton !== 0` in a move means the button was released before the
  track saw an up — the existing code already treats that as the end of a drag.

So this is a real, small implementation over existing signals, not an API shape
over a missing capability.

## 2. The rule

Add `onValueCommit` to both slider parts:

```ts
readonly onValueCommit?: (value: number) => void;              // Slider
readonly onValueCommit?: (value: readonly [number, number]) => void; // RangeSlider
```

- **A pointer gesture commits once, on release.** Press, drag, release = one
  commit with the value the gesture ended on. Moves during the drag do not
  commit. The value is the one this gesture reported, not a re-read of possibly
  deferred state, so a controlled parent that has not applied the value still
  gets the gesture's result.
- **A keyboard step commits immediately**, with the value that step resolved —
  each key press is a complete gesture.
- **A gesture that ends on the value it started from reports nothing.** This is
  the package's existing no-op rule (plans `373`, `363`, `505`): a press that
  changes nothing must not look like an edit. A drag away and back to the start
  also ends where it began, so it commits nothing.
- **A refused gesture commits nothing**: a non-primary press, a disabled
  control, or a key at a bound (the computed value equals the painted one).
- Range commit reports the **normalised, ordered pair** the gesture ended on —
  the same pair `onValueChange` reported.

Implementation shape (do not add a public state field or another callback):

- `SliderHandlers` / `RangeSliderHandlers` gain an `onCommit` callback; the pure
  renderers call it from the keyboard branch, where the next value is known.
- The components keep a small `gesture` ref: the value at press and the last
  value the gesture resolved. `endGesture` reports `last` only when it differs
  from `start`, then clears the ref. It runs from `onPointerUp` and from the
  `pressedButton !== 0` branch of the move handler (whichever comes first), so a
  release outside the track still commits exactly once.
- No new timer, no polling, no delay: Radix's commit is a signal, not a
  debounce.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Slider.tsx` | Add `onValueCommit` to `SliderProps` and `RangeSliderProps` with TSDoc stating pointer-release vs keyboard and the no-op rule. Add `onCommit` to both handler interfaces and call it from the keyboard branch. Track the gesture in a ref in both components and commit on `onPointerUp` / the released-button move branch. |
| `packages/primitives/runtime/value.runtime.test.tsx` | Add the six runtime cases in §6 and record plan `646` in the file header. |
| `packages/primitives/docs/slider.mdx` | API row for `onValueCommit`; a short "Change and commit" paragraph in `## Values`; state the keyboard half in `## Keyboard`. |
| `packages/primitives/docs/range-slider.mdx` | The same three additions for the pair. |
| `packages/primitives/examples/value.example.tsx` | The quality slider commits into a `savedQuality` state shown in the card, so the example demonstrates the prop (the example is already mounted by the examples suite). |
| `COMPONENTS.md` | Slider and Range slider rows record the commit contract and its cases. |
| `packages/primitives/README.md` | Only if its slider prose promises the change callback alone; otherwise no edit. |
| `.agents/slop/plans/README.md` | Index this plan in the primitives block. |
| `TODO.md` | One ticked primitives row. |

Do not touch `packages/tw`, `packages/tokens`, `packages/components`, `apps/*`
or `examples/basic-app`.

## 4. Commands and expected results

Run from `workspaces/primitives`:

```sh
# 1. Baseline (already measured, repeat before editing):
nub run --filter @gpuixui/primitives test
# Expected: 60 files / 860 tests pass.

# 2. After the code + tests, the scoped runtime file:
cd packages/primitives
nubx vitest run --config vitest.runtime.config.ts runtime/value.runtime.test.tsx
# Expected: every case passes, including the six new commit cases.
cd ../..

# 3. The docs guard must accept the new rows (it fails when a page misses a
#    prop, so running the offline suite is the guard):
nub run --filter @gpuixui/primitives test
# Expected: 60 files, more than 860 tests, all pass.

# 4. Gates:
nub run check
nub run lint
nub run test
# Expected: all pass.

# 5. Merge gate (the full runtime suite, release-tag build):
nub run --filter @gpuixui/primitives test:runtime
# Expected: 58 files, more than 812 tests, all pass.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- the runtime does not deliver `onMouseUp` to the track after a drag that leaves
  it (then there is no honest commit edge; record the measurement and do not
  fake a timer);
- a single drag produces two commits (the two end paths must share one clear);
- a controlled parent that defers sees a commit value different from the last
  `onValueChange` value;
- the new cases cannot fail when `onCommit` is removed (the test is not reading
  the callback);
- the offline API guard reports a documented prop the source does not declare,
  or a source prop the page misses, after the rows are added.

## 6. Test plan (both directions)

Add to `runtime/value.runtime.test.tsx`, reusing `mount`, `pointAt`,
`boundsOf`, `announced` and `values()`:

1. **One commit per drag.** `defaultValue={25}`, press at 25 %, move to 50 %,
   move to 75 %, assert `commits` is still empty, release, assert
   `commits === [75]` while `changes` ends at `75`. Before the wiring, `commits`
   is `[]` (no callback reachable); with a per-move call it is
   `[50, 75]` — both wrong directions are observed.
2. **Keyboard commits each step.** `defaultValue={50}`; `right` then `end`;
   assert commits `[51, 100]`. A key at the bound (`end` again) adds nothing.
3. **A gesture that ends where it began commits nothing.** Press at 25 %, move
   to 60 %, move back to 25 %, release: `commits === []` even though
   `onValueChange` reported values during the drag.
4. **A refused press commits nothing.** A right-button down/up and a disabled
   slider's click report no commit (reuse the existing refusal scene).
5. **A range drag commits the final pair once.** `defaultValue={[20, 80]}`, drag
   the start end to 40 %, release; `commits === [[40, 80]]`, with moves that do
   not commit.
6. **A range keyboard step commits immediately** with the ordered pair
   (`right` on the start thumb → `[21, 80]`), and a step at the bound commits
   nothing.
7. **A deferring controlled parent still gets the gesture's value.** `value={25}`
   with a no-op `onValueChange`, drag to 75 %: the paint stays `25` and the
   commit is `[75]` — the commit is not a re-read of deferred state.

Both directions: remove the two `onCommit` calls (or the components' gesture
reporting) and cases 1, 2, 5 and 6 fail by name; restore them and all pass. Make
`endGesture` report on every release (including unchanged) and case 3 fails;
report per move and case 1 fails. Record the observed failures in §8.

## 7. Acceptance

- `Slider` and `RangeSlider` expose `onValueCommit`; a drag reports once at
  release, a keyboard step immediately, an unchanged gesture nothing.
- The offline, scoped runtime and full runtime suites pass; `check`, `lint` and
  `test` pass.
- Both slider pages carry the prop row and the keyboard/gesture rule; the
  examples suite mounts an example that uses it; `COMPONENTS.md` and `TODO.md`
  record the contract.
- The plan index links this plan.

## 8. Outcome

Landed as planned (2026-10-19).

- `SliderProps.onValueCommit` and `RangeSliderProps.onValueCommit` exist on both
  parts. A drag reports once at release with the value/pair the gesture resolved
  (so a deferring controlled parent still gets the gesture's result); a keyboard
  step reports immediately; a gesture that ends where it began and a refused
  press report nothing.
- The pure renderer seams gained `SliderHandlers.onCommit` /
  `RangeSliderHandlers.onSpanCommit`, so the keyboard branch reports where the
  next value is known. Both components track the gesture in a ref and clear it
  on the first end edge (`onMouseUp` or the released-button move).
- **Scoped runtime:** `runtime/value.runtime.test.tsx` **29/29** (seven new
  cases, including a deferring controlled parent). Full runtime: **58 files /
  819 tests** green on the release-tag build (was 812). Offline: **60 files /
  860 tests** (the docs API guard accepts the new rows; no offline test count
  changed).
- Both directions measured:
  - removing the four commit calls made **6** cases fail by name — the drag,
    keyboard, refused-press, deferred-parent and both range cases;
  - reporting on every release (dropping the changed check) made exactly the
    unchanged-gesture case fail;
  - restored, 28/28 pass.
- `nub run check`, `nub run lint` and `nub run test` pass.
- Docs (`slider.mdx`, `range-slider.mdx`), the value example, both inventory
  rows, `TODO.md` and the plan index carry the contract.
- One unrelated observation: the first full runtime run also failed
  `roving-arrows.runtime.test.tsx › commits star 1 from an unrated rating` with
  an empty `reports` array. It passes in isolation and in the next full run. It
  is a pre-existing timing flake in the focus tracker's settle, not this change
  (nothing here touches `Rating`); recorded rather than papered over.


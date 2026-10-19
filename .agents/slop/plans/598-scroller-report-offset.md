# 598 — a scroller's own report slides with its scroll offset

**Phase:** F (verification truth) — **implementation**
**Depends on:** `041`, `072`, `337`, `594`, `597`
**Owns:** `packages/primitives` (the test adapter and its core rule),
`examples/basic-app` (the app suite), `docs/gpuix-capabilities.md` (the
capability table). No product component changes.

## 1. The evidence

Published `@gpuix/native@0.10.0` (the release-tag build in the shared store)
reports a scroll container's **own** box from its **content origin**, slid by the
scroll offset, while its children report their **painted** window positions.

Measured 2026-10-19 in `examples/basic-app` (960 × 720), the app's
`settings-form` `ScrollArea` and the consent row inside it:

| State | Offset | Region report (`getElementBounds`) | Consent row report |
| --- | --- | --- | --- |
| Before the wheel | `0` | `y 91 … 643` | `y 716 … 752` |
| After `wheel(-400)` | `-109` | `y -18 … 534` | `y 607 … 643` |

- the region's report moved **by the offset** (`91 → -18`) while its painted
  viewport did not (`91 … 643`), so `report − offset` is the painted viewport;
- the row's report moved by the offset too (`716 → 607`), i.e. a child reports
  the **painted** position;
- the row is outside the viewport before the scroll (`716 > 643`) and inside it
  after (`607 … 643 ⊆ 91 … 643`).

Consequences measured on this build:

1. `examples/basic-app`'s `reaches the consent row, refuses Save, then saves once
   accepted` **fails**: it compares the row's painted bottom (`643`) with the
   region's *reported* bottom (`534`). The failure predates this plan
   (`TODO.md`, plan `327` note) and is not a layout defect in the app.
2. The test adapter's aim points are wrong for a scrolled scroller.
   `centerOf` uses `paintBounds`, which applies `paintedBox` but not the offset.
   Measured: a 120-high `ScrollArea` at `y 12` scrolled to `-100` puts the
   report at `y -88`, so `runtime.wheel("s", 0, -100)` dispatches at `y -28` —
   **outside the window**. A second identical wheel leaves the offset at `-100`
   (it should be `-200`). Every runtime test that scrolls twice with
   `runtime.wheel` has been silently doing nothing on the second call.

## 2. The rule

**The element that owns a scroll offset is the one host whose own report is not
a painted box; subtract its offset once.** Children already report painted
positions, so no ancestor walk is needed and no other host changes.

- `core/bounds.ts` gains `viewportBox(box, offset): BoxBounds` — one pure
  subtraction (`x − offset.x`, `y − offset.y`), no resize.
- `src/testing/runtime.ts`'s `paintedBoundsOf` applies it **after**
  `paintedBox` when `renderer.getScrollOffset(id)` is non-null. Order matters: a
  padded scroller reports `content origin + offset`, so the padding is added
  back first, then the offset removed.
- `bounds`/`boundsOf` stay the raw report (the adapter documents that
  distinction). `paintBounds` on a scroller now means its **visible box**, which
  is what a containment or aim-point check needs.
- `clickElement` keeps `boundsOf`: a child's raw report is already painted, and
  a `Button`'s raw report is its border box. Not part of this fix.

No product component reads a scroller's own bounds (`Select`, `Tooltip` and the
sliders measure triggers, tracks and layers), so this is test-infrastructure
truth only.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/core/bounds.ts` | add `viewportBox` with the measured rule in its doc |
| `packages/primitives/src/testing/painted-box.test.ts` | 3 cases for `viewportBox` |
| `packages/primitives/src/testing/runtime.ts` | apply `viewportBox` in `paintedBoundsOf`; document `paintBounds` for a scroller |
| `packages/primitives/runtime/scroll-viewport.runtime.test.tsx` | **new** — the two-wheel regression and the stable painted box |
| `examples/basic-app/runtime/app.runtime.test.tsx` | compare against `paintBounds(SETTINGS)`; assert the row is **not** revealed before the wheel and is after |
| `packages/primitives/README.md` | runtime test-file count `51 → 52` (guarded by `docs-counts.test.ts`) |
| `docs/gpuix-capabilities.md` §4 | replace the "cannot be asserted" sentence with the measured two-part rule |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | close the `basic-app` 6/7 note and record this row |

## 4. Test plan

**Offline — `painted-box.test.ts` (`viewportBox`).**

1. a zero offset is the identity (a fresh scroller);
2. a negative offset (scrolled down) moves the box back **up** by its magnitude,
   with width/height unchanged;
3. a positive offset (scrolled left/up) moves it the other way; the input box is
   not mutated.

**Runtime — `scroll-viewport.runtime.test.tsx`.**

1. *Two wheels.* A 120-high `ScrollArea` with 600 px of content: the first
   `runtime.wheel("s", 0, -100)` reports `-100`; the second reports `-200`.
   This case **fails on the current harness** (second stays `-100`), which is the
   bug's failing direction.
2. *A scroller's painted box does not move; its report does.* Record
   `paintBounds("s")` and `bounds("s")` at offset `0`, scroll `-100`, record both
   again: `paintBounds` is unchanged, `bounds.y` is `painted.y − 100`. Fails
   today, because both move.

**Runtime — `examples/basic-app`.** The existing case now asserts, in order:

1. before the wheel, the consent row is **not** inside `paintBounds(SETTINGS)`
   (`row.y ≥ viewportBottom`, measured `716 > 643`) — this is what makes the
   scroll necessary and it fails against a wrong baseline that would only assert
   containment after scrolling;
2. the wheel changes the offset (`< 0`);
3. after the wheel, both edges are inside (`viewportTop ≤ row.y` and
   `row.bottom ≤ viewportBottom`);
4. the click and the save lifecycle are unchanged.

**Both directions.** Revert `viewportBox`'s application in `paintedBoundsOf`
once: case 1 (two wheels) and case 2 (paint box) fail by name, and the app case
fails on the containment edge; restore, all pass.

## 5. Commands and expected results

```sh
# the pure rule
nub run --filter @gpuixui/primitives exec vitest run src/testing/painted-box.test.ts
# expect: all cases pass, including the 3 new ones

# the runtime regression file (native binding present on this host)
nub run --filter @gpuixui/primitives test:runtime -- scroll-viewport
# expect: 2/2 pass; with the fix reverted, 2/2 fail by name

# the app workflow
nub run --filter @gpuixui/basic-app test:runtime
# expect: 7/7 pass (today: 6/7 — the consent-row containment case)
```

Then the package gates:

```sh
nub run --filter @gpuixui/primitives test     # 58 files, all passing
nub run check                                  # tests/lint/fmt/types
```

## 6. STOP conditions

- Stop if `getScrollOffset(id)` on the scroller does **not** return the offset
  used by the wheel (the rule depends on it).
- Stop if a child of the scroller reports a position that is **not** shifted by
  the offset; the correction then belongs to the child too and the rule is
  wrong — report the measurement instead of widening the fix.
- Stop if applying the correction changes any existing `paintBounds` assertion
  on a non-scroller (offset `null` must be the identity).
- Do not re-baseline the app assertion to `534`; the measured painted viewport
  is `91 … 643`.

## 7. Acceptance

- `viewportBox` exists, documented with the measured table above.
- `paintBounds` on a scroller is its visible box; `bounds` stays raw.
- Two consecutive `runtime.wheel` calls both move a scroller.
- The app's consent-row case passes and would fail before the scroll.
- `docs/gpuix-capabilities.md` §4 states the measured rule (own report slides,
  children report painted, `paintBounds` corrects) and keeps the residual
  Select-list caveat.
- `README.md` file count updated; `nub run check`, `nub run --filter
  @gpuixui/primitives test`, the scoped runtime files and the app suite green.

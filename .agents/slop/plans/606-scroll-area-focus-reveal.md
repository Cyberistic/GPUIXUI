# 606 — A scroll region does not reveal the control that takes focus

**Phase:** F (verification truth) — **implementation**
**Depends on:** `041`, `072`, `076`, `337`, `583`, `590`, `591`, `598`, `599`, `601`, `603`
**Owns:** `packages/primitives` (`ScrollArea`, the shared focus hooks, the
hand-rolled focus owners, `core/bounds.ts`, their suites and the ScrollArea
page), `COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`. No other
workstream's paths.

## 1. The evidence

`docs/scroll-area.mdx` records the limitation as measured behaviour:

> **Focus does not follow into off-screen content.** Tab can land on a control
> painted outside the region: focus does not bubble from a child and
> `scrollIntoView` did not move a plain scroller in the 0.10.0 probe.

Measured again on this host (pinned release-tag build, 2026-10-19) with a
labelled `ScrollArea` (`height: 120`, `testId="s"`, painted `y 12…132`), a
400-high filler and a `Button` (`testId="target"`, painted `y 412…448`):

| Step | Observation |
| --- | --- |
| walk `focusNext()` until `target` holds focus | `focused()` is `target` |
| read the region's offset | `{ x: 0, y: 0 }` |
| read `target`'s bounds | unchanged, `y 412…448` — **280 px below the viewport** |
| call the runtime's `scrollIntoView` on `target` | offset stays `{ 0, 0 }` |
| read the region's painted box | unchanged, `y 12…132` |

So keyboard focus and the pointer path can both land on a control the user
cannot see, and the runtime's own reveal verb does nothing for a plain
scroller. The same absence exists in every focusable primitive: none of the
shared focus owners has any reveal step.

## 2. The rule

**A `ScrollArea` reveals the focusable descendant that takes native focus.** It
measures the focused host and its own visible box, then moves by the overflow
through `renderer.scrollTo` — the verb `Select` already uses because
`scrollIntoView` is one child short (plans `599`, `603`).

The notification belongs in the shared hooks, because every focusable control
already uses one:

| Owner | Controls |
| --- | --- |
| `useFocus` | Button, IconButton, Toggle, Checkbox, Switch, Input, TextArea, NumberField, Select trigger, Slider track, InfoTip, ScrollArea itself |
| `useRovingFocus` | RadioGroup, ToggleGroup, Rating, RangeSlider thumbs |
| hand-rolled focus state | `CheckboxGroup` rows, `OTPField` cells |

A `ScrollRevealContext` (in `internal.ts`, never re-exported from the package
root) carries a `(hostId: number) => void` callback. A `ScrollArea` provides it
around its viewport; each owner calls it from a `useLayoutEffect` when its
focused host changes. Outside an area the context is `undefined`, so the effect
is inert. The nearest area wins, which is the honest answer for a nested region.

**The measurement is the same one the tests use.** The component knows its own
host instance (`root.current`), so it can correct its reported box with
`paintedBox` and subtract its own offset with `viewportBox` — the published
hybrid box model (plan `597`). The focused host is read with
`renderer.getElementBounds(id)`; a host that paints no surface reports `null`,
and then no reveal happens (recorded as the one limit).

`core/bounds.ts` gains the axis-aware rule so both axes are provable without a
window:

```ts
export const scrollIntoViewOffsets = (item, viewport) => ({ x, y });
```

`x`/`y` are positive when the item is past the trailing edge and negative when
it starts before the leading edge. `scrollIntoViewDelta` becomes `y` of that
result (the existing Select contract is unchanged). `ScrollArea` moves on the
axes it actually scrolls (`axis="vertical"` never moves `x`), and
`next = current − delta` because GPUI's offsets are negative towards the end.

The reveal reports through the existing `onScrollPositionChange` path, so a
consumer sees the move it did not request; `reportPosition` moves to a
`useCallback` with the caller's callback in a ref so the context value stays
stable (an unstable callback would re-run every focused child's effect).

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/core/bounds.ts` | `scrollIntoViewOffsets`; `scrollIntoViewDelta` delegates to it |
| `packages/primitives/src/core/bounds.test.ts` | both axes, already-visible, oversized item, zero delta |
| `packages/primitives/src/components/internal.ts` | `ScrollRevealContext` + `useScrollReveal`; the reveal effect in `useFocus`; the reveal effect in `useRovingFocus` |
| `packages/primitives/src/components/ScrollArea.tsx` | provide the context; `reveal` measures both boxes and calls `scrollTo`; stable `reportPosition` |
| `packages/primitives/src/components/CheckboxGroup.tsx` | reveal the focused row (hand-rolled state) |
| `packages/primitives/src/components/OTPField.tsx` | reveal the focused cell (hand-rolled state) |
| `packages/primitives/runtime/scroll-reveal.runtime.test.tsx` | **new**: the matrix |
| `packages/primitives/docs/scroll-area.mdx` | a “Focus reveal” paragraph; the limitation retires; Verification names the matrix |
| `packages/primitives/README.md` | runtime test-file count `56 → 57` |
| `COMPONENTS.md` | the ScrollArea row records the reveal |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | one ticked row under the primitives workstream |

No new public export, no dependency, no reimplementation of `scrollTo`.

## 4. Test plan

**Runtime — new `runtime/scroll-reveal.runtime.test.tsx`, one fresh window per
case.** A `Surface` frame, a labelled `ScrollArea` of `height: 120` (or
`width: 300` horizontally), a filler taller/wider than the viewport, and the
focusable subject after it.

1. **`Button` below the fold, and the report** — walk `focusNext()` until
   `target` holds focus, `await settleFocus()`; assert `focused()` is `target`,
   the region's offset is negative, `target` is inside the region's painted
   box, and the recorded `onScrollPositionChange` is the landing offset. This
   is the measured failure above (offset `0`, target `y 412…448`).
2. **Roving composite** — a `RadioGroup` below the fold; the same walk lands on
   its first option and the region reveals it (proves `useRovingFocus`).
3. **Hand-rolled group** — a `CheckboxGroup` below the fold; its first row is
   revealed (proves the `CheckboxGroup` path).
4. **Hand-rolled field** — an `OTPField` below the fold; its first cell is
   revealed (proves the `OTPField` path).
5. **Mount-focused field** — an `Input autoFocus` below the fold; the provider's
   first sample re-runs the reveal after the box exists.
6. **Mount-focused cell** — an `OTPField autoFocus`; the same late measurement
   on the hand-rolled path.
7. **Up direction** — content taller than the region, wheel to the bottom, focus
   the bottom control, then focus a control at the top programmatically; the
   region returns to the top and contains it.
8. **Already visible** — a control at the top is focused; the offset stays
   `{ 0, 0 }` (no gratuitous scroll).
9. **Horizontal** — an `axis="horizontal"` region with a wide row; tab to the
   far button; `offset.x` is negative and the button is inside the visible box,
   while `offset.y` stays `0`.
10. **Outside the area** — a control after the region (not a descendant) takes
    focus; the region's offset does not move (the context is scoped).

The **failure direction** is the current tree: cases 1–7 and 9 fail because no
reveal exists (offset `0` / `-400`), while 8 and 10 pass both ways as guards.
After the fix, revert `useScrollReveal`'s call in `useFocus` → cases 1, 5, 7 and
9 fail (case 5 is the mount-focused field); revert only in `useRovingFocus` →
case 2; only in `CheckboxGroup` → case 3; only in `OTPField` → cases 4 and 6.

**Offline.** The core cases prove the axis rule; the existing
`src/components/ScrollArea.test.tsx` element tree must stay unchanged (the
provider adds no host element). `nub run check` runs the types, the docs guard,
the contract and the TSDoc scan (the two new exports need summaries).

**Commands.**

```sh
nub run --filter @gpuixui/primitives test:runtime -- runtime/scroll-reveal.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime -- runtime/layout.runtime.test.tsx runtime/scroll-area-trigger.runtime.test.tsx runtime/scroll-viewport.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
```

## 5. STOP conditions

- Stop if `renderer.getElementBounds(hostId)` reports `null` for the focused
  `Button`/row in the probe: the reveal cannot be measured from the host id, and
  the design must carry the instance instead; report the measurement.
- Stop if `root.current.props.style` is not the authored style: the region's
  painted box cannot be corrected here (plan `597`); report the observed shape.
- Do not call `scrollIntoView`: measured, it does not move a plain scroller and
  it is one child short in a list (plans `599`, `603`).
- Do not reveal on every render. The effect depends on the focused host, not on
  the component's render count, or an unrelated parent re-render would move the
  region.
- Do not scroll an axis the area does not scroll.
- Do not touch `Select`'s own measurement path; it already reveals its
  highlight into view (plan `599`).
- Do not edit a runtime assertion to make it pass; measure and report.

## 6. Acceptance

- Cases 1–8 are green on the release-tag build, and the failure direction is
  observed and recorded.
- A focused control inside a labelled `ScrollArea` is inside the visible box,
  on both axes, after `Tab`, a click or a programmatic `focusElement`.
- A control outside the area, or one already visible, moves nothing.
- Offline, scoped runtime, `nub run check`, `nub run lint` and the full
  `nub run test` are green; the page, README count, inventory and plan index
  agree.

## 7. Result (2026-10-19)

- **Measured pre-fix** on the release-tag build: a `Button` at `y 412…448` took
  focus while the 120-high region stayed at offset `0` and painted `y 12…132`;
  the runtime's `scrollIntoView` on that host left the offset at `0`.
- **Fix:** `core/bounds.ts` gains `scrollIntoViewOffsets` (both axes);
  `internal.ts` provides `ScrollRevealContext`/`useScrollReveal` and both shared
  focus hooks call it from a layout effect; `CheckboxGroup` and `OTPField` do the
  same with their own focus state; `ScrollArea` measures its painted viewport
  (`paintedBox` + `viewportBox`) and the focused host, moves by the overflow on
  the axes it scrolls, and reports the landing position.
- **Case count:** `runtime/scroll-reveal.runtime.test.tsx` — **10/10**. Scoped
  `layout`, `scroll-area-trigger` and `scroll-viewport` stay green.
- **Failing directions:** on the old tree cases 1–7 and 9 fail (offset `0`);
  dropping the `useFocus` call fails 1, 5, 7 and 9; dropping the `useRovingFocus`
  call fails 2; dropping `CheckboxGroup`'s fails 3; dropping `OTPField`'s fails
  cases 4 and 6. The already-visible and outside guards pass in every direction.
- **A found gap while proving it:** a field that mounts with `autoFocus` was
  focused before the first paint, so its first reveal ran before its box existed
  and never re-ran. The reveal now depends on the provider's sample and refuses
  a sample that names another host; both mount-focused cases fail without it.
- `docs/scroll-area.mdx`'s “Focus does not follow into off-screen content”
  limitation is retired; the remaining limit is a focused host that reports no
  bounds (no reveal).
- Offline **59 files / 831 tests**; full runtime **57 files / 791 tests**,
  green on the release-tag build.

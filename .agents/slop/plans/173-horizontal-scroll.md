# Plan 173 — horizontal scroll, tab-strip overflow and active-tab reveal

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → C/D (Tier 2 **Tabs**, Tier 4 **Tabbed panels** / **Docking layouts**).
**Depends on:** plans `100`, `110`, `120`, `140`, `158`, `166`, `167`.

## 1. Why this plan exists

The capability map claims **`scroll` is verified**, but every measurement is
vertical: `scroll-container` drives a wheel with `deltaY`, `scroll-into-view`
drives a virtual list, `drag-autoscroll` sets `scrollTo(id, 0, y)`. Nothing in
the repo has ever moved a scroll container on the **x axis**, and nothing has
measured what happens to a child that is wider than its viewport.

That is the missing primitive behind three inventory rows:

- **Tabs (Tier 2)** — a tab strip with more tabs than fit must pan, keep the
  active tab visible, and still hit-test a tab that starts off-screen.
- **Tabbed panels / Docking layouts (Tier 4)** — every real workspace overflows
  its strip, and a restored workspace must reveal the active tab, not just set
  state.
- **Wide data grids and `<code>`** — both scroll horizontally; `<code>` is its
  own horizontal scroller by design.

The questions a component cannot answer from the docs:

1. Does `overflowX: "scroll"` create a real horizontal scroller, and does
   `getScrollOffset` report `x`?
2. Which wheel delta pans it — `deltaX` (a trackpad swipe), `deltaY` (a plain
   mouse wheel over a horizontal-only strip), or both?
3. Can component code pan it exactly (`renderer.scrollTo(id, x, 0)`)?
4. Does `renderer.scrollIntoView` reveal an **overflowed** child, and is that
   child then hit-testable?
5. Does a child outside the viewport keep painted bounds, or is it clipped out
   of the tree the way a virtual row is?

This probe builds the tab strip that a Tabs component would ship and answers
all five in one gesture sequence.

## 2. What is built

One scenario, `tab-strip-overflow` (capability `scroll`), in
`apps/playground/src/scenarios/tab-overflow.tsx`.

### 2.1 The view

`TabOverflowProbe`:

- `tab-strip` — a `div` **300 px wide**, `display: "flex"`, `gap: 4`,
  `padding: 4`, `overflowX: "scroll"`, `overflowY: "hidden"`, holding **ten**
  tabs of fixed width **72 px** (content ≈ 764 px, so ~6 tabs fit).
- Each tab `tab-0` … `tab-9`: `role="tab"`, `aria-selected`, `tabIndex={0}`,
  themed background, a `text` label. A `PublicInstance` ref per tab.
- `tab-active` — a `Readout` of `active=<n>`.
- `tab-wheel` — a `Readout` of `dx=<n> dy=<n>`, accumulated from `onScroll`
  (`event.deltaX` / `event.deltaY`), proving the event axes reach the app.
- `tab-pan-end` — a `Pressable` that calls
  `renderer.scrollTo(strip.id, -400, 0)`.
- `tab-reveal-last` — a `Pressable` that calls `tab-9`'s
  `scrollIntoView?.()`.

Behaviour in the view (the contract a Tabs component needs):

- a click selects a tab **and** reveals it (`scrollIntoView`);
- `ArrowLeft` / `ArrowRight` / `Home` / `End` move the selection, move **native
  focus** to the target tab (`renderer.focusElement`), and reveal it;
- the strip records the last wheel delta so a readout can show both axes.

Keep the key handler on the tab (the focused element), not the strip: plan `172`
measured that a captured gesture's moves go to the pressed element, and plan
`158` delivered keys to the focused row.

### 2.2 The steps

1. `getScrollOffset("tab-strip")` exists and is `x: 0, y: 0`; `tab-0` has
   bounds inside the strip.
2. **Overflow is real**: `bounds("tab-9")` is either `null` (clipped out like a
   virtual row) or starts at/after the strip's right edge. Assert
   `none || lastLeft >= stripRight - 1`, and record which one was measured.
3. `wheel("tab-strip", -240, 0)` — the offset's `x` becomes ≈ `-240` and `y`
   stays `0` (horizontal wheel pans right; the sign is GPUix's).
4. `tab-wheel` reports `dx ≠ 0`, so `onScroll` carries the horizontal axis.
5. `wheel("tab-strip", 0, -240)` — a vertical wheel over a horizontal-only
   strip: assert `y` stays `0`; record whether `x` moved. This is the mouse-wheel
   over an overflowing strip case.
6. `scrollIntoView("tab-9")` — the offset moves further left and `tab-9`'s
   left edge is now inside the strip (`left >= stripLeft - 1` and
   `left < stripRight`).
7. `click("tab-9")` now succeeds: `tab-active` reads `active=9`, and native
   focus is `tab-9`.
8. Click `tab-0` (revealed by step 7's pan? no — first
   `scrollIntoView("tab-0")`), then `key("end")`: `tab-active` reads `active=9`
   and `tab-9` is focused and inside the strip — **selection follows focus and
   the reveal is component code**, not a renderer side effect.
9. `tab-pan-end` sets `x ≈ -400` exactly (component-owned pan), then
   `scrollIntoView("tab-0")` returns it to `x ≈ 0`.
10. The reveal is **not** automatic: from `x ≈ 0`, selecting `tab-9` through a
    synthetic click whose centre is clipped is not attempted; instead the
    readout from step 8 is the evidence that the component (not the runtime)
    moved the offset. No check claims a runtime auto-reveal.

### 2.3 Honesty

Every check reads runtime state (`getScrollOffset`, `getElementBounds`,
`getFocusedElementId`, the a11y tree) rather than the view's own readout where
the runtime can answer. A readout-only lie must not pass; the readout is only
used for the `onScroll` axis (`deltaX`/`deltaY`), which the host does not
otherwise expose.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/tab-overflow.tsx` | new view + steps |
| `apps/playground/src/scenarios/index.ts` | import and register after `scrollScenario` |
| `apps/playground/src/smoke/run.test.ts` | assert `tab-strip-overflow` is registered |
| `apps/playground/README.md` | `41 → 42`; measured-facts row for horizontal scroll |
| `COMPONENTS.md` | capability table row for horizontal scroll; Tabs (Tier 2) and Tabbed panels (Tier 4) notes |
| `TODO.md` | tick the probe; progress `36 → 37` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/140-…` §4 | the scroll row gains the horizontal facts |

No `packages/testing` change is expected: `wheel`, `scrollOffset`,
`scrollIntoView`, `key`, `click` and `focused` already exist. If a host verb
turns out to be missing, add the **smallest** seam to `packages/testing` and its
`nullHost` no-op, and say so in §8.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only tab-strip-overflow` | green, exit `0`, `scroll=verified` |
| `nub apps/playground/dist/smoke/run.js` | `42/42 scenarios passed`, exit `0` |
| `nub run --filter playground test` | registry test green |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof:** remove `overflowX: "scroll"` from the strip and the run
must exit `1` on "the strip starts at the left / is scrollable" (the wheel
cannot move it); restore it and the suite is green. Remove the
`scrollIntoView` call from the `End` branch and the run must exit `1` on the
"the keyboard reveal put the last tab inside the strip" check. Record both
outputs in §8.

## 5. STOP conditions and branches

- **`overflowX` does not create a horizontal scroller** (offset stays `0` after
  every attempt, or `getScrollOffset` is `null`): record the exact attempt and
  assert `0`. Then the honest statement is "horizontal scrolling is not
  available on 0.10.0"; Tabs/tabbed panels must use a **paged** strip or shrink
  the tabs, and both rows stay `todo` with that evidence. Do not fake a pan by
  reordering tabs.
- **Only `deltaY` pans** (the `deltaX` wheel does nothing): record it and use
  `deltaY` in the checks; a component handling a trackpad must read **both**
  axes.
- **`scrollTo` ignores `x`** (the vertical case works, horizontal does not):
  record it; the reveal then depends on `scrollIntoView` alone, and the plan's
  fallback is a "reveal by focus" contract.
- **`scrollIntoView` cannot reach an overflowed tab** (the offset does not move,
  or the tab keeps no bounds): record it and assert what was measured; the Tabs
  row keeps a documented limitation instead of a green claim.
- **The wheel scrolls the window or an ancestor instead** (the strip's offset
  stays `0` but the scenario's layout moves): record it; the probe must not
  assert on window position.
- **A change outside the owned paths is required**: record it in `TODO.md` and
  do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `tab-strip-overflow` | native smoke | a strip that never overflows; a wheel that moves the wrong axis; a pan that loses the exact offset; a reveal that only changes React state; a click that misses a previously clipped tab |
| two-direction runs (§4) | native smoke | the checks passing without `overflowX`, and without the component reveal |
| registry assertion | unit (`apps/playground`) | the scenario falling out of the registry |
| full suite | native smoke | the new strip disturbing later scenarios (shared host state) |

## 7. Acceptance criteria

- `tab-strip-overflow` is registered, green, and its **measured** facts are in
  §8, the app README and `COMPONENTS.md`.
- Every check reads a runtime value, not only a readout.
- The suite is **42/42**, exit `0`; both two-direction proofs are recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.
- No file outside `apps/playground` is edited (except the docs/index files
  named in §3, which this workstream owns or is required to update).

## 8. Outcome

Executed on this host on 2026-10-17; **42/42 green**, exit `0`, `scroll=verified`
in `.artifacts/smoke-report.json`. `tab-strip-overflow` records **29 checks**.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **`overflowX: "scroll"` is a real horizontal scroller.** The strip's
  `getScrollOffset` reports `x` and `y`, and a wheel with `deltaX: -240` moved
  `x` to exactly `-240` while `y` stayed `0`. This is the first x-axis scroll
  measurement in the repo.
- **A vertical wheel does not pan a horizontal-only strip.** With the strip
  already at `x = -240`, `wheel(0, -240)` left `x` at `-240` and `y` at `0`; the
  event propagates to nothing instead of being reinterpreted. A Tabs component
  therefore handles a **trackpad's `deltaX`** and must offer its own horizontal
  wheel path (or arrows) for a plain mouse.
- **`onScroll` carries `deltaX`.** The view accumulated both axes from the
  event, so the app can react to a horizontal pan; the host does not expose the
  event otherwise, so the readout is the only non-runtime assertion in the
  scenario (every offset, bound and focus check reads the renderer).
- **A clipped child keeps painted bounds.** `tab-9` measured `x = 689` while
  the strip was 300 px wide — the runtime does **not** drop an overflowed child
  from the retained/painted tree the way a `<virtual-list>` drops an off-window
  row. The scroller clips it visually; the node is still addressable. A strip
  must therefore hit-test against the viewport itself rather than assume the
  clipped node disappears.
- **`scrollIntoView` reveals an overflowed child, and saturates.** From
  `x = -240`, `scrollIntoView("tab-9")` panned to `x = -461` (the strip's end)
  and the tab's left edge was inside the viewport.
- **The reveal is off by the scroller's inset at the near end.**
  `scrollIntoView("tab-0")` from the end returned to `x = -5`, not `0` — the
  child is aligned against the scrollport, not the strip's padded content box.
  A component that needs an exact origin (or an exact anchor for persistence)
  clamps the offset itself instead of trusting the reveal's last pixel.
- **`renderer.scrollTo(id, x, 0)` is exact horizontally.** Component code panned
  to `-400` and the runtime reported `-400 ± 2`.
- **The tab contract holds natively.** A revealed tab is clickable and takes
  focus; `End` selects the last tab, moves **native focus** there through
  `renderer.focusElement`, and the component-owned `scrollIntoView` puts it
  inside the viewport. A strip whose reveal is React state alone fails the last
  check (two-direction proof below).

Two-direction proofs:

1. Removing `overflowX: "scroll"` made the run exit `1` with
   `a horizontal wheel pans right (x=0): expected -240 ± 12, got 0` and
   `scroll=failed`; restoring the line made it green (exit `0`).
2. Removing `tab?.scrollIntoView?.()` from the select path made the run exit `1`
   with
   `the keyboard reveal puts the last tab inside the strip: expected true, got false`
   and `scroll=failed`; restoring it made the suite green again.

No change outside the owned paths. No `packages/testing` verb was needed:
`wheel`, `scrollOffset`, `scrollIntoView`, `click`, `key` and `focused` already
covered the probe. The registry unit test now asserts `tab-strip-overflow` is
present.


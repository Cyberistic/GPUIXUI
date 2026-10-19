# 604 — A floating layer follows the window size the host reports

**Phase:** F (verification truth) — **implementation**
**Depends on:** `060`, `067`, `095`, `098`, `335`, `336`, `347`, `391`, `393`, `597`, `603`
**Owns:** `packages/primitives` (one wrapper, one runtime suite, the Tooltip/InfoTip/Select pages), `COMPONENTS.md`, `PLAN.md`, `.agents/slop/plans/README.md`, `TODO.md`.

## 1. The evidence (measured 2026-10-19)

`Select` already follows the window: it reads `useWindowSize()` (100 ms observer)
and its placement effect depends on the reported size. `Tooltip` reads
`readWindowSize(renderer)` **in render** and never subscribes, so nothing
re-renders a tip when the window changes, and its placement effect does not
depend on the size either.

Probe on the release-tag `TestRenderer` (a 1280 × 800 window, the platform's
size report overridden after mount — the real resize path `useWindowSize` polls):

| Case | Before the change | Expected |
| --- | --- | --- |
| `side="bottom"` tip, trigger `y 212..236`, host reports `600 × 250` | tip stayed at `y 241` (over the trigger, which now has no room below) | tip opens above (or is refused a stale side) |
| 60-word tip, full window | tip `1258 px` wide | after a `300 px` report, ≤ `300 − 2 × 8` |
| `Select` list, trigger `y 212..236`, host reports `600 × 250` | list flipped above | **control**: proves the harness signal reaches `useWindowSize` |

The `Select` control passes today, which isolates the defect to the tooltip
wrapper rather than to the technique.

## 2. The rule

**A floating layer's side, height cap and width cap are a function of the
window size the host reports now, not of the size at mount or at open.**

- `Tooltip` subscribes with the runtime's own React hook:
  `useWindowSize({ intervalMs: open ? 100 : false })` — polled only while a tip
  is open, because a closed tip has nothing to place. The published
  `observeWindowSize`/`useWindowSize` dedupes equal sizes, so a static window
  costs one read per open.
- The tip's measuring layout effect depends on the reported size, so a resize
  re-measures the painted tip (its wrapped height changes when the width cap
  changes) and the side decision sees the new height. `Select` already does
  this (`viewport.width`/`viewport.height` are in its effect's dependencies).
- `readWindowSize` is no longer used by a component. It stays available from
  the runtime for one-shot reads.

No change to the pure placement rules (`core/floating.ts`): they already take
the viewport as an argument.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/components/Tooltip.tsx` | replace `readWindowSize` with `useWindowSize`, poll only while open, add the reported size to the layout effect's dependencies |
| `packages/primitives/runtime/floating-resize.runtime.test.tsx` | **new**: the two failing cases and the `Select` control (§4) |
| `packages/primitives/docs/tooltip.mdx` | Placement states the resize rule and the measured evidence; Verification names the new suite |
| `packages/primitives/docs/info-tip.mdx` | one bullet: the tip re-places on a resize (inherited) |
| `packages/primitives/docs/select.mdx` | **delete the false limitation** "there is no resize observer in 0.10.0"; state what is measured live and the remaining trigger-width limit |
| `COMPONENTS.md` | Tooltip row: the resize fact and the suite; Select row: its placement follows the reported size |
| `PLAN.md` | decision D47 |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | one ticked row under the primitives workstream |

## 4. Test plan — `runtime/floating-resize.runtime.test.tsx`

One window per test (`openWindow`). A helper overrides the renderer's declared
size report and waits for the 100 ms observer:

```ts
const reportWindow = (runtime: Runtime, size: { width: number; height: number }) => {
  runtime.renderer.getWindowSize = () => size;
};
const settleWindow = () => sleep(250); // two 100 ms samples + margin
```

The header records the harness limit: the `TestRenderer` cannot resize its
offscreen window (there is no setter; measured), so the case injects the size
the host reports — the same signal `useWindowSize` polls. The layer's own
layout still runs against the real window, so each case asserts **our decision**
(which side, which cap), never the runtime's clamp.

1. **A `side="bottom"` tip flips above when the host shrinks.** A 200 px
   spacer puts the trigger at `y 212..236`; hover it and assert the tip is
   below. Override the report to `600 × 250`, settle, flush, assert the tip is
   above (`tip.y + tip.height <= trigger.y`, allowing the measured 5 px gap the
   binding paints). Fails before the fix (`y 241`).
2. **A long tip is capped by the narrower window.** A 60-word tip paints
   1 258 px on the full window. Override to `300 × 800`, settle, flush twice,
   assert the width is ≤ `300 − 2 × FLOATING_MARGIN` and strictly smaller than
   before. Fails before the fix (1 258 px).
3. **A long tip flips below when the narrower cap makes it too tall above.**
   The trigger sits ~120 px from the top with a 60-word tip: it fits above at
   full width. Override to `300 px`; the tip re-wraps to many lines, so the
   re-measured height no longer fits above and the side must flip below. This
   is the case the **layout-effect dependency** guards: with only the
   subscription, the side is decided from the old one-line-ish height. Fails
   before the fix.
4. **Control: a `Select` list follows the same report.** Open a list below a
   trigger at `y 212`, wait for the focus tracker (`settleFocus`), override to
   `600 × 250`, settle, and assert the list is above the trigger. It fails if
   `Select`'s subscription is removed. The `settleFocus` wait is load-bearing:
   an unrelated focus-driven re-render would call `readWindowSize` and let a
   non-subscribing wrapper pass by accident (measured — without the wait the
   control passed even with `Select` reverted to `readWindowSize`).

**Both directions.**

- Revert `Tooltip` to `readWindowSize` (no subscription): cases 1–3 fail by
  name; case 4 passes.
- Keep the subscription but remove `viewport.width`/`height` from the layout
  effect: case 3 fails; cases 1–2 pass.
- Remove `useWindowSize` from `Select`: case 4 fails.

## 5. Commands and expected results

```sh
cd packages/primitives

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/floating-resize.runtime.test.tsx
# before the fix: cases 1-3 fail with the measured boxes; case 4 passes
# after: 4/4 pass

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/fields.runtime.test.tsx \
  runtime/tooltip-side-cap.runtime.test.tsx \
  runtime/info-tip.runtime.test.tsx \
  runtime/overlay-trigger.runtime.test.tsx
# expect: all pass (Tooltip/Select placement is unchanged for a static window)

nub run --filter @gpuixui/primitives test     # offline suite, expect all pass
nub run check
nub run lint
```

## 6. STOP conditions

- Stop if case 4 (the `Select` control) does **not** follow the reported size:
  the harness technique is wrong, and none of the results are evidence.
- Stop if the subscription fixes cases 1–2 but case 3 stays red and the effect
  already depends on the reported size: the tip is not being re-measured after
  a re-wrap. Report the measured tip box before/after; do not weaken the case.
- Do not simulate a resize by re-rendering with a different `WINDOW` constant:
  that creates a new native window and proves nothing about a live one.
- Do not add a `setWindowSize` to the test adapter; it would fake the platform.
- Do not change `core/floating.ts`: it is pure and already correct.

## 7. Acceptance

- A tip opened in a 1280 × 800 window re-centres/caps/flips after the host
  reports a 300 × 250 one, with the measured boxes recorded.
- `Select`'s page no longer claims 0.10.0 has no resize observer.
- The four cases prove the class in both directions; the offline and runtime
  suites and the three gates are green; the inventory and plan index agree.

## 8. Result (2026-10-19)

- **Fixed:** `Tooltip` now calls `useWindowSize({ intervalMs: open ? 100 : false })`
  and its measuring layout effect depends on the reported width and height. A
  closed tip has no observer; an open one follows a resize within one 100 ms
  sample. `Select` already did this, so the two floating wrappers now agree.
- **Cases:** `runtime/floating-resize.runtime.test.tsx` — **4/4** on the
  release-tag build. The failing direction is the probe in §1: the tip stayed at
  `y 241` (below) over a trigger at `y 212..236` for a 250-high reported window,
  and the long tip stayed at 1 258 px for a 300 px report. After the fix the
  flipped tip's **raw** report is `y 191..215` against the trigger's `y 212` —
  the 3 px overlap is the raw content-origin box, which is why the suite reads
  `paintBounds` (the painted box, plan `597`) and not `bounds`.
- **Failing direction 1** (revert `Tooltip` to `readWindowSize`): cases 1, 2 and
  3 fail by name; case 4 (the `Select` control) passes.
- **Failing direction 2** (keep the subscription, delete `viewport.width`/
  `viewport.height` from the effect): only case 3 fails, with the tip clamped at
  `y 8` over the trigger — the re-wrapped height never reached the side
  decision. This is why the dependency is part of the fix.
- **Failing direction 3** (`Select` reverted to `readWindowSize`, with
  `settleFocus` before the override): case 4 fails (`y 316` for a trigger whose
  top is `212`).
- **Docs truth:** `select.mdx` said "there is no resize observer in 0.10.0" and
  "a resize while the list is closed is picked up the next time it opens"; both
  were false (the page now states what is observed and the remaining
  trigger-width limit). `tooltip.mdx`, `info-tip.mdx` and the two inventory rows
  record the behaviour.
- **Harness limit (recorded in the file):** the `TestRenderer` has no
  `setWindowSize`, so the cases inject the size the platform reports. The
  layer's own layout still runs against the real window, so the cases assert our
  side/cap decision rather than the runtime's clamp. A real window resize on a
  consumer install is the same signal the observer polls.
- Scoped neighbours (one run): `tooltip-side-cap`, `info-tip`,
  `overlay-trigger` and `fields` — 4 files / 110 tests green, so Tooltip and
  Select placement is unchanged for a static window. Offline 59 files / 820
  tests; full runtime 54 files / 766 tests (after this file's four cases).

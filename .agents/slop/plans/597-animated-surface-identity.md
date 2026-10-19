# 597 — Animated surfaces are addressable: a typed motion wrapper

| Field | Value |
| ----- | ----- |
| Status | wip |
| Phase | F (consistency, composability, native proof) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `372`, `386`, `525`, `526`, `592` (playground) |
| Closes | the playground's cross-team row "`motion.div`'s published `MotionDivProps` omits `testId`, `role` and the `aria-*` props" (evidence: plan `157` §8, playground `TODO.md`) |

## 1. Goal

Give every animated surface the same host identity as a plain part, so a native
suite (ours or the playground's) can address the **animated box** by `testId`
and describe it with `role`/`aria-*`.

Today the animated boxes are anonymous:

- `internal/reveal.tsx` (Collapsible, Accordion) wraps the caller's body in a
  `motion.div`, and its own header says "`motion.div` has no `testId`, `role` or
  `aria-*` in 0.10.0, so the caller's props belong to the inner plain div and a
  suite reads the body through a following sibling."
- `toast/viewport.tsx` wraps each card in an anonymous `motion.div`; the 500 ms
  exit ghost is only addressable through the inner card, which is the same node
  before and after the queue drops the toast.
- `popover.tsx`, `drawer.tsx` and `dialog.tsx` wrap their surfaces the same way.

The consequence is measured: playground plan `592` had to assert the collapsible
tween through the **next row's** movement (`content.height * 0.4 ± 4`) because
the animated container it actually wants to measure has no id.

## 2. Evidence read before planning (2026-10-19)

| Fact | Source |
| ---- | ------ |
| `MotionDivProps` declares `children`, `style`, the host handlers and `autoFocus`, but **not** `testId`, `role` or any `aria-*` | `packages/components/node_modules/@gpuix/react/dist/components/index.d.ts:17` |
| `MotionDiv` destructures only the motion fields and spreads `...props` into `createElement("div", hostProps)` — the runtime therefore forwards every host prop | `.../dist/components/index.js` (`const MotionDiv = forwardRef(...)`) |
| A `motion.div` authored with `testId="probe-surface"` and `role="group"` was found by `renderer.findByTestId` and reported `customProps.role === "group"` | probe run in `src/behaviour/` on this host, 2026-10-19 (deleted after measuring) |
| The reveal body's inner div keeps the caller's `testId`; the animated wrapper is anonymous | `src/internal/reveal.tsx:141-161` |
| The toast card is identified on the inner card (`toast-<id>`), not on the animated wrapper | `src/toast/viewport.tsx:118-140, 335-341` |

So the gap is **only the published type**. The wrapper below restores the type
without a cast, and the IDs below make the box measurable.

## 3. Design

### 3.1 One typed wrapper

New file `packages/components/src/internal/motion.tsx`:

```tsx
/**
 * A typed animated host surface.
 *
 * `@gpuix/react`'s `motion.div` forwards every prop to the native `div` at
 * runtime, but its published `MotionDivProps` omits `testId`, `role` and the
 * `aria-*` props (0.10.0). This wrapper restores the host surface so an
 * animated box can carry the same identity as a plain part.
 */
import { motion, type MotionProps, type Props } from "@gpuix/react";

/** The runtime motion fields plus the full GPUix host surface. */
export interface MotionSurfaceProps extends MotionProps, Omit<Props, "motion"> {}

/** An animated `div` that accepts the full GPUix host surface. */
export const MotionSurface = (props: MotionSurfaceProps) => (
  <motion.div {...props} />
);
```

`Omit<Props, "motion">` is deliberate: `motion` is the runtime's internal
animation description and a caller must not overwrite it. No cast, no `any`.

### 3.2 Which surface gets which id

The convention is **`<part testId>-surface`** when the animated box *is* the
part's box. A full-window veil keeps its existing `-backdrop` id.

| Component | Animated element | Authored id |
| --------- | ---------------- | ----------- |
| Collapsible | `Reveal`'s motion body | `` `${content testId}-surface` `` |
| Accordion | `Reveal`'s motion body | `` `${content testId}-surface` `` |
| Popover | panel motion wrapper | `` `${content testId}-surface` `` |
| Drawer | edge-surface motion wrapper | `` `${content testId}-surface` `` |
| Toast | card motion wrapper | `` `toast-${id}-surface` `` |
| Dialog | overlay fade wrapper | **none** — its box is the window, and `dialog-backdrop` already identifies it |

If the part has no `testId`, no derived id is authored (no unnamed `-surface`
node exists). Dialog and Drawer's veil wrappers adopt the typed wrapper but add
no new id.

### 3.3 Why not move the caller's identity onto the wrapper

For `Reveal`, the inner div is the content whose **natural height** is measured
while the animated box is clipped to `0`. Moving the caller's `testId` would
merge two different boxes and break the first-layout measurement (plan 372 §2).
The derived id is the honest split: `content` = the content box, `content-surface`
= the tween box.

## 4. Exact files

| File | Change |
| ---- | ------ |
| `packages/components/src/internal/motion.tsx` | **new** — `MotionSurface` and `MotionSurfaceProps` as above |
| `packages/components/src/internal/reveal.tsx` | import `MotionSurface`; replace `motion.div`; author `testId={rest.testId === undefined ? undefined : `${rest.testId}-surface`}`; update the header paragraph that says the wrapper has no `testId` |
| `packages/components/src/popover.tsx` | replace the panel `motion.div` with `MotionSurface`; author `${rest.testId}-surface`; drop the now-unused `motion` import only if `AnimatePresence`/`motion` is otherwise unused |
| `packages/components/src/drawer.tsx` | replace both `motion.div`s; veil unchanged (no id), edge surface `${testId}-surface` |
| `packages/components/src/dialog.tsx` | replace the fade `motion.div`; no new id |
| `packages/components/src/toast/viewport.tsx` | replace the card `motion.div`; author `toast-${toast.id}-surface` |
| `packages/components/src/behaviour/motion-surface.test.tsx` | **new** — the suite in §6 |
| `packages/components/docs/collapsible.mdx` | one sentence in Limitations/Verification: the tween box is `<content testId>-surface` |
| `packages/components/docs/accordion.mdx` | same sentence |
| `packages/components/docs/popover.mdx` | same sentence |
| `packages/components/docs/drawer.mdx` | same sentence |
| `packages/components/docs/toast.mdx` | same sentence (`toast-<id>-surface` names the exit-ghost box) |
| `docs/component-api.md` | new subsection under §3 (state-aware styling) or §1: "Animated surfaces" with the convention and the Dialog exception |
| `COMPONENTS.md` | one clause in each of the five rows (Collapsible, Accordion, Popover, Drawer, Toast) naming the derived id; no row's native-test count changes (the new suite is shared, not a component suite) |
| `TODO.md` | one new ticked hardening item under "Tier 2 hardening after the inventory closed" and the plan claim |
| `.agents/slop/plans/README.md` | index row for `597` |
| `PLAN.md` | append `597` to D30's overflow-number sentence |

Do **not** touch `apps/playground`, `packages/testing`, `packages/tokens`,
`packages/primitives` or any overlay behaviour. This plan adds identity; it
changes no dismissal, focus, layout or motion value.

## 5. Implementation steps

1. Add `internal/motion.tsx`. Run `nub run --filter @gpuixui/components check-types`
   and expect exit `0` **before** touching any consumer: if the declared types
   need a cast, STOP (§7.1).
2. `reveal.tsx`: compute `const surfaceTestId = rest.testId === undefined ? undefined : `${rest.testId}-surface`;`
   and pass it to `MotionSurface`. Keep the inner div, its `ref`, its style and
   its `hidden` visibility exactly as they are.
3. `toast/viewport.tsx`: `testId={`toast-${toast.id}-surface`}` on the wrapper.
   Keep `key={toast.id}`.
4. `popover.tsx` / `drawer.tsx`: derive from the part's `testId` prop (the
   content's), not from `rest` where the prop is already destructured.
5. `dialog.tsx`: wrapper only.
6. Run `nub run --filter @gpuixui/components test:behaviour -- src/behaviour/motion-surface.test.tsx`
   and expect the suite green (§6). Then run the five component suites named in
   the COMPONENTS row and expect their current counts unchanged:
   `collapsible` 16, `accordion` 23, `popover` 20, `drawer` 14, `toast` 20 —
   the four known plan-540 failures in those files stay red (2 tabs? none here;
   the focus-event cases are in other files). If a component suite gains or
   loses a pass that is not a plan-540 focus/position case, STOP and report.
7. Docs, inventory, TODO, plan index, PLAN.md.

## 6. Test plan

New file `src/behaviour/motion-surface.test.tsx` with a header comment stating
the bug: *before this, an animated surface had no id, so a native suite could
not measure the tween box or address the exit ghost.*

Cases (all in the real `TestRenderer`; each must be able to fail):

1. **Collapsible: the tween box is measurable.** Render a closed Collapsible
   with `testId="collapse-content"`; assert `collapse-content-surface` exists
   and its height is `0`; assert the inner `collapse-content` still has a
   positive natural height (mounted while clipped). Open it, `finishMotion(200)`;
   assert the surface height equals the content height (±1).
   *Fails without the id (`findByTestId` throws) and fails if the id lands on the
   inner div.*
2. **Accordion: the section body's tween box.** Same shape for one section.
3. **Popover: the panel's animated box is the panel's box.** Open by trigger;
   assert `popover-content-surface` and `popover-content` agree within ±1 px
   (`getElementBounds` padding-box vs content-box makes an exact equality
   brittle — see plan 540; compare width/height, not x/y).
4. **Drawer: the edge surface is addressable while open and gone after exit.**
   Open; assert `drawer-content-surface` exists; close; `finishMotion(300)`;
   assert it is gone.
5. **Toast: the exit ghost has its own id.** Push a toast; `finishMotion(500)`
   to settle the entry; assert `toast-1-surface` exists. Dismiss; assert the
   surface still exists while `toast-1` is painted (the exit), then
   `finishMotion(500)` and assert both are gone.
6. **Pin: no id, no derived surface.** A Popover content without `testId`
   renders no `popover-content-surface` (`findByTestId` is `undefined`).

Use `lightTheme` in at least one case so the suite is honest about a theme (the
shared suites are not part of the theme matrix; a light-theme mount costs one
line). Do not assert absolute x/y positions — plan 540 records three box
conventions in one build.

### Mutation proofs (run each, observe the exact failing case, revert)

- M1: delete the derived `testId` from `Reveal` → case 1 fails (and case 2).
- M2: author the derived id on the inner content div instead of the wrapper →
  case 1 fails on the `height === 0` assertion.
- M3: delete the toast wrapper id → case 5 fails.
- M4: delete the popover wrapper id → cases 3 and 6 pin the absence (case 3
  fails).
- M5: delete the drawer wrapper id → case 4 fails.

## 7. STOP conditions

1. `MotionSurfaceProps` needs `any`, `as`, or `@ts-expect-error` to compile —
   stop and report; the wrapper is only justified if it is type-honest.
2. The runtime does not expose the authored id on the animated node (the probe
   says it does; if a consumer disagrees, stop and record the platform fact).
3. Two elements share a derived id (`findByTestId` collision) — stop; choose a
   non-colliding suffix and record it.
4. A geometry assertion depends on `getElementBounds`' border/padding origin —
   stop and weaken it to width/height or presence, never tune it to the build.
5. Any overlay behaviour (dismiss, focus, Tab, motion duration) changes as a
   side effect — stop; this plan is identity-only.

## 8. Commands and expected results

```sh
cd workspaces/components
nub run --filter @gpuixui/components check-types        # exit 0
nub run --filter @gpuixui/components test:behaviour -- src/behaviour/motion-surface.test.tsx
# 6 passed
nub run --filter @gpuixui/components test               # 44 files, 444+ tests, exit 0
nub run check                                           # exit 0
nub run lint                                            # exit 0
nub run test                                            # exit 0
```

`nub run --filter @gpuixui/components test:behaviour` (full) stays at
**752 passing / 35 failing of 787** — the plan-540 binding failures are
pre-existing and out of scope. The new suite adds 6: expect **758 / 35 of 793**
(counts as of `HEAD` `a553d2d9`; re-read the actual totals rather than trusting
this line if a merge moved them).

## 9. Acceptance

- [ ] `MotionSurface` exists, is typed without a cast, and is used by all six
      animated surfaces.
- [ ] The derived ids in §3.2 resolve, and no id exists without a caller
      `testId`.
- [ ] The six new cases pass; each mutation proof was observed failing and
      reverted.
- [ ] The five component suites keep their existing counts; the 35 plan-540
      failures are unchanged.
- [ ] `docs/component-api.md`, the five component pages, `COMPONENTS.md`,
      `TODO.md`, the plan index and `PLAN.md` are synced.
- [ ] `check`, `lint` and `test` are green.

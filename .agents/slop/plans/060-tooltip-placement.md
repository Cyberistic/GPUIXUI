# 060 — Tooltip placement: the tip is anchored to the container, not the trigger

**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** 020 (capability map), 041 (Tier 1 runtime suite), 156 (floating
placement probe, playground).
**Status:** planned → execute this plan, then update the index.

---

## 0. The bug, measured

Our `Tooltip` is a themed wrapper over `@gpuix/react/tooltip` (PLAN.md D15). It
passed `side`/`align` through and relied on the runtime's own placement. Two
defects follow, both visible to a user and neither caught by the current suite:

### D1 — the tip anchors to the surrounding container, not the trigger

GPUix's `Tooltip` root is a block-level flex container
(`floatingRootStyle`: `display: "flex", position: "relative"`), and
`<anchored>` positions its layer against **that root**, not the trigger inside
it. In a column parent the root stretches to the parent's width; in a row parent
it stretches to the parent's height. The tooltip therefore opens at the edge or
centre of the surrounding layout.

Measured on this host against the locally built `@gpuix/native@0.10.0`
(ADR 0003), by a throwaway probe that mounted a raw GPUix Tooltip inside a
`900 × 300` `Box` wrapping a `400 × 18` trigger, then hovered the trigger:

| Parent axis | Root style | `align` | Target | Tip | Verdict |
| ----------- | ---------- | ------- | ------ | --- | ------- |
| column | default | `start` | `x 12 w 400` | `x 12 y 30` | left edge **coincides** with the trigger only because the trigger is the root's first child |
| column | default | `center` | `12..412` (centre 212) | `x 420..462` | aligned to the **900-wide container** (centre 462), not the trigger |
| column | default | `end` | `12..412` | `x 870..912` | container's right edge |
| column | `alignSelf: "flex-start"` | `start` | `12..412` | `x 12` | exact |
| column | `alignSelf: "flex-start"` | `end` | `12..412` | `x 370..412` | exact |
| row | default | `start` | `y 12..30` | `y 312` | opens below the **300-high row** |
| row | `alignSelf: "flex-start"` | `start` | `y 12..30` | `y 30` | exact (trigger bottom) |

`alignSelf: "flex-start"` is the cross-axis lever: it stops the root from
stretching on whichever axis is the parent's cross axis, so the root hugs the
trigger in both a column and a row. It is a style on the root the wrapper already
controls.

**Rejected:** `width: "fit-content"` is not a valid runtime dimension — the
runtime throws `Batch op 4 setStyle parse error: invalid dimension: fit-content`
at commit time. Do not emit it anywhere.

### D2 — the runtime's `align="center"` is off by half the panel

Plan 156 §8 measured it and this probe reproduced it against the trigger:
with a 42-wide tip on a trigger whose centre is 212, `center` paints
`170..212` — the panel's **end** sits on the anchor's centre line. `start` and
`end` are exact. GPUix's `TooltipContent` defaults to `"center"`, and our
wrapper passed `undefined`, so **every tooltip in the library inherited the
broken default**.

## 1. Decision

1. The wrapper always sets `alignSelf: "flex-start"` on the tooltip root
   (`tooltipRootStyle`), so the anchored layer's anchor rectangle is the
   trigger. This is the only honest fix until GPUix anchors to a named element.
2. The wrapper's default `align` is `"start"` — the measured-exact value. A
   consumer can still pass `center` (half-panel offset) or `end`.
3. Both facts are documented on the page and in `COMPONENTS.md`; the runtime
   tests assert the geometry, not the open/close only.

No new dependency, no upstream patch, no measurement pass, no second render.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Tooltip.tsx` | add `tooltipRootStyle` (`{ alignSelf: "flex-start" }`), pass it to `<GpuixTooltip style>`, default `align` to `"start"`, document both |
| `packages/primitives/src/components/Select.test.tsx` | the `Tooltip` describe gains the root-style and default-align assertions |
| `packages/primitives/runtime/fields.runtime.test.tsx` | three placement tests (default, `end`, row parent) |
| `packages/primitives/docs/tooltip.mdx` | API default, placement section, limitations, verification |
| `packages/primitives/README.md` | refresh the measured test count |
| `COMPONENTS.md` | Tooltip row: default `start`, root hug, runtime test count |
| `.agents/slop/plans/README.md` | index row for this plan |
| `TODO.md` | tick the task added under the primitives workstream |

## 3. Steps and exact commands

Every command runs from `/Users/cyberistic/GPUIXUI/workspaces/primitives`.

1. **Edit `Tooltip.tsx`.**

   ```tsx
   /**
    * The tooltip root hugs its trigger.
    *
    * `<anchored>` positions against this root, and a block-level flex root
    * stretches on its parent's cross axis — so without this the tip opens at
    * the container's edge (measured: plan 060 §0).
    */
   export const tooltipRootStyle: StyleDesc = { alignSelf: "flex-start" };
   ```

   In `renderTooltip`, destructure `align = "start"` and render
   `<GpuixTooltip delayDuration={delay} style={tooltipRootStyle}>`. Update the
   `align` JSDoc: `"start"` is the default because the runtime's `"center"` is
   off by half the panel.

2. **Offline tests** in the `describe("Tooltip")` block of
   `src/components/Select.test.tsx`:

   - `renderTooltip({ content: "A hint", children: null }, testTheme)` →
     `elementProp(tree, "style")` is `{ alignSelf: "flex-start" }`.
   - the `TooltipContent` child's `align` prop is `"start"` when the caller
     passes none, and the caller's `"end"` when given one (use
     `elementChildren` and `elementProp`).

   Run: `nub run --filter @gpuixui/primitives test`
   Expect: all offline tests pass; the count rises from 303.

3. **Runtime tests** appended to `runtime/fields.runtime.test.tsx` (the tooltip
   block already lives there):

   - *`opens the Tooltip at the trigger's edge, not the container's*` — mount a
     `Box` (column, `width: 900`) holding a 400-wide trigger; hover; assert
     `tip.x ≈ target.x` (within 1px) and `tip.y === target.y + target.height`.
   - *`honours align="end" against the trigger`* — same tree, `align="end"`;
     assert `tip.x + tip.width ≈ target.x + target.width`.
   - *`opens below the trigger inside a row container`* — row `Box`
     (`height: 300`), `side="bottom"`; assert
     `tip.y === target.y + target.height` (not the row's bottom).

   Run: `nub run --filter @gpuixui/primitives test:runtime`
   Expect: 14 files, all passing; the test count rises from 134.

4. **Two-direction proof.** Delete `style={tooltipRootStyle}` from the render,
   re-run the runtime suite, and record the failure output in §6 of this plan
   (expected: the `end` case measures the container's right edge, the row case
   `y 312`). Restore it. Then set `align = "center"` as the default, re-run, and
   record that the default test fails. Restore `"start"`. Both runs must fail
   for the fix to be considered guarded. If either does not fail, the test is
   not guarding the bug — fix the test, not the plan.

5. **Docs.** In `tooltip.mdx`:
   - API table `align` row: default `"start"`, with the measured note that
     `"center"` places the panel's end on the anchor's centre line and `"end"`
     is exact;
   - a short **Placement** paragraph: the wrapper hugs the trigger, so the
     anchor is the trigger, not the layout container; near a window edge the
     runtime snaps without flipping (plan 156), so a bottom-side tip may cover
     its trigger;
   - Limitations and Verification sections list the three runtime tests.

6. **Counts and inventory.** Refresh `packages/primitives/README.md`'s measured
   runtime figure, and replace the Tooltip row's placement sentence in
   `COMPONENTS.md` with the measured result and the new default.

7. **Index and TODO.** Add a row to `.agents/slop/plans/README.md` and tick the
   new task under `TODO.md` → "Primitives workstream".

8. **Gates.**

   ```sh
   nub run check
   nub run lint
   nub run test
   nub run --filter @gpuixui/primitives test:runtime
   ```

   Expect: all exit `0`; `check` reports every test asserts something.

## 4. Acceptance

- `Tooltip`'s default alignment is start-exact on the trigger, in both a column
  and a row parent, measured in the real runtime.
- `align="end"` is exact against the trigger; `center` is documented as the
  runtime's half-panel defect.
- Three runtime tests and two offline tests exist, each demonstrated to fail
  when its guard is removed.
- `tooltip.mdx`, `COMPONENTS.md`, the package README and the plan index agree
  with the code.
- `nub run check`, `nub run lint`, `nub run test`, `test:runtime` green.

## 5. STOP conditions

Stop and report (do not improvise) if:

- `alignSelf: "flex-start"` does not move the tip in either parent axis — GPUix
  may reject it like `fit-content`. Then the alternative is to document the
  container-anchoring defect and ship no default change; record the measurement.
- Hovering the trigger stops opening the tooltip after the root style change
  (the trigger's hit test moved). The runtime event model is then not what plan
  041 §9 measured; stop and capture the failing frame.
- Any existing runtime test changes for a reason other than the ones above.
- The offline element tree cannot expose the root `style`/`align` props — use
  the runtime suite alone and record why in §6.

## 6. Outcome (executed on this host, 2026-10-17)

**Both directions proven, then restored green.**

| Guard removed | Failing test | Measured failure |
| ------------- | ------------ | ---------------- |
| `style={tooltipRootStyle}` on `<GpuixTooltip>` | `honours align=end against the trigger rather than the container` | `expected 500 to be less than or equal to 1` — the tip's right edge sat at the 900-wide container's right edge (`912`) instead of the trigger's (`412`) |
| same | `opens below the trigger inside a row container` | `expected 312 to be 30` — the tip opened below the 300-high row, not the trigger |
| `align = "center"` as the default | `opens the Tooltip at the trigger's edge, not the container's` | `expected 152.5 to be less than or equal to 1` — the tip's end sat on the trigger's centre line |

Restored: `nub run --filter @gpuixui/primitives test:runtime` → **14 files, 137
tests, all passing** (134 before). `nub run --filter @gpuixui/primitives test`
→ **305 offline tests** (303 before; two new element-tree assertions).

Nothing differed from the plan. `width: "fit-content"` was confirmed invalid at
commit time (`Batch op 4 setStyle parse error: invalid dimension: fit-content`)
and is not used. `alignSelf: "flex-start"` was accepted and moved the tip in
both parent axes, so the STOP condition about the lever not working did not
apply.

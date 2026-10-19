# 587 — `Text`'s shrink floor and `Grid`'s `max-content` track

**Phase:** F (integration and truth)
**Owner:** primitives
**Depends on:** 030, 041, 047, 050, 376, 383, 585
**Status:** done — measured, implemented and guarded

---

## 1. The bug

Plan `383` made a text run shrink to the width it is given
(`textStyle` sets `minWidth: 0`) so a sentence in a bounded flex row wraps
instead of painting past its row. Plan `376` made `Grid columnMin="max-content"`
size a track to its cell's content. The two rules meet badly on the **published
0.10.0 runtime**:

Measured on this host, 2026-10-19, against the store artifact
(`gpuix-node .store/@gpuix+native@0.10.0/.../gpuix-native.darwin-x64.node`,
the release-tag build of plan `529`), a two-column `Grid columnMin="max-content"`
whose cells are `Box`es containing `Text`:

| Cell content | Painted cell width |
| ------------ | ------------------ |
| `Text "Name"` | **0** |
| `Text "A very long value…"` | **0** |
| `Box style={{ width: 40 }}` | 40 |
| `Button "Short"` | 68 |

So `max-content` measures a cell's explicit or intrinsic width, and a `Text`
with `minWidth: 0` contributes **zero**. The runtime uses the child's minimum
width as the track's content size when that minimum is definite: `minWidth: 1`
paints a **1 px** cell, `minWidth: 0` a 0 px cell, and `minWidth: "auto"` (or no
`minWidth`) the real content width — measured `33` and `235` for the two strings
above. The cell is not merely clipped; the column does not exist.

The docs' own `Grid` page shows exactly the broken shape (`docs/grid.mdx` §2:
six bare `Text` cells in a max-content grid, "a label/value inspector with a
narrow label column"), so a consumer who copies the documented example gets an
inspector with invisible columns. The runtime test that guards plan `376`,
`sizes a grid's columns to their content with columnMin`, fails on this artifact
for the same reason — it is the only geometry failure in the live suite that is
**our regression**, not the artifact's box model (plan `529` §6.5).

## 2. The decision

`Text` keeps the shrink floor **by default** — a bounded row is the common and
severe case, and plan `383`'s runtime guard must keep passing. It gains one
explicit seam for the other case:

- `Text.shrink?: boolean`, default `true`. `textStyle` emits `minWidth: 0` when
  true and `minWidth: "auto"` when false. A caller whose cell must be measured
  by a content-sized track sets `shrink={false}`.
- `Grid` cannot set a child's style, and a context provider would add a second
  layout rule to every `Text` (and a provider element to the decoded trees for a
  niche case), so the seam is a prop with a documented consequence.

`minWidth: "auto"` is a real `StyleDesc` value (accepted, measured `33/235`);
`"max-content"` is **not** (the runtime throws `invalid dimension: max-content`)
and must never be documented as an option.

The docs change with the code:

- `docs/text.mdx` — API row and the containment paragraph: the default floor,
  the escape hatch, and why a content-sized grid needs it.
- `docs/grid.mdx` — the inspector example passes `shrink={false}` on every
  cell; the prose names the rule and the measured failure; Limitations records
  the interaction and the `120px`-track workaround.

## 3. Exact changes

1. `packages/primitives/src/core/style.ts`
   - `TextSpec` gains `readonly shrink?: boolean`.
   - In `textStyle`, replace `minWidth: 0` with
     `minWidth: spec.shrink === false ? "auto" : 0` and extend the comment:
     the default is plan `383`; a content-sized track cannot measure a 0 floor
     (plan `587`).
   - `StyleDesc.minWidth` accepts a string already (`"100%"` is used elsewhere);
     do not add a cast.
2. `packages/primitives/src/components/Text.tsx`
   - `TextProps` gains `readonly shrink?: boolean` with a TSDoc summary and the
     coordinate note; include `shrink` in the `spec` object passed to
     `textStyle`.
3. `packages/primitives/src/core/style.test.ts`
   - A case: the default `textStyle({ role: "body" }, theme).minWidth` is `0`;
     `shrink: false` is `"auto"`.
4. `packages/primitives/src/components/presentational.test.tsx`
   - A case: `renderText({ children: "Name", shrink: false }, theme)` carries
     `minWidth: "auto"` on the host `<text>`; the default carries `0`.
5. `packages/primitives/runtime/layout.runtime.test.tsx`
   - In `sizes a grid's columns to their content with columnMin`, pass
     `shrink={false}` on both `Text` cells. Keep the `33 / 235`-style
     assertions (`label.width < value.width`, adjacency, hug under 600).
   - Add one case, `a max-content track measures a cell only when the run may
     not shrink`, mounting both a default `Text` and a `shrink={false}` `Text`
     in the same max-content grid: the default cell is 0 wide, the explicit one
     is content-wide. Name the first as the documented limitation so a future
     change has to touch the test on purpose.
6. `packages/primitives/docs/text.mdx` — API row `shrink` and the paragraph
   above; Theming mentions the resolved value; Limitations gains the grid note.
7. `packages/primitives/docs/grid.mdx` — §2 example + prose, Limitations,
   Verification (the new runtime case and the `shrink={false}` rule).
8. `COMPONENTS.md`
   - `Text / typography` row: the shrink seam and its default.
   - `Stack / layout primitives` row: the `columnMin` interaction and the
     measured 0-width failure.
9. `TODO.md` — one new row in the primitives section, ticked, recording the
   plan, the measured numbers and the update to the live-suite note at the
   "full live suite" row (this failure was ours, not the artifact's).
10. `PLAN.md` — decision `D45`: a text run shrinks by default; a content-sized
    grid cell opts out through `Text.shrink={false}`; `minWidth: "auto"` is the
    only accepted content floor (`"max-content"` crashes the runtime).
11. `.agents/slop/plans/README.md` — index this plan.

## 4. Commands and expected results

```sh
cd packages/primitives
nub exec vitest run src/core/style.test.ts src/components/presentational.test.tsx
# exit 0; the two new cases pass

nub exec vitest run --config vitest.runtime.config.ts runtime/layout.runtime.test.tsx
# exit 0; the grid cases pass, including the new both-directions case

nub run --filter @gpuixui/primitives test
# exit 0; every offline suite

nub run --filter @gpuixui/primitives check-types
# exit 0
```

Two-direction proof before the fix is kept: revert
`minWidth: spec.shrink === false ? "auto" : 0` to `minWidth: 0` and the
`shrink={false}` runtime case must fail with a 0-wide cell; then remove
`minWidth` altogether and the plan-`383` row case in
`runtime/text.runtime.test.tsx` must fail (the run paints past its row).
Record both outcomes in this plan's §5.

## 5. Results

Implemented 2026-10-19.

- `textStyle` now resolves `minWidth: 0` by default and `"auto"` for
  `shrink: false`; `TextProps.shrink` carries the same contract. `minWidth:
  "max-content"` was measured as a hard runtime error (`invalid dimension:
  max-content`), so the docs name only the two accepted forms.
- Measured on the release-tag artifact: a `max-content` grid cell paints
  `0 / 0` with the default and `33 / 235` with `shrink={false}`.
- Offline: `src/core/style.test.ts` and
  `src/components/presentational.test.tsx` gained one case each; the package is
  **788 passed** (was 786).
- Runtime: `runtime/layout.runtime.test.tsx -t grid` is green — two existing
  grid cases plus the new `measures a grid cell's content only when the run may
  not shrink`.
- Directions proven: reverting the conditional to `minWidth: 0` fails the two
  content-sizing grid cases; removing `minWidth` entirely fails
  `runtime/text-overflow.runtime.test.tsx` (the run paints `439` px in the
  220 px row). Both were restored before the final runs.

## 6. STOP conditions

- `minWidth: "auto"` is rejected by the runtime or a static type — STOP; the
  problem is a runtime capability and the plan returns to `Text.shrink` as a
  documented, unhonoured prop only after re-measuring. Do not cast.
- The default `minWidth: 0` row guard (plan `383`) stops passing — STOP; do not
  change that test or its contract to make the grid case pass.
- The live suite's other geometry failures are **not** part of this plan; they
  are plan `529`'s box-model class and must not be re-baselined here.

## 7. Acceptance

- `Text.shrink` is typed, documented on both pages, and resolved in
  `textStyle`; the default keeps plan `383` green.
- The Grid page's example works on the published runtime; no page recommends a
  bare `Text` in a max-content track without `shrink={false}`.
- The grid runtime cases prove both directions (default 0, explicit content).
- `nub run check`, `nub run lint` and the package's `test` are green; the
  scoped runtime file is green.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index record the decision
  and the measured evidence.

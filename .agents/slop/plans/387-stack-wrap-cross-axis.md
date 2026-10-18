# 387 — a wrapping `Stack` stretches its line boxes

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | C/F (Tier 1 layout truth) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `376`, `381`, `382`, `383` |
| Evidence | playground plan `341` §2 (`layout-grid`, measured on the 0.10.0 binding) |

## 1. The bug

The playground's `layout-grid` probe measured a fixed-height wrapping row: its
flex lines are stretched to fill the container, so the **second line starts at
the container's midpoint** instead of directly under the first line.

Measured (plan `341` §2), a 200 px-high row of 30 px children with the theme's
gap:

| Child | Painted `y` (relative to the row) |
| ----- | --------------------------------- |
| line 1 | `0` |
| line 2 (third child) | **`104`** — should be `38` (`30 + 8` gap) |

CSS's initial `align-content` for a multi-line flex container is `stretch`, and
GPUix 0.10.0 implements it. The probe also measured that setting
`alignContent: "flex-start"` on the same row puts the third child at `38`.
`StyleDesc.alignContent?: string` is published in 0.10.0's `host.d.ts`.

Our `stackStyle` sets `flexWrap: "wrap"` and nothing else, so it inherits the
stretch: every consumer that wraps chips/tags in a bounded row gets invisible
vertical space between its lines. The auto-height case is unaffected (there is
no leftover cross-axis space to distribute), which is why the existing layout
runtime case never caught it.

## 2. The fix

One rule in `packages/primitives/src/core/layout.ts`:

```ts
if (spec.wrap === true) {
  style.flexWrap = "wrap";
  // A wrapped stack packs its lines at the cross-axis start. The runtime's
  // default `align-content: stretch` spreads a bounded row's leftover height
  // between its lines (measured, plan 341 §2), so the second line floats to
  // the middle of the box.
  style.alignContent = "flex-start";
}
```

Why unconditional on `wrap` rather than a new prop: there is no useful case for
stretched line boxes in this library (a bounded wrapping row is a chip cloud or
a toolbar, both of which pack from the start), and an automatic content floor
would be the same class of silent behaviour D40 rejects for controls. A consumer
that truly wants stretch can pass `style={{ alignContent: "stretch" }}` — the
caller's style is merged last.

No other file changes behaviour:
- `alignContent` only applies when there is more than one line, so a
  non-wrapping `Stack` is byte-identical.
- A `column` with `wrap` packs its columns at the start instead of stretching
  them across the width — the same rule on the other axis, documented.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/layout.ts` | `stackStyle`: set `alignContent: "flex-start"` when `wrap` is true |
| `packages/primitives/src/core/layout.test.ts` | extend the existing "grows, fills and wraps only when asked" case: a plain stack has no `alignContent`; a wrapping one resolves `"flex-start"` |
| `packages/primitives/runtime/stack-wrap.runtime.test.tsx` | **new**: measure a bounded wrapping row in the real renderer (line 2 at `30 + gap`, not the midpoint), an auto-height row unchanged, and a wrapped column packing at the start |
| `packages/primitives/docs/stack.mdx` | `wrap` row in the API table, plus a Limitations/short note: lines pack at the cross-axis start; `style.alignContent` can override |
| `COMPONENTS.md` | `Stack / layout primitives` row: append the measured wrap rule and the plan number |
| `TODO.md` | tick the row "a wrapping Stack stretched its line boxes" (recorded from the playground hand-off, plan `341` §2) |
| `.agents/slop/plans/README.md` | index this plan under `primitives`, `icons` and Tier 1 |

No change to `Box`, `Grid` or any component.

## 4. Commands and expected results

Run from the worktree root unless a workdir is named.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test` | all offline files pass (677 tests — the resolver case was extended, not duplicated) |
| `cd packages/primitives && nub exec vitest run --config vitest.runtime.config.ts runtime/stack-wrap.runtime.test.tsx` | **before the fix**: the bounded-row case fails with the third child at the stretched line start (`104`); **after**: all cases pass |
| `cd packages/primitives && nub exec vitest run --config vitest.runtime.config.ts runtime/layout.runtime.test.tsx` | the existing layout cases stay green (the fix only adds a property to wrapping stacks) |
| `nub run --filter @gpuixui/primitives check-types` | exit `0` |
| `nub run check` | exit `0` (the package's offline guards: docs, exports, contract, examples) |

The full `test:runtime` suite is **not** required for this slice. The host's
shared binding was rebuilt from a moving `references/gpuix` main on 2026-10-18
and degrades focus/window-dependent files (TODO.md row "the full live suite is
not green on this host"); the relative measurement this plan adds is the robust
shape, and the scoped file is the acceptance run.

## 5. STOP conditions

Stop and report if any of these is true:

1. `StyleDesc` in the installed `@gpuix/react` 0.10.0 has no `alignContent`
   (it does today: `host.d.ts:66`). Do not add a cast or an untyped style.
2. The runtime paints the third child at `38` **before** the fix — the measured
   playground evidence does not reproduce here. Record the measurement and ask
   before changing anything; do not re-baseline the assertion to match.
3. The scoped runtime file cannot open a window (missing binding). Record the
   exact error, leave the code + offline test landed only if they are green, and
   mark the runtime half unverified in the plan. Do not claim a native pass.
4. The fix changes a non-wrapping stack's paint. Revert and re-read §2.

## 6. Test plan (what must be able to fail)

**Offline (`src/core/layout.test.ts`)**
- A plain stack resolves no `alignContent`.
- A wrapping stack resolves `alignContent: "flex-start"`.
- `flexWrap` stays `"wrap"`.
- Both fail against the old resolver (missing property), so the test is not
  tautological.

**Runtime (`runtime/stack-wrap.runtime.test.tsx`)** — all assertions are
relative to the stack's own painted box, never absolute window coordinates:
1. **Fixed-height wrapping row**: `Stack direction="row" wrap gap="sm"` with
   `style={{ height: 200, width: 100 }}`, three `Box` children `40 × 30`.
   Expect child 3's `y − stack.y` to equal `30 + theme.spacing.sm` (the second
   line starts under the first). Old direction: `104`.
2. **Auto-height wrapping row**: same children with no height. The row's height
   must still be the two lines plus one gap, and child 3 at the same offset —
   proves the fix did not introduce a height.
3. **Wrapped column**: two `Box` children `60 × 20` in a
   `direction="column" wrap` stack with `style={{ height: 20, width: 200 }}`
   and a gap; the second column starts at `x = 60 + gap`, not half the width.
   This is the same rule on the cross axis.
4. **Caller override**: a wrapping row with
   `style={{ alignContent: "stretch" }}` keeps the runtime's stretched lines
   (the caller wins last, plan `097`). Optional if it makes the file brittle;
   the style-order suite already owns the merge rule.

Every case states the old measurement in its header comment, per AGENTS §3.

## 7. Acceptance

- The resolver test fails on the old `stackStyle` and passes on the new one.
- The bounded-row runtime case fails without the fix (`104`) and passes with it
  (`38`), measured in this worktree's real `TestRenderer`.
- `docs/stack.mdx` states the wrap rule; the inventory row records it.
- `nub run --filter @gpuixui/primitives test`, `check-types` and `nub run check`
  are green; the scoped runtime file is green.
- The plan index and `TODO.md` are updated; changes are committed on
  `agent/primitives` and pushed.

## 8. Results (2026-10-18, darwin-x64)

**Reproduced, then fixed.** The new runtime file measured the old direction on
this worktree's `TestRenderer` before the resolver changed:

| Case | Old `stackStyle` | After the fix |
| ---- | ---------------- | ------------- |
| bounded row, third child's `y − stack.y` | **103** | **36** (`30 + sm 6`) |
| wrapped column, second child's `x − stack.x` | **103** | **66** (`60 + sm 6`) |
| auto-height row, third child's `y − stack.y` | 36 | 36 (unchanged) |

**Runs**

| Command | Result |
| ------- | ------ |
| `nub exec vitest run --config vitest.runtime.config.ts runtime/stack-wrap.runtime.test.tsx` | **3 passed** (`exit 0`); the same file reported 2 failed / 1 passed before the fix |
| `nub run --filter @gpuixui/primitives test` | **46 files / 677 tests passed** |
| `nub run --filter @gpuixui/primitives check-types` | `tsc --noEmit` clean |
| `nub run --filter @gpuixui/icons test` | **4 files / 24 tests passed** |
| `nub run check` | exit `0` (check-tests, lint, format, all workspace types) |

**The existing `runtime/layout.runtime.test.tsx` file** still reports 4 failures
on this host — surface padding `0` instead of `12`, a `columnMin` zero-width
case, a `Spacer` endpoint `1268` instead of `1280`, and the labelled
`ScrollArea` keyboard case. They are the known shared-binding degradation
recorded in `TODO.md` (the current artifact was rebuilt from a moving
`references/gpuix` main); none involves `wrap`, and the new file uses only
relative measurements, which is why it is the acceptance run for this slice.

The docs, inventory row and `TODO.md` were updated; the fix is one resolver rule
plus the test/example surface, no component code.


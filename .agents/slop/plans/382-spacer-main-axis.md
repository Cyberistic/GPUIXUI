# 382 — A fixed `Spacer` inflates its row's height

| Field | Value |
| ----- | ----- |
| Phase | F (layout polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `097`, `381` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision, §2 the rule,
§3 the files, §4 the commands, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan (measured 2026-10-18)

`Spacer`'s fixed form sets **both** axes:

```ts
{
  flexShrink: 0,
  flexGrow: 0,
  width: theme.spacing[size],
  height: theme.spacing[size],
}
```

`docs/spacer.mdx` presents the square as intentional: "A fixed spacer sets both
width and height to the step, so it works in a row or a column without a
direction prop." The price is invisible structure: a flex item's cross size
contributes to the line's cross size, so a horizontal gap taller than the text
around it makes the whole row taller.

Measured on this host with the real `TestRenderer`, a caption row (the theme's
caption line is `16`) containing `<Spacer size="4xl" />` (the `4xl` step is `48`):

| Element | Box | Result |
| ------- | --- | ------ |
| row | `h 48` | **32 px taller than its text** |
| spacer | `48 × 48` | a square, not a gap |
| next caption | `x` after 48 px, `y` level with the first | the gap *is* horizontal |

So a spacer used as horizontal breathing room also dictates the toolbar's height.
This is the cross-axis class plan `381` just fixed for `Separator`: a
layout-only element must not invent size on the axis it is not spacing.

A `div` with `flexBasis: 48` and no `width`/`height` was measured in the same
scene: the row gap is `48` wide, the **row stays `18` high** (the text's line),
and the spacer's cross size stretches to the line without changing it. The
runtime honours `flexBasis` as the main size in both a row and a column
(column `dy` measured `48`).

## 1. The decision

**A fixed spacer occupies the parent's main axis only**, through `flexBasis`:

```ts
{ flexGrow: 0, flexShrink: 0, flexBasis: theme.spacing[size] }
```

- `flexBasis` *is* the main-axis size in CSS flexbox, so the "works in a row or a
  column without a direction prop" property is kept — it was never the square
  that made it direction-agnostic.
- The cross axis is left auto, so it stretches to the line (invisible) and cannot
  make the line taller or wider than its content.
- The flexible form (`flexGrow: 1, flexBasis: 0`) is unchanged.

**The caller's main-axis override is `flexBasis`.** A flex item's main size is
decided by `flex-basis` when it is not `auto`, so `style={{ width: 120 }}` on a
spacer inside a row would merge but not move anything. The page states that;
`style={{ flexBasis: 120 }}` works and the caller's style is still merged last.
This is an honest consequence of the element being a flex filler — the same way
a `flexGrow` cannot be overridden by `height`.

## 2. Why this is not `width` + `height` + `alignSelf`

`alignSelf` cannot fix it: a flex line's cross size is the largest item's outer
cross size, even when that item is aligned to the start. The square has to stop
being square. `flexBasis` is the only property that means "the main-axis size,
whichever axis that is" — a second implementation with a direction prop would
re-introduce the API the component deliberately does not have.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Separator.tsx` | `renderSpacer`'s fixed branch uses `flexBasis` instead of `width`/`height` |
| `packages/primitives/src/components/presentational.test.tsx` | the fixed form asserts `flexBasis`; no width/height |
| `packages/primitives/runtime/spacer.runtime.test.tsx` | new suite: row gap without row inflation, column gap, caller `flexBasis` override |
| `packages/primitives/docs/spacer.mdx` | the square paragraph is replaced with the main-axis rule; API table, theming, limitations, verification |
| `COMPONENTS.md` | the Spacers row records the measurement and the fix |
| `TODO.md` | add and tick the task; primitives count `126/126` → `127/127` |
| `.agents/slop/plans/README.md` | index this plan after `381` |

No public API changes: `size` and `style` keep their meaning.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nub run test                                            # 46 files, 671 tests, green (the spacer case already existed; its assertions changed)
nub run check-types                                     # no output
nub run test:runtime runtime/spacer.runtime.test.tsx     # green (scoped: this is the evidence)
nub run test:runtime runtime/layout.runtime.test.tsx     # 28 passed (the flexible filler is unchanged)
```

From the repo root:

```sh
nub run check    # green
nub run lint     # green
nub run test     # green
```

The full live suite needs a fresh session on this host (plan `379` §6 records the
window-accumulation degradation); the scoped files above are this change's live
evidence. Re-run the full suite before merging.

## 5. Test plan and the two-direction proof

**Element tree** (`src/components/presentational.test.tsx`): `renderSpacer` with
`size: "lg"` resolves `flexBasis` to `spacing.lg`, `flexGrow`/`flexShrink` to `0`
and paints no `width`/`height`. The flexible form keeps `flexGrow: 1` and
`flexBasis: 0`. Fails by missing property without the fix.

**Runtime** (`runtime/spacer.runtime.test.tsx`):

1. **Row** — a caption row with `<Spacer size="4xl" />`: the next caption starts
   exactly `48` px later, and the row's height equals the caption's line height
   (`16`), not `48`.
2. **Column** — the same spacer between two captions: the second caption starts
   `48` px lower.
3. **Caller override** — `style={{ flexBasis: 40 }}` in a row moves the sibling
   by `40`, not by the theme step.
4. **No square** — the row's height is the caption line (not the step), and the
   spacer's painted width is exactly the step; its cross size is whatever the
   row's `align` gives an empty box (zero when centred, the line when stretched)
   and never the step.

Failure directions to run before marking done:

| Mutation | Expected failure |
| -------- | ---------------- |
| the old `width`/`height` restored | runtime 1: `expected 48 to be 16` on the row height; element case: `flexBasis` is `None` |
| `flexBasis` removed but `flexGrow`/`flexShrink` kept | runtime 1: the sibling does not move (`expected 16 to be 48` style delta) |
| `flexGrow: 1` left on the fixed form | runtime 1: the gap fills the row (`dx` far more than `48`) |

## 6. STOP conditions

- **`flexBasis` does not move the sibling in a column.** The runtime is treating
  it as a row-only property; stop and report rather than adding a direction prop
  to the component.
- **The row's height changes for the flexible filler.** The two forms are
  diverging; stop — the flexible form must stay `flexGrow: 1, flexBasis: 0`.
- **A caller's `flexBasis` in `style` does not win.** `mergeStyle` order is
  broken; stop and fix the merge, not the test.

## 7. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 671 tests**, green (no new case: the existing spacer case now asserts `flexBasis` and the absent square) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| `nub run --filter @gpuixui/primitives test:runtime runtime/spacer.runtime.test.tsx` | **4 passed** (scoped) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/layout.runtime.test.tsx -t "Separator"` | **2 passed**, 26 skipped |
| `nub run --filter @gpuixui/primitives test:runtime runtime/layout.runtime.test.tsx` | **3 failed / 25 passed** in the shared session — the surface's own padding, the flexible `Spacer` case and the labelled-area focus case; see below |
| `nub run check` | green |
| `nub run lint` | green |
| `nub run test` | green |

Before → after, in the caption row of §0:

| Measurement | Before | After |
| ----------- | ------ | ----- |
| row height | `48` | `16` |
| spacer box (centred row) | `48 × 48` | `48 × 0` — no cross size of its own; a default-stretch row gives it the line height |
| sibling offset | `48` | `48` |
| column `dy` | `48` | `48` |

Mutation outcomes:

| Mutation | Observed failure |
| -------- | ---------------- |
| the old `width` + `height` restored | `runtime/spacer.runtime.test.tsx`: **1 failed** — "separates a row by the step without making it taller than its text" (`expected 48 to be 16`, the row height); `presentational.test.tsx`: **1 failed** — the fixed form has `flexBasis` `None` |
| `flexBasis` dropped (`flexGrow: 0, flexShrink: 0` only) | the same file: **2 failed** — the row and the column case (`expected +0 to be 48`) |

The three `layout.runtime` failures are host state, not this change. The file
passed **28/28** earlier in the session; now `getElementBounds` reports the
fixture's own `Surface` at `x 12, y 12` with the window's full width, so its
children paint at `12` instead of `24` and the frame-relative assertions no
longer describe the window. A probe of the same tree with this change stashed
(the `Separator` source restored to `HEAD`) reports the identical `Surface`
box, and the failing `Spacer` case uses the **flexible** form whose resolver is
unchanged (`flexGrow: 1, flexBasis: 0`). The new spacer cases are relative and
pass in the same session. Re-run the full file from a fresh session before
merging (plan `379` §6).

## 8. Acceptance

1. `<Spacer size="4xl" />` in a caption row separates the siblings by `48` and
   leaves the row `16` high.
2. A column gap is still `48`.
3. A caller's `flexBasis` wins; the flexible form is unchanged.
4. The element and runtime guards fail when the square returns.
5. `docs/spacer.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index record the
   change.
6. Every package and repo gate is green (the scoped live cases here; the full
   live suite before merge).

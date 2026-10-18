# 384 — A `Skeleton` in a row paints outside it

| Field | Value |
| ----- | ----- |
| Phase | F (containment polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `330`, `348`, `349`, `361`, `368`, `371`, `383` |
| Status | done |

Self-contained: §0 the measured starting point, §1 the decision, §2 the rule,
§3 the files, §4 the commands, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 the outcome, §8 acceptance.

---

## 0. What is true before this plan (measured 2026-10-18)

`Skeleton` resolves its box in `core/loading.ts`'s `skeletonStyle`: `width`
defaults to `"100%"` (or the height when `circle`), the height defaults to one
body line, and the element is `flexShrink: 0` so a placeholder is never squashed
(plan `330`).

In a **column** that is right: `100%` fills the column's width and the fixed
height holds. In a **row** the same `100%` is the whole parent's width, and
`flexShrink: 0` refuses to give any of it back to a sibling. Measured with the
real `TestRenderer` on this host, a 220 px row with a 40 px circle avatar and a
default skeleton line (`gap="sm"` = 6):

| Element | Box | Result |
| ------- | --- | ------ |
| row | `x 12…232` | the bounded parent |
| avatar | `x 12…52`, `w 40` | correct |
| line | `x 58…278`, `w 220` | **46 px past the row**, the full parent width |

The same scene with the lines column left at its auto width (the standard
avatar + two-line placeholder) is worse: the column has no width of its own in a
row, so each `100%` line resolves against `0`.

| Element | Box |
| ------- | --- |
| avatar | `x 12…52`, `w 40` |
| lines column | `x 58`, `w 0` |
| both line skeletons | `w 0`, invisible |

This is the class D40/plan `383` fixed for controls and `Text`: a flex item that
does not contain itself. `Skeleton` was never placed in a row by any suite — its
three tests are opacity and geometry in isolation.

## 1. The decision

**A percentage (or default) skeleton width may shrink; a numeric width may not.
A skeleton's height is a floor and never shrinks.**

`skeletonStyle` becomes:

```ts
const numeric = typeof width === "number";
return {
  width,
  height,
  minHeight: height,
  flexShrink: numeric ? 0 : 1,
  // …
};
```

- A default or percentage width is a **share of the space offered**. In a row
  the item's basis is the parent width and the free-space deficit is what the
  sibling needs; `flexShrink: 1` hands it back and the line lands inside the row
  (measured after: `w 174`, `x 58…232`).
- A numeric width is a size the caller asked for, and a circle takes its height
  as its width. Those keep `flexShrink: 0`, so an avatar is never squashed.
- `minHeight` makes the height axis immune: a skeleton may give up width in a
  row, but a bounded, over-full column must not squash the placeholder to a
  different shape. Measured: without it, three 18 px skeletons in a 40 px column
  painted `13.5 / 13 / 13.5`; with it, `18 / 18 / 18` (the same as before).
- In a column the change is inert: width is the cross axis, and the height floor
  preserves the old main-axis behaviour exactly.

The alternative — documenting "give every line an explicit pixel width in a
row" — was rejected: the standard skeleton composition is an avatar beside
text-shaped lines, and a placeholder whose default is unusable there is the
defect, not the caller's layout.

## 2. Why the fix is in `skeletonStyle`

`skeletonStyle` is the one resolver for the placeholder's box. A component-level
fix would leave `renderSkeleton`, the presentational tests and every future
consumer of the resolver on the old geometry; the two behaviours (a block in a
column, a line in a row) must be decided in the same place.

The nested auto-width column remains a flex fact, not a skeleton bug: a column
in a row has no width unless it is told to take one. The docs will show
`grow` on that column; the plan does not invent an automatic width.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/loading.ts` | `skeletonStyle`: `minHeight: height`; `flexShrink` is `0` for a numeric width, `1` for a percentage/default width, with the measured reason |
| `packages/primitives/src/core/loading.test.ts` | the box rule: default and percentage shrink, numeric and circle do not, the height is the `minHeight` floor |
| `packages/primitives/runtime/skeleton-containment.runtime.test.tsx` | new suite: the avatar + line row stays inside (plan §0's scene), an over-full column keeps every height, and a lone default skeleton still fills its row |
| `packages/primitives/docs/skeleton.mdx` | an avatar + text-lines composition, the width/height consequences in the API table, and the `grow` rule for a nested column |
| `packages/primitives/examples/feedback.example.tsx` | the loading card gains the standard avatar + two-line customer row, so the fixed composition is mounted by `runtime/examples.runtime.test.tsx` |
| `COMPONENTS.md` | the Skeletons row records the measurement and the fix |
| `TODO.md` | add and tick the task; the primitives count `128/128` → `129/129` |
| `.agents/slop/plans/README.md` | index this plan after `383` |

No public API changes; `SkeletonSpec` is unchanged.

## 4. Commands and expected results

From `packages/primitives`:

```sh
nub run test                                                   # 46 files, 672 → 673 tests, green
nub run check-types                                            # no output
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/skeleton-containment.runtime.test.tsx                # 3 passed (scoped evidence)
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/loading.runtime.test.tsx \
  runtime/nonsense-numbers.runtime.test.tsx \
  runtime/examples.runtime.test.tsx                            # green (no regression)
```

From the repo root:

```sh
nub run check    # green
nub run lint     # green
nub run test     # green
```

The full live suite still shows the host's window-accumulation degradation
(plan `379` §6); the scoped live files above are this change's live evidence and
the full suite is re-run before merging.

## 5. Test plan and the two-direction proof

**Core** (`src/core/loading.test.ts`): `skeletonStyle({ height: 12 })` has
`flexShrink: 1` and `minHeight: 12`; `width: 40` and `circle` keep
`flexShrink: 0`; `width: "60%"` shrinks; the resolved width and height are
unchanged. Fails by property without the fix.

**Runtime** (`runtime/skeleton-containment.runtime.test.tsx`), three cases:

1. **Avatar + line row** — a 220 px row, `gap="sm"`, a 40 px `circle` and one
   default skeleton: the line starts at `avatarRight + gap`, its width is the
   row's remaining width, and its right edge is inside the row. This is §0's
   scene (before: `w 220`, right edge `278` for a row ending at `232`).
2. **Over-full column keeps its shape** — three 18 px skeletons in a 40 px
   column: every skeleton is 18 high and the column's width. Before the
   `minHeight` floor the same scene painted `13.5 / 13 / 13.5`.
3. **A lone default skeleton fills its row** — `100%` still means the whole row
   when there is no sibling to share it with.

Failure directions to run before marking done:

| Mutation | Expected failure |
| -------- | ---------------- |
| `flexShrink` back to `0` | runtime 1: the line's right edge is `278`, outside the row's `232` |
| `minHeight` removed | runtime 2: heights `13.5 / 13 / 13.5` instead of `18` |
| `width` default changed to `"auto"` | runtime 3: the lone skeleton paints `0` wide |
| `flexShrink: 0` for every width too | core case: the percentage width no longer shrinks |

## 6. STOP conditions

- **A circle or an explicitly sized skeleton is squashed in a row.** The rule
  must keep `flexShrink: 0` for a numeric width; stop and report the measured
  width instead of shipping it.
- **A skeleton's height changes in a column.** `minHeight` is not holding the
  main axis; stop and report the measured heights.
- **A lone default skeleton no longer fills its row.** The percentage width is
  being lost; stop.
- **An existing skeleton test or the feedback example changes shape where no
  row is involved.** The rule is leaking to the cross axis; stop.

## 7. Measured results

Implemented and run on this host, 2026-10-18:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | **46 files, 673 tests**, green (672 before) |
| `nub run --filter @gpuixui/primitives check-types` | clean |
| scoped live: `skeleton-containment` | **3 passed** |
| scoped live: `loading` + `nonsense-numbers` + `skeleton-containment` | **green** (12 tests) |
| scoped live: `examples` ("mounts every registered example") | **passed** (the feedback example still mounts with the new row) |
| `nub run check` | green |
| `nub run lint` | green |
| `nub run test` | green |

Before → after, in the 220 px row of §0 (`gap="sm"` = 6):

| Measurement | Before | After |
| ----------- | ------ | ----- |
| line box | `x 58…278`, `w 220` (46 px outside) | `x 58…232`, `w 174` (inside) |
| circle avatar | `w 40` | `w 40` (unchanged) |
| over-full column heights | `18 / 18 / 18` | `18 / 18 / 18` (with the new floor) |

Mutation outcomes:

| Mutation | Observed failure |
| -------- | ---------------- |
| `flexShrink` back to `0` | runtime case 1: `expected 220 to be 174`; core case: the percentage width no longer shrinks |
| `minHeight` removed | runtime case 2: `expected 13.5 to be 18`; core case: the height floor is absent |
| `width` default changed to `"auto"` | runtime case 3 would paint `0` wide (the percentage is what fills the row) |

The `examples.runtime` file's two other cases (keyboard tooltip focus and the
number-field stepper click) still fail in this session on the host's focus/window
degradation (plan `379` §6); both fail identically without this change, and the
mount case — the one this plan touches — passes.

## 8. Acceptance

1. A default skeleton beside an avatar stays inside its row.
2. A circle or numeric-width skeleton keeps its size in a row.
3. A skeleton's height is never squashed by a bounded column.
4. A lone default skeleton still fills its row.
5. The core and runtime guards fail by name when `flexShrink` or `minHeight` is
   reverted.
6. `docs/skeleton.mdx`, the mounted example, `COMPONENTS.md`, `TODO.md` and the
   plan index record the change.
7. Every package and repo gate is green (the scoped live cases here; the full
   live suite before merge).

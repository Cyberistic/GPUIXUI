# 028 — `Skeleton circle` must be a circle, whatever dimensions it is given

**Status:** ready to execute · **Phase:** C/F · **Owner:** primitives
**Depends on:** `030`, `371`, `384` (the skeleton's existing rules) · **Touches:** `packages/primitives`, `COMPONENTS.md`, `TODO.md`

## 0. The bug, measured

`circle` is a shape promise: a placeholder with `circle` is an avatar or an icon
stand-in, and a pill is a different shape. Today the flag only changes the
radius and supplies a default width, so **any explicit dimension that is not
equal to the other one paints an ellipse**.

Measured 2026-10-19 on this host, real `TestRenderer` (`testTheme`,
`typography.body.lineHeight` = 18, each skeleton alone in a 200 px column):

| Input | Painted box | Expected |
| --- | --- | --- |
| `<Skeleton circle />` | `18 × 18` | `18 × 18` (correct) |
| `<Skeleton circle height={40} />` | `40 × 40` | `40 × 40` (correct) |
| `<Skeleton circle width={40} />` | **`40 × 18`** | `40 × 40` |
| `<Skeleton circle width={40} height={20} />` | **`40 × 20`** | `40 × 40` |
| `<Skeleton circle width="50%" />` | **`100 × 18`** | `18 × 18` (no pixel diameter) |

The probe that produced these numbers was a throwaway `runtime/__probe*` file
and has been deleted; reproduce with the runtime cases in §4.

Why it matters: the page's first sentence says "`circle` already makes the block
as wide as it is tall", and its API table says the width default is "the height
when `circle`". Both are false for a caller who supplies a width — the exact
thing an avatar placeholder does (`<Skeleton circle width={32} />` paints a
32 × 18 pill). No committed test covers a circle with an explicit width, which
is why `src/core/loading.test.ts` line 69 asserts only `.width` and passes.

## 1. The rule

A circle's box is **always square**. Its diameter is resolved once:

1. an explicit **pixel** `width`, when it is finite and non-negative;
2. otherwise an explicit **pixel** `height`, when it is finite and non-negative;
3. otherwise the body line height (the current default).

A percentage (or any string) dimension cannot be a diameter: there is no pixel
value to reuse for the other axis, so a circle falls through to the next source.
That makes `<Skeleton circle width="50%" />` a line-height circle rather than a
100 × 18 pill, and the docs must say so — pass a pixel size when the avatar has
to be larger.

The resolved diameter drives **all three** of `width`, `height` and `minHeight`,
so the existing "a placeholder never gives up its own height in an over-full
column" rule keeps working. `flexShrink` stays `0`: a circle is a size.

A non-circle skeleton is untouched: default `width: "100%"`, its own shrink and
floor rules, percentage dimensions pass through.

## 2. Files to change

### 2.1 `packages/primitives/src/core/loading.ts`

Add one module-local helper above `skeletonStyle` (do **not** export it from
`core/index.ts` — the public core surface does not need another name):

```ts
/** A circle's diameter: a pixel side, else the body line height. */
const circleDiameter = (
  spec: SkeletonSpec,
  theme: PrimitiveTheme,
): number => {
  const pixel = (value: number | string | undefined): number | undefined =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : undefined;
  return (
    pixel(spec.width) ?? pixel(spec.height) ?? theme.typography.body.lineHeight
  );
};
```

Then split `skeletonStyle` into the circle path and the block path. The circle
path returns width/height/minHeight = diameter, `flexShrink: 0`,
`radius.full`, `colors.skeleton`. The block path is the existing body, unchanged.
Keep the doc comment truthful: replace "`circle` takes that height as its width"
with the diameter rule, and say a percentage width cannot be a diameter.

### 2.2 `packages/primitives/docs/skeleton.mdx`

- Usage: the avatar example becomes `<Skeleton circle width={32} />` (one
  dimension is enough now) and the prose says the diameter comes from a pixel
  width, else a pixel height, else the line height.
- API table: `width`'s default cell and consequence must state the circle
  diameter; `circle`'s consequence becomes "always square; the diameter is a
  pixel width, else a pixel height, else the body line height".
- The row example keeps `height={40}` (still correct).
- Theming/Limitations: one sentence that a percentage width cannot express a
  circle's diameter, so it is ignored for `circle`.

### 2.3 Tests

**`packages/primitives/src/core/loading.test.ts`** — extend the existing
`describe("skeletonStyle")` circle case (do not add a new suite):

- width-only: `{ circle: true, width: 40 }` → `width === 40`, `height === 40`,
  `minHeight === 40`, `flexShrink === 0`.
- height-only stays `40 × 40` (existing behaviour, now asserted both ways).
- both supplied and different: `{ circle: true, width: 40, height: 20 }` →
  `40 × 40` (width is the diameter).
- percentage width: `{ circle: true, width: "50%" }` → `18 × 18` (line height),
  `typeof width === "number"`.
- non-finite width with a pixel height: `{ circle: true, width: NaN, height: 40 }`
  → `40 × 40` (the existing nonsense-number rule falls through, it does not
  paint `NaN`).
- plain block unchanged: `{}` → width `"100%"`, and `{ width: "50%" }` keeps the
  percentage (guards the split).

**`packages/primitives/runtime/skeleton-containment.runtime.test.tsx`** — add
one `it` after the existing avatar case: mount a column of five circles
(`bare`, `width={40}`, `width={40} height={20}`, `width="50%"`, `height={40}`)
and assert each painted `width === height` and the expected diameter. This is
the honest runtime proof the element tree cannot give (layout decides the box).
The file already has `boundsOf`; reuse it.

## 3. Documentation and inventory

- `COMPONENTS.md` → the `Skeletons` row: append one sentence to the existing
  notes: measured before/after (`width={40}` painted `40 × 18`, now `40 × 40`;
  a percentage width falls back to the line height because it cannot be a
  diameter) and name the plan.
- `TODO.md` → add this row under the primitives section (ticked after the
  suites run) and keep the counts accurate.
- `.agents/slop/plans/README.md` → add the `028` row in the `020–049` table with
  status `done — …` and the measured numbers.

## 4. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/primitives test
```

Expected: all offline tests pass; `728` before the change and `728` after — the
new checks live inside the existing circle case (adjust to the real count and
record it; do not invent it). The runtime file goes from `3` to `4` cases.

```sh
cd packages/primitives && ./node_modules/.bin/vitest run \
  --config vitest.runtime.config.ts runtime/skeleton-containment.runtime.test.tsx
```

Expected: the file's cases pass, including the new circle case. The rest of the
live suite is **not** the oracle for this plan (the host artifact degrades
absolute geometry; see `TODO.md`).

```sh
nub run check-types
nub run lint
```

Expected: both pass.

**Two-direction proof (required).** With the `circleDiameter` path removed (the
old `dimension(spec.width, height)` behaviour), the new offline cases must fail
on `height` (`18` / `20`) and the runtime case must fail on the painted box
(`40 × 18`). Record both observed failures; then restore the fix and re-run.

## 5. STOP conditions

- The runtime case cannot paint (`MissingNativeBindingError`) → stop; this plan's
  runtime half is unverified, and the offline half may still land only if the
  `TODO.md` row says so.
- A percentage-width circle is used somewhere in the examples, docs or apps in a
  way that relies on the pill → stop and report; the rule was chosen so no
  shipped example changes (`feedback.example.tsx` uses `height={40}`, the docs
  avatar passes both).
- `nub run check-types` disagrees with the new helper's narrowing → fix the
  helper, do not widen the public `SkeletonSpec`.

## 6. Acceptance

- Every `circle` skeleton paints a square box for bare, width-only, height-only,
  mismatched and percentage inputs (offline + runtime).
- A plain skeleton keeps its `100%` default and its shrink/floor rules.
- The skeleton page, API table, `COMPONENTS.md` row and `TODO.md` agree with the
  measured behaviour.
- The old direction is demonstrated failing in both suites.

## 7. Results (2026-10-19, this host)

- `packages/primitives/src/core/loading.ts`: `circleDiameter` (Option-based,
  module-local) and a split `skeletonStyle`; the block path is byte-for-byte the
  old one apart from `dimension(spec.width, "100%")`.
- Offline: `src/core/loading.test.ts` 17/17. Full package suite 51 files /
  **728 tests** green (unchanged count: the checks strengthened the existing
  circle case).
- Runtime: `runtime/skeleton-containment.runtime.test.tsx` **4/4** (was 3), the
  new case painting `18 / 40 / 40 / 40 / 18` squares.
- Two directions observed: with the old formula restored, the core case failed
  `expected { width: 40, height: 18 } to match { width: 40, height: 40 }`, and
  the runtime case failed `expected 18 to be 40`. Fix restored, both green.
- `nub run check-types`, `nub run lint`, `nub run fmt` green.

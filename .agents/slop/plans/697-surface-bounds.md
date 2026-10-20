# 697 — A `Surface` box is whole logical pixels, and a zero-area surface paints nothing

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | E (specialised foundations) |
| Owner | primitives |
| Depends on | `020`, `371`, `597`, `637`, `696` |
| Feeds | `packages/data-grid` charts, media frames, any future raster consumer |

Plan `696` shipped `Surface` with `width`/`height` passed verbatim into the host
style *and* into every adapter call. Measured on this worktree, 2026-10-20,
against the store's release-tag `@gpuix/native@0.10.0` binding: the authored
size is not a paintable box. This plan introduces one rule — **a surface box is
whole, non-negative logical pixels** — and makes the host box, the adapter
bounds and the paint agree on it.

---

## 1. Measured facts this plan relies on

All three probes mounted the real `Surface` with `rasterSurface` in the
`TestRenderer` (1280 × 800 window, fixture parent) and recorded `onError`, the
adapter's `paint` calls and `runtime.bounds`/`runtime.element`:

1. **A fractional width paints no frame.** `width={320.5} height={180}`:
   the host painted `width: 320.5`, the adapter received `320.5×180`, and
   `resize` failed with `surface bounds must be positive integers, got
   320.5×180`. `paints: []`. The page says `width` is "also the adapter's
   bounds" and never says whole pixels, so a width read from a measurement (the
   realistic source of a fractional box) silently ships an empty surface plus a
   logged error.
2. **A non-finite width reaches the paint as an unconstrained box.**
   `width={NaN} height={180}`: the runtime dropped the `width` style entirely,
   so the host painted **1256 px** wide (its parent's width) while the adapter
   was told `NaN×180` and `resize` failed. This is exactly the class plan `371`
   fixed for `Icon`/`Spinner`/`Skeleton`/`Grid`: a nonsense number reached the
   paint.
3. **A legitimate collapsed box is reported as an error.**
   `width={0} height={180}`: the host painted a 0-wide box and `resize` failed
   with `surface bounds must be positive integers, got 0×180`. A panel that
   collapses an inspector to zero width is a normal layout state, not a
   lifecycle failure, and it must start painting when it grows again.

The existing suite is green before the change: `runtime/surface.runtime.test.tsx`
5/5 and the full runtime suite 61 files / 835 tests (measured 2026-10-20).

**STOP** if a plain `div` with `width: 320` no longer paints 320 (the box rule
assumes authored logical pixels are the painted size), or if `setImagePixels`
refuses a 0-area call (this plan never makes one). Re-measure and revise before
writing code.

---

## 2. The rule

One exported function in `src/surface/bounds.ts`:

```ts
export const surfaceBounds = ({ width, height }: SurfaceBounds): SurfaceBounds
```

Per axis:

| Input | Result | Why |
| ----- | ------ | --- |
| finite `> 0` | `Math.floor(value)` | a buffer has whole pixels; floor keeps the box inside the space the caller was given |
| `0` | `0` | a collapsed box is a legitimate layout state |
| negative | `0` | not a length |
| `NaN`, `±Infinity` | `0` | unreadable length — plan `637`/D48: a length treats a non-finite value as unpaintable |

`Surface` uses **that one box** for the host style, `boundsRef`, the resize
comparison and every adapter call, so the painted box and the adapter's bounds
cannot disagree. `rasterSurface` accepts a zero-area box as "nothing to paint":
it records the bounds, calls no `paint`, and reports no error. A non-whole or
negative box passed to an adapter *directly* still fails — the adapter is
public and must not paint a buffer it cannot represent.

`renderSurface` applies the same rule, so the element seam cannot paint `NaN`
either; the rule is idempotent.

---

## 3. Exact files

### Create

| Path | What |
| ---- | ---- |
| `packages/primitives/src/surface/bounds.ts` | `surfaceBounds` and its TSDoc |
| `packages/primitives/src/surface/bounds.test.ts` | the axis table, including `-0.5`, `0.5`, `320.9`, `NaN`, `±Infinity` |
| `.agents/slop/plans/697-surface-bounds.md` | this plan |

### Change

| Path | Change |
| ---- | ------ |
| `packages/primitives/src/components/Surface.tsx` | derive `const bounds = surfaceBounds({ width, height })`; use it for `boundsRef`, the resize compare, and `renderSurface`; normalise inside `renderSurface` too |
| `packages/primitives/src/surface/raster.ts` | `isUsableBounds` becomes "whole and non-negative"; `paintAt` returns without painting when either axis is 0; `resize` still records the bounds; `setTheme` repaints only a box with area |
| `packages/primitives/src/surface/raster.test.ts` | a zero box paints nothing and reports nothing; a fractional box still fails; a grow-after-collapse paints |
| `packages/primitives/docs/surface.mdx` | `width`/`height` rows say whole logical pixels; a **Bounds** paragraph states the floor, the collapse and the zero-area rule; limitations list the whole-pixel trade; Verification names the new cases |
| `packages/primitives/runtime/surface.runtime.test.tsx` | two cases: a fractional mount paints at whole pixels (no error), and a 0-wide mount paints nothing then grows into a frame |
| `COMPONENTS.md` | the Surface row records the whole-pixel bounds rule |
| `TODO.md` | a primitives row for this plan |
| `.agents/slop/plans/README.md` | index this plan after `696` |

Do **not** export `surfaceBounds` from `src/surface/index.ts` or the package
root: no consumer exists yet, and the contract is in the page. Do not edit
`apps/docs`, `packages/tw` or `packages/tokens`.

---

## 4. Implementation sketch

`src/surface/bounds.ts`:

```ts
import type { SurfaceBounds } from "./adapter.js";

const paintLength = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

export const surfaceBounds = ({ width, height }: SurfaceBounds): SurfaceBounds => ({
  width: paintLength(width),
  height: paintLength(height),
});
```

`rasterSurface`'s paint path:

```ts
const isWholeBox = (b: SurfaceBounds): boolean =>
  Number.isInteger(b.width) && Number.isInteger(b.height) &&
  b.width >= 0 && b.height >= 0;

const hasArea = (b: SurfaceBounds): boolean => b.width > 0 && b.height > 0;
```

`paintAt` fails on `!isWholeBox`, resolves the host, then returns `void` when
`!hasArea` — before `paint` is called. `resize` keeps `bounds = Option.some(next)`
after `paintAt` resolves. `setTheme` repaints only when the recorded box has
area (a zero box records the mode and paints nothing).

`Surface`:

```ts
const bounds = surfaceBounds({ width, height });
boundsRef.current = bounds;
// … and in the resize effect compare bounds.width/height
return renderSurface({ ...bounds, label, ... });
```

---

## 5. Test plan

Every case must fail without its half of the fix.

1. `src/surface/bounds.test.ts` — the axis table. The old expression
   (identity) fails 8 of 10 cases.
2. `src/surface/raster.test.ts` — `resize({0, 180})` resolves, calls no
   `paint`, reports no error (old: a `SurfaceError`); `resize({320.5, 180})`
   still fails (guards the direct-call contract); `resize({0, 180})` then
   `resize({2, 2})` paints once at `2×2`.
3. `src/components/Surface.test.tsx` — `renderSurface` with `NaN` paints
   `width: 0`; with `320.5` paints `320`. Old: `NaN`/`320.5` appear verbatim.
4. `runtime/surface.runtime.test.tsx` —
   `paints a fractional authored box at whole pixels`: `320.5×180` yields one
   `paint` at `320×180`, one `resize:320x180`, no error, host `style.width ===
   320`, `bounds.width === 320` (old: no paint + a `resize` error).
   `keeps a collapsed surface silent and paints it when it grows`: mount `0`,
   assert no error and no paint after a frame, re-render `40`, assert one
   `40×180` paint and no error (old: an error at mount, and the first paint is
   never reached because nothing retries).

Commands, from the worktree root:

```sh
nub run --filter @gpuixui/primitives test
# expected: the package's offline suite, 0 failed
nub run --filter @gpuixui/primitives check-types
# expected: exit 0
cd packages/primitives && nub exec vitest run --config vitest.runtime.config.ts \
  runtime/surface.runtime.test.tsx
# expected: 7/7 (5 existing + 2 new)
```

Both directions: after the suite is green, revert `paintLength` to identity and
confirm the bounds/element/runtime cases fail by name; then restore it, remove
`!hasArea` and confirm the collapsed cases fail. Record the failures in §6.

---

## 6. Result (filled by the executor)

Implemented 2026-10-20.

- `src/surface/bounds.ts` — `surfaceBounds`; `Surface` uses it for `boundsRef`,
  the resize compare and the element seam; `renderSurface` applies it too, so a
  direct call cannot paint `NaN`.
- `src/surface/raster.ts` — `isUsableBounds` became `isWholeBox` (whole and
  non-negative) and `paintAt` returns before `paint` when the box has no area;
  the recorded bounds still update, so a later grow paints.
- Docs, inventory and README counts updated; `surface.mdx` gained a **Bounds**
  section and the whole-pixel limitation.

Measured after the change (fresh runs, this host):

| Command | Result |
| ------- | ------ |
| `nub exec vitest run src/surface src/components/Surface.test.tsx` | 4 files / 20 tests passed |
| `nub exec vitest run --config vitest.runtime.config.ts runtime/surface.runtime.test.tsx` | 7/7 passed |
| `nub run --filter @gpuixui/primitives test` | 67 files / 921 tests passed |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |

Both directions, measured by mutation:

1. `paintLength` reverted to identity → 3 offline cases fail by name
   (`floors a fractional length…`, `collapses a length…`, `paints a whole
   box…`) and the runtime case `paints a fractional authored box at whole
   pixels` fails with the adapter's error in `onError`.
2. The `hasArea` early return removed → 2 raster cases fail by name and the
   runtime case `keeps a collapsed surface silent and paints it when it grows`
   fails on the reported error.

The full runtime suite was green before this change (61 files / 835 tests) and
the scoped file is 7/7 after; the full live run is the merge gate.

---

## 7. Acceptance criteria

- `surfaceBounds` is the one rule; the host box and every adapter call read it.
- A fractional authored box paints whole pixels with no error.
- A non-finite or negative box paints a collapsed (0) box, never `NaN` and
  never a stretched parent-sized rectangle.
- A zero-area surface reports no error, paints nothing, and paints its first
  frame when it grows.
- A direct adapter call with a non-whole box still fails with a typed error.
- `docs/surface.mdx`, `COMPONENTS.md` and `TODO.md` agree with the measured
  behaviour.
- `nub run --filter @gpuixui/primitives test`, `check-types` and the scoped
  runtime file are green.

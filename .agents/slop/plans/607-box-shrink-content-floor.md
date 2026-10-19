# 607 — `Box.shrink` cannot shrink below its content

**Phase:** F (layout truth) — **implementation**
**Depends on:** `030`, `040`, `041`, `097`, `381`, `383`, `587`
**Owns:** `packages/primitives` (`core/layout.ts`, its two suites, the Box
page), `COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`. No other
workstream's paths.

## 1. The evidence

`Box` documents `shrink` as **"may shrink below its content"** (`docs/box.mdx`,
API row and prose: the default is `false` because chrome must not squash). The
resolver only sets `flexShrink`:

```ts
// core/layout.ts, before this plan
const style: StyleDesc = {
  ...surfaceStyle(spec, theme),
  flexShrink: spec.shrink === true ? 1 : 0,
};
```

That is not enough. A flex item keeps an **automatic minimum size** — its
content floor — unless `minWidth`/`minHeight` say otherwise. This repo has
already measured that floor twice: plan `383` removed it from every `Text` run
(`minWidth: 0`) because a sentence painted past its bounded row, and plan `587`
had to put it back (`minWidth: "auto"`) for a `max-content` grid track to
measure the content. `shrinkLayoutStyle` uses the same pair
(`flexShrink: 1` + `minWidth: 0`).

Measured on the pinned release build (2026-10-19, one fresh `TestRenderer`
window per mount):

| Case | `shrink` | Painted size |
| --- | --- | --- |
| 300 px child in a 200 px row | `false` | **300** |
| 300 px child in a 200 px row | `true` | **300** |
| 300-high child in a 100-high column | `false` | **300** |
| 300-high child in a 100-high column | `true` | **300** |

So `shrink` changes no geometry at all when the box has content with a size:
the promise is false, and a consumer writing `<Box shrink>` to fit a sidebar
gets the same overflow as the default. The runtime does honour the explicit
floors: with `minWidth: 0`/`minHeight: 0` the same mounts painted **200** and
**100**.

## 2. The rule

`shrink` is one decision with two halves:

- `flexShrink: 1` lets the box give up main-axis space;
- `minWidth: 0` and `minHeight: 0` remove the automatic floors that cap that
  shrink at the content's size.

The floors are removed on **both** axes because `shrink` does not name an axis:
a `Box` in a row must be able to narrow, and a `Box` in a column must be able to
shorten. The content then overflows or reflows according to its own rules —
that is what "below its content" means, and the consumer can still raise a floor
through `style`, which merges last.

The default (`shrink` absent or `false`) keeps `flexShrink: 0` and **adds no
`minWidth`/`minHeight`**; the chrome does not squash and existing trees paint
exactly as before.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/core/layout.ts` | `boxStyle` also sets `minWidth: 0`/`minHeight: 0` when `shrink` is true |
| `packages/primitives/src/core/layout.test.ts` | assert the floors are absent by default and exactly `0` for a shrinking box |
| `packages/primitives/src/components/presentational.test.tsx` | assert `renderBox({ shrink: true })` carries both floors and a plain box carries neither |
| `packages/primitives/runtime/layout.runtime.test.tsx` | **new cases**: a shrinking box paints the bounded row's width / column's height; a plain box keeps its child's size (the old direction) |
| `packages/primitives/docs/box.mdx` | explain the two halves of `shrink`, the both-axes rule, and the caller override; name the new cases under Verification |
| `COMPONENTS.md` | the Boxes row records plan `607` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/607-box-shrink-content-floor.md` | this file |
| `TODO.md` | one ticked row under the primitives workstream |

No new module, dependency or prop. `shrinkLayoutStyle` and `Text.shrink` are
unchanged: they already carry the right pair for their own elements.

## 4. Test plan

**Offline — `src/core/layout.test.ts`** (extend the existing `boxStyle` case):

1. `boxStyle({ tone: "card" })` has `flexShrink: 0` and **no**
   `minWidth`/`minHeight` (the default chrome must not acquire a zero floor).
2. `boxStyle({ tone: "card", shrink: true })` has `flexShrink: 1`,
   `minWidth: 0` and `minHeight: 0`.
3. A caller's `style` still wins: `boxStyle` is only the base here; the
   existing style-order guard (`097`) already covers the merge — do not add a
   second merge path.

**Offline — `src/components/presentational.test.tsx`**:

1. `renderBox({ tone: "none" })` has no `minWidth`/`minHeight`.
2. `renderBox({ tone: "none", shrink: true })` has both at `0`.

**Runtime — `runtime/layout.runtime.test.tsx`**, one window per case:

1. **Row:** a `Stack direction="row" style={{ width: 200 }}` containing a
   `Box shrink` whose child is a `Box style={{ width: 300 }}` paints the outer
   box at **200**, and the same tree with `shrink` removed paints **300**.
2. **Column:** a `Stack direction="column" style={{ height: 100 }}` containing
   a `Box shrink` whose child is a `Box style={{ height: 300 }}` paints the
   outer box at **100**, and the same tree with `shrink` removed paints **300**.

Both directions are guarded: removing the two floors fails the shrink half
(300/300), and turning `shrink` off in the test fails the enabled half if the
default ever starts shrinking (the control must remain 300).

**Commands.**

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime runtime/layout.runtime.test.tsx
nub run check
nub run lint
nub run test
```

Expected: offline 59 files / 833 tests (831 + 2); the scoped runtime file 31
tests green (the full runtime suite is the end-of-task check for this
cross-cutting layout change: 57 files / 793 tests); the root gates green.

Measured (2026-10-19): offline **833/833**, scoped `layout.runtime`
**31/31**, full runtime **57 files / 793 tests**, `nub run check` and
`nub run test` green.

Then the two-direction proof (measured):

1. Revert the two `minWidth`/`minHeight` lines and run the scoped runtime case:
   it fails with `expected 300 to be 200` and `expected 300 to be 100` — the
   two shrinking boxes paint their child's size.
2. The plain controls inside the same cases are the `flexShrink: 0` direction:
   both paint `300` with the floors present, so the floors alone are not the
   feature.
3. Restore the fix; both cases pass and the plain controls still paint `300`.

## 5. STOP conditions

- The runtime ignores `minWidth: 0`/`minHeight: 0` on a `div` (the probe above
  says it does not, but re-confirm in the scoped file): stop and report; do not
  invent a different layout workaround.
- Any existing runtime suite changes geometry outside the new cases: stop and
  report the file/case; the default must remain byte-identical.
- A `shrink` consumer in the repo relies on the old (non-shrinking) behaviour:
  none exists today (only this plan's tests use the prop) — if one appears,
  stop and record it rather than adjusting that consumer.

## 6. Acceptance

- [x] The offline assertions fail against the old resolver and pass with the fix.
- [x] The row and column runtime cases fail without the floors and pass with them.
- [x] A plain box stays at its child's size in both axes (the default is unchanged).
- [x] `docs/box.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index agree with
      the measured behaviour. (`README.md` does not name `boxStyle`.)
- [x] `nub run check`, `nub run lint`, `nub run test` green.

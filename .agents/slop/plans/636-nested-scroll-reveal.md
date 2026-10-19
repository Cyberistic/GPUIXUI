# 636 — A nested `ScrollArea` does not reveal through its parent

**Phase:** F (keyboard truth) — **implementation**
**Depends on:** `020`, `041`, `072`, `337`, `583`, `590`, `591`, `597`, `598`,
`601`, `602`, `603`, `606`
**Owns:** `packages/primitives` (`components/internal.ts`, `components/ScrollArea.tsx`,
its runtime suite, the ScrollArea page), `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`. No other workstream's paths.

## 1. The evidence

Plan `606` gave a `ScrollArea` a reveal: a focused descendant inside a labelled
area is measured against the area's painted viewport and the area scrolls it into
view. The context carries **one** callback — the nearest area's — so the chain
stops at the first `ScrollArea`.

Measured on the pinned release build (2026-10-19, a temporary probe in
`runtime/`, since deleted; one fresh `TestRenderer` window):

A 120-high outer area contains a 400-high block and then a 100-high inner area
whose first child is a `Button`. `Tab` reaches the button:

```
outer      { x: 12, y: 12, width: 320, height: 120 }
inner      { x: 12, y: 412, width: 300, height: 100 }
target     { x: 12, y: 412, width: 300, height: 36 }
outerOffset { x: 0, y: 0 }
innerOffset { x: 0, y: 0 }
```

The button sits at `y 412` inside an outer viewport that ends at `132`: focus is
on a control the keyboard user cannot see. The inner area correctly did not move
(the button is at its top), but the outer area never heard about the focus.

`docs/scroll-area.mdx` states the defect as the contract: *"A control outside the
area has no reveal; with nested areas the nearest one moves."* That sentence is
the bug.

## 2. The rule

A nested area **composes** its reveal with the one above it:

1. move the focused host into this area's painted viewport (the plan `606` rule);
2. then ask the enclosing area to reveal **this area's own** host — not the
   focused host again, so the outer area scrolls to the region a user would see
   rather than chasing a descendant that is already visible inside it.

The second step runs even when the first moved nothing: an inner area whose
focused child is already visible can itself be below the outer fold.

Each area already knows its resolved style, so it passes that style with its host
id. The outer area then measures the inner area's **painted** box
(`paintedBox(reported, style)`) instead of its raw report. That matters because
a plain `div` reports from its content origin (plan `597`): a padded inner area
would otherwise be revealed up to its padding/border early, clipping its top
edge. A host that reports its border box (a `Button`) passes no style and keeps
today's exact measurement.

The context type gains one optional argument:

```ts
export type ScrollReveal = (hostId: number, style?: object) => void;
```

`useFocus` and `useRovingFocus` keep calling `reveal(id)` unchanged; a style-less
call is measured exactly as before.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/components/internal.ts` | `ScrollReveal` takes an optional resolved `style` for a content-origin host; document the nesting rule |
| `packages/primitives/src/components/ScrollArea.tsx` | read the enclosing reveal, move the existing measurement into a local `scrollIntoView(hostId, style?)`, and expose a composed `reveal` that moves this area's visible box in the parent |
| `packages/primitives/runtime/scroll-reveal.runtime.test.tsx` | **two new cases**: a nested area reveals through both; a padded nested area's painted box is fully inside the outer (the style half) |
| `packages/primitives/docs/scroll-area.mdx` | replace "the nearest one moves" with the chain rule and name the nested cases under the reveal section |
| `COMPONENTS.md` | the Scrollable containers row records plan `636` |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/636-nested-scroll-reveal.md` | this file |
| `TODO.md` | one ticked row under the primitives workstream |

No new module, dependency or prop. `scrollIntoViewOffsets` and `paintedBox` are
unchanged; the composition is the feature.

## 4. Test plan

**Runtime — `runtime/scroll-reveal.runtime.test.tsx`**, one fresh window per
case:

1. **Nested chain.** Outer `ScrollArea` (120 high, 320 wide) containing a
   400-high `Box` and an inner `ScrollArea` (100 high; a `Button` at its top).
   `tabTo(target)`, then wait for the focus tracker. Assert:
   - before focus the target is below the outer viewport (the setup guard);
   - `outerOffset.y` is negative after focus;
   - the target's reported box is contained in the outer's painted box.
2. **Padded nested area.** The same tree with `padding: 8` on the inner area's
   style. Assert the inner area's **painted** box is contained in the outer's
   painted box after focus. This is the half that fails by 8 px when the style
   is not passed to the parent.

Both cases fail in the old direction: removing the composition leaves the outer
offset at `{0, 0}` (measured above), and removing the style argument leaves the
padded inner top edge outside the outer by the padding. The existing 10 cases in
the file are the control: they must stay green.

**Commands.**

```sh
cd packages/primitives && nub exec vitest run --config vitest.runtime.config.ts runtime/scroll-reveal.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
nub run test
```

The bare `test:runtime <file>` form does not filter (measured: it ran all 57
files); use the `nub exec vitest … <file>` form for the scoped runs.

Expected: the scoped file 12/12; offline stays 59 files / 833 tests (this plan
adds runtime cases only); the full runtime suite 57 files / 795 tests (793 + 2);
the root gates green.

Measured (2026-10-19): scoped `scroll-reveal` **12/12**; offline **59 files /
833 tests**; full runtime **57 files / 795 tests**; `nub run check`,
`nub run lint` and `nub run test` green.

The padded case needed a trailing block after the inner area. With the inner
area as the last child, revealing it always clamps the outer at its maximum
offset, so the content-origin and painted boxes land at the same place and the
case cannot tell them apart.

Both directions measured:

1. Remove the `parentReveal` call: both nested cases fail — the outer offset
   stays `0` (`expected 0 to be less than 0`) and neither containment holds.
2. Restore the call but drop the style argument: only the padded case fails
   (`expected false to be true`); the unpadded case stays green, because its
   report is already its painted box.

## 5. STOP conditions

- The composition recurses or re-enters an area (a context value must be the
  *enclosing* one; an area never consumes its own provider): stop and report.
- Revealing an inner area in the outer moves the **focused host** instead of the
  area, or double-moves an axis the outer does not scroll: stop and report.
- The padded case cannot be made exact with `paintedBox` because the runtime's
  report for a `ScrollArea` differs from the plan `597` model: stop and record
  the measured shape rather than special-casing it.
- Any existing `scroll-reveal` case or any other runtime file changes behaviour:
  stop and report the file/case; the single-area path must stay byte-identical.

## 6. Acceptance

- [x] The nested case fails with the outer offset at `{0, 0}` before the fix and
      passes after (both directions measured).
- [x] The padded case fails by the padding inset without the style argument and
      passes with it.
- [x] The single-area reveal, the roving/checkbox/OTP cases, the horizontal case,
      the untouched-region cases and the position report are unchanged.
- [x] `docs/scroll-area.mdx` no longer promises "the nearest one moves";
      `COMPONENTS.md`, `TODO.md` and the plan index agree with the measurement.
- [x] `nub run check`, `nub run lint`, `nub run test` green.

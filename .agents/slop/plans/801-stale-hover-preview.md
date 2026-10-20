# 801 — A hover preview outlives the transition that makes the rating inert

Phase F · Depends on `030`, `041`, `054`, `094`, `332`, `601`, `786`, `796`,
`799`, `800` · Owner: primitives

## 0. Summary

`Rating`'s hover preview is state: `onEnter` stores the star under the pointer in
a `useState`, and `onLeave` clears it. The paint reads that state through
`previewRating` and only while the control is interactive.

A control that becomes **inert** (`readOnly` or `disabled`) stops receiving
pointer events: `renderRating` detaches `onMouseLeave` when
`disabled || readOnly`. So a preview captured before the transition can never be
cleared by the pointer, and it is not cleared by the component either. While
inert it is hidden by the paint gate — and the moment the control becomes
interactive again the stale preview repaints, for a star the pointer is not on.

Measured on this host (probe deleted; §4 has the programme):

| Frame | Filled stars (committed value is 2) |
| ----- | ----------------------------------- |
| pointer over star 4, interactive | 4 |
| re-render `readOnly` | 2 |
| re-render interactive again, pointer untouched | **4** |

The same sequence with `disabled` behaves identically. This is the stale-state
class plan `601` fixed for the focus cursor and plan `796` for the ring: an
event-tracked affordance whose clearing event the runtime never delivers once the
control changes state.

## 1. The rule this plan lands

**A preview is an input affordance and cannot outlive the input state it was
captured in.** When a rating becomes inert, its preview is dropped; when it
becomes interactive again it paints the committed value until the pointer enters
a star.

The clearing is local component state, not shared application state: `Rating`
already owns `useState` for the ephemeral pointer preview (`preview` never leaves
the component), so a React effect is the right owner. Effect Atom is not
involved; nothing is fetched, shared or persisted.

## 2. Files to change

### 2.1 `packages/primitives/src/components/Rating.tsx`

```ts
const inert = props.disabled === true || props.readOnly === true;
useEffect(() => {
  if (inert) setPreview(Option.none());
}, [inert]);
```

with a comment naming the measured sequence and plan `801`. Import `useEffect`
from `react`. Do not derive `inert` from `interactive` in the renderer: the
renderer is pure and must keep deciding the paint from its arguments.

### 2.2 `packages/primitives/runtime/rating.runtime.test.tsx`

- A `filledStars(runtime)` helper: the number of stars painted
  `testTheme.colors.primary` (the existing `paintedColor` already reads a star's
  icon tint, which is how this suite proves filled vs outline).
- `it.each` over `readOnly` and `disabled`: hover star 4 (4 filled), re-render
  inert (2 filled), re-render interactive (still **2**). The third assertion is
  the bug; the first is the liveness proof.
- A control case: the same hover while the rating stays interactive paints 4,
  so the fix cannot pass by previews having stopped working.

### 2.3 `packages/primitives/docs/rating.mdx`

In the preview paragraph: one sentence — a rating that becomes `readOnly` or
`disabled` drops its preview instead of reviving it when it becomes interactive
again (plan `801`).

### 2.4 `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`

One appendix clause on the Rating row, one ticked task, one index row.

## 3. Commands

```sh
nub run --filter @gpuixui/primitives test:runtime runtime/rating.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run check-types
nub run lint
```

Expected: the runtime file green at 22 tests; offline green; types and lint
green. The full runtime suite remains the merge gate.

## 4. Test plan and both-direction proof

The probe that measured the bug (a window, a hover on `ra-star-4`, three
renders with `flush()` between them, counting stars whose icon tint is
`theme.colors.primary`) printed `{ hovered: 4, readOnly: 2, after: 4 }`.

**Old direction (effect disabled — must fail by name):**

```
× drops a hover preview when the rating becomes read-only
× drops a hover preview when the rating becomes disabled
AssertionError: expected 4 to be 2
```

**New direction (controls):**

- `keeps a preview while the pointer stays inside an interactive rating` — the
  pointer path still previews (4 filled).
- the existing `does not preview when %s` rows still prove an inert control
  paints no preview at all.
- the existing `Delete clears`/arrow cases still pass, so the preview state was
  not confused with the committed value.

## 5. STOP conditions

1. The stale preview also survives a **value** change or a `max` change while
   interactive — stop and report; that is a second state path, not this plan.
2. Clearing the preview re-renders a paint that still shows the preview (an
   effect that never commits in the runtime) — capture the frame dump and stop.
3. A pointer that leaves the rating while interactive no longer clears the
   preview (the `onLeave` path regressed) — stop; the fix must be additive.

## 6. Acceptance

- The two transition rows and the interactive control are green, and the two
  rows fail with the effect removed.
- `docs/rating.mdx` states the drop-on-inert rule.
- `COMPONENTS.md`, `TODO.md` and the plan index carry the change.
- `test`, `check-types`, `lint` green.

## 7. Outcome (measured 2026-10-20)

| Check | Command | Result |
| ----- | ------- | ------ |
| scoped runtime | `nub run --filter @gpuixui/primitives test:runtime runtime/rating.runtime.test.tsx` | **22 / 22 green** (was 19) |
| old direction | effect body disabled | `drops a hover preview when the rating becomes read-only` and `… disabled` both fail: `expected 4 to be 2` |
| offline | `nub run --filter @gpuixui/primitives test` | green (the same 74 files; the runtime file is not part of it) |
| types / lint | `nub run check-types`, `nub run lint` | green |
| full runtime suite | `nub run --filter @gpuixui/primitives test:runtime` | **75 files / 961 tests green** |

The fix is four lines plus its comment: an effect drops the local preview when
the control becomes inert, so the pointer-less transition cannot revive it.

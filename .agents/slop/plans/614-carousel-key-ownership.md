# 614 — A control inside a carousel slide owns its keys

**Owner:** components workstream (`packages/components`).
**Depends on:** 110, 117, 315, 326, 365, 374, 388, 394, 522, 576, 577, 578.
**Phase:** F — a measured ownership bug in a landed component.
**Numbering:** 613 is the last components plan; `614` is free in every worktree
(checked 2026-10-19). Record it in `PLAN.md` D30.

## 1. Why

`Carousel` documents its arrow rule as **"(carousel focused)"**:

> `ArrowRight` / `ArrowLeft` (carousel focused) — same as the controls
> `Home` / `End` — first / last slide

The implementation instead handles those keys on the **root's** `onKeyDown`,
and GPUix delivers a key to the focused element and then bubbles it through
every ancestor (measured: plan 345). Every control inside a slide therefore
loses its own editing keys to the carousel:

- typing in a text field on the active slide and pressing `ArrowLeft` /
  `ArrowRight` (caret movement) or `Home` / `End` (line start/end) also steps
  or jumps the carousel;
- a nested widget that uses `Home` / `End` (a list, a tab rail, a text editor)
  is overridden by the slide jump;
- the key is consumed before the slide's control sees its own effect, because
  the root is the one ancestor every slide shares.

The same defect class was measured and fixed for `List` (plans 576/577/578):
`EventPayload.elementId` names the handler's own element, not the focused one,
so the component must ask `renderer.getFocusedElementId()` **at key time** and
decide whether the key is its own. `Carousel` never adopted that rule.

**Guarded bug:** a key that belongs to a control inside a slide also steps the
carousel, so editing text or moving inside a nested widget changes the slide.

## 2. Decision (do not re-litigate)

The carousel's internal key handling runs **only while the root holds native
focus**. The root remains the documented place from which arrows/Home/End work
(docs already say "carousel focused"). A key that bubbles from any descendant
is left to that descendant, and the caller's `onKeyDown` still runs on the root
for every key.

The rule is deliberately narrow: without an ancestry API, "inside the carousel"
cannot be distinguished from "a control in a slide" (plan 367 records the same
limit). Root-only is the one honest test.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/components/src/carousel.tsx` | attach a ref to the root, read the renderer's focused id at key time, and gate every internal branch on the root owning focus |
| `packages/components/src/behaviour/carousel.test.tsx` | header comment + two native cases: an input in a slide keeps its keys; a nested focusable control receives the key while the carousel does not step (and the existing root-focus case stays the other direction) |
| `packages/components/docs/carousel.mdx` | state the ownership rule; verification count `17 → 19` |
| `COMPONENTS.md` | Carousel row: `17 → 19` native tests and the ownership sentence |
| `.agents/slop/plans/README.md` | index `614` |
| `TODO.md` | tick the task under Tier 2 hardening |
| `PLAN.md` | D30: take `614` |

No example change: the shipped example has no control inside a slide. No
inventory change: `carouselMeta.limitations` is not affected (this is a
contract, and the docs page states it).

## 4. The change

`carousel.tsx` today:

```tsx
onKeyDown={(event: EventPayload) => {
  if (isRight(event)) context.step(1);
  else if (isLeft(event)) context.step(-1);
  else if (isFirst(event)) context.goTo(0);
  else if (isLast(event)) context.goTo(count - 1);
  onKeyDown?.(event);
}}
```

Add:

```tsx
const renderer = useGpuix().renderer;
const root = useRef<PublicInstance | null>(null);
```

(`import { useGpuix } from "@gpuix/react";`,
`import type { PublicInstance } from "@gpuix/react";`,
`import { useRef } from "react";`)

Attach `ref={root}` to the root `div`, and gate the internal branches:

```tsx
onKeyDown={(event: EventPayload) => {
  // A key that bubbles from a control in a slide belongs to that control: the
  // root only steps while it is the natively focused element (plan 614).
  if (root.current !== null && renderer?.getFocusedElementId?.() === root.current.id) {
    if (isRight(event)) context.step(1);
    else if (isLeft(event)) context.step(-1);
    else if (isFirst(event)) context.goTo(0);
    else if (isLast(event)) context.goTo(count - 1);
  }
  onKeyDown?.(event);
}}
```

Keep the caller's handler unconditional, and do not claim/consume the event:
the bubble order is unchanged for descendants.

## 5. Tests (write them first)

Add to `src/behaviour/carousel.test.tsx`, beside "steps with arrows and jumps
with Home/End":

1. **"leaves a slide's editing keys to its field"**
   - fixture: the existing `Gallery`, but slide 0 also contains
     `<input testId="slide-field" />`; the simplest change is to extend
     `Gallery`'s slide 0 (no other case looks at slide 0's children).
   - focus `slide-field` via `renderer.focusElement(...)`; assert
     `focusedTestId(gallery) === Option.some("slide-field")`.
   - `simulateKeystrokes("right")`, `simulateKeystrokes("end")`; assert
     `onValueChange` was not called.
   - focus `carousel`, `simulateKeystrokes("right")`; assert the last call is
     `1` (the gate is not over-broad).
2. **"lets a nested control handle the key it receives"**
   - fixture: a focusable `div` (`role="button"`, `tabIndex={0}`,
     `testId="slide-action"`) in slide 0 with an `onKeyDown` spy.
   - focus it, `simulateKeystrokes("right")`; assert the nested spy ran **and**
     `onValueChange` did not.

Both cases are inside `describe("Carousel", ...)` with the existing renderer and
teardown; do not add a helper that hides the assertion.

Expected: 19 tests in the file. Both new cases fail on the current source (the
first reports `onValueChange` called with `1`, the second also steps), and pass
after §4. The existing "steps with arrows" case must stay green: it focuses the
root explicitly.

## 6. Commands and expected results

```sh
nub run --filter @gpuixui/components check-types
nub exec --cwd packages/components vitest run --config vitest.behaviour.config.ts src/behaviour/carousel.test.tsx
nub run --filter @gpuixui/components test
nub run check && nub run lint && nub run test
```

Expected: type-check clean; Carousel 17 → 19 with the two new cases green and
no other case changed; unit suite unchanged (449); the three gates exit 0.

Two-direction proof, recorded in the plan index and the commit:

1. With §4: both new cases pass, the root case keeps passing.
2. Restore the old unconditional `onKeyDown` (or make the gate `true`): both
   new cases fail, naming `onValueChange` calls; record the exact failure of the
   first one.

The full native suite still carries the recorded plan-540 binding failures
(36 red of 812 on 2026-10-19). Run the Carousel file, not the full suite, while
iterating; the full suite is not required for this plan.

## 7. STOP conditions

- **STOP** if a synthetic `right`/`end` on the focused `<input>` does not reach
  the carousel root (the new case would pass vacuously). Record the measurement
  and re-plan; do not ship a test that cannot fail.
- **STOP** if focusing the root does not make its `id` equal to
  `getFocusedElementId()` in the headless renderer; the gate would be
  permanently false and the existing root case would fail. Record the ids.
- **STOP** if any existing Carousel case changes outcome; report which.
- **STOP** if the fix requires an ancestry/`elementId` signal the runtime does
  not provide. Do not add a timer or a focus sampler.

## 8. Acceptance

- The root steps on arrows/Home/End only while it holds native focus.
- A field or nested control in a slide keeps its keys; the caller's root
  `onKeyDown` still receives every bubbled key.
- Docs, `COMPONENTS.md`, the behaviour count and the plan index agree.
- `nub run check`, `nub run lint` and `nub run test` pass.

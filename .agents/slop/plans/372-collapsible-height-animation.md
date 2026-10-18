# 372 — Collapsible and Accordion: keep the body mounted and reveal it from a measurement

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §10) |
| Phase | F (integration and polish) |
| Owner | components workstream |
| Depends on | `110`, `111`, `113`, `117`, `186` (playground, measured recipe in §10), `326`, `327` |
| Fixes | `TODO.md` → Phase F → the Collapsible/Accordion measured-height row |

## 1. Goal

`CollapsibleContent` and `AccordionContent` unmount while closed, so closing a
section destroys the local state inside it. Plan `186` measured that 0.10.0 can
animate a numeric height, that the natural height of already-mounted content is
readable through `ref` → `renderer.getElementBounds`, and that an
`overflow: "hidden"` clip refuses pointer input. It never measured the
**keyboard** path, which is the part that decides whether the recipe is
shippable.

This plan settles that gap, then ships the animation on both disclosure
surfaces:

1. Measure whether a clipped (height `0`, `overflow: "hidden"`) body stays in
   the tab order.
2. Choose the smallest mechanism that keeps closed content out of the tab order
   **and** keeps it measurable.
3. Keep content mounted, animate the body height between `0` and the measured
   content height, and prove state survival, focus containment and the tween in
   the real renderer.

## 2. Measured facts (2026-10-17, this host, locally built 0.10.0 binding)

A throwaway behaviour probe rendered this tree, then walked focus with
`renderer.focusNextWithin` (the test renderer does not traverse on a synthetic
`"tab"` keystroke):

```
trigger
motion.div animate={height: 0} style={{overflow:"hidden"}}
  content (input "draft", button "inner-button")
after
```

Results:

| Variant | Tab order from `trigger` | Content bounds |
| ------- | ------------------------ | -------------- |
| clip only (`height: 0`, `overflow: hidden`) | **`draft` → `inner-button` → `after`** | `52` |
| clip + `visibility: "hidden"` on content | `after` → `trigger` | `null` |
| clip + `pointerEvents: "none"` | `draft` → `inner-button` → `after` | `52` |

Consequences:

- **The clip does not remove keyboard focus.** This is the unmeasured defect the
  TODO suspected. A collapsed section with an input or a button inside is still
  reachable with Tab even though a pointer click does not activate it.
- **`visibility: "hidden"` removes the whole subtree from the tab order**, and
  `getElementBounds` returns `null` for it. The measurement therefore has to
  happen while the content is still visible; the last measured height is kept
  in state, and the content hides once that measurement exists.
- **`pointerEvents: "none"` is not a tab-order guard.** It changes nothing here.
- **The motion tween works exactly as plan 186 measured.** Paused clock, 200 ms
  linear: the following sibling moved `140 → 106 → 166` px at `0 → 80 → 280`
  ms (closed y `26`, 80 ms y `106`, 280 ms y `166`), i.e. `80/200 × 140`.
- **Hidden content stays in the tree and in `getAllText()`.** State inside it
  survives; a `<text>` readout is still readable while collapsed. Tests must
  assert on `style.visibility`, not on the text's absence.

Probe file was deleted before this plan was committed; only these numbers are
kept.

## 3. Design

### 3.1 One shared reveal: `src/internal/reveal.tsx`

Both surfaces get the same mechanism from one module, because Accordion renders
its own content and a second copy of the measurement/visibility rule would
drift.

```tsx
interface RevealProps extends Props {
  readonly open: boolean;
  /** Default `true`. `false` snaps instead of tweening. */
  readonly animate?: boolean;
}
```

Renders:

```
<motion.div
  initial={false}
  animate={{ height: open ? measured : 0 }}
  transition={{ duration: animate ? 0.2 : 0, ease: "linear" }}
  onMotionComplete={...}
  style={{ overflow: "hidden", width: "100%" }}>
  <div ref={merged} {...callerProps}
       style={mergeStyles(style, hidden ? { visibility: "hidden" } : undefined)}>
    {children}
  </div>
</motion.div>
```

Rules, each backed by a measurement above:

- **The caller's props and `testId` go on the inner plain div.** `motion.div`
  has no `testId`, `role` or `aria-*` in 0.10.0 (`MotionDivProps`), and the
  animated height is read through a following sibling, never the motion node.
- **Measurement**: `useLayoutEffect` after every render reads
  `renderer.getElementBounds(instance.id)` and stores the height **only when it
  is non-null**. Re-measuring on every render keeps an open section correct when
  its content grows; when closed the call returns `null` and the stored value is
  retained. A state write only happens when the number changes, so it converges.
- **Hidden = `!open` and a measurement exists and the close has settled.** The
  close settles on `onMotionComplete` (or immediately when `animate` is
  `false`). Opening resets `settled` to `false` so the closing tween is visible.
  A section mounted closed measures once with `visibility: visible`, then hides
  before the first painted frame (`useLayoutEffect` flushes synchronously).
- **The first open** uses the stored measurement; the layout effect after the
  open re-measures and corrects if the content changed while it was hidden.
  This is plan 186's residual limitation: no width-change observer, so a
  rewrap while collapsed can produce one corrected frame on open.
- **`initial={false}`** and a `0` target before the first measurement mean a
  mount never animates from a stale value; a `defaultOpen` section animates from
  the measured value on its first open, which plan 186 proved is flash-free.
- **No `pointerEvents` guard**: the clip already refuses the press, and adding
  one would be a second, unproven rule.

### 3.2 `CollapsibleContent`

Replace the early `return null` with `<Reveal open={open} style={...} {...rest}>`
and keep the existing column/padding/colour style on the inner div. Add
`animate?: boolean` to `CollapsibleContent` props (default `true`).

### 3.3 `AccordionContent`

Same substitution with `open={isOpen(value)}`. Add `animate?: boolean`.

### 3.4 What does not change

- Root/trigger state, keyboard rules, `aria-expanded`, styling and parts.
- No new package dependency; `motion` is `@gpuix/react`'s existing export.
- `Collapsible` still has no rest-props surface; suites wrap it in a `testId`
  div for the tab walk.

## 4. Files

| File | Action |
| ---- | ------ |
| `packages/components/src/internal/reveal.tsx` | **new** — the measured reveal shared by both surfaces |
| `packages/components/src/collapsible.tsx` | content keeps mounted through `Reveal`; `animate` prop; header doc and limitations updated |
| `packages/components/src/accordion.tsx` | content keeps mounted through `Reveal`; `animate` prop; header doc and limitations updated |
| `packages/components/src/behaviour/collapsible.test.tsx` | rewrite the closed-body assertions; add focus containment, state survival and the tween |
| `packages/components/src/behaviour/accordion.test.tsx` | rewrite the closed-section assertions; add the same three classes |
| `packages/components/docs/collapsible.mdx` | mounted-body contract, animation, measurement limitation, new count |
| `packages/components/docs/accordion.mdx` | same |
| `packages/components/examples/collapsible.example.tsx` | header comment (no longer "unmounts"); the draft/state demo stays |
| `packages/components/examples/accordion.example.tsx` | header comment only if it claims unmounting |
| `COMPONENTS.md` | Accordion and Collapsible rows: animation, mounted body, real test counts |
| `TODO.md` | tick the Phase F row |
| `PLAN.md` | D28 — the disclosure hide rule (see §8) |
| `.agents/slop/plans/README.md` | index `372` |
| `.agents/slop/plans/372-collapsible-height-animation.md` | this plan; append §10 after implementation |

## 5. Commands and expected results

Run from `packages/components` unless stated.

```sh
nub x tsc --noEmit
# expect: exit 0 (no any, no cast; `Props` supplies testId/aria types)

nub x vitest run --config vitest.behaviour.config.ts src/behaviour/collapsible.test.tsx
nub x vitest run --config vitest.behaviour.config.ts src/behaviour/accordion.test.tsx
# expect: every case passes against the real renderer
```

Then the package gates:

```sh
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Expected: the unit suite stays green, the behaviour suite grows by the new
cases, `check:tests` accepts every assertion, `lint` is clean, and the root
`test` run is green. The `inventory.test.ts` count checks are part of the unit
suite and fail until §6.4's counts and docs lines are updated.

## 6. Implementation steps

### 6.1 Shared reveal

1. Create `src/internal/reveal.tsx` with the §3.1 contract.
2. Imports: `motion`, `useGpuix`, `Props`, `PublicInstance` from `@gpuix/react`;
   `mergeStyles` from `@gpuix/react/floating`; `useCallback`, `useLayoutEffect`,
   `useState`, `useRef` from `react`; `Option` for the measurement and
   `useMergedRef` from `./ref.js`.
3. `REVEAL_SECONDS = 0.2` is a module constant with a `// TODO:` naming
   `@gpuixui/tokens` motion tokens (plan `019`) as its future home.
4. No `any`: the measurement is
   `Option.flatMap(Option.fromNullishOr(instance), (el) => Option.fromNullishOr(renderer?.getElementBounds?.(el.id)))`.

### 6.2 Collapsible

1. `CollapsibleContent` becomes:

   ```tsx
   export interface CollapsibleContentProps extends Props {
     readonly animate?: boolean;
   }
   export const CollapsibleContent = ({ animate = true, style, children, ...rest }: CollapsibleContentProps) => {
     const theme = useTheme();
     const { open } = useCollapsibleContext();
     return (
       <Reveal open={open} animate={animate} {...rest}
         style={mergeStyles({...existing defaults}, style)}>
         {children}
       </Reveal>
     );
   };
   ```

2. Delete the `TODO` and the "unmounts" claim in the module header; state the
   mounted/measured contract.
3. `collapsibleMeta.limitations` becomes the two real limits: no
   width-change re-measure while closed; no `aria-controls`.

### 6.3 Accordion

Same in `AccordionContent`, with `open={isOpen(value)}`. Update
`accordionMeta.limitations`.

### 6.4 Docs, examples, inventory

1. `docs/collapsible.mdx`: the body **stays mounted**; closed content is hidden
   with `visibility` and leaves the tab order; the body animates to its
   measured height; `animate={false}` snaps; the rewrap limitation. The
   Verification line becomes the real `it(` count.
2. `docs/accordion.mdx`: same, in its own voice; the Anatomy row, the
   limitations list and the Verification count.
3. Update the two example header comments that still claim unmounting. Keep the
   examples' compositions; they are what the native example suite mounts.
4. `COMPONENTS.md` Tier 2 rows: Accordions and Collapsible sections get the
   animation and mounted-body facts, the tab-order rule, the rewrap limitation,
   and their real native counts.
5. `TODO.md`: tick the Phase F row (and leave the `plan 186` residual as
   documented, not open).

## 7. Test plan

Every new case runs in the real renderer and can fail. The suite header comment
states the bugs guarded: a clipped body that stayed in the tab order, a closed
body that lost its state, and a body that snapped instead of tweening.

### 7.1 Collapsible (`src/behaviour/collapsible.test.tsx`)

Fixtures: `Advanced` (trigger + content), `Walkable` (wrapped in
`<div testId="root">`, an `<input testId="draft">` inside the body, a
`<div testId="after" tabIndex={0}>` after it), `Stateful` (a button inside the
body that increments a `<text testId="count">`), `Measured` (a fixed-height
body and a following `after` row).

| # | Case | Assertion |
| - | ---- | --------- |
| 1 | opens and closes on click, body mounted | content exists in both phases; `style.visibility` `"hidden"` → `"visible"`; `aria-expanded` follows |
| 2 | Enter toggles | visibility + `aria-expanded` |
| 3 | Space toggles on release | hidden after key down, visible after key up |
| 4 | controlled closed | stays hidden until the consumer opens; `onOpenChange(true)` |
| 5 | controlled open prop | visible |
| 6 | **closed body is out of the tab order** | focus trigger → `focusNextWithin("root")` lands on `after`, never `draft` |
| 7 | **open body is in the tab order** | open, focus trigger, `focusNextWithin` lands on `draft` |
| 8 | **state survives a close/open cycle** | click `bump` (count `1`), close, `findByTestId("count")` still `1`, open, still `1` |
| 9 | **the body tweens to the measured height** | paused clock; closed sibling y `y0`; open; 80 ms → `y0 + 0.4 × natural ± 4`; 280 ms → `y0 + natural ± 1`; the natural value is the content's measured height, not a constant |
| 10 | `animate={false}` snaps | after an open with the paused clock, the sibling already moved the full height at 0 ms |

Exit: every case passes; remove the clock pause before unmount (`clockResume()`).

### 7.2 Accordion (`src/behaviour/accordion.test.tsx`)

Rewrite the existing closed assertions (they read `findByTestId(...)`
`undefined`) to `style.visibility` / `aria-expanded`, then add:

- closed sections are skipped by the tab walk and the open one is reachable
  (same two checks as Collapsible, over the `one`/`two` sections);
- a stateful body survives switching from `one` to `two` and back (multiple
  mode keeps both mounted; single mode also keeps both mounted);
- a section tweens to its measured height, and `animate={false}` snaps;
- an initially open section (`defaultValue="one"`) is visible and its body is
  reachable without a click.

### 7.3 Two-direction proofs (mutations, each run alone then restored)

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | `hidden` forced to `false` in `reveal.tsx` | Collapsible 6 and the Accordion tab walk: focus lands in the collapsed body |
| M2 | `animate={{ height: open ? measured : 0 }}` → `animate={{ height: 0 }}` | Collapsible 9 mid-tween (sibling y does not move at 80 ms) |
| M3 | render `children` only when `open` (`{open ? <Reveal…/> : null}` in `CollapsibleContent`) | Collapsible 8 (count missing) and 6 (nothing to skip — the body is absent) |
| M4 | replace the measurement with a constant `100` | Collapsible 6/9 height (sibling moves 100, not the content height), and the open body clips |
| M5 | `onMotionComplete` never settles (delete the handler) | Collapsible 1 after a close: visibility stays `"visible"` |

Record the exact failing assertion for each in §10.

**Note on test authoring:** `style.visibility` is the only reliable closed
signal because hidden content reports `null` bounds. Height is always read from
a following sibling, never from the motion node (no `testId`).

## 8. Decision to record

Add to `PLAN.md` §4:

> **D28** A closed disclosure body is hidden with `visibility: hidden`, not with
> the `overflow` clip alone: the clip refuses the pointer but the clipped
> subtree stays in the tab order (measured `trigger → draft → inner-button →
> after`). Visibility removes the subtree from focus and from the accessible
> tree, and it returns `null` bounds, so the natural height is measured once
> while visible and kept in state. Plan `372`; evidence plan `186` §10 plus
> plan `372` §2.

## 9. STOP conditions

Stop and report with evidence rather than improvising:

- A behaviour suite cannot load the native root (`unsupported-host`): the host
  lost its binding. Report the preflight; do not mark the plan landed.
- `visibility: "hidden"` does not remove the subtree from the tab walk on the
  actual component (the probe used plain host elements): record the tree and
  the walk, and amend this plan before changing the design.
- The inner content's `getElementBounds` is `null` on the first layout effect
  even while visible: record the sequence, and fall back to measuring in the
  open handler (with a one-frame caveat) rather than shipping an unmeasured
  target.
- `onMotionComplete` does not fire on a height tween of a component-rendered
  `motion.div` (it did for the probe): record it and settle the hide on a
  `Clock`-based timeout only if that is honest, otherwise ship
  `visibility`-on-close without a tween and mark the motion verdict failed.
- An existing Accordion test fails for a reason unrelated to the changed body
  contract: stop; the change is out of scope until explained.

## 10. Measured facts after implementation

Implemented on 2026-10-18; both surfaces reveal through
`packages/components/src/internal/reveal.tsx`.

**Suite.** Collapsible 5 → 10 native cases, Accordion 15 → 19; the behaviour
suite is **539 tests across 47 files** (530 before this plan). The unit suite is
357 and the inventory checks agree with both docs pages and both
`COMPONENTS.md` rows.

**Tab containment (the new fact).** A throwaway probe walked focus on this host:

| Variant | Tab order from `trigger` | Content bounds |
| ------- | ------------------------ | -------------- |
| clip only (`height: 0`, `overflow: hidden`) | `draft` → `inner-button` → `after` | `52` |
| clip + `visibility: "hidden"` on content | `after` → `trigger` | `null` |
| clip + `pointerEvents: "none"` | `draft` → `inner-button` → `after` | `52` |

So the clip alone leaves a collapsed body keyboard-reachable. `visibility`
removes it from the tab order and from the accessible tree, and returns `null`
bounds; that is why the measurement is taken while visible and kept in state.
The shipped component tests assert both directions (`trigger → after` closed,
`trigger → draft` open) for Collapsible and (`trigger-one → trigger-two`, then
`trigger-one → draft-one`) for Accordion.

**State.** A counter inside the Collapsible body reads `1` before the close,
while hidden, and after the re-open. In Accordion single mode the same counter
in section one survives a switch to section two and back. Removing the mount
(M3) makes both fail.

**The tween.** With the motion clock paused, 80 ms into the 200 ms tween the
following sibling moved 40 % of the measured content height, and at 200 ms it
moved the full height. Fixtures: 76 px for the Collapsible body (60 px row +
6 px top + 10 px bottom padding) and 70 px for the Accordion body (60 px row +
10 px bottom padding). `ease: "linear"` keeps the mid-point assertion exact;
`animate={false}` needs 1 ms to apply and lands at the full height.

**`onMotionComplete`** settles the close exactly once; the content is hidden
only after the close tween, so a closing body stays visible (and briefly
reachable) for the 200 ms transition. That is recorded as a limitation on both
docs pages, together with the residual plan 186 rewrap caveat (the height is
re-measured on open, not on a width change) and the fact that hiding a body
whose descendant holds focus does not return focus to the trigger.

**Two-direction proofs** (each mutation applied alone, the named suites run, the
file restored):

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | `hidden` forced to `false` | exit 1 — both tab-order cases fail (focus stayed on `draft`) |
| M2 | `animate={{ height: open ? measured : 0 }}` → `animate={{ height: 0 }}` | exit 1 — both tween cases fail, *expected 0 to be greater than 0* |
| M3 | `{open ? children : null}` inside the body | exit 1 — both state cases fail, *expected `[…]` to include `'1'`* |
| M4 | measure `100` instead of the bounds | exit 1 — both tween cases fail (the sibling moved 100 px, not 76/70) |
| M5 | `onMotionComplete` never settles | exit 1 — 3 close/hidden cases fail, *expected false to be true* |

**Gates.** `nub run check`, `nub run lint`, `nub run test` and
`nub run --filter @gpuixui/components test:behaviour` all pass on this host.


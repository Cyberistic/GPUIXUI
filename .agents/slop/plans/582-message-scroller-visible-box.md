# Plan 582 — Message scroller: measure the pin against the scroller's visible box

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 117, 206, 326, 327, 540, 572 |
| Status | **planned** |
| Claimed number | first free after `581` (checked every worktree; recorded in `PLAN.md` D30) |

## 0. Why this plan exists

Nine of the eleven `MessageScroller` behaviour tests are red at `HEAD`. Plans 540
and 578 recorded them only as "pre-existing plan-540 binding failures", so the
cause was never attributed. It is **two wrong boxes in the same measurement**,
and both are fixable on the component side.

Measured on this host, 2026-10-19, with the shared `0.10.0` binding:

```text
mount, 40 rows, viewport height 200
offset     [0, -1080]
root       { x: 0, y: 0,   width: 480, height: 200 }   ← window box, correct
viewport   { x: 0, y: -1080, width: 480, height: 200 } ← content box, scrolled
row-0      { x: 0, y: -1080, width: 480, height: 32 }
row-39     { x: 0, y: 168,  width: 480, height: 32 }   ← window box, correct
```

Consequences:

1. **The suite wheels the wrong place.** Its `wheel()` helper uses the
   viewport's bounds; the viewport reports `y: -1080`, so
   `nativeSimulateScrollWheel` lands off-screen and no scroll happens. That is
   why "does not yank a reader who scrolled up" never sees the affordance.
2. **The component measures the wrong bottom.** `handleScroll` compares the tail
   sentinel with `viewport.y + viewport.height` (`-880` on this build), so the
   distance reads `1048` even when the tail is visible. Scrolling *up* happens to
   compute "unpinned" correctly by accident; scrolling *back to the end* can
   never re-pin, so "re-pins when the reader wheels back to the end" and the
   streamed-growth cases stay red.

The root is a plain, **unscrolled** box that wraps the viewport, and the parts
contract only accepts `MessageScrollerViewport` and
`MessageScrollerJumpToLatest` (the latter is absolute, so it takes no flow
space). Its bottom is therefore the viewport's visible bottom. Measuring against
the root is not a box-convention normaliser (plan 540 rejected those): it picks
the one element whose frame is already correct, and it keeps working on a host
where the viewport's own box is fixed or on Apple-silicon's published binary.

## 1. Exact files to change

1. `packages/components/src/message-scroller.tsx`
2. `packages/components/src/behaviour/message-scroller.test.tsx`
3. `packages/components/docs/message-scroller.mdx`
4. `COMPONENTS.md` (Message scroller row)
5. `.agents/slop/plans/README.md` (this plan's index row)
6. `TODO.md` (the hardening task, ticked; plus the binding hand-off)
7. `PLAN.md` (D30: the next components overflow plan is `583`)

Do not touch the pure pin/unread rules (`src/message-scroller/logic.ts`), the
viewport's scroll container, or the affordance's placement.

## 2. Implementation

### 2.1 `src/message-scroller.tsx` — give the context the root's instance

The viewport cannot see the root's element id today. Add a ref to the context.

- Import `RefObject` from `react` beside the existing type imports.
- `MessageScrollerContextValue` gains:

  ```ts
  /** The unscrolled root: its box is the viewport's visible box. */
  readonly rootRef: RefObject<PublicInstance | null>;
  ```

- `MessageScroller` creates `const rootRef = useRef<PublicInstance | null>(null);`
  and merges the caller's ref:

  ```ts
  const setRoot = useMergedRef(rootRef, ref);
  ```

  Destructure `ref` from the props (it is part of `Props`) and put
  `ref={setRoot}` on the root `div`. This also closes a plan-128 gap: the root
  did not compose a caller `ref` at all.
- Include `rootRef` in the context value and its dependency array (the ref
  identity is stable, so the memo still only changes with the state).
- The viewport destructures `rootRef` from `useMessageScroller()`.

### 2.2 `src/message-scroller.tsx` — the scroll handler measures the root

Replace the viewport-bounds comparison with the root's visible box:

```ts
const handleScroll = (event: EventPayload): void => {
  const tail = tailRef.current;
  const root = rootRef.current;
  if (renderer !== null && root !== null && tail !== null) {
    const rootBounds = renderer.getElementBounds?.(root.id);
    const tailBounds = renderer.getElementBounds?.(tail.id);
    if (
      rootBounds !== undefined &&
      rootBounds !== null &&
      tailBounds !== undefined &&
      tailBounds !== null
    ) {
      scroller.observe(tailBounds.y - (rootBounds.y + rootBounds.height));
    }
  }
  onScroll?.(event);
};
```

`viewportRef` stays: `scrollToEnd` still needs it for the `scrollTo` fallback.
Update the module header's measurement paragraph: the tail and the rows are in
window coordinates, the scroll container's *own* reported position is in scrolled
content coordinates on this build, so the pin is measured against the unscrolled
root.

### 2.3 `src/behaviour/message-scroller.test.tsx` — measure the visible box

- `wheel()`: take the centre from `requireBounds(root, "scroller")`, not
  `"viewport"` (the viewport's box is content-space; the wheel otherwise lands
  off-screen).
- `endIsVisible()`: compare the last row with `requireBounds(root, "scroller")`.
  Add a comment naming the measured reason.
- Add one case, "keeps the pin when a scroll returns exactly to the end":

  ```tsx
  it("keeps the pin when a scroll returns exactly to the end", () => {
    const root = renderComponent(<Transcript count={40} />);

    wheel(root, 120);
    expect(root.renderer.findByTestId("jump")).toBeDefined();

    // Back to the end in one move; the old viewport-box rule read the tail as
    // 1000+ px away and could never re-pin.
    wheel(root, -120);
    expect(root.renderer.findByTestId("jump")).toBeUndefined();

    root.unmount();
  });
  ```

- Update the file header: it now guards the visible-box measurement, not only the
  pin/unread rules.

### 2.4 Docs and inventory

- `docs/message-scroller.mdx`:
  - under **Behaviour**, add one sentence: the pin is measured against the
    scroller root's visible box because a scroll container's own reported box is
    in scrolled content space on GPUix 0.10.0;
  - under **API**, add `ref?` to the `MessageScroller` row;
  - under **Verification**, change "11 tests" to **12 tests**;
  - under **Limitations**, state that the root's visible box is the reference, so
    a root with its own padding adds that padding to the threshold.
- `COMPONENTS.md` Message scroller row: "11 native behaviour tests" → "12 native
  behaviour tests", and add the visible-box sentence.
- `TODO.md`: tick a new Tier 2 hardening line for plan 582; add an interlock row:
  "the binding reports a scroll container's own bounds in scrolled content space
  (measured: viewport `y: -1080` at offset `-1080` while its rows are in window
  space) — components measure the unscrolled root; a binding fix should make the
  container's own box the visible box (owner: binding-gaps)".
- `PLAN.md` D30: append "after 582 the next components overflow plan is 583".

## 3. Commands and expected results

Scoped before any change (the defect):

```sh
nub exec vitest run src/behaviour/message-scroller.test.tsx --config vitest.behaviour.config.ts
```

Expected now: **9 failed / 2 passed** (the failures are quoted in §0).

After the fix, same command, from `packages/components`:

```sh
nub exec vitest run src/behaviour/message-scroller.test.tsx --config vitest.behaviour.config.ts
```

Expected: **12 passed**.

Unit suite:

```sh
nub run test
```

Expected: 42 files, 426 tests, exit `0`.

Full native suite (end of task; not a merge gate for this plan):

```sh
nub run test:behaviour
```

Expected after the fix: **742 passing / 35 failed** of 777. The 35 are the
remaining plan-540 binding failures (position/focus, catalogued in plan 540 §8);
the nine `MessageScroller` rows disappear and the new case is the tenth pass.
Paste both counts into the commit body.

Gates:

```sh
cd ../.. && nub run check && nub run lint
```

Expected: both exit `0`.

## 4. Both-direction proof

1. Keep all changes; run the scoped suite: 12/12.
2. Revert only §2.2 (use `viewport.y + viewport.height` again) and restore the
   viewport-based `wheel` centre: the nine original failures return plus the new
   case (10 failed).
3. Restore the fix: 12/12.
4. Revert only the `wheel`/`endIsVisible` helper change while keeping §2.2: the
   wheel lands off-screen again and the scroll cases fail. This proves the helper
   change is part of the contract, not cosmetic.
5. Paste both runs into the commit body.

`scripts/verify-two-directions.sh` calls `jj` (not installed, D1); do the runs by
hand.

## 5. STOP conditions

- The scroller root's bounds are not stable across a scroll (y moves with the
  offset): stop and report — the last unscrolled ancestor is not available and
  this plan's premise is wrong.
- Any `MessageScroller` case other than the nine named starts failing: stop and
  report which.

- Any other behaviour file's verdict changes: stop; this change must not touch
  position or focus cases outside this suite.
- The new case passes with §2.2 reverted: stop — it does not guard the
  measurement.

## 6. Acceptance

- The nine red `MessageScroller` cases pass, and a new tenth case guards the
  re-pin measurement.
- The pin decision uses the unscrolled root's visible box; the scroll container's
  own reported box is no longer read for the pin.
- A caller `ref` on `MessageScroller` is composed, not dropped.
- Docs, `COMPONENTS.md`, the inventory, the plan index, `TODO.md` and `PLAN.md`
  agree; the docs page and the row state 12 native tests.
- `nub run check`, `nub run lint`, the unit suite and the scoped behaviour suite
  are green; the full native suite is `742 passing / 35 known failures`.
- One commit: `fix(components): measure the message scroller's pin in its visible box (plan 582)`.

## 7. Results

Fill this in when the plan lands.

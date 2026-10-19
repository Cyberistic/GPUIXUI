# Plan 572 — Message scroller: the jump affordance floats in the transcript corner

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 117, 206, 326, 327, 540 |
| Status | **landed** — the affordance now floats inside the scroller's bottom-right corner (measured: old layout put its bottom at `233` against a viewport ending at `200`; the new case fails there and passes with the fix). Full native suite 711 passing / 55 pre-existing plan-540 failures; check, lint and type-check green |
| Claimed number | first free after `571` (recorded in `PLAN.md` D30) |

## 0. Why this plan exists

`MessageScrollerJumpToLatest` is a direct child of the root's flex column, styled
`alignSelf: "flex-end"`, so it takes a **row beneath the scroll viewport**. The
module header and `messageScrollerMeta` explain why:

> `position: "absolute"` resolves against the mount parent in 0.10.0 (measured in
> plan 112), so an overlay would be a window-level layer.

That blanket claim was re-measured on 2026-10-19 while fixing the Avatar (plan
571): an absolute child resolves against the nearest **positioned** ancestor. A
200×200 parent at `100,100` with `position: "relative"` and a 50×50 absolute
child at `top:10,left:20` measured the child at `120,110` — local, not window
level. Plan 112's result was the unpositioned case.

So the affordance can float where it belongs: over the transcript's bottom-right,
inside the scroller's own bounds. That is the shadcn/ui shape (the scroll-to-end
control overlays the transcript) and it reclaims the row the button currently
consumes.

## 1. Exact files to change

1. `packages/components/src/message-scroller.tsx`
2. `packages/components/src/behaviour/message-scroller.test.tsx`
3. `packages/components/docs/message-scroller.mdx`
4. `COMPONENTS.md` (Message scroller row)
5. `.agents/slop/plans/README.md` (index row)
6. `TODO.md` (tick the new task)
7. `PLAN.md` (D30 note: next components overflow plan `573`)

Do not change the pin/unread logic, the viewport, or the example.

## 2. Implementation

### 2.1 `src/message-scroller.tsx`

Root (`MessageScroller`), style block: add `position: "relative"` first:

```tsx
{
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.sm,
  minHeight: 0,
}
```

`MessageScrollerJumpToLatest`: call `useTheme()`, and replace the Button style

```tsx
style={mergeStyles({ alignSelf: "flex-end" }, style)}
```

with

```tsx
style={mergeStyles(
  {
    position: "absolute",
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
  },
  style,
)}
```

Update the module header: the affordance floats in the scroller's bottom-right
corner because the root is its positioning context; plan 112 measured the
unpositioned case.

Update `messageScrollerMeta.limitations`: remove the "sits beneath the viewport"
entry. Keep the rest.

### 2.2 `src/behaviour/message-scroller.test.tsx`

Add one case that does not depend on scroll geometry (the suite's other cases are
blocked by the plan-540 binding; this one must pass on its own):

```tsx
it("floats the jump affordance inside the transcript's bottom-right corner", () => {
  const root = renderComponent(
    <MessageScroller label="Conversation" pinned={false}>
      <MessageScrollerViewport testId="viewport" style={{ height: 200 }}>
        <MessageScrollerItem>
          <text>First</text>
        </MessageScrollerItem>
      </MessageScrollerViewport>
      <MessageScrollerJumpToLatest testId="jump" />
    </MessageScroller>,
  );

  const viewport = requireBounds(root, "viewport");
  const jump = requireBounds(root, "jump");

  // Inside the viewport, not in a row beneath it.
  expect(jump.y).toBeGreaterThanOrEqual(viewport.y);
  expect(jump.y + jump.height).toBeLessThanOrEqual(
    viewport.y + viewport.height,
  );
  // Anchored to the right half.
  expect(jump.x).toBeGreaterThan(viewport.x + viewport.width / 2);

  root.unmount();
});
```

Import `requireBounds` from `../internal/interaction.js` (the file already
imports `boundsOf`/`clickCentreOf`; add what is missing). A controlled
`pinned={false}` makes the affordance render without scrolling, so the case is
independent of the binding's scroll defect.

### 2.3 `docs/message-scroller.mdx`

- Delete the "affordance sits beneath the viewport" limitation bullet.
- In the layout/props prose (near the Usage block) say the affordance floats in
  the viewport's bottom-right corner; a caller's `style` still wins.
- Verification: `(10 tests)` → `(11 tests)` and mention the corner assertion.

### 2.4 `COMPONENTS.md`

In the Message scroller row delete

> the affordance sits beneath the viewport because `position: "absolute"` resolves against the mount parent

and replace it with

> the jump affordance floats inside the scroller's bottom-right corner; the root is its positioning context

Keep every other sentence. Do not change the test count in that row (the row
does not state one).

## 3. Commands and expected results

From `/Users/cyberistic/GPUIXUI/workspaces/components`:

```sh
nub run --filter @gpuixui/components test:behaviour -- message-scroller
```

Expected: **1 new case passes**. The file's existing 10 cases are the plan-540
scroll/bounds failures (they remain part of the recorded 55); the new case must
not join them.

```sh
nub run --filter @gpuixui/components test
nub run check
nub run lint
```

Expected: all green; `inventory.test.ts` re-checks the docs count and the parts
table.

Full native suite:

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected: **710 + 1 = 711 passed, 55 failed** (the same 55 plan-540 cases; one
more test total than plan 571's 765 → 766).

## 4. Both-direction proof

1. Keep the new case, revert only the two style changes (remove `position:
   "relative"` from the root and restore `alignSelf: "flex-end"` on the button).
2. Run the message-scroller suite: the new case must fail at the containment
   assertion (the affordance sits below the viewport).
3. Restore and re-run: the new case passes.
4. Paste both counts into the commit body.

`scripts/verify-two-directions.sh` calls `jj` (not installed, D1); do the two
runs by hand.

## 5. STOP conditions

- The absolute button lands at the window origin or escapes the root on any host
  (bounds outside the root) — stop and report; do not add coordinates.
- The button overlaps the viewport's scrollbar and becomes unclickable — stop;
  the corner offset is a token, so raise it in the plan rather than adding a
  literal.
- The new case passes on the old code (it must be able to fail).
- Any native failure beyond the recorded 55.

## 6. Acceptance

- Root is the positioning context; the affordance floats bottom-right inside it.
- One new native case, proven to fail on the old layout and pass on the new one.
- Module header, `messageScrollerMeta`, docs, `COMPONENTS.md`, plan index and
  `TODO.md` agree; docs count is 11.
- `nub run check` and `nub run lint` exit `0`; unit suite green; native suite
  711 passing / 55 known failures.
- One commit: `fix(components): float the message scroller's jump affordance (plan 572)`.

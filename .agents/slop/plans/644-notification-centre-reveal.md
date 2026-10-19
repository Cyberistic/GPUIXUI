# 644 — Notification centre: the reading cursor is scrolled into view

**Phase:** F (consistency and keyboard contract)
**Owner:** components workstream (`packages/components`)
**Depends on:** plan 568 (notification centre), plan 576 (key ownership),
plan 582 (a scroller's own box is content-space), plan 530/535 (the two prior
"reveal the active row" fixes), plan 608 (focus-signal truth).
**Status:** implemented — 2 new native cases (Notification centre 19). The
down case fails with `revealRow.current(item.id)` removed; the up case fails
with the `above` branch removed. The full behaviour suite is 807 passed / 35
failed of 842 — the same 35 recorded plan-540 binding failures. Docs,
`COMPONENTS.md` and the inventory synced.

## 1. The bug

`NotificationCentreList` is a bounded scroll viewport (`maxHeight: 280`). The
arrow keys move the **active** row and call `renderer.focusElement(row)` — but
nothing scrolls the feed. With more notifications than fit, the reading cursor
leaves the viewport: the user sees the highlight disappear and `Enter` reads a
row they cannot see. This is the same defect plans 530 (command menu) and 535
(combobox) fixed for their lists.

Measured on this host (`@gpuix/native@0.10.0`, 2026-10-19), 20 notifications in
the shipped fixture:

| Probe | Result at `HEAD` |
| ----- | ---------------- |
| 10 × `ArrowDown` from the panel | active row `n10` at `y: 511`, `height: 44`; the feed's visible box is `y: 59 … 339` |
| focused element | the row (`focusElement` worked) |
| scroll offset | `0` — the feed never moved |

And the upward direction, which is not the same path:

| Probe | Result at `HEAD` |
| ----- | ---------------- |
| wheel down 400 px, then one `ArrowDown` | active row `n1` at `y: -285`; focus is the row; offset stays `-400` |

`renderer.scrollIntoView(row)` does **not** solve it: measured on the same
fixture it scrolled only 160 px for a row whose bottom was 216 px below the
viewport, leaving the row still clipped. The reveal must be a measured rule, not
a native call.

The component also cannot read the current offset to compute this:
`getScrollOffset(id)` **throws** (`Failed to convert napi value Undefined into
rust type f64`) while the feed is at offset `0`, which is exactly the state a
first arrow press starts from. The fix therefore measures a top sentinel, not the
scroll offset.

## 2. The measured rule

Restructure `NotificationCentreList` into an **unscrolled frame** around the
scrolling viewport, and put a zero-height sentinel at the top of the content:

```
frame     (unscrolled; its box is the visible box, in window space)
└ viewport (overflowY: scroll)
  ├ sentinel (height 0)
  └ rows
```

Measured conventions on this host (probe, 2026-10-19):

- the frame's box stays at `y: 59` before and after scrolling — it is window
  space;
- the viewport's own box moves with the content (`y: -172` at offset `-172`) —
  the plan-582 content-space behaviour, so it must not be the visible box;
- the sentinel reports `y: frame.y - scrollTop`, so
  `scrollTop = frameBounds.y - sentinelBounds.y` needs no `getScrollOffset`;
- a row's box is in window space.

With `margin = theme.spacing.sm`:

```
scrollTop = frame.y - sentinel.y
above     = row.y - (frame.y + margin)
below     = row.y + row.height - (frame.y + frame.height - margin)
next      = above < 0 ? scrollTop + above
          : below > 0 ? scrollTop + below
          : scrollTop
if next !== scrollTop: renderer.scrollTo(viewport.id, 0, -max(0, next))
```

The `above` branch subtracts a negative distance, so it scrolls **up**; the
`below` branch adds the overshoot plus the margin, so it scrolls **down**. The
probe verified both: `scrollTo(viewport, 0, -172)` moved a row from `y: 440` to
`y: 268` under a frame ending at `280`, and the frame did not move.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/notification-centre.tsx` | Add a `revealRow` ref to the context; call it after `focusElement` in `moveActive`; wrap the list in an unscrolled frame with a top sentinel and a measured `reveal`. |
| `packages/components/src/behaviour/notification-centre.test.tsx` | Two native cases: the arrow reveals a row below the viewport, and reveals one above a scrolled viewport. |
| `packages/components/docs/notification-centre.mdx` | Keyboard rule, limitation wording, verification count `17 → 19`. |
| `COMPONENTS.md` | Notification centre row: the reveal rule and `17 → 19` native tests. |
| `packages/components/src/inventory.ts` | Only if the limitation list needs the reveal sentence (the `testFile` and count are read from the suite/docs). |
| `.agents/slop/plans/README.md` | Index this plan as done once the gates pass. |
| `PLAN.md` | D30: record that the components workstream took `644` (`643` was taken twice, by playground and tokens-theme). |
| `TODO.md` | Add and tick the task under "Tier 2 hardening after the inventory closed". |

No new module, export, dependency, example or inventory record is needed.

## 4. Exact implementation

### 4.1 `packages/components/src/notification-centre.tsx` — context

In `NotificationCentreContextValue`, beside `rowRefs`, add:

```ts
  /** Bring one row into the list's visible box; a no-op when it already is. */
  readonly revealRow: RefObject<(id: string) => void>;
```

In `NotificationCentre`, beside `const rowRefs = useRef(...)`:

```ts
  const revealRow = useRef<(id: string) => void>(() => undefined);
```

Add `revealRow` to the context object and to its dependency array.

### 4.2 `NotificationCentre` — call it after focus

In `moveActive`, the `onSome: (element) => { renderer?.focusElement?.(element.id); }`
branch becomes:

```ts
              renderer?.focusElement?.(element.id);
              revealRow.current(item.id);
```

`revealRow` is a stable ref and must be added to the `moveActive` dependency
list only if lint requires it (it is a ref object, so it is stable; prefer adding
it for consistency with `rowRefs` usage elsewhere).

Do **not** reveal on open, on `readActive`, on a header action, or on a data
change. Plan 568 proves a prepend above a scrolled viewport must leave the
reader's row in place; a reveal keyed on `active` would fight that effect.

### 4.3 `NotificationCentreList` — the frame, sentinel and rule

Add two refs beside `viewport`:

```ts
  const frame = useRef<PublicInstance | null>(null);
  const sentinel = useRef<PublicInstance | null>(null);
```

Destructure `revealRow` and `theme` (already present) from the context.

Add the rule above the `if (notifications.length === 0)` return, because hooks
run unconditionally:

```ts
  const reveal = useCallback(
    (id: string) => {
      const row = rowRefs.current.get(id);
      const frameInstance = frame.current;
      const viewportInstance = viewport.current;
      const sentinelInstance = sentinel.current;
      if (
        row === undefined ||
        frameInstance === null ||
        viewportInstance === null ||
        sentinelInstance === null
      ) {
        return;
      }
      const frameBounds = renderer?.getElementBounds?.(frameInstance.id);
      const rowBounds = renderer?.getElementBounds?.(row.id);
      const sentinelBounds = renderer?.getElementBounds?.(sentinelInstance.id);
      if (
        frameBounds === undefined ||
        frameBounds === null ||
        rowBounds === undefined ||
        rowBounds === null ||
        sentinelBounds === undefined ||
        sentinelBounds === null
      ) {
        return;
      }
      const scrollTop = frameBounds.y - sentinelBounds.y;
      const margin = theme.spacing.sm;
      const above = rowBounds.y - (frameBounds.y + margin);
      const below =
        rowBounds.y + rowBounds.height - (frameBounds.y + frameBounds.height - margin);
      const next =
        above < 0 ? scrollTop + above : below > 0 ? scrollTop + below : scrollTop;
      if (next === scrollTop) return;
      renderer?.scrollTo?.(viewportInstance.id, 0, -Math.max(0, next));
    },
    [renderer, rowRefs, theme.spacing.sm],
  );

  useLayoutEffect(() => {
    revealRow.current = reveal;
    return () => {
      revealRow.current = () => undefined;
    };
  }, [reveal, revealRow]);
```

The JSX return becomes:

```tsx
  return (
    <div
      ref={frame}
      testId={testId === undefined ? undefined : `${testId}-frame`}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          maxHeight: 280,
          overflow: "hidden",
        },
        style,
      )}
    >
      <div
        {...rest}
        ref={setViewport}
        testId={testId}
        style={{
          display: "flex",
          flexDirection: "column",
          overflowY: "scroll",
          minHeight: 0,
          flexGrow: 1,
          flexShrink: 1,
        }}
      >
        <div ref={sentinel} style={{ height: 0, flexShrink: 0 }} />
        {Arr.map(rows, (row) => /* unchanged row/heading map */)}
      </div>
    </div>
  );
```

Notes for the executor:

- Keep `testId` on the **viewport**, so `offsetOf` and every existing wheel
  probe keep working. The new `-frame` id is the unscrolled visible box.
- `style` moves from the viewport to the frame; a caller's `maxHeight`/height
  therefore bounds the part, and the inner viewport fills it. This is the
  MessageScroller shape (plan 582) and is the reason the rule can measure a
  stable box.
- The caller `ref` stays on the scroll container (unchanged meaning).
- The empty state (`EmptyState`) is unchanged and renders outside the frame; a
  `reveal` with no refs is a no-op.
- Keep the prepend re-anchor effect untouched: it reads
  `getScrollOffset(viewport)` and calls `scrollTo(viewport)`. It only runs on a
  data change; `reveal` only runs on a key move, so the two cannot fight.

### 4.4 What must not change

- Arrow keys still move over notifications only; headings are skipped and ends
  clamp.
- Header actions still own their keys (plan 576) and do not move the cursor.
- Opening still focuses the panel surface and marks nothing read.
- The prepend re-anchor contract (plan 568) and its test.
- Caller `onScroll` and any other host handler on the list stay on the
  viewport.
- No `scrollIntoView` call: it under-scrolls on this binding (measured).

## 5. Test plan

Add two cases to `src/behaviour/notification-centre.test.tsx`, after the existing
arrow/Enter case. The suite's fixture helper `Centre` is reused; use 20 items so
the feed overflows.

```tsx
  it("reveals the row an arrow moves to below the viewport", () => {
    const items: ReadonlyArray<NotificationItem> = Array.from(
      { length: 20 },
      (_, index) => ({ id: `n${index}`, title: `Notification ${index}` }),
    );
    const root = renderComponent(<Centre notifications={items} defaultOpen />);
    const panel = root.renderer.findByTestId("panel");
    if (panel === undefined) throw new Error("behaviour: no panel");
    const frame = requireBounds(root, "feed-frame");

    Array.from({ length: 10 }).forEach(() => {
      root.renderer.nativeSimulateKeystrokes(panel.id, "down");
    });

    const row = requireBounds(root, "feed-n10");
    expect(root.renderer.getFocusedElementId?.()).toBe(
      root.renderer.findByTestId("feed-n10")?.id,
    );
    expect(row.y).toBeGreaterThanOrEqual(frame.y);
    expect(row.y + row.height).toBeLessThanOrEqual(frame.y + frame.height);

    root.unmount();
  });

  it("reveals the row an arrow moves to above a scrolled viewport", () => {
    const items: ReadonlyArray<NotificationItem> = Array.from(
      { length: 20 },
      (_, index) => ({ id: `n${index}`, title: `Notification ${index}` }),
    );
    const root = renderComponent(<Centre notifications={items} defaultOpen />);
    const panel = root.renderer.findByTestId("panel");
    if (panel === undefined) throw new Error("behaviour: no panel");
    const frame = requireBounds(root, "feed-frame");

    root.renderer.nativeSimulateScrollWheel(
      frame.x + frame.width / 2,
      frame.y + frame.height / 2,
      0,
      -400,
    );
    const scrolled = offsetOf(root);

    root.renderer.nativeSimulateKeystrokes(panel.id, "down");

    const row = requireBounds(root, "feed-n1");
    expect(row.y).toBeGreaterThanOrEqual(frame.y);
    expect(row.y + row.height).toBeLessThanOrEqual(frame.y + frame.height);
    expect(offsetOf(root)).toBeGreaterThan(scrolled);

    root.unmount();
  });
```

The terminal row `n9` is the last one reachable at 10 downs; `n10` is the
eleventh. The second case's `gain` is greater (less negative) because the reveal
scrolls back up.

Commands and expected results:

```sh
# Before the fix (the probe, not this file): 10 downs leaves n10 at y 511 under
# a visible box ending at 339; a wheel to -400 then one down leaves n1 at y -285.
# After the fix:
nub run --filter @gpuixui/components test:behaviour \
  src/behaviour/notification-centre.test.tsx
# expect 19 passed (the suite's 17 plus 2).

nub run --filter @gpuixui/components test
# expect the unit suite green (the inventory count check reads the new 19).

nub run --filter @gpuixui/components check-types
```

Both-direction proof (required):

1. remove `revealRow.current(item.id)` from `moveActive` but keep the frame,
   sentinel and the list's `reveal` wiring — both new cases fail on the row
   bounds, exactly as the probe did at `HEAD`;
2. restore it — both pass;
3. remove the `below` branch — the down case fails; remove the `above` branch —
   the up case fails.

If the binding is missing the suite reports `unsupported-host`: **STOP** and
report, never claim a pass.

## 6. Docs and ledger

- `packages/components/docs/notification-centre.mdx`
  - Keyboard: after "the ends clamp", add: "The feed scrolls the active row into
    view, with an 8 px margin, so the reading cursor never leaves the panel."
  - Limitations: replace the `focusElement` bullet's ending with "native focus
    follows it through `focusElement` on a best-effort basis, and the feed
    scrolls it into view (plan 644)."
  - Verification: change **17 tests** to **19 tests** and add "the arrow
    revealing an off-screen row in both directions".
- `COMPONENTS.md` Notification centre row: append the reveal rule and change
  "17 native behaviour tests" to "19 native behaviour tests".
- `packages/components/src/inventory.ts`: update the matching entry in
  `notificationCentreMeta.limitations` only if the old wording claims there is
  no reveal; keep the inventory check green.
- `.agents/slop/plans/README.md`: add `644` after `640` with a one-line
  measured summary.
- `PLAN.md` D30: append `644` and the reason it is not `643`.
- `TODO.md`: one ticked entry under "Tier 2 hardening after the inventory
  closed" naming the measured bounds, the frame/sentinel rule, the two new
  cases, the mutation proof and the synced docs.

## 7. STOP conditions

Stop and report (do not improvise) if any of these happen:

- the down case passes **before** removing `revealRow.current(...)` — the test
  is not proving the reveal;
- the frame's bounds move when the viewport scrolls — the frame is not
  unscrolled, so the measured rule is invalid; report the bounds instead of
  normalising them;
- the viewport is not bounded to 280 px with `flexGrow: 1` (it grows past the
  frame or collapses to zero) — the wrapper layout is wrong; go back to the
  probe in §2 rather than tuning the numbers;
- `getScrollOffset` is needed inside `reveal` — it throws at offset 0; use the
  sentinel;
- another worktree claimed `644` (re-check
  `ls /Users/cyberistic/GPUIXUI/workspaces/*/.agents/slop/plans/644-*`); take
  the next free number and record it in `PLAN.md` D30;
- the behaviour suite reports `unsupported-host`;
- `check-types` fails for a reason outside these files.

## 8. Acceptance

- [x] The arrow-down case fails with the reveal call removed and passes with it;
      the arrow-up case fails with the `above` branch removed.
- [x] The focused element is the reached row in both directions.
- [x] Both rows are fully inside the frame's box (with the 8 px margin).
- [x] A prepend above a scrolled viewport still leaves the reader's row in place.
- [x] Keyboard, header-action ownership, opening and read semantics are
      unchanged.
- [x] Docs, `COMPONENTS.md`, the inventory, the plan index, `PLAN.md` and
      `TODO.md` state the shipped rule and the 19-test count.
- [x] `nub run --filter @gpuixui/components test` (454 unit tests, plus any new
      assertions), `check-types`, and the targeted behaviour file pass.
- [x] `nub run check` and `nub run lint` pass at the repository root.
- [x] Commit and push `agent/components` with a `fix(components):` message and
      the plan number.

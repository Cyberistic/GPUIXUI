# Plan 206: Message Scroller — follow-new-content scrolling with a pinned reader

**Status: done (2026-10-18).** 11 rule tests, 10 native behaviour tests and one
both-theme matrix case; both-direction proofs recorded below.

## Why

A chat, a log, a streaming agent transcript and an activity feed all need the same
behaviour, and getting it wrong is immediately felt: new content arrives while the
reader is scrolled up, and either the view yanks them to the bottom (losing their
place) or it silently stops following and they never see the reply. This is one of
the main behaviours this library should provide, and it is being ported from
**shadcn/ui's Message Scroller** (`https://ui.shadcn.com/docs/components/base/message-scroller`),
credited in `LICENSES/`.

The behaviour, not the browser implementation: a scroll container that follows new
content while the reader is at the end, leaves them alone when they are not, and
offers an explicit way back to the latest.

## Current state

- No message/chat/scroller component exists in `COMPONENTS.md` or the source.
- GPUix provides `<virtual-list>` (verified in the research), scroll handles and
  `motion`; the pin/jump/stream state machine is ours.
- The compound-part API convention comes from plan `200`; follow it
  (`Root` / `Viewport` / `Item` / `JumpToLatest`), not a single mega-prop component.

### Measured against the installed 0.10.0 (2026-10-18, this worktree)

Probed in the real `TestRenderer` (`src/behaviour/_probe-scroll.test.tsx`, removed
after the probe) with a 200px `overflow: "scroll"` column of 40 × 20px rows:

| Need | Result |
| ---- | ------ |
| Scroll observation | `onScroll` fires; `deltaY` is **negative when scrolling down** toward the newest row, positive when scrolling up |
| Scroll offset | `useGpuixRequired().getScrollOffset(id)` → `[x, y]`, `y` negative |
| Distance from end | a 1px tail sentinel's `getElementBounds(id).y` is **below the viewport** while unpinned and equals `viewport.y + viewport.height` at the end — reliable even for offscreen bounds |
| Scroll to end | `renderer.scrollIntoView(tailId)` (or `scrollTo(id, 0, very negative)`, which clamps) |
| Wheel driving in tests | `nativeSimulateScrollWheel(x, y, 0, -80)` scrolls down 80px; `+80` scrolls up |
| Virtualization | `getListScrollTop(id)` exists for `<virtual-list>`, but its item prop shape cannot carry compound children; the measured fallback below is a plain scroll viewport |

**Decision:** implement the plain scroll viewport first (the plan's own STOP
condition 1 authorises it). `<virtual-list>` keeps its native `followTail`, but the
distance-from-end contract here is measured from the tail sentinel so it survives a
future virtualization swap; the non-virtualized limitation is recorded in
`COMPONENTS.md` and the docs page.

## Behaviour to implement

1. **Pinned reading.** While the reader is at (or within a small threshold of) the
   end, new items scroll into view. Threshold is a token, not a magic number.
2. **Do not steal the reader's place.** If they have scrolled up, new items do not
   move the viewport; instead the `JumpToLatest` affordance appears with an unread
   count.
3. **Jump to latest.** Activating it scrolls to the end and re-pins. A keyboard
   path must exist (the affordance is focusable, and `End` re-pins where the
   runtime supports it).
4. **Streaming rows.** An item can be appended to (a token stream); the scroller
   follows it only while pinned, and the item's height change must not fight the
   scroll position.
5. **Empty and short histories** render without a scrollbar and without the
   affordance.
6. **Long histories** use `<virtual-list>`; the pin decision must survive
   virtualization (measure from the end, not from absolute scroll height).

## API shape (target)

```tsx
<MessageScroller label="Conversation">
  <MessageScrollerViewport style={{ height: 320 }}>
    {messages.map((m) => (
      <MessageScrollerItem key={m.id}>{m.body}</MessageScrollerItem>
    ))}
  </MessageScrollerViewport>
  <MessageScrollerJumpToLatest />
</MessageScroller>
```

Named exports (not dot notation) so the package keeps one import style; the root
is `MessageScroller` rather than `MessageScrollerRoot`, exactly as `Carousel` is
not `CarouselRoot`. `MessageScrollerRoot` in the older shape is superseded.

Compound parts, a controlled `pinned` / `onPinnedChange` for consumers that need to
know, and no boolean-prop soup. Styling goes through the theme tokens; the parts are
plain enough to restyle — the shadcn rule.

## Steps (exact files)

1. **Pure state machine** — create `packages/components/src/message-scroller/logic.ts`:
   `MessageScrollerState { pinned, unread }`, `initial`, `observeScroll(state,
   { distanceFromEnd, threshold })`, `addItems(state, count)`, `requestLatest(state)`.
   No React, no GPUix, no Effect runtime (pure data).
2. **Pure test** — create `packages/components/src/message-scroller/logic.ts`'s suite
   beside it (`logic.test.ts`).
3. **Parts** — create `packages/components/src/message-scroller.tsx` exporting
   `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerItem`,
   `MessageScrollerJumpToLatest`, their props and `messageScrollerMeta`.
   - Root: context, `pinned`/`defaultPinned`/`onPinnedChange` through
     `internal/controllable.ts`, `role="group"` with required `label`, threshold
     defaults to `theme.spacing["2xl"]`.
   - Viewport: `overflow: "scroll"`, a `ref` to itself and to a 1px tail sentinel,
     `onScroll` computes `tail.y - (viewport.y + viewport.height)`, reports the
     observation, counts appended direct children and calls `addItems`, and a
     layout effect scrolls to the tail while pinned (covers appended rows and a
     taller streamed row on re-render).
   - Item: a `flexShrink: 0` row with the theme's small bottom gap; no surface.
   - JumpToLatest: only rendered while unpinned; a themed local `Button` (sm,
     secondary) whose text is `Jump to latest` or `N new messages`; activation
     calls `requestLatest` and the pinned layout effect scrolls.
4. **Behaviour suite** — create
   `packages/components/src/behaviour/message-scroller.test.tsx` (see test plan).
5. **Wiring** — add the module to `src/index.ts` and `src/inventory.ts`, add
   `examples/message-scroller.example.tsx` to `examples/index.ts`, and add the row to
   `docs/component-api.md` §8 (removing it from the planned table), `COMPONENTS.md`
   and `TODO.md`.
6. **Docs page** — create `packages/components/docs/message-scroller.mdx`: usage,
   behaviour table, API, theming, accessibility gaps, the non-virtualized limitation,
   and the shadcn/ui credit.
7. **Example** — create `packages/components/examples/message-scroller.example.tsx`: a
   bounded viewport, an "Append message" control, a "Stream a reply" control that
   grows the last row, and a "scroll up while streaming" instruction.
8. **Licence credit** — `LICENSES/shadcn-ui.md` is owned by the licensing workstream;
   if it does not exist, record a TODO instead of editing outside this workstream.
   The docs page credits the behaviour either way.

## Commands

Run from `workspaces/components`:

```sh
nub run --filter @gpuixui/components test            # logic + inventory; expect all pass
nub run --filter @gpuixui/components test:behaviour  # native suites; expect all pass
nub run --filter @gpuixui/components check-types
nub run check && nub run lint && nub run test        # the completion gate
```

Tail `TODO.md` and `COMPONENTS.md` only after the native suite passes and the
inventory's native-count check agrees with the row.

## Test plan

- **Unit (`logic.test.ts`, no window):**
  1. `observeScroll` pins at the end (`distance <= threshold`) and unpins beyond it;
  2. a pinned observation clears `unread`;
  3. `addItems` increments only while unpinned, and ignores `0`/negative counts;
  4. `requestLatest` pins and clears; it returns the same state when already there;
  5. an unpinned observation keeps `unread` (it is not silently cleared).
  Both directions: replace `distanceFromEnd <= threshold` with `true` → test 1
  fails; remove the `pinned` guard in `addItems` → test 3 fails.
- **Native (`behaviour/message-scroller.test.tsx`):**
  1. a 40-row history starts pinned at the end and the last row is painted;
  2. a short (2-row) history is pinned and shows no affordance;
  3. appending a row while pinned keeps the end in view and shows no affordance;
  4. scrolling up (wheel `+120`) then appending leaves `getScrollOffset` unchanged,
     shows the affordance and reports one unread;
  5. two more appends make it three;
  6. clicking `JumpToLatest` returns to the end, clears the affordance and reports
     `onPinnedChange(true)`;
  7. scrolling back down with the wheel re-pins and clears the count;
  8. growing the last row (same child count) while pinned keeps the end in view;
  9. growing it while unpinned leaves the offset unchanged;
  10. `onPinnedChange(false)` fires on the scroll-up.
  Both directions: always scroll after an append (delete the pinned guard) → tests
  4/9 fail; never scroll (delete the layout effect) → tests 1/3/6/8 fail.

## Acceptance

- [x] `MessageScroller` exists with compound parts and typed props.
- [x] Pinned / unpinned / streaming / empty / short-history states behave as above.
- [x] The pure state machine is unit-tested in both directions.
- [x] A docs page with a streaming example and a scroll-up-while-streaming example.
- [x] shadcn/ui credited on the page; `LICENSES/` credit recorded in `TODO.md`
      because that directory is owned by the licensing workstream.
- [x] Native suite passes, and the `COMPONENTS.md` row's count matches it.
- [x] Non-virtualized viewport recorded as the limitation (STOP condition 1).

**Proof of failure (recorded 2026-10-18):** with the pinned guard removed from
the layout effect, the native "does not yank a reader who scrolled up" test fails
with offset `-1113` instead of `-1081`; with the layout effect disabled, the
"starts pinned at the end" test fails with offset `0`. For the rules, replacing
the threshold comparison with `pinned = true` fails two `observeScroll` tests, and
removing `state.pinned ||` from `addItems` fails "ignores arrivals while pinned".
All four mutations were reverted before the recorded green run.

## STOP conditions

- `<virtual-list>` cannot report a reliable distance-from-end → implement against a
  non-virtualized viewport first and record the limitation; do not fake the pin.
  **This is the chosen path** (see "Measured" above); do not silently claim
  virtualization.
- The runtime has no scroll handle to observe → STOP and report; a timer-based
  approximation is not acceptable. (`onScroll` + `getElementBounds` were measured,
  so this does not apply.)
- `getElementBounds` on the tail clamps at the viewport edge → STOP; the distance
  contract needs an offscreen position.
- Anything needs a change outside this workstream's paths → add a TODO, do not edit
  another workstream's files.

## Maintenance notes

- The threshold and the unread semantics are product decisions; keep them in tokens,
  not literals.
- If a later GPUix release adds a native "stick to bottom" primitive, swap step 2 to
  it and keep the state machine — the behaviour is the contract, the primitive is an
  implementation detail.

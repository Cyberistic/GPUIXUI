# 300 — Message scroller feasibility: pin, no-yank, streaming and jump-to-latest

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts and the proof in §7/§8) |
| Phase | D (Tier 3/4 feasibility) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `152`, `166`, `183`, `198`, `206` |
| Feeds | `COMPONENTS.md` **Message scroller**; plan `206` step 5 and its native-smoke acceptance; the streaming-message behaviour plan `207` assumes |

## 1. Goal

Plan `206` defines the message-scroller behaviour — follow new content while the
reader is at the end, leave them alone when they are not, offer a way back — and
marks its native smoke test as blocked by B1. B1 is resolved, but the runtime
question it never asked is sharper than "does scrolling work":

- `<virtual-list>` has **no `onScroll`**. Its only scroll signal is
  `onVisibleRange`, whose payload is a *built-window* range that includes
  overdraw, so it is not a distance-from-end.
- Can a component still tell pinned from unpinned, exactly, on every gesture?
- Does the runtime follow an append, or must the component scroll?
- Does a growing last row (a token stream) keep the tail visible?
- What is the jump-to-latest call, and where does it land?

Measured on this host before writing this plan (temporary probe, deleted) with
60 messages × 30 px in a 300 px viewport, `estimatedItemHeight={30}`:

| Question | Measured |
| -------- | -------- |
| Initial state | a mount-time `renderer.scrollToItem(list, count)` anchors `[50, 0, 300]` (the max scroll for 60 rows) and paints rows 51–60 — a chat can open at the latest message with no `alignment`/`followTail` prop |
| Append while at the end | the runtime does **not** follow: with the app's follow effect removed the anchor stayed `[57, 20, 300]` after appending. With the effect it moved to the new max (`[51,0,300]` for 61 rows) |
| `onVisibleRange` payload | **lags one gesture and counts overdraw**: after a 400 px wheel up the readout still reported `endIndex = 66` (the pre-scroll window) while the view had moved to `[42,20,300]`; at the tail it reports `60–61` for 60 rows. It cannot derive distance-from-end |
| The live anchor *inside* the handler | `renderer.getListScrollTop(listId)` called in `onVisibleRange` returns the **post-scroll** anchor every time (`[42,20,300]` in the case above). This is the exact pin source |
| Pin from the stale payload | with `pinned = endIndex >= count` the app stayed pinned after the 400 px scroll up; the next append followed and **yanked** the reader (`[42,20]` → `[57,0]`) |
| Append while unpinned | the anchor does not move (`[42,20,300]` before and after), the new tail is not painted, and the unread count can increment — no yank |
| Jump to latest | `scrollToItem(list, count)` (the at-end sentinel) anchors the max scroll exactly and re-pins |
| Streaming growth while pinned | growing the last row 30 → 40 → 50 with a height effect re-pins: the anchor moved `57,0` → `57,10` → `57,20`, keeping the tail's bottom at the viewport bottom |
| Threshold | after a 10 px wheel up the anchor was `[57,10,300]` (10 px from the end); a 24 px threshold kept it pinned and the append followed |
| Short history | 3 × 30 px in the 300 px viewport: anchor `[0,0,300]`, the sentinel scroll is a no-op, no event fires on the content shrink, and all rows stay painted |
| API trap | `getListScrollTop` must be called **as a method** on the renderer; extracting it (`const read = renderer.getListScrollTop; read(id)`) throws `Cannot read properties of undefined (reading 'native')` |

So the behaviour is feasible, and the recipe is narrower than plan `206`
assumed: pin comes from the live anchor **read in the range handler**, never
from the payload; the component scrolls on append and on last-row growth; the
sentinel index is `count`.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/scroller-state.ts` | **new** — pure anchor → distance-from-end → pinned rules |
| `apps/playground/src/scenarios/scroller-state.test.ts` | **new** — unit tests for those rules |
| `apps/playground/src/scenarios/message-scroller.tsx` | **new** — the `message-scroller` scenario |
| `apps/playground/src/scenarios/index.ts` | import + register; add `"scroller"` to `PROBE_CAPABILITIES` |
| `packages/testing/src/smoke.ts` | add `"scroller"` to `CAPABILITIES` |
| `apps/playground/README.md` | a scenario section with the measured table and the recipe |
| `COMPONENTS.md` | capability row `scroller`; **Message scroller** row cites the scenario; suite `59 → 60` |
| `TODO.md` | add and tick the task with the counts |
| `PLAN.md` | D44 — the message-scroller pin comes from the live anchor, not the visible-range payload |
| `.agents/slop/plans/README.md` | index this plan; note the playground's next plan block is `300–399` |

No change to `packages/testing` beyond the capability literal: the host already
exposes `listScrollTop`, `wheel`, `click`, `advance`, `bounds` and `screenshot`.

## 3. The pure module

`scroller-state.ts`:

- `ScrollerAnchor` — `{ index, offsetInItem, viewportHeight }`, the shape
  `renderer.getListScrollTop` returns (null is converted at the call site).
- `scrollTop(heights, anchor): number` — the sum of the heights before `index`
  plus `offsetInItem`. Clamp `index` to `heights.length`.
- `contentHeight(heights): number`.
- `distanceFromEnd(heights, anchor): number` — `content - scrollTop - viewport`,
  clamped at 0 (a short history has no distance to the end).
- `isPinned(heights, anchor, threshold): boolean` — `distance <= threshold`.

These are pure and total; no Effect is involved (they are arithmetic over an
already-decoded anchor).

## 4. The scenario `message-scroller`, capability `scroller`

View: an 820 × 460 themed root; a 320 × 300 `<virtual-list testId="ms-list">`
with `estimatedItemHeight={30}`, **no** `alignment`/`followTail`; messages are
`{ id, height }` rows (`testId="ms-row-<id>"`, `height`, `flexShrink: 0`, one
`message <id>` text). State: `messages`, `pinned`, `unread`, plus refs for the
list, the live messages, pinned, previous count and previous last height.

Rules in the view:

- `scrollToEnd()` = `renderer.scrollToItem(list.current.id, messages.length)`;
  a mount effect calls it once, so the probe opens at the latest message.
- `onVisibleRange` **must** read `renderer.getListScrollTop(list.current.id)`
  and derive `pinned` with `isPinned(heights, anchor, 24)`. If the anchor is
  null, leave the state alone.
- An append effect on `messages.length` calls `scrollToEnd()` only while
  pinned. The unread count is incremented in the append handler while unpinned.
- A growth effect on the last row's height calls `scrollToEnd()` only while
  pinned.
- The jump control `ms-jump` is rendered **only when unpinned**; it sets
  pinned, clears unread and calls `scrollToEnd()`.
- Controls: `ms-append` (append one message), `ms-stream` (grow the last row by
  10 px, capped at 90), `ms-reset` (3 messages).
- Readouts: `ms-pin`, `ms-unread`, `ms-count`, `ms-anchor`, `ms-last-height`.

Steps:

1. **Opens at the latest.** Pinned `true`; anchor `[50,0,300]`; `message 60`
   painted and `message 1` not; `ms-jump` has no bounds.
2. **Follows while pinned.** Click `ms-append`; `count=61`; anchor
   `[51,0,300]`; `message 61` painted; pinned `true`.
3. **A single scroll up unpins.** `wheel("ms-list", 0, 400)`; pinned `false`;
   `ms-jump` painted; anchor `[42,20,300]`; `message 53` no longer painted.
4. **No yank.** Click `ms-append`; the anchor is still `[42,20,300]`; count 62;
   unread `1`; `message 62` is not painted.
5. **Jump re-pins.** Click `ms-jump`; pinned `true`; unread `0`; the anchor is
   the max scroll for 62 rows; `message 62` painted; `ms-jump` gone.
6. **Streaming while pinned.** Click `ms-stream` twice; `ms-last-height` is 50;
   the anchor moved (`57,10` then `57,20` in the probe); the last row's bottom
   equals the list's bottom within 1 px; pinned `true`.
7. **Threshold.** `wheel("ms-list", 0, 10)`; pinned `true` (10 px ≤ 24); append;
   the anchor moves to the new max and `message 63` is painted.
8. **Streaming while unpinned does not move the reader.** Wheel up 400; record
   the anchor; click `ms-stream`; the anchor is unchanged; pinned `false`.
9. **Short history.** Click `ms-reset`; count 3; pinned `true`; anchor
   `[0,0,300]`; all three painted; `ms-jump` absent; append; count 4 and all
   four painted.
10. Screenshot `apps/playground/.artifacts/screenshots/message-scroller.png`.

## 5. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground test` | exit `0`; `scroller-state.test.ts` passes |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only message-scroller` | exit `0`, every check passes |
| `nub apps/playground/dist/smoke/run.js` | `60/60`, exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 6. STOP conditions

- **STOP** if `getListScrollTop` inside `onVisibleRange` returns the *pre-scroll*
  anchor (the probe measured post-scroll). Pin would then need a second frame;
  record the sequence and do not ship a timer.
- **STOP** if `scrollToItem(list, count)` does not land at the max scroll for a
  variable-height last row (the probe used 30/40/50 px last rows and landed
  exactly). Record the new formula; do not hand-scroll.
- **STOP** if a growing last row shifts the reader while unpinned; that would
  make plan `206`'s streaming requirement infeasible without a height model.
- **STOP** if the tail row cannot be kept inside the viewport at max scroll;
  record the measured gap and treat the sentinel as approximate.
- **STOP** if the run exits `2`.

## 7. Test plan and two-direction proof

**Unit (`scroller-state.test.ts`):** at the tail (distance 0, pinned); 400 px up
(distance 220, unpinned at 24); 10 px up (distance 10, pinned at 24); a short
history (distance clamped to 0); a fixed anchor with a growing last row
(distance grows by the delta). Each test fails if the module returns a constant,
ignores `offsetInItem`, or omits the clamp.

**Native:** the scenario is the test. The reverse run that matters is the pin
source: replace the anchor read in `onVisibleRange` with
`event.endIndex >= messages.length` (the payload has overdraw and lags one
gesture), run `--only message-scroller`, and **step 3** must fail — the single
400 px scroll up is still reported as pinned. Revert and the suite is green
again. A second reverse run removes the growth effect; step 6 must fail with
the anchor still at `52,0` instead of `52,20`.

## 8. Landed — measured results

Run on 2026-10-18, this host, the locally built `darwin-x64` 0.10.0 binding.

| Command | Result |
| ------- | ------ |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground test` | exit `0`, 11 files / 84 tests (the new `scroller-state.test.ts` has 11) |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only message-scroller` | exit `0`, 51 checks |
| `nub apps/playground/dist/smoke/run.js` | `60/60`, exit `0` |

Measured in the scenario (the probe's numbers reproduced exactly):

- the chat opens at `[50,0,300]` with rows 51–60 painted and no affordance;
- an append while pinned follows to `[51,0,300]`;
- one 400 px wheel up lands on `[37,20,300]`, unpins and paints the affordance;
- an append while unpinned leaves `[37,20,300]`, counts `unread=1` and does not
  paint the new tail;
- jump-to-latest lands on `[52,0,300]` for 62 rows, clears unread and removes
  the affordance;
- two streamed rows (`30 → 50`) move the anchor `52,0 → 52,20` and keep the
  last row's bottom on the viewport bottom within 1 px;
- a 10 px scroll up stays pinned and the next append follows to `[53,20,300]`;
- a 400 px scroll up then a stream leaves the anchor untouched;
- the 3-row history sits at `[0,0,300]`, paints all three rows, offers no jump,
  and an append paints the fourth.

Two-direction proof: the stale-payload pin mutation failed `exit 1` at
`a single 400 px scroll up unpins the reader: expected "false", got "true"`;
removing the growth effect failed `exit 1` at `the pinned stream moves the
anchor with the row: expected "52,20", got "52,0"`. Both reverted; the suite is
`60/60`, exit `0`.

Landed note for `components`/plan `206`: the pin is
`isPinned(heights, anchor, 24)` over the anchor read in the range handler; the
seed is a mount-time `scrollToItem(list, count)`; a follow is a scroll to the
same sentinel on append **and** on last-row growth, only while pinned. There is
no `onScroll` to subscribe to and no at-end sentinel from `getListScrollTop`,
so do not persist or compare `itemIndex === count` — compare the distance.


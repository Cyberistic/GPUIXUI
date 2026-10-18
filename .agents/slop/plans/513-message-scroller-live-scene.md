# 513 — The last stateful page gets a live scene: a wheel step

**Status:** planned (2026-10-18) · **Phase:** F (showcase completeness) ·
**Owner:** docs-site
**Depends on:** `410`, `412`, `455`, `456`, `486`, `492`, `493`, `497`, `508`;
the shipped `@gpuixui/components` message-scroller record.

## 1. The defect this plan fixes

Plan `508` requires every delivered `stateful` record to ship a live GPUix scene
or a pinned, reasoned exception. One exception remains, recorded in
`apps/docs/src/components/preview/gaps.ts`:

```ts
export const STATEFUL_NO_LIVE_SCENE: ReadonlyMap<string, string> = new Map([
  [
    "message-scroller",
    "The pinned follow needs a scroll away from the tail and then an arrival; SceneStep has no wheel step and the viewport has no initial offset.",
  ],
]);
```

The reason was true when it was written but the capability is no longer missing:
the published renderer's automation API exposes a wheel gesture on every
locator (`globalThis.gpuix.getByTestId(id).wheel(deltaX, deltaY)` —
`references/gpuix/packages/native/js/automation/client.ts`, measured there), and
`MessageScrollerViewport` is a real scroll container that observes its own
scroll events. The scene grammar simply never grew the step.

`docs/preview-strategy.md` repeats the exception in prose. That is the document
a reader trusts, so leaving it after the code can prove the state is a truth
defect, not just missing coverage.

**One sentence for the plan's result:** a reader scrolls the live transcript
away from its tail and the component's real "Jump to latest" affordance appears;
`STATEFUL_NO_LIVE_SCENE` is empty, and a new stateful record still cannot ship
without a scene or a reason.

## 2. Files to change

All paths relative to the worktree root. **Do not edit `packages/*`,
`examples/*`, `apps/playground` or any `docs/*` document other than
`docs/preview-strategy.md`.** If a component change looks necessary, stop: this
plan is a docs-side capability, not a component API change.

### 2.1 `apps/docs/preview/scenes.ts`

1. Add `"message-scroller"` to `LIVE_SCENES`, after `"time-picker"` (the list is
   grouped by delivery order, not strictly alphabetical; keep it beside the
   other transcript/panel scenes).
2. Add its `SCENE_TEXT` entry. The affordance renders only while the scroller is
   **unpinned**, and its default label is this exact string:

   ```ts
   "message-scroller": "Jump to latest",
   ```

3. Extend `SceneStep` with the wheel gesture. The automation client's locator
   method is `wheel(deltaX, deltaY)`, so the step carries both deltas and
   defaults the horizontal one to `0`:

   ```ts
   /** Wheels over an element's painted centre; positive Y scrolls up. */
   | {
       readonly kind: "wheel";
       readonly testId: string;
       readonly deltaY: number;
       readonly deltaX?: number;
     }
   ```

4. Add the gesture. The viewport starts pinned to the tail; one wheel up is the
   real reader action that leaves the tail and un-pins it:

   ```ts
   "message-scroller": [
     { kind: "wheel", testId: "scene-message-viewport", deltaY: 600 },
   ],
   ```

   GPUix's wheel sign is inverted from CSS: **negative `deltaY` scrolls down**,
   positive scrolls up (recorded in plan `140` §4 and `PLAN.md` §5). Do not
   flip the sign to "match the browser".

5. Add the reader instruction, which must **not** contain
   `"Jump to latest"` (`scene-contract.test.ts` fails on a leak):

   ```ts
   "message-scroller": "Wheel up in the log to leave the tail.",
   ```

### 2.2 `apps/docs/scripts/smoke-live-preview.ts`

Teach the one gesture runner the new step. It already resolves a locator's
painted centre and lets GPUI hit-test the input; a wheel must go through the
same path.

In `runStep`, extend the action selection after the `press` branch and before
the fallback click:

```ts
step.kind === "wheel"
  ? `await ${target}.wheel(${step.deltaX ?? 0}, ${step.deltaY})`
  : `await ${target}.click(${step.button === undefined ? "" : `{ button: ${step.button} }`})`
```

The `target` expression already handles every non-`click-text` step by test id,
so no other change is needed. Update the file header's gesture sentence to say
"pointer, keyboard or wheel" rather than "pointer or keyboard".

### 2.3 `apps/docs/preview/scene-views.tsx`

Import the four parts by **subpath**, beside the other Tier 2 imports:

```ts
import {
  MessageScroller,
  MessageScrollerItem,
  MessageScrollerJumpToLatest,
  MessageScrollerViewport,
} from "@gpuixui/components/message-scroller";
```

Add the scene above `CarouselScene`:

- a `<Text role="h3">` heading and a caption that says the real component is
  mounted;
- a fixed row list of at least 12 short lines (a transcript of deploys), so the
  content is taller than the viewport and a wheel can move it;
- `MessageScroller label="Deploy log"` as the root;
- `MessageScrollerViewport testId="scene-message-viewport" style={{ height: 180 }}`;
- one `MessageScrollerItem` per row with a `<Text role="body">`;
- `MessageScrollerJumpToLatest label="Jump to latest"` — the explicit label is
  what puts the expected string in the view source the contract test reads, and
  it is the component's real public prop.

Register it in `LIVE_SCENE_VIEWS`:

```ts
"message-scroller": MessageScrollerScene,
```

The scene must **not** render the string outside the component (no state line
that says "Jump to latest"), or the smoke's absent-before assertion would pass
for the wrong reason.

### 2.4 `apps/docs/src/component-meta/entries.ts`

The `message-scroller` record currently has no `liveScene`. Add
`liveScene: "message-scroller"` in its options (beside `sourcePath`), so
`<NativePreview>` selects tier L and the page loop derives
`/docs/components/message-scroller`.

### 2.5 `apps/docs/src/components/preview/gaps.ts`

Empty `STATEFUL_NO_LIVE_SCENE` and rewrite its comment: the set is now empty
because the wheel step exists; it stays as a guard so a future stateful record
must add a scene or a measured reason. Keep the `NO_LIVE_SCENE` map unchanged
(already empty).

### 2.6 `apps/docs/src/components/preview/scene-contract.test.ts`

Add the record ↔ scene pair to `interactionScenes`:

```ts
["message-scroller", "message-scroller"],
```

No other assertion changes: the "every scene key equals its page slug" and
"every stateful record has a scene or reason" rules are data-driven.

### 2.7 `docs/preview-strategy.md`

Three edits, all derived values or measured prose:

1. Tier L's scene list: add **Message scrollers**.
2. **41 scenes ship today** → **42**; **19 scenes** → **20**
   (`preview-gaps.test.ts` derives both digits and fails otherwise).
3. The gesture table gains one row:

   ```md
   | Message scrollers | wheel up in the viewport | the scroller leaves the tail and paints its "Jump to latest" affordance |
   ```

4. Replace the **"Message scroller is the one stateful page without a live
   scene."** paragraph (and its continuation) with one sentence: every stateful
   page now has a live scene; the native suite still owns pinned follow after an
   append, which the scene does not claim to prove.

### 2.8 docs copies

- `apps/docs/README.md`: add **Message scrollers** to the live-scene list and
  change the gesture count **19** → **20** (the count guard reads this file).
- `apps/docs/content/docs/components/message-scroller.mdx`: under **States** (or
  immediately after the preview blocks), add one honest sentence: the live
  surface above proves the unpinned affordance painted by a real wheel; the
  native suite proves pinned follow and the unread count. Do not claim the scene
  proves an append.

### 2.9 `TODO.md` and the plan index

- `.agents/slop/plans/README.md`: add the `513` row under the docs table, status
  `in progress` then `implemented`.
- `TODO.md`: add the task at the top of **Docs site workstream**, `[~]` while
  working and `[x]` when the gates pass; update the progress count from
  `113/113` to `114/114` only after every gate below is green.

## 3. Commands and expected results

Run from the worktree root.

| Command | Expected |
| ------- | -------- |
| `nub run --filter docs test` | all files pass; the new scene row and empty exception set are covered by the existing `scene-contract` and `preview-gaps` suites |
| `nub run --filter docs build:preview` | the preview project builds; the new scene is in the bundle |
| `nub run --filter docs smoke:preview` | every scene, including `message-scroller`, reports a sized canvas; the gesture log says `opened by 1 step(s)`; exit `0` |
| `nub run --filter docs build` | SSR build succeeds (the page now selects tier L) |
| `nub run check` | test-quality, lint, format and types pass |
| `nub run lint` | pass |

If the full `smoke:preview` is slow, the scene can be observed first by opening
`/gpuix-preview/?scene=message-scroller&platform=win32&mode=dark` in the
preview server the script starts; do not substitute that for the gate.

## 4. Two-direction proofs (record the result in this plan before calling it done)

1. **Without the wheel step the scene cannot pass.** Temporarily remove the
   `message-scroller` entry from `SCENE_GESTURE`; run
   `nub run --filter docs smoke:preview`. Expected: it fails on
   `message-scroller` with "expected \"Jump to latest\" after 0 gesture step(s)"
   because the affordance is absent. Restore the entry and re-run: exit `0`.
2. **Without the record's `liveScene` the stateful guard fails.** Temporarily
   delete `liveScene: "message-scroller"` from `entries.ts`; run
   `nub run --filter docs test`. Expected: `scene-contract.test.ts` fails
   `give every stateful record a live scene or a measured reason` and names
   `message-scroller`. Restore and re-run.
3. **A stale expectation fails the contract.** Temporarily change `SCENE_TEXT`
   to `"Way back"`; run the docs tests. Expected: `keeps every expectation in
   the view that renders it` fails on `message-scroller`. Restore and re-run.

Record the three observed failures and the final green run in §6.

## 5. STOP conditions

- **The wheel does not move the viewport.** After the scene is mounted, wheel up
  produces no scroll event and the affordance never appears. Stop, capture the
  scene's `getAllText` before and after and the renderer's output, and write the
  measurement into this plan: keep `STATEFUL_NO_LIVE_SCENE` with the new,
  measured reason (and do not change the counts in `docs/preview-strategy.md`).
  A claimed scene that does not reach the state is worse than the exception.
- **The only way to make it pass is to start unpinned or to render the label
  outside the component.** That would make the absent-before assertion prove
  nothing. Stop and report; the plan does not authorise a prop that opens the
  state.
- **The scene needs a component change.** Stop and record the API ask in
  `TODO.md` under the docs workstream's cross-team list; do not edit
  `packages/components`.
- **The build or smoke cannot run** (no Chrome, no binding, no wasm). Exit `2`
  is not a pass; record the environment failure and stop.

## 6. Result

Implemented 2026-10-18. The wheel step moves the real scroll container in the
published wasm renderer; no component change was needed.

### The three two-direction proofs

1. **Without the gesture**, `SCENE_GESTURE` had no `message-scroller` entry. The
   smoke treated it as a static scene and failed before any step could run:

   ```text
   FAIL live scene message-scroller: expected "Jump to latest" in the GPUI
   tree (["Wheel up in the log to leave the tail.","Deploy log", … 16 rows])
   exit 1
   ```

   Restoring the wheel entry: `smoke: scene message-scroller opened by 1
   step(s) — 640x520 canvas, 18 text nodes`, exit `0`.

2. **Without the record's link**, `liveScene` was removed from the
   `message-scroller` record. Two tests failed and named it:

   ```text
   FAIL scene-contract.test.ts > interaction records > declare the live scene that documents them
   AssertionError: expected [ 'message-scroller: null' ] to deeply equal []
   FAIL scene-contract.test.ts > stateful records > give every stateful record a live scene or a measured reason
   AssertionError: expected [ 'message-scroller' ] to deeply equal []
   ```

   Restored: all 448 docs tests pass.

3. **A stale expectation**, `SCENE_TEXT["message-scroller"]` changed to
   `"Way back"`, failed the source guard by name:

   ```text
   FAIL scene-contract.test.ts > live scene table > keeps every expectation in the view that renders it
   AssertionError: expected [ 'message-scroller: Way back' ] to deeply equal []
   ```

   Restored: green.

### Final gates

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 65 files, 448 tests passed |
| `nub run --filter docs check-types` | passed (app and preview project) |
| `nub run --filter docs smoke:preview --no-build` | 42 scenes, `message-scroller` opened by 1 step on a 640×520 canvas (18 text nodes); every page loaded its iframe; exit `0` |
| `nub run check` | test quality, lint, format and types passed |
| `nub run test` | every workspace suite passed (docs 448) |

The exception set is empty. `STATEFUL_NO_LIVE_SCENE` stays in `gaps.ts` as the
guard, and the prose now states what the scene proves (the unpinned affordance)
and what the native suite still owns (pinned follow after an append).

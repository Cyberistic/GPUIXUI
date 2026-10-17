# 191 — Text selection in a real window

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §7) |
| Phase | B → F (release evidence) |
| Owner | playground workstream |
| Depends on | `100`, `163`, `189`, `190` |
| Feeds | the `selection` capability, the log viewer / code / diff copy claims, Phase G |

## 1. Goal

`text-selection` (plan `163`) proves the copy contract on the offscreen
`TestRenderer` through `renderer.dragSelect`. The **real window** has never
selected text: `smoke:live` has no selection scenario, even though
`@gpuix/native/automation` exposes `getSelectedText` and `clearSelection`, and
mouse drags already work (the panel and docking scenarios use them).

This plan adds `live-selection`:

- a real pointer drag across three text nodes selects exactly that text;
- a drag anchored inside `userSelect: "none"` selects nothing;
- a drag that **crosses** the opt-out skips it but keeps both sides;
- `clearSelection` and a plain click leave the selection empty.

The question is real: GPUI's selection listener is registered during paint, and
the headless probe needs `dragSelect`'s flush between steps. A live drag may
behave differently.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | `AsyncSmokeHost` gains `selectText(from, to)`, `selectedText()` and `clearSelection()` |
| `packages/testing/src/test-support.ts` | `nullAsyncHost` answers them (`null`/`null`/`void`) |
| `apps/playground/src/live/selection.ts` | **New** pure `selectionDrag(from, to)` → the two pointer points, mirroring `Native.selectText`'s measured geometry |
| `apps/playground/src/live/selection.test.ts` | **New** tests: start is inside the first box, end is past the right edge, a tall box's end is near its bottom — a mapping that ends short truncates the last glyph |
| `apps/playground/src/live/host.ts` | Implement the three verbs over `app.mouse.drag` + `app.call("getSelectedText"/"clearSelection")` |
| `apps/playground/src/live/scenarios.tsx` | Add `live-selection` (view = `textSelectionScenario.view`, capability `selection`) |
| `apps/playground/README.md` | Add the live row; correct "what it cannot assert" |
| `COMPONENTS.md` | Add `live-selection` to the `selection` row and the live paragraph |
| `TODO.md` | Add and tick the task |
| `.agents/slop/plans/README.md` | Index this plan; `100–191` used |
| `PLAN.md` | D36: the live host can select text with a real drag and read the selection; the selection verdict is no longer headless-only |

## 3. Implementation

### 3.1 The geometry mirrors the measured headless rule

`apps/playground/src/live/selection.ts`:

```ts
import type { Bounds } from "@gpuixui/testing";

/** Where a drag starts and ends to select `from` through `to`. */
export const selectionDrag = (
  from: Bounds,
  to: Bounds,
): { readonly start: { x: number; y: number }; readonly end: { x: number; y: number } } => ({
  start: { x: from.x + 2, y: from.y + 2 },
  end: { x: to.x + to.width, y: to.y + to.height - 2 },
});
```

`Native.selectText` uses `(from.x + 2, from.y + 2)` to
`(to.x + to.width, to.y + to.height - 2)`; the end is deliberately past the
right edge because a drag that stops inside the last glyph truncates it (plan
`163` §8). Keep the two rules identical.

### 3.2 The host verbs

In `apps/playground/src/live/host.ts`:

```ts
selectText: (fromTestId, toTestId) =>
  Effect.gen(function* () {
    const from = yield* verb(`select ${fromTestId} bounds`, () =>
      at(app, fromTestId).bounds(),
    );
    const to = yield* verb(`select ${toTestId} bounds`, () =>
      at(app, toTestId).bounds(),
    );
    const bounds = Option.all({
      from: Option.fromNullishOr(from),
      to: Option.fromNullishOr(to),
    });
    const points = yield* Option.match(bounds, {
      onNone: () =>
        Effect.fail(
          new Smoke.SmokeHostError({
            verb: `select ${fromTestId} -> ${toTestId} bounds`,
            cause: "bounds missing",
          }),
        ),
      onSome: (pair) => Effect.succeed(selectionDrag(pair.from, pair.to)),
    });
    yield* verb("select drag", () =>
      app.mouse.drag(points.start, points.end, { steps: 12 }),
    );
    yield* Effect.sleep(Duration.millis(DRAG_FRAME_MS));
    return yield* verb("select read", () =>
      app.call("getSelectedText", {}).then((result) => result.text),
    );
  }),
selectedText: () =>
  verb("selectedText", () =>
    app.call("getSelectedText", {}).then((result) => result.text),
  ),
clearSelection: () =>
  verb("clearSelection", () =>
    app.call("clearSelection", {}).then(() => undefined),
  ),
```

A missing bound is `SmokeHostError` with the verb naming the testId — never a
drag to `(0,0)`.

### 3.3 The scenario

`apps/playground/src/live/scenarios.tsx`:

```ts
const selection: LiveScenario = {
  id: "live-selection",
  title: "Live selection: a real drag copies text and skips chrome",
  capability: "selection",
  view: textSelectionScenario.view,
  ready: "select-heading",
  steps: ...
};
```

1. `selectText("select-heading", "select-body-2")`; assert it contains
   `Selection heading`, `first line`, `second line`.
2. `selectText("select-toolbar", "select-after")`; assert it is empty (the drag
   is anchored in `userSelect: "none"`).
3. `selectText("select-body-2", "select-after")`; assert both sides are present
   and `toolbar chrome` is **not**.
4. `clearSelection`; `selectedText` is empty/null.
5. `click("select-body-1")`; `selectedText` is still empty.
6. screenshot `apps/playground/.artifacts/live/live-selection.png`.

`selectText` returns the selection directly, so the assertions read it once; the
scenario settles before the click check.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/testing test` | 42 tests pass |
| `nub run --filter playground test` | 9 files (was 8), 61 tests pass |
| `nub run --filter playground check-types` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `56/56`, exit `0` (unchanged) |
| `nub apps/playground/dist/live/run.js` | `10/10`, exit `0`, `live-selection` checks pass |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 5. STOP conditions

- **STOP** if the drag selects nothing in a live window after the drag is paced
  and read after a frame. Record the measured selection (or `null`) and keep no
  passing check; do not add a `dragSelect` helper (the live protocol has none)
  and do not claim selection live.
- **STOP** if `getSelectedText` is a different coordinate/selection model in the
  live renderer than in `TestRenderer`; record the difference and leave the
  headless verdict as the only one.
- **STOP** if the live run exits `2` (no window).

## 6. Test plan

- `selection.test.ts` (can fail): a mapping that starts at the box origin or ends
  at `x + width - 2` must fail the assertions; the end must be past the right
  edge and near the bottom for a two-line box.
- Live two-direction proof: end the drag at `to.x + 2` instead of
  `to.x + to.width`; expect `live-selection` exit `1` with the truncated/missing
  text. Restore. Record both runs in §7.
- The headless `text-selection` suite must stay green (it shares the view).

## 7. Measured results

Run on this host (Intel macOS, locally built `@gpuix/native@0.10.0`, ADR 0003),
2026-10-18.

**A real drag selects in a live window.** `live-selection` (0.6 s) records 9
checks, and the live suite is `10/10`, exit `0`:

```
a live drag selects the heading
a live drag selects the first body line
a live drag selects the second body line
a drag anchored in userSelect none selects nothing
the text before the chrome is selected
the text after the chrome is selected
userSelect none is excluded from the crossing drag
clearSelection empties the live selection
a click does not select
```

The `(x + 2, y + 2) → (x + width, y + height - 2)` mapping is the headless
`Native.selectText` rule and transfers unchanged. The crossing drag keeps both
sides and excludes `toolbar chrome`, so the `userSelect: "none"` contract is real
in a window. `getSelectedText`/`clearSelection` answer over the automation
protocol; the only harness work is the drag.

**Two-direction proofs**

| Mutation | Result |
| -------- | ------ |
| end the drag at `to.x + 2` instead of `to.x + to.width` | exit `1`: `a live drag selects the second body line: expected a string containing "second line", got "Selection heading\nfirst line"` — it stopped inside the line |
| the same change against `selection.test.ts` | the "ends past the last box's right edge" test fails (`end.x` is no longer `> x + width - 1`) |

Both were reverted; the suite re-ran green. The screenshot artefact is
`apps/playground/.artifacts/live/live-selection.png`.

## 8. Acceptance

- `AsyncSmokeHost` exposes the three selection verbs; the host implements them
  with a real drag; the geometry mapping has a failing-without-the-fix test.
- `live-selection` passes and fails in the recorded reverse direction.
- README, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index state the new
  evidence and no longer call selection headless-only.

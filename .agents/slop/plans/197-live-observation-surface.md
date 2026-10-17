# 197 — The renderer is the live observation surface (part 2): highlights and list anchors

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts and both proofs in §11) |
| Phase | F (live runtime evidence) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `140`, `171`, `185`, `189`, `190` |
| Feeds | the `search` and `virtual-list` capabilities in the live suite; `COMPONENTS.md` **Search inputs**, **Find bar**, **Virtualized lists**, **Persistent panel state** |

## 1. Goal

`COMPONENTS.md` still says "colour, accessibility, virtual-list anchors and
highlights stay `TestRenderer`-only: the automation protocol does not expose
them." That sentence is **partly wrong**, in exactly the way plan `190` found
focus was wrong: the protocol has no verb for them, but the **live runner owns
the renderer it created**, and the renderer exposes both:

- `GpuixRenderer.getPaintedHighlights(): HighlightMatch[]`
- `GpuixRenderer.getListScrollTop(elementId): [index, offsetInViewportPx, viewportHeightPx] | null`
- `GpuixRenderer.scrollToItem(elementId, index, offsetInItem?)`
- `GpuixRenderer.scrollIntoView(elementId)`

Measured in this worktree before writing this plan (temporary probe, deleted):

| Call | Live window result |
| ---- | ------------------ |
| `getPaintedHighlights()` on the mounted `search-highlights` view | `30` washes; first `{elementId: 1, sub: 0, text: "The error handler logs an error.", start: 4, end: 9, active: true, rects: [{x: 68.44, y: 30, width: 31.45, height: 20}]}` |
| `getListScrollTop(vtableId)` before any scroll | `[0, 0, 258]` |
| after `scrollToItem(vtableId, 120)` | `[120, 0, 258]` |
| `getTree()` node in the live window | `{id, type, testId, bounds}` — **no `style`** |
| `GpuixRenderer` a11y | **no method**; `getA11yTree` exists only on `TestRenderer` |

So this plan closes two of the four caveats with real-window evidence and makes
the remaining two precise:

- **close**: painted highlights and virtual-list anchors are observable live;
- **keep, with evidence**: the authored style report and the accessibility dump
  are *not* on the live renderer, so colour and a11y stay `TestRenderer`-only.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | `AsyncSmokeHost` gains `highlights`, `scrollToItem`, `listScrollTop`; add the shared `decodeHighlights` boundary rule; update the interface doc |
| `packages/testing/src/test-support.ts` | `nullAsyncHost` implements the three verbs |
| `packages/testing/src/native.ts` | use `decodeHighlights` instead of its local map/decode |
| `packages/testing/src/smoke.test.ts` | tests for `decodeHighlights` (valid kept, malformed dropped, offsets preserved) and an async scenario reading the new verbs |
| `apps/playground/src/live/host.ts` | implement the three verbs over the renderer (never over the protocol) |
| `apps/playground/src/live/scenarios.tsx` | new `live-highlights`; extend `live-table` with anchor checks; register in `liveScenarios` |
| `apps/playground/README.md` | live-suite section: new scenario id, the renderer-owned verbs, the corrected limitation |
| `packages/testing/README.md` | the async host paragraph |
| `COMPONENTS.md` | capability rows `search` and `virtual-list` cite the live scenario; correct the "stays TestRenderer-only" paragraph; live count `13 → 14` |
| `TODO.md` | add and tick the task; correct the live-suite counts |
| `PLAN.md` | D41 — the renderer, not the protocol, is the live observation surface for focus, selection, highlights and list anchors; style/a11y stay headless |
| `.agents/slop/plans/README.md` | index row; playground block is now `100–197` |

## 3. The new async verbs

In `packages/testing/src/smoke.ts`:

```ts
export interface AsyncSmokeHost {
  // …existing verbs unchanged…
  /** Every highlight wash the last frame painted, decoded at the adapter. */
  readonly highlights: () => Effect.Effect<
    ReadonlyArray<HighlightMatch>,
    SmokeHostError
  >;
  /** Scrolls a `<virtual-list>` `testId` to the row at `index`. */
  readonly scrollToItem: (
    testId: string,
    index: number,
    offsetInItem?: number,
  ) => Effect.Effect<void, SmokeHostError>;
  /**
   * A `<virtual-list>`'s logical anchor `[itemIndex, offsetInItemPx,
   * viewportHeightPx]`, or `null` for a non-list element.
   */
  readonly listScrollTop: (
    testId: string,
  ) => Effect.Effect<readonly [number, number, number] | null, SmokeHostError>;
}
```

The names and shapes mirror `SmokeHost` exactly (`highlights`, `scrollToItem`,
`listScrollTop`), so a scenario author moves between the two hosts without
learning a second vocabulary.

Add the shared boundary rule (both adapters use it, which is why it is worth a
unit test):

```ts
/**
 * The renderer's highlight payload, decoded. A malformed wash is dropped, not
 * fatal: one bad quad must not hide the rest of the frame.
 */
export const decodeHighlights = (
  payloads: ReadonlyArray<unknown>,
): ReadonlyArray<HighlightMatch> =>
  Arr.getSomes(
    Arr.map(payloads, (payload) => Schema.decodeUnknownOption(HighlightMatch)(payload)),
  );
```

`native.ts`'s `highlights` becomes `decodeHighlights(renderer.getPaintedHighlights())`.

## 4. The live adapter (`apps/playground/src/live/host.ts`)

```ts
highlights: () =>
  Effect.try({
    try: () => Smoke.decodeHighlights(renderer.getPaintedHighlights()),
    catch: (cause) => new Smoke.SmokeHostError({ verb: "highlights", cause }),
  }),
scrollToItem: (testId, index, offsetInItem) =>
  verb(`scrollToItem ${testId}`, () =>
    idOf(app, testId).then((elementId) => {
      renderer.scrollToItem(elementId, index, offsetInItem);
    }),
  ),
listScrollTop: (testId) =>
  verb(`listScrollTop ${testId}`, () =>
    idOf(app, testId).then((elementId) => {
      const anchor = renderer.getListScrollTop(elementId);
      return anchor === null
        ? null
        : ([anchor[0], anchor[1], anchor[2]] as const);
    }),
  ),
```

The host type gains `Pick<GpuixRenderer, "getFocusedElementId" | "getPaintedHighlights" | "getListScrollTop" | "scrollToItem">`
instead of the current single-method pick. Update the module doc: it currently
claims style/a11y/anchors are "deliberately absent"; it must say **why** each
one is absent (no renderer method vs no protocol verb).

## 5. The scenario `live-highlights`, capability `search`

Mount `searchScenario.view()` (the shipped probe; no new view). `ready:
"search-doc"`. Steps, each reading followed by `settle`:

1. **Washes paint in a window** — `highlights()`; filter to the document's two
   lines (`The error handler logs an error.`, `An Error is not the same as
   errors.`); expect exactly `4`.
2. **Offsets address the run** — every document wash's
   `text.slice(start, end)` lowercases to `"error"`.
3. **Geometry is window space and inside the line** — `bounds("search-line-1")`;
   each wash's rects are `height > 0`, start at or after the line's top-left
   (1 px tolerance), and end within its right/bottom edge (1 px). This is the
   same rule the headless scenario asserts, now in a real window.
4. **Clearing removes the paint** — `click("search-clear")`; `settle`;
   document washes `0`. **Restoring repaints** — `click("search-restore")`;
   document washes `4`.
5. **The find cursor moves** — `click("search-next")`; exactly one document wash
   is `active`, and it is the second one (index `1`). The headless run measured
   the same; a live difference is a real finding, not a tolerance.
6. **A virtual list numbers matches document-wide** — `scrollToItem("search-list", 90)`;
   `settle`; row washes (`text` starts with `"error at row"`) are non-empty,
   exactly one is active, and its `text` contains `"row 90"` (the probe sets
   `matchIndexOffset: row` and `activeIndex: 90`).
7. Screenshot `apps/playground/.artifacts/live/live-highlights.png`.

Do **not** assert `search-total`/`search-count-readout` in this scenario unless
the live frame delivers `onHighlight`: the washes come from the renderer and are
the evidence this plan adds. If `onHighlight` is observed to work live, record it
in §9 and add the readout check then.

## 6. `live-table` gains the exact anchor

After the existing row click:

1. read `listScrollTop("vtable")` → `[0, 0, h]` with `h > 0`; remember `h`.
2. `scrollToItem("vtable", 120)`; `settle`; read again → `[120, 0, h]`
   **exactly** (same viewport height; a changed height means the element resized,
   which is a real failure).
3. `wheel("vtable-viewport", 0, -300)`; `settle`; the new anchor's index is
   `> 0` (the wheel moved the window) and the earlier clicked row's selection
   still reads `r3` (the existing check keeps that).

## 7. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/testing test` | exit `0`; the new `decodeHighlights` and async-verb tests pass (test count rises by 2) |
| `nub run --filter playground test` | exit `0`, unchanged |
| `nub run --filter @gpuixui/testing check-types` | exit `0` |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `58/58`, exit `0` (unchanged: no headless scenario changes) |
| `nub apps/playground/dist/live/run.js` | `14/14`, exit `0`; `live-highlights` and the extended `live-table` green |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` |

## 8. STOP conditions

- **STOP** if `getPaintedHighlights()` returns an empty array for the mounted
  search view in a live window (the recon saw 30). Record the empty result and
  the scenario as unsupported — do not weaken the check to "maybe".
- **STOP** if `getListScrollTop` returns `null` for the live `<virtual-list>`
  after `scrollToItem` (the recon saw `[120, 0, 258]`). Record it.
- **STOP** if `scrollToItem` moves the paint but not the anchor, or the anchor
  but not the paint — that is a real divergence and must be documented, not
  smoothed away.
- **STOP** if either suite exits `2`; that is no evidence, not a pass.
- **STOP** if the live tree turns out to carry `style` after all (it did not in
  the recon): then this plan must be extended to a `live-theme` scenario rather
  than leaving colour headless.

## 9. Test plan and two-direction proof

Unit tests (`packages/testing/src/smoke.test.ts`):

- `decodeHighlights` keeps a valid payload verbatim (elementId, sub, text,
  `start`/`end`, `active`, rect geometry).
- `decodeHighlights` drops a malformed wash (e.g. a rect with a string `width`)
  while keeping the valid one beside it — the rule that makes one bad quad
  non-fatal.
- an `asyncScenario` reading `listScrollTop` reports the tuple through
  `expectSome`/`expectEqual`, proving the verb is part of the runner's host
  contract.

Live two-direction proofs (run, record the exact output, then revert):

1. **Anchor direction** — change the `live-table` expectation from `120` to
   `121`; the live suite must exit `1` naming the anchor check. Revert.
2. **Highlight direction** — make the live host return `[]` from `highlights`
   (or change the expected document-wash count to `3`); `live-highlights` must
   fail and the suite exit `1`. Revert.

Both proofs plus the measured live numbers go in §9 of the implementation commit
message and in the plan's Status line when landed.

## 10. Acceptance criteria

- `live-highlights` proves washes, geometry and the find cursor in a real
  window, and the virtual-list numbering contract live.
- `live-table` proves an exact `[index, offset, viewport]` anchor live.
- `COMPONENTS.md` no longer claims anchors and highlights are
  `TestRenderer`-only, and states precisely why colour and a11y still are
  (no renderer method / no protocol verb).
- All commands in §7 pass; both two-direction proofs were run and recorded.

## 11. Landed — measured results

Run on 2026-10-18, this host, the locally built `darwin-x64` 0.10.0 binding.

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/testing test` | 45 tests pass (was 42; +3: two `decodeHighlights`, one async-anchor contract) |
| `nub run --filter playground test` | 10 files / 73 tests pass |
| `nub run --filter @gpuixui/testing check-types` | exit `0` |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `58/58`, exit `0` |
| `nub apps/playground/dist/live/run.js` | `14/14`, exit `0`, capabilities incl. `search` |

Measured in the live window:

- `live-highlights`: four document washes, rects inside `search-line-1`, clear →
  `0`, restore → `4`, `next` → active index `1`, and after
  `scrollToItem("search-list", 90)` exactly one active row wash whose text is
  `row 90`. The `onHighlight` readout was **not** asserted in the live scenario;
  the washes are the renderer's own report and the scenario's evidence.
- `live-table`: `getListScrollTop("vtable")` = `[0, 0, 258]` before any scroll,
  `[120, 0, 258]` after `scrollToItem("vtable", 120)` — the viewport height is
  unchanged by the jump.
- The live automation tree returns `{id, type, testId, bounds}` for a styled
  probe div — **no `style`**; `GpuixRenderer` has no `getA11yTree`.

Two-direction proofs (each run, then reverted):

1. expected anchor index `120 → 121` → `live-table` FAIL, exit `1`:
   `scrollToItem anchors the row: expected 121, got 120`; capability `table=failed`.
2. expected document washes `4 → 3` → `live-highlights` FAIL, exit `1`:
   `the document paints one wash per match in a live window: expected 3, got 4`;
   capability `search=failed`.

`TODO.md`, `COMPONENTS.md`, `PLAN.md` (D41), both READMEs and the plan index are
updated to match.

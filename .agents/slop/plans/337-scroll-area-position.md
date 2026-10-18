# 337 — `ScrollArea` must report where it is, not only how far it moved

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `020`, `041`, `047`, `072`, `203` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the two-direction
proof, §6 STOP conditions, §7 outcome (filled after the run), §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, this host, 0.10.0)

The package documents `ScrollArea` as position-blind:

- `docs/scroll-area.mdx` §API: *"`onScroll` reports a delta, not a position:
  there is no `onScrollChange` and no absolute offset in `EventPayload`. A
  consumer that needs a position accumulates deltas itself and clamps at the
  content's ends."*
- `COMPONENTS.md` → Scrollable containers: *"there is no absolute offset
  (`onScrollChange`)"*.
- `docs/gpuix-capabilities.md` §3: the workaround for the missing
  `onScrollChange` is *"accumulate `onScroll` deltas"*; §6.5 says *"a component
  that needs an offset owns it"*.

Two of those statements conflate the **event payload** with the **runtime**. The
event carries no offset, but the published `NativeRenderer` has
`getScrollOffset(elementId)` (`@gpuix/native` `host.d.ts`), and `ScrollArea`
itself already calls it in its own key handler (`ScrollArea.tsx` `onKeyDown`).
So the offset is available; the wrapper just never reports it.

A probe (a temporary runtime file, deleted after recording) mounted a labelled
`ScrollArea` — 120 px viewport, 600 px of content — with an `onScroll` that
recorded the event's keys and the offset the renderer returned *inside* the
handler, then wheeled once and pressed PageDown:

| Step | `onScroll` calls | `Object.keys(event)` | `getScrollOffset(id)` inside the handler |
| ---- | ---------------- | -------------------- | ---------------------------------------- |
| `wheel("s", 0, -100)` | 1 | `elementId`, `eventType`, `x`, `y`, `deltaX`, `deltaY`, `precise`, `touchPhase`, `modifiers` | `[0, -100]` — **already the post-scroll offset** |
| `keyDown("s", "pagedown")` (region focused) | **0** | — | not called |

The region did move (its offset was non-zero after the key), but the caller was
told nothing. That is the defect: **the only position signal a consumer has is a
delta, and the keyboard path — this component's own contract (plan `072`) —
dispatches no delta at all.** A consumer that accumulates `onScroll` deltas is
therefore silently wrong after every arrow/page/Home/End press, and cannot
distinguish "still at the top" from "the runtime clamped a programmatic scroll".

A second probe called `renderer.scrollTo(id, 0, -100000)` and read the offset
back **synchronously**, without a flush: `[0, -480]` — the runtime applies the
scroll and *clamps* it before `scrollTo` returns. So the keyboard path can report
the real, clamped position immediately; no deferred read is needed.

## 1. The decision

**`ScrollArea` reports its absolute position whenever the position changed.**
`onScrollPositionChange(position)` fires after a wheel/trackpad scroll and after
each of the component's own keyboard moves. It reports the offset the runtime
actually holds (so a clamped `End` reports the end of the content, not the
computed target), and it stays silent when a scroll attempt did not move the
region (already at an edge, or a key for the wrong axis).

`onScroll` is unchanged and still receives the raw delta event — precise/touch
phase facts live only there.

The callback is a **report**, not a controlled value: there is no
`scrollPosition` prop. A controlled scroll position would have to distinguish
"the caller set it again" from "the user moved", which is a state machine the
primitive does not need.

### 2b. The handle (amended during implementation)

The first draft told the caller to move the region through its host `ref` and
`renderer.scrollTo`, and the docs snippet exposed the flaw: **no primitive
exposes a public `ref`**, so that advice did not compile and the region could not
be moved from code at all. A `ScrollArea` that reports a position but cannot be
sent to one is half a primitive, and a raw `renderer.scrollTo` dispatches no
event — so the position state would drift immediately after the caller's own
move.

`ScrollArea` therefore takes a `ref` of `ScrollAreaHandle`:

```ts
export interface ScrollAreaHandle {
  readonly element: PublicInstance | null; // for renderer.getElementBounds
  readonly scrollTo: (target: Partial<ScrollPosition>) => void;
}
```

`scrollTo` reads the current offset, fills an omitted axis from it, calls
`renderer.scrollTo` (the runtime clamps), then `reportPosition()` — so a
programmatic move and a user move are reported the same way. It is the library's
first `useImperativeHandle`; it is the React API for exactly this, and the
alternative (a controlled position prop) is the state machine rejected above.

## 2. The rule

1. New public type, exported from the component and the package root:

   ```ts
   /** An absolute scroll offset. `y` is `0` at the top and negative below it. */
   export interface ScrollPosition {
     readonly x: number;
     readonly y: number;
   }
   ```

2. New prop:

   ```ts
   readonly onScrollPositionChange?: (position: ScrollPosition) => void;
   ```

3. One reporter in the wrapper — the only place that may read the renderer:

   ```ts
   const last = useRef<ScrollPosition>({ x: 0, y: 0 });
   const report = (): void => {
     const id = root.current?.id;
     if (id === undefined) return;
     const offset = renderer?.getScrollOffset?.(id);
     if (offset === undefined || offset === null) return;
     const position = { x: offset[0], y: offset[1] };
     if (position.x === last.current.x && position.y === last.current.y) return;
     last.current = position;
     props.onScrollPositionChange?.(position);
   };
   ```

   Absence is `Option`-shaped at the boundary: a renderer without
   `getScrollOffset`, or a `null` offset, reports nothing rather than inventing
   `{0, 0}`.

4. The wrapper composes the caller's `onScroll` and the reporter, and passes the
   composed handler to `renderScrollArea` (which stays pure and unchanged):

   ```ts
   const onScroll = (event: EventPayload): void => {
     props.onScroll?.(event);
     report();
   };
   return renderScrollArea({ ...props, onScroll }, theme, { ... });
   ```

5. The keyboard path calls `report()` after `renderer.scrollTo(...)`. Measured
   (§0), the offset is already applied and clamped at that point. If `scrollTo`
   is unavailable, `report()` reads the unchanged offset and stays silent.

6. The initial position is `{0, 0}` and is never reported; the callback is a
   *change* signal, like `onValueChange`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/ScrollArea.tsx` | `ScrollPosition`, `ScrollAreaHandle`, `onScrollPositionChange`, the reporter, the composed `onScroll`, the keyboard report and the `ref` handle; update the header and the `onScroll` docstring |
| `packages/primitives/src/components/index.ts` | export the `ScrollPosition` and `ScrollAreaHandle` types |
| `packages/primitives/examples/layout.example.tsx` | the inspector footer gains a live position readout driven by the callback |
| `packages/primitives/examples/index.ts` | no change (the `layout` entry already exists) |
| `packages/primitives/src/components/ScrollArea.test.tsx` | the pure renderer still forwards the caller's `onScroll`; the callback is not a host prop |
| `packages/primitives/runtime/layout.runtime.test.tsx` | four cases: wheel reports the absolute offset, the keyboard reports the clamped offset, no movement reports nothing, and an unlabelled area still reports on the wheel |
| `packages/primitives/runtime/examples.runtime.test.tsx` | the inspector's readout follows a wheel scroll |
| `packages/primitives/docs/scroll-area.mdx` | API table row, a "Scroll position" section, corrected Limitations |
| `packages/primitives/README.md` | the scroll row's false "absolute offset absent" claim |
| `docs/gpuix-capabilities.md` | §3 `onScrollChange` workaround, the sticky-positioning workaround, §6.5 |
| `COMPONENTS.md` | the Scrollable containers row |
| `TODO.md` | tick the new task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

Do **not** edit `packages/components`, `packages/tokens`, `packages/icons` or
`apps/*`. The `layout.example.tsx` change is inside this package's own examples.

## 4. Commands and expected results

Run from the worktree root unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/ScrollArea.test.tsx` | the new element-tree case and the existing region cases pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 41 files / 543 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/layout.runtime.test.tsx runtime/examples.runtime.test.tsx` | the six new cases pass; every existing scroll case stays green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 22 files / 358 tests) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run check` | exit 0 (`check:tests`, lint, format, types) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If the import
fails with `MissingNativeBindingError`, stop (§6).

## 5. Test plan

Every test must be able to fail. Write them first, run against the unwired code,
and record the failing assertion in §7.

### 5.1 The runtime contract (`runtime/layout.runtime.test.tsx`)

All measured on the standard `1280 × 800` window. The existing `scrollScene`
helper (600 px of content in a 120 px viewport) is reused.

1. **"reports an absolute position after a wheel scroll"** — a labelled area with
   `onScrollPositionChange`; wheel `deltaY -100`. Assert the callback ran once
   with `{x: 0, y: -100}` and that the raw `onScroll` delta was also delivered.
   Before: the prop does not exist / no call.
2. **"reports the clamped position after a keyboard scroll"** — focus the
   region, press `PageDown`, `Home`, then `End`. Assert the positions equal what
   `runtime.scrollOffset("s")` reports after each key (`End` is `-480` because
   the runtime clamps it). This is the defect's core direction: before, the
   keyboard produced **zero** `onScroll` calls.
3. **"does not report a position that did not change"** — at the top, wheel
   `deltaY +100` (the direction that cannot move it) and press `Home`; assert the
   callback was not called. Guards against a reporter that fires on every
   attempt.
4. **"reports a position for an unlabelled area"** — an inert container still
   scrolls and still reports on the wheel; the callback must not be tied to the
   keyboard contract.
5. **"moves a ScrollArea through its handle and reports where it landed"** — a
   `ref` of `ScrollAreaHandle` is populated on mount, `handle.element.id` equals
   the viewport's id, `scrollTo({ y })` moves the region and reports it,
   `scrollTo({ x })` keeps the omitted `y`, and an over-large target reports the
   runtime's clamp (`-480`). This is the §2b amendment.

### 5.2 The element tree (`src/components/ScrollArea.test.tsx`)

6. **"forwards the caller's `onScroll` to the viewport"** — `renderScrollArea`
   with an `onScroll`; assert `hostHandler(area, "onScroll")` is present and
   invoking it reaches the caller. `onScrollPositionChange` must **not** appear
   as a host prop (the wrapper owns it, the host has no such event).

### 5.3 The composed example (`runtime/examples.runtime.test.tsx`)

7. **"the inspector's readout follows a wheel scroll"** — mount the `layout`
   example, assert the footer reads `0 px` (or the chosen top label), wheel the
   property list, and assert the readout changed to the scrolled distance. This
   proves the whole chain in a real composition: wheel → renderer offset →
   callback → caller state → repaint.

### 5.4 Two-direction proof (required before "done")

- Run cases 1–7 against the **unmodified** tree first; record the failing
  assertions in §7.
- Restore the pass-through `onScroll` (no report) → case 1 fails.
- Remove only the keyboard `report()` → case 2 fails.
- Remove the "changed" guard → case 3 fails.
- Tie the reporter to `label !== undefined` → case 4 fails.
- Remove `reportPosition()` from the handle's `scrollTo` → case 5 fails.
- Pass `null` to `useImperativeHandle` → case 5 fails with "exposed no handle".
- Restore; every suite is green.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 6. STOP conditions

Stop and report (do not improvise) if:

1. `test:runtime` cannot load a binding (`MissingNativeBindingError`).
2. The wheel's offset inside the handler is **stale** (the pre-scroll value) —
   then the reporter needs a different boundary (a deferred read) and this plan
   must be re-derived from a fresh probe instead of shipping a wrong number.
3. `renderer.scrollTo` does not clamp synchronously on this host — case 2's
   expected values change; re-measure and record the real ones rather than
   weakening the assertion.
4. Reporting a keyboard move causes a re-render loop (the callback updates state
   that re-renders the area and reports again, unbounded). Report the trace and
   propose the strongest honest alternative (e.g. reporting only in the event
   handler) instead of hiding it.
5. A gate (`check`, `lint`, `test`) fails for a reason unrelated to this change.
   Report the output instead of masking it.

## 7. Outcome

`ScrollArea` now reports its absolute position on both paths, and the measured
numbers match the plan: the wheel reports `{x: 0, y: -100}` (the offset inside
the handler, as measured in §0), PageDown on the 120 px / 600 px scene reports
`{x: 0, y: -66}` (the viewport less one line), Home reports `{x: 0, y: 0}` and
End reports the runtime's clamped `{x: 0, y: -480}` — not the computed target.
A wheel in the direction that cannot move the region, and `Home` at the top,
report nothing. An unlabelled area reports `{x: 0, y: -100}` too, because the
reporter is not tied to the keyboard contract. The `ref` handle moves the region
and reports it: `scrollTo({ y: -100 })` → `{0, -100}`, `scrollTo({ x: -20 })`
keeps the omitted `y` → `{-20, -100}`, and `scrollTo({ y: -100000 })` reports
the clamped `{-20, -480}`. `handle.element.id` is the painted viewport's id.

**Measured before (each mutation of the fixed tree):**

| Mutation | Failing assertion |
| -------- | ----------------- |
| `onScroll` composed without `reportPosition()` | wheel case: `expected [] to strictly equal [{ x: 0, y: -100 }]`; unlabelled case the same; the example readout stayed `Top` (expected `4 px` at the time — 16 rows overflowed by 4 px, which is why the example now has 24) |
| `reportPosition()` removed after `scrollTo` | keyboard case: `expected [] to strictly equal [{0,-66},{0,0},{0,-480}]` |
| the "changed" guard removed | immobile case: `expected [{0,0},{0,0}] to strictly equal []` — the no-op wheel does dispatch an event, so the guard is what keeps the callback a change signal |
| the reporter gated on `label !== undefined` | unlabelled case: `expected [] to strictly equal [{0,-100}]` |
| `reportPosition()` removed from the handle's `scrollTo` | handle case: `expected [] to strictly equal [{0,-100},{-20,-100},{-20,-480}]` |
| `useImperativeHandle(null, …)` | handle case: `the ScrollArea exposed no handle` |

The example's readout is the composed proof: the wheel moves the property list,
`onScrollPositionChange` updates caller state and the footer repaints the
distance (`-100` → `100 px`). The inspector also gained 8 more property rows so
the list actually has somewhere to scroll — with 16 rows it overflowed by 4 px.

**One guard was too blunt.** `src/callback-names.test.ts` matched the bare
substring `onChange` in examples (and `onChange={` in docs), so the new prop —
named after the state it reports, exactly as plan `088` requires — was reported
as a reintroduction of the banned name. The patterns now match the identifier
(`\bonChange\b`), and the guard still fails on a real reintroduction: a
temporary `onChange={() => {}}` in `layout.example.tsx` was reported by file and
line before being removed.

**After:** offline **41 files / 544 tests** (543 + 1 element-tree case), runtime
**22 files / 364 tests** (358 + 6). `nub run check`, `nub run lint` and
`nub run test` pass.

## 8. Acceptance

- [x] A wheel scroll reports the absolute offset, and `onScroll` still delivers
      its delta.
- [x] Every keyboard move reports the position the runtime actually holds,
      including a clamped `End` (`-480`).
- [x] An attempt that did not move the region reports nothing.
- [x] An unlabelled area reports its wheel position.
- [x] The `ref` handle moves the region and reports the clamped result, and an
      omitted axis keeps its offset.
- [x] The example's readout follows a real scroll in the composed screen.
- [x] Docs, `README.md`, `COMPONENTS.md`, the capability reference, `TODO.md`
      and the plan index record it.
- [x] Every new test fails in both directions before/after the fix.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.

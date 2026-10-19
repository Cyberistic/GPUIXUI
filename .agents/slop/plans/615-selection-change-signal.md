# 615 — The window's selection-change signal: `onSelectionChange` and a copy affordance

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `100` (the smoke host), `110` (`runAsyncScenarios`), `163`
(`text-selection`), `191` (`live-selection`), `345` (the window-key seam this
copies).
**Phase:** F — the last published window-level handler with no evidence.

## 1. Why

`@gpuix/react@0.10.0` exports a window-level `onSelectionChange` handler
(`RootEventHandlers.onSelectionChange`) and `observeSelectedText(renderer,
subscribe, callback)`. The suite has never registered it: `text-selection` and
`live-selection` prove that a drag **selects** and that `getSelectedText()`
returns the text, but not that the runtime *notifies* anyone when the selection
changes.

That signal is what a desktop copy affordance needs. Without it a component can
only poll `getSelectedText()` or show a copy action unconditionally. The
published `observeSelectedText` implies the runtime emits an event whose
`value` is the selected text; that claim is unverified on this host.

The probe answers, with evidence:

1. Does a drag select fire `onSelectionChange` in the `TestRenderer` and in a
   real window?
2. What does the payload carry — is `value` the selected text, and what is it
   for a cleared selection?
3. Is the event delivered per change (two drags = two events), and does a plain
   click that clears the selection notify?
4. Can the app forward the event to the mounted view (the `useWindowKey` seam
   pattern) so a component derives `selected` / `copy enabled` state without
   polling?

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/selection.tsx` | **new** — the app seam: `SelectionHandler`, `useSelectionChange`, `withSelectionProvider`, and a pure `selectionText(event): Option<string>` boundary mapper. |
| `apps/playground/src/selection.test.ts` | **new** — unit tests for the mapper (a `value` string, an empty string, a missing `value`) and for the register/unregister lifecycle through the context. |
| `apps/playground/src/scenarios/selection-signal.tsx` | **new** — `selection-signal`, capability `selection`; the view owns a readout and a copy action driven only by the event. |
| `apps/playground/src/scenarios/index.ts` | import and append `selectionSignalScenario`. |
| `apps/playground/src/smoke/run.ts` | create the selection registry beside the window-key one, pass `onSelectionChange` to `createTestRoot`, wrap every mount in `withSelectionProvider`. |
| `apps/playground/src/live/run.ts` | the same registry, passed as `onSelectionChange` to `gpuix.render(...)`, and the same wrapper in `mount`. |
| `apps/playground/src/live/scenarios.tsx` | **new** `live-selection-signal` reusing `selectionSignalScenario.view`. |
| `apps/playground/README.md` | one paragraph under the scenario list. |
| `COMPONENTS.md` | extend the `selection` capability row in the table and the `Text selection` inventory row with the measured signal. |
| `PLAN.md` | one decision row (D88). |
| `TODO.md` | add and tick the task with the exact ids and check counts. |
| `.agents/slop/plans/README.md` | index this plan in the playground table. |

No `packages/testing` change: the host already exposes `selectText`,
`selectedText` and `clearSelection`, and the scenario reads its own state
through `text`.

## 3. The seam

`selection.tsx` mirrors `window-key.tsx` (the established app seam, plan `345`):

```tsx
/** Called for every window selection change with the selected text. */
export type SelectionHandler = (text: string) => void;

/** The payload's selection text; absence is the empty selection. */
export const selectionText = (event: EventPayload): string =>
  Option.getOrElse(Option.fromNullishOr(event.value), () => "");

export const useSelectionChange = (handler: SelectionHandler): void => {
  const register = useContext(SelectionContext);
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    register(Option.some((event) => latest.current(selectionText(event))));
    return () => register(Option.none());
  }, [register]);
};

export const withSelectionProvider = (register: Register, child: ReactNode) =>
  <SelectionContext.Provider value={register}>{child}</SelectionContext.Provider>;
```

The runners hold `{ current: Option<SelectionHandler> }` exactly as they hold
`windowKey`, and forward the root handler to it. This is the honest contract: a
headless component cannot reach the root options, so the app (or a provider)
owns the registration — the same shape `useWindowKey` already documents.

## 4. The scenario

View (`selection-signal`): three selectable `<text>` lines, a readout
`sel-readout` (`changes=<n> selected=<text>`), and a `sel-copy` action that is
**inert until an event has delivered a non-empty selection**. Clicking it
records `copied=<the last event's text>`, so the assertion is on the value the
event carried, not on a second `getSelectedText()` read.

Steps:

1. `host.selectText("sig-line-1", "sig-line-3")` and assert the returned text
   contains all three lines. `awaitReadout` until the readout carries
   `changes=1`; assert `selected=` carries `sig one`.
2. Read the readout's `selected=` value and assert it equals
   `host.selectedText()` — the event and the renderer agree.
3. Click `sel-copy`; assert `copied=` carries the event text (the affordance
   uses the event, not a fresh read).
4. `host.selectText("sig-line-2", "sig-line-2")`; wait for `changes=2` and
   assert the new value is the second line alone. This proves the event fires
   per change, not once per mount.
5. `host.clearSelection()`; wait for `selected=` to be empty and for `changes`
   to **increase** — the measured clear notification. The drag count itself is
   not one event per gesture (see §8), so the probe asserts a monotonic count
   and the delivered text, never `changes == 1 per drag`.
6. `host.click("sig-line-1")` and assert the readout does not claim a selection;
   `changes` may stay put. This separates "click" from "drag".

## 5. STOP conditions

- **STOP** if `createTestRoot` does not invoke `onSelectionChange` for a real
  drag: the event is not delivered headless. Record the null result in the plan
  and `COMPONENTS.md` ("the signal is live-only" or "not delivered"), keep the
  drag/get path as the verified contract, and do not fake the event.
- **STOP** if the payload has no `value` and the only source is
  `getSelectedText()`: the event is a tick, not a value. The seam must then read
  the renderer on each tick; record the measured shape rather than the plan's
  assumption.
- **STOP** if a cleared selection delivers a *stale* non-empty `value`: record
  it as a defect, and make the readout re-read `getSelectedText()` on every
  event, asserting the renderer's answer.
- **STOP** if the live window delivers the event with a different shape from
  the headless host. The headless twin may ship; the live twin must assert the
  measured shape, and the difference goes in the ledger.
- **STOP** before changing any `packages/**` file: this probe needs none.

## 6. Test plan and two directions

```
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only selection-signal
nub apps/playground/dist/live/run.js --only live-selection-signal
nub run --filter playground test
```

Direction one (the signal works): the scenario is green in both harnesses and
the copy action runs with the event's text.

Direction two (the signal is load-bearing): delete the
`withSelectionProvider`/`onSelectionChange` wiring from `src/smoke/run.ts` and
re-run `--only selection-signal`; the scenario must fail at `changes=0` with an
empty readout. Restore the wiring and re-run green. The live twin's direction is
to drop `onSelectionChange` from `gpuix.render(...)` and watch the same check
fail.

Also record: two drags delivered two events (or the measured count), and whether
a clear notifies. Those are observations, not tolerances.

## 7. Acceptance

- `selection-signal` (19 checks) and `live-selection-signal` (31 checks) are
  registered and green; the headless registry is 104 and the live registry 87.
- The plan index, `PLAN.md`, `COMPONENTS.md` and `TODO.md` carry the measured
  event contract and the exact ids run.
- `nub run check`, `nub run lint` and `nub run test` pass.
- The full headless suite is the end-of-task check; the full live suite is
  re-run because this lands after the branch's promotion gate.

## 8. Measured

Ran on 2026-10-19 on the release-tag `darwin-x64` binding.

**The event exists and carries the text.** `createTestRoot({ onSelectionChange })`
and a live `render(..., { onSelectionChange })` both deliver it; `event.value`
is the **joined selected text** and is **absent** for an empty selection (the
published `EventPayload` contract). The event reached the mounted view in both
harnesses, and its text equalled `getSelectedText()`.

**One drag is not one event.** The headless host delivered one to three
`selectionChange` events per drag; the live window delivered about eight (one
per pointer move that changed the range). A component must treat the event as
"the selection changed, here is the current text", never as a gesture count.

**A clear notifies.** `clearSelection()` fires `selectionChange` with no
`value`; a click on an ordinary element that clears a selection does too.

**The load-bearing trap: the click on the affordance clears the selection.**
The measured order differs by harness:

| Harness | Order for one copy click |
| ------- | ------------------------ |
| `TestRenderer` | `D(t) S(-) C(t)` — pointer-down, then the clear event, then the click |
| live window | `D(t) C(t) S(-)` — the click runs first, then the clear event |

So a click handler that reads component state copies nothing headless (the
clear's re-render has already replaced it) and only happens to work live. The
portable recipe is the one the probe ships: **snapshot the last event text at
pointer-down** (a `ref`), and copy that snapshot on click. The probe's copy
assertion fails with `<none>` when it reads state instead (M3, headless) and
passes live — the measured difference, not a tolerance.

**Mutation proofs.** M1: remove `withSelectionProvider` from the headless
runner → `the drag reported a change: expected true, got false`. M2: map
`event.value` with `String(...)` → the mapper unit test fails with `undefined`.
M3: read `selected` in the copy handler → the headless copy check fails with
`<none>`; the live twin still passes (the measured order above). M4: remove
`onSelectionChange` from the live `render(...)` → `the live drag reported a
change: expected true, got false`.

**Focused runs.** `selection-signal` 19 checks and `live-selection-signal`
31 checks, green after the reverts. Full headless **104/104** and full live
**87/87** are recorded in `TODO.md`.

# 159 — Plan: native popups — `Select`, `Combobox` and `Tooltip`

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §8) |
| Phase | B (feasibility) → feeds C (Tier 1–2 selects/comboboxes/tooltips) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140` |
| Feeds | `@gpuixui/components` Select/Combobox wrappers, Tooltip, SearchInput, DatePicker (month/year select), command palette |

## 1. Goal

`COMPONENTS.md` marks **Selects**, **Comboboxes** and **Tooltips** as "verified",
but the verdict comes from the published `@gpuix/react@0.10.0` types, not from a
run. The smoke suite has never opened one. These three are the only *interactive*
components GPUix ships, and our library composes them rather than reimplementing
them, so the library's honesty depends on this measurement.

The probe answers, natively and with numbers:

1. Does clicking a `SelectTrigger` mount `SelectContent`, and does clicking an
   item commit the value, close the list and return focus to the trigger?
2. Do the Select's own keyboard rules work through native key delivery —
   arrow-opens, arrow-moves, Enter commits, Escape closes, outside press closes?
3. Does a `Combobox` filter as its `<input>` is edited, and does Enter commit the
   highlighted (auto-highlighted) row?
4. Does a `Tooltip` open on a native mouse **enter** and close after a native
   **leave** (`onMouseLeave` + the component's 80 ms timer)?

A `failed` verdict is a real outcome. If a component cannot work here, record it,
list the affected library components and give the honest alternative — do not
patch around it in the scenario.

## 2. What is known, and what is only claimed

Measured already (plans `140`, `155`, `156`):

- `<anchored>` positions and occludes; it paints no surface, so handlers go on
  its content div.
- `align="center"` is short by half the panel; `fit="snap"` clamps without
  flipping.
- Escape in a nested layer closes only that layer.
- `autoFocus` takes native focus without dispatching `onFocus`.
- click, key, wheel and pointer-capture drag are all delivered by the test
  renderer; `nativeSimulateMouseMove` exists but **no scenario has used it yet**.

From the published types and source (installed `@gpuix/react@0.10.0`), read for
this plan:

- `Select` is controlled/uncontrolled on **both** `value` and `open`; the
  trigger's `onClick` toggles open, `onKeyDown` maps `down`/`up` to open-then-move,
  Enter/Space to toggle, Escape to close; `SelectContent` mounts `autoFocus` and
  closes on Escape, outside press, and item click; `setOpen(false)` calls
  `renderer.focusElement(trigger.id)` — a native focus return.
- `Combobox` opens on input focus/click/change; `autoHighlight="always"` sets
  the active row to the first filtered item; `ComboboxInput`'s `onSubmit`
  (Enter) commits `filteredItems[activeIndex]`; `ComboboxEmpty` renders only
  when nothing matches.
- `Tooltip` opens immediately on trigger **focus** and on `onMouseEnter`
  (`TooltipProvider.delayDuration` defaults to `0`); a leave schedules an 80 ms
  JS timer to close; the trigger's own mousedown/click closes it.
- `Tooltip`'s content defaults to `side="top"` and `align="center"` — the
  placement defect from plan `156` applies, but placement is **not** asserted
  here (it is already measured).

None of these has a native verdict in this repo. That is what this plan fixes.

## 3. The view and the three scenarios

New file `apps/playground/src/scenarios/popups.tsx`, one exported view
`PopupsProbe` used by three scenarios. Every colour comes from `useTheme`, every
assertion reads a `Readout` or painted text, never a screenshot.

### 3.1 The view

A column, width 520, three bordered sections. State is local and mirrored into
readouts so a scenario can assert on it:

| Control | `testId` | Notes |
| ------- | -------- | ----- |
| Select trigger | `select-trigger` | `SelectTrigger` + `SelectValue placeholder="pick"`; `tabIndex={0}` from the component |
| Select items | `select-item-a`, `select-item-b`, `select-item-c` | labels `Alpha`, `Beta`, `Gamma`; `Select` uses controlled `value`/`open` so the readout is the source the scenario asserts |
| Select readout | `select-readout` | `` `open=${open} value=${value ?? "none"}` `` |
| Combobox input | `combo-input` | `ComboboxInput placeholder="search"`; `autoHighlight="always"`, `items={["Alpha","Beta","Gamma"]}`, controlled `value`/`inputValue`/`open` |
| Combobox items | `combo-item-Alpha`, `combo-item-Beta`, `combo-item-Gamma` | rendered through `ComboboxList` + `ComboboxItem` |
| Combobox empty state | `combo-empty` | `ComboboxEmpty` with a `<text>no matches</text>` |
| Combobox readout | `combo-readout` | `` `open=${open} value=${value ?? "none"} query=${inputValue}` `` |
| Tooltip trigger | `tooltip-trigger` | `TooltipTrigger` with `<text>hover me</text>`; `TooltipProvider delayDuration={0}` |
| Tooltip content | `tooltip-content` | `TooltipContent` with `<text>tip text</text>` |
| Tooltip elsewhere | `tooltip-elsewhere` | a sibling `div` large enough to move the pointer off the trigger |
| Tooltip readout | `tooltip-readout` | `` `open=${tipOpen}` `` |

### 3.2 Scenario `select-choose` (capability `select`)

1. `click("select-trigger")` → `select-readout` contains `open=true`; painted
   text contains `Alpha` and `Beta` (the content mounted).
2. `click("select-item-b")` → readout `value=b open=false`; painted text no
   longer contains `Alpha` (the content unmounted); `focused()` is
   `select-trigger` (the component's native focus return).
3. `key("down")` (the trigger is focused) → readout `open=true`.
4. `key("down")` (content is `autoFocus`) then `key("enter")` → readout
   `value=c open=false`. The item move is the component's own `moveActive`;
   `c` is the next entry after the selected `b`.
5. `key("down")` to reopen, then `key("escape")` → readout `open=false`.
6. `key("down")` to reopen, then `clickWindow(1200, 700)` → readout
   `open=false` and `focused()` is `select-trigger`: an outside press dismisses
   and returns focus.

### 3.3 Scenario `combobox-filter` (capability `combobox`)

1. `click("combo-input")` → `combo-readout` contains `open=true`; painted text
   contains `Alpha`.
2. `key("b")`, `key("e")` → readout `query=be`; `text("combo-item-Alpha")` is
   `null` (the row unmounted) and `combo-item-Beta` is painted.
3. `key("enter")` → readout `value=Beta open=false` (auto-highlight + submit).
4. `click("combo-input")`, `key("z")`, `key("z")` → `combo-empty` is painted and
   `combo-item-Alpha` is gone (no matches).
5. `key("escape")` → readout `open=false`.

### 3.4 Scenario `tooltip-open` (capability `tooltip`)

1. `hover("tooltip-elsewhere")` — establishes a pointer position inside the
   view so the next move is a real enter (also proves `onMouseEnter` itself).
2. `hover("tooltip-trigger")` → `tooltip-readout` contains `open=true`;
   `text("tooltip-content")` contains `tip text`.
3. `hover("tooltip-elsewhere")` → `yield* Effect.sleep("150 millis")`, then
   `host.advance(0)` → readout `open=false`. The component's close is an 80 ms
   **JS** timer, which the GPUI dispatcher clock does not move; the sleep is the
   honest way to let it fire.

If step 2 never opens, STOP: a hover-only tooltip cannot be verified through
`nativeSimulateMouseMove`; record it (focus-open is still measured by the
component's `onFocus`, but the hover path would be unproven).

### 3.5 The one host addition: `hover`

`SmokeHost` gains

```ts
readonly hover: (testId: string) => void;
```

implemented in `apps/playground/src/smoke/host.ts` as
`renderer.nativeSimulateMouseMove(center.x, center.y)` (no button held), which
is end-to-end: it hit-tests, dispatches enter/leave, and flushes. It is the
missing sibling of `click`/`wheel`/`drag`, and the tooltip hover path is its
first consumer. `packages/testing/src/test-support.ts` `nullHost` gains
`hover: () => {}`.

No other `@gpuix/*` type reaches the app: adapter only.

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/159-native-popups.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `159` |
| `packages/testing/src/smoke.ts` | `CAPABILITIES` gains `select`, `combobox`, `tooltip`; `SmokeHost` gains `hover` |
| `packages/testing/src/test-support.ts` | `nullHost.hover` no-op |
| `apps/playground/src/smoke/host.ts` | implement `hover` via `nativeSimulateMouseMove` |
| `apps/playground/src/scenarios/popups.tsx` | the view + three scenarios |
| `apps/playground/src/scenarios/index.ts` | register the three scenarios; add the capabilities to `CORE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | registry test expects `select-choose`, `combobox-filter`, `tooltip-open` |
| `COMPONENTS.md` | Selects / Comboboxes / Tooltips rows cite the native verdict; capability table gains three rows |
| `TODO.md` | one task under the playground workstream, ticked on landing |

No change to the smoke runner, report shape, CLI or theme.

## 5. Commands and expected results

Run from the worktree root, in order:

1. `nub run --filter @gpuixui/testing test` → exit `0` (the new capability
   values and `nullHost.hover` compile and the suite's own tests pass).
2. `nub run --filter playground check-types` → exit `0`.
3. `nub run --filter playground build` → exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only select-choose` → `1/1`, exit
   `0`, `select=verified`.
5. `nub apps/playground/dist/smoke/run.js --only combobox-filter` → `1/1`, exit
   `0`, `combobox=verified`.
6. `nub apps/playground/dist/smoke/run.js --only tooltip-open` → `1/1`, exit
   `0`, `tooltip=verified`.
7. `nub apps/playground/dist/smoke/run.js` → **25/25**, exit `0`, every
   capability `verified`.
8. `nub run check`, `nub run lint`, `nub run test` → all exit `0`.

Screenshots are artifacts, never assertions; run with `--screenshots` only to
inspect the three surfaces while iterating.

## 6. STOP conditions

- **STOP** if `SelectContent` mounts but is not reachable by `text()`/painted
  text (for example because it mounts outside the retained tree). Record the
  exact readback and do not assert on an invisible surface.
- **STOP** if native key delivery cannot reach the Select content after
  `autoFocus` (the readout will show `open=true` and no value change). Record
  it: library Selects must then own the keyboard state instead of delegating,
  and the affected rows in `COMPONENTS.md` must say so.
- **STOP** if `nativeSimulateMouseMove` dispatches no `onMouseEnter` to a
  `div`. Record it and verify the focus-open path only; never claim the hover
  path.
- **STOP** if the outside press does not dismiss (readout stays `open=true`).
  Record it as an overlay defect separate from plan `156`'s placement defect.
- **DO NOT** change `@gpuixui/components`, the published GPUix package, or the
  scenario to hide a defect. A defect is a measured fact, not a test failure.

## 7. Test plan (two directions)

The three scenarios are the test; each must be able to fail in both directions.

- **select-choose**
  - fails if the trigger's click no longer mounts the content (`open=true` never
    appears), if the item click no longer commits (`value=b` missing), or if
    focus is not returned to the trigger.
  - two-direction proof: temporarily remove `onValueChange`/controlled `value`
    from the probe (or set the item's `value` to a constant) and confirm the
    run exits `1` with the value check named; restore and confirm `0`.
- **combobox-filter**
  - fails if typing does not filter (`combo-item-Alpha` still present), if
    Enter does not commit (`value=Beta` missing), or if the empty state never
    mounts.
  - two-direction proof: set `autoHighlight={false}` and confirm Enter commits
    nothing (exit `1`); restore.
- **tooltip-open**
  - fails if `hover` dispatches no enter (`open=true` missing) or if the leave
    never closes (`open=false` missing after the sleep).
  - two-direction proof: replace `hover("tooltip-trigger")` with a click and
    confirm the tooltip is closed (the component closes on click), so the test
    really depends on hover; restore.

Also update the registry test so a future scenario cannot land with one of the
three capabilities uncovered:

```ts
expect(Arr.map(scenarios, (scenario) => scenario.capability)).toEqual(
  expect.arrayContaining(["select", "combobox", "tooltip"]),
);
```

## 8. Measured facts

**Suite: 25/25 green on this host, exit `0`**, capabilities
`select=verified combobox=verified tooltip=verified` (the 22 prior scenarios
unchanged). Two-direction proof: each scenario below was broken and re-run.

- **select** — every step in §3.2 holds: a trigger click mounts the content and
  paints `Alpha`/`Beta`/`Gamma`; an item click commits `value=Beta`, unmounts
  the content and **returns native focus to `select-trigger`**; Down on the
  focused trigger opens; Down on the auto-focused content moves the active item;
  Enter commits `Gamma`; Escape closes; a click at `(1200, 700)` dismisses and
  returns focus. Negative direction: making `onValueChange` a no-op produced
  `open=false value=none` and **exit `1`**.
- **combobox** — focus/click opens, typing `be` filters (the `Alpha` row
  unmounts), Enter commits the auto-highlighted `Beta`, `autoHighlight="always"`
  is what makes Enter commit under a fresh query, two `z` keystrokes paint the
  empty state, Escape closes. Negative direction: `autoHighlight={false}`
  produced `open=true value=none` and **exit `1`**.
- **combobox API trap** — `ComboboxList` filters **only** when its child is a
  function. Static children (`{items.map(...)}`) render every item regardless of
  the query; the first run failed exactly this way (`the non-matching item
  unmounted: expected true, got false`). The scenario now uses
  `{(item) => <ComboboxItem …/>}`.
- **tooltip** — `nativeSimulateMouseMove` delivers `onMouseEnter`/
  `onMouseLeave`: hovering the trigger (after an establishing move to a
  sibling) opens the tooltip and paints `tip text`; moving away closes it after
  the component's 80 ms JS timer, which needs `Effect.sleep("150 millis")` —
  `host.advance` moves the GPUI dispatcher clock, not a JS timer. A click on the
  trigger closes it (mousedown → close, click → close), so focus reached **via a
  click** does not leave it open; hover is the supported path. Negative
  direction: replacing the hover with a click produced `open=false` and **exit
  `1`**.
- **hover** — added to `SmokeHost` as
  `renderer.nativeSimulateMouseMove(centre)`; it is the missing sibling of
  `click`/`wheel`/`drag` and is end-to-end (hit test, enter/leave dispatch,
  flush). `nullHost` carries the inert implementation.

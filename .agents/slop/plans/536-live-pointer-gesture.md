# 536 — The live pointer gesture: press, move, release in a real window

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (integration / native evidence) |
| Depends on | `100`, `110`, `140`, `188`, `189`, `191`, `343`, `529`, `535` |
| Owns | `packages/testing/src/smoke.ts`, `packages/testing/src/test-support.ts`, `apps/playground/src/live/host.ts`, `apps/playground/src/live/scenarios.tsx`, the `Text inputs` row of `COMPONENTS.md`, the live section of `apps/playground/README.md` |
| Feeds | the `Text inputs` inventory row — the pointer-selection half becomes live, not headless-only |

## 1. Why this exists

Plan `343` measured the native editor's pointer contract in the offscreen
`TestRenderer`: a press-move-release selects a run, typing replaces it, a plain
click clears that selection and `shift`-click extends it. Plan `535` then proved
the live **caret** half in a real window (middle / right edge / left edge, plus
the textarea's Enter/Up), but explicitly did **not** claim the drag half:
`AsyncSmokeHost` has no `pressWindow` / `movePointer` / `releasePointer`, and
`live-selection` proves only renderer-level *document* drag selection.

That is the untested gesture behind every editor that offers select-and-replace:
an inline rename, a search box, a table-cell editor. A document-level drag is a
different code path from the native text editor's own selection, so
`live-selection` does not stand in for it.

**Goal:** the three gesture verbs exist on `AsyncSmokeHost`, and
`live-pointer-entry` extends its existing run with the drag, click-clear and
`shift`-click checks — typed replacement, not just a selection readout.

## 2. What the protocol already gives us

Measured from `@gpuix/native@0.10.0` `dist/automation/client.d.ts`:

| Need | Protocol call | Notes |
| ---- | ------------- | ----- |
| press | `app.mouse.down(point, options?)` | `MouseOptions` carries `button` and `modifiers` |
| held move | `app.mouse.move(point, { pressedButton: 0 })` | the existing live `drag` verb already sends moves this way |
| release | `app.mouse.up(point)` | |
| modified click | `app.mouse.click(point, { modifiers: "shift" })` | `clickWindow` does not forward modifiers yet |

So this plan adds **no runtime capability**; it exposes what the live host
already wraps for `drag` and `selectText` as three separate halves, so a
scenario can inspect the gesture between the press and the release.

## 3. Files to change

1. `packages/testing/src/smoke.ts` — `AsyncSmokeHost`:
   - `clickWindow(x, y, modifiers?)`;
   - `pressWindow(x, y)`, `movePointer(x, y)`, `releasePointer(x, y)` with the
     same JSDoc contract as the synchronous `SmokeHost` verbs.
2. `packages/testing/src/test-support.ts` — `nullAsyncHost` gains the three
   no-op verbs (`clickWindow` keeps its signature).
3. `apps/playground/src/live/host.ts`:
   - `clickWindow` forwards `modifiers` to `app.mouse.click`;
   - `pressWindow` → `app.mouse.down({ x, y })`;
   - `movePointer` → `app.mouse.move({ x, y }, { pressedButton: 0 })`;
   - `releasePointer` → `app.mouse.up({ x, y })`;
   - every call is lifted through the existing `verb(...)` helper, so a
     protocol failure names `pressWindow 12,40` (and so on), never a silent pass.
4. `apps/playground/src/live/scenarios.tsx` — extend `live-pointer-entry`:
   - rename the title to `Live pointer entry: caret placement and drag selection`;
   - after the caret checks, drive `pointer-drag-field` and
     `pointer-shift-field` (both already mounted by the shared view);
   - screenshot path unchanged.
5. `COMPONENTS.md` — the `Text inputs` row's live paragraph now cites the drag,
   click-clear and `shift`-click checks instead of deferring to `live-selection`.
6. `apps/playground/README.md` — the live table row and the text-entry sentence.
7. `.agents/slop/plans/README.md` — index this plan.
8. `TODO.md` — one task line under the playground workstream.

## 4. The scenario, step by step

Everything below runs after the existing caret checks, with `ready:
"pointer-field"` unchanged. `settle` is the live suite's 120 ms frame wait; the
press must commit before the move arrives (the measured rule behind the paced
live `drag`).

```
6. drag = bounds("pointer-drag-field"); mid = drag.y + drag.height / 2
   pressWindow(drag.x + 3, mid);  settle
   movePointer(drag.x + 120, mid); settle
   releasePointer(drag.x + 120, mid); settle
   key("z"); settle
   expect textOf("pointer-drag-field-readout") === "Z"
        // the drag selected all six characters and typing replaced them
7. clickWindow(drag.x + drag.width - 4, mid); settle
   key("y"); settle
   expect textOf("pointer-drag-field-readout") === "ZY"
        // a plain click cleared the selection and put the caret at the end
8. shift = bounds("pointer-shift-field")
   clickWindow(shift.x + 3, mid); settle
   clickWindow(shift.x + 120, mid, "shift"); settle
   key("s"); settle
   expect textOf("pointer-shift-field-readout") === "s"
        // shift-click extended from the first caret to the end
9. screenshot(`${LIVE_ARTIFACTS}/live-pointer-entry.png`)
```

The existing textarea block stays after these checks. The live registry count
does **not** change (`53`): the scenario id is reused. Its check count grows by
three assertions.

## 5. STOP conditions

Stop and report rather than improvising if:

- the drag does not select (typing yields `abcdefz` or similar) — a live
  selection difference is a contract change to record, not a check to loosen;
- the drag needs more than one held move — record the measured step count before
  changing the scenario; the plan sends one move because the headless probe and
  a real pointer both do;
- `shift`-click does not extend (typing yields `sabcdef`-style output) — the
  protocol's `modifiers` may not reach the editor; record it as a limitation
  rather than dropping the check;
- any assertion needs a tolerance. These are exact strings.

## 6. Test plan (the scenario is the test)

Commands, in order, from the repo root:

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-pointer-entry   # 1/1, exit 0
nub run --filter @gpuixui/testing test                           # adapter unit tests
```

Mutation proofs (each edited, run, then restored):

- **M1 — the press point.** Replace `drag.x + 3` with `drag.x + 120` in the
  press: the caret starts at the end, the drag selects nothing, and `Z` appends
  (`abcdefZ`), so check 6 fails. Proves the check is about where the press lands.
- **M2 — the held-move flag.** Drop `{ pressedButton: 0 }` from `movePointer`:
  the editor sees a hover, not a drag, so check 6 fails. Proves the held-move
  half is what selects.
- **M3 — the modifier.** Drop the `"shift"` argument in the second click: the
  selection collapses to a caret and `s` prepends, so check 8 fails.

Record each observed `expected`/`got` pair in §8. No headless scenario changes,
so the full headless suite is not required; the live suite stays a merge gate.

## 7. Acceptance

- `live-pointer-entry` runs `1/1`, exit `0`, with its screenshot and three new
  checks.
- M1, M2 and M3 fail in the documented direction and are recorded.
- `AsyncSmokeHost`'s three verbs are documented and implemented by both the live
  host and `nullAsyncHost`; `nub run check` and `nub run test` pass.
- `COMPONENTS.md`, the playground README, this index and `TODO.md` are current.
- The live registry is still `53` scenarios and the plan says so.

## 8. Measured result

`nub run --filter playground build` then
`nub apps/playground/dist/live/run.js --only live-pointer-entry`:
**1/1 scenarios, exit `0`, 22 checks, 2.5 s**, screenshot written. The live
registry is unchanged at **53** ids.

The three new checks are exact strings and passed on the first correct run:

| Check | Measured |
| ----- | -------- |
| a live drag selects the whole run | readout `z` after typing `z` over the selection |
| a plain live click clears the drag selection | readout `zy` |
| shift-click extends the live selection | readout `s` |

The first run failed only on case: the live `key("z")` types **lowercase** `z`
(the headless probe types `Z` with `key("Z")`), so the expectation is `z`/`zy`
and the keys stay lowercase. That is the protocol's keystroke semantics, not a
selection difference.

Mutation proofs (each restored after the run; every one exits `1`):

| Lever | Observed failure |
| ----- | ---------------- |
| **M1** press at `drag.x + 120` instead of `x + 3` | `a live drag selects the whole run: expected "z", got "abcdefz"` |
| **M2** `movePointer` without `{ pressedButton: 0 }` | `expected "z", got "zabcdef"` — the move is a hover and the caret stays at the press |
| **M3** second click without `"shift"` | `shift-click extends the live selection: expected "s", got "abcdefs"` — the click collapses to a caret at the end |

**Transferable finding:** the automation protocol's `mouse.down` / `mouse.move`
/ `mouse.up` drive the **native editor's own** selection exactly as the
`TestRenderer` does, provided the held move carries `pressedButton: 0` and the
press commits a frame before the move. No component code is involved, so a
component must not intercept a modified click or reimplement selection.

## 9. Merge gate

Run on the final branch after this change:

- headless **101/101** (`3536` checks), exit `0`;
- live **53/53** (`1133` checks, up from `1125`), exit `0`;
- `nub run check`, `nub run lint` and `nub run test` pass (1,384 tests).



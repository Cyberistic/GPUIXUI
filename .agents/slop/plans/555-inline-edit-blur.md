# 555 — InlineEdit's blur commit in a real window: re-measure and guard

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (native evidence) |
| Depends on | `100`, `110`, `140`, `189`, `190`, `345`, `347`, `390`, `529`, `554` |
| Owns | `apps/playground/src/live/scenarios.tsx`, `apps/playground/src/scenarios/tier2-editing.tsx`, the `Inline edit` row of `COMPONENTS.md`, the `InlineEdit` cross-team row in `TODO.md` |
| Feeds | the `Inline edit` inventory row — the blur-commit path stops being a documented gap and becomes a guarded live check |

## 1. Why this exists

Plan `347` measured the shipped `InlineEdit` live and recorded that React's
`onBlur` **did not run** for a native focus change in a window, so clicking away
left the editor open; the live scenario was written to prove only the keyboard
paths. Plan `390` then found that the sibling `onFocus` count is
**window/host-state dependent** — the same clean code read `0` at 15:03/15:10
and `1` from 15:25 — so the `TODO.md` row asks for a re-measurement in the
current state before the gap is relied on.

Re-measured 2026-10-19 while adding plan `554`: a live click on the focusable
`ws-elsewhere` **does** commit the draft. The readout went from
`name=live commits=1` to `name=livez commits=2` after typing `z` and clicking
away — the component's blur commit ran and the display repainted `livez`.

**Goal:** the live twin asserts the blur commit, so the documented gap is
replaced by a guarded contract (with the window-state caveat recorded), and the
headless/live divergence is explained instead of hidden.

## 2. What is already measured

| Fact | Source |
| ---- | ------ |
| Headless: clicking `ws-elsewhere` leaves the editor open (no `onBlur`) | `tier2-editing` |
| Live: the display swaps for an editor, a coordinate click focuses it, Enter commits and Escape discards | `live-tier2-editing`, plan `347` |
| Live `onFocus`/`onBlur` delivery is window-state dependent | plan `390` §6 |
| The live `click(testId)` resolves the pre-swap node, so the editor needs a coordinate click | plan `347` §8.2 |
| Live text entry is the native editor's | `text-entry`/`live-pointer-entry` |

## 3. The new live steps

Inserted in `live-tier2-editing` immediately after the existing
Escape-discard check, before the TagInput block. `settle` is the live suite's
120 ms frame wait; every read is exact.

```
1. click("ws-name"); settle                      // display → editor
2. box = bounds("ws-name")
   clickWindow(box.x + 200, box.y + box.height / 2); settle   // focus the editor
3. key("z"); settle                              // draft = "livez"
4. click("ws-elsewhere"); settle                 // the blur
5. waitForText("tier2-editing-readout", "name=livez commits=2")
6. textOf("ws-name") contains "livez"            // the display committed
7. waitForFocus("ws-elsewhere")
8. focusedOf(ctx) === "ws-elsewhere"              // the click keeps its focus
```

The draft is `livez`, not `z`, because the editor opens with the committed
`live` and the coordinate click puts the caret at the end. Do **not** `cmd-a`
before typing: the point is to prove the draft that was open is the one
committed. Step 8 is deliberate: a blur commit must **not** steal focus back
from the element the reader clicked (measured `got "ws-elsewhere"` on the first
run, where the plan had wrongly expected `ws-name`).

## 4. Files to change

1. `apps/playground/src/live/scenarios.tsx` — the seven steps above, plus update
   the stale comment on the InlineEdit block (the blur path is now proven live
   in the current window state; the headless host still does not deliver it).
2. `apps/playground/src/scenarios/tier2-editing.tsx` — the headless comment now
   says the headless host does not dispatch `onBlur`, while a real window does
   (plan `555`), so the headless assertion is a harness fact, not a component
   limitation.
3. `COMPONENTS.md` — the `Inline edit` row: replace "blur commits by contract …
   live `onBlur` does **not** run" with the measured live contract and the
   window-state caveat.
4. `TODO.md` — the cross-team `InlineEdit` row becomes resolved with this
   evidence; the Tabs row stays open (its result is ambiguous, not merely
   state-dependent).
5. `.agents/slop/plans/README.md` — index this plan.
6. `PLAN.md` — decision `D70`.
7. `apps/playground/README.md` — one sentence in the live editing section.

## 5. STOP conditions

Stop and report rather than loosening the check if:

- the blur does **not** commit on the next run — then the plan `390` state
  dependence is real for `onBlur` too. Keep the measurement, revert the new
  check, and record the row as an open re-verify with the two observed states;
- the commit fires twice (`commits=3`) — a double-commit is a real defect to
  record, not a tolerance to add;
- the click's focus is stolen by the commit (`focusedOf` returns `ws-name` after
  clicking `ws-elsewhere`) — record it as a focus-management defect, not a
  tolerance to add;
- the coordinate click cannot focus the editor (`focusedOf` is not `ws-name`
  before typing) — record the live locator gap instead of switching to an
  untested path.

## 6. Test plan

From the repo root:

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-tier2-editing   # 1/1, exit 0
# run it three times to check the window-state stability
nub run --filter playground test
nub run check
nub run lint
```

Mutation proof (applied, run, restored):

- **M1 — the click away.** Replace `click("ws-elsewhere")` with `settle`: the
  editor stays open, the readout stays `name=live commits=1`, and both the
  commit and the display checks fail. Proves the check is about the blur.

Record the observed `expected`/`got` in §8.

## 7. Acceptance

- `live-tier2-editing` is `1/1`, exit `0`, three consecutive runs, with the new
  checks and an unchanged screenshot.
- M1 fails in the documented direction.
- The headless scenario still passes (`tier2-editing`) and its comment explains
  the divergence.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (D70), this index and the playground
  README are current.
- `nub run --filter playground test`, `nub run check`, `nub run lint` pass.

## 8. Measured result

`nub run --filter playground build`, then
`nub apps/playground/dist/live/run.js --only live-tier2-editing` three times:

**1/1 each run, exit `0`, 30 checks** (4 new: the editor is painted, the commit
readout, the committed display, the click's focus). The screenshot is unchanged.

| Check | Measured |
| ----- | -------- |
| a click away commits the open live draft | readout `name=livez commits=2` (from `name=live commits=1`) |
| the committed display paints the draft | `ws-name` paints `livez` |
| the click's focus is not stolen by the commit | focus is `ws-elsewhere` |

The first run failed on the last check with `expected "ws-name", got
"ws-elsewhere"` — the plan had assumed the display takes focus back. That is
wrong for a blur commit: the reader clicked another control, so focus must stay
there. The check was corrected to assert that contract (and now fails if the
component steals focus). Enter and Escape still return focus to the display,
proven by the existing checks.

### Mutation proof (applied, run, restored; exit `1`)

| Lever | Observed failure |
| ----- | ---------------- |
| **M1** remove `click("ws-elsewhere")` | `a click away commits the open live draft: expected "name=livez commits=2", got "name=live commits=1 tags=design hotkey=none …"` — the editor stayed open and nothing committed |

**Transferable finding:** a real window **does** deliver React's `onBlur` for a
native focus change in the current host state, and the shipped `InlineEdit`
commits through it; the headless host does not deliver it, so the two harnesses
must assert their own measured behaviour. The delivery class remains
window-state dependent (plan `390`), so the live check is the guard rather than
a one-off claim.

### Amendment (plan `596`'s merge gate, 2026-10-19)

The gate found the coordinate click that started each edit could land outside a
narrow display, leaving the edit unopened — and the later blur check vacuous.
The scenario now clicks the display through the locator and asserts that the
component's layout effect moved native focus to the swapped editor
(`waitForFocus` + `focusedOf`), three times (first edit, second edit, blur
target). That makes the check count **31**, not 30, and adds the click-away
focus assertion; the blur commit itself is unchanged. Focused
`--only live-tier2-editing` is 31/31 green, exit `0`. A mutation of the first
focus expectation to `ws-elsewhere` was observed failing with
`expected "ws-elsewhere", got "ws-name"` and reverted.

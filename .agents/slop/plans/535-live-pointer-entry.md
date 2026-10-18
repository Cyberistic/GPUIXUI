# 535 — Pointer text entry in a real window

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (integration / native evidence) |
| Depends on | `100`, `110`, `140`, `188`, `189`, `191`, `343`, `529` |
| Owns | `apps/playground/src/live/scenarios.tsx`, this plan, the live rows of `COMPONENTS.md`, the live section of `apps/playground/README.md` |
| Feeds | the `Text inputs` inventory row (pointer caret evidence live instead of headless-only) |

## 1. Why this exists

Plan `343` measured the native editor's pointer half in the offscreen
`TestRenderer`: a click places the caret at the nearest glyph (left edge
prepends, middle lands inside, right edge appends), a press-move-release selects,
a plain click clears that selection, `shift`-click extends it, and Enter/Up work
in a `<textarea>`.

Three of those are now live-proven by other scenarios: drag selection by
`live-selection` (a real renderer-level drag), typing and `cmd-a` by
`live-input-payload`, and Enter-commit by `live-input`. **Click-to-place-caret
is not**: no live scenario clicks inside a run and types at that point. That is
the gesture behind inline rename, a search box, a tag input and a grid cell
editor, so it is worth one focused probe.

**Goal:** `live-pointer-entry` reuses the `pointer-entry` view in the real
`1100×720` window and proves the caret lands where the click points, and that a
`<textarea>` takes a newline and Up returns to the previous line.

## 2. What the runner already gives us

No new host verb is needed:

| Need | Verb | Notes |
| ---- | ---- | ----- |
| mount the shipped view | `view: pointerEntryScenario.view` | plan `301`/`532`/`534` pattern |
| click a coordinate | `ctx.host.clickWindow(x, y)` | the async host's window-coordinate click |
| type | `ctx.host.key("m")`, `key("x enter y")` | space-separated keystrokes; `live-input` types this way |
| geometry | `ctx.host.bounds(testId)` | content-origin box (plan `529`); the fields have no border |

**Out of scope (and why):** the async host has **no** `pressWindow` /
`movePointer` / `releasePointer`, so a live press-drag-release meant to prove
pointer *selection* would need three new verbs and adapter tests. It is not
needed: `live-selection` already proves a real drag selects
(`AsyncSmokeHost.selectText` drives the renderer's own drag). The plan records
that split instead of duplicating the verb set.

## 3. Files to change

1. `apps/playground/src/live/scenarios.tsx` — import `pointerEntryScenario`, add
   the `pointerEntry` `LiveScenario` (id `live-pointer-entry`,
   capability `input`, `ready: "pointer-field"`) after `inputPayload`, and
   register it in `liveScenarios`.
2. `apps/playground/README.md` — the live table row and a sentence in the
   text-entry section that the pointer caret is live-proven.
3. `COMPONENTS.md` — the `Text inputs` row.
4. `.agents/slop/plans/README.md` — index this plan; live registry `52 → 53`.
5. `TODO.md` — one task line under the playground workstream.

## 4. The scenario, step by step

```
ready: "pointer-field"
1. field = bounds("pointer-field")
   clickWindow(field.x + 25, field.y + field.height / 2); key("m"); settle
   read("pointer-field-readout"): marker = value.indexOf("m")
   expect 0 < marker < 6                // inside "abcdef", not at either end
2. clickWindow(field.x + field.width - 4, mid); key("2"); settle
   expect the readout ends with "2"
3. clickWindow(field.x + 3, mid); key("1"); settle
   expect the readout starts with "1"
4. area = bounds("pointer-area")
   clickWindow(area.x + 3, area.y + 12); key("x"); key("enter"); key("y"); settle
   expect the readout is exactly "x\ny"
   expect bounds("pointer-area").height = 64 ± 2      // two lines, autosized
5. key("up"); key("z"); settle
   expect the readout is exactly "xz\ny"             // Up returns to line 1
6. screenshot(`${LIVE_ARTIFACTS}/live-pointer-entry.png`)
```

## 5. STOP conditions

Stop and report rather than improvising if:

- the middle click does **not** land inside the run (marker `0` or `6`) — the
  live editor's glyph metrics differ from the offscreen renderer and that is a
  contract change to record, not a check to loosen;
- typing after a right-edge click does not append — a click that does not place
  the caret at all;
- the textarea height is not `64 ± 2` — a live border/autosize difference; note
  the measured value before changing the expectation;
- any check needs a tolerance beyond the stated ones.

## 6. Test plan (the scenario is the test)

Two levers, both restored:

- **M1 — the click point.** Move the middle click to the field's right edge
  (`field.x + field.width - 4`): the check that the marker lands inside fails
  (it lands at the end). This proves the check is about *where* the click lands.
- **M2 — the field kind.** Render `pointer-area` as an `<input>` (`area={false}`):
  Enter no longer inserts a newline, so `x\ny` fails.

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-pointer-entry   # 1/1, exit 0
nub apps/playground/dist/live/run.js --only live-pointer-entry   # after M1: exit 1
```

No headless scenario changes, so no headless run is required. The live registry
grows `52 → 53`; the full live suite stays a merge gate.

## 7. Acceptance

- `live-pointer-entry` runs `1/1`, exit `0`, with its screenshot.
- Both levers fail the expected check and are recorded in §8.
- `COMPONENTS.md` (`Text inputs`) and the playground README cite the live
  scenario, and the README states the drag-selection split honestly.
- `nub run check` and `nub run test` pass; the plan is indexed and the TODO task
  ticked.

## 8. Result

`live-pointer-entry` is registered as the 53rd live scenario and runs **1/1,
exit `0`, 14 checks, ~1.4 s** in the real window.

| Fact | Measured in the window |
| ---- | ---------------------- |
| a middle click | with the caret placed by a click at `x + 25` of a 300 px field, `m` lands at index 1–5 of `abcdef` (`expectNear 3 ± 2`) |
| a right-edge click | typing appends (`…2`) |
| a left-edge click | typing prepends (`1…`) |
| a `<textarea>` | `x`, Enter, `y` paints exactly `x\ny`, and the field autosizes to `64 ± 2` px |
| Up | returns to the previous line, so typing `z` yields `xz\ny` |

Two-direction proofs (both exit `1`, both restored):

- **M1 — the click point.** The middle click moved to the right edge:
  `a live middle click puts the caret inside the run: expected 3 ± 2, got 6`.
- **M2 — the field kind.** `pointer-area` rendered as an `<input>`:
  `Enter inserts a newline in a live textarea: expected "x\ny", got "xy"`.

Not claimed: a live press-drag-release selection gesture — the async host has no
`pressWindow`/`movePointer`/`releasePointer`, and `live-selection` already proves
a real drag selects through the renderer's own drag. Adding the verbs is a
separate task if a component ever needs a mid-drag observation (the headless
`pointer-text-entry` covers the release path).

The merge gate then ran the whole live registry at **53/53**, 1,125 checks, exit `0`. `nub run check` and `nub run test` pass.

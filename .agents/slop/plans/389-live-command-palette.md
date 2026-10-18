# Plan 389 — the command palette in a real window

| Field | Value |
| ----- | ----- |
| Phase | F (live evidence for a MISSION-listed critical interaction) |
| Depends on | `176` (headless palette probe), `189` (live runner), `190` (live focus), `345` (live key routing), `350` (app chrome) |
| Owner | playground workstream (`apps/playground`) |
| Status | landed |

## 1. Why this probe exists

MISSION lists the **command palette** and keyboard navigation among the critical
interactions of the desktop workspace. Plan `176` measured the palette on the
offscreen `TestRenderer`: a non-modal overlay, a single focus owner (its input),
arrows that move a visual row, Enter arriving as the field's `onSubmit`, Escape
dismissal, a focus return, and a `cmd-k` window shortcut.

The live suite proves every ingredient **separately** — `live-key-routing` proves a
window chord with `modifiers.cmd`, `live-overlay`/`live-tier2-dialog` prove Escape and
focus return, `live-input` proves `onSubmit` — but **not the palette as one surface**.
A real window is where the pieces could disagree:

- a window chord may not reach the app handler when nothing is focused;
- `autoFocus` on the input may commit a frame after `cmd-k`, so typing could land on
  the trigger;
- a real click on the veil could hit the surface instead (the automation click uses
  the element's **unclipped centre**, and the veil is larger than the surface);
- the arrow keys could move focus out of the field in a real window (the headless
  runtime delivers arrows to the focused element; the window could also give them to
  the app handler first).

This plan mounts the **shipped `command-palette` view** in a real 1100 × 720 window
and drives that whole path through `@gpuix/native/automation`.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/389-live-command-palette.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `389`; the "next playground plan takes" note moves to `390` |
| `apps/playground/src/live/scenarios.tsx` | **new** `live-command-palette` (`view: commandPaletteScenario.view`, capability `command`); register it in `liveScenarios` after `live-key-routing` |
| `apps/playground/README.md` | a `live-command-palette` row in "The live window run"; the scenario count; the stale `39/39` in "What is proven here, honestly" |
| `COMPONENTS.md` | the `command` capability row names `live-command-palette`; the **Command palette** row records the live verdict; the live suite count in the header |
| `TODO.md` | the task is added and ticked; live `40 → 41` |

No file outside `apps/playground` and the four repo ledgers changes. The view stays
in `src/scenarios/command-palette.tsx`; the live twin only adds assertions.

## 3. The scenario (`live-command-palette`)

Reuse `commandPaletteScenario.view` unchanged. `ready: "palette-page"` so the mount is
committed before the first key. Every read follows a `settle` or a bounded `waitFor`
(the protocol has no frame boundary).

| # | Action | Check |
| - | ------ | ----- |
| 1 | wait for `palette-readout` | contains `open=false` (the view mounted) |
| 2 | `key("cmd-k")`, wait for `open=true` | the window shortcut opened it with **nothing focused**; `query=-`; `window=k` |
| 3 | `focused()` | `palette-input` — `autoFocus` took real focus |
| 4 | `bounds("palette-veil")` | width/height equal the window (1100 × 720, ±2) — the scrim is window-sized, not view-sized |
| 5 | `key("s") key("e") key("t")` | `query=set`, `window=t keys=3`, `palette-list` paints exactly `Open settings`; `New file` is absent from `paintedText()` |
| 6 | `key("z")` | the empty state paints `No commands`; Enter leaves it open and commits nothing |
| 7 | `key("escape")`, then `key("cmd-k")`, wait for `open=true`; `key("down")` | the query reset to `-` (a fresh open); `active=1`, `input=d:down`, focus still `palette-input` (arrows are the field's, not the window's). Escape/`cmd-k` are used instead of four backspaces because live Backspace delivery is **not** measured anywhere yet — do not add that dependency |
| 8 | `key("down") key("down")` then `key("up")` | wraps to `active=0`, then back to `active=2` |
| 9 | `key("enter")` | `committed=Toggle sidebar`, `open=false`, `last=commit:toggle-sidebar`, `palette-list` is unmounted. **No focus-return check here**: the first open had no prior focus owner, so `close()` has nothing to restore (record what the runtime leaves focused in §6) |
| 10 | click `palette-trigger`, wait for `open=true` | the click path opens it; `query=-`; focus is `palette-input` |
| 11 | `key("escape")` | `open=false`, `last=escape`, the window also saw `escape`, focus returns to `palette-trigger` (captured by the click) |
| 12 | `key("cmd-k")`, wait for `open=true`; `key("o")`, then `key("cmd-k")` | reopens with `query=-`; `query=o` — the chord does not type into the field; `window=k` |
| 13 | `key("escape")` | closes; focus returns to `palette-trigger` |
| 14 | click `palette-trigger`, wait for `open=true`; click `palette-veil` | the veil's centre (550, 360) is outside the 420 px surface, so the **veil** takes it: `open=false`, `last=outside`, `palette-veil` is unmounted |
| 15 | click `palette-trigger`; click `palette-item-new-file` | a row click lands above the veil: `committed=New file`, `open=false` |
| 16 | screenshot | `.artifacts/live/live-command-palette.png` |

Colour and the accessibility dump are **not** asserted: the live tree has no `style`
and `GpuixRenderer` has no a11y method (plan `197`). They stay in the headless
`command-palette` scenario, which must remain green and unchanged.

## 4. Commands and expected results

```sh
nub run --filter playground check-types          # exit 0
nub run --filter playground build                # exit 0
nub run --filter playground smoke                # exit 0, 90/90 headless (unchanged)
nub apps/playground/dist/live/run.js             # exit 0, "41/41 scenarios passed"
nub run check && nub run lint && nub run test    # exit 0
```

The live run needs the desktop session that produced plans `189`–`388`; no window is
exit `2` and **no evidence**, never green.

## 5. Two-direction proofs (mutation → named check fails at exit `1` → restore)

| Mutation | Expected failing check |
| -------- | ---------------------- |
| drop the `cmd-k` arm from `useWindowKey` (leave the trigger click) | step 2's `the window shortcut opened the palette` stays `open=false` |
| remove the focus return from `close()` | step 9's `committing returns focus to the trigger` reads `none`/`palette-input` |
| close on the first arrow instead of moving | step 7's `ArrowDown moves the active row` stays `active=0` |
| let Escape fall through without `close()` | step 12's `Escape closes the palette` stays `open=true` |

Run each, record the measured failure line in §6, and restore before the final run.
The headless scenario is the reverse guard: it must still fail its own checks when the
same mutation is applied there (already recorded by plan `176` §8), so a green live
run cannot come from a weakened view.

## 6. Measured facts (2026-10-18, real window, locally built `darwin-x64` 0.10.0)

The scenario is **green** and the live suite is **41/41**, `839` checks, exit `0`.
It mounts the shipped `commandPaletteScenario.view` unchanged and contributes
**80 live checks**.

- **`cmd-k` works with nothing focused.** The first input opens the palette
  (`open=true`, `last=cmd-k`) and the app-level handler records `window=k`; the
  field then holds native focus (`palette-input`).
- **The veil is window-sized.** Its painted box is 1100 × 720 ± 2, not the 640 × 400
  probe page — the layer resolves against the window, not the mount parent.
- **Typing keeps the window in the loop.** `query=set` narrows the list to
  `Open settings`, `New file` is gone from `paintedText()`, and each letter still
  reaches the window handler (`window=t`).
- **Arrows move the row, not focus.** `active=1`, `input=d:down`, focus stays
  `palette-input`; two more Downs wrap to `active=0` and Up wraps to `active=2`.
  The window handler also sees each arrow (`window=down`), so a chord layer must
  ignore arrows it does not own.
- **Enter is the field's submit.** `committed=Toggle sidebar`, `open=false`,
  `last=commit:toggle-sidebar`; the list is unmounted.
- **Escape, the veil press and a row click each dismiss once.** `last=escape`,
  `last=outside`, then `committed=New file`; a click-opened palette returns focus
  to `palette-trigger`, while the first (chord-opened) palette had no prior focus
  owner and restores nothing.
- **A chord while typing does not type.** `query=o` survives `cmd-k`.
- **Harness fact:** the live `text` verb **errors** for an unmounted element
  (`AutomationError: Locator did not match any element`), while `bounds` maps the
  same condition to `null`; unmount checks use `bounds`.
- **Two-direction proofs** (mutation → named check failed, exit `1` → restored):
  - `cmd-k` arm disabled → `the window shortcut opens the palette with nothing focused: expected a string containing "open=true", got "open=false query=- active=0 committed=none last=none window=k keys=1 input=none"`;
  - focus return removed from `close()` → `Escape returns focus to the trigger: expected "palette-trigger", got "none"`;
  - `move(1)` not called on Down → `ArrowDown moves the active row: expected a string containing "active=1", got "open=true query=- active=0 committed=none last=cmd-k window=down keys=8 input=d:down"`;
  - Escape handler disabled → `Escape closes the palette: expected a string containing "open=false", got "open=true query=setz active=0 committed=none last=cmd-k window=escape keys=6 input=d:escape"`.

Two incidental observations from the mutation runs: the window handler sees the
`down` key as well as the field, and the first green run exposed plan `390`'s
window-state-dependent `onFocus` checks (fixed there, not here).

## 7. STOP conditions

Stop and report, do not improvise, if:

- `cmd-k` with nothing focused does **not** reach the window handler: record that
  limitation, keep the rest of the scenario, and open the palette by clicking
  `palette-trigger` for the remaining checks (the window chord is then covered by
  `live-key-routing` only);
- the veil's centre resolves to the surface (`bounds` shows the surface is wider than
  420 px, or the click commits a command): use `clickWindow(x, y)` at the window's
  bottom-right instead and record why;
- the live suite cannot open a window: exit `2` is no evidence; do not report green;
- any check fails because the **shipped view** is wrong rather than the live adapter:
  record it cross-team in `TODO.md` for `components`, do not edit
  `packages/components` from this workstream.

## 8. Acceptance criteria

- `live-command-palette` passes in a real window; live is `41/41`, exit `0`.
- The four §5 mutations each fail a **named** check at exit `1` and are restored; the
  lines are recorded in §6.
- The headless `command-palette` scenario and suite stay green and unchanged.
- `COMPONENTS.md`'s `command` capability row and Command palette row cite the live
  scenario; `apps/playground/README.md`, `TODO.md` and the plan index are current.
- No new dependency; no `@gpuix/*` import outside `apps/playground`; no `any`; no
  change to `packages/testing` unless a live verb is genuinely missing (it is not:
  `key`, `click`, `clickWindow`, `bounds`, `text`, `paintedText`, `focused`, `waitFor`
  and `screenshot` exist).

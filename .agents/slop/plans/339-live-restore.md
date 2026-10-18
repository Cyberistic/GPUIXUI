# Plan 339 — the workspace restore in a real window

| Field | Value |
| ----- | ----- |
| Phase | F (live evidence for a MISSION-listed critical interaction) |
| Depends on | `100`, `110`, `140`, `167` (workspace restore, headless), `189` (the live runner), `197` (the renderer-owned live reads) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Status | landed |

## 1. Why this probe exists

`workspace-restore` (plan `167`) measures the whole persistence contract in the offscreen
`TestRenderer`: a keyed remount loses the layout, app-owned JSON restores the split, both
tab lists, the active tab and the virtual-list anchor exactly including `offsetInItem`,
and native focus is **not** restored.

MISSION lists **workspace restore** among the critical interactions that must be verified
in the real runtime. The live suite covers the shell, input, focus, selection, motion,
overlays, docking, the float, tables, search, preview and the message scroller — but not
restore. The mechanism is exactly the one where the live window could differ:

- the split width is a **painted** value, read from bounds rather than React state;
- the anchor is read from the renderer the live runner owns (`getListScrollTop`) and
  re-applied with `scrollToItem` after a **keyed remount**, which the automation protocol
  has no verb for;
- a live divider drag is paced (plan `189`: six back-to-back moves are ignored), so the
  split the snapshot records is real.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | **new** `live-restore` (`view: workspaceRestoreScenario.view`, capability `workspace`); register it in `liveScenarios` |
| `apps/playground/README.md` | the "live window run" section: a restore row and the measured facts |
| `COMPONENTS.md` | the `workspace` capability row names `live-restore`; Workspace layouts / Persistent panel state note the live verdict |
| `TODO.md` | tick the live-restore task; live `20 → 21` |
| `.agents/slop/plans/README.md` | index row for `339` |

No file outside the playground workstream changes.

## 3. The scenario (`live-restore`)

Reuses the shipped probe view (`workspaceRestoreScenario.view`), so the live run proves
the **same implementation** the headless run does. No new component code.

Steps, each settling (`settle`) or waiting (`waitForText`/`waitForAnchor`) before reading:

| # | Action | Check |
| - | ------ | ----- |
| 1 | wait for `wr-live` | it reads `split=320 tabsA=one,two tabsB=none active=one`; `wr-saved` reads `saved=false` |
| 2 | `wr-pane-a` bounds | width ≈ `320` (±2) — the split is painted |
| 3 | drag `wr-divider` by `+80` (the live host paces the moves) | `wr-live` contains `split=400`; `wr-pane-a` width ≈ `400` (±2) |
| 4 | click `wr-tab-two` | `wr-live` contains `active=two` |
| 5 | click `wr-row-120` (painted after `scrollToItem("wr-list", 120, 16)` + settle) | native focus is `wr-row-120` |
| 6 | click `wr-save` | `wr-saved` contains `split=400`, `active=two` and `anchor=120,16` |
| 7 | click `wr-reset` | `wr-live` is back to the defaults; `waitForAnchor("wr-list", "0,0")` holds; `row 120` is not painted |
| 8 | click `wr-restore` | `wr-live` contains `split=400` and `active=two`; `waitForAnchor("wr-list", "120,16")` holds; `row 120` is painted and `row 0` is not |
| 9 | read focus before clicking | **not** `wr-row-120` — native focus is not restored |
| 10 | click `wr-row-121` | native focus is `wr-row-121`; the restored list accepts input |

`scrollToItem` is the live host's renderer verb (plan `197`); the anchor is read with
`listScrollTop`, never `scrollOffset` (it saturates — plan `166`).

## 4. Commands and expected results

```sh
# 1. type-check + offline tests
nub run --filter playground check-types          # exit 0
nub run --filter playground test                 # unchanged, exit 0

# 2. the new scenario in a real window
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-restore
# exit 0, "1/1 scenarios passed"

# 3. the whole live suite
nub apps/playground/dist/live/run.js
# exit 0, "21/21 scenarios passed"

# 4. the gates
nub run check && nub run lint && nub run test    # exit 0
```

## 5. Two-direction proofs (mutation → named check fails at exit `1` → restore)

| Mutation | Expected failure |
| -------- | ---------------- |
| drop the `scrollToItem` call from `RestorableList`'s mount effect | the restored anchor stays `0,0`, so `the restored row is painted` fails |
| snapshot `DEFAULT_WORKSPACE` instead of the live state in `save` | `the snapshot holds the split` fails (`saved split=320 … active=one`) |

Record each measured failure line in §6.

## 6. Measured facts (2026-10-18, real window, locally built `darwin-x64` 0.10.0)

The scenario is **green** and the live suite is **21/21**, exit `0`. The live run mounts
the shipped `workspaceRestoreScenario.view`, so the headless and live verdicts cover the
same implementation.

- **The painted split is the snapshot.** A paced live divider drag (six moves) takes
  `wr-pane-a` from 320 to 400 and the readout agrees; the save records `split=400`.
- **The tab activation is part of the state.** Clicking `wr-tab-two` makes `active=two`
  and it survives save → reset → restore.
- **A deep anchor survives the remount.** `scrollToItem("wr-list", 120, 16)` →
  `getListScrollTop` reports `[120, 16, h]`; after `wr-reset` (a real keyed remount) the
  anchor is `0,0` and row 120 is not painted; after `wr-restore` the anchor is again
  `120,16`, row 120 paints and row 0 does not.
- **A live row takes native focus, and focus is not restored.** Clicking row 120 focuses
  it before the save; after the restore the focus is **not** the row (it stays on the
  restore control), and a click on row 121 focuses it — the restored list accepts input.
- **Two-direction proofs** (mutation → named check failed, exit `1` → restored):
  - removed `scrollToItem` from the mount effect → `the restored row is painted: expected true, got false`;
  - saved `DEFAULT_WORKSPACE` → `the snapshot holds the split: expected a string containing "split=400", got "saved split=320 tabsA=one,two tabsB=none active=one anchor=120,16"`.

## 7. STOP conditions

Stop and report, do not improvise, if:

- the live host cannot resolve `wr-list` after a remount (`waitFor`/`listScrollTop`
  rejects): the remount is the probe's subject, so record the protocol failure;
- `scrollToItem` on the restored list does not change the anchor (record
  `listScrollTop` before/after; do not assert a React value instead);
- the paced divider drag does not move the split (record the painted width; a live drag
  that does not resize is a harness finding, not a pass);
- the window cannot open: exit `2` means no evidence, never green.

## 8. Acceptance criteria

- `live-restore` passes in a real window on this host and the full live suite is
  `21/21`, exit `0`.
- The mutation proofs in §5 were run and restored; the failing labels are in §6.
- The headless `workspace-restore` scenario is unchanged and still green.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index record the
  live verdict, not the intent.
- No new dependency; no `@gpuix/*` import outside `apps/playground`; no `any`.

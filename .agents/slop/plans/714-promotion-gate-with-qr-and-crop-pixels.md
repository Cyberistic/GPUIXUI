# 714 — The promotion gate on the head that includes the QR and crop pixels

**Phase:** F (release). **Depends on:** `639`, `653`, `656`, `702`, `707`,
`708`, `713`. **Number:** the first free number after `713` (other workstreams
hold `709`–`712`).

**This plan is verification only. No source change.** It exists because the last
full live gate (plan `702`, `1cb4d302`) predates three check-adding commits:

| plan | id | live checks then → now |
| ---- | -- | ---------------------- |
| `707` | `live-diff` | 24 → **31** (+7) |
| `708` | `live-qr` | 45 → **52** (+7) |
| `713` | `live-crop-area` | 10 → **18** (+8) |

So the recorded live total `2616` no longer describes the branch, and the
promotion entry in `TODO.md` needs a gate on the current head.

## 1. Preconditions

1. `git status --short` is clean and `git log -1` is the plan commit.
2. `git merge-base --is-ancestor origin/master HEAD` succeeds (the promotion is
   still a fast-forward). If `origin/master` has advanced, merge it **into this
   branch** first and re-run every command below; resolve conflicts here, never
   on master.
3. `nub apps/playground/dist/live/run.js --list` prints **95** ids.
4. `nub apps/playground/dist/smoke/run.js --list` prints **106** ids.

STOP if any precondition fails; report which one.

## 2. Commands

From `/Users/cyberistic/GPUIXUI/workspaces/playground`.

```sh
nub run --filter playground build          # dist matches the head
nub apps/playground/dist/smoke/run.js      # the whole headless registry
nub apps/playground/dist/live/run.js --all # the whole live registry (merge gate)
nub run check && nub run lint && nub run test
```

The live run opens one real window and took ~18 minutes on the last gate; do not
interrupt it, and do not run it concurrently with another full run.

## 3. Expected results

- Headless: **106/106**, exit `0`, **3887** checks, 65 capabilities,
  `crop=verified`; 8 of those checks are `crop-area`'s new frame samples.
- Live: **95/95**, exit `0`, **~2638** checks (2616 + 7 + 7 + 8), 61
  capabilities; `live-diff` 31, `live-qr` 52, `live-crop-area` 18.
  `live-tier2-editing` may report 31–33 (its measured window-state branch,
  plan `605`), which moves the total by ±2.
- A plain run writes **no** `provenance.json` and no capture directory.
- `check`/`lint`/`test`: green; playground **466** tests, testing 68,
  components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7.

Read the totals back from `apps/playground/.artifacts/smoke-report.json` and
`live-report.json` rather than from the console tail; count `scenarios`,
summarise `checks`, and quote `host` (it must name the release-tag pins
`gpuix 9fcd6288` / `zed 81c99f81`).

## 4. STOP conditions

- Any scenario fails: **do not** re-run hoping for green. Capture the failing
  check's expected/actual, decide whether it is the plan-713 code or a
  pre-existing flake, and record it. A focus-only failure in a scenario this
  branch did not touch is the window-state class (plans `390`/`603`): note it,
  re-run that id once, and record both runs.
- The live total differs from §3 by more than ±2 with no failing scenario:
  recount from the registry (`--list`) and from the report; do not hand-wave.
- `--all` cannot open a window (exit `2`): the host has no binding. Report it —
  a gate without a live run is not a gate.
- `origin/master` moved **during** the run: the numbers describe the pre-merge
  head; say so in the record and re-run after the merge.

## 5. Records to update (only after a green run)

- `TODO.md` — the promotion entry: replace the stale gate numbers with this run
  (head, date, both totals, durations, artifact paths), and add a `[x]` gate row
  at the top of the playground block.
- `apps/playground/README.md` — the "Evidence on this host" section and the
  "last full merge/release gate" paragraph: cite this gate, its head and totals,
  and the per-id check counts above.
- `COMPONENTS.md` — only if a row cites a stale live total (the crop row already
  quotes plan `713`); otherwise no change.
- `.agents/slop/plans/README.md` — this plan's row, with the measured totals.

## 6. Acceptance

- Both full registries ran on the head that will be merged, both exit `0`, and
  the totals are written into the four ledgers above with the exact ids
  (`--all` for both) and the artifact paths.
- `nub run check`, `nub run lint`, `nub run test` green on the same head.
- One commit on `agent/playground` recording the gate, pushed to origin. The
  merge itself is the owner/supervisor's — this workstream never pushes to
  master.

## 7. As measured (2026-10-20)

Verification only on code head `f91537b0`, 0 behind `origin/master`:

| Registry | Result | Checks | Capabilities | Duration |
| -------- | ------ | ------ | ------------ | -------- |
| headless | **106/106**, exit `0` | **3887** | 65 | 196.4 s |
| live | **95/95**, exit `0` | **2638** | 61 | **1104.9 s** |

`crop-area` 82, `live-crop-area` 18, `live-diff` 31, `live-qr` 52 and
`live-tier2-editing` 32 (the predicted 31–33 branch); the live total is
`2616 + 7 + 7 + 8` exactly. Both `host` lines carry the release-tag pins
(`gpuix 9fcd6288`, `zed 81c99f81`), and a plain `--all` wrote no
`provenance.json` and no capture directory. `nub run check`, `nub run lint` and
`nub run test` are green (playground **466**, testing 68, components 308,
primitives 282, tokens 196, tw 103, icons 19, docs 7). No source change; the
ledgers cite this run and it is the gate for the promotion fast-forward.


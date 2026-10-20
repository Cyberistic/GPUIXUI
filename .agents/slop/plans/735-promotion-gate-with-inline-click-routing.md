# 735 — The promotion gate on the head that includes the inline click-routing probe

**Phase:** F (release). **Depends on:** `639`, `653`, `656`, `702`, `714`,
`723`, `724`, `734`. **Number:** the first free number after `734`.

**This plan is verification only. No source change.** It exists because the last
full gate (plan `723`, code head `74e27a3f`) predates two check-adding commits:

| plan | id | registry | checks then → now |
| ---- | -- | -------- | ----------------- |
| `724` | `click-routing` | headless | new id → **18** |
| `734` | `click-routing` | headless | 18 → **33** (+15) |
| `724` | `live-click-routing` | live | new id → **13** |
| `734` | `live-click-routing` | live | 13 → **25** (+12) |

So the recorded headless total `3902` and live total `2663` no longer describe
the branch: the expected totals are `3902 + 33 = 3935` and
`2663 + 25 = 2688`, and each registry gained one id (`106 → 107`,
`95 → 96`). The gate measures the truth; the ledger takes the measured number,
not this prediction.

The branch is the promotion candidate: `TODO.md` → *Promote the playground
workstream to the integration branch* is `[~]` (prepared; the owner/supervisor
runs the merge). The workstream never pushes to master.

## 1. Preconditions

From `/Users/cyberistic/GPUIXUI/workspaces/playground`:

1. `git status --short` is empty and `git log -1 --oneline` names this plan's
   commit.
2. `git merge-base --is-ancestor origin/master HEAD` succeeds (the promotion is
   still a fast-forward). If `origin/master` has advanced, merge it **into this
   branch** first and re-run every command below; resolve conflicts here, never
   on master.
3. `nub apps/playground/dist/smoke/run.js --list | wc -l` prints **107**.
4. `nub apps/playground/dist/live/run.js --list | wc -l` prints **96**.

STOP if any precondition fails; report which one.

## 2. Commands

```sh
nub run --filter playground build            # dist matches the head
nub apps/playground/dist/smoke/run.js         # the whole headless registry (bare = all)
nub apps/playground/dist/live/run.js --all    # the whole live registry (merge gate)
nub run check && nub run lint && nub run test
```

The headless runner's bare command is the whole suite; `--all` is a usage error
there (exit `2`). The live run opens one real window and took ~19 minutes on the
last gate; do not interrupt it, and do not run it concurrently with another full
run.

## 3. Expected results

- Headless: **107/107**, exit `0`, **3935** checks, 65 capabilities,
  `click-routing` **33**.
- Live: **96/96**, exit `0`, **2688** checks, 61 capabilities,
  `live-click-routing` **25**.
  `live-tier2-editing` may report 31–33 (its measured window-state branch,
  plan `605`), which moves the total by ±2.
- A plain run writes **no** `provenance.json` and no capture directory.
- `check`/`lint`/`test`: green; playground **481** tests, testing 69,
  components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7.

Read the totals back from `apps/playground/.artifacts/smoke-report.json` and
`live-report.json` rather than from the console tail; count `scenarios`,
summarise `checks`, and quote `host` (it must name the release-tag pins
`gpuix 9fcd6288` / `zed 81c99f81`).

For each expected check count, the per-id number is in the report's scenario
entries; a delta that is not the table above is a real finding, not rounding.

## 4. STOP conditions

- Any scenario fails: **do not** re-run hoping for green. Capture the failing
  check's expected/actual, decide whether it is the plan-724/734 code or a
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

- `TODO.md` — the promotion entry: append this gate (head, date, both totals,
  durations, artifact paths) and add a `[x]` gate row at the top of the
  playground block. Correct any figure the gate contradicts.
- `apps/playground/README.md` — §"Evidence on this host": cite this gate, its
  head, both totals and the two new ids with their check counts; delete the
  stale `3920` and the plan-`724`-only live note (`2663 + 13`).
- `COMPONENTS.md` — only the rows that quote a stale total (`input` row's
  scenario list already names both ids; the evidence paragraph does not).
- `.agents/slop/plans/README.md` — this plan's row, with the measured totals.

## 6. Acceptance

- Both full registries ran on the head that will be merged, both exit `0`, and
  the totals are written into the ledgers above with the exact ids (`--all` for
  the live registry) and the artifact paths.
- `nub run check`, `nub run lint`, `nub run test` green on the same head.
- One commit on `agent/playground` recording the gate, pushed to origin. The
  merge itself is the owner/supervisor's.

## 7. As measured

To be filled after the run.

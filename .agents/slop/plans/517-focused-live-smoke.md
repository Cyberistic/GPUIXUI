# 517 — Focused live smoke: stop paying for all 42 scenarios

| Field | Value |
| ----- | ----- |
| Status | done — focused `live-input` 1/1; `nub run check` + `nub run test` pass |
| Phase | infra (test loop) |
| Owner | playground workstream (implemented on `agent/smoke-scope`) |
| Depends on | `110`, `120`, plans `189`/`391` |
| Feeds | every workstream's verification step, the swarm prompt |

## 1. Bug

The live runner always drove `liveScenarios` and ignored `process.argv`:

```ts
const report = yield* Smoke.runAsyncScenarios(host, liveScenarios, ...);
```

A one-component change therefore cost a full 42-scenario window run (~9
minutes, and a real window on the desktop). The playground agent's mutation
proofs each paid that cost: `/tmp/live-m1.log` … `/tmp/live-m5.log`, then a
clean re-run, are six full windows for one reorder probe. The headless runner
already has `--only`; the live twin never got it.

The agent prompt also did not distinguish iteration from the final gate, so
"verify in the real runtime" meant "run the whole suite".

## 2. Fix

1. Add pure CLI parsing/selection in `apps/playground/src/live/cli.ts`:
   - `--only <id[,id]>`, repeatable; registry order, duplicates removed;
   - `--all` for the full suite (explicit);
   - `--list` prints the live ids and exits without opening a window;
   - `--json` prints the report JSON after a run;
   - no `--only` and no `--all` is a usage error (exit `2`), not a full run;
   - an unknown id lists the known ids and exits `2` without a window;
   - unknown flags are a usage error (a typo must not run everything).
2. `apps/playground/src/live/run.ts` uses the parser and passes the selected
   scenarios to `Smoke.runAsyncScenarios`. `--list` / usage errors return before
   the native imports and `createRenderer`.
3. `apps/playground/package.json`: `smoke:live` becomes the explicit full run
   (`--all`). Focused runs are the binary plus `--only`.
4. `apps/playground/README.md`: document the two modes.
5. `scripts/swarm-supervisor.sh` prompt: verification is scoped. Use
   `--only <id>` during iteration; the full suite is a final-gate/merge action.
   Re-read the prompt file at the top of each runner turn so prompt edits apply
   without restarting the loop.

## 3. Exact commands

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/smoke-scope
nub run --filter playground test                 # cli.test.ts + existing tests
nub run --filter playground build
nub apps/playground/dist/live/run.js --list
nub apps/playground/dist/live/run.js --only live-tier2-toast
nub apps/playground/dist/live/run.js             # exit 2, usage, no window
nub apps/playground/dist/live/run.js --only nope # exit 2, names the id
nub run check && nub run lint && nub run test
```

Expected: `--list` exits `0` with 42 ids; a focused run opens one window and
runs one scenario; the bare command prints usage and exits `2`.

## 4. STOP conditions

- The 0.10.0 native binding is unavailable: the headless tests still run; do
  not claim a live pass. Record `exit 2` as no evidence.
- `nub run check`/`lint`/`test` fail for a reason outside these files: stop and
  report the failing command; do not paper over it.
- The playground worktree has uncommitted work: this branch is independent;
  merge only after the playground agent commits.

## 5. Test plan

`apps/playground/src/live/cli.test.ts` (pure vitest, no window), header comment
names the bug guarded:

- no flags leaves `only` empty and `all` false (the runner rejects it);
- `--only a,b --only c` selects exactly `a,b,c`;
- selection preserves registry order and drops duplicates;
- an unknown id is reported in `missing` and is not silently ignored;
- `--list` sets the list flag;
- a missing `--only` value and an unknown flag land in `unknown`;
- `formatMissing` names the bad id and the valid ids.

Both directions: the selection tests fail against the old
`runAsyncScenarios(host, liveScenarios, ...)` behavior because the old runner
had no selection input; the CLI tests fail against a parser that ignores argv.

## 6. Acceptance

- A focused live run is one scenario in one window.
- A bare live run cannot start the full suite by accident.
- The prompt tells agents to use `--only` during iteration and `--all` at the
  final gate.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 7. Results (2026-10-18)

```text
$ nub apps/playground/dist/live/run.js --list
live-shell
live-input
… 42 ids

$ nub apps/playground/dist/live/run.js --only live-input
live smoke: running 1 scenario(s): live-input
ok     input        live-input  425ms  Live input: typing and submit in a real editor
1/1 scenarios passed · capabilities: input=verified
exit 0

$ nub apps/playground/dist/live/run.js
live smoke: no scenario selected
usage: …
exit 2

$ nub apps/playground/dist/live/run.js --only live-nope
live smoke: unknown scenario id: live-nope
  known ids: …
exit 2

$ nub run check   # check:tests, lint, fmt, check-types
$ nub run test    # 25 files, 309 tests in apps/playground; all packages green
```


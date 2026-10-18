# 531 — The headless smoke CLI guards its arguments

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (evidence integrity) |
| Owner | playground |
| Depends on | `517` (the live CLI's scoped selection), `529` (the pinned binding) |
| Paths | `apps/playground/src/smoke/`, `apps/playground/src/live/cli.ts`, `apps/playground/src/scenario-selection.ts`, `apps/playground/README.md` |

## 1. The defect (measured, 2026-10-18)

The live CLI got scoped selection and argument guards in plan `517`. The headless
CLI did not. Two measured failures, both reproduced on this host with the built
CLI:

```sh
nub apps/playground/dist/smoke/run.js --only not-a-scenario
# -> "0/0 scenarios passed · capabilities:" and exit 1
#    It names neither the bad id nor the valid ones, and the README's exit table
#    says "nothing ran" is 2 (no evidence), not 1 (a failed check).
```

```sh
nub apps/playground/dist/smoke/run.js --bogus
# -> "ignoring unknown flag: --bogus" and then the *whole* suite runs (~137 s).
#    A typo is silently reinterpreted as "run everything".
```

The parser already collects unknown tokens (`ParsedArgs.unknown`), but `program`
only logs them. `selectScenarios` filters to zero for an unknown id, and
`Report.passed` correctly treats an empty run as not passed — so the exit code is
honest (`1`) but the *message* and the *contract* are not: no evidence must be
`exit 2`, and a usage error must fail before the binding is imported.

There is also no headless `--list`, so an operator cannot discover the 101 ids
without loading the native binding (the live runner has had `--list` since
`517`).

## 2. The contract after this plan

```text
usage:
  --only <id[,id]>  run only these scenarios (repeatable; default: all)
  --list            print the scenario ids and exit 0
  --screenshots     capture one screenshot per scenario
  --artifacts <dir> where the report and screenshots land
  --json            print the JSON report as well
exit 2: no native evidence (unsupported host, or nothing ran)
```

Rules, in order:

1. Any unknown token is a usage error: print the token and the usage, exit `2`,
   do **not** run the suite or import the binding. An `--only` value with no ids
   in it (`--only ","`) is the same as a missing value.
2. Any `--only` id the registry does not know is a usage error: name the bad ids
   and the known ids, exit `2`, do **not** import the binding. (The live CLI's
   `formatMissing` text, shared.)
3. `--list` prints the registry ids, one per line, exit `0`, **before** the
   binding is imported. A usage error wins over `--list`.
4. Otherwise run the selection. No `--only` still means the full headless suite —
   this is the documented `smoke` command and stays unchanged. Unlike live, the
   headless suite does not need an explicit `--all`.
5. `--only` accepts repeats and comma-separated ids, preserving registry order and
   dropping duplicates, exactly like live (`LiveFlags.only`).

## 3. Changes, file by file

### 3.1 New: `apps/playground/src/scenario-selection.ts`

The generic selection rules currently live twice (in `live/cli.ts` and in
`scenarios/index.ts`). Hoist them once:

- `parseIds(value: string): ReadonlyArray<string>` — split on `,`, trim, drop
  blanks (move `live/cli.ts`'s `ids`).
- `idsOf<A extends { id: string }>(list): ReadonlyArray<string>` (move).
- `interface Selection<A> { selected; missing }` (move `LiveSelection`).
- `selectScenarios<A>(list, only: ReadonlyArray<string>): Selection<A>` — full
  list for an empty selection, registry order, duplicates dropped, unknown ids
  reported in `missing` (move `selectLive`).
- `formatMissing(suite: "native smoke" | "live smoke", missing, known): string` —
  the live wording, parameterised by suite name (move `formatMissing`).

### 3.2 `apps/playground/src/live/cli.ts`

Replace the moved bodies with imports; keep the public names its tests and
`live/run.ts` already use (`idsOf`, `selectLive`, `formatMissing` and the
`LiveSelection` type as aliases), so `live/cli.test.ts` and `live/run.ts` need no
import changes. `LiveFlags.only` stays `ReadonlyArray<string>`.

### 3.3 `apps/playground/src/scenarios/index.ts`

Delete `selectScenarios`; selection is not a property of the registry.

### 3.4 `apps/playground/src/smoke/run.ts`

- `CliFlags`: `only: ReadonlyArray<string>` (was `Option.Option<string>`), add
  `list: boolean`.
- `parseArgs`: accept `--list`; accept repeats and `a,b` for `--only` through
  `parseIds`; keep collecting unknown tokens and missing values.
- Add `usage` (the §2 text) and
  `usageProblem(parsed, known): Option.Option<{ message: string; exit: ExitCode }>`
  implementing rules 1–2 with `Arr.match` + `HashSet` membership.
- Add `runMain(argv, deps): Effect.Effect<ExitCode>`: `parseArgs` → usage problem
  → `--list` → `runScenarioCli`. It is the whole decision surface and takes its
  `detect` / `runSuite` / `log` / `error` effects injected, so the guard can be
  tested without a binding.
- Change `RunDeps.runSuite` to a thunk `() => Effect.Effect<ExitCode>` so an
  unsupported host or a usage error still evaluates nothing observable.
- `program(flags)` loses its `unknown` parameter and the "ignoring unknown flag"
  loop; it no longer decides anything about arguments.
- `main(argv = process.argv.slice(2))` wires the real deps (unchanged runtime
  boundary); the entrypoint passes nothing.

### 3.5 `apps/playground/README.md`

Update the `Run it` block and the flags line: add
`nub apps/playground/dist/smoke/run.js --list`, show `--only a,b` (repeatable),
and state that an unknown flag or id exits `2` before the binding loads. Keep
the existing exit-code table — this plan makes the code agree with it.

## 4. Commands and expected results

Run from the worktree root. While iterating:

```sh
nub run --filter playground test
# expect: every playground test file passes; run.test.ts and live/cli.test.ts
# both exercise the selection rules.

nub run --filter playground build
# expect: exit 0.

nub apps/playground/dist/smoke/run.js --list | head -3
# expect: three ids, exit 0, no native import (instant).

nub apps/playground/dist/smoke/run.js --only layout-flex
# expect: "1/1 scenarios passed · capabilities: layout=verified", exit 0.

nub apps/playground/dist/smoke/run.js --only layout-flex,nope
# expect: "native smoke: unknown scenario id: nope", the known ids, exit 2, < 5 s.

nub apps/playground/dist/smoke/run.js --bogus
# expect: "native smoke: unknown argument: --bogus", the usage, exit 2, < 5 s,
#         and no "ok" scenario line.
```

End of task (the CLI is cross-cutting):

```sh
nub apps/playground/dist/smoke/run.js
# expect: the full headless suite, exit 0; record the count from the report.

nub run check
nub run lint
nub run test
```

Do **not** run the full live suite: no live file changes, and it is a merge gate.

## 5. Test plan

In `apps/playground/src/smoke/run.test.ts` (the file already owns the CLI
contract; extend its header comment with the two bugs):

| Test | Catches |
| ---- | ------- |
| `parseArgs(["--only","a,b","--only","c"])` → `["a","b","c"]` | a repeat or comma being dropped |
| `parseArgs(["--list"])` → `list === true`, no unknown token | `--list` falling through to a full run |
| `usageProblem` with `--onlyy x` → `Some`, message names `--onlyy` and `usage:`, exit `2` | the measured "ignoring unknown flag" path |
| `usageProblem` with `--only layout-flex,nope` → `Some`, names `nope` and `layout-flex`, exit `2` | the measured `0/0` path |
| `usageProblem` with `--only layout-flex` → `None` | a valid id being rejected |
| `runMain(["--list"], deps)` → `EXIT.passed`, `log` lists every registry id, `detect` is `Effect.die("loaded the binding")` and never runs | the binding loading before `--list` |
| `runMain(["--bogus"], deps)` and `runMain(["--only","nope"], deps)` → `EXIT.unverified`, error text, `runSuite` never called (also `Effect.die`) | the suite running on a usage error |
| `runMain(["--only","layout-flex"], deps)` with an unsupported `detect` → `EXIT.unverified`, remedy printed, `runSuite` not called | the preflight path regressing while refactoring |

Update the existing `runScenarioCli` test to the thunk form.

**Two-direction proofs** (perform each, run the focused file, revert):

- M1 — make the missing-id branch return `Option.none()`: the unknown-id test
  fails with `expected 2, got 0` (and the suite would run).
- M2 — ignore `parsed.unknown` in `usageProblem`: the unknown-flag test fails.
- M3 — move the `--list` branch after `runScenarioCli`: the `--list` test fails
  with the injected defect (`loaded the binding`).
- M4 — treat an absent selection as an empty list in `selectScenarios`: the
  `runMain(["--only","layout-flex"])` and `--list` tests are unaffected, but the
  live CLI's "returns the full registry only when the selection is empty" test
  fails — proving the shared rule is the one both CLIs use.

## 6. Results (2026-10-18)

All six §4 commands matched:

| Command | Result |
| ------- | ------ |
| `--list` | exit `0`, **101** ids, one per line, ~2 s (no binding) |
| `--only layout-flex` | `1/1 scenarios passed · capabilities: layout=verified`, exit `0` |
| `--only layout-flex,nope` | `native smoke: unknown scenario id: nope` + all 101 known ids, exit `2`, ~2 s |
| `--bogus` | `native smoke: unknown argument: --bogus` + usage, exit `2`, ~2 s |
| full suite | **101/101, 3536 checks**, exit `0`, 106 s |
| live `--only live-input` | `1/1 scenarios passed · capabilities: input=verified`, exit `0` — the refactored live CLI still opens a window and runs (no live file was otherwise changed) |
| `nub run check` / `lint` / `test` | exit `0`; playground 32 files / **408 tests** (was 397 — 11 new CLI tests), components 308, primitives 282, icons 19 |

Four mutation proofs, each observed and reverted (`nub exec vitest run
src/smoke/run.test.ts src/live/cli.test.ts`):

- **M1** missing-id branch → `Option.none()`: `usageProblem` names no id and
  `runMain(["--only","nope"])` dies with `loaded the binding` — 2 failures.
- **M2** unknown tokens ignored: `--onlyy` is accepted and `runMain(["--bogus"])`
  loads the binding — 2 failures.
- **M3** `--list` moved after the preflight: the list test dies with
  `loaded the binding` — 1 failure.
- **M4** empty selection → empty list in the shared module: the live CLI's
  "returns the full registry only when the selection is empty" test fails,
  proving both CLIs now read the same rule.

Two formatting-only reflows were needed (`oxfmt`), then `check` was green.

## 7. STOP conditions

- The full headless suite is not green before this change for a reason unrelated
  to the CLI (`--only layout-flex` in §4 already establishes the baseline).
  STOP and report the failing scenario; do not "fix" it in this plan.
- `nub run check` needs a change outside the paths in §3. STOP: that is a
  cross-team task, record it in `TODO.md`.
- `--list` cannot avoid the binding load because the registry module itself
  imports native code. STOP and record why; do not fake it by loading then
  printing.
- Any need to change a scenario, a capability or the report schema. STOP — this
  plan is arguments only.

## 8. Acceptance

- The six §4 commands print exactly what §4 says (exit codes included).
- The four mutation proofs fail in the stated direction and the restored code is
  green.
- `nub run check`, `nub run lint`, `nub run test` pass; the full headless suite
  exits `0` and its total is recorded in `TODO.md`.
- `apps/playground/README.md` documents `--list`, the repeatable `--only` and the
  exit-2 usage errors.
- Plan status set to `landed` here and in `.agents/slop/plans/README.md`; the
  matching `TODO.md` row ticked.

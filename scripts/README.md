# scripts/

Repo tooling. Everything runs through `nub`.

| Script | What it is |
| ------ | ---------- |
| `check-tests.ts` | The "a test has to be able to fail" gate — part of `nub run check` |
| `verify-two-directions.sh` | Proves a fix's test fails without the fix |
| `swarm-supervisor.sh` | The 30-minute supervisor tick: records progress, keeps ≥5 agents alive |
| `swarm-model.sh` | The model fallback chain every workstream loop reads before each turn |
| `swarm-daemon.sh` | The driver that actually ticks on a headless box (see `.agents/slop/README.md`) |
| `install-swarm-supervisor.sh` | Installs/restarts the launchd agent, the crontab entry and the daemon |

## The swarm model fallback chain

`swarm-model.sh` is the single authority for which model the swarm runs on.
Every workstream loop reads it before each `opencode run`; only this script
writes the state file, so all five agents move together and none keeps hammering
an exhausted model.

| Rung | Model | Availability |
| ---- | ----- | ------------ |
| 1 | `opencode-go-braven/deepseek-v4.1-flash` | the primary; the swarm's default |
| 2 | `opencode/deepseek-v4.1-flash-free` | the free opencode tier |
| 3 | `deepseek-braven/deepseek-flash` | **no credential configured yet** |

Rungs are overridable with `GPUIXUI_MODEL_RUNG1|2|3`. Rung 3 needs an
`auth.json` entry for `deepseek-braven` (or `DEEPSEEK_API_KEY`); until then
`swarm-model.sh rungs` reports it unavailable and `advance` stops at rung 2
rather than switching to a model that cannot answer.

State lives in `.agents/slop/swarm-model.state` (gitignored):

```
model=opencode-go-braven/deepseek-v4.1-flash
rung=1
reason=seeded: the primary, as the swarm has always run
since=2026-10-17T03:57:23Z
last_probe=
```

**The limit detector.** `swarm-model.sh classify <exit-code> <stdout> <stderr>`
exits 0 and prints the signature when a run failed on a limit. The rule is the
one opencode itself ships (`@opencode/ai/errors`, the quota and rate-limit code
sets): a quota/usage/billing code, `insufficient quota|balance`, status 402, a
rate-limit / `too_many_requests` / throttling code, status 429, or "rate limit"
in the message. A model that has gone away (`Model unavailable`) counts too — the
model is spent either way. A context overflow or a bad key is a real failure and
must not move the swarm.

An error line naming a limit counts whatever the exit code; the whole output is
scanned only when the run actually failed, so a successful turn that merely
writes *about* rate limits does not move the swarm. `swarm-model.sh selftest`
runs those recorded shapes and every case must hold.

**Escalation.** On a limit the loop calls `advance <the model that failed>
<reason>`, which moves one rung and logs `switch: <from> -> <to> (rung N) —
<reason>`. Naming the failed model makes it idempotent: five workstreams hitting
the same limit at once move one rung, not five. A limit does not count against
the loop's five-failure budget — it is not a broken workstream.

**Recovery.** The supervisor's tick calls `swarm-model.sh probe`, which re-probes
the primary at most once an hour (`GPUIXUI_RECOVERY_INTERVAL`, default 3600s) and
logs `recovery: <from> -> <primary> — <reason>` when the primary answers again.
The cadence is skipped entirely while the swarm is already on the primary, so a
healthy swarm pays nothing.

Every switch, skip and recovery is one line in `.agents/slop/swarm-supervisor.log`
with the model, the reason and the timestamp.

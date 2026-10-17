# scripts/

Repo tooling. Everything runs through `nub`.

| Script | What it is |
| ------ | ---------- |
| `check-tests.ts` | The "a test has to be able to fail" gate — part of `nub run check` |
| `verify-two-directions.sh` | Proves a fix's test fails without the fix |
| `swarm-supervisor.sh` | The 30-minute supervisor tick: records progress, keeps ≥5 agents alive |
| `install-swarm-supervisor.sh` | Installs/restarts the supervisor's launchd agent |

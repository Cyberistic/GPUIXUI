# .agents/slop

Agent state. Nothing outside agent tooling may write here.

| Path | What it is |
| ---- | ---------- |
| `plans/` | Implementation plans — the swarm's first deliverable, indexed in `plans/README.md` |
| `swarm-status.log` | One timestamped status line per supervisor tick |
| `swarm-supervisor.log` | The supervisor's own log |
| `swarm/` | Supervisor state: agent PIDs, per-agent output logs (gitignored) |
| `rd/` | Scratch research output |
| `*.log` | Transient session logs (gitignored) |

Everything here is a working note. Anything that becomes a durable fact belongs
in `PLAN.md`, `TODO.md`, `COMPONENTS.md`, `docs/`, or an ADR.

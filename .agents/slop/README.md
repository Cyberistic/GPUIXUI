# .agents/slop

Agent state. Nothing outside agent tooling may write here.

| Path | What it is |
| ---- | ---------- |
| `plans/` | Implementation plans — the swarm's first deliverable, indexed in `plans/README.md` |
| `swarm-status.log` | One timestamped status line per supervisor tick |
| `swarm-supervisor.log` | The supervisor's own log |
| `swarm-daemon.log` | Output of the tick daemon's loop |
| `swarm/` | Supervisor state: agent PIDs, per-agent output logs (gitignored) |
| `rd/` | Scratch research output |
| `*.log` | Transient session logs (gitignored) |

## Why the tick is driven by a daemon and not only by launchd

The supervisor is installed as a launchd agent (`dev.gpuixui.swarm`,
`StartInterval 1800`) — the idiom on this machine — but a per-user launchd agent
**cannot be bootstrapped from an SSH session here**. The evidence, from the box:

```
$ launchctl managername
Background
$ launchctl bootstrap gui/502 ~/Library/LaunchAgents/dev.gpuixui.swarm.plist
Bootstrap failed: 125: Domain does not support specified action
$ launchctl bootstrap user/502 ~/Library/LaunchAgents/dev.gpuixui.swarm.plist
Bootstrap failed: 5: Input/output error
$ launchctl load ~/Library/LaunchAgents/dev.gpuixui.swarm.plist
zsh: abort   (exit 134)
```

The same failure happens with the pre-existing `dev.meow.agent.plist`, so it is
the session, not the job. There is no Aqua session for this account (`who` shows
only the console user), so `gui/502` does not exist and cannot be created without
root. `cron` is no better: `/usr/sbin/cron` runs, but jobs are silently not
executed (macOS requires Full Disk Access for `cron`, which needs a GUI).

So the tick is driven by `scripts/swarm-daemon.sh`: a `nohup` loop started now,
restarted on any shell login by a hook in `~/.zprofile`, and picked up by launchd
at the next graphical login. Every path takes the same lock, so the ticks never
overlap and a duplicate tick starts nothing.


Everything here is a working note. Anything that becomes a durable fact belongs
in `PLAN.md`, `TODO.md`, `COMPONENTS.md`, `docs/`, or an ADR.

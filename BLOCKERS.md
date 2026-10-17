# BLOCKERS — the swarm owns these

These are the two things standing between the swarm and a working library. They are
**the highest-priority work** and they are yours to solve. Do not wait for a human.

**Rule:** like every other change, each fix starts as a high-detail plan under
`.agents/slop/plans/` (exact files, commands, expected results, STOP conditions, a test
plan), indexed in `.agents/slop/plans/README.md`, before any implementation.

## B1 — GPUix native bindings fail to install (blocks `apps/playground` and every native smoke test)

The `playground` workstream hit a real GPUix native-binding install failure on this box.
This is the mission's stated biggest risk: until it is resolved we cannot know whether
GPUix supports the layout, input, focus, overlay and panel primitives the library needs,
and no component may be called "done" without a native runtime check.

Do: capture the exact error and the command that produced it; check the GPUix docs and
its issue tracker for the supported install path on **macOS x86_64** (this box is Intel —
arm64-only prebuilds will not run); try the documented alternatives (prebuilt vs
build-from-source, the pinned toolchain, the version the reference repo uses); write a
minimal reproduction; and record the outcome in `.agents/slop/plans/` either as a working
setup or as a precise, evidenced limitation with the affected components listed.
Evidence lives in the worktree that hit it — find it there first.

## B2 — the swarm has no durable scheduler (it runs on a detached daemon)

`scripts/swarm-supervisor.sh` + `scripts/swarm-daemon.sh` tick every 30 minutes, and
`dev.gpuixui.swarm.plist` (launchd, `StartInterval 1800`) and a `*/30 * * * *` crontab
entry are installed — but **neither actually fires on this box**:

- launchd cannot bootstrap from this account's SSH session: `launchctl managername` is
  `Background`, there is no `gui/<uid>` domain, `bootstrap user/<uid>` returns EIO and
  `launchctl load` aborts (134). The pre-existing `dev.meow.*` agents fail identically.
- macOS `cron` runs but silently refuses jobs without Full Disk Access.

So today the only tick source is the detached daemon process. If it dies, the swarm stops.

Do: make the schedule genuinely durable and verify it survives a new SSH session and a
logout — without depending on a GUI login. Evaluate at least: bootstrapping launchd
correctly for a Background session; a `LaunchDaemon` (system domain) rather than a user
agent; `cron` with Full Disk Access granted; a `tmux`/`setsid` keep-alive with a watchdog
that re-execs the daemon; and any combination. Prove it with evidence (a tick that fires
after the session that installed it is gone). Record the chosen mechanism and why the
others failed in `.agents/slop/plans/` and `PLAN.md`.

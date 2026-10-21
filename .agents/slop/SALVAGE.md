# Swarm branch salvage — 2026-10-21

The free-rung swarm produced 17 branches. Triage found **none mergeable as-is**;
every branch is preserved as a tag, the worktrees and branches are gone, and the
supervisor's launchd job and cron entry are disarmed.

## Why nothing merged

| Branch group | Blocker |
| --- | --- |
| `tokens-theme` | 291 new files in `packages/tokens`, but **367 failing tests across 48 files** — its tests assert the wording of the branch's own docs (`docs.test.ts` alone accounts for 200), which master has since replaced |
| `playground`, `binding-gaps`, `gpuix-zindex` | 237 new scenarios, but pinned to GPUix **0.10.0** and `EventPayload`; master is on 0.11.0 with `KeyEvent` |
| `components`, `primitives`, `primitives-hover`, `tw-extend` | conflict with the completed `@gpuixui/tw` migration (39/39 components, 16 primitives), which master landed after these branches forked |
| `docs-site` | a parallel docs implementation; 518 added files, conflicts with the live Fumadocs site |
| `gpui-ce`, `transform`, `transform-build`, `transform-port`, `tw`, `tw-expand`, `tokens-platform`, `smoke-cli` | zero added files — empty shells |

## Restore one

```bash
git checkout -b agent/<name> salvage/<name>
```

## Re-arm the swarm

Deliberately, never by a timer:

```bash
# cron (backup of the old table: ~/crontab.bak)
*/30 * * * * /bin/bash ~/GPUIXUI/scripts/swarm-supervisor.sh >/dev/null 2>&1

# launchd
launchctl load ~/Library/LaunchAgents/dev.gpuixui.swarm.plist
```

Before re-arming: rebase the workstreams on current `master`, pick a model rung
above the free tier, and cap the plan output — the run produced 1,186 unique
plan files, which is churn, not a backlog.

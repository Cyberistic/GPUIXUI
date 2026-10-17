#!/usr/bin/env bash
#
# The swarm supervisor.
#
# Every 30 minutes (launchd StartInterval 1800), one tick:
#   1. records progress into .agents/slop/swarm-status.log;
#   2. counts live agent sessions and starts new ones until at least MIN_AGENTS
#      are running, each in its own git worktree on its own branch, each pointed
#      at MISSION.md, the plan set and the next unclaimed task in its workstream.
#
# It is idempotent (a tick with MIN_AGENTS healthy agents starts nothing) and
# crash-safe (a dead session is replaced on the next tick). It runs at most one
# copy of itself: launchd never overlaps a StartInterval job, and a lock
# directory guards against a manual invocation racing the scheduled one.
#
# Each workstream is a persistent loop that runs `opencode run` repeatedly, so a
# finished turn continues from the state the agent left in TODO.md rather than
# leaving the swarm short-handed until the next tick.

set -uo pipefail

REPO="${GPUIXUI_REPO:-$HOME/GPUIXUI}"
OPENCODE="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"
MODEL="${GPUIXUI_MODEL:-opencode-go-braven/deepseek-v4.1-flash}"
MIN_AGENTS="${GPUIXUI_MIN_AGENTS:-5}"

export PATH="$HOME/.opencode/bin:$HOME/.nub/bin:$HOME/.nub/node-shim:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SLOP="$REPO/.agents/slop"
STATE="$SLOP/swarm"
STATUS_LOG="$SLOP/swarm-status.log"
SUPERVISOR_LOG="$SLOP/swarm-supervisor.log"
LOCK="$STATE/supervisor.lock"

# One workstream per agent, each with its own tree so two writers never share a
# checkout. The descriptions keep the five from colliding.
WORKSTREAMS="tokens-theme primitives components docs-site playground"

workstream_scope() {
  case "$1" in
    tokens-theme)
      echo "design tokens, semantic roles, light/dark themes, typography scale, spacing, radii, density, the theming extension mechanism. You own packages/tokens, docs/tokens.md and docs/design-system.md."
      ;;
    primitives)
      echo "foundational render primitives and Tier 1 components (layout, text, boxes, scroll, buttons, inputs, selection controls, progress, tooltips, loading). You own packages/primitives and packages/icons."
      ;;
    components)
      echo "Tier 2 composition and feedback components (cards, lists, menus, dialogs, popovers, tabs, toasts, validation, breadcrumbs, comboboxes). You own packages/components."
      ;;
    docs-site)
      echo "the Fumadocs documentation site and showcase: information architecture, component pages, API metadata, light/dark docs themes, search. You own apps/docs, docs/preview-strategy.md and the component-page template."
      ;;
    playground)
      echo "the native GPUix playground and the native smoke tests: layout, input, focus, overlay, scroll and panel primitives exercised in the real runtime, plus the Tier 3/4 feasibility probes. You own apps/playground and packages/testing."
      ;;
    *)
      echo "the next unclaimed task."
      ;;
  esac
}

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >>"$SUPERVISOR_LOG"
}

acquire_lock() {
  mkdir -p "$STATE"
  if mkdir "$LOCK" 2>/dev/null; then
    echo $$ >"$LOCK/pid"
    return 0
  fi
  local owner
  owner=$(cat "$LOCK/pid" 2>/dev/null)
  if [ -n "$owner" ] && kill -0 "$owner" 2>/dev/null; then
    log "another supervisor (pid $owner) holds the lock; skipping this tick"
    return 1
  fi
  log "removing stale lock left by pid ${owner:-unknown}"
  rm -rf "$LOCK"
  mkdir "$LOCK" 2>/dev/null && echo $$ >"$LOCK/pid"
}

release_lock() { rm -rf "$LOCK"; }

agent_dir() { echo "$REPO/workspaces/$1"; }
agent_pid() { cat "$STATE/$1.pid" 2>/dev/null; }

agent_alive() {
  local pid
  pid=$(agent_pid "$1")
  [ -n "$pid" ] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  ps -p "$pid" -o command= 2>/dev/null | grep -q "run-$1.sh" || return 1
  return 0
}

live_agents() {
  local ws count=0
  for ws in $WORKSTREAMS; do
    if agent_alive "$ws"; then count=$((count + 1)); fi
  done
  echo "$count"
}

plan_count() {
  # Plans live on each workstream's branch, so the aggregate counts distinct
  # plan files across the shared checkout and every worktree.
  find "$REPO/.agents/slop/plans" "$REPO"/workspaces/*/.agents/slop/plans \
    -name '*.md' ! -name 'README.md' 2>/dev/null |
    xargs -n1 basename 2>/dev/null | sort -u | wc -l | tr -d ' '
}

plans_in() {
  find "$1/.agents/slop/plans" -name '*.md' ! -name 'README.md' 2>/dev/null |
    wc -l | tr -d ' '
}

todo_progress() {
  local done total
  done=$(grep -c '^`\[x\]`' "$REPO/TODO.md" 2>/dev/null | tr -d ' ')
  total=$(grep -c '^`\[' "$REPO/TODO.md" 2>/dev/null | tr -d ' ')
  echo "${done:-0}/${total:-0}"
}

component_progress() {
  local done total
  done=$(awk -F'|' 'NF > 3 && $3 ~ /^ *done/ { n++ } END { print n + 0 }' "$REPO/COMPONENTS.md" 2>/dev/null)
  total=$(awk -F'|' 'NF > 3 && $2 ~ /[A-Za-z]/ && $3 !~ /Status/ { n++ } END { print n + 0 }' "$REPO/COMPONENTS.md" 2>/dev/null)
  echo "${done:-0}/${total:-0}"
}

snapshot() {
  local ws live started
  live=$(live_agents)
  {
    printf '%s agents=%s/%s plans=%s todo=%s components=%s head=%s\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      "$live" "$MIN_AGENTS" "$(plan_count)" "$(todo_progress)" \
      "$(component_progress)" \
      "$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo none)"
    for ws in $WORKSTREAMS; do
      printf '  %s %s plans=%s\n' "$ws" \
        "$(git -C "$REPO" log -1 --format='%h %s' "agent/$ws" 2>/dev/null || echo 'no branch yet')" \
        "$(plans_in "$REPO/workspaces/$ws")"
    done
  } >>"$STATUS_LOG"
}

ensure_worktree() {
  local ws="$1" dir
  dir=$(agent_dir "$ws")
  if [ -e "$dir/.git" ]; then return 0; fi
  mkdir -p "$REPO/workspaces"
  if git -C "$REPO" show-ref --verify --quiet "refs/heads/agent/$ws"; then
    git -C "$REPO" worktree add "$dir" "agent/$ws" >>"$SUPERVISOR_LOG" 2>&1
  else
    git -C "$REPO" worktree add -b "agent/$ws" "$dir" HEAD >>"$SUPERVISOR_LOG" 2>&1
  fi
}

write_runner() {
  local ws="$1" dir="$2" runner="$STATE/run-$ws.sh" prompt="$STATE/prompt-$ws.md"

  cat >"$prompt" <<PROMPT
You are the **$ws** agent of the GPUIXUI swarm, working in $dir.

Read these first, in order: MISSION.md, AGENTS.md, PLAN.md, TODO.md,
COMPONENTS.md, and .agents/slop/plans/README.md.

**Your first deliverable is planning.** If the plan set for your workstream is
missing or incomplete, write high-detail implementation plans under
.agents/slop/plans/ — one per phase and one per package — each self-contained
for a weaker executor: the exact files to create or change, the exact commands
to run, the expected result of each, STOP conditions, and a test plan. Index
them in .agents/slop/plans/README.md. **Do not start implementation before
those plans exist.**

Then: claim the next unclaimed task in your workstream, implement it to the bar
in AGENTS.md (code + a test that can fail + an example + a docs page + a
COMPONENTS.md row), tick it in TODO.md, and commit on your branch.

Your workstream: $(workstream_scope "$ws")

Own only the paths in your workstream. Another agent owns everything else; if
you need a change outside your paths, record it as a task in TODO.md instead of
editing it. Commit often with meaningful messages. Never claim a test passed
unless it ran.
PROMPT

  cat >"$runner" <<RUNNER
#!/usr/bin/env bash
# Launched by scripts/swarm-supervisor.sh. One workstream, one tree, one loop.
cd "$dir" || exit 1
export PATH="$PATH"
MODEL="$MODEL"
OPENCODE="$OPENCODE"
PROMPT="\$(cat "$prompt")"
fails=0
while :; do
  "\$OPENCODE" run --model "\$MODEL" --auto --title "swarm:$ws" "\$PROMPT"
  code=\$?
  if [ "\$code" -ne 0 ]; then fails=\$((fails + 1)); else fails=0; fi
  # Five failures in a row is a broken workstream, not a transient one: exit so
  # the supervisor's next tick reports it and starts a fresh session.
  [ "\$fails" -ge 5 ] && exit 1
  sleep 20
done
RUNNER

  chmod +x "$runner"
}

start_agent() {
  local ws="$1" dir runner
  dir=$(agent_dir "$ws")
  ensure_worktree "$ws" || { log "cannot create worktree for $ws"; return 1; }
  # Reference clones are gitignored, so a worktree does not get a copy. Link the
  # shared read-only clones in, so every agent can read them at ./references.
  [ -e "$dir/references" ] || ln -s "$REPO/references" "$dir/references" 2>/dev/null
  write_runner "$ws" "$dir"
  runner="$STATE/run-$ws.sh"
  nohup /bin/bash "$runner" >>"$STATE/$ws.log" 2>&1 &
  echo $! >"$STATE/$ws.pid"
  log "started $ws (pid $(cat "$STATE/$ws.pid")) in $dir"
}

main() {
  mkdir -p "$STATE"
  acquire_lock || exit 0
  trap release_lock EXIT

  git -C "$REPO" worktree prune >>"$SUPERVISOR_LOG" 2>&1

  local live started=0 ws
  live=$(live_agents)
  for ws in $WORKSTREAMS; do
    if agent_alive "$ws"; then continue; fi
    if [ "$live" -ge "$MIN_AGENTS" ]; then break; fi
    if start_agent "$ws"; then
      live=$((live + 1))
      started=$((started + 1))
    fi
  done

  log "tick: live=$live/$MIN_AGENTS started=$started plans=$(plan_count) todo=$(todo_progress) components=$(component_progress)"
  snapshot
}

main "$@"

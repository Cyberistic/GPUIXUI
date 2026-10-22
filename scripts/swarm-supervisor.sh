#!/usr/bin/env bash
#
# The swarm supervisor.
#
# Every 30 minutes (launchd StartInterval 1800), one tick:
#   1. records progress into .agents/slop/swarm-status.log;
#   2. counts live agent sessions and starts new ones until at least MIN_AGENTS
#      are running, all in the shared checkout on master, each pointed at
#      MISSION.md and the next unclaimed task in its workstream.
#
# It is idempotent (a tick with MIN_AGENTS healthy agents starts nothing) and
# crash-safe (a dead session is replaced on the next tick). It runs at most one
# copy of itself: launchd never overlaps a StartInterval job, and a lock
# directory guards against a manual invocation racing the scheduled one.
#
# Each workstream is a persistent loop that runs `opencode run` repeatedly, so a
# finished turn continues from the state the agent left in TODO.md rather than
# leaving the swarm short-handed until the next tick.
#
# The model is not fixed here: every loop reads the active model from
# scripts/swarm-model.sh before each turn, so a limit hit by one workstream moves
# all five to the next rung together. This tick also runs the recovery probe,
# which returns the swarm to the primary once the primary answers again.

set -uo pipefail

REPO="${GPUIXUI_REPO:-$HOME/GPUIXUI}"
OPENCODE="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"
MODELS="$REPO/scripts/swarm-model.sh"
MIN_AGENTS="${GPUIXUI_MIN_AGENTS:-6}"

export PATH="$HOME/.opencode/bin:$HOME/.nub/bin:$HOME/.nub/node-shim:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

SLOP="$REPO/.agents/slop"
STATE="$SLOP/swarm"
STATUS_LOG="$SLOP/swarm-status.log"
SUPERVISOR_LOG="$SLOP/swarm-supervisor.log"
LOCK="$STATE/supervisor.lock"

# One workstream per agent, each with its own tree so two writers never share a
# checkout. The descriptions keep the five from colliding.
WORKSTREAMS="tokens-theme primitives components docs-site playground motion"

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
    salvage)
      echo "the salvage queue: every plan an earlier swarm run wrote and never landed. Implement it or discard it, then delete it."
      ;;
    motion)
      echo "motion: wire @gpuixui/motion into the existing surfaces first (Dialog, Drawer, Popover, DropdownMenu, CommandMenu, Toast, Accordion, Tabs, PreviewCard), following shadcn and Base UI enter/exit patterns, then implement the animated primitives in plan 600. You own packages/motion and the motion wiring inside packages/components. Never animate transform (runtime issue 102): fade plus offset only."
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

# Every agent works in the same checkout on master. Path ownership in each
# prompt is what keeps them apart; scripts/swarm-commit.sh serialises commits.
agent_dir() { echo "$REPO"; }
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
  find "$REPO/.agents/slop/plans" -name '*.md' ! -name 'README.md' 2>/dev/null |
    wc -l | tr -d ' '
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
    printf '%s model=%s agents=%s/%s plans=%s todo=%s components=%s head=%s\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      "$("$MODELS" current 2>/dev/null || echo unknown)" \
      "$live" "$MIN_AGENTS" "$(plan_count)" "$(todo_progress)" \
      "$(component_progress)" \
      "$(git -C "$REPO" rev-parse --short HEAD 2>/dev/null || echo none)"
    printf '  master %s\n' "$(git -C "$REPO" log -1 --format='%h %s' 2>/dev/null || echo none)"
  } >>"$STATUS_LOG"
}

ensure_checkout() {
  git -C "$REPO" checkout -q master >>"$SUPERVISOR_LOG" 2>&1 || return 1
  git -C "$REPO" pull --ff-only -q origin master >>"$SUPERVISOR_LOG" 2>&1 || true
}

write_runner() {
  local ws="$1" dir="$2" runner="$STATE/run-$ws.sh" prompt="$STATE/prompt-$ws.md"

  cat >"$prompt" <<PROMPT
You are the **$ws** agent of the GPUIXUI swarm, working in $REPO on **master**.

Read these first, in order: MISSION.md, AGENTS.md, TODO.md, COMPONENTS.md.
PLAN.md is background, not a gate.

**Implement and test now.** Claim the next unclaimed task in your workstream,
write the code, and land a test that can fail without it. Write a plan only for
a multi-day change or a runtime capability gap; never for a task you can finish
this turn. Do not create plan-per-task files.

Done means: the code, a test that can fail, an example, a docs page, and a
COMPONENTS.md row for a component; code, a test, and the TODO.md tick otherwise.

**Shared checkout.** Five other agents write in this same directory on master.
Own only your paths and never edit another workstream's files. Stage only your
paths (\`git add <paths>\`, never \`git add -A\`) and commit with
\`scripts/swarm-commit.sh "<message>" <paths...>\`, which serialises the index
across the five of you; retry once on a lock timeout. Push master after each
coherent unit (\`git push origin master\`); on rejection, \`git pull --rebase\`
then push.

**Verification is scoped.** While iterating, run only the scenarios your change
touches:
- headless: \`nub apps/playground/dist/smoke/run.js --only <id>\`
- live: \`nub apps/playground/dist/live/run.js --only <id>\` (repeat \`--only\` for
  more; \`--list\` prints the ids).

A live run opens a real window; the full live suite takes ~9 minutes. Never run
\`--all\` while iterating. A new or changed scenario is verified with
\`--only <id>\`; the full headless suite is the end-of-task check for a
cross-cutting change. The full live suite is a **release gate**: run it only
before a release, or when the task explicitly needs a live capability total. Derive the scenario count from the registry instead of
paying for a full live run. Record the exact scenario ids you ran.

Your workstream: $(workstream_scope "$ws")

Own only the paths in your workstream. Another agent owns everything else; if
you need a change outside your paths, record it as a task in TODO.md instead of
editing it. Commit often with meaningful messages. Never claim a test passed
unless it ran.
BLOCKERS: read ~/GPUIXUI/BLOCKERS.md first. If one applies to your workstream it takes priority over your queue: fix it, and plan only if it will not fit in a turn. If none applies, continue. Do not wait for a human.
Push: commit often with meaningful messages and push master at least once per coherent unit of work.
PROMPT

  if [ "$ws" = "salvage" ]; then
    cat >"$prompt" <<PROMPT
You are the **salvage** agent of the GPUIXUI swarm, working in $REPO on **master**.

Your queue is \`.agents/slop/salvage-queue/\` — plans from an earlier swarm run
that never landed. Process them one at a time and do not stop while any remain.

For the next file (sorted):

1. **Read it.**
2. **Decide against master**, not against the plan's own claims:
   - the capability already exists (grep \`packages/\`, \`apps/\`, \`TODO.md\`) — discard;
   - duplicate, superseded, or stale (pins an old GPUix, cites a deleted plan or
     workstream) — discard;
   - real, missing, and fits one turn — **implement it**: code plus a test that
     fails without it, then commit with \`scripts/swarm-commit.sh\`;
   - real but large, or it targets a live workstream's paths
     (tokens/primitives/components/docs-site/playground) — add **one** TODO.md
     row naming the gap, then discard. Do not edit another workstream's files.
3. **Delete the queue file**, then append one line to
   \`.agents/slop/salvage-log.md\`:
   \`<plan> | implemented|discarded|queued | <one-line reason>\`.
4. Continue with the next file.

Never write a new plan. Never claim a test passed unless it ran. When the queue
is empty, record the final counts in the log and stop; a new file appearing is
the only thing that restarts you.

Shared checkout: five other agents write in this same directory on master.
Stage only your paths (\`git add <paths>\`, never \`git add -A\`) and commit with
\`scripts/swarm-commit.sh "<message>" <paths...>\`; retry once on a lock timeout.
Push master after each coherent unit.
PROMPT
  fi

  cat >"$runner" <<RUNNER
#!/usr/bin/env bash
# Launched by scripts/swarm-supervisor.sh. One workstream, one tree, one loop.
#
# The active model is re-read before every turn, so a limit on one workstream
# moves all of them to the next rung together. A limit is not a broken
# workstream: it escalates and the loop keeps going. Five real failures in a row
# is a broken workstream: exit so the next tick starts a fresh session.
cd "$dir" || exit 1
export PATH="$PATH"
OPENCODE="$OPENCODE"
MODELS="$MODELS"
PROMPT_FILE="$prompt"
out=\$(mktemp)
err=\$(mktemp)
trap 'rm -f "\$out" "\$err"' EXIT
fails=0
while :; do
  PROMPT="\$(cat "\$PROMPT_FILE")"
  model=\$("\$MODELS" current)
  # stdout streams to this workstream's log and is captured for the detector;
  # stderr (the model banner and any provider error) is captured and echoed
  # after the turn, so the log still shows why a turn failed.
  "\$OPENCODE" run --model "\$model" --auto --title "swarm:$ws" "\$PROMPT" 2>"\$err" | tee "\$out"
  code=\${PIPESTATUS[0]}
  cat "\$err" >&2
  if [ "\$code" -eq 0 ]; then
    fails=0
    sleep 20
    continue
  fi
  if signature=\$("\$MODELS" classify "\$code" "\$out" "\$err"); then
    if "\$MODELS" advance "\$model" "limit on \$model (exit \$code): \$signature"; then
      sleep 20
    else
      # The last rung is limited too; wait for the supervisor's recovery probe.
      sleep 300
    fi
    continue
  fi
  fails=\$((fails + 1))
  [ "\$fails" -ge 5 ] && exit 1
  sleep 20
done
RUNNER

  chmod +x "$runner"
}

start_agent() {
  local ws="$1" dir runner
  dir=$(agent_dir "$ws")
  ensure_checkout || { log "cannot sync master for $ws"; return 1; }
  write_runner "$ws" "$dir"
  runner="$STATE/run-$ws.sh"
  nohup /bin/bash "$runner" >>"$STATE/$ws.log" 2>&1 &
  echo $! >"$STATE/$ws.pid"
  log "started $ws (pid $(cat "$STATE/$ws.pid")) in the shared checkout"
}

main() {
  mkdir -p "$STATE"
  acquire_lock || exit 0
  trap release_lock EXIT

  git -C "$REPO" worktree prune >>"$SUPERVISOR_LOG" 2>&1

  # Seed the active model on first run, then try to come back up to the primary
  # if the swarm is on a lower rung. The cadence lives in swarm-model.sh.
  "$MODELS" current >/dev/null
  "$MODELS" probe >>"$SUPERVISOR_LOG" 2>&1

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

  log "tick: model=$("$MODELS" current) live=$live/$MIN_AGENTS started=$started plans=$(plan_count) todo=$(todo_progress) components=$(component_progress)"
  snapshot
}

main "$@"

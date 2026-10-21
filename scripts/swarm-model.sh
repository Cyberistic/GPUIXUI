#!/usr/bin/env bash
#
# The swarm's model fallback chain — the one authority for which model every
# workstream runs on.
#
# Rungs, tried in order:
#   1  the primary              (GPUIXUI_MODEL_RUNG1, default
#                                opencode-go-braven/deepseek-v4.1-flash)
#   2  the free opencode tier   (GPUIXUI_MODEL_RUNG2, default
#                                opencode/deepseek-v4.1-flash-free)
#   3  our direct DeepSeek key  (GPUIXUI_MODEL_RUNG3, default
#                                deepseek-braven/deepseek-flash)
#
# Rung 3 is configured but absent until a DeepSeek credential exists (an
# auth.json entry for `deepseek-braven`, or DEEPSEEK_API_KEY). `rungs` reports it
# unavailable instead of pretending it works, and `advance` stops at the last
# available rung rather than switching to a model that cannot answer.
#
# Every workstream loop reads `current` before each turn and only this script
# writes the state file, so the whole swarm moves together. `advance` names the
# model that failed: five workstreams hitting the same limit at the same moment
# move one rung, not five.
#
# Commands:
#   current                     the active model id
#   rungs                       every rung, one per line, with its status
#   advance <model> <reason>    one rung down, only if <model> is still active
#   reset <reason>              back to the primary
#   classify <code> <out> <err> exit 0 and print the signature on a limit
#   probe                       re-probe the primary on the recovery cadence
#   selftest                    classify recorded fixtures; every case must hold
#
# See scripts/README.md for the detector rule and the recovery cadence.

set -uo pipefail

REPO="${GPUIXUI_REPO:-$HOME/GPUIXUI}"
OPENCODE="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"
STATE="${GPUIXUI_MODEL_STATE:-$REPO/.agents/slop/swarm-model.state}"
LOCK="${GPUIXUI_MODEL_LOCK:-$REPO/.agents/slop/swarm/model.lock}"
LOG="${GPUIXUI_SUPERVISOR_LOG:-$REPO/.agents/slop/swarm-supervisor.log}"
RECOVERY_INTERVAL="${GPUIXUI_RECOVERY_INTERVAL:-3600}"
PROBE_TIMEOUT="${GPUIXUI_PROBE_TIMEOUT:-180}"

RUNG1="${GPUIXUI_MODEL_RUNG1:-opencode/deepseek-v4.1-flash-free}"
RUNG2="${GPUIXUI_MODEL_RUNG2:-minimax/MiniMax-M3.1-Flash}"
RUNG3="${GPUIXUI_MODEL_RUNG3:-deepseek/deepseek-flash}"
RUNG4="${GPUIXUI_MODEL_RUNG4:-deepseek/deepseek-flash}"
RUNG5="${GPUIXUI_MODEL_RUNG5:-deepseek/deepseek-flash}"
RUNG6="${GPUIXUI_MODEL_RUNG6:-deepseek/deepseek-flash}"

export PATH="$HOME/.opencode/bin:$HOME/.nub/bin:$HOME/.nub/node-shim:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# The limit rule, read out of the classifier opencode ships (@opencode/ai/errors
# — the `Nn`/`Qn`/`Xn` code sets): status 402, a quota/usage/billing code, or
# "insufficient quota|balance" is a spent quota; status 429, a rate_limit /
# too_many_requests / throttling code, or "rate limit" in the message is a rate
# limit. A model that has gone away is the same situation from here: this model
# is spent, try the next rung. A context overflow or a bad key is a real
# failure — it must not move the swarm.
LIMIT_RE='rate[-_ ]?limit|too[ _-]many[ _-]requests|throttling ?error|throttlingexception|slow_down|insufficient[-_ ]?(quota|balance)|quota[-_ ]?(exceeded|exhausted)|usage[-_ ]?limit|usage_not_included|billing_error|credit[-_ ]?limit|creditlimitexceeded|gousagelimiterror|freeusagelimiterror|budget exceeded|limit exhausted|package has expired|plan does not yet include|billing and usage limits|exceeded your current quota|provider\.rate-limit|provider\.quota|model unavailable|no model is available'
ERROR_RE='Error:|provider\.(rate-limit|quota)'

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
epoch() { date -u +%s; }
log() { printf '%s %s\n' "$(now)" "$*" >>"$LOG"; }

model_of() { case "$1" in 1) echo "$RUNG1" ;; 2) echo "$RUNG2" ;; 3) echo "$RUNG3" ;; 4) echo "$RUNG4" ;; 5) echo "$RUNG5" ;; 6) echo "$RUNG6" ;; esac; }

state_field() { sed -n "s/^$1=//p" "$STATE" 2>/dev/null | head -1; }

write_state() { # rung reason since last_probe
  local tmp="$STATE.$$"
  mkdir -p "$(dirname "$STATE")"
  printf 'model=%s\nrung=%s\nreason=%s\nsince=%s\nlast_probe=%s\n' \
    "$(model_of "$1")" "$1" "$2" "$3" "$4" >"$tmp" && mv "$tmp" "$STATE"
}

ensure_state() {
  [ -n "$(state_field model)" ] && return 0
  write_state 1 "seeded: the primary, as the swarm has always run" "$(now)" ""
}

# The read-modify-write of a switch is one critical section. Without it, five
# workstreams failing at the same second all read the same rung and all log a
# switch; with it, one switches and the other four report that the model that
# failed is no longer active.
with_lock() { # cmd...
  local tries=0 owner code
  mkdir -p "$(dirname "$LOCK")"
  while ! mkdir "$LOCK" 2>/dev/null; do
    owner="$(cat "$LOCK/pid" 2>/dev/null)"
    if [ -n "$owner" ] && ! kill -0 "$owner" 2>/dev/null; then
      rm -rf "$LOCK"
      continue
    fi
    tries=$((tries + 1))
    [ "$tries" -gt 600 ] && rm -rf "$LOCK"
    sleep 0.1
  done
  echo $$ >"$LOCK/pid"
  "$@"
  code=$?
  rm -rf "$LOCK"
  return "$code"
}

# A rung is available when `opencode models` lists it. An unreadable list is not
# evidence of absence: assume configured and let the run itself decide.
available() { # rung
  local model listed
  model="$(model_of "$1")"
  [ -n "$model" ] || return 1
  listed="$("$OPENCODE" models 2>/dev/null)"
  [ -z "$listed" ] && return 0
  printf '%s\n' "$listed" | grep -Fxq "$model"
}

strip_ansi() { sed -E "s/$(printf '\033')\[[0-9;]*[A-Za-z]//g"; }

# The watchdog's stdio goes to /dev/null: an inherited pipe would keep a caller
# (an SSH session, the daemon) waiting on the leftover sleep for its whole
# duration after the probe has already returned.
run_bounded() { # seconds cmd...
  local seconds="$1" pid watchdog code
  shift
  "$@" & pid=$!
  ( sleep "$seconds"; kill -TERM "$pid" 2>/dev/null ) >/dev/null 2>&1 & watchdog=$!
  wait "$pid"; code=$?
  pkill -TERM -P "$watchdog" 2>/dev/null
  kill -TERM "$watchdog" 2>/dev/null
  wait "$watchdog" 2>/dev/null
  return "$code"
}

cmd_current() { ensure_state; state_field model; }

cmd_rungs() {
  ensure_state
  local active rung status
  active="$(state_field model)"
  for rung in 1 2 3 4 5 6; do
    if available "$rung"; then status=available; else status=unavailable; fi
    [ "$(model_of "$rung")" = "$active" ] && status="$status active"
    printf '%s\t%s\t%s\n' "$rung" "$(model_of "$rung")" "$status"
  done
}

cmd_advance() { # model reason
  local failed="$1" reason="$2" active rung next
  ensure_state
  active="$(state_field model)"
  if [ "$active" != "$failed" ]; then
    log "no switch: active model is $active, not the one that failed ($failed)"
    return 0
  fi
  rung="$(state_field rung)"
  case "$rung" in ''|*[!0-9]*) rung=1 ;; esac
  next=$((rung + 1))
  while [ "$next" -le 3 ] && ! available "$next"; do
    log "skipping rung $next ($(model_of "$next")): no credential configured"
    next=$((next + 1))
  done
  if [ "$next" -gt 6 ]; then
    log "limit on $active and no rung left: staying on it ($reason)"
    return 3
  fi
  write_state "$next" "$reason" "$(now)" "$(state_field last_probe)"
  log "switch: $active -> $(model_of "$next") (rung $next) — $reason"
}

cmd_reset() { # reason
  local active
  ensure_state
  active="$(state_field model)"
  write_state 1 "$1" "$(now)" "$(state_field last_probe)"
  if [ "$active" = "$RUNG1" ]; then
    log "recovery: already on $RUNG1 — $1"
  else
    log "recovery: $active -> $RUNG1 — $1"
  fi
}

# A run failed on a limit when its output names one. An error line naming a
# limit counts whatever the exit code; otherwise the whole output counts only
# when the run actually failed, so a successful turn that merely writes about
# rate limits does not move the swarm.
cmd_classify() { # exit-code stdout-file stderr-file
  local code="$1" out="$2" err="$3" line
  line="$(cat "$out" "$err" 2>/dev/null | strip_ansi | grep -Ei "$LIMIT_RE" | grep -E "$ERROR_RE" | head -1)"
  if [ -z "$line" ] && [ "$code" -ne 0 ]; then
    line="$(cat "$out" "$err" 2>/dev/null | strip_ansi | grep -Ei "$LIMIT_RE" | head -1)"
  fi
  [ -n "$line" ] || return 1
  printf '%s\n' "$line" | tr -s '[:space:]' ' ' | sed -E 's/^ +| +$//g' | cut -c1-200
}

# The cadence and the "am I even on a lower rung" check happen under the lock, so
# two ticks cannot both decide to probe; the probe's network call does not hold
# the lock, so a workstream hitting a limit mid-probe is not delayed.
probe_begin() {
  local rung last now_
  ensure_state
  rung="$(state_field rung)"
  [ "$rung" = "1" ] && return 0 # on the primary: nothing to recover from
  last="$(state_field last_probe)"
  case "$last" in ''|*[!0-9]*) last=0 ;; esac
  now_="$(epoch)"
  [ "$((now_ - last))" -lt "$RECOVERY_INTERVAL" ] && return 0
  write_state "$rung" "$(state_field reason)" "$(state_field since)" "$now_"
  echo run
}

cmd_probe() {
  [ "$(with_lock probe_begin)" = "run" ] || return 0
  if run_bounded "$PROBE_TIMEOUT" "$OPENCODE" run --model "$RUNG1" --auto \
    --title "swarm:recovery-probe" "Reply with exactly: RECOVERY_OK"; then
    with_lock cmd_reset "recovery probe succeeded on $RUNG1"
    return 0
  fi
  log "probe: $RUNG1 still unavailable while on $(state_field model)"
  return 1
}

cmd_selftest() {
  local dir failures=0
  dir="$(mktemp -d)"

  # Every case below is a shape `opencode run` really produces, or the message
  # opencode's own classifier emits for that provider failure.
  check() { # name want(limit|ok) code stderr stdout
    local name="$1" want="$2" code="$3" err="$4" out="${5:-}" got
    printf '%s' "$out" >"$dir/out"
    printf '%s' "$err" >"$dir/err"
    if cmd_classify "$code" "$dir/out" "$dir/err" >"$dir/sig"; then got=limit; else got=ok; fi
    if [ "$got" = "$want" ]; then
      printf 'ok   %-24s %s\n' "$name" "$got"
    else
      printf 'FAIL %-24s want %s, got %s\n' "$name" "$want" "$got"
      failures=$((failures + 1))
    fi
  }

  check primary-ok ok 0 "$(printf '\033[0m\n> build · deepseek-v4.1-flash')" 'PRIMARY_OK'
  check prose-mentions-limits ok 0 '' 'The docs page should explain rate limit and quota behaviour.'
  check model-unavailable limit 1 "$(printf '\033[91m\033[1mError: \033[0mModel unavailable: opencode-go-braven/does-not-exist-xyz')"
  check rate-limit limit 1 "$(printf '\033[91m\033[1mError: \033[0mRate limit exceeded. Retry after 7s')"
  check quota-exhausted limit 1 'Error: Quota exhausted. Resets at 2026-10-17T07:00:00Z. Check your account billing and usage limits.'
  check limit-typed-error limit 0 'Error: provider.rate-limit: rate limit exceeded'
  check context-overflow ok 1 'Error: Invalid request: context length exceeded'
  check bad-api-key ok 1 'Error: Incorrect API key provided. Verify your API key is correct'

  rm -rf "$dir"
  [ "$failures" -eq 0 ] || printf '%s case(s) failed\n' "$failures"
  return "$failures"
}

case "${1:-current}" in
  current) cmd_current ;;
  rungs) cmd_rungs ;;
  advance) with_lock cmd_advance "${2:?model required}" "${3:?reason required}" ;;
  reset) with_lock cmd_reset "${2:?reason required}" ;;
  classify) cmd_classify "${2:?exit code required}" "${3:?stdout file required}" "${4:?stderr file required}" ;;
  probe) cmd_probe ;;
  selftest) cmd_selftest ;;
  *) printf 'usage: %s {current|rungs|advance <model> <reason>|reset <reason>|classify <code> <out> <err>|probe|selftest}\n' "$0" >&2; exit 2 ;;
esac

#!/usr/bin/env bash
#
# Keep the 30-minute supervisor tick running on a machine where a per-user
# launchd agent cannot be bootstrapped from an SSH session (there is no Aqua
# session for this account, so `gui/$UID` does not exist; `launchctl
# bootstrap user/$UID` returns EIO and `launchctl load` aborts — see
# install-swarm-supervisor.sh and .agents/slop/README.md for the evidence).
#
# Idempotent: a second invocation sees a live daemon and exits. The tick itself
# is also locked, so the daemon, the launchd agent and the crontab entry can all
# be present without ever overlapping.

set -uo pipefail

REPO="${GPUIXUI_REPO:-$HOME/GPUIXUI}"
STATE="$REPO/.agents/slop/swarm"
PIDFILE="$STATE/daemon.pid"
INTERVAL="${GPUIXUI_INTERVAL:-1800}"
LOG="$REPO/.agents/slop/swarm-daemon.log"

mkdir -p "$STATE"

if [ -f "$PIDFILE" ]; then
  owner=$(cat "$PIDFILE" 2>/dev/null)
  if [ -n "$owner" ] && kill -0 "$owner" 2>/dev/null; then
    echo "swarm daemon already running (pid $owner)"
    exit 0
  fi
fi

nohup /bin/bash -c "while :; do /bin/bash '$REPO/scripts/swarm-supervisor.sh' >>'$LOG' 2>&1; sleep $INTERVAL; done" >/dev/null 2>&1 &
echo $! >"$PIDFILE"
echo "started swarm daemon (pid $(cat "$PIDFILE"), every ${INTERVAL}s, log $LOG)"

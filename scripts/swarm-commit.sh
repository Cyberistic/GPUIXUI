#!/usr/bin/env bash
# Serialised commit for the shared master checkout: five agents, one index.
#
#   scripts/swarm-commit.sh "feat(card): ..." packages/components/src/card.tsx
#
# Stages only the named paths. macOS has no flock(1), so the lock is a directory
# with a stale guard: a lock older than ten minutes is presumed orphaned.
set -euo pipefail

message="${1:?usage: swarm-commit.sh <message> <paths...>}"
shift
[ "$#" -gt 0 ] || {
  echo "refusing to stage the whole tree; name your paths" >&2
  exit 2
}

lock="${TMPDIR:-/tmp}/gpuixui-swarm-commit.lock"
[ -d "$lock" ] && [ -n "$(find "$lock" -maxdepth 0 -mmin +10 2>/dev/null)" ] && rmdir "$lock" 2>/dev/null || true

acquired=0
for _ in $(seq 1 120); do
  if mkdir "$lock" 2>/dev/null; then
    acquired=1
    break
  fi
  sleep 1
done
[ "$acquired" = "1" ] || {
  echo "commit lock timeout: another agent is committing" >&2
  exit 3
}
trap 'rmdir "$lock" 2>/dev/null || true' EXIT

git add -- "$@"
git -c user.name=swarm -c user.email=swarm@local commit -m "$message"

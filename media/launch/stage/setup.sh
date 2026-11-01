#!/bin/sh
# Prepare the stageshow skill for the film's stage shots (plan 066).
#
# The skill (MIT, benjitaylor/skills) is read from the read-only reference
# clone, copied into the gitignored .media/, and installed from its own
# lockfile. stage/kit links to its kit so the scenes import it as the skill's
# own examples do.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
skill="${STAGESHOW:-$HOME/GPUIXUI/references/benjitaylor-skills/stageshow}"
work="$here/../.media/stageshow"
[ -d "$skill" ] || { echo "stageshow: clone benjitaylor/skills into $(dirname "$skill")" >&2; exit 1; }
rm -rf "${work:?}"
mkdir -p "$(dirname "$work")"
cp -R "$skill" "$work"
(cd "$work" && npm ci --no-audit --no-fund)
ln -sfn ../.media/stageshow/kit "$here/kit"
echo "stageshow ready: $work"

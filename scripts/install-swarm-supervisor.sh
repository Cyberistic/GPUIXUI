#!/usr/bin/env bash
#
# Install the swarm supervisor as a launchd agent. Idempotent: re-running
# replaces the job and restarts it. launchd is this machine's scheduler idiom
# (the dev.meow.* agents already live here), so the supervisor uses it too.
#
#   nub run --filter @gpuixui/scripts ...   (or)   bash scripts/install-swarm-supervisor.sh

set -euo pipefail

REPO="${GPUIXUI_REPO:-$HOME/GPUIXUI}"
LABEL="dev.gpuixui.swarm"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
INTERVAL="${GPUIXUI_INTERVAL:-1800}"

mkdir -p "$HOME/Library/LaunchAgents" "$REPO/.agents/slop"

cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO/scripts/swarm-supervisor.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REPO</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$HOME/.opencode/bin:$HOME/.nub/bin:$HOME/.nub/node-shim:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>$HOME</string>
    <key>GPUIXUI_REPO</key>
    <string>$REPO</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>$INTERVAL</integer>
  <key>StandardOutPath</key>
  <string>$REPO/.agents/slop/swarm-launchd.log</string>
  <key>StandardErrorPath</key>
  <string>$REPO/.agents/slop/swarm-launchd.log</string>
</dict>
</plist>
PLIST

# Replace any existing job, then load the new one.
launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
if ! launchctl bootstrap "gui/$UID" "$PLIST" 2>/dev/null; then
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load -w "$PLIST"
fi

echo "installed $LABEL (every ${INTERVAL}s) -> $PLIST"
launchctl print "gui/$UID/$LABEL" 2>/dev/null | grep -E "state|program|interval" || true

#!/usr/bin/env bash
#
# Install the swarm supervisor so the 30-minute tick actually runs. Idempotent:
# re-running replaces both the job and the crontab entry.
#
# Two schedulers, on purpose:
#
#   * a **launchd agent** (`dev.gpuixui.swarm`, `StartInterval 1800`) — this
#     machine's scheduler idiom, and what runs the supervisor whenever this
#     account has a graphical session;
#   * a **crontab** entry every 30 minutes — because a per-user launchd agent
#     cannot be bootstrapped into `gui/$UID` from an SSH session (there is no
#     Aqua session for this account), and `launchctl load` aborts on macOS 14.
#     See `.agents/slop/README.md` for the evidence.
#
# The supervisor takes a lock, so the two never overlap and a duplicate tick is
# a no-op.

set -uo pipefail

REPO="${GPUIXUI_REPO:-$HOME/GPUIXUI}"
LABEL="dev.gpuixui.swarm"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
INTERVAL="${GPUIXUI_INTERVAL:-1800}"
CRON_LINE="*/30 * * * * /bin/bash $REPO/scripts/swarm-supervisor.sh >/dev/null 2>&1"

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

echo "wrote $PLIST (every ${INTERVAL}s)"

# Replace any existing job, then try to load the new one. A failure here is
# expected from an SSH session and is not fatal: the crontab entry below runs
# the tick instead, and launchd picks the job up at the next graphical login.
launchctl bootout "gui/$UID/$LABEL" 2>/dev/null || true
if launchctl bootstrap "gui/$UID" "$PLIST" 2>/dev/null; then
  echo "loaded $LABEL into gui/$UID"
else
  echo "launchd unavailable in this session (no gui/$UID domain); relying on crontab"
fi

# Crontab driver — idempotent: drop any line we own, then append the current one.
CRON_TMP=$(mktemp)
crontab -l 2>/dev/null | grep -v "scripts/swarm-supervisor.sh" >"$CRON_TMP" || true
printf '%s\n' "$CRON_LINE" >>"$CRON_TMP"
if crontab "$CRON_TMP"; then
  echo "installed crontab entry: $CRON_LINE"
else
  echo "FAILED to install crontab entry" >&2
fi
rm -f "$CRON_TMP"

# Daemon driver — the one that actually ticks on a headless box. Started now so
# the swarm is supervised without waiting for a graphical login, and ensured on
# every shell login by the hook below so a reboot recovers on its own.
/bin/bash "$REPO/scripts/swarm-daemon.sh"

PROFILE="$HOME/.zprofile"
HOOK="# GPUIXUI swarm supervisor — start the tick daemon if it is not running."
if ! grep -qF "$HOOK" "$PROFILE" 2>/dev/null; then
  {
    printf '\n%s\n' "$HOOK"
    printf '[ -x "%s/scripts/swarm-daemon.sh" ] && /bin/bash "%s/scripts/swarm-daemon.sh" >/dev/null 2>&1\n' "$REPO" "$REPO"
  } >>"$PROFILE"
  echo "added the swarm daemon hook to $PROFILE"
else
  echo "swarm daemon hook already present in $PROFILE"
fi

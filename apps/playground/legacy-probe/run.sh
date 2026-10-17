#!/usr/bin/env bash
#
# Reproduce the GPUix 0.5.1 capability measurements (ADR 0002) on this host.
#
# `@gpuix/native-darwin-x64@0.5.1` is the last Intel-macOS binding, and the
# library targets 0.10.0, which has none. `nub install` cannot install a nested
# non-workspace package, and this repo must not carry a second GPUix version in
# its workspace, so the probe builds a throwaway project in $TMPDIR, installs
# the 0.5.1 pins there, and runs the copied scripts against it (Node resolves
# `react`/`@gpuix` from the importing file's directory).
#
#   apps/playground/legacy-probe/run.sh probe
#
# Output goes to stdout; paste the `LEGACY_PROBE` line into REPORT.md when the
# numbers change. Artifacts land in `apps/playground/legacy-probe/.artifacts/`.
#
# `live` has no automated mode on purpose: the live driver opens a real window
# and, on 0.5.1, its drag step never settles when the window is not interactive
# (REPORT.md §live). Run it by hand if you want to see the window:
#
#   cd "${TMPDIR:-/tmp}/gpuix-legacy-probe" && node live-driver.mjs

set -euo pipefail

MODE="${1:-probe}"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${TMPDIR:-/tmp}/gpuix-legacy-probe"

if [ "$MODE" = "live" ]; then
  echo "live has no automated mode: on 0.5.1 its drag step hangs when the window" >&2
  echo "is not interactive. See REPORT.md §live. Run it by hand from $WORK:" >&2
  echo "  node live-driver.mjs" >&2
  exit 2
fi

if [ "$MODE" != "probe" ]; then
  echo "usage: $0 [probe]" >&2
  exit 2
fi

mkdir -p "$WORK"
cd "$WORK"

echo 24.18.0 >.node-version
cat >package.json <<JSON
{
  "name": "gpuix-legacy-probe",
  "private": true,
  "type": "module",
  "scripts": {
    "probe": "node probe.mjs"
  }
}
JSON

if [ ! -d node_modules/@gpuix/native ]; then
  nub add @gpuix/react@0.5.1 @gpuix/native@0.5.1 react@19.2.0
fi

cp "$HERE/probe.mjs" "$HERE/live-app.mjs" "$HERE/live-driver.mjs" .
LEGACY_PROBE_ARTIFACTS="$HERE/.artifacts" nub run probe

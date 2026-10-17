#!/usr/bin/env bash
# Prove a regression test in both directions: it must FAIL on the unfixed
# source and PASS on the fixed source that is in the working copy now.
#
#   scripts/verify-two-directions.sh <test-file> <source-file>...
#
# The test file is left alone (it is the thing under test); only the named
# source files are reverted to `@-` and re-applied, so a new test file that
# arrives with the fix is never part of the revert.
set -euo pipefail

TEST_FILE="$1"
shift
if [ "$#" -eq 0 ]; then
  echo "usage: $0 <test-file> <source-file>..." >&2
  exit 2
fi

PATCH="$(mktemp -t two-directions.XXXXXX.patch)"
trap 'rm -f "$PATCH"' EXIT

cd "$(jj workspace root 2>/dev/null || dirname "$0")"

# The runner follows the test's language: the repo's regression tests are
# vitest for the TypeScript packages and pytest for the Python ones
# (apps/worker, packages/sdk-python), and the guard has to be provable in
# both directions wherever it lives.
run_test() {
  if [ "${TEST_FILE##*.}" = "py" ]; then
    # requests: apps/worker/main.py imports executor, which imports requests at
    # module scope. A test that needs more should add its own `--with`.
    uv run --quiet --with requests --with pytest pytest "$TEST_FILE"
  else
    # Run the test under the vitest of the package that owns it: apps/webapp is
    # not the only suite (apps/api's route tests need that package's vitest and
    # its D1 test setup), and a filter naming a file outside the project is
    # silently "no test files found", which reads as a pass-with-no-output.
    test_abs="$PWD/$TEST_FILE"
    dir="$(dirname "$TEST_FILE")"
    while [ "$dir" != "." ] && [ ! -f "$dir/package.json" ]; do
      dir="$(dirname "$dir")"
    done
    (cd "$dir" && "./node_modules/.bin/vitest" run "$test_abs")
  fi
}

jj diff --git -- "$@" >"$PATCH"
if [ ! -s "$PATCH" ]; then
  echo "no changes in: $*" >&2
  exit 2
fi

jj restore -- "$@"
echo "── unfixed (source at @-), running $TEST_FILE ──"
set +e
run_test
UNFIXED=$?
set -e

patch -s -p1 <"$PATCH"
echo "── fixed (source restored), running $TEST_FILE ──"
set +e
run_test
FIXED=$?
set -e

echo
if [ "$UNFIXED" -eq 0 ]; then
  echo "VERDICT: the test PASSED unfixed — it guards nothing."
  exit 1
fi
if [ "$FIXED" -ne 0 ]; then
  echo "VERDICT: the test FAILED with the fix applied."
  exit 1
fi
echo "VERDICT: fails unfixed, passes fixed."

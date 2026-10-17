# Plan 154 — the log-viewer probe (Tier 4 feasibility)

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B (feasibility) → feeds D (`packages/docking`, `packages/editor`).
**Depends on:** plans `130` (probe conventions), `140` (measured virtual-list
facts), `152` (index-driven virtual rows).

## 1. Why this plan exists

Tier 4's "Log viewers" row is `?`, and the runtime types advertise the two
props that make a log viewer cheap: `<virtual-list alignment="bottom"
followTail>`. Nothing in this repo has measured either prop. A log viewer that
starts at the top, or stops following appended lines, is the difference between
a usable component and a decorative list — and the editor/docking workstreams
should not plan on unverified semantics.

`virtual-list-window` proved the window and the wheel; this probe proves the
**bottom-anchored, follow-tail** behaviour that is specific to logs.

## 2. What is built

One scenario, `log-viewer` (capability `log`, a new capability in
`@gpuixui/testing`):

- 30 initial lines (`line 0` … `line 29`), 20px each in a 280px tall
  `<virtual-list testId="log-list" alignment="bottom" followTail>`, so only
  the tail fits.
- A `log-append` pressable appends five lines; the readout `log-count` reports
  the number of lines.
- Steps:
  1. the tail is painted at rest (`line 29`) and the head is not (`line 0`);
  2. click append → the count is `35`, `line 34` is painted, and `line 0` is
     still not — appending keeps the view at the tail;
  3. append again → `line 39` is painted, `line 34` is no longer painted (the
     window moved with the newest lines).

If `alignment="bottom"` is not honoured at rest, step 1 fails; if `followTail`
is not honoured, step 2 fails; if the append re-render does not re-anchor, step
3 fails. Each is a distinct runtime fact the log-viewer component must design
around.

## 3. Exact files

### 3.1 `packages/testing/src/smoke.ts` (change)

Add `"log"` to `CAPABILITIES`.

### 3.2 `apps/playground/src/scenarios/log-viewer.tsx` (new)

The probe and its `PlaygroundScenario`. Lines are a `ReadonlyArray<number>`
state; append is `Arr.range(start, start + 4)`. Use `Pressable` and `Readout`
from `../ui.js`. No GPUix type is imported.

### 3.3 `apps/playground/src/scenarios/index.ts` (change)

Append `logViewerScenario`; add `"log"` to `PROBE_CAPABILITIES`.

### 3.4 Documentation and ledgers (change)

- `apps/playground/README.md`: scenario list/count (18), structure line, the
  measured facts.
- `COMPONENTS.md`: evidence table gains `log`; Tier 4 "Log viewers" support
  cell becomes the probe verdict; suite count 18.
- `TODO.md`: tick the item; progress bar.
- `.agents/slop/plans/README.md` and plan `140` §4: measured facts.
- Plan `130` §8: point the log-viewer consumer at this probe.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground check-types` | no type error |
| `nub run --filter playground build` | `tsc` emits `dist/` |
| `nub apps/playground/dist/smoke/run.js --only log-viewer` | passes, `log=verified`, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `18/18 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof.** Remove `followTail` (or set `alignment` to `"top"`)
and run `--only log-viewer`: it must fail with a named check and exit `1`.
Restore: green again.

## 5. STOP conditions

Stop and report with evidence if:

- **`alignment="bottom"` does not paint the tail at rest.** Record what is
  painted; a log viewer must then scroll to the end itself. Do not add a
  post-mount `scrollTo` in the probe before reporting — that hides the fact the
  component needs to own.
- **`followTail` does not follow appended rows.** Record the append and the
  painted lines; the log-viewer component must call `scrollTo`/`scrollIntoView`
  on its own and the docs must say so.
- **Appending re-anchors to the top.** Record it; it is a runtime limitation,
  not a probe bug, but confirm with a second append before concluding.
- **A change outside this workstream is needed** (other than the one-line
  capability addition in §3.1): record it in `TODO.md`, do not edit other
  packages.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `log-viewer` steps | native smoke | a list that starts at the head; a tail that does not follow appends; a re-render that jumps to the wrong end |
| `scenarioProblems` | unit (exists) | the `log` capability losing its scenario |
| full suite | native smoke | a probe that disturbs another scenario |

## 7. Acceptance criteria

- `log-viewer` is registered, green, and `log` is a required probe capability.
- The suite is **18/18 green on this host**, exit `0`.
- The verdict is recorded in plan `140` §4, `COMPONENTS.md` and the app README.
- The two-direction proof was run and recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

**18/18 green**, exit `0`; `log-viewer` records six checks and `log=verified`.

Measured facts (also in plan `140` §4):

- `<virtual-list alignment="bottom" followTail>` starts at the **tail**:
  with 30 lines × 20px in a 280px list, `line 29` is painted and `line 0` is
  not.
- Appending 20 lines re-anchors at the new tail (`line 49` painted, `line 29`
  gone); a second append does the same (`line 69` painted, `line 49` gone).
- **The two props overlap.** `alignment="bottom"` alone passes the same checks,
  and `alignment="top"` with `followTail` alone also passes: either anchors at
  the bottom. The probe pins the composition, not which prop causes it.
- Scrolling up and then appending does **not** snap back to the tail (measured
  with `followTail` on): a real "follow" toggle must be app state plus an
  explicit scroll, and the log-viewer docs must say so.

Two-direction proof: dropping both props gave
`the list starts at the tail: expected true, got false`, `log=failed`, exit `1`.
Restored: green, exit `0`.



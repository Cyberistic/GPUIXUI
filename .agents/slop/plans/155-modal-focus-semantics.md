# Plan 155 — modal focus and nested-overlay semantics (Tier 2 feasibility)

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B (feasibility) → feeds C (Tier 2 overlays).
**Depends on:** plans `120` (shell + scenarios), `140` (measured overlay/focus
facts), `117` (the components workstream's Tier 2 verification, whose playground
half this is).

## 1. Why this plan exists

Plan `140` measured that an `<anchored>` popup paints, that `autoFocus` takes
native focus, and that Escape reaches the focused content. It did **not**
measure the three things every modal surface in `@gpuixui/components` is built
on, and the app README currently states the opposite of what the renderer
offers:

| Claim to settle | Why the Tier 2 workstream needs it |
| --------------- | ---------------------------------- |
| Component code can move native focus | `DialogContent` calls `renderer.focusElement` on open and on close; if that quietly no-ops, focus never enters the dialog and never returns to the trigger |
| Tab stays inside a container | `DialogContent` maps `tab`/`shift-tab` to `focusNextWithin` / `focusPreviousWithin`; if those leak, the "trap" is decoration |
| Escape closes one nested layer, not both | Dialog, Popover, DropdownMenu, ContextMenu and CommandMenu share a dismiss stack; one keystroke must dismiss one layer |

All three are renderer facts, not component facts. A component unit test cannot
establish them on this host (the components package's native guard reports
`unsupported-host` because its `node_modules` has no built binding); the
playground is the only native evidence source.

Also corrects a stale claim: `apps/playground/README.md` says "No programmatic
focus from component code. `PublicInstance` has no `.focus()`". `PublicInstance`
indeed has no method, but `useGpuix().renderer` is a `NativeRenderer` whose type
declares `focusElement`, `focusNextWithin`, `focusPreviousWithin`,
`getFocusedElementId` and `blur` (published `@gpuix/native@0.10.0`
`dist/host.d.ts:471`). Which of them actually work is what this probe measures.

## 2. What is built

One scenario, `modal-focus-trap` (capability `modal`, new in
`@gpuixui/testing`), whose view is a minimal modal surface built from the same
primitives the library will use — **no dependency on `@gpuixui/components`**
(that package is not on `main` yet; mounting its real examples is plan `156`).

View (`apps/playground/src/scenarios/modal.tsx`):

- `modal-trigger` — a focusable `Pressable` that opens the modal and records
  itself as the element to return to.
- A 480×320 root; when open, an `<anchored deferred position={{x:0,y:0}}
  priority={1} occlude>` containing a full-window `modal-veil` and the
  `modal-content` surface (`tabIndex={0}`, three focusable children
  `modal-a`, `modal-b`, `modal-close`).
- `modal-content`'s `onKeyDown` implements the component contract the probe is
  about: `tab` → `focusNextWithin(contentId)`, `shift-tab` →
  `focusPreviousWithin(contentId)`, `escape` → close.
- Open/close focus uses the same shape as `DialogContent`: a ref callback stores
  the `PublicInstance`, a `useLayoutEffect` saves
  `renderer.getFocusedElementId()`, focuses the content, and on cleanup returns
  focus to the saved id when the element still exists.
- A readout `modal-readout` reports `open=<bool> last=<reason> steps=<n>`, where
  `steps` counts focus moves the content performed — so a trap that never moved
  focus cannot pass by accident.

Steps:

1. Click `modal-trigger` → readout says `open=true`, `modal-content` is painted,
   and `host.focused()` is `modal-content` (focus entered).
2. Send `tab` four times, capturing `host.focused()` after each: at least two
   distinct ids are observed, and **every** observed id is one of the modal's
   own ids (`modal-content`, `modal-a`, `modal-b`, `modal-close`). The trigger
   and the page button behind the veil must never appear.
3. Send `shift-tab` four times: same invariant, and at least two distinct ids.
4. Send `escape` → readout says `open=false last=escape`; `host.focused()` is
   `modal-trigger` (focus returned).
5. Open a nested popover inside the modal (`modal-open-popover`), assert
   `host.focused()` is `nested-content`, send `escape` → readout says
   `popover=false open=true` (only the inner layer closed) and focus is back on
   `modal-open-popover`; send `escape` again → the modal closes.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"modal"` to `CAPABILITIES` |
| `packages/testing/src/test-support.ts` | no change if `SmokeHost` is unchanged (the probe drives keys, not new host calls) |
| `apps/playground/src/scenarios/modal.tsx` | new scenario (the view and its steps) |
| `apps/playground/src/scenarios/index.ts` | import and append `modalScenario`; add `"modal"` to `CORE_CAPABILITIES` so `scenarioProblems` requires it |
| `apps/playground/src/scenarios/overlay.tsx` | correct the header claim: the *node* has no focus method, the renderer does; point at `modal-focus-trap` |
| `apps/playground/src/scenarios/tree.tsx` | same correction in its header comment and readout wording, if it still claims the runtime has no programmatic focus |
| `apps/playground/README.md` | scenario count `18 → 19`, structure line, the new measured facts, delete the false "no programmatic focus" limitation |
| `COMPONENTS.md` | evidence table gains `modal`; Tier 2 Dialog/Popover/Dropdown/Context/Command rows cite `modal-focus-trap` as the native evidence; suite count 19 |
| `TODO.md` | tick the playground item; add the `156` cross-team item if the components package is still off `main` |
| `.agents/slop/plans/README.md` | index this plan; plan `156` |
| `.agents/slop/plans/140-gpuix-native-darwin-x64-build.md` | §4: add the `modal` row of measured facts |

No change outside `apps/playground`, `packages/testing` and the ledgers. If a
change elsewhere is needed, record it in `TODO.md` and stop that part.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground check-types` | no type error |
| `nub run --filter @gpuixui/testing test` | existing tests pass; no fixture needs a new host method |
| `nub run --filter playground build` | `tsc` emits `dist/` |
| `nub apps/playground/dist/smoke/run.js --only modal-focus-trap` | the scenario passes, `modal=verified`, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `19/19 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proofs (both run, both recorded):**

1. Replace the `tab` branch's `focusNextWithin` with a no-op: the "Tab stays in
   the modal" check must fail, name the observed id, and exit `1`.
2. Delete the focus-return cleanup: "focus returned to the trigger" must fail
   and exit `1`.

Restore after each; the suite must be green again.

## 5. STOP conditions

Stop and report with evidence if:

- **`focusElement` does not move focus from component code.** Record what
  `getFocusedElementId()` reports before and after, whether `dispatchNativeEvents`
  is needed, and the focused testId. Do not add a click inside the modal as a
  workaround before reporting: "the dialog focuses itself" is the fact under
  test.
- **`focusNextWithin` does not move focus, or moves it outside the container.**
  Record the sequence of focused ids. A trap the renderer cannot enforce is a
  component-level keyboard contract; the docs must say so and the Dialog row
  must not claim a native trap.
- **A synthetic `tab` keystroke is not delivered** to the focused content. Record
  it; if the keystroke is the problem (not `focusNextWithin`), the probe may
  drive `focusNextWithin` through a host method instead, and the limitation is
  "the component's Tab branch cannot be exercised synthetically — call the
  renderer directly", recorded in the app README.
- **Escape from a nested layer also closes the modal.** Record both readouts;
  the dismiss stack needs a component-level guard, and the limitation goes in
  `COMPONENTS.md`.
- **A change outside this workstream is needed** (other than the one-line
  capability addition in `smoke.ts`): record it in `TODO.md`, do not edit other
  packages.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `modal-focus-trap` steps | native smoke | focus not entering the modal; `focusNextWithin`/`focusPreviousWithin` leaking out of the container or doing nothing; focus not returning to the trigger; one Escape closing both nested layers |
| `scenarioProblems` | unit (exists) | the `modal` capability losing its scenario |
| full suite | native smoke | the new anchored layer disturbing later scenarios (focus left behind, veil not unmounted) |
| two-direction runs (`§4`) | native smoke | the probe passing when the trap or the return is removed |

## 7. Acceptance criteria

- `modal-focus-trap` is registered, green, and `modal` is a required core
  capability.
- The suite is **19/19 green on this host**, exit `0`.
- Both two-direction proofs were run and recorded.
- The three measured facts are in plan `140` §4, `COMPONENTS.md` and the app
  README; the stale "no programmatic focus" claim is gone.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

**19/19 green**, exit `0`; `modal-focus-trap` records 11 checks and
`modal=verified`.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **Component code can move native focus.** `useGpuix().renderer.focusElement`
  focused the modal content after open; `getFocusedElementId()` reported it, and
  `host.focused()` (testId) followed. No `dispatchNativeEvents` call was needed
  for the renderer focus call — the state was visible on the next step.
- **The Tab trap wraps inside the content.** Starting at `modal-content`, four
  `tab` keystrokes moved focus to `modal-a`, `modal-b`, `modal-open-popover`,
  `modal-close`; a fifth returned to `modal-content`. `shift-tab` is the
  reverse (`modal-close → modal-open-popover → modal-b → modal-a → content`).
  Every id stayed inside the surface, so the component's `focusNextWithin` /
  `focusPreviousWithin` contract is native, not decorative.
- **Focus returns to the trigger.** The layout-effect cleanup focused the saved
  element id after close; `getElementBounds(previous) !== null` is a working
  existence check.
- **Escape closes one layer.** With a popover open inside the modal, the
  keystroke did not reach the modal's handler: the readout was
  `open=true popover=false last=popover-escape`. Focus returned to
  `modal-open-popover`; a second Escape closed the modal.
- **A stale limitation was wrong.** The app README claimed "no programmatic
  focus from component code" because `PublicInstance` has no `.focus()`. The
  renderer does — `focusElement`, `focusNextWithin`, `focusPreviousWithin`,
  `getFocusedElementId` are declared on `NativeRenderer` and work. The README,
  the `overlay` and `tree` scenario headers, and the tree readout were corrected.

Two-direction proofs:

1. Replacing `focusNextWithin` with a no-op:
   `Tab moved focus [modal-content,modal-content,modal-content,modal-content]`
   → `modal=failed`, exit `1`.
2. Dropping the focus-return call: `focus returned to the trigger: expected
   "modal-trigger", got "none"` → `modal=failed`, exit `1`.

Two harness fixes fell out of running the probe:

- **`--only` never exited.** The test root's native window keeps Node's event
  loop alive; the full suite masked it because a later scenario replaced the
  tree. `program` now calls `root.unmount()` after writing the report, so
  `--only` exits with the report's code (verified: `--only modal-focus-trap`
  then `log-viewer`, both exit `0`; a failing `--only` run exits `1`).
- **`shell-navigation` broke on the 19th entry** because it wheeled a fixed
  600px. It now wheels until the offset stops changing, so adding a scenario
  cannot break the guard; the assertion is still the same property (the last
  entry is inside the list's bounds).


# 583 — The focus ring on the release runtime

**Phase:** F (integration and truth)
**Owner:** primitives
**Depends on:** 020, 030, 041, 083, 084, 203, 529 (playground), 574
**Status:** done — measured, documented and guarded; the tracker is deferred with a design

---

## 1. The bug

The package paints every focus ring from React's `onFocus`/`onBlur`
(`useFocus` in `src/components/internal.ts`). On the **published 0.10.0
runtime** the window moves native focus but delivers neither event to a
component, so no control can know it holds focus and none paints a ring.

Measured on this host, 2026-10-19, against the store artifact
`node_modules/.store/node_modules/@gpuix/native/gpuix-native.darwin-x64.node`
(23:35 build; `strings` reports `focusVisible=0`, `registerFont=0`, i.e. the
**release-tag** source of plan 529, not the main-derived build):

```
cd packages/primitives
nub exec vitest run --config vitest.runtime.config.ts runtime/focus-ring.runtime.test.tsx
# Test Files 1 failed (1) · Tests 19 failed (19)
# "the control painted no ring" for all 19 cases
```

A minimal probe (a `div` with `tabIndex`, `onFocus`, `onBlur`, `onKeyDown` and a
ref, mounted in the `TestRenderer`) measured:

| Action | `getFocusedElementId()` | `onFocus` | `onBlur` | `onKeyDown` |
| ------ | ----------------------- | --------- | -------- | ----------- |
| mount | `null` | 0 | 0 | 0 |
| `renderer.focusElement(id)` + `dispatchNativeEvents()` | `1` | **0** | **0** | 0 |
| `renderer.focusNext()` + `dispatchNativeEvents()` | `1` | **0** | **0** | 0 |
| `nativeSimulateClick(x, y)` | `1` | **0** | **0** | 0 |
| `nativeSimulateKeyDown(id, "enter")` | `1` | 0 | 0 | **1** |

So: focus itself works and is observable through
`renderer.getFocusedElementId()`; key delivery works; the **focus events are
not dispatched**. The live suite measured the same class of failure on a real
window (playground plan 529 §6.5, plan 390 §6: a click focuses natively and does
not run React `onFocus`; the count is window/host-state dependent, never a
contract).

This is a WCAG 2.4.7 (Focus Visible) gap on the runtime the package pins. It is
**not** a component bug: every control tracks focus correctly on a runtime that
dispatches the events (the same 19 cases pass on the main-derived binding).

## 2. Options and the decision

**A. A native-focus tracker** — one provider polling
`renderer.getFocusedElementId()` and publishing the focused host id; every
control compares it with its own host id through a ref. It would restore the
rings. Rejected for now:

- it is a cross-thread renderer query; a 50 ms poll is 20 round-trips per second
  for the life of every window, and GPUix's idle guarantee (0 repaints, plan
  `302`) is the property we would chip away at;
- every focusable surface would need a ref, including the roving composites
  (one id per row) and `OTPField` (one per cell) — a large, risky rewrite of the
  focus model for a defect the runtime fixes on `main`;
- a polled ring is at best 50 ms late, which is a new, measurable interaction
  cost the library would own forever.

**B. Tell the truth, and guard it** — record the limitation where a consumer
looks (the capability reference, the package README, every focusable page), fix
the *false* claim that focus events are supported, and add a guard so the
documentation cannot silently regress. Chosen. It is the mission's
"documented limitation with evidence" path, and the alternative that still
works is named on each page: role, name, tab order, activation and key handling
are unaffected; the ring is the one missing cue.

Revisit A only if 0.10.x remains the pinned runtime **and** a native focus
subscription is worth its cost; the design is recorded in §6 so a later plan
can pick it up without re-measuring.

## 3. Exact changes

### 3.1 `docs/gpuix-capabilities.md`

1. In §3's table, replace the row
   `| Pointer, keyboard, focus and scroll events | **supported** | … |`
   with **`partial`**, keeping the prop list in the evidence cell and adding
   that `onFocus`/`onBlur` are declared but **not delivered by 0.10.0**, with
   the workaround "renderer focus verbs + `getFocusedElementId`; paint cannot
   follow without a subscription".
2. Add `### Focus events` under `## 4. Cross-cutting gaps` with the probe
   table from §1 above and its consequences.
3. Add one numbered point to `## 6. Consequences for components` stating that
   a ring is paint-while-focused and therefore absent on 0.10.0; keyboard
   operation is unaffected.
4. In `## 8. Re-verifying this table`, add the two commands that reproduce the
   measurement (the focus-ring file and its expected `19 failed` on a
   release-tag build).

### 3.2 `packages/primitives/README.md`

- The "What GPUix does not provide" row for `focusVisible` / `outline*` gains
  the release-runtime sentence: the ring needs `onFocus`, 0.10.0 does not
  deliver it, so the ring is absent on a consumer install; on `main` it paints.
- The **Verification status** paragraph no longer blames the 111 runtime
  failures on a "main-derived binding". It states the two measured classes:
  the release-tag build delivers no focus events (this plan) and reports the
  published box model (plan 529 §6.5), so the focus and absolute-geometry
  assertions fail; no assertion has been re-baselined.
- Add a `.agents/slop/plans/583-release-runtime-focus.md` pointer beside the
  counts.

### 3.3 Every focusable page (18 files)

`packages/primitives/docs/`: `button`, `icon-button`, `toggle`, `checkbox`,
`checkbox-group`, `switch`, `input`, `textarea`, `number-field`, `otp-field`,
`select`, `slider`, `range-slider`, `radio-group`, `rating`, `toggle-group`,
`scroll-area`, `info-tip` (`.mdx`).

Add this exact bullet as the first item of each page's `## Accessibility`
section (the same sentence, so the guard can match it):

```md
- **Release-runtime focus:** the pinned 0.10.0 runtime moves native focus but
  delivers no `onFocus`/`onBlur` to a component
  ([measured](../../../docs/gpuix-capabilities.md#focus-events)), so this
  control paints no focus ring on a consumer install of 0.10.0; the ring paints
  on a runtime that dispatches focus (GPUix `main`). Role, name, tab order,
  keyboard operation and activation are unaffected.
```

### 3.4 `COMPONENTS.md`

- The "Measured native evidence" preamble gains one sentence: the artifact is
  the release-tag build (plan 529) and it delivers no focus events, so the
  runtime rings in the Tier 1 rows are **not** evidence for a 0.10.0 consumer;
  plan 583 records the measurement.
- The Design system `Focus state` row gains the same qualification with the
  link to plan 583.

### 3.5 `.agents/slop/plans/README.md`

Add the plan row to the `020–049` block's table area (the workstream's table at
the end), with status `done` and the measured counts.

### 3.6 `TODO.md`

Tick the new primitives row with the measured counts and the two failing
directions.

## 4. The guard

`packages/primitives/src/docs-focus-events.test.ts` (offline, no binding):

1. **The capability row is honest.** Read `docs/gpuix-capabilities.md`; the
   row for `Pointer, keyboard, focus and scroll events` must be `partial` and
   must contain `onFocus` and `getFocusedElementId`; the `### Focus events`
   section must exist and name `19` (the measured failing cases).
2. **Every focusable page carries the notice.** Iterate the 18 paths, read
   each, and fail by page name when it does not contain the exact notice
   sentence and the `#focus-events` link. A missing page fails by path.
3. **No page promises a ring on 0.10.0.** Fail by page when a page contains
   `paints a focus ring` **without** the notice in the same file. This is the
   direction that catches a future page writing the old claim.
4. **The README does not blame the artifact.** It must contain
   `583-release-runtime-focus.md` and must not contain
   `locally built `main`-derived binding` as the explanation of the 111
   failures.

Two directions to prove (both recorded in §5): delete the notice from
`button.mdx` → cases 2 and 3 fail by `button.mdx`; revert the capability row to
`supported` → case 1 fails by verdict. Also insert `This button paints a focus
ring.` on `label.mdx` (no notice) → case 3 fails by `label.mdx`; replace
`release-tag` in the README → case 5 fails by the missing provenance.

## 5. Commands and expected results

```sh
# The measurement (needs the binding; this host has it)
cd packages/primitives
nub exec vitest run --config vitest.runtime.config.ts runtime/focus-ring.runtime.test.tsx
# release-tag build: 19 failed · main-derived build: 19 passed

# The contract guard (no binding needed)
cd /Users/cyberistic/GPUIXUI/workspaces/primitives
nub run --filter @gpuixui/primitives test src/docs-focus-events.test.ts
# 5 passed

# The documented guard directions (measured this session, then reverted)
#   1. remove the notice from docs/button.mdx      -> "button.mdx" (2 cases fail)
#   2. set the events row to **supported**          -> "records focus events as partial"
#   3. add "paints a focus ring" to docs/label.mdx  -> "label.mdx"
#   4. replace release-tag in the README            -> "names the release-tag build"

# Full offline suite
nub run --filter @gpuixui/primitives test
# 52 files / 750 tests passing (measured 2026-10-19)

# The completion gate
nub run check && nub run lint && nub run test
# green (measured 2026-10-19; test: packages/primitives 750, packages/components 308)
```

## 6. STOP conditions

- **STOP** if `getFocusedElementId()` does not track focus on the store
  artifact. The whole measurement rests on it; report instead of writing the
  limitation.
- **STOP** if the focus-ring matrix passes on the store artifact (the defect
  is absent — then delete this plan's notice rather than ship a false one).
- **STOP** if the store artifact's provenance markers change to the
  main-derived build (`focusVisible=1`): the 19 failures would then be an
  artifact delta, not a release defect, and plan 529 owns the re-run.
- **STOP** before touching `packages/components` or `apps/docs`: their pages
  need the same notice, and that is their owner's row (record in `TODO.md`).

## 7. The deferred tracker (for a future plan)

If the pinned runtime cannot be upgraded and the ring must be restored:

1. `src/components/native-focus.tsx`: one context provider, `useGpuix()`'s
   renderer, `setInterval(50)` reading `getFocusedElementId()`, state only on
   change; mounted by `ThemeProvider`.
2. `useFocus` gains a callback ref (`PublicInstance`, whose `id: number` is
   typed) and returns `focused = trackedId === ownId`, falling back to the
   event state when no provider is above it.
3. Attach the ref to the element that actually holds focus: the root `div` for
   button/toggle/selection controls, the native host for fields, the trigger
   for `Select`, one per thumb/cell/row for the roving composites (refs in an
   array, compared in the group).
4. Tests: the focus matrix gains `await sleep(POLL + 10)` after `focusNext`;
   the harness gains a `settleFocus` helper so the wait is named once.
5. Cost to own: 20 renderer queries per second and up to 50 ms ring latency.
   Record both in `COMPONENTS.md` before shipping.

## 8. Acceptance

- The capability row no longer claims focus events are supported.
- The probe table and the 19/19 measurement are recorded.
- All 18 focusable pages carry the same notice and link.
- The guard passes and fails in the three measured directions.
- README and `COMPONENTS.md` name the release artifact, not a main-derived one.
- `nub run check`, `nub run lint` and `nub run test` pass.

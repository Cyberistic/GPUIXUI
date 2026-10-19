# 609 — A closed `Select` samples the window forever

| Field | Value |
| ----- | ----- |
| Phase | F (performance) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `604` |
| Status | done |

Self-contained: §0 what is true before this plan and the measurement, §1 the
decision, §2 the change, §3 the files, §4 commands, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 acceptance.

---

## 0. What is true before this plan

`Select` observes the window size because its list has to re-decide its side,
re-cap its height and re-measure its trigger when the host window resizes
(plan `604`). The observer is `useWindowSize()` from `@gpuix/react`, whose
default is a **100 ms interval that runs for as long as the component is
mounted**:

```ts
// @gpuix/react/dist/hooks/use-window-size.js
const intervalMs = options.intervalMs ?? 100;
useEffect(() => observeWindowSize(renderer, setSize, { intervalMs }), ...);
```

`Tooltip` was changed in plan `604` to `useWindowSize({ intervalMs: open ? 100 :
false })`; `Select` was not. Measured on this host (2026-10-19, release-tag
binding) by counting `renderer.getWindowSize` calls around one mounted `Select`
in a fresh `TestRenderer` window:

| State | Calls in 450 ms |
| ----- | --------------- |
| closed | 4 |
| open | 5 |

So every closed select in a form asks the renderer for the window size ten
times a second for the life of the process. Nothing reads the result while the
list is closed: the placement is derived from `triggerBox`, `listWidth` and
`viewport`, and the trigger is measured when it changes or when the list opens.
The cost has no consumer.

`observeWindowSize` calls its callback **immediately** on subscribe and then
stops when `intervalMs === false` (`observe` in
`@gpuix/native/dist/host-runtime.js`), so switching the interval off while
closed still reads the current size on mount and again when `open` flips true.
That is what makes the change safe: an open still starts from a fresh size.

## 1. The decision

**A closed `Select` does not sample the window.** The observer runs only while
the list is open, exactly as `Tooltip` already does. Opening re-subscribes and
reads the current size immediately, so a resize that happened while the list
was closed still places the first painted frame correctly.

No API change, no visual change, no change to the resize behaviour plan `604`
proved.

## 2. The change

In `packages/primitives/src/components/Select.tsx`, move the observer below the
derived `open` value and gate its interval:

```ts
const open = selectOpen(openState.value.current, props.disabled === true);
/**
 * The host window, sampled only while the list is painted.
 *
 * A closed select has no placement to correct, and the observer reads the
 * current size when it subscribes, so opening after a resize is still exact
 * (plan `609`; the `Tooltip` rule from plan `604`).
 */
const viewport = useWindowSize({ intervalMs: open ? 100 : false });
```

`useWindowSize` is a hook and moves position in the component body; the call
order stays unconditional and identical on every render, so this is safe. All
existing dependencies on `viewport.width`/`viewport.height` stay in the layout
effect that re-places the open list.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `src/components/Select.tsx` | gate the `useWindowSize` interval on `open`; move the call below `open` |
| `runtime/floating-resize.runtime.test.tsx` | header gains the polling fact; one new case counting `getWindowSize` while closed and while open |
| `docs/select.mdx` | one sentence under **Placement**: the observer sleeps while the list is closed and reads the current size when it opens |
| `COMPONENTS.md` | Selects row records plan `609` and the measured counts |
| `TODO.md` | new ticked row in the primitives ledger; progress `151/151` |
| `.agents/slop/plans/README.md` | index this plan after `608` |

No example change: the behaviour and paint are unchanged.

## 4. Commands and expected results

```sh
cd packages/primitives

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/floating-resize.runtime.test.tsx
# expect: all cases pass, including the new polling case

nub run --filter @gpuixui/primitives test
# expect: 60 files / 837 tests pass (no offline file added)

nub run check
# expect: exit 0
```

The full runtime suite is a merge gate, not part of this iteration:

```sh
nub run --filter @gpuixui/primitives test:runtime
# expect: 57 files / 796 tests (795 + the new case), all pass
```

## 5. Test plan

**Runtime — `runtime/floating-resize.runtime.test.tsx`.** New case: *"a closed
Select does not sample the window"*.

1. Open a fresh window and install a counting `renderer.getWindowSize` that
   returns the real window size.
2. Mount one `Select` with two options.
3. Record the count after mount (the state initialiser and the observer's
   immediate read make this two calls), wait 350 ms, and assert **no further
   calls** while the list is closed.
4. Click the trigger to open the list; wait 350 ms and assert **at least two**
   further calls (the immediate read on subscribe plus two 100 ms samples).
5. Close the list (Escape) and assert the count stops growing again over
   350 ms.

The case names the bug it guards in the file header, and it is not a tautology:
the assertion is on a renderer call the component makes, not on a value the
test stubbed.

**Both directions.**

- Revert to `useWindowSize()`: step 3 fails with ≥3 closed-state calls.
- Gate the interval with `false` unconditionally: step 4 fails because the open
  list never samples.
- Keep the gate but forget to move the call below `open`: TypeScript fails
  (`open` used before declaration), so the change cannot land half-done.

## 6. STOP conditions

- Stop if `useWindowSize({ intervalMs: false })` still samples: the installed
  hook must short-circuit (verified in §0); if it does not, report the version
  and do not add a manual timer.
- Stop if the open list no longer re-places after an injected window change
  (plan `604`'s cases): the observer is not re-subscribing on `open`.
- Do not add a second observer or a manual `setInterval`; one hook owns the
  window size.

## 7. Acceptance

- A closed select makes exactly the two subscribe-time reads and no interval
  reads; an open one samples at 10 Hz.
- Plan `604`'s resize cases stay green.
- `nub run check` and the scoped runtime file pass; docs, inventory, TODO and
  the plan index agree.

## 8. Result (2026-10-19)

- `Select` now observes the window with
  `useWindowSize({ intervalMs: open ? 100 : false })`; the call sits below the
  derived `open` value. The existing placement dependencies on
  `viewport.width`/`viewport.height` are unchanged.
- Measured on this host, release-tag binding: a closed select made **4**
  `getWindowSize` calls in 450 ms before, and **0** after mount's two
  subscribe-time reads in a 350 ms window; an open select still samples
  (4 calls in 350 ms), and a re-closed one stops again.
- Both failing directions observed: the old `useWindowSize()` fails the new
  case with `expected 3 to be +0`; `intervalMs: false` unconditionally fails
  the open half with `expected 0 to be greater than or equal to 2`.
- Runs: scoped `floating-resize` 5/5, offline 60 files / 837 tests, full
  runtime 57 files / **796 tests** (from 795), `nub run check` exit `0`.
- `docs/select.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index record the
  rule; no example or public API changed.

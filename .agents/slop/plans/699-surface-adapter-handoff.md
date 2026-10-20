# 699 — A `Surface` adapter swap must finish the old teardown before it creates the next session

| Field | Value |
| ----- | ----- |
| Status | done — fixed and measured (see §6) |
| Phase | E (specialised foundations) |
| Owner | primitives |
| Depends on | `020`, `597`, `696`, `697`, `698` |
| Feeds | `packages/data-grid` charts, media frames, any future raster or native-view consumer |

Plan `696` documents one ordering guarantee on the `Surface` page and in the
component's own docstring: **"a new adapter destroys the old session first."**
Plan `698` repeats it in the repaint table. Nothing exercises it: every runtime
case swaps props *within* one adapter identity, and the recorder adapter's six
operations are synchronous, so the sequence looks ordered by accident. This
plan measures the real order with a slow teardown and fixes it.

---

## 1. Measured facts this plan relies on

Measured on this worktree, 2026-10-20, against the store's release-tag
`@gpuix/native@0.10.0` binding, in the real `TestRenderer`. The probe mounts a
recorder adapter whose `create` and `destroy` each `Effect.sleep` for a chosen
duration, then re-renders the same `Surface` with a **new adapter identity**.

1. **Equal durations hide the defect.** `create` 80 ms, `destroy` 80 ms:
   `a:visible:false, a:destroy, b:create, …` — the documented order, because
   `Effect.runFork` starts each run synchronously and the old sleep began first.
2. **A slower teardown breaks it.** `a.destroy` 200 ms, `b.create` 0 ms:
   `a:visible:false, b:create, b:resize:100, b:visible:true, b:theme, a:destroy`.
   The **new** session is fully live before the **old** session is destroyed.
   Both sessions target the same host element: React reuses the one `<img>` on an
   adapter swap, so `SurfaceHost.elementId` is identical. An adapter that keys a
   native handle, a decoder or a frame buffer by that element id — exactly the
   shape plan `437` specifies for a future view/media adapter — has its new
   resource released by the late `destroy`. That is silent corruption, not a
   cosmetic order.
3. The synchronous recorder in `runtime/surface.runtime.test.tsx` cannot see
   either case: every method is `Effect.sync`, so the fork completes before the
   next effect is scheduled. The suite is 8/8 green before this plan.

**STOP** if the probe's async order is already `destroy → create` on the pinned
runtime (the fix below would then be dead code) — re-measure with a 200 ms
`destroy` and an immediate `create`. **STOP** if `Deferred.makeUnsafe` is absent
from the installed `effect`, or if `Deferred.await` cannot be used inside the
session chain. **STOP** if the change makes an unmount without a remount hang
(the gate must be completed by the cleanup, never only by a next session).

---

## 2. The fix: one teardown gate per session

File: `packages/primitives/src/components/Surface.tsx`.

The mount effect owns one `Deferred<void>` per session, held in a ref:

```ts
const gate = useRef<Option.Option<Deferred.Deferred<void>>>(Option.none());
```

In the mount effect (`useEffect` with deps `[adapter, renderer]`):

1. Read `const previous = gate.current` **before** replacing it, then
   `const completed = Deferred.makeUnsafe<void>(); gate.current = Option.some(completed)`.
2. Start the session chain with a wait on the previous gate:
   `Option.match(previous, { onNone: () => Effect.void, onSome: Deferred.await })`
   piped into the existing `create → resize → setVisible(true) → setTheme →
   focus` chain. The wait is part of the same forked fiber, so the chain stays
   one unit and is interrupted as one unit.
3. In the cleanup, destroy exactly as today, then always complete **this**
   session's gate:
   `…setVisible(false) → destroy` with the existing per-call error reporting,
   followed by `Effect.ensuring(Deferred.succeed(completed, void 0))`.

React runs a component's previous effect cleanup before the next effect body, so
the new session always sees the old gate, and the old gate is completed only
after `destroy` has finished (or failed and was reported). A fresh mount sees
`None` and starts immediately. An unmount completes its own gate with no waiter,
so nothing hangs.

Keep every other rule in the component unchanged: the `live`/`appliedBounds`/
`appliedMode` resets, the per-call `report`, the revision seed and the focus
effect. Do not add a timeout, a retry, or a global lock — one gate per mount is
the whole mechanism, and a hung `destroy` must stay visible as a hung surface,
not be papered over.

---

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Surface.tsx` | the gate ref, the previous-gate wait in the session chain, `ensuring(Deferred.succeed(...))` in the cleanup; the docstring's ordering sentence gains "the next `create` waits for it" |
| `packages/primitives/runtime/surface.runtime.test.tsx` | one new case: a slow-teardown adapter swap; the existing 8 cases stay untouched |
| `packages/primitives/docs/surface.mdx` | §Repainting: say the teardown is sequenced (the next session's `create` waits for the old `destroy`), and add the case to §Verification |
| `COMPONENTS.md` | the Surface row's Repaint sentence records the ordering guarantee and the case |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | add the task under the primitives workstream, ticked when done |

No other file. `packages/primitives/src/surface/*` is unchanged: the contract
already says `destroy` must be idempotent and safe after a failed `create`, and
this plan only sequences the calls.

---

## 4. Test plan

### 4.1 The new runtime case

`runtime/surface.runtime.test.tsx`, one case, a fresh window per the fixture:

```tsx
it("finishes the old adapter's teardown before creating the next session", …)
```

Two recorder adapters sharing one `calls: string[]`; adapter A's `destroy`
sleeps **200 ms** (`Effect.sleep(Duration.millis(200))`), adapter B's `create`
is immediate. Render A, wait for `a:theme`, render B, wait for `b:theme` **and**
`a:destroy`, then assert the call order with the indices:

```ts
expect(calls.indexOf("a:destroy")).toBeLessThan(calls.indexOf("b:create"));
expect(calls.filter((call) => call === "create")).toHaveLength(2);
```

The index assertion is the one that fails today: measured, `a:destroy` is the
**last** entry (`… b:theme, a:destroy`). Keep the case in the file's header
comment reasoning: the bug is a session swap whose teardown can land inside the
next session.

### 4.2 Both directions

1. Run the case with the current source: it must fail on
   `expected 9 to be less than 1` (or whatever the measured indices are — record
   them).
2. Apply the gate, run again: it must pass.
3. Unmount-without-remount: the existing first case ("creates, sizes, shows and
   themes one session, then destroys it") proves the cleanup still reaches
   `destroy`; it must stay green, and the test must not hang (the fixture's
   `afterEach` unmount is the guard).

### 4.3 Commands (scoped)

```sh
nub run --filter @gpuixui/primitives test:runtime runtime/surface.runtime.test.tsx
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
```

Expected: the file 9/9, the offline suite green (currently 67 files / 921
tests), `check-types` clean. Do **not** run the full live suite for this plan —
it is one component and the change touches no shared hook.

**Measured command note:** `nub run --filter <pkg> test:runtime -- --run <file>`
runs the **whole** suite on this toolchain (measured 2026-10-20: 62 files / 839
tests), because everything after `--` reaches the runner verbatim. The scoped
form is `nub run --filter <pkg> test:runtime <file>` — use that.

---

## 5. Acceptance criteria

- A slow teardown's `destroy` precedes the next session's `create`, measured in
  the real `TestRenderer` by the new case.
- A single mount/unmount still runs `create → resize → visible:true → theme` and
  `visible:false → destroy` exactly once each (existing cases).
- The page, the component docstring, the inventory row and this plan index agree
  with the measured order.
- `check-types`, the offline suite and the scoped runtime file are green; the
  new case fails before the change and passes after (both recorded in the plan
  index row and `TODO.md`).

---

## 6. Outcome (measured 2026-10-20)

- **Both directions proven.** With the old source the new case fails as
  `AssertionError: expected 4 to be less than 2` — `first:create` (0),
  `first:resize` (1), `second:create` (2), `second:resize` (3), `first:destroy`
  (4) — i.e. the exact overlap §1.2 measured. With the gate the case passes and
  the file is **9/9**.
- **The fix is one per-session `Deferred`.** `Surface.tsx` waits on the previous
  gate at the head of the session chain and completes its own gate in the
  cleanup via `Effect.ensuring`, after `setVisible(false) → destroy`. No global
  lock, timeout or retry.
- **No regression.** Existing cases 8/8 stay green (unchanged assertions,
  including the synchronous recorder's `destroy → create` order), the offline
  suite is **67 files / 921 tests**, `check-types` is clean, and the scoped
  runtime file is 9/9.
- **Docs and ledger** — the page's repaint table and adapter section, the
  component docstring, `COMPONENTS.md`'s Surface row, this index and `TODO.md`
  state the sequencing and the measured failure.

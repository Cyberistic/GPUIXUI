# 693 — The runtime suite still sleeps for focus paints; retire the fixed focus wait

**Owner:** `primitives` workstream · **Phase:** F · **Depends on:** 041, 583,
590, 592, 594, 603, 606, 691, 692

## 1. The bug

Plan `691` named the defect and fixed its first three files: `settleFocus()` is a
fixed **120 ms** sleep (`2 × NATIVE_FOCUS_POLL_MS + 20`) standing in for a
synchronization primitive, while the native-focus tracker (`native-focus.tsx`,
plan `590`) publishes its sample on a JS interval and React paints a render
after it. It added `awaitFrame(condition, what)` and converted `focus-ring`,
`info-tip` and `focus-loss`. It did **not** convert the rest: **20 runtime suites
still read a tracker-derived value after `settleFocus()`** (78 call sites).

The fixture's own JSDoc has said since `691`:

> A test that asserts a **paint** must use `awaitFrame` with its own condition
> (plan `691`).

So the rule exists and the harness still offers the footgun. That is the defect:
the suite can fail a green component under load, and nothing stops the next
assertion from using the sleep again.

### Measured evidence (2026-10-19, this host, release-tag build)

Plan `691` measured the class at 2–3 failing cases in two of three full runtime
runs. This plan re-measures it deterministically, against a suite `691` did not
convert (`tooltip-dismiss`'s mechanism — a tip opened from keyboard focus):

```ts
const original = runtime.renderer.getFocusedElementId.bind(runtime.renderer);
let remaining = 6;
Object.defineProperty(runtime.renderer, "getFocusedElementId", {
  configurable: true,
  value: () => (remaining-- > 0 ? undefined : original()),
});
runtime.render(
  <Surface>
    <Tooltip content="A hint" side="bottom">
      <Button testId="target">Delete</Button>
    </Tooltip>
  </Surface>,
);
runtime.focusNext();
runtime.flush();
await settleFocus();          // 120 ms
// tipPainted(...) === false  (the failing direction)
await awaitFrame(() => tipPainted(runtime.allText()), "the late tip");
// tipPainted(...) === true
```

Run as a scratch probe and **deleted**: it passed, i.e. the tip is absent at the
old wait and present after `awaitFrame`. The same delay makes
`overlay-trigger`, `scroll-area-trigger`, `tooltip-dismiss` (tip paint) and the
ring/paint cases in `state-style`, `value`, `toggle`, `disabled`, `otp`,
`number-field`, `rating`, `fields`, `toggle-group`, `checkbox-group`,
`focus-identity`, `activation`, `layout`, `examples`, `roving-arrows`,
`scroll-reveal` and `floating-resize` lose the race.

### What this is not

Not a product bug: the tracker's documented contract is "up to one tick late"
and it delivers (plan `583`). The fix is in the harness and the suites.

## 2. The fix

**Rule:** `settleFocus` and `FOCUS_SETTLE_MS` are **removed**. Every wait that
the tracker forces names the observable the test actually depends on and polls
the frame for it with `awaitFrame(condition, what)`. `sleep` stays for the one
thing a frame cannot represent: a real JS timer (the runtime's 80 ms hover
close).

**Files to change**

1. `packages/primitives/runtime/fixture.tsx`
   - Delete `FOCUS_SETTLE_MS` and `settleFocus`, and the now-unused
     `NATIVE_FOCUS_POLL_MS` import. Keep `sleep` and `awaitFrame`; move the
     "why a fixed sleep is wrong" paragraph onto `awaitFrame` (it already
     carries most of it) and say `sleep` is only for a real JS timer.
2. The 20 runtime suites below: replace each `await settleFocus()` with an
   `awaitFrame` over the observable the following assertion (or the following
   action) reads. Keep the existing `expect` lines unchanged.

   | File | Sites | Observable each site waits for |
   | ---- | ----- | ------------------------------ |
   | `activation.runtime.test.tsx` | 1 (the `focus` helper) | the focused case paints its ring |
   | `checkbox-group.runtime.test.tsx` | 1 | the activated row paints its ring |
   | `controls.runtime.test.tsx` | 6 | ring / announced / painted text |
   | `state-style.runtime.test.tsx` | 2 | `background === FOCUSED` |
   | `examples.runtime.test.tsx` | 1 | the example tooltip paints |
   | `scroll-area-trigger.runtime.test.tsx` | 2 | the tip paints / unpaints |
   | `rating.runtime.test.tsx` | 1 | the clicked star paints its ring |
   | `layout.runtime.test.tsx` | 1 | the region paints the tracked ring |
   | `disabled.runtime.test.tsx` | 3 | `ringCount` reaches its expected value |
   | `value.runtime.test.tsx` | 2 | `ringed()` true, then false |
   | `floating-resize.runtime.test.tsx` | 1 | the opened trigger paints its ring (the tracker's sample landed) |
   | `number-field.runtime.test.tsx` | 6 | ring / painted text / `field.values` |
   | `tooltip-dismiss.runtime.test.tsx` | 2 | the tip paints |
   | `toggle.runtime.test.tsx` | 2 | `ringed()` true, then false |
   | `otp.runtime.test.tsx` | 2 | `ringed(...)` true, then false |
   | `focus-identity.runtime.test.tsx` | 4 | the ring paints / a focus move lands |
   | `overlay-trigger.runtime.test.tsx` | 17 | `tipPainted(...)` its expected value |
   | `scroll-reveal.runtime.test.tsx` | 14 | the region's offset reveals the control |
   | `roving-arrows.runtime.test.tsx` | 1 | the ring moves to the arrowed item |
   | `fields.runtime.test.tsx` | 10 | ring / committed value / painted text |
   | `toggle-group.runtime.test.tsx` | 5 | `focused(...)` / `announced(...)` / ring |

   `focus-wait.runtime.test.tsx` keeps one literal fixed wait on purpose: it
   proves the old wait loses the race, so it says `sleep(120)` (the value the
   removed `FOCUS_SETTLE_MS` held) with a comment naming it, and never names
   `settleFocus`.

   Two shapes recur:
   - **A positive paint**: `await awaitFrame(() => <pred>, "<name>")` then the
     existing `expect`.
   - **An absence**: the predicate is the negation (`!ringed()`,
     `!tipPainted(...)`), then the existing `expect(...).toBe(false)`.
3. `packages/primitives/src/runtime-hygiene.test.ts`
   - Add a case: `fixture.tsx` exports no `settleFocus`/`FOCUS_SETTLE_MS`, and
     no `runtime/*.runtime.test.tsx` names it. Read both with the file scan the
     file already uses; keep the liveness assertion (`suites.length > 30`).
     This is the regression guard, and it **fails today** (78 references).
4. `.agents/slop/plans/README.md` — index this plan.
5. `TODO.md` — add the task under the primitives workstream and tick it with
   the measured counts.

**No product source changes.** If a site appears to need a change in
`src/` to expose its observable, STOP: the observable is the next assertion.

## 3. Exact commands and expected results

Run from the worktree root.

```sh
# 1. The guard fails first: it is the both-direction test.
nub run --filter @gpuixui/primitives test src/runtime-hygiene.test.ts
#   BEFORE the suites are converted: 1 case fails, naming the references.
#   AFTER: all cases pass.

# 2. Each converted suite, scoped, after its edit.
nub run --filter @gpuixui/primitives test:runtime runtime/overlay-trigger.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/scroll-reveal.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/fields.runtime.test.tsx
#   (…one per file changed) — expected: the file passes.

# 3. Full runtime suite twice — the point is that two consecutive runs are
#    identical and green.
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives test:runtime
#   expected: 60 files passed / 826 tests passed both times, 0 failed
#   (no file count changes: no suite is added or removed).

# 4. Offline guarantees (the guard, docs, contract).
nub run --filter @gpuixui/primitives test
#   expected: 62 files / 869 tests, all passed (868 in plan `691`; the new
#   `runtime-hygiene` case is the 869th)

# 5. Repo gates.
nub run check
nub run lint
#   expected: exit 0
```

## 4. Test plan — both directions

| Direction | How it is proven |
| --- | --- |
| **The old wait fails** | The measured probe in §1 (a 6-poll late sample paints no tip at 120 ms and paints it after `awaitFrame`), reproduced for a suite `691` did not convert and deleted before commit. `focus-wait.runtime.test.tsx` (plan `691`) keeps the deterministic ring form. |
| **A missing paint still fails** | `focus-wait`'s "never" case already requires `awaitFrame` to reject and names the missing paint; the converted absence cases (`!ringed`, `!tipPainted`) fail loudly by name if the paint never clears rather than passing on a sleep. |
| **The harness cannot regress** | The new `runtime-hygiene` case fails while `settleFocus` exists and passes once it is gone; it would fail again if either the fixture or a suite reintroduced it. |
| **No component regression** | Every existing assertion is kept; only the wait above it changes. The full runtime suite runs twice, and the offline suite (guards, docs, contract) stays green. |
| **No assert-the-stub** | `awaitFrame` is a wait, not an assertion: it reads a real painted frame or a real callback value that the test does not supply. |

## 5. STOP conditions

- A site's following assertion depends on **no observable** at all: stop and
  report the site rather than inserting `awaitFrame(() => true)` (which would be
  an unconditional green wait).
- An `awaitFrame` times out in a scoped run: report the control and the wait
  duration rather than raising the timeout silently or reverting to a sleep.
- The full runtime suite still fails after the change: capture the failing case
  and `runtime.a11y()`; **do not** re-baseline an assertion.
- Any test count or documented file count changes: fix the claim, do not edit
  the guard (`src/docs-counts.test.ts`, the `641` count guard).

## 6. Acceptance

- [x] `fixture.tsx` exports neither `settleFocus` nor `FOCUS_SETTLE_MS`.
- [x] Zero references to `settleFocus` in `runtime/`.
- [x] The new `runtime-hygiene` guard fails before the change (proven) and
      passes after it.
- [x] Full runtime suite green twice (60 files / 826 tests, 0 failed).
- [x] Offline suite, `check`, `lint` green.
- [x] Plan indexed; `TODO.md` row ticked with the measured evidence.

## 7. Result (measured 2026-10-20, this host, release-tag build)

- 20 suites converted; the fixture's `settleFocus`/`FOCUS_SETTLE_MS` deleted and
  `NATIVE_FOCUS_POLL_MS` no longer imported there. `sleep` stays for the runtime's
  real 80 ms hover timer and for `focus-wait`'s deliberate indictment.
- `src/runtime-hygiene.test.ts` reports `{ fixtureOffersSleep: false, sleepers: [] }`.
- Scoped runs: `activation` 81/81, `controls` + `number-field` 160/160 minus the
  transient activation ring (fixed to look inside the item subtree), `fields` +
  `overlay-trigger` 99/99, `toggle-group` + `scroll-reveal` 24/24,
  `tooltip-dismiss` 12/12, plus six tracker suites 69/69 and nine others 127/127.
- Full `test:runtime` twice: **60 files / 826 tests passed** both times.
- Offline: **62 files / 869 tests passed**.
- Two conversion notes worth keeping:
  - `RadioGroup`/`CheckboxGroup` paint the ring on the option's circle/box, not on
    the row host, so `activation`'s wait scans the item subtree with `isWithin`.
  - `scroll-reveal`'s "back up to a refocused control" case cannot use its offset
    as the wait: the wheel already clamps to the region's maximum, so the wait
    proves the tracker sampled the **bottom** button (its ring), not the offset.

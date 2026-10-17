# 085 — `Button.onClick` fires for a pointer click only, so a keyboard user activates nothing

| Field | Value |
| ----- | ----- |
| Phase | F (Tier 1 correctness) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `058`, `079` |
| Status | **in progress** |

Self-contained: §1 the measurement, §2 the rule, §3 the files, §4 the test plan,
§5 STOP conditions, §6 the outcome.

---

## 1. The gap, measured

`Button` has two activation props:

- `onActivate` — "click or activating key";
- `onClick` — "the raw click".

Measured on this host in a fresh 1280×800 `TestRenderer` window (`testTheme`,
2026-10-18), a `Button` wired with **only** `onClick`:

| Interaction | `onClick` calls |
| ----------- | --------------- |
| Enter on key down | **0** |
| a real hit-tested click | 1 |

The reason is visible in `src/components/Button.tsx`: the key handlers call
`activate()`, and `activate()` calls only `props.onActivate`. The `onClick`
handler is a second path that calls `props.onClick` and then `props.onActivate`.

So the **familiar** prop is the one that silently drops keyboard users. React's
own `onClick` fires for Enter/Space on a real `<button>`, so a consumer who
writes `<Button onClick={open}>` — the obvious spelling, and the one the
components workstream's contract requires (`.agents/slop/plans/110-package-
components.md` §7: "`Button` accepts … `onClick`") — ships a control that only
works with a mouse. This is WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value)
exposure, and it is the same class of defect as plan `083` (a focusable control
with no indicator): the component owns the contract, and one path forgot half of
it.

Nothing else is missing: the key contract itself is correct (Enter down, Space
up, held keys ignored) and `onActivate` works on both paths. The defect is that
the two props disagree about what "activation" is.

## 2. The rule

**One activation path. A pointer click and an activating key both call
`onClick` with the event that activated the button, then `onActivate`.**

- `onClick(event)` receives the real `EventPayload`: the pointer click on a
  mouse press, or the key event (`Enter` key down / `Space` key up) on a
  keyboard activation. That is what React's DOM `onClick` does — it reports a
  keyboard activation as a click — and it lets a consumer read the trigger
  (e.g. `event.key`) without a second prop.
- `onActivate()` stays the no-argument convenience callback, called **after**
  `onClick` on the same path, exactly as today's mouse path orders them.
- `disabled` / `loading` refuse both callbacks on both paths. A held key
  activates neither.
- The fix is a single `activate(event)` used by `onClick`, `onKeyDown` and
  `onKeyUp`, replacing today's two guards. No new prop, no new token, no
  behaviour change for a consumer who passes `onActivate` alone.

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Button.tsx` | replace `activate()` and the `onClick` closure with one `activate(event)`; the key handlers pass their `EventPayload`; document `onClick` on the prop |
| `packages/primitives/src/components/Button.test.tsx` | new cases: Enter down calls `onClick` once with the key event; Space up does; a held key, `disabled` and `loading` call neither; the element's `onClick` handler still activates |
| `packages/primitives/runtime/controls.runtime.test.tsx` | new runtime cases with **`onClick` only**: Enter down reports one click, Space up reports one, a held key none, a disabled/loading button none; a real click still reports once |
| `packages/primitives/docs/button.mdx` | API table `onClick` row; Keyboard section states the shared path; Accessibility note; Verification list |
| `COMPONENTS.md` | the `Buttons` row records `onClick` as the activation path (pointer and keyboard) |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan as **done** |

No other package changes. The components workstream's plan `110` §7 passes
`onClick` for every button-shaped trigger; it becomes correct with this fix and
needs no edit of its own.

## 4. Test plan and commands

Offline (`packages/primitives/src/components/Button.test.tsx`):

1. Enter **down** calls `onClick` once, with an `EventPayload` whose `key` is
   `"enter"`, and `onActivate` once — order: `onClick` first.
2. Enter **up** does not call either a second time.
3. Space **up** calls both once; Space **down** calls neither.
4. A held key (`isHeld: true`) calls neither.
5. `disabled` and `loading` call neither on a key or on the host's `onClick`.
6. A consumer who passes only `onClick` gets activation on Enter (the bug).

Runtime (`packages/primitives/runtime/controls.runtime.test.tsx`, a fresh window
per case), mounting `Button` with **`onClick` only**:

7. `keyDown("enter")` → one call. **Fails today with zero.**
8. `keyUp("space")` after its key down → one call, and the key down alone none.
9. A held Enter → none.
10. A disabled button: Enter and a hit-tested click → none.
11. A loading button: Enter → none, while still announcing `Loading`.
12. A real click → one call, and the payload is the click's (no `key`).

Commands:

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

Expected: the offline suite green with the new cases; the runtime suite green
with the new cases (221 → 225-ish; record the exact count); `check` and `lint`
exit `0`.

**Two-direction proof:** revert the one-line `activate(event)` wiring so the key
handlers call `props.onActivate` only, run the new runtime cases, and record the
failures (`expected 1, received 0`). Restore and re-run green. The disabled and
held-key cases guard the other direction and must pass both ways.

## 5. STOP conditions

- Stop if `EventPayload` on key up does not carry `key` (a test would then be
  asserting an invented field). Read the payload in the probe before writing the
  assertion; this plan's runtime observation only counts calls.
- Stop if a keyboard activation also produces a native click on the focused
  `div` — that would fire both paths twice once they share a callback. The
  current suite proves `onActivate` fires once on Enter and once on Space up, so
  this is a check, not an assumption; if it changes, report instead of adding a
  de-duplication latch.
- Stop if `onClick` is also passed by a component that installs its own
  activation handler (e.g. `ToggleGroup`'s items): the fix must not reach a part
  that resolves activation itself. `grep "readonly onClick"` shows `Button` is
  the only one today.
- Never make `onActivate` fire twice for a click: both callbacks are on one
  path, and the existing "activates once" tests must stay green.
- Never widen `onClick`'s payload to a synthetic object; it is the runtime's
  `EventPayload` or nothing.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test` | 35 files, **413 tests green** (was 411; +2) |
| `nub run --filter @gpuixui/primitives test:runtime` | 19 files, **225 tests green** (was 221; +4) |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| Enter with `onClick` only | `onClick` called once, `key: "enter"` (before: **0**) |
| Space with `onClick` only | nothing on key down, once on key up |
| held Enter / disabled / loading | no `onClick` on any path |
| a real click | one call, no `key` |
| `onActivate` ordering | `onClick` first, then `onActivate`, once per activation |

**Two-direction proof.** Replaced the shared `activate` body with the old
split (`if (event.key === undefined) props.onClick?.(event)` — the key path skips
`onClick`) and ran the suites:

```
# runtime/controls.runtime.test.tsx
× reports a keyboard activation through onClick when only onClick is wired
× reports Space through onClick on key up, never on the key down before it
Tests  2 failed | 31 passed (33)

# src/components/Button.test.tsx
× Button > activates on Enter key down, never on key up
× Button > activates on Space key up, never on key down
× Button > reports the activating key to onClick, before onActivate
Tests  3 failed | 8 passed (11)
```

Restored the single path: `33 passed (33)` and `11 passed (11)`.

**Measured non-findings.** `EventPayload` from the runtime carries `key` on both
key down and key up, so the payload assertion is about the real event. A
keyboard activation produces no secondary native click (the suite still reports
exactly one activation), so the shared callback cannot double-fire. `Button` was
the only component with an `onClick` prop (`grep "readonly onClick"`), so
`Toggle`, the group items and the fields are untouched.


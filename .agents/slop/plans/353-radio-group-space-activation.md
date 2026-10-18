# 353 — `RadioGroup`: Space does nothing, and activation selects the wrong option

**Phase:** F (keyboard consistency) · **Workstream:** primitives · **Depends on:** 030, 041, 044, 048, 049, 061, 084, 089, 093, 332 · **Status:** planned → executed

## 1. The defect, measured

`docs/radio-group.mdx` §Keyboard and `COMPONENTS.md`'s **Radio groups** row both
promise:

> `Enter` / `Space` — select the focused option.

Measured on this host, 2026-10-18, in the real `TestRenderer` (probe deleted
after use), with a **controlled** group that records `onValueChange` and
deliberately keeps `value="a"`:

1. Tab enters the group on `Alpha` (`rg-a`); `ArrowDown` moves focus to `Beta`
   (`rg-b`) and reports `onValueChange("b")`, which the rejecting parent
   ignores — so the value, the tab stop and the aria state stay on `Alpha`
   while native focus is on `Beta`. This is a legitimate state: a controlled
   parent may defer or reject a selection (validation, a permission check, a
   server round-trip), and the group already tracks focus per item
   (`focusedIndex`) to paint the ring.
2. `Space` down then up on `Beta` reports **nothing** — `["b"]` is still the
   whole call list.
3. `Enter` on `Beta` reports **nothing either**: the handler calls
   `select(activeIndex)`, and `activeIndex` is derived from the *value*
   (`Alpha`), so it re-selects the option that is already selected. The
   callback's `notify` guard suppresses the duplicate, so the key looks dead.

Root cause, one expression in `src/components/RadioGroup.tsx`:

```tsx
onKeyDown={(event) => {
  …
  if (decideActivation(key, "down", event.isHeld === true))
    select(activeIndex);          // ← the stale tab stop, and no key-up path
}}
```

Two contract violations at once:

- `core/keyboard.ts`'s shared rule is **Enter on key down, Space on key up**
  (`decideActivation` returns `false` for `("space", "down")`), so a key-down
  only handler can never implement Space. Every other button-shaped control
  (`Button`, `Toggle`, `Checkbox`, `Switch`, `CheckboxGroup` row,
  `ToggleGroup` item) already wires both phases.
- Activation must target the option **that holds focus** (ARIA radiogroup;
  the docs' wording), not the value-derived roving index. When focus and value
  agree — the common uncontrolled case — the two are the same, which is why
  no existing test caught it.

## 2. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/RadioGroup.tsx` | resolve one activation target from `focus.focusedIndex` (falling back to `activeIndex`), and wire activation on **both** key phases on the group. No prop or type change. |
| `packages/primitives/runtime/controls.runtime.test.tsx` | three new runtime cases (§4). |
| `packages/primitives/docs/radio-group.mdx` | state the activation target honestly; keep the existing key table (it becomes true). |
| `packages/primitives/README.md` | one clause in the verification prose (counts refreshed). |
| `COMPONENTS.md` | the Radio groups row records the measured fix and the new runtime count. |
| `TODO.md` | tick the new primitives row. |
| `.agents/slop/plans/README.md` | add this plan's row. |

No `core/` change: `decideActivation` already decides the phases; the bug is
that one component did not ask it about the up phase. No public API change.

## 3. Implementation, exactly

In `renderRadioGroup` (the pure renderer), after `select` is defined:

```tsx
/** The option an activation key selects: the focused one, else the tab stop. */
const activationIndex = Option.getOrElse(focus.focusedIndex, () => activeIndex);
const activate = (phase: "down" | "up", event: EventPayload): void => {
  if (decideActivation(event.key ?? "", phase, event.isHeld === true))
    select(activationIndex);
};
```

- `onKeyDown`: keep the arrow/Home/End handling first (`if (move(key) || jump(key)) return;`),
  then `activate("down", event)`.
- Add `onKeyUp={(event) => activate("up", event)}` on the same group `div`.
- `select` already refuses `props.disabled`, a missing option and a disabled
  option, so no extra guard is added and no caller re-tests `disabled`.

Why this shape:

- `focus.focusedIndex` is already the source of truth for the ring; using it
  makes the paint and the keyboard name the same option (the same rule plan
  `334` applied to `Rating`'s clear).
- The fallback keeps the old behaviour when a key event reaches the group with
  no option focused (the harness's `keyDown("rg", …)` path, and a synthetic
  event): activation still selects the tab stop rather than doing nothing.
- Both phases share one function, so Enter and Space cannot drift.

## 4. Test plan

All three in `runtime/controls.runtime.test.tsx` (runtime, because the defect is
in event wiring and only the renderer dispatches key phases):

1. **`Space selects the focused radio when a controlled parent has not applied the move`**
   — a controlled wrapper keeps `value="a"` and records `onValueChange`; Tab in,
   `ArrowDown` to `Beta` (call list `["b"]`), then `Space` **down**: no new call;
   `Space` **up**: `["b", "b"]`. This fails before the fix with `["b"]` (the
   missing up path) and also proves the down phase is correctly ignored.
2. **`Enter selects the focused radio, not the stale tab stop`** — the same
   mount, `ArrowDown` then `Enter` on `Beta`: the last call is `"b"`
   (pre-fix: no call at all, because it re-selects `Alpha`).
3. **`a held Space does not activate`** — `keyDown("rg-b","space",true)` then
   `keyUp`: the call list does not grow (`decideActivation` ignores a repeat).
4. Keep the existing arrow/Home/End, wrap, skip-disabled, a11y and ring cases
   unchanged; they prove the fallback path and that pointers/keys still agree.

Both directions (AGENTS §3):

- Before the fix, cases 1–3 fail by name with the measured arrays above.
- After the fix, they pass; `nub run --filter @gpuixui/primitives test:runtime`
  is green and the offline suite is unchanged.
- Manual two-direction run recorded in §6 (the repo's
  `scripts/verify-two-directions.sh` is jj-based and unusable — a known root
  `TODO.md` row — so the revert/restore is done by hand and recorded).

## 5. Commands and expected results

```sh
# 1. the new cases fail against the old component
nub run --filter @gpuixui/primitives test:runtime
# expect: 3 failed, naming the three cases above

# 2. after the fix
nub run --filter @gpuixui/primitives test:runtime
# expect: 25 files, 457 tests, all passing

nub run --filter @gpuixui/primitives test
# expect: 43 files, 574 tests, all passing (no offline change)

nub run check
nub run lint
nub run test
# expect: all green
```

## 6. Outcome (executed on this host, 2026-10-18)

**The defect, re-measured.** A controlled `RadioGroup` that records
`onValueChange` but keeps `value="a"`:

| Step | Before | After |
| ---- | ------ | ----- |
| `ArrowDown` on Alpha | focus `rg-b`, calls `["b"]` (parent ignored it) | same |
| `Space` **down** on Beta | calls `["b"]` | `["b"]` — down is correctly inert |
| `Space` **up** on Beta | calls `["b"]` — **nothing happened** | `["b", "b"]` — selects the focused Beta |
| `Enter` on Beta | calls `["b"]` — re-selected Alpha, no-op suppressed | `["b", "b", "b"]` |

**The fix.** `renderRadioGroup` resolves one `activationIndex` from
`focus.focusedIndex`, falling back to `activeIndex`, and one `activate(phase,
event)` helper answers both phases. `onKeyDown` keeps the arrow/Home/End path and
then calls `activate("down", …)`; the group gains `onKeyUp={activate("up", …)}`.
No prop, type or `core/` change.

**Tests.** Three new cases in `runtime/controls.runtime.test.tsx`:

1. `activates the focused radio on Space up, not the value's tab stop`
2. `activates the focused radio on Enter, not the value's tab stop`
3. `selects the tab stop on an activation key with no focused option`

**Both directions measured.** With `RadioGroup.tsx` reverted to `HEAD` the file
reported `3 failed | 45 passed` — exactly those three cases, with
`["b"]` / `["b"]` / `[]` against the expected arrays. With the fix restored the
file is `48 passed`. The probe file used to discover the defect was deleted.

**Commands run:**

- `nub run --filter @gpuixui/primitives test` — 43 files, **574 tests**, green
  (no offline change).
- `nub run --filter @gpuixui/primitives test:runtime` — 25 files, **457 tests**,
  green (was 454).
- `nub run check` — green.
- `nub run lint` — green.
- `nub run test` — green.

**Docs.** `docs/radio-group.mdx` states which option Enter/Space activate and
why focus and value can diverge, and its verification list names plan `353`.
`COMPONENTS.md`'s Radio groups row records the measurement, and the ledger,
`README.md` and `TODO.md` carry the new count.

**Nothing else changed.** Arrows, Home/End, click selection, the roving tab
stop, the ring and the a11y dump are untouched; their existing cases re-pass.

## 7. STOP conditions

- **A key event on a focused option does not reach the group's handler.**
  Stop and report the measured target; the fix would then need a per-item
  `onKeyUp` (the `CheckboxGroup` shape) instead of the group handler.
- **`focus.focusedIndex` is stale after an arrow move** (the runtime reports a
  different focused element than the group's state). Stop: that would be a
  second defect in `onFocusMove`, needing its own plan; do not paper over it
  with a `getFocusedElementId` read inside the renderer.
- **Space-up fires twice** (once via the option's own handler and once via the
  group). Stop and report the event path; do not add a dedupe flag.
- **An existing runtime case fails for a reason other than the new cases.**
  Stop; the fix must not change selection, focus or the ring for arrows,
  clicks or Home/End.

## 8. Acceptance

- The three new runtime cases exist, fail before the fix and pass after it.
- `docs/radio-group.mdx` says which option Enter/Space activate, and the
  existing key table is true.
- `COMPONENTS.md`, `README.md`, `TODO.md` and the plan index agree on the new
  runtime count.
- `nub run check`, `nub run lint`, `nub run test` and the package's
  `test:runtime` are green.

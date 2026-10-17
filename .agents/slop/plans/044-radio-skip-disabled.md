# 044 — a radio group must skip disabled options (primitives workstream)

**Phase:** C (Tier 1 keyboard correctness).
**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** `030`, `040`, `041`.
**Status:** `done` — see §6.

## 1. The bug

`RadioGroup` moved its roving tab stop with `decideMove`, which is pure
arithmetic over `(index, count, key, orientation)` — it knows nothing about
which options are enabled. With `[Alpha, Beta(disabled), Gamma]` selected on
Alpha, **ArrowDown landed on Beta**: the selection did not change (the component
refused to select a disabled option), and because the tab stop follows the
active index, Beta got `tabIndex -1` while no other option had `tabIndex 0`.
The group therefore lost its tab stop entirely, and a second ArrowDown selected
Gamma. Measured in the runtime suite: the option announced as `checked` stayed
`Alpha` (`expected 'unchecked' to be 'checked'` for Gamma).

The platform contract (and Radix, and GPUI Kit) is that arrow navigation
**skips** disabled items.

## 2. Design

Extend `core/keyboard.ts`'s `decideMove` with an optional `isDisabled`
predicate (default: nothing is disabled, so every existing caller keeps its
behaviour):

- candidates are the **other** indexes, in arrow order, wrapping;
- the first enabled candidate wins;
- when no other candidate is enabled, return `None` — "nowhere to move", which
  the group already treats as "not a navigation key" and so does nothing.

`RadioGroup` passes `(candidate) => options[candidate]?.disabled === true` and
drops the now-redundant "did I land on a disabled option?" guard.

Deliberately not changed: `initialActiveIndex` (already picks the first enabled
option), and a fully disabled group (it has no tab stop by design).

## 3. Files to change

```
packages/primitives/src/core/keyboard.ts              EDIT optional isDisabled + wrap over others
packages/primitives/src/core/keyboard.test.ts         EDIT three tests (skip, wrap past, nowhere)
packages/primitives/src/components/RadioGroup.tsx     EDIT pass the predicate, drop the dead guard
packages/primitives/runtime/controls.runtime.test.tsx EDIT one runtime test
COMPONENTS.md                                         EDIT the Radio groups row
```

## 4. Commands and expected results

```sh
nubx vitest run --config vitest.runtime.config.ts runtime/controls.runtime.test.tsx
# expect: 16 passed (was 1 failed / 15 passed before the fix)
nub run test
# expect: 152 passed
nub run --filter @gpuixui/primitives test:runtime
# expect: 53 passed
nub run check
# expect: green
```

## 5. Two-direction proof

Write the runtime test first, against the unfixed component:

```sh
nubx vitest run --config vitest.runtime.config.ts runtime/controls.runtime.test.tsx
# FAIL  skips a disabled option in a RadioGroup's arrow navigation
# AssertionError: expected 'unchecked' to be 'checked'
#       Tests  1 failed | 15 passed (16)
```

Apply the fix; the same command reports 16 passed.

The offline `decideMove` tests are the same guard at the pure layer: without the
predicate they cannot express "skip", and with it they pin skip / wrap-past /
nowhere-to-go.

## 6. Measured results

2026-10-17, this worktree:

- runtime: `1 failed | 15 passed` before, **16 passed** after;
- `nub run test` → **152 passed** (18 icons, 134 primitives offline);
- `test:runtime` → **53 passed**;
- `nub run check` green.

## 7. STOP conditions

- The fix changes the tab-stop assertion for enabled-only groups → stop; the
  arithmetic has drifted from the old behaviour (existing tests pin it).
- `nub run check` cannot stay green.

# 137 — ListItem's caller onClick

- **Phase:** C/F (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 111 (List), 134 (activation), 136 (forwarding sweep)
- **Status:** done, 2026-10-17. 1 native test (List 37, behaviour 277);
  both-direction proof recorded in §8.

`ListItem` spreads `...rest` and then writes its own `onClick`, so a caller's
`onClick` never runs. It is the last part in the package that replaces a standard
host handler instead of composing it (plan 136 fixed `TabsTrigger`'s `onBlur` and
`SearchInput`'s `ref`). A file list that wants to log or track a click cannot do
it without guessing at `onValueChange`/`onActivate`, and a `selectionMode="none"`
list has no callback at all unless `onActivate` is passed.

## 1. Files

```
packages/components/src/list.tsx                    # destructure + compose onClick
packages/components/src/behaviour/list.test.tsx     # +1 native test
COMPONENTS.md                                       # Lists row test count (36 -> 37)
TODO.md                                             # the hardening task
.agents/slop/plans/README.md                        # index this plan
```

## 2. Design decisions (do not re-litigate)

1. **Compose on enabled rows only.** The internal handler runs after the caller's,
   matching `TabsTrigger` and `MenuItem`. A disabled row stays inert: every click
   path in a `List` skips disabled rows, and a caller handler does not change that
   contract.
2. **The event reaches the caller unchanged.** `activate(value, event)` still
   reads the modifiers for multiple selection; the caller sees the same payload.

## 3. Implementation — `src/list.tsx`

Destructure `onClick` next to `onFocus` and compose:

```ts
onClick={
  disabled
    ? undefined
    : (event) => {
        onClick?.(event);
        activate(value, event);
      }
}
```

## 4. Test — `src/behaviour/list.test.tsx` (+1)

1. **A caller `onClick` runs once, before the row is selected.** Render a
   single-selection list whose first row has a spy; click that row. Assert the spy
   ran once and the row became selected. Add the bug to the suite header comment.

Expected: List 36 → 37; behaviour 276 → 277; logic stays 223.

### 4b. Both directions

1. Green first.
2. Remove `onClick?.(event)` from the composed handler → the new test fails with
   `expected "vi.fn()" to be called 1 times, but got 0 times`.
3. Restore and run the whole behaviour suite.

## 5. Inventory and ledgers

- `COMPONENTS.md` → Lists / list items row: 36 → 37 native tests.
- `TODO.md` → tick this task under Tier 2 hardening.
- `.agents/slop/plans/README.md` → index row with the final counts.

## 6. STOP conditions

1. The caller's click and the internal activation disagree about the event
   payload → STOP; do not clone or rewrite the event.
2. The spy fires twice → STOP; `activate` must not call the host handler again.
3. A disabled row's caller handler runs → STOP; the disabled contract is inert.
4. Existing List tests change behaviour → STOP.

## 7. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 223 unchanged
nub run --filter @gpuixui/components test:behaviour   # 276 -> 277
nub run check                                         # exit 0
nub run test                                          # exit 0
```

## 8. Deviations, recorded during implementation

1. **Both-direction proof, recorded from the actual run.** Removing
   `onClick?.(event)` made *runs a caller onClick once before selecting the row*
   fail with `expected "vi.fn()" to be called 1 times, but got 0 times`; the
   first failure left the root mounted and cascaded into the rest of the suite.
   Restored; List 37/37.

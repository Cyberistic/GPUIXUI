# 138 — Combobox pointer selection coverage

- **Phase:** C/F (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 116 (Combobox), 117 (verification), 134 (inventory gate)
- **Status:** done, 2026-10-17. 3 native tests (Combobox 13, behaviour 280);
  liveness check recorded in §6.

The Combobox suite has ten tests and every one drives the list from the
keyboard. The pointer path — the primary way a person uses a combobox — is
untested: clicking an option, toggling several options in multiple mode, skipping
a disabled option, and closing on a press elsewhere. A wrapper regression that
dropped `onValueChange`, closed the popup too early, or ignored the option's
disabled flag would pass today.

This is a coverage plan, not a bug fix. Two probes on 2026-10-17 established the
behaviour and the fixture that exposes it:

| Probe | Result |
| ----- | ------ |
| click trigger, click `Vue` | `onValueChange` called once with `"vue"`; popup closes; trigger label updates |
| multiple, click `Vue`, `React`, disabled `Svelte`, `Vue` | calls are `["vue"]`, `["vue","react"]`, then `["react"]`; the disabled click changes nothing; popup stays open |
| click a truly outside target | popup closes (a target under the floating panel is *inside* it and correctly does not) |

## 1. Files

```
packages/components/src/behaviour/combobox.test.tsx   # +3 native tests
packages/components/docs/combobox.mdx                 # verification 10 -> 13
COMPONENTS.md                                         # Comboboxes 10 -> 13
TODO.md                                               # the hardening task
.agents/slop/plans/README.md                          # index this plan
```

## 2. New tests

Use the existing `options` fixture or a local one with a disabled entry.

1. **Selects an option with the pointer.** Click `combobox-trigger`, then
   `combobox-option-vue`: one `onValueChange("vue")`, popup unmounted,
   `aria-expanded` false, trigger shows `Vue`.
2. **Toggles several options with the pointer and skips a disabled one.**
   `multiple`, click `vue`, `react`, disabled `svelte`, then `vue`: the reported
   arrays are `["vue"]`, `["vue","react"]`, `["react"]`; the popup stays open.
3. **Closes on an outside press.** Render the combobox and an absolutely
   positioned `elsewhere` target at the window's bottom-right (not below the
   trigger: the floating panel covers that space and the press is legitimately
   inside it). Click the trigger, then elsewhere: the popup unmounts.

## 3. Both directions

These are coverage tests with no production change. Prove they are live by
temporarily removing the wrapper's `onValueChange` call (test 1/2 fail) and by
rendering a target under the panel (test 3 would then be measuring the popup
itself, which the fixture avoids). Record the one check that was run.

## 4. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 223 unchanged
nub run --filter @gpuixui/components test:behaviour   # 277 -> 280
nub run check                                         # exit 0
nub run test                                          # exit 0
```

## 5. STOP conditions

1. A pointer click does not reach `onValueChange` → STOP; that is a real bug, do
   not ship a test that asserts the broken behaviour.
2. A disabled option selects → STOP; report the value.
3. The outside-press test cannot find a point outside every floating surface →
   STOP and report the bounds; do not remove the test.
4. A test is flaky across two runs → STOP.

## 6. Deviations, recorded during implementation

1. **Liveness proof, recorded from the actual run.** Removing `setSelected(next)`
   from the wrapper's `onValueChange` made *selects an option with the pointer*
   fail with `expected "vi.fn()" to be called 1 times, but got 0 times` (run with
   `-t` so the earlier keyboard tests did not cascade). Restored; Combobox 13/13.
2. **The outside-press fixture needs an absolutely positioned target.** A target
   rendered below the trigger sits under the floating panel; the press is then
   inside the popup and correctly does not dismiss it. The test places
   `elsewhere` at the window's bottom-right.

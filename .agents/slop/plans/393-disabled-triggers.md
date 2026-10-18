# 393 — A disabled trigger never opens anything

| Field | Value |
| ----- | ----- |
| Phase | F (interaction consistency) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110` (Button stand-in), `112` (dismiss/modal), `114` (menus), `131` (submenus), `317` (Preview card), `320` (Navigation menu), `332` (activation contract), `388` (focus state) |
| Status | done — Preview card 12, Dropdown menu 47, Navigation menu 21 native tests; both-direction proof (the new cases fail on the old code); docs, `COMPONENTS.md` and the inventory check synced |
| Source | `MISSION.md` §Implementation standards ("clear disabled/error behaviour") and §Interaction; measured in §1 |

This plan is self-contained. It fixes one class of defect: a trigger that is
`disabled` still opens its surface through a path that does not go through the
button.

---

## 1. Why — measured, not assumed

`Button` (`internal/button.tsx`) mutes its synthetic click when `disabled`. A
trigger therefore cannot open **by press**. But an overlay trigger also opens
through paths of its own — hover, keyboard focus, arrow keys — and those were
written without consulting `disabled`:

- `PreviewCardTrigger` opens on `onMouseEnter` (after `openDelay`) and on
  `onFocus`.
- `DropdownMenuTrigger` opens on `ArrowDown` / `ArrowUp` / `Enter` / `Space`
  from its own `onKeyDown`.
- `NavigationMenuTrigger` opens on `ArrowDown` and moves focus with
  `Left`/`Right`/`Home`/`End` from its own `onKeyDown`; its hover path is
  already guarded.

Probe run 2026-10-18, five cases, **all five failed** against `HEAD` of
`agent/components`:

| Probe | Observed |
| ----- | -------- |
| `PreviewCardTrigger disabled`, `focusElement(trigger)` | card present |
| `PreviewCardTrigger disabled`, hover the trigger for 150 ms | card present |
| `DropdownMenuTrigger disabled`, focus, `simulateKeystrokes("down")` | menu row present |
| `NavigationMenuTrigger disabled`, focus, `simulateKeystrokes("down")` | panel present |
| `NavigationMenuTrigger disabled`, focus, `simulateKeystrokes("right")` | focus moved to the next trigger |

`ContextMenuTrigger` already guards every path (`disabled` checks before the
right click and before `Shift+F10`); its suite holds that guard. `PopoverTrigger`
and `DialogTrigger`/`DrawerTrigger` open only through the button's click, so the
existing mute is sufficient and no code changes there.

The reachable user path is real: a controlled component can disable a trigger
while it holds focus (a form turns read-only mid-flight, a row becomes
unavailable while the pointer is over it), and the surface then opens with no
press at all — the one interaction a disabled control must never perform.

## 2. The rule

**A trigger's own open and navigation handlers consult `disabled` first.**

- When `disabled` is true, the component's action does not run; the caller's own
  handler still runs once (the contract in `docs/component-api.md` §1: host
  handlers compose, and a muted control still forwards).
- `aria-expanded` keeps reporting the root's state — disabling a trigger of an
  already-open surface does not lie about it.
- No new prop and no new module: the guard reads the `disabled` the trigger
  already accepts through `ButtonProps`, at the three places that need it.
- `ContextMenuTrigger` stays as it is; its existing guard is the shape the other
  three now match.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/preview-card.tsx` | `PreviewCardTrigger`'s `onMouseEnter` and `onFocus` return before opening when `rest.disabled === true`; the press path needs nothing (Button mutes it) |
| `packages/components/src/dropdown-menu.tsx` | `DropdownMenuTrigger`'s `onKeyDown` runs its open logic only when `rest.disabled !== true`, and still calls the caller's `onKeyDown` |
| `packages/components/src/navigation-menu.tsx` | `NavigationMenuTrigger`'s `onKeyDown` runs its open/move logic only when `rest.disabled !== true`, and still calls the caller's `onKeyDown` |
| `packages/components/src/behaviour/preview-card.test.tsx` | 2 new cases (§4) + header comment line |
| `packages/components/src/behaviour/dropdown-menu.test.tsx` | 1 new case (§4) + header comment line |
| `packages/components/src/behaviour/navigation-menu.test.tsx` | 1 new case (§4); the existing "never opens a disabled trigger, by hover or by press" stays as the press half |
| `packages/components/docs/preview-card.mdx` | open-policy table: "a disabled trigger does not open"; Verification count and sentence |
| `packages/components/docs/dropdown-menu.mdx` | keyboard table + Limitations/Verification count |
| `packages/components/docs/navigation-menu.mdx` | keyboard table + Limitations/Verification count |
| `COMPONENTS.md` | the three Tier 2 rows: the rule and the new counts |
| `TODO.md` | Phase F row, ticked |
| `.agents/slop/plans/README.md` | index this plan |

No behaviour change to `ContextMenuTrigger`, `PopoverTrigger`, `DialogTrigger`,
`DrawerTrigger` or `DatePickerTrigger`; do not "tidy" them in this plan.

## 4. Test plan

All four cases live in the existing native suites. Each waits on the tree and
asserts on `findByTestId`, never on a timer alone.

| # | Suite | Case | Mutation that must fail it |
| - | ----- | ---- | -------------------------- |
| 1 | `preview-card.test.tsx` | a `disabled` trigger opens by neither a 150 ms hover nor `focusElement` | remove the `disabled` guard from `onMouseEnter` → the hover half fails; remove it from `onFocus` → the focus half fails |
| 2 | `dropdown-menu.test.tsx` | focusing a `disabled` trigger and sending `down` (and then `up`) leaves the menu closed | drop the guard in `onKeyDown` → the row appears |
| 3 | `navigation-menu.test.tsx` | focusing a `disabled` trigger and sending `down` leaves the panel closed, and `right` does not move focus to the next trigger | drop the guard → the panel opens and focus moves |
| 4 | `navigation-menu.test.tsx` | the caller's `onKeyDown` still fires on a disabled trigger (one call for `down`) | return before forwarding → the call count is zero |

Case 4 is not decoration: the guard must not turn a disabled control into a
handler black hole, which is the mistake a naive early `return` makes.

**Both-direction proof (manual; `scripts/verify-two-directions.sh` still needs
`jj`, recorded in `TODO.md` → Interlocks):**

1. Add the four cases first and run the three suites — 5 assertions fail
   (preview: 2, dropdown: 1, nav: 2, one case asserting both halves).
2. Apply the three guards — all pass.
3. Remove one guard at a time and confirm only its case fails; restore.

## 5. Commands and expected results

```sh
cd packages/components
nub run --filter @gpuixui/components test:behaviour   # PreviewCard 12, Dropdown menu 47, Navigation menu 21; behaviour 602
nub run --filter @gpuixui/components test             # unit 383 (unchanged)
nub run --filter @gpuixui/components check-types      # exit 0
cd ../..
nub run check                                         # exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

The behaviour total moves from 598 to 602 (four cases). If the host reports `unsupported-host`, the suite did not run:
record that and do not claim the cases passed.

## 6. STOP conditions

Stop and report if:

- a guarded case still opens the surface with `disabled` — the open path is not
  the one this plan names; find it and amend the plan before adding another
  guard;
- `rest.disabled` is not readable at the guard (the prop is consumed by
  `Button` first) — read it from the destructured props instead and record the
  change;
- the disabled trigger's focus or hover is never delivered at all in 0.10.0, so
  the probe cannot fail — then the "bug" is unobservable on this runtime: record
  the measurement, keep the guard only where a probe fails, and do not claim a
  fix without a failing case;
- forwarding the caller's `onKeyDown` requires swallowing another prop — stop;
  the contract allows adding the guard, not restructuring the trigger.

## 7. Acceptance criteria

- All four cases pass in the real renderer and each is proven to fail with its
  named mutation.
- `ContextMenuTrigger`'s existing disabled guards still pass unchanged.
- The three docs pages, `COMPONENTS.md` and `TODO.md` agree on the rule and the
  counts; the docs-count check in `inventory.test.ts` stays green. The inventory
  `limitations` arrays stay unchanged: the rule is a guarantee, not a gap.
- `nub run check`, `nub run lint` and `nub run test` pass.

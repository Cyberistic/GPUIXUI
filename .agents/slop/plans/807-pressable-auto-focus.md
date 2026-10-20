# 807 — A pressable control cannot be the first control of a form

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `054`, `079`, `089`, `093`, `332`, `341`, `345`, `583`, `584`, `590`, `603`, `740`, `786`, `799`, `803`, `804`, `806` |
| Status | done |

Self-contained: §0 the measured gap, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

`autoFocus` is the library's contract for "this is where the keyboard starts".
Plan `584` proved it for `Input`, `TextArea`, `NumberField` and `OTPField`, and
plan `806` closed the last *field* whose host is a `div` (`Select`). The
**pressable** controls have no such prop:

| Control | `autoFocus` | Root that owns the tab stop |
| ------- | ----------- | --------------------------- |
| `Checkbox` | **no** | the `checkbox` row |
| `Switch` | **no** | the `switch` row |
| `Toggle` | **no** | the `button` |
| `Button`, `IconButton` | no, deliberately | an action, not a form field |

A consent dialog whose first control is a checkbox, a settings page that opens
on a switch, or a toolbar that opens on a toggle cannot put the keyboard there;
the user's first Tab would be needed. The mechanism is the same as plan `806`:
these three parts are a single focusable `div` root, and a focusable `div`
honours the host `autoFocus` on a later mount (probed for plan `806`).

### 0.2 What must not change

- the disabled rule: a disabled control is out of the tab order and paints no
  ring (plans `089`, `332`);
- a read-only control keeps its tab stop, ring, name and announced state (plans
  `799`, `804`);
- the root's role, name, hit area, activation path and slot contract
  (`TriggerHandlers`, plans `341`, `345`);
- the ring stays the tracker's: plan `806` measured that a seeded `useFocus`
  changed nothing on this runtime and dropped it, so no new focus state ships
  unless a case fails without it.

## 1. The decision

**Add `autoFocus?: boolean` to `Checkbox`, `Switch` and `Toggle`**, forwarded to
the single root host that already carries the tab stop.

The distinction is not "field vs control" but "does this control own a tab stop
on one root". These three do; a `Button` does not need the prop because it is an
action the surface did not open *for*, and the roving composites
(`RadioGroup`, `CheckboxGroup`, `ToggleGroup`, `Rating`, `Slider`,
`RangeSlider`) need a different decision — which item receives the focus — and
are recorded as a follow-up in `TODO.md` rather than guessed here.

## 2. The rule

| State | `autoFocus` |
| ----- | ----------- |
| interactive | the root takes native focus on mount (including a later mount) and rings while it holds it |
| `readOnly` | the same — the review state keeps its stop and ring (plans `799`, `804`) |
| `disabled` | **nothing**: the host carries no `autoFocus`, and is out of the tab order anyway |
| absent | no change |

A mount-time request only: the prop does not re-assert focus on every render, and
the native-focus tracker clears the ring when focus leaves (plans `583`, `590`,
`603`).

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Checkbox.tsx` | `CheckboxProps.autoFocus` (JSDoc as in §2); the root gets `autoFocus={disabled ? undefined : autoFocus}` |
| `packages/primitives/src/components/Switch.tsx` | the same |
| `packages/primitives/src/components/Toggle.tsx` | the same |
| `packages/primitives/src/components/*.test.tsx` (each part) | one element case: the host carries the prop when asked, and never while disabled (read-only keeps it) |
| `packages/primitives/runtime/auto-focus.runtime.test.tsx` | three rows in the plan-584 matrix: each part mounts after the first render and takes focus; a disabled one does not |
| `packages/primitives/docs/{checkbox,switch,toggle}.mdx` | an `autoFocus` API row and a sentence in the focus/accessibility section |
| `COMPONENTS.md` | the three rows record the prop and its cases |
| `TODO.md` | a ticked task for this plan, plus the follow-up row for the roving composites |
| `PLAN.md` | decision row `D57`: `autoFocus` follows the single-root tab stop |
| `.agents/slop/plans/README.md` | this plan indexed |

No other package is touched.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives check-types          # exit 0
nub run --filter @gpuixui/primitives test                 # 75 files / 1063+ tests, exit 0
nub run --filter @gpuixui/primitives test:runtime runtime/auto-focus.runtime.test.tsx
# 1 file, 17 tests (11 existing + 6 new), exit 0
nub run --filter @gpuixui/primitives test:runtime runtime/focus-ring.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx runtime/selection-read-only.runtime.test.tsx \
  runtime/toggle-read-only.runtime.test.tsx
# the ring, tab and review-state matrices for the three parts; expect green
nub run lint                                                # exit 0
nub run fmt                                                 # primitives paths clean
```

The full `test:runtime` run is the merge gate, not this plan's gate.

## 5. Test plan

Each case names the bug it guards in its header comment.

### Element tree

1. **each root carries `autoFocus` when asked** — the host prop is `true` on
   `Checkbox`'s row, `Switch`'s row and `Toggle`'s button.
2. **never while disabled** — `Option.none()` on the same host.
3. **still while read-only** — the review state keeps its stop (one case per
   part, or one case over the three renderers).

### Runtime (`runtime/auto-focus.runtime.test.tsx`, the plan-584 matrix)

4. **focuses a `Checkbox` that mounts after the first render**
5. **focuses a `Switch` that mounts after the first render**
6. **focuses a `Toggle` that mounts after the first render**
7. **focuses each of the three while read-only**
8. **does not focus any of the three while disabled** — `focused()` is `"none"`.

### Two-direction proof (each mutation reverted after it fails)

- Remove the `autoFocus` forward from a part's root (one at a time) → that
  part's runtime case fails with `"none"`, and its element case fails.
- Drop the `disabled` gate on one part → the disabled runtime row and the
  element disabled case fail.
- Gate on `readOnly` as well → the read-only runtime row fails.
- If a first-frame ring assertion is added, removing the tracker wiring must
  fail it; if it passes without a seed, no seed ships (the plan-806 finding).

## 6. STOP conditions

Stop and report with the measured evidence instead of improvising if:

- the runtime does **not** focus one of these roots through the host `autoFocus`
  (then that part keeps no prop, the page records the measured limit, and the
  plan lists which of the three behaves differently);
- focusing a control on mount activates it, toggles it, or dispatches a press
  (focus is not activation — if it does, stop);
- a contract/docs guard rejects the change because a page does not name the prop
  — fix the page, never relax the guard;
- the change would require editing another workstream's paths — record it in
  `TODO.md` instead.

## 7. Outcome

Measured 2026-10-21 in this worktree (release-tag binding):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1066 tests** green (was 1063; +3 element cases) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/auto-focus.runtime.test.tsx` | 1 file / **20 tests** green (was 11; +9 rows over the three parts) |
| `nub run lint` / `nub run fmt` | exit 0 / primitives paths clean (the docs-site file recorded in `TODO.md` is untouched) |

No `useFocus` seed ships: as in plan `806`, the tracker paints the ring and no
case failed without a seed. The element cases also pin the read-only half (the
prop stays) and the disabled half (it is absent) per part.

### Two-direction proof (each mutation reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| `Checkbox`'s `autoFocus` forward removed | runtime `focuses a Checkbox that mounts after the first render`, `focuses a read-only Checkbox` |
| `Switch`'s `disabled` gate dropped | runtime `does not focus a disabled Switch`; element `carries autoFocus on its one root, and never while disabled` |
| `Toggle` gated on `readOnly` too | runtime `focuses a read-only Toggle` |

## 8. Acceptance

- `Checkbox`, `Switch` and `Toggle` take `autoFocus`; a part mounted after the
  first render focuses its root and rings; a disabled one never focuses; a
  read-only one still does.
- The three pages document the prop; the inventory, `TODO.md`, `PLAN.md`
  (`D57`) and the plan index are current; the roving composites are recorded as
  a follow-up task rather than left implicit.
- `check-types`, `test`, `auto-focus` and the scoped matrices, `lint` and `fmt`
  are green, with exact commands and totals recorded.

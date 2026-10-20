# 806 — `Select` cannot be the first field of a form

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `057`, `062`, `083`, `345`, `346`, `584`, `590`, `635`, `797` |
| Status | done |

Self-contained: §0 the measured gap, §1 the decision, §2 the rule, §3 the
files, §4 commands and expected results, §5 the test plan and the
two-direction proof, §6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

### 0.1 The gap

`autoFocus` is the field family's contract: a field mounted after a loading
state still takes focus, and its ring paints from mount (plan `584`, whose
7-case matrix is `runtime/auto-focus.runtime.test.tsx`). It ships on every
field **except** the one whose host is a `div`:

| Part | `autoFocus` | Host that takes focus |
| ---- | ----------- | --------------------- |
| `Input` | yes | native `<input>` |
| `TextArea` | yes | native `<textarea>` |
| `NumberField` | yes | its inner `<input>` (`${testId}-input`) |
| `OTPField` | yes | cell 1 |
| `Select` | **no prop at all** | the trigger `div` (`${testId}-trigger`) |

`SelectProps` has `value`/`defaultValue`/`onValueChange`, `open`/`defaultOpen`/
`onOpenChange`, `placeholder`, `disabled`, `readOnly`, `invalid`, `size`,
`fullWidth`, `side`, `label`, `aria-description`, `style`, `triggerStyle` and
`testId` — and no `autoFocus`. `Select`'s `useFocus` is even created with a
hard-coded `false` seed (`useFocus(false, () => trigger.current)`), so the
trigger's ring cannot paint from mount either.

Consequence: a settings dialog, a search form or a quick-switch sheet whose
first control is a `Select` cannot put the keyboard there. The user's first Tab
would be needed, and the field is not focused when the surface opens — the exact
class plan `584` measured and closed for the other four fields.

Also measured while implementing this plan: the ring needs no new focus state.
`Select`'s `useFocus` already paints from the tracker's sample, and a seeded
state would have been unprovable — removing the seed left all 11 runtime cases
green, because on the window's first render the provider's first sample lands in
the same frame. The shipped change is therefore the prop and the host forward
only, which is also the smaller code.

### 0.2 The platform fact (probed for this plan)

A plain focusable `div` **does** take `autoFocus`, including on a mount after
the window's first render. A temporary probe (a second render replacing a
"Loading" caption with `<div tabIndex={0} autoFocus testId="probe-div" />`)
reported `runtime.focused() === "probe-div"`; the probe file was deleted after
recording.

GPUix's `HostProps.autoFocus` is documented as "take keyboard focus when the
element first mounts", and the trigger is a `div` with `tabIndex` in the tab
order (plan `083` measured it holding native focus), so the prop is the honest
mechanism — not a renderer `focusElement` call.

### 0.3 What must not change

- the trigger stays `${testId}-trigger` and the ring keeps its owner
  (`selectTriggerPartStyle` + `useFocus`, plan `083`);
- a disabled select is out of the tab order and paints no ring; a read-only one
  keeps its stop and ring but never opens (plan `797`);
- the headless `SelectTrigger` spreads its props onto the host, so passing
  `autoFocus` cannot reshape the tree.

## 1. The decision

**Add `autoFocus?: boolean` to `Select`**, forwarded to the trigger host. The
ring needs nothing extra: it already follows `useFocus`, which the tracker
drives (plans `083`, `583`, `590`).

A `Select` is a field: it owns a value, a name, a tab stop, an invalid state and
a read-only state, and D42 already makes its trigger the field surface. Leaving
the one host that is a `div` out of the field contract is an accident of the
element, not a design decision.

## 2. The rule

| State | `autoFocus` |
| ----- | ----------- |
| interactive | the trigger takes native focus on mount (including a later mount) and rings while it holds it |
| `readOnly` | the same — the field keeps its stop and ring, only the list is refused (plan `797`) |
| `disabled` | **nothing**: no host focus, no ring; the trigger is not a tab stop either way |
| absent | no change |

The prop is a mount-time request, like the other fields: it does not re-assert
focus on every render. The ring is the tracker's, so the window's first render
paints it in that frame and a later mount paints it at most one 50 ms sample
late — the latency every ring has on this runtime (plan `583`, measured).

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/components/Select.tsx` | `SelectProps.autoFocus` (JSDoc: what it does, the disabled and read-only rules, the tracker latency); the trigger gets `autoFocus={disabled === true ? undefined : autoFocus}`. No focus-state change: `useFocus` already paints the ring from the tracker |
| `packages/primitives/src/components/Select.test.tsx` | element cases: the trigger carries the prop when asked; it is absent when disabled; the trigger's ring style is not asserted here (paint is runtime) |
| `packages/primitives/runtime/auto-focus.runtime.test.tsx` | three rows in the existing matrix: a `Select` that mounts after the first render takes focus and paints exactly one ring; a read-only one does the same; a disabled one focuses nothing and paints no ring |
| `packages/primitives/docs/select.mdx` | an `autoFocus` API row; one sentence in the focus paragraph that the later mount still focuses (plan `584`) and that a disabled select is never focused |
| `COMPONENTS.md` | the `Select` row records the prop and its tests |
| `TODO.md` | a ticked task for this plan |
| `PLAN.md` | decision row `D56`: `autoFocus` is part of the field contract, whatever the host element |
| `.agents/slop/plans/README.md` | this plan indexed |

No other package is touched.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives check-types          # exit 0
nub run --filter @gpuixui/primitives test                 # 75 files / 1062+ tests, exit 0
nub run --filter @gpuixui/primitives test:runtime runtime/auto-focus.runtime.test.tsx
# 1 file, 10 tests (7 existing + 3 new), exit 0
nub run --filter @gpuixui/primitives test:runtime runtime/select-value.runtime.test.tsx \
  runtime/select-pointer.runtime.test.tsx runtime/focus-ring.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx
# the select neighbours plus the ring and tab matrices; expect green
nub run lint                                                # exit 0
nub run fmt                                                 # primitives paths clean
```

The full `test:runtime` run is the merge gate, not this plan's gate.

## 5. Test plan

Each case names the bug it guards in its header comment.

### Element tree (`src/components/Select.test.tsx`)

1. **forwards `autoFocus` to the trigger host** — `hostProp(trigger, "autoFocus")`
   is `true` with the prop, `Option.none()` without it.
2. **never forwards it while disabled** — a disabled field must not take focus.

### Runtime (`runtime/auto-focus.runtime.test.tsx`, the plan-584 matrix)

3. **rings a `Select` from the window's first render** — first render,
   `focused()` is `${testId}-trigger` and the trigger's box shadow is a
   `focusRing`.
4. **focuses a `Select` that mounts after the first render, rings included** —
   second render, focus is the trigger and `awaitFrame` sees exactly one
   `focusRing`.
5. **focuses a read-only `Select`** — the review state keeps its stop and ring.
6. **does not focus a disabled `Select`** — `focused()` is `"none"`.

### Two-direction proof (each mutation reverted after it fails)

- Remove the trigger's `autoFocus` prop → runtime 3, 4 and 5 fail (`focused` is
  `"none"`), element 1 fails.
- Drop the `disabled` gate on the prop → runtime 6 (`expected 'sel-trigger' to be
  'none'`) and element 2 fail.
- Gate on `readOnly` as well → runtime 5 fails (`expected 'none' to be
  'sel-trigger'`).
- A seeded `useFocus` was **rejected by measurement**: removing the seed left
  all 11 cases green (the first sample lands in the first frame), so no seed
  ships and no case claims one.

## 6. STOP conditions

Stop and report with the measured evidence instead of improvising if:

- the runtime does **not** focus the trigger `div` through the host `autoFocus`
  (then keep the prop out, record the measured limit, and state the honest
  alternative — a renderer `focusElement` call in a layout effect — only if that
  call is measured to work on the pinned build);
- focusing the trigger on mount opens the list or dispatches a press (it must
  not: focus is not activation);
- a docs/contract guard rejects the change because a page does not name the prop
  — fix the page, never relax the guard;
- the change would require editing another workstream's paths — record it in
  `TODO.md` instead.

## 7. Outcome

Measured 2026-10-21 in this worktree (release-tag binding):

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |
| `nub run --filter @gpuixui/primitives test` | 75 files / **1063 tests** green (was 1062; +1 element case) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/auto-focus.runtime.test.tsx` | 1 file / **11 tests** green (was 7; +4 cases) |
| `nub run lint` | exit 0 |
| `nub run fmt` | primitives paths clean; only the docs-site file recorded in `TODO.md` fails |

Measurements that shaped the change:

- a plain `div tabIndex={0} autoFocus` mounted after the first render reports as
  `runtime.focused()` (temporary probe, deleted);
- the window's first render paints the trigger's ring in the first frame;
- a later mount paints it within one tracker sample, so the case waits with
  `awaitFrame` rather than asserting a frame that may not exist;
- the `useFocus` seed was dropped: with it removed every runtime case stayed
  green, so it would have been code with no failing direction.

### Two-direction proof (each mutation reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| The trigger's `autoFocus` removed | runtime `rings a Select from the window's first render…`, `focuses a Select that mounts after the first render…`, `focuses a read-only Select…`; element `forwards autoFocus to the trigger host…` |
| The `disabled` gate dropped (`autoFocus={autoFocus}`) | runtime `does not focus a disabled Select…` (`expected 'sel-trigger' to be 'none'`); the same element case |
| Gated on `readOnly` too | runtime `focuses a read-only Select…` (`expected 'none' to be 'sel-trigger'`) |

## 8. Acceptance

- `Select` takes `autoFocus`; a select mounted after the first render focuses its
  trigger and paints its ring; a disabled one is never focused; a read-only one
  still is.
- The page documents the prop, the later-mount rule and the disabled rule; the
  inventory, `TODO.md`, `PLAN.md` (`D56`) and the plan index are current.
- `check-types`, `test`, `auto-focus` and the scoped neighbours, `lint` and
  `fmt` are green, and the exact commands and totals are recorded.

# 089 — The disabled tab-order matrix

| Field | Value |
| ----- | ----- |
| Phase | F (hardening) |
| Owner | primitives workstream |
| Depends on | `025`, `030`, `041`, `047`, `072`, `076`, `084` |
| Status | **in progress** |

Self-contained: §1 the bug class, §2 the contract, §3 the files, §4 the checks
and the two-direction proof, §5 STOP conditions, §6 the outcome.

---

## 1. The bug class

Every Tier 1 control removes itself from the keyboard tab order when it cannot
act — `tabIndex: undefined` on a `div`, or `-1` where the runtime's editor owns
the element. That guard is written **once per component**, by hand:

| Component | Guard |
| --------- | ----- |
| `Button`, `IconButton`, `Toggle`, `Checkbox`, `Switch`, `Slider` | `tabIndex={disabled ? undefined : 0}` |
| `Input`, `TextArea`, `NumberField` | `tabIndex: disabled ? -1 : undefined` |
| `OTPField` | the roving stop goes `-1` for every cell |
| `Select` | the trigger's `tabIndex` comes from the wrapper |
| `RadioGroup`, `ToggleGroup`, `CheckboxGroup`, `Rating` | the roving stop's owner goes `undefined` |

Sixteen copies of one rule is the exact shape of the bugs this workstream has
already shipped: `OTPField` made six tab stops (plan `076`) and `Select` forgot
its focus ring (plan `083`). Both were invisible to per-component suites that did
not exist yet, and both were caught by a check across controls (`084`). No test
today proves the **disabled** half across the set: the per-component suites that
do prove it live in four different files, and a control added later has no
neighbour to be compared against.

A disabled control that keeps its tab stop is a real keyboard failure: Tab lands
on something that refuses every key, and the user cannot tell whether the UI is
broken or the control is.

## 2. The contract

**A control that cannot act is not a tab stop; a control that can act is
exactly one.**

The matrix proves both directions per control, in one window per direction:

1. `before` (`<div tabIndex={0}>`), the control, `after` (`<div tabIndex={0}>`).
2. The first `focusNext` lands on `before`.
3. **Enabled:** the second `focusNext` lands *inside* the control (the root or a
   descendant — the roving stop's exact element is another plan's subject).
4. **Disabled:** the second `focusNext` lands on `after`.

Step 4 alone would also pass for a control wrongly removed from the tab order, so
step 3 is the other direction of the same guard.

`RangeSlider` is one case, not two: both thumbs are stops when enabled (two
`role="slider"` parts, each capturable), and neither when disabled. `ScrollArea`
is excluded — it has no `disabled` prop; a **labelled** area is a deliberate tab
stop (plan `072`) and an unlabelled one is deliberately not.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/runtime/tab-order.runtime.test.tsx` | new file: the matrix, one `it.each` over the cases, each test running the enabled and the disabled window in sequence |
| `TODO.md` | tick the matrix under the primitives section |
| `.agents/slop/plans/README.md` | index this plan |
| `COMPONENTS.md` | one sentence in the "Measured native evidence" notes if the matrix changes a claim; otherwise no change |

No component code changes unless a case fails (§5).

## 4. Checks and the two-direction proof

```sh
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives test
nub run check
nub run lint
```

Expected: runtime green with `16` new cases; offline unchanged; `check` and
`lint` exit `0`.

**Direction A (a disabled control that keeps its stop).** Remove one control's
guard (e.g. `Checkbox` → `tabIndex={0}` unconditionally), run the matrix, and
record the failing case name. Restore.

**Direction B (an enabled control wrongly removed).** Give one control
`tabIndex={undefined}` unconditionally, run the matrix, and record the failing
case name (step 3 fails; the disabled half still passes — which is why both
directions exist). Restore.

If a case fails **without** a deliberate mutation, that is a real defect: fix the
component, record it here as a measured bug with before/after, and add the
per-component assertion the matrix exposed.

## 5. STOP conditions

- **Stop** if `focusNext` cannot leave a control whose root has no `tabIndex` but
  whose **descendant** does (a roving composite): prove the traversal with a
  minimal tree first and report; do not force the matrix by modelling the stop as
  the root.
- **Stop** if a control needs two tab stops by design and the matrix cannot
  express it: report which one and why (as `RangeSlider` does above) rather than
  weakening the assertion to "not `after`" for everything.
- **Stop** if the runtime focuses an element with `tabIndex={-1}` on `focusNext`
  (then the Input/NumberField guard is not a tab-order guard at all): measure it
  and record the fact; do not change the component to `undefined` to make the
  matrix pass.
- Do **not** add a `disabled` prop to `ScrollArea`, `InfoTip`, `Progress`,
  `Meter`, `Spinner`, `Skeleton` or `Text` to grow the matrix: they are not
  interactive controls, and a prop that exists only for a test is a hack.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test:runtime` | 20 files, **263 tests green** (was 19 / 231; +32 matrix cases) |
| `nub run --filter @gpuixui/primitives test` | 37 files, **421 tests green** — unchanged, the matrix is runtime-only |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` (root) | exit `0` (primitives 421, icons 19, testing 19, playground 11) |
| Direction A: `Checkbox` with `tabIndex={0}` unconditionally | **failed** `Checkbox is skipped when disabled` — `expected 'c' to be 'after'` |
| Direction B: `Checkbox` with `tabIndex={undefined}` unconditionally | **failed** `Checkbox is reached when enabled` — `isWithin` was `false` |

Changed:

- `runtime/tab-order.runtime.test.tsx` — the matrix: sixteen controls, both
  directions, 32 cases.
- `runtime/harness.ts` — `isWithin` is now a harness helper; the focus-ring
  matrix and this one are its two consumers, so ancestry is decided in one place.
- `runtime/focus-ring.runtime.test.tsx` — imports that helper instead of keeping
  a private copy.
- `COMPONENTS.md` — the runtime count ledger and a "Tab-order matrix (089)"
  paragraph beside the focus matrix.

**No component changed.** Every control already had the guard, and both
directional mutations proved the matrix can see a wrong one. That is the honest
result for a hardening plan: the matrix covers a rule that sixteen hand-written
guards share, and the two bugs this workstream already shipped (`076`, `083`)
belong to exactly that shape.

# 084 — Guard the focus contract with a matrix over every focusable Tier 1 control

| Field | Value |
| ----- | ----- |
| Phase | F (consistency) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `083` |
| Status | **done** |

Self-contained: §1 the gap, §2 the rule, §3 the files, §4 the test plan, §5 STOP
conditions, §6 the outcome.

---

## 1. The gap

Plan `083` found a `Select` whose trigger held native focus and painted no ring.
The per-component suites could not catch it: every control that had a focus test
passed, and the select simply had none. That is the shape of the whole defect
class — **a focusable control that forgets its ring** — and only a check across
controls can see it.

The same measurement (2026-10-18, fresh window per control, one `focusNext`,
scan the retained tree for `style.boxShadow`) also proves the rest of the matrix
is healthy today:

| Control | Focused element | Rings painted |
| ------- | --------------- | ------------- |
| Button | `c` | 1 |
| Toggle | `c` | 1 |
| Checkbox | `c` | 1 |
| Switch | `c` | 1 |
| Input | `c` | 1 |
| TextArea | `c` | 1 |
| NumberField | the inner `<input>` (the chrome `c` paints) | 1 |
| OTPField | `c-cell-1` | 1 |
| Select | `c-trigger` | 1 |
| Rating | `c-star-1` | 1 |
| ToggleGroup | `c-l` | 1 |
| RadioGroup | `c-s` (the ring lands on its circle) | 1 |
| CheckboxGroup | `c-a` (the ring lands on its box) | 1 |
| Slider | `c-thumb` | 1 |
| RangeSlider | `c-thumb-start` | 1 |
| InfoTip | `c` | 1 |
| ScrollArea | `c` | 1 |

`focused()` reports `undefined` for `NumberField` because the focused `<input>`
has no `testId`; the ring is on its chrome. The matrix therefore scans the tree,
it does not ask `focused()`.

A first probe that opened all seventeen windows concurrently reported **zero
rings for sixteen controls**. The harness's rule is one window per file and
sequential dispatch (`vitest.runtime.config.ts`: "the input helpers assume the
window they just rendered into is the one that dispatches"); the matrix must run
one case at a time. `it.each` does, one window per test.

## 2. The rule

**Every focusable Tier 1 control paints exactly one ring, and that ring is
inside the control.**

- The ring is `focusRing(theme)` — the same value the tokens package ships and
  every component resolver merges. The matrix asserts the whole object, so a
  control that paints a different shadow fails by value.
- "Inside the control" walks the retained tree from the ring to the window root
  and requires the control's own `testId` node on that path. A ring painted by
  an unrelated neighbour cannot satisfy the case.
- Exactly one: a control that also leaves a stale ring on a child fails as
  loudly as one that paints none.
- The matrix is a **contract test**, not a behaviour test: the per-component
  suites still assert what their ring means (focus follows selection, the ring
  lands on the thumb, and so on).

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/runtime/focus-ring.runtime.test.tsx` | **new**: the seventeen-case matrix and its two helpers |
| `packages/primitives/README.md` | the runtime-status paragraph: 19 files / 221 tests, the select ring and the matrix |
| `COMPONENTS.md` | the `Runtime (041)` count paragraph, the focus matrix note |
| `TODO.md` | add and tick the task |
| `.agents/slop/plans/README.md` | index this plan as **done** |

No product code changes. If a case fails, stop and report: the failure is a
component bug, and its plan owns the fix (that is exactly how `083` was found).

## 4. Test plan and commands

One test per control (`it.each`), each in its own window:

1. Render the control in a `Surface`.
2. `focusNext()` once, from nothing, so the control's first tab stop takes
   native focus.
3. Scan every retained element for `style.boxShadow !== undefined`.
4. Assert **one** ring, its value `{...focusRing(testTheme).boxShadow, inset:
   false}`, and that the ring's ancestry contains the control's `testId`.

Controls covered: `Button`, `Toggle`, `Checkbox`, `Switch`, `Input`, `TextArea`,
`NumberField`, `OTPField`, `Select`, `Rating`, `ToggleGroup`, `RadioGroup`,
`CheckboxGroup`, `Slider`, `RangeSlider`, `InfoTip`, `ScrollArea`.

Commands:

```sh
nub run --filter @gpuixui/primitives test:runtime
nub run check
nub run lint
```

Expected: the runtime suite green with seventeen new cases (204 → 221) and
`check`/`lint` exit `0`. Record the counts in §6.

**Two-direction proof:** set `Select`'s ring condition to `false` (the plan-083
switch) and run the matrix. The `Select` case must fail with `expected 0 to be
1`; restore it and the case passes. A second direction: give `Button` a ring
twice (base + a child) and the "exactly one" assertion must fail.

## 5. STOP conditions

- Stop if any control paints zero rings: that is a real bug. Report it with the
  measured tree; do not weaken the case or add the control to an allowlist.
- Stop if a control paints two: decide which one is stale and report it, rather
  than changing the count to `>= 1`.
- Stop if `focusNext()` moves focus outside the control being tested (e.g. a
  disabled first stop): record the matrix row and report; do not click as a
  workaround — the test is about the keyboard path.
- Stop if a fresh window per case makes the suite flaky or exceeds a minute:
  report the timings; never share a window across cases, because the dispatch
  is window-sensitive (measured in §1).
- Never assert "some shadow exists" without the value and the ancestry: both are
  what make the case fail for the right reason.

## 6. Outcome

Executed on this host, 2026-10-18.

| Check | Result |
| ----- | ------ |
| `nub run --filter @gpuixui/primitives test:runtime` | 19 files, **221 tests green** (was 18 / 204; +17) |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| Matrix rows | 17/17 — one ring each, exact value, inside the control |
| Runtime duration | 61.8 s this run (67.7 s before the matrix; window setup dominates and varies with host load) |

**Two-direction proof.** Both halves of "exactly one" were measured:

1. Set `Select`'s `active` condition to `false` and ran the matrix file:
   `× Select paints exactly one focus ring, inside the control`
   `AssertionError: expected [] to have a length of 1 but got +0` —
   `1 failed | 16 passed`. Restored → `17 passed (17)`.
2. Gave `SelectValue` a second ring (`style={controlFocusStyle(...)}`) and ran
   the same file: the `Select` case failed with
   `expected [ { id: 2, … }, …(1) ] to have a length of 1 but got 2`.
   Removed it → `17 passed (17)`.

The concurrency direction was measured while writing the matrix: the first
probe opened seventeen windows at once (`Promise.all`) and reported **0 rings
for sixteen controls**, which is why the matrix opens one window per test.

# 800 — A read-only `Rating` is the one value control outside the tab order

Phase F · Depends on `030`, `041`, `054`, `089`, `274`, `583`, `590`, `603`,
`786`, `796`, `797`, `799` · Owner: primitives

## 0. Summary

`readOnly` is the package's "shows the value, refuses the change, stays
reachable" state. Plans `786` (the field family), `797` (`Select`) and `799`
(`Checkbox`, `Switch`, `CheckboxGroup`, `RadioGroup`) each established the same
contract, and plan `786` names it explicitly: **a read-only field keeps its tab
stop, its focus ring, its name and its value**. Nine of the ten parts that
declare `readOnly` follow it.

`Rating` does not. Plan `796` gated every star's `tabIndex` on
`disabled !== true && readOnly !== true`, and repeated the claim in the docs and
in the resolver:

> Read-only is not focusable (plan `786`: it has no tab stop)

That parenthetical is **false** — plan `786` says the opposite, and the shipped
runtime agrees (the field, number, OTP, select and selection suites all focus a
read-only control). So a read-only rating is the one value control a keyboard
user cannot reach: the group is announced nowhere in the tab order, and unlike
`disabled` it is not dimmed, so nothing on screen explains why Tab skipped the
value. This is the class plan `603` holds every focusable control to ("ring
while focused / none after leaving"), inverted: a focusable display state that
paints no ring because it was made unreachable.

Measured on this host, 0.6 s after mount (probe deleted; see §4 for the exact
programme):

| Part mounted with `readOnly` | second `Tab` from a leading sentinel |
| ---------------------------- | ------------------------------------ |
| `Input` | `c` |
| `TextArea` | `c` |
| `NumberField` | `c-input` |
| `OTPField` | `c-cell-1` |
| `Select` | `c-trigger` |
| **`Rating`** | **`after`** — skipped |
| `Checkbox` | `c` |
| `Switch` | `c` |
| `CheckboxGroup` | `c-a` |
| `RadioGroup` | `c-a` |

And the writable twin, for the negative direction: the same mount without
`readOnly` lands on `rating-star-3` and rings it.

## 1. The rule this plan lands

A read-only control is a **focusable display state**:

| | interactive | read-only | disabled |
| --- | --- | --- | --- |
| tab stop | yes | **yes** (this plan, for `Rating`) | no |
| focus ring | yes | **yes** | no |
| pointer / keys / commit | yes | no | no |
| cursor | `pointer` | `default` | `not-allowed` |
| opacity | 1 | 1 | 0.5 |
| hover preview | yes | no | no |

`Rating`'s arrow keys stay inert while read-only (the group has no
navigation-only move — an arrow *is* a selection in a rating), so the single tab
stop is the value's star and that star announces `"N of max"` + `checked` /
`unchecked`. A rating with no value still stops on star 1, exactly like the
interactive control (plan `334`).

No `aria-readonly` exists in `0.10.0` (`UNIVERSAL_PROPS` in
`@gpuix/native/dist/mutations.js`), so the reachable value is the only channel;
the pages already say so.

## 2. Files to change

### 2.1 `packages/primitives/src/components/Rating.tsx`

1. Replace the single `interactive` flag's use for the tab stop with a second
   derivation:

   ```ts
   const interactive = props.disabled !== true && props.readOnly !== true;
   const focusable = props.disabled !== true;
   ```

   and `tabIndex={focusable ? (index === tabStop ? 0 : -1) : undefined}`.

   Keep `interactive` for `onClick`, `onKeyDown`, `onKeyUp`, `onMouseEnter`,
   `onMouseLeave` and the preview — a read-only rating still takes no input.

2. `RatingProps.readOnly` JSDoc: "Shows the value and stays in the tab order,
   but takes no input (plan `800`)."
3. `RatingState.readOnly` JSDoc: the same sentence, no "not a tab stop" claim.

Do **not** move the ring into the component: `ratingStarStyle` owns it (§2.2).

### 2.2 `packages/primitives/src/core/style.ts`

In `ratingStarStyle`:

- the ring guard becomes `spec.focused === true && spec.disabled !== true`
  (read-only rings while focused, like a read-only field);
- `cursor` keeps its three-way resolution (`pointer` / `not-allowed` /
  `default`) and `opacity: 0.5` stays disabled-only;
- rewrite the doc comment: three states — **interactive** (pointer + ring),
  **disabled** (blocked, dimmed, no ring), **read-only** (default pointer, full
  contrast, rings while focused because it keeps its tab stop, plan `800`).

### 2.3 `packages/primitives/src/core/style.test.ts`

- `"paints no ring for a control that cannot act"`: replace the read-only
  expectation (`undefined`) with a **defined** ring and a comment naming plan
  `800`; the disabled expectation stays `undefined`, and the enabled direction
  stays (the case still cannot pass by the painter losing its ring).
- `"separates a read-only rating's pointer from the disabled one"` is
  unchanged (the cursors and opacity do not move).

### 2.4 `packages/primitives/src/components/Rating.test.tsx`

- `"drops every tab stop and every input when disabled or read-only"` splits:
  **`disabled`** keeps its assertions (no `tabIndex`, no input); **`readOnly`**
  asserts `tabIndex` is `Some(0)` on the value star, `Some(-1)` on the other
  four, and that a click / Enter / Space still reports nothing. A read-only
  rating with no value stops on star 1.
- `"paints no ring on a read-only star that still holds focus"` becomes
  `"rings the read-only star that holds focus"`: the analogue of the
  interactive case, `[false, true, false, false, false]` for focus index 2.
  The hover-preview half stays where it is (`"does not preview when %s"` in the
  runtime file).

### 2.5 `packages/primitives/runtime/rating.runtime.test.tsx`

Replace the plan-`796` transition case's ring half:

- **`"keeps the ring and the blocked…"` becomes
  `"keeps a read-only rating reachable and ringed"`**: mount a writable rating,
  `focusNext()`, wait for the ring on `3 of 5` (as today), re-render with
  `readOnly`, wait for `cursor === "default"`, then assert the ring is **still
  painted** and `runtime.focused()` is still `ra-star-3`. Then drive
  `keyDown(ra-star-3, "ArrowRight")`, Enter and a click, and assert
  `onValueChange` saw nothing while the writable twin in the same file still
  reports — the "cannot act" half must not pass because the probe missed.

### 2.6 `packages/primitives/runtime/tab-order.runtime.test.tsx`

Add the guard the class needs: a third table over **every** part that declares
`readOnly` (ten rows: `Input`, `TextArea`, `NumberField`, `OTPField`, `Select`,
`Rating`, `Checkbox`, `Switch`, `CheckboxGroup`, `RadioGroup`), each mounted
read-only between the existing `before`/`after` sentinels, asserting the next
`Tab` lands **inside** the control (`isWithin`), not on `after`. Name it in the
file header as plan `800`'s matrix: the read-only state is a tab stop, the
disabled state is not, and the two must not collapse into one.

Why the matrix rather than one case: the defect is a *state* gate written once
per part (the same shape as plans `076`, `083`, `089`), and plan `796` shipped
it because only the rating's own suite read the contract it had just written.

### 2.7 `packages/primitives/docs/rating.mdx`

- API row: `readOnly` — "shows the value, takes no input; still one tab stop,
  still rings while focused, default pointer, no preview".
- §Accessibility bullet: replace "removes it from the tab order" with the
  reachable-display rule and name why it matters (0.10.0 has no
  `aria-readonly`, so the reachable star's `"N of max"` is the only
  announcement).
- The star-state table row for `readOnly` ("shows the value, refuses pointer and
  keys, and is not a tab stop (plan `786`)") → keeps the tab stop (plan `800`).
- §Verification: add the matrix file and the transition case by name.

### 2.8 `COMPONENTS.md`

`Rating` row: append one sentence — read-only keeps the tab stop and ring since
plan `800`, and the ten-part tab-order matrix holds the rule.

### 2.9 `TODO.md`

Add one ticked `[x]` task under the primitives workstream naming the measured
skip, the fix, the matrix, and the suite totals.

### 2.10 `.agents/slop/plans/README.md`

Add this plan's row to the primitives block; state `done` with the measured
numbers after §5 passes.

## 3. Commands

```sh
# 1. offline (style resolver, element tree, docs/contract guards)
nub run --filter @gpuixui/primitives test

# 2. the scoped runtime files this change touches
nub run --filter @gpuixui/primitives test:runtime runtime/tab-order.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/rating.runtime.test.tsx

# 3. the whole package gate
nub run --filter @gpuixui/primitives check-types
nub run check
nub run lint
```

Expected: step 1 green with the offline count from the previous run plus the
cases added here; step 2's `tab-order` file green at 32 + 10 rows and
`rating` green (its count + 0 net if the transition case is rewritten); step 3
green. **The full runtime suite is not run for this plan** — it is the
end-of-task check only for a cross-cutting change, and this change is two files
plus their suites. The merge gate runs it before the branch is promoted.

## 4. Test plan and both-direction proof

The probe that measured the bug (deleted after use; the matrix is its permanent
form):

```tsx
const CASES = [
  ["Input", <Input testId="c" label="Name" readOnly />],
  ["TextArea", <TextArea testId="c" label="Notes" readOnly />],
  ["NumberField", <NumberField testId="c" label="Count" readOnly />],
  ["OTPField", <OTPField testId="c" label="Code" readOnly />],
  ["Select", <Select testId="c" label="Fruit" options={ONE} readOnly />],
  ["Rating", <Rating testId="c" label="Score" readOnly defaultValue={3} />],
  ["Checkbox", <Checkbox testId="c" label="Accept" readOnly />],
  ["Switch", <Switch testId="c" label="On" readOnly />],
  ["CheckboxGroup", <CheckboxGroup testId="c" label="Topics" options={ONE} readOnly />],
  ["RadioGroup", <RadioGroup testId="c" label="Size" options={ONE} readOnly />],
] as const;
// mount between <div testId="before" tabIndex={0}/> and "after"; focusNext() twice
```

Measured before the fix: nine parts report their own id, `Rating` reports
`after`.

**Old direction (must fail without the component change):**

1. `runtime/tab-order › Rating keeps its tab stop while read-only` —
   `expected 'after' to be '…'` / `isWithin` false. Every other row passes,
   which is the point of the table.
2. `Rating.test.tsx › … read-only …` — `expected { _tag: 'None' } to strictly
   equal { _tag: 'Some', value: 0 }` for the value star's `tabIndex`.
3. `style.test.ts › paints no ring…` (the read-only half) —
   `expected undefined to be defined`.
4. `rating.runtime › keeps a read-only rating reachable and ringed` — the
   `boxShadow` wait times out (`the read-only ring`), and the focused id is
   `after`/`undefined` once the mount re-renders.

**New direction (the control cases that stop a vacuous fix):**

- the writable rating in the same files still reports `onValueChange`, still
  rings, still reaches `rating-star-3`;
- a `disabled` rating is still skipped by Tab and paints no ring;
- a read-only rating still refuses click, Enter, Space and both arrows
  (`onValueChange` called 0 times);
- the read-only paint keeps `cursor: "default"`, `opacity` undefined and the
  full-contrast star colour (plan `796`'s cursor/opacity contract is not
  regressed by restoring the ring).

## 5. STOP conditions

Stop and report if any of these is true; do not improvise:

1. Any of the other nine parts fails its read-only row in the new matrix —
   that is a second defect, not this plan's scope; record it in `TODO.md` and
   report.
2. Restoring the ring makes a read-only rating's *hover* preview paint, or
   makes Enter/Space/click report a value.
3. The runtime still reports no native focus for the read-only rating after the
   `tabIndex` change (`focused()` is `None` or `after`) — then the gate is not
   the only place the state is dropped; capture the dump and report.
4. The element-tree `tabIndex` is right but the runtime paints no ring within
   2 s (`awaitFrame`) — capture `runtime.focused()` and the star's style and
   stop: that is the tracker, not this plan.

## 6. Acceptance

- The ten-row read-only tab-order matrix is green, and it fails for `Rating`
  with the component change reverted.
- A read-only `Rating` keeps one tab stop on its value star, rings while
  focused, refuses every input path, keeps the default cursor, and never
  previews.
- `docs/rating.mdx` and both JSDoc blocks state the reachable-display rule, and
  no page repeats "read-only is not a tab stop".
- `COMPONENTS.md`, `TODO.md` and the plan index carry the change.
- `test`, `check-types`, `check`, `lint` green; the recorded scoped runtime
  files green by name.

## 7. Outcome (measured 2026-10-20)

| Check | Command | Result |
| ----- | ------- | ------ |
| offline, package | `nub run --filter @gpuixui/primitives test` | **74 files / 1035 tests green** (was 1032; +1 core, +2 element) |
| scoped runtime, the two touched files | `… test:runtime runtime/tab-order.runtime.test.tsx runtime/rating.runtime.test.tsx` | **65 / 65 green** (tab-order 46, rating 19) |
| scoped runtime, every Rating consumer + examples/theme matrix | 15 files listed in §7.1 | **418 / 418 green** |
| offline, icons | `nub run --filter @gpuixui/icons test` | 4 files / 27 tests green |
| types (whole workspace) | `nub run check-types` | green |
| lint | `nub run lint` | green |
| `nub run check` | — | `check:tests`, `lint`, `fmt` for this workstream's files green; the one remaining format report is `apps/docs/src/components/docs/demos.tsx`, owned by the docs-site workstream (recorded in `TODO.md`), not touched here |

### 7.1 Scoped runtime ids

`runtime/rating.runtime.test.tsx`, `runtime/tab-order.runtime.test.tsx`,
`runtime/activation.runtime.test.tsx`, `runtime/disabled.runtime.test.tsx`,
`runtime/focus-loss.runtime.test.tsx`, `runtime/focus-ring.runtime.test.tsx`,
`runtime/invalid.runtime.test.tsx`, `runtime/late-value.runtime.test.tsx`,
`runtime/name.runtime.test.tsx`, `runtime/pointer-feedback.runtime.test.tsx`,
`runtime/roving-arrows.runtime.test.tsx`, `runtime/state-style.runtime.test.tsx`,
`runtime/theme-matrix.runtime.test.tsx`, `runtime/value.runtime.test.tsx`,
`runtime/examples.runtime.test.tsx`.

The full runtime suite was **75 files / 961 tests green** after this change
(947 before it: +10 read-only matrix rows, +4 in the rating file). It ran here
as the end-of-task check because the change touches a shared paint resolver and
a cross-control matrix; a scoped-only change would leave it to the merge gate.

### 7.2 Both-direction proof, by name

| Mutation | Failing case(s) |
| -------- | --------------- |
| `tabIndex` gate reverted to `interactive` | `runtime/tab-order › Rating keeps its tab stop while read-only` (only that row, 45/46 passed); `Rating.test.tsx › keeps one tab stop and refuses every input when read-only` (`[undefined × 5]` vs `[-1, -1, 0, -1, -1]`); `Rating.test.tsx › stops an unrated read-only rating on the first star` |
| ring guard reverted to `interactive` | `style.test.ts › rings a read-only star that keeps its tab stop` (`expected undefined to be defined`); `Rating.test.tsx › rings the read-only star that holds focus` (`[false × 5]` vs `[false, true, false, false, false]`); `runtime/rating › keeps a read-only rating reachable, ringed and inert` (the ring wait times out) |

The control cases (`keeps the writable twin's ring and reports its
activation`, the `disabled` half of the matrix, `keeps a disabled rating
visually blocked`, and the input refusals in the read-only case) pass in both
directions, so neither mutation can be masked by "nothing happens anywhere".

### 7.3 Behaviour landed

- `Rating`'s tab stop is gated on `disabled` only; the value's star is the stop
  (`star 1` when unrated), as the interactive control already was.
- `ratingStarStyle` rings a focused star unless it is disabled; the read-only
  cursor (`default`), disabled cursor (`not-allowed`), the `0.5` opacity and
  the full-contrast paint are unchanged (plan `796` is not regressed).
- A read-only rating still refuses click, `Enter`, `Space`, both arrows and the
  hover preview.
- `docs/rating.mdx`, both JSDoc blocks, `COMPONENTS.md` and `TODO.md` now state
  the reachable-display rule; nothing repeats "read-only is not a tab stop".

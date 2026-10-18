# 307 — Stepper: a multi-step progress indicator

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `205` §3 (B5), `306` (the form group) |
| Status | done — 8 native tests, both-direction proof measured |
| Source | `docs/component-api.md` §8 (planned parts: `Stepper`, `StepperStep`); `COMPONENTS.md` → Tier 2 → Stepper; plan `205` B5 |

This plan is self-contained. It adds `Stepper` to `packages/components` at the
Tier 2 bar: code, a native behaviour test that can fail, a docs page, an example
and an inventory row.

---

## 1. Why

Nothing in the package shows progress through a sequence of named steps, which a
multi-step form and a wizard both need. `COMPONENTS.md` lists Stepper as `todo`;
plan `205` §3 makes it B5, after `Fieldset` (B1) and independent of `Form` (B3)
because a stepper is a **read-only indicator**: the form owns which step is
current, exactly as a `Field` does not own its value.

The row in `COMPONENTS.md` describes the reference (adabraka `StepItem` /
`StepStatus`): a `div` + `<text>` indicator. There is no `aria-current` in
`@gpuix/native@0.10.0` (measured for Breadcrumbs, plan `113`), so the current
step carries `aria-selected` — the same honest substitution Pagination uses.

## 2. The target API

```tsx
<Stepper value={2} label="Checkout">
  <StepperStep value={1} label="Account" description="Email and password" />
  <StepperStep value={2} label="Billing" description="Card and address" />
  <StepperStep value={3} label="Review" />
</Stepper>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Stepper` | `role="list"`, the optional accessible name, the derived current value and the axis | `value` (required, 1-based), `orientation?` (`"horizontal"` default), `label?`, `children?: PartChildren` |
| `StepperStep` | `role="listitem"`, the number marker, label, optional description and derived status | `value` (required), `label` (required), `description?`, `style?: StateStyle<StepperStepState>` |

- The status is **derived**, never passed: `complete` when `value < current`,
  `current` when equal, `upcoming` when greater. There is no `status` prop to
  contradict `value`.
- The component is display-only. There is no `onValueChange`, no step click and
  no hidden step state: the consumer renders the stepper from the value its own
  workflow already holds. An interactive stepper would need a disabled/validation
  policy the API cannot invent; record that as a limitation, not a TODO prop.
- `StepperStepState` is the public state object:
  `{ readonly status: "complete" | "current" | "upcoming" }`. Like every other
  interactive part, the caller's `style` is a `StateStyle` merged after the
  status rule, so a callback wins exactly where an object style would.

### Visual rules (tokens only)

- Marker: a `controlHeight(theme, "md")` square, `radius.full`, centred value
  text in `caption` type.
- Marker colours: current → `primary` / `primaryForeground`; complete →
  `secondary` / `secondaryForeground`; upcoming → `muted` / `mutedForeground`.
- Label: `label` type; `foreground` when current or complete,
  `mutedForeground` when upcoming. Description: `caption` /
  `mutedForeground`.
- No connector line in v1. A connector would need a part or a pseudo-element the
  runtime does not have; the gap is the honest separator. Record it.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/stepper.tsx` | **create** — `Stepper`, `StepperStep`, the context, `stepperMeta` |
| `packages/components/src/index.ts` | add `export * from "./stepper.js";` |
| `packages/components/src/inventory.ts` | import and list `stepperMeta` |
| `packages/components/src/behaviour/stepper.test.tsx` | **create** — 8 tests (§7) |
| `packages/components/examples/stepper.example.tsx` | **create** — a three-step checkout, horizontal and vertical |
| `packages/components/docs/stepper.mdx` | **create** — anatomy, usage, statuses, API, theming, accessibility, limitations, verification |
| `docs/component-api.md` | move Stepper from "Planned Tier 2 additions" to the built table with source `plan 307` |
| `COMPONENTS.md` | Stepper row → `done` / `partial`, 8 native tests, the limitations |
| `TODO.md` | tick Stepper under the Tier 2 gap list |
| `.agents/slop/plans/README.md` | add this plan to the components table |

No new dependency; markers are `div`s and `<text>`, as the row requires.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: all suites pass; Stepper 8
nub run --filter @gpuixui/components test             # expected: unit suites + inventory pass
nub run check                                         # expected: exit 0
nub run lint                                          # expected: exit 0
nub run test                                          # expected: exit 0
```

## 5. STOP conditions

Stop and report if:

- the a11y dump does not report `role="list"` / `role="listitem"` nodes. Then the
  root is a plain labelled group; change the test to the honest surface, record
  the evidence in the row and docs, and do not keep a role the runtime drops.
- `aria-selected` does not reach the dump on a listitem. Keep it on the node
  (Pagination's precedent) and assert the derived status through the marker
  colours and `style` callback instead; record that the selected state is not
  announced.
- a status colour needs a role the theme does not ship (for example a distinct
  "complete" accent). Add an interlock to `TODO.md`; do not mix a literal.

## 6. Test plan

`src/behaviour/stepper.test.tsx` (real GPUix renderer):

1. renders every step in declaration order with its label and description;
2. derives exactly one `current` step from `value` (marker colours) and the others
   `complete` / `upcoming`;
3. marks the current step `aria-selected` and leaves the others unselected;
4. labels the current and complete steps with `foreground`, the upcoming ones
   with `mutedForeground`;
5. horizontal lays the steps in a row, vertical in a column (assert
   `flexDirection`);
6. names the list from `label` and reports list/listitem roles;
7. a consumer `style` on a step wins over the status rule;
8. a `style` callback receives the derived `status` for each step.

**Both directions.** Make the status derivation return `"current"` for every
step: tests 2, 3, 4 and 8 fail. Restore; green. A second useful break: swap
`<` and `>` in the derivation and confirm 2 fails (complete/upcoming invert).

## 7. Acceptance criteria

- Two exported parts with JSDoc and an exported `StepperStepState`.
- Eight native tests, both themes, no literal colours or sizes.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's
  §8 table agree.
- All gates and the behaviour suite green.

## 8. Result

Landed 2026-10-17:

- `src/stepper.tsx` — `Stepper` (`role="list"`, optional name, axis) and
  `StepperStep` (`role="listitem"`, `aria-selected` on the current step,
  `StateStyle<StepperStepState>`), with the status derived in one function.
- `src/behaviour/stepper.test.tsx` — 8 tests. Two renderer facts were measured on
  the way: `findByText` returns the **text leaf**, so a styled value needs two
  `getElement` hops (`leaf → <text> → the styled box`); and `aria-selected` on a
  `listitem` does reach the accessibility dump, so the current step is announced.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's §8
  table updated; `docs/component-api.md` moved Stepper out of the planned list.
- **Both directions:** forcing every step to `current` fails the status test (and
  cascades through the rest of the suite because the failed assertion leaves the
  root mounted). Restored: 325 behaviour tests green; `nub run check` green.

# 381 — The tag chip's removal control is nameable

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `314` (tag input), `330` (example registry), `333`/`335` (docs truth) |
| Status | done — the control is `<chip testId>-remove`; TagInput 9 → 10 native tests (behaviour 555). Both-direction proof: removing the prop fails the naming test and both removal tests (`no element`). |

## 1. The problem

The playground's Tier 2 scenarios hit a real testability/accessibility gap (plan
`347` §8.2, item 4):

> `TagInput`'s chip removal control has no `testId`. The scenario removes a chip
> by clicking window coordinates derived from the chip's painted bounds … The
> live twin asserts the chip's presence instead: the async host has no
> coordinate click for an element it cannot name.

Our own suite has the same weakness: `src/behaviour/tag-input.test.tsx` locates
the control **by child index**:

```ts
const id = chip?.children[1];
```

That breaks the moment the chip's internal order changes, and a consumer (or a
harness) with no coordinate hit-testing cannot address the control at all. Every
other internal control in this package is nameable (`search-clear`,
`alert-dismiss`, `toast-dismiss`), and `TimePickerClear` already derives
`${testId}-clear` from its root. The chip is the outlier.

## 2. Scope

**In scope**

- `src/tag-input.tsx`: name the removal control `<chip testId>-remove` when the
  chip has a `testId`; document the convention on the chip.
- `src/behaviour/tag-input.test.tsx`: find the control by that id instead of by
  child index; add one test that asserts the control is named and exposed as a
  button named `Remove <token>`.
- `docs/tag-input.mdx`: note the derived id and bump the stated count.
- `COMPONENTS.md` row count and note.
- `TODO.md`, this plan, and the plan index.

**Out of scope — do not touch**

- No new prop: the chip already accepts `testId`; a second `removeTestId` would
  make callers state the same identity twice.
- No visual or behavioural change to the control (same role, label, tab stop,
  activation).
- No change to the `TagInput` root or field.
- No files outside `packages/components/`, `COMPONENTS.md`, `TODO.md` and this
  plan set.

## 3. Files and exact changes

### 3.1 `packages/components/src/tag-input.tsx`

In `TagInputChip`, derive the control's id from the caller's chip id:

```ts
const removeTestId =
  rest.testId === undefined ? undefined : `${rest.testId}-remove`;
```

and pass `testId={removeTestId}` to the removal `<div>`. Add to the
`TagInputChip` JSDoc:

```
 * The removal control is named `<testId>-remove` when the chip has a `testId`,
 * so a consumer or a native harness can address one token's control.
```

`rest` is already spread onto the chip root; nothing else changes.

### 3.2 `packages/components/src/behaviour/tag-input.test.tsx`

1. Replace the child-index helper:

   ```ts
   /** The chip's removal control, named by the chip's derived id. */
   const removeControlOf = (
     root: ComponentTestRoot,
     chipTestId: string,
   ): TestElement | undefined =>
     root.renderer.findByTestId(`${chipTestId}-remove`);
   ```

   Import `TestElement` as a type from `@gpuix/react/testing`.

2. Add one test (it fails before the change): **names its removal control after
   the chip**:

   - render `<Harness initial={["design"]} />`;
   - assert `findByTestId("chip-design-remove")` is defined;
   - assert `nodesWithRole(renderer, "button")` contains a node named
     `Remove design` (import `nodesWithRole` from `../internal/a11y.js`).

3. Header: add the guarded bug — a control only reachable by child index.

### 3.3 `packages/components/docs/tag-input.mdx`

1. In **Accessibility** (or the nearest equivalent), state that each chip's
   removal control is named `<chip testId>-remove` and is a `role="button"`
   labelled `Remove <token>`.
2. **Verification**: `(9 tests)` → `(10 tests)` and name the new case.

### 3.4 `COMPONENTS.md`

- **Tag / token input** row: append "each chip's removal control is named
  `<chip testId>-remove`"; change `9 native behaviour tests` to
  `10 native behaviour tests`.

### 3.5 `TODO.md`

Under **Tier 2 hardening after the inventory closed**, add and tick:

```
- [x] Tag chip removal control is nameable: `<chip testId>-remove`, so a native
  harness can press one token's control without coordinates — plan 381; 1 native
  test (Tag / token input 10), both-direction proof
```

and resolve the playground interlock row for plan 347 §8.2 item 4.

### 3.6 This plan set

Add plan 381 to `.agents/slop/plans/README.md` with the final counts.

## 4. Commands and expected results

Run from `workspaces/components`.

```sh
nub run --filter @gpuixui/components check-types
# expected: exit 0

nub run --filter @gpuixui/components test
# expected: 37 files / 362 tests (the inventory picks up the docs and row counts)

nub run --filter @gpuixui/components test:behaviour
# expected: 47 files pass; behaviour 554 → 555 (TagInput 9 → 10)

nub run check
nub run lint
nub run test
# expected: exit 0
```

## 5. Both-direction proof

1. Remove the `testId={removeTestId}` prop from the control (keep everything
   else). Run
   `nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tag-input.test.tsx`.
   Expected: the new naming test fails, and the two existing removal tests throw
   "tag-input suite: no element" because the helper now looks the control up by
   name. Restore.
2. Re-run the file: **10/10**.

Record the failing assertion names in the commit message body.

## 6. STOP conditions

Stop and report with evidence instead of improvising if:

- the runtime does not render a `testId` on the removal control's `<div>` (it is
  a host element like every other part, so this should not happen);
- an existing removal test cannot be updated to the named lookup without changing
  the component behaviour;
- the a11y dump does not expose the control as a button named `Remove <token>`
  (then assert the `aria-label` through the element's props and record why);
- any file outside §3 must change;
- a gate fails twice for the same reason.

## 7. Acceptance criteria

- `TagInputChip` with `testId="chip-design"` renders its removal control with
  `testId="chip-design-remove"`, and the accessible node is a button named
  `Remove design`.
- The behaviour suite finds the control by name, never by child index.
- One new native test fails without the change and passes with it.
- Docs, inventory record, `COMPONENTS.md` counts, `TODO.md` and the plan index
  are synced.
- `nub run check`, `nub run lint` and `nub run test` pass.

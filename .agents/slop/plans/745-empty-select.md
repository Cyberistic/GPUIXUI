# 745 — A `Select` with no options opens no list

| Field | Value |
| ----- | ----- |
| Phase | F — the dead-menu rule (plan 346) reaches an empty option list |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Selects row in `COMPONENTS.md`) |
| Depends on | `041` (runtime suite), `057` (ARIA contract), `066`/`068` (placement + cap), `346` (open state / disabled), `363` (empty group), `589`/`635` (option text) |
| Status | **done** — a select with no choices (an empty list, or only empty groups) opened an empty `ListBox` node, the dead menu plan `346` refused for a disabled select. One row-aware `selectHasChoices` rule closes it: the trigger stays a focusable, named field with its placeholder, a controlled `open` is asked to close once, and an all-disabled list still opens. 1 core + 4 scoped runtime cases; three runtime cases fail without the gate and the empty-group case fails against an `options.length` gate; offline 70 files / 959 tests, scoped live 1 file / 4 |

## 0. Why

Plan `346` established that **a dead menu must not paint**: a `Select` disabled
while its list was open left `['Apple','Pear']` painted, although the runtime
refuses every choice on a disabled control. The rule is "the wrapper owns the
open state, and a disabled control is closed".

An **empty option list** is the same dead menu — a listbox with no rows offers
nothing — and nothing refuses it. Measured on this host (2026-10-20, 1280 × 800,
release-tag binding), `<Select label="Fruit" placeholder="Pick a fruit"
options={[]} />`:

| Gesture | Result |
| ------- | ------ |
| `Tab` | trigger focused, named `ComboBox: "Fruit"`, value `"Pick a fruit"` |
| `Enter` | **an empty `ListBox` node paints** (`s-content` exists) |
| click | list closed (`s-content` gone) |
| `options=[{ disabled: true }]` + `Enter` | list opens with the row — correct: the user can see what exists |

So the empty state publishes a **named, empty `ListBox`** — a dead menu, the
class plans `346` (disabled) and `363` (empty group) closed for their cases. A
computed options list (`options={records}` before data arrives, or a filtered
set) reaches this state in normal use.

The honest shape: the field stays a normal labelled, focusable `Select` showing
its placeholder — it is a real form field — but it **cannot open a list with
nothing in it**. All-disabled options still open, because seeing why nothing is
selectable is information.

## 1. The contract

1. A select with **zero options** never paints a list: an open request in either
   open mode produces no `Content` element, no `ListBox` node, and the trigger
   reports `expanded: false`.
2. The trigger stays focusable, named and stale-free: focus, name, placeholder
   paint and tab order are unchanged (it is not a disabled control).
3. Groups count as their options: `options={[{ label: "Empty", options: [] }]}`
   has no choices and does not open; a group with rows does.
4. **All-disabled** options are still choices: the list opens and paints the
   rows, because the state is visible rather than dead.
5. A **controlled** parent that asks to open with no options is asked to close
   once (`onOpenChange(false)`), exactly the disabled rule; the wrapper's own
   state is cleared too, so options arriving later start from closed rather than
   popping a list the user asked for while empty.
6. No public prop changes; type-ahead over no options stays a no-op.

## 2. Files to change

### 2.1 `packages/primitives/src/core/select.ts`

Add one rule beside `selectOpen`, reusing `selectOptions`:

```ts
/**
 * Whether a select has anything to list.
 *
 * A group contributes its options, so an empty group is no choice; an option
 * is a choice even when it is disabled, because the list must be able to show
 * why nothing can be picked (plans `346`, `363`, `745`).
 */
export const selectHasChoices = (
  options: ReadonlyArray<SelectOption | SelectOptionGroup>,
): boolean => Arr.isNonEmpty(selectOptions(options));
```

Check the module's existing imports (`Arr` is already used by `selectOptions`).

### 2.2 `packages/primitives/src/components/Select.tsx`

- Compute `const hasChoices = selectHasChoices(props.options);` beside the open
  state (before the derived `open`).
- Derive `const open = selectOpen(openState.value.current, props.disabled === true) && hasChoices;`
  so the first frame after a request cannot paint, and add the empty case to the
  existing close effect:

  ```ts
  useEffect(() => {
    if (
      (props.disabled === true || !hasChoices) &&
      openState.value.current
    )
      openState.set(false);
  }, [props.disabled, hasChoices, openState.value.current]);
  ```

  Update that effect's comment: "A disabled select, and a select with nothing to
  list, are closed. The request also reaches a controlled parent… (plans `346`,
  `745`)."
- The chevron, ring and `aria-expanded` already read the derived `open`, so they
  follow: a closed empty select paints the down chevron and `expanded: false`,
  like a disabled one.
- `Select`'s docstring: one sentence — a select with no options paints no list
  (plan `745`).

### 2.3 `packages/primitives/src/core/select.test.ts`

Extend the `selectOpen` describe:

- `selectHasChoices([])` → `false`;
- `selectHasChoices([{ value, label }])` → `true`;
- `selectHasChoices([{ label: "Empty", options: [] }])` → `false`;
- `selectHasChoices([{ group: "Fruit", options: [{ value, label }] }])` → `true`;
- a disabled option still counts → `true`.

### 2.4 `packages/primitives/runtime/select-value.runtime.test.tsx` (or a new scoped file)

Prefer the existing select runtime suites: add cases to
`runtime/select-value.runtime.test.tsx` if its fixture fits, otherwise create
`runtime/select-empty.runtime.test.tsx` with the standard header. Cases:

1. `"does not open a list with no options"` — mount
   `<Select testId="s" label="Fruit" placeholder="Pick a fruit" options={[]} />`:
   - `Tab` focuses `s-trigger`, the `ComboBox` node is named `Fruit` and its
     value is `"Pick a fruit"`;
   - `Enter`, a real click and `ArrowDown` each leave
     `runtime.element("s-content")` **None** and the accessibility tree with
     **no `ListBox`** node;
   - re-render the same select with two options, `Enter` opens the list: the
     field is not broken, the empty state is what refuses.
2. `"does not open for a group with no rows"` — `options=[{ label: "Empty",
   options: [] }]`, `Enter` → no content, no `ListBox`.
3. `"still opens when every option is disabled"` — one disabled option,
   `Enter` → the list paints ("Apple"), so the gate is emptiness, not choice.
4. `"asks a controlled parent to close an empty open request once"` — render
   `open` with `onOpenChange` recording, `options=[]`; flush: the list is not
   painted and the callback received exactly `[false]`; re-render with `open`
   still true: no second call (the transient state was cleared).

Old direction: case 1/2 paint `s-content` and a `ListBox`; the over-broad
direction (gate on the raw `props.options.length === 0`) fails case 2's group
shape and the disabled-only case stays green.

### 2.5 `packages/primitives/docs/select.mdx`

- Add a bullet under the open-state/limitations discussion: **an empty select
  opens nothing** — the trigger stays focusable and shows its placeholder, a
  controlled `open` is asked to close once, all-disabled options still open
  (plan `745`).
- API table `options`: one clause, "an empty list opens no list".
- Verification section: name the new runtime cases and the core rule.

### 2.6 `COMPONENTS.md`

Selects row: **Empty list (745):** a select with no choices (including only
empty groups) paints no list and publishes no `ListBox`; the trigger stays a
focusable, named field with its placeholder, and a controlled open request is
asked to close once. All-disabled options still open so the state is visible.

### 2.7 `TODO.md` and `.agents/slop/plans/README.md`

- Add a ticked primitives row for plan `745`.
- Add plan `745` to the primitives table with the measured result.

## 3. Commands and expected results

```sh
# 1. the core rule and the wrapper's element tree.
nub run --filter @gpuixui/primitives test src/core/select.test.ts
# expect: the new selectHasChoices cases pass; the existing selectOpen cases are
# unchanged.

# 2. the scoped runtime file — run first with the gate reverted to record the
#    failing direction.
nub run --filter @gpuixui/primitives test:runtime runtime/select-empty.runtime.test.tsx
# expect before the fix: case 1/2 fail on `s-content` being Some and a ListBox
# node existing; after: 1 file / 4 tests pass.

# 3. the neighbouring select suites.
nub run --filter @gpuixui/primitives test:runtime runtime/select-value.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/select-pointer.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/select-typeahead.runtime.test.tsx
# expect: unchanged and green.

# 4. the package gates.
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives check-types
```

## 4. Test plan — both directions

The measured gap: zero options still opened an empty `ListBox` node, while a
disabled select was closed (plan 346).

1. **Core.** The four `selectHasChoices` shapes (empty, flat, empty group, real
   group, disabled option) prove the rule is about rows, not array length.
2. **Runtime, before the fix.** Cases 1 and 2 fail by name: `s-content` is
   `Some` and the tree holds a `ListBox`.
3. **Runtime, after the fix.** No content, no `ListBox`, the trigger unchanged;
   re-rendering with options opens normally; the disabled-only list still opens.
4. **Controlled direction.** `open` + no options paints nothing and asks for
   `false` exactly once; the second render does not ask again.
5. **Over-broad direction.** Gating on `props.options.length === 0` fails the
   empty-group case (it has one entry and no rows); gating on "every option
   disabled" fails the disabled-only case.
6. **No regression direction.** Placement, cap, scroll, type-ahead, option
   groups, the empty-string value and the disabled close all stay green.

## 5. STOP conditions

Stop and report rather than improvise if:

- the runtime opens the list without the wrapper's `open` value (then the
  derived value is not the gate and the fix belongs in the trigger's handler);
- clearing `openState` makes a controlled parent loop (then the close ask must
  be recorded and the contract re-decided);
- the trigger's tab order, name, ring or `expanded` changes for a non-empty
  select;
- an all-disabled list stops opening (the gate must be emptiness, not
  selectability);
- the `ListBox` node survives `open={false}` (the runtime's own list is then
  outside our control and the limitation must be recorded).

## 6. Acceptance

- An empty select paints no list, publishes no `ListBox`, and keeps a normal
  focusable, named trigger with its placeholder.
- Empty groups count as empty; all-disabled options still open.
- A controlled open request is asked to close once and does not reopen when
  options arrive.
- The new core and runtime cases fail against the old behaviour and pass after;
  the neighbouring suites stay green.
- The page, `COMPONENTS.md`, `TODO.md` and the plans index tell the truth.
- `nub run --filter @gpuixui/primitives test`, the scoped runtime files and
  `check-types` pass.

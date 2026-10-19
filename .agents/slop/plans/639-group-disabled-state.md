# 639 — a group whose every option is disabled reports `disabled` in its `StateStyle`

**Phase:** F (Tier 1 consistency / API truth)
**Owner:** primitives workstream (`packages/primitives`)
**Depends on:** 056 (ToggleGroup), 065 (CheckboxGroup), 079/080 (state-aware
style), 332 (disabled after focus), 359 (selection state), 366 (usable counts)

## 0. The defect

All three data-driven selection groups document the same group-level state:

| Page | `disabled` meaning |
| ---- | ------------------ |
| `docs/checkbox-group.mdx` | "every row is disabled" |
| `docs/radio-group.mdx` | "every option is disabled" |
| `docs/toggle-group.mdx` | "every item is disabled" |

The code passes only the group prop to the style resolver:

```tsx
{ disabled: props.disabled === true, invalid: … }   // CheckboxGroup
{ disabled: props.disabled === true, invalid: … }   // RadioGroup
{ disabled: props.disabled === true }               // ToggleGroup
```

So `<CheckboxGroup options={[{ …, disabled: true }]}>` reports
`disabled: false` to its `style` callback even though every row reports
`disabled: true`, no row is a tab stop, and the group is unusable. A consumer
dimming the group from `state.disabled` gets an enabled-looking group.

This is not the pointer behaviour (the rows already refuse input); it is the
state the **public style API** promises. An empty group is the exception: it has
no option to disable, so it is not disabled.

## 1. Files to change

### 1.1 `packages/primitives/src/core/selection.ts`

Add one exported rule beside `initialActiveIndex`:

```ts
export const groupDisabled = (
  disabled: boolean,
  options: ReadonlyArray<SelectableOption>,
): boolean =>
  disabled ||
  (!Arr.isReadonlyArrayEmpty(options) &&
    Arr.every(options, (option) => option.disabled === true));
```

JSDoc: its own prop **or** every option disabled; an empty group is not disabled
(it has no option to disable); the three group pages promise this meaning
(plan `639`). The parameter is `boolean`, not `boolean | undefined`, so the
caller resolves the absent prop once (`props.disabled === true`).

### 1.2 `packages/primitives/src/core/index.ts`

Export `groupDisabled` with the other `./selection.js` values.

### 1.3 The three group roots

- `src/components/CheckboxGroup.tsx`: import `groupDisabled`; the root
  `resolvePartStyle` state becomes
  `disabled: groupDisabled(props.disabled === true, options)`.
- `src/components/RadioGroup.tsx`: same.
- `src/components/ToggleGroup.tsx`: same.

Only the group-root `style` state changes. Per-item states, tab stops, pointer
and key guards are untouched.

### 1.4 Tests

`packages/primitives/src/core/selection.test.ts`
- `"reads a group as disabled when its prop or every option is disabled"`:
  - `groupDisabled(true, []) === true`;
  - `groupDisabled(false, []) === false` (an empty group is not disabled);
  - `groupDisabled(false, [{ value: "a", disabled: true }]) === true`;
  - `groupDisabled(false, [{ value: "a", disabled: true }, { value: "b" }])`
    is `false`;
  - `groupDisabled(false, [{ value: "a" }, { value: "b" }])` is `false`.

`packages/primitives/src/components/state-style.test.tsx`
- extend the existing group cases (or add three beside them) so each group
  mounts with **no `disabled` prop** and every option `disabled: true`, and the
  recorded `StateStyle` state is `{ disabled: true, invalid: … }`.
- one mixed case per group (one option disabled, one enabled) still records
  `disabled: false`, proving the rule is "every", not "any".
- the empty-group case still records `false`.

### 1.5 Docs

The three pages already state the rule, so no wording change is required. Add
one clarifying clause to each state table: "an empty group is not disabled".
`COMPONENTS.md` rows for **Checkboxes** (Checkbox Group), **Radio groups** and
**Toggle Group**: append "**Group state (639):** the group `style` callback
reports `disabled` when the prop is set **or every option is disabled**; an
empty group is not disabled."

### 1.6 Records

- `.agents/slop/plans/README.md`: index this plan.
- `TODO.md` primitives section: ticked row with counts.
- `PLAN.md` §4: `D50` — "A group's style state reports effective disablement, not
  just the prop." Rationale: the state is the public styling contract; it must
  agree with the rows that already refuse input.

## 2. Commands and expected results

```sh
# Red (old code): the three "every option disabled" element cases fail.
nub run --filter @gpuixui/primitives test src/core/selection.test.ts src/components/state-style.test.tsx
# expected before: `{ disabled: false }` where the case expects true.
# expected after: both files green; mixed and empty cases unchanged.

# Gates.
nub run check
nub run lint
nub run --filter @gpuixui/primitives test
```

No runtime suite is needed: this is a `StateStyle` state delivered to the
element tree, and the existing runtime suites already prove the rows are inert.
If an existing runtime case depends on the group state, run the affected scoped
file and report it rather than re-baselining.

## 3. STOP conditions

Stop if:

- any **behaviour** changes (a row becomes actionable or a tab stop appears):
  this fix must touch only the `StateStyle` state object;
- an existing test asserts the old `disabled: false` for an all-disabled group;
  that test is evidence of the defect — update it and name it in the result,
  never delete it;
- an option type cannot satisfy `SelectableOption` structurally (it can: all
  three carry `value: string` and `disabled?: boolean`).

## 4. Test plan — why each test can fail

| Test | Guards | Fails without the fix because |
| ---- | ------ | ----------------------------- |
| core `groupDisabled` cases | the rule | the helper does not exist; once added, the empty/mixed cases pin "every, and non-empty" |
| element `CheckboxGroup` all-disabled | its root state | the resolver passes the raw prop (`false`) |
| element `RadioGroup` all-disabled | its root state | same |
| element `ToggleGroup` all-disabled | its root state | same |
| mixed/empty cases | no over-reporting | "any disabled" or an `every` without the empty guard fails them |

Both directions: record the failing element assertions before the change and
their pass after.

## 5. Acceptance

- [x] New core + element cases fail on the old code and pass on the new code.
- [x] No behaviour changes; `nub run check`, `nub run lint`, `nub run test` and
      the affected primitives runtime files are green.
- [x] Docs clause + inventory rows; plan indexed, TODO ticked, D50.
- [x] Commit on `agent/primitives` and push.

## 6. Result

- **Red run (old rule), 2026-10-19:** with `groupDisabled` reduced to
  `disabled`, the two files were **52 passed / 4 failed**:
  - `state-style > CheckboxGroup reports disabled when every option is disabled`
    — `expected { disabled: false, invalid: false } to strictly equal
    { disabled: true, invalid: false }`;
  - the same for `RadioGroup`;
  - `ToggleGroup` — `expected { disabled: false } to strictly equal
    { disabled: true }`;
  - `groupDisabled > reads a group as disabled …` — `expected false to be true`.
- **Green run (new code), 2026-10-19:** the two files are **56/56**; the scoped
  runtime files (`toggle-group`, `checkbox-group`, `state-style`) are **28/28**,
  proving no behaviour change. Package gates: offline 60 files / **848** tests,
  `nub run check`, `nub run lint` and `nub run test` green; the full runtime
  suite was 57 files / 799 tests before this state-only change and the affected
  scoped files pass after it.

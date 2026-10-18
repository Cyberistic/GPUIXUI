# 363 — `Select` paints an orphan heading for an empty option group

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / measured truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `057`, `075`, `090` |
| Status | done |

Self-contained: §0 the defect, §1 the decision, §2 the rule, §3 the files, §4
commands, §5 the test plan and the two-direction proof, §6 STOP conditions, §7
outcome, §8 acceptance.

---

## 0. The defect

Two shipped statements disagree with each other:

- `src/core/select.ts` `selectRowCounts`: *"An empty group paints no heading, so
  it counts as nothing rather than leaving a section title over blank space."*
  `docs/select.mdx` and the `COMPONENTS.md` Selects row repeat it.
- `src/components/Select.tsx` `renderSelect` (the `isSelectGroup(entry)` branch)
  renders `SelectGroup` + `SelectLabel` for **every** group entry without looking
  at `entry.options`.

So `<Select options={[{ label: "Empty", options: [] }, { value: "a", label: "A" }]} />`
paints a heading with nothing under it, while the height estimate that picks the
list's side counts no row for it. The list is therefore also taller than the
number the wrapper used to decide how much room it had.

Measured in the runtime (this host, 0.10.0) by restoring the old branch for one
probe: `runtime.allText()` contains `"Empty"`, the accessibility dump has a
named `Group` node with no children, and the painted list is **112 px** where
`selectListHeight(2, theme, 1)` — two options, one real heading — is **90 px**.
The extra 22 px is the orphan caption row plus its gap. After the fix the same
list measures 90 px, within 1 px of the estimate.

## 1. The decision

**An empty group is not painted at all** — no `SelectGroup`, no heading, no
accessibility node, no height. This is what the estimate and the docs already
say, and it is the only reading in which a heading describes something.

An empty group is not an error: a caller that filters options at render time
(`groups.map(g => ({...g, options: g.options.filter(matches)}))`) must be able to
pass the result straight through. It simply contributes nothing.

## 2. The rule

In `renderSelect`, the group branch resolves its options first:

```tsx
isSelectGroup(entry) ? (
  Arr.match(entry.options, {
    onEmpty: () => null,
    onNonEmpty: (rows) => (
      <SelectGroup …>
        <SelectLabel …>{entry.label}</SelectLabel>
        {Arr.map(rows, row)}
      </SelectGroup>
    ),
  })
) : (
  row(entry)
)
```

`Arr.match` is the package's empty/non-empty branch (EF-7). A `null` child is
already how a conditional sibling is expressed in this tree; the option rows keep
their keys.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/components/Select.tsx` | the empty-group branch; a docstring line on `renderSelect` |
| `packages/primitives/src/components/Select.test.tsx` | one element-tree case: an empty group paints nothing |
| `packages/primitives/runtime/fields.runtime.test.tsx` | one runtime case: the heading is absent from the paint and the tree, and the painted list height matches the estimate |
| `packages/primitives/docs/select.mdx` | the groups section states the empty-group behaviour with the measured count |
| `COMPONENTS.md` | the Selects row records it |
| `TODO.md` | tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

No capability, token or public-type change.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/Select.test.tsx` | the new case and the existing group cases pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 605 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx` | the new case passes; every existing field/select case stays green |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 29 files / 587 tests) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

`test:runtime` needs the local 0.10.0 binding (ADR 0003). `MissingNativeBindingError`
is a STOP (§6).

## 5. Test plan

### 5.1 Element tree (`src/components/Select.test.tsx`)

1. **"paints nothing for an empty option group"** — `renderSelect` with
   `[{ label: "Empty", options: [] }, { value: "a", label: "A" }]`; assert the
   list has exactly one child, its `role` is `option`, and no child's `role` is
   `group`. Before: two children, the first a named `group` with a heading.

### 5.2 Runtime (`runtime/fields.runtime.test.tsx`)

2. **"does not paint an empty group's heading"** — open a select whose options
   are one empty group, one real group and one flat option. Assert
   `runtime.allText()` contains the real heading and option but not the empty
   group's label, and `a11yNode(…, { role: "Group", label: "Empty" })` is `None`.
   Assert the painted list height equals `selectListHeight(2, theme, 1)` within
   1 px (two rows, one heading) — the estimate was already right, so a taller
   list is the orphan row.

### 5.3 Two-direction proof

- Run both cases before the fix; record the failures in §7.
- Restore the unconditional group branch → both fail.
- Restore; the suites are green, and `nub run check`, `nub run lint`,
  `nub run test` pass.

## 6. STOP conditions

1. `test:runtime` cannot load the binding (`MissingNativeBindingError`).
2. The height assertion cannot distinguish the two trees (e.g. the list is
   capped to `maxHeight` in the chosen layout). Then keep cases 1 and 2's paint /
   a11y assertions as the proof and record the geometry fact rather than
   weakening the count.
3. A gate fails for an unrelated reason — report it, do not mask it.

## 7. Outcome

`renderSelect` now branches on the group's options: an empty group paints
nothing. Measured after the fix:

- element tree: the list's children are `[option "A"]` — no group node, no
  heading;
- runtime: `allText()` contains `"Europe"`/`"Europe West"`/`"United States"` but
  not `"Empty"`, the a11y dump has no `Group` named `"Empty"`, and the painted
  list is **90 px** — exactly `selectListHeight(2, theme, 1)`, the figure the
  side estimate uses. Measured before: **112 px** and `"Empty"` painted.

Mutation: restoring the unconditional `SelectGroup` branch failed both cases —
the element case with `expected [ {…}, {…} ] to have a length of 1 but got 2`,
the runtime case with `expected [ 'Empty', 'Europe', … ] to not include
'Empty'`. Offline **43 files / 606 tests** (605 + 1), runtime **29 files / 588
tests** (587 + 1). `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] An empty option group paints no heading, no group node and no height.
- [x] The docs and inventory state it, and `TODO.md` and the index record the
      work.
- [x] Both cases fail against the old branch.
- [x] The three gates and the runtime suite pass.

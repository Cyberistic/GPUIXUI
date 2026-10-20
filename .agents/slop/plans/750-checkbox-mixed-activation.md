# 750 — A mixed `Checkbox` must not clear itself on activation

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — a control that contradicts its own paint |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Checkboxes row in `COMPONENTS.md`) |
| Depends on | `030` (package), `041` (runtime suite), `065` (`CheckboxGroup` and its select-all rule), `094` (the tri-state paint), `324` (the controlled rule), `354` (the activation matrix), `640` (the selection mark) |
| Status | **done** — activation reads the state the control paints (`nextChecked`), so a mixed box asks for `true` instead of clearing; 3 core + 1 element + 2 scoped runtime cases, and the anti-pattern runtime case fails with `[false]` against the old expression (offline 71 files / 979 tests, scoped live 1 file / 2) |

## 0. Why — the measured bug

`docs/checkbox.mdx` promised: "activation still toggles the underlying boolean,
so an indeterminate parent becomes checked on the next click rather than
clearing." `Checkbox`'s activation was `onValueChange(!state.current)` — the
**boolean**, not the state the control paints and announces.

A caller may set both props (`indeterminate` "overrides `checked`"). The control
then paints and announces `mixed` while its boolean is `true`, so a press
reported **`false`**: a mixed box cleared itself, the opposite of the page, of
the platform's tri-state convention, and of `CheckboxGroup`'s select-all rule
(`toggleGroupAll` selects every missing enabled value from `mixed`).

Measured on this host (2026-10-20, release-tag runtime, a temporary probe — the
`runtime-hygiene` rule keeps probes out of the suite):

```
<Checkbox indeterminate checked label="All channels" onValueChange={report} />
announced .......... "mixed"
click .............. [false]        ← a mixed box cleared itself
```

The shared controlled rule (`core/state.ts` `setValue`) reports only when the
**value** changes. That is why the fix is not "report `true` in every shape":
with `checked` already `true` the next boolean is `true`, so a press correctly
reports nothing. The supported parent shape keeps `checked` false while mixed,
so the press is a real change:

```tsx
<Checkbox
  checked={all}
  indeterminate={some && !all}
  onValueChange={setAll}
/>
```

The anti-pattern (`checked` true **and** `indeterminate` true) says "the value is
already all-selected" while painting mixed. The honest contract is: the press
asks for `true`, the value does not change, so nothing is reported and the paint
stays mixed until the caller drops `indeterminate`. The old behaviour — reporting
`false` — actively cleared it. That is the defect this plan closes, and the page
must say which shape is supported.

## 1. The rule

One pure rule in `core/selection.ts`:

```ts
/**
 * The boolean activation reports from the state the control paints.
 *
 * A checked box clears; an empty or mixed one fills. A mixed box turns **on**,
 * the platform convention and `CheckboxGroup`'s select-all rule, so a caller
 * that also passes `checked` cannot make the paint and the activation disagree
 * (plan `750`).
 */
export const nextChecked = (state: SelectionState): boolean =>
  state !== "checked";
```

`renderCheckbox` reads the **painted** state it already computes (`current`,
which applies the `indeterminate` override) for both the paint and the
activation. Nothing else changes:

- `unchecked` → asks for `true` (unchanged);
- `checked` → asks for `false` (unchanged);
- `indeterminate`, `checked` false → asks for `true` (unchanged; the shared rule
  reports it and the parent becomes checked);
- `indeterminate`, `checked` true → asks for `true`; the value is already
  `true`, so the shared rule reports nothing (was: reported `false`).

The `CheckboxGroup` parent row is unaffected: it renders through the group's own
`renderRow` with `onToggleAll`, not through `renderCheckbox`.

## 2. Files to change

### 2.1 `packages/primitives/src/core/selection.ts`

Add `nextChecked` in the state section, immediately after `SelectionState` and
its doc comment. TSDoc is required on exported values (`src/tsdoc.test.ts`).
The name is `nextChecked`, not `nextSelection`: `core/toggle-group.ts` already
owns a `nextSelection(type, current, value)` for the segmented control's
selection list, and one barrel cannot export two meanings of one name.

### 2.2 `packages/primitives/src/core/index.ts`

Add `nextChecked` to the existing `./selection.js` value export block
(alphabetical, beside `groupDisabled`/`initialActiveIndex`).

### 2.3 `packages/primitives/src/components/Checkbox.tsx`

- Import `nextChecked` from `../core/selection.js`.
- In `renderCheckbox`, replace the body of `toggle`:

```ts
const toggle = (): void => {
  if (props.disabled === true) return;
  onValueChange(nextChecked(current));
};
```

- Extend the `indeterminate` prop's doc comment: activation reads the painted
  state, so a press on a mixed box asks for `true` (plan `750`).

`current` is declared before `toggle`, so no reordering is needed.

### 2.4 `packages/primitives/docs/checkbox.mdx`

Replace the paragraph at the end of §States with the measured contract:

- activation reads **the state the box paints**: mixed asks for `true` (so it
  never clears itself), checked for `false`, empty for `true`;
- the reported boolean still follows the shared "only when it changed" rule;
- the supported parent shape `checked={all} indeterminate={some && !all}`;
- the anti-pattern (`checked` true with `indeterminate` true) reports nothing
  and keeps painting mixed until the caller drops `indeterminate`;
- name `CheckboxGroup`'s select-all as the same rule.

Keep the props-table row ("paints a dash and announces `mixed`; overrides
`checked`").

### 2.5 `COMPONENTS.md` — Checkboxes row

Append: **Mixed activation (750):** measured, `indeterminate checked` painted
`mixed` and a press reported `false`, clearing the box; activation now reads the
painted state through one `nextChecked` rule (mixed → `true`, the
`CheckboxGroup` select-all convention), the supported shape is
`checked={all}` + `indeterminate={some && !all}`, and the shared value rule still
reports only a real boolean change.

### 2.6 `TODO.md` and `.agents/slop/plans/README.md`

Add the task to the primitives section, ticked, and the plan row to the index
(Status column as in this file's header).

## 3. Test plan

Three layers, each able to fail on its own. Write the tests **first**, run them
against the old `toggle`, record the failure, then apply §2.3.

### 3.1 `packages/primitives/src/core/selection.test.ts` (unit)

New `describe("nextChecked")`:

1. `unchecked` → `true`.
2. `checked` → `false`.
3. `indeterminate` → `true`.

### 3.2 `packages/primitives/src/components/selection.test.tsx` (element tree)

In `describe("Checkbox")`, beside "toggles to the opposite of what it currently
shows":

```ts
it("checks from a mixed box that also carries checked", () => {
  const onValueChange = vi.fn();
  const element = renderCheckbox(
    { indeterminate: true, checked: true },
    testTheme,
    checked(true),
    idle,
    onValueChange,
  );
  expect(expectSome(hostProp(element, "aria-valuetext"))).toBe("mixed");
  expectSome(hostHandler(element, "onClick"))(keyEvent("space"));
  expect(onValueChange).toHaveBeenCalledWith(true);
});
```

This asserts the rule the component hands the state layer (the spy is `state.set`
in production), not the parent callback — §3.3 owns the controlled outcome.

### 3.3 `packages/primitives/runtime/controls.runtime.test.tsx` (real runtime)

A stateful parent (`TreeCheckbox`) with two options and one selected. Two cases
after "announces an indeterminate Checkbox as mixed":

1. **The supported shape** (`checked={all}`, `indeterminate={some}`): assert
   `mixed` before the press, the report is `[true]`, and the node announces
   `checked`.
2. **The anti-pattern** (`both` — `checked` and `indeterminate` true): assert
   `mixed` before the press, then `reports` is **empty** and the node still
   announces `mixed`. Against the old `toggle` the press reports `false` and the
   case fails with `[false]`; the point is that a mixed box no longer clears
   itself, and the value model has nothing to report.

No clock, focus or geometry interaction is involved, so no `awaitFrame` is
needed.

### 3.4 Commands and expected results

```sh
# both directions, tests written before the fix
nub run --filter @gpuixui/primitives test src/components/selection.test.tsx
# old: 1 failed — "expected true, received false"
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx
# old: 1 failed — the anti-pattern case reports [false]

# after §2.3 and the unit cases
nub run --filter @gpuixui/primitives test        # 71 files green
nub run --filter @gpuixui/primitives test:runtime runtime/controls.runtime.test.tsx
nub run --filter @gpuixui/primitives check-types
nub run check && nub run lint                    # repo gates
```

The full live suite is the merge gate, not this plan: only
`runtime/controls.runtime.test.tsx` changed.

## 4. STOP conditions

- The element or runtime case passes against the old `toggle` — the bug is not
  what §0 measured; stop and re-measure before changing anything.
- The supported-shape runtime case stops reporting `true` — the shared value
  rule changed; stop, that is not this plan.
- Any other control's activation changes (the `CheckboxGroup` parent, `Switch`,
  `Toggle`, `Rating`) — the rule belongs to `Checkbox` only; stop.
- A test needs the both-set shape to **report** `true` — the one-value-callback
  contract cannot express a paint change with no value change; stop and record
  it as a contract question instead of adding a second callback.

## 5. Acceptance

- `<Checkbox indeterminate checked>` paints/announces `mixed` and a press does
  not clear it (it asks for `true`; the shared rule reports nothing).
- The supported shape (`checked={all}` + `indeterminate={some && !all}`) reports
  `true`, selects every row and then announces `checked`.
- A checked box still clears; an empty box still checks.
- The three layers' tests fail against the old expression and pass after it.
- The page, the prop docstring and the inventory row state the measured rule
  and the supported parent shape.
- `nub run check`, `nub run lint` and the package suites pass.

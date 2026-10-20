# 797 — `Select` joins the field family's read-only state

**Phase:** C/F (Tier 1 completeness) · **Depends on:** `030`, `041`, `042`,
`047`, `057`, `062`, `066`, `345`, `346`, `372`, `501`, `609`, `635`, `731`,
`745`, `786`, `796`

## 1. The gap

D42 makes `Select`'s trigger one of the **field-shaped** surfaces (`Input`,
`TextArea`, `Select` trigger, `NumberField`, `OTPField` cells): one recipe, one
height, one type scale. Plan `786` then gave the field family a real
`readOnly` state — visible, focusable, unchanged, with every edit path refused —
and `Rating` followed in plan `796`.

`Select` is the one field-shaped control with no read-only state. A review or
summary form can render `<Input readOnly>` but its select must choose between:

- `disabled` — faded to 50 %, removed from the tab order, announced as a
  disabled control; the wrong state for "show this value, but it was set by an
  administrator"; or
- a bare `Text` — loses the field chrome, the combobox role, the name and the
  announced value.

This is a consistency gap introduced by `786`, not a new interaction model.
The runtime has **no `aria-readonly`** (host attributes: `aria-label`,
`aria-description`, `aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext`,
`aria-level`), so read-only cannot be announced as a state; the honest contract
is behavioural and visual, documented as such.

## 2. Contract

A `readOnly` select:

- keeps its tab stop, its focus ring, its role (`combobox`), its name, its
  `aria-description` and its `aria-valuetext`;
- never paints its list — pointer, `Enter`, `Space`, arrows, type-ahead and a
  controlled `open` are all refused;
- never reports `onValueChange`;
- paints normal field chrome (no 50 % opacity) with cursor `default`;
- hides the chevron, because a chevron promises a list that cannot open;
- reports `readOnly: true` to `SelectState` and `SelectTriggerState`;
- loses to `disabled`: `readOnly + disabled` is disabled (faded, no tab stop,
  `not-allowed`).

A controlled parent that owns `open` is asked to close once when the select
becomes read-only, the same rule plan `346` applies to `disabled`; it is never
asked to open.

## 3. Files to change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/select.ts` | `selectOpen(requestedOpen, disabled, readOnly = false)` also requires `!readOnly`; doc comment |
| `packages/primitives/src/core/select.test.ts` | one asserted read-only row in the `selectOpen` case |
| `packages/primitives/src/components/Select.tsx` | `readOnly` prop; `SelectState.readOnly`; `SelectTriggerState.readOnly`; `SelectTriggerSpec.readOnly`; `selectTriggerStyle` cursor; `selectTriggerPartStyle` resolved state; `open` gating; close effect; filtered `onOpenChange`; type-ahead guard; indicator hidden |
| `packages/primitives/src/components/Select.test.tsx` | read-only cursor and hidden chevron; add `readOnly` to the trigger-state literals |
| `packages/primitives/src/components/field-family.test.tsx` | add `readOnly` to the trigger-state literals |
| `packages/primitives/src/components/state-style.test.tsx` | assert `readOnly` in both Select state payloads |
| `packages/primitives/runtime/readonly.runtime.test.tsx` | one read-only `Select` case plus a writable twin; update the file header |
| `packages/primitives/docs/select.mdx` | API row, states, keyboard, accessibility, read-only limitation |
| `COMPONENTS.md` | Select row records the state and the proof |
| `TODO.md` | ticked primitives row |
| `.agents/slop/plans/README.md` | index this plan |

Nothing outside these paths. `examples/basic-app` is not touched: the component
already has an example, and the field state is proven in the package's own
runtime suite.

## 4. Exact implementation

### 4.1 `core/select.ts`

```ts
export const selectOpen = (
  requestedOpen: boolean,
  disabled: boolean,
  readOnly = false,
): boolean => requestedOpen && !disabled && !readOnly;
```

The optional third parameter keeps every existing two-argument call valid and
makes "closed" one rule for disabled, read-only and (in the wrapper) empty.

### 4.2 `Select.tsx`

- Import `fieldInert` from `Input.js`? **No** — `renderSelect` only needs the
  prop; `fieldInert` is `disabled || readOnly` and would blur the difference
  between "no tab stop" and "tab stop". Pass the two booleans separately.
- `SelectState` gains `readonly readOnly: boolean`.
- `SelectTriggerState` gains `readonly readOnly: boolean`.
- `SelectTriggerSpec` gains `readonly readOnly?: boolean`.
- `SelectProps` gains:

```ts
/**
 * Visible and focusable, but the list never opens and the value never
 * changes. The chevron is hidden and the cursor is `default`; `disabled`
 * also leaves the tab order and fades the field. 0.10.0 has no
 * `aria-readonly`, so the state is behavioural and visual (plan 797).
 */
readonly readOnly?: boolean;
```

- `selectTriggerStyle`: cursor

```ts
cursor: state.disabled
  ? "not-allowed"
  : spec.readOnly === true
    ? "default"
    : "pointer",
```

- `selectTriggerPartStyle`: resolved state includes
  `readOnly: spec.readOnly === true`.
- `renderSelectIndicator`: takes `readOnly?: boolean` and returns `null` when
  true; return type becomes `ReactElement | null`.
- `renderSelect`:
  - destructure `readOnly`;
  - `spec = { invalid, fullWidth, readOnly }`;
  - root `style` state includes `readOnly: readOnly === true`;
  - `<GpuixSelect disabled={disabled === true || readOnly === true}>` — the
    runtime refuses item selection and arrow moves;
  - `<SelectTrigger disabled={disabled === true}>` — **explicit**, because
    GPUix resolves `disabledProp ?? context.disabled`; passing `undefined`
    would inherit the read-only root's `disabled` and remove the tab stop;
  - indicator gets `readOnly`;
  - `aria-expanded={open}` stays (false for read-only, because the wrapper
    resolves `open`).
- Wrapper:
  - close effect condition adds `props.readOnly === true`, dependency adds it;
  - `open = selectOpen(openState.value.current, props.disabled === true,
    props.readOnly === true) && hasChoices`;
  - type-ahead returns when `props.readOnly === true` (after calling the
    caller's `onKeyDown`);
  - `onOpenChange`:

```ts
onOpenChange: (next) => {
  if (next && props.readOnly === true) return;
  openState.set(next);
},
```

  - `triggerChrome` spec includes `readOnly: props.readOnly === true` and its
    `useMemo` dependencies.

## 5. Commands, in order, with expected results

```sh
nub run --filter @gpuixui/primitives check-types
# expected: "Done", no diagnostics

nub run --filter @gpuixui/primitives test
# expected: all offline files/tests pass (73 files before this plan)

nub run --filter @gpuixui/primitives test:runtime runtime/readonly.runtime.test.tsx
# expected: the field read-only cases plus the new Select case, all passing

nub run check:tests
# expected: pass; every new case asserts something meaningful

nub run lint
# expected: pass

nubx oxfmt --check packages/primitives/src/core/select.ts \
  packages/primitives/src/core/select.test.ts \
  packages/primitives/src/components/Select.tsx \
  packages/primitives/src/components/Select.test.tsx \
  packages/primitives/src/components/field-family.test.tsx \
  packages/primitives/src/components/state-style.test.tsx \
  packages/primitives/runtime/readonly.runtime.test.tsx
# expected: no files would be reformatted (run `nub run fmt:fix` on these paths if not)
```

`nub run test` at the root is the end-of-task gate only if the change is
cross-cutting; it is not. The full live suite is a merge gate, not an iteration
command.

## 6. Test plan

A test must fail without the fix. The behaviours below are each asserted in the
layer that can actually observe them.

### Offline

1. `core/select.test.ts` — `selectOpen(true, false, true) === false`,
   `selectOpen(true, true, true) === false`, and the editable
   `selectOpen(true, false, false) === true`. Fails if the read-only term is
   dropped.
2. `Select.test.tsx` — `selectTriggerStyle({ readOnly: true })(rest)` paints
   `cursor: "default"` while the same spec with `disabled` paints
   `not-allowed`; a read-only `renderSelect` paints **one** trigger child (no
   chevron) while the editable one paints two. Fails if the cursor branch or
   the indicator gate is removed.
3. `state-style.test.tsx` — the root payload is
   `{ open, disabled, invalid, readOnly }` and the trigger payload is
   `{ open, disabled, placeholder, focused, readOnly }`. Fails if the state is
   not published.

### Native (`runtime/readonly.runtime.test.tsx`)

Mount a valued read-only select with a following `Button`:

- `focusNext()` lands on `sel-trigger` (the tab stop survives), then the next
  `focusNext()` lands on the button.
- `click("sel-trigger")`, `keyDown` `enter`, `space`, `down`, and a printable
  `e`: no `sel-content` element and no `ListBox` node, and `onValueChange`
  stays empty.
- the trigger still holds focus after every gesture.
- `sel-trigger`'s painted style has `cursor: "default"` and no `opacity`.
- the chevron element (`sel-chevron`) is absent.
- the combobox node still announces `Europe` through `aria-valuetext` and its
  label `Region`.
- a controlled `open` + `readOnly` asks the parent to close exactly once and
  paints no list.
- the **writable twin** re-rendered without `readOnly` opens on the same click
  and reports the chosen value — so a scene that never reached the trigger
  cannot pass by accident.

### Both-directions proof to record in the plan result

- Remove the read-only term from `selectOpen` → the core case and the runtime
  list-paint case fail by name.
- Remove the indicator gate → the element case fails on child count.
- Remove the type-ahead guard → the runtime value stays empty? No: the runtime
  case asserts `[]` after `e`; with the guard removed the value changes to the
  first matching option, failing the assertion.
- Remove the cursor branch → the element case fails on `cursor`.

## 7. STOP conditions

- **STOP** if `SelectTrigger` cannot stay tabbable while its root context is
  disabled (the deliberately explicit `disabled={false}` in §4.2). Fallback:
  do not disable the root; keep the gated `open`, the `onOpenChange` filter,
  the type-ahead guard and the runtime proof, and record the difference. Do
  not invent a second dropdown implementation.
- **STOP** if a controlled `open={true}` cannot be closed through
  `onOpenChange` (a loop or a permanently painted list). Record the measured
  sequence before changing the rule; do not make the wrapper ignore the
  parent.
- **STOP** if the only way to keep the value readable is to change the field
  recipe or the surface; read-only is a state, not a new visual style.
- **STOP** if `aria-readonly` is unavailable and a page would have to claim it.
  State the limitation instead.

## 8. Acceptance

- `nub run --filter @gpuixui/primitives check-types`, the offline suite, the
  scoped runtime file and `nub run check:tests` pass.
- The plan's two-direction mutations were run and are recorded in the plan
  result and the commit message.
- `docs/select.mdx` names the state, its refusals and the missing
  `aria-readonly`; `COMPONENTS.md` records the proof; `TODO.md` ticks the row.

## 9. Result (2026-10-20)

Landed. Measured on the pinned release-tag build:

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives check-types` | Done |
| `nub run --filter @gpuixui/primitives test` | 73 files / 1014 tests pass |
| `nub run --filter @gpuixui/primitives test:runtime runtime/readonly.runtime.test.tsx` | 9/9 pass (was 7; +2 Select cases) |
| `nub run --filter @gpuixui/primitives test:runtime runtime/examples.runtime.test.tsx` | 19/19 pass (the form example now mounts the read-only shape) |
| `nub run check:tests` | pass |
| `nub run lint` | pass |
| scoped `oxfmt --check` on every touched file | clean |

Both-direction mutations, each reverted after measuring:

- drop the `!readOnly` term in `selectOpen` → the core case fails
  (`expected true to be false`);
- drop the wrapper's `onOpenChange` read-only gate → the runtime case fails on
  `expected [ true, false ] to strictly equal []`;
- drop the type-ahead guard → the runtime case reports `["pear"]` after `p`;
- drop the indicator gate → the element case sees two trigger children instead
  of one;
- drop the cursor branch → the element case reports `"pointer"` instead of
  `"default"`.

The effect-enforcer flagged `ReactElement | null` and a `useEffect`: both are
React render/lifecycle boundaries (the same signatures the file already had),
not domain absence or shared state, so they are intentional.

One deliberate limit: the runtime passes the read-only case through three
independent gates (the core `selectOpen` term, the filtered `onOpenChange` and
the root `disabled`), so no single mutation can make the native list paint. That
is defence in depth for a wrapper over a headless control; each gate is
individually proven failing its own case above.

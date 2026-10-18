# 343 — `Select`'s trigger has no dropdown indicator

**Phase:** C/F (Tier 1 truth pass) · **Owner:** primitives · **Depends on:**
`030`, `040`, `041`, `047`, `057`, `062`, `083` · **Status:** done

## 1. The defect

`packages/primitives/src/components/Select.tsx` paints the trigger as the field
chrome and then asks for `justifyContent: "space-between"`:

```ts
// selectTriggerStyle
mergeStyle(
  mergeStyle(
    controlStyle(resolved, theme),
    active ? controlFocusStyle(resolved, theme) : undefined,
  ),
  { justifyContent: "space-between" },
);
```

`renderSelect`'s trigger, however, has **one** child:

```tsx
<SelectTrigger …>
  <SelectValue placeholder={placeholder} />
</SelectTrigger>
```

So `space-between` distributes one child and the rendered select has **no
chevron**. A user cannot tell a select from an `Input` until they press it: the
field is a bordered box with text and no "this opens a list" affordance. Every
reference makes that affordance standard — shadcn/ui's `SelectTrigger` renders
`ChevronDownIcon` as its trailing child, and GPUI Kit's select does the same.

This is not a documented limitation: `docs/select.mdx`'s Limitations section
lists type-ahead, measured width and the estimated height, but never says the
indicator is absent. The dead `space-between` is the remaining evidence that a
trailing child was intended.

### Evidence to record in the plan/report

Offline (element tree, no runtime needed):

```sh
nub run --filter @gpuixui/primitives test -- src/components/Select.test.tsx
```

The trigger's child list is `[SelectValue]` — one element.

Runtime (this host, locally built 0.10.0 binding):

```sh
nub run --filter @gpuixui/primitives test:runtime -- runtime/fields.runtime.test.tsx
```

A mounted `Select` has **no `svg` descendant** under its trigger. Record the
measurement in §5 of this plan and in `COMPONENTS.md` when the fix lands.

## 2. The fix

Render one **decorative** chevron as the trigger's trailing child:

- `chevron-down` at rest, `chevron-up` while the list is open (the runtime has
  no `transform`, so a rotation is not honest; swapping the geometry is);
- `theme.iconSize.sm` — the selection-box size, and the density-safe scale step;
- `theme.colors.mutedForeground` at rest, `theme.colors.placeholder` when the
  select is disabled (the `NumberField` stepper's rule);
- no `label` — it is decoration, not content, so it must stay out of the
  accessibility tree and must not rename the combobox;
- `testId={`${testId}-chevron`}` when `testId` is defined, the same derived-id
  pattern as `${testId}-trigger`, so a native test can find it;
- `Icon` already sets `pointerEvents: "none"`, so the chevron cannot swallow a
  click aimed at the trigger.

No new component, no new core module and no new dependency: the icon set
already exports both chevrons.

## 3. Files to change

1. **`packages/primitives/src/components/Select.tsx`**
   - import `Icon` from `@gpuixui/icons`;
   - add the chevron as the second `SelectTrigger` child;
   - extend the file docstring: the trigger carries a decorative indicator whose
     direction follows the open state.
2. **`packages/primitives/src/components/Select.test.tsx`**
   - element-tree cases (see §4).
3. **`packages/primitives/runtime/fields.runtime.test.tsx`**
   - one native case in the Select block (see §4).
4. **`packages/primitives/docs/select.mdx`**
   - say the trigger paints a decorative chevron that points up while open, and
     that it is not focusable and carries no name;
   - list the new element-tree and runtime cases under Verification.
5. **`COMPONENTS.md`**
   - Select row: add **Indicator (343)** with the measured before/after;
   - update the runtime count sentence to `383 tests in 23 files at plan 343`.
6. **`TODO.md`**
   - add a ticked primitives row for plan `343`; update the section header to
     `91/91`.
7. **`.agents/slop/plans/README.md`**
   - add the `343` row to the primitives table.

## 4. Test plan

The tests must fail without the change, in two independent directions.

**Element tree (`src/components/Select.test.tsx`)**

- `Select.test.tsx` already builds a select with `renderSelect(..., false, ...)`
  and reads the trigger with `childAt(element, 0)`. Add:
  - *paints a trailing chevron*: the trigger's children are `[SelectValue,
    Icon]`, and `elementProp(icon, "name")` is `"chevron-down"` (the icon
    package's own test maps a name to its `source`), `"size"` is
    `testTheme.iconSize.sm`, `"color"` is `testTheme.colors.mutedForeground`,
    and `testId` is `"sel-chevron"`.
  - *points up while the list is open*: render with `open = true`; the same
    child's `name` is `chevron-up`.
  - *is decoration, not content*: `elementProp(icon, "label")` is absent and the
    trigger's `aria-label` is still the caller's `label` (`"Fruit"`).
  - *is muted when disabled*: render `disabled`; `color` is
    `testTheme.colors.placeholder`.
- Failure direction A: remove the icon → the first case fails because the child
  list has one element.
- Failure direction B: keep `chevron-down` when open → the second case fails by
  the source it names.

**Native (`runtime/fields.runtime.test.tsx`)**

- Mount `<Select testId="sel" label="Fruit" options={selectProps.options} />`;
  assert:
  - `runtime.element("sel-chevron")` is `Some` and its `type` is `"svg"`
    (the harness's `bounds` walks to a painted ancestor, so use `element`, not
    `bounds`, to prove the node exists);
  - the accessibility dump has **no** `Image` node for it and the `ComboBox`
    node's name is still `"Fruit"` — the icon did not become content;
  - a hit-tested click on the trigger still opens the list (the icon is
    `pointerEvents: "none"` and sits inside the trigger). If the existing
    "opens a Select's list" case covers the open path, reuse its flow rather
    than adding a second click case; the new assertions belong beside it.
- Failure direction: remove `pointerEvents: "none"` from `Icon` (temporarily) and
  the hit-tested click must still open the list — if it does not, the chevron
  is the click target and the test fails. Revert after measuring.
- Both-direction proof: run the suite with the icon removed (both offline cases
  and the native presence case fail), then with the fix (all green). Record the
  exact failing names in §5.

**Commands**

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives check-types
nub run check
nub run lint
```

Expected: offline 555 → 557 tests, runtime 382 → 383, `check`/`lint` green.

## 5. STOP conditions

Stop and report rather than improvise if any of these happen:

- adding the icon changes the `ComboBox` node's name, role or value, or creates
  an `Image` node — the icon must be `role="presentation"` and unnamed;
- a hit-tested click on the trigger no longer opens the list;
- the list's width, side or height measurements change (the trigger measured
  width may legitimately change when it hugs content; if it does, re-run
  `fields.runtime` and record the new measured values — but a *list* mismatch is
  a stop condition);
- the docs/export coverage guard (`src/exports.test.ts`) or the contract guard
  (`src/contract.test.ts`) fails;
- more than the expected four offline and one runtime test change;
- the icon cannot resolve from `@gpuixui/icons` (it must: `chevron-down` and
  `chevron-up` are both in `src/names.ts`).

## 6. Acceptance

- A mounted `Select` paints a decorative chevron inside its trigger; it points
  down at rest and up while the list is open.
- The chevron is absent from the accessibility tree, carries no name, and cannot
  take a click meant for the trigger.
- Element-tree and native tests cover both open states, the disabled colour and
  the decorative role, and both fail in the named directions without the fix.
- `docs/select.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index record the
  change and the measured test counts.
- `nub run check`, `nub run lint` and the runtime suite are green.

## 7. Result (2026-10-18)

Landed on `agent/primitives`.

- **Before:** `renderSelect`'s trigger child list was `[SelectValue]`; a mounted
  select had no `svg` descendant. The `space-between` in `selectTriggerStyle`
  distributed one child.
- **After:** the trigger renders `[SelectValue, Icon]`. `selectIndicator` is a
  small named export so the paint (name, source, size, colour) is testable
  without duplicating the rules; the component uses it for the trigger.
- Offline: **557 tests** (41 files), runtime: **383 tests** (23 files).
- Native: the indicator exists as an `svg` (`sel-chevron`), the `ComboBox` is
  still named `Fruit`, there is no `Image` node, and a hit-tested click on the
  trigger opens the list.
- Both directions measured: removing the indicator fails the element-tree
  presence case and the runtime presence case by name; keeping
  `chevron-down` while open fails the open-state case by `name`
  (`expected 'chevron-down' to be 'chevron-up'`).

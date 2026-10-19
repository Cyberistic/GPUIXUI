# 620 — A registry row keeps its place when its state changes (Accordion, List)

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `111`, `113`, `117`, `200`, `201`, `510`, `564` |
| Status | planned |
| Blocker | none — the assertions read focus order and authored style; no bounds and no focus-event assertion, so the plan-540 binding defects stay out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`Tabs` fixed this class of bug in plan 564: a row that changes state must be
**updated in place**, never unregistered and re-appended, because the registry's
order is the declaration order that the arrow keys, `Home`/`End`, type-ahead and
the divider rule all read. Two other registries still re-register on a state
change:

- `AccordionTrigger`'s layout effect depends on `[disabled, instance,
  registerTrigger, value]`; toggling a section's `disabled` runs the cleanup
  (which filters the value out) and then appends the row at the end.
- `ListItem`'s layout effect depends on `[disabled, instance, register,
  textValue, value]`; changing a row's `disabled` or its `textValue` does the
  same.

Measured in the real renderer on 2026-10-19 (probe, `TestRenderer`, three rows
with the middle one disabled and then enabled):

- **Accordion, keyboard:** focus the first header and press `ArrowDown`; the
  registry order is `[first, third, second]`, so focus lands on `trigger-c`
  instead of the authored neighbour `trigger-b`.
- **Accordion, divider:** the middle section (re-appended last) is treated as the
  last section, so it draws **no** bottom border while the real last section
  draws one. Authored `borderBottomWidth` after the round trip:
  `{ a: 1, b: undefined, c: 1 }`; the documented rule is "the last section draws
  none", so the expected reading is `{ a: 1, b: 1, c: undefined }`.
- **List, keyboard:** focus the first row and press `ArrowDown`; focus lands on
  `row-c` instead of the authored neighbour `row-b`. Type-ahead order and the
  `Shift` range order are wrong in the same way, and a changed `textValue`
  reorders a row that never moved.

Scope:

- Accordion gains an in-place `updateTrigger`; registration owns position only.
- List gains an in-place `updateRow` through its stable actions context; the
  row's registration owns position only.
- A `disabled` toggle and a `textValue` change update the row at its index.
- Native tests for both defects, docs/`COMPONENTS.md`/inventory counts synced.

**Out of scope** (do not add): changing a row's `value` (that is an identity
change and still re-registers), virtualising either component, a shared
"registry hook" abstraction (the two registries differ: one is keyed by
`value` with a `ValueItem`, the other carries row masks and a stable actions
context), or touching `Tabs` (already fixed in plan 564).

## 2. What exists today (read these first)

- `packages/components/src/accordion.tsx`:
  - `AccordionContextValue` has `registerTrigger(row: ValueItem) => () => void`
    and no update path;
  - `AccordionFrame` owns `rows`, with
    `registerTrigger = (row) => setRows((current) => upsertValue(current, row))`
    returning a cleanup that filters by `value`;
  - `lastValue = Option.map(Arr.last(rows), row => row.value)` decides which
    section omits the divider;
  - `AccordionTrigger`'s registration effect is
    `[disabled, instance, registerTrigger, value]`.
- `packages/components/src/list.tsx`:
  - `Row = { value, disabled, nativeId, label }`;
  - `ListContextValue` has `register(row) => () => void`; the stable action
    wrappers live in `ListActions` (`activate`, `noteFocus`, `register`) behind a
    `handlers` ref so a row does not repaint when list state changes;
  - the root's `register` upserts by value and returns a cleanup that filters by
    value;
  - `ListItem`'s registration effect is
    `[disabled, instance, register, textValue, value]`.
- `packages/components/src/internal/collection.ts` — `upsertValue` replaces a row
  with the same value at its index. This is already correct; **do not** rewrite
  it to filter-and-append.
- `packages/components/src/tabs.tsx` — the shipped pattern to copy: a
  registration effect that depends on `[instance, register, value]` and an update
  effect that depends on the mutable fields plus `updateRow`.
- `packages/components/src/behaviour/accordion.test.tsx` — 23 cases. The fixture
  helper `section(value, label, disabled)` builds an item; `focusedTestId` reads
  the renderer's focused host; `clickCentreOf` presses a control.
- `packages/components/src/behaviour/list.test.tsx` — 60 cases; `focusedTestId`
  and `clickCentreOf` are already imported.
- `packages/components/docs/accordion.mdx` (canonical `(23 tests)` line) and
  `docs/list.mdx` (`(60 tests)` line); the matching `COMPONENTS.md` rows.
- `src/inventory.test.ts` holds both stated counts to the suites, so the docs,
  `COMPONENTS.md` and the tests must land in one commit.

Baseline on this host, 2026-10-19: unit `454 passed`; behaviour `785 passed /
35 failed of 820` where every failure is a recorded plan-540 binding defect. Do
not attribute those failures to this change.

## 3. Design

### 3.1 Accordion: registration owns position, update owns state

In `AccordionContextValue` add:

```ts
/** Replace a registered header in place; never moves it. */
readonly updateTrigger: (row: ValueItem) => void;
```

In `AccordionFrame`:

```ts
const updateTrigger = useCallback((row: ValueItem) => {
  setRows((current) => upsertValue(current, row));
}, []);
```

Add `updateTrigger` to the context object and its memo dependencies.

In `AccordionTrigger`, split the one effect into two:

```ts
useLayoutEffect(() => {
  // Position: mount and a changed value only.
  if (instance === undefined) return;
  return registerTrigger({ id: instance.id, value, disabled });
}, [instance, registerTrigger, value]);

useLayoutEffect(() => {
  // State: a disabled toggle must not unregister and re-append the row.
  if (instance === undefined) return;
  updateTrigger({ id: instance.id, value, disabled });
}, [disabled, instance, updateTrigger, value]);
```

The registration effect runs first on mount and the update effect then fills in
the same row in place (`upsertValue` replaces at the index). A `value` change
still re-registers, which is an identity change and out of scope.

### 3.2 List: the actions context carries `updateRow`

Add to `ListContextValue`:

```ts
/** Replace a registered row in place; never moves it. */
readonly updateRow: (row: Row) => void;
```

Include `"updateRow"` in `ListActions`. In `List`, factor the in-place write out
of `register`:

```ts
const updateRow = useCallback(
  (row: Row) => setRows((current) => upsert(current, row)),
  [setRows],
);
const register = useCallback(
  (row: Row) => {
    updateRow(row);
    return () =>
      setRows((current) =>
        Arr.filter(current, (candidate) => candidate.value !== row.value),
      );
  },
  [setRows, updateRow],
);
```

Add `updateRow` to the `handlers` ref value, its layout-effect update, the
`actions` memo (which stays dependency-free and delegates through the ref), and
therefore the stable context.

In `ListItem`, destructure `updateRow` and split the effect the same way:

```ts
useLayoutEffect(() => {
  if (instance === undefined) return;
  return register({ value, disabled, nativeId: instance.id, label: textValue ?? "" });
}, [instance, register, value]);

useLayoutEffect(() => {
  if (instance === undefined) return;
  updateRow({ value, disabled, nativeId: instance.id, label: textValue ?? "" });
}, [disabled, instance, textValue, updateRow, value]);
```

`upsert` already returns the same array when nothing changed, so the extra
effect costs no repaint on mount. Keep the row-mask store and the
one-registration-per-row rule untouched.

### 3.3 Boundaries

- Touch only `packages/components/**`, `COMPONENTS.md`, `TODO.md`, `PLAN.md`
  (the numbering note) and `.agents/slop/plans/README.md`.
- No new dependency, no `any`, no `throw`, no `console.*`.
- Do not change `internal/collection.ts`, `accordion/logic.ts`, `list/selection.ts`
  or `Tabs`.

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/accordion.tsx` | context `updateTrigger`; frame callback; split trigger effects |
| `packages/components/src/list.tsx` | context/actions `updateRow`; `register` reuses it; split item effects |
| `packages/components/src/behaviour/accordion.test.tsx` | 2 native cases and the guarded-bug header |
| `packages/components/src/behaviour/list.test.tsx` | 1 native case and the guarded-bug header |
| `packages/components/docs/accordion.mdx` | divider/registry rule; verification count 23 → 25 |
| `packages/components/docs/list.mdx` | in-place registry rule; verification count 60 → 61 |
| `COMPONENTS.md` | Accordion and Lists rows: in-place rule and counts |
| `TODO.md` | add and tick the hardening row |
| `PLAN.md` | append plan 620 to the D30 numbering sentence |
| `.agents/slop/plans/README.md` | index this plan with the measured counts |

## 5. Test plan

Every test must be able to fail. Extend each suite's header comment with the
bug it guards.

### 5.1 Native (`src/behaviour/accordion.test.tsx`, real `TestRenderer`)

Add a stateful fixture (local to the test) that renders three sections and a
button that toggles the middle section's `disabled`:

```tsx
const ToggleMiddle = () => {
  const [disabled, setDisabled] = useState(true);
  return (
    <div testId="root">
      <div role="button" tabIndex={0} testId="toggle"
           onClick={() => setDisabled((value) => !value)}>
        toggle
      </div>
      <Accordion type="multiple">
        {section("a", "A")}
        {section("b", "B", disabled)}
        {section("c", "C")}
      </Accordion>
    </div>
  );
};
```

1. **A re-enabled header keeps its place in the keyboard order** — render,
   press `toggle`, focus `trigger-a`, `simulateKeystrokes("down")`; expect
   `focusedTestId(root)` to equal `Option.some("trigger-b")`. Measured at `HEAD`:
   `trigger-c`. This is the primary regression.
2. **The divider stays on the last section after the round trip** — same fixture
   after `toggle`; read the authored style of `item-a`, `item-b`, `item-c`;
   expect `borderBottomWidth` to be `1`, `1`, `undefined` respectively. Measured
   at `HEAD`: `1`, `undefined`, `1`. If the binding reports the style key
   differently, read the rendered `style` object once and record the key in the
   test; do not switch to a bounds assertion.

No focus-event delivery is needed: `renderer.focusElement` sets native focus and
`simulateKeystrokes` dispatches to it, exactly like the existing arrow cases.

### 5.2 Native (`src/behaviour/list.test.tsx`)

Add a stateful fixture with three rows and a button toggling the middle row's
`disabled` (`selectionMode="single"`, `textValue` on every row).

3. **A re-enabled row keeps its place in the keyboard order** — render, press
   the toggle, focus `row-a`, `simulateKeystrokes("down")`; expect
   `focusedTestId(root)` to equal `Option.some("row-b")`. Measured at `HEAD`:
   `row-c`.

### 5.3 Both directions (AGENTS §3)

1. Before implementing, run the new cases at `HEAD` and record the failures
   (measured in the reconnaissance probe: `trigger-c`, borders `1/undefined/1`,
   `row-c`).
2. Implement §3.1/§3.2 and rerun: all three new cases pass.
3. Revert only the Accordion split (registration effect back to depending on
   `disabled`, no update effect) and confirm cases 1 and 2 fail while case 3
   still passes. Then restore.
4. Revert only the List split and confirm case 3 fails while cases 1–2 still
   pass. Then restore.

Record the measured counts in the commit message.

Measured 2026-10-19: with both source files stashed, the three new cases fail
(`trigger-c`, `1/undefined/1`, `row-c`) and the two files report 7 failed; with
the implementation they pass and the same four pre-existing plan-540 focus cases
remain (4 failed of 86).

### 5.4 Regression

- the existing accordion and list cases keep their current verdicts (record the
  per-file pass/fail counts; the suite still carries the plan-540 binding
  failures);
- the all-example native contract still passes (no example changes);
- `nub run --filter @gpuixui/components test` passes 454 unit tests (the
  inventory check parses the new docs counts);
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. Commands and expected results

Run from `workspaces/components/packages/components`:

```sh
nub run test:behaviour -- -t "keeps its place"
# 2 passed (accordion + list); at HEAD both fail with the wrong neighbour
nub run test:behaviour -- -t "divider stays on the last section"
# 1 passed; at HEAD it fails with 1/undefined/1
nub run test:behaviour -- src/behaviour/accordion.test.tsx
# 25 passed (plus the file's recorded plan-540 failures, if any)
nub run test:behaviour -- src/behaviour/list.test.tsx
# 61 passed (plus the file's recorded plan-540 failures, if any)
cd ../..
nub run --filter @gpuixui/components test
# 454 passed
nub run --filter @gpuixui/components check-types
# exit 0
nub run check
nub run lint
nub run test
```

`nub run test:behaviour` runs every behaviour file, so `-t` is a name filter,
not an include. Use the package's vitest through `nub`; a bare `node`/vitest
fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.

## 7. Docs, inventory and TODO

- `docs/accordion.mdx` → Theming: state that the divider follows **authored**
  section order, and a section that turns disabled/enabled keeps its place.
  `## Verification`: `(25 tests)` and name the two new cases.
- `docs/list.mdx` → verification prose and `(61 tests)`; add one line to the
  keyboard/rows section: a row that changes `disabled` or `textValue` keeps its
  authored position, so arrows, `Home`/`End`, range order and type-ahead order
  never drift.
- `COMPONENTS.md`:
  - Accordions row: "23 native behaviour tests" → "25 native behaviour tests";
    add that a disable/enable round trip keeps the authored position and the
    divider stays on the last section.
  - Lists row: "60 native behaviour tests" → "61 native behaviour tests"; add the
    same in-place rule for `disabled`/`textValue`.
- `src/inventory.ts` limitations: no change is required unless a limitation
  currently claims otherwise; do not invent one.
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick:
  `A registered row keeps its place when it changes state — plan 620; ...`.
- `.agents/slop/plans/README.md`: index `620` after `619` with the measured
  status.
- `PLAN.md` D30: append `; plan 620 (registry rows keep their place) takes 620`
  to the overflow-numbering sentence, having checked every worktree.

## 8. STOP conditions

Stop and report instead of improvising when:

- the new cases do **not** fail at `HEAD` — the probe measured
  `trigger-c`/`row-c` and `1/undefined/1`; a different result means the host or
  binding changed, so record it before touching source;
- an existing accordion or list case fails for a reason other than the recorded
  plan-540 binding defects — list the case and stop;
- the divider cannot be read from `findByTestId("item-b")?.style` — record the
  actual style object; do not turn the assertion into a screenshot or a guess;
- the in-place update does not remove a row on unmount (a stale row appears in
  the registry) — the registration cleanup is the only removal path; fix that,
  do not add a second one;
- the inventory count check fails — fix the stated counts, not the check.

## 9. Acceptance

- A middle accordion section that is disabled and re-enabled is the arrow
  neighbour it was authored as, and the last authored section is the only one
  without a divider.
- A middle list row that is disabled and re-enabled is the arrow neighbour it was
  authored as; a `textValue` change updates the row in place.
- One Accordion keyboard case, one Accordion divider case and one List keyboard
  case pass; each fails on the pre-fix source (both directions recorded).
- Docs, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the plan index agree with the
  measured counts: Accordion 25, List 61, unit 454.

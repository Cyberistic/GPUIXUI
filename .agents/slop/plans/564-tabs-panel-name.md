# 564 — Tabs: the panel is named by its trigger, not its value

| Field | Value |
| ----- | ----- |
| Phase | C/F (Tier 2 hardening) |
| Owner | components workstream (`packages/components`) |
| Depends on | `110`, `113`, `117`, `200`, `201`, `391`, `516` |
| Status | planned |
| Blocker | none — assertions read the accessibility dump by role; no bounds or focus-event assertion, so the plan-540 binding defects stay out of scope |

This plan is self-contained. A weaker executor must be able to run it without
reading any other file first.

---

## 1. Why

`TabsContent` currently hard-codes `aria-label={value}`:

```tsx
<div role="tabpanel" aria-label={value} {...rest}>
```

Measured in the real renderer on 2026-10-19 (probe, `TestRenderer` +
`internal/a11y.ts`): a tab set with `<TabsTrigger value="profile">Profile</TabsTrigger>`
reports two tab nodes named `Profile` and `Billing`, but the visible panel is a
`tabpanel` named **`profile`** — the internal value, not the user-visible label.
That is the wrong name for the only region the tab set reveals:

- it can be an opaque id (`"tab-3"`, `"account.settings"`), which a screen-reader
  user cannot map to the tab they pressed;
- it disagrees with the trigger's name for no useful reason (the label is
  already derived by `controlName`, plan 391);
- 0.10.0 has no `aria-labelledby`, so naming the region from the trigger's text
  is the strongest supported alternative to the missing relationship.

`TabsContent` already lets a caller pass `aria-label` through its host props, so
the fix must preserve that precedence: **the trigger's name is the default, the
caller's `aria-label` still wins, and `value` is the fallback when the trigger
has no plain-text name** (an icon/composed trigger, or a controlled `value` whose
trigger was removed — the existing documented limitation).

Scope of this plan:

- `TabRow` carries the trigger's `controlName`;
- `TabsContent` names itself from the matching trigger's name, falling back to
  `value`;
- an explicit `aria-label` on `TabsContent` still wins;
- a trigger whose plain text changes updates the panel name **without moving the
  trigger's position in the registry** (a rename must not re-register);
- native tests, docs, `COMPONENTS.md` and the inventory counts are synced.

**Out of scope** (do not add): `aria-labelledby`/`aria-controls` (absent from
0.10.0), naming the trigger from a composed/icon child (the caller passes
`aria-label`), a second name prop on `TabsContent` if `aria-label` already
expresses it, or changing the controlled-value panel behaviour.

## 2. What exists today (read these first)

- `packages/components/src/tabs.tsx`:
  - `interface TabRow { value, id, disabled }`; `upsert` replaces a row with the
    same value and keeps declaration order;
  - the root's `register(row)` appends a new row and returns a cleanup that
    filters the value out;
  - `TabsTrigger` computes `const name = controlName(rest["aria-label"], children)`
    and registers `{ value, id, disabled }` in a layout effect whose deps are
    `[disabled, instance, register, value]`;
  - `TabsContent` reads `selected` from the context, returns `null` when it does
    not match, and renders `aria-label={value}` before `{...rest}`;
  - `tabsMeta.limitations` says "the panel is named by its value".
- `packages/components/src/behaviour/tabs.test.tsx` — 23 native cases. Baseline
  on this host: **5 pre-existing plan-540 failures** (focus/blur events are not
  delivered for a native focus change); new cases in this plan must not assert
  focus. The fixture `Settings` has three panels, `dynamicTabs` is the
  data-driven fixture.
- `packages/components/docs/tabs.mdx` — the Accessibility section states "The
  panel is named by its value (`aria-label={value}`)" and the canonical
  `## Verification` line says `(23 tests)`.
- `COMPONENTS.md` → Tier 2 → Tabs says "23 native behaviour tests … the panel is
  named by its value".
- `internal/a11y.ts` — `nodesWithRole(renderer, "tabpanel")` returns
  `{ role, name, … }`; it flushes a paint first.

## 3. Design

### 3.1 The row remembers its trigger's name (`tabs.tsx`)

```ts
interface TabRow {
  readonly value: string;
  readonly id: number;
  readonly disabled: boolean;
  /** The trigger's accessible name, when it has plain-text children. */
  readonly name: string | undefined;
}
```

`upsert` compares `name` too, so a changed label replaces the row in place:

```ts
current.disabled === row.disabled &&
current.nativeId === row.nativeId &&
current.name === row.name
```

Keep `Arr.map` (position-preserving) as it is. Do **not** rewrite `upsert` to
filter and append.

### 3.2 A name change is a rename, never a re-registration

A registration effect that depends on `name` would unregister (which filters the
row out) then append it at the end, changing tab order when a label is edited.
Instead:

- context gains `rename: (value: string, name: string | undefined) => void`;
- the root implements it with `setRows`, returning the same array when the row is
  absent or the name is unchanged:

```ts
const rename = useCallback((value: string, name: string | undefined) => {
  setRows((current) =>
    Arr.map(current, (row) =>
      row.value === value && row.name !== name ? { ...row, name } : row,
    ),
  );
}, []);
```

  (`Arr.map` returns the same array only if no row changed — return `current`
  explicitly when no edit is needed, the package's upsert convention.)
- `TabsTrigger` keeps its existing registration effect deps and adds a second
  layout effect after it:

```ts
useLayoutEffect(() => {
  if (instance === undefined) return;
  rename(value, name);
}, [instance, name, rename, value]);
```

  Registration runs first in the same commit, so the row exists when the rename
  runs. When the row is absent (the effect order ever changes), `rename` is a
  no-op; the panel then falls back to `value` rather than inventing a row.
- include `rename` in the context memo dependencies.

### 3.3 The panel resolves its name (`TabsContent`)

```ts
const panelName = Option.getOrElse(
  pipe(
    Arr.findFirst(rows, (row) => row.value === value),
    Option.flatMap((row) => Option.fromNullishOr(row.name)),
  ),
  () => value,
);
```

Render:

```tsx
<div role="tabpanel" {...rest} aria-label={panelName} style={…}>
```

`panelName` already prefers `rest["aria-label"]`? No — read the caller's value
first, because the caller's prop is the override:

```ts
const callerName = Option.fromNullishOr(rest["aria-label"]);
const panelName = Option.getOrElse(
  Option.firstSomeOf([
    callerName,
    Option.flatMap(
      Arr.findFirst(rows, (row) => row.value === value),
      (row) => Option.fromNullishOr(row.name),
    ),
  ]),
  () => value,
);
```

Place `aria-label={panelName}` **after** `{...rest}` so the resolved value is the
one that paints; the caller's string is already inside `panelName`, and an
explicit `aria-label` cannot be dropped by spread order. Keep `role` and
`aria-label` on the authored side of the JSX so a caller cannot remove them.
`style` stays merged last as every part does.

Do not use `Option.getOrThrow`; the fallback is `value` by design.

### 3.4 Boundaries and permissions

- Touch only `packages/components/**`, `COMPONENTS.md`, `TODO.md` and
  `.agents/slop/plans/README.md`.
- No new dependency, no `any`, no `throw`, no `console.*`.
- Do not change `tabs/logic.ts` (it decides activation, not naming).

## 4. Files to change

| File | Change |
| ---- | ------ |
| `packages/components/src/tabs.tsx` | `TabRow.name`; `upsert` compares it; context `rename`; trigger's rename effect; `TabsContent` name resolution; `tabsMeta.limitations` |
| `packages/components/src/behaviour/tabs.test.tsx` | four new native cases (§5.1) and the guarded-bug header |
| `packages/components/docs/tabs.mdx` | accessibility bullet, API note, verification count |
| `packages/components/examples/tabs.example.tsx` | no change expected — every trigger is plain text, so the example now demonstrates panel naming automatically; the all-example contract must still pass |
| `COMPONENTS.md` | the Tabs row: panel naming, count 23 → 27 |
| `TODO.md` | add and tick the Phase C hardening row (§7) |
| `.agents/slop/plans/README.md` | index this plan as done with its measured counts |

## 5. Test plan

Every test must be able to fail. Extend the suite's header comment with the
guarded bug: the panel was named by the internal value instead of the visible
tab.

### 5.1 Native (`src/behaviour/tabs.test.tsx`, real `TestRenderer`)

Import `nodesWithRole` from `../internal/a11y.js` and `Arr` is already imported.
No bounds and no focus assertion.

1. **The panel is named by its trigger** — render the existing `Settings`
   fixture and assert exactly one `tabpanel` node whose `name` is `"Profile"`.
   Fails today with `"profile"`.
2. **A caller `aria-label` wins** — an inline tab set whose visible
   `TabsContent` carries `aria-label="Account profile"`; assert the panel name is
   `"Account profile"`, not `"Profile"`. This pins the precedence and passes on
   both old and new code.
3. **A composed trigger falls back to the value** — a trigger whose children are
   an element (`<div><text>Profile</text></div>`) has no plain-text name
   (`controlName` skips elements) and no `aria-label`; assert the panel name is
   `"profile"`. This proves the fallback and fails if a half-empty name is used.
4. **A changed label renames the panel without reordering the tabs** — a fixture
   `NamedTabs({ label })` with two plain triggers; render with `label="Profile"`,
   expect `"Profile"`, rerender with `label="Account"`, expect `"Account"` and
   the two `tab` names still in declaration order (`["Account", "Billing"]`).
   This guards the rename path against the unregister/append reorder described
   in §3.2.

Expected: the suite grows from 23 to 27 cases; the five pre-existing plan-540
focus failures remain. Run the new cases by name so the verdict is unambiguous:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx -t "panel"
# 4 passed
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx
# 22 passed, 5 failed (the pre-existing plan-540 focus cases)
```

If the fifth pre-existing failure count changes, stop and report; do not "fix" a
focus case in this plan.

### 5.2 Both directions (AGENTS §3)

1. Restore `TabsContent`'s `aria-label={value}` (remove the name lookup) and
   confirm case 1 fails with `"profile"` and case 4 fails at its first
   assertion. Case 3 passes (the fallback is the old behaviour) and case 2
   passes (the caller's prop wins), which is the intended pin.
2. Remove only the `rename` effect and confirm case 4 fails on the rerender
   (`"Profile"` stays) while case 1 still passes. This proves the rename path,
   not just the initial registration.
3. Remove `name` from the registration object and confirm case 1 fails with
   `"profile"` (no row ever carries a name).

Record the measured case counts in the commit message.

### 5.3 Regression

- the 18 passing tabs cases still pass unchanged;
- the all-example native contract still passes with the unchanged example;
- `nub run --filter @gpuixui/components test` (unit + inventory) passes after the
  docs and `COMPONENTS.md` counts are updated to 27;
- `nub run check`, `nub run lint`, `nub run test` pass.

## 6. Commands and expected results

Run from `workspaces/components`:

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx -t "panel"
# 4 passed
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/tabs.test.tsx
# 22 passed, 5 failed — all five are the documented plan-540 focus cases
cd ../..
nub run --filter @gpuixui/components test
# 421+ passed, 0 failed
nub run --filter @gpuixui/components check-types
# exit 0
nub run check
nub run lint
nub run test
```

The package `test` suite includes `src/inventory.test.ts`, which compares the
stated native-test count in `COMPONENTS.md` and `docs/tabs.mdx` with the suite.
Update both counts in the same commit as the tests.

## 7. Docs, inventory and TODO

- `docs/tabs.mdx`:
  - Accessibility: replace "The panel is named by its value
    (`aria-label={value}`)" with: a panel is named by its trigger's plain-text
    label (derived with the same rule as the trigger, plan 391); an explicit
    `aria-label` on `TabsContent` wins; a composed/unnamed trigger and a
    controlled value with no live trigger fall back to the value. Keep the
    missing `aria-labelledby`/`aria-controls` fact.
  - API table: `TabsContent` row gains "`aria-label` overrides the trigger's
    name".
  - `## Verification` line: `(27 tests)`, and name the four new cases in prose.
- `COMPONENTS.md` Tabs row: state the panel-name rule and change
  `23 native behaviour tests` to `27 native behaviour tests`; keep the
  controlled-removed-tab limitation.
- `src/inventory.ts` `tabsMeta.limitations`: replace "the panel is named by its
  value" with the new rule and keep the positional-relationship fact.
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick
  `Tabs panels are named by their trigger — plan 564; 4 native cases
  (Tabs 27, behaviour 742), three mutation proofs; docs, COMPONENTS.md and the
  inventory synced`.
- Plan index: add 564 after 562 with status
  `done — 4 native cases (Tabs 27, behaviour 742), both-direction proof; docs,
  COMPONENTS.md and the inventory synced` (use the measured total; the suite
  still carries the plan-540 binding failures, so never claim a green full
  behaviour run).

## 8. STOP conditions

Stop and report instead of improvising when:

- the accessibility dump does not report the `tabpanel` name (it reports
  `"profile"` today, so a changed name should appear; if a different binding
  drops it, record the measurement — do not assert on `customProps` alone and
  call it announced);
- the rename path reorders the triggers (case 4's order assertion fails) — that
  means the implementation re-registered instead of renaming; fix §3.2, do not
  relax the assertion;
- `controlName`/`plainText` gives an unexpected name for the composed trigger
  (case 3) — do not add a second naming rule; record the outcome;
- an existing tabs case fails for a reason other than the five known plan-540
  focus cases — list the failing case and stop;
- the inventory count check fails — fix the stated counts, not the check.

## 9. Acceptance

- A panel is announced by its trigger's plain-text label (`Profile`), not the
  internal value (`profile`).
- A caller's `aria-label` on `TabsContent` wins; a composed trigger or a removed
  controlled tab falls back to the value.
- Editing a trigger's label renames its panel and leaves the tab order intact.
- Four new native cases pass; the 18 existing non-focus cases still pass; the
  unit, inventory and type gates pass.
- `docs/tabs.mdx`, `COMPONENTS.md`, `TODO.md` and the plan index agree with the
  measured counts.

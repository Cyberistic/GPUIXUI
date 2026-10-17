# 306 — Fieldset: a named group of fields

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 composition) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200`, `201`, `115` (Field), `205` §3 (B1) |
| Status | done — 7 native Fieldset tests + 1 Field regression; both-direction proof measured |
| Source | `docs/component-api.md` §8 (planned parts: `Fieldset`, `FieldsetLegend`); `COMPONENTS.md` → Tier 2 → Fieldset; plan `205` B1 |

This plan is self-contained. It adds `Fieldset` to `packages/components` to the
same bar as every landed Tier 2 component: code, a native behaviour test that can
fail, a docs page, an example and an inventory row.

---

## 1. Why

`Field` groups one label, control and message. Nothing groups several related
fields under one visible heading, and nothing lets a consumer disable a whole
group the way an HTML `<fieldset disabled>` does. `COMPONENTS.md` lists Fieldset
as `todo`; plan `205` §3 makes it B1 — the first item in Group B (form
primitives) and the dependency for `Form` (B3) and `Stepper` (B5).

GPUix 0.10.0 has **no `fieldset` element**. The group is a `div` with
`role="group"` and `aria-label`, which AccessKit maps. There is no
`aria-disabled` (`HostProps`), so a disabled group must convey its state through
its controls (each control leaves the tab order and stops editing) and the legend
colour. Record that in the row and the docs page.

## 2. The target API

```tsx
<Fieldset legend="Billing address" disabled={saving}>
  <Field description="Street and number">
    <FieldInput value={street} onChange={onStreet} />
  </Field>
  <Field description="City">
    <FieldInput value={city} onChange={onCity} />
  </Field>
</Fieldset>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Fieldset` | `role="group"`, `aria-label={legend}`, the column layout, the legend and the disabled context | `legend` (required), `disabled?`, `children?: PartChildren` |
| `FieldsetLegend` | the visible group heading | `disabled?`, host props |

- `Fieldset` renders its own `FieldsetLegend`, exactly as `Field` renders its own
  `FieldLabel`. A manually placed `FieldsetLegend` inside `Fieldset` is a
  misplaced family part and throws (`internal/parts.ts`). Do not add a second way
  to author the legend.
- `legend` is both the visible heading and the group's accessible name, so a
  consumer cannot produce an unnamed group.
- No `variant`, no `bordered` flag, no error slot. A fieldset that needs a
  surface is a `Card`; a fieldset that needs a message is two `Field`s.

## 3. How `disabled` reaches a control

A new `src/fieldset.tsx` owns the context and exports a narrow reader:

```ts
export const useFieldsetDisabled = (): boolean => ...
```

`FieldInput` in `src/field.tsx` calls it and combines it with its own `disabled`
prop:

- `readOnly: true` — the runtime provides `readOnly` on `<input>`; this stops
  edits.
- `tabIndex: -1` — the control leaves the tab order. `FieldInput`'s doc comment
  already promised this and the code did not do it; this plan makes the doc true
  and adds the regression test.
- `backgroundColor: theme.colors.disabled`, `color: theme.colors.disabledForeground`,
  `cursor: "not-allowed"` — the disabled roles, not an opacity literal.

`Fieldset` itself does **not** dim the whole subtree: a consumer may put an
action inside the group that has its own disabled policy, and double-dimming the
input (group 0.5 × input 0.5) is dishonest. Only the legend takes
`disabledForeground` when disabled. Document that only `FieldInput` honours the
context today; every other control keeps its own `disabled` prop.

## 4. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/fieldset.tsx` | **create** — `Fieldset`, `FieldsetLegend`, the context reader, `fieldsetMeta` |
| `packages/components/src/field.tsx` | `FieldInput` reads the context; disabled sets `readOnly`, `tabIndex: -1` and the disabled roles |
| `packages/components/src/index.ts` | add `export * from "./fieldset.js";` |
| `packages/components/src/inventory.ts` | import and list `fieldsetMeta` |
| `packages/components/src/behaviour/fieldset.test.tsx` | **create** — 7 tests (§7) |
| `packages/components/src/behaviour/field.test.tsx` | add the disabled-`FieldInput` test (5 → 6) |
| `packages/components/examples/fieldset.example.tsx` | **create** — a two-field billing address group, with a disabled copy |
| `packages/components/docs/fieldset.mdx` | **create** — anatomy, usage, API, theming, accessibility, limitations, verification |
| `docs/component-api.md` | move Fieldset from "Planned Tier 2 additions" to the built table with source `plan 306`; no other §8 change |
| `COMPONENTS.md` | Fieldset row → `done` / `partial`, 7 native tests, the limitation text |
| `TODO.md` | tick Fieldset under the Tier 2 gap list |
| `.agents/slop/plans/README.md` | add this plan to the components table |

No new dependency. `assertParts` and the theme seam are already the conventions.

## 5. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # expected: all suites pass; Fieldset 7, Field 6
nub run --filter @gpuixui/components test             # expected: unit suites + inventory pass
nub run check                                         # expected: exit 0
nub run lint                                          # expected: exit 0
nub run test                                          # expected: exit 0
```

The behaviour command needs the native binding from plan `140` (present in this
worktree's store). Without it, the suite fails to load — that is the documented
host limitation, not a pass.

## 6. STOP conditions

Stop and report if:

- `role="group"` produces no accessible node in the 0.10.0 dump. Then the group
  is named by the legend text alone; record the evidence in `COMPONENTS.md` and
  the docs page instead of pretending the name exists.
- `readOnly` or `tabIndex` is not accepted by the `<input>` host in
  `@gpuix/native@0.10.0` (check `InputProps`). Do not emulate a disabled input
  with a wrapper.
- a second control in the group starts honouring the context implicitly; the
  context reader stays opt-in per control, and each opt-in needs its own test.
- `FieldInput`'s disabled styles would need a colour role the theme does not
  ship. Add the interlock to `TODO.md`; do not mix a literal colour.

## 7. Test plan

`src/behaviour/fieldset.test.tsx` (real GPUix renderer, one root at a time):

1. renders the legend once and names the group by it (`nodesWithRole(..., "group")`);
2. renders the grouped fields in declaration order;
3. a `disabled` fieldset makes the field's input `readOnly` with `tabIndex: -1`;
4. a `disabled` fieldset paints the legend with `disabledForeground` and the input
   with `colors.disabled`, in **both** themes;
5. an enabled fieldset leaves the input editable — typing reaches `onChange`;
6. a consumer `style` on the root wins over the group layout;
7. the group's children still render when `legend` is present and the group has
   no `disabled` prop (the default path).

`src/behaviour/field.test.tsx` gains one test: a `disabled` `FieldInput` is
`readOnly`, has `tabIndex: -1`, and reports no typing through `onChange`.

**Both directions.** Make `useFieldsetDisabled` return `false` unconditionally:
tests 3 and 4 fail, and the Field test fails only if its own `disabled` path is
also broken (it is separate). Restore. The positive run is the second direction.

## 8. Acceptance criteria

- Two exported parts with JSDoc, no compatibility props; the legend cannot be
  authored twice.
- Seven native Fieldset tests plus the Field regression test, both themes.
- Disabled state uses only token roles; no literal colour or opacity.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's
  §8 table all agree.
- `nub run check`, `nub run lint`, `nub run test` and the behaviour suite green.

## 9. Result

Landed 2026-10-17:

- `src/fieldset.tsx` — `Fieldset` (`role="group"`, legend and disabled context),
  `FieldsetLegend`, `useFieldsetDisabled`, `fieldsetMeta`. The root rejects a
  manually placed legend through the shared parts check.
- `src/field.tsx` — `FieldInput` combines the fieldset's `disabled` with its own,
  sets `readOnly` + `tabIndex: -1`, and paints the disabled roles. This also made
  its existing doc comment true.
- `src/behaviour/fieldset.test.tsx` — 7 tests; `field.test.tsx` — 5 → 6.
- Example, docs page, inventory record, `COMPONENTS.md` row and the contract's §8
  table updated; `docs/component-api.md` moved Fieldset out of the planned list.
- **Both directions:** dropping the fieldset term from `isDisabled` failed the
  read-only test and the both-theme colour test (the two later failures were
  cascade from the first assertion leaving a root mounted). Restored: 317
  behaviour tests green; `nub run check` green.

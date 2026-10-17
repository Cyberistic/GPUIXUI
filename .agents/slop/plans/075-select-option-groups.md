# 075 — `Select` option groups

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 1 feature completion) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `057`, `062`, `066`, `068`, `069` |
| Status | **planned** |

Self-contained: §1 the gap, §2 the API, §3 exact files, §4 tests, §5
commands, §6 STOP conditions, §7 acceptance and outcome.

---

## 1. The gap

`Select` renders a flat `options` array into one run of `SelectItem`s. The
inventory and `docs/select.mdx` list the consequence as a limitation: **"No
option groups, no rich option content, no compound escape hatch in the public
API; use `RadioGroup` for rich options."**

GPUix's published `@gpuix/react/select` already ships `SelectGroup` and
`SelectLabel`, and the runtime maps `role="group"` + `aria-label` to an AccessKit
`Group` node with that name (measured on this host, 2026-10-17; probe in §7).
The limitation is therefore ours, not the runtime's: a consumer with 20 regions
cannot group them, and the list is one undifferentiated run.

The `COMPONENTS.md` Select row and the docs page must stop claiming a limitation
that no longer exists once this lands.

## 2. The API

`options` accepts one entry type more. Flat options keep working unchanged.

```ts
export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** A named run of options. The heading is not selectable. */
export interface SelectOptionGroup {
  readonly label: string;
  readonly options: ReadonlyArray<SelectOption>;
}

export type SelectEntry = SelectOption | SelectOptionGroup;
```

- `options: ReadonlyArray<SelectEntry>`.
- A group paints a heading row (`SelectLabel`) and its options; the options stay
  one flat keyboard order, so the heading is skipped by the arrows.
- An **empty** group paints nothing and contributes nothing to the height
  estimate — a heading with no options is not a section.
- The heading is a caption-role line on `mutedForeground`, inset like an option
  row. Its painted height is:
  `typography.caption.lineHeight + 2 * spacing["2xs"]`.
- The group wrapper is a named `group` node (`role="group"` +
  `aria-label`), because the runtime has no `aria-labelledby`; the visible
  heading is the name.
- Values stay globally unique across groups (GPUix keys items by value). The
  docs state this; the wrapper does not silently de-duplicate.

New public names: `SelectOptionGroup`, `SelectEntry` (types only).

## 3. Files to create or change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/select.ts` | **new** — `SelectOption`, `SelectOptionGroup`, `SelectEntry`, `isSelectGroup`, `selectOptions`, `selectRowCounts`; pure and runtime-free |
| `packages/primitives/src/core/select.test.ts` | **new** — the pure rules in §4 |
| `packages/primitives/src/components/Select.tsx` | type re-exports; grouped rendering; `selectHeadingStyle`/`selectHeadingHeight`; height estimate; value-keyed item registry |
| `packages/primitives/src/components/index.ts` | export the two new types |
| `packages/primitives/src/components/Select.test.tsx` | update the estimate test; add grouped tree assertions |
| `packages/primitives/runtime/fields.runtime.test.tsx` | update the estimate calls; add the three runtime tests in §4 |
| `packages/primitives/examples/form.example.tsx` | make `REGIONS` two real groups (Europe, Americas) so the mounted example exercises the feature |
| `packages/primitives/docs/select.mdx` | usage, API, a "Option groups" section, accessibility, limitations, verification |
| `COMPONENTS.md` | the Select row: record grouped options and delete the limitation |
| `TODO.md` | tick the task added for this plan |
| `.agents/slop/plans/README.md` | index this plan and its status |

Implementation notes:

- `selectOptions(entries)` is the flat order the trigger, `items` and the
  keyboard read. `selectRowCounts(entries)` returns
  `{ options, headings }`; the headings count **excludes** empty groups.
- `selectListHeight(optionCount, theme, headingCount = 0)` keeps its existing
  two-argument shape, so the current call sites and tests stay valid; the
  component passes `headingCount`.
- `selectListHeight` adds `headingCount * selectHeadingHeight(theme)` and counts
  headings in the row-gap term:
  `Math.max(optionCount + headingCount - 1, 0) * spacing["2xs"]`.
- The item registry and highlight callback key by **option value**, not by
  index. Indices become wrong as soon as a heading sits between options; a
  value is what both the item and the scroll target already have.
- Render groups only through `Arr.map`; no imperative counter. Narrow with
  `isSelectGroup`.
- `core/select.ts` must not import `@gpuix/react` at runtime (type-only imports
  only), like the rest of `core/`.

## 4. Tests — each able to fail

**Pure (`src/core/select.test.ts`)**

1. A flat list flattens to itself and has no headings.
2. A group flattens in paint order: heading marker excluded, options in order.
3. An empty group contributes no heading and no options.
4. `selectRowCounts` counts options and non-empty headings separately.
5. `selectOptions` keeps the list order across groups (the trigger label lookup
   depends on it).

**Element tree (`src/components/Select.test.tsx`)**

6. The estimate with one heading equals the painted styles:
   `selectListHeight(2, theme, 1)` equals the padding + 2 rows + heading height +
   gaps + border, all read from `selectContentStyle`, `selectItemStyle` and
   `selectHeadingStyle`. The existing heading-free assertion stays.
7. A grouped tree: the list has one group child; the group is
   `role="group"` named by its heading; the group's children are the heading
   text followed by the two options; the trigger's `aria-valuetext` is the
   selected grouped option's label.
8. `itemsOf` (the flat `items` prop) contains the grouped options in order.

**Native runtime (`runtime/fields.runtime.test.tsx`)**

9. Opening a grouped select paints the headings and every grouped option; the
   a11y dump contains a `Group` node with the heading as its label.
10. Keyboard: focus the trigger, Enter opens, Down highlights the **first**
    option (not the heading), Enter commits it and `onChange` reports its value.
11. The estimate still matches the paint: a two-group list's measured height is
    within 1 px of `selectListHeight(options, theme, headings)`.

Two-direction proof: tests 9–11 fail when `Select.tsx` renders `selectOptions`
flat (headings missing), when the renderer passes the row index instead of the
value to `registerItem` (scroll/highlight pairing), and when the estimate omits
`headingCount` (measured height differs). Record the exact failing assertion in
§7 after the implementation.

Regression statement for the test headers: *before this plan the list had no
group headings and the public API could not express one; the runtime now paints
a named group per non-empty group and the keyboard order stays flat.*

## 5. Commands

```sh
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime
nub run check
```

Expected: the offline suite passes with the new `core/select.test.ts`; the
runtime suite is green with three more tests; `nub run check` is clean (types,
lint, format, tests-can-fail).

## 6. STOP conditions

- `SelectGroup`/`SelectLabel` do not paint inside the wrapper's `SelectContent`
  in the runtime — stop and report the measured frame; do not fake headings with
  a `div` if the published component cannot render there.
- `role="group"` on `SelectGroup` produces no a11y node or breaks the listbox —
  stop and report the dump; keep the row heading visual and leave the group
  unnamed rather than inventing a second contract.
- GPUix's keyboard highlight follows the *rendered children* rather than the
  flat `items` prop and therefore stops on a heading — stop and report the
  probe; do not reorder the DOM to work around it.
- The estimate cannot be pinned to the painted styles within 1 px — stop and
  report both numbers; do not widen the tolerance silently.

## 7. Acceptance and outcome

Acceptance:

- flat `options` is source-compatible;
- a grouped select paints its headings, exposes a named group node, keeps a flat
  keyboard order, and selects across a group boundary;
- the placement estimate accounts for headings and is pinned by a test;
- `form.example.tsx` mounts groups in the runtime example suite;
- docs and `COMPONENTS.md` no longer claim groups are unsupported;
- `nub run check`, `nub run test`, `nub run lint` pass.

Measured outcome: _to be filled after implementation._

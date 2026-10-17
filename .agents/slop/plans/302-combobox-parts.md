# 302 — Combobox becomes a compound part

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | components workstream (`packages/components`) |
| Depends on | `200-adopt-compound-part-api.md`, `116-tier2-choice-inputs.md`, `138-combobox-pointer-coverage.md` |
| Status | planned |
| Source | `docs/component-api.md` §9 row "Comboboxes"; `TODO.md` → "Split the remaining landed deviations … into parts" |

Self-contained. It migrates only `Combobox`. Pagination, CommandMenu and the
date/time pickers are `300`, `301`, `303`.

---

## 1. Why

`Combobox` keeps GPUix's headless trigger, content, input, list, item and empty
parts internal and exposes six styling props (`placeholder`,
`searchPlaceholder`, `emptyLabel`, `label`, `testId`, `disabled`). A caller cannot
add a footer, a "create new" row, or a custom empty state, and the docs cannot
name the anatomy. The contract says every region is a part.

GPUix's headless parts stay the implementation: this plan re-exports **our styled
parts wrapping GPUix's**, exactly as `Popover` wraps `FloatingLayer`. The ranking
adapter (pre-ranked items + controlled `inputValue`, plan 116 §3) and the
selection payload stay in the root.

## 2. The target API

```tsx
<Combobox options={options} value={value} onValueChange={setValue}>
  <ComboboxTrigger placeholder="Select…" label="Fruit" />
  <ComboboxContent>
    <ComboboxInput placeholder="Search…" />
    <ComboboxList />
    <ComboboxEmpty>No matches</ComboboxEmpty>
  </ComboboxContent>
</Combobox>
```

| Part | Responsibility | Props |
| ---- | -------------- | ----- |
| `Combobox` | the headless root: selection, open, the query, ranking and focus restore | `options`, `value?`, `defaultValue?`, `onValueChange?`, `multiple?`, `disabled?` |
| `ComboboxTrigger` | the closed control's label, caret and `aria-expanded` | `placeholder?` (`"Select…"`), `label?`, `testId?` (`"combobox-trigger"`) |
| `ComboboxContent` | the anchored popup surface | `side?`, `align?`, `sideOffset?`, host props |
| `ComboboxInput` | the search field | `placeholder?` (`"Search…"`), `aria-label?` |
| `ComboboxList` | the `role="listbox"` column of ranked options | `aria-label?` |
| `ComboboxItem` | one option row: label, description, selected mark | `value` (required) |
| `ComboboxEmpty` | GPUix's empty slot | children (default `"No matches"`) |

Rules:

- The root still wraps `HeadlessCombobox` with `filter={null}`, pre-ranked
  `items`, `autoHighlight="always"`, `itemToStringValue` and the controlled
  `inputValue`; those stay in one place (plan 116 §3). Do not add a second
  filter.
- The root owns `restoreFocus`; `ComboboxInput`'s Escape handler calls
  `noteEscape()` on the context so the root's effect returns focus to the
  trigger. The trigger registers its instance in a context ref.
- `ComboboxTrigger` keeps the display rule (labels for the selected values, the
  placeholder when empty) and the `testId` default.
- `ComboboxItem` derives its disabled flag from the option with that value and
  keeps `aria-selected` and `testId="combobox-option-<value>"`.
- `ComboboxContent` keeps the surface style and `onMouseDownOutside` handler that
  clears `restoreFocus`.
- A part outside `Combobox` throws `"Combobox parts must be used inside
  Combobox"`.
- `ComboboxSelection`, `ComboboxOption` and `comboboxMeta` survive.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/components/src/combobox.tsx` | rewrite as seven parts over a context; keep the headless adapter in the root |
| `packages/components/src/behaviour/combobox.test.tsx` | the render helper composes the parts; 13 existing tests stay; add 2 |
| `packages/components/examples/combobox.example.tsx` | compose the parts |
| `packages/components/docs/combobox.mdx` | anatomy by part, composed snippet, test count |
| `COMPONENTS.md` | Comboboxes row: parts + new test count |
| `docs/component-api.md` | §8 Comboboxes row lists the seven parts; delete its §9 row |
| `TODO.md` | tick the Combobox slice |

`rg -n "<Combobox" packages apps examples` must show only the example, the
behaviour suite and `combobox.tsx` itself.

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/components test:behaviour   # exit 0, Combobox 15, total +2
nub run --filter @gpuixui/components test             # exit 0
nub run check                                         # exit 0
nub run lint                                          # exit 0
```

## 5. STOP conditions

Stop and report if:

- GPUix's headless parts reject being rendered one component deeper (a part must
  pass its props through unchanged; if the runtime requires literal direct
  children, keep the composition at one level and record the measured reason);
- the empty slot cannot take children (then `ComboboxEmpty` takes a `label` prop
  and the deviation is recorded in the docs page);
- focus restore only works when the trigger is a literal `ComboboxTrigger` child
  of the root (the context ref is the answer; do not read internals);
- a test can no longer drive the popup because the trigger moved behind a part
  (the test helper composes the same tree a consumer would).

## 6. Test plan

Keep all thirteen existing tests (open + focus, filtering, value payload,
empty label, single replace, multiple order, disabled option, Escape focus,
prefix ranking, both-theme popup, pointer select, pointer multi-toggle, outside
press). Add:

1. **the empty state is a part** — compose `<ComboboxEmpty>No fruit found</ComboboxEmpty>`,
   type `zzz`; the popup contains that text and not `"No matches"`.
2. **the trigger takes its own placeholder and name** — compose
   `<ComboboxTrigger placeholder="Pick fruit" label="Fruit" />`; with no value the
   trigger shows `"Pick fruit"` with `aria-label="Fruit"`.

**Both directions.** Make `ComboboxItem` paint `aria-selected={false}`
unconditionally: the multiple-selection and pointer tests fail. Restore. Test 2
fails if the trigger reads a root-level placeholder or ignores `label`.

## 7. Acceptance criteria

- Seven exported parts with JSDoc; the root keeps only data/state props.
- The plan-116 ranking adapter is still the only filter path.
- 15 native behaviour tests; docs, example, inventory and contract agree.
- Gates in §4 green.

## 8. Result

To be filled by the executor: commit, measured counts, both-direction evidence.

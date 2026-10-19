# 579 — A `Select` group with a blank heading paints an orphan caption

**Phase:** F (integration and polish) · **Owner:** primitives · **Depends on:** 026, 075, 363, 500, 577, 578

## 0. The bug

`Select` accepts grouped options:

```ts
options={[{ label: "Europe", options: [{ value: "eu", label: "Europe West" }] }]}
```

A group paints a caption row (`SelectGroup` + `SelectLabel`) and
`selectRowCounts` counts one heading per non-empty group, so the placement
estimate matches the paint. The gate is **emptiness only**:

```ts
onNonEmpty: (rows) => <SelectGroup …><SelectLabel>{entry.label}</SelectLabel>…
```

A computed blank name (`label={t(group.key)}` with a missing translation)
therefore:

- paints an empty caption row above its options (a `caption` line plus padding),
- exposes an unnamed `group` node, and
- is counted as a heading, so `selectListHeight` is one caption row taller than
  the list that actually paints — the side decision can flip early.

This is the same class as plan 363 (an empty group painted an orphan heading
while the estimate counted nothing) and plan 577/578 (a blank string is
absence). The rule must live where row counts are computed as well as where the
list is painted.

## 1. Evidence

Element tree, before the change, for
`options: [{ label: "   ", options: [eu] }, { value: "us", … }]`:

```
list children roles:   ["group", "option"]
list children testIds: [undefined, "region-option-us"]
selectRowCounts(...):  { options: 2, headings: 1 }
```

After:

```
list children roles:   ["option", "option"]
list children testIds: ["region-option-eu", "region-option-us"]
selectRowCounts(...):  { options: 2, headings: 0 }
```

Both cases fail against the old gate by those exact values (the component case
reports `["group","option"]`; the core case reports `headings: 1`).

## 2. Changes

### 2.1 One blank-text rule for paint and row model

`core/` must not import `components/`, so move plan 577's predicate into a core
module:

- Create `packages/primitives/src/core/text.ts`:

  ```ts
  export const usableText = (value: string | undefined): Option.Option<string> =>
    Option.filter(Option.map(Option.fromNullishOr(value), Str.trim), Str.isNonEmpty);

  export const hasText = (value: string | undefined): boolean =>
    Option.isSome(usableText(value));
  ```

  Document it as the shared rule for a caption/description/heading. The
  `string | undefined` parameter is the React prop boundary; it is converted
  with `Option.fromNullishOr` immediately.

- `components/internal.ts`:
  - `usableLabel` becomes `export const usableLabel = usableText;` (same type and
    behaviour; every existing import keeps working).
  - `hasText` is re-exported: `export { hasText } from "../core/text.js";`
  - Remove the now-unused local trimming body. Keep `textOf` as it is.

### 2.2 `packages/primitives/src/core/select.ts`

`selectRowCounts` counts a heading only when it says something:

```ts
headings: counts.headings + (hasText(entry.label) ? 1 : 0),
```

Update the doc comment: an empty group and a blank heading both count as a flat
run.

### 2.3 `packages/primitives/src/components/Select.tsx`

Replace the outer `Arr.map` over entries with `Arr.flatMap`:

- an empty group → `[]`;
- a non-empty group with a blank label → `Arr.map(rows, row)` (its options
  paint flat, no group node, no caption);
- a non-empty group with a real label → `[<SelectGroup …>…</SelectGroup>]`;
- a plain option → `[row(entry)]`.

Every returned element already has a key (the group keeps its
`${index}-${label}` key; option rows key on value), so the flat map needs no
fragment key. Import `hasText` from `../core/text.js`.

No other change: the trigger's label lookup, the flat `items` order and the
option locators are untouched.

### 2.4 Documentation

- `docs/select.mdx` — Option groups: a blank heading paints its options flat,
  counts nothing, and a real heading is trimmed. The placement paragraph says
  only a group with a heading is counted. Verification lists both cases.
- `COMPONENTS.md` — append the rule to the Selects row.
- `TODO.md` — tick the task.

## 3. Test plan

- `src/core/select.test.ts` → `does not count a heading whose name says nothing`:
  one grouped option with `label: "   "` → `{ options: 1, headings: 0 }`.
- `src/components/Select.test.tsx` → `paints no heading for a group whose name
  says nothing`: the list's children are two `option`s with locators
  `region-option-eu`, `region-option-us`; no `group` role and no caption row.

### Both directions

1. With the old gate, run:

   ```sh
   cd packages/primitives
   nub exec vitest run src/core/select.test.ts src/components/Select.test.tsx
   ```

   Expected: **2 failed / 44 passed** — roles `["group","option"]` and
   `headings: 1`.
2. Apply the change and run the same command. Expected: **2 files, 46 passed**.
3. Gates:

   ```sh
   nub run --filter @gpuixui/primitives test
   nub run check
   nub run lint
   nub run test
   ```

   Expected: primitives **51 files / 741 tests**; everything green.

No runtime assertion changes: the defect is in the element tree and the row
model, and the current binding is the `references/gpuix` `main` artifact, not
the published tag (plan 529).

## 4. STOP conditions

- A consumer needs a group with no visible heading but a meaningful accessible
  name (an icon heading): the current `SelectOptionGroup` has no `aria-label`
  override. Stop and report rather than inventing one.
- Moving `usableLabel` changes any behaviour: its body is unchanged, only its
  home; if a test disagrees, revert the move and keep a local predicate with a
  comment naming plan 579 instead.
- A change is needed outside `packages/primitives`: record it in `TODO.md`.

## 5. Acceptance

- A blank group heading paints flat and is not counted; a real heading is
  trimmed and still paints its group.
- Both new cases fail against the old gate and pass after it.
- `nub run check`, `nub run lint`, `nub run test` pass.
- The page, `COMPONENTS.md` and `TODO.md` record the rule and plan 579.

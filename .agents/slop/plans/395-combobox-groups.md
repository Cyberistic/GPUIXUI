# Plan 395 — Combobox group headers: grouped options, ranked within each group

| Field | Value |
| ----- | ----- |
| Phase | C (Tier 2 completion) / F (consistency) |
| Owner | components workstream |
| Depends on | `110`, `116`, `138`, `200`, `201`, `302`, `323`, `328`, `340` |
| Status | done — `group` field, run-scoped ranking and labelled sections; 6 pure + 5 native cases, three mutation proofs; unit 389, behaviour 616 |
| Number | First free number in the `300–399` block (last landed: `394`) |

This plan is self-contained. A weaker executor can run every step without
reading another plan. Facts marked **measured** were reproduced on this host
(Intel macOS, the locally built `darwin-x64` binding from plan `140`).

---

## 1. Goal

`COMPONENTS.md` and `docs/combobox.mdx` record one remaining Combobox gap:
**"No grouping headers in v1."** `docs/command-menu.mdx` already shows the shape
the library wants — a heading at each group change, with ranking performed
**within** a group so a heading never repeats. This plan brings that shape to
`Combobox`:

1. `ComboboxOption` gains an optional `group?: string`.
2. The default filter ranks **within each contiguous run** of options sharing a
   group, so group order follows declaration order and no heading repeats.
3. `ComboboxList` renders a labelled `role="group"` section per run, with a
   visible heading; ungrouped rows render in their own unnamed run.
4. A group whose every option fails the query disappears with its heading.
5. The synthetic create row stays ungrouped and can never inherit a heading.

No new part is introduced: grouping is data (`ComboboxOption.group`), not a
second way to write a list, so the §8 parts table, the compound-part contract
and every existing consumer stay unchanged.

## 2. Facts this design rests on

Read from the installed `@gpuix/react@0.10.0` on 2026-10-17/18, not from the
reference clone:

- `ComboboxList` maps `filteredItems` through a render prop when `children` is a
  function, and renders `children` verbatim when it is a node
  (`dist/components/combobox.js`). Our wrapper already passes
  `filter={null}`, so `filteredItems` is exactly the `items` array the root
  computed. Passing our own nodes therefore loses no runtime behaviour.
- `ComboboxItem` reads its index from the root context
  (`context.filteredItems.indexOf(value)`), so wrapping rows in a group `div`
  cannot break highlight, Enter or selection.
- `ComboboxGroup`, `ComboboxLabel` and `ComboboxSeparator` exist in 0.10.0 and
  are **plain divs** — no group semantics, no heading role. Any a11y value is
  ours to add with `role`/`aria-label`, which 0.10.0 exposes (`HostProps.role`,
  `HostProps["aria-label"]`).
- `role="group"` on a host div is reported by the a11y dump as AccessKit
  `Group` (the same mechanism every existing `role="group"` in this package
  uses). If the dump does not report it, §9 stops and the header ships as
  visible text only.
- The semantic precedent is `CommandAction.group` (“consecutive actions share
  it”) plus `rankByGroup` in `menu/fuzzy.ts`. `Combobox` must keep its own
  ranking table (prefix > word prefix > substring > description), so this plan
  reuses the *run* rule, not the fuzzy scorer.

**Baseline (measured 2026-10-18, before the change):** `nub run test` → 383 unit
tests green; `nub run test:behaviour` → 611 native tests across 49 files green;
Combobox 28 native tests, 11 logic tests.

## 3. Design

### 3.1 `ComboboxOption` and the run rule

```ts
export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  /** Consecutive options sharing a group render under one heading. */
  readonly group?: string;
  readonly disabled?: boolean;
}
```

`group?: string` with the same meaning as `CommandAction.group`. An absent,
empty or whitespace-only group is **ungrouped**:

```ts
/** The heading an option sits under, or `None` for ungrouped rows. */
export const groupOfOption = (
  option: ComboboxOption,
): Option.Option<string> =>
  Option.filter(
    Option.fromNullishOr(option.group),
    (group) => Str.isNonEmpty(Str.trim(group)),
  );
```

A **run** is a maximal contiguous slice of options with the same group name
(including `None`). Runs are found by comparing each option with its
predecessor; a caller that interleaves two groups gets two headings, which is
honest and matches `CommandAction`'s documented rule.

```ts
export interface ComboboxOptionRun {
  readonly group: Option.Option<string>;
  readonly options: ReadonlyArray<ComboboxOption>;
  /** Declaration index of the run's first option; used for tie-breaking. */
  readonly from: number;
}

export const optionRuns = (
  options: ReadonlyArray<ComboboxOption>,
): ReadonlyArray<ComboboxOptionRun>;
```

### 3.2 Ranking within runs

`filterOptions` keeps its table and tie-break, but sorts inside each run:

1. Rank every option once against the query, carrying its **absolute**
   declaration index (`0..n-1`), so ties inside a run still use declaration
   order across the whole array.
2. Walk the runs in declaration order.
3. For each run, keep its matching entries, sort by `rank` then `index`, and
   append their options.
4. A run with no matching option contributes nothing — its heading disappears.

An empty/blank query still returns `options` unchanged, so declaration order and
group order are exactly the caller's.

`visibleOptions` is unchanged: `shouldFilter={false}` returns the caller's array
untouched, and the list still groups by contiguous runs. That keeps the remote
contract “membership and order as given” true; grouping only adds headings at
run boundaries.

### 3.3 `ComboboxList` rendering

The root context gains two values:

```ts
/** The values fed to the runtime, ranked; includes the create row. */
readonly rows: ReadonlyArray<string>;
/** The heading for a row value; `None` for ungrouped rows and the create row. */
readonly groupOf: (value: string) => Option.Option<string>;
```

`ComboboxList` renders `rows` itself (instead of the headless render prop),
grouped into runs by `groupOf`:

```tsx
<HeadlessList role="listbox" aria-label={label} {...rest} style={...}>
  {runs.map((run) => (
    <HeadlessGroup
      key={Option.getOrElse(run.group, () => "ungrouped")}
      role={Option.isSome(run.group) ? "group" : undefined}
      aria-label={Option.getOrUndefined(run.group)}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {Option.match(run.group, {
        onNone: () => null,
        onSome: (group) => <HeadlessLabel testId={...}>{group}</HeadlessLabel>,
      })}
      {run.values.map((value) => (
        <ComboboxItem key={value} value={value} style={itemStyle} />
      ))}
    </HeadlessGroup>
  ))}
</HeadlessList>
```

Rules:

- **One heading per run**, with `testId="combobox-group"` and the group name as
  its text. It is styled like `MenuLabel`: caption type, `mutedForeground`,
  horizontal `md` padding, vertical `xs`, `userSelect: "none"`. It is not
  focusable and claims no key.
- **Rows keep their existing look and state style**; `itemStyle` is passed
  through unchanged. `ComboboxItem` remains exported for hand-composed lists.
- **The create row** is ungrouped, so it never gets a heading and never merges
  into the group before it. Runs are computed over `rows`, which includes the
  synthetic value.
- **No rows** means no runs; `ComboboxEmpty` behaves exactly as before.
- **`rows` is the headless `items` array**, so `ComboboxItem`'s
  `filteredItems.indexOf(value)` index is unchanged and highlight/Enter still
  work.

Why not the headless render prop: it yields one node per item and cannot place a
heading at a run boundary without a fragment sibling; rendering `rows` as nodes
is the documented second mode of the same component and keeps the grouping logic
in one place.

### 3.4 What does not change

- No new public part, no change to `docs/component-api.md` §8.
- Trigger, input, popup placement, create rules, `onQueryChange`,
  `shouldFilter`, `loading`, selection payload and focus restore are untouched.
- `filterOptions` keeps its exported name and table; only the sort scope
  changes (per run). `visibleOptions`, `canCreate`, `createValue`,
  `parseCreateValue`, `labelOf` and `toggledSelection` are untouched.

## 4. Files

| File | Action |
| ---- | ------ |
| `packages/components/src/combobox/logic.ts` | add `group` to `ComboboxOption`, `groupOfOption`, `optionRuns`; rank inside runs |
| `packages/components/src/combobox/logic.test.ts` | run grouping, in-run ranking, disappearing groups, blank/absent group, `shouldFilter` order |
| `packages/components/src/combobox.tsx` | context `rows` + `groupOf`; `ComboboxList` renders headed runs; meta limitations |
| `packages/components/src/behaviour/combobox.test.tsx` | 3–4 native cases (headings, in-run rank, grouped selection, create row) |
| `packages/components/examples/combobox.example.tsx` | one grouped picker (or grouped `labels`) so the all-example suite mounts it |
| `packages/components/docs/combobox.mdx` | grouping section, API field, verification count, limitations |
| `COMPONENTS.md` | Combobox row: grouping, new native count, drop the “no grouping headers” limitation |
| `TODO.md` | a row for the gap closure (plan 395), ticked when landed |
| `.agents/slop/plans/README.md` | index `395` |
| `.agents/slop/plans/395-combobox-groups.md` | this plan; append §10 after implementation |

## 5. Commands and expected results

Run from `packages/components` unless stated.

```sh
nub run check-types
# expect: exit 0

nub run test -- src/combobox/logic.test.ts
# expect: the existing 11 logic tests plus the new grouping cases pass

nub run test:behaviour -- src/behaviour/combobox.test.tsx
# expect: 28 existing native cases plus the new ones pass
```

Then the package and repo gates:

```sh
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
nub run test
```

Expected: unit and behaviour suites grow by the new cases only, the inventory
count checks agree with `COMPONENTS.md` and `docs/combobox.mdx`, and every gate
is green.

## 6. Implementation steps

### 6.1 Logic (`src/combobox/logic.ts`)

1. Add `group?: string` to `ComboboxOption` with the §3.1 doc comment.
2. Add `groupOfOption`, filtering an absent/blank group to `None`.
3. Add `ComboboxOptionRun` and `optionRuns`:
   - reduce the array, closing the open run when the group changes;
   - carry `from` = the index of the run's first option;
   - never mutate; return a new array.
   Use `Arr.reduce`/`Arr.append` (no native loops).
4. Rewrite `filterOptions` to rank globally (carrying absolute `index`) but
   flatten **run by run**, filtering by `from <= index < from + length`. Keep
   `byRankThenDeclaration` unchanged.
5. Update the module header: ranking is per group run, matching
   `CommandAction.group`.

### 6.2 Component (`src/combobox.tsx`)

1. Import `ComboboxGroup as HeadlessGroup`,
   `ComboboxLabel as HeadlessLabel` from `@gpuix/react`, plus `Fragment` from
   React if needed.
2. Extend `ComboboxContextValue` with `rows` and `groupOf(value)`.
3. In `Combobox`, build `rows` exactly from `items` (visible values plus the
   create value). Provide `groupOf` by looking the value up in `options` and
   calling `groupOfOption` (import it; do not duplicate the predicate).
4. Rewrite `ComboboxList` to render the headed runs from §3.3. Keep:
   - `role="listbox"`, `aria-label`, caller `style` merge;
   - `itemStyle` on every `ComboboxItem`;
   - `Omit<HeadlessListProps, "children">`.
5. Keep the heading style local (caption, muted, padding, `userSelect: none`);
   do not import `menu/item` — the menu family must not become a dependency of
   the choice-input family.
6. Add to `comboboxMeta.limitations`: headings follow contiguous runs, and a
   caller that interleaves a group gets two headings. Remove the old
   “no grouping headers” sentence everywhere it is recorded.

### 6.3 Example

Add a grouped picker to `examples/combobox.example.tsx` — group the existing
`labels` option set by kind:

```ts
{ value: "calendar", label: "Calendar", description: "Scheduling", group: "Work" },
...
{ value: "vacation", label: "Vacation", description: "Time off", group: "Personal" },
```

Update the example header comment and the closing hint to mention the headings.
No second example file is added: the registry check and docs page stay as they
are.

### 6.4 Docs and inventory

1. `docs/combobox.mdx`
   - Add a `## Grouping` section between “Ranking” and “Remote options”:
     `group` on options; consecutive options share a heading; ranking happens
     inside a group so a heading never repeats; an empty group disappears; the
     create row is ungrouped; interleaved groups produce two headings.
   - Add `group?: string` to the `ComboboxOption` line in `## API` and to the
     `ComboboxList` row (“one labelled group per run”).
   - Remove “No grouping headers in v1” from `## Limitations`; keep the create
     sentence.
   - Update the canonical Verification line to the real count and name the new
     cases.
   - The page already says the ranking table; add the one sentence that the
     scope is now a group run.
2. `COMPONENTS.md` Combobox row: add grouping (option `group`, heading per
   contiguous run, in-run ranking, create row ungrouped), update the native test
   count, remove “no grouping headers”.
3. `TODO.md`: add and tick a Tier 2 hardening row for plan 395 once the gates
   pass; keep the progress bars unchanged (the phase count is unchanged).
4. Index this plan in `.agents/slop/plans/README.md` with its final status and
   test counts.

## 7. Test plan

Every new case must be able to fail; the suite header gains the bugs guarded
(global ranking that splits a group, missing headings, a create row inheriting a
heading, a grouped row that cannot be selected).

### 7.1 Pure (`src/combobox/logic.test.ts`)

| # | Case | Assertion |
| - | ---- | --------- |
| 1 | `optionRuns` groups contiguous options and keeps `from` | `[Fruits, Fruits, Vegetables]` → two runs, second `from` = 2 |
| 2 | an absent/blank `group` is one ungrouped run | `[{}, {group: "  "}]` → one run, `group` is `None` |
| 3 | an interleaved group produces two runs | `[A, B, A]` → three runs |
| 4 | ranking is inside a run, not global | Fruits `Apple` (rank 0 for `"ap"`) and Vegetables `Apricot` would sort `Apricot` second globally if mis-grouped; assert the `Fruits` rows precede `Vegetables` rows |
| 5 | a better match in the second group does not jump the first | `"ca"` with `Calendar` in `Work` before `Camera` in `Devices` keeps `Work` first |
| 6 | a group with no match disappears | query matching only `Fruits` omits `Vegetables` rows and its run |
| 7 | an empty/blank query keeps declaration order | same array identity/order as input |
| 8 | `visibleOptions(..., filter=false)` keeps the caller's order | unchanged |

### 7.2 Native (`src/behaviour/combobox.test.tsx`)

Fixtures: grouped options `Fruits` (`Apple`, `Apricot`) then `Vegetables`
(`Artichoke`), and the existing `Picker` with `optionList` set to them.

| # | Case | Assertion |
| - | ---- | --------- |
| 1 | **one heading per group, in declaration order** | open; `getAllText()` has `Fruits` before `Apple` and `Apricot`, then `Vegetables` before `Artichoke`; each heading appears once |
| 2 | **ranking is within the group** | type `"ap"`; both `Fruits` rows precede `Vegetables`; a query that matches only one group hides the other heading |
| 3 | **grouped rows select by value** | ArrowDown + Enter on a grouped option reports its value and closes; the trigger shows the label |
| 4 | **the create row is ungrouped** | with `onCreate` and a matching group, the create row appears after the last group with no extra heading, and Enter still reports the query |

Read headings through `getAllText()` order (the suite already uses
`indexOf` for ranking). If `role="group"` appears in the a11y dump, also assert
two group nodes named `Fruits`/`Vegetables`; do not require it if §9's STOP
condition fires.

### 7.3 Two-direction proofs (each mutation applied alone, then restored)

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | `filterOptions` returns the global `Arr.sort(ranked, …)` order again | logic 5, native 2 and 4 |
| M2 | render no heading element in `ComboboxList` | native 1–4 |
| M3 | split every row into its own run (`runsBy` never merges) | logic 2/5/8, native 1–4 |
| M4 | put the create row before the ranked matches | native 4 and the two existing create cases |

Record the exact failing assertion for each in §10.

## 8. STOP conditions

Stop and report with evidence rather than improvising:

- The native suite cannot load the renderer (`unsupported-host`): the host lost
  its binding. Report the preflight; do not mark the plan landed.
- Rendering `rows` as `children` of the headless list breaks item registration,
  highlight or Enter: record the rendered tree and the failing case. Then STOP —
  do not fall back to a second, private selection implementation.
- `role="group"`/`aria-label` does not reach the a11y dump: keep the visible
  heading, drop the role, record the measured fact in §10 and on the docs page
  (the heading is visual, like `MenuLabel`). This is a documented limitation, not
  a failure of the plan.
- The existing 28 native cases regress for a reason unrelated to grouping: stop;
  the change is out of scope until explained.
- `nub run check`/`lint`/`test` fail outside this plan's files: report the
  failure, do not edit another workstream's paths.

## 9. Acceptance criteria

- `ComboboxOption.group` is documented, typed and exercised by both suites.
- Headings render once per contiguous run, disappear with their last match, and
  never attach to the create row.
- Ranking within a run is proven by a test that fails on the old global sort.
- Grouped rows select, highlight and create exactly as ungrouped rows did.
- `COMPONENTS.md`, `docs/combobox.mdx`, the example, the inventory record and
  the plan index agree on the behaviour and the native count.
- `nub run check`, `nub run lint`, `nub run test` and
  `nub run --filter @gpuixui/components test:behaviour` pass on this host.

## 10. Measured facts after implementation

Implemented on 2026-10-18.

**Suites.** Unit **389** (383 before: +6 grouping cases in
`src/combobox/logic.test.ts`, which now has 27 cases), behaviour **616** across
49 files (611 before: +5 in `src/behaviour/combobox.test.tsx`, now 33). The
inventory checks hold `COMPONENTS.md` and `docs/combobox.mdx` to that 33.

**Group nodes.** `role="group"` and `aria-label` on the GPUix group `div` do
reach the a11y dump: the native case reads exactly two nodes named `Work` and
`Devices`, in order. No limitation was needed; the §9 fallback did not fire.

**Rendering mode.** Passing `rows` as nodes to the headless `ComboboxList`
(the second documented mode) keeps item registration intact: the existing
keyboard, pointer, create and focus cases all still pass, and the grouped case
selects `calendar` by value after typing `ca` and pressing Enter.

**Ranking.** With `Work` (`Vacation` rank 2, `Calendar` rank 0) declared before
`Devices` (`Camera roll` rank 0), query `ca` renders
`Calendar → Vacation → Camera roll`. The old global sort rendered
`Calendar → Camera roll → Vacation`, splitting the sections. The pure case and
the native case fail on that mutation.

**Mutations** (each applied alone, the named suites run, the file restored):

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | global `Arr.sort(ranked, …)` in `filterOptions` | exit 1 — logic `ranks inside a run …` fails; native `ranks inside a group …` and `keeps the create row ungrouped …` fail (2 of 33) |
| M2 | no heading element rendered | exit 1 — all four grouping native cases fail |
| M3 | every row its own run | exit 1 — 5 logic cases and 4 native cases fail (headings repeat; selection order breaks) |
| M4 | create row prepended | exit 1 — 3 native cases fail, including the grouping create case |

**Gates.** `nub run check-types`, `nub run test` (389), `nub run test:behaviour`
(616), and the root `check`/`lint`/`test` gates pass on this host.

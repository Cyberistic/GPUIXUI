# 378 — Tier 5 feasibility: a filter-rule builder over a virtualized table

**Status:** planned 2026-10-18 · **Phase:** D/E · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `158`, `159`, `166`, `188`,
`338`, `349`, `350`, `377`.

> Numbering: `376` (multi-pane editor) and `377` (data toolbar) are this
> workstream's last plans; `351`–`375` belong to the components and tokens
> workstreams, so this plan takes `378`.

## 1. Why this plan exists

`COMPONENTS.md` still carries the Tier 5 row **Advanced filtering / query
builders** with `GPUix support: ?` and no runtime evidence. Every nearby probe
composed a *single* filter control (`data-grid-virtual`, `data-toolbar`,
`property-panel`); none has built a rule list, and three questions are open:

1. Does a rule row compose **three native `Select`s** (field, operator, enum
   value) inside a **scrolled** builder strip — do the popups anchor to their
   trigger, paint outside the clip and still commit?
2. Can component code **focus and reveal a rule it just appended** (the editor
   contract: a new row must be usable from the keyboard without a click)?
3. Does one derived predicate drive a **virtualized result table** — counts,
   empty state, anchor reset and selection reset — when the rule list is edited
   in place?

The builder's own semantics also need a contract: what happens when a field
changes type, what an incomplete rule means, how `all`/`any` combine, and which
operators each field kind exposes. Those are pure rules, so they belong in a
model module with unit tests, not in the view.

This plan changes **no package code** (only the capability literal).

## 2. What will be proven

Capability: `query` (new). Scenario: `query-builder`; live twin:
`live-query-builder`.

Fixture: 120 rows `{ id, name: "Item <id>", status: id % 3, owner: id % 4,
score: id % 100 }` with `status ∈ {active, paused, archived}` and
`owner ∈ {Ada, Grace, Linus, Margaret}`. Counts are hand-computed below.

View: a 780 px frame — a 40 px toolbar, a 132 px rule strip (scrolls after
three rules), a 28 px table header, a 360 px `<virtual-list>` and a readout.

| Area | Check |
| ---- | ----- |
| toolbar | 40 px; `Toolbar:Query` to assistive technology; `Filters` toggle, `all`/`any`, add, clear, `matched=<n>` |
| builder | opening paints a 132 px strip under the toolbar; `Group:Filters`; each rule row is a named `Group` |
| rule controls | a rule is one 40 px row: field `Select`, operator `Select`, value control, remove button |
| field types | `name` → `contains`; `status`/`owner` → `is`; `score` → `>`; the operator list follows the field |
| re-type | changing a rule's field resets its operator and value (a stale operator is not carried across) |
| completeness | an empty value makes the rule **incomplete** and it is ignored by both `all` and `any` |
| status | `status is paused` → **40** rows, the first paused row at the viewport top, row 0 unpainted |
| text | `name contains item 1` (case-insensitive) → **31**; `name is item 1` → **1**; `name is zzz` → **0** |
| number | `score > 80` → **19**; `>= 80` → **20**; `< 10` → **20**; a non-numeric value matches nothing |
| enum | `owner is Ada` → **30**; `owner is not Ada` → **90** |
| combinator | `status is paused` **and** `name contains item 1` → **12**; switching to `any` → **59** |
| incomplete ignored | one complete rule + one empty rule gives the same count under `all` and under `any` |
| empty state | zero matches paints `qb-empty` and no result rows |
| result window | the result list paints a window; a row past the window is unpainted |
| reset | a rule edit resets the anchor to 0 and clears the selection; the first match sits at the top |
| append | `add` appends a rule, **reveals** it in the strip and **focuses its value control** |
| scrolled strip | four rules: the appended row sits inside the strip and the first row is scrolled above it (a clipped rule keeps bounds — geometry, not paint) |
| select in a scroller | a field `Select` opened from the scrolled strip paints its items past the clip and commits on an item click |
| dismissal | Escape from a rule control closes the strip and returns focus to the toggle; reopening keeps the rules |
| summary | a `<text>` summary names the complete rules, e.g. `status is paused and name contains item 1` |
| live | a real open, field/value choice, typing, add, `any`, numeric rule, empty state and Escape |

The probe does **not** re-measure overlay placement, wheel signs, virtual-list
windowing or selection paint; it composes measured primitives and records the
builder's own rules.

## 3. Files

Create:

- `apps/playground/src/scenarios/query-model.ts` — fields, operators,
  completeness, predicate, summary, the 120-row fixture. Pure; no runtime.
- `apps/playground/src/scenarios/query-model.test.ts` — the unit tests in §6.1.
- `apps/playground/src/scenarios/query-builder.tsx` — the view and the
  `query-builder` scenario.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and
  add `"query"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"query"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add
  `live-query-builder`, append it to `liveScenarios`.
- `apps/playground/README.md` — a `## Query builders (plan 378)` section and the
  new files under `Structure`.
- `COMPONENTS.md` — the `query` capability row; measured evidence on **Advanced
  filtering / query builders** (status stays `todo`) and a qualifier on
  **Filtering controls**.
- `TODO.md` — tick the new playground task with the measured counts.
- `PLAN.md` — a decision row (the builder contract).
- `.agents/slop/plans/README.md` — this plan's row; the next free number is
  `379`.

Do **not** change the shell, `SplitPane`, the smoke runner, any package
behaviour or `apps/docs`.

## 4. The model (`query-model.ts`)

```ts
export type Field = "name" | "status" | "owner" | "score";
export type Operator = "contains" | "is" | "isNot" | "gt" | "gte" | "lt" | "lte";
export type Combinator = "all" | "any";
export interface Rule {
  readonly key: number;                  // React identity only
  readonly field: Field;
  readonly op: Operator;
  readonly value: Option.Option<string>;
}
export interface Row {
  readonly id: number; readonly name: string;
  readonly status: string; readonly owner: string; readonly score: number;
}
```

Exports (all pure, Effect modules only — `Arr`, `Option`, `Match`, `Order`,
`Str`, no native loops):

- `STATUSES`, `OWNERS`, `FIELDS`, `OPERATORS`;
- `kindOf(field)` → `"text" | "enum" | "number"`; `operatorsFor(field)`;
  `defaultOperator(field)`; `fieldLabel(field)`; `operatorLabel(op)`;
  `fieldOptions(field)` → `Option<ReadonlyArray<string>>` for enum fields;
- `defaultRule(key, field)` → that field's first operator and no value;
- `retype(rule, field)` → `defaultRule(rule.key, field)` (operator and value
  reset, key kept);
- `isComplete(rule)` → the value exists and is non-empty after trimming;
- `matchesRule(row, rule)`; `matchesAll(combinator, rules, row)`;
- `filterRows(rows, combinator, rules)` (order preserved);
- `completeCount(rules)`; `summarizeRule(rule)`; `summarize(combinator, rules)`
  → `"none"` when nothing is complete;
- `rowAt(id)` and `INITIAL_ROWS` (120 rows).

Semantics, fixed here so the tests are unambiguous:

- Text `contains` and `is` are **case-insensitive**; `is` is exact after
  trimming; `isNot` is its negation.
- Enum `is` compares the stored label exactly (`paused`, `Ada`); `isNot`
  negates it.
- Numeric `gt`/`gte`/`lt`/`lte` compare `Number.parseFloat`; a value that does
  not parse matches **no** row (and is still "complete" — a builder may flag it,
  but the predicate cannot guess).
- `matchesAll` ignores incomplete rules; with none complete every row matches,
  for both combinators.

## 5. The view (`query-builder.tsx`)

Constants: `FRAME_WIDTH = 780`, `TOOLBAR_HEIGHT = 40`, `BUILDER_HEIGHT = 132`,
`RULE_HEIGHT = 40`, `RULE_GAP = 4`, `HEADER_HEIGHT = 28`, `ROW_HEIGHT = 28`,
`VIEWPORT_HEIGHT = 360`, `ROW_COUNT = 120`,
`COLUMNS = [["name", 300], ["status", 160], ["owner", 160], ["score", 160]]`.

Local `Picker` component (one per select): a controlled `Select` with `items`
(for labels), a `SelectTrigger` carrying the given `testId` + `aria-label`, and
a `SelectContent` whose items are `${testId}-item-${value}`; `value` is an
`Option<string>` and `placeholder` names the empty state.

State: `open` (default false), `rules` (one incomplete `status` rule at rest),
`match` (`all`), `selected: Option<number>`, `anchor`, and a monotonic `nextKey`.

Layout, top to bottom:

1. **Toolbar** `qb-toolbar`, `role="toolbar"`, `aria-label="Query"`, 40 px:
   `qb-toggle` (`filters` — the complete count in the label), `qb-match-all`,
   `qb-match-any`, `qb-add`, `qb-clear`, `qb-matched` text, and the readout.
2. **Builder** `qb-builder`, `role="group"`, `aria-label="Filters"`, always
   mounted at 132 px so its geometry is assertable; when `open` is false it
   paints a muted 132 px placeholder row (`qb-closed`) and no rules. Its
   `onKeyDown` closes on `escape` and focuses `qb-toggle`.
3. **Rule strip** `qb-rules`: `height: 132`, `overflowY: "scroll"`. Rule rows are
   `qb-rule-${index}`, `role="group"`, `aria-label="Rule <index + 1>"`, 40 px,
   `flexShrink: 0`, in a column with `RULE_GAP`:
   - `qb-rule-${i}-field` — `Picker` over `FIELDS`;
   - `qb-rule-${i}-op` — `Picker` over `operatorsFor(rule.field)`;
   - `qb-rule-${i}-value` — a `Picker` for an enum field, otherwise an `<input>`
     with `aria-label="Value"` and `placeholder="value"`;
   - `qb-rule-${i}-remove` — a `Pressable` labelled `x`.
   A field or operator change calls `retype`; a value change stores
   `Option.some` when non-empty, `Option.none` otherwise. Every change calls
   `changeQuery`, which clears the selection and resets the anchor.
   `qb-rules-empty` paints `no rules` when the list is empty.
4. **Append focus**: `add` appends `defaultRule(nextKey, "name")` and records
   the new index in a `focusRule` state; an effect on `[rules, focusRule]`
   looks the value control up in a `Map<string, PublicInstance>` ref, calls
   `renderer.scrollIntoView(node.id)` then `renderer.focusElement(node.id)`,
   clears `focusRule`, and does nothing if the node is absent (a closed strip).
   `remove` drops the rule at its index.
5. **Header** `qb-header` (28 px) with `qb-head-<column>` cells at the widths.
6. **Results** `qb-viewport` (780 × 360): when `matched` is 0, `qb-empty`
   paints `No matching rows`; otherwise `<virtual-list testId="qb-list">` with
   the filtered rows, each `qb-row-${id}` (`role="row"`, `aria-selected`,
   accent when selected, click toggles `selected`) and four cells.
7. **Summary** `qb-summary` — `summarize(match, rules)` as its own `<text>` (the
   readout is space-separated, so a sentence does not belong in it).
8. **Readout** `qb-state` —
   `open=<bool> rules=<n> complete=<n> matched=<n> match=<all|any>
   selected=<none|id> anchor=<n>`.

The anchor rule is plan `377`'s: `changeQuery` calls `scrollToItem(list, 0)`
and mirrors `0` into `anchor`; `onVisibleRange` re-reads `getListScrollTop` when
it fires. A rule edit is a row-set change: the selection clears.

## 6. Steps for the executor

1. Read this plan, then `query-model.ts`'s closest relatives —
   `data-toolbar.tsx` (derived filtering + anchor reset), `data-grid-model.ts`
   (pure model + test shape), `popups.tsx` (`Select`/`SelectContent` usage) and
   `property-panel.tsx` (an editor inside a scrolled virtual list).
2. Write `query-model.ts` and `query-model.test.ts`. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the new unit tests pass. A failing count means the
   fixture or the semantics changed — fix the code, not the test.
3. Write `query-builder.tsx`; register it and add the capability literal. Run:

   ```sh
   nub run --filter playground check-types
   ```

   Expected: exit `0`; `scenarioProblems` reports nothing.
4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only query-builder
   ```

   Expected: `1/1 scenarios passed`, exit `0`, `query=verified`. A miss reports
   the readout, the bounds or the focused id — fix the state rule; never widen a
   tolerance past 2 px.
5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `84/84 scenarios passed`, exit `0`; record the check total.
6. Add `live-query-builder` (`view: queryBuilderScenario.view`,
   `ready: "qb-state"`) with `settle` after every click/selection and
   `waitForText` after state changes. Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `35/35 scenarios passed`, exit `0`, one screenshot. The live step
   may not assert style or the a11y dump (plan `197`).
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0` (`nub run fmt:fix` if the formatter complains).
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, `PLAN.md`
   and the plan index with the measured counts and any surprise. Commit the
   plan first, then the model, then the probe.

## 7. Test plan

### 7.1 `query-model.test.ts`

| # | Test | Must fail if |
| - | ---- | ------------ |
| U1 | `defaultRule` picks `contains` for name, `is` for status/owner and `gt` for score, always with no value | the default operator is hard-coded to one kind |
| U2 | `retype` keeps the key, resets operator **and** value | the old operator survives a field change |
| U3 | `isComplete`: empty, whitespace and `None` are incomplete; text is complete | trimming is dropped |
| U4 | `contains` is case-insensitive (`ITEM 1`, `item 1` agree) and `is` is exact after trim | text matching is case-sensitive |
| U5 | `isNot` inverts `is`, for text and enum | negation is ignored |
| U6 | numeric `gt`/`gte`/`lt`/`lte` boundaries (80/81) and a non-numeric value matching nothing | `>` includes its bound, or a bad value matches everything |
| U7 | 120-row fixture counts: paused 40, `item 1` 31, `item 1` exact 1, score > 80 = 19, >= 80 = 20, < 10 = 20, owner Ada 30, not Ada 90, paused AND item 1 = 12, paused OR item 1 = 59 | the predicate or the fixture drifts |
| U8 | incomplete rules are ignored under **both** combinators (one complete rule gives the same count; two incomplete rules match every row) | `any` treats an empty rule as a wildcard |
| U9 | `summarize` joins the complete rules with `and`/`or`, keeps source order and returns `none` for none complete | incomplete rules leak into the sentence |
| U10 | `filterRows` preserves the fixture's id order | the result is reordered |

Every test compares against a hand-computed literal (`40`, `59`, …) — not
against another call of the function under test.

### 7.2 The scenario (mutation proofs)

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the value choice does not update the rule | "choosing a status narrows the rows" |
| M2 | a field change keeps the old operator/value | "re-typing a rule resets its operator" |
| M3 | `any` is treated as `all` | "any widens the result" |
| M4 | an incomplete rule matches every row under `any` | "an incomplete rule is ignored under any" |
| M5 | `add` does not focus the new value control | "the appended rule takes focus" |
| M6 | `add` does not reveal the appended row | "the appended row is inside the strip" |
| M7 | a rule edit keeps the selection / the anchor | "a rule edit clears the selection" |
| M8 | zero matches still renders rows | "the empty state replaces the rows" |
| M9 | the numeric operator ignores its bound | "gte includes the bound" |
| M10 | Escape does not return focus to the toggle | "escape closes the strip" |

Reverse proof (consumer wiring): the remove button's handler removed → "remove
drops the rule" fails.

Run each with `--only query-builder`, record the exact failure, revert.

### 7.3 Two-direction checks by hand

- Full headless `84/84`, live `35/35`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 8. STOP conditions

- **A `Select` opened from the scrolled strip is clipped** (its content paints
  nothing, or its items are unreachable). Record the measured bounds; if the
  content is clipped, move the builder out of a scroller (a fixed three-rule
  builder) and amend §5 and the checks — do **not** add a portal (0.10.0 has no
  `createPortal`).
- **The appended rule cannot be revealed** (`scrollIntoView` is a no-op inside
  the strip). Read `getScrollOffset` for the strip and record both; the builder
  may need `scrollTo`.
- **A focus effect on a just-appended row does not run** because the node does
  not exist in the same commit. Defer one frame (`requestAnimationFrame` or a
  second effect pass) and record it; do not focus the row container instead.
- **The field `Select` cannot be controlled per row** (its open state leaks
  between rows). Give each `Picker` its own `open` state (the plan's shape) and
  record the failure of any shared state.
- **A text `is` comparison must be case-sensitive** to match the title-case
  fixture. Record the decision; do not add a second operator.
- **A clipped rule row loses its bounds.** Then assert its absence instead and
  amend §5/§2; the measurement is the finding.
- **A check needs a tolerance above 2 px** or a screenshot. Stop; that is a
  mechanism question.
- **A file outside §3 must change.** Stop and write the task in `TODO.md`.
- The suites are not `84/84` headless and `35/35` live, exit `0`. Stop and
  report the failing scenario.

## 9. Measured results

_Filled in by the executor after the run._

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `query-builder` (headless) | — | — |
| `live-query-builder` | — | — |

## 10. Acceptance

- `query-model.ts` + its tests, `query-builder.tsx`, the registry entry, the
  capability literal, the live twin, the README section, the inventory rows and
  the plan-index row.
- Headless `84/84`, live `35/35`, exit `0`; all three gates exit `0`.
- Ten mutation proofs and one reverse proof recorded in §9.
- No package changed; any defect is a `TODO.md` task with its own plan number.

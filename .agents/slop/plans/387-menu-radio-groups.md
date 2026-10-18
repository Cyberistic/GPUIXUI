# 387 — Menu radio groups: one selection per group

**Status:** done 2026-10-18 · **Phase:** C/F · **Workstream:** components
(`packages/components`)

**Depends on:** `110`, `114`, `131`, `135`, `200`, `201`, `323`, `382`.

## 1. Why this plan exists

The Tier 2 menu family has every row shape except the single-choice one:

| Row | Present | Behaviour |
| --- | ------- | --------- |
| `MenuItem` | yes | runs an action and closes |
| `MenuCheckboxItem` | yes | toggles independently and stays open |
| `MenuSub` / `MenuSubTrigger` | yes | opens a secondary level |
| **single-choice row** | **no** | one value out of a group, stays open |

That is the standard desktop menu pattern for *Sort by*, *View mode*, *Theme* and
*Density* — mutually exclusive settings inside one menu. Today a consumer has to
fake it with `MenuCheckboxItem`s and a callback that unchecks its siblings,
which permits an invalid state (none or several checked) and duplicates the
exclusive rule at every call site. It is also the last row shape `base-gpui`'s
menu contract has that ours does not (`docs/component-api.md` §8).

**Measured runtime constraint.** `@gpuix/react@0.10.0` exposes no
`aria-checked`; AccessKit maps `aria-selected` (verified in `COMPONENTS.md` →
"Cross-cutting"). `MenuCheckboxItem` already announces through
`aria-selected` + a leading mark, and a radio row follows the same honest
substitute with `role="menuitemradio"`. The single-choice rule is enforced by a
group context, not by the caller.

## 2. What "done" means

- `MenuRadioGroup` owns one selected value and renders a labelled
  `role="group"`; `MenuRadioItem` reports a **changed** selection and stays
  open.
- The group is **controlled-only**: `value` + `onValueChange`, exactly like
  `MenuCheckboxItem`'s `checked` + `onCheckedChange` (the caller owns the state
  that the rest of the app reads).
- Dropdown and Context menus expose the parts under their family names
  (`DropdownMenuRadioGroup`, `DropdownMenuRadioItem`,
  `ContextMenuRadioGroup`, `ContextMenuRadioItem`).
- A radio group composes inside a menu surface **and** inside a submenu
  (`MenuSubContent`).
- Each radio row registers like every other row, so arrow keys, Home/End,
  type-ahead, disabled skipping, Escape and outside presses need no new rules.
- A new native behaviour suite proves selection, exclusivity, the kept-open
  contract, disabled rows, the accessible role/state and keyboard activation.
- The example, both docs pages, the API tables and the `COMPONENTS.md` rows
  describe the real parts; the test counts stay truthful.

**Out of scope.** No `defaultValue`/uncontrolled group (the checkbox row is
controlled too); no `aria-checked` (runtime lacks it); no `aria-posinset`; no
nested radio groups; no new icon glyph (see §5).

## 3. Files

### 3.1 New: `packages/components/src/menu/radio.tsx`

- `MenuRadioGroupProps extends Omit<Props, "children">`
  - `value: string | null` (required, controlled)
  - `onValueChange: (value: string) => void` (required)
  - `label?: string` — becomes `aria-label`; omit it and a caller should use
    `MenuLabel` above the group, exactly as with `MenuGroup`
  - `children?: PartChildren`
- `MenuRadioGroup` renders
  `<div role="group" aria-label={label} style={{display:"flex",flexDirection:"column",gap:theme.spacing["2xs"]}}>`.
  It provides `{ value, select }` through a module-local context. Throws
  `"Menu radio parts must be used inside a MenuRadioGroup"` outside one.
- `MenuRadioItemProps extends Omit<MenuItemProps, "leading" | "style">`
  - `value: string` (required)
  - `style?: StateStyle<MenuRadioItemState>`
- `MenuRadioItemState { checked: boolean; disabled: boolean; highlighted: boolean }`
  (`highlighted` is read from the shared `activeId`, with the same ref pattern
  `MenuCheckboxItem` uses).
- `MenuRadioItem` composes `MenuItem` with:
  - `role="menuitemradio"`, `aria-selected={checked}`,
    `testId` passthrough (the caller names the row),
  - `closeOnSelect={false}`,
  - `onSelect={() => { onSelect?.(); select(value); }}` — the caller's handler
    composes first, exactly like the checkbox row,
  - a leading slot fixed at `theme.iconSize.md` containing a 6 px
    `borderRadius: theme.radius.full` dot in `theme.colors.accent` when checked,
    empty otherwise,
  - `style={resolveStyle(style, { checked, disabled, highlighted })}`.
- A `menuRadioGroup` parts contract accepting only `MenuRadioItem` with hint
  `"Put MenuRadioItem rows directly inside MenuRadioGroup."`

Use `assertParts`, `PartChildren`, `type PartComponent`, `type PartsContract` —
the same imports every other part family uses.

### 3.2 Modify: `packages/components/src/menu/sub.tsx`

- Import `MenuRadioGroup` and `MenuRadioItem` from `./radio.js`.
- Add both to `subParts` (the family list used to name a misplaced part).
- Add `MenuRadioGroup` to `menuSubContent.accepts` (after `MenuGroup`).

### 3.3 Modify: `packages/components/src/dropdown-menu.tsx`

- Import `MenuRadioGroup`, `MenuRadioItem` from `./menu/radio.js`.
- Add them to `dropdownParts` and to `dropdownContent.accepts`.
- Re-export the aliases and types beside the checkbox pair:
  `MenuRadioGroup as DropdownMenuRadioGroup`,
  `MenuRadioItem as DropdownMenuRadioItem`,
  `MenuRadioGroupProps as DropdownMenuRadioGroupProps`,
  `MenuRadioItemProps as DropdownMenuRadioItemProps`,
  `MenuRadioItemState as DropdownMenuRadioItemState`.
- `dropdownMenuMeta.limitations`: add the truthful sentence
  `"the radio row uses aria-selected and a dot because 0.10.0 has no aria-checked"`.

### 3.4 Modify: `packages/components/src/context-menu.tsx`

Do the same five edits with the `ContextMenu…` names. Read the existing
checkbox block first; copy its shape exactly.

### 3.5 Modify: `packages/components/examples/dropdown-menu.example.tsx`

Add a `Sort by` radio group to the existing menu (Name / Modified / Size) with
`useState` for the selected value and a readout row that names it, so the
example exercises the public path and a native mount sees the chosen row.

### 3.6 Tests

**`packages/components/src/behaviour/dropdown-menu.test.tsx`** — extend the
header comment with the new bugs guarded, add a fixture `WithRadioGroup` and
these cases (all `it(` at two spaces, so the inventory count sees them):

1. `marks exactly one radio row and reports the value` — open the menu, press
   the second radio row, assert `aria-selected` true on it, false on the first,
   `onValueChange` called once with its value, and the menu still open.
2. `keeps a controlled radio group on the caller's value` — pass `value`
   fixed to the first row and select the second; assert the callback fires and
   the first row is still the marked one.
3. `selects a radio row with Enter and Space` — focus a row, press Enter; then
   Space on another row; both report; the second press marks only that row.
4. `skips a disabled radio row` — arrows skip it, Enter on it reports nothing,
   its `aria-selected` stays false.
5. `announces the radio row as a menuitemradio with its selected state` — read
   the accessibility dump (`src/internal/a11y.ts` helper used by other suites)
   and assert the role and selected flag, or the authored `role`/
   `aria-selected` custom props as the fallback the checkbox row uses.
6. `works inside a submenu` — open a submenu containing a radio group, select
   a row there; the submenu stays open, the value reports, and `Escape` closes
   one level.
7. The "exactly one mark" assertion is part of case 1 (it counts the checked
   rows), so no separate case duplicates it.

**`packages/components/src/behaviour/context-menu.test.tsx`** — one case:
`runs a radio row from the pointer and keeps the menu open` (right click,
click the second row, assert the callback and the kept-open state).

No pure-logic module is created: the exclusive rule is one equality in the
group context, and inventing a `radio/logic.ts` for it would be a second place
for the same truth. If the implementation grows real arithmetic, stop and
report instead of adding dead abstractions.

### 3.7 Docs and inventory

- `packages/components/docs/dropdown-menu.mdx`
  - `## Anatomy` parts table: add `DropdownMenuRadioGroup` and
    `DropdownMenuRadioItem` (the `## API` table must name them — the inventory
    check requires every §8 part on the page).
  - `## Checkbox rows and tones` → add a paragraph (or a sibling
    `## Radio rows` section) stating: controlled-only, stays open, one marked
    row, `aria-selected` instead of `aria-checked`, no uncontrolled default.
  - `## Keyboard`: state that radio rows take the same arrows/Home/End/
    type-ahead/Enter/Space path.
  - `## Verification`: update the stated native count from `36` to the new
    suite count.
- `packages/components/docs/context-menu.mdx` — add both rows to its parts/API
  tables, a sentence on the kept-open radio behaviour, and its new native count
  (the page's verification line must match the suite).
- `docs/component-api.md` §8 — add the two parts to both the `Dropdown` and
  `Context` rows, in the same backticked style.
- `COMPONENTS.md` — in the `Dropdown menus` and `Context menus` rows, name the
  radio group/row and the new native count; keep the existing limitation text
  and append the `aria-checked` sentence where the checkbox sentence already
  lives.
- `packages/components/src/inventory.ts` is generated from the meta records in
  `inventory.ts`; confirm it needs no hand edit (it re-exports the `*Meta`
  objects). If it does, update the two records there instead of editing both
  copies.
- No new example module: the existing `dropdown-menu` example gains the radio
  group, so the example registry and `src/behaviour/examples.test.tsx` stay
  one-to-one.

## 4. Commands and expected results

Run from `packages/components` unless stated.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run check-types` | exit 0; no new casts, no `any` |
| 2 | `nubx vitest run --config vitest.behaviour.config.ts src/behaviour/dropdown-menu.test.tsx src/behaviour/context-menu.test.tsx` | all cases pass, including the new ones; the menu suites' existing cases stay green |
| 3 | `nub run --filter @gpuixui/components test` | all unit files pass; the new native counts are not part of this run |
| 4 | `nub run --filter @gpuixui/components test:behaviour` | the whole native suite passes, including the new cases |
| 5 | `nub run check` (repo root) | exit 0 — `check:tests`, lint, format, type-check |
| 6 | `nub run lint` (repo root) | exit 0 |
| 7 | `nub run test` (repo root) | exit 0 |

A command that was not run did not pass. Record the real counts in `TODO.md`,
`COMPONENTS.md` and the two pages; never round them.

## 5. Decisions and recorded limitations

- **No new icon glyph.** `@gpuixui/icons` has no filled circle and owns its own
  list (`packages/icons` is another workstream). The radio mark is a 6 px
  token-coloured dot in the existing `iconSize.md` slot. Record in
  `COMPONENTS.md` only if the limitation is material; it is not a capability
  gap.
- **`role="menuitemradio"` with `aria-selected`.** 0.10.0 has no
  `aria-checked`, so the state cannot be announced as a native radio. This is
  the same measured substitute the checkbox row uses; the docs say so.
- **Controlled-only.** An uncontrolled `defaultValue` would add a second
  selection owner for a component whose consumer always reads the chosen sort
  order. The contract allows controlled-only where the state belongs to the
  caller (see `ConfirmDialog`, `CommandMenu` in §2 of
  `docs/component-api.md`).
- **Radio rows do not close the menu.** Selecting a view mode is a setting, not
  an action; the same rule as checkbox rows.

## 6. STOP conditions

Stop and report with evidence instead of improvising if:

- `role="menuitemradio"` is not exposed in the accessibility dump **and** the
  authored `role`/`aria-selected` props are dropped from `customProps`, so the
  row cannot be named or asserted at all.
- `MenuItem`'s registry or the surface's key handling refuses a row nested one
  level deeper under a group (arrows or type-ahead stop working). Report the
  failing case; do not rewrite the menu core in this plan.
- `assertParts` rejects a radio group inside `MenuSubContent` after §3.2. Stop;
  the contract needs a decision, not a workaround.
- The native binding is unavailable on the host, so the behaviour suite cannot
  run. Record the exact `unsupported-host`/missing-binding output; do not mark
  any count or claim "done".
- The docs/inventory checks disagree about a part name or count and the fix is
  not one of the files listed above. Report the failing check rather than
  editing another workstream's files.

## 7. Test plan — proving the tests can fail

Before the implementation is complete, apply each mutation temporarily, run
the named case, observe the failure, and revert:

| Mutation | Must fail with |
| -------- | -------------- |
| `MenuRadioItem`'s `onSelect` drops `select(value)` | "marks exactly one radio row and reports the value" (`onValueChange` not called) |
| `closeOnSelect={false}` → `true` | the same case's "menu still open" assertion |
| The checked mark compares `!== group.value` | "marks exactly one radio row" (the other row is marked) |
| `menuRadioGroup.accepts` omits `MenuRadioItem` | the first native render throws the `assertParts` message |
| The group renders no `role="group"` (or drops `aria-label`) | "announces the radio row…" if the group was asserted; otherwise note that the mutation is not observable and choose a different accessible assertion |

Record every failure label in the plan's status line and in the commit message.
A mutation that fails for an unrelated reason is not a proof; fix and repeat.

## 8. Measured results

Ran 2026-10-18 against the locally built `darwin-x64` 0.10.0 binding
(ADR 0003):

| Command | Result |
| ------- | ------ |
| `nub run check-types` (components) | pass |
| `nub run --filter @gpuixui/components test:behaviour` | 567 passed (47 files); Dropdown 42, Context 19 |
| `nub run --filter @gpuixui/components test` | 374 passed (38 files) |
| `nub run check` / `nub run lint` / `nub run test` (root) | pass |

The radio row's `role="menuitemradio"` **is** exposed by the AccessKit dump, and
its `aria-selected` arrives as `selected`. The dump did not carry a row's name,
because 0.10.0 does not lift a `<text>` child into a menu item's accessible
name; `MenuItem` now names a plain-text row from its child and leaves a composed
row to `aria-label`. That one change covers every menu row, not only radios.

Also landed in the same change: one navigation-menu hover case (leaving an open
panel for another trigger switches panels), because the probe for the menu
pointer path measured that direction as untested. Navigation Menu is now 20
native tests; its docs and `COMPONENTS.md` row were updated with it.

### 8.1 Mutation proofs

Each mutation was applied, the named case run, and the file reverted.

| # | Mutation | Failing assertion |
| - | -------- | ----------------- |
| M1 | `MenuRadioItem` drops `group.select(value)` | `expected "vi.fn()" to be called 1 times, but got 0 times` |
| M2 | `closeOnSelect={false}` → `true` | `sort-modified` is no longer in the tree (`toBe(true)` on an undefined row) |
| M3 | `checked` compares `!==` | the second row is marked instead of the first (`toBe(true)`) |
| M4 | `menuRadioGroup.accepts` omits `MenuRadioItem` | the render throws `assertParts`, so the row is missing (`requireBounds`) |
| M5 | the group drops `role="group"` | the group's `customProps` are `undefined`, not `{ role: "group", "aria-label": "Sort by" }` |
| M6 | the `!checked` guard is removed, so a re-press reports again | `expected [ [ "modified" ], [ "name" ], [ "name" ] ] to deeply equal [ [ "modified" ], [ "name" ] ]` |

## 9. Acceptance

- [x] `menu/radio.tsx` exists with the two parts, a context and a parts contract.
- [x] Dropdown **and** Context menus export the group and row under their
      family names; both parts lists accept them; submenus accept the group.
- [x] The six native dropdown cases and the one context case pass on this host.
- [x] The radio row stays open and exactly one row is marked for a group value.
- [x] A disabled row is skipped and cannot select.
- [x] The example shows a real sort-order choice and is mounted by the existing
      example suite.
- [x] Both docs pages name every new part in `## API`; `docs/component-api.md`
      §8 and `COMPONENTS.md` agree with the exports; every stated test count
      matches the suite.
- [x] `nub run check`, `nub run lint` and `nub run test` pass at the repo root.
- [x] The plan index entry and `TODO.md` line are updated in the same commit.

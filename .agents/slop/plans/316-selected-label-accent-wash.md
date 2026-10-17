# 316 — The selected row's inherited label on the accent wash

**Workstream:** `tokens-theme` · **Phase:** F (truth and closure) · **Depends on:**
059, 071–095, 300, 306–315 · **Touches:** `packages/tokens`,
`docs/tokens.md`, `docs/design-system.md`, `packages/tokens/README.md`,
`COMPONENTS.md`, `TODO.md`, this index

## 1. The gap

Plan 312 set out to measure every text role a row paints on the washes it paints.
Its own §1 table names three fills for a selected row under the pointer:

| Painted by | Role | Fill |
| ---------- | ---- | ---- |
| `list.tsx` `ListItem` (selectable, hovered) | `foreground` (via `ListItemTitle`) | `accent` |
| `list.tsx` `ListItem` (selected) | `foreground` (via `ListItemTitle`) | `selected` |
| `list.tsx` `ListItem` (selected, hovered) | inherited `selectedForeground` | **`accent`** |
| `list.tsx` `ListItem` (selected, pressed) | inherited `selectedForeground` | `active` |

The shipped source agrees with the table: the selectable arm sets
`hover: { backgroundColor: theme.colors.accent }`, and only the child that sets
its own colour is the title. Any other child of a selected row inherits
`selectedForeground`, and the pointer changes the fill beneath it to `accent`.

The contract does not agree. Plan 312's §2 table and `rowTextPairs` added
`selectedForeground` on `hover` and `active` only. `wash-text.test.ts` repeats
the omission in the same breath as the claim — its header says
“`selectedForeground` on `accent`/`active`” while its list tests `hover` and
`active` — and `docs/tokens.md` states the composition correctly
(“`selectedForeground` on `accent`/`active`”) with no pair behind it. So a
copied platform style can edit `accent` until a selected row's inherited label
is 1.0:1 on a hovered row, and `themeContrastFailures` still returns `[]`. This
is the same class of untested claim plans 312, 314 and 315 closed for the title,
the `Select` option, the sidebar status dot, the row link and the canvas field.

The audit found the pair already passes every shipped set — the tightest is
**5.81:1** (macOS light) — so the fix adds the missing pair without moving a
colour. It takes `contrastPairs` from 247 to **248**.

## 2. Decision (do not re-litigate)

Add one pair to `contrastPairs`:

| Foreground | Background | Class | Why |
| ---------- | ---------- | ----- | --- |
| `selectedForeground` | `accent` | `secondary` | a selected row's inherited label while hovered |

`secondary` is the class plan 081 chose for `selectedForeground` on `selected`
and plan 312 reused for `hover`/`active`: a selected label is a highlight label,
not the body role. No colour value moves and no public export is added — the
pair joins the module-private `rowTextPairs` list.

## 3. Exact changes

### 3.1 `packages/tokens/src/contrast.ts`

In `rowTextPairs`, after the two `selectedForeground` entries, add:

```ts
["selectedForeground", "accent", "secondary"],
```

Extend the comment above the list: “a selected row under the pointer keeps its
inherited `selectedForeground` on the `accent` fill (`list.tsx`'s selectable
hover) as well as on `hover`/`active`.”

### 3.2 `packages/tokens/src/wash-text.test.ts`

1. Header comment: replace “keeps `selectedForeground` on `accent`/`active`”
   with “keeps `selectedForeground` on `accent`, `hover` and `active`”.
2. `rowTextPairs`: add `["selectedForeground", "accent", "secondary"]` after
   the existing `selectedForeground` entries, so the “exists once, in its
   intended class” and “clears the declared floor” cases cover it.
3. Add one regression case after “reports selected text erased while the row is
   hovered”:

   ```ts
   it("reports selected text erased on a hovered row's accent wash", () => {
     const light = getTheme("light");
     const regressed = extendTheme(light, {
       colors: { accent: light.colors.selectedForeground },
     });
     const failures = failureFor(regressed, "selectedForeground", "accent");

     expect(failures).toHaveLength(1);
     expect(failures[0]?.pairClass).toBe("secondary");
     expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
     expect(failures[0]?.ratio).toBeCloseTo(1, 4);
   });
   ```

### 3.3 `packages/tokens/src/contrast.test.ts`

The published pair-count case moves `247` → `248`.

### 3.4 `docs/tokens.md`

In the paragraph beginning “The other row text roles have their own pairs.”
(lines ~1365–1377):

- state that the inherited `selectedForeground` is painted on
  `accent`/`hover`/`active`, and that all three take the secondary floor;
- add the new tightest shipped figure — `selectedForeground` on `accent` at
  **5.81:1** (macOS light) — beside the existing `active` figure;
- append: “Plan `316` adds the `accent` pair, which the `list.tsx` selectable
  hover needs, taking `contrastPairs` from 247 to 248.”

Do not change the historical “These seven pairs take 232 to 239” sentence; it
describes plan 312.

### 3.5 `docs/design-system.md`

In §9's floor table, change the selected-row row to:

```
| selected row label (`selectedForeground` on `selected`, the `accent` wash a hovered selectable row paints and, while pressed, on `active`) | 4.5:1 | 7:1 |
```

It currently says “while hovered or pressed, on `hover`/`active`”, which omits
the fill `list.tsx` actually paints on hover.

### 3.6 `packages/tokens/src/docs.test.ts`

Update the pinned §9 row in “states the floors the contrast checker enforces”
to the exact sentence from §3.5 above (the row is asserted verbatim, with the
floor values interpolated from `contrastFloors`). No other pinned sentence
changes: the tokens.md paragraph this plan edits is not pinned verbatim, and
the body-text sentence plan 312 pinned stays true.

### 3.7 `packages/tokens/README.md`

In the contrast paragraph, change “a selected row's inherited
`selectedForeground` on the pointer washes are checked too” to name the three
fills — “on the `accent` wash a selectable row hovers and on the `hover`/`active`
pointer washes” — and add “(plan 316)” after the sentence.

### 3.8 `COMPONENTS.md`

- `Theme contrast check` row: `the same 247 contrast pairs` → `248`, and add one
  clause after the plan-312 sentence: the selected row's inherited label is
  measured on the `accent` fill a selectable row hovers as well as on
  `hover`/`active` (plan 316).
- `Design tokens` row: extend the row-label clause with the same three fills.

### 3.9 `TODO.md`

Add one row under “Design tokens and theming” and tick it:

`[x]` Hold a selected row's inherited label on the `accent` fill a selectable
row hovers — `list.tsx` paints `accent` on hover while the label keeps
`selectedForeground`, and plan 312 measured only `hover`/`active`, so an edited
theme could erase it while the checker returned `[]`; every shipped set passes
(5.81:1 at the tightest), so no colour moves and the contract grows 247 → 248
pairs (plan 316).

Move the progress bar from `83/109` to `84/110`.

### 3.10 `.agents/slop/plans/README.md`

Add a row for 316 in the tokens table and a closing paragraph recording the
gap, the one pair and the no-colour-moves result.

## 4. Commands and expected results

Run from the worktree root, in order:

| # | Command | Expected |
| - | ------- | -------- |
| 1 | apply §3.2 only, then `nub run --filter @gpuixui/tokens test -- wash-text` | **fails** on the missing `selectedForeground`/`accent` pair — this proves the test can fail |
| 2 | apply §3.1, re-run the same command | passes; the regression case reports one `secondary` failure at ratio 1 |
| 3 | `nub run --filter @gpuixui/tokens test` | all suites green, `contrastPairs.length` is 248 |
| 4 | `nub run check` | exit 0 — test inventory, lint, format and types |
| 5 | `nub run lint` | exit 0 |
| 6 | `nub run test` | exit 0 |

## 5. STOP conditions

Stop and report if:

- any shipped theme (identity, high contrast, the three platform styles in both
  modes, the two recipes in both modes) is below the 4.5:1 secondary floor on
  `selectedForeground`/`accent` — the audit says 5.81:1 is the minimum, so a
  failure means the premise is stale; do not move a shipped colour to satisfy a
  newly discovered pair without a separate decision;
- the source no longer paints a selected row's inherited label on `accent`
  (re-read `origin/agent/components`' `list.tsx` selectable arm; if the hover
  fill moved, record the real composition instead of adding a speculative pair);
- `selectedForeground`/`accent` already exists in `contrastPairs` — then the
  gap is elsewhere; report the duplicate instead of adding a second pair;
- satisfying the pair requires touching a consumer package, `contrastFloors`,
  or a colour value.

## 6. Test plan

- **Pair presence and class:** the existing “documents each painted pair once,
  in its intended class” case gains `selectedForeground`/`accent`; removing the
  pair from `contrastPairs` makes it fail.
- **Shipped floors:** the existing “clears the declared floor on every shipped
  set” case now measures the new pair across ten themes; a platform edit that
  darkens `accent` below the floor makes it fail.
- **Regression:** the new case sets `accent` to the light
  `selectedForeground`, so the pair is exactly 1.0:1; it asserts one failure,
  `pairClass: "secondary"`, the default secondary floor and the ratio. Removing
  the pair makes `failures` empty and the case fail — both directions are
  verified before the commit.
- **Count:** `contrast.test.ts` pins 248, so an accidental pair removal or a
  second addition fails.

## 7. Acceptance

- [x] `selectedForeground` on `accent` exists once as a `secondary` pair in
  `contrastPairs`; the public count is 248.
- [x] Every shipped theme clears it, and the new regression test proves the
  checker reports it when erased.
- [x] `docs/tokens.md`, `docs/design-system.md`, the README and `COMPONENTS.md`
  name the three pointer fills; the §9 row guard is updated.
- [x] `TODO.md` is ticked and its progress bar moved; this index records 316.
- [x] `nub run check`, `nub run lint` and `nub run test` pass in this worktree.

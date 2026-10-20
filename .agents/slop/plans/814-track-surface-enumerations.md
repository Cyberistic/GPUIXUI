# 814 — The value groove's surface list: three pages count twelve of thirteen

Status: ready to execute. Owner: `tokens-theme`. Depends on plans `347`, `503`,
`651`, `674`, `683`, `684`, `706`, `754`.

## 1. The defect

`track` is the unfilled groove of every value indicator. Its contract list is
`trackSurfacePairs`, built from `trackSurfaces` in
`packages/tokens/src/contrast.ts`:

```
background card popover muted            (4 base surfaces)
hover active accent selected selectedActive   (5 state washes)
infoSoft successSoft warningSoft destructiveSoft   (4 soft status fills)
                                              ── 13 pairs
```

Three present-tense documents enumerate that list, and all three stop at
twelve — they name the *persistent* `accent`/`selected` fills and the
`hover`/`active` washes, and omit the pressed `selectedActive` a chosen row
keeps under the pointer:

- `docs/tokens.md`, the catalogue paragraph that introduces the role
  (`Progress`, `Meter` and `Slider` …):

  ```
  It is measured on
  the four base surfaces, the persistent `accent`/`selected` row fills, the
  `hover`/`active` washes a row or a slider paints under the pointer and the four
  soft status fills an Alert or Badge provides, at 1.05:1 (`trackSurfacePairs`) —
  ```

- `docs/design-system.md` §8, the same sentence in the narrative:

  ```
  The role is
  measured on the four base surfaces, the persistent `accent`/`selected` row fills,
  the `hover`/`active` washes a row or a slider paints under the pointer and the
  four soft status fills a status panel provides, and its four progress fills are
  marks against it (plans `347` and `503`).
  ```

- `packages/tokens/README.md`, the front door:

  ```
  `trackSurfacePairs` holds it to 1.05:1 on the four base surfaces, the persistent
  `accent`/`selected` fills, the `hover`/`active` washes a row or a slider paints
  under the pointer and the four soft status fills a status panel provides, and
  ```

The fourth statement is the §8 **unchecked** row's parenthetical, which is
vague rather than wrong:

```
a switch that is off is the `track` groove (held to 1.05:1 on the four plain
surfaces, the row washes and the four soft status fills)
```

Why it matters:

- `selectedActive` joined the groove's contract in plan `651`, which added the
  pressed row fill to every row-surface list. A slider or progress bar inside a
  selectable list, table or tree row is pressed exactly while the reader drags
  it — the composition the pair exists for. A reader who trusts the enumeration
  has no reason to check the pressed fill before placing a value indicator in a
  row.
- `docs.test.ts` already holds the catalogue's **role table row** to
  `trackSurfacePairs` (`names the value indicator's groove and every mark
  painted on it`) and holds the §8 row as a whole (`missing("unchecked",
  surfaces)`), but neither reads the four clauses above. The §8 case passes
  today only because a *different* clause of the same table row — the disabled
  label — names `selectedActive`; the track clause itself does not, so the
  shotgun guard cannot see the omission. That is the class plans `683` and `684`
  closed for the chip and skeleton surface counts: a list grew, the prose kept
  the old size, and no case owned the sentence.

No colour, pair, floor, metric, role or shipped theme moves. The contract
already measures thirteen surfaces; the plan owns prose and a guard.

## 2. What the contract measures today

Derived on this tree with the package's own lists:

```
trackSurfacePairs.length   13
  base   4  background card popover muted
  state  5  hover active accent selected selectedActive
  soft   4  infoSoft successSoft warningSoft destructiveSoft

trackMarkPairs             5   primary success destructive mutedForeground
                               foreground (the off switch's knob, plan 733)
floor                      surface 1.05:1, unchanged at AAA
```

Every shipped set clears every pair (Linux light `track` on `active` is the
tightest at **1.050:1**; the catalogue already quotes it), so the palette does
not move.

## 3. Decision

1. Name all thirteen surfaces in the three enumerations, in the export's order,
   with the derived count (`thirteen surfaces`) and the three groups (four base,
   five state washes, four soft status fills). Naming the pressed fill is the
   correction; the count makes the sentence guardable.
2. Tighten the §8 track clause so it names the five state washes itself instead
   of deferring to "the row washes".
3. Add `packages/tokens/src/track-surface-claims.test.ts`, which derives the
   surfaces, the three groups and the count word from `trackSurfacePairs` and
   `statusTones`, reads the four clauses, and holds each one to them.
   - The new suite fails on this tree before the prose changes.
   - The clause-scoped §8 case is the one the existing whole-row guard could not
     be.

`trackSurfacePairs` is the owner. `trackSurfaces` is not exported and stays
private; the suite reads the published pairs, as every other contract consumer
does.

## 4. Files to change

1. `docs/tokens.md` — the catalogue's groove paragraph (§ *Status tones*).
2. `docs/design-system.md` — the groove paragraph in §8 and the `unchecked`
   row's track clause.
3. `packages/tokens/README.md` — the groove paragraph.
4. **create** `packages/tokens/src/track-surface-claims.test.ts`.
5. `.agents/slop/plans/README.md` — the plan row and a closing paragraph.
6. `TODO.md` — a ticked row, and the section counter.

No other file changes. In particular `contrast.ts`, `docs.test.ts` and
`track-contrast.test.ts` keep their current content: the existing cases stay
valid, they are only incomplete.

## 5. Step 1 — `docs/tokens.md`

Replace the sentence beginning "It is measured on" with:

```
It is measured on thirteen surfaces at 1.05:1 (`trackSurfacePairs`): the four
base surfaces (`background`, `card`, `popover`, `muted`), the five state washes
a row or a slider paints under the pointer (`hover`, `active`, `accent`,
`selected` and the pressed `selectedActive`), and the four soft status fills an
Alert or Badge provides — a groove that disappears in a hovered row, in a chosen
row under the press or inside a status panel erases an indeterminate indicator,
because the rail *is* the value while the reader interacts with it (plan `503`).
```

The rest of the paragraph — the rejected roles, the shipped values, the tightest
figures — is unchanged. Keep `(plan `503`)` on the corrected sentence; the
thirteen-surface split is `503`'s list plus `651`'s pressed fill.

## 6. Step 2 — `docs/design-system.md`

### 6a. The groove paragraph in §8

Replace

```
The role is
measured on the four base surfaces, the persistent `accent`/`selected` row fills,
the `hover`/`active` washes a row or a slider paints under the pointer and the
four soft status fills a status panel provides, and its four progress fills are
marks against it (plans `347` and `503`).
```

with

```
The role is
measured on thirteen surfaces at 1.05:1: the four base surfaces (`background`,
`card`, `popover`, `muted`), the five state washes a row or a slider paints
(`hover`, `active`, `accent`, `selected` and the pressed `selectedActive`) and
the four soft status fills a status panel provides, and its four progress fills
are marks against it (plans `347`, `503` and `651`).
```

### 6b. The `unchecked` row's track clause

Replace

```
a switch that is off is the `track` groove (held to 1.05:1 on the four plain
surfaces, the row washes and the four soft status fills)
```

with

```
a switch that is off is the `track` groove (held to 1.05:1 on the four plain
surfaces, the five state washes — `hover`, `active`, `accent`, `selected` and
the pressed `selectedActive` — and the four soft status fills)
```

Nothing else in the row changes; this table row is a single line in the source,
so the replacement is one clause inside it.

## 7. Step 3 — `packages/tokens/README.md`

Replace

```
`trackSurfacePairs` holds it to 1.05:1 on the four base surfaces, the persistent
`accent`/`selected` fills, the `hover`/`active` washes a row or a slider paints
under the pointer and the four soft status fills a status panel provides, and
```

with

```
`trackSurfacePairs` holds it to 1.05:1 on thirteen surfaces — the four base
surfaces (`background`, `card`, `popover`, `muted`), the five state washes a row
or a slider paints (`hover`, `active`, `accent`, `selected` and the pressed
`selectedActive`) and the four soft status fills a status panel provides — and
```

## 8. Step 4 — `packages/tokens/src/track-surface-claims.test.ts`

Header states the bug: three present-tense enumerations of `track`'s surfaces
stopped at twelve and omitted the pressed `selectedActive`, while
`trackSurfacePairs` holds thirteen; the existing `docs.test.ts` case reads the
§8 row as a whole and passed because a neighbouring clause names the pressed
fill.

Imports: `readFileSync` from `node:fs`; `describe`, `expect`, `it` from
`vitest`; `statusTones`, `trackSurfacePairs` from `./index.js`.

Helpers:

- `prose(url)` — a document as one line (`replaceAll(/\s+/g, " ")`).
- `between(text, start, end)` — the slice between two markers; throw when a
  marker is missing, so a moved paragraph fails with the paragraph's name rather
  than an empty string.
- `surfaces` — `trackSurfacePairs.map(([, background]) => background)`.
- `base` — `["background", "card", "popover", "muted"]`.
- `soft` — `statusTones.map((tone) => `${tone}Soft`)`.
- `state` — `surfaces.filter((surface) => !base.includes(surface) && !soft.includes(surface))`.
- `words` / `countWord(count)` — the small cardinal map `inventory.test.ts` and
  `docs.test.ts` already use (`zero`…`twenty`), so `countWord(surfaces.length)`
  is `"thirteen"`.

Document slices (all four must stay readable):

```
catalogue     docs/tokens.md
              start: "So `track` is a designed neutral step"
              end:   "`primary`, `success`, `destructive` and"
designSystem  docs/design-system.md — the §8 groove paragraph
              start: "A value indicator's unfilled groove is `track`"
              end:   "A rail that disappears while the row"
uncheckedRow  docs/design-system.md — the §8 unchecked row's track clause
              start: "a switch that is off is the `track` groove"
              end:   "with its knob as `foreground`"
readme        packages/tokens/README.md
              start: "The groove those value indicators sit in is `track`"
              end:   "`trackMarkPairs` holds the four progress fills"
```

Cases:

1. **the contract's list is the four, the five and the four** — `surfaces`
   equals the thirteen in export order, `base` has four, `state` equals
   `["hover", "active", "accent", "selected", "selectedActive"]`, `soft` equals
   the four tones, and the three groups are disjoint.
2. **every page names each surface it counts** — for each of `catalogue`,
   `designSystem`, `readme`, every one of the four `base` and five `state`
   surfaces appears as `` `surface` ``, `selectedActive` is asserted explicitly
   (so the failure message names the fill that was missing), and the four soft
   fills appear as their group phrase, `` `${countWord(soft.length)} soft status
   fills` `` — the pages group them, as the role table does.
3. **every page states the count and the split** — each of the three slices
   contains `` `${countWord(surfaces.length)} surfaces` ``,
   `` `${countWord(base.length)} base surfaces` ``,
   `` `${countWord(state.length)} state washes` `` and
   `` `${countWord(soft.length)} soft status fills` ``, and none contains
   `twelve surfaces` or the pre-plan phrase `the persistent `accent`/`selected``.
4. **the state table's track clause names its own washes** — `uncheckedRow`
   names all five `state` roles and the four baseline groups; `surfaces` are all
   present. This is the case the whole-row guard could not be.
5. **the pre-plan sentences are detected and are gone** — a predicate
   ```ts
   const claimsTwelve = (text: string): boolean =>
     text.includes(
       "the persistent `accent`/`selected` row fills, the `hover`/`active` washes",
     ) && !text.includes("`selectedActive`");
   ```
   returns `true` for the three historical sentences quoted verbatim in the
   header, and `false` for `catalogue`, `designSystem` and `readme`.

Deliberately not asserted: the pair floors (owned by `contrastFloors`), the
`trackMarkPairs` marks (owned by `track-contrast.test.ts`), and the tightest
shipped figures (owned by `figures.ts`).

## 9. Test plan

From `packages/tokens`:

```sh
nub exec vitest run src/track-surface-claims.test.ts src/track-contrast.test.ts src/docs.test.ts src/readme.test.ts
```

Expected **before** the prose changes: the new suite fails on cases 2, 3, 4 and
5 (that is the proof it can fail); the other three files are green.
Expected **after**: four files green, five new cases.

**Prove every case in both directions** (apply, run, revert — one at a time):

1. `docs/tokens.md`: delete `` `selectedActive` `` from the corrected sentence →
   case 2 fails.
2. `docs/design-system.md`: restore the old groove sentence → cases 2 and 3
   fail.
3. `packages/tokens/README.md`: restore the old enumeration → case 2 fails.
4. Change `thirteen` to `twelve` in the catalogue → case 3 fails.
5. Restore the old §8 track clause → case 4 fails (and `docs.test.ts` stays
   green, which is the point: the loose guard could not see it).
6. Add `"input"` to `trackSurfaces` in `contrast.ts` → cases 1, 2 and 3 fail,
   proving the prose is read against the export and not restated.
7. Remove `selectedActive` from `trackSurfaces` → case 1 fails, proving the
   expected split is derived.

Then the gates:

```sh
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
```

Expected: **218** files and **7121** tests green (217 / 7116 before; five cases
added). No native scenario changes, so no smoke scenario is run for this plan.

## 10. STOP conditions

- Stop if a colour, role, pair, floor, metric or shipped theme has to move. The
  contract already measures thirteen surfaces and every shipped set passes.
- Stop if `docs.test.ts` or `readme.test.ts` fails on a *different* sentence than
  the one this plan edits. Read the failure first; if a neighbouring guard
  reconstructs the old wording, record it and update that guard once in the
  corrected form — do not tune the new prose to satisfy the old sentence.
- Do not export `trackSurfaces`. `trackSurfacePairs` is the published list.
- Do not touch `track-contrast.test.ts`'s local membership fixture: it is the
  contract's expected membership, asserted against the export.
- Do not add a pair, a role, a floor or a metric.
- No cast, `any`, or name-based lookup where a derived list exists.

## 11. Acceptance

- The catalogue, the design system (§8 paragraph and the `unchecked` row) and
  the package README name the four base surfaces and the five state washes, with
  the pressed `selectedActive` named in each, and the four soft fills as their
  group, with the derived count and the four/five/four split.
- `track-surface-claims.test.ts` derives every surface, group and count word
  from `trackSurfacePairs` and `statusTones`, and each of its cases fails under
  its §9 mutation.
- `nub run --filter @gpuixui/tokens test` is green (218 files, 7121 tests),
  `nub run check` and `nub run lint` clean.
- `TODO.md` ticks the row and keeps the section counter current; the plan index
  lists `814`.

## 12. Execution record

Executed on 2026-10-20 on `agent/tokens-theme`.

- The contract derived as §2 states: `trackSurfacePairs` holds thirteen
  surfaces — four base, five state washes (`hover`, `active`, `accent`,
  `selected`, `selectedActive`) and the four soft status fills — and the three
  pages enumerated twelve.
- The first run of the new suite failed as the plan predicted, on the two
  corrections it exists for: the catalogue's slice did not name `infoSoft` (the
  page groups the four soft fills rather than naming them) and the design
  system's §8 narrative named no individual surface. The sentence shape was
  settled first: each of the three pages now names the four base surfaces and
  the five state washes, and keeps the soft fills as their group phrase, which
  is how the role table states them. Case 2 and case 5 were adjusted to that
  shape (the historical-sentence predicate now matches both spellings of the
  old clause, `row fills` and `fills`) before the suite went green.
- `nub exec vitest run src/track-surface-claims.test.ts src/track-contrast.test.ts
  src/docs.test.ts src/readme.test.ts` → four files, 280 tests green; five new
  cases.
- Every mutation of §9 failed the new suite and the tree was restored after
  each: deleting `selectedActive` from the catalogue (case 2), restoring the old
  design-system and README sentences (cases 2, 3, 5), changing `thirteen` to
  `twelve` (case 3), restoring the old §8 track clause (case 4, while
  `docs.test.ts` stayed green — the point of the clause-scoped case), adding
  `input` to `trackSurfaces` (cases 1–4) and removing `selectedActive` from it
  (cases 1 and 3).
- `nub run --filter @gpuixui/tokens test` → **218 files / 7121 tests** green;
  `nub run check` (check-tests, lint, fmt, type-check) clean; `nub run lint`
  clean.
- No native scenario was run: the change is prose and a source-reading suite,
  none of which the runtime paints.

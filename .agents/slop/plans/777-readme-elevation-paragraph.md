# 777 — The front door's elevation paragraph has no owner, and counts twelve fills of fifteen

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `584`/`610`/`665` (the elevation walks), `749` (`elevationContentSurfaces`), `775` (the front-door count guard), `376` (the catalogue's elevation prose) |
| Feeds | `packages/tokens/README.md` §*Shadows*, `packages/tokens/src/readme.test.ts`, `packages/tokens/src/figures.ts` |

## 1. The bug

`packages/tokens/README.md` is the consumer's front door. Its §*Shadows*
paragraph makes five claims about the elevation contrast contract and
`readme.test.ts` reads **none** of them:

> `elevationSurfaces` the six persistent page surfaces the contrast check
> composites each defined level over … A menu or popover (`md`) also opens across
> the resting content fills `elevationContentSurfaces` names — **the four filled
> actions, the three solid status chips, the raised panel action and the four
> soft status panels** — … the tightest shipped pair is **1.058:1** (AAA dark,
> `md` on `info`) and the page surfaces alone are **1.061:1** (identity dark,
> `sm` on `background`).

Mutating both group counts (`four`/`three` → `five`/`four`), the two ratios
(`1.058` → `1.059`, `1.061` → `1.062`) and the page-surface count (`six` →
`seven`) leaves the whole package suite green. `docs.test.ts` derives the same
claims for `docs/tokens.md` and `docs/design-system.md` (plans `376`, `584`,
`610`, `665`); the front door was never added to that walk.

It is also **stale**: `elevationContentSurfaces` holds **fifteen** fills, not the
twelve the paragraph enumerates. `contentFillSurfaces` is the four filled
actions, the three solid status chips, the raised panel action, the four soft
status panels, **a disabled control, a loading row and a value indicator's
groove** — the last three joined in plans `737`, `619` and `347`. The catalogue
and the design system name all fifteen; the README stopped at twelve.

| Claim | Owner | Shipped | Guard before |
| ----- | ----- | ------- | ------------ |
| "the six persistent page surfaces" | `elevationSurfaces` | 6 | none |
| "the fifteen resting content fills" | `elevationContentSurfaces` | 15 (never stated) | none |
| "the four filled actions" | `filledControlFamilies` | 4 | none |
| "the three solid status chips" | `statusTones` minus the filled families | 3 | none |
| "the four soft status panels" | `statusTones` | 4 | none |
| "the raised panel action" | one (`softAction`) | 1 | none |
| "1.058:1 (AAA dark, `md` on `info`)" | elevation walk | 1.058 | none |
| "1.061:1 (identity dark, `sm` on `background`)" | elevation walk | 1.061 | none |

## 2. Design

1. **A `"shadow"` figure kind in `figures.ts`.** An elevation shadow is neither a
   role pair nor a wash: the painted colour is `alpha(shadow, level.alpha)` over
   a surface, so the table needs the level to compose it. `DocumentedFigure`
   gains an optional `level?: ElevationLevel`; `FigureKind` gains `"shadow"`;
   `measure` composites `elevationShadow(theme, level).color` over the pair's
   background exactly as `themeContrastFailures` does. A `"shadow"` entry with no
   level measures `NaN` and the suite reports it.
2. **Two figure entries**, both `document: "packages/tokens/README.md"`,
   `claim: "tightest"`:
   - the `md` walk over `[...elevationSurfaces, ...elevationContentSurfaces]`,
     naming AAA dark (`md` on `info`) — 1.058;
   - the page walk over `elevationSurfaces` at `sm`, naming identity dark (`sm`
     on `background`) — 1.061.
   The sentences are the README's own words, so `quotesFigure` holds the front
   door to the table. `tightestProvenance` fails a sentence that names a set which
   does not produce the minimum.
3. **Three `readme.test.ts` cases**:
   - the two surface counts (`elevationSurfaces.length`,
     `elevationContentSurfaces.length`) as words, and the group sentence derived
     from `filledControlFamilies` and `statusTones` (the chips are the status
     families that are not also filled-action families);
   - the tabulated ratios through `deriveFigure` + `quotesFigure`, so a palette
     edit cannot leave the front door quoting an old number;
   - completeness: the grouped fills plus the ungrouped tail must reconstruct
     `elevationContentSurfaces`, so a new fill must join a group or the prose
     fails.
4. **The README names all fifteen fills.** Add "a disabled control, a loading
   row and a value indicator's groove" to the paragraph, and state "the fifteen
   resting content fills", matching the catalogue and the design system.
5. **`readme.test.ts` grows its count table to twenty-five** (it stops at ten,
   so `fifteen` would fall back to `"15"`) and the duplicate inline table inside
   the check-count case reads the module-level `countWord` instead of shadowing
   it.
6. **`docs/tokens.md`'s figure-table size moves 68 → 70**, because
   `docs.test.ts` holds that sentence to
   `documentedFigures.length + documentedTierFigures.length`.
7. **`figures.test.ts` guards the new field** the way the composition kinds are
   guarded: every `"shadow"` entry names a level and no other kind does.

No token value, pair, floor, metric, role or shipped theme moves;
`contrastPairs` stays **470**. The figure table grows 68 → 70 entries.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/figures.ts` | import `elevationShadow`/`ElevationLevel` and `elevationContentSurfaces`/`elevationSurfaces`; add `"shadow"` to `FigureKind` and `level?: ElevationLevel` to `DocumentedFigure`; add the `case "shadow"` to `measure`; add `elevationMdFigure` and `elevationPageFigure` and list both in `documentedFigures` |
| `packages/tokens/src/figures.test.ts` | one case: a `"shadow"` entry must name a level, and a level belongs only to a `"shadow"` entry |
| `packages/tokens/src/readme.test.ts` | import `elevationContentSurfaces`/`elevationSurfaces`, `documentedFigures`/`deriveFigure`/`quotesFigure`; extend `countWords` to twenty-five; use the module `countWord` in the check-count case; three new cases (surface and group counts, tabulated ratios, group completeness) |
| `packages/tokens/README.md` | §*Shadows*: name all fifteen fills, keep the group counts, quote the two ratios |
| `docs/tokens.md` | the figure-table size sentence: **68** → **70** entries |
| `TODO.md` | tick the row; bar `351/428` → `352/428` |
| `.agents/slop/plans/README.md` | this plan's index row and summary sentence |
| `.agents/slop/plans/777-readme-elevation-paragraph.md` | this plan, with the execution record |

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. the new cases over the fixed README
cd packages/tokens && nub exec vitest run src/readme.test.ts src/figures.test.ts
# expected: PASS.

# 2. both directions: mutate, one at a time, and revert
#    "the six persistent page surfaces"  -> "seven"
#    "the fifteen resting content fills" -> "fourteen"
#    "the four filled actions"           -> "five"
#    "the three solid status chips"      -> "four"
#    "the four soft status panels"       -> "five"
#    "1.058:1"                           -> "1.059:1"
#    "1.061:1"                           -> "1.062:1"
#    delete "a disabled control, a loading row and"
cd packages/tokens && nub exec vitest run src/readme.test.ts
# expected: FAIL on the mutated claim, PASS after the revert.

# 3. the neighbours that quote the same walk
cd packages/tokens && nub exec vitest run src/docs.test.ts src/figures.test.ts
# expected: PASS (the catalogue count is 70).

# 4. gates
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## 5. STOP conditions

- The `md` walk over `elevationSurfaces + elevationContentSurfaces` does **not**
  measure 1.058 on AAA dark, or the page walk does not measure 1.061 on identity
  dark `sm`. Then the catalogue's sentence is the one that is wrong: stop, report
  both derivations, and fix the catalogue with the same change rather than
  editing the figure to match a sentence.
- A `"shadow"` entry derives `NaN`. The level is missing or `elevationShadow`
  returned `undefined`; report rather than adding a fallback.
- `elevationContentSurfaces` cannot be imported from `./contrast.js` in the
  suites. It is a public export; stop and report rather than copying the list.
- A group count disagrees with the README **and** the implementation. The index
  is the owner: correct the README, record the old word and the measurement.
- `nub run check` fails on the figure-table count. That sentence belongs to
  `docs/tokens.md`; update it to the derived number, never the test.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| `readme.test.ts` — surface and group counts | a page surface, content fill, filled family or status family leaving the front door behind; a group count retyped | Yes — all were hand-typed and mutating them left 36/36 `readme.test.ts` green |
| `readme.test.ts` — tabulated elevation ratios | a palette or alpha move leaving 1.058/1.061 in the README | Yes — the figure table derives the number and the set; the old digits fail |
| `readme.test.ts` — group completeness | a content fill added to `contentFillSurfaces` without joining the prose | Yes — the ungrouped tail stops matching `disabled`/`skeleton`/`track` |
| `figures.test.ts` — shadow level | a `"shadow"` entry without a level, or a level on another kind | Yes — the entry would measure `NaN` |

## 7. Acceptance criteria

- The front door states the page-surface count from `elevationSurfaces`, the
  content-fill count from `elevationContentSurfaces`, and every group count from
  `filledControlFamilies`/`statusTones`.
- The front door names all fifteen resting content fills.
- Both ratios are figure-table entries and the README quotes the derived figures.
- Each mutated claim fails `readme.test.ts`, and the revert passes.
- No token value, pair, floor, metric, role or shipped theme moves.
- `nub run check`, `nub run lint` and `nub run test` pass.

## 8. Execution record

- **Both directions, before the prose edit.** The new group-count case ran
  against the shipped README and failed with
  `expected '…' to contain 'the four filled actions, the three so…'`: the
  paragraph enumerated twelve fills of the fifteen the contract walks, so the
  sentence was both unguarded and stale. The two figure entries derive
  **1.058** (AAA dark, `md` on `info`) and **1.061** (identity dark, `sm` on
  `background`) from the shipped sets, matching the numbers the page already
  quoted.
- **Both directions, after the fix.** Eight single-claim mutations of
  `packages/tokens/README.md`, each reverted after the run, failed exactly one
  case in `readme.test.ts` (37 passed, 1 failed):
  `seven persistent page surfaces`, `fourteen resting content fills`,
  `five filled actions`, `four solid status chips`, `five soft status panels`,
  `1.059:1`, `1.062:1`, and deleting `a disabled control, a loading row and`.
- The `"shadow"` entries compose `elevationShadow(theme, level)` over each
  surface at the level's own alpha, so a `shadow` tint or an elevation opacity
  edit moves the figure with it. `figures.test.ts` holds the level field to the
  kind.
- `docs/tokens.md` states the table size as **70**, derived by `docs.test.ts`
  from `documentedFigures.length + documentedTierFigures.length`.
- Green after: `@gpuixui/tokens` **208 files / 7036 tests**, and
  `check-types` clean. No token value, pair, floor, metric, role or shipped
  theme moves; `contrastPairs` stays **470**. The figure table grows 68 → 70
  entries (three new cases).

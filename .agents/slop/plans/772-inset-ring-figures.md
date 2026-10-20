# 772 — The inset ring's figure and count have no owner outside the catalogue, and the source-count guard cannot see `sixteen`

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `609` (inset focus ring), `717` (the figure table and the no-count-in-source rule), `760`/`770` (the figure table's latest entries) |
| Feeds | `packages/tokens/src/styles.ts`, `packages/tokens/src/figures.ts`, `COMPONENTS.md`, `docs/tokens.md` |

> ## Execution record (2026-10-20)
>
> - **Before the fix**, on the untouched tree: falsifying `4.697:1` →
>   `4.696:1` in `COMPONENTS.md` and `styles.ts` left **208 files / 7024 tests
>   passed**, and `sixteen shipped sets` → `fifteen shipped sets` in the same
>   two places was green again. Both numbers have one guarded copy and two
>   unguarded ones.
> - The measurements that make the prose right: the four families' on-colour on
>   their three fills measures **4.696661:1** at the tightest over
>   `shippedThemes` (`Light · macOS`; `Light · Linux` is next at 4.7695:1), and
>   `contrast(ring, primary) === 1` in **16** of the 24 shipped sets.
> - **Guard first**: the three `figures.ts` entries and both count cases were
>   written before the prose moved. With `styles.ts` already reworded, the first
>   full run reported **1 failed / 7028 passed** — `docs.test.ts`'s own
>   table-size sentence, still **65** where the table now holds **68**, which is
>   exactly the guard counting the new entries.
> - **Both directions, after the fix** (each mutation reverted):
>   `4.697` → `4.696` in `COMPONENTS.md` fails
>   `figures.test.ts > derives the ledger's inset focus ring figure` ("must quote
>   4.697:1"); `sixteen` → `fifteen` in `COMPONENTS.md` fails
>   `inset-focus-ring.test.ts > states the derived count in the catalogue and the
>   ledger`; `most` → `sixteen` in `styles.ts` fails **two** cases — the new
>   word-count guard in `figures.test.ts` and the "most is true" case.
> - Green after: **208 files / 7029 tests**, and `nub run check`, `nub run lint`
>   and `nub run test` pass.
> - No token value, pair, floor, metric, role or shipped theme moves;
>   `contrastPairs` stays **470** and the figure table moves 65 → **68**.

## 1. The bug

The catalogue states, in the present tense:

> `insetFocusRing(theme, family)` returns the family's on-colour, which the
> on-colour pairs already hold on the resting, hover and pressed fill
> (4.697:1 at the tightest), at the outer ring's `borderWidth.strong`.

and, one paragraph above:

> `ring` is designed for the surface behind a control — it meets `primary` at
> **1.000:1** in **16** shipped sets.

Both numbers are right today, and **exactly one place is guarded**:
`inset-focus-ring.test.ts` derives the tightest family foreground and the
`identicalCount`, and asserts the catalogue's sentence. The same two numbers
are stated in two more places with no derivation behind them:

| Place | Sentence |
| ----- | -------- |
| `COMPONENTS.md` **Focus state** row | "the family's on-colour at `borderWidth.strong`, measured on the resting, hover and pressed fill (4.697:1 at the tightest), because `ring` meets `primary` at 1.000:1 in sixteen shipped sets (plan 609)" |
| `packages/tokens/src/styles.ts` `insetFocusRing` JSDoc | "measures 1.000:1 against `primary` in sixteen shipped sets … (4.697:1 at the tightest in the shipped sets)" |

**Evidence, measured on this tree.**

- The four families' on-colour on their three fills
  (`primaryForeground`/`secondaryForeground`/`accentForeground`/`destructiveForeground`
  on `x`, `xHover`, `xActive`) measure a minimum of **4.696661:1** over
  `shippedThemes`, produced by `Light · macOS`; the next set is `Light · Linux`
  at 4.7695:1. So **4.697** is correct.
- `contrast(colors.ring, colors.primary) === 1` in **16** of the 24 shipped
  sets. So **sixteen** is correct.
- Falsifying either number in the two unguarded places and running the whole
  package suite stayed green:
  - `4.697:1 → 4.696:1` in `COMPONENTS.md` and `styles.ts`: **208 files /
    7024 tests passed**.
  - `sixteen shipped sets → fifteen shipped sets` in both: **green** again.

So a palette edit that moves a family foreground or starts/stops `ring` meeting
`primary` fails the catalogue's case, a human corrects the catalogue, and the
ledger and the JSDoc keep quoting the old numbers — the plan-336/377/717/760/770
failure mode, two documents over.

**A second defect, in the guard that was written to prevent it.**
`figures.test.ts` has a case titled *"states the shipped-set count nowhere in
its own prose"*. It was added by plan `717` after `styles.ts` said "in all 24
shipped sets", and it matches only digits:

```ts
/\b\d+ (?:of the )?shipped sets\b/.test(source)
```

The JSDoc it was written for still carries a count, spelled out — "in sixteen
shipped sets" — so the rule's own subject passes the rule's own guard, and it
is the only `<word> shipped sets` phrase in the package's non-test source.
A source JSDoc has no derivation site (that is why plan `717` chose "every
shipped set"), so the count belongs in the ledger and the catalogue, which do
have one, and not in the JSDoc.

## 2. Design

1. **Give the figure to `figures.ts`.** One derived pair list,
   `insetRingPairs`, built from `filledControlFamilies` × the three fills
   (`x`, `xHover`, `xActive`) and each family's on-colour, so a fifth filled
   family joins the measurement from the type index instead of being retyped.
   Three entries, one per document that states it — `docs/tokens.md`,
   `COMPONENTS.md`, `packages/tokens/src/styles.ts` — all `claim: "tightest"`
   with provenance `darwin`/`light`/`default`, so `figures.test.ts` proves the
   named set really produces the global minimum as well as deriving the number.
2. **Give the count to the ledger.** `COMPONENTS.md` keeps "sixteen" — it has a
   derivation site — and `inset-focus-ring.test.ts` (which already derives
   `identicalCount`) holds it to `${countWord(identicalCount)}`, beside the
   catalogue assertion it already makes.
3. **Drop the count from the JSDoc.** `styles.ts` says "in most shipped sets"
   instead of "in sixteen shipped sets", and the same suite holds "most" to the
   measured fact — `identicalCount * 2 > shippedThemes.length` — so the word is
   a claim with a test behind it, not a hedge.
4. **Make the count guard see words.** `figures.test.ts`'s case matches the
   spelled-out numbers too, one to twenty, so a future JSDoc cannot reintroduce
   a count the rule forbids.
5. **Delete the duplicated assertion.** `inset-focus-ring.test.ts` stops
   asserting the catalogue's ratio (the figure table owns it now) and keeps the
   count and the `insetFocusRing` / "filled control" name checks. Net change in
   test LOC is close to zero.

No token value, pair, floor, metric, role or shipped theme moves;
`contrastPairs` stays **470**.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/figures.ts` | import `filledControlFamilies` from `./styles.js`; add `insetRingPairs` beside the other derived lists; add `insetRingFigures` (three entries) and spread it into `documentedFigures` |
| `packages/tokens/src/figures.test.ts` | the no-count case also matches `(?:one|two|…|twenty) (?:of the )?shipped sets` |
| `packages/tokens/src/inset-focus-ring.test.ts` | the last case keeps the `insetFocusRing` / "filled control" checks and the catalogue count, adds the ledger's count word, and drops the catalogue ratio assertion (now derived by `figures.ts`); a new case holds "most shipped sets" in the JSDoc to `identicalCount * 2 > shippedThemes.length` |
| `packages/tokens/src/styles.ts` | `insetFocusRing` JSDoc: "measures 1.000:1 against `primary` in sixteen shipped sets" → "in most shipped sets". The 4.697 sentence is unchanged; it is derived now |
| `COMPONENTS.md` **Focus state** row | unchanged text; both numbers are now derived (no edit expected — the plan edits it only if the measurement disagrees) |
| `docs/tokens.md` figure-table paragraph | the derived entry count **65** → **68** |
| `TODO.md` | one ticked row under *Design tokens and theming*; bar `348/425` → `349/426` |
| `.agents/slop/plans/README.md` | this plan's index row and a summary paragraph |
| `.agents/slop/plans/772-inset-ring-figures.md` | this plan, status `landed` with an execution record |

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. guard first, over the unfixed prose
cd packages/tokens && nub exec vitest run src/figures.test.ts src/inset-focus-ring.test.ts src/docs.test.ts
# expected: FAIL — three figure entries find no sentence match on the old text only
# where the sentence changed (none at first, so the failures that must appear are
# the docs table count 65 → 68 and the word-count case on styles.ts), and the
# ledger-count case has no assertion yet; record the exact failures in the
# execution record before editing prose.

# 2. after the source and prose edits
cd packages/tokens && nub exec vitest run src/figures.test.ts src/inset-focus-ring.test.ts src/docs.test.ts
# expected: PASS.

# 3. the owning suites
cd packages/tokens && nub exec vitest run src/filled-states.test.ts src/filled-control.test.ts src/inventory.test.ts
# expected: PASS, unchanged — this plan publishes figures, not pairs.

# 4. full gates
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## 5. STOP conditions

- The tightest family foreground is not `4.696661…:1` on `Light · macOS`, or
  `ring` no longer meets `primary` in 16 sets — report the measurement instead
  of fitting the prose to a number.
- `deriveFigure` reports `missing` for `darwin`/`light`/`default` — fix the
  provenance, not the sentence.
- The new guards pass on the pre-fix tree. If they do, they are not reading the
  sentence and must be tightened before any prose is edited.
- `insetRingPairs` cannot be typed without a cast. The template literal
  `${family}Foreground` must narrow through `filledControlFamilies`; if it does
  not, stop and report — do not add a cast or `any`.
- A change would move a token value, pair, floor, metric, role or shipped theme.
  This plan changes one JSDoc clause, one derived table, one page count and
  tests.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| `figures.test.ts` derives the three inset-ring entries | a palette edit moving a family foreground, and a sentence that names a set other than the minimum | Yes — falsifying 4.697 in `COMPONENTS.md` and `styles.ts` stayed green before this plan |
| `figures.test.ts` rejects counts spelled out | a JSDoc reintroducing `<word> shipped sets`, the rule plan `717` wrote | Yes — `styles.ts` says "sixteen" on the pre-fix tree |
| `inset-focus-ring.test.ts` holds the ledger's count | the ledger drifting while the catalogue is corrected | Yes — falsifying "sixteen" → "fifteen" stayed green before this plan |
| `inset-focus-ring.test.ts` holds "most shipped sets" | a JSDoc hedge that is no longer true, or a set changing sides without the sentence moving | Yes — it fails on a bare "most" with 12 or fewer identical sets |
| `docs.test.ts` table-size sentence | the three new entries leaving the page's own count behind | Yes — the page says 65 where the table holds 68 |

## 7. Acceptance criteria

- The inset ring's **4.697:1** is derived for the catalogue, the ledger and the
  JSDoc from one list built from `filledControlFamilies`.
- The **16** shipped sets where `ring` meets `primary` are derived in the
  catalogue and the ledger; the JSDoc states "most shipped sets" and a test
  proves "most".
- `figures.test.ts` fails on a spelled-out `<word> shipped sets` in package
  source.
- Every new case fails on the pre-fix tree and passes after it.
- No token value, pair, floor, metric, role or shipped theme moves, and all
  gates are green.

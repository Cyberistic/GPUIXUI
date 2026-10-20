# 774 — The index paragraph states four catalogue sizes, and none has an owner

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `059` (`textRoles`), `064` (`statusTones`/`platformNames`), `066` (value coverage), `327` (`filledControlFamilies`), `398`/`611` (the prose-count guard) |
| Feeds | `docs/tokens.md` §*For documentation sites*, `packages/tokens/src/docs.test.ts` |

> ## Execution record (2026-10-20)
>
> - **Before the guard**, incrementing each of the four words in turn (and
>   running the whole package suite) stayed green at **208 files / 7029
>   tests**: no case read the paragraph.
> - The new case in `describe("contract prose counts")` captures **every**
>   occurrence of `<count> typographic roles`, `<count> status families`,
>   `<count> platform variants` and `<count> filled control families` in the
>   collapsed page and requires each to equal `countWord(index.length)`. It
>   passes on the shipped page with no prose edit — the page was right, just
>   unowned.
> - **Both directions**, each mutation reverted in turn: `ten` → `eleven`
>   (typographic roles), `four` → `five` (status families), `four` → `five`
>   (platform variants) and `four` → `five` (filled control families) each fail
>   the case with the phrase and the derived count named, e.g.
>   `platform variants: expected 'five' to be 'four'`.
> - Green after: **208 files / 7030 tests**; `nub run check` and
>   `nub run test` pass.
> - No token value, pair, floor, metric, role or shipped theme moves;
>   `contrastPairs` stays **470** and the figure table stays **68**.

## 1. The bug

`docs/tokens.md` §*For documentation sites* teaches the ordered indexes and, in
four places, states how big the catalogue behind each one is:

> `textRoles` does the same for type: it lists the **ten** typographic roles in
> documentation order …
>
> `statusTones` and `platformNames` index the remaining catalogues: the **four**
> status families in documentation order, and the **four** platform variants in
> toggle order … `filledControlFamilies` indexes the **four** filled control
> families.

All four are right today — `textRoles.length` is 10 and the other three are 4 —
and **none is guarded**. Incrementing each word in turn and running the whole
package suite stayed green at **208 files / 7029 tests**:

| Claim | Index | Measured | Guard |
| ----- | ----- | -------- | ----- |
| "the ten typographic roles" | `textRoles` | 10 | none |
| "the four status families" | `statusTones` | 4 | none |
| "the four platform variants" | `platformNames` | 4 | none |
| "the four filled control families" | `filledControlFamilies` | 4 | none |

The neighbouring statements are held: the `Typography` type row's count comes
from `countWord(textRoles.length)` in the same suite, and the README says "all
`${textRoles.length}` typographic roles". So the page contradicts itself the day
an eleventh type role, a fifth status tone, a fifth platform or a fifth filled
family ships — the type row moves and this paragraph does not.

`docs.test.ts` already owns prose counts in one place, `describe("contract
prose counts")`: it derives the guarantee's size from `themeChecks` and refuses
a retyped number of shipped sets. These four are the same kind of claim and were
simply never registered.

## 2. Design

1. **One case in the existing `contract prose counts` describe.** A small table
   pairs each phrase's regex with the index that owns it, captures every count
   stated before that phrase anywhere in the page, and requires each captured
   token to equal `countWord(index.length)`. Capturing **every** occurrence — not
   asserting `toContain` once — also catches a stale second copy elsewhere in the
   catalogue, which is how plan `770`'s washed sentence failed twice.
2. **Reuse the describe's `numbers` alternation** so a digit form
   ("4 status families") is caught the way the word form is; `countWord` renders
   both forms for small sizes.
3. **No prose edit.** The page is correct; this plan only gives its numbers an
   owner. If the derived word disagrees with a sentence, the measurement is
   right and the sentence moves — that is a STOP condition to report, not to
   paper over.

No token value, pair, floor, metric, role or shipped theme moves;
`contrastPairs` stays **470** and the figure table stays **68**.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/docs.test.ts` | one case, `states the index catalogues' sizes from the indexes`, in `describe("contract prose counts")` |
| `TODO.md` | one ticked row under *Design tokens and theming*; bar `349/426` → `350/427` |
| `.agents/slop/plans/README.md` | this plan's index row and a summary paragraph |
| `.agents/slop/plans/774-index-paragraph-counts.md` | this plan, status `landed` with an execution record |

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. guard over the unfixed page (the case fails only once a count is wrong,
#    so first prove the guard reads the sentence by mutating each in turn)
cd packages/tokens && nub exec vitest run src/docs.test.ts
# expected: PASS on the shipped page — the guard's both-directions evidence is
# step 2, because the page is already correct.

# 2. mutate, one at a time, and revert
#    "the ten typographic roles"      -> "the eleven typographic roles"
#    "the four status families"       -> "the five status families"
#    "the four platform variants"     -> "the five platform variants"
#    "the four filled control families" -> "the five filled control families"
cd packages/tokens && nub exec vitest run src/docs.test.ts
# expected: FAIL, each time, naming the phrase and the derived count.

# 3. full gates
nub run --filter @gpuixui/tokens test
nub run check
nub run test
# expected: all green.
```

## 5. STOP conditions

- A phrase the case needs appears in the page more than once with **different**
  counts and one of them is historical. In that case narrow the pattern to the
  §*For documentation sites* section (slice `markdownProse` between the heading
  and `## Verification`) instead of weakening the assertion.
- A derived count disagrees with the page. The index is the owner; correct the
  page and record both the old word and the measurement in the execution
  record. Do not change an index to match a sentence.
- The case passes on a mutated page. If it does, it is not reading the phrase
  and must be tightened before this plan is called done.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| `contract prose counts` — index catalogues | a fifth status tone, platform, filled family or an eleventh type role leaving the paragraph behind; a stale second copy of any of the four | Yes — every one of the four words incremented in turn was green at 7029 tests before this plan |

## 7. Acceptance criteria

- The four catalogue sizes in §*For documentation sites* are derived from
  `textRoles`, `statusTones`, `platformNames` and `filledControlFamilies`.
- Each of the four numbers, incremented by one, fails the suite.
- No prose edit is needed on the shipped page.
- No token value, pair, floor, metric, role or shipped theme moves, and all
  gates are green.

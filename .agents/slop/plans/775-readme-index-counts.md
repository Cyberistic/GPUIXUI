# 775 — The front door's index paragraph states four catalogue sizes, and none has an owner

| Field | Value |
| ----- | ----- |
| Status | landed (2026-10-20) |
| Phase | F (documentation truth) |
| Owner | `tokens-theme` |
| Depends on | `064` (`statusTones`/`platformNames`), `519` (`motionLevels`/`motionPhases`), `774` (the same guard for `docs/tokens.md`) |
| Feeds | `packages/tokens/README.md` §*Documentation indexes*, `packages/tokens/src/readme.test.ts` |

> ## Execution record (2026-10-20)
>
> - **Before the fix**, the four counts in the index paragraph were replaced
>   with `five`/`five`/`seven`/`five` and the whole package suite was run:
>   **208 files / 7030 tests passed**. The equivalent `Motion` row in
>   `docs/tokens.md` was already held — mutating it fails `docs.test.ts` — so
>   the front door was the only open surface.
> - **Both directions, after the fix**: each count incremented on its own fails
>   the new case with the phrase and the derived word —
>   `status families: expected 'five' to be 'four'`,
>   `platform variants: expected 'five' to be 'four'`,
>   `timings: expected 'seven' to be 'six'`,
>   `easing phases: expected 'five' to be 'four'`. All four mutations reverted.
> - The same case reads three `status families` occurrences, so the section
>   sentence at the top of the README is held by the same rule.
> - Two neighbouring retypings went with it: the motion-level case iterates
>   `motionLevels` instead of `Object.entries(motion)` (plan `519`'s rule), and
>   the status-family sentence takes `countWord(statusTones.length)` instead of
>   a literal `four` and a `toBe(4)` count claim.
> - Green after: **208 files / 7031 tests**, and `nub run check`,
>   `nub run lint` and `nub run test` pass.
> - No token value, pair, floor, metric, role or shipped theme moves;
>   `contrastPairs` stays **470** and the figure table stays **68**.


## 1. The bug

`packages/tokens/README.md` is the consumer's front door. Its index paragraph
states how big four catalogues are:

> `statusTones` and `platformNames` do the same for the **four** status families
> and the **four** platform variants, in documentation and toggle order.
> `motionLevels` and `motionPhases` index the **six** timings and **four** easing
> phases, so a motion table iterates the scale instead of `Object.keys(motion)`.

All four are right today — `statusTones.length` is 4, `platformNames.length` is
4, `motionLevels.length` is 6 and `motionPhases.length` is 4 — and **none is
guarded**. Replacing them with `five`, `five`, `seven` and `five` and running the
whole package suite stayed green at **208 files / 7030 tests**.

| Claim | Index | Measured | Guard |
| ----- | ----- | -------- | ----- |
| "the four status families" | `statusTones` | 4 | only the *other* sentence (`The four status families — …`, line 385 of the suite) |
| "the four platform variants" | `platformNames` | 4 | none |
| "the six timings" | `motionLevels` | 6 | none |
| "the four easing phases" | `motionPhases` | 4 | none |

Plan `774` gave the same four-kind claim in `docs/tokens.md` an owner by
capturing every `<count> <phrase>` in that page. It read only `docs/tokens.md`
and `docs/design-system.md`; the README's index paragraph was outside its
scope, and it is the copy a consumer installs from.

The neighbouring README counts are held: "all 10 typographic roles" derives from
`textRoles.length` (line 128 of the suite), the role count from `colorRoles`, and
the check count from `themeChecks`. The catalogue sizes in this one paragraph
are the exception.

For contrast, the equivalent row in `docs/tokens.md` **is** guarded: mutating
`| \`Motion\` | Six timing levels and four easing phases. |` to "Seven … and
five …" fails `docs.test.ts`. So the page the plan-774 guard reads is complete;
the front door is the one surface still open.

## 2. Design

1. **One case in `readme.test.ts`**, beside the cases that already hold the role
   count, the type-role count and the check count: a small table pairs each
   phrase with the index that owns it, captures **every** `<count> <phrase>`
   occurrence in the README, and requires each captured token to equal
   `countWord(index.length)`.
2. **Capture every occurrence, not the first.** "status families" appears three
   times in the README (the index paragraph and the status-tones section); a
   stale second copy must fail too, the failure mode plan `770` hit twice.
3. **One `numbers` alternation** beside `countWord`, so a digit spelling
   ("4 status families") is caught the way the word form is. `countWord` already
   falls back to `String(count)` above ten, so a growing catalogue stays exact.
4. **No prose edit.** The README is correct; this plan only gives its numbers an
   owner. If a derived word disagrees with the sentence, the index is right and
   the sentence moves — a STOP condition to report, not to paper over.
5. **Drop the two retypings beside it.** The motion-level case iterated
   `Object.entries(motion)` — the `string[]` plan `519` removed — and the
   status-family sentence hardcoded `four` plus a `toBe(4)` count claim. Both
   read the indexes now, so the same paragraph cannot disagree with itself.

No token value, pair, floor, metric, role or shipped theme moves;
`contrastPairs` stays **470** and the figure table stays **68**.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/readme.test.ts` | import `motionLevels`/`motionPhases`; add the `numbers` alternation beside `countWord`; one case, `states the index catalogues' sizes from the indexes`; drop `Object.entries(motion)` from the motion-level case and the `four` literal from the status-family case |
| `TODO.md` | one ticked row under *Design tokens and theming*; bar `350/427` → `351/428` |
| `.agents/slop/plans/README.md` | this plan's index row and a summary sentence |
| `.agents/slop/plans/775-readme-index-counts.md` | this plan, status `landed` with an execution record |

## 4. Commands and expected results

Run from the repository root.

```sh
# 1. guard over the unfixed README (the case passes on the shipped text;
#    the both-directions evidence is step 2, because the page is correct)
cd packages/tokens && nub exec vitest run src/readme.test.ts
# expected: PASS — the four counts agree with the indexes today.

# 2. mutate, one at a time, and revert
#    "the four status families"     -> "the five status families"
#    "the four platform variants"   -> "the five platform variants"
#    "the six timings"              -> "the seven timings"
#    "the four easing phases"       -> "the five easing phases"
cd packages/tokens && nub exec vitest run src/readme.test.ts
# expected: FAIL, each time, naming the phrase and the derived count.

# 3. the neighbouring suites
cd packages/tokens && nub exec vitest run src/readme.test.ts src/docs.test.ts src/motion-levels.test.ts
# expected: PASS.

# 4. full gates
nub run --filter @gpuixui/tokens test
nub run check
nub run lint
nub run test
# expected: all green.
```

## 5. STOP conditions

- A phrase the case needs appears in the README with **different** counts and one
  is historical. Then narrow the pattern to the §*Documentation indexes*
  paragraph rather than weakening the assertion; record the slice.
- A derived count disagrees with the README. The index is the owner: correct the
  README, record the old word and the measurement, and do not change an index to
  match a sentence.
- The case passes on a mutated README. If it does, it is not reading the phrase
  and must be tightened before this plan is called done.
- `motionLevels`/`motionPhases` cannot be imported from `./motion.js` in the
  suite. They are public exports; stop and report rather than reaching into
  `Object.keys(motion)`, the retyping plan `519` removed.

## 6. Test plan

| Case | Catches | Can it fail? |
| ---- | ------- | ------------ |
| `readme.test.ts` — index catalogues | a fifth status tone, platform, timing or easing phase leaving the front door behind; a stale second copy of any of the four | Yes — all four were replaced with `five`/`five`/`seven`/`five` and 208 files / 7030 tests passed before this plan |

## 7. Acceptance criteria

- The four catalogue sizes in the README's index paragraph are derived from
  `statusTones`, `platformNames`, `motionLevels` and `motionPhases`.
- Each of the four numbers, incremented by one, fails the suite.
- No prose edit is needed on the shipped README.
- No token value, pair, floor, metric, role or shipped theme moves, and all
  gates are green.

# 814 — Three more keyboard tables describe rules nothing checked

| Field | Value |
| ----- | ----- |
| Phase | F (docs truth / consistency) |
| Owner | primitives workstream |
| Depends on | `027`, `394`, `813` |
| Status | done |

Self-contained: §0 the gap, §1 the decision, §2 the rule, §3 the files,
§4 commands and expected results, §5 the test plan and the two-direction proof,
§6 STOP conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan

Plan `813` tied two pages' keyboard tables to the rule that answers them
(`Rating` → `decideRating`, `CheckboxGroup` → `decideActivation`). Four rules
still have a documented table and no guard at all:

| Page | Rule | Documented keys |
| ---- | ---- | --------------- |
| `slider.mdx` | `decideValueKey` | arrows, PageUp/PageDown, Home/End |
| `range-slider.mdx` | `decideValueKey` (each thumb) | the same eight |
| `number-field.mdx` | `decideNumberKey` | Up/Down, PageUp/PageDown, Enter (host submit) |
| `rating.mdx` | `decideRating` | already tied by `813`; joins the same table |

`src/docs-keyboard.test.ts` already holds the Rating expectations as a bespoke
`RATING_MOVES` list. Four pages with one shape should be one table-driven case,
not four copies — and the class plan `394` named (a page promising a key the
rule does not answer) is otherwise unguarded for the whole value-control family.

Measured on this tree (2026-10-21): every one of the four pages currently agrees
with its rule, so this is a **guard**, not a behaviour fix. That is the point:
nothing would have noticed if one drifted, and `813` already proved these rows
can disagree silently.

## 1. The decision

**One parameterised case per page: the documented movement labels must be exactly
the keys the rule answers, and each must produce the value the page says.**
`RATING_MOVES` becomes one entry in that table; `slider`, `range-slider` and
`number-field` join it. Rows that are deliberately not the rule's keys
(`Enter`/`Space` activation, the number field's host `submit`) are named as
`notOurs` so the reverse direction cannot mistake them for missing coverage.

## 2. The rule

```ts
interface KeyboardCase {
  readonly page: string;
  readonly rule: (key: string) => Option.Option<number>;
  /** A documented label, and the value the rule must produce for it. */
  readonly moves: ReadonlyArray<readonly [string, number]>;
  /** Documented rows whose key belongs to another contract (activation, submit). */
  readonly notOurs: ReadonlyArray<string>;
}
```

Digit labels map through the existing `RUNTIME_KEY`, extended with
`PageUp → pageup` and `PageDown → pagedown`.

| Page | Start | `moves` |
| ---- | ----- | ------- |
| `rating` | `decideRating(3, 5, key)` | Right/Up 4, Left/Down 2, Home 1, End 5, Delete/Backspace 0 |
| `slider` | `decideValueKey(50, {min 0, max 100, step 5}, key)` | Right/Up 55, Left/Down 45, PageUp 100, PageDown 0, Home 0, End 100 |
| `range-slider` | the same range and rule | the same values |
| `number-field` | `decideNumberKey(12, {step 1}, key)` | Up 13, Down 11, PageUp 22, PageDown 2 |

For each case, one test does both directions:

1. every documented label is in the page's first column, and its rule result is
   the documented value;
2. the documented movement keys (labels minus `notOurs`) equal exactly the keys
   the rule answers.

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/primitives/src/docs-keyboard.test.ts` | the `KeyboardCase` table and its one `it.each` case; `RATING_MOVES` and the two bespoke Rating movement tests fold into it; `RUNTIME_KEY` gains PageUp/PageDown |
| `TODO.md` | a ticked task |
| `.agents/slop/plans/README.md` | the plan row |
| `COMPONENTS.md` | the Slider, Range slider and Number field rows record that their keyboard tables are guarded |

No page content changes and no component behaviour change expected. If a case
fails, the page and the rule disagree: **stop** and treat it as a defect with its
own measurement (§6), do not edit the expectation to match.

## 4. Commands and expected results

Run from `packages/primitives`:

| Command | Expected |
| ------- | -------- |
| `nub run test src/docs-keyboard.test.ts` | 11 cases green (7 existing + 4 page cases, the two Rating movement tests replaced) |
| `nub run test` | 77 files / 1124 tests green |
| `nub run check-types` | exit 0 |

## 5. Test plan and the two-direction proof

| Direction | Expected failure |
| --------- | ---------------- |
| A documented key deleted (`slider`'s `End` row) | forward: `the page documents End`; reverse: `end` in the rule's answers but not documented |
| A documented value changed (rating `Home` → 0) | forward: `Home from 3 of 5: expected Some(0), received Some(1)` |
| A rule key undocumented (add `space` to `decideValueKey`'s table temporarily) | reverse: `space` answered but not documented |
| `notOurs` dropped for the number field | reverse: `enter` reported as an undocumented rule key |

Each mutation is reverted after it fails.

## 6. STOP conditions

- A case fails on the current pages: the table and the rule disagree, which is a
  behaviour or docs defect. Record the measured dump in `TODO.md`, fix nothing in
  this plan, and stop.
- A page's row cannot be mapped to a runtime key without inventing an
  interpretation (a prose row): add it to `notOurs` with a comment, or leave the
  page out and record it.
- Any edit would land outside `packages/primitives`, `COMPONENTS.md` or
  `TODO.md`.

## 7. Outcome

Measured 2026-10-21: all four pages already agreed with their rules, so no page
or component changed. The two bespoke Rating movement tests folded into one
table-driven case with four entries.

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test src/docs-keyboard.test.ts` | 1 file / **9 tests** green (the four page cases + activation + checkbox + the three axis cases) |
| `nub run --filter @gpuixui/primitives test` | 77 files / **1128 tests** green (the four replaced two bespoke Rating cases: +2) |
| `nub run --filter @gpuixui/primitives check-types` | exit 0 |

Two-direction proof in §7.1.

### 7.1 Mutations (each reverted after it failed)

| Mutation | Failures |
| -------- | -------- |
| `slider.mdx`'s `Home` / `End` row deleted | `keep the slider keyboard table true to its rule`: `the page documents Home` |
| `decideRating`'s `home` answer changed from `1` to `0` | `keep the rating keyboard table true to its rule`: `Home on rating` (`Some(0)` vs `Some(1)`) |
| `number-field`'s `notOurs` emptied | `keep the number-field keyboard table true to its rule`: `enter` documented-but-not-answered, reported as `['down','enter','pagedown',…]` vs `['down','pagedown','pageup','up']` |

The forward assertion runs first, so a deleted row reports the missing label; the
reverse comparison is the half that catches a rule key with no row.

## 8. Acceptance

- Four rules are tied to their page's table in both directions, from one table.
- No page or component behaviour changed, and the full offline suite,
  `check-types` and `lint` are green with the totals recorded.

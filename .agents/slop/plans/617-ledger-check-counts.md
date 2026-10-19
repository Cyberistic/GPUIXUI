# 617 — The ledger's check counts, in one owner

**Phase:** F (the inventory's half of the contract truth) ·
**Workstream:** `tokens-theme` ·
**Depends on:** 398 (`themeChecks` is the ordered check index), 567 (the contract
prose's counts derive from their indexes; history keeps its facts, not its
totals), 602 (`inventory.test.ts` holds the diagnostic order), 611 (`ring` is
the tenth check) ·
**Number block:** 500–699 (`tokens-theme` overflow; 616 is the last landed
plan and this takes 617).

## 1. The gap

`themeChecks` is the ordered owner of the ten checks `themeFailures` composes:

```ts
["color", "opacity", "typeface", "contrast", "ring", "highlight",
 "nativeText", "hierarchy", "direction", "metric"]
```

Plan 611 inserted `ring` as the tenth kind. The documents that derive their
guarantee from the index followed (plans 567 and 613). The **ledger's own
design-system rows** did not, and nothing reads their check counts:

1. **`COMPONENTS.md` (line 23, Total theme check) is false.**
   `inventory.test.ts` holds this row's *names and order* to `themeChecks`, and
   the row says so — but it says the test holds "this row's **nine** names"
   (plan 602). The test iterates all ten; the tenth (`ring`) is named in the
   same row three sentences earlier. A reader comparing the two statements
   cannot tell which is authoritative.
2. **The same row's present-tense count has no owner.** It says
   "`themeChecks` is the ordered index of the **ten** kinds". That is correct
   today and stale at the eleventh, with every gate green — the failure class
   plan 567 removed from `docs/tokens.md`, `docs/design-system.md` and the
   package README.
3. **Four historical audits retype the total, against plan 567's rule.** The
   Theme contrast row says "all **six** checks returned `[]`" and "passed all
   **nine** checks"; the Theme metric row repeats both. Plan 567 decided that
   history keeps its facts, not its totals, because a past audit's population
   is not today's. These four phrases now read as claims about the ten-check
   guarantee a consumer runs.

The guard gap is the cause. `inventory.test.ts` compares the backticked kinds
in `themeChecks` order with the row's order sentence and checks that every
kind's function is named; it never reads a numeral. The
`docs.test.ts` count guard applies only to `docs/tokens.md` and
`docs/design-system.md`. A check added to the index leaves the ledger quoting
the old size while every suite stays green.

No token value, colour pair, floor, metric, platform style, recipe or shipped
theme moves.

## 2. Decision

One owner per count, in the ledger too.

1. **No numeric check count in `COMPONENTS.md`.** History says "every check
   returned `[]`"; the present-tense sentence names the index, not a number.
   This applies plan 567's rule to the last prose document that retypes the
   total.
2. **The one present-tense count is derived by the test.** The Total theme
   check row keeps the readable "the ten kinds"; `inventory.test.ts` builds the
   expected phrase from `countWord(themeChecks.length)` and requires it. An
   eleventh kind fails the case until the row is updated — which is the point:
   the reader sees a number the index no longer supports.
3. **The name sentence becomes count-free.** "this row's names and order" says
   what the test does; the count is already carried by the sentence above and
   by the order string the test compares. It cannot drift.

Rejected alternatives:

- **Change "nine" to "ten" and stop.** Correct today, stale at the eleventh
  check — exactly the defect the plan removes.
- **Remove "ten kinds" entirely.** The row reads better with the size, and the
  index is the right owner; the test can hold the word.
- **Rewrite the historical audits' meaning.** They are evidence of what a past
  suite measured. Removing the numeral keeps the fact and drops the stale
  total, which is what plan 567 decided.

## 3. Exact edits

### 3.1 `COMPONENTS.md`

Line 23 (the **Total theme check** row, one physical line — edit the exact
substring, do not reflow the row):

| Before | After |
| ------ | ----- |
| `` `inventory.test.ts` holds this row's nine names and order to `themeChecks` (plan 602). `` | `` `inventory.test.ts` holds this row's names and order to `themeChecks` (plan 602). `` |

Line 20 (the **Theme contrast check** row), two substrings:

| Before | After |
| ------ | ----- |
| `while all six checks returned \`[]\`` | `while every check returned \`[]\`` |
| `passed all nine checks while the stepper's wash measured` | `passed every check while the stepper's wash measured` |

Line 25 (the **Theme metric check** row), two substrings:

| Before | After |
| ------ | ----- |
| `returned \`[]\` from all nine checks while it overflowed` | `returned \`[]\` from every check while it overflowed` |
| `after a flush ladder returned \`[]\` from all six checks` | `after a flush ladder returned \`[]\` from every check` |

Do **not** touch `(*One check*)` in the same row: that is the heading of
`docs/tokens.md`, not a count. Do **not** touch a `(plan N)` number or a pair
count.

### 3.2 `packages/tokens/src/inventory.test.ts`

At the top of the file, beside the existing header text, add one paragraph in
the established voice:

```
 * Plan 611 made `ring` the tenth check `themeFailures` composes. The ledger's
 * Total theme check row still said `inventory.test.ts` held "this row's nine
 * names", and its present-tense count ("the ten kinds") was the only count in
 * the ledger with no owner, so an eleventh kind would leave the row quoting the
 * old size while every suite stayed green. The row is count-free where it
 * reports history and its one present-tense count is held to `themeChecks`.
```

Add a local `countWord`, matching `docs.test.ts`'s word table (the file already
imports `themeChecks`):

```ts
const countWords = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
] as const;

const countWord = (count: number): string => countWords[count] ?? String(count);
```

Add one `it` beside "states the checks and the diagnostic order from the
index":

```ts
  it("states the check count from the index, never a stale total", () => {
    const total = row("Total theme check");
    expect(total).toContain(
      `\`themeChecks\` is the ordered index of the ${countWord(themeChecks.length)} kinds`,
    );
    expect(total).toContain(
      "`inventory.test.ts` holds this row's names and order to `themeChecks`",
    );

    // A past audit keeps its fact ("every check returned []"), not the
    // population it ran over; plan 567's rule applied to the last ledger row
    // that retyped it. Only word numerals are matched, so a `(plan 596)` or a
    // pair count is not a false positive.
    const retypedCheckCount =
      /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+checks\b/;
    ["Theme contrast check", "Total theme check", "Theme metric check"].forEach(
      (firstCell) => {
        expect(row(firstCell), firstCell).not.toMatch(retypedCheckCount);
      },
    );

    // The pattern is a guard, not a tautology: both historical spellings it
    // replaces fail it, and the replacement prose passes.
    expect(retypedCheckCount.test("while all six checks returned")).toBe(true);
    expect(retypedCheckCount.test("while all nine checks returned")).toBe(true);
    expect(retypedCheckCount.test("while every check returned")).toBe(false);
  });
```

`"Theme total check"` is included defensively; the ledger has no such row and
the loop skips a missing first cell. Do not add a fourth speculative name if a
reviewer objects — the three real rows are enough. Keep the synthetic assertions:
they are what makes the case a guard rather than a restatement.

### 3.3 `.agents/slop/plans/README.md`

Add the row after `616`:

```
| [617](./617-ledger-check-counts.md) | The ledger's check counts, in one owner | F | 398, 567, 602, 611 | done |
```

Append one closing paragraph in the established voice: plan 611 made `ring` the
tenth check, the Total theme check row still said "nine names", the row's
present-tense "ten kinds" had no test, and four historical audits retyped
`six`/`nine`; the ledger is count-free where it reports history, its one
present-tense count is held to `themeChecks`, and no value moves.

### 3.4 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)":

```
`[x]` Give the ledger's check counts one owner — plan 611 made `ring` the tenth
check, but the **Total theme check** row still said `inventory.test.ts` held
"this row's nine names", its present-tense "the ten kinds" had no test, and four
historical audits in the contrast and metric rows still retyped `six`/`nine`
checks against plan 567's rule; the row now names the test without a count, the
one present-tense count is held to `themeChecks.length`, the four audits say
"every check", and no token, pair, floor or metric moves (plan 617)
```

Bump the section header from `259/331` to `260/332` and keep the bar's ten
cells proportional (ten filled would overstate; `████████░░` becomes
`████████░░` unchanged at 260/332 = 78.3%, which is the same tenth as 259/331
= 78.2%; leave the bar as it is).

## 4. Test plan and both directions

The new case reads the ledger, so the pre-fix file must fail it. Run the guard
first, before editing:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme/packages/tokens
./node_modules/.bin/vitest run src/inventory.test.ts \
  -t "states the check count from the index, never a stale total"
# EXPECT: FAIL — the Total row contains "this row's nine names" (not the
# count-free sentence) and the four historical phrases match `retypedCheckCount`.
```

Apply §3.1, then:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme/packages/tokens
./node_modules/.bin/vitest run src/inventory.test.ts
# EXPECT: all cases pass.
```

Prove the other direction explicitly (git, not `jj`; PLAN D1):

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- COMPONENTS.md
cd packages/tokens
./node_modules/.bin/vitest run src/inventory.test.ts \
  -t "states the check count from the index, never a stale total"
# EXPECT: FAIL on the pre-fix ledger, with the row named in the message.
cd ../..
git stash pop
cd packages/tokens
./node_modules/.bin/vitest run src/inventory.test.ts
# EXPECT: pass.
```

Then the package and the repo gates:

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes (161 files / 6,043 tests before this plan; the new
# case adds one).
nub run check
nub run lint
# EXPECT: clean.
nub run test
# EXPECT: every workspace's suite passes.
```

If the full `nub run test` is red for a reason outside `packages/tokens`, record
the failing workspace and its output in the commit message; do not edit another
workstream's paths.

## 5. STOP conditions

Stop and report, do not improvise, if:

- `themeChecks.length` is not `10` on the tree — the plan's premise is wrong;
- a `<number> checks` match remains in the four rows after the edits — find the
  occurrence; do not widen the regex to excuse it;
- a historical sentence loses its meaning when the numeral is removed (it is
  the subject of a comparison, not a population) — report the sentence instead
  of rewriting the audit;
- the row's `(*One check*)` heading reference or a `(plan N)` number is caught
  by the guard — narrow the pattern to the noun `checks`, never edit the
  heading or a plan id;
- `docs.test.ts`, `readme.test.ts` or `shipped-themes.test.ts` fails — the
  contract's own counts have owners there and must not be edited to match the
  ledger;
- a token value, colour pair, floor, metric, platform style, recipe or theme
  name moves.

## 6. Acceptance criteria

- `COMPONENTS.md` contains no word-numeral `<number> checks` phrase in its
  design-system rows; the four historical audits say "every check".
- The Total theme check row's name sentence is count-free and the row's one
  present-tense count equals `countWord(themeChecks.length)`.
- One new `inventory.test.ts` case holds that phrase to `themeChecks`, fails on
  the pre-fix ledger, passes after, and its synthetic assertions prove the
  pattern rejects `six`/`nine` and accepts "every check".
- The package suite, `nub run check` and `nub run lint` pass.
- No path outside `packages/tokens`, `COMPONENTS.md`, `TODO.md` and
  `.agents/slop/plans/` is touched; no value changes, so no example or docs page
  is added (the precedent is plan 616, a documentation guard with no API move).

## 7. Cross-team

None. No consumer reads the ledger's prose; `themeChecks` and its length do not
change.

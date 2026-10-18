# Plan 567 — the guarantee's two counts have one owner each

**Workstream:** `tokens-theme` · **Phase:** F (truth/guards) · **Depends on:**
398 (`themeChecks` is the ordered index of the seven checks), 387
(`shippedThemes` is the enumeration the guarantee runs over), 540 (the seventh
check landed and the stale ordinal was corrected), 543 (a union's prose count
derives from its ordered owner), 544 (a quoted minimum is derived over the full
enumeration).

**Status:** ready to execute. Owner: whoever holds `packages/tokens`.

---

## 1. The measured gap

The editable-theme guarantee has two dimensions: **how many checks** run
(`themeChecks`, seven) and **how many shipped sets** they run over
(`shippedThemes`, twenty-four). Both owners exist and both are published. The
contract prose retypes both by hand, and the guard only blacklists two old
numerals.

Measured on the branch (2026-10-19), with whitespace normalised:

| Document | Phrase | Truth |
| -------- | ------ | ----- |
| `docs/tokens.md:1915` | `all six checks returned \`[]\`` | stale — the guarantee is seven |
| `docs/tokens.md:2938` | `all six checks returned \`[]\`` | stale |
| `docs/tokens.md:2948` | `all six checks returned \`[]\`` | stale |
| `docs/design-system.md:655` | `all six checks returned \`[]\`` | stale |
| `docs/design-system.md:668` | `all six checks returned \`[]\`` | stale |
| `docs/tokens.md:2331` | `one of the seven checks` | correct number, no owner |
| `docs/tokens.md:2356` | `the three format checks first` | correct number, no owner |
| `docs/tokens.md:2836` | `eight shipped sets move` | correct subset, retyped total noun |
| `docs/tokens.md:2657` | `four shipped sets had …` | correct subset, retyped total noun |
| `docs/tokens.md:2977` | `twelve of the twenty-four shipped sets` | total retyped |
| `docs/tokens.md:3094` | `19 of the 24 shipped sets` | total retyped |
| `docs/tokens.md:3328` | `over the same twenty-four shipped sets` | total retyped |
| `docs/design-system.md:752` | `All 24 shipped sets are hex` | total retyped |
| `docs/design-system.md:763` | `all 24 shipped sets carry the form` | total retyped |

The existing guard (`docs.test.ts`, "does not describe a subset as the
guarantee") is:

```ts
expect(document).not.toMatch(/\ball (?:three|four) checks\b/);
```

It is itself a hand-typed blacklist: it caught the ordinals plan 540 fixed and
let `six` through, though `themeChecks` is the documented owner and the README
already derives its sentence from it (`readme.test.ts` line 68:
`That is one of ${count} checks`). The same pattern one dimension over: the
page states the enumeration's size four times, while `shippedThemes` owns it and
only the README derives it (`all ${shippedThemes.length} shipped sets pass`).

None of this is cosmetic: a reader comparing "all six checks returned `[]`"
with the seven-check guarantee cannot tell which is authoritative, and a fifth
platform or recipe would leave five "24" claims behind with every test green —
the drift class plans 536–538 removed from the figures and 543 from the floor
table.

The current header comments in four test files repeat the same historical
count (`inline-avatar-row-fit.test.ts`, `typeface-name.test.ts`,
`padding-fit.test.ts`, `selection-inactive.test.ts`). They are corrected in the
same pass so the package does not document two different guarantees.
`typeface-quoted.test.ts`'s "the other six checks" is correct present tense
(seven minus the one under test) and does not change.

No token value, colour pair, floor, metric, platform style, recipe or shipped
theme moves.

## 2. Decision

One owner per count, and prose may not restate either total.

1. **Checks:** the only spoken count is the derived sentence
   `The guarantee is <countWord(themeChecks.length)> checks — …`, which
   `docs.test.ts` already holds verbatim. Every other mention is count-free
   ("every check", "those checks", "the format checks").
2. **Shipped sets:** the two documents never state the total. Subset claims say
   "eight sets", not "eight shipped sets"; the README keeps the one derived
   total (`readme.test.ts`).
3. **History keeps its facts, not its stale totals.** A past audit still says a
   composition was unmeasured; it no longer says how many checks or sets existed
   then, because that number is not what the sentence is about.

Rejected alternatives:

- **Update `six` to `seven` in all five places.** It would be correct today and
  stale at the eighth check, exactly the failure this plan removes.
- **Keep the numeric subset claims.** "eight shipped sets" is a subset of a
  total the page does not own; "eight sets" says the same thing without
  retyping the noun's size.
- **Derive each historical count against today's `shippedThemes`.** A past
  audit's population is not today's and must not be rewritten when a platform
  is added (plan 544's rule applies to current figures, not history).

## 3. Exact edits

### 3.1 `docs/tokens.md`

Replace each stale count with count-free prose (keep line wrapping tidy):

| Line | Before | After |
| ---- | ------ | ----- |
| 1915 | `while all six checks returned \`[]\`` | `while every check returned \`[]\`` |
| 2331 | `Running one of the seven checks is not the guarantee.` | `Running one of those checks is not the guarantee.` |
| 2356 | `The order is diagnostic: the three format checks first` | `The order is diagnostic: the format checks first` |
| 2938 | `while all six checks` | `while every check` |
| 2948 | `while all six checks returned \`[]\`` | `while every check returned \`[]\`` |
| 2657 | `four\nshipped sets had` | `four\nsets had` |
| 2836 | `eight shipped sets move` | `eight sets move` |
| 2977 | `twelve of the\n twenty-four shipped sets` | `twelve of the\n shipped sets` |
| 3094 | `19 of the 24 shipped sets` | `19 of the shipped sets` |
| 3328 | `over the same twenty-four shipped sets` | `over the same shipped sets` |

Do **not** touch line 1731 (`The guarantee is seven checks — …`): it is the one
derived sentence and an existing case holds it verbatim.

### 3.2 `docs/design-system.md`

| Line | Before | After |
| ---- | ------ | ----- |
| 655 | `all six checks returned \`[]\`` | `every check returned \`[]\`` |
| 668 | `all six checks returned \`[]\`` | `every check returned \`[]\`` |
| 752 | `All 24 shipped sets are hex` | `Every shipped set is hex` |
| 763 | `all 24\nshipped sets carry the form they need` | `every\nshipped set carries the form it needs` |

### 3.3 `packages/tokens/src/*.test.ts` — historical headers

Change `all six checks` in the header comment of
`inline-avatar-row-fit.test.ts`, `typeface-name.test.ts`, `padding-fit.test.ts`
and `selection-inactive.test.ts` to `every check` (or "every `themeFailures`
check" where the existing sentence names it). Leave
`typeface-quoted.test.ts`'s "the other six checks" — that is the true remainder
of seven.

### 3.4 `packages/tokens/src/docs.test.ts` — the guard

Add one `describe` after the existing theme-contract block, before
`describe("docs/tokens.md text hierarchy", …)`:

```ts
describe("contract prose counts", () => {
  // A count is owned by an index: `themeChecks` for the guarantee's size,
  // `shippedThemes` for the enumeration it runs over. Anything else in these
  // two documents is a hand-typed copy that can drift.
  const checkCount =
    /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|\d+)\s+(?:format\s+)?checks?\b/;
  const shippedSetCount =
    /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|twenty-one|twenty-two|twenty-three|twenty-four|twenty-five|\d+)\s+shipped sets\b/;

  it("states the guarantee's size only from the index", () => {
    const guarantee = `The guarantee is ${countWord(themeChecks.length)} checks — `;
    expect(markdownProse).toContain(guarantee);
    [markdownProse, designSystem].forEach((document) => {
      expect(document.split(guarantee).join("")).not.toMatch(checkCount);
    });
  });

  it("never retypes the number of shipped sets", () => {
    [markdownProse, designSystem].forEach((document) => {
      expect(document).not.toMatch(shippedSetCount);
    });
  });

  it("the counts' guards can fail", () => {
    expect(checkCount.test("while all six checks returned")).toBe(true);
    expect(checkCount.test("while every check returned")).toBe(false);
    expect(shippedSetCount.test("All 24 shipped sets are hex")).toBe(true);
    expect(shippedSetCount.test("Every shipped set is hex")).toBe(false);
  });
});
```

`countWord` and `themeChecks` are already in scope (`themeChecks` is imported at
line 151; `countWord` is module-level). Do not add imports.

Also append one paragraph to the file's header comment in the established voice:
plan 567 makes the two dimensions of the guarantee derive from their indexes, so
a fifth platform or an eighth check cannot leave a hand-typed total behind; the
old blacklist ("three or four checks") is replaced, not extended.

### 3.5 `COMPONENTS.md` — the **Total theme check** row

Append one sentence: "Every count in the contract prose derives from its index —
`themeChecks` for the guarantee's size and `shippedThemes` for the sets it runs
over — so a fifth platform or an eighth check fails the docs guard instead of
leaving a stale total (plan 567)." Keep the row one line.

### 3.6 `.agents/slop/plans/README.md`

- Add the row after `566`:

```
| [567](./567-contract-prose-counts.md) | The guarantee's two counts have one owner each | F | 387, 398, 540, 543, 544 | done |
```

- Add a closing paragraph in the established voice: the five stale `six`
  phrases, the four retyped shipped-set totals, the blacklist that let `six`
  through, the count-free prose, the three guard cases and that no value moves.

### 3.7 `TODO.md`

Add one ticked row under "Design tokens and theming (`tokens-theme`)" naming the
stale check count and set totals, the index-derived prose, the new guard cases
and the corrected test headers; bump the section count and progress bar.

## 4. Test plan and both directions

The new cases read the documents, so stashing the prose proves the failure half.
Use git (`scripts/verify-two-directions.sh` drives `jj`, absent per PLAN D1):

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-theme
git stash push -- docs/tokens.md docs/design-system.md
(cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts \
  -t "contract prose counts")
# EXPECT: "states the guarantee's size only from the index" and
# "never retypes the number of shipped sets" FAIL on the pre-fix prose;
# "the counts' guards can fail" passes (it tests the patterns, not the docs).
git stash pop
(cd packages/tokens && ./node_modules/.bin/vitest run src/docs.test.ts \
  -t "contract prose counts")
# EXPECT: all three cases pass.
```

Then the guarded documents and the package suite:

```sh
cd packages/tokens && ./node_modules/.bin/vitest run \
  src/docs.test.ts src/readme.test.ts src/inventory.test.ts src/examples.test.ts
# EXPECT: all pass.
nub run --filter @gpuixui/tokens test
# EXPECT: every file passes (144 files / 5,744 tests before this plan; the new
# describe adds three cases).
nub run check
nub run lint
# EXPECT: clean.
```

## 5. STOP conditions

Stop and report, do not improvise, if:

- `docs.test.ts` still finds a numeric check count or a `shipped sets` total
  after the edits — find the occurrence and make it count-free; do not widen the
  regex to excuse it;
- any sentence that must keep a historical figure loses its meaning when the
  numeral is removed — report the sentence instead of rewriting the audit;
- the derived guarantee sentence's wording changes — it is held verbatim by an
  existing case;
- `readme.test.ts` or `inventory.test.ts` fails — the README derives its own
  count and must not be edited to match a doc;
- a package value, pair, floor, metric, platform style, recipe or theme name
  moves;
- `nub run check` or `nub run lint` fails for a reason outside these files.

## 6. Acceptance criteria

- No `docs/tokens.md` or `docs/design-system.md` sentence states the number of
  checks or the total number of shipped sets, except the one guarantee sentence
  derived from `themeChecks`.
- Three new `docs.test.ts` cases: the derived sentence exists and is the only
  spoken check count; no shipped-set total is retyped; both patterns reject a
  planted stale phrase and accept the corrected one.
- The two failing cases fail on the pre-fix prose and pass after.
- The four test headers drop the historical `six`.
- No token value, colour pair, floor, metric, platform style, recipe or shipped
  theme changes; no path outside `packages/tokens`, `docs/tokens.md`,
  `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` and
  `.agents/slop/plans/` is touched.

## 7. Cross-team

None. The docs site consumes the counts through `themeChecks` and
`shippedThemes`, which do not change; no consumer migration is implied.

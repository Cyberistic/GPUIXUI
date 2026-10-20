# 709 — The brand-toned text cells' washes

**Workstream:** `tokens-theme` (owns `packages/tokens`, `docs/tokens.md`,
`docs/design-system.md`).
**Phase:** F (docs truth).
**Depends on:** 082 (`primaryText`), 314 (the row fills), 528 (the soft fills),
651 (the pressed `selectedActive`), 672 (the cells name the pressed row).

## 1. The defect

`docs/tokens.md`'s two colour-role tables describe `primaryText` as:

```
brand-toned text, links, icons and the native field caret on plain surfaces, the `accent`/`selected`/`selectedActive` row fills, inline code on the `accent` wash and through a text selection
```

(the high-contrast table repeats it without the inline-code clause).

`primaryTextPairs` measures the role on **nine** at-rest surfaces:
`background`, `card`, `popover`, `muted`, `hover`, `active`, `accent`,
`selected` and `selectedActive`. The cell names the three row fills and leaves
the four plain surfaces behind an undefined phrase — line 348 uses "plain
surfaces" for three (`background`, `card`, `popover`) and line 2462 for four —
and it never names the `hover`/`active` washes.

Every other surface that states the contract names them:
the paragraph above the table says "on the `hover` and `active` washes the Link
variant paints behind its own label" (`docs/tokens.md:210`), the design-system's
§8 link row says "the `hover`/`active` washes a link paints"
(`docs/design-system.md:419`), its §9 floor row says the same
(`docs/design-system.md:641`), and the package README says "the `hover`/`active`
washes the Link variant paints". Only the cells are one wash short, so a
consumer reading the table cannot tell that a link inside a ghost row — the
composition the washes exist for — is held by the checker.

**Why no test caught it.** Plan `672` added the pressed row to both cells and
its case (`docs.test.ts`, "names the pressed row in both role tables") asserts
only that each cell contains `` `selectedActive` ``. A cell that drops `hover`,
`active` or a plain surface still passes.

## 2. Exact changes

### 2.1 `docs/tokens.md` — the default role table (line 232)

Replace the `primaryText` row with:

```
| `primaryText` | `#4C39B5` | `#C7CBFF` | brand-toned text, links, icons and the native field caret on `background`/`card`/`popover`/`muted`, the `hover`/`active` washes the Link variant paints, the `accent`/`selected`/`selectedActive` row fills, inline code on the `accent` wash and through a text selection |
```

### 2.2 `docs/tokens.md` — the high-contrast role table (line 536)

Replace the `primaryText` row with:

```
| `primaryText` | `#241C5C` | `#E0E3FF` | brand-toned text, links, icons and the native field caret on `background`/`card`/`popover`/`muted`, the `hover`/`active` washes the Link variant paints, the `accent`/`selected`/`selectedActive` row fills and through a text selection |
```

No other document changes: the paragraph, the design-system rows and the README
already name the washes (checked above). Do **not** reword them.

### 2.3 `packages/tokens/src/docs.test.ts`

Inside `describe("docs primaryText surfaces")`, `linkSurfaces` is already
defined (nine entries, derived from `primaryText`'s `secondary` pairs with the
four soft fills filtered out). Replace the case at
`it("names the pressed row in both role tables")` — and its name — with:

```ts
  it("names every at-rest surface in both role tables", () => {
    expect(linkSurfaces).toHaveLength(9);

    const cells = markdown
      .split("\n")
      .filter((line) => line.startsWith("| `primaryText` |"));
    expect(cells).toHaveLength(2);
    cells.forEach((cell) =>
      linkSurfaces.forEach((surface) =>
        expect(cell, surface).toContain(`\`${surface}\``),
      ),
    );
  });
```

Everything else in that `describe` stays as it is. The new name says what the
case now holds; the derived `linkSurfaces` means a tenth at-rest surface joins
the requirement with the pair list.

## 3. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Guard first, documents untouched** — apply §2.3 only, then:

   ```sh
   nub run --filter @gpuixui/tokens test -- docs.test.ts
   ```

   Expected: exactly one failure, `names every at-rest surface in both role
   tables`, stopping at the first missing name — `expected ... to contain
   '`hover`'`. Record the exact failure in §7. Every other case, including the
   "names the pressed row in the brand-action paragraph and the README" case,
   stays green.

2. **Apply §2.1 and §2.2**, then the same command.

   Expected: green.

3. **Package suite**:

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: 193 files, 6793 cases, green (the case count does not change; one
   renamed case replaces the old one).

4. **Gates**:

   ```sh
   nub run --filter @gpuixui/tokens check-types
   nub run check
   nub run lint
   nub run fmt
   ```

   Expected: clean. The Markdown change is inside a table row; confirm `nub run
   fmt` does not reflow it (if it does, take oxfmt's output and re-run §3.3).

5. **No scenario runs.** Nothing in this plan touches a token value, pair,
   floor, metric, platform style, provider or runtime path; the smoke and live
   playground suites are not scoped in, and the commit says so rather than
   implying a native check.

## 4. STOP conditions

Stop and report instead of improvising if:

- `linkSurfaces` is not nine entries, or does not contain `hover`, `active`,
  `accent`, `selected` and `selectedActive`. The pair list has moved since this
  plan; re-derive the cell's enumeration from it rather than editing the case.
- A third line starts with `` | `primaryText` | `` — another table was added and
  the case's count of two must be re-derived.
- The paragraph above the table no longer contains "on the `hover` and `active`
  washes the Link variant paints", or the design-system link row no longer
  contains "the `hover`/`active` washes a link paints". Then this plan's
  premise — that every other surface already names them — is stale; report
  before rewriting anything else.
- `nub run check` reports a document-snippet or figure failure. The change is
  prose only, so a failure there means another surface quotes the old cells;
  report it instead of editing the new case.

Plan numbering is global. `706`, `707` and `708` are taken by other worktrees at
the time of writing; `709` is the next free number (`710+` are free too). Take
the next free number if `709` is claimed before this plan starts:

```sh
find /Users/cyberistic/GPUIXUI/workspaces -path "*/.agents/slop/plans/709-*"
```

## 5. Test plan

**The bug the case guards.** A compressed role-table cell can name some of the
surfaces its pair list measures and silently omit another — plan `672` added the
pressed row to these two cells but left the two washes out, and its assertion
(`contains selectedActive`) cannot see an omission. A consumer reading the table
learns a narrower contract than the checker enforces.

**Both directions.**

- Without §2.1/§2.2: the new case fails on the first missing name, `hover`,
  because the cells still say "plain surfaces" and never name a wash.
- With them: all nine names are present in both cells, and the case passes.
- The case stays able to fail: deleting any one name from either cell fails it,
  and a new `primaryText` at-rest pair in `contrastPairs` fails it until the
  cells name that surface too.

**What the case must not do.** It must not assert a count word or a whole-sentence
string: the cells are prose and may be reworded. It reads `contrastPairs` (the
owner of the surfaces) rather than a hand-typed list.

## 6. Acceptance

- Both `primaryText` role-table cells name `background`, `card`, `popover`,
  `muted`, `hover`, `active`, `accent`, `selected` and `selectedActive`.
- The paragraph, the design-system rows and the README are unchanged.
- One derived case replaces the plan-672 case, with the pre-fix failure recorded
  verbatim in §7.
- `nub run check`, `nub run lint`, `nub run fmt` and the tokens suite are green.
- `TODO.md` and the plan index carry the change.
- One commit on `agent/tokens-theme`, pushed to `origin`.

## 7. Execution notes (2026-10-20)

Ran from this worktree on `agent/tokens-theme`.

1. **Guard first, documents untouched** — with §2.3 applied and both cells
   unchanged, `nub run --filter @gpuixui/tokens test -- docs.test.ts` failed
   once, and stopped at the *first* counted surface rather than a wash, because
   the cell said "plain surfaces" instead of naming any of them:

   ```
   FAIL  src/docs.test.ts > docs primaryText surfaces > names every at-rest surface in both role tables
   AssertionError: background: expected '| `primaryText` | `#4C39B5` | `#C7CBF…' to contain '`background`'
   ```

   Every other case stayed green (194 files, 6793 of 6794 cases).

2. **§2.1 and §2.2 applied, same command** — `194 passed (194)`,
   `6794 passed (6794)`.

3. **Both directions re-checked** — deleting `` `active` `` alone from the light
   cell (leaving `` `hover` `` in place) failed the same case with
   `AssertionError: active: expected … to contain '`active`'`, and restoring the
   sentence returned green. The guard is not satisfied by the presence of the
   pair's neighbour.

4. **Package suite** — `nub run --filter @gpuixui/tokens test`: 193 files,
   6793 cases, green.

5. **Gates** — `nub run check` (`check:tests`, `oxlint`, `oxfmt` on 284 files,
   `tsc` on `packages/tokens` and `packages/deploy`), `nub run lint` and the
   repo-wide `nub run test` (193 files, 6793 cases) are clean.

6. **No scenario ran, deliberately.** The change touches one sentence in each of
   two Markdown table rows and one test case: no token value, metric, pair,
   platform style, provider or runtime path. The smoke and live playground
   suites are therefore not scoped in, and the commit says so rather than
   implying a native check.

### Divergences from the plan

- The pre-fix failure names `background`, not `hover` as §3.1 predicted: the
  case iterates the derived list in `contrastPairs` order, and the cell never
  named the plain surfaces either. The premise is unchanged — the cells were
  short of the contract by all four surfaces and both washes.
- No other file quoted the old cell text: a repository-wide search found "on
  plain surfaces, the `accent`/`selected`/`selectedActive` row fills" only in the
  two cells this plan rewrote.

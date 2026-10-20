# Plan 792 — the native syntax capture paragraph has no owner

**Workstream:** `tokens-theme`. **Phase:** F (truth maintenance).
**Depends on:** 569 (the native text theme), 574 (the syntax palette on every
document surface), 583/592 (the native chrome prose), 717/760 (the figures the
JSDoc quotes).
**Owns:** `packages/tokens/src/native-text.test.ts`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The defect

The catalogue's *Native text documents* section carries the **only** table of
the syntax palette, as prose:

```
`nativeSyntaxRoles` owns the capture palette:
`comment`, `operator` and `punctuation` are `mutedForeground`; …
`property`, `variable` and `parameter` are `foreground`.
```

`native-text.test.ts`'s documentation-policy case asserts that every capture
**name** and every role **name** appears somewhere in the page. It never reads
which capture belongs to which role, and nothing reads the palette's size. So:

1. A capture can be documented under the **wrong role** and every gate stays
   green. A consumer reading the page paints `property` with the role the prose
   names; the bridge paints another.
2. The count **24** is stated three times — `docs/tokens.md`'s type table
   ("The 24 syntax capture colours…"), `docs/tokens.md`'s native-text paragraph
   ("a 24-capture syntax palette") and the `COMPONENTS.md` Design tokens row
   ("the 24-capture syntax palette") — and no test derives any of them. A 25th
   capture ships correctly mapped, named in the page, and all three sentences
   still say 24.

**Evidence** (on this branch, tokens suite green at `7057`):

```sh
# 1. Move `property` from `foreground` to `warningText` in the prose only.
#    The name and the role both still appear, so the policy case passes.
#    → native-text.test.ts + docs.test.ts: 244 passed
cd packages/tokens && nub exec vitest run src/native-text.test.ts src/docs.test.ts
git checkout -- docs/tokens.md

# 2. Change both catalogue counts 24 → 25.
#    → native-text.test.ts + docs.test.ts + native-text-check.test.ts: 263 passed
# 3. Change the ledger's 24 → 25.
#    → inventory.test.ts + docs.test.ts: 249 passed
```

The class, not one digit: the paragraph is the palette's documentation and no
case compares it to `nativeSyntaxRoles`.

## 2. Decisions

- **D1 — one case in `native-text.test.ts`, beside the existing documentation
  policy case.** That case already reads the page and the palette; a new suite
  would duplicate the reader. Its header gains the bug statement.
- **D2 — parse the paragraph, then compare records.** The case collapses
  whitespace, slices from the `nativeSyntaxRoles` marker to the next sentence
  ("The captures are held"), splits on `;`, reads each group's backticked names
  in order — the last is the role — and compares the resulting
  `capture → role` map with `nativeSyntaxRoles`. Equality both ways, so a
  capture the prose invents fails too. A duplicate capture is its own assertion,
  because a record comparison would collapse it silently.
- **D3 — derive the three counts from the palette's keys.** The count is
  `Object.keys(nativeSyntaxRoles).length`; the sentences are asserted with the
  derived number, so a capture joins the interface, the record and the prose
  together or the case fails.
- **D4 — no token value, pair, floor, metric or role moves.** Every shipped
  sentence and role is already correct; this plan owns them. Moving a role
  assignment in `nativeSyntaxRoles` to make the prose pass is a STOP.
- **D5 — the paragraph format is the guard's input.** If a future edit adds a
  parenthetical to a group or reorders a sentence beyond "names … are `role`;
  …", the case fails loudly. That is intended: the page is the table. Change the
  parser only with the page in the same commit.

## 3. Files and steps

### 3.1 `packages/tokens/src/native-text.test.ts`

Extend the header comment with the defect: the palette's only table is a
paragraph of prose, the policy case checked names and not assignments, the three
counts had no owner, and a capture moved to the wrong role left 244 tests green
(plan 792).

Add one case to `describe("native text theme", …)`, after
`names every native field and syntax capture in the reference`:

```ts
it("maps every documented capture to the role the palette gives it", () => {
  const docs = readDoc("../../../docs/tokens.md").replaceAll(/\s+/g, " ");
  const marker = "`nativeSyntaxRoles` owns the capture palette:";
  const start = docs.indexOf(marker);
  const end = docs.indexOf("The captures are held", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  const groups = docs
    .slice(start + marker.length, end)
    .split(";")
    .map((group) => {
      const names = Array.from(
        group.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g),
        (match) => match[1],
      );
      const role = names.at(-1);
      return { role, captures: names.slice(0, -1) };
    });

  const named = groups.flatMap((group) => group.captures);
  expect(new Set(named).size, "a capture is listed twice").toBe(named.length);

  const documented = Object.fromEntries(
    groups.flatMap(({ role, captures }) =>
      captures.map((capture) => [capture, role]),
    ),
  );
  expect(documented).toEqual({ ...nativeSyntaxRoles });

  const captures = Object.keys(nativeSyntaxRoles).length;
  expect(docs).toContain(`The ${captures} syntax capture colours`);
  expect(docs).toContain(`a ${captures}-capture syntax palette`);
  expect(readDoc("../../../COMPONENTS.md")).toContain(
    `the ${captures}-capture syntax palette`,
  );
});
```

The final `readDoc` call is on the same `readFileSync` helper the suite already
uses; no new import.

Type note for the executor: `matchAll` needs the `g` flag (present) and the
`names.at(-1)` result is `string | undefined`; the parser is in a test, so an
unmatched group surfaces as an equality failure naming the key `undefined`
rather than a cast. Do not add an assertion to narrow it — `check-types` would
then need a `!`, which the repo bans.

### 3.2 `COMPONENTS.md`

Add one clause to the **Design tokens** row, after the sentence that names the
two guarded pages and before the playground sentence:

```
the native syntax palette's 24 role assignments and the three counts its
paragraph states are derived by `native-text.test.ts` (plan `792`),
```

No other edit; the row's own `24-capture` phrase stays as it is and becomes the
third derived occurrence.

### 3.3 `.agents/slop/plans/README.md`

1. Add the row after `789`:

   ```
   | [792](./792-native-syntax-capture-table.md) | The native syntax capture paragraph: its roles and its three counts | F | 569, 574, 583, 592, 717, 760 | done |
   ```

2. Add a summary paragraph after 789's: the paragraph is the palette's only
   table; the policy case checked names, not assignments, and nothing read the
   three 24s; a capture moved to the wrong role and a 25th count both passed
   every gate; the case now parses the groups and derives the count from
   `nativeSyntaxRoles`. No colour, pair, floor, metric or role moves.

### 3.4 `TODO.md`

Tick the section progress (`358/435` → `359/436`) and add one `[x]` row under
*Design tokens and theming*: the native syntax paragraph's role groups and the
three counts derive from `nativeSyntaxRoles`; moving a capture's role, adding a
capture to the palette, or editing any of the three counts fails
`native-text.test.ts`; no palette value moves (plan 792).

## 4. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/native-text.test.ts   # 1 new case, 0 failed
nub run --filter @gpuixui/tokens test         # 7058 passed, 0 failed
cd ../..
nub run check                                 # check:tests, lint, fmt, check-types pass
nub run test                                  # tokens + docs suites pass
```

## 5. Test plan — both directions

1. **Fails without the guard.** Before adding the case, run the three probes in
   §1 and record the green runs (they are the defect's evidence).
2. **The new case can fail.** With the case in place:
   - move `property` to `warningText` in the prose (the §1 edit) → the case
     fails on `documented` vs `nativeSyntaxRoles`;
   - change `The 24 syntax capture colours` → `25` → the case fails;
   - change `a 24-capture syntax palette` → `25-capture` → the case fails;
   - change the ledger's `24-capture` → `25-capture` → the case fails;
   - list `property` twice → the duplicate assertion fails.
   Restore each with `git checkout -- docs/tokens.md COMPONENTS.md`.
3. **The derivation reads the palette, not the page.** Temporarily add
   `zzProbe: "foreground"` to `nativeSyntaxRoles` (a runtime-only edit; the
   `satisfies` clause is compile-time and vitest does not type-check) and leave
   the page alone → the equality fails on the extra key and all three counts
   fail. Restore with `git checkout -- packages/tokens/src/native-text.ts`.
4. **Nothing else moves.** `git diff --stat` shows the plan, the plan index,
   `TODO.md`, `COMPONENTS.md` and `native-text.test.ts` only; no palette role,
   colour, pair, floor, metric or shipped theme changes.

## 6. STOP conditions

- The marker or the closing sentence is not found: do **not** guess a new
  anchor. STOP and report the paragraph as it now reads; the page changed shape
  and the plan's D5 applies.
- Parsing produces a role token that is not a `ThemeColors` role: the page's
  grammar changed. STOP; do not loosen the regex to accept it.
- Any temptation to change `nativeSyntaxRoles` or a colour role: STOP (D4).
- Any temptation to add an ordered `nativeSyntaxCaptures` index: out of scope.
  The record's keys already index the palette for this guard; a generated docs
  table would be its own plan.
- Any temptation to change the page's prose to fit the parser: STOP unless the
  prose is *wrong*; the page is the specification (D5).

## 7. Acceptance

- One case parses the catalogue's capture paragraph and proves every documented
  capture carries the role `nativeSyntaxRoles` gives it, with no duplicates.
- The three `24` passages derive from `Object.keys(nativeSyntaxRoles).length`:
  a 25th capture fails until all three sentences move.
- The case fails for the wrong-role edit, each count edit, the duplicate, and the
  runtime palette edit; it passes restored — commands and results recorded in the
  commit message.
- `nub run check` and `nub run test` pass; no colour, pair, floor, metric or role
  moves.
- The plan is indexed, `TODO.md` is ticked, and the branch is pushed.

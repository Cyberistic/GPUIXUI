# Plan 793 — the native field table's role assignments have no owner

**Workstream:** `tokens-theme`. **Phase:** F (truth maintenance).
**Depends on:** 569 (the native text theme), 574 (the syntax palette),
583/592 (the native chrome prose), 792 (the capture paragraph's guard).
**Owns:** `packages/tokens/src/native-text.test.ts`, `COMPONENTS.md`,
`.agents/slop/plans/README.md`, `TODO.md`.

---

## 1. The defect

The catalogue's *Native text documents* section opens with a table — the only
mapping of the native document's fields to the theme:

```
| `bg` | `card` |
| `border` | `border` |
…
| `appearance` | `theme.mode` |
| `fontSans` | `typography.sans` |
```

`native-text.test.ts`'s policy case checks that every field **name** and every
role **name** appears in the page. It never checks which field carries which
role, and no other suite reads the table: the bridge tests compare
`theme.bg` with `theme.colors[nativeTextRoles.bg]`, so they hold the *code* to
itself, not the page to the code.

A consumer implementing a native document by hand — the documented path for a
markdown surface the bridge does not wrap — paints what the table says. If the
table says `bg` is `foreground`, a document's content plane becomes the text
role and every nested syntax run is illegible while `themeFailures` returns
`[]`.

**Evidence** (on this branch, tokens suite green at `7058`):

```sh
# Change the table's `bg` row from `card` to `foreground`. Both names already
# appear elsewhere in the page, so the policy case passes.
# → native-text.test.ts + docs.test.ts + native-text-check.test.ts: 264 passed
```

The class is the same as plan `792`'s capture paragraph: a hand-written mapping
with name coverage but no assignment coverage.

## 2. Decisions

- **D1 — one case in `native-text.test.ts`**, beside the capture-paragraph case
  plan 792 added. The file already reads the page; a new suite would duplicate
  the reader.
- **D2 — parse the table and compare it whole.** Read the page raw (no
  whitespace collapse), slice from the header `| Native field | Role |` to the
  next sentence, keep the `|` lines after the header and separator, and strip the
  backticks. Compare the resulting `[field, role]` list with the expected table
  built from `nativeTextRoles` plus the four non-role rows
  (`appearance`/`theme.mode`, `fontSans`/`typography.sans`,
  `fontMono`/`typography.mono`). Equality includes order, so a moved row fails
  too.
- **D3 — the expected table is built, not retyped.** `Object.entries` over the
  bridge's own record supplies the thirteen colour rows in their shipped order;
  only the three non-role rows are spelled out, because they name fields the
  record cannot carry (`appearance` reads `theme.mode`, the two families read
  `typography`).
- **D4 — no token value or bridge field moves.** The table and the record are
  both correct today. Editing `nativeTextRoles` to make a page pass is a STOP.

## 3. Files and steps

### 3.1 `packages/tokens/src/native-text.test.ts`

Extend the header comment: plan 793 — the native field table is the only
field-to-role mapping for a hand-built document, and the policy case checked
names, not assignments, so `bg` → `foreground` left 264 tests green.

Add one case after `maps every documented capture to the role the palette gives
it`:

```ts
it("maps every documented native field to the role the bridge reads", () => {
  const page = readDoc("../../../docs/tokens.md");
  const start = page.indexOf("| Native field | Role |");
  const end = page.indexOf("`nativeTextRoles` owns that table", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  const rows = page
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim().replaceAll("`", ""))
        .filter((cell) => cell.length > 0),
    );

  expect(rows).toEqual<string[][]>([
    ["appearance", "theme.mode"],
    ...Object.entries(nativeTextRoles),
    ["fontSans", "typography.sans"],
    ["fontMono", "typography.mono"],
  ]);
});
```

The cell map filters empty strings rather than destructuring positions: the repo's
`noUncheckedIndexedAccess` makes `line.split("|")[1]` `string | undefined`, and a
`!` is banned. A malformed row therefore arrives as a shorter cell list and fails
the equality with its own cells visible, which is the diagnostic the executor
needs. The `<string[][]>` on `toEqual` widens the expected tuple list; without it
the `Object.entries` tuples narrow the literal to `string[]` and the comparison
does not type-check.

### 3.2 `COMPONENTS.md`

Extend the clause plan 792 added:

```
The native syntax paragraph's role assignments, the palette size …, and the
native field table's thirteen role rows are derived by `native-text.test.ts`
(plan `792`, `793`).
```

Keep the existing wording; only add the field-table clause and the second plan
number.

### 3.3 `.agents/slop/plans/README.md`

Add the row after `792` and a summary paragraph naming the `bg` → `foreground`
probe, the whole-table comparison and the three non-role rows.

### 3.4 `TODO.md`

Tick the section progress (`359/436` → `360/437`) and add one `[x]` row under
*Design tokens and theming*: the native field table's thirteen role rows and the
three non-role rows derive from `nativeTextRoles`; a swapped role or a moved row
fails `native-text.test.ts`; no bridge field moves (plan 793).

## 4. Commands and expected results

```sh
cd packages/tokens
nub exec vitest run src/native-text.test.ts   # 20 passed (1 new case)
nub run --filter @gpuixui/tokens test         # 7059 passed, 0 failed
cd ../..
nub run check                                 # check:tests, lint, fmt, check-types pass
nub run test                                  # tokens suite passes
```

## 5. Test plan — both directions

1. **Fails without the guard.** Before adding the case, run the `bg` →
   `foreground` probe in §1 and record the green run.
2. **The new case can fail.**
   - `bg` → `foreground` → the equality names the row;
   - move the `border` row below `text` → order fails;
   - delete a row → length fails;
   - append a duplicate `appearance` row → length fails.
   Restore with `git checkout -- docs/tokens.md`.
3. **The derivation reads the bridge.** Temporarily change a role in
   `nativeTextRoles` (for example `bg: "foreground"`) and leave the page alone →
   the equality fails. Restore with
   `git checkout -- packages/tokens/src/native-text.ts`.
4. **Nothing else moves.** `git diff --stat` shows the plan, the plan index,
   `TODO.md`, `COMPONENTS.md` and `native-text.test.ts` only; no role, colour,
   pair, floor, metric or shipped theme changes.

## 6. STOP conditions

- The table header or the closing sentence is not found: STOP and report the
  section as it reads; the page changed shape.
- A row does not parse into exactly two cells: STOP; do not loosen the parser to
  accept prose in the table.
- Any temptation to change `nativeTextRoles` or the table's correct rows: STOP
  (D4).
- Any temptation to fold this case into plan 792's parser: the two tables have
  different shapes (prose groups versus markdown rows); one reader each is
  simpler than a branch.

## 7. Acceptance

- One case compares the catalogue's native field table, order included, with
  `nativeTextRoles` plus the three non-role rows.
- The case fails for a swapped role, a moved row, a deleted row and an added
  row, and for a bridge edit — commands and results recorded in the commit
  message.
- `nub run check` and `nub run test` pass; no colour, pair, floor, metric or role
  moves.
- The plan is indexed, `TODO.md` is ticked, and the branch is pushed.

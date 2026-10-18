# 564 — A quoted family name is CSS syntax, not a family

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | F (theme contract truth) |
| Owner | `tokens-theme` |
| Paths | `packages/tokens/src`, `docs/tokens.md`, `docs/design-system.md`, `COMPONENTS.md`, `TODO.md` |
| Depends on | 385 (typeface check), 533 (padded and CSS-generic names), 540 (opacity), 558 (opaque suffix) |

## 1. The defect

`themeTypefaceFailures` exists because a family name is the one documented form no
measurement can see: GPUix 0.10.0's `StyleDesc.fontFamily` is **one** string, and
GPUI passes it to its font collection as `QueryFamily::Named(name)`
(`references/gpui-ce/crates/gpui_ce_parley/src/catalog.rs:85`, reached from
`text_system.rs:1814` with `family.as_str()`). The collection matches the string
against the family names the fonts declare; it does not trim, split or unquote it.

Plan 533 closed the padded name and the CSS generic keyword. Plan 385 closed the
comma stack. The **quoted** form — the canonical CSS spelling for a family with a
space in its name — is still accepted:

```ts
themeTypefaceFailures(extendTheme(getTheme("light"), {
  typography: { sans: '"Helvetica Neue"' },
})); // []
```

A probe on this tree returns `[]` from **all seven checks** for each of
`'"Helvetica Neue"'`, `"'Helvetica Neue'"`, `'"Inter'` and `'Inter"'`. The runtime
looks up a family literally named `"Helvetica Neue"` (quote characters included),
finds none, and paints the system fallback silently — the exact failure
`themeTypefaceFailures` exists to report, while `themeFailures(theme)` says the
theme is good.

The form is not hypothetical: CSS requires quotes around a multi-word family, so
`font-family: "Helvetica Neue";` is what a reader copies from the web. The docs
already promise the check holds "the form the runtime reads" and that a family the
machine does not have falls back silently; a quoted name is never the installed
name, whatever the machine has.

## 2. The shape of the fix

### 2.1 `packages/tokens/src/typeface.ts`

1. Add `"quoted"` to `typefaceRules`, between `"single-family"` and
   `"css-generic"` (the order the table and diagnostics use).
2. Add a private predicate beside the guards:

   ```ts
   /**
    * A family wrapped in CSS quotes, or with one unmatched quote at an edge. The
    * runtime looks the string up verbatim, so the quote characters are part of
    * the name it searches for. A padded value is the `trimmed` rule's diagnostic
    * alone, so one bad value keeps one report, and an apostrophe inside a name
    * (`D'Nealian`) is a character of that name and is not reported.
    */
   const isQuoted = (value: string): boolean =>
     value === value.trim() &&
     ['"', "'"].some(
       (quote) => value.startsWith(quote) || value.endsWith(quote),
     );
   ```

3. In `themeTypefaceFailures`, after the `single-family` entry and before
   `css-generic`, add:

   ```ts
   ...(isQuoted(value) ? [{ role, rule: "quoted" as const, value }] : []),
   ```

   The test reads `value` as written, like `css-generic`: a padded quoted name
   (` 'Inter' `) reports `trimmed` alone, and reports `quoted` once the padding is
   removed. That keeps one defect to one diagnostic, the convention plan 533 set.
4. Update the JSDoc:
   - the rules paragraph gains the `quoted` sentence and the
     `D'Nealian` exception;
   - the `@example` may stay as it is (the stack is still the first rule a reader
     meets);
   - the comment above `typefaceRules` says "the forms a family name must hold"
     and names quotes beside padding and generics.

### 2.2 Tests

New `packages/tokens/src/typeface-quoted.test.ts` — header states the defect
above. Cases:

1. `themeTypefaceFailures(families('"Helvetica Neue"'))` is exactly
   `[{ role: "sans", rule: "quoted", value: '"Helvetica Neue"' }]`.
2. The single-quoted form (`"'Helvetica Neue'"`) reports the same rule.
3. Each unmatched edge (`'"Inter'`, `'Inter"'`) reports `quoted` — a half-copied
   declaration is the same silent fallback.
4. A padded quoted name (`'"Helvetica Neue" '`) reports `trimmed` alone; a name
   with an internal apostrophe (`"D'Nealian"`) passes, so the rule rejects the
   CSS wrapper, not the character.
5. The other six checks are blind to the form: `themeColorFailures`,
   `themeOpacityFailures`, `themeContrastFailures`, `themeTextTierFailures`,
   `themeDirectionFailures` and `themeMetricFailures` all return `[]`, while
   `themeFailures` returns the one `typeface` failure (the composition the library
   guarantees).
6. Both fields are checked in `typefaceRoles` order: `sans` quoted and `mono`
   padded reports `quoted` then `trimmed`.
7. Every shipped theme still returns `[]` — the rule moves no family.

`packages/tokens/src/typeface.test.ts`:

- the "uses the role and rule indexes for every field it checks" case builds one
  input per rule; add `...themeTypefaceFailures(families('"Inter"'))` so the
  reported-rule set still equals every member of `typefaceRules` (the case fails
  if the new rule is not reported).

`packages/tokens/src/typeface.example.ts`:

- add a copyable `quotedTheme` / `quotedFailures` pair built from
  `'"Helvetica Neue"'`, and import it in the new suite. `examples.test.ts`
  requires every `*.example.ts` to be imported by a suite; the new test satisfies
  it.

### 2.3 Documentation

- `docs/tokens.md`, **Types** table, `TypefaceRule` row: add `quoted` to the
  rule list.
- `docs/tokens.md`, **Typeface** section:
  - "four rules" → "five rules";
  - a fifth table row:
    `| `quoted` | A CSS-quoted name — `"Helvetica Neue"` — carries the quote characters into the family lookup, so it names no installed family. A name with an apostrophe inside it (`D'Nealian`) is one family and passes. |`;
  - the sentence after the table (currently "a padded keyword reports `trimmed`
    first; once trimmed it reports `css-generic`") gains the quoted case.
- `packages/tokens/README.md`, typeface paragraph: add the quoted form to the
  enumerated failures, with the `"Helvetica Neue"` example.
- `docs/design-system.md`, the guarantee sentence in §9: "not a CSS comma stack,
  not a CSS generic keyword and not a padded name" gains "not a CSS-quoted name".
- `COMPONENTS.md`, **Theme typeface check** row: add `quoted` to the rule list and
  the example forms.
- `TODO.md`: add the task row under *Design tokens and theming* and tick it after
  the fix; update the section progress count.

## 3. Exact commands and expected results

Run from the worktree root.

1. Write the new suite first and run it on the pre-fix tree:

   ```sh
   nub run --filter @gpuixui/tokens test -- src/typeface-quoted.test.ts
   ```

   Expected: **fails** — `themeTypefaceFailures` returns `[]` where the case
   expects the `quoted` failure. That is the failing direction this plan records.

2. Apply §2.1–§2.3, then:

   ```sh
   nub run --filter @gpuixui/tokens test
   ```

   Expected: every suite passes. Baseline before the change is **141 files /
   5723 tests**; the new file makes 142 files. No shipped family, colour, pair,
   floor, metric, platform style or recipe moves.

3. Gates, from the worktree root:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: green. `check` includes `check:tests`, lint, format and type-check.

4. Toggle the rule to prove the fixed direction:

   ```sh
   # Temporarily remove the `quoted` entry from `themeTypefaceFailures`
   nub run --filter @gpuixui/tokens test -- src/typeface-quoted.test.ts
   ```

   Expected: the suite fails on the missing failure; restore the entry.

## 4. STOP conditions

Stop and report instead of improvising if:

- the pinned runtime is found to unquote a family name before the font lookup
  (the plan's premise would be false; capture the file and line);
- the new rule makes a **shipped** theme fail (it must not — every shipped family
  is an exact name);
- `typeface.test.ts`'s index case or a docs/README/index guard fails for a reason
  other than the edits above;
- any suite fails outside this plan — report the pre-existing failure rather than
  hiding it;
- adding a public `TypefaceRule` member requires an index or guard this plan did
  not name — stop and report rather than inventing an API.

## 5. Acceptance

- `themeTypefaceFailures` reports `quoted` for a double-quoted, single-quoted or
  half-quoted family, and for neither `D'Nealian` nor the shipped names.
- `typefaceRules` is the rule index including `quoted`; both the source doc and
  the catalogue table derive from it.
- The new suite fails on the pre-fix tree and passes after it; every shipped set
  still returns `[]`; no colour, pair, floor, metric, family or theme value moves.
- `nub run check`, `nub run lint`, `nub run test` pass; the plan index, `TODO.md`
  and `COMPONENTS.md` are current.

## 6. Candidates left out (and why)

- **CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`).** They are not
  generic family keywords, so adding them to `cssGenericFamilies` would falsify
  its CSS Fonts 4 claim; a sixth rule for a less common habit is not worth a
  public union member yet.
- **A whitespace-separated fallback (`Inter system-ui`).** It is
  indistinguishable from a real family name with a space, which the check must
  keep accepting (`Helvetica Neue`).
- **Normalising the value in `extendTheme`.** The package holds the form, it does
  not repair it (plans 385/533); silently stripping quotes would let a theme
  change the family a consumer wrote.
- **The family install question.** The package cannot know whether the machine
  has a face; the form is the guarantee, as the catalogue already states.

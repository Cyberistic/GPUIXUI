# 533 — The typeface form: padded and CSS-generic family names

Status: ready. Depends on 051 (the family table), 385 (the typeface contract),
396 (the public counts) and 518 (the derived indexes).

## The bug

`themeTypefaceFailures` holds a theme's two family names to `non-empty` and
`single-family`. Two forms the pinned runtime cannot resolve as written pass
both rules **and all six checks**:

- **Surrounding whitespace.** `extendTheme(getTheme("light"), { typography:
  { sans: " Inter" } })` returns `[]` from `themeTypefaceFailures` and from
  `themeFailures`. GPUix 0.10.0's `StyleDesc.fontFamily` is one string, and GPUI
  resolves it by family name in its font database with a silent fallback. The
  installed family is `Inter`; `" Inter"` names none. A config file, a copied
  theme or a settings field that keeps a stray space paints the system face
  while the guarantee says the theme is good. The same holds for `"Inter "` and
  for `mono`.
- **A CSS generic keyword.** `sans: "system-ui"` — and `sans-serif`, `serif`,
  `monospace`, `cursive`, `fantasy`, `ui-sans-serif`, `ui-serif`,
  `ui-monospace`, `ui-rounded`, `math`, `emoji`, `fangsong` — is CSS syntax,
  not a family the font database holds. The native sentinel for the operating
  system's UI face is `.SystemUIFont`, which every shipped theme uses. A reader
  moving a web theme across writes `system-ui` first; today it passes every
  check and falls back silently.

Both were probed on this tree before the plan was written:

```ts
const theme = extendTheme(getTheme("light"), {
  typography: { sans: "system-ui" },
});
themeTypefaceFailures(theme); // []
themeFailures(theme); // []
```

The comma stack (`"Inter, system-ui, sans-serif"`) is already caught by
`single-family`; the generic keyword only survives when it is the whole value.
An empty or whitespace-only value is caught by `non-empty`; padding survives
only when the trimmed value is a real name.

## The decision

Make the contract's claim true — a family name is **one exact, non-empty family
the runtime can resolve** — with two rules, in the existing rule vocabulary:

| Rule (new order) | Test | Why |
| ---------------- | ---- | --- |
| `non-empty` | trimmed value is `""` | names nothing |
| `trimmed` | trimmed value is not `""` **and** `value !== value.trim()` | surrounding whitespace is not part of an installed name; an empty value stays `non-empty` alone, so one bad value keeps one diagnostic (plan 532) |
| `single-family` | value contains `,` | a CSS stack is one string to the runtime |
| `css-generic` | `cssGenericFamilies` contains `value.toLowerCase()` | a CSS generic keyword, not a family; `.SystemUIFont` is the native sentinel |

`cssGenericFamilies` is an ordered exported list (CSS Fonts 4's generic
families): `serif`, `sans-serif`, `cursive`, `fantasy`, `monospace`,
`system-ui`, `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`, `math`,
`emoji`, `fangsong`. The comparison is on the value as written, so a padded
generic reports `trimmed`; once trimmed it reports `css-generic`. A single space
inside a name (`Helvetica Neue`) stays valid: the rule is surrounding
whitespace, not internal whitespace.

`typefaceRules` becomes the ordered domain
`["non-empty", "trimmed", "single-family", "css-generic"]`; `TypefaceRule`
already derives from it, so the type, the diagnostics and the docs table stay
one edit.

## Files

| File | Change |
| ---- | ------ |
| `packages/tokens/src/typeface.ts` | `cssGenericFamilies`; the two rules in `themeTypefaceFailures`; JSDoc for the rule set and the empty-value exception |
| `packages/tokens/src/typeface-name.test.ts` | **new** regression suite (header names the bug) |
| `packages/tokens/src/typeface.test.ts` | the rule-index case gains one theme per new rule |
| `packages/tokens/src/typeface.example.ts` | a padded example and a generic example, both executed by the suite |
| `packages/tokens/src/docs.test.ts` | "states both rules" → every rule; every `cssGenericFamilies` keyword appears in the typeface table |
| `packages/tokens/src/readme.test.ts` | the typeface case names every rule, not "both" |
| `packages/tokens/README.md` | the typeface paragraph names padding and CSS generics |
| `docs/tokens.md` | `TypefaceFailure` / `TypefaceRule` rows; the section's "two rules" table and prose; `cssGenericFamilies` documented |
| `docs/design-system.md` | the §11 sentence "A family name is one non-empty family" becomes exact, non-generic and unpadded |
| `COMPONENTS.md` | the **Theme typeface check** row names four rules and the new false pass |
| `TODO.md` | tick the new row in the tokens workstream |
| `.agents/slop/plans/README.md` | index this plan |

No colour, pair, floor, metric, type role, platform style or shipped value
moves.

## Steps

1. In `packages/tokens/src/typeface.ts`:
   - export `cssGenericFamilies` with a JSDoc sentence naming the native
     sentinel and the reason the list is closed (CSS Fonts 4);
   - add `"trimmed"` and `"css-generic"` to `typefaceRules` in the order above;
   - in `themeTypefaceFailures`, keep the `non-empty` test first, then add
     `trimmed` for a non-empty value, `single-family`, and `css-generic` on
     `value.toLowerCase()`;
   - update the function JSDoc: the contract is one exact, non-empty family;
     an empty value is reported once as `non-empty`; a padded generic reports
     `trimmed` first.
2. Write `typeface-name.test.ts` (see the test plan).
3. Update the rule-index case in `typeface.test.ts` so `reported` still equals
   `typefaceRules` — add a padded theme and a generic theme to the two existing
   ones.
4. Extend `typeface.example.ts` with `paddedFailures` and `genericFailures` and
   import them in the new suite, so the copyable examples run.
5. `docs/tokens.md`:
   - type index: `TypefaceFailure` — "A family name that is not one exact,
     non-empty family the runtime can resolve."; `TypefaceRule` — the four rule
     names, a key of `typefaceRules`;
   - the section heading sentence: "holds both fields to four rules";
   - two table rows:

     | Rule | What it catches |
     | ---- | --------------- |
     | `trimmed` | A name with surrounding whitespace — `" Inter"` — is not the installed name; the runtime matches the string it is given. |
     | `css-generic` | A CSS generic keyword — `system-ui`, `sans-serif`, … — is CSS syntax, not an installed family; `.SystemUIFont` is the native sentinel. |

   - name `cssGenericFamilies` and state that it is the rule's domain;
   - keep the `Helvetica Neue` and `.SystemUIFont` acceptance sentences and add
     that internal whitespace is not padding.
6. `docs/design-system.md` §11: the sentence becomes "A family name is one
   exact, non-empty family — not a CSS comma stack, not a CSS generic keyword
   and not a padded name — …".
7. `packages/tokens/README.md`: "reports a name that is empty, a CSS comma
   stack, a padded name (`" Inter"`) or a CSS generic keyword (`system-ui`)".
8. `docs.test.ts`: rename the case; add a case iterating `cssGenericFamilies`
   and asserting the typeface section contains each keyword.
9. `readme.test.ts`: the case title and any "both rules" wording.
10. `COMPONENTS.md`: extend the **Theme typeface check** row.
11. Tick the new `TODO.md` row and index this plan.

## Commands and expected results

```sh
nub run --filter @gpuixui/tokens test
```

Expected: 123 files pass (122 today plus `typeface-name.test.ts`); the new
cases report `trimmed` and `css-generic`; every shipped set still passes.

```sh
nub run check && nub run lint && nub run test
```

Expected: all green.

## Test plan

Write `packages/tokens/src/typeface-name.test.ts` with this header:

> Bug guarded: `themeTypefaceFailures` held a family name only to `non-empty`
> and `single-family`, so a padded name (`" Inter"`) or a CSS generic keyword
> (`system-ui`) passed every one of the six checks and painted GPUI's silent
> system fallback. Plan 385 closed the comma stack; this suite closes the two
> forms it left.

Cases:

1. **padded `sans`** — `families(" Inter")` yields exactly
   `[{ kind: "typeface", role: "sans", rule: "trimmed", value: " Inter" }]`
   from `themeFailures`.
2. **padded `mono`** — the same on the other field.
3. **a whitespace-only value stays `non-empty` alone** — no duplicate
   `trimmed` diagnostic.
4. **every `cssGenericFamilies` keyword** — each yields one `css-generic`
   failure on `sans`; this iterates the exported domain, not a retyped list.
5. **a padded generic** — `" system-ui"` yields `trimmed` only (the rule reads
   the value as written).
6. **both fields, in role order** — `families(" Inter", "monospace")` reports
   `sans/trimmed` then `mono/css-generic`.
7. **accepted forms** — `"Helvetica Neue"`, `".SystemUIFont"` and the shipped
   themes still report `[]`.
8. **the total check and the other five** — a padded theme's
   `themeColorFailures`, `themeContrastFailures`, `themeMetricFailures`,
   `themeTextTierFailures` and `themeDirectionFailures` are `[]`, while
   `themeFailures` reports the one `typeface` entry. This is the false pass the
   plan exists to close.

Two directions: on the pre-fix `typeface.ts`, cases 1–6 return `[]` (or miss
the entry), so the new suite fails; after the change it passes. Run the suite
once before implementing and once after, and record both runs in the commit
message or the session log. `scripts/verify-two-directions.sh` uses `jj`, which
this repo does not use (PLAN.md D1), so prove the directions by running the new
file against the pre-fix source (`git stash push packages/tokens/src/typeface.ts`)
and then against the fix.

## STOP conditions

- A shipped theme, platform variant or recipe gains a typeface failure. Every
  shipped family is exact (`.SystemUIFont`, `Menlo`, `DejaVu Sans Mono`,
  `Consolas`). If one is reported, stop: the rule is over-broad.
- `"Helvetica Neue"` or `.SystemUIFont` is reported. Stop: internal spaces and
  the sentinel are valid.
- A colour, contrast, hierarchy, direction or metric result changes for a
  shipped set. Stop: the change must be confined to the typeface half.
- The whitespace-only case now reports two failures. Stop: an empty value is
  the `non-empty` rule's diagnostic alone (plan 532's one-diagnostic rule).
- A docs guard fails because the table or the type index is not derived from
  `typefaceRules` / `cssGenericFamilies`. Fix the document, not the guard.

## Acceptance

- `themeTypefaceFailures` reports a padded name as `trimmed` and a CSS generic
  keyword as `css-generic`, on either family.
- `themeFailures` carries the same entries with `kind: "typeface"`.
- `.SystemUIFont`, `Helvetica Neue` and all 24 shipped sets pass.
- `typefaceRules` and `cssGenericFamilies` are the published indexes; the docs
  name every rule and every keyword.
- All gates green.

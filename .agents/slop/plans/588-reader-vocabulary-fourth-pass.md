# 588 — Reader vocabulary, fourth pass

**Phase:** F (search completeness)
**Workstream:** docs-site
**Depends on:** 410, 419, 431, 561, 566, 568, 574, 579, 583, 585, 587
**Status:** implemented

## 1. The measured defect

A fourth sweep of the real search index (2026-10-19, `/api/search?query=…`)
found four reader words that still miss the page that owns them:

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `alertdialog` | nothing | Confirmation dialogs (`ConfirmDialog` is the ARIA alert dialog) |
| `alert dialog` | Alerts | Confirmation dialogs |
| `scrollbar` | a text chunk on Scroll area | Scrollable containers (`ScrollArea` owns the subject) |
| `scrollbars` | Theming colour table | Scrollable containers |
| `a11y` | Contributing's check table | Accessibility |
| `wcag` | Contributing's check table | Accessibility |
| `webview` | nothing | Introduction (it says GPUix has no web view) |

The alias table (plan 566) and page summaries (plans 568/574) already cover the
first three passes; these are the same two mechanisms, measured again. No
ranker change is needed.

## 2. What to build

### 2.1 `apps/docs/src/lib/component-aliases.ts`

Add under the existing rule — whole-query, one record only, no title/symbol
shadowing:

```ts
["confirm-dialog", ["alert dialog", "alertdialog"]],
["scroll-area", ["scrollview", "scroll view", "scroll pane", "scrollbar", "scrollbars"]],
```

### 2.2 Page summaries (frontmatter descriptions)

- `apps/docs/content/docs/accessibility.mdx`: append `a11y and WCAG 2.1 AA
  conformance` to the description. The page already runs axe in both schemes;
  this names the subject a reader types.
- `apps/docs/content/docs/index.mdx`: change the description to
  `A native UI component library rendered by GPUix — not a webview — documented
  honestly.` The page already says "no web view"; the one-word spelling was not
  retrievable.

### 2.3 Tests

- `apps/docs/src/lib/search.test.ts` — one integration block in the established
  style with the seven measured queries and their destination pages.
- `component-aliases.test.ts` already proves key validity, uniqueness,
  no-shadowing and index presence; the new terms cannot skip those rules.

## 3. Commands and expected results

```sh
nub exec --filter docs vitest run src/lib/search.test.ts src/lib/component-aliases.test.ts
# Expected before the change: the new search cases fail by query.
# Expected after: green.

nub run --filter docs test
# Expected: the full docs suite passes.

nub run --filter docs smoke:build
# Expected: exit 0; `/api/search` answers the new terms in the production build.
```

## 4. Test plan (two directions)

| Query | Owner | Forced defect |
| ----- | ----- | ------------- |
| `alertdialog` | Confirmation dialogs | remove the alias → returns nothing |
| `alert dialog` | Confirmation dialogs | remove the alias → returns Alerts |
| `scrollbar` | Scrollable containers | remove the alias → returns a text chunk |
| `scrollbars` | Scrollable containers | remove the alias → returns Theming |
| `a11y` | Accessibility | remove the summary words → returns Contributing |
| `wcag` | Accessibility | remove the summary words → returns Contributing |
| `webview` | Introduction | remove the summary word → returns nothing |

Each case asserts the first result is a **page** at the destination (fragment
allowed), so a text chunk does not pass.

## 5. STOP conditions

- An alias shadows another record's title or exported symbol: stop and report
  rather than overriding the ranker.
- `alert dialog` still returns Alerts because the Alert page's own title
  outranks the alias: record it as a real ambiguity, do not add a second alias
  to Alerts.
- A query cannot reach its page without a ranker change: stop; this pass is
  vocabulary only.

## 6. Measured runs

(Filled by the executor.)

## 7. Acceptance

- The seven queries return their owning page first, in unit and production
  builds.
- No alias or summary change moves an existing measured query.
- `nub run --filter docs test`, `check-types`, `nub run check`, `nub run lint`,
  `nub run test` and `smoke:build` are green.

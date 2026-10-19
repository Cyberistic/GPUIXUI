# 586 — Theming documents and indexes the high-contrast palettes

**Phase:** F (documentation completeness)
**Workstream:** docs-site
**Depends on:** 410 (docs site), 416 (docs identity from tokens), 419/431/504
(generated token search), 574/583 (page subjects), 514 (the contrast axis)
**Status:** implemented

## 1. The measured defect

`@gpuixui/tokens` ships **four** semantic palettes: light, dark,
high-contrast light and high-contrast dark. The Theming page renders all 47
roles from the first two (`<TokenColors />`), then describes the high-contrast
exports in prose and shows no value. A reader who needs the accessible palette
cannot see it, and a value copied from a high-contrast theme — the exact thing
`theming.mdx` promises for the other two ("a value you paste from a theme finds
the role that owns it") — finds nothing.

Measured on 2026-10-19 against the built site (`/api/search?query=…`, first
result), with the palette values read from the installed package:

| Query | Before | The page that owns it |
| ----- | ------ | --------------------- |
| `4A4F58` (high-contrast light `borderStrong`, also `placeholder`) | **nothing** | Theming → High contrast |
| `E8E8E8` (high-contrast light `secondary`) | **nothing** | Theming → High contrast |
| `1F1F1F` (high-contrast light `mutedForeground`) | **nothing** | Theming → High contrast |
| `F6F8FA` (default light `background`) | Theming | Theming → Colour roles — the existing promise works |
| `5F4BDB` (default light `primary`) | Theming | Theming → Colour roles — the existing promise works |

`MISSION.md` requires every public token to be documented. The high-contrast
values are public (`highContrastLightTheme`, `highContrastDarkTheme`, and the
`highContrast*Colors` maps they are built from), and the package's own
`color.test.ts` holds them to the 7:1 / 4.5:1 floors. The docs own the values,
not the floors.

This is not a ranker defect: the generated colour document exists and already
wins for light/dark values. It has no high-contrast value to win with.

## 2. What to build

### 2.1 `apps/docs/src/lib/docs-theme.ts`

Export the two high-contrast colour maps beside `themeColors`, from the same
package entry the docs already use. Do not retype a value.

```ts
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  type ThemeColors,
} from "@gpuixui/tokens";

export const highContrastColors = {
  light: highContrastLightTheme.colors,
  dark: highContrastDarkTheme.colors,
} as const satisfies Record<"light" | "dark", ThemeColors>;
```

### 2.2 `apps/docs/src/components/token-colors.tsx`

Extract the table into one reusable, exported `TokenColorTable` that takes the
palettes to render. `TokenColors` becomes a thin call with light + dark, so its
rendered markup and `data-role` contract do not change and
`token-colors.test.tsx` keeps passing.

```tsx
export interface ColourPalette {
  /** Stable key used by tests; also the cell's `data-palette`. */
  readonly key: string;
  /** The reader-facing column heading. */
  readonly label: string;
  readonly colors: ThemeColors;
}

export function TokenColorTable({
  palettes,
}: {
  readonly palettes: ReadonlyArray<ColourPalette>;
}) { /* the existing table, mapping `palettes` */ }
```

### 2.3 `apps/docs/src/components/contrast-colors.tsx` (new)

A thin wrapper, in the same plain semantic HTML:

```tsx
export function ContrastColors() {
  return (
    <TokenColorTable
      palettes={[
        { key: "light", label: "High-contrast light", colors: highContrastColors.light },
        { key: "dark", label: "High-contrast dark", colors: highContrastColors.dark },
      ]}
    />
  );
}
```

Register it in `apps/docs/src/components/mdx.tsx`.

### 2.4 `apps/docs/content/docs/theming.mdx`

- Frontmatter description: name the contrast axis (the page already owns
  "light and dark themes"; this makes `high contrast` an authored subject). Keep
  it one sentence.
- In `## High contrast`, after the prose, add:

```mdx
The table below is generated from those two themes, so it shows the values the
package ships. A high-contrast value you paste finds the role that owns it, the
same as the light and dark tables above.

<ContrastColors />
```

- Correct the semantic-roles paragraph: the promise now covers all four shipped
  palettes, not only two.

### 2.5 `apps/docs/src/lib/token-search.ts`

- Import the two high-contrast themes from `@gpuixui/tokens`.
- Add a **separate** generated document, `High-contrast colour roles`, anchored
  at `#high-contrast` beside the new table. Its content carries both values per
  role:

```
primary: #3B2C8F (high-contrast light), #C7CBFF (high-contrast dark)
```

- Add it to `tokenSearchEntries` with `names: []`. It promotes no role name, so
  `destructiveSoft` keeps the light/dark table first; a high-contrast value —
  which appears nowhere else — lands on the high-contrast table. Do not merge
  the values into the light/dark document: a reader following a value should
  reach the table that renders it.

### 2.6 `apps/docs/scripts/smoke-build.ts`

Add one production search check beside `destructiveSoft`:

```ts
{
  query: highContrastLightTheme.colors.borderStrong,
  expected: "/docs/theming#high-contrast",
  first: true,
  what: "a pasted high-contrast token value",
},
```

Import `highContrastLightTheme` from `@gpuixui/tokens` (the script already runs
in Node and may read the package). **Encode the query** in the request URL:
`/api/search?query=${encodeURIComponent(check.query)}`. The existing checks are
plain words, so this was latent; a `#` in the value made the browser-side URL
parse everything after it as a fragment and the server received an empty query.

### 2.7 Documentation and tracking

- `apps/docs/README.md`: one sentence in the search section that the colour
  document carries all four palettes, if that section enumerates the generated
  documents.
- `COMPONENTS.md`: the **High-contrast theme** row notes that Theming renders
  all 47 values from both high-contrast themes and indexes them.
- `TODO.md`: add and tick the task in the docs-site section; update the fraction.
- `.agents/slop/plans/README.md`: add this plan to the docs-site table.

## 3. Test plan

Every test must fail with the fix removed.

### `apps/docs/src/components/contrast-colors.test.tsx` (new)

1. **Every role is one row.** `data-role` appears `colorRoles.length` times and
   each role name is present. Fails if the table drops a role.
2. **Both palettes' real values are rendered.** For every role, the markup
   contains `highContrastLightTheme.colors[role]` and
   `highContrastDarkTheme.colors[role]`. Fails if the component uses
   `lightTheme`/`darkTheme` or a literal.
3. **The table is not the default palette.** At least one rendered value is not
   in `lightTheme.colors`, and every such value is rendered. Fails if the
   wrapper passes the wrong maps; the check is derived, not a hard-coded hex.

### `apps/docs/src/lib/token-search.test.ts` (extend)

4. **Every high-contrast value is in the high-contrast document.** For each role,
   `contentAt(contrastUrl)` contains both high-contrast values. Fails before the
   change (measured: 47 roles, 0 of 94 values present).
5. **The light/dark row is unchanged, and the high-contrast row is exact.**
   `destructiveSoft` keeps its two-value light/dark format in the colour
   document and gains the two-value high-contrast format in the contrast
   document. Fails if the labels or order drift.
6. **A pasted high-contrast value reaches the high-contrast table.**
   `search(highContrastLightTheme.colors.borderStrong, 5)[0]?.url` is
   `/docs/theming#high-contrast`. Fails today (measured: `[]`).
7. **The plain-word guard still holds.** `input` and `label` keep their
   component pages (the existing test; run unchanged to prove the index did not
   flood).

### `apps/docs/scripts/smoke-build.ts`

8. The production crawl queries the high-contrast value and requires the
   high-contrast anchor. Fails if the document is dropped from the built index,
   and fails today because the request URL did not encode the `#` (measured:
   the server received an empty query).

### Two-direction proofs to record in §6

1. Remove `<ContrastColors />` from Theming → the role/value component test
   still passes (it renders the component in isolation), so the **page-presence
   test** compares `theming.mdx` with the block. Measured: the test fails.
2. Remove the high-contrast document from `tokenSearchEntries` → the two
   content tests and the pasted-value search fail.
3. Map `highContrastColors.light` to `lightTheme` → the values test and the
   "not the default palette" test fail.
4. Remove the production check → the crawl can pass with the document dropped
   (the check is the only proof against the built index). Its first run also
   measured the unencoded-`#` defect described in §6.

## 4. Commands

```sh
nub run --filter docs test
nub run --filter docs check-types
nub run --filter docs smoke:build
nub run check
nub run lint
```

Expected: the docs suite passes with the new tests; `check-types` and the
crawler are clean; the repo gates are green. The crawler reports one more page
check and the build's page count is unchanged.

## 5. STOP conditions

- A high-contrast value still returns nothing from the built `/api/search`
  after the change.
- The colour table at 390 px makes the page scroll sideways or clips a column
  (`smoke:responsive`); the table wrapper must keep its horizontal scroll
  instead.
- `smoke:a11y` finds a keyboard-unreachable scroll region introduced by the new
  table.
- `input` or `label` stops reaching its component page.
- Any value in the new table is written as a literal instead of read from
  `@gpuixui/tokens`.
- A gate fails on a rule that cannot be fixed inside `apps/docs` — record the
  failure and stop; do not weaken the gate.

## 6. Measured runs (2026-10-19)

Baseline against the production build at the plan-585 commit, first result:

| Query | Before | After |
| ----- | ------ | ----- |
| `4A4F58` (high-contrast light `borderStrong`) | nothing | `/docs/theming#high-contrast` |
| `E8E8E8` (high-contrast light `secondary`) | nothing | `/docs/theming#high-contrast` |
| `1F1F1F` (high-contrast light `mutedForeground`) | nothing | `/docs/theming#high-contrast` |
| `input` / `label` | their component pages | unchanged |
| `destructiveSoft` | `/docs/theming` | unchanged |
| `5F4BDB` / `F6F8FA` (light values) | `/docs/theming` | unchanged |

Test failures before the implementation (new tests run against the plan-585
code):

1. `src/components/contrast-colors.test.tsx` did not load — `./contrast-colors`
   did not exist.
2. `token-search.test.ts`: the high-contrast row and every-value test failed
   (0 of 94 values in the index), and `search("#4A4F58")` returned `[]`.

Forced defects, each applied alone, run, and reverted:

1. Removed the high-contrast entry from `tokenSearchEntries` → **3 tests
   failed** (`lists the role's value…`, `lists both high-contrast values…`,
   `finds the role that owns a pasted high-contrast value`).
2. Removed `<ContrastColors />` from `theming.mdx` → **1 test failed** (the
   page-presence test), proving the block cannot silently disappear.
3. Mapped `highContrastColors.light` to `lightTheme.colors` → **2 tests
   failed** (the values test and the "not the default palette" test).

The production crawler also failed on its first run, for a real reason the unit
tests could not see: `#4A4F58` was interpolated into the request URL unencoded,
so everything after `#` was a fragment and the server answered an empty query.
The check now uses `encodeURIComponent`; the same URL returns the high-contrast
document.

Final: `nub run --filter docs test` — **101 files / 731 tests**;
`check-types` and `smoke:build` (98 pages, 1 279 anchors) green;
`smoke:responsive` 98 pages and `smoke:a11y --only /docs/theming` (2 schemes)
green; `nub run check`, `nub run lint` and `nub run test` green at the repo
root.

## 7. Acceptance

- Theming renders every role in both high-contrast themes, derived from
  `@gpuixui/tokens`.
- A high-contrast value is searchable from any page and lands on the
  high-contrast table.
- The light/dark table, its tests and its search promises are unchanged.
- The four shipped palettes are visibly distinct on the page.
- All gates are green and the plan index / `TODO.md` / `README.md` describe the
  result.

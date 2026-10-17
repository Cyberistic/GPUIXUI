# 447 — The tokens and theming API reference

- **Workstream:** docs-site
- **Phase:** F (documentation completeness)
- **Owns:** `apps/docs/content/docs/tokens-api.mdx` (new),
  `apps/docs/content/docs/{meta.json,theming.mdx,api-reference.mdx}`,
  `apps/docs/src/tokens-api-page.test.ts` (new), the docs rows in `TODO.md`,
  the docs rows in the plan index
- **Depends on:** `@gpuixui/tokens` exports (plans 011–018, 051), 410 (site
  contract), 415 (type-table generator), 441 (API reference index)
- **Blocks:** nothing. It closes a documentation gap; it changes no runtime code.

## 1. Why

`MISSION.md`'s information architecture requires an **API reference**, and the
tokens section requires every public token and the extension mechanism to be
documented. Today:

- `apps/docs/content/docs/api-reference.mdx` is an **index of component props
  types only** (`<ApiIndex />`; plan 441). It deliberately renders no type table
  of its own, and `api-reference-page.test.ts` enforces that.
- `apps/docs/content/docs/theming.mdx` documents the *values* (47 colour roles,
  scales, density, elevation) and one `extendTheme` example. It does not state
  the signature or return shape of the other public helpers:
  `createTheme`, `getTheme`, `platformTheme`, `alpha`, `statusTone`,
  `focusRing`, `elevationShadow`, `textStyle`, `controlHeight`,
  `controlPaddingX`, or the `@gpuixui/tokens/react` provider pair.
- `docs/tokens.md` (a maintainer document owned by the tokens workstream) does
  document the API, but the site's only route to it is an external GitHub link.
  The docs site must be self-contained for a reader.

So a consumer who wants to build a brand theme, a soft status surface or a focus
ring has no site page with the **input shape** (`ThemeConfig`), the **resolved
shape** (`Theme`) or the helper signatures. The gap is documentation, not code.

The reference must be generated where it can drift (the two shapes) and guarded
where it is prose (the function list), because a new exported helper silently
missing from the page is exactly the failure a reader cannot see.

## 2. What the page is (and is not)

**Is:** the public surface of `@gpuixui/tokens` — two generated type tables, a
complete function table, the React provider entry point, and a pointer to the
value tables on Theming.

**Is not:**

- a second copy of `docs/tokens.md`'s prose or of the token value tables (those
  stay generated on `/docs/theming`);
- a component props reference (that is `/docs/api-reference`);
- a promise that a function works in the native runtime. These are pure values
  and helpers; their native evidence is the theme gallery (plan 150) and Tier 1
  suites (plans 041/055), already linked from Theming.
- a place to document internals (`colorRoles` is public data, but the value
  tables already render it; the page links there rather than repeating it).

## 3. Files

### 3.1 Create `apps/docs/content/docs/tokens-api.mdx`

Frontmatter:

```mdx
---
title: Tokens API
description: Theme shapes, extension helpers and the React provider in @gpuixui/tokens.
---
```

Body sections, in order (exact headings — the test checks the two tables, not
the prose):

1. Intro paragraph: `@gpuixui/tokens` is plain data and pure helpers; values and
   roles are on [Theming](/docs/theming); this page is the API. The React
   provider is a separate entry, `@gpuixui/tokens/react`.
2. `## Theme shapes`
   - `<auto-type-table path="../../../../../packages/tokens/src/theme.ts" name="ThemeConfig" />`
     (the input a consumer writes: a `mode` plus every optional group).
   - `<auto-type-table path="../../../../../packages/tokens/src/theme.ts" name="Theme" />`
     (the complete object components receive — no partial themes at render).
   - Two sentences: overrides merge group by group; `elevation` arrays replace;
     the mode is never changed by an override.
3. `## Functions` — one table, one row per exported function, columns
   `Function | Signature | Returns`. Exact rows (signatures transcribed from
   `packages/tokens/src/**`):

   | Function | Signature | Returns |
   | -------- | --------- | ------- |
   | `createTheme` | `createTheme(config: ThemeConfig): Theme` | a theme for `config.mode` built from the shipped base |
   | `extendTheme` | `extendTheme(base: Theme, overrides: ThemeOverrides): Theme` | a new theme; `base` is never mutated |
   | `getTheme` | `getTheme(mode: ThemeMode, contrast: ThemeContrast = "default"): Theme` | a shipped theme, including the high-contrast pair |
   | `platformTheme` | `platformTheme(base: Theme, platform: PlatformName): Theme` | `base` with that platform's font families |
   | `alpha` | `alpha(color: string, amount: number): string` | an 8-digit hex colour; non-hex input is returned unchanged |
   | `statusTone` | `statusTone(theme: Theme, tone: StatusTone): StatusToneStyle` | the soft surface, its readable foreground, and a 30%-alpha edge |
   | `focusRing` | `focusRing(theme: Theme): FocusRing` | the zero-offset, zero-blur ring the runtime can paint |
   | `elevationShadow` | `elevationShadow(theme: Theme, level: ElevationLevel): BoxShadow \| undefined` | the level's single shadow, or `undefined` for `overlay` |
   | `textStyle` | `textStyle(theme: Theme, role: TextRole): TextStyleProperties` | size, leading, weight and family for a type role |
   | `controlHeight` | `controlHeight(theme: Theme, size: ControlSize): number` | the control height at the active density |
   | `controlPaddingX` | `controlPaddingX(theme: Theme, size: ControlSize): number` | the horizontal padding at the active density |
   | `ThemeProvider` | `ThemeProvider({ theme, children }: ThemeProviderProps)` | the `@gpuixui/tokens/react` provider |
   | `useTheme` | `useTheme(): Theme` | the nearest theme, or `lightTheme` without a provider |

4. `## React` — the provider snippet (real import path), one sentence: nested
   providers scope a brand to a subtree; there is no OS appearance query, so the
   application owns the mode switch and passes the resolved theme.
5. `## Values` — one sentence pointing at the generated value tables on
   Theming, plus the names a consumer imports for data (`themes`,
   `highContrastThemes`, `colorRoles`, `spacing`, `radius`, `borderWidth`,
   `iconSize`, `densityPresets`, `lightElevation`, `darkElevation`). No table:
   the values already render on `/docs/theming` and a second copy would drift.
6. No `##` section may claim a component exists. This is not a component page;
   `component-pages.test.ts` must keep ignoring it (it only walks
   `content/docs/components`).

Do **not** add a colour literal, a hand-copied token value, or a `<Callout>`
that restates the migration. Prose stays under the page: the tables carry the
detail.

### 3.2 Edit `apps/docs/content/docs/meta.json`

Insert `"tokens-api"` directly after `"api-reference"` (the API group stays
together at the end of the IA).

### 3.3 Edit `apps/docs/content/docs/theming.mdx`

In `## Extending a theme`, after the `extendTheme` snippet, add one sentence with
a real link:

> Every helper's signature, and the `ThemeConfig`/`Theme` shapes, are in the
> [Tokens API](/docs/tokens-api).

### 3.4 Edit `apps/docs/content/docs/api-reference.mdx`

After the opening paragraph, add one sentence scoping the page and linking the
new one:

> This page indexes component props. The package's theming API — theme shapes,
> every helper and the React provider — is on the [Tokens API](/docs/tokens-api).

Do not add `<auto-type-table>` to this page: `api-reference-page.test.ts` fails
on it by design (plan 441).

### 3.5 Create `apps/docs/src/tokens-api-page.test.ts`

Vitest, `node:fs`/`node:url` at the boundary (the app has no Effect runtime —
plan 411 §5). Header comment states the bug being guarded: *a public helper or
theme shape ships without a line on the API reference, and a reader cannot find
it.* Three tests:

1. **Every exported function is on the page.** Read these source files relative
   to the test (`../../../packages/tokens/src/{color,elevation,platforms,styles,theme,react}.ts`),
   match `export function (\w+)` and `export const (\w+) = \(`, and assert each
   captured name appears in `content/docs/tokens-api.mdx`. Assert the captured
   list contains at least `createTheme`, `extendTheme`, `statusTone`, `focusRing`
   and `useTheme` so a broken matcher cannot make the test vacuous.
2. **Both generated tables resolve.** Use the app's shared generator
   (`app/lib/type-table-generator.ts` — `import { generator } from "./lib/type-table-generator"`)
   to generate `ThemeConfig` and `Theme` from
   `packages/tokens/src/theme.ts`; assert each returns one document with a
   non-empty `entries`. This is the same generator the site runs (plan 415).
3. **The page does not reprint values.** Assert the page contains no hex colour
   literal (`/#[0-9A-Fa-f]{6}/`) — the value tables own those, and a copy here
   would drift. (`docs/tokens.md` may quote values; this page may not.)

Do not assert on prose wording that a future editor may legitimately improve;
assert on the API surface and the generated tables.

### 3.6 Index and tracking

- `.agents/slop/plans/README.md` — add the row below the docs-site table:
  `447-tokens-api-reference.md | The tokens and theming API reference | F | 410, 415, 441 | implemented`.
- `TODO.md` — under “Docs site workstream”, add `[x] The tokens API reference
  (plan 447) …` with the measured test count. Keep the progress bar honest
  against the row count.

## 4. Commands and expected results

Run from `workspaces/docs-site`:

1. `nub run --filter docs test -- src/tokens-api-page.test.ts`
   Expected: the new file passes. (Vitest's `--` filter may still run the whole
   suite in this workspace; both outcomes are acceptable as long as the new file
   is listed and passes.)
2. `nub run --filter docs check-types`
   Expected: exit `0`.
3. `nub run --filter docs test`
   Expected: exit `0`; test count rises by 3 from the current **212** to
   **215** (the baseline was measured at plan time: 36 files / 212 tests).
4. `nub run --filter docs build`
   Expected: exit `0`; the build lists the new route `/docs/tokens-api`.
5. `nub run --filter docs smoke:build`
   Expected: exit `0` (or `2` **only** if the smoke script cannot reach its own
   server — record the output). The page count and link count both rise; the
   script prints them.
6. `nub run check`, `nub run lint`, `nub run test` at the repo root.
   Expected: all exit `0`.
7. Serve the dev server (`nub run --filter docs dev`) and check
   `/docs/tokens-api`: both tables render with rows, the function table is
   complete, the sidebar entry sits after API reference, and the Theming link
   reaches the page. Record the observed rows (not “looks fine”).

## 5. Test plan — both directions

The regression the test guards is *a public helper or theme shape missing from
the site*. Prove the test can fail:

- **Direction 1 (a helper is dropped):** delete the `| \`focusRing\` | …` row
  from `tokens-api.mdx`, run command 1, and record the failure naming
  `focusRing`. Restore the row; it passes.
- **Direction 2 (a shape stops resolving):** change the `Theme` table's `name`
  to `ThemeShape`, run command 1, and record the failure. Restore it; it passes.
- **Direction 3 (a value is copied):** add `` `#F6F8FA` `` to a sentence on the
  page, run command 1, and record the hex-literal failure. Remove it.

Do not claim the suite green until all three directions were observed.

## 6. STOP conditions

- **`ThemeConfig` or `Theme` does not generate** through `fumadocs-typescript`
  (empty entries or an unresolved-import error): stop. Do not hand-write the
  shape. Record the generator error in the plan and `TODO.md` and leave the page
  out.
- **A public helper is exported from a file this plan did not list** (for
  example a new module in `packages/tokens/src`): stop and extend the source
  list in the test and the table together — do not narrow the matcher to hide it.
- **The page needs a token value to explain itself:** stop. Values belong to
  the generated tables on Theming; a copied value fails test 3 by design.
- **Adding the page changes a count other tests hard-code** (page/link counts):
  fix the assertion only if it is a measured total that legitimately moved;
  never delete an assertion to get green.

## 7. Acceptance

- [ ] `/docs/tokens-api` renders both generated tables and the complete
      function table; the sidebar, sitemap, search and internal links agree.
- [ ] `tokens-api-page.test.ts` fails when a helper row is removed, when a
      table name is wrong, and when a hex value is pasted in — all three
      observed.
- [ ] Theming and API reference link to the page; the API reference still
      renders no `<auto-type-table>`.
- [ ] `check`, `lint`, `test`, the docs build and `smoke:build` are green.
- [ ] Plan index and `TODO.md` record the result with the measured test count.

## 8. Result (measured 2026-10-17, `agent/docs-site`)

Implemented as planned. The page renders both generated tables (10 `Theme`
fields, `ThemeConfig`'s inherited groups) and all 13 function rows; the sidebar
lists it after API reference, `/docs/theming` and `/docs/api-reference` link to
it, and the sitemap grew from 66 to **67 pages** (`smoke:build`: 67 pages,
86 links, search and robots checked).

Both-direction proofs, all three run with `nub x vitest run
src/tokens-api-page.test.ts` from `apps/docs`:

| Break | Observed failure |
| ----- | ---------------- |
| deleted the `focusRing` table row | `expected [ 'focusRing' ] to deeply equal []` |
| renamed the `Theme` table to `ThemeShape` | `expected [ 'ThemeConfig', 'ThemeShape' ]` to contain `Theme` |
| pasted `#F6F8FA` into a sentence | `expected [ '#F6F8FA' ] to deeply equal []` |

After restoring each, the file passes 3/3. The full docs suite is **37 files /
215 tests** (was 36/212); `check-types`, `build`, `smoke:build`, `nub run
check`, `nub run lint` and `nub run test` all exit `0`.

One measured caveat: the generator resolves its `tsconfig` from the process
working directory, so the test must run through `nub run --filter docs test`
(cwd `apps/docs`). Running vitest from the repo root with `--root apps/docs`
fails with `tsconfig file not found`; that is a harness detail, not a page
defect.


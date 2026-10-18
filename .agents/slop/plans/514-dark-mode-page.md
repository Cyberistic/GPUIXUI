# 514 — The dark-mode page: the application's mode switch

**Workstream:** docs-site (`apps/docs`, `docs/preview-strategy.md`).
**Phase:** F.
**Depends on:** 410 (site), 416 (identity from tokens), 430 (token scales),
503 (provider nesting), 511 (the docs' own theme switch — this page documents
the library's switch, not the site's).

## 1. The gap this closes

`MISSION.md` requires light/dark themes and asks that every theme capability be
documented. Today the site documents the **design** of the two modes
(`/docs/theming` → "Light and dark") and the **API surface**
(`/docs/tokens-api` → `getTheme`, `highContrastThemes`), but no page shows an
application **switching** modes:

- `/docs/getting-started` says "The application owns the mode switch … see
  Theming for the roles and the extension mechanism" — and Theming never shows
  how to switch, persist or compose the mode with contrast and platform.
- `/docs/installation` renders one fixed theme.
- `/docs/tokens-api` lists the constructors but not the provider recipe a mixed
  `primitives` + `components` tree needs.

A reader who finishes Getting started can render one theme and has no documented
path to a dark mode. This is the same gap the independently built site on
`origin/master` closed with a `dark-mode.mdx` page, so the need is corroborated
outside this branch.

**Measured facts this page must state (verified in this tree, 2026-10-18):**

| Fact | Source |
| ---- | ------ |
| `ThemeMode = "light" \| "dark"` | `packages/tokens/src/theme.ts` |
| `ThemeContrast = "default" \| "high"` | `packages/tokens/src/theme.ts` |
| `getTheme(mode, contrast = "default"): Theme` | `packages/tokens/src/theme.ts` |
| Four built-ins: `themes` / `highContrastThemes`, plus the four named exports | `packages/tokens/src/theme.ts` |
| `platformTheme(base: Theme, platform: PlatformName): Theme` changes only the name and the type families | `packages/tokens/src/theme.ts`, plan 051 |
| The token provider is `ThemeProvider` from `@gpuixui/tokens/react`; primitives own a second provider | `packages/tokens/src/react.ts`, `packages/primitives/src/components/ThemeProvider.tsx` |
| No OS appearance detection: GPUix exposes no appearance query, so the app passes the resolved theme | `packages/tokens/src/react.ts`, `docs/tokens.md`, `docs/design-system.md` |

## 2. Files

Create:

- `apps/docs/content/docs/dark-mode.mdx`
- `apps/docs/src/dark-mode-page.test.ts`

Change:

- `apps/docs/content/docs/meta.json` — insert `"dark-mode"` directly after
  `"theming"`.
- `apps/docs/content/docs/getting-started.mdx` — in the paragraph that begins
  "`lightTheme` and `darkTheme` are plain values", extend the link sentence to
  also point at `/docs/dark-mode`.
- `apps/docs/content/docs/theming.mdx` — at the end of `## Light and dark`, add
  one sentence pointing at `/docs/dark-mode` for the switch.
- `TODO.md` — add and tick the task under "Docs site workstream"; update the
  `114/114` line to `115/115`.
- `.agents/slop/plans/README.md` — add the table row and update the note that
  says `500–509` take the free numbers (now through `514`).

Do **not** create a separate component or registry record: this is a guide page,
not a component.

## 3. Page content (exact outline)

Frontmatter: `title: Dark mode`, `description: Switch light, dark and
high-contrast themes from application state; the library ships no OS-mode
listener.`

1. **A resolved theme, not a class** — a theme is plain data; `getTheme(mode,
   contrast)` returns one of four built-ins; a four-row table of the calls.
2. **The application owns the mode** — GPUix exposes no appearance query; a
   listener would be a guess. Testing and screenshots become deterministic.
   Link `docs/tokens.md` and `/docs/theming`.
3. **Switching at runtime** — one `tsx` fence with `useState<ThemeMode>`, a
   contrast state, both providers nested when the app uses both packages:
   `TokensThemeProvider` from `@gpuixui/tokens/react` outside `ThemeProvider`
   from `@gpuixui/primitives`, both given the same `theme`.
4. **Persisting the choice** — the library needs only the resolved mode; store
   it wherever the app stores preferences. Snippet stays app-owned (no invented
   package import) and says so.
5. **High contrast is a second axis** — `getTheme(mode, "high")`; same roles;
   link `/docs/theming#high-contrast`.
6. **Platform and mode are independent** — `platformTheme(getTheme(mode,
   contrast), platform)`; it changes the monospace family and the theme label
   (and only those) — do not claim per-platform palettes (that is tokens plan
   433's still-open work, recorded in `TODO.md`).
7. **What a switch costs** — the theme is data; the provider re-renders the
   subtree. No CSS cascade exists in the native runtime.

Every claim above is either in §1's table or is a direct read of the provider
source. No sentence promises OS detection, automatic persistence or a
`mode` prop on the provider.

## 4. The guard: `apps/docs/src/dark-mode-page.test.ts`

Header comment names the bugs guarded. Assertions:

1. **The page is in the sidebar and on disk.** `meta.json` contains `dark-mode`
   immediately after `theming`; the MDX exists. (A page nothing links to fails.)
2. **Every constructor the page names is a real export.** Read
   `packages/tokens/src/theme.ts` and `.../react.ts` as text. `getTheme` and
   `platformTheme` must each match `export function|const <name>`, and
   `ThemeProvider` must match an export in `react.ts`. The page must contain
   `getTheme`, `ThemeMode`, `ThemeContrast` and `platformTheme`.
3. **The contrast table is derived, not remembered.** Parse the union literals
   of `ThemeMode` and `ThemeContrast` from source; collect every
   `getTheme("<mode>"[, "<contrast>"])` call in the page's `tsx`/`ts` fences;
   every literal must be a member (a page that calls `getTheme("sepia")`, or a
   mode the package dropped, fails). The page must mention all four
   combinations.
4. **The provider recipe is complete.** One `tsx` fence must import
   `ThemeProvider` from `@gpuixui/tokens/react` and `ThemeProvider` from
   `@gpuixui/primitives` — the mixed-app contract proven in plan 503. Remove
   either import and the test fails.
5. **The no-appearance claim cannot outlive an appearance API.** Scan the
   exported symbols in `packages/tokens/src/{theme,platforms,color,scale,
   styles,typography}.ts` for `/appearance|prefers|systemTheme|colorScheme/i`;
   expect `[]`. Read `interface ThemeProviderProps` in `react.ts`; expect no
   `mode` property. The page must contain the sentence that the application
   owns the mode. If the package gains the capability, the test fails and the
   page must be rewritten — it can never silently overclaim.

### Two-direction proofs (record the output in this plan's §6)

1. Rename `getTheme` to `getThemeFor` in the page only → test 2 fails naming the
   missing export. Revert.
2. Change one table call to `getTheme("sepia")` (and add a table row) → test 3
   fails naming the literal. Revert.
3. Delete the `@gpuixui/primitives` import line from the runtime fence → test 4
   fails. Revert.
4. Temporarily add `export const systemAppearance = () => "dark";` to
   `packages/tokens/src/theme.ts` → test 5 fails. Revert; do not commit.
5. Remove `"dark-mode"` from `meta.json` → `content.test.ts` "orders every
   top-level page on disk" fails. Revert.

## 5. Commands and expected results

```sh
nub run --filter docs test            # 66 files / 454 tests, all pass
nub run --filter docs check-types     # tsc, exit 0
nub run --filter docs smoke:build     # 91 pages, 112 links, exit 0
nub run check                         # test-quality, lint, fmt, types — exit 0
nub run lint                          # exit 0
nub run test                          # full workspace suite — exit 0
```

`nub run --filter docs test` counts move from 65 files / 448 tests to **66 files /
454 tests**, and `smoke:build` from 90 to **91 pages**.

## 6. Measured result

Implemented 2026-10-18 on `agent/docs-site`.

- `apps/docs/content/docs/dark-mode.mdx` — 7 sections; every `getTheme` call in
  the prose is a literal from the package's unions; the runtime fence mounts
  both providers; the persistence snippet is labelled app-owned.
- `apps/docs/src/dark-mode-page.test.ts` — 6 tests: sidebar order + frontmatter,
  real exports, derived combos, literal-call validity, both providers, and the
  no-appearance contract (export scan + `ThemeProviderProps` shape).
- Sidebar, Getting started and Theming link the page. Provenance: `meta.json`
  orders `theming → dark-mode → typography`, and `content.test.ts` resolves the
  new file.
- `nub run --filter docs test`: **66 files / 454 tests** (was 65 / 448).
- `nub run --filter docs check-types`: exit `0`.
- `nub run --filter docs smoke:build`: **91 pages** (was 90), 112 links, 3 brand
  assets, exit `0`.

Two-direction proofs, all measured on the shipped tree and then reverted:

| Forced defect | Failure |
| ------------- | ------- |
| `getTheme` → `getThemeFor` in the page | "lists every built-in combination" reported all four combos missing; "never calls getTheme …" reported 0 calls |
| one table row changed to `getTheme("sepia")` | "lists every built-in combination" named `["dark","default"]` missing; the literal check reported the unknown mode |
| the `@gpuixui/primitives` import removed from the runtime fence | "mounts both providers" failed with `toContain("@gpuixui/primitives")` |
| `export const systemAppearance` appended to `packages/tokens/src/theme.ts` | "keeps the no-appearance claim true" failed naming `systemAppearance` |
| `"dark-mode"` removed from `meta.json` | `content.test.ts` "orders every top-level page on disk" failed naming `dark-mode` |

## 7. STOP conditions

- The page would have to claim OS appearance detection or a provider `mode`
  prop: **STOP** — the package has neither.
- A working example would need a persistence API the library does not ship:
  **STOP** and leave the snippet app-owned, explicitly labelled.
- `smoke:build` reports a page count other than 91 or any broken link:
  **STOP** and report the failing page before changing the guard.
- Any gate fails for a reason outside `apps/docs`: **STOP** and record it in
  `TODO.md`; do not edit another workstream's path.

## 8. Acceptance

- `/docs/dark-mode` exists, is in the sidebar after Theming, and is reachable
  from Getting started and Theming prose.
- The page names only real exports, all four `getTheme` combinations, both
  providers, and the no-appearance contract.
- The guard fails in all five directions in §4 and passes on the shipped tree.
- `nub run check`, `nub run lint`, `nub run test`, `check-types` and
  `smoke:build` are green, and `TODO.md` records 115/115.

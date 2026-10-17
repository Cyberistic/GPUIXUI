# 416 — the docs identity comes from `@gpuixui/tokens`

- **Workstream:** docs-site
- **Phase:** B (identity) → F (truth pass)
- **Owns:** `apps/docs/**`, the theming/typography pages, the docs rows in
  `TODO.md`
- **Depends on:** 410 (the app shell), 411 (page metadata), `@gpuixui/tokens`
  (plans 011–018, now on `main`)
- **Depended on by:** nothing in the native runtime. The site consumes pure
  token **data**; the library never consumes the site.

## 1. Why

Plan 410 shipped the docs palette as **provisional HSL roles** in
`src/styles/app.css`, with a note to reconcile with the tokens workstream later.
That workstream has landed: `@gpuixui/tokens` now exports the real light and dark
semantic roles, a 47-role index (`colorRoles`), the type scale and platform type
tables. Two pages still say the authoritative documents "are not written yet"
(`theming.mdx`, `typography.mdx`); those documents now exist on `main`
(`docs/design-system.md`, `docs/tokens.md`).

This plan makes the docs identity **the library identity** and removes the
remaining provisional/placeholder prose, so the site cannot claim a palette or a
type scale the package does not have.

## 2. What the tests must be able to catch

1. `app.css` drifts from `@gpuixui/tokens` (either side changes) — the site would
   otherwise keep rendering yesterday's brand while the docs claim otherwise.
2. A role is added to one docs theme and not the other (already guarded by
   `theme.test.ts`; keep it).
3. A `--color-fd-*` role appears in `app.css` that is not tied to a token, i.e.
   a new untethered literal.
4. The token table on the theming page silently loses a role, or reports a value
   the package does not export.
5. The type-scale table silently loses a text role.
6. `@gpuixui/tokens/react` (or any GPUix runtime package) reaches the browser
   bundle.

## 3. Decisions

- **`app.css` stays a static stylesheet.** The docs theme is still plain CSS
  (Fumadocs' supported path) with **hex values copied from the package**, and
  `theme.test.ts` asserts equality with `lightTheme.colors` /
  `darkTheme.colors`. A build-time CSS generator was rejected: it adds a Vite
  plugin and a generated file for a 17-line block, and a test gives the same
  drift guarantee with less machinery.
- **The docs app may import the `@gpuixui/tokens` root entry.** Plan 410 §2
  allows a dependency-free pure-data subpath; the root entry has no runtime
  dependency (React is an optional peer of `./react` only). The `/react` entry
  and every GPUix runtime package stay forbidden, enforced by
  `architecture.test.ts`.
- **Only the 17 core roles are mapped.** Fumadocs also defines `--color-fd-info`,
  `--color-fd-warning`, `--color-fd-error` and `--color-fd-success`. The library's
  matching roles are **surface** colours with their own foregrounds; using them
  as Fumadocs' text/icon colours would drop warning contrast in light mode
  (`warning` is amber 400 on a near-white canvas). The docs chrome keeps
  Fumadocs' status defaults; the page states this rather than pretending the
  full library palette is applied.
- **Tables are generated, not retyped.** `TokenColors` iterates `colorRoles` and
  both themes; `TypeScale` iterates the ten text roles. No hex string or pixel
  size is written in MDX.

## 4. Files to create or change

| File | Change |
| ---- | ------ |
| `apps/docs/package.json` | add `"@gpuixui/tokens": "workspace:*"` to `dependencies` |
| `apps/docs/src/lib/docs-theme.ts` | **new** — `DOCS_COLOR_ROLES` (Fumadocs variable → `keyof ThemeColors`, 17 entries) and `themeColors` (`{ light, dark }`) re-exported from the package |
| `apps/docs/src/styles/app.css` | replace the provisional HSL block with the token hex values from `lightTheme`/`darkTheme` |
| `apps/docs/src/styles/theme.test.ts` | assert every mapped role equals the package value in both modes; assert no `--color-fd-*` declaration is unmapped |
| `apps/docs/src/components/token-colors.tsx` | **new** — `<TokenColors />`: 47 rows, light and dark swatch + hex, role name |
| `apps/docs/src/components/token-colors.test.tsx` | **new** — every `colorRoles` entry renders; a changed package value cannot pass silently |
| `apps/docs/src/components/type-scale.tsx` | **new** — `<TypeScale />` (10 roles: size/leading/weight/sample) and `<PlatformTypes />` (four platform rows from `platformTypes`) |
| `apps/docs/src/components/type-scale.test.tsx` | **new** — every text role renders; platform table has all four entries |
| `apps/docs/src/components/mdx.tsx` | register `TokenColors`, `TypeScale`, `PlatformTypes` |
| `apps/docs/content/docs/theming.mdx` | **rewrite**: real links, semantic-role explanation, `<TokenColors />`, extension via `extendTheme`, high-contrast note |
| `apps/docs/content/docs/typography.mdx` | **rewrite**: `<TypeScale />`, `<PlatformTypes />`, and the truth about custom faces on the pinned runtime |
| `apps/docs/src/architecture.test.ts` | allow `@gpuixui/tokens` exactly; add a test that `@gpuixui/tokens/react` is rejected |
| `apps/docs/README.md` | record that the palette is pinned to the package and where the test lives |
| `TODO.md` | tick the reconciled-identity row; add the theming/typography truth row if absent |
| `.agents/slop/plans/README.md` | add this plan's row; update 410's status |

## 5. Exact implementation notes

### 5.1 `src/lib/docs-theme.ts`

```ts
import { darkTheme, lightTheme, type ThemeColors } from "@gpuixui/tokens";

/** Fumadocs reads these variables; each is pinned to a library role. */
export const DOCS_COLOR_ROLES = {
  "--color-fd-background": "background",
  "--color-fd-foreground": "foreground",
  "--color-fd-muted": "muted",
  "--color-fd-muted-foreground": "mutedForeground",
  "--color-fd-popover": "popover",
  "--color-fd-popover-foreground": "popoverForeground",
  "--color-fd-card": "card",
  "--color-fd-card-foreground": "cardForeground",
  "--color-fd-border": "border",
  "--color-fd-primary": "primary",
  "--color-fd-primary-foreground": "primaryForeground",
  "--color-fd-secondary": "secondary",
  "--color-fd-secondary-foreground": "secondaryForeground",
  "--color-fd-accent": "accent",
  "--color-fd-accent-foreground": "accentForeground",
  "--color-fd-ring": "ring",
  "--color-fd-overlay": "overlay",
} as const satisfies Record<`--color-fd-${string}`, keyof ThemeColors>;

export const themeColors = {
  light: lightTheme.colors,
  dark: darkTheme.colors,
} as const;
```

### 5.2 `app.css`

Write each declaration as `--color-fd-<role>: <token hex>;` using §5.1's
mapping, in the same order as the map. Keep `--fd-layout-width: 1400px` and the
existing scrollbar rules. Delete the "Provisional" comment; replace it with a
comment that names `src/lib/docs-theme.ts` and `theme.test.ts` as the contract.

Values (verified from `packages/tokens/src/color.ts` on `main`, commit
`6e01fde`):

| Variable | Light | Dark |
| -------- | ----- | ---- |
| background | `#F6F8FA` | `#11141A` |
| foreground | `#191D25` | `#EEF1F5` |
| muted | `#EEF1F5` | `#222730` |
| muted-foreground | `#545D6C` | `#A1A9B7` |
| popover | `#FFFFFF` | `#222730` |
| popover-foreground | `#191D25` | `#F6F8FA` |
| card | `#FFFFFF` | `#191D25` |
| card-foreground | `#191D25` | `#EEF1F5` |
| border | `#E1E5EC` | `#2A303B` |
| primary | `#5F4BDB` | `#A7A9FF` |
| primary-foreground | `#FFFFFF` | `#11141A` |
| secondary | `#EEF1F5` | `#2A303B` |
| secondary-foreground | `#2A303B` | `#E1E5EC` |
| accent | `#EEF0FF` | `#2E2370` |
| accent-foreground | `#3B2C8F` | `#C7CBFF` |
| ring | `#7567F2` | `#A7A9FF` |
| overlay | `#00000073` | `#000000A6` |

The test compares **lowercased** values so hex case is not a false failure.

### 5.3 `theme.test.ts`

Keep the two existing tests. Add:

```ts
Arr.forEach(Object.entries(DOCS_COLOR_ROLES), ([variable, role]) => {
  expect(roleValue(":root", variable)).toBe(themeColors.light[role].toLowerCase());
  expect(roleValue(".dark", variable)).toBe(themeColors.dark[role].toLowerCase());
});

// no untethered variable
expect(Arr.difference(roleNames(":root"), Object.keys(DOCS_COLOR_ROLES))).toEqual([]);
expect(Arr.difference(roleNames(".dark"), Object.keys(DOCS_COLOR_ROLES))).toEqual([]);
```

### 5.4 `TokenColors`

- Server-rendered table; no client JS.
- Iterate `colorRoles`; for each role read `themeColors.light[role]` and
  `themeColors.dark[role]`.
- Swatch cell: `<span style={{ backgroundColor: value }} aria-hidden />` with a
  fixed size and a border so white/near-white is visible.
- Show the role name in `font-mono`, the hex in `font-mono`, and no invented
  description (the package does not export them; descriptions live in
  `docs/tokens.md`, which the page links).
- The page note states that the 47 roles are all shown, so a missing row is
  visible.

### 5.5 `TypeScale` / `PlatformTypes`

- `TypeScale`: rows for `display, h1, h2, h3, body, bodyStrong, label, caption,
  code, codeBlock`; columns role, size × leading, weight, sample text rendered
  with that inline style (the docs site is a browser app; rendering the sample
  is honest).
- `PlatformTypes`: rows from `platformTypes` (`label`, `sans`, `mono`). State
  that `sans` is GPUI's `.SystemUIFont` sentinel, not a named face.

### 5.6 Truth statements for the rewritten pages

- `theming.mdx` links `../../../docs/design-system.md`? **No** — repository
  documents are not served by the site. Link the repository path in prose only
  (as the current pages do), or use the GitHub URL if one is already used
  elsewhere. Do not invent a route.
- `typography.mdx` must say: the pinned GPUix 0.10.0 runtime exposes **no**
  `registerFont`; the library therefore uses the system UI sentinel and the
  platform's monospace family. Custom/brand faces wait on plan 052 and are
  blocked by B1. The current claim that an application registers its own fonts
  is **not true for the pinned runtime** and must be corrected.
- Neither page may say "not written yet" after this change.

## 6. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/docs-site`.

| Command | Expected |
| ------- | -------- |
| `nub install` | links `@gpuixui/tokens` into `apps/docs/node_modules`; no unresolved workspace error |
| `nub run --filter docs test` | all suites pass; report the new totals |
| `nub run --filter docs check-types` | `fumadocs-mdx` + `tsc --noEmit` exit 0 |
| `nub run --filter docs build` | exits 0; client + server bundles emitted |
| `nub run check` | test-quality gate, lint, fmt, type-check pass |
| `nub run lint` | exit 0 |
| `nub run test` | every workspace with tests passes |

## 7. Two-direction proof (AGENTS §3)

For the palette guard:

1. Change one hex in `app.css` (e.g. `--color-fd-primary: #000000;`) →
   `nub run --filter docs test` fails on `theme.test.ts`.
2. Restore; the suite passes.
3. Change `lightColors.primary` in `packages/tokens/src/color.ts`? **No** — that
   package is another workstream. Prove the other direction by changing the
   *mapping* in `docs-theme.ts` (point `--color-fd-primary` at `secondary`) →
   the test fails. Record both outputs in the commit message or plan status.

For the table guard: delete one entry from `colorRoles` in the **test's local
expectation** is not valid. Instead assert `renderedRows === colorRoles.length`
and temporarily filter one role out of the component to see the test fail;
restore.

## 8. STOP conditions

- `@gpuixui/tokens` does not resolve from `apps/docs` after `nub install`, or
  importing its root entry pulls React/GPUix into the bundle. Stop and report;
  do not fall back to copied values without the test.
- Fumadocs 16.17.x uses a different set of `--color-fd-*` variables than
  `node_modules/fumadocs-ui/css/lib/default-colors.css`. Stop and report the
  actual set.
- A token value is not valid CSS (e.g. a bare number). Stop and report.
- The rewritten pages cannot be made truthful without a claim the repository
  does not support. Leave the claim out, state the gap, and report.

## 9. Acceptance criteria

- [ ] `app.css` contains no provisional HSL palette; every declared
      `--color-fd-*` role is mapped to a real token and the test proves equality.
- [ ] `theming.mdx` renders all 47 colour roles for both themes and links the
      real `docs/tokens.md` / `docs/design-system.md`.
- [ ] `typography.mdx` renders all text roles and the platform table, and states
      the pinned runtime font limitation truthfully.
- [ ] `@gpuixui/tokens/react` and every GPUix runtime package remain forbidden by
      `architecture.test.ts`; a test proves the `/react` rejection.
- [ ] `nub run check`, `nub run lint`, `nub run test` and
      `nub run --filter docs build` pass.
- [ ] `TODO.md` and the plans index are current; work is committed on
      `agent/docs-site`.

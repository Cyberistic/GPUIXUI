# 434 — Platform-styled component previews (illustrative tier A)

**Phase:** F (integration and polish) · **Owner:** docs-site · **Status:** implemented
**Depends on:** 410 (docs shell), 412 (preview strategy), 420 (platform toggle),
433 (native captures), `@gpuixui/tokens` (`Theme`, `platformTheme`, `themes`).
**Blocks:** the owner's platform-styles acceptance in `MISSION.md` — "a reader
toggles macOS → Windows and every preview changes".

## 1. The gap this closes

`MISSION.md` (Platform styles) added after plan 420 landed:

> The **Fumadocs site** gets a **platform toggle** … that switches every
> component preview between the platform styles, so a reader sees how a Button,
> a Tab, a Panel, a menu and a table look on each platform.

What exists today:

| Piece | State |
| ----- | ----- |
| Toggle + URL/storage state | landed (plan 420), `apps/docs/src/platform/*` |
| Platform values shown as data | landed (`<PlatformValues />` on Theming) |
| Component previews to switch | **none** — every component page renders tier V (native suite) |
| `IllustrativeApproximation` (tier A) | landed but used by no page |

So the toggle changes the docs' `--font-mono` and a table of values; it changes
no component preview, because no component preview exists.

**Honesty boundary.** The docs are a browser app. These previews are labelled
browser approximations (tier A, plan 412). They are a mirror of the component's
token-driven appearance, not a GPUix surface. The banner is unconditional. No
interaction is shown or implied: tier A is static layout/typography/spacing
only.

**Library dependency, recorded not fixed here.** `platformTheme` currently
changes only the type families and the theme name (`packages/tokens` plan 051);
colours, spacing, radius and density are identical across platforms. The docs
may not invent platform palettes — `MISSION.md` requires them to live in
`packages/tokens`. This plan builds the preview surface so it reads **the whole
active `Theme`**, and raises the tokens interlock in `TODO.md`. When the tokens
workstream adds per-platform values, every preview changes with no docs edit.

## 2. Files

Create:

- `apps/docs/src/components/preview/theme-surface.tsx` — pure `previewVars(theme)`
  mapping every token group to `--preview-*` CSS custom properties, plus
  `PreviewSurface` and `usePreviewTheme()`.
- `apps/docs/src/components/preview/theme-surface.test.tsx`
- `apps/docs/src/components/preview/approximations.tsx` — the four previews
  (Button, Tabs, Dropdown menu, Card) and the `previewsBySlug` registry.
- `apps/docs/src/components/preview/approximations.test.tsx`
- `apps/docs/src/components/preview/component-preview.tsx` —
  `<ComponentPreview slug>`: renders a registered approximation inside
  `<IllustrativeApproximation>`, or nothing for a slug with no preview.
- `apps/docs/src/components/preview/component-preview.test.tsx`
- `apps/docs/src/components/preview/platform-previews.tsx` —
  `<PlatformPreviews />` showcase for Theming.

Change:

- `apps/docs/src/components/mdx.tsx` — register `<ComponentPreview>` and
  `<PlatformPreviews>` for MDX.
- `apps/docs/content/docs/components/{button,tabs,dropdown-menu,card}.mdx` —
  add `<ComponentPreview slug="…" />` directly after `<NativePreview … />`.
- `apps/docs/content/docs/theming.mdx` — add a "Platform previews" subsection
  under "Platform styles" with `<PlatformPreviews />`.
- `docs/preview-strategy.md` — document tier A's token contract and what it
  does not prove.
- `apps/docs/README.md` — note the optional preview block in the page template.
- `TODO.md`, `.agents/slop/plans/README.md` — status and the tokens interlock.

Do **not** touch `packages/tokens`. Do not add a Panel or Table preview: those
components do not exist yet (`COMPONENTS.md`), and a preview of an
unimplemented component would be fiction.

## 3. Implementation, in order

### 3.1 `theme-surface.tsx`

1. Export `interface PreviewStyle extends CSSProperties` with the template
   index signature `` [key: `--preview-${string}`]: string | number ``.
2. `previewVars(theme: Theme): PreviewStyle` maps, with no literals:
   - `colors` → `--preview-color-<role>` (all roles, via `Object.entries`);
   - `typography.sans|mono` → `--preview-font-sans|mono`;
   - each text role → `--preview-text-<role>-size|leading|weight`;
   - `spacing` → `--preview-space-<key>`;
   - `radius` → `--preview-radius-<key>`;
   - `borderWidth` → `--preview-border-<key>`;
   - `density` → `--preview-control-height-<size>`,
     `--preview-control-padding-x-<size>`, `--preview-row-height`;
   - `iconSize` → `--preview-icon-<key>`;
   - elevation → `--preview-shadow-<level>` built with `elevationShadow(theme,
     level)`; an empty level maps to `"none"`.
3. `PreviewSurface({ theme, children })` renders a `div` with
   `data-preview-surface=""`, `style={previewVars(theme)}` and the preview
   background (`var(--preview-color-background)`) plus body type. It uses no
   literal colour.
4. `usePreviewTheme(): Theme` reads the docs' resolved mode with `useTheme`
   from `fumadocs-ui/provider/base` (default `light` when unresolved) and the
   platform from `usePlatform()`, then returns
   `platformTheme(themes[mode], platform)`.

### 3.2 `approximations.tsx`

Four exported previews, each rendered through `<PreviewSurface>`:

- `ButtonPreview` — six variants (`primary`, `secondary`, `outline`, `ghost`,
  `destructive`, `link`), three sizes, one disabled, one loading; a `<kbd>`
  keyboard hint in the mono role.
- `TabsPreview` — a three-tab row with one selected (underline + selected
  colour) and the panel body; `← →` hint in mono.
- `MenuPreview` — a popover surface, three rows, one highlighted, one
  destructive, shortcut hints (`⌘K`, `⇧⌘P`) in mono.
- `CardPreview` — a panel-like card: header, body, footer button, and a mono
  metadata line.

Every preview must include at least one element in the mono role so the
currently shipped platform styles (type-only) visibly change each preview.

Styles use only `var(--preview-*)`, numbers, and keywords; no colour literal,
no Tailwind colour class inside a preview. `previewsBySlug` is a
`ReadonlyMap<string, () => JSX.Element>` keyed by the four real registry slugs.

### 3.3 `component-preview.tsx`

`<ComponentPreview slug>`:

- unknown/absent preview → `null` (a page may exist without an approximation);
- otherwise `<IllustrativeApproximation><Preview … /></IllustrativeApproximation>`.

Never renders outside `<IllustrativeApproximation>`; the banner cannot be
detached from a preview.

### 3.4 `platform-previews.tsx`

`<PlatformPreviews />` renders the four previews in a labelled column with a
short `role="note"` line naming the active platform and the fact that only the
type family differs in the shipped package today. It reads `usePreviewTheme()`
and is the Theming page's live proof that the toggle reaches every preview.

### 3.5 Pages

Add the block on four pages. Do not add a new `##` section: the block belongs
beside `<NativePreview>`, and `component-pages.test.ts` checks required sections
by presence, not count. Update `apps/docs/README.md`'s template note.

## 4. Test plan — each test must be able to fail

`theme-surface.test.tsx`:

1. **Complete mapping.** `previewVars(lightTheme)` has one colour var per
   `ThemeColors` key, one per spacing/radius/icon key and the density metrics;
   assert against the package objects, not a copied list. Fails if a group is
   dropped.
2. **Values are the package's.** `--preview-color-primary` equals
   `lightTheme.colors.primary`; light and dark differ on `background`. Fails if
   the docs hard-code a palette.
3. **Platform wiring.** `previewVars(platformTheme(lightTheme, "win32"))`
   `--preview-font-mono` is `Consolas` and `--preview-color-primary` is
   unchanged; `darwin` gives `Menlo`. Fails if the surface ignores the platform.
4. **Whole-theme wiring.** `extendTheme(lightTheme, { colors: { primary: … },
   spacing: { md: … }, radius: { md: … }, density: { rowHeight: … },
   borderWidth: { thin: … } })` changes every corresponding var. This is the
   proof that real per-platform values will reach the previews.
5. **No literal palette in preview source.** Read `theme-surface.tsx` and
   `approximations.tsx`; fail on `#hex`, `rgb(`, `hsl(` or `oklch(`. Fails the
   moment someone scatters a colour.

`approximations.test.tsx`:

6. **Every preview is labelled.** `renderToStaticMarkup(<ComponentPreview
   slug=… />)` contains `APPROXIMATION_NOTICE` for all four. Fails if the banner
   is removed.
7. **Registry slugs are real.** Every `previewsBySlug` key exists in the
   component registry (`bySlug`). Fails on a typo.
8. **No preview is interactive.** No `onClick`, `tabIndex`, `role="button"` or
   `<input>` in the rendered output. Fails if someone adds a fake interaction
   and implies native behaviour.
9. **Platform changes every preview.** Render each preview twice with fixture
   themes that differ only in `typography.mono` (as the shipped package does);
   assert each rendered surface carries `--preview-font-mono: Menlo` vs
   `Consolas`. Fails if a preview stops reading the surface.

`component-preview.test.tsx`:

10. **Page/registry agreement.** For every slug in `previewsBySlug`, the MDX
    page `content/docs/components/<slug>.mdx` contains
    `<ComponentPreview slug="<slug>"`; and every page that contains the block
    has a registry entry. Fails in both directions.
11. **Unregistered slug renders nothing.** `<ComponentPreview slug="slider" />`
    is `""`. Fails if the component ever invents a preview.

Run:

```sh
nub run --filter docs test
nub run --filter docs check-types
nub run --filter docs build
nub run check
nub run lint
```

Expected: every command exits `0`; the docs test file count rises by three.

## 5. STOP conditions

- `@gpuixui/tokens` does not export `elevationShadow`, `platformTheme`,
  `themes` or the `Theme` type at the installed revision → stop and report.
- `fumadocs-ui/provider/base`'s `useTheme` is unavailable → stop; do not add a
  second theme library.
- Any preview requires a token value the `Theme` does not carry → stop; record
  it as a tokens interlock instead of adding a docs literal.
- A page contract test fails because the block changes required sections →
  stop and report the conflict before editing the contract.
- The docs build fails for a reason unrelated to these files → stop and record
  the failure; do not paper over it.

## 6. Acceptance

- Four delivered components (Button, Tabs, Dropdown menu, Card) have a labelled
  illustrative preview; the Theming page shows all four and names the active
  platform.
- Toggling the platform re-renders every preview from `platformTheme`; the test
  proves the surface reads the whole theme, and the visible change today is the
  mono face because that is all `packages/tokens` ships.
- The docs state, in `docs/preview-strategy.md` and on Theming, that these are
  approximations, that only type differs today, and that real platform palettes
  and metrics are a tokens task.
- `TODO.md` carries the tokens interlock; the plan index lists 434 as
  implemented; the gates in §4 are green.

## 7. Verification record (2026-10-17)

- `nub run --filter docs test`: 31 files, 180 tests pass (three new files).
- `nub run --filter docs check-types`, `nub run --filter docs build`,
  `nub run check`, `nub run lint`, `nub run test` (exit `0`): all pass.
- **Both directions, measured:**
  - render a preview without `<IllustrativeApproximation>` → the labelling test
    fails;
  - type a `#5F4BDB` literal into `approximations.tsx` → the source guard fails;
  - make `PreviewSurface` ignore its `theme` prop → the platform re-render test
    fails (`Consolas` expected, `Menlo` received);
  - remove `<ComponentPreview slug="card" />` from the page → the page/registry
    agreement test fails.
- **Browser proof (headless Chrome, dev server):**
  - `/docs/theming?platform=win32` → `html[data-platform="win32"]`, five preview
    surfaces with `--preview-font-mono: Consolas`, four approximation banners,
    and the note names Windows;
  - `/docs/theming` (default) → `Menlo` on every surface;
  - `/docs/components/button` → `data-component-preview="button"`, one banner,
    tier-V native coverage above it, `Menlo` on the surface.
- **Not closed:** real per-platform palettes, spacing and control metrics. The
  surface reads them already; `packages/tokens` still ships type-only variants.
  Tracked in `TODO.md` under the docs-site cross-team tasks; the docs must not
  invent them.

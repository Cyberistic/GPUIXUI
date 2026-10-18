# Plan 436: Blocks and the Theme Editor — the two remaining shadcn surfaces

## Why

The docs site already follows shadcn/ui 1:1 for components (sectioned sidebar,
`ComponentPreview` with Preview/Code tabs, `Install`, `ComponentSource`, API
tables, "On this page" TOC). Two surfaces from shadcn are still missing:

1. **Blocks** (`/docs/blocks`) — copy-paste recipes composed from the library,
   presented the way shadcn presents its blocks: an index, a block page with
   Preview/Code tabs and an install/copy affordance, and an explicit note that a
   block is a *recipe*, not a new component.
2. **Theme Editor** (`/docs/themes`) — a live editor for the library's semantic
   tokens with a real preview and a "copy theme" output, matching
   `ui.shadcn.com/themes`.

Both reuse the existing docs components and `@gpuixui/tokens`; neither invents a
parallel palette or a fake component.

## Reference (study first, match anatomy not branding)

- `https://ui.shadcn.com/blocks` — index hero + block cards; a block page has
  Preview/Code, `npx shadcn add <block>`, a file tree, then the source.
- `https://ui.shadcn.com/themes` — left token controls (colours, radius, font),
  right live preview, top bar with Copy theme / Reset, URL + localStorage
  persistence, light/dark toggle.

The docs site already ships the pieces: `ComponentPreview`, `Install`,
`ComponentSource`, `CopyPage`, the Fumadocs `Tabs`/`DynamicCodeBlock`, and the
`.gx-demo` browser-rendering CSS in `demos.css`.

## Files

### New (docs components)

- `apps/docs/src/components/docs/blocks.tsx`
  Block registry: `{ [name]: { render, source, packages } }`. `render` is a
  browser HTML rendering (like `demos.tsx`); `source` is the real recipe in
  `@gpuixui/*` usage; `packages` is the list of packages the block composes.
  Two blocks: `login-01` (Login) and `settings-01` (Settings).
- `apps/docs/src/components/docs/block-preview.tsx`
  `BlockPreview({ name })` — Preview/Code tabs (reuse Fumadocs tabs +
  `DynamicCodeBlock`), a **Copy recipe** button, a "recipe composed from the
  library, not a new component" note, and the honesty label (browser rendering
  of the native components, not the native runtime). Mirrors `ComponentPreview`.
- `apps/docs/src/components/docs/block-index.tsx`
  `BlockIndex()` — the blocks index grid: one card per block (title,
  description, link to its page), matching shadcn's block cards.
- `apps/docs/src/components/docs/theme-editor.tsx`
  `ThemeEditor()` — the live token editor. See "Theme editor" below.

### New (content)

- `apps/docs/content/docs/blocks/meta.json` — `{ "title": "Blocks", "pages": [...] }`
- `apps/docs/content/docs/blocks/index.mdx` — the blocks index (renders `BlockIndex`).
- `apps/docs/content/docs/blocks/login.mdx` — Login block page.
- `apps/docs/content/docs/blocks/settings.mdx` — Settings block page.
- `apps/docs/content/docs/themes.mdx` — the theme editor page (renders `ThemeEditor`).

### Changed

- `apps/docs/content/docs/meta.json` — add a `---Blocks---` section pointing at
  the `blocks` folder, and a `themes` entry under a new `---Theming---` section
  (or append to Getting Started). Keep `theming` and `dark-mode` where they are.
- `apps/docs/src/components/mdx.tsx` — register `BlockPreview`, `BlockIndex`,
  `ThemeEditor` as MDX components.
- `apps/docs/package.json` — add `"@gpuixui/tokens": "workspace:*"` to
  `dependencies` (the theme editor reads real token values; tokens is pure data
  with no runtime or native dependency, so it bundles into the browser).
- `apps/docs/src/styles/app.css` (or a new `theme-editor.css` imported from
  `app.css`) — the theme editor + block card CSS, using the existing CSS vars.

## Theme editor (the token bridge)

`@gpuixui/tokens` ships **TS data objects, not CSS vars** (`ThemeColors`,
`Radius`, `Typography`). The docs preview is CSS. The bridge is minimal and
documented:

- `tokenRoles = ["background","foreground","card","popover","primary","secondary","muted","accent","destructive","border","input","ring"]`
  — the shadcn-core subset, each a real `keyof ThemeColors`.
- `colorsToCssVars(colors)` maps each role to `--<role>` (exactly shadcn's CSS
  var names). `radius.md` → `--radius` (`${n}px`); `typography.sans` →
  `--font-sans`, with `.SystemUIFont` mapped to a CSS system-ui stack (the
  sentinel is GPUI's, not a real CSS face — documented).
- The preview container carries these vars as inline `style`; the preview is
  composed of the docs' Fumadocs/shadcn utility classes that read `var(--*)`, so
  an edit re-renders the preview immediately.

The editor state:

- `{ light: TokenSet, dark: TokenSet }`, seeded from `themes.light` /
  `themes.dark` (`TokenSet = { colors, radius, fontSans }`).
- A Light/Dark toggle selects the mode being edited and the preview shown.
- Edits are persisted to the URL (`?theme=<base64url JSON>`) and
  `localStorage["gpuixui-theme"]`; a **Reset** control restores the built-in
  themes and clears the URL/localStorage.
- **Copy theme** emits the library's actual format — a `createTheme` module for
  each mode — plus a one-line usage note:

```ts
import { createTheme } from "@gpuixui/tokens";

export const theme = {
  light: createTheme({ mode: "light", name: "My theme", colors: { … }, radius: { md: 6 }, typography: { sans: "…" } }),
  dark: createTheme({ mode: "dark", name: "My theme", colors: { … }, radius: { md: 6 }, typography: { sans: "…" } }),
};
// Usage: <ThemeProvider theme={theme[activeMode]} />
```

- Controls are real `<input type="color">` + text inputs with `<label>`, a
  radius slider/number input, and a font-family input; the preview and the
  editor are responsive (controls stack on narrow widths).

## Steps

1. Create the branch from `origin/master`; run `nub install` to link
   `@gpuixui/tokens`.
2. Add the docs components (`blocks.tsx`, `block-preview.tsx`, `block-index.tsx`,
   `theme-editor.tsx`) and the CSS.
3. Add the content pages and `meta.json` entries; register the MDX components.
4. Add `@gpuixui/tokens` to `apps/docs` and wire the token bridge.
5. Run the gates: `nub run --filter @gpuixui/docs build`,
   `nub run --filter @gpuixui/docs check-types`, `nub run lint`, `nub run fmt`.
6. Run locally; screenshot `/docs/blocks`, `/docs/blocks/login` (or the settings
   block), and `/docs/themes` in light and dark; check the browser console.
7. Verify the theme editor: editing a token updates the preview, the URL updates,
   reload persists, and Copy theme emits the expected `createTheme` file.
8. Deploy (`set -a; . /Users/cyberistic/Documents/Sudo/sudokw/.env; set +a` then
   `nub run deploy:docs`); confirm the new pages return 200 on
   `https://gpuixui.sudokw.com`.
9. Commit and push `agent/blocks-theme-editor`.

## STOP conditions

- A block needs a component that does not exist → compose what does and **label
  the gap** in the recipe note; do not fake a component. (Charts/data-table do
  not exist, which is why the second block is Settings, not Dashboard.)
- The preview is a browser rendering, never the native runtime — keep the
  existing honesty label on every preview.
- The theme editor must read defaults and emit `createTheme` from
  `@gpuixui/tokens` only. If the tokens package cannot be bundled by Vite, stop
  and report rather than hand-copying values (a hand-copied palette is exactly
  the parallel palette the task forbids).
- If the deploy cannot reach Cloudflare from this box, stop after local build +
  screenshot verification and report; do not guess at a deploy.

## Test plan

- The theme editor's bridge is a pure function (`colorsToCssVars`) — a unit test
  asserts role→var mapping, radius→`--radius`, and `.SystemUIFont`→system stack.
  Co-locate `theme-editor.test.ts` (or a `tokens-bridge.test.ts`) and prove it
  fails when the mapping changes.
- The copy-theme serialiser is a pure function — a unit test asserts the emitted
  `createTheme` module parses the exact roles and matches the edited state.
- **Manual/visual:** each block's Code tab shows real `@gpuixui/*` imports that
  type-check against the package exports (grep the imports against
  `packages/*/src`); the Preview is HTML, labelled.
- `nub run --filter @gpuixui/docs build` + `check-types` must pass; lint and
  format clean.

## Acceptance

- [ ] `/docs/blocks` index and two block pages (login, settings) render; each has
      Preview/Code, a copy affordance, and the recipe + honesty notes.
- [ ] `/docs/themes` edits tokens live, persists to URL and localStorage, resets,
      and Copy theme emits a valid `createTheme` module matching the preview.
- [ ] Nav entries appear in the docs sidebar under their own sections.
- [ ] Build, type-check, lint, format green; console clean.
- [ ] Light and dark screenshots captured; live 200s confirmed on the deployed
      domain.

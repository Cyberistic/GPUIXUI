# 595 — The theme editor: change real token roles, see the token surface, copy an `extendTheme` module

**Phase:** F (theming showcase)
**Workstream:** docs-site
**Depends on:** 410, 412, 416, 420, 430, 434, 444, 445, 447, 509, 511
**Status:** implemented

## 1. The measured gap

`MISSION.md` requires the theming story to be one a consumer can own: "the
default theme must remain the identity … platforms are variants", "a consumer
can take one platform theme file, edit it, and ship their own look", and the
site must showcase the library rather than describe it. The Theming page
currently does three things:

- it renders every shipped value from `@gpuixui/tokens` (`<TokenColors />`,
  `<TokenScales />`, `<PlatformValues />`, `<PlatformStyles />`);
- it documents `extendTheme` in a static code block;
- it switches the **shipped** styles through the platform toggle.

What a reader cannot do is try an edit. There is no control on the site that
changes a token and shows the library's own token surface repaint; the only
interactive token surface is the platform toggle, which chooses between values
the package already ships. An edit-and-copy workflow exists only as prose.

Measured on 2026-10-19 on `agent/docs-site`:

| Probe | Result |
| ----- | ------ |
| `grep -ri "theme editor" apps/docs/src apps/docs/content` | no editor; one unrelated fixture title in `search.test.ts` |
| a search for `theme editor` | no page (nothing owns the subject) |
| `/docs/theming` controls | the platform radio group and the docs theme switch only; no token input |
| copyable custom theme | one static snippet, not derived from the reader's values |

This is not a missing MISSION IA row — Theming already delivers it. It is the
one part of the theming claim that is still only asserted: that an edited
`Theme` is still the library's theme.

## 2. What to build

A dedicated page, `/docs/theme-editor`, plus one client component and one pure
module. It edits a deliberately small, honest subset and says so.

### 2.1 Pure core — `apps/docs/src/lib/theme-editor.ts`

No React, no DOM, no `effect` (the docs browser bundle may not import it —
`architecture.test.ts`). It imports only `@gpuixui/tokens`.

Exports:

```ts
/** The roles the editor exposes; every one is a real `keyof ThemeColors`. */
export const editableRoles = [
  "background", "foreground", "card", "cardForeground", "popover",
  "primary", "primaryForeground", "secondary", "secondaryForeground",
  "muted", "mutedForeground", "accent", "destructive", "border",
  "input", "ring",
] as const;
export type EditableRole = (typeof editableRoles)[number];

export interface ThemeEdits {
  readonly base: ThemeMode;
  readonly density: DensityName;
  readonly colors: Readonly<Record<EditableRole, string>>;
}

export const defaultEdits: (base: ThemeMode) => ThemeEdits;
export const themeFor: (edits: ThemeEdits) => Theme;
export const toQuery: (edits: ThemeEdits) => string;
export const fromQuery: (value: string | null | undefined) => ThemeEdits | undefined;
export const isDefault: (edits: ThemeEdits) => boolean;
export const roleLabel: (role: EditableRole) => string;
export const themeSource: (edits: ThemeEdits) => string;
```

Rules:

- `defaultEdits(base)` reads every exposed role and the density from
  `themes[base]`; the light theme is the reset target.
- `themeFor` is `extendTheme(themes[edits.base], { name: "My theme",
  colors: edits.colors, density: edits.density })`. It must not reimplement the
  merge: the preview and the copied module then agree by construction.
- `toQuery` writes `<base>.<density>` plus one `role:rrggbb` pair for each role
  **whose value differs from the base theme's** (values lower-case, without
  `#`). A default light edit is `light.comfortable`.
- `fromQuery` is the boundary: split on `.`, accept exactly `light`/`dark`, one
  of `compact`/`comfortable`/`spacious`, and a comma list of known roles with a
  6-digit hex value. Start from that base's defaults, apply the listed roles,
  and return `undefined` for any malformed part. An unknown role rejects the
  whole value. No type assertions.
- `isDefault` is true only for an untouched light theme at its own density.
- `roleLabel` turns `primaryForeground` into `Primary foreground`.
- `themeSource` emits a real module:

  ```ts
  import { extendTheme, lightTheme } from "@gpuixui/tokens";

  export const brandTheme = extendTheme(lightTheme, {
    name: "My theme",
    colors: {
      primary: "#7C5CFF",
    },
    density: "compact",
  });
  ```

  Only changed roles are emitted, in `editableRoles` order; `density` is
  emitted only when it differs from the base. With no changes the output is the
  same call with only `name`.

### 2.2 Component — `apps/docs/src/components/theme-editor.tsx`

A client component registered in `src/components/mdx.tsx` as `<ThemeEditor />`.

- State starts at `defaultEdits("light")` so SSR is deterministic; a mount
  effect reads `?theme=` through `fromQuery` and applies it. A second effect,
  gated on that load, writes `history.replaceState` with `toQuery`, deleting the
  parameter when `isDefault`. The page is shareable and reload-stable, and no
  navigation entry is added.
- Controls, each a real labelled input:
  - a `fieldset`/`legend` "Start from" with light/dark radios; changing it
    re-seeds the palette from that base (the label says "Start from");
  - a `fieldset`/`legend` "Density" with the three `DensityName` values;
  - one `<input type="color">` per editable role, labelled with
    `roleLabel(role)` and carrying `data-theme-color={role}`, beside the
    read-only hex value;
  - `Reset to defaults` (`data-theme-editor-reset`);
  - `Copy theme` (`data-theme-editor-copy`) writing `themeSource` to the
    clipboard, with `role="status"` text for success and for failure.
- The preview renders the existing static `<ButtonPreview theme locked>` and
  `<TextInputPreview theme locked>` inside a `data-theme-preview` region. They
  read the whole resolved `Theme` through `PreviewSurface`, so every edited
  colour, density and scale is the library's own surface — no second palette
  here. `locked` replaces `data-preview-surface` with
  `data-theme-editor-surface`: the editor's surfaces deliberately follow the
  editor, not the docs chrome, so the site-wide preview gates (which require
  every `data-preview-surface` to paint the current docs mode) must not read
  them.
- The generated source is always visible in a `data-theme-source` `<pre>`, so a
  reader who never grants clipboard access still has the exact module.
- Styling uses Fumadocs utility classes only (`border-fd-border`,
  `bg-fd-card`, `text-fd-muted-foreground`, …); no colour literal.

### 2.3 Page — `apps/docs/content/docs/theme-editor.mdx`

Frontmatter title `Theme editor`; description names "brand colours", "density"
and "copy an `extendTheme` module" so `/api/search` can find the subject.

Sections:

1. Lead: change the roles a brand usually changes, preview on the same token
   surface components read, copy a real module. State the honesty tier: the
   preview is a **labelled browser approximation** (tier A), not the native
   window.
2. `<ThemeEditor />`.
3. `## What is editable` — the 16 roles and density; every other group (type,
   spacing, radius, elevation) through `extendTheme`; link Theming and the
   Tokens API.
4. `## Using the copied module` — the two-provider recipe (tokens provider
   outside primitives), with a link to Getting started.
5. `## Limits` — the URL is the only persistence; the browser preview resolves
   fonts differently from GPUI; reference the native captures on Theming.

Add `theme-editor` to `content/docs/meta.json` after `theming`, and one link
from Theming's "Extending a theme" to the new page.

### 2.4 Browser smoke — `apps/docs/scripts/smoke-theme-editor.ts`

The interaction is only done when a real browser proves it. The script mirrors
the existing smokes' contract (exit `0` pass, `1` wrong, `2` could not verify;
`--base-url`, `--chrome`, `--no-build`):

1. build/serve the production output, open `/docs/theme-editor` at 1280 px;
2. read `--preview-color-primary` from the preview surface and the generated
   source (the pre-fix state);
3. set the `primary` colour input to `#7c5cff` through the native setter and
   dispatch `input` + `change` (React's path);
4. wait for the preview CSS variable, the URL's `theme` value and the source
   line `primary: "#7c5cff"` to agree;
5. reload the shareable URL and prove the input, preview and source survive;
6. press reset and prove the parameter is gone and the preview returns to the
   light theme's primary.

Add `"smoke:theme-editor"` to `apps/docs/package.json`, the Contributing check
table and `apps/docs/README.md`. `src/docs-checks.test.ts` then enforces that
the script stays named in Contributing.

## 3. Exact commands and expected results

```sh
cd apps/docs
nub exec -- vitest run src/lib/theme-editor.test.ts   # new pure suite, green
nub exec -- vitest run src/components/theme-editor.test.tsx
nub run test                                          # all suites, green
nub run check-types                                   # tsc, no errors
cd ../.. && nub run check && nub run lint              # repo gates, exit 0
nub run --filter docs smoke:build                     # new page renders
nub run --filter docs smoke:theme-editor              # interaction, exit 0
nub run --filter docs smoke:responsive                # 390 px, no sideways scroll
nub run --filter docs smoke:a11y                      # axe, both schemes, 0
```

## 4. Test plan (each must be able to fail)

Pure (`src/lib/theme-editor.test.ts`):

| # | Claim | Failure it catches |
| - | ----- | ------------------ |
| 1 | `defaultEdits("dark")` equals the dark theme's 16 roles and density | reading the wrong theme or a stale role list |
| 2 | `themeFor` applies a changed primary and keeps `warning` from the base | a palette rebuilt instead of merged |
| 3 | `themeFor` applies `density: "compact"` and preserves `mode` | density dropped or mode inferred |
| 4 | `toQuery` emits only changed roles | a URL that records every role |
| 5 | `toQuery → fromQuery` round-trips an edited state | lossy share links |
| 6 | `fromQuery` rejects a bad hex, unknown role, unknown base and wrong density | a malformed URL poisoning the preview |
| 7 | `themeSource` emits only changed roles, the right base import and density | a copyable module that differs from the preview |
| 8 | `themeSource` with no edits emits `name` only | dead overrides in the output |
| 9 | `roleLabel("primaryForeground")` | unreadable labels |

Component (`src/components/theme-editor.test.tsx`, SSR):

| # | Claim |
| - | ----- |
| 10 | one labelled colour input per editable role, base and density legends |
| 11 | the preview surfaces and the generated source render with the default theme |
| 12 | the copy/reset controls exist |

Search (`src/lib/search.test.ts`): `theme editor` reaches the page first;
`brand colours` returns it.

Two-direction proofs to run before claiming done:

1. drop `density` from `themeFor` → test 3 fails;
2. make `toQuery` emit every role → test 4 fails;
3. remove the `primary` input → test 10 fails;
4. remove the URL write effect → `smoke:theme-editor` exits `1` at the URL
   check;
5. remove the `onChange` handler → the smoke exits `1` at the preview check.

Record the measured runs in the plan's status when done.

## 5. Acceptance

- The page renders in the production build, appears in the sidebar and sitemap,
  and is indexed by search.
- Editing a role repaints the preview surface through `PreviewSurface`; the
  copied source is exactly the theme the preview rendered.
- The URL round-trips the edit and reset removes it.
- Every existing gate still passes, and the new smoke proves the interaction in
  Chrome.
- No literal colour, no `any`, no assertion; the editor's exports carry JSDoc.

## 6. STOP conditions

- Stop if `@gpuixui/tokens` no longer exports `extendTheme`, `themes`,
  `DensityName` or `ThemeColors` with the shapes above.
- Stop if `PreviewSurface` stops accepting a `theme` prop; do not fork its
  variable mapping.
- Stop if the docs browser bundle would have to import `effect` to validate the
  query; report the constraint instead of adding it.
- Stop if `smoke:theme-editor` cannot launch Chrome; exit `2` is "unverified",
  never a pass.

## 7. Measured results (2026-10-19)

Files: `src/lib/theme-editor.ts` (+`theme-editor.test.ts`),
`src/components/theme-editor.tsx` (+`theme-editor.test.tsx`),
`content/docs/theme-editor.mdx`, `content/docs/meta.json` (`theme-editor` after
`dark-mode`), `content/docs/theming.mdx` (one link),
`src/components/mdx.tsx`, `src/lib/search.test.ts`,
`src/components/preview/theme-surface.tsx` (`locked`),
`src/components/preview/preview-styles.ts` (`locked`),
`src/components/preview/approximations.tsx` / `control-previews.tsx`
(forward `locked`), `scripts/smoke-theme-editor.ts`, `package.json`,
`content/docs/contributing.mdx`, `README.md`.

| Command | Result |
| ------- | ------ |
| `nub run --filter docs test` | 108 files / 790 tests, exit `0` (was 106 / 773) |
| `nub run check` | test quality, lint, format and every workspace type-check, exit `0` |
| `nub run lint` | exit `0` |
| `nub run --filter docs smoke:theme-editor` | repaints, writes `?theme=`, restores on reload, resets, exit `0` |
| `nub run --filter docs smoke:build` | 99 pages, links, anchors and head, exit `0` |
| `nub run --filter docs smoke:a11y` | 99 pages × 2 schemes, 0 violations, exit `0` |
| `nub run --filter docs smoke:responsive` | 99 pages at 390 px, exit `0` |
| `nub run --filter docs smoke:console` | 99 pages, 0 errors, exit `0` |

Two-direction / measured failures:

1. Dropping `density` from `themeFor` failed
   `themeFor > applies the density preset without mutating the base`; restored.
2. The first `toQuery` joined changes with `.` instead of `,`; the round-trip
   test failed (`fromQuery` returned `undefined`) before the fix.
3. Removing the colour input's `onChange` made `smoke:theme-editor` exit `1`
   with `FAIL step 2: the edit did not reach the preview, source and URL`;
   restored.
4. **The gates found the new page's real defects.** `smoke:build` failed
   `/docs/theme-editor: heading order skips: h1 → h3` (the copied-module label
   was an `h3`; it is now a paragraph), and `smoke:a11y` failed
   `scrollable-region-focusable` on the source `<pre>` (it now takes
   `tabIndex={0}` and an accessible name). Both passed after the fixes.
5. The first a11y run after those fixes reported "did not settle in the dark
   scheme": the editor's surfaces were marked `data-preview-surface`, so the
   site-wide gates expected them to follow the docs mode. They now carry
   `data-theme-editor-surface` via `PreviewSurface locked`; the editor smoke
   reads that marker and the a11y sweep no longer treats them as docs previews.

Search: `theme editor` reaches `/docs/theme-editor` first; `brand colours`
returns it, both guarded in `src/lib/search.test.ts`. The page is in the
sidebar, sitemap and `llms.txt` by existing generation.

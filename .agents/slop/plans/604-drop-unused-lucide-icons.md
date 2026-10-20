# 604 — The docs stop shipping the whole lucide icon set

**Phase:** F (integration and polish) · **Workstream:** docs-site · **Status:** implemented

## 1. The defect, measured

`MISSION.md` names **fast navigation** as a showcase-quality requirement. No docs
gate measured page weight, and the production build was shipping the entire
lucide icon table to every reader.

`apps/docs/src/lib/source.ts` enables `lucideIconsPlugin()` from
`fumadocs-core/source/lucide-icons`. That plugin is:

```js
import { icons } from "lucide-react";
return iconPlugin((icon) => createElement(icons[icon]));
```

The namespace import defeats tree-shaking, so every icon definition is bundled.
No page, `meta.json` or frontmatter in this site declares an `icon` field — the
plugin resolves nothing and the payload is pure dead weight.

Measured 2026-10-20 against `apps/docs/dist` served by `vite preview`
(`nub run --filter docs preview --port 4188`), fresh Chrome profile per page,
`performance.getEntriesByType("resource")`:

| Page | JS decoded | Largest chunk |
| ---- | ---------- | ------------- |
| `/docs/components/button` | 1 686 KiB | 701 KiB |
| `/docs/components/context-menu` | 2 521 KiB | 1 010 KiB (page) + 701 KiB (shared) |
| `/docs/theming` | 1 572 KiB | 701 KiB |
| `/docs/components` | 1 517 KiB | 701 KiB |

`dist/client/assets/_-B2zDNOPY.js` is 718 136 bytes and contains **1 849**
matches of ``name:`…`,size:24,node:`` — one per lucide icon. The only other
assets that carry that shape are legitimately tree-shaken: `docs-theme` (5:
`airplay`, `chevron-down`, `languages`, `moon`, `sun`), `search` (1), `hash` (3).

## 2. The fix

Remove the plugin. The loader keeps its one job:

```ts
export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/docs",
});
```

A page that wants an icon must then either name the icon component explicitly or
the site adopts an explicit map — never the whole set. Two guards keep that
true in both places it can regress:

1. **Source guard** (`apps/docs/src/lib/source-icons.test.ts`, runs in
   `nub run --filter docs test`): the loader source contains no `lucide`; no
   `content/docs/**/meta.json` declares an `icon`; no `.mdx` frontmatter
   declares `icon:`. An `icon` would now render nothing, so the failure tells
   the contributor why and what to do instead.
2. **Built-asset guard** (`apps/docs/scripts/smoke-build.ts`, runs in
   `smoke:build`): no single client script may contain more than **100** lucide
   icon records. The measured full set is 1 849; legitimate tree-shaken use in
   this site is 5. A future namespace import anywhere in the client graph fails
   the release gate by file name and count.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/source.ts` | delete the `lucideIconsPlugin` import and the `plugins` option |
| `apps/docs/src/lib/source-icons.test.ts` | new: loader has no lucide; no content declares `icon` |
| `apps/docs/scripts/smoke-build.ts` | scan `dist/client/assets/*.js` for the icon-record shape; >100 in one file is a problem |
| `apps/docs/README.md` | a short `## Page weight` section: the removal, the two guards, the measured before/after |
| `PLAN.md` | decision `D53` |
| `TODO.md` | one ticked docs row |
| `.agents/slop/plans/README.md` | this plan's row |

Nothing outside `apps/docs`, `PLAN.md`, `TODO.md` and this plan index is edited.

## 4. Steps and expected results

Run from the repository root unless stated.

```sh
cd apps/docs && nub x vitest run src/lib/source-icons.test.ts
```

- **Before the fix:** fails — the loader source names `lucide`. (This is the
  first direction of proof; the test is written before the plugin is removed.)
- **After the fix:** passes.

```sh
cd apps/docs && nub x vitest run src/lib/source-icons.test.ts
```

with `plugins: [lucideIconsPlugin()]` re-added → fails by name. Revert.

```sh
cd apps/docs && nub x vitest run src/lib/source-icons.test.ts
```

with `"icon": "book"` added to `content/docs/meta.json` → fails naming the file.
Revert.

```sh
cd apps/docs && nub run build && nub run preview -- --port 4188
nub apps/docs/scripts/__probe-weight.ts   # temporary probe, deleted before commit
```

- **Before:** 701 KiB shared chunk, 1 686 KiB JS on `/docs/components/button`.
- **After (expected):** the shared chunk loses the icon table; total JS on the
  same page is ≈ 985 KiB, and every icon-bearing asset is `docs-theme` (5) at
  most. Record the exact numbers in §6.

```sh
nub run --filter docs smoke:build
```

- **After the fix:** exit `0`, and the new line
  `smoke: client bundle checked — 0 scripts over 100 lucide icon records`
  (or the measured low total).
- **Proof the built guard can fail:** re-add the plugin, rebuild, run again →
  exit `1`, naming `dist/client/assets/…js` with `1849 lucide icon records`.
  Remove the plugin and rebuild before continuing.

```sh
nub run --filter docs test
nub run --filter docs check-types
nub run check
nub run lint
nub run test
```

All exit `0`. No native or live scene is touched, so no GPUix suite is required.

## 5. Manual check

Open `/docs/components/button` and `/docs/theming` in the preview: the sidebar,
its tier separators, the header controls and the theme toggle render exactly as
before. No page in the site declares an icon, so nothing loses a glyph; the
five icons in `docs-theme` (theme and language glyphs) remain.

## 6. Results (measured 2026-10-20)

Production build, fresh Chrome profile per page,
`performance.getEntriesByType("resource")`, decoded JS:

| Page | Before | After |
| ---- | ------ | ----- |
| `/docs/components/button` | 1 686 KiB | 1 084 KiB |
| `/docs/theming` | 1 572 KiB | 970 KiB |
| `/docs/components` | 1 517 KiB | 915 KiB |
| `/docs/components/context-menu` | 2 521 KiB | 1 919 KiB |

Largest shared chunk: **701 KiB → 261 KiB** (`_-B2zDNOPY.js` →
`_-BTxHmDup.js`); the button page's own chunk (175 KiB) is unchanged, because it
is the highlighted article rather than library code. Six hundred and two KiB
less JavaScript on every page.

Built guard, green: `smoke: client bundle checked — 24 lucide icon records`, the
largest asset carrying 15. Those are the tree-shaken glyphs Fumadocs' own chrome
uses, not the set.

**Two-direction proofs, each run alone and reverted:**

1. The source guard was written first and failed on the shipped loader
   (`does not load the lucide icon set into the loader`, 1 failed / 2 passed).
2. `plugins: [lucideIconsPlugin()]` restored → the full docs suite reported
   `1 failed | 952 passed`, naming that test.
3. The same restored plugin, rebuilt and served → `smoke:build` exited `1`:
   `FAIL /assets/_-zVe5NuKi.js: ships 1849 lucide icon records (limit 100)`.
4. `"icon": "book"` added to `content/docs/meta.json` → the source guard
   reported `1 failed | 2 passed`, naming
   `declares no icon in any sidebar meta.json`. Reverted.
5. `icon: book` added to `content/docs/troubleshooting.mdx` → the frontmatter
   test failed with `troubleshooting.mdx: icon: book`. **This proof found a real
   defect in the first version of the guard:** the walker matched `meta.json` by
   file name but was called with `".mdx"`, which matched nothing, so the
   frontmatter check passed on every page. The walker now takes a predicate and
   the test failed on the forced icon before being accepted. Reverted.
6. Restored fix, full committed gate: `smoke:build` exit `0`, 100 pages, 221
   links, 1 310 anchors, `client bundle checked — 24 lucide icon records`.

## 7. STOP conditions

- The loader's `icon` resolution is needed by a real page: **stop** and report
  which page, rather than removing it. No such page exists today.
- After removing the plugin, the sidebar, header or theme toggle loses a glyph:
  **stop** — the five `docs-theme` icons are used, and a regression means the
  change was not confined to the unused namespace import.
- Any client asset still carries more than 100 icon records after the rebuild:
  **stop** and name the asset. Do not raise the limit to make the gate pass.
- `smoke:build` cannot find `dist/client/assets` after a local build: **stop**
  and report the build output; do not skip the check silently.

## 8. Acceptance

- `source.ts` has no lucide plugin and no content declares an icon.
- A single client script may not ship more than 100 lucide icon records, proved
  by `smoke:build` and shown to fail with the plugin re-enabled.
- The measured JS on a component page drops by ≈ 700 KiB decoded.
- Sidebar, header controls, theme toggle and search are unchanged in the
  preview.
- `check`, `check-types`, `lint`, `test` and `smoke:build` green.

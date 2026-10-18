# 516 — install metadata and a raster icon fallback

**Phase:** F/G · **Workstream:** docs-site · **Depends on:** 410, 413, 418, 510
· **Owns:** `apps/docs`, `apps/docs/public/brand`, the built-site crawl.

## 1. Why this exists (the gap, measured)

Plan `510` gave every page a document head: a mark, an apple-touch icon, a
1200×630 card, OpenGraph/Twitter tags and two scheme-scoped `theme-color` tags.
`src/lib/site-head.ts` names `mark.svg` as the **only** `rel="icon"` and
`smoke:build` asserts `rel="icon" type="image/svg+xml"`.

Measured on 2026-10-18 in this worktree:

- `/favicon.ico` is not built (`apps/docs/public` has `brand/`, `gpuix-preview/`,
  `screenshots/` only), and the head names no raster icon. Safari does not render
  an SVG favicon in the tab or the bookmark list, so the site's tab identity is
  blank there even though the geometry exists.
- There is no web app manifest: no `site.webmanifest` route, no `rel="manifest"`,
  no name/short-name/start-URL/background colour for a phone home screen or a
  browser shortcut.
- `site-head.test.ts` cannot see either absence, because it asserts the assets
  it is told about; `smoke:build` asserts the icon it is told to look for. Both
  pass while the identity is SVG-only.

`MISSION.md`'s definition of done asks for complete metadata and an original docs
identity. Plan `510` delivered the head; this plan closes the install surface
without duplicating a colour or a name, and it stays honest about the site's
offline story.

**Not in scope:** a service worker, offline caching, or an install prompt. The
manifest declares `display: "browser"` for exactly that reason: the site works
online only, so it must not claim a standalone app experience it cannot honour.

## 2. Files

Create:

| Path | What |
| ---- | ---- |
| `apps/docs/src/lib/site-manifest.ts` | `SiteManifest` schema + `renderManifest()` — the manifest derived from `site-head.ts` and the tokens |
| `apps/docs/src/routes/site[.]webmanifest.ts` | The route, following `sitemap[.]xml.ts` and `robots[.]txt.ts` |
| `apps/docs/src/lib/site-manifest.test.ts` | The manifest/head contract and the icon pixels |
| `apps/docs/public/brand/icon-192.png` | 192×192 raster of `mark.svg` |
| `apps/docs/public/brand/icon-512.png` | 512×512 raster of `mark.svg` |
| `apps/docs/public/brand/favicon-32.png` | 32×32 raster tab icon |

Change:

| Path | What |
| ---- | ---- |
| `apps/docs/src/lib/site-head.ts` | `favicon`, `icon192`, `icon512` in `BRAND_ASSETS`; `MANIFEST_PATH`; a PNG `rel="icon"`; `rel="manifest"`; `application-name` and `apple-mobile-web-app-title` meta |
| `apps/docs/src/lib/site-head.test.ts` | The existing icon assertion becomes "the SVG mark **and** a raster fallback", and the manifest link is asserted once |
| `apps/docs/scripts/smoke-build.ts` | Every page links the manifest and a PNG icon; `/site.webmanifest` answers `200` as `application/manifest+json`; each icon it names answers `200` as an image |
| `apps/docs/public/brand/README.md` | The three new files in the asset table and the regeneration commands |
| `apps/docs/README.md` | The brand section names the manifest and what it deliberately does not claim |
| `PLAN.md` | A decision row: the manifest is a **route**, and `display: "browser"` |
| `TODO.md` | The docs-site row ticks, and the count moves `116/116 → 117/117` |
| `.agents/slop/plans/README.md` | This plan in the docs block |

## 3. Implementation

### 3.1 The icons

The PNGs are committed authoring artefacts, exactly like `apple-touch-icon.png`
and `og.png` (plan `510`). Rasterize the committed source, never a hand-drawn
copy:

```sh
cd apps/docs
for size in 32 192 512; do
  # Keep the 64-unit viewBox so sips rasterizes the geometry, not an upscale.
  sed -e "s/width=\"64\" height=\"64\"/width=\"$size\" height=\"$size\"/" \
      public/brand/mark.svg > "/tmp/mark-$size.svg"
  sips -s format png "/tmp/mark-$size.svg" --out "public/brand/$( \
    [ "$size" = 32 ] && echo favicon-32 || echo icon-$size).png"
done
sips -g pixelWidth -g pixelHeight public/brand/favicon-32.png \
  public/brand/icon-192.png public/brand/icon-512.png
```

Expected sizes: `32 × 32`, `192 × 192`, `512 × 512`. If `sips` writes a
different size, fix the command, not the test.

### 3.2 `site-head.ts`

```ts
export const BRAND_ASSETS = {
  mark: "/brand/mark.svg",
  favicon: "/brand/favicon-32.png",
  touchIcon: "/brand/apple-touch-icon.png",
  icon192: "/brand/icon-192.png",
  icon512: "/brand/icon-512.png",
  socialCard: "/brand/og.png",
} as const;

/** The install metadata document; a route so its colours come from the theme. */
export const MANIFEST_PATH = "/site.webmanifest";
```

The links become, in order: stylesheet, the SVG mark (`sizes="any"`), the 32 px
PNG, the apple-touch icon, the manifest. Add the two name metas:

```ts
{ name: "application-name", content: SITE_NAME },
{ name: "apple-mobile-web-app-title", content: SITE_NAME },
```

### 3.3 `site-manifest.ts`

One shape, one renderer, no literal. The module is **plain data**, not an Effect
schema: `src/architecture.test.ts` keeps the Effect runtime out of every non-test
module in `apps/docs/src`, and the manifest has no boundary to decode — it is
generated. The schema contract lives in the test, which decodes the rendered
document (so a malformed manifest fails the suite).

```ts
export interface SiteManifest {
  readonly name: string;
  readonly short_name: string;
  readonly description: string;
  readonly start_url: string;
  readonly display: "browser";
  readonly background_color: string;
  readonly theme_color: string;
  readonly icons: ReadonlyArray<SiteManifestIcon>;
}

export const manifest = (): SiteManifest => ({
  name: SITE_NAME,
  short_name: SITE_NAME,
  description: SITE_DESCRIPTION,
  start_url: "/",
  display: "browser",
  background_color: themeColors.light.background,
  theme_color: themeColors.light.background,
  icons: MANIFEST_ICONS,
});

export const renderManifest = (): string =>
  `${JSON.stringify(manifest(), null, 2)}\n`;
```

`MANIFEST_ICONS` is `[icon-192 as "192x192", icon-512 as "512x512"]`, both
`purpose: "any"`. **No maskable icon:** the mark is full-bleed, so a mask would
crop the pane grid; a padded variant is a design change, not a metadata one.
Say that in a comment beside the list.

The route mirrors `robots[.]txt.ts`:

```ts
export const Route = createFileRoute("/site.webmanifest")({
  server: {
    handlers: {
      GET: () =>
        new Response(renderManifest(), {
          headers: { "content-type": "application/manifest+json; charset=utf-8" },
        }),
    },
  },
});
```

### 3.3a `site.ts` must be readable outside Vite

`renderManifest()` imports `site-head.ts`, which imports `site.ts`; `site.ts`
read `import.meta.env.VITE_SITE_URL` and threw `Cannot read properties of
undefined` under plain Node (measured while wiring the crawl). The read becomes
`import.meta.env?.VITE_SITE_URL ?? DEFAULT_SITE_URL` — the same default, and the
module is now usable by a Node tool. This is the smallest change that lets the
crawl compare the served document with its source instead of re-typing it.

### 3.4 The crawl

In `auditPage`, beside the icon checks:

```ts
if (linkHref(page.body, "icon", "image/png") === null)
  fail("no png rel=icon");
if (linkHref(page.body, "manifest") === null) fail("no rel=manifest");
```

In `audit`, after the brand-asset block, one install-metadata check:

1. `GET /site.webmanifest` — any status other than `200` is a problem, and the
   content type must start with `application/manifest+json`.
2. The body must equal `renderManifest()` **byte for byte**. The unit suite
   already decodes that document; the crawl's extra claim is that the route
   serves the module's document rather than a stale or hand-written copy.
3. Every `MANIFEST_ICONS[].src` must answer `200` with `content-type: image/png`.

Count it in the log line (`smoke: install metadata checked`) so the gate's
output says what ran.

`site.ts`'s optional chain (3.3a) is what makes step 2 importable from Node.

## 4. Test plan (each test can fail)

`apps/docs/src/lib/site-manifest.test.ts` (five tests):

| Test | Fails today because |
| ---- | ------------------- |
| the emitted document decodes as `Schema.Class` and carries the site's name, description, `start_url: "/"` and `display: "browser"` | there is no manifest |
| every manifest icon exists, is a PNG, and its IHDR matches the declared `sizes` | the three files do not exist |
| both manifest colours equal `themeColors.light.background` | a literal colour would drift from the palette |
| the head links exactly the SVG mark and the 32 px PNG, plus the manifest once | the head names only the SVG |
| `application-name` and `apple-mobile-web-app-title` are the site name | neither meta exists |

`site-head.test.ts` keeps its asset/pixel tests; its icon assertion now expects
the two `rel="icon"` entries in order, the manifest link, and a 32×32 favicon
test. The shapes it reads come from `src/lib/png.testing.ts`, shared with the
manifest suite (the helper was extracted from `site-head.test.ts` rather than
copied).

**Two-direction proof** (measured; see §7):

1. Remove `rel: "manifest"` from `site-head.ts` → the new head test fails by
   name; restore.
2. Rename `favicon-32.png` → two asset tests fail with the missing path; restore.
3. Change the manifest's `theme_color` to a literal `#000000` → the palette test
   fails; restore.
4. Delete the manifest route's real body (serve `{}`) → `smoke:build` fails
   `/site.webmanifest: the served document is not renderManifest()`; restore.
5. Remove `icon-192.png` from the built site → `smoke:build` fails
   `/brand/icon-192.png: manifest icon: expected 200 image/png, got 404`;
   restore.
6. Remove the `apple-mobile-web-app-title` meta from the head → `smoke:build`
   fails `no apple-mobile-web-app-title` on every page (TanStack keeps one meta
   per name, so the crawl must read the built page, not the head module);
   restore.

## 5. Commands and expected results

```sh
nub run --filter docs test          # includes the new suite, all green
nub run --filter docs check-types   # fumadocs-mdx + tsc (app and preview)
nub run --filter docs smoke:build   # build, serve, crawl: manifest + icons 200
nub run check                       # repo gate
nub run lint
```

Expected: `smoke:build` prints `smoke: pages 91 checked`, the new
`smoke: install metadata checked`, and exits `0`. A missing manifest route exits
`1` and names `/site.webmanifest`; an unreachable server exits `2`.

## 6. Results

- Icons rasterized from `mark.svg` at `32`, `192`, `512`; each IHDR checked by
  the suite. `sips` reported exactly `32 × 32`, `192 × 192`, `512 × 512`.
- `site-manifest.ts` + `src/routes/site[.]webmanifest.ts` ship; the palette's
  `lightTheme.colors.background` is the only colour source (`#F6F8FA`).
- Head: SVG + 32 px PNG `rel="icon"`, `rel="manifest"`, `application-name`,
  `apple-mobile-web-app-title`.
- The shared PNG helper is `src/lib/png.testing.ts`; `site-head.test.ts` lost
  its private copy.
- `site.ts` reads `import.meta.env?.VITE_SITE_URL` so the crawl can import
  `renderManifest()` under Node (measured failure before the change:
  `TypeError: Cannot read properties of undefined (reading 'VITE_SITE_URL')`).
- Docs suite: **67 files / 462 tests** (was 66 / 456). `check-types` green.
- Built crawl: `smoke: pages 91 checked`, `smoke: links 114 checked`,
  `smoke: brand 3 assets checked`, `smoke: install metadata checked`,
  `smoke: ok`, exit `0`.
- `nub run check` and `nub run lint` green.

## 7. Measured

Every two-direction proof was run in this worktree on 2026-10-18.

| Direction | Command | Observed |
| --------- | ------- | -------- |
| link removed | `vitest run src/lib/site-manifest.test.ts` | `× links the manifest and a raster fallback from every page`; 1 failed / 4 passed |
| icon renamed | `vitest run src/lib/site-head.test.ts src/lib/site-manifest.test.ts` | `favicon → /brand/favicon-32.png: expected false to be true`; 2 failed / 10 passed |
| literal colour | `vitest run src/lib/site-manifest.test.ts` | `Expected: "#F6F8FA" / Received: "#000000"`; 1 failed / 4 passed |
| stale route | `smoke:build --no-build` after rebuilding with `new Response("{}")` | exit `1`, `FAIL /site.webmanifest: the served document is not renderManifest()` |
| missing icon | `smoke:build --no-build` after moving `dist/client/brand/icon-192.png` | exit `1`, `FAIL /brand/icon-192.png: manifest icon: expected 200 image/png, got 404 text/html; charset=utf-8` |
| dropped name meta | `smoke:build --no-build` after removing `apple-mobile-web-app-title` and rebuilding | exit `1`, `FAIL /: no apple-mobile-web-app-title` on every page |

Restored state re-verified: `smoke:build --no-build` exits `0` with
`smoke: install metadata checked`.

## 8. Acceptance

- Every page links a manifest and a raster icon; both answer `200`.
- The manifest is generated from `site-head.ts` and the tokens — no literal
  colour, no hand-typed name.
- The manifest icons are the committed mark's pixels at their declared sizes.
- `display: "browser"` is deliberate and documented: no service worker, no
  offline claim.
- `docs` tests, type-check and `smoke:build` green; `nub run check` and
  `nub run lint` green.
- `TODO.md`, `PLAN.md` and the brand README tell the same story as the code.

## 9. STOP conditions

- **STOP** if `sips` cannot rasterize `mark.svg` at the requested size. Do not
  hand-draw a second mark and do not commit a blurred upscale; report the
  command and its output instead.
- **STOP** if TanStack cannot serve a `.webmanifest` route in the built Worker
  (the crawl returns 404 after a successful build). Report the built output
  paths; do not move the manifest into `public/` with a literal colour unless
  the plan is amended to say where the colour comes from.
- **STOP** if the manifest route makes the Worker bundle import the tokens at
  runtime in a way `src/architecture.test.ts` rejects. The app already imports
  the token root entry for colours, so this should not happen; report the
  failure rather than weakening the architecture guard.

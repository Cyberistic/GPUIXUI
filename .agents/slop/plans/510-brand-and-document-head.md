# 510 — The document head is complete: a brand mark, a social card and a theme colour, proven on every built page

**Status:** implemented (2026-10-18) · **Phase:** F (showcase) / G (release gate) ·
**Owner:** docs-site
**Depends on:** `410`, `413`, `416`, `418`, `439`, `440`, `446`
**Owns:** `apps/docs` (all edits below are inside it), `TODO.md`, `PLAN.md`,
this plan and the plan index. `docs/preview-strategy.md` and the
component-page template are untouched — no component page changes shape.
**Number:** `510` — `400–499` is full and `500–509` are used; this is the next
free number, as `.agents/slop/plans/README.md` records.

## 1. The gap this plan closes

`MISSION.md` asks for a docs site with "light/dark docs themes", "complete
metadata" and "an original package name, branding, docs identity and release
metadata". The head of every page is where that identity actually ships.

Measured on the production build today (`nub run --filter docs build`, then
`vite preview`, then `curl /docs/installation`):

```text
<title>Installation — GPUIXUI</title>
<meta name="description" content="Add GPUIXUI to a GPUix application."/>
<meta property="og:site_name" content="GPUIXUI"/>
<meta property="og:title" content="Installation"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="https://docs.gpuixui.dev/docs/installation"/>
<link rel="canonical" href="https://docs.gpuixui.dev/docs/installation"/>
```

and for the assets the head never names:

```text
/favicon.ico            -> 404
/favicon.svg            -> 404
/brand/mark.svg         -> 404
/og.png                 -> 404
/apple-touch-icon.png   -> 404
```

Four defects, each visible to a reader or a shared link:

1. **No icon.** Every browser tab shows the empty-file glyph. There is no
   `rel="icon"` and no asset to point it at.
2. **No social card.** `og:image`, `og:image:width`, `og:image:height`,
   `og:image:alt`, `twitter:card` and `twitter:image` are absent, so every
   shared link renders a bare text card.
3. **No `theme-color`.** A mobile browser's chrome does not follow the docs'
   light or dark background, although both palettes exist and are pinned.
4. **`public/brand/README.md` promises assets that do not exist.** Its only line
   is "Original GPUIXUI wordmark and logo assets. Never third-party marks." —
   the directory holds that sentence and nothing else. This is exactly the
   truth-pass class of defect plans 459/463/465 exist to remove.

**Why no gate caught it:** `scripts/smoke-build.ts` audits title, `<h1>`,
`<main>`, `lang`, heading order and `canonical` per page, then every
`href`/`src` target for a non-404. A head with no icon, no `og:image` and no
`theme-color` passes all of it, because the absence of a tag is not a broken
link. `src/lib/page-meta.test.ts` tests the payload builder, not the built HTML.

**One sentence for the plan's result:** every built page carries an original
brand mark, an absolute social card, a light and a dark `theme-color`, and the
same built-site smoke that crawls the site fails by name when any of it goes
missing or stops resolving.

## 2. Files to change

All paths relative to `apps/docs/` unless stated. **Do not edit `packages/*`,
`examples/*`, `apps/playground` or the repository `docs/`.** If a step finds a
defect outside `apps/docs`, stop at that step's STOP condition and record it in
`TODO.md`.

### 2.1 New: `public/brand/mark.svg`

The original mark: a full-bleed 64×64 square in the light theme's `primary`
(`#5f4bdb`) carrying four rounded panes — the component-grid idea, drawn from
geometry rather than type, so no font or third-party mark is involved. Full-bleed
(no outer radius) because iOS masks an `apple-touch-icon` itself; a transparent
corner would paint black there.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img" aria-label="GPUIXUI">
  <rect width="64" height="64" fill="#5f4bdb"/>
  <g fill="#ffffff">
    <rect x="12" y="12" width="18" height="18" rx="4"/>
    <rect x="34" y="12" width="18" height="18" rx="4" opacity="0.55"/>
    <rect x="12" y="34" width="18" height="18" rx="4" opacity="0.55"/>
    <rect x="34" y="34" width="18" height="18" rx="4"/>
  </g>
</svg>
```

### 2.2 New: `public/brand/apple-touch-icon.png`

Generated from 2.1, 180×180, committed:

```sh
cd apps/docs
sips -s format png -z 180 180 public/brand/mark.svg --out public/brand/apple-touch-icon.png
sips -g pixelWidth -g pixelHeight public/brand/apple-touch-icon.png
# expected: pixelWidth: 180 / pixelHeight: 180
```

### 2.3 New: `public/brand/og.svg` and `public/brand/og.png`

A 1200×630 card on the dark theme's `background` (`#11141a`), the mark repeated,
the wordmark, the one-line description and the docs domain. The SVG is the
editable source; the PNG is what the head serves (no social platform renders an
SVG card).

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#11141a"/>
  <circle cx="1070" cy="96" r="300" fill="#2e2370"/>
  <g transform="translate(96 96)">
    <rect width="72" height="72" rx="0" fill="#5f4bdb"/>
    <g fill="#ffffff">
      <rect x="13" y="13" width="21" height="21" rx="4"/>
      <rect x="38" y="13" width="21" height="21" rx="4" opacity="0.55"/>
      <rect x="13" y="38" width="21" height="21" rx="4" opacity="0.55"/>
      <rect x="38" y="38" width="21" height="21" rx="4"/>
    </g>
  </g>
  <text x="96" y="330" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#eef1f5">GPUIXUI</text>
  <text x="96" y="404" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="40" fill="#a1a9b7">A native UI component library for GPUix</text>
  <text x="96" y="552" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="28" fill="#a7a9ff">docs.gpuixui.dev</text>
</svg>
```

```sh
sips -s format png public/brand/og.svg --out public/brand/og.png
sips -g pixelWidth -g pixelHeight public/brand/og.png
# expected: pixelWidth: 1200 / pixelHeight: 630
```

Both PNGs are committed. Regeneration is an authoring step, not a build step:
the build stays free of an image rasterizer (plan 410's "smallest toolchain").

### 2.4 Rewrite: `public/brand/README.md`

Replace the one-line promise with the actual inventory — what each file is, its
dimensions, the exact command that produced it, and the rule that the mark is
original geometry with no third-party mark or logo. This file is the record
`MISSION.md` asks for; it must not describe files that are not there.

### 2.5 New: `src/lib/site-head.ts`

One module owns the site-wide head, so `__root.tsx` stops carrying a hand-written
literal and the guard can test the real values. It reads the palette from
`@gpuixui/tokens` (allowed by `src/architecture.test.ts`) rather than retyping
`#11141a`.

```ts
import { themeColors } from "./docs-theme";
import { absoluteUrl } from "./site";

/** The site identity every page inherits. */
export const SITE_NAME = "GPUIXUI";
export const SITE_DESCRIPTION = "A native UI component library for GPUix.";

/** The committed brand assets, named once for the head and its guards. */
export const BRAND_ASSETS = {
  mark: "/brand/mark.svg",
  touchIcon: "/brand/apple-touch-icon.png",
  socialCard: "/brand/og.png",
} as const;

export const SOCIAL_CARD = {
  width: 1200,
  height: 630,
  alt: "GPUIXUI — a native UI component library for GPUix",
} as const;

/** The `<head>` TanStack merges into every route. */
export const siteHead = (stylesheet: string) => ({
  meta: [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: SITE_NAME },
    { name: "description", content: SITE_DESCRIPTION },
    { name: "color-scheme", content: "light dark" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:image", content: absoluteUrl(BRAND_ASSETS.socialCard) },
    { property: "og:image:width", content: `${SOCIAL_CARD.width}` },
    { property: "og:image:height", content: `${SOCIAL_CARD.height}` },
    { property: "og:image:alt", content: SOCIAL_CARD.alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: absoluteUrl(BRAND_ASSETS.socialCard) },
    { name: "twitter:image:alt", content: SOCIAL_CARD.alt },
  ],
  links: [
    { rel: "stylesheet", href: stylesheet },
    { rel: "icon", type: "image/svg+xml", href: BRAND_ASSETS.mark },
    { rel: "apple-touch-icon", href: BRAND_ASSETS.touchIcon },
  ],
});
```

**Measured while implementing:** a light and a dark `theme-color` **cannot** be
two route-`meta` entries. `@tanstack/react-router`'s `buildTagsFromMatches`
keys each tag by `m.name ?? m.property` and keeps the first one it reaches while
iterating the merged head backwards, so the built HTML carried **one**
`theme-color` (the dark one) and the crawl failed with
`expected two theme-color metas, found 1` on all 90 pages. The pair therefore
lives in a `THEME_COLOR_META` constant that `__root.tsx` renders as plain
`<meta>` elements inside `<head>`, beside `<HeadContent />`; the unit test pins
the values and asserts the route head carries no `theme-color`, so it cannot be
re-added where it would be silently dropped. This is decision `D37` in
`PLAN.md`.

### 2.6 Change: `src/routes/__root.tsx`

`head: () => siteHead(appCss)`; delete the inlined literal and the now-unused
`absoluteUrl`-free imports. Everything else (`RootProvider`,
`PlatformProvider`, `SearchFocusRestore`) stays.

### 2.7 Change: `src/routes/index.tsx`

The landing page is the only route with no page-level `og:title`/`og:type`, so a
share of the home page falls back to the site name. Add
`og:title` = `SITE_NAME`, `og:description` = `SITE_DESCRIPTION`,
`og:type` = `website` beside the existing `og:url` and canonical.

### 2.8 Change: `scripts/smoke-build.ts`

Two additions; neither renames an existing check.

1. **Per page** (inside `auditPage`), fail by name when:
   - `description` is missing or blank;
   - `og:title` is missing or blank;
   - `og:url` is not absolute or its pathname is not the page's path;
   - `og:image` is not absolute;
   - `twitter:card` is not `summary_large_image`;
   - no `rel="icon"` or no `rel="apple-touch-icon"` link;
   - fewer than two `theme-color` metas, or either `content` is not `#rrggbb`.
2. **Once** (in `audit`), after the pages are fetched: take `og:image` from the
   first page and the icon/touch-icon `href`s from it, fetch each **path**
   against the local base URL (never the absolute production URL), and fail
   when a response is not `200` or its `content-type` does not start with
   `image/`. `Fetched` gains `contentType: string | null`, read from
   `response.headers.get("content-type")`.

Add one line to the console report: `smoke: brand <n> assets checked`.

### 2.9 New: `src/lib/site-head.test.ts`

Reads the module and the committed bytes. Header comment states the bug being
guarded: a head that names an asset the repo does not ship, a social card whose
pixels are the wrong size, or a `theme-color` that is not the theme's background.

Tests:

1. **Every brand path exists** — each `BRAND_ASSETS` value maps to a file under
   `apps/docs/public/`; a renamed asset fails by name.
2. **The mark is original geometry** — `mark.svg` starts with `<svg`, carries
   `viewBox="0 0 64 64"`, and contains no `<image`, no `href="http` and no
   `<text` (nothing borrowed, nothing font-dependent).
3. **The card is 1200×630 on disk** — parse the PNG's IHDR
   (`DataView.getUint32(16)` / `(20)`) and compare with `SOCIAL_CARD`; a
   re-rasterized card at the wrong size fails.
4. **The head is complete** — `siteHead("x.css")` contains exactly one
   `og:image` (absolute, ending in `/brand/og.png`), `og:image:width/height`
   equal to `SOCIAL_CARD`, `twitter:card` = `summary_large_image`, an icon link
   of type `image/svg+xml`, an `apple-touch-icon` link, and `color-scheme`.
5. **`theme-color` follows the palette** — exactly two entries whose `media`
   names light and dark and whose `content` equals `themeColors.light.background`
   / `themeColors.dark.background`.

### 2.10 Documentation

- `apps/docs/README.md`: a short **Brand and document head** section — the four
  assets, the `siteHead` module, and the fact that `smoke:build` proves them.
- `apps/docs/content/docs/contributing.mdx`: extend the `smoke:build` row to
  name the head/asset assertions it now makes.
- `TODO.md`: add the completed row to the docs-site list, keep the progress bar
  at 100 % (`111/111`).
- `PLAN.md` §4: decision `D37` — the site head is generated from one module and
  every built page's brand metadata is a release-gate assertion, not a memory.
- `.agents/slop/plans/README.md`: the `510` row.

## 3. Commands, in order

Run from the worktree root.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `cd apps/docs && sips -s format png -z 180 180 public/brand/mark.svg --out public/brand/apple-touch-icon.png && sips -s format png public/brand/og.svg --out public/brand/og.png` | exit `0`; two PNGs written |
| 2 | `sips -g pixelWidth -g pixelHeight public/brand/apple-touch-icon.png public/brand/og.png` | `180×180`, `1200×630` |
| 3 | `nub run --filter docs test -- site-head` | the new suite passes; the other docs tests still pass |
| 4 | `nub run --filter docs check-types` | exit `0` |
| 5 | `nub run check` | exit `0` (tests assert, lint, format, types) |
| 6 | `nub run lint` | exit `0` |
| 7 | `nub run test` | exit `0` |
| 8 | `nub run --filter docs smoke:build` | exit `0`; the report includes `smoke: brand 3 assets checked` |

## 4. Test plan and the two directions

Every claim below is measured before it is recorded; a proof that did not run is
reported as unrun.

| # | Break | Expected failure | Restore |
| - | ----- | ---------------- | ------- |
| 1 | delete the `og:image` entry from `siteHead` | `site-head.test.ts` fails naming `og:image`; `smoke:build` fails on every page with `no og:image` | restore the line |
| 2 | rename `public/brand/og.png` | unit test fails on the missing file **and** the IHDR parse cannot read it; `smoke:build` fails the brand asset with `404` | `git checkout` the file |
| 3 | change a `theme-color` `content` to `#123456` | unit test fails on the token comparison; `smoke:build` still passes (it only checks the shape) — record that the value is a unit-test claim, not a build claim | restore |
| 4 | remove the `rel="icon"` link | unit test fails; `smoke:build` fails `no rel="icon"` on every page | restore |
| 5 | replace `og.png` with the 64×64 `mark.png` | unit test fails `1200×630`, naming both sizes | restore |
| 6 | point `BRAND_ASSETS.socialCard` at `/brand/missing.png` | `smoke:build` fails `brand asset /brand/missing.png: 404` | restore |

`smoke:build` proves the production half; the unit suite proves the values. Each
assertion above names the field, path or size it checks, so a future rename
fails by name rather than silently passing.

### 4.1 What was measured

| # | Break | Observed |
| - | ----- | -------- |
| 1 | `og:image` removed from `siteHead` | unit: `expected [] to have a length of 1`; smoke: `FAIL /: no og:image` and `FAIL /docs/…: no og:image` on all 90 pages, `smoke: brand 2 assets checked` |
| 2 | `og.png` replaced by the 64×64 mark | unit: `expected { width: 64, height: 64 } to deeply equal { width: 1200, height: 630 }` |
| 3 | dark `theme-color` changed to the light background | unit: `expected [ '#F6F8FA', '#F6F8FA' ] to deeply equal [ '#F6F8FA', '#11141A' ]` |
| 4 | `rel="icon"` link removed | unit: `expected undefined to be '/brand/mark.svg'`; smoke: `FAIL /docs/installation: no svg rel=icon` |
| 5 | `THEME_COLOR_META` block removed from `<head>` | smoke: `FAIL /docs/installation: expected two theme-color metas, found 0`, 180 problems (90 pages × 2 rules) |
| 6 | `BRAND_ASSETS.socialCard` → `/brand/missing.png` | smoke: `FAIL /brand/missing.png: /docs/workspace: expected 200, got 404`, `smoke: 1 problem(s)` |

Restored tree: `smoke: pages 90 checked`, `smoke: brand 3 assets checked`,
`smoke: ok`; docs suite `440 passed (440)`.

Directions 4 and 5 were broken in one build (both rules, one run); the 180
problems are 90 pages × 2 rules, and each message names its own rule.

The TanStack dedupe was found by direction 5's sibling: the first green attempt
failed 90 pages with `expected two theme-color metas, found 1` before the pair
moved out of the route head (§2.5).

## 5. STOP conditions

Stop and report, do not improvise, when:

- `sips` cannot rasterize `mark.svg` or `og.svg` (a blank or wrong-size PNG is
  the same failure). Fall back is **not** a hand-edited PNG: record the exact
  error and leave the assets un-committed.
- the built site serves the head without the new tags after the change, and the
  cause is a TanStack head-merge rule rather than this module — record the
  measured merge rule and stop; do not duplicate tags into every route.
- `smoke:build` needs a network fetch of the **absolute** card URL to pass (it
  must fetch the path against the local base URL).
- any step needs an edit outside `apps/docs`, `TODO.md`, `PLAN.md` or
  `.agents/slop/plans/`.

## 6. Acceptance criteria

- `nub run check`, `nub run lint`, `nub run test` exit `0`.
- `nub run --filter docs smoke:build` exits `0` and reports the brand assets.
- A page's built HTML carries: description, `og:title`, `og:url`, absolute
  `og:image` + dimensions + alt, `twitter:card`, icon, apple-touch-icon, and a
  light and dark `theme-color` equal to the library palettes.
- The four assets exist, the READMEs describe them truthfully, and each new
  assertion has a measured two-direction proof in §4.
- No component page, preview or search document changes behaviour; the
  component-page template and `docs/preview-strategy.md` are untouched.

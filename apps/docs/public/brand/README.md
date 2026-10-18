# GPUIXUI brand assets

The mark is **original geometry** — a 2×2 pane grid on the light theme's
`primary` — drawn here, not copied from a third-party logo, icon set or
wordmark. It carries no `<image>` reference and no `<text>`, so it cannot fall
back to a font or a borrowed file.

| File | What it is | Used by |
| ---- | ---------- | ------- |
| `mark.svg` | 64×64 full-bleed mark | `<link rel="icon" type="image/svg+xml">` |
| `favicon-32.png` | 32×32 PNG, rasterized from `mark.svg` | `<link rel="icon" type="image/png" sizes="32x32">` — the tab icon for browsers that do not render an SVG favicon |
| `apple-touch-icon.png` | 180×180 PNG, generated from `mark.svg` | `<link rel="apple-touch-icon">` |
| `icon-192.png` | 192×192 PNG, generated from `mark.svg` | `/site.webmanifest` |
| `icon-512.png` | 512×512 PNG, generated from `mark.svg` | `/site.webmanifest` |
| `og.svg` | 1200×630 social-card source (dark background, mark, wordmark) | — |
| `og.png` | 1200×630 PNG, generated from `og.svg` | `og:image` and `twitter:image` |

The head itself is `src/lib/site-head.ts`, the manifest is
`src/lib/site-manifest.ts` served by `src/routes/site[.]webmanifest.ts`.
`src/lib/site-head.test.ts` and `src/lib/site-manifest.test.ts` prove that every
path exists, that every PNG's real pixels match its declared size, that the card
is 1200×630, and that both `theme-color` values are the theme's own background;
`scripts/smoke-build.ts` proves the built pages carry the tags, that each asset
answers `200` with an image content type and that the served manifest is the
module's document.

The manifest declares `display: "browser"` and no maskable icon: the site has no
service worker, so it does not claim a standalone offline app, and the mark is
full-bleed, so an Android mask would crop the pane grid.

## Regenerating the PNGs

The PNGs are committed; rasterizing them is an authoring step, not a build step.
macOS `sips` is what produced them:

```sh
cd apps/docs
sips -s format png -z 180 180 public/brand/mark.svg --out public/brand/apple-touch-icon.png
sips -s format png public/brand/og.svg --out public/brand/og.png

# The icon sizes: keep the 64-unit viewBox and change only the intrinsic size,
# so sips rasterizes the geometry instead of upscaling the 64 px bitmap.
for size in 32 192 512; do
  sed -e "s/width=\"64\" height=\"64\"/width=\"$size\" height=\"$size\"/" \
    public/brand/mark.svg > "/tmp/mark-$size.svg"
  sips -s format png "/tmp/mark-$size.svg" --out "public/brand/icon-$size.png"
done
mv public/brand/icon-32.png public/brand/favicon-32.png

sips -g pixelWidth -g pixelHeight public/brand/*.png
# favicon-32.png:      32 × 32
# apple-touch-icon.png: 180 × 180
# icon-192.png:        192 × 192
# icon-512.png:        512 × 512
# og.png:              1200 × 630
```

A different rasterizer is fine as long as the sizes hold — the unit tests read
the IHDR of every PNG and fail by name otherwise.

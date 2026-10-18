# GPUIXUI brand assets

The mark is **original geometry** — a 2×2 pane grid on the light theme's
`primary` — drawn here, not copied from a third-party logo, icon set or
wordmark. It carries no `<image>` reference and no `<text>`, so it cannot fall
back to a font or a borrowed file.

| File | What it is | Used by |
| ---- | ---------- | ------- |
| `mark.svg` | 64×64 full-bleed mark | `<link rel="icon" type="image/svg+xml">` |
| `apple-touch-icon.png` | 180×180 PNG, generated from `mark.svg` | `<link rel="apple-touch-icon">` |
| `og.svg` | 1200×630 social-card source (dark background, mark, wordmark) | — |
| `og.png` | 1200×630 PNG, generated from `og.svg` | `og:image` and `twitter:image` |

The head itself is `src/lib/site-head.ts`. `src/lib/site-head.test.ts` proves
that every path exists, that the card's pixels are 1200×630, and that both
`theme-color` values are the theme's own background; `scripts/smoke-build.ts`
proves the built pages carry the tags and that each asset answers `200` with an
image content type.

## Regenerating the PNGs

The PNGs are committed; rasterizing them is an authoring step, not a build step.
macOS `sips` is what produced them:

```sh
cd apps/docs
sips -s format png -z 180 180 public/brand/mark.svg --out public/brand/apple-touch-icon.png
sips -s format png public/brand/og.svg --out public/brand/og.png
sips -g pixelWidth -g pixelHeight public/brand/*.png
# apple-touch-icon.png: 180 × 180
# og.png:               1200 × 630
```

A different rasterizer is fine as long as the sizes hold — the unit test reads
the IHDR of both PNGs and fails by name otherwise.

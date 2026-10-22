# `@gpuixui/icons`

The icon set for the GPUIxUI library, plus its sizing and accessibility rules.

Icons are **data**, not components: each one is a self-contained 24x24
monochrome SVG markup string. GPUix's host `<svg>` element renders raw markup
from `source` and tints it with `style.color` — the `SvgProps` comment in
`@gpuix/native/host` calls them "monochrome SVGs tinted by `style.color`". So
the set carries no palette of its own and needs no theme: it is usable before
the design system exists.

```tsx
import { Icon } from "@gpuixui/icons";
import { lightTheme } from "@gpuixui/tokens";

// Decoration: takes itself out of the accessibility tree.
<Icon name="search" color={lightTheme.colors.mutedForeground} />

// Meaningful on its own: announced as an image.
<Icon name="warning" color={lightTheme.colors.destructive} label="Overdue" />
```

An `Icon` needs one tint, so a themed component usually takes it from the
theme it is already reading (`useTheme()` in `@gpuixui/primitives` returns the
same `colors` roles).

## API

| Export | What it is |
| ------ | ---------- |
| `Icon` | the component: `name`, `color`, `size?`, `label?`, `testId?` |
| `ICON_NAMES` / `IconName` | every name, sorted; the source of truth for which icons exist |
| `icons` | markup by name, for a library that renders the `<svg>` itself |
| `ICON_SIZES` / `iconPixels` | the `xs`…`xl` scale and its resolver |

Two rules the component enforces, because both are silent bugs otherwise:

- **`color` is required.** A monochrome SVG with no tint renders black, which
  is invisible in a dark theme. Pass a token role; there is no default palette
  by design (see `AGENTS.md` §4 on scattered literals).
- **A decorative icon gets `role="presentation"`** and produces no
  accessibility node; only a `label` promotes it to `role="img"`. An icon that
  announces itself inside a button makes the button read twice.

The rendered `<svg>` also sets `pointerEvents: "none"`, so an icon inside a
control cannot swallow the press meant for the control.

## Sizes

`xs` 12 · `sm` 14 · `md` 16 (default) · `lg` 20 · `xl` 24, or a raw pixel count.
The scale is `iconSize` from `@gpuixui/tokens`, not a second copy, so
a theme change moves the icons with it. Named sizes are how an icon lines up
with the text beside it.

## Conventions for the markup

- 24x24 `viewBox`, geometry only, on the Lucide grid.
- `fill="none"` and `stroke="#000"` in the shared wrapper — the two paint values
  a monochrome tint can use. Do not put a colour in an individual icon: the
  theme cannot reach it.
- Self-contained: no `<script>`, `<image>`, `<foreignObject>`, `<style>`,
  `<use>`, `href`, `url(`, or `@import`.

`src/registry.test.ts` enforces all of the above over every entry, so a
malformed icon fails the suite rather than shipping.

## Documentation and example

- `docs/icon.mdx` — the icon page: API, size scale, the two accessibility rules,
  limitations, provenance and verification.
- `packages/primitives/examples/icons.example.tsx` — a runnable status strip and
  the size scale, mounted in the real renderer by
  `packages/primitives/runtime/examples.runtime.test.tsx` (the example needs the
  theme and the runtime harness, which live in the primitives package).

## Provenance

Geometry follows the [Lucide](https://lucide.dev) 24x24 grid, ISC licence. No
third-party icon file is copied verbatim, and no logo or brand mark is included.
See `LICENSES/` for the attribution record.

## Verification status

The registry, sizing and `Icon`'s accessibility/props contract are covered by
executable tests (`nub run --filter @gpuixui/icons test`).

**Verified in the real GPUix runtime** by
`packages/primitives/runtime/icons.runtime.test.tsx`, which runs with
`nub run --filter @gpuixui/primitives test:runtime` (the harness lives with the
package that consumes icons). Measured 2026-10-17:

- the raw `<svg source>` markup is painted: at `lg` the box is 20×20, at `xl`
  24×24;
- a decorative icon is absent from the accessibility tree, and a labelled one is
  an `Image` node carrying its name;
- `style.color` tints the painted mark: two captures of the same red icon are
  byte-identical while the blue capture differs.

The binding behind that run is the locally-built `darwin-x64` artifact — the
recipe is in `apps/playground/README.md` §The binding on this host — not a
published binary (none exists for Intel macOS).

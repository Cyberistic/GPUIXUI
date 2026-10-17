# `@gpuixui/icons`

The icon set for the GPUixUI library, plus its sizing and accessibility rules.

Icons are **data**, not components: each one is a self-contained 24x24
monochrome SVG markup string. GPUix's host `<svg>` element renders raw markup
from `source` and tints it with `style.color` — the `SvgProps` comment in
`@gpuix/native/host` calls them "monochrome SVGs tinted by `style.color`". So
the set carries no palette of its own and needs no theme: it is usable before
the design system exists.

```tsx
import { Icon } from "@gpuixui/icons";
import { theme } from "@gpuixui/tokens";

// Decoration: takes itself out of the accessibility tree.
<Icon name="search" color={theme.color.mutedForeground} />

// Meaningful on its own: announced as an image.
<Icon name="warning" color={theme.color.destructive.background} label="Overdue" />
```

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
Named sizes are how an icon lines up with the text beside it.

## Conventions for the markup

- 24x24 `viewBox`, geometry only, on the Lucide grid.
- `fill="none"` and `stroke="#000"` in the shared wrapper — the two paint values
  a monochrome tint can use. Do not put a colour in an individual icon: the
  theme cannot reach it.
- Self-contained: no `<script>`, `<image>`, `<foreignObject>`, `<style>`,
  `<use>`, `href`, `url(`, or `@import`.

`src/registry.test.ts` enforces all of the above over every entry, so a
malformed icon fails the suite rather than shipping.

## Provenance

Geometry follows the [Lucide](https://lucide.dev) 24x24 grid, ISC licence. No
third-party icon file is copied verbatim, and no logo or brand mark is included.
See `LICENSES/` for the attribution record.

## Verification status

The registry, sizing and `Icon`'s accessibility/props contract are covered by
executable tests (`nub run --filter @gpuixui/icons test`).

**Not yet verified:** that GPUix paints a given markup, that the tint reaches
`stroke="#000"`, and that `style.width`/`height` scale the 24x24 grid. Those
need the native runtime, which cannot run in this environment — see
`.agents/slop/plans/020-gpuix-runtime-capability.md` §3. They are tasks for
`packages/testing` / `apps/playground`.

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
| `Icon` | the component: `name`, `color`, `size?`, `label?`, `testId?`, `rotation?` |
| `ICON_NAMES` / `IconName` | every name, sorted; the source of truth for which icons exist |
| `isIconName` | the membership guard for a decoded name |
| `icons` | markup by name, for a library that renders the `<svg>` itself |
| `iconMarkup` / `FALLBACK_ICON` | the resolver a stored name goes through, and the `help` mark it paints when the name is absent |
| `rotatedIconMarkup` | the same markup turned clockwise by degrees, written into the document because the runtime has no transform |
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

`rotation` turns the mark clockwise by degrees about the 24x24 centre. It is
written into the markup (`<g transform="rotate(… 12 12)">`) because GPUix has no
renderer transform and an `<svg>` host would ignore one anyway; resvg resolves
the attribute as part of the geometry. `90`, `180` and `270` are exact, any
finite angle works, and `NaN` reads as no turn.

## Sizes

`xs` 12 · `sm` 14 · `md` 16 (default) · `lg` 20 · `xl` 24, or a raw pixel count.
The scale is `iconSize` from `@gpuixui/tokens`, not a second copy, so
a theme change moves the icons with it. Named sizes are how an icon lines up
with the text beside it. A count the runtime cannot paint and a **name the scale
does not carry** — a stored preference from another release — both resolve to
`md` through `iconPixels`, which takes the decoded value as `unknown`. The
membership test is that package's `isIconSize` too, so the five names and the
index a consumer checks a saved choice against cannot drift apart.

## Names

`ICON_NAMES` is the set, and TypeScript rejects an unknown `name` — but a name is
often a **stored value**: a saved toolbar, a workspace layout, an action record.
A release that renames or drops an icon therefore reaches `Icon` as a string the
union no longer names. `iconMarkup` reads the registry with that decoded value
and answers the `help` mark for a name the set does not carry, because the
registry read used to answer `undefined`: measured on `@gpuix/native@0.11.0`,
the element kept its 24×24 box and its `Image` accessibility node while
**painting nothing**, so an icon-only button read as its action and showed a
blank square. A name the set does not carry now paints a mark that reads as
"unknown", and the caller's `label` still names the action. `isIconName` is the
same membership test, for a caller filtering its own stored list.

## Conventions for the markup

- 24x24 `viewBox`, geometry only, on the Lucide grid, copied from the release the
  provenance record names.
- `fill="none"` and `stroke="#000"` in the shared wrapper — the two paint values
  a monochrome tint can use. Do not put a colour in an individual icon: the
  theme cannot reach it.
- Self-contained: no `<script>`, `<image>`, `<foreignObject>`, `<style>`,
  `<use>`, `href`, `url(`, or `@import`.
- One name per geometry: two names sharing markup means one of them paints the
  wrong glyph.
- Only the element types a window probe has painted (`path`, `circle`, `rect`,
  `line`, `polyline`, `polygon`) — a new type paints nothing until something
  measures it.
- The file pins its own JSX runtime (`@jsxImportSource @gpuix/react`): the
  package tsconfig already names it, but a consumer that compiles this package
  from source with its own automatic runtime would otherwise type `Icon`'s
  `<svg>` against that runtime's props. `packages/primitives/src/jsx-runtime.test.ts`
  holds this package and `@gpuixui/primitives` to it.

`src/registry.test.ts` enforces all of the above over every entry, so a
malformed icon fails the suite rather than shipping.

## Documentation and example

- `docs/icon.mdx` — the icon page: API and limitations. The size scale, the
  naming rules and provenance live in this README (§Sizes, §Names, §Conventions,
  §Provenance), which the docs suite reads.
- `packages/primitives/examples/icons.example.tsx` — a runnable status strip and
  the size scale, mounted in the real renderer by
  `packages/primitives/runtime/examples.runtime.test.tsx` (the example needs the
  theme and the runtime harness, which live in the primitives package).

## Provenance

The geometry is copied from [Lucide](https://lucide.dev)
`lucide-static@1.61.0`, on its 24x24 grid. Lucide licenses the set under ISC and
the icons it inherits from Feather under MIT, so both notices travel with the
geometry: they are reproduced in full in
[`LICENSES/lucide.md`](../../LICENSES/lucide.md). No colour, wrapper attribute,
icon font, sprite, logo or brand mark is copied. `sort-desc` (the mirror of
`sort-asc`) and `star-filled` (Lucide's `star` filled) are the package's own.

## Verification status

The registry, sizing and `Icon`'s accessibility/props contract are covered by
executable tests (`nub run --filter @gpuixui/icons test`). The registry suite also
fails when two names share geometry, when an entry uses an element type no probe
has painted, or when the set's page stops listing a name it ships.

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

Measured 2026-10-22: the same red/blue pair runs for one icon of each element
form the set uses (`pause` rects, `play` a closed arc path, `circle`, `file` arcs
joined to segments), because markup that does not parse paints an empty frame —
indistinguishable from a decorative icon. An icon given no geometry fails it.

The binding behind that run is the locally-built `darwin-x64` artifact — the
recipe is in `apps/playground/README.md` §The binding on this host — not a
published binary (none exists for Intel macOS).

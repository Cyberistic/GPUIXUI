# Migrating a primitive to `@gpuixui/tw`

The primitives' resting appearance is moving from the imperative resolvers in
`core/style.ts` / `core/variants.ts` / `core/layout.ts` to Tailwind class
strings compiled through `@gpuixui/tw`. This is a **syntax migration, not a
redesign**: the compiled `StyleDesc` must equal what the old resolver produced,
which is exactly what `src/recipe/recipe.test.ts` proves for the converted
primitives.

## Conversion status

Every primitive's resting appearance is now a `src/recipe` class string,
compiled through `recipeTw`, with the caller's `className` joined last and its
`style` merged after that. The ten primitives skipped in the first wave (they
needed *computed* geometry) are converted on the **derived** and **`style`**
tiers described in §"The three tiers" — zero remain on their `core/` resolver.

| Primitive | Recipe | Tier |
| --------- | ------ | ---- |
| `Button` | `buttonClass` | static |
| `Input`, `TextArea` | `fieldClass` | static (`TextArea` is transitive — it renders `Input`'s `fieldChrome`) |
| `Text` | `textClass` | static |
| `Stack`, `Grid` | `stackClass`, `gridClass` | static |
| `Box` | `boxClass` | static |
| `Label` | — | static (a `Stack` of `Text`; `className`/`style` flow to the outer column) |
| `Separator` | `separatorClass` | static |
| `ScrollArea` | `scrollClass` | static |
| `ButtonGroup` | `buttonGroupClass` | static |
| `Toggle` | `toggleClass` | static |
| `OTPField` | `otpGroupClass`, `fieldSquareClass` | static |
| `Select` | `selectTriggerClass`, `selectContentClass`, `selectItemClass` | static |
| `Rating` | `ratingStarClass`, `ratingGroupClass` | static |
| `Tooltip` | `tooltipClass` | static |
| `NumberField` | `numberFieldClass`, `numberStepperClass`, `numberInputClass` | derived (`w-stepper-column` = `iconSize.md + spacing.sm`) |
| `Checkbox`, `RadioGroup`, `Switch` | `selectionBoxClass`, `radioDotClass`, `switchTrackClass`, `switchThumbClass` | derived (`size-icon`, `size-dot`, `switch-track`, `size-thumb`) |
| `Slider`, `RangeSlider` | `sliderTrackClass`, `sliderRailClass`, `sliderFillClass`, `sliderThumbClass` | derived + `style` (`px-inset`, `slider-thumb`; the fill width is data) |
| `Meter`, `Progress` | `progressTrackClass`, `progressFillClass` | derived + `style` (the fill width is data) |
| `Spinner` | `spinnerGroupClass`, `spinnerDotClass` | static + `style` (caller dot size, per-step opacity) |
| `Skeleton` | `skeletonClass` | static + `style` (caller width/height, pulse opacity) |

## The three tiers

Tailwind has three mechanisms for a value; the registry now mirrors all three,
typed:

1. **Static** — a class that maps to a fixed `StyleDesc` (`h-md`,
   `grid-cols-3`, `bg-primary`). This is the first wave.
2. **Derived** — a utility whose value is a **function of the theme**. A
   registry entry may return a plain `number` (bound to a square `width` +
   `height`) or a full shape. This replaces `calc()` for reusable token
   arithmetic, so a density or `iconSize` override moves the geometry exactly
   as the old `core/` resolver did.
3. **`style`** — a typed `style` prop merged **last**, for data the theme
   cannot know (percentage fills, a caller's dot size, a pulse opacity).

The derived tokens the primitives register (the geometry ones all read
`theme.iconSize` / `theme.spacing`, so they follow an override; `text-brand`
follows a brand edit):

| Utility | Resolves | Used by |
| ------- | -------- | ------- |
| `size-icon-<size>` | `iconSize[size]` (square) | checkbox/radio box, slider thumb |
| `size-dot-<size>` | `round(iconSize[size] / 2)` (square) | radio dot |
| `size-thumb-<size>` | `iconSize[size] − 2·spacing["2xs"]` (square) | switch thumb |
| `switch-track-<size>` | `round(iconSize[size] × 1.75)` × `iconSize[size]` | switch track |
| `switch-thumb-on-<size>` | `spacing["2xs"] + round(iconSize[size] × 1.75) − iconSize[size] − 2·borderWidth.thin` (`left`) | switch thumb, checked |
| `slider-thumb-<size>` | `iconSize[size]` square, `∓round(iconSize/2)` margins, strong border | slider thumb |
| `px-inset-<size>` | `round(iconSize[size] / 2)` horizontal padding | slider track inset |
| `w-stepper-column` | `iconSize.md + spacing.sm` | number-field stepper column |
| `h-space-<step>` | `spacing[step]` | slider rail, progress/meter track |
| `text-brand` | `brandText(theme)` — the brand moved toward `foreground` until it reads as text | button `link`, text `primary` tone |

The rule: **arithmetic on a token → a derived token; data → `style`.** A derived
token need not be geometry: a colour the theme does not ship is derived from one
instead of named, so `text-brand` starts at `primary` and holds every surface a
link sits on.

## The `calc()` escape hatch

`@gpuixui/tw` now also evaluates a **compile-time numeric** `calc()` — numeric
literals, `+ - * /`, parentheses, and `var(--token)` references to the theme's
numeric scales — to a plain `number` at compile time. It exists for one-off
arithmetic that is not worth naming; the derived tokens above are preferred for
reusable arithmetic. The grammar rejects, through the `unsupportedReason` path
(never a silent drop):

- `%` (percentages);
- `px` / `rem` / `em` and any other unit;
- `min()` / `max()` / `clamp()`;
- any other function, and an unknown `var(--token)`.

`var(--token)` resolves against `--icon-size-*`, `--spacing-*`, `--radius-*`,
`--border-width-*`, `--control-height-*`, `--control-padding-*` and
`--row-height`.

## Merge order

A component resolves its style as **static → derived/`calc` → caller
`className` → caller `style`**:

```ts
const resolved = recipeTw.classesToStyle(
  cn(recipe, className),   // className wins the recipe
  theme,
);
let style = resolved.style;
// ... state buckets (disabled / invalid / focus) ...
style = mergeStyle(style, props.style);   // style wins everything
```

`recipe.test.ts` and `recipe/geometry.test.ts` pin the equivalence against the
pre-migration resolvers; `geometry.test.ts` also proves the merge order (a
caller `className` beats the recipe and a caller `style` beats both).


## The two halves

| Piece | File | Role |
| ----- | ---- | ---- |
| registry | `src/recipe/registry.ts` | `recipeTw`, the `createTw` compiler with the primitives' theme-scale utilities |
| recipes | `src/recipe/index.ts` | `buttonClass`, `fieldClass`, `textClass`, `stackClass`, `gridClass` — the class-string builders |

The recipe is the **single source of truth** for a component's resting
appearance. A component no longer calls `controlStyle(spec, theme)`; it calls
the recipe builder and compiles the result:

```ts
const resolved = recipeTw.classesToStyle(cn(buttonClass(variant, size, opts), className), theme);
```

`cn` joins the caller's `className` **last**, so a caller's utility wins conflicts
exactly as shadcn's `cn` resolves them.

## Why the primitives keep their own scale steps

`@gpuixui/tw` compiles shadcn's fixed metrics (`h-9` → 36, `px-4` → 16). The
primitives' geometry is **theme-scale driven**: control height and padding come
from the active density, gap from the spacing scale, type from the typography
scale. That density is load-bearing — the runtime suites assert a button's
height equals `density.controlHeight.md` and that a density override moves it
(`runtime/theme-axes.runtime.test.tsx`). So the registry maps the *named* scale
steps the primitives use to theme values, and falls back to the built-in table
for every other class.

This is the deliberate seam between the two packages: `@gpuixui/tw` serves
components that want shadcn conformance (Toast, Dialog, Popover); the
primitives use the same compiler with a theme-scale registry.

## Steps to convert one component

1. **Add `className?: string`** to the component's props.
2. **Write the recipe builder** in `src/recipe/index.ts` — a `cn(...)` of
   base / variant / size strings (see the mapping table below).
3. **Add any new utility** to `src/recipe/registry.ts` if the built-in table
   lacks it (see "Theme-scale utilities").
4. **Swap the resolver for the compiler** in the component:

   ```ts
   const resolved = recipeTw.classesToStyle(cn(recipe, className), theme);
   let style = resolved.style;
   if (disabled) {
     style = mergeStyle(style, resolved.disabled);      // opacity + cursor
     style = suppressFeedback(style);                    // hover/active → resting fill
   }
   if (invalid) style = mergeStyle(style, resolved.invalid);
   style = mergeStyle(style, keyboardRing(theme, invalid)); // keyboard-only ring
   style = mergeStyle(style, props.style);               // caller's style wins
   ```

   `suppressFeedback` lives in `src/components/internal.ts`; `keyboardRing` lives
   in `src/core/focus.ts` and is merged at rest — never while focused.
5. **Add an equivalence test** (see below) asserting the compiled output equals
   the pre-migration resolver's output.
6. **Run** `nub run --filter @gpuixui/primitives check-types` and `test`.

A component whose interaction state is entirely expressible in the recipe's
`focus` / `invalid` / `disabled` buckets still merges those buckets itself —
GPUix has no `:hover`/`:disabled` pseudo-state, so the component owns the
merge, exactly as `core/style.ts` did.

## Mapping rules — native style prop → utility class

Geometry, colour and type map to the classes below. Columns are the
`StyleDesc` property, the class, and whether it is built into `@gpuixui/tw`.

| `StyleDesc` property | Class | Source |
| -------------------- | ----- | ------ |
| `display: "flex"` | `flex` | built-in |
| `flexDirection` | `flex-row` / `flex-col` | `flex-row` is registry, `flex-col` built-in |
| `alignItems` | `items-start` `items-center` `items-end` `items-stretch` `items-baseline` | `start`/`center` built-in, rest registry |
| `justifyContent` | `justify-start` `justify-center` `justify-end` `justify-between` `justify-around` | `center`/`between` built-in, rest registry |
| `gap` (spacing step) | `gap-<step>` | registry family → `theme.spacing` |
| `gridTemplateColumns` | `grid-cols-<n>` (1–12) | built-in → integer track count |
| `gridTemplateRows` | `grid-rows-<n>` (1–6) | built-in → integer track count |
| `flexWrap: "wrap"` | `flex-wrap` | registry |
| `flexGrow: 1` | `flex-grow` | registry |
| `flexShrink: 0` | `shrink-0` | built-in |
| `width` / `height` | `w-full` `h-full` `size-<size>` | `size-` registry family → density |
| `height` (control) | `h-<size>` (`sm`/`md`/`lg`) | registry family → `density.controlHeight` |
| `paddingLeft`/`Right` (control) | `px-<size>` | registry family → `density.controlPaddingX` |
| `paddingLeft`/`Right: 0` | `px-0` | built-in |
| `padding` (spacing step) | `p-<step>` | registry family → `theme.spacing` |
| `paddingLeft`/`Right`/`Top`/`Bottom` (spacing step) | `pl-` `pr-` `pt-` `pb-` | registry family → `theme.spacing` |
| `marginLeft`/`Right`/`Top`/`Bottom` (spacing step) | `ml-` `mr-` `mt-` `mb-` (`-0` exact) | registry family → `theme.spacing` |
| `top`/`left` (spacing step) | `top-<step>` `left-<step>` | registry family → `theme.spacing` |
| `borderRadius` | `rounded-<step>` | registry family → `theme.radius` |
| `borderWidth: 1` | `border` | built-in |
| `borderWidth: 0` | `border-0` | built-in |
| `borderColor` | `border-<role>` (`border-border`, `border-ring`, …) | built-in role table |
| `backgroundColor` | `bg-<role>` (`bg-primary`, `bg-input`, …) | built-in role table |
| `color` | `text-<role>` (`text-foreground`, `text-primary`, …) | built-in role table; `text-brand` is the registry's derived text colour |
| `fontSize`/`lineHeight`/`fontWeight` | `type-<role>` (`type-label`, `type-body`, `type-h2`, …) | registry family → `theme.typography` |
| `fontSize`/`lineHeight` (inherited weight) | `type-size-<role>` (`type-size-caption`, `type-size-label`) | registry family → `theme.typography`, no weight |
| `fontFamily` | `font-sans` / `font-mono` | registry |
| `cursor` | `cursor-pointer` `cursor-text` `cursor-not-allowed` | `pointer`/`not-allowed` built-in, `text` registry |
| `userSelect` | `select-none` / `select-text` | `none` built-in, `text` registry |
| `textAlign` | `text-start` `text-center` `text-end` | `center` built-in, `start`/`end` registry |
| `textOverflow: "ellipsis"` | `text-ellipsis` | registry |
| `whiteSpace` | `whitespace-nowrap` | built-in |
| `lineClamp: n` | `line-clamp-<n>` | registry family |
| `opacity` | `opacity-<n>` | built-in |
| `textDecoration: "underline"` | `underline` | built-in |
| `overflowX` / `overflowY` | `overflow-x-*` `overflow-y-*` | registry |
| `height`/`width: borderWidth.thin` | `h-px` / `w-px` | registry |
| `flexShrink: 1` | `shrink-1` | registry |
| `minWidth: "100%"` | `min-w-full` | registry |
| `boxShadow` (elevation) | `shadow-<level>` (`sm`/`md`/`lg`) | built-in; `overlay` is empty |
| `focusVisible` outline (keyboard ring) | not a class — `keyboardRing(theme, invalid)` | `core/focus.ts` |

Interaction state is expressed with the same prefixes `@gpuixui/tw` already
routes to buckets: `hover:` → `style.hover`, `active:` → `style.active`,
`focus-visible:` → `focus`, `aria-invalid:` → `invalid`, `disabled:` →
`disabled`. The component merges the bucket it needs.

## The grid

GPUix exposes `gridTemplateColumns` / `gridTemplateRows` as **numbers** — the
runtime draws `n` equal tracks and has no track strings, no `repeat()`, no
auto-flow, no named areas (plan 020 §1.2). `@gpuixui/tw`'s built-in table maps
the integer classes to those numbers:

- `grid-cols-<n>` (1–12) → `gridTemplateColumns: n`
- `grid-rows-<n>` (1–6) → `gridTemplateRows: n`
- `gap-<step>` → the spacing scale (the same family `Stack` uses)

`gridClass` clamps and floors the spec exactly as the old `gridStyle` resolver
did (`columns: 0` → `grid-cols-1`, `columns: 2.9` → `grid-cols-2`), so the
compiled `StyleDesc` is byte-for-byte the pre-migration output.

What the numeric runtime cannot express, and therefore stays out:

- **`col-span-*` / `row-span-*`** — `@gpuix/native@0.11.0`'s `StyleDesc` has no
  `gridColumn` / `gridRow` key (only `gridColumnMin` / `gridRowMin`, the
  min-content track sizing), so there is no place for a span. Layouts that need
  ragged placement belong in a wrapping `Stack`.
- **Arbitrary templates** (`grid-cols-[repeat(3,minmax(0,1fr))]`) — there is no
  track-string value to compile; the class lands in `TwResult.unsupported`, never
  silently dropped.
- **Responsive prefixes** (`md:grid-cols-3`) — the runtime has no container
  queries, so a breakpoint can never reflow tracks. As with every responsive
  token, it is recorded in `TwResult.responsive` for a later breakpoint pass and
  otherwise applies the base value.

## Theme-scale utilities (the primitives' registry)

The registry in `src/recipe/registry.ts` adds one family per theme scale. A
family resolves a **named step** to a theme value and returns `undefined` for
anything else, so the built-in table still runs for numeric/unknown classes:

| Family | Resolves | Examples |
| ------ | -------- | -------- |
| `h-` / `px-` / `size-` | density control metrics | `h-md` → `density.controlHeight.md`; `h-9` falls back to 36 |
| `gap-` | spacing scale | `gap-sm` → `theme.spacing.sm`; `gap-2` falls back to 8 |
| `p-` `pl-` `pr-` `pt-` `pb-` | spacing scale (padding) | `p-xs` → `theme.spacing.xs`; `pl-sm` → `theme.spacing.sm` |
| `ml-` `mr-` `mt-` `mb-` | spacing scale (margin) | `ml-md` → `theme.spacing.md`; `ml-0` exact → 0 |
| `rounded-` | radius scale | `rounded-md` → `theme.radius.md`; `rounded-2xl` falls back to 16 |
| `type-` | typography role | `type-label` → label size/leading/weight; `text-sm` still a size, `text-primary` still a colour |
| `type-size-` | typography role, size/leading only | `type-size-caption` → caption size/leading, weight inherited |

The **derived** geometry utilities (`size-icon-*`, `switch-track-*`,
`slider-thumb-*`, `px-inset-*`, `w-stepper-column`, `h-space-*`) are the same
kind of family, but their value is a function of `theme.iconSize` /
`theme.spacing` rather than a named scale step — see §"The three tiers".

`type-*` (not `text-*`) is deliberate: `cn` resolves `text-*` as size-vs-colour,
so a `text-h2` would be dropped as a colour conflict. The `type-` prefix keeps
the role out of that namespace. `type-size-*` is the same role resolution
*without* `fontWeight`, for surfaces that take a role's size but inherit the
surrounding weight (a menu row, a tooltip).

## Unsupported utilities

The compiler never silently drops a class: anything it cannot express lands in
`TwResult.unsupported` with a reason from `@gpuixui/tw`'s `unsupportedReason`
table (`packages/tw/src/unsupported.ts`). The reasons that matter when writing
a primitive recipe:

- **transform / translate / origin / scale / zoom** — GPUix has no CSS transform;
  use fade + top/left offsets (motion), not `-translate-*` or `zoom-*`.
- **transition-\*** — no CSS transitions; motion props animate explicit styles.
- **pseudo-elements** (`file:`, `placeholder:`, `after:`, `selection:`) — no
  native element to style.
- **child/sibling selectors** (`[&_svg]:*`, `group-*`, `peer-*`) — not part of
  an element's own `StyleDesc`.
- **arbitrary values** (CSS variables, `color-mix()`, percentage offsets like
  `top-1/2`) — no `StyleDesc` value. A numeric `calc()` **is** supported (see
  §"The `calc()` escape hatch"); a unit/percentage/function `calc()` is rejected.
- **`z-*`** — stacking order awaits the native `zIndex` slice.
- **`bg-clip-padding`, `underline-offset-*`, `resize-none`, `backdrop-blur`** —
  no native capability.

A recipe must not depend on an unsupported class: keep the design inside the
mapped table above, and leave a `// TODO:` for the capability it needs.

## Equivalence-test pattern

Copy the shape in `src/recipe/recipe.test.ts`. For each variant/size/modifier,
compile the recipe and assert it equals the pre-migration resolver's output:

```ts
const oracle = controlStyle({ variant: buttonVariants[variant], size }, theme);
const actual = recipeTw.classesToStyle(buttonClass(variant, size), theme).style;
expect(actual).toEqual(oracle);
```

Notes:

- `toEqual` ignores the oracle's `undefined`-valued keys (`backgroundColor:
  undefined` on a borderless variant), which the recipe simply omits — the
  rendered result is identical.
- The oracle comes from `core/`, the actual from the recipe: two independent
  expressions, so either side drifting fails the test.
- Add one "reads the theme it is given" case (repaint a role and require the
  recipe to follow) so a hard-coded colour cannot pass — the same anti-tautology
  guard `core/style.test.ts` uses.

## Usage

```tsx
import { Button } from "@gpuixui/primitives";

<Button variant="secondary" className="rounded-full px-6">
  Publish
</Button>;
```

The recipe resolves `variant="secondary"` → `bg-secondary
text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80`; the
caller's `rounded-full px-6` are joined last and win.

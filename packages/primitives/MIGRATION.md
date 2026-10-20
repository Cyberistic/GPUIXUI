# Migrating a primitive to `@gpuixui/tw`

The primitives' resting appearance is moving from the imperative resolvers in
`core/style.ts` / `core/variants.ts` / `core/layout.ts` to Tailwind class
strings compiled through `@gpuixui/tw`. This is a **syntax migration, not a
redesign**: the compiled `StyleDesc` must equal what the old resolver produced,
which is exactly what `src/recipe/recipe.test.ts` proves for the five converted
primitives (Button, Input, Text, Stack, Grid).

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
   if (focused) style = mergeStyle(style, focusRingStyle(theme, invalid));
   style = mergeStyle(style, props.style);               // caller's style wins
   ```

   `suppressFeedback` and `focusRingStyle` live in `src/components/internal.ts`.
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
| `borderRadius` | `rounded-<step>` | registry family → `theme.radius` |
| `borderWidth: 1` | `border` | built-in |
| `borderWidth: 0` | `border-0` | built-in |
| `borderColor` | `border-<role>` (`border-border`, `border-ring`, …) | built-in role table |
| `backgroundColor` | `bg-<role>` (`bg-primary`, `bg-input`, …) | built-in role table |
| `color` | `text-<role>` (`text-foreground`, `text-primary`, …) | built-in role table |
| `fontSize`/`lineHeight`/`fontWeight` | `type-<role>` (`type-label`, `type-body`, `type-h2`, …) | registry family → `theme.typography` |
| `fontFamily` | `font-sans` / `font-mono` | registry |
| `cursor` | `cursor-pointer` `cursor-text` `cursor-not-allowed` | `pointer`/`not-allowed` built-in, `text` registry |
| `userSelect` | `select-none` / `select-text` | `none` built-in, `text` registry |
| `textAlign` | `text-start` `text-center` `text-end` | `center` built-in, `start`/`end` registry |
| `textOverflow: "ellipsis"` | `text-ellipsis` | registry |
| `whiteSpace` | `whitespace-nowrap` | built-in |
| `lineClamp: n` | `line-clamp-<n>` | registry family |
| `opacity` | `opacity-<n>` | built-in |
| `textDecoration: "underline"` | `underline` | built-in |
| `boxShadow` (focus ring) | not a class — `focusRingStyle(theme, invalid)` | registry of `internal.ts` |

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

- **`col-span-*` / `row-span-*`** — `@gpuix/native@0.10.0`'s `StyleDesc` has no
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
| `rounded-` | radius scale | `rounded-md` → `theme.radius.md`; `rounded-2xl` falls back to 16 |
| `type-` | typography role | `type-label` → label size/leading/weight; `text-sm` still a size, `text-primary` still a colour |

`type-*` (not `text-*`) is deliberate: `cn` resolves `text-*` as size-vs-colour,
so a `text-h2` would be dropped as a colour conflict. The `type-` prefix keeps
the role out of that namespace.

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
- **arbitrary values** (`calc()`, CSS variables, `color-mix()`, percentage
  offsets like `top-1/2`) — no `StyleDesc` value.
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

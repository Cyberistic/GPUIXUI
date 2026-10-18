# `@gpuixui/tw`

shadcn/ui class recipes for the GPUix native renderer, with shadcn's
[`cn`](https://github.com/shadcn-ui/cn) for class joining and conflict
resolution.

The native runtime has no CSS. This package resolves the class strings to the
flat `StyleDesc` GPUix elements take, so the recipe stays the one shadcn ships:

```tsx
import { cn } from "@gpuixui/tw";
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from "@gpuixui/tw";
import { classesToStyle } from "@gpuixui/tw";
import { useTheme } from "@gpuixui/tokens/react";

const theme = useTheme();
const style = classesToStyle(
  cn(
    BUTTON_BASE,
    BUTTON_VARIANTS.default,
    BUTTON_SIZES.default,
    className,
  ),
  theme,
).style;
```

Or use the React wrappers:

```tsx
import { Tw } from "@gpuixui/tw/react";

<Tw.input className="h-9 px-3 py-1 rounded-md border border-input" />
```

Or switch the package's `jsxImportSource` to `@gpuixui/tw` and keep shadcn
TSX host elements as written:

```json
{ "compilerOptions": { "jsxImportSource": "@gpuixui/tw" } }
```

```tsx
<div className="h-9 px-3 py-1 rounded-md border border-input" />
```

The runtime wraps only GPUix host elements that carry `className`; components
and unclassed hosts go straight to React. The wrapper reads the nearest theme,
so light/dark changes resolve at render time.

## What is supported

- Geometry: `h-*`, `w-*`, `min-h-*`, `min-w-*`, `max-w-*`, `size-*`, `p-*`,
  `px-*`, `py-*`, `mx-*`, `my-*`, `inset-*`, `top-*`, `right-*`, `bottom-*`,
  `left-*`, `gap-*`, `rounded-*`, and the flex/overflow utilities the recipes
  use.
- Type: `text-*` (size and colour roles), `font-*`, `line-height` via `text-*`,
  `leading-*`.
- Surfaces: `bg-*`, `text-*`, `border-*`, semantic token roles, `/alpha`,
  `shadow-xs`–`shadow-xl` as native elevation.
- States: `hover:`, `active:`, `focus-visible:`, `disabled:`, `aria-invalid:`,
  `data-open:`, `data-closed:`, `dark:` (theme-resolved), `md:` (desktop
  default, recorded for a later breakpoint pass).
- Motion: `animate-in`, `fade-in-0`, `slide-in-from-*`, `duration-*`, `ease-*`
  map to `motion` props.

## What is recorded as unsupported

`transition-*` (GPUix has no CSS transitions), `transform`/`origin-*`/`zoom-*`
(GPUI has no transform), `z-*` (pending the GPUix `zIndex` patch),
`backdrop-filter`, `selection:`/`file:`/`placeholder:`/`after:` pseudo-elements,
`has-[...]`/`group-*`/`peer-*`/`*:` selectors, arbitrary `calc()`/CSS-variable
values, and percentage offsets such as `top-1/2`.

Each unsupported class is returned in `unsupported` with its original name; it
is never silently dropped. `unsupportedReason` gives the recorded reason, and
`src/unsupported.ts` is the audit table the coverage test checks against.

## Upstream

- shadcn/ui `references/ui` @ `d2fba50` (MIT), `apps/v4/registry/new-york-v4`
  and the Base UI registry.
- `cn` `0.5.0` (MIT).
- Base UI `v1.6.0` (MIT) for behavior work.

`src/upstream.test.ts` asserts the copied Input/Button class strings are still
present in the reference clone. It skips when `references/ui` is absent.

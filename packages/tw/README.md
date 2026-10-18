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

## Extending it

`createTw` / `createTwRegistry` add utilities, variants, recipe aliases and
unsupported reasons without editing the package:

```ts
import { createTw } from "@gpuixui/tw";

const tw = createTw({
  utilities: {
    "h-card": () => ({ height: 44 }),
    tone: (_theme, value) => ({ opacity: Number(value) / 100 }),
  },
  variants: [
    (variants, state) =>
      variants.includes("when-expanded") && state.expanded ? "open" : undefined,
  ],
  aliases: { "cn-card": "rounded-lg border bg-card" },
  unsupported: { "bg-card": "Card surfaces are painted by the panel host." },
});

tw.classesToStyle("cn-card h-card", theme);
```

`createTwRegistry` returns the merged registry; `classesToStyle` accepts it as
the third argument and component state as the fourth. `TwProvider` supplies a
registry to every `TwHost` and `Tw` wrapper, and `TwHost` also takes an explicit
`registry` prop.

## Base UI `cn-*` aliases

The Base UI registry writes `cn-input` / `cn-button` and leaves the recipe to
the style preset. `BASE_ALIASES` expands those hooks before `cn` resolves
conflicts, so `cn-input px-6` keeps the caller's padding. Values are the luma
`@apply` bodies; where luma differs from new-york-v4 (`rounded-3xl` input,
filled input surface, 32px button radius) the luma value is kept and the
difference is pinned in `src/aliases.test.ts`.

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
  default, recorded for a later breakpoint pass), and the state variants
  `has-[>svg]`, `has-data-[icon=inline-start|inline-end]`, `data-expanded`,
  `data-behind`, `data-limited`, `aria-expanded` when the caller passes the
  matching `TwState`.
- Hooks: every `cn-*` hook in `src/aliases.ts` expands to its luma recipe
  before `cn` resolves conflicts.
- Motion: `animate-in`, `fade-in-0`, `slide-in-from-*`, `duration-*`, `ease-*`
  map to `motion` props.

## What is recorded as unsupported

`transition-*` (GPUix has no CSS transitions), `transform`/`origin-*`/`zoom-*`
(GPUI has no transform), `z-*` (pending the GPUix `zIndex` patch),
`backdrop-filter`, `selection:`/`file:`/`placeholder:`/`after:` pseudo-elements,
`group-*`/`peer-*`/`*:` selectors, arbitrary `calc()`/CSS-variable values,
percentage offsets such as `top-1/2`, and `resize-none` (no native resize
handle).

Each unsupported class is returned in `unsupported` with its original name; it
is never silently dropped. `unsupportedReason` gives the recorded reason
(including a registry's custom reasons), and `src/unsupported.ts` is the audit
table the coverage test checks against.

## Upstream

- shadcn/ui `references/ui` @ `d2fba50` (MIT), `apps/v4/registry/new-york-v4`
  and the Base UI registry.
- `cn` `0.5.0` (MIT).
- Base UI `v1.6.0` (MIT) for behavior work.

`src/upstream.test.ts` asserts the copied Input/Button class strings and every
`cn-*` alias recipe are still present in the reference clone. It skips when
`references/ui` is absent.

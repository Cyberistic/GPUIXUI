# 524 — shadcn/Base UI conformance: Tailwind recipes → `StyleDesc`

| Field | Value |
| ----- | ----- |
| Status | in progress |
| Phase | infra (styling conformance) |
| Owner | cross-cutting (new `packages/tw`); integration in primitives/components |
| Depends on | `020`, `200`, `201`, `515/517` |
| Sources | `references/ui` @ `d2fba50` (shadcn/ui, MIT); `references/base-ui` @ `v1.6.0` (MIT); `references/cn` @ `8ebcbf0` (MIT) |
| Feeds | Input/Button (primitives), Toast/Dialog/Popover (components), every later shadcn port |

## 1. Goal

Make shadcn/Base UI the **source of truth** for component recipes and behavior
without adding CSS or a browser engine to GPUix:

- keep shadcn's class strings **verbatim** in our source;
- compile them to GPUix `StyleDesc` at the JS boundary;
- use shadcn's `cn` for class joining/conflict resolution;
- keep Base UI's state machine/keyboard/focus logic and isolate the DOM calls
  in one adapter.

**Non-goals:** a CSS parser or selector engine in Rust; arbitrary Tailwind;
`transform`/`scale`/`rotate` until GPUI supports them.

## 2. Why a compiler, not Tailwind in the renderer

GPUix has no DOM or CSS. A native element receives a flat `StyleDesc`:

```ts
style={{ height: 36, paddingLeft: 12, paddingTop: 4, borderRadius: 6 }}
```

Tailwind emits CSS. Teaching GPUix Tailwind means implementing selectors,
cascade, inheritance, media queries, pseudo-elements, transforms and stacking
contexts in Rust — a browser style engine. The useful boundary is the JSX/TSX
layer: resolve the class string to `StyleDesc` before the host call.

Evidence for the missing features:

- GPUI's `Style` at the pinned `remorses/zed` rev `2565b8a` (and at
  `zed-industries/zed` main) has no `transform`, `scale`, `rotate`, `z_index`
  or `backdrop_filter`.
- GPUix 0.10.0's `StyleDesc` has no `zIndex`, `transform` or `focusVisible`.
  It has `hover`/`active` and the flat box/text properties.

Consequences:

- `zIndex` can be added in GPUix (paint order + hit-test order) without GPUI.
- `translate` can be approximated with `top/left` (already supported, and
  animatable).
- `scale`/`rotate`/`backdropFilter` need a GPUI fork; record them as
  unsupported and use fade + position for shadcn's `zoom-in-95`/slide.

## 3. Package

New `packages/tw` (`@gpuixui/tw`):

```
src/index.ts          cn, classesToStyle, Tw, types
src/classes.ts        token split, variant routing, StyleDesc merge
src/utilities.ts      Tailwind utility → StyleDesc/ColorRef table
src/recipes.ts        verbatim shadcn class strings for the first slice
src/react.tsx         Tw.div / Tw.input / Tw.text wrappers
src/classes.test.ts   parser, cn conflict, Input/Button values
src/upstream.test.ts  asserts recipes match references/ui; skips if absent
```

API:

```ts
classesToStyle(className, theme) => {
  style, focus, invalid, disabled, unsupported
}
```

- `hover:` / `active:` → nested native state styles.
- `focus-visible:` → `focus` (applied by the component's focus state; 0.10.0
  has no `focusVisible` style property).
- `aria-invalid:` → `invalid`.
- `disabled:` → `disabled`.
- `data-open:` / `data-closed:` → returned state styles; the component chooses.
- `dark:` → no-op (the theme already resolves the dark roles).
- `md:` / `sm:` → parsed; the first slice defaults to the desktop value and
  records the breakpoint as a follow-up.
- `transition-*`, `selection:*`, `file:*`, `[&_svg]:*` → `unsupported` (each
  class is recorded, never silently dropped).

`cn` is re-exported from `cn`; `classesToStyle` runs the string through it
first, so `px-3 px-4` resolves to `px-4` exactly as shadcn expects.

## 4. First slice

1. **Input** (`new-york-v4`): `h-9 px-3 py-1 rounded-md text-sm` →
   height `36`, horizontal `12`, vertical `4`, radius `6`, font `14/20`.
2. **Button** (`new-york-v4`): base + `h-9 px-4 py-2` / `h-8 px-3` /
   `h-10 px-6` / `size-9`; variants from the verbatim cva table.
3. **Toast/Dialog/Popover**: shadcn's `data-open:animate-in fade-in-0
   zoom-in-95 duration-100` / overlay `fade-in-0` mapped to GPUix
   `motion`. Fade + `top` offset are implemented; zoom is recorded as the
   unsupported GPUI gap.

Integration is owned by the primitives (Input/Button) and components
(Toast/Dialog/Popover) agents; this plan supplies the package and the
conformance tests.

## 5. GPUix extension (separate patch, same plan)

Add `zIndex?: number` to:

- `references/gpuix/packages/native/src/style.rs` (`StyleDesc`);
- `packages/native/src/renderer.rs` paint/hit-test ordering;
- `packages/native/js/host.ts` and `packages/react/src/types/host.ts`.

The build script already copies `references/gpuix` to
`.agents/slop/scratch/gpuix-build/gpuix`; the change lands as a committed
patch file applied by `apps/playground/scripts/build-native-binding.sh`, and
the rebuilt `darwin-x64` artifact is verified with the smoke suite. Do not
patch `references/` directly.

## 6. Commands

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tw
nub install
nub run --filter @gpuixui/tw test
nub run --filter @gpuixui/tw check-types
nub run check
```

Expected: utility tests pass; the upstream test proves the copied class strings
are still present in `references/ui`; Input resolves to 36/12/4/6/14.

## 7. STOP conditions

- `references/ui` is absent: the upstream test skips; the utility tests still
  run. Do not claim conformance without the source.
- GPUI gains `transform`/`scale`: update §2/§4 before wiring zoom.
- A class has no mapping: add it to `unsupported` with a reason and a
  follow-up; do not silently return an empty style.

## 8. Test plan

- `cn("px-3", "px-4") === "px-4"` and conditional joining.
- Input recipe resolves height/padding/radius/font exactly.
- Button default/sm/lg/icon heights and paddings exactly.
- `hover:`/`focus-visible:`/`disabled:`/`aria-invalid:` land in the right
  buckets.
- Every shadcn class in the first-slice source is either mapped or listed as
  unsupported (the test fails when upstream adds a class).
- The upstream source still contains the exact recipe strings (fails on a
  silent local edit).

## 9. Acceptance

- Input and Button can be implemented with the class strings from shadcn.
- Toast/Dialog/Popover can consume the returned motion/state styles.
- No CSS/Tailwind runtime is added to the native packages.
- `nub run check` passes.

## 10. Results (2026-10-18)

- `packages/tw` created; `cn@0.5.0` installed and re-exported.
- 15 tests pass: `cn` conflict/join, Input 36/12/4/6/14, Button
  36/16/8 and the sm/lg/icon sizes, focus/invalid/disabled buckets,
  dialog/popover motion, toast 500 ms cubic bezier, and the upstream
  provenance guard.
- `nub run check` and `nub run test` pass in the worktree.
- The upstream test reads `references/ui` and proves the copied Input/Button
  strings are still present; it skips when the reference clone is absent.
- GPUI has no `transform`/`scale`/`rotate`/`z_index`; `zoom-*` is recorded as
  unsupported. `zIndex` is the GPUix-side next step (§5).
- Integration into `packages/primitives` (Input/Button) and
  `packages/components` (Toast/Dialog/Popover) is the next slice.


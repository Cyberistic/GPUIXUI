# 721 — macOS materials: translucent surface roles and the window they need

| Field | Value |
| ----- | ----- |
| Owner | `tokens-theme` (`packages/tokens`, `docs/tokens.md`) + one probe in `apps/playground` |
| Depends on | `063` platform styles (landed), the `window-backdrop` probe (landed) |
| Feeds | `722` (window recipe), `724`/`725` (components), `728`/`729` (blocks), `727` (landing) |
| Status | landed 2026-10-31 |

## Why

The runtime can open a vibrant window (`WindowOptions.windowBackground:
"blurred"`), and `docs/gpuix-capabilities.md:82` measured that it is honoured.
Nothing in the library uses it: every surface paints an opaque role, so every
window reads as a web page in a frame. A "native Mac" feel starts with the
sidebar, titlebar and popovers being a **material** (the desktop blurred
through), and the content pane being opaque.

The measured rule decides the design: the blur shows only where the app paints
**nothing** (alpha 0). A translucent fill in an *opaque* window composites
against the window's own surface, not the desktop. Whether a translucent fill in
a *blurred* window tints the vibrancy (as AppKit's sidebar tint does) is **not
measured yet** — step 1 measures it before any token is written.

## Step 1 — measure a translucent fill in a blurred window

Extend the existing probe; do not add a new one.

- `apps/playground/src/live/backdrop.ts` — add a second painted box, filled
  `#FFFFFF66`, beside the opaque `#D9432B` box. Record its captured RGBA per
  mode in the probe's report (`translucentFill`), next to `surfaceAlpha`.
- `apps/playground/src/live/backdrop.test.ts` — add a case that the report
  carries `translucentFill` for each of `windowBackgrounds`.

```sh
cd workspaces/<you>
nub run --filter playground build
for m in opaque transparent blurred; do
  nub apps/playground/dist/live/run.js --only window-backdrop --window-background $m
done
```

Expected: three runs, each green. Record the three `translucentFill` readings
in `docs/gpuix-capabilities.md:82` (the same row, one sentence).

Decision from the reading:

- `blurred` reads `translucentFill` alpha **< 255** → a material may carry a
  tint: `fill` is a translucent colour (option **T**).
- `blurred` reads alpha **255** → the app-side capture cannot show it, so a
  material must be **unpainted** (`#00000000`) and its tint is the OS's own
  (option **U**). The by-eye check below then decides whether the tint shows.

By-eye check (required for either option, the capture cannot prove the blur):
run `nub run dev:playground -- --window-background blurred`, put a colourful
window behind it, and take a `screencapture -l` of the window into
`.agents/slop/evidence/721-blurred.png`. Record what you saw in one sentence.

**STOP** if `blurred` and `opaque` read the same `surfaceAlpha` (the mode is
ignored on this host): report, do not write tokens for a material that does not
render.

## Step 2 — the material roles

`packages/tokens/src/materials.ts` (new, ~60 LOC):

```ts
/** The surfaces a native window paints as a material, not an opaque role. */
export const materialNames = ["sidebar", "titlebar", "popover", "hud", "sheet"] as const;
export type MaterialName = (typeof materialNames)[number];

/** One material: its fill over the window, and the opaque role it stands for. */
export interface Material {
  /** The fill painted over the window. `#00000000` leaves the OS material. */
  readonly fill: string;
  /** The opaque role used when the window is opaque or transparency is reduced. */
  readonly fallback: keyof ThemeColors;
}

export type ThemeMaterials = Readonly<Record<MaterialName, Material>>;

/** The window a theme's materials need. */
export type WindowBackground = "opaque" | "blurred";

/** The fill a surface paints: the material, or its opaque fallback. */
export const materialFill = (theme: Theme, name: MaterialName): string => …
```

`materialFill` returns `theme.colors[fallback]` when `theme.window ===
"opaque"` or `theme.reduceTransparency === true`, else the material's `fill`.
It is the **only** reader components use; no component reads `materials`
directly.

`packages/tokens/src/theme.ts` — `Theme` gains:

```ts
/** Material surfaces (sidebar, titlebar, popover, HUD, sheet). */
readonly materials: ThemeMaterials;
/** The window background the materials need. */
readonly window: WindowBackground;
/** The OS asked for less transparency; materials paint their fallback. */
readonly reduceTransparency: boolean;
```

Defaults (every theme, every non-darwin platform): every material's `fill` is
its fallback's colour, `window: "opaque"`, `reduceTransparency: false`. So
Windows, Linux and the authored looks paint exactly what they paint today —
`theme.test.ts` must stay green with no snapshot edits.

Fallbacks: `sidebar → muted`, `titlebar → background`, `popover → popover`,
`hud → popover`, `sheet → card`.

`packages/tokens/src/platforms.ts` — the darwin style sets `window:
"blurred"` and the fills. Option **U**: every fill `#00000000`. Option **T**:

| Material | light | dark |
| -------- | ----- | ---- |
| sidebar | `#F2F2F299` | `#1E1E1E80` |
| titlebar | `#00000000` | `#00000000` |
| popover | `#F6F6F6CC` | `#282828CC` |
| hud | `#1E1E1EB3` | `#1E1E1EB3` |
| sheet | `#FFFFFFE6` | `#2A2A2AE6` |

Darwin also gets its opaque content roles: light `background #FFFFFF`, `muted
#E8E8E8`; dark `background #1E1E1E`, `muted #282828`. Put these in the
existing `PlatformColors` table; do not add a second colour table.

`packages/tokens/src/index.ts` — export `materialNames`, `materialFill` and the
types.

## Step 3 — contrast and audit

`packages/tokens/src/audit.ts` — text on a material is audited against the
material's **fallback** (the worst case a translucent surface cannot promise).
Add `sidebar`/`popover`/`hud` to the audited pairs with `foreground` and
`mutedForeground`; `hud` is audited with `#FFFFFF` text.

## Step 4 — docs bridge

`apps/docs/src/lib/theme-css.ts` — `toCssVars` writes `--material-<name>` for
every material (the fill) and `--material-<name>-fallback`. `apps/docs/src/styles/blocks.css`
gains one rule the block frames reuse:

```css
.gx-material { background: var(--material-sidebar); backdrop-filter: blur(30px) saturate(1.8); }
```

The browser reproduction is labelled as such already; this makes it *look*
like the material instead of `muted`.

## Files

- `packages/tokens/src/materials.ts` (new), `materials.test.ts` (new)
- `packages/tokens/src/theme.ts`, `platforms.ts`, `audit.ts`, `index.ts`
- `apps/playground/src/live/backdrop.ts`, `backdrop.test.ts`
- `apps/docs/src/lib/theme-css.ts`, `theme-css.test.ts`, `src/styles/blocks.css`
- `docs/tokens.md` — a §Materials section (what, the measured rule, the
  fallback), `docs/gpuix-capabilities.md:82` — the step 1 reading

## Test plan

`nub run --filter @gpuixui/tokens test src/materials.test.ts`

| Case | Inversion that must fail it |
| ---- | --------------------------- |
| darwin's sidebar paints its material in a blurred window | `materialFill` always returns the fallback |
| an opaque window paints every material's fallback | drop the `theme.window === "opaque"` branch |
| reduced transparency paints the fallback on darwin | drop the `reduceTransparency` branch |
| linux, win32 and default paint today's roles for every material | change the default `sidebar` fallback to `card` |
| every material's fallback is a role `ThemeColors` carries | type-level: `fallback: "nope"` must not compile (`// @ts-expect-error`) |

Plus `theme-css.test.ts`: `publishes each material and its fallback` — invert by
skipping one material name.

## Acceptance

- Step 1 reading recorded; the option chosen is named in `docs/tokens.md`.
- `nub run --filter @gpuixui/tokens test` and `nub run check` green.
- No component changed in this plan (adoption is `722`/`724`).

## STOP

- Stop at step 1's STOP condition.
- Stop if a theme snapshot changes for a non-darwin platform.
- Stop if a component needs a material the five names do not cover: report the
  surface, do not add a sixth name ad hoc.

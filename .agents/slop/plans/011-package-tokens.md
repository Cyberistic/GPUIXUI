# 011 — Package: `@gpuixui/tokens`

**Workstream:** `tokens-theme`
**Phase:** B
**Depends on:** plan 010 (phase slice).
**Approved by:** the phase plan's acceptance criteria.

This plan is self-contained. A weaker executor can create the whole package by
following the steps in order. Where a value is given, use it exactly; where a
decision is given, do not re-litigate it.

---

## 1. Responsibility

`@gpuixui/tokens` is **inert data and pure functions**: the only source of
colour, typography, spacing, radii, density, elevation, border widths and icon
sizes for the library. It has no failure path, no I/O, no time, no randomness,
so it deliberately contains no Effect code. This is the one intentional
exception to the Effect-first rule, and the reason is recorded in the README:
there is nothing to make effectful.

It must not know about buttons, tables, panels or any component name.
Component-specific values belong to the component, expressed with these tokens.

## 2. Files to create

All paths relative to `packages/tokens/`:

```
package.json
tsconfig.json
tsconfig.build.json
README.md
src/index.ts
src/color.ts
src/typography.ts
src/scale.ts
src/elevation.ts
src/theme.ts
src/styles.ts
src/color.test.ts
src/typography.test.ts
src/scale.test.ts
src/theme.test.ts
src/styles.test.ts
src/react.tsx
src/react.test.tsx
src/brand-theme.example.ts
```

Do not create `src/schema.ts` in this pass. Runtime validation of theme JSON is
the consuming application's boundary; see §10 "Deliberate omissions".

## 3. `package.json`

```json
{
  "name": "@gpuixui/tokens",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Design tokens, semantic roles and light/dark themes for GPUIXUI.",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "import": "./dist/react.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "check-types": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "peerDependencies": {
    "react": "^19.2.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

`private: true` follows every other package until the release plan flips it.
`peerDependenciesMeta.optional` is correct because the core entry does not need
React; only `./react` does.

## 4. `tsconfig.json`

```json
{
  "extends": "@gpuixui/config/tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`tsconfig.build.json` extends it and excludes `src/**/*.test.ts`,
`src/**/*.test.tsx` and `src/**/*.example.ts`; `build` uses that config so tests
and the example never ship. `check-types` uses `tsconfig.json`, so tests and the
example are still type-checked.

Add `"@gpuixui/config": "workspace:*"` to `devDependencies` — every package that
extends the shared config declares it (see `packages/deploy/package.json`).

## 5. Public API

### 5.1 Colour (`src/color.ts`)

Two exports:

1. `export const palette` — the raw ramps, for documentation and for consumers
   who need a shade outside the semantic set. **Components must not use it.**
2. `export interface ThemeColors` + `export const lightColors` /
   `export const darkColors`.

Raw ramps (hex; 8 digits only where alpha is intentional):

```ts
export const palette = {
  neutral: {
    0: "#FFFFFF",
    25: "#FBFCFD",
    50: "#F6F8FA",
    100: "#EEF1F5",
    200: "#E1E5EC",
    300: "#CBD1DB",
    400: "#A1A9B7",
    500: "#737C8C",
    600: "#545D6C",
    700: "#3D4552",
    800: "#2A303B",
    850: "#222730",
    900: "#191D25",
    950: "#11141A",
    1000: "#0B0D11"
  },
  iris: {
    50: "#EEF0FF",
    100: "#E0E3FF",
    200: "#C7CBFF",
    300: "#A7A9FF",
    400: "#8B85FB",
    500: "#7567F2",
    600: "#5F4BDB",
    700: "#4C39B5",
    800: "#3B2C8F",
    900: "#2E2370",
    950: "#1C1547"
  },
  red: {
    50: "#FFF1F1",
    100: "#FFE0E0",
    200: "#FFC6C6",
    300: "#FF9E9E",
    400: "#FF6B6B",
    500: "#E5484D",
    600: "#CC3439",
    700: "#A5262B",
    800: "#7E1D21",
    900: "#5C1619",
    950: "#3A0B0D"
  },
  green: {
    50: "#ECFDF3",
    100: "#D3F9E2",
    200: "#A8F0C6",
    300: "#6FE0A3",
    400: "#3BC97F",
    500: "#1FA968",
    600: "#158754",
    700: "#116A43",
    800: "#0E5135",
    900: "#0A3A26",
    950: "#042015"
  },
  amber: {
    50: "#FFF8E8",
    100: "#FFEFC6",
    200: "#FFDE8A",
    300: "#FFC94D",
    400: "#F5B01F",
    500: "#D99400",
    600: "#B57600",
    700: "#8E5B00",
    800: "#6B4500",
    900: "#4B3100",
    950: "#2A1B00"
  }
} as const;
```

`ThemeColors` has exactly these 37 roles, all `string`, all documented with
JSDoc saying what the role means (not what colour it is):

| Role | Light | Dark | Meaning |
| ---- | ----- | ---- | ------- |
| `background` | `neutral.50` | `neutral.950` | window/app canvas |
| `foreground` | `neutral.900` | `neutral.100` | default text |
| `card` | `neutral.0` | `neutral.900` | raised content surface |
| `cardForeground` | `neutral.900` | `neutral.100` | text on `card` |
| `popover` | `neutral.0` | `neutral.850` | floating surface (menus, popovers, dialogs) |
| `popoverForeground` | `neutral.900` | `neutral.50` | text on `popover` |
| `primary` | `iris.600` | `iris.300` | primary action |
| `primaryForeground` | `neutral.0` | `neutral.950` | text/icon on `primary` |
| `secondary` | `neutral.100` | `neutral.800` | secondary action |
| `secondaryForeground` | `neutral.800` | `neutral.200` | text on `secondary` |
| `muted` | `neutral.100` | `neutral.850` | quiet surface |
| `mutedForeground` | `neutral.600` | `neutral.400` | secondary text |
| `accent` | `iris.50` | `iris.900` | tinted/hovered selection surface |
| `accentForeground` | `iris.800` | `iris.200` | text on `accent` |
| `destructive` | `red.600` | `red.400` | destructive action |
| `destructiveForeground` | `neutral.0` | `red.950` | text on `destructive` |
| `success` | `green.600` | `green.400` | success |
| `successForeground` | `neutral.0` | `green.950` | text on `success` |
| `warning` | `amber.400` | `amber.300` | warning |
| `warningForeground` | `amber.950` | `amber.950` | text on `warning` |
| `border` | `neutral.200` | `neutral.800` | dividers and decorative borders |
| `borderStrong` | `#848E9E` | `#6B7484` | essential control boundaries (≥ 3:1) |
| `input` | `neutral.0` | `neutral.900` | input field background |
| `inputForeground` | `neutral.900` | `neutral.100` | text inside inputs |
| `placeholder` | `#66707F` | `#7C8595` | placeholder text |
| `ring` | `iris.500` | `iris.300` | focus ring |
| `selection` | `#7567F23D` | `#A7A9FF3D` | text selection wash (24%) |
| `overlay` | `#00000073` | `#000000A6` | modal scrim |
| `hover` | `neutral.100` | `neutral.850` | hover wash for ghost/subtle surfaces |
| `active` | `neutral.200` | `neutral.800` | pressed wash |
| `selected` | `iris.50` | `iris.900` | selected row/item |
| `selectedForeground` | `iris.800` | `iris.200` | text on `selected` |
| `disabled` | `neutral.100` | `neutral.850` | disabled surface |
| `disabledForeground` | `neutral.400` | `neutral.600` | disabled text |
| `skeleton` | `neutral.200` | `neutral.800` | loading placeholder |
| `scrollbar` | `neutral.300` | `neutral.700` | scrollbar thumb |
| `shadow` | `#191D2526` | `#00000080` | elevation tint |

That is 37 rows; keep all of them. The table is the specification: a role that
is not in it is not part of the palette.

Use `satisfies ThemeColors` on each object so a missing/extra role is a type
error.

### 5.2 Typography (`src/typography.ts`)

```ts
export type FontWeight = 400 | 500 | 600 | 700;

export interface TextStyle {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: FontWeight;
}

export interface Typography {
  readonly sans: string;
  readonly mono: string;
  readonly display: TextStyle;
  readonly h1: TextStyle;
  readonly h2: TextStyle;
  readonly h3: TextStyle;
  readonly body: TextStyle;
  readonly bodyStrong: TextStyle;
  readonly label: TextStyle;
  readonly caption: TextStyle;
  readonly code: TextStyle;
  readonly codeBlock: TextStyle;
}

export type TextRole = Exclude<keyof Typography, "sans" | "mono">;
```

Values:

| Role | size | line height | weight |
| ---- | ---- | ----------- | ------ |
| `display` | 28 | 36 | 600 |
| `h1` | 24 | 32 | 600 |
| `h2` | 20 | 28 | 600 |
| `h3` | 16 | 24 | 600 |
| `body` | 14 | 20 | 400 |
| `bodyStrong` | 14 | 20 | 600 |
| `label` | 13 | 18 | 500 |
| `caption` | 12 | 16 | 400 |
| `code` | 13 | 20 | 400 |
| `codeBlock` | 12 | 18 | 400 |

`export const typography: Typography` uses:

- `sans: ".SystemUIFont"` (GPUI's system-UI alias; verified in GPUI Kit)
- `mono: "Menlo"` on macOS, `"Consolas"` on Windows, `"DejaVu Sans Mono"`
  otherwise — detect with `process.platform` **once at module scope**. Guard
  with `typeof process` so a browser docs build falls back to `"Menlo"`.
  This is a platform boundary, not domain logic; no Effect service is warranted.

GPUix has no `letterSpacing` style field. Do not add a tracking token. Record
the limitation in `docs/design-system.md`.

### 5.3 Scales (`src/scale.ts`)

```ts
export interface Spacing {
  readonly "2xs": number; readonly xs: number; readonly sm: number;
  readonly md: number;  readonly lg: number; readonly xl: number;
  readonly "2xl": number; readonly "3xl": number; readonly "4xl": number;
  readonly "5xl": number;
}
export const spacing: Spacing = {
  "2xs": 2, xs: 4, sm: 6, md: 8, lg: 12, xl: 16,
  "2xl": 24, "3xl": 32, "4xl": 48, "5xl": 64
};

export interface Radius {
  readonly none: number; readonly sm: number; readonly md: number;
  readonly lg: number; readonly xl: number; readonly full: number;
}
export const radius: Radius = { none: 0, sm: 4, md: 6, lg: 8, xl: 12, full: 9999 };

export interface BorderWidth { readonly thin: number; readonly strong: number; }
export const borderWidth: BorderWidth = { thin: 1, strong: 2 };

export interface IconSize { readonly xs: number; readonly sm: number; readonly md: number; readonly lg: number; readonly xl: number; }
export const iconSize: IconSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 };

export type DensityName = "compact" | "comfortable" | "spacious";
export type ControlSize = "sm" | "md" | "lg";
export interface Density {
  readonly name: DensityName;
  readonly controlHeight: Readonly<Record<ControlSize, number>>;
  readonly controlPaddingX: Readonly<Record<ControlSize, number>>;
  readonly rowHeight: number;
}
export const densityPresets: Readonly<Record<DensityName, Density>>;
export const defaultDensity: Density; // comfortable
```

Density values:

| Preset | controlHeight sm/md/lg | controlPaddingX sm/md/lg | rowHeight |
| ------ | ---------------------- | ------------------------ | --------- |
| compact | 24 / 28 / 32 | 6 / 8 / 10 | 28 |
| comfortable | 28 / 32 / 36 | 8 / 10 / 12 | 32 |
| spacious | 32 / 36 / 40 | 10 / 12 / 14 | 36 |

### 5.4 Elevation (`src/elevation.ts`)

```ts
export interface BoxShadow {
  offsetX: number; offsetY: number;
  blurRadius: number; spreadRadius: number;
  color: string; inset?: boolean;
}
export interface Elevation {
  readonly sm: BoxShadow[];
  readonly md: BoxShadow[];
  readonly lg: BoxShadow[];
  readonly overlay: BoxShadow[];
}
export const lightElevation: Elevation;
export const darkElevation: Elevation;
```

- light: `sm` `0 1 2 0 #191D2514`, `md` `0 4 12 -2 #191D251F`,
  `lg` `0 16 40 -8 #191D2529`
- dark: `sm` `0 1 2 0 #00000066`, `md` `0 8 24 -4 #000000A6`,
  `lg` `0 24 56 -12 #000000CC`
- `overlay` is empty in both (`[]`). Overlay layering is the `overlay` colour,
  not a shadow; keep the key so the shape is stable and components can spread it.

The shadow types are structurally compatible with GPUix's `StyleDesc.boxShadow`;
do not import from `@gpuix/native` (that would add a dependency for a type only).

### 5.5 Theme and extension (`src/theme.ts`)

```ts
export type ThemeMode = "light" | "dark";

export interface Theme {
  readonly name: string;
  readonly mode: ThemeMode;
  readonly colors: ThemeColors;
  readonly typography: Typography;
  readonly spacing: Spacing;
  readonly radius: Radius;
  readonly density: Density;
  readonly elevation: Elevation;
  readonly borderWidth: BorderWidth;
  readonly iconSize: IconSize;
}

export interface TypographyOverrides {
  readonly sans?: string;
  readonly mono?: string;
  readonly display?: Partial<TextStyle>;
  // …one optional per TextRole
}

export interface ThemeOverrides {
  readonly name?: string;
  readonly colors?: Partial<ThemeColors>;
  readonly typography?: TypographyOverrides;
  readonly spacing?: Partial<Spacing>;
  readonly radius?: Partial<Radius>;
  readonly density?: DensityName | Partial<Omit<Density, "name">>;
  readonly elevation?: Partial<Elevation>;
  readonly borderWidth?: Partial<BorderWidth>;
  readonly iconSize?: Partial<IconSize>;
}

export interface ThemeConfig extends ThemeOverrides {
  readonly mode: ThemeMode;
}

export const lightTheme: Theme;   // name "Light"
export const darkTheme: Theme;    // name "Dark"
export const themes: Readonly<Record<ThemeMode, Theme>>;
export function getTheme(mode: ThemeMode): Theme;
export function extendTheme(base: Theme, overrides: ThemeOverrides): Theme;
export function createTheme(config: ThemeConfig): Theme;
```

`extendTheme` rules, in order:

1. `name`: override if present, else base name.
2. `colors`: `{ ...base.colors, ...overrides.colors }`.
3. `typography`: copy base; replace `sans`/`mono` if present; for each text role
   present in the override, `{ ...base.typography[role], ...override[role] }`.
4. `spacing`, `radius`, `borderWidth`, `iconSize`: shallow merge.
5. `elevation`: for each key present, **replace** the array (shadows are
   compositional units; merging arrays is meaningless).
6. `density`:
   - string → `densityPresets[value]`
   - object → `{ ...base.density, ...value, name: base.density.name }`
   - absent → base density.
7. `mode` is never overridable: `createTheme` sets it from `config.mode` and
   `extendTheme` keeps `base.mode`. A theme cannot claim to be dark and carry a
   light name by accident.

No `structuredClone`, no JSON round-trip, no mutation. Return fresh objects but
reuse untouched token objects (`spacing` may be the same reference) — the
contract is *no mutation*, not deep cloning.

`createTheme` starts from `themes[config.mode]` then calls `extendTheme`.

### 5.6 Style helpers (`src/styles.ts`)

```ts
export interface TextStyleProperties {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: FontWeight;
  readonly fontFamily: string;
}
export function textStyle(theme: Theme, role: TextRole): TextStyleProperties;
export function controlHeight(theme: Theme, size: ControlSize): number;
export function controlPaddingX(theme: Theme, size: ControlSize): number;
```

`textStyle` uses `theme.typography.sans`, except `code` and `codeBlock`, which
use `theme.typography.mono`. The return type is structurally assignable to
GPUix's `StyleDesc`; a component spreads it:

```tsx
<text style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}>
```

This exists so component source never repeats the family-selection rule.

### 5.7 Barrel (`src/index.ts`)

```ts
export * from "./color.js";
export * from "./typography.js";
export * from "./scale.js";
export * from "./elevation.js";
export * from "./theme.js";
export * from "./styles.js";
```

No default export.

### 5.8 React binding (`src/react.tsx`)

```tsx
import { createContext, useContext, type ReactNode } from "react";
import { lightTheme, type Theme } from "./theme.js";

const ThemeContext = createContext<Theme>(lightTheme);

export interface ThemeProviderProps {
  readonly theme: Theme;
  readonly children?: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

JSDoc on both exports must state: the default context is `lightTheme`, nested
providers scope a theme, and **there is no OS appearance detection** (GPUix
exposes no appearance query) — the application owns the mode switch and passes
the resolved theme. Do not add a `mode` prop; two ways to choose a theme is worse
than one.

## 6. Tests (all must be able to fail)

Co-located, run with vitest.

### `src/color.test.ts`

Implement a local sRGB parser for 6- and 8-digit hex and WCAG relative luminance
inside the test file. Then:

- For **each theme**, assert the following pairs meet their threshold:

  | Pair | Threshold |
  | ---- | --------- |
  | `foreground` on `background` | 7 (AAA body) |
  | `foreground` on `card` | 7 |
  | `cardForeground` on `card` | 7 |
  | `popoverForeground` on `popover` | 7 |
  | `mutedForeground` on `muted` | 4.5 |
  | `secondaryForeground` on `secondary` | 4.5 |
  | `primaryForeground` on `primary` | 4.5 |
  | `destructiveForeground` on `destructive` | 4.5 |
  | `successForeground` on `success` | 4.5 |
  | `warningForeground` on `warning` | 4.5 |
  | `accentForeground` on `accent` | 4.5 |
  | `selectedForeground` on `selected` | 4.5 |
  | `placeholder` on `input` | 4.5 |
  | `borderStrong` on `background` | 3 |
  | `ring` on `background` | 3 |

- Assert every role value matches
  `/^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|transparent)$/` — catches a typo'd hex
  or an accidental CSS keyword the runtime may not know.
- Assert `lightColors` and `darkColors` have the same keys (guards against
  adding a role to one theme only).
- Assert `lightColors.foreground !== darkColors.foreground` — a smoke check that
  the two themes are actually different, not one object copied.

The contrast test is the regression guard. Header comment states: *"Guards the
WCAG contrast floors of every semantic text/surface pair in both themes."*

### `src/typography.test.ts`

- Every text role has `lineHeight > fontSize` (text cannot collide).
- Every `fontWeight` is one of 400/500/600/700.
- Sizes are monotonically increasing in the documented order:
  `caption < label < body < h3 < h2 < h1 < display` (strictly).
- `sans` and `mono` are non-empty and different.

### `src/scale.test.ts`

- Every spacing/radius/icon value is `>= 0`; radius `full` is `>= 9999`.
- Spacing values are strictly increasing in the documented key order.
- For each density and control size: compact < comfortable < spacious
  (deliberately using the preset ordering, not a hardcoded pair).
- For each density: `controlHeight.sm < controlHeight.md < controlHeight.lg`.

### `src/theme.test.ts`

- `getTheme("light") === lightTheme`, `getTheme("dark") === darkTheme`.
- `createTheme({ mode: "dark" })` deep-equals `darkTheme` except the name is
  unchanged, and is not the same object.
- Colour override applies and preserves every other role.
- Typography partial override (e.g. `body.fontSize = 15`) preserves the base
  `lineHeight` and `fontWeight` — this is the regression guard for the nested
  merge.
- `extendTheme` does not mutate the base (capture `JSON.stringify(base)` before
  and after; compare).
- Density preset override changes all metrics to the preset, and a partial
  density override keeps the base name.
- `mode` cannot be changed by `extendTheme` (the returned mode equals base mode
  even if a cast sneaks an extra property in; test through a typed override is
  impossible, so assert `createTheme({mode:"dark", ...}).mode === "dark"`).
- Name override works and is trimmed? Do **not** trim; accept the string.

### `src/styles.test.ts`

- `textStyle(lightTheme, "code").fontFamily === lightTheme.typography.mono`.
- `textStyle(lightTheme, "body").fontFamily === lightTheme.typography.sans`.
- `textStyle` returns exactly the four documented fields (guard against a
  component accidentally relying on extra properties).
- `controlHeight`/`controlPaddingX` delegate to the active density for all
  three sizes.

### `src/react.test.tsx`

Use `renderToStaticMarkup` from `react-dom/server` (no DOM, no jsdom):

```tsx
function Probe() {
  const theme = useTheme();
  return <>{theme.colors.background}</>;
}

const html = renderToStaticMarkup(
  <ThemeProvider theme={darkTheme}><Probe /></ThemeProvider>
);
expect(html).toContain(darkTheme.colors.background);
```

Use a fragment rather than an intrinsic element: the package's tsconfig has no
DOM lib, so `<span>` would drag browser types into a native token package.

Also assert a provider-less render returns `lightTheme.colors.background`.
This test fails if the provider stops supplying context or the hook reads the
wrong context.

## 7. Example

The example is `src/brand-theme.example.ts`. It sits inside `src` so the one
tsconfig type-checks and builds it, and it is not re-exported from `index.ts`.
The `.example.ts` suffix makes it greppable and keeps it out of the public API
surface. `theme.test.ts` imports it and asserts the brand palette, radius and
density, so the documented extension mechanism is executed rather than
decorative.

```ts
import { createTheme, darkTheme } from "./index.js";

export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: { primary: "#7C5CFF", ring: "#9B8CFF" },
  radius: { md: 8 },
  density: "compact",
});
```

No separate `examples/` directory: one tsconfig, no build exclusions, no
untested snippet.

## 8. README

`packages/tokens/README.md` must contain:

- what the package owns and what it refuses to own (no component tokens);
- install/import snippet for the core and `/react` entries;
- a 20-line usage example with `ThemeProvider` + `useTheme` + `textStyle`;
- the extension example from §7;
- the boundary rule (no imports from other workspace packages);
- the no-Effect rationale from §1;
- a link to `docs/tokens.md` and `docs/design-system.md`;
- a limitations list (no CSS variables; GPUix has no letter spacing; no OS
  appearance detection).

## 9. Execution steps

1. Update the plan index in `.agents/slop/plans/README.md` with rows 010–012,
   status `in progress`.
2. Add the package files exactly as specified. Start with `package.json`,
   `tsconfig.json`, then `color.ts`, `typography.ts`, `scale.ts`,
   `elevation.ts`, `theme.ts`, `styles.ts`, `index.ts`, `react.tsx`.
3. Run `nub install`. Expected: workspace install succeeds and resolves the new
   package.
4. Run `nub run --filter @gpuixui/tokens check-types`. Fix only type errors in
   this package. Expected: exit 0.
5. Write the tests. Run `nub run --filter @gpuixui/tokens test`. Expected: all
   pass. If the contrast test fails, adjust **the palette value**, not the
   threshold, unless the threshold itself is wrong per §6.
6. Prove the contrast test can fail: temporarily set light `mutedForeground` to
   `#B9C0CC`, run the test, capture the failure, restore, run again. Record both.
7. Add `src/brand-theme.example.ts` and its assertions in `theme.test.ts`.
8. Write the README.
9. Run `nub run lint`, `nub run fmt`, then `nub run check` and `nub run test`.
10. Commit: `feat(tokens): design tokens, light/dark themes and theme extension`.
11. Tick the matching tasks in `TODO.md` and update the plan index status.

## 10. Deliberate omissions

- **No runtime theme schema.** Token data authored in TypeScript is trusted at
  compile time. A theme loaded from a file/URL is unknown input and must be
  decoded by the application that owns that boundary. Adding a parallel Schema
  model here would duplicate 60+ fields and drift from the interfaces. Record
  this rationale in the README; revisit if persisted themes become a library
  feature.
- **No motion tokens.** GPUix exposes motion props, but no component exists yet
  to consume them. Adding unused tokens is scaffolding.
- **No high-contrast theme.** The contrast floors are AA; a AAA theme is a
  follow-up task in `TODO.md`.
- **No CSS variables / CSS pipeline.** GPUix paints inline style values; the
  runtime does not read CSS custom properties. Token switching is a re-render
  with a different `Theme` object.
- **No OS appearance detection.** GPUix exposes no appearance query; the app
  decides the mode.

## 11. STOP conditions

- If `nub` cannot resolve `catalog:` in the new package, stop and report; do not
  copy versions from the root without recording the deviation.
- If `react-dom/server` types force DOM libs into the package, stop. The test may
  fall back to a pure context assertion only with owner approval; do not add a
  jsdom dependency silently.
- If any palette pair cannot meet the thresholds in §6 even after adjusting the
  ramp, stop and report the pair and ratios. Do not lower a threshold below
  WCAG AA for body text.
- If the GPUix style fields used by `TextStyleProperties` or `BoxShadow` do not
  match the reference (`references/gpuix/packages/native/js/host.ts`), stop and
  report the mismatch.
- If a gate fails outside this package, report it and leave the other workstream
  alone.

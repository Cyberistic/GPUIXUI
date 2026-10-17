# 051 — Platform type styles: one real theme per platform

**Workstream:** `tokens-theme`
**Phase:** B (working foundation), extending plan 011
**Depends on:** plan 011 (`@gpuixui/tokens`), plan 016 (source exports)
**Files owned:** `packages/tokens/src/platforms.ts` (new),
`packages/tokens/src/platforms.test.ts` (new),
`packages/tokens/src/platforms.example.ts` (new),
`packages/tokens/src/typography.ts`, `packages/tokens/src/theme.ts`,
`packages/tokens/src/index.ts`, `packages/tokens/README.md`,
`docs/tokens.md`, `docs/design-system.md`, this plan,
`.agents/slop/plans/README.md` (index row only), `TODO.md` and `COMPONENTS.md`
(this workstream's sections only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`TODO.md` (shared checkout) carries: *"Docs: platform toggle (macOS / Linux /
Windows / Default) — every component preview switches platform style; the styles
are real editable token themes in `packages/tokens`, not docs-only CSS."*
Today `packages/tokens` cannot supply that:

1. The only platform-aware value is a private `monoByPlatform` record inside
   `typography.ts` (`darwin` / `win32` / `linux` → a family). There is no named
   platform, no label, no fallback for an unrecognised platform, and nothing a
   docs site can iterate.
2. The mono family is resolved into `systemMonoFamily` at module load and never
   exposed as a platform → family table, so a preview, a test or a diagnostic
   cannot ask "what is Windows' mono family?" without re-reading the source.
3. There is no way to get a `Theme` for a platform, so the docs toggle would
   have to hand-write a theme in the docs app — exactly the "docs-only CSS
   styles" the task forbids.
4. `sans: ".SystemUIFont"` is an unverified claim in the package. It is
   **correct**, and the evidence is worth recording: GPUI (which GPUix vendors)
   documents the name as "the system UI font, which varies based on platform"
   and uses it as `Font::default()`
   (`crates/gpui/src/text_system.rs`, `references/gpuix` gitlink `2565b8a` on
   the `gpuix` zed branch); GPUI Kit's web story names the same alias. GPUix
   0.10.0's `StyleDesc.fontFamily` is one **string**, so a theme must name one
   family — never a CSS comma stack.

## 2. Design decisions (do not re-litigate)

1. **One table, one shape.** `platformTypes` maps a `PlatformName` to
   `{ label, sans, mono }`. Pure data, exported, iterable by the docs site.
2. **`sans` is GPUI's sentinel on every platform.** `.SystemUIFont` is resolved
   by GPUI to the platform's own UI font, so a theme must not name a face the
   operating system may not have. Only the mono family is per platform.
3. **`default` is a real row**, used when `process.platform` is not one the
   library knows (a browser, an unknown OS). It keeps today's fallback family
   (`Menlo`), so behaviour does not change.
4. **`systemMonoFamily` keeps its name and value** and moves to `platforms.ts`
   as `platformTypes[currentPlatform].mono`. `typography.mono` still resolves to
   it, so no consumer sees a different theme.
5. **`platformTheme(base, platform)` lives in `theme.ts`**, next to
   `extendTheme`, and is a thin `extendTheme` call: same colours, scales, mode,
   density and elevation; the two families and the name change. No new merge
   logic, and nothing mutates the base.
6. **No platform control metrics.** Inventing per-platform heights and radii
   would be a taste decision with no evidence; a consumer that wants one layers
   it with `extendTheme` (see the example). Density stays a theme choice.

## 3. Exact changes

### 3.1 `packages/tokens/src/platforms.ts` (new)

```ts
/**
 * Platform type styles.
 *
 * GPUix takes one `fontFamily` string per element, and GPUI resolves the
 * `.SystemUIFont` sentinel to the operating system's own UI font, so the UI face
 * already follows the platform at runtime. What a component cannot know is the
 * platform's monospace family, or which platform a preview is showing. Both come
 * from here.
 */

/** GPUI's system UI font sentinel; it resolves to each platform's own UI font. */
export const systemUiFont = ".SystemUIFont";

/** A platform a GPUIXUI application runs on. */
export type PlatformName = "darwin" | "linux" | "win32" | "default";

/** The families one platform's type resolves to. */
export interface PlatformType {
  /** Human-readable name for documentation and previews. */
  readonly label: string;
  /** UI font family. */
  readonly sans: string;
  /** The monospace family the platform has installed. */
  readonly mono: string;
}

/** Type styles per platform. `default` covers a platform the library does not know. */
export const platformTypes: Readonly<Record<PlatformName, PlatformType>> = {
  darwin: { label: "macOS", sans: systemUiFont, mono: "Menlo" },
  linux: { label: "Linux", sans: systemUiFont, mono: "DejaVu Sans Mono" },
  win32: { label: "Windows", sans: systemUiFont, mono: "Consolas" },
  default: { label: "Default", sans: systemUiFont, mono: "Menlo" },
};

/** The platform the process runs on, or `default` when it is not one the library knows. */
export const currentPlatform: PlatformName = resolvePlatform(process.platform);
```

with a module-local

```ts
const resolvePlatform = (name: string | undefined): PlatformName =>
  name === "darwin" || name === "linux" || name === "win32" ? name : "default";
```

`process` must be read defensively (`typeof process === "undefined"`) exactly as
`typography.ts` does today, so the module also loads in a browser:

```ts
export const currentPlatform: PlatformName =
  typeof process === "undefined" ? "default" : resolvePlatform(process.platform);
```

and

```ts
/** The platform's monospace family. */
export const systemMonoFamily = platformTypes[currentPlatform].mono;
```

### 3.2 `packages/tokens/src/typography.ts`

- Delete `monoByPlatform`, the `platform` const and the `systemMonoFamily`
  declaration.
- `import { systemMonoFamily, systemUiFont } from "./platforms.js";`
- `typography` becomes `sans: systemUiFont, mono: systemMonoFamily, …` (values
  unchanged).
- `systemMonoFamily` is now exported from `platforms.ts` only; `index.ts`'s
  `export *` keeps it on the package root. Nothing else in the package imports
  it from `typography.js`.

### 3.3 `packages/tokens/src/theme.ts`

```ts
import { platformTypes, type PlatformName } from "./platforms.js";

/**
 * A theme for one platform: the base theme's colours, scales and mode, with that
 * platform's font families. `extendTheme` does the merge, so the base is never
 * mutated and the mode is preserved.
 *
 * @example
 * ```tsx
 * import { platformTheme, themes } from "@gpuixui/tokens";
 *
 * <ThemeProvider theme={platformTheme(themes.dark, "win32")} />
 * ```
 */
export function platformTheme(base: Theme, platform: PlatformName): Theme {
  const { label, sans, mono } = platformTypes[platform];
  return extendTheme(base, {
    name: `${base.name} · ${label}`,
    typography: { sans, mono },
  });
}
```

Confirm `extendTheme` honours `name` before writing it (read the function body).

### 3.4 `packages/tokens/src/index.ts`

Add `export * from "./platforms.js";` (keeping the list alphabetical:
`color`, `elevation`, `platforms`, `scale`, `styles`, `theme`, `typography`).

### 3.5 `packages/tokens/src/platforms.test.ts` (new)

Header comment states what the guard protects: the platform table is the only
place a family per platform is decided, and the runtime takes one family string,
so a second source of truth or a comma stack silently renders a different face.

Assertions (each names its failure):

- `platformTypes` has exactly `darwin`, `linux`, `win32`, `default`; every row
  has a non-empty `label`, `sans`, `mono`.
- every `sans` is `systemUiFont` (a theme must not name a UI face the OS may
  lack) and no value contains `,` (0.10.0's `fontFamily` is one family).
- the three real platforms have distinct mono families; `default` reuses
  `darwin`'s.
- `systemMonoFamily === platformTypes[currentPlatform].mono`.
- `typography.sans === systemUiFont` and `typography.mono === systemMonoFamily`.
- `platformTheme(lightTheme, "win32")`: `colors`, `spacing`, `radius`,
  `density`, `elevation`, `borderWidth` and `iconSize` are **structurally equal**
  to the base (assert with `toEqual`: `extendTheme` rebuilds each group, so the
  guarantee is "nothing in them changed", not object identity); `mode` is
  unchanged; `name` contains the label; `typography.mono` is `Consolas` and the
  size/leading/weight roles are unchanged.
- the base is not mutated: a `lightTheme.typography` snapshot taken before the
  call is unchanged after it.
- `textStyle(platformTheme(lightTheme, "linux"), "code").fontFamily` is the
  Linux mono family — the integration that a component actually uses.
- `platformTheme(highContrastDarkTheme, "win32").mode` is `"dark"`.

### 3.6 `packages/tokens/src/platforms.example.ts` (new)

Same shape as `high-contrast.example.ts`: a documented, type-checked function
that a consumer copies — resolve the theme for a mode *and* a platform, and show
the one-line `extendTheme` a consumer adds for their own platform metrics.

### 3.7 `packages/tokens/README.md`

- Usage/import list: add `platformTheme`, `platformTypes`, `currentPlatform`.
- New `## Platform type` section before `## For documentation sites`: the table
  (macOS / Linux / Windows / Default → `sans`, `mono`), the sentence that GPUI
  maps `.SystemUIFont` to the platform UI font, the single-family limitation,
  and a copyable `platformTheme` example.
- `## Limitations`: the native visual check of `.SystemUIFont` is blocked by B1.

### 3.8 `docs/tokens.md`

- `## Import`: add `currentPlatform`, `platformTheme`, `platformTypes`,
  `systemUiFont` and `type PlatformName`.
- `## Typography`: replace the families sentence with the platform table
  reference; add a `### Platform type` subsection with the four-row table, the
  `platformTheme` example, the 0.10.0 single-family rule and the B1-blocked
  native check.
- `## Verification`: add the guard test to the list.
- `## Limitations and future work`: record the B1-blocked visual check.

### 3.9 `docs/design-system.md`

§5 Typography: replace "mono resolves per platform once at module load" with the
platform table reference and add the evidence sentence for `.SystemUIFont`
(GPUI resolves it per platform) plus one clause: a platform style is a real
theme from `platformTheme`, not a docs-only style sheet.

### 3.10 `COMPONENTS.md`

New row in **Design system**:
`| Platform type styles | done | yes (values in a Theme) | platformTypes + currentPlatform + platformTheme(base, platform); docs toggle renders a real theme. Native visual check of the sans sentinel blocked by B1. |`

### 3.11 `TODO.md`

Add and tick: `` `[x]` Add platform type styles and `platformTheme(theme, platform)` for the docs platform toggle (plan 051)``.

## 4. Commands and expected results

```sh
cd /Users/cyberistic/GPUIXUI/workspaces/tokens-platform

# Failing first: write platforms.test.ts before platforms.ts, so the suite fails
# (the module does not exist) and the fix is the module plus its wiring.
nub run --filter @gpuixui/tokens test          # expect failure
nub run --filter @gpuixui/tokens check-types   # expect exit 0 after §3.1–3.3
nub run --filter @gpuixui/tokens test          # expect all pass
nub run check && nub run lint && nub run test  # expect exit 0
```

Two-direction proof: change one `mono` in `platformTypes` to
`"Menlo, monospace"` (a comma stack) and expect the single-family assertion to
fail; restore it. Then delete `platforms.ts` and expect the suite to fail to
resolve the module; restore it.

## 5. Test plan

- `platforms.test.ts` fails before the change (the module is missing) and passes
  after.
- The single-family rule is proven by the comma-stack mutation.
- The no-base-mutation rule is proven by snapshotting `lightTheme.typography`
  before `platformTheme` and comparing after.
- `textStyle` integration proves the family a component actually paints with.
- No existing assertion is weakened; no `any`, no cast.

## 6. STOP conditions

- STOP if `extendTheme` ignores `name` (then the `name` assertion is wrong; read
  the function and record the real behaviour instead of changing it).
- STOP if moving `systemMonoFamily` breaks a file outside `packages/tokens/**`
  — record it in `TODO.md` instead of editing another workstream's paths.
- STOP if a shipped family is not installed on this box **and** that makes a
  non-skipped test fail; do not delete the family, record the evidence.
- STOP if any gate is red for a reason outside this plan.

## 7. Acceptance criteria

- [x] `platformTypes`, `currentPlatform`, `systemMonoFamily` and `systemUiFont`
      are exported from `@gpuixui/tokens`; `typography` uses them and its values
      are unchanged.
- [x] `platformTheme(base, platform)` returns a real `Theme` derived through
      `extendTheme`, with the base unmutated and the mode preserved.
- [x] `platforms.test.ts` covers the table, the single-family rule, the
      base-mutation rule and the `textStyle` integration (12 tests; the
      comma-stack mutation was run and fails, then restored).
- [x] `docs/tokens.md`, `docs/design-system.md` and `packages/tokens/README.md`
      document the table, the evidence for `.SystemUIFont` and the limitation.
- [x] `COMPONENTS.md` and `TODO.md` record the work.
- [x] `nub run check`, `nub run lint`, `nub run test` exit 0 (196 tests).
- [ ] Committed on `agent/tokens-platform` and pushed.

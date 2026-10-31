# 723 — Follow the Mac: accent colour, appearance and Reduce Transparency

| Field | Value |
| ----- | ----- |
| Owner | `shell` (reader) + `tokens-theme` (theme input) |
| Depends on | `721`, `433` Recipe B's `watchSystemTheme` (landed) |
| Status | landed 2026-10-31 — **runtime gap**: no API in `@gpuix/native@0.11.0` |

## Why

A Mac app picks up the user's accent colour, switches with Light/Dark/Auto,
and stops being translucent when Reduce Transparency is on. `@gpuix/native`
0.11.0 exposes none of these: its `index.d.ts` has no accent, appearance or
accessibility-display API (checked 2026-10-31: no `accent`, `appearance` or
`reduce` symbol). The library must not pretend; it reads them at the app
boundary and feeds `watchSystemTheme`, which already takes a caller's reader.

## Step 1 — record the gap

`packages/runtime/src/capabilities.ts` — add three `supported: false` rows:
`systemAccent`, `systemAppearance`, `reduceTransparency`, each with the reason
above and the workaround "read `defaults` at the app boundary
(`@gpuixui/shell/appearance`)". The compile-time guard in `guards.ts` then
fails the build the day the runtime adds one. Add the rows to
`docs/gpuix-capabilities.md`.

## Step 2 — the darwin reader

`packages/shell/src/appearance/appearance.ts` (new, ~80 LOC), Effect-native:

```ts
export class AppearanceReadError extends Schema.TaggedError<AppearanceReadError>()(
  "AppearanceReadError", { key: Schema.String, cause: Schema.Unknown }) {}

export interface SystemAppearance {
  readonly mode: ThemeMode;                 // AppleInterfaceStyle = Dark → dark
  readonly accent: Option.Option<string>;   // AppleAccentColor → hex
  readonly reduceTransparency: boolean;     // com.apple.universalaccess reduceTransparency
}

export const readAppearance: Effect.Effect<SystemAppearance, AppearanceReadError, CommandExecutor>
```

- Use `@effect/platform`'s `Command`. The workspace already depends on it
  (`packages/primitives`, `packages/deploy`, `apps/playground`); add it to
  `packages/shell/package.json` at the **same** version range primitives pins.
- `defaults read -g AppleInterfaceStyle` exits non-zero when Light — that is
  `light`, not an error. Model it with `Effect.catchTag` on the exit, not a
  `try`.
- `AppleAccentColor` integers → AppKit accent hexes (light / dark):
  `-1` graphite `#8C8C8C`/`#989898`, `0` red `#FF3B30`/`#FF453A`, `1` orange
  `#FF9500`/`#FF9F0A`, `2` yellow `#FFCC00`/`#FFD60A`, `3` green
  `#28CD41`/`#32D74B`, `4` purple `#AF52DE`/`#BF5AF2`, `6` pink
  `#FF2D55`/`#FF375F`; absent = blue `#007AFF`/`#0A84FF` (`Option.none`).
  The table lives in `logic.ts` as a pure function with a test.
- `watchAppearance` polls `readAppearance` on a `Schedule.spaced(Duration.seconds(2))`
  and emits on change (the OS has no notification we can subscribe to from
  Node; say so in the doc comment, one line).

## Step 3 — the theme input

`packages/tokens/src/system-theme.ts` — `watchSystemTheme`'s reader may now
return `{ mode, accent, reduceTransparency }`. An accent sets `primary`,
`ring` and the selection roles (`selection.ts`) through the existing
`ThemeOverrides`; `primaryForeground` is chosen by the existing contrast
helper, never hardcoded. `reduceTransparency` sets `Theme.reduceTransparency`
(added in `721`).

`ThemeProvider` (`packages/tokens/src/react.tsx`) gains `follow?: "system"`:
on darwin it runs `watchAppearance` at mount via the app's runtime (the
provider takes the `Effect` runner as a prop; it does not call `Effect.run*`
itself).

## Files

- `packages/runtime/src/capabilities.ts`, `capabilities.test.ts`
- `packages/shell/src/appearance/{appearance,logic}.ts`, `logic.test.ts`,
  `appearance.test.ts` (with a test `CommandExecutor` layer)
- `packages/tokens/src/system-theme.ts`, `system-theme.test.ts`, `react.tsx`
- `packages/shell/docs/appearance.mdx`, `docs/gpuix-capabilities.md`

## Test plan

| Case | Inversion |
| ---- | --------- |
| a missing `AppleInterfaceStyle` reads light, not an error | map the non-zero exit to `AppearanceReadError` |
| each accent integer maps to its light and dark hex | swap red and orange |
| an unknown integer reads blue and is logged (`Effect.logWarning`) | return `Option.none` silently |
| an accent repaints `primary`, `ring` and selection, keeping contrast | drop `ring` from the override |
| reduce transparency paints every material's fallback | ignore the flag in the override |
| the capability rows stay false while the binding lacks the API | flip `systemAccent` to `true` |

Native by-eye: System Settings → Appearance → accent Purple; the playground's
primary button turns purple within 2 s. Record in the commit message.

## STOP

- Stop if reading `defaults` is blocked by the sandbox the app runs in (a
  signed `.app`): report; do not fall back to a hardcoded blue.
- Stop if `ThemeProvider` would need to run an `Effect` itself.

# Plan 678 — The Default platform variant must carry the identity's mono

> **Status:** done 2026-10-19. Owner: `tokens-theme`. Paths touched:
> `packages/tokens/src/platform-types.ts`, `packages/tokens/src/platforms.ts`,
> `packages/tokens/src/platform-styles/{default,macos,linux,windows}.ts`,
> `packages/tokens/src/platform-styles/recipes/{xp,aero}.ts`,
> `packages/tokens/src/typography.ts`, `packages/tokens/src/platform-table.ts`,
> `packages/tokens/src/platforms.test.ts`,
> `packages/tokens/src/default-platform.test.ts` (new),
> `packages/tokens/src/docs.test.ts`, `packages/tokens/src/readme.test.ts`,
> `packages/tokens/README.md`, `docs/tokens.md`, `docs/design-system.md`,
> `COMPONENTS.md`, `TODO.md`, `.agents/slop/plans/README.md`.

## Execution record (2026-10-19)

- The probe ran before any edit: under a simulated `linux`, `getTheme("light")`
  and `getPlatformTheme("default", "light")` carried `DejaVu Sans Mono`,
  `platformTypes.default.mono` and `applyPlatformStyle(..., platformStyles.default)`
  carried `Menlo`, and the applied name was `Light · Default` — the defect in
  the *Why* table.
- After the change: `packages/tokens` is **189 files / 6708 tests** green;
  `check-types`, `fmt`, `lint` and `check:tests` are green.
- Both directions were re-proved by reverting only
  `platform-styles/default.ts` to `mono: "Menlo"`: the new suite failed
  **2/2** (`Menlo` vs `DejaVu Sans Mono` on Linux, `Menlo` vs `Consolas` on
  Windows) while `platforms.test.ts` stayed green on this macOS box. Restoring
  the file returned `default-platform.test.ts` to 2/2 green.
- `scripts/verify-two-directions.sh` still targets `jj` (repo TODO), so the
  manual revert above is the recorded evidence rather than a claim that the
  script ran.

## Why

`defaultPlatformStyle.types.mono` is the literal `"Menlo"`, and
`platformTypes.default` is that object. But the Default variant is documented as
the identity: `getPlatformTheme("default", mode)` returns `getTheme(mode)`
unchanged, and the identity's `typography.mono` is `systemMonoFamily` — the
monospace family of the **running** platform. On Linux and Windows the two
disagree, and the disagreement is silent:

| Path (measured on a simulated Linux, 2026-10-19) | `typography.mono` |
| --- | --- |
| `getTheme("light")` | `DejaVu Sans Mono` |
| `getPlatformTheme("default", "light")` | `DejaVu Sans Mono` |
| `platformTypes.default.mono` | `Menlo` |
| `applyPlatformStyle(getTheme("light"), platformStyles.default)` | `Menlo` |

A consumer that iterates `platformNames` and applies `platformStyles[name]`
(the documented copy-and-own path, and the shape a preview toggle uses) gets a
Default variant whose code roles name a macOS-only family on Linux or Windows.
GPUix resolves `fontFamily` by name and falls back silently, so code and diff
text paint a face the author did not choose while every check returns `[]`:
`themeTypefaceFailures` only governs the form of a family, not whether the
machine installs it.

The shipped docs repeat the inconsistency. `platformTypes.default.mono` is the
source of the catalogue's Default row (`docs/tokens.md`), the README table and
the design system's platform-family sentence, so they print `Menlo` even though
the same pages say "`mono` is the current platform's family" and
"`getPlatformTheme("default", mode)` returns the identity unchanged". On Linux
the table states a mono the resolved Default theme does not carry. The table
guard derives its cell from the same wrong value, so it cannot see it.

`platforms.test.ts` almost caught it: "leaves the Default variant empty, so it
is the identity" checks `structure`, `colors` and `elevation` but not `types`.
The deliberate `Menlo` in `default.ts` is the one field the emptiness claim
skipped.

## Scope

- Give the installed mono families one owner in `platform-types.ts` and derive
  `currentPlatform`, `systemMonoFamily` and the Default style's mono from it, so
  the Default variant carries the identity's family on every platform.
- Keep the public API shape: `platforms.ts` still exports `currentPlatform`,
  `systemMonoFamily`, `platformTypes`, `platformStyles` and the guards.
- Print the Default row's mono honestly in the catalogue and the README (it is
  the identity, so it is one of the three shipped families), derive the row from
  the new owner, and say why.
- Prove the regression under simulated Linux and Windows, because the box that
  runs the suite is macOS and the old code passes there.

Out of scope: any colour, pair, floor, metric or theme value; a name change for
`applyPlatformStyle(base, platformStyles.default)` (`Light · Default` stays — a
label is a preview's provenance, not a paint); the `tw` and `docs-site` copies of
the package; and `registerFont`, which is still absent from 0.10.0.

## Files

| File | Change |
| ---- | ------ |
| `src/platform-types.ts` | Own `platformMonos`, `currentPlatform` and `systemMonoFamily`; the file already owns the `.SystemUIFont` sentinel. |
| `src/platforms.ts` | Import and re-export the moved values; delete the local `knownPlatform`/`currentPlatform`/`systemMonoFamily`. |
| `src/platform-styles/{macos,linux,windows}.ts` | Name the family through `platformMonos` instead of a second literal. |
| `src/platform-styles/recipes/{xp,aero}.ts` | Same for their Windows mono. |
| `src/platform-styles/default.ts` | `mono: systemMonoFamily`; a comment states it is the identity's family. |
| `src/typography.ts` | Read both sentinels from `platform-types.ts` (the layer that owns them). |
| `src/platform-table.ts` | Add `platformMonoCell`, the one row helper the catalogue and README share. |
| `src/default-platform.test.ts` | New simulated-Linux/Windows regression suite. |
| `src/platforms.test.ts` | The Default style test asserts the families too; a drift guard holds the map to the style registry. |
| `src/docs.test.ts`, `src/readme.test.ts` | Build the Default cell from `platformMonoCell`; hold the new rationale sentence. |
| `docs/tokens.md`, `packages/tokens/README.md`, `docs/design-system.md` | Truthful Default row and the reason. |
| `COMPONENTS.md`, `TODO.md`, the plan index | Ledger. |

## Exact edits

### 1. `src/platform-types.ts`

After `platformNames`/`isPlatformName`, add:

```ts
/**
 * The monospace family each shipped platform installs. The owner for the
 * families the identity and the Default variant share: a platform style names
 * its own family from this record, and `systemMonoFamily` resolves the running
 * platform from the same values.
 */
export const platformMonos = {
  darwin: "Menlo",
  linux: "DejaVu Sans Mono",
  win32: "Consolas",
} as const;

/** The identity's fallback where the runtime reports no known platform. */
const fallbackMono = "Menlo";

const knownPlatform = (name: string): PlatformName =>
  name === "darwin" || name === "linux" || name === "win32" ? name : "default";

/**
 * The platform this code runs on, or `default` where the runtime exposes none
 * (a browser) or one the library does not know.
 */
export const currentPlatform: PlatformName =
  typeof process === "undefined" ? "default" : knownPlatform(process.platform);

/**
 * The monospace family the identity's `typography.mono` names: the running
 * platform's installed family, so a theme never names a face the machine may
 * not have.
 */
export const systemMonoFamily: string =
  currentPlatform === "default" ? fallbackMono : platformMonos[currentPlatform];
```

The file keeps its existing type-only imports, so no runtime cycle is created:
style files already import this module.

### 2. `src/platforms.ts`

Replace the `platform-types` import's specifier list with one that includes
`currentPlatform` and `systemMonoFamily`, and re-export them with the existing
`isPlatformName`, `platformNames`, `systemUiFont` block. Delete the local
`knownPlatform`, `currentPlatform` and `systemMonoFamily` definitions and the
now-unused `PlatformName` type import if it becomes unused.

`platformTypes` and `platformStyles` keep deriving from the style files, so
`platformTypes.default` is now `defaultPlatformStyle.types` and carries the
identity's family.

### 3. Style files

- `platform-styles/macos.ts`: `mono: platformMonos.darwin`.
- `platform-styles/linux.ts`: `mono: platformMonos.linux`.
- `platform-styles/windows.ts`: `mono: platformMonos.win32`.
- `platform-styles/recipes/xp.ts` and `aero.ts`: `mono: platformMonos.win32`
  (both are Windows editions).
- `platform-styles/default.ts`:

```ts
types: { label: "Default", sans: systemUiFont, mono: systemMonoFamily },
```

and extend the JSDoc: the variant is the identity, so its mono is the running
platform's family; it must not name one platform's face.

Import `platformMonos` / `systemMonoFamily` from `../platform-types.js`.

### 4. `src/typography.ts`

```ts
import { systemMonoFamily, systemUiFont } from "./platform-types.js";
```

No value moves: on this box `systemMonoFamily` is still `Menlo`.

### 5. `src/platform-table.ts`

Add:

```ts
/**
 * The mono cell a platform row prints. The Default row is the identity, so its
 * family is the running platform's: print every shipped family rather than the
 * one the test run happens to resolve.
 */
export const platformMonoCell = (platform: PlatformName): string =>
  platform === "default"
    ? platformVariants.map((name) => `\`${platformTypes[name].mono}\``).join(" / ")
    : `\`${platformTypes[platform].mono}\``;
```

Use `platformNames.filter(...)` rather than a retyped list if `platformVariants`
would create an import from `shipped-themes.ts` into a docs helper; the three
shipped families are `platformNames` members other than `default`. Import
`platformTypes` from `./platforms.js` and the `PlatformName` type from
`./platform-types.js`. This module is test support, not a public entry.

### 6. Tests

`src/platforms.test.ts`:

- In "gives each real platform its own monospace family", replace
  `expect(platformTypes.default.mono).toBe(platformTypes.darwin.mono)` with
  `expect(platformTypes.default.mono).toBe(systemMonoFamily)`.
- In "leaves the Default variant empty, so it is the identity", add
  `expect(style.types.sans).toBe(systemUiFont)` and
  `expect(style.types.mono).toBe(systemMonoFamily)`.
- Add a case that holds the map to the registry:
  `variants.forEach((platform) => expect(platformTypes[platform].mono).toBe(platformMonos[platform]))`.

`src/default-platform.test.ts` (new). Header comment states the bug: Default
claimed to be the identity but named Menlo on Linux/Windows. Cases, with
`process.platform` overridden through its configurable descriptor, `vi.resetModules()`
and a fresh import of the module graph:

1. For `"linux"` and `"win32"`: the fresh `platformTypes.default.mono`, the
   fresh `platformStyles.default.types.mono`, `getPlatformTheme("default", mode)`
   and `applyPlatformStyle(getTheme(mode), platformStyles.default)` all equal
   the fresh `getTheme(mode).typography.mono` (`DejaVu Sans Mono` / `Consolas`),
   for both modes, for each simulated platform.
2. The fresh identity's mono is the simulated platform's family, so the case
   cannot pass by all four paths being wrong together.

`afterEach` restores `process.platform` and calls `vi.resetModules()` so the
file leaves the worker's module graph as it found it. Verify the file runs
alone (`nub run --filter @gpuixui/tokens test -- src/default-platform.test.ts`)
and inside the full suite.

`src/docs.test.ts`:

- Import `platformMonoCell` from `./platform-table.js`.
- In "states each variant's real type, shape, density and accent", replace the
  row's `` `\`${platformTypes[platform].mono}\`` `` with
  `${platformMonoCell(platform)}`.
- Add a case that the Default row's cell is every shipped mono joined by
  `" / "`, and that the prose says the Default row is the identity's mono on
  each platform (the exact sentence added below).
- Update the design-system family sentence guard to the exact new sentence,
  built from `platformTypes.darwin/linux/win32`.

`src/readme.test.ts`:

- Import `platformMonoCell`; `platformRow` uses it.
- Add a case that the README states the Default row's reason and names
  `systemMonoFamily`.

### 7. Documentation

`docs/tokens.md` platform table, Default row:

```
| `default` (Default) | `.SystemUIFont` | `Menlo` / `DejaVu Sans Mono` / `Consolas` | 4 / 6 / 8 / 12 | `comfortable` | `#5F4BDB` | `#A7A9FF` |
```

After the table's "A row states the **resolved** theme…" sentence, add:

```
The Default row names the identity's mono on each shipped platform, because
`getPlatformTheme("default", mode)` returns the identity unchanged and
`systemMonoFamily` is the running platform's installed family.
```

Keep the existing "The Default variant has no overrides …" paragraph and add
"mono included" to its claim.

`packages/tokens/README.md` platform table, Default row:

```
| Default (`default`) | `Menlo` / `DejaVu Sans Mono` / `Consolas` | 4 / 6 / 8 / 12 | `comfortable` | `#5F4BDB` | `#A7A9FF` |
```

Add the same one-sentence reason below the table.

`docs/design-system.md` §5:

Replace

```
Mono comes from the platform table (`platformTypes`): `Menlo` on macOS,
`DejaVu Sans Mono` on Linux, `Consolas` on Windows, `Menlo` for a platform the
library does not know.
```

with

```
Mono comes from the platform table (`platformTypes`): `Menlo` on macOS,
`DejaVu Sans Mono` on Linux, `Consolas` on Windows. The Default variant carries
`systemMonoFamily`, the running platform's family, because it is the identity.
```

### 8. Ledger

- `COMPONENTS.md`, *Platform style variants*: note that the Default variant
  carries the identity's mono (`systemMonoFamily`), so applying it changes no
  family.
- `TODO.md`, tokens section: one ticked row starting "Hold the Default platform
  variant to the identity's mono — …", and update the progress bar.
- `.agents/slop/plans/README.md`: add the 678 row after 674.

## Commands and expected results

```sh
cd packages/tokens
nub run test -- src/default-platform.test.ts   # 1 file, all cases green (and red before the fix)
nub run check-types                            # no output
nub run test                                   # 189 files, 6704+ tests green
```

Then from the repo root:

```sh
nub run check
nub run lint
nub run test
```

Expected: all green. `check:tests` must accept the new suite: every case asserts
a value, and the simulation case compares two independently resolved paths.

## Two-direction proof

1. Before implementing, run `src/default-platform.test.ts` against the current
   tree: it must fail on `platformTypes.default.mono` (`Menlo` vs
   `DejaVu Sans Mono` under the simulated Linux). Record the failure.
2. Implement the fix and re-run: green.
3. Revert only `src/platform-styles/default.ts` to `mono: "Menlo"` and run
   `src/default-platform.test.ts` + `src/platforms.test.ts` + `src/docs.test.ts`:
   the new cases must fail again. Restore.

`scripts/verify-two-directions.sh` is written against `jj` (repo TODO); state
the manual revert evidence in the execution record instead of claiming that
script ran.

## STOP conditions

- Stop if moving `currentPlatform` into `platform-types.ts` creates a runtime
  import cycle (the module must stay runtime-free apart from `process.platform`).
- Stop if a shipped theme's resolved `typography` changes on macOS (no value may
  move on this box) or if any shipped set begins failing `themeFailures`.
- Stop if the simulated-platform test leaks `process.platform` into another
  case; the file must restore the descriptor and reset modules in `afterEach`.
- Stop if a docs table row cannot be derived from `platformMonoCell`; do not
  hardcode the three-family cell in a test.

## Acceptance

- `platformStyles.default.types.mono === systemMonoFamily` on every simulated
  platform, and applying the Default style changes no family.
- `platformTypes.default.mono` reports the running platform's family; the three
  real variants still report their own.
- The catalogue, README and design system state the Default row's platform
  dependence and are guarded by derived cells.
- All gates green; no colour, pair, floor, metric or shipped theme value moves.

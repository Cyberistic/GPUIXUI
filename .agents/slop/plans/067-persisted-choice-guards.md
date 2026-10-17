# 067 — The union owner ships the narrowing guard

| Field | Value |
| ----- | ----- |
| Phase | F (consumer boundary) |
| Owner | **tokens-theme workstream** (`packages/tokens`, `docs/tokens.md`) |
| Depends on | plans `063` (platform variants), `064` (ordered indexes), `066` (coverage guard) |
| Status | done |

This plan is self-contained. A weaker executor can follow it in order.

---

## 1. Why

A theme, contrast and platform are **choices a consumer persists** — a stored
preference, a URL parameter, a settings row. They arrive as `unknown`, and the
package that defines each union must own its narrowing guard, or every consumer
will retype the members.

That has already happened: `apps/docs` (the `docs-site` worktree) retyped the
platform table and hand-wrote the guard in `src/platform/platform.ts`:

```ts
export const platformNames = ["darwin", "linux", "win32", "default"] as const
  satisfies ReadonlyArray<PlatformName>;
export const isPlatformName = (value: string | null): value is PlatformName =>
  value === "darwin" || value === "linux" || value === "win32" ||
  value === "default";
```

`platformNames` already ships here (plan `064`), and the four-member literal is
duplicated a second time in the guard. Adding a platform means editing a file in
another package that the type system cannot point at. The same defect is waiting
for `ThemeMode` and `ThemeContrast` the moment a consumer stores a mode.

**Not in scope.** No schema runtime: the package ships zero dependencies by
design (`README.md` "Why no Effect here"), so these are type guards, not
`Schema` decoders. Decoding a **theme object** from a file is still the
application's boundary, and stays its job. Do not add `effect` or `Schema` here.

## 2. Design decision

One guard per persisted union, next to the union’s definition:

| Guard | Union | Defined beside |
| ----- | ----- | -------------- |
| `isPlatformName` | `PlatformName` | `platformNames` in `platform-types.ts` |
| `isThemeMode` | `ThemeMode` | the type in `theme.ts` |
| `isThemeContrast` | `ThemeContrast` | the type in `theme.ts` |

Signature: **`(value: unknown): value is T`**. `unknown` is what a boundary
actually has (`localStorage.getItem` returns `string | null`,
`URLSearchParams.get` returns `string | null`, a settings row is `unknown`), so a
caller never needs a cast before the guard. `platformNames.some((name) => name
=== value)` is the membership test — no cast, no native `Array.includes` type
fight.

`isPlatformName` lives in `platform-types.ts` so every platform style file and
the registry share one source; `platforms.ts` already re-exports from there, so
the index exports it with no new plumbing.

The guards are documented once, under Theme API, as the **boundary** half of the
extension mechanism: they narrow a persisted choice; `createTheme`/`extendTheme`
build a theme. The docs coverage guard from plan `066` will require them in
`docs/tokens.md`.

## 3. Exact files to create or change

All paths relative to the **tokens-theme worktree**:

| Path | Action |
| ---- | ------ |
| `.agents/slop/plans/067-persisted-choice-guards.md` | **create** (this file) |
| `packages/tokens/src/platform-types.ts` | **add** `isPlatformName` |
| `packages/tokens/src/theme.ts` | **add** `isThemeMode` and `isThemeContrast` |
| `packages/tokens/src/guards.test.ts` | **create** — the behavioural tests |
| `docs/tokens.md` | **add** a "Persisted choices" paragraph under Theme API |
| `COMPONENTS.md` | **edit** the **Theme extension** row notes: persisted choices narrow through the package guards |
| `TODO.md` | **add** one ticked task and one **cross-team** row for `docs-site` |
| `.agents/slop/plans/README.md` | **add** the `067` index row and explanation |

## 4. The implementation

`platform-types.ts`, after `platformNames`:

```ts
/**
 * Narrow an unknown value — a stored preference or a URL parameter — to a
 * platform the library ships. A consumer never retypes the four names.
 */
export const isPlatformName = (value: unknown): value is PlatformName =>
  platformNames.some((name) => name === value);
```

`theme.ts`, after `ThemeContrast`:

```ts
/** Narrow an unknown value to a theme mode. */
export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark";

/** Narrow an unknown value to a contrast variant. */
export const isThemeContrast = (value: unknown): value is ThemeContrast =>
  value === "default" || value === "high";
```

JSDoc on each: one sentence saying it narrows persisted/unknown input and is not
a theme decoder. No casts.

## 5. Tests — `guards.test.ts`

Header comment states the defect being guarded: **the union owner used to leave
consumers to retype the members, and `apps/docs` did exactly that.**

For each guard, two tests:

1. **accepts every shipped member** — iterate the canonical index
   (`platformNames`, the literal modes, the literal contrasts) and assert `true`;
2. **rejects everything else** — `""`, `"Light"`, `"light "`, `"high-contrast"`,
   `"macOS"`, `null`, `undefined`, `0`, `{}`.

`isPlatformName` must cover all four members, including `default` — the one a
hand-rolled guard forgets. Assert membership against the shipped index, not a
retyped list:

```ts
platformNames.forEach((name) => expect(isPlatformName(name)).toBe(true));
```

For modes and contrasts the type has no runtime index; assert the guard’s
accepted set by using `themes` / `highContrastThemes` keys where it helps
(`Object.keys(themes)`), and keep the two literals in the test intentionally —
they are the contract, not a copy of a shipped table.

## 6. Documentation edit

Under **Theme API**, after the `createTheme`/`extendTheme` examples and before
the merge rules, add:

> A persisted choice arrives as `unknown`. The package guards its own unions, so
> a consumer does not retype them: `isPlatformName(value)` narrows to a shipped
> platform (including `default`), `isThemeMode(value)` to `light`/`dark`, and
> `isThemeContrast(value)` to `default`/`high`. They narrow a choice; decoding a
> whole theme object from a file or URL is still the application's boundary and
> belongs to its `Schema`.

## 7. Commands and expected results

```sh
nub run --filter @gpuixui/tokens check-types   # exit 0
nub run --filter @gpuixui/tokens test          # exit 0; records the new total
nub run check                                  # exit 0
nub run lint                                   # exit 0
nub run test                                   # exit 0
```

Record the observed count; do not predict it.

## 8. STOP conditions

Stop and report if:

- a guard needs a cast or `any` to compare with its union — the shape is wrong,
  fix the shape;
- `docs/tokens.md`’s coverage guard (plan `066`) fails after documenting the
  guards — the documentation sentence must name each export;
- a consumer asks for `Schema` decoding here — that is a different, dependency-
  bearing decision for the package, not a workaround inside a guard;
- `DensityName` or `StatusTone` guards are requested: they are not persisted
  choices and are out of scope; record them as a new task if a consumer needs one.

## 9. Test plan and both directions

- Remove `"default"` from `isPlatformName`’s accepted set (or from
  `platformNames`) and observe the membership test fail — then restore.
- Make `isThemeMode` return `true` unconditionally and observe the rejection
  test fail — then restore.
- Do not claim a direction that was not run.

## 10. Acceptance criteria

- `isPlatformName`, `isThemeMode` and `isThemeContrast` are exported, typed as
  guards over `unknown`, documented in `docs/tokens.md`, and covered by
  `guards.test.ts`.
- No new runtime dependency; no cast.
- `TODO.md` records the `docs-site` follow-up: import `platformNames` and
  `isPlatformName` from `@gpuixui/tokens` and delete the local copies.
- The gate commands exit 0 and both failing directions were observed.
